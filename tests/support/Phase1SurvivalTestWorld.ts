import type { PlayerId, WorldPosition } from '../../src/foundation';
import { createWorldPosition } from '../../src/foundation';
import type {
  DeathCachePlacementReservation,
  DeathCacheWorldView,
  PredatorCombatState,
  PredatorWorldView,
  SurvivalWorldPort,
} from '../../src/world';
import { Phase1ItemTestWorld } from './Phase1ItemTestWorld';

interface MutableDeathCache {
  entityId: string;
  deathId: string;
  ownerPlayerId: PlayerId;
  containerId: string;
  position: WorldPosition;
  revision: number;
}

interface MutablePredator {
  entityId: string;
  position: WorldPosition;
  encounterAnchor: WorldPosition;
  revision: number;
  health: number;
  state: PredatorCombatState;
  targetPlayerId: PlayerId | null;
  stateUntilTick: number | null;
  outsideLeashTicks: number;
}

export class Phase1SurvivalTestWorld
  extends Phase1ItemTestWorld
  implements SurvivalWorldPort {
  private readonly playerPositions = new Map<PlayerId, WorldPosition>();
  private readonly caches = new Map<string, MutableDeathCache>();
  private readonly predators = new Map<string, MutablePredator>();
  public thermalTarget = 50;
  public sheltered = false;
  public deathPlacementOffsetX = 0;

  public setPlayerPosition(playerId: PlayerId, position: WorldPosition): void {
    this.playerPositions.set(playerId, position);
  }

  public addPredator(view: PredatorWorldView): void {
    this.predators.set(view.entityId, { ...view });
  }

  public getPlayerPosition(playerId: PlayerId): WorldPosition {
    return this.playerPositions.get(playerId) ?? createWorldPosition(0, 0);
  }

  public getRespawnAnchor(_playerId: PlayerId): WorldPosition {
    return createWorldPosition(0, 0);
  }

  public commitPlayerRespawnPosition(
    playerId: PlayerId,
    position: WorldPosition,
  ): void {
    this.playerPositions.set(playerId, position);
  }

  public getEnvironmentExposure(_playerId: PlayerId) {
    return Object.freeze({
      thermalTarget: this.thermalTarget,
      sheltered: this.sheltered,
    });
  }

  public reserveDeathCachePlacement(request: {
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly requestedPosition: WorldPosition;
  }): Readonly<DeathCachePlacementReservation> {
    void request.deathId;
    void request.ownerPlayerId;
    return Object.freeze({
      token: `death-placement:${request.deathId}`,
      position: createWorldPosition(
        request.requestedPosition.x + this.deathPlacementOffsetX,
        request.requestedPosition.y,
      ),
    });
  }

  public commitReservedDeathCache(request: {
    readonly entityId: string;
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly containerId: string;
    readonly reservation: DeathCachePlacementReservation;
  }): Readonly<DeathCacheWorldView> {
    const existing = this.caches.get(request.entityId);
    if (existing !== undefined) return Object.freeze({ ...existing });
    const cache: MutableDeathCache = {
      entityId: request.entityId,
      deathId: request.deathId,
      ownerPlayerId: request.ownerPlayerId,
      containerId: request.containerId,
      position: request.reservation.position,
      revision: 0,
    };
    this.caches.set(cache.entityId, cache);
    return Object.freeze({ ...cache });
  }

  public getDeathCacheByContainer(
    containerId: string,
  ): Readonly<DeathCacheWorldView> | null {
    const cache = [...this.caches.values()].find(
      (entry) => entry.containerId === containerId,
    );
    return cache === undefined ? null : Object.freeze({ ...cache });
  }

  public removeEmptyDeathCache(
    entityId: string,
    expectedRevision: number,
  ): boolean {
    const cache = this.caches.get(entityId);
    if (cache === undefined || cache.revision !== expectedRevision) return false;
    this.caches.delete(entityId);
    return true;
  }

  public getPredator(entityId: string): Readonly<PredatorWorldView> | null {
    const predator = this.predators.get(entityId);
    return predator === undefined ? null : Object.freeze({ ...predator });
  }

  public commitPredatorRuntime(request: {
    readonly entityId: string;
    readonly expectedRevision: number;
    readonly health: number;
    readonly state: PredatorCombatState;
    readonly targetPlayerId: PlayerId | null;
    readonly stateUntilTick: number | null;
    readonly outsideLeashTicks: number;
  }): Readonly<PredatorWorldView> | null {
    const predator = this.predators.get(request.entityId);
    if (
      predator === undefined
      || predator.revision !== request.expectedRevision
    ) return null;
    predator.revision += 1;
    predator.health = request.health;
    predator.state = request.state;
    predator.targetPlayerId = request.targetPlayerId;
    predator.stateUntilTick = request.stateUntilTick;
    predator.outsideLeashTicks = request.outsideLeashTicks;
    return Object.freeze({ ...predator });
  }
}
