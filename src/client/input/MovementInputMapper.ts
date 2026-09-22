import type { PlayerInput } from '../../simulation';

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function pressed(pressedCodes: ReadonlySet<string>, ...codes: string[]): boolean {
  return codes.some((code) => pressedCodes.has(code));
}

export function isMovementInputCode(code: string): boolean {
  return MOVEMENT_CODES.has(code);
}

export function mapMovementInput(pressedCodes: ReadonlySet<string>): PlayerInput {
  return Object.freeze({
    moveUp: pressed(pressedCodes, 'KeyW', 'ArrowUp'),
    moveDown: pressed(pressedCodes, 'KeyS', 'ArrowDown'),
    moveLeft: pressed(pressedCodes, 'KeyA', 'ArrowLeft'),
    moveRight: pressed(pressedCodes, 'KeyD', 'ArrowRight'),
  });
}
