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
  return aMin < bMax - COLLISION_EPSILON_WU
    && aMax > bMin + COLLISION_EPSILON_WU;
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

  if (candidateDistance < currentDistance - COLLISION_EPSILON_WU) {
    return { allowedDelta: candidateDelta, hitSolidId: candidateHitId };
  }

  if (
    Math.abs(candidateDistance - currentDistance) <= COLLISION_EPSILON_WU
    && (currentHitId === undefined || candidateHitId < currentHitId)
  ) {
    return { allowedDelta: candidateDelta, hitSolidId: candidateHitId };
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

      if (desiredDelta > 0 && maxX <= solid.minX + COLLISION_EPSILON_WU) {
        const candidate = Math.max(0, solid.minX - maxX);

        if (candidate <= desiredDelta + COLLISION_EPSILON_WU) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      } else if (
        desiredDelta < 0
        && minX >= solid.maxX - COLLISION_EPSILON_WU
      ) {
        const candidate = Math.min(0, solid.maxX - minX);

        if (candidate >= desiredDelta - COLLISION_EPSILON_WU) {
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
      blocked: Math.abs(allowedDelta - desiredDelta) > COLLISION_EPSILON_WU,
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

      if (desiredDelta > 0 && maxY <= solid.minY + COLLISION_EPSILON_WU) {
        const candidate = Math.max(0, solid.minY - maxY);

        if (candidate <= desiredDelta + COLLISION_EPSILON_WU) {
          const selected = chooseHit(
            allowedDelta,
            candidate,
            hitSolidId,
            solid.id,
          );
          allowedDelta = selected.allowedDelta;
          hitSolidId = selected.hitSolidId;
        }
      } else if (
        desiredDelta < 0
        && minY >= solid.maxY - COLLISION_EPSILON_WU
      ) {
        const candidate = Math.min(0, solid.maxY - minY);

        if (candidate >= desiredDelta - COLLISION_EPSILON_WU) {
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
      blocked: Math.abs(allowedDelta - desiredDelta) > COLLISION_EPSILON_WU,
      ...(hitSolidId === undefined ? {} : { hitSolidId }),
    });
  }
}
