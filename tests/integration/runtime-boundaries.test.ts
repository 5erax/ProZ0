import { describe, expect, it } from 'vitest';
import {
  SIMULATION_STEP_SECONDS,
  createSimulationStep,
  toSimulationTick,
} from '../../src/foundation';
import { createSimulationRuntime, NEUTRAL_PLAYER_INPUT } from '../../src/simulation';

describe('simulation public boundary', () => {
  it('advances only through the approved fixed-step contract', () => {
    const runtime = createSimulationRuntime();

    runtime.submitInput('test-player', NEUTRAL_PLAYER_INPUT);
    runtime.step(createSimulationStep(toSimulationTick(1)));

    expect(Number(runtime.getSnapshot().tick)).toBe(1);
    expect(runtime.getSnapshot().runtimeMode).toBe('local-authority');
    expect(SIMULATION_STEP_SECONDS).toBe(1 / 60);
  });

  it('rejects non-sequential ticks', () => {
    const runtime = createSimulationRuntime();

    expect(() => runtime.step(createSimulationStep(toSimulationTick(2)))).toThrow(
      /Expected simulation tick 1/,
    );
  });
});
