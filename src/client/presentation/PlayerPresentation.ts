import { uiText } from '../localization/UiMessages';
import { WORLD_PIXELS_PER_UNIT } from '../../foundation';
import type { PlayerMovementSnapshot } from '../../simulation';
import type { CameraPresentationPosition } from './CameraPresenter';

export interface PlayerPresentationFrame {
  readonly widthPx: number;
  readonly heightPx: number;
  readonly bodyWidthPx: number;
  readonly bodyHeightPx: number;
}

export interface PlayerPresentationProjection {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly frameLeft: number;
  readonly frameTop: number;
  readonly frameRight: number;
  readonly frameBottom: number;
  readonly bodyWidthPx: number;
  readonly bodyHeightPx: number;
  readonly zIndex: number;
}

export const DEFAULT_PLAYER_PRESENTATION_FRAME: PlayerPresentationFrame = Object.freeze({
  widthPx: 32,
  heightPx: 48,
  bodyWidthPx: 24,
  bodyHeightPx: 44,
});

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and greater than zero.`);
  }
}

export function validatePlayerPresentationFrame(
  frame: PlayerPresentationFrame,
): void {
  assertPositiveFinite(frame.widthPx, uiText("ui.8a325339"));
  assertPositiveFinite(frame.heightPx, uiText("ui.1cc2ed28"));
  assertPositiveFinite(frame.bodyWidthPx, uiText("ui.2b3f64c0"));
  assertPositiveFinite(frame.bodyHeightPx, uiText("ui.33e2d977"));

  if (frame.bodyWidthPx > frame.widthPx || frame.bodyHeightPx > frame.heightPx) {
    throw new Error('Player body bounds must fit inside the presentation frame.');
  }
}

export function projectPlayerPresentation(
  player: Readonly<PlayerMovementSnapshot>,
  camera: Readonly<CameraPresentationPosition>,
  frame: PlayerPresentationFrame = DEFAULT_PLAYER_PRESENTATION_FRAME,
  viewportWidthPx = 640,
  viewportHeightPx = 360,
): PlayerPresentationProjection {
  validatePlayerPresentationFrame(frame);

  const anchorX = Math.round(player.position.x * WORLD_PIXELS_PER_UNIT)
    - camera.rasterX
    + viewportWidthPx / 2;
  const anchorY = Math.round(player.position.y * WORLD_PIXELS_PER_UNIT)
    - camera.rasterY
    + viewportHeightPx / 2;

  return Object.freeze({
    anchorX,
    anchorY,
    frameLeft: anchorX - frame.widthPx / 2,
    frameTop: anchorY - frame.heightPx,
    frameRight: anchorX + frame.widthPx / 2,
    frameBottom: anchorY,
    bodyWidthPx: frame.bodyWidthPx,
    bodyHeightPx: frame.bodyHeightPx,
    zIndex: player.position.y * 1000,
  });
}
