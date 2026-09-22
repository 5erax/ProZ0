import type { WorldPosition } from '../../foundation';
import type { FacingDirection } from './SimulationSnapshot';

export interface PlayerPersistenceState {
  readonly position: WorldPosition;
  readonly facing: FacingDirection;
}
