import type { PlayerId, WorldPosition } from '../../foundation';
import type { SurvivalWorldPort } from '../../world/api/SurvivalWorld';
import type {
  Phase1ItemAuthority,
  TransferItemCommand,
} from '../items';
import type { Phase1SurvivalAuthority, SurvivalDamageSource } from '../survival';
import type {
  DeathXpPenaltyPort,
  DeathXpPenaltyReservation,
} from './DeathXpPenaltyPort';

export interface DeathTransitionInput {
  readonly deathId: string;
  readonly playerId: PlayerId;
  readonly deathCause: SurvivalDamageSource;
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

export interface RespawnResult {
  readonly status: 'waiting' | 'respawned';
  readonly playerId: PlayerId;
  readonly position: WorldPosition | null;
}

export class Phase1DeathAuthority {
  private readonly processed = new Map<string, DeathTransitionResult>();

  public constructor(
    private readonly survival: Phase1SurvivalAuthority,
    private readonly items: Phase1ItemAuthority,
    private readonly world: SurvivalWorldPort,
    private readonly xp: DeathXpPenaltyPort,
  ) {}

  public processDeath(input: DeathTransitionInput): DeathTransitionResult {
    const prior = this.processed.get(input.deathId);
    if (prior !== undefined) {
      return Object.freeze({ ...prior, status: 'duplicate' });
    }
    const state = this.survival.getPlayerState(input.playerId);
    if (
      state.lifeState.type !== 'alive'
      || state.healthMilli !== 0
      || state.tick !== input.deathTick
    ) {
      return this.cache(input.deathId, {
        status:'rejected', deathId:input.deathId,
        cacheEntityId:null,cacheContainerId:null,xpLoss:0,reason:'NOT_LETHAL',
      });
    }

    let xpReservation: Readonly<DeathXpPenaltyReservation>;
    try {
      xpReservation = this.xp.reserveDeathXpPenalty({
        deathId: input.deathId,
        playerId: input.playerId,
      });
    } catch {
      return this.cache(input.deathId, {
        status:'rejected',deathId:input.deathId,
        cacheEntityId:null,cacheContainerId:null,xpLoss:0,reason:'ITEM_TRANSACTION_REJECTED',
      });
    }

    const inventory = this.items.getContainerView(input.inventoryContainerId);
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
      return this.cache(input.deathId, {
        status:'rejected',deathId:input.deathId,
        cacheEntityId:null,cacheContainerId:null,xpLoss:0,
        reason:'ITEM_TRANSACTION_REJECTED',
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
      input.deathCause,
      cacheEntityId,
      input.deathTick,
    );

    return this.cache(input.deathId, {
      status:'committed',
      deathId:input.deathId,
      cacheEntityId,
      cacheContainerId:itemResult.cacheContainerId,
      xpLoss:xpReservation.xpLoss,
    });
  }

  public processRespawn(playerId: PlayerId, tick: number): RespawnResult {
    const before = this.survival.getPlayerState(playerId);
    if (
      before.lifeState.type !== 'dead-pending-respawn'
      || tick < before.lifeState.respawnAtTick
    ) {
      return Object.freeze({ status:'waiting', playerId, position:null });
    }
    const anchor = this.world.getRespawnAnchor(playerId);
    this.survival.processRespawn(playerId, tick);
    this.world.commitPlayerRespawnPosition(playerId, anchor);
    return Object.freeze({ status:'respawned', playerId, position:anchor });
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

  private cache(id:string,result:DeathTransitionResult):DeathTransitionResult {
    const frozen=Object.freeze(result); this.processed.set(id,frozen); return frozen;
  }
}
