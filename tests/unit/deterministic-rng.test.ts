import { describe, expect, it } from 'vitest';
import { DeterministicRng } from '../../src/foundation';

describe('DeterministicRng', () => {
  it('matches the approved bootstrap sequence', () => {
    const rng = new DeterministicRng([1, 2, 3, 4]);
    const actual = Array.from({ length: 4 }, () => rng.nextUint32());
    expect(actual).toEqual([11520, 0, 5927040, 70819200]);
  });

  it('rejects an all-zero state', () => {
    expect(() => new DeterministicRng([0, 0, 0, 0])).toThrow();
  });
});
