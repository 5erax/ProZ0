import { describe, expect, it } from 'vitest';
import {
  SIMULATION_STEP_SECONDS,
  createSimulationStep,
  createWorldPosition,
  toSimulationTick,
} from '../../src/foundation';
import {
  createSimulationRuntime,
  NEUTRAL_PLAYER_INPUT,
} from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';

function createRuntime() {
  return createSimulationRuntime({
    worldQuery: createStaticCollisionWorld([]),
    initialPlayerPosition: createWorldPosition(0, 0),
  });
}

describe('simulation public boundary', () => {
  it('advances only through the approved fixed-step contract', () => {
    const runtime = createRuntime();

    runtime.submitInput('test-player', NEUTRAL_PLAYER_INPUT);
    runtime.step(createSimulationStep(toSimulationTick(1)));

    const snapshot = runtime.getSnapshot();

    expect(Number(snapshot.tick)).toBe(1);
    expect(snapshot.player.position).toEqual({ x: 0, y: 0 });
    expect(snapshot.player.locomotionState).toBe('IDLE');
    expect(SIMULATION_STEP_SECONDS).toBe(1 / 60);
  });

  it('rejects non-sequential ticks', () => {
    const runtime = createRuntime();

    expect(() => runtime.step(createSimulationStep(toSimulationTick(2)))).toThrow(
      /Expected simulation tick 1/,
    );
  });
});
