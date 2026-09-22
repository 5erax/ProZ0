import { describe, expect, it } from 'vitest';
import {
  createChunkCoord,
  createPhase0ChunkGenerator,
  PHASE0_WORLD_GENERATION_VERSION,
} from '../../src/world';

describe('Phase 0 deterministic chunk generation', () => {
  it('reproduces identical base data for the same seed, coord, and generation version', () => {
    const generator = createPhase0ChunkGenerator();
    const request = {
      worldSeed: 'proz0-phase0-seed',
      coord: createChunkCoord(-7, 11),
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    };

    expect(generator.generate(request)).toEqual(generator.generate(request));
  });

  it('locks the versioned output for a fixed negative-coordinate chunk fixture', () => {
    const generator = createPhase0ChunkGenerator();

    const generated = generator.generate({
      worldSeed: 'proz0-phase0-seed',
      coord: createChunkCoord(-7, 11),
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    });

    // Compatibility guard: this is an authoritative procedural-output lock.
    // Do not update expected values in place when output changes intentionally.
    // Bump the relevant deterministic version and record the compatibility /
    // migration / regeneration decision required by P0-TECH-003/004.
    expect(generated).toEqual({
      coord: { x: -7, y: 11 },
      generationVersion: 1,
      rngAlgorithmVersion: 'xoshiro128ss-v1',
      seedDerivationVersion: 'fnv1a32-avalanche-v1',
      generationSeed: [
        1175487768,
        1747134323,
        157070250,
        4278208465,
      ],
      generationFingerprint: [
        385325988,
        1125087730,
        3325800174,
        3801859394,
      ],
    });
  });

  it('is independent from chunk request order', () => {
    const a = {
      worldSeed: 'order-independent-world',
      coord: createChunkCoord(-1, 4),
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    };
    const b = {
      worldSeed: 'order-independent-world',
      coord: createChunkCoord(8, -3),
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    };

    const firstGenerator = createPhase0ChunkGenerator();
    const firstA = firstGenerator.generate(a);
    const firstB = firstGenerator.generate(b);

    const secondGenerator = createPhase0ChunkGenerator();
    const secondB = secondGenerator.generate(b);
    const secondA = secondGenerator.generate(a);

    expect(secondA).toEqual(firstA);
    expect(secondB).toEqual(firstB);
  });

  it('separates canonical signed chunk coordinates into distinct substreams', () => {
    const generator = createPhase0ChunkGenerator();
    const common = {
      worldSeed: 'signed-coordinate-world',
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    };

    const negative = generator.generate({
      ...common,
      coord: createChunkCoord(-1, 0),
    });
    const positive = generator.generate({
      ...common,
      coord: createChunkCoord(1, 0),
    });

    expect(negative.generationSeed).not.toEqual(positive.generationSeed);
    expect(negative.generationFingerprint).not.toEqual(
      positive.generationFingerprint,
    );
  });
});
