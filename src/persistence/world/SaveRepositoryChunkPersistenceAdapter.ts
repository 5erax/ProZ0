import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../foundation';
import {
  PHASE0_WORLD_GENERATION_VERSION,
  createChunkCoord,
  type ChunkPersistencePort,
  type ChunkPersistenceSnapshot,
  type PersistedChunkRecord,
} from '../../world';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import type { ChunkRecordV1 } from '../schema/v1/ChunkRecordV1';
import type { WorldManifestV1 } from '../schema/v1/WorldManifestV1';
import type {
  SaveFailureCode,
  SaveRepository,
} from '../repository/SaveRepository';

export interface SaveRepositoryChunkPersistenceAdapterOptions {
  readonly repository: SaveRepository;
  readonly worldId: string;
  readonly worldSeed: string;
  readonly generationVersion?: number;
  readonly rngAlgorithmVersion?: string;
  readonly seedDerivationVersion?: string;
  readonly nowUtc?: () => string;
}

export class ChunkPersistenceRepositoryError extends Error {
  public constructor(
    public readonly code: SaveFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ChunkPersistenceRepositoryError';
  }
}

export class SaveRepositoryChunkPersistenceAdapter
implements ChunkPersistencePort {
  private readonly repository: SaveRepository;
  private readonly worldId: string;
  private readonly worldSeed: string;
  private readonly generationVersion: number;
  private readonly rngAlgorithmVersion: string;
  private readonly seedDerivationVersion: string;
  private readonly nowUtc: () => string;

  public constructor(options: SaveRepositoryChunkPersistenceAdapterOptions) {
    this.repository = options.repository;
    this.worldId = options.worldId;
    this.worldSeed = options.worldSeed;
    this.generationVersion =
      options.generationVersion ?? PHASE0_WORLD_GENERATION_VERSION;
    this.rngAlgorithmVersion =
      options.rngAlgorithmVersion ?? RNG_ALGORITHM_VERSION;
    this.seedDerivationVersion =
      options.seedDerivationVersion ?? SEED_DERIVATION_VERSION;
    this.nowUtc = options.nowUtc ?? (() => new Date().toISOString());
  }

  public async load(
    coord: ReturnType<typeof createChunkCoord>,
  ): Promise<PersistedChunkRecord | null> {
    const manifest = await this.requireManifest();
    this.assertManifestIdentity(manifest);

    const loaded = await this.repository.loadChunk(this.worldId, coord);
    if (!loaded.ok) {
      throw new ChunkPersistenceRepositoryError(
        loaded.code,
        loaded.message,
      );
    }

    if (loaded.value === null) {
      return null;
    }

    return Object.freeze({
      coord: createChunkCoord(
        loaded.value.coord.x,
        loaded.value.coord.y,
      ),
      generationVersion: loaded.value.generationVersion,
      revision: loaded.value.chunkRevision,
      generated: true,
    });
  }

  public async save(snapshot: ChunkPersistenceSnapshot): Promise<void> {
    const coord = createChunkCoord(snapshot.coord.x, snapshot.coord.y);

    if (snapshot.generationVersion !== this.generationVersion) {
      throw new ChunkPersistenceRepositoryError(
        'UNSUPPORTED_GENERATION_VERSION',
        'Chunk snapshot generation version does not match adapter world identity.',
      );
    }

    const manifest = await this.requireManifest();
    this.assertManifestIdentity(manifest);

    if (manifest.worldRevision === Number.MAX_SAFE_INTEGER) {
      throw new ChunkPersistenceRepositoryError(
        'STALE_WRITE',
        'World revision cannot advance beyond Number.MAX_SAFE_INTEGER.',
      );
    }

    const existing = await this.repository.loadChunk(this.worldId, coord);
    if (!existing.ok) {
      throw new ChunkPersistenceRepositoryError(
        existing.code,
        existing.message,
      );
    }

    if (
      existing.value !== null
      && existing.value.chunkRevision >= snapshot.revision
    ) {
      throw new ChunkPersistenceRepositoryError(
        'STALE_WRITE',
        'Chunk snapshot revision is not newer than the durable chunk revision.',
      );
    }

    const chunk: ChunkRecordV1 = Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION,
      recordKind: 'chunk',
      worldId: this.worldId,
      coord,
      generationVersion: this.generationVersion,
      chunkRevision: snapshot.revision,
      generated: true,
    });

    const nextManifest: WorldManifestV1 = Object.freeze({
      ...manifest,
      worldRevision: manifest.worldRevision + 1,
      lastActiveAtUtc: this.nowUtc(),
    });

    const result = await this.repository.commit({
      world: nextManifest,
      players: Object.freeze([]),
      chunks: Object.freeze([chunk]),
      expectedPreviousWorldRevision: manifest.worldRevision,
    });

    if (!result.ok) {
      throw new ChunkPersistenceRepositoryError(
        result.code,
        result.message,
      );
    }
  }

  private async requireManifest(): Promise<WorldManifestV1> {
    const loaded = await this.repository.loadManifest(this.worldId);
    if (!loaded.ok) {
      throw new ChunkPersistenceRepositoryError(
        loaded.code,
        loaded.message,
      );
    }

    return loaded.value;
  }

  private assertManifestIdentity(manifest: WorldManifestV1): void {
    if (
      manifest.worldSeed !== this.worldSeed
      || manifest.generationVersion !== this.generationVersion
      || manifest.rngAlgorithmVersion !== this.rngAlgorithmVersion
      || manifest.seedDerivationVersion !== this.seedDerivationVersion
    ) {
      throw new ChunkPersistenceRepositoryError(
        'CORRUPT_RECORD',
        'World manifest deterministic compatibility identity does not match the active ChunkStore configuration.',
      );
    }
  }
}
