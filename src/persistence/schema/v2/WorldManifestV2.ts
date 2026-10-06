import type { ContentCompatibilityIdentityV1 } from '../../../content';
import type { ColonySustenanceState } from '../../../simulation/sustenance/ColonySustenanceAuthority';
import type { ColonyDepthState } from '../../../simulation/colony/ColonyDepthAuthority';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';

export type SaveContentCompatibilityV2 = ContentCompatibilityIdentityV1;

/**
 * Old/pre-Industry readers already reject unknown content pack versions.
 * Industry-bearing saves stamp this manifest-only compatibility version so an
 * older reader fails closed before publishing or overwriting canonical state.
 * Chunk/generation content identity remains unchanged.
 */
export const INDUSTRY_SAVE_CONTENT_PACK_VERSION = 2 as const;

export interface WeatherEventSaveV2 {
  readonly weatherEventId: string;
  readonly weatherDefinitionId: 'weather:cold-rain';
  readonly revision: number;
  readonly startTick: number;
  readonly warningStartTick: number;
  readonly endTick: number;
}

export interface WorldManifestV2 {
  readonly soloResourceMarkers?: import('../../../simulation/worldspaces/SoloResourceMarkers').SoloResourceMarkersState;
  readonly soloCaves?: import('../../../simulation/worldspaces/SoloCaveState').SoloCaveStateV1;
  readonly livingWorld?: import('../../../simulation/livingworld/LivingWorldState').LivingWorldState;
  readonly industry?: import('../../../simulation/industry/IndustryAuthority').IndustryState;
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
    readonly resourceProfileVersion?: 1;
  readonly resourceLifecycleVersion?: 1;
    readonly calendarVersion?: 1;
    readonly activeTick: number;
    readonly cycleStartLocalMinute: number;
    readonly weatherEvents: readonly WeatherEventSaveV2[];
  };
  readonly createdAtUtc: string;
  readonly lastActiveAtUtc: string;
}
