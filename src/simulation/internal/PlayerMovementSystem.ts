import {
  createWorldPosition,
  createWorldVector,
  type WorldPosition,
  type WorldVector,
} from '../../foundation';
import type { WorldCollisionQuery } from '../../world';
import type { PlayerInput } from '../api/PlayerInput';
import type {
  FacingDirection,
  LocomotionState,
  PlayerMovementSnapshot,
} from '../api/SimulationSnapshot';
import { PLAYER_COLLISION_FOOTPRINT } from '../player/PlayerCollisionFootprint';
import {
  INV_SQRT_2,
  PLAYER_MOVEMENT_CONFIG,
} from '../player/PlayerMovementConfig';

function axisValue(negative: boolean, positive: boolean): -1 | 0 | 1 {
  if (negative === positive) {
    return 0;
  }

  return negative ? -1 : 1;
}

function facingForAxes(x: -1 | 0 | 1, y: -1 | 0 | 1): FacingDirection {
  if (x === 0 && y < 0) return 'N';
  if (x > 0 && y < 0) return 'NE';
  if (x > 0 && y === 0) return 'E';
  if (x > 0 && y > 0) return 'SE';
  if (x === 0 && y > 0) return 'S';
  if (x < 0 && y > 0) return 'SW';
  if (x < 0 && y === 0) return 'W';
  if (x < 0 && y < 0) return 'NW';

  throw new Error('Cannot derive facing from zero movement axes.');
}

function validateResolvedDelta(desired: number, allowed: number, axis: string): void {
  if (!Number.isFinite(allowed)) {
    throw new Error(`World collision query returned non-finite ${axis} displacement.`);
  }

  if (
    Math.abs(allowed) > Math.abs(desired) + Number.EPSILON
    || (desired > 0 && allowed < -Number.EPSILON)
    || (desired < 0 && allowed > Number.EPSILON)
  ) {
    throw new Error(`World collision query returned invalid ${axis} displacement.`);
  }
}

export class PlayerMovementSystem {
  private position: WorldPosition;
  private facing: FacingDirection | null = null;
  private locomotionState: LocomotionState = 'IDLE';
  private intendedDirection: WorldVector = createWorldVector(0, 0);
  private intendedVelocity: WorldVector = createWorldVector(0, 0);
  private resolvedVelocity: WorldVector = createWorldVector(0, 0);
  private blockedX = false;
  private blockedY = false;
  private hitSolidX: string | undefined;
  private hitSolidY: string | undefined;

  public constructor(
    private readonly worldQuery: WorldCollisionQuery,
    initialPosition: WorldPosition,
    initialFacing: FacingDirection | null = null,
  ) {
    this.position = createWorldPosition(initialPosition.x, initialPosition.y);
    this.facing = initialFacing;
  }

  public step(input: PlayerInput, dtSeconds: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
      throw new Error('Player movement dtSeconds must be finite and greater than zero.');
    }

    const moveX = axisValue(input.moveLeft, input.moveRight);
    const moveY = axisValue(input.moveUp, input.moveDown);

    this.blockedX = false;
    this.blockedY = false;
    this.hitSolidX = undefined;
    this.hitSolidY = undefined;

    if (moveX === 0 && moveY === 0) {
      this.intendedDirection = createWorldVector(0, 0);
      this.intendedVelocity = createWorldVector(0, 0);
      this.resolvedVelocity = createWorldVector(0, 0);
      this.locomotionState = 'IDLE';
      return;
    }

    const diagonal = moveX !== 0 && moveY !== 0;
    const directionScale = diagonal ? INV_SQRT_2 : 1;
    const directionX = moveX * directionScale;
    const directionY = moveY * directionScale;
    const velocityX = directionX * PLAYER_MOVEMENT_CONFIG.baseMoveSpeed;
    const velocityY = directionY * PLAYER_MOVEMENT_CONFIG.baseMoveSpeed;
    const desiredX = velocityX * dtSeconds;
    const desiredY = velocityY * dtSeconds;

    this.intendedDirection = createWorldVector(directionX, directionY);
    this.intendedVelocity = createWorldVector(velocityX, velocityY);
    this.facing = facingForAxes(moveX, moveY);

    let allowedX = desiredX;
    if (desiredX !== 0) {
      const xResult = this.worldQuery.sweepAabbAxis({
        center: this.position,
        footprint: PLAYER_COLLISION_FOOTPRINT,
        axis: 'x',
        desiredDelta: desiredX,
      });
      validateResolvedDelta(desiredX, xResult.allowedDelta, 'X');
      allowedX = xResult.allowedDelta;
      this.blockedX = xResult.blocked;
      this.hitSolidX = xResult.hitSolidId;
    }

    this.position = createWorldPosition(
      this.position.x + allowedX,
      this.position.y,
    );

    let allowedY = desiredY;
    if (desiredY !== 0) {
      const yResult = this.worldQuery.sweepAabbAxis({
        center: this.position,
        footprint: PLAYER_COLLISION_FOOTPRINT,
        axis: 'y',
        desiredDelta: desiredY,
      });
      validateResolvedDelta(desiredY, yResult.allowedDelta, 'Y');
      allowedY = yResult.allowedDelta;
      this.blockedY = yResult.blocked;
      this.hitSolidY = yResult.hitSolidId;
    }

    this.position = createWorldPosition(
      this.position.x,
      this.position.y + allowedY,
    );

    this.resolvedVelocity = createWorldVector(
      allowedX / dtSeconds,
      allowedY / dtSeconds,
    );
    this.locomotionState = this.blockedX || this.blockedY
      ? 'COLLISION-CONSTRAINED'
      : 'MOVING';
  }

  public getSnapshot(): Readonly<PlayerMovementSnapshot> {
    return Object.freeze({
      position: this.position,
      intendedDirection: this.intendedDirection,
      intendedVelocity: this.intendedVelocity,
      resolvedVelocity: this.resolvedVelocity,
      locomotionState: this.locomotionState,
      facing: this.facing,
      collision: Object.freeze({
        blockedX: this.blockedX,
        blockedY: this.blockedY,
        ...(this.hitSolidX === undefined ? {} : { hitSolidX: this.hitSolidX }),
        ...(this.hitSolidY === undefined ? {} : { hitSolidY: this.hitSolidY }),
      }),
    });
  }
}
