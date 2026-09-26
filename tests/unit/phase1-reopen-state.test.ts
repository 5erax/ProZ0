import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  createPhase1SaveV2Compatibility,
  migratePortableSaveBundleV1ToV2,
  reconstructPhase1ReopenState,
} from '../../src/persistence';
import {
  PHASE0_WORLD_GENERATION_VERSION,
} from '../../src/world';
import { makePortableBundle } from '../helpers/persistenceFixtures';

function migratedBundle() {
  const catalog = createPhase1ContentCatalog();
  const migrated = migratePortableSaveBundleV1ToV2(
    makePortableBundle(),
    {
      catalog,
      resolveBaseGenerationFingerprint: ({
        worldSeed,
        generationVersion,
        coord,
      }) => [
        'integration-reopen-base',
        worldSeed,
        generationVersion,
        coord.x,
        coord.y,
      ].join(':'),
    },
  );
  if (!migrated.ok) throw new Error(migrated.message);
  return { catalog, bundle: migrated.value };
}

describe('P1-INT-001 Phase 1 reopen reconstruction', () => {
  it('reconstructs one coherent canonical runtime snapshot from a validated Save V2 bundle', () => {
    const { catalog, bundle } = migratedBundle();
    const authorityTick = 720;
    const saved = Object.freeze({
      ...bundle,
      world: Object.freeze({
        ...bundle.world,
        worldRevision: 4,
        authorityTick,
        environment: Object.freeze({
          ...bundle.world.environment,
          activeTick: authorityTick,
        }),
      }),
    });
    const policy = createPhase1SaveV2Compatibility(
      catalog,
      [PHASE0_WORLD_GENERATION_VERSION],
    );

    const reopened = reconstructPhase1ReopenState(saved, policy);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) throw new Error(reopened.message);

    expect(reopened.value.durabilityCheckpoint).toEqual({
      authorityTick,
      durableSaveRevision: 4,
    });
    expect(reopened.value.environment.activeTick).toBe(authorityTick);
    expect(reopened.value.players).toHaveLength(1);
    expect(reopened.value.players[0]).toMatchObject({
      record: {
        playerId: 'player-1',
      },
      survival: {
        playerId: 'player-1',
        tick: authorityTick,
      },
      progression: {
        playerId: 'player-1',
      },
    });
    expect(reopened.value.itemLedger.containers).toHaveLength(1);
    expect(reopened.value.chunks).toHaveLength(1);
    expect(reopened.value.chunks[0]?.worldSlice).toMatchObject({
      coord: { x: -7, y: 11 },
      generated: true,
    });
    expect(reopened.value.buildings).toEqual([]);
  });

  it('fails closed instead of publishing a partially reconstructed state when canonical save invariants drift', () => {
    const { catalog, bundle } = migratedBundle();
    const corrupt = {
      ...bundle,
      world: {
        ...bundle.world,
        authorityTick: 12,
        environment: {
          ...bundle.world.environment,
          activeTick: 11,
        },
      },
    };
    const policy = createPhase1SaveV2Compatibility(
      catalog,
      [PHASE0_WORLD_GENERATION_VERSION],
    );

    expect(
      reconstructPhase1ReopenState(corrupt, policy),
    ).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });
});
