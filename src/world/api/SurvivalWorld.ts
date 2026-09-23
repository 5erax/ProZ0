import type { PlayerId, WorldPosition } from '../../foundation';

export type DeathCacheEntityId = string;
export type PredatorEntityId = string;

export interface EnvironmentExposureView {
  readonly thermalTarget: number;
  readonly sheltered: boolean;
}

export interface DeathCachePlacementReservation {
  readonly token: string;
  readonly position: WorldPosition;
}

export interface RespawnPlacementReservation {
  readonly token: string;
  readonly playerId: PlayerId;
  readonly position: WorldPosition;
}

export interface DeathCacheWorldView {
  readonly entityId: DeathCacheEntityId;
  readonly deathId: string;
  readonly ownerPlayerId: PlayerId;
  readonly containerId: string;
  readonly position: WorldPosition;
  readonly revision: number;
}

export type PredatorCombatState =
  | 'idle'
  | 'alert'
  | 'chase'
  | 'attack-windup'
  | 'recovery'
  | 'return'
  | 'dead';

export interface PredatorWorldView {
  readonly entityId: PredatorEntityId;
  readonly position: WorldPosition;
  readonly encounterAnchor: WorldPosition;
  readonly revision: number;
  readonly health: number;
  readonly state: PredatorCombatState;
  readonly targetPlayerId: PlayerId | null;
  readonly stateUntilTick: number | null;
  readonly outsideLeashTicks: number;
}

export interface SurvivalWorldPort {
  getPlayerPosition(playerId: PlayerId): WorldPosition;

  /**
   * Validates and reserves the canonical base respawn position without
   * publishing player position or life-state changes. Returns null when the
   * anchor cannot be safely committed.
   */
  reservePlayerRespawn(
    playerId: PlayerId,
  ): Readonly<RespawnPlacementReservation> | null;

  /**
   * After a valid respawn reservation is returned, finalization must be
   * deterministic and non-throwing and must perform no new validation.
   */
  commitReservedPlayerRespawn(
    reservation: Readonly<RespawnPlacementReservation>,
  ): void;

  getEnvironmentExposure(playerId: PlayerId): Readonly<EnvironmentExposureView>;

  reserveDeathCachePlacement(request: {
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly requestedPosition: WorldPosition;
  }): Readonly<DeathCachePlacementReservation>;

  /**
   * Reservation validation is complete before this call. Implementations must
   * make this deterministic and non-throwing for a valid reservation.
   */
  commitReservedDeathCache(request: {
    readonly entityId: DeathCacheEntityId;
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly containerId: string;
    readonly reservation: DeathCachePlacementReservation;
  }): Readonly<DeathCacheWorldView>;

  getDeathCacheByContainer(
    containerId: string,
  ): Readonly<DeathCacheWorldView> | null;

  removeEmptyDeathCache(
    entityId: DeathCacheEntityId,
    expectedRevision: number,
  ): boolean;

  getPredator(entityId: PredatorEntityId): Readonly<PredatorWorldView> | null;
  commitPredatorRuntime(request: {
    readonly entityId: PredatorEntityId;
    readonly expectedRevision: number;
    readonly health: number;
    readonly state: PredatorCombatState;
    readonly targetPlayerId: PlayerId | null;
    readonly stateUntilTick: number | null;
    readonly outsideLeashTicks: number;
  }): Readonly<PredatorWorldView> | null;
}
