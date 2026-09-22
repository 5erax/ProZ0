export const PERSISTENCE_MODULE_BOUNDARY = 'persistence' as const;

export {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
  type SaveFormatId,
  type SaveRecordKind,
  type SaveSchemaVersion,
  type VersionedSaveRecord,
} from './schema/SaveSchema';

export type { WorldManifestV1 } from './schema/v1/WorldManifestV1';
export type {
  PlayerFacingV1,
  PlayerRecordV1,
} from './schema/v1/PlayerRecordV1';
export type { ChunkRecordV1 } from './schema/v1/ChunkRecordV1';
export type { PortableSaveBundleV1 } from './schema/v1/PortableSaveBundleV1';

export {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV1,
  type SaveFailure,
  type SaveFailureCode,
  type SaveRepository,
  type SaveResult,
  type SaveSuccess,
} from './repository/SaveRepository';

export {
  SaveMigrationRegistry,
  type SaveMigration,
} from './migrations/SaveMigrationRegistry';

export {
  PHASE0_SAVE_COMPATIBILITY,
  validateChunkRecordV1,
  validatePlayerRecordV1,
  validatePortableSaveBundleV1,
  validateSaveCommitRequestV1,
  validateWorldManifestV1,
  type SaveCompatibilityPolicy,
} from './validation/SaveValidator';

export {
  canonicalizePortableSaveBundle,
  serializePortableSaveBundle,
} from './portable/PortableSave';

export {
  DEFAULT_INDEXED_DB_SAVE_DATABASE,
  INDEXED_DB_STORAGE_VERSION,
  IndexedDbSaveRepository,
  deleteIndexedDbSaveDatabase,
  type IndexedDbSaveRepositoryOptions,
} from './browser/IndexedDbSaveRepository';

export {
  ChunkPersistenceRepositoryError,
  SaveRepositoryChunkPersistenceAdapter,
  type SaveRepositoryChunkPersistenceAdapterOptions,
} from './world/SaveRepositoryChunkPersistenceAdapter';

export {
  createPlayerRecordV1,
  restorePlayerPersistenceState,
  type CreatePlayerRecordV1Input,
} from './mappers/PlayerPersistenceMapper';
