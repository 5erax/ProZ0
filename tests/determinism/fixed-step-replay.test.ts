import { describe, expect, it } from 'vitest';
import {
  createSimulationStep,
  createWorldPosition,
  toSimulationTick,
} from '../../src/foundation';
import {
  createSimulationRuntime,
  type PlayerInput,
} from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';

const INPUT: PlayerInput = Object.freeze({
  moveUp: true,
  moveDown: false,
  moveLeft: false,
  moveRight: true,
});

function runTicks(count: number): string {
  const runtime = createSimulationRuntime({
    worldQuery: createStaticCollisionWorld([]),
    initialPlayerPosition: createWorldPosition(0, 0),
  });

  for (let tick = 1; tick <= count; tick += 1) {
    runtime.submitInput('test-player', INPUT);
    runtime.step(createSimulationStep(toSimulationTick(tick)));
  }

  return JSON.stringify(runtime.getSnapshot());
}

describe('fixed-step deterministic movement', () => {
  it('repeats the same canonical snapshot for the same input tape and fixed ticks', () => {
    expect(runTicks(240)).toBe(runTicks(240));
  });
});
