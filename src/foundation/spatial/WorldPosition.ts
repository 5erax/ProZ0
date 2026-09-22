export const WORLD_PIXELS_PER_UNIT = 32;

export interface WorldPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorldVector {
  readonly x: number;
  readonly y: number;
}

function assertFiniteCoordinate(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

export function createWorldPosition(x: number, y: number): WorldPosition {
  assertFiniteCoordinate(x, 'WorldPosition.x');
  assertFiniteCoordinate(y, 'WorldPosition.y');
  return Object.freeze({ x, y });
}

export function createWorldVector(x: number, y: number): WorldVector {
  assertFiniteCoordinate(x, 'WorldVector.x');
  assertFiniteCoordinate(y, 'WorldVector.y');
  return Object.freeze({ x, y });
}
