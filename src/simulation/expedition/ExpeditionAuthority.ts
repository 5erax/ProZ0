import {
  expeditionEventKind,
  expeditionRegion,
  expeditionRenewalMultiplier,
} from '../../content/singleplayer/ExpeditionEcology';
import type { Phase1ItemAuthority } from '../items';
import type {
  PlacementIntent,
  Phase1StructureDefinitionId,
} from '../../world/building/BuildingTypes';
import {
  PHASE1_STRUCTURE_PLACEMENT_PROFILES,
  type Phase1BuildingWorld,
} from '../../world/building/Phase1BuildingWorld';
import {
  EXPEDITION_RECIPES,
  expeditionFacility,
} from '../../content/singleplayer/ExpeditionContent';
import {
  emptyExpeditionState,
  validateExpeditionState,
  type ExpeditionState,
  type ExpeditionPlan,
} from './ExpeditionState';
export interface ExpeditionActor {
  readonly x: number;
  readonly y: number;
  readonly alive: boolean;
}
export interface ExpeditionCommand {
  readonly id: string;
  readonly playerId: string;
  readonly expectedRevision: number;
  readonly expectedInventoryRevision: number;
  readonly action:
    | 'plan'
    | 'move'
    | 'deposit'
    | 'complete'
    | 'cancel'
    | 'dismantle'
    | 'relocate';
  readonly target: string;
  readonly expectedBuildRevision?: number;
  readonly x?: number;
  readonly y?: number;
  readonly orientation?: 0 | 1 | 2 | 3;
}
export interface ExpeditionResult {
  readonly status: 'committed' | 'rejected';
  readonly message: string;
}
export interface ExpeditionServices {
  readonly seed?: string;
  built?(playerId: string, structureId: string, operationId: string): void;
  crafted?(playerId: string, recipeId: string, operationId: string): void;
  pressure?(region: string): number;
  tick(): number;
  survival(playerId: string): {
    healthMilli: number;
    foodMilli: number;
    waterMilli: number;
    lifeState: { type: string };
  };
  completeRest(playerId: string): boolean;
  meal(playerId: string): boolean;
  weather(x: number, y: number): string;
  hostileNear(x: number, y: number): boolean;
}
export class ExpeditionAuthority {
  private readonly resting = new Map<
    string,
    { target: string; x: number; y: number; start: number; health: number }
  >();
  public restStatus(playerId: string): { remainingTicks: number } | null {
    const rest = this.resting.get(playerId);
    return rest && this.services
      ? {
          remainingTicks: Math.max(
            0,
            480 - (this.services.tick() - rest.start),
          ),
        }
      : null;
  }
  public hasRemoteLab(playerId: string): boolean {
    const actor = this.actor(playerId);
    return this.state.facilities.some(
      (f) =>
        f.definitionId === 'field-lab' &&
        Math.hypot(f.x - actor.x, f.y - actor.y) <= 4,
    );
  }
  public cancelRest(playerId: string): void {
    this.resting.delete(playerId);
  }
  public currentEvent(point: { x: number; y: number }) {
    const tick = this.services?.tick() ?? 0,
      region = expeditionRegion(point);
    return [...this.state.events]
      .reverse()
      .find((e) => e.region === region && e.untilTick > tick)?.kind;
  }
  public recoveryMultiplier(
    point: { x: number; y: number },
    resource: string,
  ): number {
    return expeditionRenewalMultiplier(resource, this.currentEvent(point));
  }
  public tick(): void {
    this.reconcile();
    if (!this.services) return;
    const tick = this.services.tick();
    if (tick >= this.state.nextEventTick) {
      const owner =
        this.state.facilities[0]?.owner ??
        this.items
          .exportLedgerSnapshot()
          .containers.find((c) => c.kind === 'player-inventory')?.ownerPlayerId;
      if (owner) {
        const actor = this.actor(owner),
          region = expeditionRegion(actor);
        const event = {
          tick,
          region,
          kind: expeditionEventKind(
            this.services.seed ?? 'expedition',
            tick,
            region,
            this.services.pressure?.(region) ?? 0,
            this.services.weather(actor.x, actor.y),
          ),
          untilTick: tick + 10800,
        };
        this.state = validateExpeditionState({
          ...this.state,
          revision: this.state.revision + 1,
          nextEventTick: (Math.floor(tick / 7200) + 1) * 7200,
          events: [...this.state.events, event].slice(-32),
        });
      }
    }
    for (const [playerId, rest] of this.resting) {
      const actor = this.actor(playerId),
        survival = this.services.survival(playerId);
      if (
        !actor.alive ||
        Math.hypot(actor.x - rest.x, actor.y - rest.y) > 0.05 ||
        survival.healthMilli < rest.health ||
        this.services.hostileNear(actor.x, actor.y) ||
        survival.foodMilli < 15000 ||
        survival.waterMilli < 15000
      ) {
        this.resting.delete(playerId);
        continue;
      }
      if (tick - rest.start >= 480) {
        this.resting.delete(playerId);
        if (this.services.completeRest(playerId))
          this.state = validateExpeditionState({
            ...this.state,
            revision: this.state.revision + 1,
            restCooldown: {
              ...this.state.restCooldown,
              [playerId]: tick + 1800,
            },
          });
      }
    }
    let changed = false;
    const facilities = this.state.facilities.map((f) => {
      if (
        f.definitionId !== 'rain-collector' ||
        f.water >= 4 ||
        this.services!.weather(f.x, f.y) !== 'mist-rain'
      )
        return f;
      changed = true;
      const progress = f.progress + 1;
      return progress >= 3600
        ? { ...f, progress: 0, water: f.water + 1 }
        : { ...f, progress };
    });
    if (changed)
      this.state = validateExpeditionState({
        ...this.state,
        facilities,
        revision: this.state.revision + 1,
      });
  }
  public interact(command: {
    id: string;
    playerId: string;
    target: string;
    action: 'rest' | 'supplies' | 'cook' | 'water';
    expectedRevision: number;
    expectedInventoryRevision: number;
  }): ExpeditionResult {
    const reject = (message: string): ExpeditionResult => ({
      status: 'rejected',
      message,
    });
    if (!this.services) return reject('SERVICES_UNAVAILABLE');
    const signature = JSON.stringify(command),
      receipt = this.state.receipts.find((r) => r.id === command.id);
    if (receipt)
      return receipt.signature === signature
        ? { status: 'committed', message: receipt.result }
        : reject('OPERATION_ID_CONFLICT');
    if (
      !command.id ||
      command.id.length > 120 ||
      command.expectedRevision !== this.state.revision
    )
      return reject('STALE_REVISION');
    const actor = this.actor(command.playerId);
    if (!actor.alive) return reject('PLAYER_DEAD');
    const facility = this.state.facilities.find((f) => f.id === command.target),
      lab = command.target === 'landing-lab';
    if (!facility && !lab) return reject('FACILITY_MISSING');
    const x = lab ? 0 : facility!.x,
      y = lab ? 0 : facility!.y;
    if (Math.hypot(actor.x - x, actor.y - y) > 4) return reject('OUT_OF_RANGE');
    const inventory = this.items.getContainerView(
      'inventory:' + command.playerId,
    );
    if (inventory.revision !== command.expectedInventoryRevision)
      return reject('STALE_INVENTORY_REVISION');
    let next = this.state;
    let message: string;
    if (command.action === 'rest') {
      if (!lab && facility?.definitionId !== 'camp-bed')
        return reject('BED_REQUIRED');
      if (this.resting.has(command.playerId)) return reject('ALREADY_RESTING');
      const survival = this.services.survival(command.playerId);
      if (
        (this.state.restCooldown[command.playerId] ?? 0) > this.services.tick()
      )
        return reject('REST_COOLDOWN');
      if (survival.foodMilli < 15000 || survival.waterMilli < 15000)
        return reject('FOOD_AND_WATER_REQUIRED');
      if (this.services.hostileNear(actor.x, actor.y))
        return reject('HOSTILE_NEARBY');
      this.resting.set(command.playerId, {
        target: command.target,
        x: actor.x,
        y: actor.y,
        start: this.services.tick(),
        health: survival.healthMilli,
      });
      message = 'REST_STARTED';
    } else {
      this.cancelRest(command.playerId);
      let inputs: { itemDefinitionId: string; quantity: number }[] = [],
        outputs: { itemDefinitionId: string; quantity: number }[] = [];
      if (command.action === 'supplies') {
        if (!lab) return reject('LANDING_LAB_REQUIRED');
        if (next.supplyClaimed.includes(command.playerId))
          return reject('SUPPLIES_ALREADY_CLAIMED');
        outputs = [
          { itemDefinitionId: 'item:clean-water', quantity: 3 },
          { itemDefinitionId: 'item:edible-plant', quantity: 3 },
          { itemDefinitionId: 'item:plant-fiber', quantity: 6 },
          { itemDefinitionId: 'item:field-dressing', quantity: 1 },
        ];
      } else if (command.action === 'cook') {
        if (facility?.definitionId !== 'campfire')
          return reject('CAMPFIRE_REQUIRED');
        if (this.services.survival(command.playerId).foodMilli >= 100000)
          return reject('FOOD_FULL');
        inputs = [
          { itemDefinitionId: 'item:edible-plant', quantity: 1 },
          { itemDefinitionId: 'item:clean-water', quantity: 1 },
        ];
      } else if (command.action === 'water') {
        if (facility?.definitionId !== 'rain-collector' || facility.water < 1)
          return reject('NO_COLLECTED_WATER');
        outputs = [
          { itemDefinitionId: 'item:clean-water', quantity: facility.water },
        ];
      } else return reject('INVALID_ACTION');
      const result = this.items.commitColonyExchange({
        operationId: command.id,
        playerId: command.playerId,
        expectedInventoryRevision: command.expectedInventoryRevision,
        inputs,
        outputs,
      });
      if (result.status === 'rejected') return reject(result.reason);
      if (command.action === 'supplies')
        next = {
          ...next,
          supplyClaimed: [...next.supplyClaimed, command.playerId],
        };
      else if (command.action === 'cook') this.services.meal(command.playerId);
      else
        next = {
          ...next,
          facilities: next.facilities.map((f) =>
            f.id === command.target ? { ...f, water: 0 } : f,
          ),
        };
      message = 'FACILITY_ACTION_COMPLETED';
    }
    this.state = validateExpeditionState({
      ...next,
      revision: next.revision + 1,
      receipts: [
        ...next.receipts,
        { id: command.id, signature, result: message },
      ].slice(-96),
    });
    return { status: 'committed', message };
  }
  private state: ExpeditionState;
  public constructor(
    private readonly items: Phase1ItemAuthority,
    private readonly buildings: Phase1BuildingWorld,
    private readonly actor: (player: string) => ExpeditionActor,
    initial?: ExpeditionState,
    private readonly services?: ExpeditionServices,
  ) {
    this.state = validateExpeditionState(
      initial ?? {
        ...emptyExpeditionState(),
        nextEventTick: (Math.floor((services?.tick() ?? 0) / 7200) + 1) * 7200,
      },
    );
  }
  public read(): ExpeditionState {
    return this.state;
  }
  public reconcile(): void {
    const facilities = this.state.facilities.filter(
      (f) =>
        f.canonicalStructureId === null ||
        this.buildings.getStructure(f.canonicalStructureId) !== null,
    );
    if (facilities.length !== this.state.facilities.length)
      this.state = validateExpeditionState({
        ...this.state,
        facilities,
        revision: this.state.revision + 1,
      });
  }
  private spatial(
    definition: string,
    x: number,
    y: number,
    orientation: 0 | 1 | 2 | 3,
    ignoreId = '',
  ): string | null {
    const def = expeditionFacility(definition);
    if (
      !def ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.abs(x) > 1e7 ||
      Math.abs(y) > 1e7 ||
      ![0, 1, 2, 3].includes(orientation)
    )
      return 'INVALID_POSITION';
    const assessment = this.buildings.assessPlacement(
      def.shape,
      { mode: 'free', anchor: { x, y }, orientationQuarterTurns: orientation },
      def.canonical === null,
    );
    if (typeof assessment === 'string') return assessment;
    if (
      [
        ...this.state.plans,
        ...this.state.facilities.filter((f) => f.canonicalStructureId === null),
      ].some(
        (p) =>
          p.id !== ignoreId &&
          Math.abs(p.x - x) < 1.5 &&
          Math.abs(p.y - y) < 1.5,
      )
    )
      return 'PLAN_OVERLAP';
    return null;
  }
  public relocationInfo(target: string) {
    const facility = this.state.facilities.find((f) => f.id === target);
    if (facility) {
      const def = expeditionFacility(facility.definitionId)!;
      return {
        x: facility.x,
        y: facility.y,
        orientation: facility.orientation,
        owner: facility.owner,
        shape: def.shape,
        canonicalId: facility.canonicalStructureId,
        facilityId: facility.id,
      };
    }
    const structure = this.buildings.getStructure(target);
    if (!structure || structure.definitionId === 'structure:landing-module')
      return null;
    return {
      x: structure.position.x,
      y: structure.position.y,
      orientation: structure.orientationQuarterTurns,
      owner: structure.placedByPlayerId,
      shape: structure.definitionId,
      canonicalId: structure.structureId,
      facilityId: null,
    };
  }
  public relocationPosition(
    target: string,
    x: number,
    y: number,
    orientation: 0 | 1 | 2 | 3,
  ) {
    const info = this.relocationInfo(target);
    if (info?.shape === 'structure:habitat-room') {
      const offset =
        (PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:landing-module']
          .connectorOffsetWorldUnits ?? 0) +
        (PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:habitat-room']
          .connectorOffsetWorldUnits ?? 0);
      const [dx, dy] = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][orientation]!;
      return { x: dx! * offset, y: dy! * offset };
    }
    return { x, y };
  }
  private relocationIntent(
    info: NonNullable<ReturnType<ExpeditionAuthority['relocationInfo']>>,
    x: number,
    y: number,
    orientation: 0 | 1 | 2 | 3,
  ): PlacementIntent {
    if (info.shape === 'structure:habitat-room') {
      const side = ['east', 'south', 'west', 'north'][orientation]!;
      return {
        mode: 'connector',
        targetConnectorId: 'connector:landing:' + side,
        requestedOrientationQuarterTurns: orientation,
      };
    }
    return {
      mode: 'free',
      anchor: { x, y },
      orientationQuarterTurns: orientation,
    };
  }
  public assessRelocationPreview(
    playerId: string,
    target: string,
    x: number,
    y: number,
    orientation: 0 | 1 | 2 | 3,
  ): string | null {
    const info = this.relocationInfo(target);
    if (!info) return 'FACILITY_MISSING';
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      Math.abs(x) > 1e7 ||
      Math.abs(y) > 1e7 ||
      ![0, 1, 2, 3].includes(orientation)
    )
      return 'INVALID_POSITION';
    let actor: ExpeditionActor;
    try {
      actor = this.actor(playerId);
    } catch {
      return 'UNKNOWN_PLAYER';
    }
    if (!actor.alive) return 'PLAYER_DEAD';
    if (info.owner !== playerId) return 'NOT_STRUCTURE_OWNER';
    const position = this.relocationPosition(target, x, y, orientation);
    if (
      Math.hypot(actor.x - info.x, actor.y - info.y) > 4 ||
      Math.hypot(actor.x - position.x, actor.y - position.y) > 4
    )
      return 'OUT_OF_RANGE';
    if (
      [
        ...this.state.plans,
        ...this.state.facilities.filter((f) => f.canonicalStructureId === null),
      ].some(
        (f) =>
          f.id !== info.facilityId &&
          Math.abs(f.x - position.x) < 1.5 &&
          Math.abs(f.y - position.y) < 1.5,
      )
    )
      return 'PLAN_OVERLAP';
    if (info.canonicalId) {
      const assessment = this.buildings.assessRelocation(
        info.canonicalId,
        this.relocationIntent(info, position.x, position.y, orientation),
      );
      return typeof assessment === 'string' ? assessment : null;
    }
    return this.spatial(
      this.state.facilities.find((f) => f.id === target)!.definitionId,
      position.x,
      position.y,
      orientation,
      target,
    );
  }

  public previewFootprint(
    definition: string,
    orientation: 0 | 1 | 2 | 3,
  ): { width: number; depth: number } | null {
    const def = expeditionFacility(definition);
    const shape =
      def?.shape ??
      (definition in PHASE1_STRUCTURE_PLACEMENT_PROFILES
        ? (definition as Phase1StructureDefinitionId)
        : null);
    if (!shape) return null;
    const size = PHASE1_STRUCTURE_PLACEMENT_PROFILES[shape].footprint;
    return orientation % 2
      ? { width: size.depth, depth: size.width }
      : { width: size.width, depth: size.depth };
  }
  public assessPreview(
    playerId: string,
    definition: string,
    x: number,
    y: number,
    orientation: 0 | 1 | 2 | 3,
    planId?: string,
  ): string | null {
    let actor: ExpeditionActor;
    try {
      actor = this.actor(playerId);
    } catch {
      return 'UNKNOWN_PLAYER';
    }
    if (!actor.alive) return 'PLAYER_DEAD';
    if (Math.hypot(actor.x - x, actor.y - y) > 4) return 'OUT_OF_RANGE';
    if (
      planId &&
      !this.state.plans.some((p) => p.id === planId && p.owner === playerId)
    )
      return 'PLAN_MISSING';
    return this.spatial(definition, x, y, orientation, planId);
  }
  public craft(command: {
    id: string;
    playerId: string;
    recipeId: string;
    expectedRevision: number;
    expectedInventoryRevision: number;
  }): ExpeditionResult {
    const signature = JSON.stringify(command);
    const receipt = this.state.receipts.find((r) => r.id === command.id);
    if (receipt)
      return receipt.signature === signature
        ? { status: 'committed', message: receipt.result }
        : { status: 'rejected', message: 'OPERATION_ID_CONFLICT' };
    const reject = (message: string): ExpeditionResult => ({
      status: 'rejected',
      message,
    });
    if (
      !command.id ||
      command.id.length > 120 ||
      command.expectedRevision !== this.state.revision
    )
      return reject('STALE_REVISION');
    let actor: ExpeditionActor;
    try {
      actor = this.actor(command.playerId);
    } catch {
      return reject('UNKNOWN_PLAYER');
    }
    if (!actor.alive) return reject('PLAYER_DEAD');
    this.cancelRest(command.playerId);
    const recipe = EXPEDITION_RECIPES.find((r) => r.id === command.recipeId);
    if (!recipe) return reject('UNKNOWN_RECIPE');
    if (
      recipe.station &&
      !this.state.facilities.some(
        (f) =>
          f.definitionId === recipe.station &&
          f.canonicalStructureId !== null &&
          this.buildings.getStructure(f.canonicalStructureId) !== null &&
          Math.hypot(f.x - actor.x, f.y - actor.y) <= 2,
      )
    )
      return reject('NEARBY_FIELD_WORKBENCH_REQUIRED');
    const result = this.items.commitColonyExchange({
      operationId: command.id,
      playerId: command.playerId,
      expectedInventoryRevision: command.expectedInventoryRevision,
      inputs: recipe.costs.map(([itemDefinitionId, quantity]) => ({
        itemDefinitionId,
        quantity,
      })),
      outputs: [{ itemDefinitionId: recipe.output, quantity: recipe.quantity }],
    });
    if (result.status === 'rejected') return reject(result.reason);
    this.state = validateExpeditionState({
      ...this.state,
      revision: this.state.revision + 1,
      receipts: [
        ...this.state.receipts,
        { id: command.id, signature, result: 'CRAFTED' },
      ].slice(-96),
    });
    this.services?.crafted?.(
      command.playerId,
      recipe.canonicalRecipeId,
      command.id,
    );
    return { status: 'committed', message: 'CRAFTED' };
  }
  public execute(command: ExpeditionCommand): ExpeditionResult {
    const reject = (message: string): ExpeditionResult => ({
      status: 'rejected',
      message,
    });
    if (
      typeof command.id !== 'string' ||
      !command.id ||
      command.id.length > 120 ||
      typeof command.playerId !== 'string' ||
      !command.playerId ||
      !Number.isSafeInteger(command.expectedRevision) ||
      command.expectedRevision < 0 ||
      !Number.isSafeInteger(command.expectedInventoryRevision) ||
      command.expectedInventoryRevision < 0
    )
      return reject('INVALID_COMMAND');
    const signature = JSON.stringify(command);
    const receipt = this.state.receipts.find((r) => r.id === command.id);
    if (receipt)
      return receipt.signature === signature
        ? { status: 'committed', message: receipt.result }
        : reject('OPERATION_ID_CONFLICT');
    if (command.expectedRevision !== this.state.revision)
      return reject('STALE_REVISION');
    let actor: ExpeditionActor;
    try {
      actor = this.actor(command.playerId);
      if (
        this.items.getContainerView('inventory:' + command.playerId)
          .revision !== command.expectedInventoryRevision
      )
        return reject('STALE_INVENTORY_REVISION');
    } catch {
      return reject('UNKNOWN_PLAYER');
    }
    if (!actor.alive) return reject('PLAYER_DEAD');
    this.cancelRest(command.playerId);
    let next = this.state;
    let message: string;
    if (command.action === 'relocate') {
      if (command.expectedBuildRevision !== this.buildings.getBuildRevision())
        return reject('STALE_BUILD_REVISION');
      const info = this.relocationInfo(command.target);
      if (!info) return reject('FACILITY_MISSING');
      const orientation = command.orientation ?? info.orientation,
        x = command.x ?? info.x,
        y = command.y ?? info.y;
      const reason = this.assessRelocationPreview(
        command.playerId,
        command.target,
        x,
        y,
        orientation,
      );
      if (reason) return reject(reason);
      const position = this.relocationPosition(
        command.target,
        x,
        y,
        orientation,
      );
      if (info.canonicalId) {
        const error = this.buildings.relocate({
          structureId: info.canonicalId,
          playerId: command.playerId,
          expectedBuildRevision: command.expectedBuildRevision!,
          expectedStructureRevision: this.buildings.getStructure(
            info.canonicalId,
          )!.revision,
          placement: this.relocationIntent(
            info,
            position.x,
            position.y,
            orientation,
          ),
        });
        if (error) return reject(error);
      }
      next = {
        ...next,
        facilities: next.facilities.map((f) =>
          f.id === info.facilityId ? { ...f, ...position, orientation } : f,
        ),
      };
      message = 'FACILITY_RELOCATED';
    } else if (command.action === 'dismantle') {
      const facility = this.state.facilities.find(
        (f) => f.id === command.target && f.owner === command.playerId,
      );
      if (!facility) return reject('FACILITY_MISSING');
      if (facility.canonicalStructureId !== null)
        return reject('USE_CANONICAL_DISMANTLE');
      if (Math.hypot(actor.x - facility.x, actor.y - facility.y) > 4)
        return reject('OUT_OF_RANGE');
      if (facility.water > 0) return reject('COLLECT_WATER_FIRST');
      const def = expeditionFacility(facility.definitionId)!;
      const result = this.items.commitColonyExchange({
        operationId: command.id,
        playerId: command.playerId,
        expectedInventoryRevision: command.expectedInventoryRevision,
        inputs: [],
        outputs: def.costs.map(([itemDefinitionId, quantity]) => ({
          itemDefinitionId,
          quantity,
        })),
      });
      if (result.status === 'rejected') return reject(result.reason);
      next = {
        ...next,
        facilities: next.facilities.filter((f) => f.id !== facility.id),
      };
      message = 'FACILITY_DISMANTLED';
    } else if (command.action === 'plan') {
      if (
        this.state.facilities.some(
          (f) => f.id === 'facility:plan:' + command.id,
        )
      )
        return reject('OPERATION_ID_CONFLICT');
      const def = expeditionFacility(command.target);
      if (!def) return reject('UNKNOWN_FACILITY');
      if (this.state.plans.length >= 32 || this.state.facilities.length >= 64)
        return reject('PLAN_LIMIT');
      const x = command.x ?? NaN,
        y = command.y ?? NaN,
        orientation = command.orientation ?? 0;
      if (Math.hypot(actor.x - x, actor.y - y) > 4)
        return reject('OUT_OF_RANGE');
      const reason = this.spatial(def.id, x, y, orientation);
      if (reason) return reject(reason);
      const plan: ExpeditionPlan = {
        id: 'plan:' + command.id,
        owner: command.playerId,
        definitionId: def.id,
        x,
        y,
        orientation,
        paid: {},
      };
      next = { ...next, plans: [...next.plans, plan] };
      message = plan.id;
    } else {
      const plan = this.state.plans.find((p) => p.id === command.target);
      if (!plan || plan.owner !== command.playerId)
        return reject('PLAN_MISSING');
      if (Math.hypot(actor.x - plan.x, actor.y - plan.y) > 4)
        return reject('OUT_OF_RANGE');
      const def = expeditionFacility(plan.definitionId)!;
      if (command.action === 'move') {
        const x = command.x ?? plan.x,
          y = command.y ?? plan.y,
          orientation = command.orientation ?? plan.orientation;
        if (Math.hypot(actor.x - x, actor.y - y) > 4)
          return reject('OUT_OF_RANGE');
        const reason = this.spatial(def.id, x, y, orientation, plan.id);
        if (reason) return reject(reason);
        next = {
          ...next,
          plans: next.plans.map((p) =>
            p.id === plan.id ? { ...p, x, y, orientation } : p,
          ),
        };
        message = 'PLAN_MOVED';
      } else if (command.action === 'deposit') {
        const inventory = this.items.getContainerView(
          'inventory:' + command.playerId,
        );
        const inputs = def.costs
          .map(([itemDefinitionId, required]) => ({
            itemDefinitionId,
            quantity: Math.min(
              required - (plan.paid[itemDefinitionId] ?? 0),
              inventory.stacks
                .filter((s) => s.itemDefinitionId === itemDefinitionId)
                .reduce((n, s) => n + s.quantity, 0),
            ),
          }))
          .filter((c) => c.quantity > 0);
        if (!inputs.length) return reject('NO_OUTSTANDING_MATERIALS_AVAILABLE');
        const result = this.items.commitColonyExchange({
          operationId: command.id,
          playerId: command.playerId,
          expectedInventoryRevision: command.expectedInventoryRevision,
          inputs,
          outputs: [],
        });
        if (result.status === 'rejected') return reject(result.reason);
        const paid = { ...plan.paid };
        for (const input of inputs)
          paid[input.itemDefinitionId] =
            (paid[input.itemDefinitionId] ?? 0) + input.quantity;
        next = {
          ...next,
          plans: next.plans.map((p) => (p.id === plan.id ? { ...p, paid } : p)),
        };
        message = 'MATERIALS_DEPOSITED';
      } else if (command.action === 'cancel') {
        const result = this.items.commitColonyExchange({
          operationId: command.id,
          playerId: command.playerId,
          expectedInventoryRevision: command.expectedInventoryRevision,
          inputs: [],
          outputs: Object.entries(plan.paid)
            .filter(([, quantity]) => quantity > 0)
            .map(([itemDefinitionId, quantity]) => ({
              itemDefinitionId,
              quantity,
            })),
        });
        if (result.status === 'rejected') return reject(result.reason);
        next = { ...next, plans: next.plans.filter((p) => p.id !== plan.id) };
        message = 'PLAN_REFUNDED';
      } else if (command.action === 'complete') {
        if (this.state.facilities.length >= 64) return reject('FACILITY_LIMIT');
        if (def.costs.some(([id, q]) => (plan.paid[id] ?? 0) < q))
          return reject('MATERIALS_MISSING');
        const reason = this.spatial(
          def.id,
          plan.x,
          plan.y,
          plan.orientation,
          plan.id,
        );
        if (reason) return reject(reason);
        let canonicalStructureId: string | null = null;
        if (def.canonical !== null) {
          const operationId = 'expedition-build:' + plan.id;
          const reservation = this.buildings.reservePlacement({
            operationId,
            commandFingerprint: JSON.stringify(plan),
            actorPlayerId: command.playerId,
            definitionId: def.canonical,
            expectedBuildRevision: this.buildings.getBuildRevision(),
            placement: {
              mode: 'free',
              anchor: { x: plan.x, y: plan.y },
              orientationQuarterTurns: plan.orientation,
            },
          });
          if (typeof reservation === 'string') return reject(reservation);
          const error = this.items.commitPrepaidConstruction({
            playerId: command.playerId,
            expectedInventoryRevision: command.expectedInventoryRevision,
            container: reservation.containerId
              ? { containerId: reservation.containerId, kind: 'storage-crate' }
              : null,
          });
          if (error) {
            this.buildings.releasePlacementReservation(reservation);
            return reject(error);
          }
          canonicalStructureId =
            this.buildings.commitReservedPlacement(reservation).structureId;
        }
        next = {
          ...next,
          plans: next.plans.filter((p) => p.id !== plan.id),
          facilities: [
            ...next.facilities,
            {
              id: 'facility:' + plan.id,
              owner: plan.owner,
              definitionId: plan.definitionId,
              x: plan.x,
              y: plan.y,
              orientation: plan.orientation,
              canonicalStructureId,
              water: 0,
              progress: 0,
            },
          ],
        };
        message = 'FACILITY_COMPLETED';
      } else return reject('INVALID_ACTION');
    }
    this.state = validateExpeditionState({
      ...next,
      revision: this.state.revision + 1,
      receipts: [
        ...next.receipts,
        { id: command.id, signature, result: message },
      ].slice(-96),
    });
    if (command.action === 'complete') {
      const facility = next.facilities.at(-1)!;
      const def = expeditionFacility(facility.definitionId)!;
      if (def.canonical)
        this.services?.built?.(command.playerId, def.canonical, command.id);
    }
    return { status: 'committed', message };
  }
}
