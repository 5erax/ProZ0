export const PERSISTENCE_MODULE_BOUNDARY = 'persistence' as const;

export {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
  SAVE_SCHEMA_VERSION_V1,
  SAVE_SCHEMA_VERSION_V2,
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

export type {
  SaveContentCompatibilityV2,
  WeatherEventSaveV2,
  WorldManifestV2,
} from './schema/v2/WorldManifestV2';
export type {
  PlayerLifeStateSaveV2,
  PlayerProgressionSaveV2,
  PlayerRecordV2,
  PlayerSurvivalSaveV2,
} from './schema/v2/PlayerRecordV2';
export type {
  ContainerOwnerRefV2,
  ContainerRecordV2,
  ContainerSaveKindV2,
  ItemStackSaveV2,
} from './schema/v2/ContainerRecordV2';
export type {
  ChunkRecordV2,
  ExplorationFragmentSaveV2,
  PersistentWorldEntitySaveV2,
  PredatorSaveV2,
  ResourceNodeSaveV2,
  RuinSaveV2,
} from './schema/v2/ChunkRecordV2';
export type { FootholdRecordV2 } from './schema/v2/FootholdRecordV2';
export type {
  CondenserSaveV2,
  StructureRecordV2,
} from './schema/v2/StructureRecordV2';
export type { PortableSaveBundleV2 } from './schema/v2/PortableSaveBundleV2';

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
  durabilityCheckpointForManifest,
  saveFailure as saveFailureV2,
  saveSuccess as saveSuccessV2,
  type DurabilityCheckpointV1,
  type SaveCommitRequestV2,
  type SaveFailure as SaveFailureV2,
  type SaveFailureCode as SaveFailureCodeV2,
  type SaveRepositoryV2,
  type SaveResult as SaveResultV2,
  type SaveSuccess as SaveSuccessV2,
} from './repository/SaveRepositoryV2';

export {
  SaveMigrationRegistry,
  type SaveMigration,
} from './migrations/SaveMigrationRegistry';

export {
  decodeExplorationWordsV2,
  encodeExplorationWordsV2,
  migratePortableSaveBundleV1ToV2,
  type V1ToV2MigrationOptions,
} from './migrations/V1ToV2Migration';

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
  createPhase1SaveV2Compatibility,
  reconstructPlayerLevelV2,
  reconstructPowerCapacityV2,
  validateChunkRecordV2,
  validateContainerRecordV2,
  validateFootholdRecordV2,
  validatePlayerRecordV2,
  validatePortableSaveBundleV2,
  validateSaveCommitRequestV2,
  validateStructureRecordV2,
  validateWorldManifestV2,
  type SaveV2CompatibilityPolicy,
} from './validation/SaveValidatorV2';

export {
  canonicalizePortableSaveBundle,
  serializePortableSaveBundle,
} from './portable/PortableSave';

export {
  canonicalizePortableSaveBundleV2,
  serializePortableSaveBundleV2,
} from './portable/PortableSaveV2';

export {
  DEFAULT_INDEXED_DB_SAVE_DATABASE,
  INDEXED_DB_STORAGE_VERSION,
  IndexedDbSaveRepository,
  deleteIndexedDbSaveDatabase,
  type IndexedDbSaveRepositoryOptions,
} from './browser/IndexedDbSaveRepository';

export {
  PHASE1_INDEXED_DB_NAME,
  PHASE1_INDEXED_DB_STORAGE_VERSION,
  IndexedDbSaveRepositoryV2,
  type IndexedDbSaveRepositoryV2Faults,
  type IndexedDbSaveRepositoryV2Options,
} from './browser/IndexedDbSaveRepositoryV2';

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

export {
  containerRecordsV2ToItemLedgerSnapshot,
  itemLedgerSnapshotToContainerRecordsV2,
  type ContainerOwnerResolverV2,
} from './mappers/ItemLedgerPersistenceMapperV2';

export {
  playerRecordV2ToProgressionSnapshot,
  playerRecordV2ToSurvivalState,
  playerStateToRecordV2,
  type PlayerPersistenceSourceV2,
} from './mappers/PlayerPersistenceMapperV2';

export {
  chunkRecordV2ToWorldSlice,
  environmentStateToManifestFieldsV2,
  worldSliceChunkToRecordV2,
  type WorldDeltaExtrasV2,
} from './mappers/WorldDeltaPersistenceMapperV2';

export {
  buildingSnapshotToRecordsV2,
  recordsV2ToBuildingSnapshot,
  type BuildingPersistenceRecordsV2,
} from './mappers/StructurePersistenceMapperV2';
