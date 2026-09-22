import { createStaticSolidAabb, type StaticSolidAabb } from '../collision/Aabb';
import { StaticCollisionWorld } from '../internal/StaticCollisionWorld';

export const PHASE0_MOVEMENT_DEMO_SOLIDS: readonly StaticSolidAabb[] = Object.freeze([
  createStaticSolidAabb('east-wall', 3, -2, 3.5, 2),
  createStaticSolidAabb('south-wall', -2, 2.5, 2, 3),
  createStaticSolidAabb('west-pillar', -2.5, -1.25, -1.75, -0.5),
]);

export function createPhase0MovementDemoWorld(): StaticCollisionWorld {
  return new StaticCollisionWorld(PHASE0_MOVEMENT_DEMO_SOLIDS);
}
