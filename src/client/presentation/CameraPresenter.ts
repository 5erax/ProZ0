import {
  WORLD_PIXELS_PER_UNIT,
  type WorldPosition,
} from '../../foundation';
import { PLAYER_COLLISION_FOOTPRINT } from '../../simulation';

export const CAMERA_FOLLOW_90_TIME_SECONDS = 0.08;
export const CAMERA_FOLLOW_90_TIME_MAX_SECONDS = 0.12;
export const CAMERA_MAX_NORMAL_LAG_WU = PLAYER_COLLISION_FOOTPRINT.width * 0.5;

export interface CameraPresentationPosition {
  readonly x: number;
  readonly y: number;
  readonly rasterX: number;
  readonly rasterY: number;
}

export interface CameraPresenterConfig {
  readonly follow90TimeSeconds: number;
  readonly maxNormalLagWorldUnits: number;
}

const DEFAULT_CAMERA_CONFIG: CameraPresenterConfig = Object.freeze({
  follow90TimeSeconds: CAMERA_FOLLOW_90_TIME_SECONDS,
  maxNormalLagWorldUnits: CAMERA_MAX_NORMAL_LAG_WU,
});

function validateConfig(config: CameraPresenterConfig): void {
  if (
    !Number.isFinite(config.follow90TimeSeconds)
    || config.follow90TimeSeconds < 0
    || config.follow90TimeSeconds > CAMERA_FOLLOW_90_TIME_MAX_SECONDS
  ) {
    throw new Error('cameraFollow90Time must remain within 0–120 ms.');
  }

  if (
    !Number.isFinite(config.maxNormalLagWorldUnits)
    || config.maxNormalLagWorldUnits <= 0
  ) {
    throw new Error('Camera max normal lag must be finite and greater than zero.');
  }
}

export class CameraPresenter {
  private x = 0;
  private y = 0;
  private initialized = false;

  public constructor(
    private readonly config: CameraPresenterConfig = DEFAULT_CAMERA_CONFIG,
  ) {
    validateConfig(config);
  }

  public snapTo(target: WorldPosition): void {
    this.x = target.x;
    this.y = target.y;
    this.initialized = true;
  }

  public update(target: WorldPosition, deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new Error('Camera deltaSeconds must be finite and non-negative.');
    }

    if (!this.initialized) {
      this.snapTo(target);
      return;
    }

    if (this.config.follow90TimeSeconds === 0) {
      this.snapTo(target);
      return;
    }

    const blend = deltaSeconds === 0
      ? 0
      : 1 - Math.pow(0.1, deltaSeconds / this.config.follow90TimeSeconds);

    let nextX = this.x + (target.x - this.x) * blend;
    let nextY = this.y + (target.y - this.y) * blend;

    const lagX = target.x - nextX;
    const lagY = target.y - nextY;
    const lagDistance = Math.hypot(lagX, lagY);

    if (lagDistance > this.config.maxNormalLagWorldUnits) {
      const scale = this.config.maxNormalLagWorldUnits / lagDistance;
      nextX = target.x - lagX * scale;
      nextY = target.y - lagY * scale;
    }

    this.x = nextX;
    this.y = nextY;
  }

  public getPosition(): CameraPresentationPosition {
    return Object.freeze({
      x: this.x,
      y: this.y,
      rasterX: Math.round(this.x * WORLD_PIXELS_PER_UNIT),
      rasterY: Math.round(this.y * WORLD_PIXELS_PER_UNIT),
    });
  }
}
