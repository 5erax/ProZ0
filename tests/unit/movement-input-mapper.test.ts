import { describe, expect, it } from 'vitest';
import {
  isMovementInputCode,
  mapMovementInput,
} from '../../src/client/input/MovementInputMapper';

function codes(...values: string[]): ReadonlySet<string> {
  return new Set(values);
}

describe('movement input mapping', () => {
  it('maps WASD and arrow keys to equivalent logical actions', () => {
    expect(mapMovementInput(codes('KeyW', 'KeyD'))).toEqual({
      moveUp: true,
      moveDown: false,
      moveLeft: false,
      moveRight: true,
    });

    expect(mapMovementInput(codes('ArrowUp', 'ArrowRight'))).toEqual({
      moveUp: true,
      moveDown: false,
      moveLeft: false,
      moveRight: true,
    });
  });

  it('preserves opposing logical actions for authoritative cancellation', () => {
    expect(mapMovementInput(codes('KeyW', 'KeyA', 'KeyD'))).toEqual({
      moveUp: true,
      moveDown: false,
      moveLeft: true,
      moveRight: true,
    });
  });

  it('identifies gameplay-owned movement codes', () => {
    expect(isMovementInputCode('ArrowLeft')).toBe(true);
    expect(isMovementInputCode('KeyA')).toBe(true);
    expect(isMovementInputCode('Space')).toBe(false);
  });
});
