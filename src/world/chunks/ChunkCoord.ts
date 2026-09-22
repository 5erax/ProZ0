import type { WorldPosition } from '../../foundation';

export const CHUNK_SPAN_WORLD_UNITS = 32;

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

export function fromWorldPosition(position: WorldPosition): ChunkCoord {
  assertFiniteWorldCoordinate(position.x, 'WorldPosition.x');
  assertFiniteWorldCoordinate(position.y, 'WorldPosition.y');

  return createChunkCoord(
    Math.floor(position.x / CHUNK_SPAN_WORLD_UNITS),
    Math.floor(position.y / CHUNK_SPAN_WORLD_UNITS),
  );
}

export function toChunkLocalPosition(
  position: WorldPosition,
  coord: ChunkCoord = fromWorldPosition(position),
): ChunkLocalPosition {
  const canonicalCoord = createChunkCoord(coord.x, coord.y);
  const localX = position.x - canonicalCoord.x * CHUNK_SPAN_WORLD_UNITS;
  const localY = position.y - canonicalCoord.y * CHUNK_SPAN_WORLD_UNITS;

  if (
    localX < 0
    || localX >= CHUNK_SPAN_WORLD_UNITS
    || localY < 0
    || localY >= CHUNK_SPAN_WORLD_UNITS
  ) {
    throw new RangeError('World position does not belong to the supplied chunk coordinate.');
  }

  return Object.freeze({ x: localX, y: localY });
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
