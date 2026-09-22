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

export function createStaticCollisionWorld(
  solids: readonly StaticSolidAabb[],
): WorldCollisionQuery {
  return new StaticCollisionWorld(solids);
}
