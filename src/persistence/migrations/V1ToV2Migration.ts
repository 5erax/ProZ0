import type { ContentCatalogV1 } from '../../content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  deriveSeedState,
} from '../../foundation';
import {
  PHASE1_EXPLORATION_WORD_COUNT,
  createEmptyExplorationFragment,
} from '../../world/phase1/ExplorationGrid';
import {
  createPhase1EnvironmentState,
  validatePhase1EnvironmentState,
} from '../../world/phase1/Phase1Environment';
import { saveFailure, saveSuccess, type SaveResult } from '../repository/SaveRepository';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';
import { validatePortableSaveBundleV1 } from '../validation/SaveValidator';
import type { ChunkRecordV2 } from '../schema/v2/ChunkRecordV2';
import type { ContainerRecordV2 } from '../schema/v2/ContainerRecordV2';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';
import type { WorldManifestV2 } from '../schema/v2/WorldManifestV2';

export interface V1ToV2MigrationOptions {
  readonly catalog: ContentCatalogV1;
  readonly resolveBaseGenerationFingerprint: (input: {
    readonly worldSeed: string;
    readonly generationVersion: number;
    readonly coord: { readonly x: number; readonly y: number };
  }) => string | null;
}

function stableMigrationInventoryId(
  worldSeed: string,
  worldId: string,
  playerId: string,
): string {
  const state = deriveSeedState({
    worldSeed,
    namespace: 'save-migration:v1-v2:player-inventory',
    stableIdentifiers: Object.freeze([worldId, playerId]),
  });
  return `container:migration-v1-v2:${state
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('')}`;
}

export function encodeExplorationWordsV2(words: readonly number[]): string {
  if (words.length !== PHASE1_EXPLORATION_WORD_COUNT) {
    throw new Error('Exploration word count is incompatible with Phase 1.');
  }
  let binary = '';
  for (const value of words) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new Error('Exploration words must be uint32 values.');
    }
    const v = value >>> 0;
    binary += String.fromCharCode(
      v & 0xff,
      (v >>> 8) & 0xff,
      (v >>> 16) & 0xff,
      (v >>> 24) & 0xff,
    );
  }
  return btoa(binary);
}

export function decodeExplorationWordsV2(encoded: string): readonly number[] {
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    throw new Error('Exploration bitset is not valid base64.');
  }
  if (binary.length !== PHASE1_EXPLORATION_WORD_COUNT * 4) {
    throw new Error('Exploration bitset byte length is invalid.');
  }
  const words: number[] = [];
  for (let offset = 0; offset < binary.length; offset += 4) {
    words.push((
      binary.charCodeAt(offset)
      | (binary.charCodeAt(offset + 1) << 8)
      | (binary.charCodeAt(offset + 2) << 16)
      | (binary.charCodeAt(offset + 3) << 24)
    ) >>> 0);
  }
  return Object.freeze(words);
}

export function migratePortableSaveBundleV1ToV2(
  source: PortableSaveBundleV1,
  options: V1ToV2MigrationOptions,
): SaveResult<PortableSaveBundleV2> {
  const validatedSource = validatePortableSaveBundleV1(source);
  if (!validatedSource.ok) {
    return validatedSource;
  }
  source = validatedSource.value;

  try {
    if (
      source.world.rngAlgorithmVersion !== RNG_ALGORITHM_VERSION
      || source.world.seedDerivationVersion !== SEED_DERIVATION_VERSION
    ) {
      return saveFailure(
        'MIGRATION_FAILED',
        'V1 deterministic identities cannot reproduce the accepted Phase 1 Cold Rain contract.',
      );
    }

    const environment = validatePhase1EnvironmentState(
      createPhase1EnvironmentState(source.world.worldSeed, options.catalog),
      options.catalog,
    );
    const world: WorldManifestV2 = Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'world-manifest',
      worldId: source.world.worldId,
      worldRevision: source.world.worldRevision,
      authorityTick: 0,
      worldSeed: source.world.worldSeed,
      generationVersion: source.world.generationVersion,
      rngAlgorithmVersion: source.world.rngAlgorithmVersion,
      seedDerivationVersion: source.world.seedDerivationVersion,
      contentCompatibility: options.catalog.compatibility,
      environment,
      createdAtUtc: source.world.createdAtUtc,
      lastActiveAtUtc: source.world.lastActiveAtUtc,
    });

    const containers: ContainerRecordV2[] = [];
    const players: PlayerRecordV2[] = source.players.map((player) => {
      const inventoryContainerId = stableMigrationInventoryId(
        source.world.worldSeed,
        source.world.worldId,
        player.playerId,
      );
      containers.push(Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'container',
        worldId: player.worldId,
        containerId: inventoryContainerId,
        kind: 'player-inventory',
        revision: 0,
        owner: Object.freeze({ type: 'player', playerId: player.playerId }),
        stacks: Object.freeze([]),
      }));
      return Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'player',
        worldId: player.worldId,
        playerId: player.playerId,
        playerRevision: player.playerRevision,
        position: Object.freeze({ ...player.position }),
        facing: player.facing,
        inventoryContainerId,
        equipment: Object.freeze({
          equippedWeaponStackId: null,
          equippedThermalWrapStackId: null,
        }),
        survival: Object.freeze({
          revision: 0,
          healthMilli: 100000,
          foodMilli: 70000,
          waterMilli: 80000,
          staminaMilli: 100000,
          temperatureMilli: 50000,
          waterDrainRemainder: 0,
          foodDrainRemainder: 0,
          thermalRemainder: 0,
          staminaRegenRemainder: 0,
          lastStaminaSpendTick: null,
          nextCriticalDehydrationDamageTick: null,
          nextCriticalStarvationDamageTick: null,
          nextTemperatureDamageTick: null,
        }),
        lifeState: Object.freeze({ type: 'alive' }),
        progression: Object.freeze({
          revision: 0,
          totalXp: 0,
          completedMilestoneRuleIds: Object.freeze([]),
          repeatRuleCounts: Object.freeze([]),
          unlockedSkillIds: Object.freeze([]),
          professionQuests: Object.freeze([]),
          unlockedProfessionIds: Object.freeze([]),
        }),
      });
    });

    const chunks: ChunkRecordV2[] = [];
    for (const chunk of source.chunks) {
      const baseGenerationFingerprint =
        options.resolveBaseGenerationFingerprint({
          worldSeed: source.world.worldSeed,
          generationVersion: chunk.generationVersion,
          coord: chunk.coord,
        });
      if (baseGenerationFingerprint === null || baseGenerationFingerprint.length === 0) {
        return saveFailure(
          'MIGRATION_FAILED',
          `Cannot establish exact generated base for V1 chunk ${chunk.coord.x},${chunk.coord.y}.`,
        );
      }
      const emptyExploration = createEmptyExplorationFragment(chunk.coord);
      chunks.push(Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'chunk',
        worldId: chunk.worldId,
        coord: Object.freeze({ ...chunk.coord }),
        generationVersion: chunk.generationVersion,
        baseGenerationFingerprint,
        contentCompatibility: options.catalog.compatibility,
        chunkRevision: chunk.chunkRevision,
        generated: true,
        resourceStates: Object.freeze([]),
        predatorStates: Object.freeze([]),
        landmarkStates: Object.freeze([]),
        exploration: Object.freeze({
          regionId: emptyExploration.regionId,
          revision: emptyExploration.revision,
          encoding: 'bitset-base64-v1',
          exploredCellsBase64: encodeExplorationWordsV2(emptyExploration.words),
        }),
        createdEntities: Object.freeze([]),
        structureIds: Object.freeze([]),
        removedGeneratedEntityIds: Object.freeze([]),
      }));
    }

    return saveSuccess(Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'portable-bundle',
      world,
      players: Object.freeze(players),
      containers: Object.freeze(containers),
      chunks: Object.freeze(chunks),
      footholds: Object.freeze([]),
      structures: Object.freeze([]),
    }));
  } catch (error) {
    return saveFailure(
      'MIGRATION_FAILED',
      `V1 -> V2 migration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
