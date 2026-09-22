import { describe, expect, it } from 'vitest';
import {
  SaveRepositoryChunkPersistenceAdapter,
  saveFailure,
  saveSuccess,
  type ChunkRecordV1,
  type PlayerRecordV1,
  type PortableSaveBundleV1,
  type SaveCommitRequestV1,
  type SaveRepository,
  type SaveResult,
  type WorldManifestV1,
} from '../../src/persistence';
import {
  createChunkCoord,
  createChunkStore,
  createPhase0ChunkGenerator,
  PHASE0_WORLD_GENERATION_VERSION,
} from '../../src/world';
import {
  makeWorldManifest,
} from '../helpers/persistenceFixtures';

class MemorySaveRepository implements SaveRepository {
  public manifest: WorldManifestV1 | null = makeWorldManifest();
  public readonly chunks = new Map<string, ChunkRecordV1>();

  public async loadManifest(
    worldId: string,
  ): Promise<SaveResult<WorldManifestV1>> {
    if (this.manifest === null || this.manifest.worldId !== worldId) {
      return saveFailure('NOT_FOUND', 'world not found');
    }
    return saveSuccess(this.manifest);
  }

  public async loadPlayer(
    worldId: string,
    playerId: string,
  ): Promise<SaveResult<PlayerRecordV1>> {
    void worldId;
    void playerId;
    return saveFailure('NOT_FOUND', 'player not found');
  }

  public async loadChunk(
    worldId: string,
    coord: { readonly x: number; readonly y: number },
  ): Promise<SaveResult<ChunkRecordV1 | null>> {
    return saveSuccess(
      this.chunks.get(`${worldId}:${coord.x}:${coord.y}`) ?? null,
    );
  }

  public async loadWorld(
    worldId: string,
  ): Promise<SaveResult<PortableSaveBundleV1>> {
    void worldId;
    return saveFailure('NOT_FOUND', 'not used by this integration fixture');
  }

  public async commit(
    request: SaveCommitRequestV1,
  ): Promise<SaveResult<{ readonly worldRevision: number }>> {
    if (this.manifest === null) {
      return saveFailure('NOT_FOUND', 'world not found');
    }

    if (
      request.expectedPreviousWorldRevision
      !== this.manifest.worldRevision
    ) {
      return saveFailure('STALE_WRITE', 'stale');
    }

    this.manifest = request.world;
    for (const chunk of request.chunks) {
      this.chunks.set(
        `${chunk.worldId}:${chunk.coord.x}:${chunk.coord.y}`,
        chunk,
      );
    }

    return saveSuccess({ worldRevision: request.world.worldRevision });
  }

  public async exportWorld(
    worldId: string,
  ): Promise<SaveResult<PortableSaveBundleV1>> {
    void worldId;
    return saveFailure('NOT_FOUND', 'not used by this integration fixture');
  }

  public async importWorld(
    bundle: unknown,
  ): Promise<SaveResult<{ readonly worldId: string }>> {
    void bundle;
    return saveFailure('STORAGE_FAILURE', 'not used by this integration fixture');
  }
}

describe('ChunkStore -> SaveRepository persistence integration', () => {
  it('round-trips a generated chunk revision through the storage-neutral adapter', async () => {
    const repository = new MemorySaveRepository();
    const adapter = new SaveRepositoryChunkPersistenceAdapter({
      repository,
      worldId: 'world-alpha',
      worldSeed: 'phase0-persistence-seed',
      nowUtc: () => '2026-09-22T00:05:00.000Z',
    });
    const coord = createChunkCoord(-7, 11);

    const firstStore = createChunkStore({
      worldSeed: 'phase0-persistence-seed',
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
      generator: createPhase0ChunkGenerator(),
      persistence: adapter,
    });

    await firstStore.requestActive(coord);
    expect(firstStore.markPersistentMutation(coord).revision).toBe(1);
    await firstStore.releaseInterest(coord);

    expect(repository.manifest?.worldRevision).toBe(1);
    expect(repository.chunks.get('world-alpha:-7:11')).toMatchObject({
      chunkRevision: 1,
      generated: true,
    });

    const secondStore = createChunkStore({
      worldSeed: 'phase0-persistence-seed',
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
      generator: createPhase0ChunkGenerator(),
      persistence: adapter,
    });

    const reloaded = await secondStore.requestActive(coord);
    expect(reloaded.meta).toMatchObject({
      lifecycle: 'ACTIVE',
      persistence: 'CLEAN',
      revision: 1,
      persistedRevision: 1,
    });
  });
});
