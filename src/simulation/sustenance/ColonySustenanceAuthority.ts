import type { PlayerId, WorldPosition } from '../../foundation';
import type { Phase1ItemAuthority } from '../items';

export const CROP_CYCLE_TICKS = 7200;
export const GRAZER_CARE_TICKS = 10800;
export const CULTIVATION_POSITION = Object.freeze({ x: -6, y: 4 });
export const PEN_POSITION = Object.freeze({ x: 6, y: 4 });

export interface ColonySustenanceState {
  readonly revision: number;
  readonly bedBuilt: boolean;
  readonly penBuilt: boolean;
  readonly cropProgressTicks: number | null;
  readonly cropCycleTicks: number;
  readonly animalEntityId: string | null;
  readonly careProgressTicks: number | null;
  readonly fertilizer: number;
}

export type ColonySustenanceAction = 'build-bed' | 'plant' | 'harvest'
  | 'build-pen' | 'capture' | 'care' | 'fertilize';
export const COLONY_ACTIONS: readonly ColonySustenanceAction[] = Object.freeze([
  'build-bed', 'plant', 'harvest', 'build-pen', 'capture', 'care', 'fertilize',
]);
export interface ColonySustenanceCommand {
  readonly operationId: string;
  readonly playerId: PlayerId;
  readonly expectedRevision: number;
  readonly expectedInventoryRevision: number;
  readonly action: ColonySustenanceAction;
  readonly animalEntityId?: string;
}
export type ColonySustenanceResult =
  | { readonly status: 'committed'; readonly operationId: string; readonly revision: number; readonly inventoryRevision: number }
  | { readonly status: 'rejected'; readonly operationId: string; readonly reason: string };

export function emptyColonySustenanceState(): ColonySustenanceState {
  return Object.freeze({ revision: 0, bedBuilt: false, penBuilt: false,
    cropProgressTicks: null, cropCycleTicks: CROP_CYCLE_TICKS,
    animalEntityId: null, careProgressTicks: null, fertilizer: 0 });
}

export function validateColonySustenanceState(input: unknown): ColonySustenanceState {
  if (typeof input !== 'object' || input === null) throw new Error('Missing colony state.');
  const state = input as ColonySustenanceState;
  const natural = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
  if (!natural(state.revision) || typeof state.bedBuilt !== 'boolean' || typeof state.penBuilt !== 'boolean'
    || !natural(state.fertilizer) || state.fertilizer > 4
    || ![CROP_CYCLE_TICKS, CROP_CYCLE_TICKS * 3 / 4].includes(state.cropCycleTicks)
    || !(state.cropProgressTicks === null || (natural(state.cropProgressTicks)
      && state.bedBuilt && state.cropProgressTicks <= state.cropCycleTicks))
    || !(state.animalEntityId === null || (typeof state.animalEntityId === 'string'
      && state.animalEntityId.length > 0 && state.penBuilt))
    || !(state.careProgressTicks === null || (natural(state.careProgressTicks)
      && state.animalEntityId !== null && state.careProgressTicks <= GRAZER_CARE_TICKS))) {
    throw new Error('Invalid colony production state.');
  }
  return Object.freeze({ ...state });
}

function inRange(a: WorldPosition, b: WorldPosition): boolean {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= 1.25 ** 2;
}

export class ColonySustenanceAuthority {
  private state: ColonySustenanceState;
  private readonly operations = new Map<string, { signature: string; result: ColonySustenanceResult }>();
  public constructor(private readonly items: Phase1ItemAuthority,
    private readonly actor: (playerId: PlayerId) => { position: WorldPosition; alive: boolean },
    private readonly wildlife: (entityId: string) => WorldPosition | null,
    initial?: ColonySustenanceState) {
    this.state = initial === undefined ? emptyColonySustenanceState() : validateColonySustenanceState(initial);
  }

  public read(): ColonySustenanceState { return this.state; }

  public tick(context: { readonly cropStep: 0 | 1 | 2; readonly careStep: 0 | 1 | 2 } = {cropStep:1,careStep:1}): void {
    const state = this.state;
    let crop = state.cropProgressTicks;
    let care = state.careProgressTicks;
    let fertilizer = state.fertilizer;
    if (crop !== null && crop < state.cropCycleTicks) crop = Math.min(state.cropCycleTicks,crop+context.cropStep);
    if (care !== null) {
      if (care < GRAZER_CARE_TICKS) care = Math.min(GRAZER_CARE_TICKS,care+context.careStep);
      if (care === GRAZER_CARE_TICKS && fertilizer < 4) { fertilizer += 1; care = null; }
    }
    if (crop !== state.cropProgressTicks || care !== state.careProgressTicks || fertilizer !== state.fertilizer) {
      const transition = (crop === state.cropCycleTicks && state.cropProgressTicks !== crop)
        || fertilizer !== state.fertilizer;
      this.state = Object.freeze({ ...state, revision: state.revision + (transition ? 1 : 0),
        cropProgressTicks: crop, careProgressTicks: care, fertilizer });
    }
  }

  public execute(command: ColonySustenanceCommand): ColonySustenanceResult {
    if (typeof command.operationId !== 'string' || command.operationId.length === 0
      || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0
      || !Number.isSafeInteger(command.expectedInventoryRevision) || command.expectedInventoryRevision < 0) {
      return Object.freeze({ status: 'rejected', operationId: command.operationId, reason: 'INVALID_COMMAND' });
    }
    const signature = JSON.stringify(command);
    const cached = this.operations.get(command.operationId);
    if (cached !== undefined) return cached.signature === signature ? cached.result
      : { status: 'rejected', operationId: command.operationId, reason: 'OPERATION_ID_CONFLICT' };
    const reject = (reason: string): ColonySustenanceResult => {
      const result = Object.freeze({ status: 'rejected' as const, operationId: command.operationId, reason });
      this.operations.set(command.operationId, { signature, result });
      return result;
    };
    const state = this.state;
    if (state.revision >= Number.MAX_SAFE_INTEGER) return reject('REVISION_EXHAUSTED');
    if (!COLONY_ACTIONS.includes(command.action)) return reject('INVALID_ACTION');
    if (command.expectedRevision !== state.revision) return reject('STALE_REVISION');
    const actor = this.actor(command.playerId);
    if (!actor.alive) return reject('PLAYER_DEAD');
    const animal = command.action === 'capture' && command.animalEntityId !== undefined
      ? this.wildlife(command.animalEntityId) : null;
    const target = command.action === 'capture' ? animal
      : ['build-bed', 'plant', 'harvest', 'fertilize'].includes(command.action) ? CULTIVATION_POSITION : PEN_POSITION;
    if (target === null || !inRange(actor.position, target)) return reject('OUT_OF_RANGE');
    let next = { ...state };
    const inputs: { itemDefinitionId: string; quantity: number }[] = [];
    const outputs: { itemDefinitionId: string; quantity: number }[] = [];
    switch (command.action) {
      case 'build-bed':
        if (state.bedBuilt) return reject('ALREADY_BUILT');
        inputs.push({ itemDefinitionId: 'item:timber', quantity: 3 }, { itemDefinitionId: 'item:cordage', quantity: 1 });
        next.bedBuilt = true; break;
      case 'plant':
        if (!state.bedBuilt || state.cropProgressTicks !== null) return reject('BED_UNAVAILABLE');
        inputs.push({ itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 1 });
        next = { ...next, cropProgressTicks: 0, cropCycleTicks: CROP_CYCLE_TICKS }; break;
      case 'harvest':
        if (state.cropProgressTicks !== state.cropCycleTicks) return reject('CROP_NOT_READY');
        outputs.push({ itemDefinitionId: 'item:edible-plant', quantity: 3 });
        next.cropProgressTicks = null; break;
      case 'build-pen':
        if (state.penBuilt) return reject('ALREADY_BUILT');
        inputs.push({ itemDefinitionId: 'item:timber', quantity: 4 }, { itemDefinitionId: 'item:cordage', quantity: 2 });
        next.penBuilt = true; break;
      case 'capture':
        if (!state.penBuilt || state.animalEntityId !== null || animal === null) return reject('PEN_UNAVAILABLE');
        inputs.push({ itemDefinitionId: 'item:cordage', quantity: 1 });
        next.animalEntityId = command.animalEntityId!; break;
      case 'care':
        if (state.animalEntityId === null || state.careProgressTicks !== null || state.fertilizer >= 4) return reject('CARE_UNAVAILABLE');
        inputs.push({ itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 1 });
        next.careProgressTicks = 0; break;
      case 'fertilize':
        if (state.fertilizer < 1 || state.cropProgressTicks === null
          || state.cropProgressTicks >= state.cropCycleTicks
          || state.cropCycleTicks !== CROP_CYCLE_TICKS) return reject('FERTILIZER_UNAVAILABLE');
        next.fertilizer -= 1;
        next.cropCycleTicks = CROP_CYCLE_TICKS * 3 / 4;
        next.cropProgressTicks = Math.min(state.cropProgressTicks, next.cropCycleTicks); break;
    }
    const exchange = this.items.commitColonyExchange({ operationId: command.operationId,
      playerId: command.playerId, expectedInventoryRevision: command.expectedInventoryRevision, inputs, outputs });
    if (exchange.status === 'rejected') return reject(exchange.reason);
    this.state = Object.freeze({ ...next, revision: state.revision + 1 });
    const result = Object.freeze({ status: 'committed' as const, operationId: command.operationId,
      revision: this.state.revision, inventoryRevision: exchange.inventoryRevision });
    this.operations.set(command.operationId, { signature, result });
    return result;
  }
}
