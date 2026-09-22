import type { PlayerId, SimulationStep } from '../../foundation';
import type { PlayerInput } from './PlayerInput';
import type { SimulationSnapshot } from './SimulationSnapshot';

export interface SimulationRuntime {
  submitInput(playerId: PlayerId, input: PlayerInput): void;
  step(step: SimulationStep): void;
  getSnapshot(): Readonly<SimulationSnapshot>;
}
