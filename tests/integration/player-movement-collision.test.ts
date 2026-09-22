import { describe, expect, it } from 'vitest';
import {
  SIMULATION_STEP_SECONDS,
  createSimulationStep,
  createWorldPosition,
  toSimulationTick,
} from '../../src/foundation';
import {
  CameraPresenter,
} from '../../src/client/presentation/CameraPresenter';
import {
  projectPlayerPresentation,
  type PlayerPresentationFrame,
} from '../../src/client/presentation/PlayerPresentation';
import {
  FixedStepHost,
  type FrameScheduler,
} from '../../src/client/runtime/FixedStepHost';
import {
  createSimulationRuntime,
  INV_SQRT_2,
  PLAYER_COLLISION_FOOTPRINT,
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

const TECH008_MAX_EPSILON_WU = 1 / 32768;

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

class DeterministicFrameScheduler implements FrameScheduler {
  private nowMs = 0;
  private frameId = 0;
  private pending:
    | { readonly id: number; readonly callback: (timeMs: number) => void }
    | null = null;

  public now(): number {
    return this.nowMs;
  }

  public requestFrame(callback: (timeMs: number) => void): number {
    this.frameId += 1;
    this.pending = { id: this.frameId, callback };
    return this.frameId;
  }

  public cancelFrame(frameId: number): void {
    if (this.pending?.id === frameId) {
      this.pending = null;
    }
  }

  public advanceBy(deltaMs: number): void {
    const pending = this.pending;

    if (pending === null) {
      throw new Error('No scheduled render frame is pending.');
    }

    this.pending = null;
    this.nowMs += deltaMs;
    pending.callback(this.nowMs);
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

  it('keeps a sub-epsilon-below-20px gap blocked', () => {
    const gap = PLAYER_COLLISION_FOOTPRINT.width - TECH008_MAX_EPSILON_WU / 2;
    const halfGap = gap / 2;
    const solids = [
      createStaticSolidAabb('left', -1, 0, -halfGap, 3),
      createStaticSolidAabb('right', halfGap, 0, 1, 3),
    ];
    const runtime = createRuntime(solids, 0, -0.5);

    runTicks(runtime, DOWN, 30);

    expect(runtime.getSnapshot().player.position.y)
      .toBeLessThanOrEqual(-PLAYER_COLLISION_FOOTPRINT.halfDepth);
    expect(runtime.getSnapshot().player.collision.blockedY).toBe(true);
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

  it('always clamps to the nearest physical boundary even inside epsilon distance', () => {
    const nearBoundary = PLAYER_COLLISION_FOOTPRINT.halfWidth + 0.02;
    const fartherBoundary = nearBoundary + TECH008_MAX_EPSILON_WU / 2;
    const near = createStaticSolidAabb(
      'z-near',
      nearBoundary,
      -1,
      nearBoundary + 0.25,
      1,
    );
    const farther = createStaticSolidAabb(
      'a-farther',
      fartherBoundary,
      -1,
      fartherBoundary + 0.25,
      1,
    );
    const runtime = createRuntime([near, farther]);

    runTicks(runtime, RIGHT, 1);

    const player = runtime.getSnapshot().player;
    expect(player.position.x).toBeCloseTo(0.02, 14);
    expect(player.collision.hitSolidX).toBe('z-near');
    expect(player.collision.blockedX).toBe(true);
  });

  it('distinguishes exact endpoint contact from continued blocked input', () => {
    const oneTickDelta = PLAYER_MOVEMENT_CONFIG.cardinalDeltaPerTick;
    const wallMinX = PLAYER_COLLISION_FOOTPRINT.halfWidth + oneTickDelta;
    const wall = createStaticSolidAabb(
      'endpoint-wall',
      wallMinX,
      -1,
      wallMinX + 0.25,
      1,
    );
    const runtime = createRuntime([wall]);

    runTicks(runtime, RIGHT, 1);

    const endpointContact = runtime.getSnapshot().player;
    expect(endpointContact.position.x).toBe(oneTickDelta);
    expect(endpointContact.collision.hitSolidX).toBe('endpoint-wall');
    expect(endpointContact.collision.blockedX).toBe(false);
    expect(endpointContact.locomotionState).toBe('MOVING');
    expect(endpointContact.resolvedVelocity.x)
      .toBe(PLAYER_MOVEMENT_CONFIG.baseMoveSpeed);

    runTicks(runtime, RIGHT, 1, 2);

    const continuedContact = runtime.getSnapshot().player;
    expect(continuedContact.position.x).toBe(oneTickDelta);
    expect(continuedContact.collision.hitSolidX).toBe('endpoint-wall');
    expect(continuedContact.collision.blockedX).toBe(true);
    expect(continuedContact.locomotionState).toBe('COLLISION-CONSTRAINED');
    expect(continuedContact.resolvedVelocity.x).toBe(0);
  });

  it('T10 varies the production presentation frame seam without changing collision', () => {
    const wall = createStaticSolidAabb('wall', 2, -2, 2.5, 2);
    const first = createRuntime([wall], 1.5, 0);
    const second = createRuntime([wall], 1.5, 0);

    runTicks(first, RIGHT, 20);
    runTicks(second, RIGHT, 20);

    const firstPlayer = first.getSnapshot().player;
    const secondPlayer = second.getSnapshot().player;
    expect(firstPlayer).toEqual(secondPlayer);

    const camera = new CameraPresenter();
    camera.snapTo(firstPlayer.position);
    const cameraPosition = camera.getPosition();

    const smallFrame: PlayerPresentationFrame = Object.freeze({
      widthPx: 16,
      heightPx: 24,
      bodyWidthPx: 12,
      bodyHeightPx: 22,
    });
    const largeFrame: PlayerPresentationFrame = Object.freeze({
      widthPx: 64,
      heightPx: 96,
      bodyWidthPx: 48,
      bodyHeightPx: 88,
    });

    const smallProjection = projectPlayerPresentation(
      firstPlayer,
      cameraPosition,
      smallFrame,
    );
    const largeProjection = projectPlayerPresentation(
      secondPlayer,
      cameraPosition,
      largeFrame,
    );

    expect(smallProjection.anchorX).toBe(largeProjection.anchorX);
    expect(smallProjection.anchorY).toBe(largeProjection.anchorY);
    expect(smallProjection.frameRight - smallProjection.frameLeft).toBe(16);
    expect(largeProjection.frameRight - largeProjection.frameLeft).toBe(64);
    expect(firstPlayer.position.x).toBe(1.6875);
    expect(firstPlayer.collision.blockedX).toBe(true);
  });

  it('T11 keeps authoritative state identical across real host render cadences', () => {
    function runWithCadence(
      simulationStepsPerRender: number,
      renderFrames: number,
    ) {
      const runtime = createRuntime([]);
      const scheduler = new DeterministicFrameScheduler();
      const camera = new CameraPresenter();
      let presentationRenderCount = 0;

      const host = new FixedStepHost({
        onStep: (step) => {
          runtime.submitInput('test-player', UP_RIGHT);
          runtime.step(step);
        },
        onRender: () => {
          const snapshot = runtime.getSnapshot();
          camera.update(
            snapshot.player.position,
            simulationStepsPerRender * SIMULATION_STEP_SECONDS,
          );
          projectPlayerPresentation(
            snapshot.player,
            camera.getPosition(),
          );
          presentationRenderCount += 1;
        },
      }, scheduler);

      host.start();

      for (let frame = 0; frame < renderFrames; frame += 1) {
        scheduler.advanceBy(
          simulationStepsPerRender * SIMULATION_STEP_SECONDS * 1000,
        );
      }

      host.stop();

      return {
        snapshot: runtime.getSnapshot(),
        presentationRenderCount,
      };
    }

    const sixtyFps = runWithCadence(1, 12);
    const twentyFps = runWithCadence(3, 4);

    expect(sixtyFps.presentationRenderCount).toBe(12);
    expect(twentyFps.presentationRenderCount).toBe(4);
    expect(Number(sixtyFps.snapshot.tick)).toBe(12);
    expect(Number(twentyFps.snapshot.tick)).toBe(12);
    expect(sixtyFps.snapshot).toEqual(twentyFps.snapshot);
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
