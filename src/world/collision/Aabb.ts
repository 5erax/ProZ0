export interface AabbHalfExtents {
  readonly halfWidth: number;
  readonly halfDepth: number;
}

export interface StaticSolidAabb {
  readonly id: string;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

export function validateAabbHalfExtents(extents: AabbHalfExtents): void {
  assertFinite(extents.halfWidth, 'AABB halfWidth');
  assertFinite(extents.halfDepth, 'AABB halfDepth');

  if (extents.halfWidth <= 0 || extents.halfDepth <= 0) {
    throw new Error('AABB half extents must be greater than zero.');
  }
}

export function createStaticSolidAabb(
  id: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): StaticSolidAabb {
  if (id.length === 0) {
    throw new Error('Static solid id must not be empty.');
  }

  assertFinite(minX, `${id}.minX`);
  assertFinite(minY, `${id}.minY`);
  assertFinite(maxX, `${id}.maxX`);
  assertFinite(maxY, `${id}.maxY`);

  if (minX >= maxX || minY >= maxY) {
    throw new Error(`Static solid ${id} must have positive width and depth.`);
  }

  return Object.freeze({ id, minX, minY, maxX, maxY });
}
