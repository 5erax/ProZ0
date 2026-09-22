import type { ChunkCoord } from './ChunkCoord';

export type ChunkLifecycleState =
  | 'UNLOADED'
  | 'MATERIALIZING'
  | 'ACTIVE'
  | 'EVICTING'
  | 'FAILED';

export type ChunkPersistenceState =
  | 'CLEAN'
  | 'DIRTY'
  | 'SAVING';

export interface ChunkRuntimeMeta {
  readonly coord: ChunkCoord;
  readonly lifecycle: ChunkLifecycleState;
  readonly persistence: ChunkPersistenceState;
  readonly revision: number;
  readonly persistedRevision: number;
}

export interface ChunkSaveRevisionSnapshot {
  readonly coord: ChunkCoord;
  readonly revision: number;
}

const LIFECYCLE_TRANSITIONS: Readonly<
  Record<ChunkLifecycleState, readonly ChunkLifecycleState[]>
> = Object.freeze({
  UNLOADED: Object.freeze(['MATERIALIZING']),
  MATERIALIZING: Object.freeze(['ACTIVE', 'FAILED']),
  ACTIVE: Object.freeze(['EVICTING']),
  EVICTING: Object.freeze(['UNLOADED', 'ACTIVE']),
  FAILED: Object.freeze(['MATERIALIZING', 'UNLOADED']),
});

function requireRevision(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
}

function freezeMeta(meta: ChunkRuntimeMeta): ChunkRuntimeMeta {
  requireRevision(meta.revision, 'Chunk revision');
  requireRevision(meta.persistedRevision, 'Persisted chunk revision');

  if (meta.persistedRevision > meta.revision) {
    throw new RangeError('Persisted revision cannot exceed live revision.');
  }

  return Object.freeze(meta);
}

export function createUnloadedChunkMeta(coord: ChunkCoord): ChunkRuntimeMeta {
  return freezeMeta({
    coord,
    lifecycle: 'UNLOADED',
    persistence: 'CLEAN',
    revision: 0,
    persistedRevision: 0,
  });
}

export function transitionChunkLifecycle(
  meta: ChunkRuntimeMeta,
  next: ChunkLifecycleState,
): ChunkRuntimeMeta {
  if (!LIFECYCLE_TRANSITIONS[meta.lifecycle].includes(next)) {
    throw new Error(
      `Invalid chunk lifecycle transition ${meta.lifecycle} -> ${next}.`,
    );
  }

  return freezeMeta({ ...meta, lifecycle: next });
}

export function activateMaterializedChunk(
  meta: ChunkRuntimeMeta,
  persistedRevision: number,
): ChunkRuntimeMeta {
  if (meta.lifecycle !== 'MATERIALIZING') {
    throw new Error('Only a MATERIALIZING chunk can become ACTIVE.');
  }

  requireRevision(persistedRevision, 'Persisted chunk revision');

  return freezeMeta({
    ...meta,
    lifecycle: 'ACTIVE',
    persistence: 'CLEAN',
    revision: persistedRevision,
    persistedRevision,
  });
}

export function markPersistentChunkMutation(
  meta: ChunkRuntimeMeta,
): ChunkRuntimeMeta {
  if (meta.lifecycle !== 'ACTIVE') {
    throw new Error('Persistent mutation requires an ACTIVE chunk.');
  }

  if (meta.revision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Chunk revision exhausted Number.MAX_SAFE_INTEGER.');
  }

  return freezeMeta({
    ...meta,
    revision: meta.revision + 1,
    persistence: meta.persistence === 'SAVING' ? 'SAVING' : 'DIRTY',
  });
}

export function beginChunkSave(meta: ChunkRuntimeMeta): {
  readonly meta: ChunkRuntimeMeta;
  readonly snapshot: ChunkSaveRevisionSnapshot;
} {
  if (meta.lifecycle !== 'ACTIVE' && meta.lifecycle !== 'EVICTING') {
    throw new Error('Chunk save requires ACTIVE or EVICTING lifecycle.');
  }

  if (meta.persistence !== 'DIRTY') {
    throw new Error('Chunk save requires DIRTY persistence state.');
  }

  return Object.freeze({
    meta: freezeMeta({ ...meta, persistence: 'SAVING' }),
    snapshot: Object.freeze({ coord: meta.coord, revision: meta.revision }),
  });
}

export function commitChunkSave(
  meta: ChunkRuntimeMeta,
  savedRevision: number,
): ChunkRuntimeMeta {
  if (meta.persistence !== 'SAVING') {
    throw new Error('Save completion requires SAVING persistence state.');
  }

  requireRevision(savedRevision, 'Saved chunk revision');

  if (savedRevision <= meta.persistedRevision || savedRevision > meta.revision) {
    throw new RangeError('Saved revision is stale, duplicate, or ahead of live state.');
  }

  return freezeMeta({
    ...meta,
    persistedRevision: savedRevision,
    persistence: savedRevision === meta.revision ? 'CLEAN' : 'DIRTY',
  });
}

export function failChunkSave(meta: ChunkRuntimeMeta): ChunkRuntimeMeta {
  if (meta.persistence !== 'SAVING') {
    throw new Error('Save failure requires SAVING persistence state.');
  }

  return freezeMeta({ ...meta, persistence: 'DIRTY' });
}

export function canFinalizeChunkEviction(meta: ChunkRuntimeMeta): boolean {
  return (
    meta.lifecycle === 'EVICTING'
    && meta.persistence === 'CLEAN'
    && meta.revision === meta.persistedRevision
  );
}
