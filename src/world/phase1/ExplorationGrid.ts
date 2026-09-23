import {
  createWorldPosition,
  type WorldPosition,
} from '../../foundation';
import {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
  type ChunkCoord,
} from '../chunks/ChunkCoord';
import type {
  Phase1ExplorationFragment,
} from './Phase1WorldTypes';

export const PHASE1_EXPLORATION_CELLS_PER_AXIS = 16 as const;
export const PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS =
  CHUNK_SPAN_WORLD_UNITS / PHASE1_EXPLORATION_CELLS_PER_AXIS;
export const PHASE1_EXPLORATION_WORD_COUNT =
  (PHASE1_EXPLORATION_CELLS_PER_AXIS
    * PHASE1_EXPLORATION_CELLS_PER_AXIS) / 32;

function requireUint32(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError('Exploration word must be a uint32 integer.');
  }
  return value >>> 0;
}

export function explorationRegionId(
  coord: ChunkCoord,
): string {
  const canonical = createChunkCoord(coord.x, coord.y);
  return `exploration:chunk:${canonical.x}:${canonical.y}`;
}

export function createEmptyExplorationFragment(
  coord: ChunkCoord,
): Phase1ExplorationFragment {
  return Object.freeze({
    regionId: explorationRegionId(coord),
    revision: 0,
    words: Object.freeze(
      Array.from({ length: PHASE1_EXPLORATION_WORD_COUNT }, () => 0),
    ),
  });
}

export function validateExplorationFragment(
  coord: ChunkCoord,
  fragment: Phase1ExplorationFragment,
): Phase1ExplorationFragment {
  if (fragment.regionId !== explorationRegionId(coord)) {
    throw new Error('Exploration region identity does not match chunk coordinate.');
  }

  if (!Number.isSafeInteger(fragment.revision) || fragment.revision < 0) {
    throw new Error('Exploration revision must be a non-negative safe integer.');
  }

  if (fragment.words.length !== PHASE1_EXPLORATION_WORD_COUNT) {
    throw new Error('Exploration bitset has an invalid word count.');
  }

  return Object.freeze({
    regionId: fragment.regionId,
    revision: fragment.revision,
    words: Object.freeze(fragment.words.map(requireUint32)),
  });
}

function cellCenter(
  coord: ChunkCoord,
  cellX: number,
  cellY: number,
): WorldPosition {
  return createWorldPosition(
    coord.x * CHUNK_SPAN_WORLD_UNITS
      + (cellX + 0.5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    coord.y * CHUNK_SPAN_WORLD_UNITS
      + (cellY + 0.5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  );
}

function bitForCell(cellX: number, cellY: number): {
  readonly wordIndex: number;
  readonly mask: number;
} {
  const index =
    cellY * PHASE1_EXPLORATION_CELLS_PER_AXIS + cellX;
  return Object.freeze({
    wordIndex: Math.floor(index / 32),
    mask: (1 << (index % 32)) >>> 0,
  });
}

export function revealExplorationCircle(
  coord: ChunkCoord,
  current: Phase1ExplorationFragment,
  position: WorldPosition,
  radiusWorldUnits: number,
): {
  readonly fragment: Phase1ExplorationFragment;
  readonly changedCells: number;
} {
  if (!Number.isFinite(radiusWorldUnits) || radiusWorldUnits <= 0) {
    throw new RangeError('Fog reveal radius must be finite and greater than zero.');
  }

  const validated = validateExplorationFragment(coord, current);
  const words = validated.words.slice();
  const radiusSquared = radiusWorldUnits * radiusWorldUnits;
  let changedCells = 0;

  for (
    let cellY = 0;
    cellY < PHASE1_EXPLORATION_CELLS_PER_AXIS;
    cellY += 1
  ) {
    for (
      let cellX = 0;
      cellX < PHASE1_EXPLORATION_CELLS_PER_AXIS;
      cellX += 1
    ) {
      const center = cellCenter(coord, cellX, cellY);
      const dx = center.x - position.x;
      const dy = center.y - position.y;

      if (dx * dx + dy * dy > radiusSquared) {
        continue;
      }

      const { wordIndex, mask } = bitForCell(cellX, cellY);
      const before = (words[wordIndex] ?? 0) >>> 0;
      const after = (before | mask) >>> 0;

      if (after !== before) {
        words[wordIndex] = after;
        changedCells += 1;
      }
    }
  }

  if (changedCells === 0) {
    return Object.freeze({
      fragment: validated,
      changedCells: 0,
    });
  }

  if (validated.revision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Exploration revision exhausted Number.MAX_SAFE_INTEGER.');
  }

  return Object.freeze({
    fragment: Object.freeze({
      regionId: validated.regionId,
      revision: validated.revision + 1,
      words: Object.freeze(words.map((value) => value >>> 0)),
    }),
    changedCells,
  });
}

export function isExplorationCellKnown(
  coord: ChunkCoord,
  fragment: Phase1ExplorationFragment,
  cellX: number,
  cellY: number,
): boolean {
  if (
    !Number.isInteger(cellX)
    || !Number.isInteger(cellY)
    || cellX < 0
    || cellY < 0
    || cellX >= PHASE1_EXPLORATION_CELLS_PER_AXIS
    || cellY >= PHASE1_EXPLORATION_CELLS_PER_AXIS
  ) {
    throw new RangeError('Exploration cell index is outside the fragment.');
  }

  const validated = validateExplorationFragment(coord, fragment);
  const { wordIndex, mask } = bitForCell(cellX, cellY);
  return (((validated.words[wordIndex] ?? 0) >>> 0) & mask) !== 0;
}
