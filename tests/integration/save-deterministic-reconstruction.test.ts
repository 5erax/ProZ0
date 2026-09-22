import { describe, expect, it } from 'vitest';
import {
  validateChunkRecordV1,
  validateWorldManifestV1,
} from '../../src/persistence';
import {
  createPhase0ChunkGenerator,
} from '../../src/world';
import {
  makeChunkRecord,
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

describe('Phase 0 persistence deterministic reconstruction', () => {
  it('SAVE-016 reconstructs equivalent chunk base from saved deterministic identity', () => {
    const manifest = validateWorldManifestV1(makeWorldManifest());
    const chunk = validateChunkRecordV1(
      makeChunkRecord(),
      'world-alpha',
    );

    expect(manifest.ok).toBe(true);
    expect(chunk.ok).toBe(true);

    if (!manifest.ok || !chunk.ok) {
      throw new Error('Fixture validation unexpectedly failed.');
    }

    const request = {
      worldSeed: manifest.value.worldSeed,
      generationVersion: chunk.value.generationVersion,
      coord: chunk.value.coord,
    };

    const first = createPhase0ChunkGenerator().generate(request);
    const second = createPhase0ChunkGenerator().generate(request);

    expect(second).toEqual(first);
    expect(first.rngAlgorithmVersion).toBe(
      manifest.value.rngAlgorithmVersion,
    );
    expect(first.seedDerivationVersion).toBe(
      manifest.value.seedDerivationVersion,
    );
  });
});
