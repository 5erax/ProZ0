import type { WorldPosition } from '../../foundation';
export function projectPhase1Isometric(world: WorldPosition, camera: WorldPosition): { x: number; y: number } {
  const x = world.x - camera.x; const y = world.y - camera.y;
  return { x: Math.round((x - y) * 16), y: Math.round((x + y) * 8) };
}
export function unprojectPhase1Isometric(point: { x: number; y: number }, camera: WorldPosition): WorldPosition {
  return { x: camera.x + point.x / 32 + point.y / 16,
    y: camera.y + point.y / 16 - point.x / 32 };
}
export function phase1IsometricInput<T extends { moveUp: boolean; moveDown: boolean; moveLeft: boolean; moveRight: boolean }>(input: T): T {
  const screenX = Number(input.moveRight) - Number(input.moveLeft);
  const screenY = Number(input.moveDown) - Number(input.moveUp);
  const x = screenX + screenY; const y = screenY - screenX;
  return { ...input, moveUp: y < 0, moveDown: y > 0, moveLeft: x < 0, moveRight: x > 0 };
}
export function phase1IsometricFacing<T extends string>(facing: T | null): T | null {
  const directions: Record<string, string> = { N: 'NE', NE: 'E', E: 'SE', SE: 'S', S: 'SW', SW: 'W', W: 'NW', NW: 'N' };
  return facing === null ? null : (directions[facing] ?? facing) as T;
}
