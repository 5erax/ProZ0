import type { ContentId } from '../../../content';
import type { PlayerId } from '../../../foundation';
import type { ContainerId } from '../../../simulation/items';
import type { StructureId } from '../../../world/building';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';
import type { SaveContentCompatibilityV2 } from './WorldManifestV2';

export interface ResourceNodeSaveV2 {
  readonly resourceEntityId: string;
  readonly revision: number;
  readonly remainingGatherActions: number | null;
  readonly depleted: boolean;
  readonly regenerationReadyTick: number | null;
}

export interface PredatorSaveV2 {
  readonly entityId: string;
  readonly revision: number;
  readonly health: number;
  readonly state:
    | 'idle' | 'patrol' | 'alert' | 'chase'
    | 'attack-windup' | 'recovery' | 'return' | 'dead';
  readonly targetPlayerId: PlayerId | null;
  readonly stateUntilTick: number | null;
  readonly encounterAnchor: { readonly x: number; readonly y: number };
}

export interface RuinSaveV2 {
  readonly ruinEntityId: string;
  readonly ruinDefinitionId: ContentId;
  readonly revision: number;
  readonly discoveryState: 'unknown' | 'located' | 'investigated';
  readonly physicalRewardState: 'unspawned' | 'claimable' | 'claimed';
}

export interface ExplorationFragmentSaveV2 {
  readonly regionId: string;
  readonly revision: number;
  readonly encoding: 'bitset-base64-v1';
  readonly exploredCellsBase64: string;
}

export type PersistentWorldEntitySaveV2 =
  | {
      readonly type: 'ground-drop';
      readonly entityId: string;
      readonly revision: number;
      readonly position: { readonly x: number; readonly y: number };
      readonly containerId: ContainerId;
    }
  | {
      readonly type: 'death-cache';
      readonly entityId: string;
      readonly revision: number;
      readonly deathId: string;
      readonly ownerPlayerId: PlayerId;
      readonly containerId: ContainerId;
      readonly position: { readonly x: number; readonly y: number };
    };

export interface ChunkRecordV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'chunk';
  readonly worldId: string;
  readonly coord: { readonly x: number; readonly y: number };
  readonly generationVersion: number;
  readonly baseGenerationFingerprint: string;
  readonly contentCompatibility: SaveContentCompatibilityV2;
  readonly chunkRevision: number;
  readonly generated: true;
  readonly resourceStates: readonly ResourceNodeSaveV2[];
  readonly predatorStates: readonly PredatorSaveV2[];
  readonly landmarkStates: readonly RuinSaveV2[];
  readonly exploration: ExplorationFragmentSaveV2;
  readonly createdEntities: readonly PersistentWorldEntitySaveV2[];
  readonly structureIds: readonly StructureId[];
  readonly removedGeneratedEntityIds: readonly string[];
}
