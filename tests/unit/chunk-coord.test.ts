import { describe, expect, it } from 'vitest';
import { createWorldPosition } from '../../src/foundation';
import {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
  fromChunkKey,
  fromWorldPosition,
  toChunkKey,
  toChunkLocalPosition,
} from '../../src/world';

describe('canonical chunk coordinates', () => {
  it.each([
    [0, 0],
    [31.999, 0],
    [32, 1],
    [-0.001, -1],
    [-32, -1],
    [-32.001, -2],
  ])('maps world X=%s using mathematical floor', (worldX, expectedChunkX) => {
    expect(fromWorldPosition(createWorldPosition(worldX, 0)).x).toBe(
      expectedChunkX,
    );
  });

  it('preserves the world -> chunk -> local invariant for negative coordinates', () => {
    const world = createWorldPosition(-32.001, 63.5);
    const coord = fromWorldPosition(world);
    const local = toChunkLocalPosition(world, coord);

    expect(coord).toEqual({ x: -2, y: 1 });
    expect(local.x).toBeGreaterThanOrEqual(0);
    expect(local.x).toBeLessThan(CHUNK_SPAN_WORLD_UNITS);
    expect(local.y).toBeGreaterThanOrEqual(0);
    expect(local.y).toBeLessThan(CHUNK_SPAN_WORLD_UNITS);
    expect(coord.x * CHUNK_SPAN_WORLD_UNITS + local.x).toBeCloseTo(world.x, 12);
    expect(coord.y * CHUNK_SPAN_WORLD_UNITS + local.y).toBeCloseTo(world.y, 12);
  });

  it('round-trips the canonical chunk key', () => {
    const coord = createChunkCoord(-2147483648, 2147483647);
    expect(fromChunkKey(toChunkKey(coord))).toEqual(coord);
  });

  it.each([-Number.MIN_VALUE, -Number.EPSILON / 2, -Number.EPSILON, -1e-16])('keeps a tiny negative coordinate %s in the final cell of its owning chunk', value => {
    const position=createWorldPosition(value,value),coord=fromWorldPosition(position),local=toChunkLocalPosition(position,coord);
    expect(coord).toEqual({x:-1,y:-1});
    expect(local.x).toBeGreaterThanOrEqual(0);expect(local.x).toBeLessThan(CHUNK_SPAN_WORLD_UNITS);
    expect(local.y).toBeGreaterThanOrEqual(0);expect(local.y).toBeLessThan(CHUNK_SPAN_WORLD_UNITS);
    expect(Math.floor(local.x/2)).toBe(15);expect(Math.floor(local.y/2)).toBe(15);
  });

  it('still rejects adjacent chunks and non-finite world positions instead of clamping invalid ownership',()=>{
    expect(()=>toChunkLocalPosition(createWorldPosition(-1e-16,0),createChunkCoord(0,0))).toThrow(/does not belong/);
    expect(()=>toChunkLocalPosition(createWorldPosition(0,0),createChunkCoord(-1,0))).toThrow(/does not belong/);
    expect(()=>toChunkLocalPosition(createWorldPosition(32,0),createChunkCoord(0,0))).toThrow(/does not belong/);
    expect(()=>toChunkLocalPosition({x:NaN,y:0},createChunkCoord(0,0))).toThrow(/finite/);
    expect(()=>toChunkLocalPosition({x:Infinity,y:0},createChunkCoord(0,0))).toThrow(/finite/);
  });

  it('rejects non-int32 coordinates', () => {
    expect(() => createChunkCoord(2147483648, 0)).toThrow(/signed int32/);
    expect(() => createChunkCoord(0.5, 0)).toThrow(/signed int32/);
  });
});
