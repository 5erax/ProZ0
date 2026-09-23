import type { ContentCatalogV1, ContentKindV1 } from '../../content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../foundation';
import { createChunkCoord } from '../../world';
import {
  explorationRegionId,
  validateExplorationFragment,
} from '../../world/phase1/ExplorationGrid';
import { validatePhase1EnvironmentState } from '../../world/phase1/Phase1Environment';
import { decodeExplorationWordsV2 } from '../migrations/V1ToV2Migration';
import {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV2,
  type SaveFailure,
  type SaveResult,
} from '../repository/SaveRepositoryV2';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
} from '../schema/SaveSchema';
import type { ChunkRecordV2 } from '../schema/v2/ChunkRecordV2';
import type { ContainerRecordV2 } from '../schema/v2/ContainerRecordV2';
import type { FootholdRecordV2 } from '../schema/v2/FootholdRecordV2';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';
import type { StructureRecordV2 } from '../schema/v2/StructureRecordV2';
import type { WorldManifestV2 } from '../schema/v2/WorldManifestV2';

export interface SaveV2CompatibilityPolicy {
  readonly catalog: ContentCatalogV1;
  readonly generationVersions: readonly number[];
  readonly rngAlgorithmVersions: readonly string[];
  readonly seedDerivationVersions: readonly string[];
}

export function createPhase1SaveV2Compatibility(
  catalog: ContentCatalogV1,
  generationVersions: readonly number[],
): SaveV2CompatibilityPolicy {
  return Object.freeze({
    catalog,
    generationVersions: Object.freeze([...generationVersions]),
    rngAlgorithmVersions: Object.freeze([RNG_ALGORITHM_VERSION]),
    seedDerivationVersions: Object.freeze([SEED_DERIVATION_VERSION]),
  });
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonCompatible(value: unknown, path = new Set<object>()): boolean {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (path.has(value as object)) return false;

  path.add(value as object);
  let valid: boolean;
  if (Array.isArray(value)) {
    valid = value.every((entry) => isJsonCompatible(entry, path));
  } else {
    const prototype = Object.getPrototypeOf(value);
    valid = (prototype === Object.prototype || prototype === null)
      && Object.values(value as JsonObject)
        .every((entry) => isJsonCompatible(entry, path));
  }
  path.delete(value as object);
  return valid;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function nullableTick(value: unknown): boolean {
  return value === null || nonNegativeInt(value);
}

function utc(value: unknown): value is string {
  return typeof value === 'string'
    && value.endsWith('Z')
    && Number.isFinite(Date.parse(value));
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function common(
  input: unknown,
  kind:
    | 'world-manifest'
    | 'player'
    | 'container'
    | 'chunk'
    | 'foothold'
    | 'structure'
    | 'portable-bundle',
): SaveFailure | null {
  if (!isObject(input) || !isJsonCompatible(input)) {
    return saveFailure('CORRUPT_RECORD', `${kind} must be a plain JSON-compatible object.`);
  }
  if (input.formatId !== SAVE_FORMAT_ID) {
    return saveFailure('INVALID_FORMAT', `Expected save format ${SAVE_FORMAT_ID}.`);
  }
  if (typeof input.schemaVersion !== 'number' || !Number.isSafeInteger(input.schemaVersion)) {
    return saveFailure('CORRUPT_RECORD', 'schemaVersion must be a safe integer.');
  }
  if (input.schemaVersion > SAVE_SCHEMA_VERSION_V2) {
    return saveFailure('UNSUPPORTED_NEWER_SCHEMA', `Save schema ${input.schemaVersion} is newer than V${SAVE_SCHEMA_VERSION_V2}.`);
  }
  if (input.schemaVersion !== SAVE_SCHEMA_VERSION_V2) {
    return saveFailure('MIGRATION_FAILED', `Save schema ${input.schemaVersion} requires migration before V2 validation.`);
  }
  if (input.recordKind !== kind) {
    return saveFailure('CORRUPT_RECORD', `Expected recordKind ${kind}.`);
  }
  return null;
}

function sameContentIdentity(
  actual: unknown,
  policy: SaveV2CompatibilityPolicy,
): SaveFailure | null {
  if (!isObject(actual)) {
    return saveFailure('CORRUPT_RECORD', 'contentCompatibility must be an object.');
  }
  const expected = policy.catalog.compatibility;
  if (actual.formatId !== expected.formatId || actual.schemaVersion !== expected.schemaVersion) {
    return saveFailure('UNSUPPORTED_CONTENT_SCHEMA', 'Saved content schema identity is unsupported.');
  }
  if (actual.packId !== expected.packId || actual.packVersion !== expected.packVersion) {
    return saveFailure('UNSUPPORTED_CONTENT_PACK', 'Saved content pack identity is unsupported.');
  }
  if (actual.canonicalFingerprint !== expected.canonicalFingerprint) {
    return saveFailure('CONTENT_FINGERPRINT_MISMATCH', 'Saved content fingerprint does not match the active catalog.');
  }
  return null;
}

function requireContent(
  catalog: ContentCatalogV1,
  id: string,
  kind: ContentKindV1,
): SaveFailure | null {
  try {
    catalog.getAs(id, kind);
    return null;
  } catch {
    return saveFailure('CROSS_REFERENCE_FAILURE', `Content ${id} is missing or has the wrong kind ${kind}.`);
  }
}

export function reconstructPlayerLevelV2(
  totalXp: number,
  catalog: ContentCatalogV1,
): number {
  if (!nonNegativeInt(totalXp)) throw new Error('totalXp must be a non-negative safe integer.');
  const progression = catalog.getAs('progression:phase1-early-progression', 'progression');
  let level = 1;
  for (const threshold of progression.levelThresholds) {
    if (totalXp >= threshold.totalXpRequired) level = threshold.level;
  }
  return level;
}

export function validateWorldManifestV2(
  input: unknown,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<WorldManifestV2> {
  const invalid = common(input, 'world-manifest');
  if (invalid !== null) return invalid;
  const record = input as unknown as WorldManifestV2;
  if (!nonEmpty(record.worldId) || !nonEmpty(record.worldSeed)
    || !nonNegativeInt(record.worldRevision) || !nonNegativeInt(record.authorityTick)
    || !Number.isSafeInteger(record.generationVersion)
    || !nonEmpty(record.rngAlgorithmVersion) || !nonEmpty(record.seedDerivationVersion)
    || !utc(record.createdAtUtc) || !utc(record.lastActiveAtUtc)) {
    return saveFailure('CORRUPT_RECORD', 'World manifest scalar fields are invalid.');
  }
  if (!policy.generationVersions.includes(record.generationVersion)) {
    return saveFailure('UNSUPPORTED_GENERATION_VERSION', `Generation version ${record.generationVersion} is unsupported.`);
  }
  if (!policy.rngAlgorithmVersions.includes(record.rngAlgorithmVersion)) {
    return saveFailure('UNSUPPORTED_RNG_VERSION', `RNG version ${record.rngAlgorithmVersion} is unsupported.`);
  }
  if (!policy.seedDerivationVersions.includes(record.seedDerivationVersion)) {
    return saveFailure('UNSUPPORTED_SEED_DERIVATION_VERSION', `Seed derivation version ${record.seedDerivationVersion} is unsupported.`);
  }
  const contentFailure = sameContentIdentity(record.contentCompatibility, policy);
  if (contentFailure !== null) return contentFailure;
  try {
    const environment = validatePhase1EnvironmentState(record.environment, policy.catalog);
    if (environment.activeTick !== record.authorityTick) {
      return saveFailure('CORRUPT_RECORD', 'Environment activeTick must equal the coherent authorityTick.');
    }
  } catch (error) {
    return saveFailure('CORRUPT_RECORD', `Invalid persisted environment: ${error instanceof Error ? error.message : String(error)}`);
  }
  return saveSuccess(record);
}

function validateSurvival(player: PlayerRecordV2): SaveFailure | null {
  const state = player.survival;
  if (!isObject(state) || !nonNegativeInt(state.revision)) {
    return saveFailure('CORRUPT_RECORD', 'Player survival revision is invalid.');
  }
  for (const value of [
    state.healthMilli,
    state.foodMilli,
    state.waterMilli,
    state.staminaMilli,
    state.temperatureMilli,
  ]) {
    if (!nonNegativeInt(value) || value > 100000) {
      return saveFailure('CORRUPT_RECORD', 'Player survival stat is outside canonical milli range.');
    }
  }
  for (const value of [
    state.waterDrainRemainder,
    state.foodDrainRemainder,
    state.thermalRemainder,
    state.staminaRegenRemainder,
  ]) {
    if (!nonNegativeInt(value)) {
      return saveFailure('CORRUPT_RECORD', 'Player survival remainder is invalid.');
    }
  }
  for (const value of [
    state.lastStaminaSpendTick,
    state.nextCriticalDehydrationDamageTick,
    state.nextCriticalStarvationDamageTick,
    state.nextTemperatureDamageTick,
  ]) {
    if (!nullableTick(value)) {
      return saveFailure('CORRUPT_RECORD', 'Player survival tick field is invalid.');
    }
  }
  return null;
}

function validateProgression(
  player: PlayerRecordV2,
  policy: SaveV2CompatibilityPolicy,
): SaveFailure | null {
  const progression = player.progression;
  if (!isObject(progression)
    || 'level' in progression
    || !nonNegativeInt(progression.revision)
    || !nonNegativeInt(progression.totalXp)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Player progression state is invalid or persists derived level.',
    );
  }
  const definition = policy.catalog.getAs(
    'progression:phase1-early-progression',
    'progression',
  );
  const milestoneIds = new Set(definition.milestoneRules.map((rule) => rule.id));
  const repeatById = new Map(definition.repeatRules.map((rule) => [rule.id, rule]));
  const seenMilestones = new Set<string>();
  for (const id of progression.completedMilestoneRuleIds) {
    if (!nonEmpty(id) || !milestoneIds.has(id) || seenMilestones.has(id)) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Invalid or duplicate progression milestone ${String(id)}.`,
      );
    }
    seenMilestones.add(id);
  }
  const seenRepeats = new Set<string>();
  for (const entry of progression.repeatRuleCounts) {
    const rule = repeatById.get(entry.ruleId);
    if (rule === undefined
      || seenRepeats.has(entry.ruleId)
      || !nonNegativeInt(entry.count)
      || entry.count > rule.maxRewardedActions) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Invalid progression repeat counter ${entry.ruleId}.`,
      );
    }
    seenRepeats.add(entry.ruleId);
  }
  const seenSkills = new Set<string>();
  for (const id of progression.unlockedSkillIds) {
    if (seenSkills.has(id)) {
      return saveFailure('CORRUPT_RECORD', `Duplicate unlocked skill ${id}.`);
    }
    const failure = requireContent(policy.catalog, id, 'skill');
    if (failure !== null) return failure;
    seenSkills.add(id);
  }
  const seenQuests = new Set<string>();
  for (const quest of progression.professionQuests) {
    if (seenQuests.has(quest.questDefinitionId)) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Duplicate quest ${quest.questDefinitionId}.`,
      );
    }
    let questDefinition;
    try {
      questDefinition = policy.catalog.getAs(
        quest.questDefinitionId,
        'profession-quest',
      );
    } catch {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Invalid profession quest ${quest.questDefinitionId}.`,
      );
    }
    const ordinals = new Set<number>();
    for (const ordinal of quest.completedObjectiveOrdinals) {
      if (!nonNegativeInt(ordinal)
        || ordinal >= questDefinition.objectives.length
        || ordinals.has(ordinal)) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Invalid quest objective ordinal for ${quest.questDefinitionId}.`,
        );
      }
      ordinals.add(ordinal);
    }
    if (quest.completed !== (ordinals.size === questDefinition.objectives.length)) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Quest completion state disagrees with objectives for ${quest.questDefinitionId}.`,
      );
    }
    seenQuests.add(quest.questDefinitionId);
  }
  const seenProfessions = new Set<string>();
  for (const id of progression.unlockedProfessionIds) {
    if (seenProfessions.has(id)) {
      return saveFailure('CORRUPT_RECORD', `Duplicate unlocked profession ${id}.`);
    }
    const failure = requireContent(policy.catalog, id, 'profession');
    if (failure !== null) return failure;
    seenProfessions.add(id);
  }
  reconstructPlayerLevelV2(progression.totalXp, policy.catalog);
  return null;
}

export function validatePlayerRecordV2(
  input: unknown,
  worldId: string,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<PlayerRecordV2> {
  const invalid = common(input, 'player');
  if (invalid !== null) return invalid;
  const record = input as unknown as PlayerRecordV2;
  if (record.worldId !== worldId
    || !nonEmpty(record.playerId)
    || !nonNegativeInt(record.playerRevision)
    || !finite(record.position?.x)
    || !finite(record.position?.y)
    || !['N','NE','E','SE','S','SW','W','NW'].includes(record.facing)
    || !nonEmpty(record.inventoryContainerId)
    || !isObject(record.equipment)) {
    return saveFailure('CORRUPT_RECORD', 'Player record scalar fields are invalid.');
  }
  if (record.equipment.equippedWeaponStackId !== null
    && !nonEmpty(record.equipment.equippedWeaponStackId)) {
    return saveFailure('CORRUPT_RECORD', 'Weapon stack reference is invalid.');
  }
  if (record.equipment.equippedThermalWrapStackId !== null
    && !nonEmpty(record.equipment.equippedThermalWrapStackId)) {
    return saveFailure('CORRUPT_RECORD', 'Thermal Wrap stack reference is invalid.');
  }
  const survival = validateSurvival(record);
  if (survival !== null) return survival;
  if (!isObject(record.lifeState)
    || !['alive','dead-pending-respawn'].includes(record.lifeState.type)) {
    return saveFailure('CORRUPT_RECORD', 'Player life state is invalid.');
  }
  if (record.lifeState.type === 'dead-pending-respawn') {
    if (!nonEmpty(record.lifeState.deathId)
      || !nonNegativeInt(record.lifeState.respawnAtTick)
      || ![
        'hostile-attack',
        'severe-temperature',
        'critical-temperature',
        'critical-dehydration',
        'critical-starvation',
      ].includes(record.lifeState.deathCause)
      || (record.lifeState.deathCacheEntityId !== null
        && !nonEmpty(record.lifeState.deathCacheEntityId))) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Dead-pending-respawn state is invalid.',
      );
    }
  }
  const progression = validateProgression(record, policy);
  if (progression !== null) return progression;
  return saveSuccess(record);
}

export function validateContainerRecordV2(
  input: unknown,
  worldId: string,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<ContainerRecordV2> {
  const invalid = common(input, 'container');
  if (invalid !== null) return invalid;
  const record = input as unknown as ContainerRecordV2;
  if (record.worldId !== worldId
    || !nonEmpty(record.containerId)
    || !nonNegativeInt(record.revision)
    || ![
      'player-inventory',
      'storage-crate',
      'machine-output',
      'death-cache',
      'ground-drop',
    ].includes(record.kind)
    || !isObject(record.owner)
    || !['player','structure','world-entity'].includes(record.owner.type)
    || !Array.isArray(record.stacks)) {
    return saveFailure('CORRUPT_RECORD', 'Container record scalar fields are invalid.');
  }
  const ownerId = record.owner.type === 'player'
    ? record.owner.playerId
    : record.owner.type === 'structure'
      ? record.owner.structureId
      : record.owner.entityId;
  if (!nonEmpty(ownerId)) {
    return saveFailure('CORRUPT_RECORD', 'Container owner identity is invalid.');
  }
  const stackIds = new Set<string>();
  for (const stack of record.stacks) {
    if (!isObject(stack)
      || !nonEmpty(stack.stackId)
      || stackIds.has(stack.stackId)
      || !nonEmpty(stack.itemDefinitionId)
      || !nonNegativeInt(stack.quantity)
      || stack.quantity < 1) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Invalid item stack in container ${record.containerId}.`,
      );
    }
    let item;
    try {
      item = policy.catalog.getAs(stack.itemDefinitionId, 'item');
    } catch {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Invalid item definition ${stack.itemDefinitionId}.`,
      );
    }
    if (stack.quantity > item.maxStack) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Stack ${stack.stackId} exceeds maxStack.`,
      );
    }
    if (item.conditionMax === null) {
      if (stack.condition !== null) {
        return saveFailure(
          'CORRUPT_RECORD',
          `Stack ${stack.stackId} persists condition for non-condition item.`,
        );
      }
    } else if (!finite(stack.condition)
      || stack.condition < 0
      || stack.condition > item.conditionMax
      || stack.quantity !== 1) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Stack ${stack.stackId} has invalid condition semantics.`,
      );
    }
    stackIds.add(stack.stackId);
  }
  return saveSuccess(record);
}

export function validateChunkRecordV2(
  input: unknown,
  worldId: string,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<ChunkRecordV2> {
  const invalid = common(input, 'chunk');
  if (invalid !== null) return invalid;
  const record = input as unknown as ChunkRecordV2;
  let coord;
  try {
    coord = createChunkCoord(record.coord?.x, record.coord?.y);
  } catch {
    return saveFailure('CORRUPT_RECORD', 'Chunk coordinate is invalid.');
  }
  if (record.worldId !== worldId
    || record.generated !== true
    || !nonNegativeInt(record.chunkRevision)
    || !Number.isSafeInteger(record.generationVersion)
    || !nonEmpty(record.baseGenerationFingerprint)) {
    return saveFailure('CORRUPT_RECORD', 'Chunk record scalar fields are invalid.');
  }
  if (!policy.generationVersions.includes(record.generationVersion)) {
    return saveFailure(
      'UNSUPPORTED_GENERATION_VERSION',
      `Chunk generation version ${record.generationVersion} is unsupported.`,
    );
  }
  const contentFailure = sameContentIdentity(record.contentCompatibility, policy);
  if (contentFailure !== null) return contentFailure;
  if (!isObject(record.exploration)
    || record.exploration.encoding !== 'bitset-base64-v1'
    || record.exploration.regionId !== explorationRegionId(coord)
    || !nonNegativeInt(record.exploration.revision)
    || typeof record.exploration.exploredCellsBase64 !== 'string') {
    return saveFailure('CORRUPT_RECORD', 'Chunk exploration record is invalid.');
  }
  try {
    validateExplorationFragment(coord, {
      regionId: record.exploration.regionId,
      revision: record.exploration.revision,
      words: decodeExplorationWordsV2(
        record.exploration.exploredCellsBase64,
      ),
    });
  } catch (error) {
    return saveFailure(
      'CORRUPT_RECORD',
      `Chunk exploration bitset is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const resourceIds = new Set<string>();
  for (const resource of record.resourceStates) {
    if (!nonEmpty(resource.resourceEntityId)
      || resourceIds.has(resource.resourceEntityId)
      || !nonNegativeInt(resource.revision)
      || (resource.remainingGatherActions !== null
        && !nonNegativeInt(resource.remainingGatherActions))
      || typeof resource.depleted !== 'boolean'
      || !nullableTick(resource.regenerationReadyTick)) {
      return saveFailure('CORRUPT_RECORD', 'Chunk resource state is invalid.');
    }
    resourceIds.add(resource.resourceEntityId);
  }
  const predatorIds = new Set<string>();
  for (const predator of record.predatorStates) {
    if (!nonEmpty(predator.entityId)
      || predatorIds.has(predator.entityId)
      || !nonNegativeInt(predator.revision)
      || !finite(predator.health)
      || predator.health < 0
      || ![
        'idle',
        'patrol',
        'alert',
        'chase',
        'attack-windup',
        'recovery',
        'return',
        'dead',
      ].includes(predator.state)
      || (predator.targetPlayerId !== null
        && !nonEmpty(predator.targetPlayerId))
      || !nullableTick(predator.stateUntilTick)
      || !finite(predator.encounterAnchor?.x)
      || !finite(predator.encounterAnchor?.y)) {
      return saveFailure('CORRUPT_RECORD', 'Chunk predator state is invalid.');
    }
    predatorIds.add(predator.entityId);
  }
  const ruinIds = new Set<string>();
  for (const ruin of record.landmarkStates) {
    if (!nonEmpty(ruin.ruinEntityId)
      || ruinIds.has(ruin.ruinEntityId)
      || !nonNegativeInt(ruin.revision)
      || !['unknown','located','investigated'].includes(ruin.discoveryState)
      || !['unspawned','claimable','claimed'].includes(
        ruin.physicalRewardState,
      )) {
      return saveFailure('CORRUPT_RECORD', 'Chunk ruin state is invalid.');
    }
    const failure = requireContent(policy.catalog, ruin.ruinDefinitionId, 'ruin');
    if (failure !== null) return failure;
    ruinIds.add(ruin.ruinEntityId);
  }
  const entityIds = new Set<string>();
  for (const entity of record.createdEntities) {
    if (!nonEmpty(entity.entityId)
      || entityIds.has(entity.entityId)
      || !nonNegativeInt(entity.revision)
      || !finite(entity.position?.x)
      || !finite(entity.position?.y)
      || !nonEmpty(entity.containerId)
      || !['ground-drop','death-cache'].includes(entity.type)) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Runtime-created world entity is invalid.',
      );
    }
    if (entity.type === 'death-cache'
      && (!nonEmpty(entity.deathId) || !nonEmpty(entity.ownerPlayerId))) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Death Cache entity identity is invalid.',
      );
    }
    entityIds.add(entity.entityId);
  }
  if (new Set(record.structureIds).size !== record.structureIds.length
    || record.structureIds.some((id) => !nonEmpty(id))
    || new Set(record.removedGeneratedEntityIds).size
      !== record.removedGeneratedEntityIds.length
    || record.removedGeneratedEntityIds.some((id) => !nonEmpty(id))) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Chunk stable-ID arrays contain invalid or duplicate IDs.',
    );
  }
  return saveSuccess(record);
}

export function validateFootholdRecordV2(
  input: unknown,
  worldId: string,
): SaveResult<FootholdRecordV2> {
  const invalid = common(input, 'foothold');
  if (invalid !== null) return invalid;
  const record = input as unknown as FootholdRecordV2;
  if (record.worldId !== worldId
    || !nonEmpty(record.footholdId)
    || !nonNegativeInt(record.buildRevision)
    || !isObject(record.powerNetwork)
    || !nonNegativeInt(record.powerNetwork.revision)
    || (record.powerNetwork.producerStructureId !== null
      && !nonEmpty(record.powerNetwork.producerStructureId))
    || 'capacityPu' in record.powerNetwork) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Foothold record is invalid or persists derived power capacity.',
    );
  }
  if (new Set(record.structureIds).size !== record.structureIds.length
    || record.structureIds.some((id) => !nonEmpty(id))
    || new Set(record.powerNetwork.grantedConsumerIds).size
      !== record.powerNetwork.grantedConsumerIds.length
    || record.powerNetwork.grantedConsumerIds.some((id) => !nonEmpty(id))) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Foothold structure/power IDs are invalid or duplicated.',
    );
  }
  const edgeKeys = new Set<string>();
  for (const edge of record.connectionEdges) {
    if (!nonEmpty(edge.aConnectorId)
      || !nonEmpty(edge.bConnectorId)
      || edge.aConnectorId === edge.bConnectorId) {
      return saveFailure('CORRUPT_RECORD', 'Foothold connection edge is invalid.');
    }
    const key = [edge.aConnectorId, edge.bConnectorId]
      .sort(compareStrings)
      .join('|');
    if (edgeKeys.has(key)) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Duplicate foothold connection ${key}.`,
      );
    }
    edgeKeys.add(key);
  }
  return saveSuccess(record);
}

export function validateStructureRecordV2(
  input: unknown,
  worldId: string,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<StructureRecordV2> {
  const invalid = common(input, 'structure');
  if (invalid !== null) return invalid;
  const record = input as unknown as StructureRecordV2;
  if (record.worldId !== worldId
    || !nonEmpty(record.footholdId)
    || !nonEmpty(record.structureId)
    || !nonEmpty(record.structureDefinitionId)
    || !nonNegativeInt(record.revision)
    || !finite(record.position?.x)
    || !finite(record.position?.y)
    || ![0,1,2,3].includes(record.orientationQuarterTurns)
    || (record.placedByPlayerId !== null
      && !nonEmpty(record.placedByPlayerId))
    || (record.outputContainerId !== null
      && !nonEmpty(record.outputContainerId))) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Structure record scalar fields are invalid.',
    );
  }
  const contentFailure = requireContent(
    policy.catalog,
    record.structureDefinitionId,
    'structure',
  );
  if (contentFailure !== null) return contentFailure;
  const condenser =
    record.structureDefinitionId === 'structure:atmospheric-water-condenser';
  if (condenser) {
    if (record.outputContainerId === null
      || !isObject(record.machine)
      || 'outputContainerId' in record.machine
      || typeof record.machine.enabled !== 'boolean'
      || !nonNegativeInt(record.machine.productionProgressTicks)
      || record.machine.productionProgressTicks >= 5400
      || !nonNegativeInt(record.machine.completedCycleOrdinal)) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Condenser persistence state is invalid or duplicates outputContainerId.',
      );
    }
  } else if (record.machine !== null || record.outputContainerId !== null) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Only the Condenser may persist machine/output-container state.',
    );
  }
  return saveSuccess(record);
}

function globalCrossReferences(
  bundle: PortableSaveBundleV2,
  policy: SaveV2CompatibilityPolicy,
): SaveFailure | null {
  const players = new Map(bundle.players.map((entry) => [entry.playerId, entry]));
  const containers = new Map(
    bundle.containers.map((entry) => [entry.containerId, entry]),
  );
  const structures = new Map(
    bundle.structures.map((entry) => [entry.structureId, entry]),
  );
  const footholds = new Map(
    bundle.footholds.map((entry) => [entry.footholdId, entry]),
  );
  if (players.size !== bundle.players.length
    || containers.size !== bundle.containers.length
    || structures.size !== bundle.structures.length
    || footholds.size !== bundle.footholds.length) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Duplicate global player/container/structure/foothold identity.',
    );
  }

  const allStacks = new Map<
    string,
    { container: ContainerRecordV2; itemDefinitionId: string }
  >();
  for (const container of bundle.containers) {
    for (const stack of container.stacks) {
      if (allStacks.has(stack.stackId)) {
        return saveFailure(
          'CORRUPT_RECORD',
          `Item stack ${stack.stackId} exists in more than one container.`,
        );
      }
      allStacks.set(stack.stackId, {
        container,
        itemDefinitionId: stack.itemDefinitionId,
      });
    }
  }

  const worldEntities = new Map<
    string,
    {
      type: 'ground-drop' | 'death-cache';
      containerId: string;
      deathId?: string;
      ownerPlayerId?: string;
    }
  >();
  const chunkStructures = new Set<string>();
  for (const chunk of bundle.chunks) {
    for (const id of chunk.structureIds) chunkStructures.add(id);
    for (const entity of chunk.createdEntities) {
      if (worldEntities.has(entity.entityId)) {
        return saveFailure(
          'CORRUPT_RECORD',
          `Duplicate world entity ${entity.entityId}.`,
        );
      }
      worldEntities.set(entity.entityId, entity);
    }
  }

  for (const container of bundle.containers) {
    if (container.kind === 'player-inventory') {
      if (container.owner.type !== 'player') {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Player inventory ${container.containerId} has wrong owner type.`,
        );
      }
      const player = players.get(container.owner.playerId);
      if (player === undefined
        || player.inventoryContainerId !== container.containerId) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Player inventory ${container.containerId} is not owned/referenced coherently.`,
        );
      }
    } else if (container.kind === 'storage-crate'
      || container.kind === 'machine-output') {
      if (container.owner.type !== 'structure'
        || !structures.has(container.owner.structureId)) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Structure container ${container.containerId} has missing/wrong owner.`,
        );
      }
    } else {
      if (container.owner.type !== 'world-entity') {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `World container ${container.containerId} has wrong owner type.`,
        );
      }
      const entity = worldEntities.get(container.owner.entityId);
      if (entity === undefined
        || entity.containerId !== container.containerId
        || (container.kind === 'death-cache'
          && entity.type !== 'death-cache')
        || (container.kind === 'ground-drop'
          && entity.type !== 'ground-drop')) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `World entity/container ${container.containerId} is not bidirectionally coherent.`,
        );
      }
    }
  }

  for (const player of bundle.players) {
    const inventory = containers.get(player.inventoryContainerId);
    if (inventory === undefined
      || inventory.kind !== 'player-inventory'
      || inventory.owner.type !== 'player'
      || inventory.owner.playerId !== player.playerId) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Player ${player.playerId} inventory reference is invalid.`,
      );
    }
    for (const [stackId, expectedItem] of [
      [player.equipment.equippedWeaponStackId, 'item:basic-spear'],
      [player.equipment.equippedThermalWrapStackId, 'item:thermal-wrap'],
    ] as const) {
      if (stackId === null) continue;
      const stack = allStacks.get(stackId);
      if (stack === undefined
        || stack.container.containerId !== inventory.containerId
        || stack.itemDefinitionId !== expectedItem) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Player ${player.playerId} equipment reference ${stackId} is invalid.`,
        );
      }
    }
    if (player.lifeState.type === 'dead-pending-respawn'
      && player.lifeState.deathCacheEntityId !== null) {
      const entity = worldEntities.get(player.lifeState.deathCacheEntityId);
      if (entity?.type !== 'death-cache'
        || entity.deathId !== player.lifeState.deathId
        || entity.ownerPlayerId !== player.playerId) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Player ${player.playerId} DeathId/cache reference is invalid.`,
        );
      }
    }
  }

  for (const structure of bundle.structures) {
    const foothold = footholds.get(structure.footholdId);
    if (foothold === undefined
      || !foothold.structureIds.includes(structure.structureId)) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Structure ${structure.structureId} is missing from foothold ${structure.footholdId}.`,
      );
    }
    if (structure.machine !== null) {
      const output = containers.get(structure.outputContainerId ?? '');
      if (output === undefined
        || output.kind !== 'machine-output'
        || output.owner.type !== 'structure'
        || output.owner.structureId !== structure.structureId) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Condenser ${structure.structureId} output container is invalid.`,
        );
      }
    }
  }

  for (const foothold of bundle.footholds) {
    for (const id of foothold.structureIds) {
      const structure = structures.get(id);
      if (structure === undefined
        || structure.footholdId !== foothold.footholdId) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Foothold ${foothold.footholdId} references missing/wrong structure ${id}.`,
        );
      }
    }
    if (foothold.powerNetwork.producerStructureId !== null) {
      const producer = structures.get(
        foothold.powerNetwork.producerStructureId,
      );
      if (producer === undefined) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          'Power producer structure is missing.',
        );
      }
      const definition = policy.catalog.getAs(
        producer.structureDefinitionId,
        'structure',
      );
      if (definition.powerSource === undefined) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          'Persisted power producer is not a compatible power source.',
        );
      }
    }
    for (const id of foothold.powerNetwork.grantedConsumerIds) {
      const consumer = structures.get(id);
      if (consumer === undefined || consumer.machine === null) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Power grant consumer ${id} is missing/ineligible.`,
        );
      }
    }
    const definitionCounts = new Map<string, number>();
    for (const id of foothold.structureIds) {
      const structure = structures.get(id)!;
      definitionCounts.set(
        structure.structureDefinitionId,
        (definitionCounts.get(structure.structureDefinitionId) ?? 0) + 1,
      );
    }
    for (const [definitionId, count] of definitionCounts) {
      const definition = policy.catalog.getAs(definitionId, 'structure');
      if (count > definition.phase1WorldCap) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Structure cap exceeded for ${definitionId}.`,
        );
      }
    }
  }

  for (const id of chunkStructures) {
    if (!structures.has(id)) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Chunk references missing structure ${id}.`,
      );
    }
  }
  for (const structure of bundle.structures) {
    if (!chunkStructures.has(structure.structureId)) {
      return saveFailure(
        'CROSS_REFERENCE_FAILURE',
        `Structure ${structure.structureId} has no spatial chunk ownership.`,
      );
    }
  }
  for (const chunk of bundle.chunks) {
    for (const predator of chunk.predatorStates) {
      if (predator.targetPlayerId !== null
        && !players.has(predator.targetPlayerId)) {
        return saveFailure(
          'CROSS_REFERENCE_FAILURE',
          `Predator ${predator.entityId} targets missing player.`,
        );
      }
    }
  }
  return null;
}

export function validatePortableSaveBundleV2(
  input: unknown,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<PortableSaveBundleV2> {
  const invalid = common(input, 'portable-bundle');
  if (invalid !== null) return invalid;
  const root = input as JsonObject;
  for (const field of [
    'players',
    'containers',
    'chunks',
    'footholds',
    'structures',
  ] as const) {
    if (!Array.isArray(root[field])) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Portable bundle ${field} must be an array.`,
      );
    }
  }
  const manifest = validateWorldManifestV2(root.world, policy);
  if (manifest.ok === false) return manifest;
  const worldId = manifest.value.worldId;

  const players: PlayerRecordV2[] = [];
  for (const raw of root.players as unknown[]) {
    const result = validatePlayerRecordV2(raw, worldId, policy);
    if (result.ok === false) return result;
    players.push(result.value);
  }
  const containers: ContainerRecordV2[] = [];
  for (const raw of root.containers as unknown[]) {
    const result = validateContainerRecordV2(raw, worldId, policy);
    if (result.ok === false) return result;
    containers.push(result.value);
  }
  const chunks: ChunkRecordV2[] = [];
  for (const raw of root.chunks as unknown[]) {
    const result = validateChunkRecordV2(raw, worldId, policy);
    if (result.ok === false) return result;
    chunks.push(result.value);
  }
  const footholds: FootholdRecordV2[] = [];
  for (const raw of root.footholds as unknown[]) {
    const result = validateFootholdRecordV2(raw, worldId);
    if (result.ok === false) return result;
    footholds.push(result.value);
  }
  const structures: StructureRecordV2[] = [];
  for (const raw of root.structures as unknown[]) {
    const result = validateStructureRecordV2(raw, worldId, policy);
    if (result.ok === false) return result;
    structures.push(result.value);
  }

  const bundle: PortableSaveBundleV2 = {
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: manifest.value,
    players,
    containers,
    chunks,
    footholds,
    structures,
  };
  const cross = globalCrossReferences(bundle, policy);
  if (cross !== null) return cross;
  return saveSuccess(bundle);
}

export function validateSaveCommitRequestV2(
  request: SaveCommitRequestV2,
  policy: SaveV2CompatibilityPolicy,
): SaveResult<SaveCommitRequestV2> {
  const bundle = validatePortableSaveBundleV2({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  }, policy);
  if (bundle.ok === false) return bundle;
  if (request.expectedPreviousWorldRevision === null) {
    if (request.world.worldRevision !== 0) {
      return saveFailure(
        'STALE_WRITE',
        'A new world must commit worldRevision 0.',
      );
    }
  } else if (!nonNegativeInt(request.expectedPreviousWorldRevision)
    || request.world.worldRevision
      !== request.expectedPreviousWorldRevision + 1) {
    return saveFailure(
      'STALE_WRITE',
      'worldRevision must advance exactly once from expectedPreviousWorldRevision.',
    );
  }
  return saveSuccess(request);
}

export function reconstructPowerCapacityV2(
  foothold: FootholdRecordV2,
  structures: readonly StructureRecordV2[],
  catalog: ContentCatalogV1,
): number {
  if (foothold.powerNetwork.producerStructureId === null) return 0;
  const producer = structures.find(
    (entry) =>
      entry.structureId === foothold.powerNetwork.producerStructureId,
  );
  if (producer === undefined) {
    throw new Error('Power producer structure is missing.');
  }
  const definition = catalog.getAs(
    producer.structureDefinitionId,
    'structure',
  );
  if (definition.powerSource === undefined) {
    throw new Error('Power producer definition has no powerSource contract.');
  }
  return definition.powerSource.capacityPu;
}
