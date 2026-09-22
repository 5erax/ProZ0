import { describe, expect, it } from 'vitest';
import {
  validateChunkRecordV1,
  validatePlayerRecordV1,
  validatePortableSaveBundleV1,
  validateWorldManifestV1,
} from '../../src/persistence';
import {
  makeChunkRecord,
  makePlayerRecord,
  makePortableBundle,
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

describe('Phase 0 save schema validation', () => {
  it('SAVE-001 accepts valid V1 manifest/player/chunk/bundle records', () => {
    expect(validateWorldManifestV1(makeWorldManifest()).ok).toBe(true);
    expect(validatePlayerRecordV1(makePlayerRecord(), 'world-alpha').ok).toBe(true);
    expect(validateChunkRecordV1(makeChunkRecord(), 'world-alpha').ok).toBe(true);
    expect(validatePortableSaveBundleV1(makePortableBundle()).ok).toBe(true);
  });

  it('SAVE-002 rejects the wrong formatId', () => {
    const result = validateWorldManifestV1({
      ...makeWorldManifest(),
      formatId: 'other-save-format',
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_FORMAT',
    });
  });

  it('SAVE-003 rejects a newer save schema', () => {
    const result = validateWorldManifestV1({
      ...makeWorldManifest(),
      schemaVersion: 2,
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_NEWER_SCHEMA',
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'SAVE-004 rejects non-finite player position %s',
    (invalidCoordinate) => {
      const result = validatePlayerRecordV1({
        ...makePlayerRecord(),
        position: {
          x: invalidCoordinate,
          y: 1,
        },
      }, 'world-alpha');

      expect(result).toMatchObject({
        ok: false,
        code: 'CORRUPT_RECORD',
      });
    },
  );

  it('SAVE-005 rejects invalid facing', () => {
    const result = validatePlayerRecordV1({
      ...makePlayerRecord(),
      facing: 'UP',
    }, 'world-alpha');

    expect(result).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });

  it('SAVE-006 rejects non-int32 chunk coordinates', () => {
    const result = validateChunkRecordV1({
      ...makeChunkRecord(),
      coord: { x: -7.5, y: 11 },
    }, 'world-alpha');

    expect(result).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });

  it('SAVE-007 rejects mismatched world identity', () => {
    const result = validatePortableSaveBundleV1({
      ...makePortableBundle(),
      players: [
        {
          ...makePlayerRecord(),
          worldId: 'wrong-world',
        },
      ],
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });

  it('SAVE-013 rejects unsupported generation/RNG/seed-derivation compatibility', () => {
    expect(validateWorldManifestV1({
      ...makeWorldManifest(),
      generationVersion: 999,
    })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_GENERATION_VERSION',
    });

    expect(validateWorldManifestV1({
      ...makeWorldManifest(),
      rngAlgorithmVersion: 'unknown-rng',
    })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_RNG_VERSION',
    });

    expect(validateWorldManifestV1({
      ...makeWorldManifest(),
      seedDerivationVersion: 'unknown-seed-derivation',
    })).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_SEED_DERIVATION_VERSION',
    });
  });
});
