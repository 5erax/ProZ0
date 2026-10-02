import type { ContentCompatibilityIdentityV1 } from '../../../content';
import type { ColonySustenanceState } from '../../../simulation/sustenance/ColonySustenanceAuthority';
import type { ColonyDepthState } from '../../../simulation/colony/ColonyDepthAuthority';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';

export type SaveContentCompatibilityV2 = ContentCompatibilityIdentityV1;

export interface WeatherEventSaveV2 {
  readonly weatherEventId: string;
  readonly weatherDefinitionId: 'weather:cold-rain';
  readonly revision: number;
  readonly startTick: number;
  readonly warningStartTick: number;
  readonly endTick: number;
}

export interface WorldManifestV2 {
  readonly livingWorld?: import('../../../simulation/livingworld/LivingWorldState').LivingWorldState;
  readonly singlePlayerExpedition?: import('../../../simulation/expedition/ExpeditionState').ExpeditionState;
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'world-manifest';
  readonly worldId: string;
  readonly worldRevision: number;
  readonly authorityTick: number;
  readonly sustenance?: ColonySustenanceState;
  readonly colonyDepth?: ColonyDepthState;
  readonly worldSeed: string;
  readonly generationVersion: number;
  readonly rngAlgorithmVersion: string;
  readonly seedDerivationVersion: string;
  readonly contentCompatibility: SaveContentCompatibilityV2;
  readonly environment: {
    readonly calendarVersion?: 1;
    readonly activeTick: number;
    readonly cycleStartLocalMinute: number;
    readonly weatherEvents: readonly WeatherEventSaveV2[];
  };
  readonly createdAtUtc: string;
  readonly lastActiveAtUtc: string;
}
