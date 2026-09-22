import type { ChunkCoord } from './ChunkCoord';

export interface PersistedChunkRecord {
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
  readonly revision: number;
  readonly generated: true;
}

export interface ChunkPersistenceSnapshot {
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
  readonly revision: number;
  readonly generated: true;
}

export interface ChunkPersistencePort {
  load(coord: ChunkCoord): Promise<PersistedChunkRecord | null>;
  save(snapshot: ChunkPersistenceSnapshot): Promise<void>;
}
