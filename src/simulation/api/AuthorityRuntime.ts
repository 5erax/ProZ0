import type { WorldPosition } from '../../foundation';
import type { FacingDirection } from './SimulationSnapshot';
import type { SimulationRuntime } from './SimulationRuntime';

export interface AuthorityRuntime extends SimulationRuntime {
  /**
   * Applies an already-validated canonical placement such as respawn.
   * This is an authority-host seam, not a client movement command.
   */
  relocatePlayer(
    position: WorldPosition,
    facing?: FacingDirection | null,
  ): void;
}
