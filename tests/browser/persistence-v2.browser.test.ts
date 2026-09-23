import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  IndexedDbSaveRepository,
  IndexedDbSaveRepositoryV2,
  createPhase1SaveV2Compatibility,
  deleteIndexedDbSaveDatabase,
  migratePortableSaveBundleV1ToV2,
  type PortableSaveBundleV2,
} from '../../src/persistence';
import { PHASE0_WORLD_GENERATION_VERSION } from '../../src/world';
import {
  makeChunkRecord,
  makePlayerRecord,
  makePortableBundle,
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

function options(databaseName: string, faults: {
  beforeManifestWrite?(): void;
  beforeImportManifestWrite?(): void;
} = {}) {
  const catalog = createPhase1ContentCatalog();
  return {
    catalog,
    compatibility: createPhase1SaveV2Compatibility(
      catalog,
      [PHASE0_WORLD_GENERATION_VERSION],
    ),
    migration: {
      catalog,
      resolveBaseGenerationFingerprint: ({
        worldSeed,
        generationVersion,
        coord,
      }: {
        readonly worldSeed: string;
        readonly generationVersion: number;
        readonly coord: { readonly x: number; readonly y: number };
      }) => `legacy-base-v1:${worldSeed}:g${generationVersion}:${coord.x},${coord.y}`,
    },
    databaseName,
    faults,
  };
}

function migratedBundle(): PortableSaveBundleV2 {
  const result = migratePortableSaveBundleV1ToV2(
    makePortableBundle(),
    options('unused').migration,
  );
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

async function seedLegacyV1(databaseName: string): Promise<void> {
  const legacy = new IndexedDbSaveRepository({ databaseName });
  try {
    const result = await legacy.commit({
      world: makeWorldManifest(),
      players: [makePlayerRecord()],
      chunks: [makeChunkRecord()],
      expectedPreviousWorldRevision: null,
    });
    expect(result).toMatchObject({ ok: true });
  } finally {
    await legacy.close();
  }
}

async function cleanup(
  databaseName: string,
  repositories: readonly IndexedDbSaveRepositoryV2[],
): Promise<void> {
  for (const repository of repositories) repository.close();
  await deleteIndexedDbSaveDatabase(databaseName);
}

describe('IndexedDbSaveRepositoryV2 browser persistence', () => {
  it('upgrades the V1 database in place and reconstructs identical Cold Rain after Chromium reopen', async () => {
    const databaseName = 'proz0-test-save-v2-migration-reopen';
    await seedLegacyV1(databaseName);
    const first = new IndexedDbSaveRepositoryV2(options(databaseName));
    const second = new IndexedDbSaveRepositoryV2(options(databaseName));

    try {
      const migrated = await first.loadWorld('world-alpha');
      expect(migrated.ok).toBe(true);
      if (!migrated.ok) throw new Error(migrated.message);

      expect(migrated.value.world.schemaVersion).toBe(2);
      expect(migrated.value.world.environment.weatherEvents).toHaveLength(1);
      expect(migrated.value.players[0]?.progression).not.toHaveProperty('level');
      expect(migrated.value.containers[0]).toMatchObject({
        kind: 'player-inventory',
        stacks: [],
      });

      first.close();

      const reopened = await second.loadWorld('world-alpha');
      expect(reopened).toEqual(migrated);
    } finally {
      await cleanup(databaseName, [first, second]);
    }
  });

  it('commits coherent V2 snapshots with CAS and preserves the prior durable revision after stale/faulted writes and imports', async () => {
    const databaseName = 'proz0-test-save-v2-atomicity';
    const normal = new IndexedDbSaveRepositoryV2(options(databaseName));
    const failingSave = new IndexedDbSaveRepositoryV2(options(databaseName, {
      beforeManifestWrite: () => {
        throw new Error('injected-save-failure');
      },
    }));
    const failingImport = new IndexedDbSaveRepositoryV2(options(databaseName, {
      beforeImportManifestWrite: () => {
        throw new Error('injected-import-failure');
      },
    }));

    try {
      const initial = migratedBundle();
      const created = await normal.commit({
        world: initial.world,
        players: initial.players,
        containers: initial.containers,
        chunks: initial.chunks,
        footholds: initial.footholds,
        structures: initial.structures,
        expectedPreviousWorldRevision: null,
      });
      expect(created).toMatchObject({
        ok: true,
        value: { worldRevision: 0 },
      });

      const revisionOne: PortableSaveBundleV2 = {
        ...initial,
        world: {
          ...initial.world,
          worldRevision: 1,
          lastActiveAtUtc: '2026-09-23T18:00:00.000Z',
        },
      };
      const committed = await normal.commit({
        world: revisionOne.world,
        players: revisionOne.players,
        containers: revisionOne.containers,
        chunks: revisionOne.chunks,
        footholds: revisionOne.footholds,
        structures: revisionOne.structures,
        expectedPreviousWorldRevision: 0,
      });
      expect(committed).toMatchObject({
        ok: true,
        value: { worldRevision: 1 },
      });

      const stale = await normal.commit({
        world: revisionOne.world,
        players: revisionOne.players,
        containers: revisionOne.containers,
        chunks: revisionOne.chunks,
        footholds: revisionOne.footholds,
        structures: revisionOne.structures,
        expectedPreviousWorldRevision: 0,
      });
      expect(stale).toMatchObject({
        ok: false,
        code: 'STALE_WRITE',
      });

      const revisionTwo: PortableSaveBundleV2 = {
        ...revisionOne,
        world: {
          ...revisionOne.world,
          worldRevision: 2,
          lastActiveAtUtc: '2026-09-23T18:01:00.000Z',
        },
      };
      const faultedSave = await failingSave.commit({
        world: revisionTwo.world,
        players: revisionTwo.players,
        containers: revisionTwo.containers,
        chunks: revisionTwo.chunks,
        footholds: revisionTwo.footholds,
        structures: revisionTwo.structures,
        expectedPreviousWorldRevision: 1,
      });
      expect(faultedSave).toMatchObject({
        ok: false,
        code: 'STORAGE_FAILURE',
      });

      const exportedBeforeImport = await normal.exportWorld('world-alpha');
      expect(exportedBeforeImport).toMatchObject({
        ok: true,
        value: { world: { worldRevision: 1 } },
      });
      if (!exportedBeforeImport.ok) {
        throw new Error(exportedBeforeImport.message);
      }

      const importCandidate: PortableSaveBundleV2 = {
        ...exportedBeforeImport.value,
        world: {
          ...exportedBeforeImport.value.world,
          worldRevision: 9,
          lastActiveAtUtc: '2026-09-23T18:02:00.000Z',
        },
      };
      const faultedImport = await failingImport.importWorld(importCandidate);
      expect(faultedImport).toMatchObject({
        ok: false,
        code: 'STORAGE_FAILURE',
      });

      expect(await normal.exportWorld('world-alpha')).toEqual(
        exportedBeforeImport,
      );
    } finally {
      await cleanup(databaseName, [normal, failingSave, failingImport]);
    }
  });

  it('exports, imports, and reexports a validated V2 world equivalently while invalid import preserves the prior target', async () => {
    const sourceName = 'proz0-test-save-v2-export-source';
    const targetName = 'proz0-test-save-v2-export-target';
    const source = new IndexedDbSaveRepositoryV2(options(sourceName));
    const target = new IndexedDbSaveRepositoryV2(options(targetName));

    try {
      const initial = migratedBundle();
      expect(await source.commit({
        world: initial.world,
        players: initial.players,
        containers: initial.containers,
        chunks: initial.chunks,
        footholds: initial.footholds,
        structures: initial.structures,
        expectedPreviousWorldRevision: null,
      })).toMatchObject({ ok: true });

      const exported = await source.exportWorld('world-alpha');
      expect(exported.ok).toBe(true);
      if (!exported.ok) throw new Error(exported.message);

      expect(await target.importWorld(exported.value)).toMatchObject({
        ok: true,
        value: { worldId: 'world-alpha' },
      });
      const targetBeforeInvalid = await target.exportWorld('world-alpha');
      expect(targetBeforeInvalid).toEqual(exported);

      const invalid = {
        ...exported.value,
        world: {
          ...exported.value.world,
          contentCompatibility: {
            ...exported.value.world.contentCompatibility,
            canonicalFingerprint: 'tampered-fingerprint',
          },
        },
      };
      expect(await target.importWorld(invalid)).toMatchObject({
        ok: false,
        code: 'CONTENT_FINGERPRINT_MISMATCH',
      });
      expect(await target.exportWorld('world-alpha')).toEqual(
        targetBeforeInvalid,
      );
    } finally {
      await cleanup(sourceName, [source]);
      await cleanup(targetName, [target]);
    }
  });

});
