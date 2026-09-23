import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { createWorldPosition } from '../../src/foundation';
import {
  IndexedDbSaveRepository,
  IndexedDbSaveRepositoryV2,
  buildingSnapshotToRecordsV2,
  containerRecordsV2ToItemLedgerSnapshot,
  createPhase1SaveV2Compatibility,
  deleteIndexedDbSaveDatabase,
  itemLedgerSnapshotToContainerRecordsV2,
  migratePortableSaveBundleV1ToV2,
  recordsV2ToBuildingSnapshot,
  type PortableSaveBundleV2,
} from '../../src/persistence';
import {
  BuildingItemWorldAdapter,
  PHASE0_WORLD_GENERATION_VERSION,
  Phase1BuildingWorld,
} from '../../src/world';
import {
  Phase1BuildingAuthority,
  Phase1ItemAuthority,
} from '../../src/simulation';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
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

function placementReopenBundle() {
  const catalog = createPhase1ContentCatalog();
  const base = migratedBundle();
  const player = base.players[0];
  const chunk = base.chunks[0];
  if (player === undefined || chunk === undefined) {
    throw new Error('Expected migrated player and chunk.');
  }

  const spatial = new Phase1BuildingTestSpatial();
  const buildings = new Phase1BuildingWorld(spatial);
  const items = new Phase1ItemAuthority({
    catalog,
    world: new BuildingItemWorldAdapter(
      new Phase1ItemTestWorld(),
      buildings,
    ),
    initialLedger: Object.freeze({
      containers: Object.freeze([
        Object.freeze({
          containerId: player.inventoryContainerId,
          kind: 'player-inventory' as const,
          ownerPlayerId: player.playerId,
          revision: 0,
          stacks: Object.freeze([
            Object.freeze({
              stackId: 'workbench-kit',
              itemDefinitionId: 'item:workbench-kit',
              quantity: 1,
              condition: null,
            }),
          ]),
        }),
      ]),
    }),
  });
  const authority = new Phase1BuildingAuthority(catalog, items, buildings);
  const command = Object.freeze({
    operationId: 'place:persisted-workbench',
    actorPlayerId: player.playerId,
    structureDefinitionId: 'structure:workbench' as const,
    sourceKitStackId: 'workbench-kit',
    inventoryContainerId: player.inventoryContainerId,
    expectedInventoryRevision: 0,
    expectedBuildRevision: 0,
    placement: Object.freeze({
      mode: 'free' as const,
      anchor: createWorldPosition(2.5, 0),
      orientationQuarterTurns: 0 as const,
    }),
  });

  const first = authority.place(command);
  if (first.status !== 'committed') {
    throw new Error('Expected initial placement to commit.');
  }

  const building = buildingSnapshotToRecordsV2(
    base.world.worldId,
    buildings.exportSnapshot(),
  );
  const containers = itemLedgerSnapshotToContainerRecordsV2(
    base.world.worldId,
    items.exportLedgerSnapshot(),
    { resolveOwner: () => null },
  );
  const structureIds = building.structures.map(
    (structure) => structure.structureId,
  );

  const bundle: PortableSaveBundleV2 = Object.freeze({
    ...base,
    containers,
    chunks: Object.freeze([
      Object.freeze({
        ...chunk,
        structureIds: Object.freeze(structureIds),
      }),
    ]),
    footholds: Object.freeze([building.foothold]),
    structures: building.structures,
  });

  return Object.freeze({ bundle, catalog, command, first });
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


  it('preserves #51 placement OperationId full-payload identity across real Save V2 reopen', async () => {
    const databaseName = 'proz0-test-save-v2-placement-reopen';
    const firstRepository = new IndexedDbSaveRepositoryV2(
      options(databaseName),
    );
    const reopenedRepository = new IndexedDbSaveRepositoryV2(
      options(databaseName),
    );
    const prepared = placementReopenBundle();

    try {
      expect(await firstRepository.commit({
        world: prepared.bundle.world,
        players: prepared.bundle.players,
        containers: prepared.bundle.containers,
        chunks: prepared.bundle.chunks,
        footholds: prepared.bundle.footholds,
        structures: prepared.bundle.structures,
        expectedPreviousWorldRevision: null,
      })).toMatchObject({ ok: true });

      firstRepository.close();

      const loaded = await reopenedRepository.loadWorld('world-alpha');
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) throw new Error(loaded.message);

      const foothold = loaded.value.footholds[0];
      if (foothold === undefined) {
        throw new Error('Expected persisted foothold.');
      }

      const buildings = new Phase1BuildingWorld(
        new Phase1BuildingTestSpatial(),
        recordsV2ToBuildingSnapshot(
          foothold,
          loaded.value.structures,
          loaded.value.containers,
          prepared.catalog,
        ),
      );
      const items = new Phase1ItemAuthority({
        catalog: prepared.catalog,
        world: new BuildingItemWorldAdapter(
          new Phase1ItemTestWorld(),
          buildings,
        ),
        initialLedger: containerRecordsV2ToItemLedgerSnapshot(
          loaded.value.containers,
        ),
      });
      const authority = new Phase1BuildingAuthority(
        prepared.catalog,
        items,
        buildings,
      );

      const beforeLedger = items.exportLedgerSnapshot();
      const beforeStructures = buildings.exportSnapshot().foothold.structures;
      expect(beforeLedger.containers[0]).toMatchObject({
        revision: 1,
        stacks: [],
      });

      expect(authority.place(prepared.command)).toEqual(prepared.first);

      const conflicts = [
        {
          ...prepared.command,
          sourceKitStackId: 'changed-kit',
        },
        {
          ...prepared.command,
          inventoryContainerId: 'changed-inventory',
        },
        {
          ...prepared.command,
          expectedInventoryRevision: 1,
        },
        {
          ...prepared.command,
          expectedBuildRevision: 1,
        },
        {
          ...prepared.command,
          placement: Object.freeze({
            ...prepared.command.placement,
            anchor: createWorldPosition(4, 0),
          }),
        },
      ];
      for (const changed of conflicts) {
        expect(authority.place(changed)).toMatchObject({
          status: 'rejected',
          operationId: prepared.command.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }

      expect(items.exportLedgerSnapshot()).toEqual(beforeLedger);
      expect(buildings.exportSnapshot().foothold.structures).toEqual(
        beforeStructures,
      );
    } finally {
      await cleanup(
        databaseName,
        [firstRepository, reopenedRepository],
      );
    }
  });

  it('rejects each #52-invalid progression import before replacing the prior durable world', async () => {
    const databaseName = 'proz0-test-save-v2-invalid-progression-import';
    const repository = new IndexedDbSaveRepositoryV2(options(databaseName));
    const base = migratedBundle();

    try {
      expect(await repository.importWorld(base)).toMatchObject({ ok: true });
      const before = await repository.exportWorld('world-alpha');
      expect(before.ok).toBe(true);
      if (!before.ok) throw new Error(before.message);

      const player = base.players[0];
      if (player === undefined) throw new Error('Expected migrated player.');
      const explorer = player.progression.professionQuests.find(
        (quest) =>
          quest.questDefinitionId
            === 'profession-quest:chart-the-unknown',
      );
      const engineer = player.progression.professionQuests.find(
        (quest) =>
          quest.questDefinitionId
            === 'profession-quest:bring-water-online',
      );
      if (explorer === undefined || engineer === undefined) {
        throw new Error('Expected canonical profession quest records.');
      }

      const withProgression = (
        progression: typeof player.progression,
      ): PortableSaveBundleV2 => ({
        ...base,
        players: [{ ...player, progression }],
      });

      const eligible = {
        ...player.progression,
        totalXp: 225,
        completedMilestoneRuleIds: ['first-expedition-band-entry'],
        unlockedSkillIds: ['skill:fieldcraft-basics'],
      } as const;
      const eligibleWithRuin = {
        ...eligible,
        completedMilestoneRuleIds: [
          'first-expedition-band-entry',
          'first-ruin-locate:previous-civilization-ruin',
          'first-ruin-inspect:previous-civilization-ruin',
        ],
      } as const;

      const invalidBundles = [
        withProgression({
          ...player.progression,
          professionQuests: [{
            ...explorer,
            completedObjectiveOrdinals: [1],
          }, engineer],
        }),
        withProgression({
          ...player.progression,
          professionQuests: [{
            ...explorer,
            completedObjectiveOrdinals: [0],
          }, engineer],
        }),
        withProgression({
          ...eligible,
          unlockedSkillIds: [],
        }),
        withProgression({
          ...eligible,
          professionQuests: [{
            ...explorer,
            completedObjectiveOrdinals: [0],
          }, engineer],
        }),
        withProgression({
          ...player.progression,
          unlockedProfessionIds: ['profession:explorer-prototype'],
        }),
        withProgression({
          ...eligibleWithRuin,
          professionQuests: [{
            ...explorer,
            completedObjectiveOrdinals: [0, 1, 2],
            completed: true,
          }, engineer],
          unlockedProfessionIds: [],
        }),
      ];

      for (const invalid of invalidBundles) {
        expect(await repository.importWorld(invalid)).toMatchObject({
          ok: false,
          code: 'CORRUPT_RECORD',
        });
        expect(await repository.exportWorld('world-alpha')).toEqual(before);
      }
    } finally {
      await cleanup(databaseName, [repository]);
    }
  });

});
