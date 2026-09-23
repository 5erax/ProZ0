import type { ContentCompatibilityIdentityV1 } from '../../content';
import type { ChunkCoord } from '../chunks/ChunkCoord';
import type {
  Phase1EnvironmentState,
  Phase1ExplorationFragment,
  Phase1ResourceRuntimeState,
  Phase1RuinRuntimeState,
} from './Phase1WorldTypes';

export interface PersistedPhase1WorldSliceChunkRecord {
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
  readonly revision: number;
  readonly generated: true;
  readonly baseGenerationFingerprint: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly resourceStates: readonly Phase1ResourceRuntimeState[];
  readonly ruinStates: readonly Phase1RuinRuntimeState[];
  readonly exploration: Phase1ExplorationFragment;
}

export type Phase1WorldSliceChunkSnapshot =
  PersistedPhase1WorldSliceChunkRecord;

export interface Phase1WorldPersistencePort {
  loadChunk(
    coord: ChunkCoord,
  ): Promise<PersistedPhase1WorldSliceChunkRecord | null>;

  saveChunk(
    snapshot: Phase1WorldSliceChunkSnapshot,
  ): Promise<void>;

  loadEnvironment(): Promise<Phase1EnvironmentState | null>;

  saveEnvironment(
    state: Phase1EnvironmentState,
  ): Promise<void>;
}
