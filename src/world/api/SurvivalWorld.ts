import type { PlayerId, WorldPosition } from '../../foundation';
import type { ContainerId } from '../../simulation/items';

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

export interface DeathCacheWorldView {
  readonly entityId: DeathCacheEntityId;
  readonly deathId: string;
  readonly ownerPlayerId: PlayerId;
  readonly containerId: ContainerId;
  readonly position: WorldPosition;
  readonly revision: number;
}

export interface PredatorWorldView {
  readonly entityId: PredatorEntityId;
  readonly position: WorldPosition;
  readonly encounterAnchor: WorldPosition;
  readonly revision: number;
}

export interface SurvivalWorldPort {
  getPlayerPosition(playerId: PlayerId): WorldPosition;
  getRespawnAnchor(playerId: PlayerId): WorldPosition;
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
    readonly containerId: ContainerId;
    readonly reservation: DeathCachePlacementReservation;
  }): Readonly<DeathCacheWorldView>;

  getDeathCacheByContainer(
    containerId: ContainerId,
  ): Readonly<DeathCacheWorldView> | null;

  removeEmptyDeathCache(
    entityId: DeathCacheEntityId,
    expectedRevision: number,
  ): boolean;

  getPredator(entityId: PredatorEntityId): Readonly<PredatorWorldView> | null;
}
