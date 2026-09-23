import type {
  ContentCompatibilityIdentityV1,
  ContentId,
} from '../../content';
import type { WorldPosition } from '../../foundation';
import type { ChunkCoord } from '../chunks/ChunkCoord';
import type { GeneratedChunkBase } from '../chunks/ChunkGenerator';

export type Phase1WorldEntityId = string;
export type Phase1WorldEventId = string;
export type Phase1ExplorationRegionId = string;

export type Phase1TerrainCell = 'ground' | 'water';

export interface Phase1TerrainGrid {
  readonly cellsPerAxis: number;
  readonly cellSizeWorldUnits: number;
  readonly cells: readonly Phase1TerrainCell[];
}

export interface Phase1GeneratedResourceEntity {
  readonly type: 'resource';
  readonly entityId: Phase1WorldEntityId;
  readonly definitionId: ContentId;
  readonly position: WorldPosition;
}

export interface Phase1GeneratedPassiveWildlifeEntity {
  readonly type: 'passive-wildlife';
  readonly entityId: Phase1WorldEntityId;
  readonly definitionId: 'entity:passive-wildlife';
  readonly position: WorldPosition;
}

export interface Phase1GeneratedHostileEntity {
  readonly type: 'hostile';
  readonly entityId: Phase1WorldEntityId;
  readonly definitionId: 'hostile:territorial-predator';
  readonly position: WorldPosition;
}

export interface Phase1GeneratedRuinEntity {
  readonly type: 'ruin';
  readonly entityId: Phase1WorldEntityId;
  readonly definitionId: 'ruin:previous-civilization-ruin';
  readonly position: WorldPosition;
}

export type Phase1GeneratedWorldEntity =
  | Phase1GeneratedResourceEntity
  | Phase1GeneratedPassiveWildlifeEntity
  | Phase1GeneratedHostileEntity
  | Phase1GeneratedRuinEntity;

export interface Phase1GeneratedChunkBase extends GeneratedChunkBase {
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly baseGenerationFingerprint: string;
  readonly terrain: Phase1TerrainGrid;
  readonly entities: readonly Phase1GeneratedWorldEntity[];
}

export interface Phase1ResourceRuntimeState {
  readonly resourceEntityId: Phase1WorldEntityId;
  readonly revision: number;
  readonly remainingGatherActions: number | null;
  readonly depleted: boolean;
  readonly regenerationReadyTick: number | null;
}

export type Phase1RuinDiscoveryState =
  | 'unknown'
  | 'located'
  | 'investigated';

export type Phase1RuinRewardState =
  | 'unspawned'
  | 'claimable'
  | 'claimed';

export interface Phase1RuinRuntimeState {
  readonly ruinEntityId: Phase1WorldEntityId;
  readonly ruinDefinitionId: 'ruin:previous-civilization-ruin';
  readonly revision: number;
  readonly discoveryState: Phase1RuinDiscoveryState;
  readonly physicalRewardState: Phase1RuinRewardState;
}

export interface Phase1ExplorationFragment {
  readonly regionId: Phase1ExplorationRegionId;
  readonly revision: number;
  readonly words: readonly number[];
}

export interface Phase1WorldSliceChunkDelta {
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
  readonly baseGenerationFingerprint: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly revision: number;
  readonly resourceStates: readonly Phase1ResourceRuntimeState[];
  readonly ruinStates: readonly Phase1RuinRuntimeState[];
  readonly exploration: Phase1ExplorationFragment;
}

export interface Phase1WeatherEventState {
  readonly weatherEventId: Phase1WorldEventId;
  readonly weatherDefinitionId: 'weather:cold-rain';
  readonly revision: number;
  readonly startTick: number;
  readonly warningStartTick: number;
  readonly endTick: number;
}

export interface Phase1EnvironmentState {
  readonly activeTick: number;
  readonly cycleStartLocalMinute: number;
  readonly weatherEvents: readonly Phase1WeatherEventState[];
}

export type Phase1DayPeriod = 'day' | 'night';
export type Phase1ColdRainStatus =
  | 'future'
  | 'warning'
  | 'active'
  | 'ended';

export interface Phase1EnvironmentView {
  readonly state: Phase1EnvironmentState;
  readonly localMinuteOfDay: number;
  readonly dayPeriod: Phase1DayPeriod;
  readonly coldRainStatus: Phase1ColdRainStatus;
}

export interface Phase1WorldLandmarks {
  readonly landingPosition: WorldPosition;
  readonly ruinPosition: WorldPosition;
  readonly predatorPosition: WorldPosition;
  readonly routeCardinal:
    | 'east'
    | 'south'
    | 'west'
    | 'north';
}
