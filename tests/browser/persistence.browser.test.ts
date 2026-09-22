import { describe, expect, it } from 'vitest';
import { LocalAuthorityHost } from '../../src/client/runtime/LocalAuthorityHost';
import {
  INDEXED_DB_STORAGE_VERSION,
  IndexedDbSaveRepository,
  SaveRepositoryChunkPersistenceAdapter,
  deleteIndexedDbSaveDatabase,
  type SaveCommitRequestV1,
} from '../../src/persistence';
import {
  createChunkCoord,
  createChunkStore,
  createPhase0ChunkGenerator,
  createStaticCollisionWorld,
  PHASE0_WORLD_GENERATION_VERSION,
} from '../../src/world';
import {
  makeChunkRecord,
  makePlayerRecord,
  makePortableBundle,
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

class AbortBeforeManifestRepository extends IndexedDbSaveRepository {
  protected override beforeManifestWrite(
    transaction: IDBTransaction,
    request: SaveCommitRequestV1,
  ): void {
    void request;
    transaction.abort();
  }
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('Raw test transaction aborted.'));
    };
    transaction.onerror = () => {
      // onabort is terminal.
    };
  });
}

async function putRawRecord(
  databaseName: string,
  storeName: 'players' | 'chunks',
  value: unknown,
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, INDEXED_DB_STORAGE_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open test database.'));
    };
  });

  try {
    const transaction = database.transaction(storeName, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(storeName).put(value);
    await done;
  } finally {
    database.close();
  }
}

async function commitInitialWorld(
  repository: IndexedDbSaveRepository,
  players = [makePlayerRecord()],
  chunks = [makeChunkRecord()],
): Promise<void> {
  const result = await repository.commit({
    world: makeWorldManifest(),
    players,
    chunks,
    expectedPreviousWorldRevision: null,
  });

  expect(result).toEqual({
    ok: true,
    value: { worldRevision: 0 },
  });
}

async function closeAndDelete(
  databaseName: string,
  repositories: readonly IndexedDbSaveRepository[],
): Promise<void> {
  for (const repository of repositories) {
    await repository.close();
  }
  await deleteIndexedDbSaveDatabase(databaseName);
}

describe('IndexedDbSaveRepository Phase 0 browser persistence', () => {
  it('round-trips and reloads the same validated world after repository reopen', async () => {
    const databaseName = 'proz0-test-save-roundtrip';
    const first = new IndexedDbSaveRepository({ databaseName });
    const second = new IndexedDbSaveRepository({ databaseName });

    try {
      await commitInitialWorld(first);
      const initial = await first.loadWorld('world-alpha');

      expect(initial.ok).toBe(true);
      if (!initial.ok) {
        throw new Error(initial.message);
      }

      await first.close();

      const reopened = await second.loadWorld('world-alpha');
      expect(reopened).toEqual(initial);

      const loadedHost = await LocalAuthorityHost.createFromSave({
        repository: second,
        worldId: 'world-alpha',
        playerId: 'player-1',
        worldQuery: createStaticCollisionWorld([]),
      });

      expect(loadedHost.ok).toBe(true);
      if (!loadedHost.ok) {
        throw new Error(loadedHost.message);
      }

      loadedHost.value.start();
      expect(loadedHost.value.getSnapshot().player).toMatchObject({
        position: { x: 12.5, y: -4.25 },
        facing: 'SE',
      });
      loadedHost.value.stop();
    } finally {
      await closeAndDelete(databaseName, [first, second]);
    }
  });

  it('SAVE-009/010 advances worldRevision once and rejects stale overwrite', async () => {
    const databaseName = 'proz0-test-save-stale';
    const repository = new IndexedDbSaveRepository({ databaseName });

    try {
      await commitInitialWorld(repository);

      const committedPlayer = makePlayerRecord({
        playerRevision: 1,
        position: { x: 25, y: 5 },
      });
      const next = await repository.commit({
        world: makeWorldManifest({
          worldRevision: 1,
          lastActiveAtUtc: '2026-09-22T00:01:00.000Z',
        }),
        players: [committedPlayer],
        chunks: [],
        expectedPreviousWorldRevision: 0,
      });

      expect(next).toEqual({
        ok: true,
        value: { worldRevision: 1 },
      });

      const stale = await repository.commit({
        world: makeWorldManifest({
          worldRevision: 1,
          lastActiveAtUtc: '2026-09-22T00:02:00.000Z',
        }),
        players: [
          makePlayerRecord({
            playerRevision: 2,
            position: { x: 999, y: 999 },
          }),
        ],
        chunks: [],
        expectedPreviousWorldRevision: 0,
      });

      expect(stale).toMatchObject({
        ok: false,
        code: 'STALE_WRITE',
      });

      const manifest = await repository.loadManifest('world-alpha');
      const player = await repository.loadPlayer('world-alpha', 'player-1');

      expect(manifest).toMatchObject({
        ok: true,
        value: { worldRevision: 1 },
      });
      expect(player).toMatchObject({
        ok: true,
        value: {
          playerRevision: 1,
          position: { x: 25, y: 5 },
        },
      });
    } finally {
      await closeAndDelete(databaseName, [repository]);
    }
  });

  it('SAVE-008 aborts a multi-record transaction without partial overwrite', async () => {
    const databaseName = 'proz0-test-save-atomic-abort';
    const normal = new IndexedDbSaveRepository({ databaseName });
    const failing = new AbortBeforeManifestRepository({ databaseName });

    try {
      await commitInitialWorld(normal);

      const failure = await failing.commit({
        world: makeWorldManifest({
          worldRevision: 1,
          lastActiveAtUtc: '2026-09-22T00:03:00.000Z',
        }),
        players: [
          makePlayerRecord({
            playerRevision: 1,
            position: { x: 77, y: 88 },
          }),
        ],
        chunks: [
          makeChunkRecord({
            chunkRevision: 1,
          }),
        ],
        expectedPreviousWorldRevision: 0,
      });

      expect(failure).toMatchObject({
        ok: false,
        code: 'STORAGE_FAILURE',
      });

      const world = await normal.loadWorld('world-alpha');
      expect(world).toMatchObject({
        ok: true,
        value: {
          world: { worldRevision: 0 },
          players: [
            {
              playerRevision: 0,
              position: { x: 12.5, y: -4.25 },
            },
          ],
          chunks: [
            { chunkRevision: 0 },
          ],
        },
      });
    } finally {
      await closeAndDelete(databaseName, [normal, failing]);
    }
  });

  it('SAVE-017/018/019 exports canonically, imports transactionally, and protects valid state from invalid import', async () => {
    const sourceName = 'proz0-test-save-export-source';
    const targetName = 'proz0-test-save-export-target';
    const source = new IndexedDbSaveRepository({ databaseName: sourceName });
    const target = new IndexedDbSaveRepository({ databaseName: targetName });

    try {
      await commitInitialWorld(
        source,
        [
          makePlayerRecord({ playerId: 'z-player' }),
          makePlayerRecord({ playerId: 'a-player' }),
        ],
        [
          makeChunkRecord({ coord: createChunkCoord(5, 4) }),
          makeChunkRecord({ coord: createChunkCoord(-2, 7) }),
          makeChunkRecord({ coord: createChunkCoord(-2, -1) }),
        ],
      );

      const exported = await source.exportWorld('world-alpha');
      expect(exported.ok).toBe(true);
      if (!exported.ok) {
        throw new Error(exported.message);
      }

      expect(exported.value.players.map((player) => player.playerId)).toEqual([
        'a-player',
        'z-player',
      ]);
      expect(exported.value.chunks.map((chunk) => [
        chunk.coord.x,
        chunk.coord.y,
      ])).toEqual([
        [-2, -1],
        [-2, 7],
        [5, 4],
      ]);

      const imported = await target.importWorld(exported.value);
      expect(imported).toEqual({
        ok: true,
        value: { worldId: 'world-alpha' },
      });

      const reexported = await target.exportWorld('world-alpha');
      expect(reexported).toEqual(exported);

      const invalidImport = await target.importWorld({
        ...makePortableBundle(),
        formatId: 'not-proz0-save',
      });
      expect(invalidImport).toMatchObject({
        ok: false,
        code: 'INVALID_FORMAT',
      });

      expect(await target.exportWorld('world-alpha')).toEqual(exported);
    } finally {
      await closeAndDelete(sourceName, [source]);
      await closeAndDelete(targetName, [target]);
    }
  });

  it('SAVE-011 rejects corrupt player/root load before authority publication', async () => {
    const databaseName = 'proz0-test-save-corrupt-player';
    const repository = new IndexedDbSaveRepository({ databaseName });

    try {
      await commitInitialWorld(repository);
      await putRawRecord(databaseName, 'players', {
        ...makePlayerRecord(),
        facing: 'BROKEN',
      });

      const world = await repository.loadWorld('world-alpha');
      expect(world).toMatchObject({
        ok: false,
        code: 'CORRUPT_RECORD',
      });

      const host = await LocalAuthorityHost.createFromSave({
        repository,
        worldId: 'world-alpha',
        playerId: 'player-1',
        worldQuery: createStaticCollisionWorld([]),
      });
      expect(host).toMatchObject({
        ok: false,
        code: 'CORRUPT_RECORD',
      });
    } finally {
      await closeAndDelete(databaseName, [repository]);
    }
  });

  it('SAVE-012 routes a corrupt persisted chunk into FAILED materialization instead of silent regeneration', async () => {
    const databaseName = 'proz0-test-save-corrupt-chunk';
    const repository = new IndexedDbSaveRepository({ databaseName });

    try {
      await commitInitialWorld(repository);
      await putRawRecord(databaseName, 'chunks', {
        ...makeChunkRecord(),
        generated: false,
      });

      const persistence = new SaveRepositoryChunkPersistenceAdapter({
        repository,
        worldId: 'world-alpha',
        worldSeed: 'phase0-persistence-seed',
        nowUtc: () => '2026-09-22T00:04:00.000Z',
      });
      const store = createChunkStore({
        worldSeed: 'phase0-persistence-seed',
        generationVersion: PHASE0_WORLD_GENERATION_VERSION,
        generator: createPhase0ChunkGenerator(),
        persistence,
      });
      const coord = createChunkCoord(-7, 11);

      await expect(store.requestActive(coord)).rejects.toThrow(
        /generated marker/,
      );
      expect(store.query(coord)).toBeUndefined();
      expect(store.getMeta(coord)?.lifecycle).toBe('FAILED');
    } finally {
      await closeAndDelete(databaseName, [repository]);
    }
  });
});
