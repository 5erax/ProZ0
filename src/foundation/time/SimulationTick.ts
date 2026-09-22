export type SimulationTick = number & { readonly __simulationTick: unique symbol };

export const SIMULATION_HZ = 60;
export const SIMULATION_STEP_SECONDS = 1 / SIMULATION_HZ;

export interface SimulationStep {
  readonly tick: SimulationTick;
  readonly dtSeconds: number;
}

export function toSimulationTick(value: number): SimulationTick {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError('Simulation tick must be a non-negative safe integer.');
  }
  return value as SimulationTick;
}

export function createSimulationStep(tick: SimulationTick): SimulationStep {
  return Object.freeze({ tick, dtSeconds: SIMULATION_STEP_SECONDS });
}
