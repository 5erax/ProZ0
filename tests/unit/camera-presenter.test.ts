import { describe, expect, it } from 'vitest';
import { createWorldPosition } from '../../src/foundation';
import {
  CAMERA_FOLLOW_90_TIME_SECONDS,
  CAMERA_MAX_NORMAL_LAG_WU,
  CameraPresenter,
} from '../../src/client/presentation/CameraPresenter';

describe('CameraPresenter', () => {
  it('snaps to the first resolved position before normal control', () => {
    const camera = new CameraPresenter();

    camera.update(createWorldPosition(3.25, -1.5), 0);

    expect(camera.getPosition()).toMatchObject({
      x: 3.25,
      y: -1.5,
    });
  });

  it('closes approximately 90 percent of a small displacement in 80 ms', () => {
    const camera = new CameraPresenter();
    camera.snapTo(createWorldPosition(0, 0));

    camera.update(
      createWorldPosition(0.25, 0),
      CAMERA_FOLLOW_90_TIME_SECONDS,
    );

    expect(camera.getPosition().x).toBeCloseTo(0.225, 10);
  });

  it('keeps normal lag within half a player footprint width', () => {
    const camera = new CameraPresenter();
    camera.snapTo(createWorldPosition(0, 0));

    let targetX = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      targetX += 2.8125 / 60;
      camera.update(createWorldPosition(targetX, 0), 1 / 60);
    }

    expect(targetX - camera.getPosition().x)
      .toBeLessThanOrEqual(CAMERA_MAX_NORMAL_LAG_WU + 1e-12);
  });

  it('produces integer internal-pixel raster coordinates without mutating target', () => {
    const camera = new CameraPresenter();
    const target = createWorldPosition(0.140625, 0.203125);

    camera.snapTo(target);
    const position = camera.getPosition();

    expect(Number.isInteger(position.rasterX)).toBe(true);
    expect(Number.isInteger(position.rasterY)).toBe(true);
    expect(target).toEqual({ x: 0.140625, y: 0.203125 });
  });

  it('rejects smoothing outside the approved 0–120 ms range', () => {
    expect(() => new CameraPresenter({
      follow90TimeSeconds: 0.121,
      maxNormalLagWorldUnits: CAMERA_MAX_NORMAL_LAG_WU,
    })).toThrow(/0–120 ms/);
  });
});
