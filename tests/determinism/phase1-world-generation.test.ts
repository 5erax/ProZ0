import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  createChunkCoord,
} from '../../src/world/chunks/ChunkCoord';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
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
      1019647624,
      3012870872,
      1319635487,
      3451020681,
    ]);
    expect(generated.generationFingerprint).toEqual([
      2468347456,
      2169107716,
      878942094,
      2049803912,
    ]);
    expect(generated.baseGenerationFingerprint).toBe(
      'phase1-base-v1:fnv1a32-phase1-base-v1:generation-2:3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c:38e0afc9',
    );
    expect(generated.entities).toEqual([
      {
        type: 'resource',
        entityId:
          'generated:resource:b7d898043d5b047598d39c5d4e5cc8cc',
        definitionId: 'resource:fiber-plant',
        position: { x: 18, y: 10 },
      },
    ]);
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
      3649120711,
      1196511147,
      564566834,
      3059098403,
    ]);
    expect(generated.generationFingerprint).toEqual([
      2776664386,
      4114925134,
      3693742601,
      751075795,
    ]);
    expect(generated.baseGenerationFingerprint).toBe(
      'phase1-base-v1:fnv1a32-phase1-base-v1:generation-2:3112727ee636e3ef24d0d3b0434475d86e95122592c9d2184e57114f37fc7f5c:9149283a',
    );
    expect(generated.entities).toContainEqual({
      type: 'ruin',
      entityId: 'generated:ruin:d91239a36ee4e1fb38480ba9f59020cd',
      definitionId: 'ruin:previous-civilization-ruin',
      position: { x: -392, y: 0 },
    });
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
