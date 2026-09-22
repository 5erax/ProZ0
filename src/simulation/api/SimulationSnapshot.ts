import type { SimulationTick } from '../../foundation';

export interface SimulationSnapshot {
  readonly tick: SimulationTick;
  readonly runtimeMode: 'local-authority';
}
