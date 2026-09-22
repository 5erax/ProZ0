import { describe, expect, it } from 'vitest';
import {
  createSimulationStep,
  createWorldPosition,
  toSimulationTick,
} from '../../src/foundation';
import {
  createSimulationRuntime,
  INV_SQRT_2,
  PLAYER_MOVEMENT_CONFIG,
  type PlayerInput,
} from '../../src/simulation';
import {
  createStaticCollisionWorld,
  createStaticSolidAabb,
  type StaticSolidAabb,
} from '../../src/world';

const RIGHT: PlayerInput = Object.freeze({
  moveUp: false,
  moveDown: false,
  moveLeft: false,
  moveRight: true,
});

const DOWN: PlayerInput = Object.freeze({
  moveUp: false,
  moveDown: true,
  moveLeft: false,
  moveRight: false,
});

const UP_RIGHT: PlayerInput = Object.freeze({
  moveUp: true,
  moveDown: false,
  moveLeft: false,
  moveRight: true,
});

const DOWN_RIGHT: PlayerInput = Object.freeze({
  moveUp: false,
  moveDown: true,
  moveLeft: false,
  moveRight: true,
});

function createRuntime(
  solids: readonly StaticSolidAabb[],
  x = 0,
  y = 0,
) {
  return createSimulationRuntime({
    worldQuery: createStaticCollisionWorld(solids),
    initialPlayerPosition: createWorldPosition(x, y),
  });
}

function runTicks(
  runtime: ReturnType<typeof createSimulationRuntime>,
  input: PlayerInput,
  count: number,
  startTick = 1,
): void {
  for (let tick = startTick; tick < startTick + count; tick += 1) {
    runtime.submitInput('test-player', input);
    runtime.step(createSimulationStep(toSimulationTick(tick)));
  }
}

describe('P0-TECH-008 movement/collision fixtures', () => {
  it('T1 keeps non-grid continuous sub-pixel world positions', () => {
    const runtime = createRuntime([], 0.140625, 0.203125);

    runTicks(runtime, RIGHT, 1);

    expect(runtime.getSnapshot().player.position.x).toBe(0.1875);
    expect(runtime.getSnapshot().player.position.y).toBe(0.203125);
  });

  it('T2 stops stably at a direct vertical wall boundary', () => {
    const wall = createStaticSolidAabb('wall', 2, -2, 2.5, 2);
    const runtime = createRuntime([wall], 1.5, 0);

    runTicks(runtime, RIGHT, 20);

    expect(runtime.getSnapshot().player.position.x).toBe(1.6875);
    expect(runtime.getSnapshot().player.collision.blockedX).toBe(true);

    runTicks(runtime, RIGHT, 20, 21);
    expect(runtime.getSnapshot().player.position.x).toBe(1.6875);
  });

  it('T3 slides vertically without renormalizing the surviving diagonal component', () => {
    const wall = createStaticSolidAabb('wall', 2, -2, 2.5, 2);
    const runtime = createRuntime([wall], 1.6875, 0);

    runTicks(runtime, UP_RIGHT, 1);

    const snapshot = runtime.getSnapshot().player;
    const expectedComponent = -PLAYER_MOVEMENT_CONFIG.cardinalDeltaPerTick * INV_SQRT_2;

    expect(snapshot.position.x).toBe(1.6875);
    expect(snapshot.position.y).toBeCloseTo(expectedComponent, 12);
    expect(snapshot.resolvedVelocity.y).toBeCloseTo(
      -PLAYER_MOVEMENT_CONFIG.baseMoveSpeed * INV_SQRT_2,
      12,
    );
    expect(snapshot.facing).toBe('NE');
    expect(snapshot.collision.blockedX).toBe(true);
  });

  it('T4 slides horizontally along a horizontal wall', () => {
    const wall = createStaticSolidAabb('wall', -2, -0.5, 2, -0.1875);
    const runtime = createRuntime([wall], 0, 0);

    runTicks(runtime, UP_RIGHT, 1);

    const snapshot = runtime.getSnapshot().player;
    const expectedX = PLAYER_MOVEMENT_CONFIG.cardinalDeltaPerTick * INV_SQRT_2;

    expect(snapshot.position.y).toBe(0);
    expect(snapshot.position.x).toBeCloseTo(expectedX, 12);
    expect(snapshot.facing).toBe('NE');
    expect(snapshot.collision.blockedY).toBe(true);
  });

  it('T5 rejects a 19 px corridor without shrinking the footprint', () => {
    const halfGap = 0.59375 / 2;
    const solids = [
      createStaticSolidAabb('left', -1, 0, -halfGap, 3),
      createStaticSolidAabb('right', halfGap, 0, 1, 3),
    ];
    const runtime = createRuntime(solids, 0, -0.5);

    runTicks(runtime, DOWN, 30);

    expect(runtime.getSnapshot().player.position.y)
      .toBeLessThanOrEqual(-0.1875);
  });

  it('T6 traverses an exactly 20 px aligned corridor', () => {
    const halfGap = 0.625 / 2;
    const solids = [
      createStaticSolidAabb('left', -1, 0, -halfGap, 3),
      createStaticSolidAabb('right', halfGap, 0, 1, 3),
    ];
    const runtime = createRuntime(solids, 0, -0.5);

    runTicks(runtime, DOWN, 30);

    expect(runtime.getSnapshot().player.position.y).toBeGreaterThan(0.5);
  });

  it('T7 traverses a 21 px corridor normally', () => {
    const halfGap = 0.65625 / 2;
    const solids = [
      createStaticSolidAabb('left', -1, 0, -halfGap, 3),
      createStaticSolidAabb('right', halfGap, 0, 1, 3),
    ];
    const runtime = createRuntime(solids, 0, -0.5);

    runTicks(runtime, DOWN, 30);

    expect(runtime.getSnapshot().player.position.y).toBeGreaterThan(0.5);
  });

  it('T8 settles stably into a closed corner', () => {
    const solids = [
      createStaticSolidAabb('vertical', 1, -2, 1.5, 2),
      createStaticSolidAabb('horizontal', -2, 1, 2, 1.5),
    ];
    const runtime = createRuntime(solids, 0, 0);

    runTicks(runtime, DOWN_RIGHT, 60);
    const settled = runtime.getSnapshot().player.position;

    expect(settled.x).toBeCloseTo(0.6875, 12);
    expect(settled.y).toBeCloseTo(0.8125, 12);

    runTicks(runtime, DOWN_RIGHT, 60, 61);
    expect(runtime.getSnapshot().player.position).toEqual(settled);
  });

  it('T9 is independent from solid iteration order', () => {
    const a = createStaticSolidAabb('a', 1, -2, 1.5, 2);
    const b = createStaticSolidAabb('b', -2, 1, 2, 1.5);

    const first = createRuntime([a, b]);
    const second = createRuntime([b, a]);

    runTicks(first, DOWN_RIGHT, 60);
    runTicks(second, DOWN_RIGHT, 60);

    expect(first.getSnapshot().player).toEqual(second.getSnapshot().player);
  });

  it('T10 keeps collision state independent from presentation frame metadata', () => {
    const wall = createStaticSolidAabb('wall', 2, -2, 2.5, 2);
    const smallVisualFrame = Object.freeze({ width: 16, height: 24 });
    const largeVisualFrame = Object.freeze({ width: 64, height: 96 });

    const first = createRuntime([wall], 1.5, 0);
    const second = createRuntime([wall], 1.5, 0);

    void smallVisualFrame;
    void largeVisualFrame;

    runTicks(first, RIGHT, 20);
    runTicks(second, RIGHT, 20);

    expect(first.getSnapshot().player).toEqual(second.getSnapshot().player);
  });

  it('T11 produces the same authoritative state across different presentation read cadences', () => {
    const runtimeA = createRuntime([]);
    const runtimeB = createRuntime([]);

    for (let tick = 1; tick <= 120; tick += 1) {
      runtimeA.submitInput('test-player', UP_RIGHT);
      runtimeA.step(createSimulationStep(toSimulationTick(tick)));
      runtimeA.getSnapshot();

      runtimeB.submitInput('test-player', UP_RIGHT);
      runtimeB.step(createSimulationStep(toSimulationTick(tick)));

      if (tick % 4 === 0) {
        runtimeB.getSnapshot();
      }
    }

    expect(runtimeA.getSnapshot()).toEqual(runtimeB.getSnapshot());
  });
});

describe('P0-DES-001 movement behavior', () => {
  it('cancels opposing axes while preserving the unaffected axis', () => {
    const runtime = createRuntime([]);

    runTicks(runtime, {
      moveUp: true,
      moveDown: false,
      moveLeft: true,
      moveRight: true,
    }, 1);

    const player = runtime.getSnapshot().player;
    expect(player.position.x).toBe(0);
    expect(player.position.y).toBe(-PLAYER_MOVEMENT_CONFIG.cardinalDeltaPerTick);
    expect(player.facing).toBe('N');
  });

  it('normalizes diagonal total speed to cardinal speed', () => {
    const cardinal = createRuntime([]);
    const diagonal = createRuntime([]);

    runTicks(cardinal, RIGHT, 60);
    runTicks(diagonal, UP_RIGHT, 60);

    const cardinalDistance = Math.hypot(
      cardinal.getSnapshot().player.position.x,
      cardinal.getSnapshot().player.position.y,
    );
    const diagonalDistance = Math.hypot(
      diagonal.getSnapshot().player.position.x,
      diagonal.getSnapshot().player.position.y,
    );

    expect(diagonalDistance).toBeCloseTo(cardinalDistance, 10);
  });

  it('preserves the last valid facing while idle', () => {
    const runtime = createRuntime([]);

    runTicks(runtime, UP_RIGHT, 1);
    runTicks(runtime, {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false,
    }, 1, 2);

    expect(runtime.getSnapshot().player.facing).toBe('NE');
    expect(runtime.getSnapshot().player.locomotionState).toBe('IDLE');
  });
});
