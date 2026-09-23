import type { ContentCatalogV1 } from '../../content';
import {
  migratePortableSaveBundleV1ToV2,
  type V1ToV2MigrationOptions,
} from '../migrations/V1ToV2Migration';
import { canonicalizePortableSaveBundleV2 } from '../portable/PortableSaveV2';
import {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
  type SaveResult,
} from '../repository/SaveRepositoryV2';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V1,
  SAVE_SCHEMA_VERSION_V2,
} from '../schema/SaveSchema';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';
import type { ChunkRecordV2 } from '../schema/v2/ChunkRecordV2';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';
import type { WorldManifestV2 } from '../schema/v2/WorldManifestV2';
import {
  validatePortableSaveBundleV2,
  validateSaveCommitRequestV2,
  type SaveV2CompatibilityPolicy,
} from '../validation/SaveValidatorV2';

const WORLD_STORE = 'worlds';
const PLAYER_STORE = 'players';
const CONTAINER_STORE = 'containers';
const CHUNK_STORE = 'chunks';
const FOOTHOLD_STORE = 'footholds';
const STRUCTURE_STORE = 'structures';
const WORLD_ID_INDEX = 'worldId';
const CHILD_STORES = [
  PLAYER_STORE,
  CONTAINER_STORE,
  CHUNK_STORE,
  FOOTHOLD_STORE,
  STRUCTURE_STORE,
] as const;
const ALL_STORES = [WORLD_STORE, ...CHILD_STORES] as const;

export const PHASE1_INDEXED_DB_STORAGE_VERSION = 2 as const;
export const PHASE1_INDEXED_DB_NAME = 'proz0-phase0-saves' as const;

export interface IndexedDbSaveRepositoryV2Faults {
  beforeManifestWrite?(): void;
  beforeImportManifestWrite?(): void;
}

export interface IndexedDbSaveRepositoryV2Options {
  readonly catalog: ContentCatalogV1;
  readonly compatibility: SaveV2CompatibilityPolicy;
  readonly migration: V1ToV2MigrationOptions;
  readonly indexedDbFactory?: IDBFactory;
  readonly databaseName?: string;
  readonly faults?: IndexedDbSaveRepositoryV2Faults;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function schemaVersionOf(value: unknown): number | null {
  if (!isObject(value) || !Number.isSafeInteger(value.schemaVersion)) return null;
  return value.schemaVersion as number;
}

function bundleFromRequest(request: SaveCommitRequestV2): PortableSaveBundleV2 {
  return {
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  };
}

export class IndexedDbSaveRepositoryV2 implements SaveRepositoryV2 {
  private readonly indexedDbFactory: IDBFactory;
  private readonly databaseName: string;
  private readonly faults: IndexedDbSaveRepositoryV2Faults;
  private databasePromise: Promise<IDBDatabase> | null = null;

  public constructor(private readonly options: IndexedDbSaveRepositoryV2Options) {
    this.indexedDbFactory = options.indexedDbFactory ?? indexedDB;
    this.databaseName = options.databaseName ?? PHASE1_INDEXED_DB_NAME;
    this.faults = options.faults ?? {};
  }

  public async loadManifest(worldId: string): Promise<SaveResult<WorldManifestV2>> {
    const world = await this.loadWorld(worldId);
    if (world.ok === false) return world;
    return saveSuccess(world.value.world);
  }

  public async loadPlayer(worldId: string, playerId: string): Promise<SaveResult<PlayerRecordV2>> {
    const world = await this.loadWorld(worldId);
    if (world.ok === false) return world;
    const player = world.value.players.find((entry) => entry.playerId === playerId);
    return player === undefined
      ? saveFailure('NOT_FOUND', `Player ${playerId} was not found in world ${worldId}.`)
      : saveSuccess(player);
  }

  public async loadChunk(worldId: string, x: number, y: number): Promise<SaveResult<ChunkRecordV2>> {
    const world = await this.loadWorld(worldId);
    if (world.ok === false) return world;
    const chunk = world.value.chunks.find((entry) => entry.coord.x === x && entry.coord.y === y);
    return chunk === undefined
      ? saveFailure('NOT_FOUND', `Chunk ${x},${y} was not found in world ${worldId}.`)
      : saveSuccess(chunk);
  }

  public async loadWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV2>> {
    try {
      const raw = await this.readRawWorld(worldId);
      if (raw.world === undefined) return saveFailure('NOT_FOUND', `World ${worldId} was not found.`);
      const schemaVersion = schemaVersionOf(raw.world);
      if (schemaVersion === SAVE_SCHEMA_VERSION_V1) {
        const v1: PortableSaveBundleV1 = {
          formatId: SAVE_FORMAT_ID,
          schemaVersion: SAVE_SCHEMA_VERSION_V1,
          recordKind: 'portable-bundle',
          world: raw.world as PortableSaveBundleV1['world'],
          players: raw.players as PortableSaveBundleV1['players'],
          chunks: raw.chunks as PortableSaveBundleV1['chunks'],
        };
        const migrated = migratePortableSaveBundleV1ToV2(v1, this.options.migration);
        if (!migrated.ok) return migrated;
        return validatePortableSaveBundleV2(migrated.value, this.options.compatibility);
      }
      if (schemaVersion !== SAVE_SCHEMA_VERSION_V2) {
        if (schemaVersion !== null && schemaVersion > SAVE_SCHEMA_VERSION_V2) {
          return saveFailure('UNSUPPORTED_NEWER_SCHEMA', `World ${worldId} uses schema ${schemaVersion}.`);
        }
        return saveFailure('CORRUPT_RECORD', `World ${worldId} has an invalid schema version.`);
      }
      return validatePortableSaveBundleV2({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle',
        world: raw.world,
        players: raw.players,
        containers: raw.containers,
        chunks: raw.chunks,
        footholds: raw.footholds,
        structures: raw.structures,
      }, this.options.compatibility);
    } catch (error) {
      return saveFailure('STORAGE_FAILURE', `Failed to load world ${worldId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async commit(request: SaveCommitRequestV2): Promise<SaveResult<WorldManifestV2>> {
    const validated = validateSaveCommitRequestV2(request, this.options.compatibility);
    if (validated.ok === false) return validated;
    const canonical = canonicalizePortableSaveBundleV2(bundleFromRequest(request));
    let database: IDBDatabase;
    try {
      database = await this.openDatabase();
    } catch (error) {
      return saveFailure('STORAGE_FAILURE', `Failed to open save database: ${error instanceof Error ? error.message : String(error)}`);
    }

    return new Promise((resolve) => {
      const transaction = database.transaction([...ALL_STORES], 'readwrite');
      let settled = false;
      const finish = (result: SaveResult<WorldManifestV2>) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      transaction.onabort = () => finish(saveFailure(
        'STORAGE_FAILURE',
        transaction.error?.message ?? 'Save transaction aborted.',
      ));
      transaction.onerror = () => undefined;
      transaction.oncomplete = () => finish(saveSuccess(canonical.world));

      const manifestRequest = transaction.objectStore(WORLD_STORE).get(canonical.world.worldId);
      manifestRequest.onerror = () => transaction.abort();
      manifestRequest.onsuccess = () => {
        const current = manifestRequest.result as { worldRevision?: unknown } | undefined;
        const currentRevision = current === undefined ? null : current.worldRevision;
        if (request.expectedPreviousWorldRevision === null) {
          if (current !== undefined) {
            transaction.abort();
            finish(saveFailure('STALE_WRITE', 'World already exists; expected no previous revision.'));
            return;
          }
        } else if (current === undefined || currentRevision !== request.expectedPreviousWorldRevision) {
          transaction.abort();
          finish(saveFailure(
            'STALE_WRITE',
            `Expected world revision ${request.expectedPreviousWorldRevision}, found ${String(currentRevision)}.`,
          ));
          return;
        }
        this.replaceChildrenThenWrite(transaction, canonical, () => {
          try {
            this.faults.beforeManifestWrite?.();
            transaction.objectStore(WORLD_STORE).put(canonical.world);
          } catch {
            transaction.abort();
          }
        });
      };
    });
  }

  public async exportWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV2>> {
    const loaded = await this.loadWorld(worldId);
    if (loaded.ok === false) return loaded;
    return saveSuccess(canonicalizePortableSaveBundleV2(loaded.value));
  }

  public async importWorld(input: unknown): Promise<SaveResult<WorldManifestV2>> {
    let bundle: SaveResult<PortableSaveBundleV2>;
    const version = schemaVersionOf(input);
    if (version === SAVE_SCHEMA_VERSION_V1) {
      bundle = migratePortableSaveBundleV1ToV2(
        input as PortableSaveBundleV1,
        this.options.migration,
      );
      if (bundle.ok) {
        bundle = validatePortableSaveBundleV2(
          bundle.value,
          this.options.compatibility,
        );
      }
    } else {
      bundle = validatePortableSaveBundleV2(input, this.options.compatibility);
    }
    if (bundle.ok === false) return bundle;
    const canonical = canonicalizePortableSaveBundleV2(bundle.value);
    let database: IDBDatabase;
    try {
      database = await this.openDatabase();
    } catch (error) {
      return saveFailure('STORAGE_FAILURE', `Failed to open save database: ${error instanceof Error ? error.message : String(error)}`);
    }

    return new Promise((resolve) => {
      const transaction = database.transaction([...ALL_STORES], 'readwrite');
      let settled = false;
      const finish = (result: SaveResult<WorldManifestV2>) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      transaction.onabort = () => finish(saveFailure(
        'STORAGE_FAILURE',
        transaction.error?.message ?? 'Import transaction aborted.',
      ));
      transaction.onerror = () => undefined;
      transaction.oncomplete = () => finish(saveSuccess(canonical.world));
      this.replaceChildrenThenWrite(transaction, canonical, () => {
        try {
          this.faults.beforeImportManifestWrite?.();
          transaction.objectStore(WORLD_STORE).put(canonical.world);
        } catch {
          transaction.abort();
        }
      });
    });
  }

  public close(): void {
    if (this.databasePromise !== null) {
      void this.databasePromise.then((database) => database.close());
      this.databasePromise = null;
    }
  }

  private replaceChildrenThenWrite(
    transaction: IDBTransaction,
    bundle: PortableSaveBundleV2,
    writeManifest: () => void,
  ): void {
    let remaining = CHILD_STORES.length;
    const done = () => {
      remaining -= 1;
      if (remaining !== 0) return;
      for (const player of bundle.players) {
        transaction.objectStore(PLAYER_STORE).put(player);
      }
      for (const container of bundle.containers) {
        transaction.objectStore(CONTAINER_STORE).put(container);
      }
      for (const chunk of bundle.chunks) {
        transaction.objectStore(CHUNK_STORE).put(chunk);
      }
      for (const foothold of bundle.footholds) {
        transaction.objectStore(FOOTHOLD_STORE).put(foothold);
      }
      for (const structure of bundle.structures) {
        transaction.objectStore(STRUCTURE_STORE).put(structure);
      }
      writeManifest();
    };
    for (const storeName of CHILD_STORES) {
      const store = transaction.objectStore(storeName);
      const keys = store.index(WORLD_ID_INDEX).getAllKeys(
        IDBKeyRange.only(bundle.world.worldId),
      );
      keys.onerror = () => transaction.abort();
      keys.onsuccess = () => {
        for (const key of keys.result) store.delete(key);
        done();
      };
    }
  }

  private async readRawWorld(worldId: string): Promise<{
    readonly world: unknown;
    readonly players: readonly unknown[];
    readonly containers: readonly unknown[];
    readonly chunks: readonly unknown[];
    readonly footholds: readonly unknown[];
    readonly structures: readonly unknown[];
  }> {
    const database = await this.openDatabase();
    const transaction = database.transaction([...ALL_STORES], 'readonly');
    const world = requestToPromise(
      transaction.objectStore(WORLD_STORE).get(worldId),
    );
    const children = CHILD_STORES.map((storeName) => requestToPromise(
      transaction.objectStore(storeName)
        .index(WORLD_ID_INDEX)
        .getAll(IDBKeyRange.only(worldId)),
    ));
    const [worldValue, childValues] = await Promise.all([
      world,
      Promise.all(children),
    ]);
    await transactionToPromise(transaction);
    return {
      world: worldValue,
      players: childValues[0] ?? [],
      containers: childValues[1] ?? [],
      chunks: childValues[2] ?? [],
      footholds: childValues[3] ?? [],
      structures: childValues[4] ?? [],
    };
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise !== null) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDbFactory.open(
        this.databaseName,
        PHASE1_INDEXED_DB_STORAGE_VERSION,
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
        const specs: readonly [string, string | string[]][] = [
          [PLAYER_STORE, ['worldId', 'playerId']],
          [CONTAINER_STORE, ['worldId', 'containerId']],
          [CHUNK_STORE, ['worldId', 'coord.x', 'coord.y']],
          [FOOTHOLD_STORE, ['worldId', 'footholdId']],
          [STRUCTURE_STORE, ['worldId', 'structureId']],
        ];
        for (const [storeName, keyPath] of specs) {
          const store = database.objectStoreNames.contains(storeName)
            ? transaction.objectStore(storeName)
            : database.createObjectStore(storeName, { keyPath });
          if (!store.indexNames.contains(WORLD_ID_INDEX)) {
            store.createIndex(WORLD_ID_INDEX, 'worldId');
          }
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
