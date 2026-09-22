import type {
  SimulationTick,
  WorldPosition,
  WorldVector,
} from '../../foundation';

export type FacingDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export type LocomotionState =
  | 'IDLE'
  | 'MOVING'
  | 'COLLISION-CONSTRAINED';

export interface MovementCollisionSnapshot {
  readonly blockedX: boolean;
  readonly blockedY: boolean;
  readonly hitSolidX?: string;
  readonly hitSolidY?: string;
}

export interface PlayerMovementSnapshot {
  readonly position: WorldPosition;
  readonly intendedDirection: WorldVector;
  readonly intendedVelocity: WorldVector;
  readonly resolvedVelocity: WorldVector;
  readonly locomotionState: LocomotionState;
  readonly facing: FacingDirection | null;
  readonly collision: MovementCollisionSnapshot;
}

export interface SimulationSnapshot {
  readonly tick: SimulationTick;
  readonly player: Readonly<PlayerMovementSnapshot>;
}
