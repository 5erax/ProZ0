import {
  createWorldPosition,
  type PlayerId,
  type WorldPosition,
} from '../../foundation';
import type {
  DeathCachePlacementReservation,
  DeathCacheWorldView,
} from '../api/SurvivalWorld';

export const DEATH_CACHE_SEARCH_STEP_WORLD_UNITS = 0.625;
export const DEATH_CACHE_SEARCH_MAX_STEPS = 3;

export interface DeathCacheWorldSnapshot {
  readonly caches: readonly DeathCacheWorldView[];
}

export interface DeathCachePlacementResolver {
  isValid(position: WorldPosition): boolean;
  nearestReachableFallback(position: WorldPosition): WorldPosition;
}

function samePosition(a: WorldPosition, b: WorldPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function candidates(origin: WorldPosition): readonly WorldPosition[] {
  const values: WorldPosition[] = [origin];
  const diagonalScale = Math.SQRT1_2;
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [diagonalScale, -diagonalScale],
    [diagonalScale, diagonalScale],
    [-diagonalScale, diagonalScale],
    [-diagonalScale, -diagonalScale],
  ] as const;

  for (let step = 1; step <= DEATH_CACHE_SEARCH_MAX_STEPS; step += 1) {
    const radius = DEATH_CACHE_SEARCH_STEP_WORLD_UNITS * step;
    for (const [dx, dy] of directions) {
      values.push(createWorldPosition(
        origin.x + dx * radius,
        origin.y + dy * radius,
      ));
    }
  }
  return Object.freeze(values);
}

export function resolveDeathCachePlacement(
  requestedPosition: WorldPosition,
  resolver: DeathCachePlacementResolver,
): WorldPosition {
  for (const candidate of candidates(requestedPosition)) {
    if (resolver.isValid(candidate)) {
      return candidate;
    }
  }

  const fallback = resolver.nearestReachableFallback(requestedPosition);
  if (!resolver.isValid(fallback)) {
    throw new Error('Death Cache fallback must be valid and reachable.');
  }
  return fallback;
}

function freezeCache(cache: DeathCacheWorldView): DeathCacheWorldView {
  return Object.freeze({
    entityId: cache.entityId,
    deathId: cache.deathId,
    ownerPlayerId: cache.ownerPlayerId,
    containerId: cache.containerId,
    position: createWorldPosition(cache.position.x, cache.position.y),
    revision: cache.revision,
  });
}

export class DeathCacheWorldState {
  private readonly caches = new Map<string, DeathCacheWorldView>();
  private readonly reservations = new Map<string, DeathCachePlacementReservation>();

  public constructor(snapshot?: DeathCacheWorldSnapshot) {
    for (const cache of snapshot?.caches ?? []) {
      if (
        cache.entityId.length === 0
        || cache.deathId.length === 0
        || cache.containerId.length === 0
        || !Number.isSafeInteger(cache.revision)
        || cache.revision < 0
        || this.caches.has(cache.entityId)
        || [...this.caches.values()].some(
          (entry) =>
            entry.deathId === cache.deathId
            || entry.containerId === cache.containerId,
        )
      ) {
        throw new Error('Invalid Death Cache world snapshot.');
      }
      this.caches.set(cache.entityId, freezeCache(cache));
    }
  }

  public reservePlacement(
    request: {
      readonly deathId: string;
      readonly ownerPlayerId: PlayerId;
      readonly requestedPosition: WorldPosition;
    },
    resolver: DeathCachePlacementResolver,
  ): Readonly<DeathCachePlacementReservation> {
    const existing = this.reservations.get(request.deathId);
    if (existing !== undefined) return existing;

    const position = resolveDeathCachePlacement(
      request.requestedPosition,
      resolver,
    );
    const reservation = Object.freeze({
      token: [
        'death-cache-placement',
        request.deathId,
        request.ownerPlayerId,
        position.x,
        position.y,
      ].join(':'),
      position,
    });
    this.reservations.set(request.deathId, reservation);
    return reservation;
  }

  public commitReserved(request: {
    readonly entityId: string;
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly containerId: string;
    readonly reservation: DeathCachePlacementReservation;
  }): Readonly<DeathCacheWorldView> {
    const existing = this.caches.get(request.entityId);
    if (existing !== undefined) {
      if (
        existing.deathId !== request.deathId
        || existing.ownerPlayerId !== request.ownerPlayerId
        || existing.containerId !== request.containerId
        || !samePosition(existing.position, request.reservation.position)
      ) {
        throw new Error('Death Cache entity identity conflict.');
      }
      return existing;
    }

    const reserved = this.reservations.get(request.deathId);
    if (
      reserved === undefined
      || reserved.token !== request.reservation.token
      || !samePosition(reserved.position, request.reservation.position)
    ) {
      throw new Error('Death Cache placement was not reserved.');
    }

    const cache = freezeCache({
      entityId: request.entityId,
      deathId: request.deathId,
      ownerPlayerId: request.ownerPlayerId,
      containerId: request.containerId,
      position: request.reservation.position,
      revision: 0,
    });
    this.caches.set(cache.entityId, cache);
    this.reservations.delete(request.deathId);
    return cache;
  }

  public getByContainer(containerId: string): Readonly<DeathCacheWorldView> | null {
    return (
      [...this.caches.values()].find(
        (cache) => cache.containerId === containerId,
      ) ?? null
    );
  }

  public removeEmpty(entityId: string, expectedRevision: number): boolean {
    const cache = this.caches.get(entityId);
    if (cache === undefined || cache.revision !== expectedRevision) return false;
    return this.caches.delete(entityId);
  }

  public exportSnapshot(): DeathCacheWorldSnapshot {
    return Object.freeze({
      caches: Object.freeze(
        [...this.caches.values()]
          .sort((a, b) => a.entityId.localeCompare(b.entityId))
          .map(freezeCache),
      ),
    });
  }
}
