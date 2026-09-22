import { describe, expect, it } from 'vitest';
import { createSimulationStep, toSimulationTick } from '../../src/foundation';
import { createSimulationRuntime } from '../../src/simulation';

function runTicks(count: number): string {
  const runtime = createSimulationRuntime();

  for (let tick = 1; tick <= count; tick += 1) {
    runtime.step(createSimulationStep(toSimulationTick(tick)));
  }

  return JSON.stringify(runtime.getSnapshot());
}

describe('fixed-step deterministic bootstrap', () => {
  it('repeats the same canonical snapshot for the same fixed ticks', () => {
    expect(runTicks(240)).toBe(runTicks(240));
  });
});
