import type { ChunkCoord } from '../../src/world/chunks/ChunkCoord';
import type {
  Phase1EnvironmentState,
} from '../../src/world/phase1/Phase1WorldTypes';
import type {
  PersistedPhase1WorldSliceChunkRecord,
  Phase1WorldPersistencePort,
  Phase1WorldSliceChunkSnapshot,
} from '../../src/world/phase1/Phase1WorldPersistencePort';

function key(coord: ChunkCoord): string {
  return `${coord.x}:${coord.y}`;
}

export class MemoryPhase1WorldPersistence
implements Phase1WorldPersistencePort {
  public readonly chunks =
    new Map<string, PersistedPhase1WorldSliceChunkRecord>();
  public environment: Phase1EnvironmentState | null = null;
  public failChunkSave = false;
  public failEnvironmentSave = false;

  public async loadChunk(
    coord: ChunkCoord,
  ): Promise<PersistedPhase1WorldSliceChunkRecord | null> {
    return this.chunks.get(key(coord)) ?? null;
  }

  public async saveChunk(
    snapshot: Phase1WorldSliceChunkSnapshot,
  ): Promise<void> {
    if (this.failChunkSave) {
      throw new Error('injected Phase 1 chunk save failure');
    }
    this.chunks.set(key(snapshot.coord), snapshot);
  }

  public async loadEnvironment(): Promise<Phase1EnvironmentState | null> {
    return this.environment;
  }

  public async saveEnvironment(
    state: Phase1EnvironmentState,
  ): Promise<void> {
    if (this.failEnvironmentSave) {
      throw new Error('injected Phase 1 environment save failure');
    }
    this.environment = state;
  }

  public putChunk(
    record: PersistedPhase1WorldSliceChunkRecord,
  ): void {
    this.chunks.set(key(record.coord), record);
  }
}


export class DeferredPhase1WorldPersistence
extends MemoryPhase1WorldPersistence {
  public deferChunkSave = false;
  private pending: {
    readonly snapshot: Phase1WorldSliceChunkSnapshot;
    readonly resolve: () => void;
    readonly reject: (error: Error) => void;
  } | null = null;

  public override saveChunk(
    snapshot: Phase1WorldSliceChunkSnapshot,
  ): Promise<void> {
    if (!this.deferChunkSave) {
      return super.saveChunk(snapshot);
    }

    if (this.pending !== null) {
      return Promise.reject(
        new Error('Only one deferred Phase 1 chunk save is supported by this fixture.'),
      );
    }

    return new Promise<void>((resolve, reject) => {
      this.pending = {
        snapshot,
        resolve,
        reject,
      };
    });
  }

  public get pendingChunkSnapshot():
    Phase1WorldSliceChunkSnapshot | null {
    return this.pending?.snapshot ?? null;
  }

  public resolvePendingChunkSave(): void {
    const pending = this.pending;
    if (pending === null) {
      throw new Error('No deferred Phase 1 chunk save is pending.');
    }

    this.putChunk(pending.snapshot);
    this.pending = null;
    pending.resolve();
  }

  public rejectPendingChunkSave(
    error: Error = new Error('injected deferred Phase 1 save failure'),
  ): void {
    const pending = this.pending;
    if (pending === null) {
      throw new Error('No deferred Phase 1 chunk save is pending.');
    }

    this.pending = null;
    pending.reject(error);
  }
}
