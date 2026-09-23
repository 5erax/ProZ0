import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { createWorldPosition } from '../../src/foundation';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  buildingSnapshotToRecordsV2,
  chunkRecordV2ToWorldSlice,
  createPhase1SaveV2Compatibility,
  migratePortableSaveBundleV1ToV2,
  playerRecordV2ToProgressionSnapshot,
  playerRecordV2ToSurvivalState,
  playerStateToRecordV2,
  recordsV2ToBuildingSnapshot,
  validatePortableSaveBundleV2,
  worldSliceChunkToRecordV2,
  type ContainerRecordV2,
  type PortableSaveBundleV2,
} from '../../src/persistence';
import type { PlayerProgressionSnapshot } from '../../src/simulation/progression';
import type { PlayerSurvivalState } from '../../src/simulation/survival';
import {
  PHASE0_WORLD_GENERATION_VERSION,
  Phase1BuildingWorld,
  createChunkCoord,
  type BuildingWorldSnapshot,
} from '../../src/world';
import {
  PHASE1_EXPLORATION_WORD_COUNT,
  explorationRegionId,
} from '../../src/world/phase1/ExplorationGrid';
import type { PersistedPhase1WorldSliceChunkRecord } from '../../src/world/phase1/Phase1WorldPersistencePort';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import {
  makePortableBundle,
} from '../helpers/persistenceFixtures';

function migrationOptions() {
  const catalog = createPhase1ContentCatalog();
  return {
    catalog,
    resolveBaseGenerationFingerprint: ({
      worldSeed,
      generationVersion,
      coord,
    }: {
      readonly worldSeed: string;
      readonly generationVersion: number;
      readonly coord: { readonly x: number; readonly y: number };
    }) => `legacy-base-v1:${worldSeed}:g${generationVersion}:${coord.x},${coord.y}`,
  };
}

describe('Save V2 canonical runtime mapper round-trips', () => {
  it('round-trips dead player survival, equipment references, progression flags, quest state, and profession without persisting level', () => {
    const catalog = createPhase1ContentCatalog();
    const survival: PlayerSurvivalState = Object.freeze({
      playerId: 'player-1',
      revision: 7,
      tick: 500,
      healthMilli: 0,
      foodMilli: 61000,
      waterMilli: 57000,
      staminaMilli: 22000,
      temperatureMilli: 41000,
      waterDrainRemainder: 11,
      foodDrainRemainder: 12,
      thermalRemainder: 13,
      staminaRegenRemainder: 14,
      lastStaminaSpendTick: 480,
      nextCriticalDehydrationDamageTick: 560,
      nextCriticalStarvationDamageTick: null,
      nextTemperatureDamageTick: 550,
      lifeState: Object.freeze({
        type: 'dead-pending-respawn',
        deathId: 'death:player-1:500',
        respawnAtTick: 680,
        deathCause: 'hostile-attack',
        deathCacheEntityId: 'entity:death-cache:player-1:500',
      }),
    });
    const progression: PlayerProgressionSnapshot = Object.freeze({
      playerId: 'player-1',
      revision: 9,
      totalXp: 225,
      level: 3,
      milestoneRuleIds: Object.freeze([
        'first-gather:fiber-plant',
        'first-expedition-band-entry',
        'first-ruin-locate:previous-civilization-ruin',
        'first-ruin-inspect:previous-civilization-ruin',
      ]),
      repeatCounts: Object.freeze({ gather: 2, craft: 1, repair: 0 }),
      skillIds: Object.freeze(['skill:fieldcraft-basics'] as const),
      questStates: Object.freeze([
        Object.freeze({
          questId: 'profession-quest:chart-the-unknown' as const,
          completedObjectives: 3,
          completed: true,
        }),
        Object.freeze({
          questId: 'profession-quest:bring-water-online' as const,
          completedObjectives: 0,
          completed: false,
        }),
      ]),
      professionIds: Object.freeze(['profession:explorer-prototype'] as const),
      eventReceipts: Object.freeze([]),
    });

    const record = playerStateToRecordV2({
      worldId: 'world-alpha',
      playerId: 'player-1',
      playerRevision: 12,
      authorityTick: 500,
      position: createWorldPosition(9, -3),
      facing: 'W',
      inventoryContainerId: 'container:player-1',
      equippedWeaponStackId: 'stack:spear',
      equippedThermalWrapStackId: 'stack:wrap',
      survival,
      progression,
    }, catalog);

    expect(record.progression).not.toHaveProperty('level');
    expect(record.equipment).toEqual({
      equippedWeaponStackId: 'stack:spear',
      equippedThermalWrapStackId: 'stack:wrap',
    });
    expect(playerRecordV2ToSurvivalState(record, 500)).toEqual(survival);
    expect(playerRecordV2ToProgressionSnapshot(record, catalog)).toEqual(
      progression,
    );
  });

  it('round-trips fog/resource/ruin world delta and preserves predator/dead state plus runtime-created identities', () => {
    const catalog = createPhase1ContentCatalog();
    const coord = createChunkCoord(2, -3);
    const words = Array.from(
      { length: PHASE1_EXPLORATION_WORD_COUNT },
      (_, index) => index === 0 ? 0b10101 : 0,
    );
    const slice: PersistedPhase1WorldSliceChunkRecord = Object.freeze({
      coord,
      generationVersion: PHASE0_WORLD_GENERATION_VERSION,
      revision: 8,
      generated: true,
      baseGenerationFingerprint: 'base:2:-3',
      contentCompatibility: catalog.compatibility,
      resourceStates: Object.freeze([
        Object.freeze({
          resourceEntityId: 'resource-entity:fiber:1',
          revision: 4,
          remainingGatherActions: 0,
          depleted: true,
          regenerationReadyTick: 900,
        }),
      ]),
      ruinStates: Object.freeze([
        Object.freeze({
          ruinEntityId: 'ruin-entity:1',
          ruinDefinitionId: 'ruin:previous-civilization-ruin',
          revision: 3,
          discoveryState: 'investigated',
          physicalRewardState: 'claimed',
        }),
      ]),
      exploration: Object.freeze({
        regionId: explorationRegionId(coord),
        revision: 5,
        words: Object.freeze(words),
      }),
    });

    const record = worldSliceChunkToRecordV2('world-alpha', slice, {
      predatorStates: Object.freeze([
        Object.freeze({
          entityId: 'predator:1',
          revision: 6,
          health: 0,
          state: 'dead',
          targetPlayerId: null,
          stateUntilTick: null,
          encounterAnchor: Object.freeze({ x: 16, y: -24 }),
        }),
      ]),
      createdEntities: Object.freeze([
        Object.freeze({
          type: 'ground-drop',
          entityId: 'drop:1',
          revision: 2,
          position: Object.freeze({ x: 17, y: -23 }),
          containerId: 'container:drop:1',
        }),
      ]),
      structureIds: Object.freeze(['structure-instance:crate-1']),
      removedGeneratedEntityIds: Object.freeze(['generated:removed:1']),
    });

    expect(record.predatorStates[0]).toMatchObject({
      entityId: 'predator:1',
      state: 'dead',
      health: 0,
    });
    expect(record.createdEntities[0]).toMatchObject({
      entityId: 'drop:1',
      containerId: 'container:drop:1',
    });
    expect(record.structureIds).toEqual(['structure-instance:crate-1']);
    expect(record.removedGeneratedEntityIds).toEqual(['generated:removed:1']);

    expect(chunkRecordV2ToWorldSlice(record)).toEqual(slice);
  });

  it('reconstructs structures, connectors, derived power capacity, and Condenser progress without persisting derived capacity or duplicate output reference', () => {
    const catalog = createPhase1ContentCatalog();
    const snapshot: BuildingWorldSnapshot = Object.freeze({
      foothold: Object.freeze({
        footholdId: 'foothold:landing',
        buildRevision: 5,
        structures: Object.freeze([
          Object.freeze({
            structureId: 'structure-instance:landing-module',
            definitionId: 'structure:landing-module',
            revision: 0,
            position: createWorldPosition(0, 0),
            orientationQuarterTurns: 0,
            placedByPlayerId: null,
            containerId: null,
            placementOperationFingerprint: null,
          }),
          Object.freeze({
            structureId: 'structure-instance:power',
            definitionId: 'structure:compact-power-unit',
            revision: 2,
            position: createWorldPosition(2, 0),
            orientationQuarterTurns: 0,
            placedByPlayerId: 'player-1',
            containerId: null,
            placementOperationFingerprint: 'place:power',
          }),
          Object.freeze({
            structureId: 'structure-instance:condenser',
            definitionId: 'structure:atmospheric-water-condenser',
            revision: 4,
            position: createWorldPosition(3.5, 0),
            orientationQuarterTurns: 0,
            placedByPlayerId: 'player-1',
            containerId: 'container:condenser:output',
            placementOperationFingerprint: 'place:condenser',
          }),
        ]),
        connectors: Object.freeze(
          ['east', 'south', 'west', 'north'].map((key) => Object.freeze({
            connectorId: `connector:landing:${key}`,
            structureId: 'structure-instance:landing-module',
            localConnectorKey: key,
            occupiedByConnectionId: null,
          })),
        ),
        connections: Object.freeze([]),
        power: Object.freeze({
          revision: 3,
          producerStructureId: 'structure-instance:power',
          capacityPu: 10,
          grantedConsumerIds: Object.freeze(['structure-instance:condenser']),
        }),
        condensers: Object.freeze([
          Object.freeze({
            structureId: 'structure-instance:condenser',
            revision: 4,
            enabled: true,
            productionProgressTicks: 321,
            completedCycleOrdinal: 2,
            outputContainerId: 'container:condenser:output',
          }),
        ]),
        recentDismantles: Object.freeze([]),
      }),
    });

    const persisted = buildingSnapshotToRecordsV2('world-alpha', snapshot);
    expect(persisted.foothold.powerNetwork).not.toHaveProperty('capacityPu');
    const condenser = persisted.structures.find(
      (entry) => entry.structureId === 'structure-instance:condenser',
    );
    expect(condenser?.outputContainerId).toBe('container:condenser:output');
    expect(condenser?.machine).not.toHaveProperty('outputContainerId');
    expect(condenser?.placementOperationFingerprint).toBe(
      'place:condenser',
    );
    expect(
      persisted.structures.find(
        (entry) => entry.structureId === 'structure-instance:power',
      )?.placementOperationFingerprint,
    ).toBe('place:power');

    const output: ContainerRecordV2 = Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'container',
      worldId: 'world-alpha',
      containerId: 'container:condenser:output',
      kind: 'machine-output',
      revision: 4,
      owner: Object.freeze({
        type: 'structure',
        structureId: 'structure-instance:condenser',
      }),
      stacks: Object.freeze([]),
    });
    const restored = recordsV2ToBuildingSnapshot(
      persisted.foothold,
      persisted.structures,
      [output],
      catalog,
    );
    expect(restored.foothold.power.capacityPu).toBe(10);
    expect(restored.foothold.condensers[0]).toMatchObject({
      productionProgressTicks: 321,
      completedCycleOrdinal: 2,
      outputContainerId: 'container:condenser:output',
    });
    expect(
      restored.foothold.structures.find(
        (entry) => entry.structureId === 'structure-instance:condenser',
      )?.placementOperationFingerprint,
    ).toBe('place:condenser');
    const reconstructed = new Phase1BuildingWorld(
      new Phase1BuildingTestSpatial(),
      restored,
    ).exportSnapshot();
    expect(reconstructed.foothold.power).toEqual(restored.foothold.power);
    expect(reconstructed.foothold.condensers).toEqual(
      restored.foothold.condensers,
    );
    expect(
      reconstructed.foothold.structures
        .map((entry) => entry.structureId)
        .sort(),
    ).toEqual(
      restored.foothold.structures
        .map((entry) => entry.structureId)
        .sort(),
    );
  });

  it('fails closed for corrupt V1 input and deterministic weather/chunk identity drift', () => {
    const catalog = createPhase1ContentCatalog();
    const corruptV1 = {
      ...makePortableBundle(),
      chunks: [{
        ...makePortableBundle().chunks[0],
        generated: false,
      }],
    };
    expect(
      migratePortableSaveBundleV1ToV2(
        corruptV1 as never,
        migrationOptions(),
      ),
    ).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });

    const migrated = migratePortableSaveBundleV1ToV2(
      makePortableBundle(),
      migrationOptions(),
    );
    if (!migrated.ok) throw new Error(migrated.message);
    const policy = createPhase1SaveV2Compatibility(
      catalog,
      [
        PHASE0_WORLD_GENERATION_VERSION,
        PHASE0_WORLD_GENERATION_VERSION + 1,
      ],
    );

    const weather = migrated.value.world.environment.weatherEvents[0];
    if (weather === undefined) throw new Error('Expected Cold Rain event.');
    const wrongWeather: PortableSaveBundleV2 = {
      ...migrated.value,
      world: {
        ...migrated.value.world,
        environment: {
          ...migrated.value.world.environment,
          weatherEvents: [{
            ...weather,
            startTick: weather.startTick + 1,
            warningStartTick: weather.warningStartTick + 1,
            endTick: weather.endTick + 1,
          }],
        },
      },
    };
    expect(validatePortableSaveBundleV2(wrongWeather, policy)).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });

    const wrongGeneration: PortableSaveBundleV2 = {
      ...migrated.value,
      chunks: migrated.value.chunks.map((chunk) => ({
        ...chunk,
        generationVersion: PHASE0_WORLD_GENERATION_VERSION + 1,
      })),
    };
    expect(
      validatePortableSaveBundleV2(wrongGeneration, policy),
    ).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_GENERATION_VERSION',
    });
  });
});
