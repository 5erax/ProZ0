import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { SIMULATION_HZ } from '../../src/foundation';
import {
  createChunkCoord,
  fromWorldPosition,
} from '../../src/world/chunks/ChunkCoord';
import {
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';
import {
  isExplorationCellKnown,
} from '../../src/world/phase1/ExplorationGrid';
import {
  createPhase1WorldStore,
} from '../../src/world/phase1/Phase1WorldStore';
import { MemoryPhase1WorldPersistence } from '../helpers/MemoryPhase1WorldPersistence';

describe('Phase 1 world store', () => {
  it('persists shared radial fog across temporary chunk streaming and reload', async () => {
    const persistence = new MemoryPhase1WorldPersistence();
    const catalog = createPhase1ContentCatalog();
    const first = createPhase1WorldStore({
      worldSeed: 'phase1-test-world',
      catalog,
      persistence,
    });

    await first.initialize();
    const changed = await first.revealResolvedPlayerPosition({ x: 0, y: 0 });
    expect(changed).toBeGreaterThan(0);

    const second = createPhase1WorldStore({
      worldSeed: 'phase1-test-world',
      catalog,
      persistence,
    });
    await second.initialize();

    const coord = createChunkCoord(0, 0);
    const view = await second.requestActive(coord);
    expect(view.delta.exploration.revision).toBeGreaterThan(0);
    expect(
      isExplorationCellKnown(
        coord,
        view.delta.exploration,
        0,
        0,
      ),
    ).toBe(true);
  });

  it('depletes and regenerates finite resources only on active authority time', async () => {
    const persistence = new MemoryPhase1WorldPersistence();
    const catalog = createPhase1ContentCatalog();
    const store = createPhase1WorldStore({
      worldSeed: 'p1-world-golden',
      catalog,
      persistence,
    });
    await store.initialize();

    const coord = createChunkCoord(0, 0);
    const view = await store.requestActive(coord);
    const fiber = view.base.entities.find(
      (entity) =>
        entity.type === 'resource'
        && entity.definitionId === 'resource:fiber-plant',
    );
    expect(fiber).toBeDefined();
    if (fiber === undefined) {
      throw new Error('Fiber fixture missing.');
    }

    let revision = 0;
    for (let index = 0; index < 4; index += 1) {
      const result = store.commitResourceGather(
        fiber.entityId,
        revision,
        0,
      );
      expect(result.changed).toBe(true);
      revision = result.state.revision;
    }

    expect(store.getResourceState(fiber.entityId)).toMatchObject({
      revision: 4,
      remainingGatherActions: 0,
      depleted: true,
      regenerationReadyTick: 600 * SIMULATION_HZ,
    });

    await store.advanceEnvironment(600 * SIMULATION_HZ - 1);
    expect(store.getResourceState(fiber.entityId)?.depleted).toBe(true);

    await store.advanceEnvironment(600 * SIMULATION_HZ);
    expect(store.getResourceState(fiber.entityId)).toMatchObject({
      revision: 5,
      remainingGatherActions: 4,
      depleted: false,
      regenerationReadyTick: null,
    });

    await store.flushEnvironment();
    await store.releaseInterest(coord);

    const reloaded = createPhase1WorldStore({
      worldSeed: 'p1-world-golden',
      catalog,
      persistence,
    });
    await reloaded.initialize();
    const restored = await reloaded.requestActive(coord);
    expect(restored.delta.resourceStates[0]).toMatchObject({
      revision: 5,
      remainingGatherActions: 4,
      depleted: false,
      regenerationReadyTick: null,
    });
  });

  it('persists one shared ruin discovery/reward state without duplicating investigation', async () => {
    const persistence = new MemoryPhase1WorldPersistence();
    const catalog = createPhase1ContentCatalog();
    const worldSeed = 'p1-world-golden';
    const landmarks = getPhase1WorldLandmarks(worldSeed);
    const store = createPhase1WorldStore({
      worldSeed,
      catalog,
      persistence,
    });
    await store.initialize();

    await store.revealResolvedPlayerPosition(landmarks.ruinPosition);

    const coord = fromWorldPosition(landmarks.ruinPosition);
    const view = await store.requestActive(coord);
    const ruin = view.base.entities.find((entity) => entity.type === 'ruin');
    expect(ruin).toBeDefined();
    if (ruin === undefined || ruin.type !== 'ruin') {
      throw new Error('Ruin fixture missing.');
    }

    const located = store.getRuinState(ruin.entityId);
    expect(located).toMatchObject({
      revision: 1,
      discoveryState: 'located',
      physicalRewardState: 'unspawned',
    });

    const investigated = store.investigateRuin(
      ruin.entityId,
      located?.revision ?? -1,
    );
    expect(investigated).toMatchObject({
      changed: true,
      rewardItemId: 'item:ancient-alloy-shard',
      rewardQuantity: 1,
      state: {
        revision: 2,
        discoveryState: 'investigated',
        physicalRewardState: 'claimable',
      },
    });

    const duplicate = store.investigateRuin(
      ruin.entityId,
      investigated.state.revision,
    );
    expect(duplicate).toMatchObject({
      changed: false,
      rewardItemId: null,
      rewardQuantity: 0,
    });

    const claimed = store.markRuinRewardClaimed(
      ruin.entityId,
      investigated.state.revision,
    );
    expect(claimed).toMatchObject({
      revision: 3,
      discoveryState: 'investigated',
      physicalRewardState: 'claimed',
    });

    await store.releaseInterest(coord);

    const reopened = createPhase1WorldStore({
      worldSeed,
      catalog,
      persistence,
    });
    await reopened.initialize();
    const restored = await reopened.requestActive(coord);
    expect(restored.delta.ruinStates).toContainEqual(
      expect.objectContaining({
        ruinEntityId: ruin.entityId,
        revision: 3,
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      }),
    );
  });

  it('fails chunk materialization on corrupt persisted delta instead of regenerating clean state', async () => {
    const persistence = new MemoryPhase1WorldPersistence();
    const catalog = createPhase1ContentCatalog();
    const first = createPhase1WorldStore({
      worldSeed: 'p1-world-golden',
      catalog,
      persistence,
    });
    await first.initialize();

    const coord = createChunkCoord(0, 0);
    const view = await first.requestActive(coord);
    const fiber = view.base.entities.find((entity) => entity.type === 'resource');
    if (fiber === undefined || fiber.type !== 'resource') {
      throw new Error('Resource fixture missing.');
    }
    first.commitResourceGather(fiber.entityId, 0, 0);
    await first.releaseInterest(coord);

    const saved = persistence.chunks.get('0:0');
    expect(saved).toBeDefined();
    if (saved === undefined) {
      throw new Error('Expected persisted chunk delta.');
    }

    persistence.putChunk({
      ...saved,
      baseGenerationFingerprint: 'corrupt-base-fingerprint',
    });

    const second = createPhase1WorldStore({
      worldSeed: 'p1-world-golden',
      catalog,
      persistence,
    });
    await second.initialize();

    await expect(second.requestActive(coord)).rejects.toThrow(
      /base generation fingerprint mismatch/,
    );
    expect(second.getMeta(coord)?.lifecycle).toBe('FAILED');
    expect(second.query(coord)).toBeUndefined();
  });

  it('places local, expedition predator, and ruin landmarks inside approved travel bands', () => {
    const landmarks = getPhase1WorldLandmarks('p1-world-golden');
    const distance = (x: number, y: number) => Math.hypot(x, y);

    expect(distance(
      landmarks.predatorPosition.x,
      landmarks.predatorPosition.y,
    )).toBeGreaterThanOrEqual(2.8125 * 60);
    expect(distance(
      landmarks.predatorPosition.x,
      landmarks.predatorPosition.y,
    )).toBeLessThanOrEqual(2.8125 * 150);

    expect(distance(
      landmarks.ruinPosition.x,
      landmarks.ruinPosition.y,
    )).toBeGreaterThanOrEqual(2.8125 * 120);
    expect(distance(
      landmarks.ruinPosition.x,
      landmarks.ruinPosition.y,
    )).toBeLessThanOrEqual(2.8125 * 240);
  });
});
