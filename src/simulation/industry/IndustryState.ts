import {
  INDUSTRY_CONTENT_VERSION, INDUSTRY_FACILITIES, INDUSTRY_ITEM_IDS,
  INDUSTRY_MAX_FACILITIES, INDUSTRY_MAX_LINKS, INDUSTRY_RECIPES, INDUSTRY_RESEARCH,
  INDUSTRY_MAINTENANCE_INTERVAL_TICKS, INDUSTRY_CONVEYOR_RANGE,
  type IndustryCost, type IndustryFacilityKind, type IndustryResearchId,
} from '../../content/phase3/IndustryContent';
import type { WorldPosition } from '../../foundation';

export type IndustryFacilityStatus = 'DISABLED' | 'MAINTENANCE' | 'UNPOWERED'
  | 'WAITING_INPUT' | 'OUTPUT_FULL' | 'RUNNING' | 'STORAGE' | 'POWER_SOURCE'
  | 'RELAY' | 'CHARGING' | 'READY';
export interface IndustryFacilityState {
  readonly id: string;
  readonly kind: IndustryFacilityKind;
  readonly ownerPlayerId: string;
  readonly position: WorldPosition;
  readonly buffer: readonly IndustryCost[];
  readonly recipeId: string | null;
  readonly enabled: boolean;
  readonly progressTicks: number;
  readonly cycleOrdinal: number;
  readonly condition: number;
  readonly wearTicks: number;
  readonly energy: number;
  readonly nextDriveTick: number;
  readonly powered: boolean;
  readonly networkId: string | null;
  readonly status: IndustryFacilityStatus;
}
export interface IndustryLinkState {
  readonly id: string;
  readonly sourceId: string;
  readonly destinationId: string;
  readonly itemDefinitionId: string | null;
  readonly enabled: boolean;
}
export interface IndustryPowerNetworkState {
  readonly id: string;
  readonly producerIds: readonly string[];
  readonly relayIds: readonly string[];
  readonly consumerIds: readonly string[];
  readonly capacity: number;
  readonly usedCapacity: number;
}
export interface IndustryReceipt {
  readonly operationId: string;
  readonly signature: string;
  readonly revision: number;
  readonly inventoryRevision: number;
  readonly playerId: string;
  readonly entityId?: string;
}
export interface IndustryMaintenanceEvent {
  readonly id: string;
  readonly facilityId: string;
  readonly tick: number;
  readonly type: 'SERVICE_DUE' | 'BREAKDOWN' | 'REPAIRED';
}
export interface IndustryState {
  readonly contentVersion: typeof INDUSTRY_CONTENT_VERSION;
  readonly revision: number;
  readonly lastTick: number;
  readonly nextFacilityOrdinal: number;
  readonly researchIds: readonly IndustryResearchId[];
  readonly facilities: readonly IndustryFacilityState[];
  readonly links: readonly IndustryLinkState[];
  readonly powerNetworks: readonly IndustryPowerNetworkState[];
  readonly receipts: readonly IndustryReceipt[];
  readonly events: readonly IndustryMaintenanceEvent[];
}
export function emptyIndustryState(lastTick = 0): IndustryState {
  if (!Number.isSafeInteger(lastTick) || lastTick < 0) throw new Error('Invalid industry clock.');
  return Object.freeze({ contentVersion: INDUSTRY_CONTENT_VERSION, revision: 0, lastTick, nextFacilityOrdinal: 1,
    researchIds: Object.freeze([]), facilities: Object.freeze([]), links: Object.freeze([]),
    powerNetworks: Object.freeze([]), receipts: Object.freeze([]), events: Object.freeze([]) });
}

/**
 * Returns true only when dropping Industry state would lose canonical progress
 * rather than a reconstructable empty authority clock.
 */
export function industryStateHasDurableProgress(state: IndustryState): boolean {
  return state.revision !== 0
    || state.nextFacilityOrdinal !== 1
    || state.researchIds.length !== 0
    || state.facilities.length !== 0
    || state.links.length !== 0
    || state.powerNetworks.length !== 0
    || state.receipts.length !== 0
    || state.events.length !== 0;
}
export function validIndustryPosition(value: unknown): value is WorldPosition {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as WorldPosition;
  return Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 1_000_000 && Math.abs(p.y) <= 1_000_000;
}
export function industryBufferQuantity(buffer: readonly IndustryCost[]): number {
  return buffer.reduce((sum, item) => sum + item.quantity, 0);
}
const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256;
const uniqueText = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(text) && new Set(value).size === value.length;
const statuses: readonly IndustryFacilityStatus[] = ['DISABLED', 'MAINTENANCE', 'UNPOWERED',
  'WAITING_INPUT', 'OUTPUT_FULL', 'RUNNING', 'STORAGE', 'POWER_SOURCE', 'RELAY', 'CHARGING', 'READY'];

/** Rejects future/corrupt extension data before any authority or item mutation. */
export function validateIndustryState(value: unknown): IndustryState {
  if (typeof value !== 'object' || value === null) throw new Error('Missing industry state.');
  const state = value as IndustryState;
  if (state.contentVersion !== INDUSTRY_CONTENT_VERSION || !natural(state.revision)
    || !natural(state.lastTick) || !natural(state.nextFacilityOrdinal) || state.nextFacilityOrdinal === 0 || !uniqueText(state.researchIds)
    || state.researchIds.some(id => !INDUSTRY_RESEARCH.some(r => r.id === id))
    || !Array.isArray(state.facilities) || state.facilities.length > INDUSTRY_MAX_FACILITIES
    || !Array.isArray(state.links) || state.links.length > INDUSTRY_MAX_LINKS
    || !Array.isArray(state.powerNetworks) || state.powerNetworks.length > INDUSTRY_MAX_FACILITIES
    || !Array.isArray(state.receipts) || state.receipts.length > 128
    || !Array.isArray(state.events) || state.events.length > 32) throw new Error('Invalid industry state.');
  for (const id of state.researchIds) {
    const def = INDUSTRY_RESEARCH.find(r => r.id === id)!;
    if (def.prerequisites.some(parent => !state.researchIds.includes(parent))) throw new Error('Missing industry research prerequisite.');
  }
  const facilities = new Map<string, IndustryFacilityState>();
  const ordinals = new Set<number>();
  for (const f of state.facilities as readonly IndustryFacilityState[]) {
    if (!f || !text(f.id) || facilities.has(f.id) || !text(f.ownerPlayerId)
      || !Object.hasOwn(INDUSTRY_FACILITIES, f.kind) || !validIndustryPosition(f.position)
      || typeof f.enabled !== 'boolean' || typeof f.powered !== 'boolean'
      || !natural(f.progressTicks) || !natural(f.cycleOrdinal) || !natural(f.condition) || f.condition > 1000
      || !natural(f.wearTicks) || f.wearTicks >= INDUSTRY_MAINTENANCE_INTERVAL_TICKS
      || !natural(f.energy) || f.energy > 1000 || !statuses.includes(f.status)
      || !natural(f.nextDriveTick) || f.nextDriveTick > state.lastTick + 60
      || !(f.networkId === null || text(f.networkId)) || !Array.isArray(f.buffer)) throw new Error('Invalid industry facility.');
    const def = INDUSTRY_FACILITIES[f.kind];
    const ordinal = Number(f.id.split(':').at(-1));
    if (!natural(ordinal) || ordinal === 0 || ordinal >= state.nextFacilityOrdinal || ordinals.has(ordinal)
      || f.id !== 'industry:' + f.kind + ':' + String(ordinal)) throw new Error('Invalid industry facility identity sequence.');
    ordinals.add(ordinal);
    if (def.requiredResearch !== null && !state.researchIds.includes(def.requiredResearch)) throw new Error('Missing facility research.');
    if (f.buffer.length > INDUSTRY_ITEM_IDS.length
      || new Set(f.buffer.map((i: IndustryCost) => i.itemDefinitionId)).size !== f.buffer.length
      || f.buffer.some((i: IndustryCost) => !i || !INDUSTRY_ITEM_IDS.includes(i.itemDefinitionId) || !natural(i.quantity) || i.quantity === 0)
      || industryBufferQuantity(f.buffer) > def.bufferCapacity) throw new Error('Invalid industry buffer.');
    const recipe = INDUSTRY_RECIPES.find(r => r.id === f.recipeId);
    if (f.recipeId !== null && (!recipe || recipe.facilityKind !== f.kind
      || (recipe.requiredResearch !== null && !state.researchIds.includes(recipe.requiredResearch)))) throw new Error('Invalid saved industry recipe.');
    if ((recipe && f.progressTicks >= recipe.cycleTicks) || (!recipe && f.progressTicks !== 0)) throw new Error('Invalid production progress.');
    facilities.set(f.id, f);
  }
  const links = new Set<string>();
  for (const link of state.links) {
    if (!link || !text(link.id) || links.has(link.id) || link.sourceId === link.destinationId
      || typeof link.enabled !== 'boolean' || !facilities.has(link.sourceId) || !facilities.has(link.destinationId)
      || !(link.itemDefinitionId === null || INDUSTRY_ITEM_IDS.includes(link.itemDefinitionId))) throw new Error('Invalid conveyor link.');
    const source = facilities.get(link.sourceId)!, destination = facilities.get(link.destinationId)!;
    if (!state.researchIds.includes('logistics') || INDUSTRY_FACILITIES[source.kind].bufferCapacity === 0
      || INDUSTRY_FACILITIES[destination.kind].bufferCapacity === 0
      || Math.hypot(source.position.x - destination.position.x, source.position.y - destination.position.y) > INDUSTRY_CONVEYOR_RANGE) throw new Error('Invalid conveyor endpoints.');
    links.add(link.id);
  }
  const networks = new Set<string>();
  for (const network of state.powerNetworks as readonly IndustryPowerNetworkState[]) {
    if (!network || !text(network.id) || networks.has(network.id)
      || !uniqueText(network.producerIds) || !uniqueText(network.relayIds) || !uniqueText(network.consumerIds)
      || network.producerIds.length === 0 || !natural(network.capacity) || !natural(network.usedCapacity)
      || network.usedCapacity > network.capacity
      || network.producerIds.some(id => facilities.get(id)?.kind !== 'solar-array')
      || network.relayIds.some(id => facilities.get(id)?.kind !== 'power-relay')
      || network.consumerIds.some(id => !facilities.has(id))
      || network.capacity !== network.producerIds.reduce((sum, id) => sum + INDUSTRY_FACILITIES[facilities.get(id)!.kind].powerCapacity, 0)
      || network.usedCapacity !== network.consumerIds.reduce((sum, id) => sum + INDUSTRY_FACILITIES[facilities.get(id)!.kind].powerDemand, 0)) throw new Error('Invalid industry power network.');
    networks.add(network.id);
  }
  for (const f of facilities.values())
    if ((f.networkId !== null && !networks.has(f.networkId))
      || (f.powered && f.networkId === null)) throw new Error('Invalid power assignment.');
  const receipts = new Set<string>();
  for (const receipt of state.receipts) {
    if (!receipt || !text(receipt.operationId) || receipts.has(receipt.operationId)
      || typeof receipt.signature !== 'string' || receipt.signature.length === 0 || receipt.signature.length > 4096
      || !natural(receipt.revision) || receipt.revision > state.revision || !natural(receipt.inventoryRevision)
      || !text(receipt.playerId) || (receipt.entityId !== undefined && !text(receipt.entityId))) throw new Error('Invalid industry receipt.');
    receipts.add(receipt.operationId);
    if (receipt.entityId?.startsWith('industry:')) {
      const ordinal = Number(receipt.entityId.split(':').at(-1));
      if (!natural(ordinal) || ordinal === 0 || ordinal >= state.nextFacilityOrdinal) throw new Error('Invalid saved industry identity sequence.');
    }
  }
  const eventIds = new Set<string>();
  for (const event of state.events) {
    if (!event || !text(event.id) || eventIds.has(event.id) || !facilities.has(event.facilityId)
      || !natural(event.tick) || event.tick > state.lastTick
      || !['SERVICE_DUE', 'BREAKDOWN', 'REPAIRED'].includes(event.type)) throw new Error('Invalid industry event.');
    eventIds.add(event.id);
  }
  return Object.freeze({ ...state, researchIds: Object.freeze([...state.researchIds].sort()),
    facilities: Object.freeze([...state.facilities].sort((a, b) => a.id.localeCompare(b.id)).map(f => Object.freeze({ ...f,
      position: Object.freeze({ ...f.position }), buffer: Object.freeze([...f.buffer].sort((a, b) => a.itemDefinitionId.localeCompare(b.itemDefinitionId)).map(i => Object.freeze({ ...i }))) }))),
    links: Object.freeze([...state.links].sort((a, b) => a.id.localeCompare(b.id)).map(l => Object.freeze({ ...l }))),
    powerNetworks: Object.freeze(state.powerNetworks.map(n => Object.freeze({ ...n,
      producerIds: Object.freeze([...n.producerIds]), relayIds: Object.freeze([...n.relayIds]), consumerIds: Object.freeze([...n.consumerIds]) }))),
    receipts: Object.freeze(state.receipts.map(r => Object.freeze({ ...r }))),
    events: Object.freeze(state.events.map(e => Object.freeze({ ...e }))),
  });
}
