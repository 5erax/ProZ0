import { describe, expect, it } from 'vitest';
import {
  createChunkCoord,
  createChunkStore,
  createPhase0ChunkGenerator,
  PHASE0_WORLD_GENERATION_VERSION,
  type ChunkPersistencePort,
  type ChunkPersistenceSnapshot,
  type PersistedChunkRecord,
} from '../../src/world';

class TestChunkPersistence implements ChunkPersistencePort {
  public loadFailure: Error | null = null;
  public saveFailure: Error | null = null;
  public pendingSave:
    | {
        readonly snapshot: ChunkPersistenceSnapshot;
        readonly resolve: () => void;
        readonly reject: (error: Error) => void;
      }
    | null = null;

  public async load(): Promise<PersistedChunkRecord | null> {
    if (this.loadFailure !== null) {
      throw this.loadFailure;
    }

    return null;
  }

  public save(snapshot: ChunkPersistenceSnapshot): Promise<void> {
    if (this.saveFailure !== null) {
      return Promise.reject(this.saveFailure);
    }

    return new Promise<void>((resolve, reject) => {
      this.pendingSave = {
        snapshot,
        resolve: () => {
          this.pendingSave = null;
          resolve();
        },
        reject,
      };
    });
  }
}

function createStore(persistence: ChunkPersistencePort) {
  return createChunkStore({
    worldSeed: 'phase0-lifecycle-world',
    generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    generator: createPhase0ChunkGenerator(),
    persistence,
  });
}

describe('ChunkStore lifecycle foundation', () => {
  it('never exposes partially materialized state after a load failure', async () => {
    const persistence = new TestChunkPersistence();
    const store = createStore(persistence);
    const coord = createChunkCoord(2, -5);

    persistence.loadFailure = new Error('injected load failure');

    await expect(store.requestActive(coord)).rejects.toThrow(
      /injected load failure/,
    );
    expect(store.query(coord)).toBeUndefined();
    expect(store.getMeta(coord)?.lifecycle).toBe('FAILED');
    expect(store.getFailureReason(coord)).toMatch(/injected load failure/);

    persistence.loadFailure = null;
    await expect(store.retryMaterialization(coord)).resolves.toBeDefined();
    expect(store.getMeta(coord)?.lifecycle).toBe('ACTIVE');
  });

  it('keeps a newer mutation DIRTY when an older save completes', async () => {
    const persistence = new TestChunkPersistence();
    const store = createStore(persistence);
    const coord = createChunkCoord(-3, 9);

    await store.requestActive(coord);
    expect(store.markPersistentMutation(coord).revision).toBe(1);

    const release = store.releaseInterest(coord);

    expect(persistence.pendingSave?.snapshot.revision).toBe(1);
    await store.requestActive(coord);
    expect(store.markPersistentMutation(coord).revision).toBe(2);

    persistence.pendingSave?.resolve();
    await release;

    expect(store.getMeta(coord)).toMatchObject({
      lifecycle: 'ACTIVE',
      persistence: 'DIRTY',
      revision: 2,
      persistedRevision: 1,
    });
  });

  it('cancels dirty eviction on save failure without losing the dirty revision', async () => {
    const persistence = new TestChunkPersistence();
    const store = createStore(persistence);
    const coord = createChunkCoord(4, 4);

    await store.requestActive(coord);
    store.markPersistentMutation(coord);
    persistence.saveFailure = new Error('injected save failure');

    await expect(store.releaseInterest(coord)).rejects.toThrow(
      /injected save failure/,
    );

    expect(store.getMeta(coord)).toMatchObject({
      lifecycle: 'ACTIVE',
      persistence: 'DIRTY',
      revision: 1,
      persistedRevision: 0,
    });
    expect(store.getFailureReason(coord)).toMatch(/injected save failure/);
  });

  it('unloads a clean chunk after the final authoritative interest is released', async () => {
    const persistence = new TestChunkPersistence();
    const store = createStore(persistence);
    const coord = createChunkCoord(0, 0);

    await store.requestActive(coord);
    await store.releaseInterest(coord);

    expect(store.query(coord)).toBeUndefined();
    expect(store.getMeta(coord)?.lifecycle).toBe('UNLOADED');
  });
});
