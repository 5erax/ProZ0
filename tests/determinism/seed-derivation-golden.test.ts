import { describe, expect, it } from 'vitest';
import {
  SEED_DERIVATION_VERSION,
  deriveSeedState,
} from '../../src/foundation';

describe('seed derivation compatibility', () => {
  it('locks fnv1a32-avalanche-v1 to an exact golden vector', () => {
    expect(SEED_DERIVATION_VERSION).toBe('fnv1a32-avalanche-v1');

    const state = deriveSeedState({
      worldSeed: 'proz0-golden-seed',
      namespace: 'golden-vector',
      stableIdentifiers: Object.freeze(['v1', 'alpha', 'omega']),
    });

    // Compatibility guard: do not update these values merely to follow an
    // implementation change. Intentional output changes require a derivation
    // version bump plus the compatibility decision required by P0-TECH-003/004.
    expect(state).toEqual([
      3752639587,
      380087045,
      2969323126,
      2193005290,
    ]);
  });
});
