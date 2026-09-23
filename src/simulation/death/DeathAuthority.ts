import type { PlayerId, WorldPosition } from '../../foundation';
import type { SurvivalWorldPort } from '../../world/api/SurvivalWorld';
import type {
  Phase1ItemAuthority,
  TransferItemCommand,
} from '../items';
import type { Phase1SurvivalAuthority } from '../survival';
import type {
  DeathXpPenaltyPort,
  DeathXpPenaltyReservation,
} from './DeathXpPenaltyPort';

export interface DeathTransitionInput {
  readonly deathId: string;
  readonly playerId: PlayerId;
  readonly deathPosition: WorldPosition;
  readonly deathTick: number;
  readonly inventoryContainerId: string;
  readonly expectedInventoryRevision: number;
  readonly equippedStackIds: readonly string[];
}

export interface DeathTransitionResult {
  readonly status: 'committed' | 'duplicate' | 'rejected';
  readonly deathId: string;
  readonly cacheEntityId: string | null;
  readonly cacheContainerId: string | null;
  readonly xpLoss: number;
  readonly reason?: 'NOT_LETHAL' | 'ITEM_TRANSACTION_REJECTED';
}

export interface DeathAuthoritySnapshot {
  readonly processed: readonly DeathTransitionResult[];
}

export interface RespawnResult {
  readonly status: 'waiting' | 'rejected' | 'respawned';
  readonly playerId: PlayerId;
  readonly position: WorldPosition | null;
  readonly reason?: 'RESPAWN_UNAVAILABLE';
}

export class Phase1DeathAuthority {
  private readonly processed = new Map<string, DeathTransitionResult>();

  public constructor(
    private readonly survival: Phase1SurvivalAuthority,
    private readonly items: Phase1ItemAuthority,
    private readonly world: SurvivalWorldPort,
    private readonly xp: DeathXpPenaltyPort,
    snapshot?: DeathAuthoritySnapshot,
  ) {
    for (const result of snapshot?.processed ?? []) {
      if (
        result.status !== 'committed'
        || result.deathId.length === 0
        || this.processed.has(result.deathId)
      ) {
        throw new Error('Invalid DeathAuthority snapshot.');
      }
      this.processed.set(result.deathId, Object.freeze({ ...result }));
    }
  }

  public exportSnapshot(): DeathAuthoritySnapshot {
    return Object.freeze({
      processed: Object.freeze(
        [...this.processed.values()]
          .sort((a, b) => a.deathId.localeCompare(b.deathId))
          .map((result) => Object.freeze({ ...result })),
      ),
    });
  }

  public processDeath(input: DeathTransitionInput): DeathTransitionResult {
    const prior = this.processed.get(input.deathId);
    if (prior !== undefined) {
      return Object.freeze({ ...prior, status: 'duplicate' });
    }

    const state = this.survival.getPlayerState(input.playerId);
    const lethalEvent = this.survival.getCanonicalLethalDamage(
      input.playerId,
      input.deathTick,
    );
    if (
      state.lifeState.type !== 'alive'
      || state.healthMilli !== 0
      || state.tick !== input.deathTick
      || lethalEvent === null
    ) {
      return Object.freeze({
        status: 'rejected',
        deathId: input.deathId,
        cacheEntityId: null,
        cacheContainerId: null,
        xpLoss: 0,
        reason: 'NOT_LETHAL',
      });
    }

    let xpReservation: Readonly<DeathXpPenaltyReservation>;
    try {
      xpReservation = this.xp.reserveDeathXpPenalty({
        deathId: input.deathId,
        playerId: input.playerId,
      });
    } catch {
      return Object.freeze({
        status: 'rejected',
        deathId: input.deathId,
        cacheEntityId: null,
        cacheContainerId: null,
        xpLoss: 0,
        reason: 'ITEM_TRANSACTION_REJECTED',
      });
    }

    const inventory = this.items.getContainerView(
      input.inventoryContainerId,
    );
    const placement = inventory.stacks.length === 0
      ? null
      : this.world.reserveDeathCachePlacement({
          deathId: input.deathId,
          ownerPlayerId: input.playerId,
          requestedPosition: input.deathPosition,
        });

    const itemResult = this.items.commitDeathCacheItems({
      deathId: input.deathId,
      operationId: `death-items:${input.deathId}`,
      playerId: input.playerId,
      inventoryContainerId: input.inventoryContainerId,
      expectedInventoryRevision: input.expectedInventoryRevision,
      equippedStackIds: input.equippedStackIds,
    });
    if (itemResult.status !== 'committed') {
      this.xp.releaseDeathXpPenalty(xpReservation);
      return Object.freeze({
        status: 'rejected',
        deathId: input.deathId,
        cacheEntityId: null,
        cacheContainerId: null,
        xpLoss: 0,
        reason: 'ITEM_TRANSACTION_REJECTED',
      });
    }

    this.xp.commitReservedDeathXpPenalty(xpReservation);

    let cacheEntityId: string | null = null;
    if (itemResult.cacheContainerId !== null && placement !== null) {
      cacheEntityId = `death-cache-entity:${input.deathId}`;
      this.world.commitReservedDeathCache({
        entityId: cacheEntityId,
        deathId: input.deathId,
        ownerPlayerId: input.playerId,
        containerId: itemResult.cacheContainerId,
        reservation: placement,
      });
    }

    this.survival.markDead(
      input.playerId,
      input.deathId,
      lethalEvent,
      cacheEntityId,
      input.deathTick,
    );

    const committed: DeathTransitionResult = Object.freeze({
      status: 'committed',
      deathId: input.deathId,
      cacheEntityId,
      cacheContainerId: itemResult.cacheContainerId,
      xpLoss: xpReservation.xpLoss,
    });
    this.processed.set(input.deathId, committed);
    return committed;
  }

  public processRespawn(playerId: PlayerId, tick: number): RespawnResult {
    const before = this.survival.getPlayerState(playerId);
    if (
      before.lifeState.type !== 'dead-pending-respawn'
      || tick < before.lifeState.respawnAtTick
    ) {
      return Object.freeze({ status: 'waiting', playerId, position: null });
    }

    const worldReservation = this.world.reservePlayerRespawn(playerId);
    if (worldReservation === null) {
      return Object.freeze({
        status: 'rejected',
        playerId,
        position: null,
        reason: 'RESPAWN_UNAVAILABLE',
      });
    }

    const survivalReservation = this.survival.reserveRespawn(playerId, tick);
    if (survivalReservation === null) {
      return Object.freeze({ status: 'waiting', playerId, position: null });
    }

    this.world.commitReservedPlayerRespawn(worldReservation);
    this.survival.commitReservedRespawn(survivalReservation);
    return Object.freeze({
      status: 'respawned',
      playerId,
      position: worldReservation.position,
    });
  }

  public recoverFromDeathCache(command: TransferItemCommand) {
    const cache = this.world.getDeathCacheByContainer(
      command.sourceContainerId,
    );
    const result = this.items.execute(command);
    if (result.status !== 'committed' || cache === null) {
      return result;
    }
    const remaining = this.items.getContainerView(command.sourceContainerId);
    if (remaining.stacks.length === 0) {
      this.world.removeEmptyDeathCache(cache.entityId, cache.revision);
    }
    return result;
  }

}
