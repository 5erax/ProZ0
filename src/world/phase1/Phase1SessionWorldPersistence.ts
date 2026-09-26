import type { ChunkCoord } from '../chunks/ChunkCoord';
import { createChunkCoord, toChunkKey } from '../chunks/ChunkCoord';
import type {
  PersistedPhase1WorldSliceChunkRecord,
  Phase1WorldPersistencePort,
  Phase1WorldSliceChunkSnapshot,
} from './Phase1WorldPersistencePort';
import type { Phase1EnvironmentState } from './Phase1WorldTypes';

function copyChunk(
  record: PersistedPhase1WorldSliceChunkRecord,
): PersistedPhase1WorldSliceChunkRecord {
  return Object.freeze({
    coord: createChunkCoord(record.coord.x, record.coord.y),
    generationVersion: record.generationVersion,
    revision: record.revision,
    generated: true,
    baseGenerationFingerprint: record.baseGenerationFingerprint,
    contentCompatibility: Object.freeze({ ...record.contentCompatibility }),
    resourceStates: Object.freeze(
      record.resourceStates.map((entry) => Object.freeze({ ...entry })),
    ),
    ruinStates: Object.freeze(
      record.ruinStates.map((entry) => Object.freeze({ ...entry })),
    ),
    exploration: Object.freeze({
      regionId: record.exploration.regionId,
      revision: record.exploration.revision,
      words: Object.freeze([...record.exploration.words]),
    }),
  });
}

function copyEnvironment(
  state: Phase1EnvironmentState,
): Phase1EnvironmentState {
  return Object.freeze({
    activeTick: state.activeTick,
    cycleStartLocalMinute: state.cycleStartLocalMinute,
    weatherEvents: Object.freeze(
      state.weatherEvents.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}

export interface Phase1SessionWorldPersistenceSeed {
  readonly environment?: Phase1EnvironmentState | null;
  readonly chunks?: readonly PersistedPhase1WorldSliceChunkRecord[];
}

/**
 * Session-local persistence bridge for Phase1WorldStore.
 *
 * The world store remains canonical while active. This bridge only retains the
 * validated world-delta snapshots that are later mapped into Save V2 by the
 * active authority composition. Reopen state may seed the bridge before the
 * world store is published.
 */
export class Phase1SessionWorldPersistence
  implements Phase1WorldPersistencePort {
  private environment: Phase1EnvironmentState | null;
  private readonly chunks =
    new Map<string, PersistedPhase1WorldSliceChunkRecord>();

  public constructor(seed: Phase1SessionWorldPersistenceSeed = {}) {
    this.environment = seed.environment === undefined
      || seed.environment === null
      ? null
      : copyEnvironment(seed.environment);

    for (const chunk of seed.chunks ?? []) {
      const key = toChunkKey(chunk.coord);
      if (this.chunks.has(key)) {
        throw new Error('Duplicate Phase 1 session chunk persistence seed.');
      }
      this.chunks.set(key, copyChunk(chunk));
    }
  }

  public async loadChunk(
    coord: ChunkCoord,
  ): Promise<PersistedPhase1WorldSliceChunkRecord | null> {
    const value = this.chunks.get(
      toChunkKey(createChunkCoord(coord.x, coord.y)),
    );
    return value === undefined ? null : copyChunk(value);
  }

  public async saveChunk(
    snapshot: Phase1WorldSliceChunkSnapshot,
  ): Promise<void> {
    this.chunks.set(toChunkKey(snapshot.coord), copyChunk(snapshot));
  }

  public async loadEnvironment(): Promise<Phase1EnvironmentState | null> {
    return this.environment === null
      ? null
      : copyEnvironment(this.environment);
  }

  public async saveEnvironment(
    state: Phase1EnvironmentState,
  ): Promise<void> {
    this.environment = copyEnvironment(state);
  }

  public exportEnvironment(): Phase1EnvironmentState | null {
    return this.environment === null
      ? null
      : copyEnvironment(this.environment);
  }

  public exportChunks(): readonly PersistedPhase1WorldSliceChunkRecord[] {
    return Object.freeze(
      [...this.chunks.values()]
        .sort((left, right) =>
          left.coord.y - right.coord.y || left.coord.x - right.coord.x,
        )
        .map(copyChunk),
    );
  }
}
