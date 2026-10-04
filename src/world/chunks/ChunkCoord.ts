import type { WorldPosition } from '../../foundation';

export const CHUNK_SPAN_WORLD_UNITS = 32;
const MAX_CHUNK_LOCAL_WORLD_UNITS = CHUNK_SPAN_WORLD_UNITS - Number.EPSILON * CHUNK_SPAN_WORLD_UNITS / 2;

const INT32_MIN = -0x8000_0000;
const INT32_MAX = 0x7fff_ffff;
const CHUNK_KEY_PATTERN = /^chunk:(-?\d+):(-?\d+)$/;

export interface ChunkCoord {
  readonly x: number;
  readonly y: number;
}

export interface ChunkLocalPosition {
  readonly x: number;
  readonly y: number;
}

function canonicalInt32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < INT32_MIN || value > INT32_MAX) {
    throw new RangeError(`${label} must be a signed int32 integer.`);
  }

  return Object.is(value, -0) ? 0 : value;
}

function assertFiniteWorldCoordinate(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} must be finite.`);
  }
}

export function createChunkCoord(x: number, y: number): ChunkCoord {
  return Object.freeze({
    x: canonicalInt32(x, 'ChunkCoord.x'),
    y: canonicalInt32(y, 'ChunkCoord.y'),
  });
}

function floorChunkCoordinate(value: number): number {
  const result = Math.floor(value / CHUNK_SPAN_WORLD_UNITS);
  return value < 0 && result === 0 ? -1 : result;
}

export function fromWorldPosition(position: WorldPosition): ChunkCoord {
  assertFiniteWorldCoordinate(position.x, 'WorldPosition.x');
  assertFiniteWorldCoordinate(position.y, 'WorldPosition.y');

  return createChunkCoord(floorChunkCoordinate(position.x), floorChunkCoordinate(position.y));
}

export function toChunkLocalPosition(
  position: WorldPosition,
  coord: ChunkCoord = fromWorldPosition(position),
): ChunkLocalPosition {
  const canonicalCoord = createChunkCoord(coord.x, coord.y);
  assertFiniteWorldCoordinate(position.x, 'WorldPosition.x');
  assertFiniteWorldCoordinate(position.y, 'WorldPosition.y');
  const originX = canonicalCoord.x * CHUNK_SPAN_WORLD_UNITS;
  const originY = canonicalCoord.y * CHUNK_SPAN_WORLD_UNITS;

  if (
    position.x < originX
    || position.x >= originX + CHUNK_SPAN_WORLD_UNITS
    || position.y < originY
    || position.y >= originY + CHUNK_SPAN_WORLD_UNITS
  ) {
    throw new RangeError('World position does not belong to the supplied chunk coordinate.');
  }

  // A valid tiny negative position can round to 32 when subtracting -32.
  // Validate ownership in world space, then preserve the exclusive local edge.
  return Object.freeze({
    x: Math.min(position.x - originX, MAX_CHUNK_LOCAL_WORLD_UNITS),
    y: Math.min(position.y - originY, MAX_CHUNK_LOCAL_WORLD_UNITS),
  });
}

export function toChunkKey(coord: ChunkCoord): string {
  const canonical = createChunkCoord(coord.x, coord.y);
  return `chunk:${canonical.x}:${canonical.y}`;
}

export function fromChunkKey(key: string): ChunkCoord {
  const match = CHUNK_KEY_PATTERN.exec(key);
  if (match === null) {
    throw new RangeError('Invalid canonical chunk key.');
  }

  return createChunkCoord(Number(match[1]), Number(match[2]));
}

export function sameChunkCoord(left: ChunkCoord, right: ChunkCoord): boolean {
  return left.x === right.x && left.y === right.y;
}

function encodeSignedInt32(value: number): string {
  return (canonicalInt32(value, 'ChunkCoord seed coordinate') >>> 0)
    .toString(16)
    .padStart(8, '0');
}

export function encodeChunkCoordForSeed(
  coord: ChunkCoord,
): readonly [string, string] {
  const canonical = createChunkCoord(coord.x, coord.y);
  return Object.freeze([
    encodeSignedInt32(canonical.x),
    encodeSignedInt32(canonical.y),
  ]) as readonly [string, string];
}
