import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
} from '../../src/world/chunks/ChunkCoord';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
  derivePhase1GeneratedEntityId,
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';
import {
  createPhase1EnvironmentState,
} from '../../src/world/phase1/Phase1Environment';

describe('Phase 1 world deterministic generation', () => {
  const catalog = createPhase1ContentCatalog();

  it('locks exact canonical landing-chunk output for a fixed seed', () => {
    const generator = new Phase1ChunkGenerator(catalog);
    const generated = generator.generate({
      worldSeed: 'p1-world-golden',
      coord: createChunkCoord(0, 0),
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
    });

    expect(generated.contentCompatibility.canonicalFingerprint).toBe(
      '3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c',
    );
    expect(generated.generationSeed).toEqual([
      1459385696,
      2403860609,
      1252396350,
      1861302902,
    ]);
    expect(generated.generationFingerprint).toEqual([
      3557513750,
      530554215,
      348549188,
      3127413865,
    ]);
    expect(generated.baseGenerationFingerprint).toBe(
      'phase1-base-v1:fnv1a32-phase1-base-v1:generation-3:3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c:d48e56d0',
    );
    expect(generated.entities).toEqual([
      {
        type: 'resource',
        entityId:
          'generated:resource:9af3ba4ac9b2152e7cbfe61ab63a5c7f',
        definitionId: 'resource:fiber-plant',
        position: { x: 18, y: 10 },
      },
    ]);
  });

  it('guarantees the accepted nine-node local field and Journey-A material budget', () => {
    const generator = new Phase1ChunkGenerator(catalog);
    const localResources = [];

    for (let y = -3; y <= 2; y += 1) {
      for (let x = -3; x <= 2; x += 1) {
        const generated = generator.generate({
          worldSeed: 'p1-world-golden',
          coord: createChunkCoord(x, y),
          generationVersion: PHASE1_WORLD_GENERATION_VERSION,
        });
        for (const entity of generated.entities) {
          if (entity.type !== 'resource') continue;
          const distance = Math.hypot(
            entity.position.x,
            entity.position.y,
          );
          if (distance <= 68) {
            localResources.push(entity);
          }
        }
      }
    }

    expect(localResources).toHaveLength(9);
    const counts = new Map<string, number>();
    for (const resource of localResources) {
      const distance = Math.hypot(
        resource.position.x,
        resource.position.y,
      );
      expect(distance).toBeGreaterThan(15);
      expect(distance).toBeLessThanOrEqual(68);
      counts.set(
        resource.definitionId,
        (counts.get(resource.definitionId) ?? 0) + 1,
      );
    }
    expect(Object.fromEntries(counts)).toEqual({
      'resource:fiber-plant': 2,
      'resource:food-plant': 2,
      'resource:potable-water-source': 1,
      'resource:timber-source': 2,
      'resource:stone-outcrop': 1,
      'resource:metal-ore-node': 1,
    });

    const sectors = new Map<string, number>();
    for (const resource of localResources) {
      const sector = [
        resource.position.x > 0 ? 'east' : 'west',
        resource.position.y > 0 ? 'south' : 'north',
      ].join('-');
      sectors.set(sector, (sectors.get(sector) ?? 0) + 1);
    }
    expect(sectors.size).toBeGreaterThanOrEqual(4);
    expect(Math.max(...sectors.values())).toBeLessThanOrEqual(3);

    for (const definitionId of [
      'resource:fiber-plant',
      'resource:food-plant',
      'resource:timber-source',
    ] as const) {
      const duplicateSectors = new Set(
        localResources
          .filter((entry) => entry.definitionId === definitionId)
          .map((entry) => [
            entry.position.x > 0 ? 'east' : 'west',
            entry.position.y > 0 ? 'south' : 'north',
          ].join('-')),
      );
      expect(duplicateSectors.size).toBe(2);
    }

    const nearby = localResources
      .map((entry) => ({
        definitionId: entry.definitionId,
        distance: Math.hypot(entry.position.x, entry.position.y),
      }));
    expect(Math.min(...nearby.map((entry) => entry.distance)))
      .toBeLessThanOrEqual(24);
    expect(new Set(
      nearby
        .filter((entry) => entry.distance <= 32)
        .map((entry) => entry.definitionId),
    ).size).toBeGreaterThanOrEqual(2);

    const potential = new Map<string, number>();
    for (const resource of localResources) {
      const definition = catalog.getAs(resource.definitionId, 'resource');
      if (definition.maxGatherActions === null) continue;
      const itemId = definition.output.itemId;
      potential.set(
        itemId,
        (potential.get(itemId) ?? 0)
          + definition.output.quantity * definition.maxGatherActions,
      );
    }

    expect(potential.get('item:plant-fiber')).toBeGreaterThanOrEqual(16);
    expect(potential.get('item:timber')).toBeGreaterThanOrEqual(10);
    expect(potential.get('item:stone')).toBeGreaterThanOrEqual(8);
    expect(potential.get('item:edible-plant')).toBeGreaterThanOrEqual(6);
    expect(potential.get('item:metal-ore')).toBeGreaterThanOrEqual(6);
    expect(
      localResources.some(
        (entry) =>
          entry.definitionId === 'resource:potable-water-source',
      ),
    ).toBe(true);

    // Storage + Workbench require 4 Cordage = 12 Fiber, 8 Timber, 4 Stone.
    expect(potential.get('item:plant-fiber') ?? 0).toBeGreaterThanOrEqual(12);
    expect(potential.get('item:timber') ?? 0).toBeGreaterThanOrEqual(8);
    expect(potential.get('item:stone') ?? 0).toBeGreaterThanOrEqual(4);

    // Habitat + Power + Machine still exceed the local field:
    // 24 Fiber, 14 Timber, 6 Stone, 11 Ore after Cordage conversion.
    expect(
      (potential.get('item:plant-fiber') ?? 0) < 24
      || (potential.get('item:timber') ?? 0) < 14
      || (potential.get('item:stone') ?? 0) < 6
      || (potential.get('item:metal-ore') ?? 0) < 11,
    ).toBe(true);
  });

  it('keeps expedition resources inside 96–430 WU with 65–75% deterministic bearing density and 2–3 nodes', () => {
    const generator = new Phase1ChunkGenerator(catalog);
    let eligibleChunks = 0;
    let resourceBearingChunks = 0;

    for (let y = -14; y <= 13; y += 1) {
      for (let x = -14; x <= 13; x += 1) {
        const coord = createChunkCoord(x, y);
        const centerX =
          coord.x * CHUNK_SPAN_WORLD_UNITS
          + CHUNK_SPAN_WORLD_UNITS / 2;
        const centerY =
          coord.y * CHUNK_SPAN_WORLD_UNITS
          + CHUNK_SPAN_WORLD_UNITS / 2;
        const centerDistance = Math.hypot(centerX, centerY);
        if (centerDistance < 96 || centerDistance > 430) {
          continue;
        }
        eligibleChunks += 1;

        const generated = generator.generate({
          worldSeed: 'p1-world-golden',
          coord,
          generationVersion: PHASE1_WORLD_GENERATION_VERSION,
        });
        const expeditionResources = generated.entities.filter(
          (entity) =>
            entity.type === 'resource'
            && Math.hypot(entity.position.x, entity.position.y) >= 96,
        );

        if (expeditionResources.length > 0) {
          resourceBearingChunks += 1;
          expect(expeditionResources.length).toBeGreaterThanOrEqual(2);
          expect(expeditionResources.length).toBeLessThanOrEqual(3);
        }
        for (const resource of expeditionResources) {
          const distance = Math.hypot(
            resource.position.x,
            resource.position.y,
          );
          expect(distance).toBeGreaterThanOrEqual(96);
          expect(distance).toBeLessThanOrEqual(430);
        }
      }
    }

    const bearingRatio = resourceBearingChunks / eligibleChunks;
    expect(bearingRatio).toBeGreaterThanOrEqual(0.65);
    expect(bearingRatio).toBeLessThanOrEqual(0.75);
  });

  it('locks the one ruin fixture, stable ID, route, and base fingerprint', () => {
    const landmarks = getPhase1WorldLandmarks('p1-world-golden');
    expect(landmarks).toEqual({
      landingPosition: { x: 0, y: 0 },
      ruinPosition: { x: -392, y: 0 },
      predatorPosition: { x: -224, y: -24 },
      routeCardinal: 'west',
    });

    const generated = new Phase1ChunkGenerator(catalog).generate({
      worldSeed: 'p1-world-golden',
      coord: createChunkCoord(-13, 0),
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
    });

    expect(generated.generationSeed).toEqual([
      3594170994,
      4015969615,
      2340749809,
      2400525720,
    ]);
    expect(generated.generationFingerprint).toEqual([
      3586094214,
      3481858103,
      3034780435,
      14758211,
    ]);
    expect(generated.baseGenerationFingerprint).toBe(
      'phase1-base-v1:fnv1a32-phase1-base-v1:generation-3:3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c:25a9a511',
    );
    expect(generated.entities).toContainEqual({
      type: 'ruin',
      entityId: 'generated:ruin:435d74921c6ff3129122741cb61c2b3a',
      definitionId: 'ruin:previous-civilization-ruin',
      position: { x: -392, y: 0 },
    });
  });


  it('binds generated entity identity to content compatibility and not request order', () => {
    const baseInput = {
      worldSeed: 'entity-id-contract',
      contentCompatibility: catalog.compatibility,
      kind: 'resource',
      definitionId: 'resource:fiber-plant' as const,
      coord: createChunkCoord(-7, 11),
      ordinal: 'candidate:3',
    };

    const first = derivePhase1GeneratedEntityId(baseInput);
    const other = derivePhase1GeneratedEntityId({
      ...baseInput,
      coord: createChunkCoord(4, -2),
      ordinal: 'candidate:9',
    });

    const reverseOther = derivePhase1GeneratedEntityId({
      ...baseInput,
      coord: createChunkCoord(4, -2),
      ordinal: 'candidate:9',
    });
    const reverseFirst = derivePhase1GeneratedEntityId(baseInput);

    expect(reverseFirst).toBe(first);
    expect(reverseOther).toBe(other);

    expect(
      derivePhase1GeneratedEntityId({
        ...baseInput,
        contentCompatibility: {
          ...catalog.compatibility,
          canonicalFingerprint:
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      }),
    ).not.toBe(first);
  });

  it('is independent from chunk request order', () => {
    const a = {
      worldSeed: 'order-world',
      coord: createChunkCoord(-3, 5),
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
    };
    const b = {
      worldSeed: 'order-world',
      coord: createChunkCoord(8, -4),
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
    };

    const first = new Phase1ChunkGenerator(catalog);
    const firstA = first.generate(a);
    const firstB = first.generate(b);

    const second = new Phase1ChunkGenerator(catalog);
    const secondB = second.generate(b);
    const secondA = second.generate(a);

    expect(secondA).toEqual(firstA);
    expect(secondB).toEqual(firstB);
  });

  it('locks the first-session Cold Rain deterministic schedule', () => {
    const environment = createPhase1EnvironmentState(
      'p1-world-golden',
      catalog,
    );

    expect(environment).toEqual({
      activeTick: 0,
      cycleStartLocalMinute: 540,
      weatherEvents: [
        {
          weatherEventId:
            'weather-event:cold-rain:4cf980704bf06b77eadbc24acaaeaa02',
          weatherDefinitionId: 'weather:cold-rain',
          revision: 0,
          startTick: 134875,
          warningStartTick: 131275,
          endTick: 156475,
        },
      ],
    });
  });
});
