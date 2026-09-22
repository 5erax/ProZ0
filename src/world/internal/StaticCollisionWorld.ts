import type { WorldPosition } from '../../foundation';
import type {
  AxisSweepRequest,
  AxisSweepResult,
  WorldCollisionQuery,
} from '../api/WorldCollisionQuery';
import {
  validateAabbHalfExtents,
  type StaticSolidAabb,
} from '../collision/Aabb';

export const COLLISION_EPSILON_WU = 1 / 32768;

function intervalsOverlapInterior(
  aMin: number,
  aMax: number,
  bMin: number,
  bMax: number,
): boolean {
  return aMin < bMax && aMax > bMin;
}

function assertFinitePosition(position: WorldPosition): void {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error('Collision sweep center must be finite.');
  }
}

function chooseHit(
  currentDelta: number,
  candidateDelta: number,
  currentHitId: string | undefined,
  candidateHitId: string,
): { allowedDelta: number; hitSolidId: string } {
  const currentDistance = Math.abs(currentDelta);
  const candidateDistance = Math.abs(candidateDelta);

  if (candidateDistance < currentDistance) {
    return { allowedDelta: candidateDelta, hitSolidId: candidateHitId };
  }

  if (
    candidateDistance === currentDistance
    && (currentHitId === undefined || candidateHitId < currentHitId)
  ) {
    return { allowedDelta: currentDelta, hitSolidId: candidateHitId };
  }

  return {
    allowedDelta: currentDelta,
    hitSolidId: currentHitId ?? candidateHitId,
  };
}

export class StaticCollisionWorld implements WorldCollisionQuery {
  private readonly solids: readonly StaticSolidAabb[];

  public constructor(solids: readonly StaticSolidAabb[]) {
    this.solids = Object.freeze([...solids]);
  }

  public sweepAabbAxis(request: AxisSweepRequest): AxisSweepResult {
    assertFinitePosition(request.center);
    validateAabbHalfExtents(request.footprint);

    if (!Number.isFinite(request.desiredDelta)) {
      throw new Error('Collision desiredDelta must be finite.');
    }

    if (request.desiredDelta === 0) {
      return Object.freeze({ allowedDelta: 0, blocked: false });
    }

    return request.axis === 'x'
      ? this.sweepX(request)
      : this.sweepY(request);
  }

  private sweepX(request: AxisSweepRequest): AxisSweepResult {
    const { center, footprint, desiredDelta } = request;
    const minY = center.y - footprint.halfDepth;
    const maxY = center.y + footprint.halfDepth;
    const minX = center.x - footprint.halfWidth;
    const maxX = center.x + footprint.halfWidth;

    let allowedDelta = desiredDelta;
    let hitSolidId: string | undefined;

    for (const solid of this.solids) {
      if (!intervalsOverlapInterior(minY, maxY, solid.minY, solid.maxY)) {
        continue;
      }

      if (intervalsOverlapInterior(minX, maxX, solid.minX, solid.maxX)) {
        throw new Error(`Player footprint starts penetrating solid ${solid.id}.`);
      }

      if (desiredDelta > 0 && maxX <= solid.minX) {
        const candidate = solid.minX - maxX;

        if (candidate <= desiredDelta) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      } else if (desiredDelta < 0 && minX >= solid.maxX) {
        const candidate = solid.maxX - minX;

        if (candidate >= desiredDelta) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      }
    }

    return Object.freeze({
      allowedDelta,
      blocked: hitSolidId !== undefined,
      ...(hitSolidId === undefined ? {} : { hitSolidId }),
    });
  }

  private sweepY(request: AxisSweepRequest): AxisSweepResult {
    const { center, footprint, desiredDelta } = request;
    const minX = center.x - footprint.halfWidth;
    const maxX = center.x + footprint.halfWidth;
    const minY = center.y - footprint.halfDepth;
    const maxY = center.y + footprint.halfDepth;

    let allowedDelta = desiredDelta;
    let hitSolidId: string | undefined;

    for (const solid of this.solids) {
      if (!intervalsOverlapInterior(minX, maxX, solid.minX, solid.maxX)) {
        continue;
      }

      if (intervalsOverlapInterior(minY, maxY, solid.minY, solid.maxY)) {
        throw new Error(`Player footprint starts penetrating solid ${solid.id}.`);
      }

      if (desiredDelta > 0 && maxY <= solid.minY) {
        const candidate = solid.minY - maxY;

        if (candidate <= desiredDelta) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      } else if (desiredDelta < 0 && minY >= solid.maxY) {
        const candidate = solid.maxY - minY;

        if (candidate >= desiredDelta) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      }
    }

    return Object.freeze({
      allowedDelta,
      blocked: hitSolidId !== undefined,
      ...(hitSolidId === undefined ? {} : { hitSolidId }),
    });
  }
}
