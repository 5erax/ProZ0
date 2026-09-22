import type { WorldPosition } from '../../foundation';
import type { AabbHalfExtents } from '../collision/Aabb';

export type CollisionAxis = 'x' | 'y';

export interface AxisSweepRequest {
  readonly center: WorldPosition;
  readonly footprint: AabbHalfExtents;
  readonly axis: CollisionAxis;
  readonly desiredDelta: number;
}

export interface AxisSweepResult {
  readonly allowedDelta: number;
  readonly blocked: boolean;
  readonly hitSolidId?: string;
}

export interface WorldCollisionQuery {
  sweepAabbAxis(request: AxisSweepRequest): AxisSweepResult;
}
