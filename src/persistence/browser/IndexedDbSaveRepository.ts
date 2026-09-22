import type { ChunkCoord } from '../../world';
import { SaveMigrationRegistry } from '../migrations/SaveMigrationRegistry';
import {
  canonicalizePortableSaveBundle,
} from '../portable/PortableSave';
import {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV1,
  type SaveFailure,
  type SaveRepository,
  type SaveResult,
} from '../repository/SaveRepository';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import type { ChunkRecordV1 } from '../schema/v1/ChunkRecordV1';
import type { PlayerRecordV1 } from '../schema/v1/PlayerRecordV1';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';
import type { WorldManifestV1 } from '../schema/v1/WorldManifestV1';
import {
  PHASE0_SAVE_COMPATIBILITY,
  validateChunkRecordV1,
  validatePlayerRecordV1,
  validatePortableSaveBundleV1,
  validateSaveCommitRequestV1,
  validateWorldManifestV1,
  type SaveCompatibilityPolicy,
} from '../validation/SaveValidator';

export const INDEXED_DB_STORAGE_VERSION = 1 as const;
export const DEFAULT_INDEXED_DB_SAVE_DATABASE = 'proz0-phase0-saves' as const;

const WORLD_STORE = 'worlds';
const PLAYER_STORE = 'players';
const CHUNK_STORE = 'chunks';
const WORLD_ID_INDEX = 'worldId';

export interface IndexedDbSaveRepositoryOptions {
  readonly databaseName?: string;
  readonly indexedDbFactory?: IDBFactory;
  readonly migrations?: SaveMigrationRegistry;
  readonly compatibility?: SaveCompatibilityPolicy;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    };
    transaction.onerror = () => {
      // The abort handler provides the single terminal rejection.
    };
  });
}

function storageFailure(error: unknown): SaveFailure {
  return saveFailure(
    'STORAGE_FAILURE',
    `IndexedDB operation failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}

function validateLookupId(value: string, label: string): SaveFailure | null {
  if (value.trim().length === 0) {
    return saveFailure('CORRUPT_RECORD', `${label} must be non-empty.`);
  }

  return null;
}

export class IndexedDbSaveRepository implements SaveRepository {
  private readonly databaseName: string;
  private readonly indexedDbFactory: IDBFactory;
  private readonly migrations: SaveMigrationRegistry;
  private readonly compatibility: SaveCompatibilityPolicy;
  private databasePromise: Promise<IDBDatabase> | null = null;

  public constructor(options: IndexedDbSaveRepositoryOptions = {}) {
    const factory = options.indexedDbFactory ?? globalThis.indexedDB;
    if (factory === undefined) {
      throw new Error('IndexedDB is unavailable in this runtime.');
    }

    this.databaseName =
      options.databaseName ?? DEFAULT_INDEXED_DB_SAVE_DATABASE;
    this.indexedDbFactory = factory;
    this.migrations = options.migrations ?? new SaveMigrationRegistry();
    this.compatibility = options.compatibility ?? PHASE0_SAVE_COMPATIBILITY;
  }

  public async loadManifest(
    worldId: string,
  ): Promise<SaveResult<WorldManifestV1>> {
    const invalidId = validateLookupId(worldId, 'worldId');
    if (invalidId !== null) {
      return invalidId;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(WORLD_STORE, 'readonly');
      const done = transactionDone(transaction);
      const raw = await requestToPromise<unknown>(
        transaction.objectStore(WORLD_STORE).get(worldId),
      );
      await done;

      if (raw === undefined) {
        return saveFailure('NOT_FOUND', `World ${worldId} was not found.`);
      }

      return this.migrateAndValidateManifest(raw);
    } catch (error) {
      return storageFailure(error);
    }
  }

  public async loadPlayer(
    worldId: string,
    playerId: string,
  ): Promise<SaveResult<PlayerRecordV1>> {
    const invalidWorldId = validateLookupId(worldId, 'worldId');
    if (invalidWorldId !== null) {
      return invalidWorldId;
    }

    const invalidPlayerId = validateLookupId(playerId, 'playerId');
    if (invalidPlayerId !== null) {
      return invalidPlayerId;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(PLAYER_STORE, 'readonly');
      const done = transactionDone(transaction);
      const raw = await requestToPromise<unknown>(
        transaction.objectStore(PLAYER_STORE).get([worldId, playerId]),
      );
      await done;

      if (raw === undefined) {
        return saveFailure(
          'NOT_FOUND',
          `Player ${playerId} was not found in world ${worldId}.`,
        );
      }

      const migrated = this.migrations.migrateToCurrent(raw);
      if (!migrated.ok) {
        return migrated;
      }

      return validatePlayerRecordV1(migrated.value, worldId);
    } catch (error) {
      return storageFailure(error);
    }
  }

  public async loadChunk(
    worldId: string,
    coord: ChunkCoord,
  ): Promise<SaveResult<ChunkRecordV1 | null>> {
    const invalidWorldId = validateLookupId(worldId, 'worldId');
    if (invalidWorldId !== null) {
      return invalidWorldId;
    }

    if (
      !Number.isInteger(coord.x)
      || !Number.isInteger(coord.y)
      || coord.x < -0x8000_0000
      || coord.x > 0x7fff_ffff
      || coord.y < -0x8000_0000
      || coord.y > 0x7fff_ffff
    ) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Chunk lookup coordinate must be canonical signed int32.',
      );
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(CHUNK_STORE, 'readonly');
      const done = transactionDone(transaction);
      const raw = await requestToPromise<unknown>(
        transaction.objectStore(CHUNK_STORE).get([
          worldId,
          coord.x,
          coord.y,
        ]),
      );
      await done;

      if (raw === undefined) {
        return saveSuccess(null);
      }

      const migrated = this.migrations.migrateToCurrent(raw);
      if (!migrated.ok) {
        return migrated;
      }

      return validateChunkRecordV1(
        migrated.value,
        worldId,
        this.compatibility,
      );
    } catch (error) {
      return storageFailure(error);
    }
  }

  public async loadWorld(
    worldId: string,
  ): Promise<SaveResult<PortableSaveBundleV1>> {
    const invalidId = validateLookupId(worldId, 'worldId');
    if (invalidId !== null) {
      return invalidId;
    }

    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(
        [WORLD_STORE, PLAYER_STORE, CHUNK_STORE],
        'readonly',
      );
      const done = transactionDone(transaction);

      const rawWorldRequest = transaction.objectStore(WORLD_STORE).get(worldId);
      const rawPlayersRequest = transaction
        .objectStore(PLAYER_STORE)
        .index(WORLD_ID_INDEX)
        .getAll(IDBKeyRange.only(worldId));
      const rawChunksRequest = transaction
        .objectStore(CHUNK_STORE)
        .index(WORLD_ID_INDEX)
        .getAll(IDBKeyRange.only(worldId));

      const [rawWorld, rawPlayers, rawChunks] = await Promise.all([
        requestToPromise<unknown>(rawWorldRequest),
        requestToPromise<unknown[]>(rawPlayersRequest),
        requestToPromise<unknown[]>(rawChunksRequest),
      ]);
      await done;

      if (rawWorld === undefined) {
        return saveFailure('NOT_FOUND', `World ${worldId} was not found.`);
      }

      const world = this.migrateAndValidateManifest(rawWorld);
      if (!world.ok) {
        return world;
      }

      const players: PlayerRecordV1[] = [];
      for (const rawPlayer of rawPlayers) {
        const migrated = this.migrations.migrateToCurrent(rawPlayer);
        if (!migrated.ok) {
          return migrated;
        }

        const player = validatePlayerRecordV1(migrated.value, worldId);
        if (!player.ok) {
          return player;
        }
        players.push(player.value);
      }

      const chunks: ChunkRecordV1[] = [];
      for (const rawChunk of rawChunks) {
        const migrated = this.migrations.migrateToCurrent(rawChunk);
        if (!migrated.ok) {
          return migrated;
        }

        const chunk = validateChunkRecordV1(
          migrated.value,
          worldId,
          this.compatibility,
        );
        if (!chunk.ok) {
          return chunk;
        }
        chunks.push(chunk.value);
      }

      const bundle = validatePortableSaveBundleV1({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION,
        recordKind: 'portable-bundle',
        world: world.value,
        players,
        chunks,
      }, this.compatibility);

      if (!bundle.ok) {
        return bundle;
      }

      return saveSuccess(canonicalizePortableSaveBundle(bundle.value));
    } catch (error) {
      return storageFailure(error);
    }
  }

  public async commit(
    request: SaveCommitRequestV1,
  ): Promise<SaveResult<{ readonly worldRevision: number }>> {
    const validated = validateSaveCommitRequestV1(
      request,
      this.compatibility,
    );
    if (!validated.ok) {
      return validated;
    }

    let database: IDBDatabase;
    try {
      database = await this.openDatabase();
    } catch (error) {
      return storageFailure(error);
    }

    return this.commitValidated(database, validated.value);
  }

  public async exportWorld(
    worldId: string,
  ): Promise<SaveResult<PortableSaveBundleV1>> {
    return this.loadWorld(worldId);
  }

  public async importWorld(
    bundle: unknown,
  ): Promise<SaveResult<{ readonly worldId: string }>> {
    const migrated = this.migrations.migrateToCurrent(bundle);
    if (!migrated.ok) {
      return migrated;
    }

    const validated = validatePortableSaveBundleV1(
      migrated.value,
      this.compatibility,
    );
    if (!validated.ok) {
      return validated;
    }

    const canonical = canonicalizePortableSaveBundle(validated.value);

    let database: IDBDatabase;
    try {
      database = await this.openDatabase();
    } catch (error) {
      return storageFailure(error);
    }

    return this.importValidated(database, canonical);
  }

  public async close(): Promise<void> {
    if (this.databasePromise === null) {
      return;
    }

    try {
      const database = await this.databasePromise;
      database.close();
    } finally {
      this.databasePromise = null;
    }
  }

  protected beforeManifestWrite(
    _transaction: IDBTransaction,
    _request: SaveCommitRequestV1,
  ): void {
    // Fault-injection seam for transactional adapter tests.
  }

  protected beforeImportManifestWrite(
    _transaction: IDBTransaction,
    _bundle: PortableSaveBundleV1,
  ): void {
    // Fault-injection seam for transactional adapter tests.
  }

  private migrateAndValidateManifest(
    raw: unknown,
  ): SaveResult<WorldManifestV1> {
    const migrated = this.migrations.migrateToCurrent(raw);
    if (!migrated.ok) {
      return migrated;
    }

    return validateWorldManifestV1(migrated.value, this.compatibility);
  }

  private commitValidated(
    database: IDBDatabase,
    request: SaveCommitRequestV1,
  ): Promise<SaveResult<{ readonly worldRevision: number }>> {
    return new Promise((resolve) => {
      let domainFailure: SaveFailure | null = null;
      const transaction = database.transaction(
        [WORLD_STORE, PLAYER_STORE, CHUNK_STORE],
        'readwrite',
      );
      const worldStore = transaction.objectStore(WORLD_STORE);
      const playerStore = transaction.objectStore(PLAYER_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);
      const currentRequest = worldStore.get(request.world.worldId);

      currentRequest.onsuccess = () => {
        const rawCurrent: unknown = currentRequest.result;
        let current: WorldManifestV1 | null = null;

        if (rawCurrent !== undefined) {
          const validatedCurrent = this.migrateAndValidateManifest(rawCurrent);
          if (!validatedCurrent.ok) {
            domainFailure = validatedCurrent;
            transaction.abort();
            return;
          }
          current = validatedCurrent.value;
        }

        const expected = request.expectedPreviousWorldRevision;
        const stale =
          expected === null
            ? current !== null
            : current === null || current.worldRevision !== expected;

        if (stale) {
          domainFailure = saveFailure(
            'STALE_WRITE',
            `World ${request.world.worldId} changed since expected revision ${String(expected)}.`,
          );
          transaction.abort();
          return;
        }

        try {
          for (const player of request.players) {
            playerStore.put(player);
          }
          for (const chunk of request.chunks) {
            chunkStore.put(chunk);
          }

          this.beforeManifestWrite(transaction, request);
          worldStore.put(request.world);
        } catch (error) {
          domainFailure = storageFailure(error);
          try {
            transaction.abort();
          } catch {
            // Transaction may already be aborting.
          }
        }
      };

      currentRequest.onerror = () => {
        domainFailure = storageFailure(
          currentRequest.error ?? new Error('Failed to read current manifest.'),
        );
      };

      transaction.oncomplete = () => {
        resolve(saveSuccess({
          worldRevision: request.world.worldRevision,
        }));
      };

      transaction.onabort = () => {
        resolve(
          domainFailure
          ?? storageFailure(
            transaction.error ?? new Error('IndexedDB commit aborted.'),
          ),
        );
      };

      transaction.onerror = () => {
        // onabort is the terminal failure path.
      };
    });
  }

  private importValidated(
    database: IDBDatabase,
    bundle: PortableSaveBundleV1,
  ): Promise<SaveResult<{ readonly worldId: string }>> {
    return new Promise((resolve) => {
      let domainFailure: SaveFailure | null = null;
      const transaction = database.transaction(
        [WORLD_STORE, PLAYER_STORE, CHUNK_STORE],
        'readwrite',
      );
      const worldStore = transaction.objectStore(WORLD_STORE);
      const playerStore = transaction.objectStore(PLAYER_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);
      const playerKeysRequest = playerStore
        .index(WORLD_ID_INDEX)
        .getAllKeys(IDBKeyRange.only(bundle.world.worldId));
      const chunkKeysRequest = chunkStore
        .index(WORLD_ID_INDEX)
        .getAllKeys(IDBKeyRange.only(bundle.world.worldId));

      let playerKeys: IDBValidKey[] | null = null;
      let chunkKeys: IDBValidKey[] | null = null;
      let writesScheduled = false;

      const scheduleWrites = (): void => {
        if (
          writesScheduled
          || playerKeys === null
          || chunkKeys === null
        ) {
          return;
        }

        writesScheduled = true;

        try {
          for (const key of playerKeys) {
            playerStore.delete(key);
          }
          for (const key of chunkKeys) {
            chunkStore.delete(key);
          }
          for (const player of bundle.players) {
            playerStore.put(player);
          }
          for (const chunk of bundle.chunks) {
            chunkStore.put(chunk);
          }

          this.beforeImportManifestWrite(transaction, bundle);
          worldStore.put(bundle.world);
        } catch (error) {
          domainFailure = storageFailure(error);
          try {
            transaction.abort();
          } catch {
            // Transaction may already be aborting.
          }
        }
      };

      playerKeysRequest.onsuccess = () => {
        playerKeys = playerKeysRequest.result;
        scheduleWrites();
      };
      chunkKeysRequest.onsuccess = () => {
        chunkKeys = chunkKeysRequest.result;
        scheduleWrites();
      };

      playerKeysRequest.onerror = () => {
        domainFailure = storageFailure(
          playerKeysRequest.error ?? new Error('Failed to enumerate players.'),
        );
      };
      chunkKeysRequest.onerror = () => {
        domainFailure = storageFailure(
          chunkKeysRequest.error ?? new Error('Failed to enumerate chunks.'),
        );
      };

      transaction.oncomplete = () => {
        resolve(saveSuccess({ worldId: bundle.world.worldId }));
      };
      transaction.onabort = () => {
        resolve(
          domainFailure
          ?? storageFailure(
            transaction.error ?? new Error('IndexedDB import aborted.'),
          ),
        );
      };
      transaction.onerror = () => {
        // onabort is the terminal failure path.
      };
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise !== null) {
      return this.databasePromise;
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDbFactory.open(
        this.databaseName,
        INDEXED_DB_STORAGE_VERSION,
      );

      request.onupgradeneeded = () => {
        const database = request.result;
        const transaction = request.transaction;
        if (transaction === null) {
          throw new Error('IndexedDB upgrade transaction is unavailable.');
        }

        if (!database.objectStoreNames.contains(WORLD_STORE)) {
          database.createObjectStore(WORLD_STORE, { keyPath: 'worldId' });
        }

        let playerStore: IDBObjectStore;
        if (!database.objectStoreNames.contains(PLAYER_STORE)) {
          playerStore = database.createObjectStore(PLAYER_STORE, {
            keyPath: ['worldId', 'playerId'],
          });
        } else {
          playerStore = transaction.objectStore(PLAYER_STORE);
        }
        if (!playerStore.indexNames.contains(WORLD_ID_INDEX)) {
          playerStore.createIndex(WORLD_ID_INDEX, 'worldId');
        }

        let chunkStore: IDBObjectStore;
        if (!database.objectStoreNames.contains(CHUNK_STORE)) {
          chunkStore = database.createObjectStore(CHUNK_STORE, {
            keyPath: ['worldId', 'coord.x', 'coord.y'],
          });
        } else {
          chunkStore = transaction.objectStore(CHUNK_STORE);
        }
        if (!chunkStore.indexNames.contains(WORLD_ID_INDEX)) {
          chunkStore.createIndex(WORLD_ID_INDEX, 'worldId');
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB.'));
      };
      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error('IndexedDB open request is blocked.'));
      };
    });

    return this.databasePromise;
  }
}

export async function deleteIndexedDbSaveDatabase(
  databaseName: string,
  indexedDbFactory: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDbFactory.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to delete IndexedDB database.'));
    };
    request.onblocked = () => {
      reject(new Error('IndexedDB database deletion is blocked.'));
    };
  });
}
