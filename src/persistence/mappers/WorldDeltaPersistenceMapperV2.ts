import type { ContentCompatibilityIdentityV1 } from '../../content';
import type { Phase1EnvironmentState } from '../../world/phase1/Phase1WorldTypes';
import type {
  PersistedPhase1WorldSliceChunkRecord,
} from '../../world/phase1/Phase1WorldPersistencePort';
import { encodeExplorationWordsV2, decodeExplorationWordsV2 } from '../migrations/V1ToV2Migration';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type {
  ChunkRecordV2,
  PersistentWorldEntitySaveV2,
  PredatorSaveV2,
} from '../schema/v2/ChunkRecordV2';
import type { WorldManifestV2 } from '../schema/v2/WorldManifestV2';

export interface WorldDeltaExtrasV2 {
  readonly predatorStates?: readonly PredatorSaveV2[];
  readonly createdEntities?: readonly PersistentWorldEntitySaveV2[];
  readonly structureIds?: readonly string[];
  readonly removedGeneratedEntityIds?: readonly string[];
}

export function worldSliceChunkToRecordV2(
  worldId: string,
  slice: PersistedPhase1WorldSliceChunkRecord,
  extras: WorldDeltaExtrasV2 = {},
): ChunkRecordV2 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'chunk',
    worldId,
    coord: Object.freeze({ ...slice.coord }),
    generationVersion: slice.generationVersion,
    baseGenerationFingerprint: slice.baseGenerationFingerprint,
    contentCompatibility: slice.contentCompatibility,
    chunkRevision: slice.revision,
    generated: true,
    resourceStates: Object.freeze(slice.resourceStates.map((entry) => Object.freeze({ ...entry }))),
    predatorStates: Object.freeze((extras.predatorStates ?? []).map((entry) => Object.freeze({
      ...entry,
      encounterAnchor: Object.freeze({ ...entry.encounterAnchor }),
    }))),
    landmarkStates: Object.freeze(slice.ruinStates.map((entry) => Object.freeze({ ...entry }))),
    exploration: Object.freeze({
      regionId: slice.exploration.regionId,
      revision: slice.exploration.revision,
      encoding: 'bitset-base64-v1',
      exploredCellsBase64: encodeExplorationWordsV2(slice.exploration.words),
    }),
    createdEntities: Object.freeze((extras.createdEntities ?? []).map((entry) => Object.freeze({
      ...entry,
      position: Object.freeze({ ...entry.position }),
    }))),
    structureIds: Object.freeze([...(extras.structureIds ?? [])]),
    removedGeneratedEntityIds: Object.freeze([...(extras.removedGeneratedEntityIds ?? [])]),
  });
}

export function chunkRecordV2ToWorldSlice(
  record: ChunkRecordV2,
): PersistedPhase1WorldSliceChunkRecord {
  return Object.freeze({
    coord: Object.freeze({ ...record.coord }),
    generationVersion: record.generationVersion,
    revision: record.chunkRevision,
    generated: true,
    baseGenerationFingerprint: record.baseGenerationFingerprint,
    contentCompatibility: record.contentCompatibility as ContentCompatibilityIdentityV1,
    resourceStates: Object.freeze(record.resourceStates.map((entry) => Object.freeze({ ...entry }))),
    ruinStates: Object.freeze(record.landmarkStates.map((entry) => Object.freeze({
      ruinEntityId: entry.ruinEntityId,
      ruinDefinitionId: entry.ruinDefinitionId as 'ruin:previous-civilization-ruin',
      revision: entry.revision,
      discoveryState: entry.discoveryState,
      physicalRewardState: entry.physicalRewardState,
    }))),
    exploration: Object.freeze({
      regionId: record.exploration.regionId,
      revision: record.exploration.revision,
      words: decodeExplorationWordsV2(record.exploration.exploredCellsBase64),
    }),
  });
}

export function environmentStateToManifestFieldsV2(
  state: Phase1EnvironmentState,
): WorldManifestV2['environment'] {
  return Object.freeze({
    activeTick: state.activeTick,
    cycleStartLocalMinute: state.cycleStartLocalMinute,
    weatherEvents: Object.freeze(state.weatherEvents.map((event) => Object.freeze({ ...event }))),
  });
}
