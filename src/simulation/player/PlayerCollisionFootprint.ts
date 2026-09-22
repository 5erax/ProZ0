import type { AabbHalfExtents } from '../../world';

export interface PlayerCollisionFootprint extends AabbHalfExtents {
  readonly shape: 'aabb';
  readonly width: number;
  readonly depth: number;
}

export const PLAYER_COLLISION_FOOTPRINT: PlayerCollisionFootprint = Object.freeze({
  shape: 'aabb',
  width: 0.625,
  depth: 0.375,
  halfWidth: 0.3125,
  halfDepth: 0.1875,
});
