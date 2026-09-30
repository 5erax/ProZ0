import { describe, expect, it } from 'vitest';
import { projectPhase1Isometric, unprojectPhase1Isometric, phase1IsometricInput, phase1IsometricFacing } from '../../src/client/runtime/Phase1IsometricProjection';
describe('Phase 1 isometric presentation', () => {
  it('projects equal world axes to a 2:1 diamond and centers the local camera', () => {
    expect(projectPhase1Isometric({ x: 1, y: 0 }, { x: 0, y: 0 })).toEqual({ x: 16, y: 8 });
    expect(projectPhase1Isometric({ x: 0, y: 1 }, { x: 0, y: 0 })).toEqual({ x: -16, y: 8 });
    expect(projectPhase1Isometric({ x: -3, y: 8 }, { x: -3, y: 8 })).toEqual({ x: 0, y: 0 });
  });
  it('converts screen placement back to world coordinates at a translated camera', () => {
    const camera = { x: -7, y: 11 };
    for (const world of [{ x: 3.25, y: -2.5 }, { x: -9, y: 4.75 }]) {
      expect(unprojectPhase1Isometric(projectPhase1Isometric(world, camera), camera)).toEqual(world);
    }
  });
  it('keeps WASD motion aligned with screen directions and cancellation stable', () => {
    const idle = { moveUp: false, moveDown: false, moveLeft: false, moveRight: false };
    const up = phase1IsometricInput({ ...idle, moveUp: true });
    expect(up).toEqual({ moveUp: true, moveDown: false, moveLeft: true, moveRight: false });
    const point = projectPhase1Isometric({ x: -1, y: -1 }, { x: 0, y: 0 });
    expect(point.x).toBe(0); expect(point.y).toBeLessThan(0);
    expect(phase1IsometricInput({ ...idle, moveUp: true, moveDown: true })).toEqual(idle);
    expect(phase1IsometricFacing('NW')).toBe('N');
  });
});
