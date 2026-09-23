import { StaticCollisionWorld } from './internal/StaticCollisionWorld';
import type { StaticSolidAabb } from './collision/Aabb';
import type { WorldCollisionQuery } from './api/WorldCollisionQuery';

export {
  WORLD_QUERY_BOUNDARY,
  type WorldQuery,
} from './api/WorldQuery';

export {
  WORLD_MUTATION_BOUNDARY,
  type WorldMutation,
} from './api/WorldMutation';

export type {
  DropPlacementReservation,
  ItemInteractionWorldPort,
  ResourceEntityId,
  ResourceNodeView,
  StructureInstanceId,
  WorkbenchView,
  WorldDropId,
  WorldDropView,
  WorldRevisionResult,
} from './api/ItemInteractionWorld';

export type {
  AxisSweepRequest,
  AxisSweepResult,
  CollisionAxis,
  WorldCollisionQuery,
} from './api/WorldCollisionQuery';

export {
  createStaticSolidAabb,
  validateAabbHalfExtents,
  type AabbHalfExtents,
  type StaticSolidAabb,
} from './collision/Aabb';

export {
  createPhase0MovementDemoWorld,
  PHASE0_MOVEMENT_DEMO_SOLIDS,
} from './fixtures/Phase0MovementDemoWorld';

export {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
  encodeChunkCoordForSeed,
  fromChunkKey,
  fromWorldPosition,
  sameChunkCoord,
  toChunkKey,
  toChunkLocalPosition,
  type ChunkCoord,
  type ChunkLocalPosition,
} from './chunks/ChunkCoord';

export {
  activateMaterializedChunk,
  beginChunkSave,
  canFinalizeChunkEviction,
  commitChunkSave,
  createUnloadedChunkMeta,
  failChunkSave,
  markPersistentChunkMutation,
  transitionChunkLifecycle,
  type ChunkLifecycleState,
  type ChunkPersistenceState,
  type ChunkRuntimeMeta,
  type ChunkSaveRevisionSnapshot,
} from './chunks/ChunkLifecycle';

export {
  CHUNK_GENERATION_NAMESPACE,
  PHASE0_WORLD_GENERATION_VERSION,
  Phase0ChunkGenerator,
  createPhase0ChunkGenerator,
  type ChunkGenerationRequest,
  type ChunkGenerator,
  type GeneratedChunkBase,
} from './chunks/ChunkGenerator';

export type {
  ChunkPersistencePort,
  ChunkPersistenceSnapshot,
  PersistedChunkRecord,
} from './chunks/ChunkPersistencePort';

export {
  ChunkStore,
  createChunkStore,
  type ChunkStoreConfig,
  type ReadonlyChunkView,
} from './chunks/ChunkStore';

export function createStaticCollisionWorld(
  solids: readonly StaticSolidAabb[],
): WorldCollisionQuery {
  return new StaticCollisionWorld(solids);
}
