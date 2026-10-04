import {
  INDUSTRY_BUILD_RANGE, INDUSTRY_CONVEYOR_RANGE,
  INDUSTRY_FACILITIES, INDUSTRY_INTERACTION_RANGE, INDUSTRY_ITEM_IDS,
  INDUSTRY_MAINTENANCE_INTERVAL_TICKS, INDUSTRY_MAX_FACILITIES, INDUSTRY_MAX_LINKS,
  INDUSTRY_RECIPES, INDUSTRY_RESEARCH, INDUSTRY_RESEARCH_RANGE, INDUSTRY_ROVER_DRIVE_RANGE,
  INDUSTRY_TRANSPORT_INTERVAL_TICKS, validateIndustryContent,
  INDUSTRY_CONVEYOR_COSTS, INDUSTRY_REPAIR_COSTS,
  type IndustryCost, type IndustryFacilityKind, type IndustryResearchId,
} from '../../content/phase3/IndustryContent';
import type { PlayerId, WorldPosition } from '../../foundation';
import type { Phase1ItemAuthority } from '../items';
import {
  emptyIndustryState, industryBufferQuantity, validIndustryPosition, validateIndustryState,
  type IndustryFacilityState, type IndustryMaintenanceEvent, type IndustryPowerNetworkState,
  type IndustryState,
} from './IndustryState';
export { emptyIndustryState, validateIndustryState } from './IndustryState';
export type { IndustryState } from './IndustryState';

export const INDUSTRY_ACTIONS = Object.freeze(['research', 'build', 'dismantle', 'set-recipe', 'set-enabled',
  'deposit', 'withdraw', 'connect', 'disconnect', 'repair', 'drive'] as const);
export interface IndustryCommand {
  readonly operationId: string;
  readonly playerId: PlayerId;
  readonly expectedRevision: number;
  readonly expectedInventoryRevision: number;
  readonly action: typeof INDUSTRY_ACTIONS[number];
  readonly targetId?: string;
  readonly facilityKind?: IndustryFacilityKind;
  readonly position?: WorldPosition;
  readonly recipeId?: string;
  readonly itemDefinitionId?: string;
  readonly quantity?: number;
  readonly destinationId?: string;
  readonly enabled?: boolean;
}
export type IndustryResult =
  | { readonly status: 'committed'; readonly operationId: string; readonly revision: number;
      readonly inventoryRevision: number; readonly entityId?: string }
  | { readonly status: 'rejected'; readonly operationId: string; readonly reason: string };
export interface IndustryWorldPort {
  canPlace(position: WorldPosition): boolean;
  hasResearch(id: string): boolean;
  solarActive?(authorityTick: number): boolean;
  /** Must reject blocked terrain/collisions before relocating the player. */
  movePlayer(playerId: PlayerId, position: WorldPosition): boolean;
}
interface MutableFacility extends Omit<IndustryFacilityState, 'buffer'> {
  buffer: IndustryCost[];
  position: WorldPosition;
  enabled: boolean;
  recipeId: string | null;
  progressTicks: number;
  cycleOrdinal: number;
  condition: number;
  wearTicks: number;
  energy: number;
  nextDriveTick: number;
  powered: boolean;
  networkId: string | null;
  status: IndustryFacilityState['status'];
}
const distance = (a: WorldPosition, b: WorldPosition): number => Math.hypot(a.x - b.x, a.y - b.y);
const materialQuantity = (f: IndustryFacilityState, id: string): number => f.buffer.find(i => i.itemDefinitionId === id)?.quantity ?? 0;
const changeBuffer = (f: MutableFacility, id: string, delta: number): void => {
  const quantity = materialQuantity(f, id) + delta;
  if (quantity < 0) throw new Error('Industry stock underflow.');
  f.buffer = f.buffer.filter(i => i.itemDefinitionId !== id);
  if (quantity > 0) f.buffer.push({ itemDefinitionId: id, quantity });
  f.buffer.sort((a, b) => a.itemDefinitionId.localeCompare(b.itemDefinitionId));
};
const cloneFacilities = (state: IndustryState): MutableFacility[] => state.facilities.map(f => ({ ...f,
  position: { ...f.position }, buffer: f.buffer.map(i => ({ ...i })) }));
const canRunRecipe = (f: IndustryFacilityState): 'WAITING_INPUT' | 'OUTPUT_FULL' | 'RUNNING' => {
  const recipe = INDUSTRY_RECIPES.find(r => r.id === f.recipeId);
  if (!recipe || recipe.inputs.some(i => materialQuantity(f, i.itemDefinitionId) < i.quantity)) return 'WAITING_INPUT';
  const after = industryBufferQuantity(f.buffer) - industryBufferQuantity(recipe.inputs) + industryBufferQuantity(recipe.outputs);
  return after > INDUSTRY_FACILITIES[f.kind].bufferCapacity ? 'OUTPUT_FULL' : 'RUNNING';
};

/** Every supply, placement and vehicle outcome is derived by this shared authority. */
export class IndustryAuthority {
  private state: IndustryState;
  public constructor(
    private readonly items: Pick<Phase1ItemAuthority, 'commitColonyExchange'>,
    private readonly actor: (playerId: PlayerId) => { readonly position: WorldPosition; readonly alive: boolean; readonly spaceId?: string },
    private readonly world: IndustryWorldPort,
    initial?: IndustryState,
  ) {
    validateIndustryContent();
    this.state = initial === undefined ? emptyIndustryState() : validateIndustryState(initial);
    this.refreshPower();
  }
  public read(): IndustryState { return this.state; }

  public execute(command: IndustryCommand): IndustryResult {
    const reject = (reason: string): IndustryResult => Object.freeze({ status: 'rejected', operationId: command.operationId, reason });
    if (typeof command.operationId !== 'string' || !command.operationId || command.operationId.length > 256
      || typeof command.playerId !== 'string' || !command.playerId || command.playerId.length > 256
      || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0
      || !Number.isSafeInteger(command.expectedInventoryRevision) || command.expectedInventoryRevision < 0
      || !INDUSTRY_ACTIONS.includes(command.action)
      || [command.targetId, command.facilityKind, command.recipeId, command.itemDefinitionId, command.destinationId]
        .some(value => value !== undefined && (typeof value !== 'string' || value.length > 256))
      || (command.enabled !== undefined && typeof command.enabled !== 'boolean')
      || (command.position !== undefined && !validIndustryPosition(command.position))) return reject('INVALID_COMMAND');
    const signature = JSON.stringify([command.playerId, command.action, command.expectedRevision,
      command.expectedInventoryRevision, command.targetId, command.facilityKind,
      command.position === undefined ? null : [command.position.x, command.position.y],
      command.recipeId, command.itemDefinitionId, command.quantity, command.destinationId, command.enabled]);
    if (signature.length > 4096) return reject('INVALID_COMMAND');
    const receipt = this.state.receipts.find(r => r.operationId === command.operationId);
    if (receipt) return receipt.signature === signature
      ? Object.freeze({ status: 'committed', operationId: command.operationId, revision: receipt.revision,
          inventoryRevision: receipt.inventoryRevision, ...(receipt.entityId ? { entityId: receipt.entityId } : {}) })
      : reject('OPERATION_ID_CONFLICT');
    if (command.expectedRevision !== this.state.revision) return reject('STALE_REVISION');
    if (this.state.revision >= Number.MAX_SAFE_INTEGER) return reject('REVISION_EXHAUSTED');
    let actor: ReturnType<IndustryAuthority['actor']>;
    try { actor = this.actor(command.playerId); } catch { return reject('UNKNOWN_PLAYER'); }
    if (!actor.alive) return reject('PLAYER_DEAD');
    if (actor.spaceId && actor.spaceId !== 'surface') return reject('WRONG_WORLDSPACE');
    const facilities = cloneFacilities(this.state);
    let links = this.state.links.map(l => ({ ...l }));
    const researchIds = [...this.state.researchIds];
    let events = [...this.state.events];
    let nextFacilityOrdinal = this.state.nextFacilityOrdinal;
    const inputs: IndustryCost[] = [], outputs: IndustryCost[] = [];
    let entityId: string | undefined;
    let driveTarget: WorldPosition | undefined;
    const target = facilities.find(f => f.id === command.targetId);
    if (!['research', 'build', 'disconnect'].includes(command.action)) {
      if (!target) return reject('SOURCE_MISSING');
      if (distance(actor.position, target.position) > INDUSTRY_INTERACTION_RANGE) return reject('OUT_OF_RANGE');
    }
    if (command.action === 'research') {
      const research = INDUSTRY_RESEARCH.find(r => r.id === command.targetId);
      if (!research) return reject('UNKNOWN_RESEARCH');
      if (distance(actor.position, { x: 0, y: 0 }) > INDUSTRY_RESEARCH_RANGE) return reject('RETURN_TO_BASE');
      if (researchIds.includes(research.id)) return reject('ALREADY_RESEARCHED');
      if (research.prerequisites.some(id => !researchIds.includes(id))
        || (research.colonyPrerequisite !== null && !this.world.hasResearch(research.colonyPrerequisite))) return reject('RESEARCH_PREREQUISITE');
      inputs.push(...research.costs); researchIds.push(research.id);
    } else if (command.action === 'build') {
      if (!command.facilityKind || !Object.hasOwn(INDUSTRY_FACILITIES, command.facilityKind)) return reject('UNKNOWN_FACILITY');
      const def = INDUSTRY_FACILITIES[command.facilityKind], position = command.position;
      if (!position) return reject('INVALID_POSITION');
      if (def.requiredResearch !== null && !researchIds.includes(def.requiredResearch)) return reject('RESEARCH_PREREQUISITE');
      if (facilities.length >= INDUSTRY_MAX_FACILITIES) return reject('FACILITY_LIMIT');
      if (distance(actor.position, position) > INDUSTRY_BUILD_RANGE) return reject('OUT_OF_RANGE');
      if (!this.world.canPlace(position) || facilities.some(f => distance(f.position, position) < 1.5)) return reject('PLACEMENT_BLOCKED');
      if (nextFacilityOrdinal >= Number.MAX_SAFE_INTEGER) return reject('FACILITY_LIMIT');
      inputs.push(...def.costs); entityId = 'industry:' + command.facilityKind + ':' + String(nextFacilityOrdinal++);
      const recipe = INDUSTRY_RECIPES.find(r => r.facilityKind === command.facilityKind
        && (r.requiredResearch === null || researchIds.includes(r.requiredResearch)));
      facilities.push({ id: entityId, kind: command.facilityKind, ownerPlayerId: command.playerId,
        position: { ...position }, buffer: [], recipeId: recipe?.id ?? null, enabled: true,
        progressTicks: 0, cycleOrdinal: 0, condition: 1000, wearTicks: 0, energy: 0, nextDriveTick: 0,
        powered: false, networkId: null, status: 'UNPOWERED' });
    } else if (command.action === 'disconnect') {
      const link = links.find(l => l.id === command.targetId);
      if (!link) return reject('SOURCE_MISSING');
      const source = facilities.find(f => f.id === link.sourceId)!;
      if (distance(actor.position, source.position) > INDUSTRY_INTERACTION_RANGE) return reject('OUT_OF_RANGE');
      links = links.filter(l => l.id !== link.id);
    } else if (target) {
      entityId = target.id;
      switch (command.action) {
        case 'dismantle':
          if (target.buffer.length > 0) return reject('EMPTY_BUFFER_FIRST');
          if (links.some(l => l.sourceId === target.id || l.destinationId === target.id)) return reject('DISCONNECT_CONVEYORS');
          outputs.push(...INDUSTRY_FACILITIES[target.kind].costs);
          facilities.splice(facilities.indexOf(target), 1);
          events = events.filter(event => event.facilityId !== target.id); break;
        case 'set-enabled':
          if (typeof command.enabled !== 'boolean') return reject('INVALID_COMMAND');
          if (target.enabled === command.enabled) return reject('ALREADY_SET');
          target.enabled = command.enabled; break;
        case 'set-recipe': {
          const recipe = INDUSTRY_RECIPES.find(r => r.id === command.recipeId);
          if (!recipe || recipe.facilityKind !== target.kind) return reject('UNKNOWN_RECIPE');
          if (recipe.requiredResearch !== null && !researchIds.includes(recipe.requiredResearch)) return reject('RESEARCH_PREREQUISITE');
          if (target.recipeId === recipe.id) return reject('ALREADY_SET');
          // Inputs remain in the buffer until a complete cycle; changing recipe cannot destroy escrowed supplies.
          target.recipeId = recipe.id; target.progressTicks = 0; break;
        }
        case 'deposit': case 'withdraw': {
          if (!command.itemDefinitionId || !INDUSTRY_ITEM_IDS.includes(command.itemDefinitionId)) return reject('ITEM_NOT_SUPPORTED');
          const quantity = command.quantity;
          if (!Number.isSafeInteger(quantity) || quantity === undefined || quantity <= 0 || quantity > 64) return reject('INVALID_QUANTITY');
          if (command.action === 'deposit') {
            if (industryBufferQuantity(target.buffer) + quantity > INDUSTRY_FACILITIES[target.kind].bufferCapacity) return reject('BUFFER_FULL');
            inputs.push({ itemDefinitionId: command.itemDefinitionId, quantity }); changeBuffer(target, command.itemDefinitionId, quantity);
          } else {
            if (materialQuantity(target, command.itemDefinitionId) < quantity) return reject('INSUFFICIENT_STOCK');
            outputs.push({ itemDefinitionId: command.itemDefinitionId, quantity }); changeBuffer(target, command.itemDefinitionId, -quantity);
          }
          break;
        }
        case 'connect': {
          if (!researchIds.includes('logistics')) return reject('RESEARCH_PREREQUISITE');
          const destination = facilities.find(f => f.id === command.destinationId);
          if (!destination || destination.id === target.id) return reject('INVALID_DESTINATION');
          if (INDUSTRY_FACILITIES[target.kind].bufferCapacity === 0 || INDUSTRY_FACILITIES[destination.kind].bufferCapacity === 0) return reject('NO_BUFFER');
          if (distance(target.position, destination.position) > INDUSTRY_CONVEYOR_RANGE) return reject('LINK_TOO_LONG');
          const itemDefinitionId = command.itemDefinitionId ?? null;
          if (itemDefinitionId !== null && !INDUSTRY_ITEM_IDS.includes(itemDefinitionId)) return reject('ITEM_NOT_SUPPORTED');
          if (links.length >= INDUSTRY_MAX_LINKS) return reject('LINK_LIMIT');
          const id = 'conveyor:' + target.id + ':' + destination.id + ':' + (itemDefinitionId ?? 'all');
          if (links.some(l => l.id === id)) return reject('ALREADY_CONNECTED');
          inputs.push(...INDUSTRY_CONVEYOR_COSTS);
          links.push({ id, sourceId: target.id, destinationId: destination.id, itemDefinitionId, enabled: true }); entityId = id; break;
        }
        case 'repair':
          if (target.condition === 1000) return reject('NO_REPAIR_NEEDED');
          inputs.push(...INDUSTRY_REPAIR_COSTS);
          target.condition = 1000; target.wearTicks = 0;
          events.push({ id: 'maintenance:' + target.id + ':repair:' + String(this.state.revision + 1), facilityId: target.id, tick: this.state.lastTick, type: 'REPAIRED' }); break;
        case 'drive': {
          if (target.kind !== 'rover' || !target.enabled || target.condition === 0) return reject('VEHICLE_UNAVAILABLE');
          if (this.state.lastTick < target.nextDriveTick) return reject('DRIVE_COOLDOWN');
          const position = command.position;
          if (!position) return reject('INVALID_POSITION');
          const tripDistance = distance(target.position, position);
          if (tripDistance <= 0 || tripDistance > INDUSTRY_ROVER_DRIVE_RANGE) return reject('DRIVE_RANGE');
          const energy = Math.ceil(tripDistance * 20);
          if (target.energy < energy) return reject('ENERGY_LOW');
          const samples = Math.ceil(tripDistance / 0.25);
          for (let i = 1; i <= samples; i++) {
            const point = { x: target.position.x + (position.x - target.position.x) * i / samples,
              y: target.position.y + (position.y - target.position.y) * i / samples };
            if (!this.world.canPlace(point) || facilities.some(f => f.id !== target.id && distance(f.position, point) < 1)) return reject('PATH_BLOCKED');
          }
          // A mobile endpoint must disconnect its conveyors before moving; links never silently stretch or teleport stock.
          if (links.some(l => l.sourceId === target.id || l.destinationId === target.id)) return reject('DISCONNECT_CONVEYORS');
          target.position = { ...position }; target.energy -= energy; target.nextDriveTick = this.state.lastTick + 60;
          this.wear(target, Math.ceil(tripDistance * 3), events, this.state.lastTick);
          driveTarget = position; break;
        }
      }
    }
    const revision = this.state.revision + 1;
    const inventoryRevision = command.expectedInventoryRevision + (inputs.length + outputs.length > 0 ? 1 : 0);
    if (!Number.isSafeInteger(inventoryRevision)) return reject('REVISION_EXHAUSTED');
    const powerNetworks = this.resolvePower(facilities);
    for (const facility of facilities) this.deriveStatus(facility);
    // Validate the entire extension before publishing a ledger draft: corrupt identities cannot spend supplies.
    const nextState = validateIndustryState({ ...this.state, revision, nextFacilityOrdinal, researchIds: researchIds.sort(), facilities,
      links, events: events.slice(-32), powerNetworks, receipts: [...this.state.receipts,
        { operationId: command.operationId, signature, revision, inventoryRevision,
          playerId: command.playerId, ...(entityId ? { entityId } : {}) }].slice(-128),
    } satisfies IndustryStateWithDraftFacilities);
    const exchange = this.items.commitColonyExchange({ operationId: command.operationId, playerId: command.playerId,
      expectedInventoryRevision: command.expectedInventoryRevision, inputs, outputs });
    if (exchange.status === 'rejected') return reject(exchange.reason);
    if (driveTarget !== undefined && !this.world.movePlayer(command.playerId, driveTarget)) return reject('PATH_BLOCKED');
    this.state = nextState;
    return Object.freeze({ status: 'committed', operationId: command.operationId, revision,
      inventoryRevision: exchange.inventoryRevision, ...(entityId ? { entityId } : {}) });
  }

  /** Advance one active fixed step; gaps adopt the clock without simulating offline yield. */
  public tick(authorityTick: number): void {
    if (!Number.isSafeInteger(authorityTick) || authorityTick < this.state.lastTick) throw new Error('Invalid industry tick.');
    if (authorityTick === this.state.lastTick) return;
    if (authorityTick > this.state.lastTick + 1) {
      this.state = validateIndustryState({ ...this.state, lastTick: authorityTick });
      this.refreshPower(); return;
    }
    if (this.state.revision >= Number.MAX_SAFE_INTEGER) throw new Error('Industry revision exhausted.');
    const facilities = cloneFacilities(this.state), events = [...this.state.events];
    const networks = this.resolvePower(facilities, authorityTick);
    if (authorityTick % INDUSTRY_TRANSPORT_INTERVAL_TICKS === 0) this.transport(facilities);
    for (const f of facilities) {
      this.deriveStatus(f);
      if (f.status === 'RUNNING') {
        const recipe = INDUSTRY_RECIPES.find(r => r.id === f.recipeId)!;
        f.progressTicks += 1;
        if (f.progressTicks >= recipe.cycleTicks) {
          for (const i of recipe.inputs) changeBuffer(f, i.itemDefinitionId, -i.quantity);
          for (const o of recipe.outputs) changeBuffer(f, o.itemDefinitionId, o.quantity);
          f.progressTicks = 0; f.cycleOrdinal += 1;
        }
      }
      if (f.status === 'CHARGING') f.energy = Math.min(1000, f.energy + 2);
      if (['RUNNING', 'CHARGING', 'POWER_SOURCE', 'RELAY'].includes(f.status)) {
        f.wearTicks += 1;
        if (f.wearTicks === INDUSTRY_MAINTENANCE_INTERVAL_TICKS) {
          f.wearTicks = 0; this.wear(f, 2, events, authorityTick);
        }
      }
      this.deriveStatus(f);
    }
    // Commands compare the control revision. Active progress has a separately published tick-based view revision.
    // Advancing control revision at 60 Hz would reject every remote command during its round trip.
    this.state = validateIndustryState({ ...this.state,
      lastTick: authorityTick, facilities, powerNetworks: networks, events: events.slice(-32) });
    // A source or relay breaking down must stop all dependent machines before the next operation.
    this.refreshPower();
  }

  private refreshPower(): void {
    const facilities = cloneFacilities(this.state);
    const powerNetworks = this.resolvePower(facilities);
    for (const f of facilities) this.deriveStatus(f);
    this.state = validateIndustryState({ ...this.state, facilities, powerNetworks });
  }
  private deriveStatus(f: MutableFacility): void {
    if (!f.enabled) f.status = 'DISABLED';
    else if (f.condition === 0) f.status = 'MAINTENANCE';
    else if (f.kind === 'depot') f.status = 'STORAGE';
    else if (f.kind === 'solar-array') f.status = f.powered ? 'POWER_SOURCE' : 'UNPOWERED';
    else if (f.kind === 'power-relay') f.status = f.powered ? 'RELAY' : 'UNPOWERED';
    else if (f.kind === 'rover') f.status = f.powered && f.energy < 1000 ? 'CHARGING' : 'READY';
    else if (f.networkId === null) f.status = 'UNPOWERED';
    else {
      f.status = canRunRecipe(f);
      if (f.status === 'RUNNING' && !f.powered) f.status = 'UNPOWERED';
    }
  }
  private resolvePower(facilities: MutableFacility[], authorityTick = this.state.lastTick): IndustryPowerNetworkState[] {
    for (const f of facilities) { f.powered = false; f.networkId = null; }
    const localMinute = (540 + Math.floor(authorityTick / 120)) % 1440;
    const solarActive = this.world.solarActive?.(authorityTick) ?? (localMinute >= 360 && localMinute < 1200);
    const nodes = facilities.filter(f => f.enabled && f.condition > 0 && (f.kind === 'power-relay' || (f.kind === 'solar-array' && solarActive)))
      .sort((a, b) => a.id.localeCompare(b.id));
    const remaining = new Set(nodes.map(n => n.id));
    const components: MutableFacility[][] = [];
    for (const node of nodes) {
      if (!remaining.delete(node.id)) continue;
      const component = [node];
      for (let i = 0; i < component.length; i++)
        for (const candidate of nodes)
          if (remaining.has(candidate.id) && distance(component[i]!.position, candidate.position)
            <= Math.min(INDUSTRY_FACILITIES[component[i]!.kind].powerRadius, INDUSTRY_FACILITIES[candidate.kind].powerRadius)) {
            remaining.delete(candidate.id); component.push(candidate);
          }
      if (component.some(n => n.kind === 'solar-array')) components.push(component.sort((a, b) => a.id.localeCompare(b.id)));
    }
    const networks = components.map(component => ({ id: 'industry-grid:' + component[0]!.id,
      producerIds: component.filter(n => n.kind === 'solar-array').map(n => n.id),
      relayIds: component.filter(n => n.kind === 'power-relay').map(n => n.id), consumerIds: [] as string[],
      capacity: component.reduce((sum, n) => sum + INDUSTRY_FACILITIES[n.kind].powerCapacity, 0), usedCapacity: 0 }));
    for (let i = 0; i < components.length; i++)
      for (const n of components[i]!) { n.powered = true; n.networkId = networks[i]!.id; }
    for (const consumer of [...facilities].sort((a, b) => a.id.localeCompare(b.id))) {
      const demand = INDUSTRY_FACILITIES[consumer.kind].powerDemand;
      if (demand === 0 || !consumer.enabled || consumer.condition === 0) continue;
      const requestingPower = consumer.kind === 'rover' ? consumer.energy < 1000 : canRunRecipe(consumer) === 'RUNNING';
      for (let i = 0; i < components.length; i++) {
        const network = networks[i]!;
        if (components[i]!.some(n => distance(n.position, consumer.position) <= INDUSTRY_FACILITIES[n.kind].powerRadius)) {
          consumer.networkId ??= network.id;
          if (!requestingPower) break;
          if (network.usedCapacity + demand > network.capacity) continue;
          network.usedCapacity += demand; network.consumerIds.push(consumer.id);
          consumer.powered = true; consumer.networkId = network.id; break;
        }
      }
    }
    return networks;
  }
  private transport(facilities: MutableFacility[]): void {
    const original = new Map(facilities.map(f => [f.id, f.buffer.map(i => ({ ...i }))]));
    const spent = new Map<string, number>();
    for (const link of this.state.links) {
      if (!link.enabled) continue;
      const source = facilities.find(f => f.id === link.sourceId)!, destination = facilities.find(f => f.id === link.destinationId)!;
      if (!source.enabled || !destination.enabled || source.condition === 0 || destination.condition === 0
        || industryBufferQuantity(destination.buffer) >= INDUSTRY_FACILITIES[destination.kind].bufferCapacity) continue;
      const item = original.get(source.id)!.find(i => (link.itemDefinitionId === null || link.itemDefinitionId === i.itemDefinitionId)
        && i.quantity > (spent.get(source.id + ':' + i.itemDefinitionId) ?? 0));
      if (!item) continue;
      changeBuffer(source, item.itemDefinitionId, -1); changeBuffer(destination, item.itemDefinitionId, 1);
      const key = source.id + ':' + item.itemDefinitionId; spent.set(key, (spent.get(key) ?? 0) + 1);
    }
  }
  private wear(f: MutableFacility, amount: number, events: IndustryMaintenanceEvent[], tick: number): void {
    const before = f.condition; f.condition = Math.max(0, f.condition - amount);
    const type = before > 0 && f.condition === 0 ? 'BREAKDOWN' : before > 200 && f.condition <= 200 ? 'SERVICE_DUE' : null;
    if (type !== null) events.push({ id: 'maintenance:' + f.id + ':' + String(tick) + ':' + type,
      facilityId: f.id, tick, type });
  }
}
type IndustryStateWithDraftFacilities = Omit<IndustryState, 'facilities' | 'researchIds'> & {
  readonly facilities: readonly MutableFacility[];
  readonly researchIds: readonly IndustryResearchId[];
};
