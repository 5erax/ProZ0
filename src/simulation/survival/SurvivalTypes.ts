import type { PlayerId } from '../../foundation';
import type { PlayerWeightState } from '../items';

export const SURVIVAL_STAT_SCALE = 1000;
export const SURVIVAL_MAX_MILLI = 100 * SURVIVAL_STAT_SCALE;

export type SurvivalDamageSource =
  | 'hostile-attack'
  | 'severe-temperature'
  | 'critical-temperature'
  | 'critical-dehydration'
  | 'critical-starvation';

export interface DamageEvent {
  readonly damageId: string;
  readonly sourceType: SurvivalDamageSource;
  readonly sourceEntityId: string | null;
  readonly targetPlayerId: PlayerId;
  readonly amount: number;
  readonly tick: number;
}

export type PlayerLifeState =
  | { readonly type: 'alive' }
  | {
      readonly type: 'dead-pending-respawn';
      readonly deathId: string;
      readonly respawnAtTick: number;
      readonly deathCause: SurvivalDamageSource;
      readonly deathCacheEntityId: string | null;
    };

export interface PlayerSurvivalState {
  readonly playerId: PlayerId;
  readonly revision: number;
  readonly tick: number;
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
  readonly lifeState: PlayerLifeState;
}

export interface SurvivalTickContext {
  readonly thermalTarget: number;
  readonly thermalWrapActive: boolean;
  readonly carryState: PlayerWeightState;
}

export interface PlayerSurvivalView {
  readonly playerId: PlayerId;
  readonly revision: number;
  readonly tick: number;
  readonly health: number;
  readonly food: number;
  readonly water: number;
  readonly stamina: number;
  readonly temperature: number;
  readonly lifeState: PlayerLifeState;
  readonly staminaRegenPenaltyPercent: number;
}

export interface SurvivalAuthoritySnapshot {
  readonly players: readonly PlayerSurvivalState[];
  readonly appliedDamageIds: readonly string[];
}

export interface DamageResult {
  readonly status: 'applied' | 'duplicate' | 'ignored-dead';
  readonly healthAfter: number;
  readonly lethal: boolean;
  readonly event: Readonly<DamageEvent>;
}

export interface ConsumeRequest {
  readonly operationId: string;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: string;
  readonly expectedInventoryRevision: number;
  readonly sourceStackId: string;
}

export type ConsumeStartResult =
  | {
      readonly status: 'started';
      readonly operationId: string;
      readonly requiredTicks: 60;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: string;
      readonly reason:
        | 'DEAD'
        | 'SOURCE_MISSING'
        | 'STALE_REVISION'
        | 'NO_MEANINGFUL_EFFECT'
        | 'OPERATION_CONFLICT';
    };

export type ConsumeTickResult =
  | { readonly status: 'idle' }
  | {
      readonly status: 'channeling';
      readonly operationId: string;
      readonly elapsedTicks: number;
      readonly requiredTicks: 60;
    }
  | {
      readonly status: 'canceled';
      readonly operationId: string;
      readonly reason: 'CANCELED' | 'HOSTILE_DAMAGE';
    }
  | {
      readonly status: 'resolved';
      readonly operationId: string;
      readonly committed: boolean;
    };
