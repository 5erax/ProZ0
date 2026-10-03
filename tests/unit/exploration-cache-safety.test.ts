import { expect, it } from 'vitest';
import { createChunkCoord } from '../../src/world/chunks/ChunkCoord';
import { createEmptyExplorationFragment, isExplorationCellKnown, revealExplorationCircle } from '../../src/world/phase1/ExplorationGrid';
it('cached immutable fog masks still reject the wrong region and reveal a new revision without stale knowledge', () => {
  const coord = createChunkCoord(0,0), empty = createEmptyExplorationFragment(coord);
  expect(isExplorationCellKnown(coord, empty, 1,1)).toBe(false);
  const revealed = revealExplorationCircle(coord, empty, { x: 3, y: 3 }, 1).fragment;
  expect(isExplorationCellKnown(coord, revealed, 1,1)).toBe(true);
  expect(isExplorationCellKnown(coord, empty, 1,1)).toBe(false);
  expect(() => isExplorationCellKnown(createChunkCoord(1,0), revealed, 1,1)).toThrow();
});
it('mutable and shallow-frozen imported masks are revalidated after changes rather than trusted by identity', () => {
  const coord = createChunkCoord(0,0), empty = createEmptyExplorationFragment(coord), words = [...empty.words];
  const input = Object.freeze({ ...empty, words });
  expect(isExplorationCellKnown(coord, input, 0,0)).toBe(false);
  words[0] = 1; expect(isExplorationCellKnown(coord, input, 0,0)).toBe(true);
  words[0] = -1; expect(() => isExplorationCellKnown(coord, input, 0,0)).toThrow();
  let exposed = empty.words;
  const accessor = Object.freeze({ ...empty, get words() { return exposed; } });
  expect(isExplorationCellKnown(coord, accessor, 0,0)).toBe(false);
  exposed = Object.freeze([-1, ...empty.words.slice(1)]);
  expect(() => isExplorationCellKnown(coord, accessor, 0,0)).toThrow();
});
