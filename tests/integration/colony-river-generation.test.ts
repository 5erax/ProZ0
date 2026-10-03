import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';
import { upgradeColonyEcosystem } from '../../src/persistence/migrations/ColonyEcosystemUpgrade';
import { projectPhase1ProductReviewMapPanel } from '../../src/client/runtime/Phase1ProductReviewMapProjection';
import { colonyHostedScene } from '../../src/integration/ColonyHostedScene';
import { Phase1ChunkGenerator } from '../../src/world/phase1/Phase1ChunkGenerator';
import { createChunkCoord, fromWorldPosition } from '../../src/world/chunks/ChunkCoord';
import { PHASE1_STRUCTURE_PLACEMENT_PROFILES } from '../../src/world/building/Phase1BuildingWorld';
import { colonyRiverLandmarks, colonyRiverTerrainAt, colonyWaterAt } from '../../src/world/phase2/ColonyHydrology';
import { colonyLandscapeTerrainAt } from '../../src/world/phase2/ColonyRegions';

it('river networks are seeded and continuous across global chunk borders, with shallow crossings and safe landing ground', () => {
  const generator = new Phase1ChunkGenerator(createPhase1ContentCatalog());
  const networks = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const seed = 'river-seed:' + i, landmarks = colonyRiverLandmarks(seed);
    networks.add(JSON.stringify(landmarks));
    expect(colonyRiverLandmarks(seed)).toEqual(landmarks);
    for (const point of [...landmarks.crossings, ...landmarks.confluences]) {
      const sample = colonyWaterAt(seed, point)!;
      expect(sample).not.toBeNull(); expect(sample.salinity).toBe('fresh');
      expect(colonyRiverTerrainAt(seed, point)).toBe('water');
      const coord = fromWorldPosition(point), request = { worldSeed: seed, coord, generationVersion: 5 };
      const before = generator.generate(request);
      generator.generate({ ...request, coord: createChunkCoord(coord.x + 1, coord.y - 1) });
      expect(generator.generate(request)).toEqual(before);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const position = { x: coord.x * 32 + x * 2 + 1, y: coord.y * 32 + y * 2 + 1 };
        expect(before.terrain.cells[y * 16 + x]).toBe(colonyRiverTerrainAt(seed, position));
      }
      for (const resource of before.entities.filter(e => e.type === 'resource' && e.definitionId !== 'resource:potable-water-source')) expect(colonyRiverTerrainAt(seed, resource.position)).toBe('ground');
    }
    for (const crossing of landmarks.crossings) { expect(colonyWaterAt(seed, crossing)!.crossing).toBe(true); expect(colonyWaterAt(seed, crossing)!.depthMeters).toBe(.25); }
    for (const point of [{ x: 0, y: 0 }, { x: 18, y: 10 }, { x: -36, y: -12 }]) expect(colonyRiverTerrainAt(seed, point)).toBe('ground');
  }
  expect(networks.size).toBe(20);
  expect(() => colonyWaterAt('seed', { x: NaN, y: 0 })).toThrow();
});

it('v5 river water agrees with movement, building, map, hosted scene and save/reopen; v3/v4 saves retain their terrain', async () => {
  const config = { worldId: 'world:rivers', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, worldGenerationVersion: 5, resourceProfileVersion: 1 as const, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
  const bundle = await Phase1AuthorityBundle.create(config); let reopened: Phase1AuthorityBundle | null = null;
  try {
    const point = colonyRiverLandmarks(config.worldSeed).crossings[0]!;
    const cell = { x: Math.floor(point.x / 2), y: Math.floor(point.y / 2) }, center = { x: cell.x * 2 + 1, y: cell.y * 2 + 1 };
    bundle.getRuntime('solo').relocatePlayer(center); await bundle.stepSolo();
    expect(bundle.world.getMovementSpeedMultiplier(center)).toBe(.7);
    expect(bundle.world.isBuildableGround(center, PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:storage-crate'], 0)).toBe(false);
    bundle.submitInput('solo', { moveUp: false, moveDown: false, moveLeft: false, moveRight: true });
    const before = bundle.getPlayerPosition('solo'); await bundle.stepSolo();
    expect(bundle.getPlayerPosition('solo').x - before.x).toBeCloseTo(2.8125 / 60 * .7, 6);
    const player = bundle.getRuntime('solo').getSnapshot().player;
    const map = projectPhase1ProductReviewMapPanel(bundle, 'solo', [{ playerId: 'solo', presentationIdentitySlot: 'LOCAL', authorityTick: bundle.authorityTick, lastProcessedInputSeq: -1, position: player.position, facing: player.facing, locomotionState: player.locomotionState }], 0);
    expect(map.spatial!.exploredCells).toContainEqual({ cellX: cell.x, cellY: cell.y, terrain: 'water', motif: 'none' });
    expect(colonyHostedScene(bundle, 'solo').terrain).toContainEqual({ ...center, terrain: 'water' });
    const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    const policy = createPhase1SaveV2Compatibility(bundle.catalog, [3,4,5]);
    const loaded = reconstructPhase1ReopenState({ ...request, formatId: request.world.formatId, schemaVersion: request.world.schemaVersion, recordKind: 'portable-bundle' }, policy);
    expect(loaded.ok).toBe(true); if (!loaded.ok) throw Error(loaded.message);
    expect(upgradeColonyEcosystem(loaded.value, bundle.catalog)).toBe(loaded.value);
    reopened = await Phase1AuthorityBundle.create({ ...config, reopen: loaded.value }); await reopened.stepSolo();
    expect(reopened.getWorldCompatibility().worldGenerationVersion).toBe(5);
    expect(reopened.world.getMovementSpeedMultiplier(center)).toBe(.7);
    expect(composePhase1SaveV2(reopened, { nowUtc: '2026-10-03T00:00:01Z' }).world.worldSeed).toBe(config.worldSeed);
    const generator = new Phase1ChunkGenerator(bundle.catalog), coord = fromWorldPosition(center);
    const legacy3 = generator.generate({ coord, worldSeed: config.worldSeed, generationVersion: 3 }), legacy4 = generator.generate({ coord, worldSeed: config.worldSeed, generationVersion: 4 });
    expect(legacy3.terrain).toEqual(legacy4.terrain);
    expect(legacy3.terrain.cells).not.toEqual(generator.generate({ coord, worldSeed: config.worldSeed, generationVersion: 5 }).terrain.cells);
    expect(colonyLandscapeTerrainAt(config.worldSeed, center, 'ground', 5)).toBe('ground');
  } finally { await reopened?.destroy(); await bundle.destroy(); }
});

it('generated resource views invalidate on chunk activation and release without leaving stale interactable entities', async () => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:cache', worldSeed: 'p1-world-golden', playerIds: ['solo'], worldGenerationVersion: 5, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  try {
    const before = bundle.world.getActiveGeneratedEntities(), coord = createChunkCoord(20,20);
    await bundle.world.activateCoord(coord);
    const after = bundle.world.getActiveGeneratedEntities();
    const added = after.filter(e => !before.some(old => old.entityId === e.entityId)); expect(added.length).toBeGreaterThan(0);
    expect(after.every(e => Object.isFrozen(e) && Object.isFrozen(e.position))).toBe(true);
    await bundle.world.releaseCoord(coord);
    expect(bundle.world.getActiveGeneratedEntities()).toEqual(before);
    expect(bundle.world.getActiveGeneratedEntities().some(e => added.some(old => old.entityId === e.entityId))).toBe(false);
  } finally { await bundle.destroy(); }
});
