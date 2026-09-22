import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../foundation';
import {
  PHASE0_WORLD_GENERATION_VERSION,
  createChunkCoord,
  toChunkKey,
} from '../../world';
import {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV1,
  type SaveResult,
} from '../repository/SaveRepository';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import type { ChunkRecordV1 } from '../schema/v1/ChunkRecordV1';
import type {
  PlayerFacingV1,
  PlayerRecordV1,
} from '../schema/v1/PlayerRecordV1';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';
import type { WorldManifestV1 } from '../schema/v1/WorldManifestV1';

type JsonObject = Record<string, unknown>;

const PLAYER_FACINGS = Object.freeze([
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const);

export interface SaveCompatibilityPolicy {
  readonly generationVersions: readonly number[];
  readonly rngAlgorithmVersions: readonly string[];
  readonly seedDerivationVersions: readonly string[];
}

export const PHASE0_SAVE_COMPATIBILITY: SaveCompatibilityPolicy = Object.freeze({
  generationVersions: Object.freeze([PHASE0_WORLD_GENERATION_VERSION]),
  rngAlgorithmVersions: Object.freeze([RNG_ALGORITHM_VERSION]),
  seedDerivationVersions: Object.freeze([SEED_DERIVATION_VERSION]),
});

function isJsonObject(value: unknown): value is JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
  );
}

function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string'
    && value.endsWith('Z')
    && Number.isFinite(Date.parse(value))
  );
}

function isPlayerFacing(value: unknown): value is PlayerFacingV1 {
  return (
    typeof value === 'string'
    && (PLAYER_FACINGS as readonly string[]).includes(value)
  );
}

function validateCommonRecord(
  input: unknown,
  expectedKind:
    | 'world-manifest'
    | 'player'
    | 'chunk'
    | 'portable-bundle',
): SaveResult<JsonObject> {
  if (!isJsonObject(input)) {
    return saveFailure(
      'CORRUPT_RECORD',
      `${expectedKind} save record must be a JSON-compatible object.`,
    );
  }

  if (input.formatId !== SAVE_FORMAT_ID) {
    return saveFailure(
      'INVALID_FORMAT',
      `Expected save format ${SAVE_FORMAT_ID}.`,
    );
  }

  if (
    typeof input.schemaVersion !== 'number'
    || !Number.isSafeInteger(input.schemaVersion)
    || input.schemaVersion < 1
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'schemaVersion must be a positive safe integer.',
    );
  }

  if (input.schemaVersion > SAVE_SCHEMA_VERSION) {
    return saveFailure(
      'UNSUPPORTED_NEWER_SCHEMA',
      `Save schema version ${input.schemaVersion} is newer than supported version ${SAVE_SCHEMA_VERSION}.`,
    );
  }

  if (input.schemaVersion < SAVE_SCHEMA_VERSION) {
    return saveFailure(
      'MIGRATION_FAILED',
      `Save schema version ${input.schemaVersion} requires migration before V${SAVE_SCHEMA_VERSION} validation.`,
    );
  }

  if (input.recordKind !== expectedKind) {
    return saveFailure(
      'CORRUPT_RECORD',
      `Expected recordKind ${expectedKind}.`,
    );
  }

  return saveSuccess(input);
}

export function validateWorldManifestV1(
  input: unknown,
  compatibility: SaveCompatibilityPolicy = PHASE0_SAVE_COMPATIBILITY,
): SaveResult<WorldManifestV1> {
  const common = validateCommonRecord(input, 'world-manifest');
  if (!common.ok) {
    return common;
  }

  const record = common.value;

  if (!isNonEmptyId(record.worldId)) {
    return saveFailure('CORRUPT_RECORD', 'worldId must be a non-empty identifier.');
  }

  if (!isNonNegativeSafeInteger(record.worldRevision)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'worldRevision must be a non-negative safe integer.',
    );
  }

  if (!isNonEmptyString(record.worldSeed)) {
    return saveFailure('CORRUPT_RECORD', 'worldSeed must not be empty.');
  }

  if (
    typeof record.generationVersion !== 'number'
    || !Number.isSafeInteger(record.generationVersion)
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'generationVersion must be a safe integer.',
    );
  }

  if (!compatibility.generationVersions.includes(record.generationVersion)) {
    return saveFailure(
      'UNSUPPORTED_GENERATION_VERSION',
      `Unsupported generation version ${record.generationVersion}.`,
    );
  }

  if (typeof record.rngAlgorithmVersion !== 'string') {
    return saveFailure(
      'CORRUPT_RECORD',
      'rngAlgorithmVersion must be a string.',
    );
  }

  if (!compatibility.rngAlgorithmVersions.includes(record.rngAlgorithmVersion)) {
    return saveFailure(
      'UNSUPPORTED_RNG_VERSION',
      `Unsupported RNG algorithm version ${record.rngAlgorithmVersion}.`,
    );
  }

  if (typeof record.seedDerivationVersion !== 'string') {
    return saveFailure(
      'CORRUPT_RECORD',
      'seedDerivationVersion must be a string.',
    );
  }

  if (
    !compatibility.seedDerivationVersions.includes(
      record.seedDerivationVersion,
    )
  ) {
    return saveFailure(
      'UNSUPPORTED_SEED_DERIVATION_VERSION',
      `Unsupported seed derivation version ${record.seedDerivationVersion}.`,
    );
  }

  if (!isUtcTimestamp(record.createdAtUtc)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'createdAtUtc must be a valid ISO-8601 UTC timestamp.',
    );
  }

  if (!isUtcTimestamp(record.lastActiveAtUtc)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'lastActiveAtUtc must be a valid ISO-8601 UTC timestamp.',
    );
  }

  return saveSuccess(Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'world-manifest',
    worldId: record.worldId,
    worldRevision: record.worldRevision,
    worldSeed: record.worldSeed,
    generationVersion: record.generationVersion,
    rngAlgorithmVersion: record.rngAlgorithmVersion,
    seedDerivationVersion: record.seedDerivationVersion,
    createdAtUtc: record.createdAtUtc,
    lastActiveAtUtc: record.lastActiveAtUtc,
  }));
}

export function validatePlayerRecordV1(
  input: unknown,
  expectedWorldId?: string,
): SaveResult<PlayerRecordV1> {
  const common = validateCommonRecord(input, 'player');
  if (!common.ok) {
    return common;
  }

  const record = common.value;

  if (!isNonEmptyId(record.worldId)) {
    return saveFailure('CORRUPT_RECORD', 'Player worldId must be non-empty.');
  }

  if (expectedWorldId !== undefined && record.worldId !== expectedWorldId) {
    return saveFailure(
      'CORRUPT_RECORD',
      `Player worldId ${record.worldId} does not match world ${expectedWorldId}.`,
    );
  }

  if (!isNonEmptyId(record.playerId)) {
    return saveFailure('CORRUPT_RECORD', 'playerId must be non-empty.');
  }

  if (!isNonNegativeSafeInteger(record.playerRevision)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'playerRevision must be a non-negative safe integer.',
    );
  }

  if (!isJsonObject(record.position)) {
    return saveFailure('CORRUPT_RECORD', 'Player position must be an object.');
  }

  const x = record.position.x;
  const y = record.position.y;

  if (
    typeof x !== 'number'
    || typeof y !== 'number'
    || !Number.isFinite(x)
    || !Number.isFinite(y)
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Player position must contain finite x/y coordinates.',
    );
  }

  if (!isPlayerFacing(record.facing)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Player facing must be one of N/NE/E/SE/S/SW/W/NW.',
    );
  }

  const position = createWorldPosition(x, y);

  return saveSuccess(Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'player',
    worldId: record.worldId,
    playerId: record.playerId,
    playerRevision: record.playerRevision,
    position: Object.freeze({ x: position.x, y: position.y }),
    facing: record.facing,
  }));
}

export function validateChunkRecordV1(
  input: unknown,
  expectedWorldId?: string,
  compatibility: SaveCompatibilityPolicy = PHASE0_SAVE_COMPATIBILITY,
): SaveResult<ChunkRecordV1> {
  const common = validateCommonRecord(input, 'chunk');
  if (!common.ok) {
    return common;
  }

  const record = common.value;

  if (!isNonEmptyId(record.worldId)) {
    return saveFailure('CORRUPT_RECORD', 'Chunk worldId must be non-empty.');
  }

  if (expectedWorldId !== undefined && record.worldId !== expectedWorldId) {
    return saveFailure(
      'CORRUPT_RECORD',
      `Chunk worldId ${record.worldId} does not match world ${expectedWorldId}.`,
    );
  }

  if (!isJsonObject(record.coord)) {
    return saveFailure('CORRUPT_RECORD', 'Chunk coord must be an object.');
  }

  if (
    typeof record.coord.x !== 'number'
    || typeof record.coord.y !== 'number'
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Chunk coordinates must be signed int32 numbers.',
    );
  }

  let coord;
  try {
    coord = createChunkCoord(record.coord.x, record.coord.y);
  } catch {
    return saveFailure(
      'CORRUPT_RECORD',
      'Chunk coordinates must be canonical signed int32 integers.',
    );
  }

  if (
    typeof record.generationVersion !== 'number'
    || !Number.isSafeInteger(record.generationVersion)
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Chunk generationVersion must be a safe integer.',
    );
  }

  if (!compatibility.generationVersions.includes(record.generationVersion)) {
    return saveFailure(
      'UNSUPPORTED_GENERATION_VERSION',
      `Unsupported chunk generation version ${record.generationVersion}.`,
    );
  }

  if (!isNonNegativeSafeInteger(record.chunkRevision)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'chunkRevision must be a non-negative safe integer.',
    );
  }

  if (record.generated !== true) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Chunk record generated marker must be true.',
    );
  }

  return saveSuccess(Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'chunk',
    worldId: record.worldId,
    coord,
    generationVersion: record.generationVersion,
    chunkRevision: record.chunkRevision,
    generated: true,
  }));
}

function validateRecordCollections(
  world: WorldManifestV1,
  playersInput: unknown,
  chunksInput: unknown,
  compatibility: SaveCompatibilityPolicy,
): SaveResult<{
  readonly players: readonly PlayerRecordV1[];
  readonly chunks: readonly ChunkRecordV1[];
}> {
  if (!Array.isArray(playersInput) || !Array.isArray(chunksInput)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Save record collections must be arrays.',
    );
  }

  const players: PlayerRecordV1[] = [];
  const playerIds = new Set<string>();

  for (const input of playersInput) {
    const player = validatePlayerRecordV1(input, world.worldId);
    if (!player.ok) {
      return player;
    }

    if (playerIds.has(player.value.playerId)) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Duplicate player record ${player.value.playerId}.`,
      );
    }

    playerIds.add(player.value.playerId);
    players.push(player.value);
  }

  const chunks: ChunkRecordV1[] = [];
  const chunkKeys = new Set<string>();

  for (const input of chunksInput) {
    const chunk = validateChunkRecordV1(
      input,
      world.worldId,
      compatibility,
    );
    if (!chunk.ok) {
      return chunk;
    }

    if (chunk.value.generationVersion !== world.generationVersion) {
      return saveFailure(
        'UNSUPPORTED_GENERATION_VERSION',
        'Chunk generation version does not match its world manifest.',
      );
    }

    const key = toChunkKey(chunk.value.coord);
    if (chunkKeys.has(key)) {
      return saveFailure(
        'CORRUPT_RECORD',
        `Duplicate chunk record ${key}.`,
      );
    }

    chunkKeys.add(key);
    chunks.push(chunk.value);
  }

  return saveSuccess(Object.freeze({
    players: Object.freeze(players),
    chunks: Object.freeze(chunks),
  }));
}

export function validatePortableSaveBundleV1(
  input: unknown,
  compatibility: SaveCompatibilityPolicy = PHASE0_SAVE_COMPATIBILITY,
): SaveResult<PortableSaveBundleV1> {
  const common = validateCommonRecord(input, 'portable-bundle');
  if (!common.ok) {
    return common;
  }

  const world = validateWorldManifestV1(common.value.world, compatibility);
  if (!world.ok) {
    return world;
  }

  const collections = validateRecordCollections(
    world.value,
    common.value.players,
    common.value.chunks,
    compatibility,
  );
  if (!collections.ok) {
    return collections;
  }

  return saveSuccess(Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'portable-bundle',
    world: world.value,
    players: collections.value.players,
    chunks: collections.value.chunks,
  }));
}

export function validateSaveCommitRequestV1(
  input: unknown,
  compatibility: SaveCompatibilityPolicy = PHASE0_SAVE_COMPATIBILITY,
): SaveResult<SaveCommitRequestV1> {
  if (!isJsonObject(input)) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Save commit request must be an object.',
    );
  }

  const world = validateWorldManifestV1(input.world, compatibility);
  if (!world.ok) {
    return world;
  }

  const collections = validateRecordCollections(
    world.value,
    input.players,
    input.chunks,
    compatibility,
  );
  if (!collections.ok) {
    return collections;
  }

  const expected = input.expectedPreviousWorldRevision;
  if (
    expected !== null
    && !isNonNegativeSafeInteger(expected)
  ) {
    return saveFailure(
      'CORRUPT_RECORD',
      'expectedPreviousWorldRevision must be null or a non-negative safe integer.',
    );
  }

  if (expected === null) {
    if (world.value.worldRevision !== 0) {
      return saveFailure(
        'CORRUPT_RECORD',
        'A new world commit must use worldRevision 0.',
      );
    }
  } else {
    if (expected === Number.MAX_SAFE_INTEGER) {
      return saveFailure(
        'CORRUPT_RECORD',
        'World revision cannot advance beyond Number.MAX_SAFE_INTEGER.',
      );
    }

    if (world.value.worldRevision !== expected + 1) {
      return saveFailure(
        'CORRUPT_RECORD',
        'Committed worldRevision must equal expectedPreviousWorldRevision + 1.',
      );
    }
  }

  return saveSuccess(Object.freeze({
    world: world.value,
    players: collections.value.players,
    chunks: collections.value.chunks,
    expectedPreviousWorldRevision: expected,
  }));
}
