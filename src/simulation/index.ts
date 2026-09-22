import { FixedStepRuntime } from './internal/FixedStepRuntime';

export {
  NEUTRAL_PLAYER_INPUT,
  type PlayerInput,
} from './api/PlayerInput';

export type { AuthorityRuntime } from './api/AuthorityRuntime';
export type { SimulationRuntime } from './api/SimulationRuntime';
export type { SimulationSnapshot } from './api/SimulationSnapshot';

export function createSimulationRuntime(): FixedStepRuntime {
  return new FixedStepRuntime();
}
