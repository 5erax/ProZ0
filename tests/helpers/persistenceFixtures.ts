import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../src/foundation';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V1,
  type ChunkRecordV1,
  type PlayerFacingV1,
  type PlayerRecordV1,
  type PortableSaveBundleV1,
  type WorldManifestV1,
} from '../../src/persistence';
import {
  PHASE0_WORLD_GENERATION_VERSION,
  createChunkCoord,
} from '../../src/world';

export function makeWorldManifest(
  overrides: Partial<WorldManifestV1> = {},
): WorldManifestV1 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V1,
    recordKind: 'world-manifest',
    worldId: 'world-alpha',
    worldRevision: 0,
    worldSeed: 'phase0-persistence-seed',
    generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
    seedDerivationVersion: SEED_DERIVATION_VERSION,
    createdAtUtc: '2026-09-22T00:00:00.000Z',
    lastActiveAtUtc: '2026-09-22T00:00:00.000Z',
    ...overrides,
  });
}

export function makePlayerRecord(
  overrides: Partial<PlayerRecordV1> = {},
): PlayerRecordV1 {
  const facing: PlayerFacingV1 = overrides.facing ?? 'SE';

  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V1,
    recordKind: 'player',
    worldId: 'world-alpha',
    playerId: 'player-1',
    playerRevision: 0,
    position: Object.freeze({ x: 12.5, y: -4.25 }),
    facing,
    ...overrides,
  });
}

export function makeChunkRecord(
  overrides: Partial<ChunkRecordV1> = {},
): ChunkRecordV1 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V1,
    recordKind: 'chunk',
    worldId: 'world-alpha',
    coord: createChunkCoord(-7, 11),
    generationVersion: PHASE0_WORLD_GENERATION_VERSION,
    chunkRevision: 0,
    generated: true,
    ...overrides,
  });
}

export function makePortableBundle(
  overrides: Partial<PortableSaveBundleV1> = {},
): PortableSaveBundleV1 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V1,
    recordKind: 'portable-bundle',
    world: makeWorldManifest(),
    players: Object.freeze([makePlayerRecord()]),
    chunks: Object.freeze([makeChunkRecord()]),
    ...overrides,
  });
}
