import type { ContentId } from '../../../content';
import type { PlayerId } from '../../../foundation';
import type { ContainerId, ItemStackId } from '../../../simulation/items';
import type { SurvivalDamageSource } from '../../../simulation/survival';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';
import type { PlayerFacingV1 } from '../v1/PlayerRecordV1';

export interface PlayerSurvivalSaveV2 {
  readonly revision: number;
  readonly healthMilli: number;
  readonly foodMilli: number;
  readonly waterMilli: number;
  readonly staminaMilli: number;
  readonly temperatureMilli: number;
  readonly waterDrainRemainder: number;
  readonly foodDrainRemainder: number;
  readonly thermalRemainder: number;
  readonly staminaRegenRemainder: number;
  readonly lastStaminaSpendTick: number | null;
  readonly nextCriticalDehydrationDamageTick: number | null;
  readonly nextCriticalStarvationDamageTick: number | null;
  readonly nextTemperatureDamageTick: number | null;
}

export type PlayerLifeStateSaveV2 =
  | { readonly type: 'alive' }
  | {
      readonly type: 'dead-pending-respawn';
      readonly deathId: string;
      readonly respawnAtTick: number;
      readonly deathCause: SurvivalDamageSource;
      readonly deathCacheEntityId: string | null;
    };

export interface PlayerProgressionSaveV2 {
  readonly revision: number;
  readonly totalXp: number;
  readonly completedMilestoneRuleIds: readonly string[];
  readonly repeatRuleCounts: readonly {
    readonly ruleId: string;
    readonly count: number;
  }[];
  readonly unlockedSkillIds: readonly ContentId[];
  readonly professionQuests: readonly {
    readonly questDefinitionId: ContentId;
    readonly completedObjectiveOrdinals: readonly number[];
    readonly completed: boolean;
  }[];
  readonly unlockedProfessionIds: readonly ContentId[];
}

export interface PlayerRecordV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'player';
  readonly worldId: string;
  readonly playerId: PlayerId;
  readonly playerRevision: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly facing: PlayerFacingV1;
  readonly inventoryContainerId: ContainerId;
  readonly equipment: {
    readonly equippedWeaponStackId: ItemStackId | null;
    readonly equippedThermalWrapStackId: ItemStackId | null;
  };
  readonly survival: PlayerSurvivalSaveV2;
  readonly lifeState: PlayerLifeStateSaveV2;
  readonly progression: PlayerProgressionSaveV2;
}
