export * from './building';
export * from './machines';
import type { WorldPosition } from '../foundation';
import type { WorldCollisionQuery } from '../world';
import type { FacingDirection } from './api/SimulationSnapshot';
import { FixedStepRuntime } from './internal/FixedStepRuntime';

export {
  NEUTRAL_PLAYER_INPUT,
  type PlayerInput,
} from './api/PlayerInput';

export type { AuthorityRuntime } from './api/AuthorityRuntime';
export type { PlayerPersistenceState } from './api/PlayerPersistenceState';
export type { SimulationRuntime } from './api/SimulationRuntime';
export type {
  FacingDirection,
  LocomotionState,
  MovementCollisionSnapshot,
  PlayerMovementSnapshot,
  SimulationSnapshot,
} from './api/SimulationSnapshot';

export * from './items';

export {
  PLAYER_COLLISION_FOOTPRINT,
  type PlayerCollisionFootprint,
} from './player/PlayerCollisionFootprint';

export {
  INV_SQRT_2,
  PLAYER_MOVEMENT_CONFIG,
} from './player/PlayerMovementConfig';

export interface SimulationRuntimeOptions {
  readonly worldQuery: WorldCollisionQuery;
  readonly initialPlayerPosition: WorldPosition;
  readonly initialPlayerFacing?: FacingDirection | null;
}

export function createSimulationRuntime(
  options: SimulationRuntimeOptions,
): FixedStepRuntime {
  return new FixedStepRuntime(
    options.worldQuery,
    options.initialPlayerPosition,
    options.initialPlayerFacing ?? null,
  );
}
