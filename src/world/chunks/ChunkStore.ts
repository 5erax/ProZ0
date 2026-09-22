import {
  activateMaterializedChunk,
  beginChunkSave,
  canFinalizeChunkEviction,
  commitChunkSave,
  createUnloadedChunkMeta,
  failChunkSave,
  markPersistentChunkMutation,
  transitionChunkLifecycle,
  type ChunkRuntimeMeta,
} from './ChunkLifecycle';
import {
  createChunkCoord,
  sameChunkCoord,
  toChunkKey,
  type ChunkCoord,
} from './ChunkCoord';
import type {
  ChunkGenerator,
  GeneratedChunkBase,
} from './ChunkGenerator';
import type {
  ChunkPersistencePort,
  ChunkPersistenceSnapshot,
  PersistedChunkRecord,
} from './ChunkPersistencePort';

export interface ChunkStoreConfig {
  readonly worldSeed: string;
  readonly generationVersion: number;
  readonly generator: ChunkGenerator;
  readonly persistence: ChunkPersistencePort;
}

export interface ReadonlyChunkView {
  readonly meta: ChunkRuntimeMeta;
  readonly base: GeneratedChunkBase;
}

interface ChunkEntry {
  meta: ChunkRuntimeMeta;
  interestCount: number;
  base: GeneratedChunkBase | null;
  materialization: Promise<void> | null;
  save: Promise<void> | null;
  failureReason: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requirePersistedRecord(
  record: PersistedChunkRecord,
  coord: ChunkCoord,
  generationVersion: number,
): void {
  if (!sameChunkCoord(record.coord, coord)) {
    throw new Error('Persisted chunk coordinate does not match requested coordinate.');
  }

  if (record.generationVersion !== generationVersion) {
    throw new Error(
      `Persisted generation version ${record.generationVersion} does not match world generation version ${generationVersion}.`,
    );
  }

  if (!Number.isSafeInteger(record.revision) || record.revision < 0) {
    throw new Error('Persisted chunk revision must be a non-negative safe integer.');
  }

  if (record.generated !== true) {
    throw new Error('Persisted chunk record is missing the generated marker.');
  }
}

export class ChunkStore {
  private readonly entries = new Map<string, ChunkEntry>();

  public constructor(private readonly config: ChunkStoreConfig) {
    if (config.worldSeed.length === 0) {
      throw new RangeError('ChunkStore worldSeed must not be empty.');
    }
  }

  public async requestActive(coord: ChunkCoord): Promise<ReadonlyChunkView> {
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle === 'FAILED') {
      throw new Error('Chunk materialization previously failed; explicit retry is required.');
    }

    entry.interestCount += 1;

    if (entry.meta.lifecycle === 'ACTIVE') {
      return this.requireView(entry);
    }

    if (entry.meta.lifecycle === 'EVICTING') {
      entry.meta = transitionChunkLifecycle(entry.meta, 'ACTIVE');
      return this.requireView(entry);
    }

    if (entry.meta.lifecycle === 'MATERIALIZING') {
      await this.requireMaterialization(entry);
      return this.requireView(entry);
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'MATERIALIZING');
    entry.materialization = this.materialize(entry);

    try {
      await entry.materialization;
      return this.requireView(entry);
    } catch (error) {
      entry.interestCount = 0;
      throw error;
    }
  }

  public async retryMaterialization(coord: ChunkCoord): Promise<ReadonlyChunkView> {
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle !== 'FAILED') {
      throw new Error('Explicit materialization retry requires FAILED lifecycle.');
    }

    entry.interestCount = 1;
    entry.failureReason = null;
    entry.meta = transitionChunkLifecycle(entry.meta, 'MATERIALIZING');
    entry.materialization = this.materialize(entry);

    try {
      await entry.materialization;
      return this.requireView(entry);
    } catch (error) {
      entry.interestCount = 0;
      throw error;
    }
  }

  public discardFailed(coord: ChunkCoord): void {
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle !== 'FAILED') {
      throw new Error('Only a FAILED chunk can be explicitly discarded.');
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'UNLOADED');
    entry.base = null;
    entry.failureReason = null;
    entry.interestCount = 0;
  }

  public markPersistentMutation(coord: ChunkCoord): ChunkRuntimeMeta {
    const entry = this.requireEntry(coord);
    entry.meta = markPersistentChunkMutation(entry.meta);
    return entry.meta;
  }

  public async releaseInterest(coord: ChunkCoord): Promise<void> {
    const entry = this.requireEntry(coord);

    if (entry.interestCount <= 0) {
      throw new Error('Cannot release chunk interest below zero.');
    }

    entry.interestCount -= 1;

    if (entry.interestCount > 0) {
      return;
    }

    if (entry.meta.lifecycle !== 'ACTIVE') {
      throw new Error('Last interest can only be released from an ACTIVE chunk.');
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'EVICTING');
    await this.finishEviction(entry);
  }

  public async retryEviction(coord: ChunkCoord): Promise<void> {
    const entry = this.requireEntry(coord);

    if (entry.meta.lifecycle !== 'ACTIVE' || entry.interestCount !== 0) {
      throw new Error('Eviction retry requires ACTIVE lifecycle with zero interests.');
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'EVICTING');
    await this.finishEviction(entry);
  }

  public query(coord: ChunkCoord): ReadonlyChunkView | undefined {
    const entry = this.entries.get(toChunkKey(createChunkCoord(coord.x, coord.y)));

    if (entry === undefined || entry.meta.lifecycle !== 'ACTIVE') {
      return undefined;
    }

    return this.requireView(entry);
  }

  public getMeta(coord: ChunkCoord): ChunkRuntimeMeta | undefined {
    return this.entries.get(toChunkKey(createChunkCoord(coord.x, coord.y)))?.meta;
  }

  public getFailureReason(coord: ChunkCoord): string | null {
    return this.entries.get(toChunkKey(createChunkCoord(coord.x, coord.y)))
      ?.failureReason ?? null;
  }

  private getOrCreateEntry(coord: ChunkCoord): ChunkEntry {
    const canonical = createChunkCoord(coord.x, coord.y);
    const key = toChunkKey(canonical);
    const existing = this.entries.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const entry: ChunkEntry = {
      meta: createUnloadedChunkMeta(canonical),
      interestCount: 0,
      base: null,
      materialization: null,
      save: null,
      failureReason: null,
    };
    this.entries.set(key, entry);
    return entry;
  }

  private requireEntry(coord: ChunkCoord): ChunkEntry {
    const entry = this.entries.get(toChunkKey(createChunkCoord(coord.x, coord.y)));

    if (entry === undefined) {
      throw new Error('Chunk is not known to the ChunkStore.');
    }

    return entry;
  }

  private async requireMaterialization(entry: ChunkEntry): Promise<void> {
    if (entry.materialization === null) {
      throw new Error('MATERIALIZING chunk is missing its materialization promise.');
    }

    await entry.materialization;
  }

  private async materialize(entry: ChunkEntry): Promise<void> {
    try {
      const record = await this.config.persistence.load(entry.meta.coord);

      if (record !== null) {
        requirePersistedRecord(
          record,
          entry.meta.coord,
          this.config.generationVersion,
        );
      }

      const base = this.config.generator.generate({
        worldSeed: this.config.worldSeed,
        coord: entry.meta.coord,
        generationVersion: this.config.generationVersion,
      });

      entry.base = base;
      entry.meta = activateMaterializedChunk(
        entry.meta,
        record?.revision ?? 0,
      );
      entry.failureReason = null;
    } catch (error) {
      entry.base = null;
      entry.failureReason = errorMessage(error);
      entry.meta = transitionChunkLifecycle(entry.meta, 'FAILED');
      throw error;
    } finally {
      entry.materialization = null;
    }
  }

  private async finishEviction(entry: ChunkEntry): Promise<void> {
    if (entry.meta.persistence === 'DIRTY') {
      const saveStart = beginChunkSave(entry.meta);
      entry.meta = saveStart.meta;
      const snapshot: ChunkPersistenceSnapshot = Object.freeze({
        coord: entry.meta.coord,
        generationVersion: this.config.generationVersion,
        revision: saveStart.snapshot.revision,
        generated: true,
      });

      entry.save = this.persist(entry, snapshot);
    }

    if (entry.meta.persistence === 'SAVING') {
      if (entry.save === null) {
        throw new Error('SAVING chunk is missing its save promise.');
      }

      await entry.save;
    }

    if (
      entry.interestCount === 0
      && entry.meta.lifecycle === 'EVICTING'
      && canFinalizeChunkEviction(entry.meta)
    ) {
      entry.meta = transitionChunkLifecycle(entry.meta, 'UNLOADED');
      entry.base = null;
      entry.failureReason = null;
    }
  }

  private async persist(
    entry: ChunkEntry,
    snapshot: ChunkPersistenceSnapshot,
  ): Promise<void> {
    try {
      await this.config.persistence.save(snapshot);
      entry.meta = commitChunkSave(entry.meta, snapshot.revision);
    } catch (error) {
      entry.meta = failChunkSave(entry.meta);
      entry.failureReason = errorMessage(error);

      if (entry.meta.lifecycle === 'EVICTING') {
        entry.meta = transitionChunkLifecycle(entry.meta, 'ACTIVE');
      }

      throw error;
    } finally {
      entry.save = null;
    }
  }

  private requireView(entry: ChunkEntry): ReadonlyChunkView {
    if (entry.meta.lifecycle !== 'ACTIVE' || entry.base === null) {
      throw new Error('Chunk is not ACTIVE and queryable.');
    }

    return Object.freeze({ meta: entry.meta, base: entry.base });
  }
}

export function createChunkStore(config: ChunkStoreConfig): ChunkStore {
  return new ChunkStore(config);
}
