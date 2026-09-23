import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  createPhase1SaveV2Compatibility,
  durabilityCheckpointForManifest,
  migratePortableSaveBundleV1ToV2,
  reconstructPlayerLevelV2,
  validateFootholdRecordV2,
  validatePortableSaveBundleV2,
  validateStructureRecordV2,
  type V1ToV2MigrationOptions,
} from '../../src/persistence';
import { PHASE0_WORLD_GENERATION_VERSION } from '../../src/world';
import { createPhase1EnvironmentState } from '../../src/world/phase1/Phase1Environment';
import {
  makePortableBundle,
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

function migrationOptions(): V1ToV2MigrationOptions {
  const catalog = createPhase1ContentCatalog();
  return {
    catalog,
    resolveBaseGenerationFingerprint: ({ worldSeed, generationVersion, coord }) =>
      `legacy-base-v1:${worldSeed}:g${generationVersion}:${coord.x},${coord.y}`,
  };
}

describe('Save V2 schema, migration, and fail-closed validation', () => {
  it('migrates V1 deterministically with canonical Cold Rain and no derived state', () => {
    const catalog = createPhase1ContentCatalog();
    const options = migrationOptions();
    const source = makePortableBundle();

    const first = migratePortableSaveBundleV1ToV2(source, options);
    const second = migratePortableSaveBundleV1ToV2(source, options);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) throw new Error(first.message);

    expect(first.value.world.environment).toEqual(
      createPhase1EnvironmentState(source.world.worldSeed, catalog),
    );
    expect(first.value.players[0]?.progression).not.toHaveProperty('level');
    expect(first.value.players[0]?.inventoryContainerId).toBe(
      second.ok ? second.value.players[0]?.inventoryContainerId : undefined,
    );
    expect(first.value.containers).toHaveLength(1);
    expect(first.value.containers[0]).toMatchObject({
      kind: 'player-inventory',
      revision: 0,
      stacks: [],
    });
    expect(first.value.chunks[0]).toMatchObject({
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
      resourceStates: [],
      predatorStates: [],
      landmarkStates: [],
      createdEntities: [],
      structureIds: [],
      removedGeneratedEntityIds: [],
    });

    const policy = createPhase1SaveV2Compatibility(
      catalog,
      [PHASE0_WORLD_GENERATION_VERSION],
    );
    expect(validatePortableSaveBundleV2(first.value, policy)).toMatchObject({
      ok: true,
    });
  });

  it('fails V1 migration before publication when exact generated base cannot be established', () => {
    const catalog = createPhase1ContentCatalog();
    const migrated = migratePortableSaveBundleV1ToV2(
      makePortableBundle(),
      {
        catalog,
        resolveBaseGenerationFingerprint: () => null,
      },
    );

    expect(migrated).toMatchObject({
      ok: false,
      code: 'MIGRATION_FAILED',
    });
  });

  it('rejects incompatible deterministic identity before synthesizing Phase 1 weather', () => {
    const catalog = createPhase1ContentCatalog();
    const source = makePortableBundle({
      world: makeWorldManifest({
        rngAlgorithmVersion: 'legacy-rng-v0',
      }),
    });
    const migrated = migratePortableSaveBundleV1ToV2(
      source,
      {
        catalog,
        resolveBaseGenerationFingerprint: () => 'should-not-publish',
      },
    );

    expect(migrated).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_RNG_VERSION',
    });
  });

  it('rejects persisted derived level, power capacity, and duplicate Condenser output reference', () => {
    const catalog = createPhase1ContentCatalog();
    const policy = createPhase1SaveV2Compatibility(
      catalog,
      [PHASE0_WORLD_GENERATION_VERSION],
    );
    const migrated = migratePortableSaveBundleV1ToV2(
      makePortableBundle(),
      migrationOptions(),
    );
    if (!migrated.ok) throw new Error(migrated.message);

    const player = migrated.value.players[0];
    if (player === undefined) throw new Error('Expected migrated player.');
    const withDerivedLevel = {
      ...migrated.value,
      players: [{
        ...player,
        progression: {
          ...player.progression,
          level: 1,
        },
      }],
    };
    expect(validatePortableSaveBundleV2(
      withDerivedLevel,
      policy,
    )).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });

    const footholdWithCapacity = {
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'foothold',
      worldId: 'world-alpha',
      footholdId: 'foothold:landing',
      buildRevision: 0,
      structureIds: [],
      connectionEdges: [],
      powerNetwork: {
        revision: 0,
        producerStructureId: null,
        grantedConsumerIds: [],
        capacityPu: 10,
      },
    };
    expect(validateFootholdRecordV2(
      footholdWithCapacity,
      'world-alpha',
    )).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });

    const condenserWithDuplicateOutput = {
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'structure',
      worldId: 'world-alpha',
      footholdId: 'foothold:landing',
      structureId: 'structure-instance:condenser',
      structureDefinitionId: 'structure:atmospheric-water-condenser',
      revision: 1,
      position: { x: 3, y: 2 },
      orientationQuarterTurns: 0,
      placedByPlayerId: 'player-1',
      outputContainerId: 'container:condenser:output',
      machine: {
        enabled: true,
        productionProgressTicks: 9,
        completedCycleOrdinal: 2,
        outputContainerId: 'container:condenser:output',
      },
    };
    expect(validateStructureRecordV2(
      condenserWithDuplicateOutput,
      'world-alpha',
      policy,
    )).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });

  it('derives player level and durability checkpoint instead of persisting derived authority', () => {
    const catalog = createPhase1ContentCatalog();
    expect(reconstructPlayerLevelV2(0, catalog)).toBe(1);
    expect(reconstructPlayerLevelV2(224, catalog)).toBe(2);
    expect(reconstructPlayerLevelV2(225, catalog)).toBe(3);

    const migrated = migratePortableSaveBundleV1ToV2(
      makePortableBundle(),
      migrationOptions(),
    );
    if (!migrated.ok) throw new Error(migrated.message);

    expect(durabilityCheckpointForManifest(migrated.value.world)).toEqual({
      authorityTick: 0,
      durableSaveRevision: 0,
    });
  });
});
