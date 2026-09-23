import type {
  ContentCatalogV1,
  ItemDefinitionV1,
} from '../../content';
import type { PlayerId } from '../../foundation';
import { type Phase1ItemAuthority } from '../items';
import {
  SURVIVAL_MAX_MILLI,
  SURVIVAL_STAT_SCALE,
  type ConsumeRequest,
  type ConsumeStartResult,
  type ConsumeTickResult,
  type DamageEvent,
  type DamageResult,
  type PlayerLifeState,
  type PlayerSurvivalState,
  type PlayerSurvivalView,
  type SurvivalAuthoritySnapshot,
  type SurvivalDamageSource,
  type SurvivalRespawnReservation,
  type SurvivalStaminaReservation,
  type SurvivalTickContext,
} from './SurvivalTypes';

const TICKS_PER_MINUTE = 60 * 60;
const STAMINA_REGEN_DELAY_TICKS = 60;

interface MutablePlayerState {
  playerId: PlayerId;
  revision: number;
  tick: number;
  healthMilli: number;
  foodMilli: number;
  waterMilli: number;
  staminaMilli: number;
  temperatureMilli: number;
  waterDrainRemainder: number;
  foodDrainRemainder: number;
  thermalRemainder: number;
  staminaRegenRemainder: number;
  lastStaminaSpendTick: number | null;
  nextCriticalDehydrationDamageTick: number | null;
  nextCriticalStarvationDamageTick: number | null;
  nextTemperatureDamageTick: number | null;
  lifeState: PlayerLifeState;
}

interface ActiveConsume {
  readonly request: ConsumeRequest;
  readonly item: Readonly<ItemDefinitionV1>;
  elapsedTicks: number;
  canceledReason: 'CANCELED' | 'HOSTILE_DAMAGE' | null;
}

interface DamageBatch {
  readonly tick: number;
  readonly healthBeforeMilli: number;
  readonly events: Map<string, DamageEvent>;
}

interface StaminaReservationState {
  readonly reservation: SurvivalStaminaReservation;
  committed: boolean;
  released: boolean;
}

interface RespawnReservationState {
  readonly reservation: SurvivalRespawnReservation;
  committed: boolean;
}

function clampMilli(value: number): number {
  return Math.max(0, Math.min(SURVIVAL_MAX_MILLI, value));
}

function canonicalState(state: MutablePlayerState): PlayerSurvivalState {
  return Object.freeze({
    ...state,
    lifeState: Object.freeze({ ...state.lifeState }),
  });
}

function cloneState(state: PlayerSurvivalState): MutablePlayerState {
  return {
    ...state,
    lifeState: { ...state.lifeState },
  };
}

function toPoints(valueMilli: number): number {
  return valueMilli / SURVIVAL_STAT_SCALE;
}

function applyRationalDecrease(
  value: number,
  remainder: number,
  numeratorPerTick: number,
  denominator: number,
): { readonly value: number; readonly remainder: number } {
  const total = remainder + numeratorPerTick;
  const delta = Math.floor(total / denominator);
  return {
    value: clampMilli(value - delta),
    remainder: total % denominator,
  };
}

function applyRationalIncrease(
  value: number,
  remainder: number,
  numeratorPerTick: number,
  denominator: number,
): { readonly value: number; readonly remainder: number } {
  const total = remainder + numeratorPerTick;
  const delta = Math.floor(total / denominator);
  return {
    value: clampMilli(value + delta),
    remainder: total % denominator,
  };
}

function temperaturePenalty(temperature: number): number {
  if (temperature <= 4 || temperature >= 96) return 100;
  if (
    (temperature >= 5 && temperature <= 19)
    || (temperature >= 81 && temperature <= 95)
  ) return 40;
  if (
    (temperature >= 20 && temperature <= 34)
    || (temperature >= 66 && temperature <= 80)
  ) return 10;
  return 0;
}

function waterPenalty(water: number): number {
  if (water <= 0) return 100;
  if (water <= 24) return 30;
  if (water <= 49) return 10;
  return 0;
}

function foodPenalty(food: number): number {
  if (food <= 0) return 40;
  if (food <= 19) return 25;
  if (food <= 39) return 10;
  return 0;
}

function carryPenalty(carryState: SurvivalTickContext['carryState']): number {
  if (carryState === 'HEAVY') return 20;
  if (carryState === 'OVERLOADED') return 50;
  return 0;
}

function staminaPenalty(
  state: MutablePlayerState,
  carryState: SurvivalTickContext['carryState'],
): number {
  return Math.min(
    100,
    waterPenalty(toPoints(state.waterMilli))
      + foodPenalty(toPoints(state.foodMilli))
      + temperaturePenalty(toPoints(state.temperatureMilli))
      + carryPenalty(carryState),
  );
}

const ENVIRONMENT_DAMAGE_ORDER: Readonly<Record<
  Exclude<SurvivalDamageSource, 'hostile-attack'>,
  number
>> = Object.freeze({
  'severe-temperature': 0,
  'critical-temperature': 1,
  'critical-dehydration': 2,
  'critical-starvation': 3,
});

function compareDamageEvents(left: DamageEvent, right: DamageEvent): number {
  const leftHostile = left.sourceType === 'hostile-attack';
  const rightHostile = right.sourceType === 'hostile-attack';
  if (leftHostile !== rightHostile) {
    return leftHostile ? 1 : -1;
  }

  if (!leftHostile && !rightHostile) {
    const leftOrder = ENVIRONMENT_DAMAGE_ORDER[
      left.sourceType as Exclude<SurvivalDamageSource, 'hostile-attack'>
    ];
    const rightOrder = ENVIRONMENT_DAMAGE_ORDER[
      right.sourceType as Exclude<SurvivalDamageSource, 'hostile-attack'>
    ];
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  }

  if (left.damageId !== right.damageId) {
    return left.damageId < right.damageId ? -1 : 1;
  }
  const leftEntity = left.sourceEntityId ?? '';
  const rightEntity = right.sourceEntityId ?? '';
  return leftEntity < rightEntity ? -1 : leftEntity > rightEntity ? 1 : 0;
}

function damagingTemperature(
  value: number,
): { readonly source: SurvivalDamageSource; readonly cadence: number } | null {
  if (value <= 4 || value >= 96) {
    return { source: 'critical-temperature', cadence: 180 };
  }
  if (
    (value >= 5 && value <= 19)
    || (value >= 81 && value <= 95)
  ) {
    return { source: 'severe-temperature', cadence: 600 };
  }
  return null;
}

function validateState(state: PlayerSurvivalState): void {
  const milliValues = [
    state.healthMilli,
    state.foodMilli,
    state.waterMilli,
    state.staminaMilli,
    state.temperatureMilli,
  ];
  if (
    state.playerId.length === 0
    || !Number.isSafeInteger(state.revision)
    || state.revision < 0
    || !Number.isSafeInteger(state.tick)
    || state.tick < 0
    || milliValues.some(
      (value) =>
        !Number.isSafeInteger(value)
        || value < 0
        || value > SURVIVAL_MAX_MILLI,
    )
  ) {
    throw new Error('Invalid survival snapshot state.');
  }
}

export interface Phase1SurvivalAuthorityOptions {
  readonly catalog: ContentCatalogV1;
  readonly items: Phase1ItemAuthority;
  readonly snapshot?: SurvivalAuthoritySnapshot;
}

export class Phase1SurvivalAuthority {
  private readonly players = new Map<PlayerId, MutablePlayerState>();
  private readonly appliedDamageIds = new Set<string>();
  private readonly lethalDamageEvents = new Map<PlayerId, DamageEvent>();
  private readonly damageBatches = new Map<PlayerId, DamageBatch>();
  private readonly staminaReservations =
    new Map<string, StaminaReservationState>();
  private readonly respawnReservations =
    new Map<PlayerId, RespawnReservationState>();
  private readonly activeConsumes = new Map<PlayerId, ActiveConsume>();

  public constructor(private readonly options: Phase1SurvivalAuthorityOptions) {
    if (options.snapshot !== undefined) {
      for (const player of options.snapshot.players) {
        validateState(player);
        if (this.players.has(player.playerId)) {
          throw new Error('Duplicate player survival state.');
        }
        this.players.set(player.playerId, cloneState(player));
      }
      for (const damageId of options.snapshot.appliedDamageIds) {
        if (damageId.length === 0 || this.appliedDamageIds.has(damageId)) {
          throw new Error('Invalid applied DamageId snapshot.');
        }
        this.appliedDamageIds.add(damageId);
      }
      for (const event of options.snapshot.lethalDamageEvents ?? []) {
        if (
          event.damageId.length === 0
          || this.lethalDamageEvents.has(event.targetPlayerId)
          || !this.appliedDamageIds.has(event.damageId)
        ) {
          throw new Error('Invalid lethal DamageEvent snapshot.');
        }
        this.lethalDamageEvents.set(
          event.targetPlayerId,
          Object.freeze({ ...event }),
        );
      }
    }
  }

  public registerPlayer(playerId: PlayerId): void {
    if (playerId.length === 0 || this.players.has(playerId)) {
      throw new Error('Invalid or duplicate player registration.');
    }
    this.players.set(playerId, {
      playerId,
      revision: 0,
      tick: 0,
      healthMilli: 100000,
      foodMilli: 70000,
      waterMilli: 80000,
      staminaMilli: 100000,
      temperatureMilli: 50000,
      waterDrainRemainder: 0,
      foodDrainRemainder: 0,
      thermalRemainder: 0,
      staminaRegenRemainder: 0,
      lastStaminaSpendTick: null,
      nextCriticalDehydrationDamageTick: null,
      nextCriticalStarvationDamageTick: null,
      nextTemperatureDamageTick: null,
      lifeState: { type: 'alive' },
    });
  }

  public getPlayerState(playerId: PlayerId): PlayerSurvivalState {
    return canonicalState(this.requirePlayer(playerId));
  }

  public getPlayerView(
    playerId: PlayerId,
    carryState: SurvivalTickContext['carryState'] = 'NORMAL',
  ): PlayerSurvivalView {
    const state = this.requirePlayer(playerId);
    return Object.freeze({
      playerId,
      revision: state.revision,
      tick: state.tick,
      health: toPoints(state.healthMilli),
      food: toPoints(state.foodMilli),
      water: toPoints(state.waterMilli),
      stamina: toPoints(state.staminaMilli),
      temperature: toPoints(state.temperatureMilli),
      lifeState: Object.freeze({ ...state.lifeState }),
      staminaRegenPenaltyPercent: staminaPenalty(state, carryState),
    });
  }

  public exportSnapshot(): SurvivalAuthoritySnapshot {
    return Object.freeze({
      players: Object.freeze(
        [...this.players.values()]
          .sort((left, right) =>
            left.playerId < right.playerId ? -1 : left.playerId > right.playerId ? 1 : 0,
          )
          .map(canonicalState),
      ),
      appliedDamageIds: Object.freeze([...this.appliedDamageIds].sort()),
      lethalDamageEvents: Object.freeze(
        [...this.lethalDamageEvents.values()]
          .sort((left, right) =>
            left.targetPlayerId < right.targetPlayerId
              ? -1
              : left.targetPlayerId > right.targetPlayerId
                ? 1
                : compareDamageEvents(left, right),
          )
          .map((event) => Object.freeze({ ...event })),
      ),
    });
  }

  public stepPlayer(
    playerId: PlayerId,
    tick: number,
    context: SurvivalTickContext,
  ): readonly DamageResult[] {
    const state = this.requirePlayer(playerId);
    if (!Number.isSafeInteger(tick) || tick !== state.tick + 1) {
      throw new Error('Survival tick must advance exactly one authoritative tick.');
    }
    state.tick = tick;

    if (state.lifeState.type !== 'alive') {
      return Object.freeze([]);
    }

    const water = applyRationalDecrease(
      state.waterMilli,
      state.waterDrainRemainder,
      1000,
      TICKS_PER_MINUTE,
    );
    state.waterMilli = water.value;
    state.waterDrainRemainder = water.remainder;

    const food = applyRationalDecrease(
      state.foodMilli,
      state.foodDrainRemainder,
      600,
      TICKS_PER_MINUTE,
    );
    state.foodMilli = food.value;
    state.foodDrainRemainder = food.remainder;

    const targetMilli = clampMilli(context.thermalTarget * SURVIVAL_STAT_SCALE);
    if (state.temperatureMilli !== targetMilli) {
      const movingAwayFromComfort =
        (state.temperatureMilli < 35000 && targetMilli < state.temperatureMilli)
        || (state.temperatureMilli > 65000 && targetMilli > state.temperatureMilli)
        || (
          state.temperatureMilli >= 35000
          && state.temperatureMilli <= 65000
          && (targetMilli < 35000 || targetMilli > 65000)
        );
      const thermalNumerator =
        context.thermalWrapActive && movingAwayFromComfort ? 3000 : 6000;
      const total = state.thermalRemainder + thermalNumerator;
      const delta = Math.floor(total / TICKS_PER_MINUTE);
      state.thermalRemainder = total % TICKS_PER_MINUTE;
      if (delta > 0) {
        state.temperatureMilli =
          state.temperatureMilli < targetMilli
            ? Math.min(targetMilli, state.temperatureMilli + delta)
            : Math.max(targetMilli, state.temperatureMilli - delta);
      }
    } else {
      state.thermalRemainder = 0;
    }

    if (
      state.lastStaminaSpendTick === null
      || tick - state.lastStaminaSpendTick >= STAMINA_REGEN_DELAY_TICKS
    ) {
      const penalty = staminaPenalty(state, context.carryState);
      const regenNumerator = 15000 * (100 - penalty);
      const stamina = applyRationalIncrease(
        state.staminaMilli,
        state.staminaRegenRemainder,
        regenNumerator,
        60 * 100,
      );
      state.staminaMilli = stamina.value;
      state.staminaRegenRemainder = stamina.remainder;
    }

    const damageResults: DamageResult[] = [];

    const waterPoints = toPoints(state.waterMilli);
    if (waterPoints <= 0) {
      if (state.nextCriticalDehydrationDamageTick === null) {
        state.nextCriticalDehydrationDamageTick = tick + 300;
      } else if (tick >= state.nextCriticalDehydrationDamageTick) {
        damageResults.push(this.applyAuthorityDamage({
          damageId: `critical-dehydration:${playerId}:${tick}`,
          sourceType: 'critical-dehydration',
          sourceEntityId: null,
          targetPlayerId: playerId,
          amount: 1,
          tick,
        }));
        state.nextCriticalDehydrationDamageTick = tick + 300;
      }
    } else {
      state.nextCriticalDehydrationDamageTick = null;
    }

    const foodPoints = toPoints(state.foodMilli);
    if (foodPoints <= 0) {
      if (state.nextCriticalStarvationDamageTick === null) {
        state.nextCriticalStarvationDamageTick = tick + 600;
      } else if (tick >= state.nextCriticalStarvationDamageTick) {
        damageResults.push(this.applyAuthorityDamage({
          damageId: `critical-starvation:${playerId}:${tick}`,
          sourceType: 'critical-starvation',
          sourceEntityId: null,
          targetPlayerId: playerId,
          amount: 1,
          tick,
        }));
        state.nextCriticalStarvationDamageTick = tick + 600;
      }
    } else {
      state.nextCriticalStarvationDamageTick = null;
    }

    const temperatureDamage = damagingTemperature(
      toPoints(state.temperatureMilli),
    );
    if (temperatureDamage === null) {
      state.nextTemperatureDamageTick = null;
    } else if (state.nextTemperatureDamageTick === null) {
      state.nextTemperatureDamageTick = tick + temperatureDamage.cadence;
    } else if (tick >= state.nextTemperatureDamageTick) {
      damageResults.push(this.applyAuthorityDamage({
        damageId: `${temperatureDamage.source}:${playerId}:${tick}`,
        sourceType: temperatureDamage.source,
        sourceEntityId: null,
        targetPlayerId: playerId,
        amount: 1,
        tick,
      }));
      state.nextTemperatureDamageTick = tick + temperatureDamage.cadence;
    }

    state.revision += 1;
    return Object.freeze(damageResults);
  }

  public applyAuthorityDamage(event: DamageEvent): DamageResult {
    const state = this.requirePlayer(event.targetPlayerId);

    if (
      event.damageId.length === 0
      || !Number.isSafeInteger(event.amount)
      || event.amount <= 0
      || event.tick !== state.tick
    ) {
      throw new Error('Damage event is invalid for current authoritative tick.');
    }

    if (this.appliedDamageIds.has(event.damageId)) {
      return Object.freeze({
        status: 'duplicate',
        healthAfter: toPoints(state.healthMilli),
        lethal: state.healthMilli === 0,
        event,
      });
    }

    this.appliedDamageIds.add(event.damageId);

    if (state.lifeState.type !== 'alive') {
      return Object.freeze({
        status: 'ignored-dead',
        healthAfter: toPoints(state.healthMilli),
        lethal: true,
        event,
      });
    }

    let batch = this.damageBatches.get(event.targetPlayerId);
    if (batch === undefined || batch.tick !== event.tick) {
      batch = {
        tick: event.tick,
        healthBeforeMilli: state.healthMilli,
        events: new Map<string, DamageEvent>(),
      };
      this.damageBatches.set(event.targetPlayerId, batch);
    }
    batch.events.set(event.damageId, Object.freeze({ ...event }));

    const orderedEvents = [...batch.events.values()].sort(compareDamageEvents);
    let healthMilli = batch.healthBeforeMilli;
    let lethalEvent: DamageEvent | null = null;
    for (const orderedEvent of orderedEvents) {
      const before = healthMilli;
      healthMilli = Math.max(
        0,
        healthMilli - orderedEvent.amount * SURVIVAL_STAT_SCALE,
      );
      if (lethalEvent === null && before > 0 && healthMilli === 0) {
        lethalEvent = orderedEvent;
      }
    }

    state.healthMilli = healthMilli;
    if (lethalEvent === null) {
      const existing = this.lethalDamageEvents.get(event.targetPlayerId);
      if (existing?.tick === event.tick) {
        this.lethalDamageEvents.delete(event.targetPlayerId);
      }
    } else {
      this.lethalDamageEvents.set(
        event.targetPlayerId,
        Object.freeze({ ...lethalEvent }),
      );
    }
    state.revision += 1;

    if (event.sourceType === 'hostile-attack') {
      const consume = this.activeConsumes.get(event.targetPlayerId);
      if (consume !== undefined) {
        consume.canceledReason = 'HOSTILE_DAMAGE';
      }
    }

    return Object.freeze({
      status: 'applied',
      healthAfter: toPoints(state.healthMilli),
      lethal: state.healthMilli === 0,
      event,
    });
  }

  public getCanonicalLethalDamage(
    playerId: PlayerId,
    tick: number,
  ): Readonly<DamageEvent> | null {
    const event = this.lethalDamageEvents.get(playerId);
    if (event === undefined || event.tick !== tick) return null;
    return Object.freeze({ ...event });
  }

  public canSpendStamina(playerId: PlayerId, amount: number): boolean {
    const state = this.requirePlayer(playerId);
    const reservedMilli = [...this.staminaReservations.values()]
      .filter(
        (entry) =>
          entry.reservation.playerId === playerId
          && !entry.committed
          && !entry.released,
      )
      .reduce((sum, entry) => sum + entry.reservation.amountMilli, 0);
    return (
      state.lifeState.type === 'alive'
      && Number.isSafeInteger(amount)
      && amount > 0
      && state.staminaMilli - reservedMilli
        >= amount * SURVIVAL_STAT_SCALE
    );
  }

  public reserveStaminaSpend(
    reservationId: string,
    playerId: PlayerId,
    amount: number,
  ): Readonly<SurvivalStaminaReservation> | null {
    const existing = this.staminaReservations.get(reservationId);
    if (existing !== undefined) {
      if (
        existing.reservation.playerId !== playerId
        || existing.reservation.amountMilli !== amount * SURVIVAL_STAT_SCALE
      ) {
        return null;
      }
      return existing.released
        ? null
        : existing.reservation;
    }
    if (
      reservationId.length === 0
      || !this.canSpendStamina(playerId, amount)
    ) {
      return null;
    }
    const state = this.requirePlayer(playerId);
    const reservation: SurvivalStaminaReservation = Object.freeze({
      reservationId,
      playerId,
      amountMilli: amount * SURVIVAL_STAT_SCALE,
      reservedAtTick: state.tick,
    });
    this.staminaReservations.set(reservationId, {
      reservation,
      committed: false,
      released: false,
    });
    return reservation;
  }

  public commitReservedStaminaSpend(
    reservation: Readonly<SurvivalStaminaReservation>,
  ): void {
    const entry = this.staminaReservations.get(reservation.reservationId);
    if (
      entry === undefined
      || entry.committed
      || entry.released
      || entry.reservation.playerId !== reservation.playerId
      || entry.reservation.amountMilli !== reservation.amountMilli
    ) {
      return;
    }
    const state = this.players.get(reservation.playerId);
    if (state === undefined) return;
    state.staminaMilli = Math.max(
      0,
      state.staminaMilli - reservation.amountMilli,
    );
    state.lastStaminaSpendTick = state.tick;
    state.staminaRegenRemainder = 0;
    state.revision += 1;
    entry.committed = true;
  }

  public releaseStaminaReservation(
    reservation: Readonly<SurvivalStaminaReservation>,
  ): void {
    const entry = this.staminaReservations.get(reservation.reservationId);
    if (
      entry === undefined
      || entry.committed
      || entry.released
      || entry.reservation.playerId !== reservation.playerId
    ) {
      return;
    }
    entry.released = true;
  }

  public commitStaminaSpend(
    playerId: PlayerId,
    amount: number,
    tick: number,
  ): void {
    const state = this.requirePlayer(playerId);
    if (
      !this.canSpendStamina(playerId, amount)
      || tick !== state.tick
    ) {
      throw new Error('Stamina spend was not prevalidated.');
    }
    state.staminaMilli -= amount * SURVIVAL_STAT_SCALE;
    state.lastStaminaSpendTick = tick;
    state.staminaRegenRemainder = 0;
    state.revision += 1;
  }

  public beginConsume(request: ConsumeRequest): ConsumeStartResult {
    const state = this.requirePlayer(request.playerId);
    if (state.lifeState.type !== 'alive') {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'DEAD',
      });
    }
    if (this.activeConsumes.has(request.playerId)) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'OPERATION_CONFLICT',
      });
    }

    let inventory;
    try {
      inventory = this.options.items.getContainerView(
        request.inventoryContainerId,
      );
    } catch {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    if (
      inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== request.playerId
    ) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    if (inventory.revision !== request.expectedInventoryRevision) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'STALE_REVISION',
      });
    }
    const stack = inventory.stacks.find(
      (entry) => entry.stackId === request.sourceStackId,
    );
    if (stack === undefined) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    const item = this.options.catalog.getAs(stack.itemDefinitionId, 'item');
    if (item.useProfile?.type !== 'restore-stat') {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    if (
      item.useProfile.stat === 'health'
      && state.healthMilli >= SURVIVAL_MAX_MILLI
    ) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'NO_MEANINGFUL_EFFECT',
      });
    }

    this.activeConsumes.set(request.playerId, {
      request,
      item,
      elapsedTicks: 0,
      canceledReason: null,
    });
    return Object.freeze({
      status: 'started',
      operationId: request.operationId,
      requiredTicks: 60,
    });
  }

  public cancelConsume(playerId: PlayerId): boolean {
    const active = this.activeConsumes.get(playerId);
    if (active === undefined) return false;
    active.canceledReason = 'CANCELED';
    return true;
  }

  public tickConsume(playerId: PlayerId): ConsumeTickResult {
    const active = this.activeConsumes.get(playerId);
    if (active === undefined) {
      return Object.freeze({ status: 'idle' });
    }
    if (active.canceledReason !== null) {
      this.activeConsumes.delete(playerId);
      return Object.freeze({
        status: 'canceled',
        operationId: active.request.operationId,
        reason: active.canceledReason,
      });
    }

    active.elapsedTicks += 1;
    if (active.elapsedTicks < 60) {
      return Object.freeze({
        status: 'channeling',
        operationId: active.request.operationId,
        elapsedTicks: active.elapsedTicks,
        requiredTicks: 60,
      });
    }

    const state = this.requirePlayer(playerId);
    if (state.lifeState.type !== 'alive') {
      this.activeConsumes.delete(playerId);
      return Object.freeze({
        status: 'canceled',
        operationId: active.request.operationId,
        reason: 'CANCELED',
      });
    }

    const itemResult = this.options.items.execute({
      type: 'consume',
      operationId: active.request.operationId,
      playerId,
      inventoryContainerId: active.request.inventoryContainerId,
      expectedInventoryRevision: active.request.expectedInventoryRevision,
      sourceStackId: active.request.sourceStackId,
    });
    this.activeConsumes.delete(playerId);
    if (itemResult.status !== 'committed') {
      return Object.freeze({
        status: 'resolved',
        operationId: active.request.operationId,
        committed: false,
      });
    }

    const profile = active.item.useProfile;
    if (profile?.type !== 'restore-stat') {
      throw new Error('Validated consumable lost its restore-stat profile.');
    }
    const delta = profile.amount * SURVIVAL_STAT_SCALE;
    if (profile.stat === 'health') {
      state.healthMilli = clampMilli(state.healthMilli + delta);
    } else if (profile.stat === 'food') {
      state.foodMilli = clampMilli(state.foodMilli + delta);
    } else {
      state.waterMilli = clampMilli(state.waterMilli + delta);
    }
    state.revision += 1;

    return Object.freeze({
      status: 'resolved',
      operationId: active.request.operationId,
      committed: true,
    });
  }

  public markDead(
    playerId: PlayerId,
    deathId: string,
    lethalEvent: Readonly<DamageEvent>,
    deathCacheEntityId: string | null,
    deathTick: number,
  ): PlayerSurvivalState {
    const state = this.requirePlayer(playerId);
    if (state.lifeState.type !== 'alive') {
      if (state.lifeState.deathId !== deathId) {
        throw new Error('Player is already dead under a different DeathId.');
      }
      return canonicalState(state);
    }
    const canonicalLethal = this.getCanonicalLethalDamage(playerId, deathTick);
    if (
      state.healthMilli !== 0
      || state.tick !== deathTick
      || canonicalLethal === null
      || canonicalLethal.damageId !== lethalEvent.damageId
    ) {
      throw new Error('Death transition requires canonical lethal event.');
    }
    this.respawnReservations.delete(playerId);
    state.lifeState = {
      type: 'dead-pending-respawn',
      deathId,
      respawnAtTick: deathTick + 300,
      deathCause: canonicalLethal.sourceType,
      deathCacheEntityId,
    };
    state.revision += 1;
    this.activeConsumes.delete(playerId);
    return canonicalState(state);
  }

  public reserveRespawn(
    playerId: PlayerId,
    tick: number,
  ): Readonly<SurvivalRespawnReservation> | null {
    const existing = this.respawnReservations.get(playerId);
    if (existing !== undefined) {
      return existing.committed ? null : existing.reservation;
    }
    const state = this.requirePlayer(playerId);
    if (
      state.lifeState.type !== 'dead-pending-respawn'
      || tick < state.lifeState.respawnAtTick
    ) {
      return null;
    }
    const reservation: SurvivalRespawnReservation = Object.freeze({
      reservationId:
        `survival-respawn:${playerId}:${state.lifeState.deathId}`,
      playerId,
      deathId: state.lifeState.deathId,
      respawnTick: tick,
    });
    this.respawnReservations.set(playerId, {
      reservation,
      committed: false,
    });
    return reservation;
  }

  public commitReservedRespawn(
    reservation: Readonly<SurvivalRespawnReservation>,
  ): PlayerSurvivalState {
    const entry = this.respawnReservations.get(reservation.playerId);
    const state = this.requirePlayer(reservation.playerId);
    if (
      entry === undefined
      || entry.committed
      || entry.reservation.reservationId !== reservation.reservationId
    ) {
      return canonicalState(state);
    }

    state.tick = reservation.respawnTick;
    state.healthMilli = 100000;
    state.waterMilli = 50000;
    state.foodMilli = 50000;
    state.staminaMilli = 100000;
    state.temperatureMilli = 50000;
    state.waterDrainRemainder = 0;
    state.foodDrainRemainder = 0;
    state.thermalRemainder = 0;
    state.staminaRegenRemainder = 0;
    state.lastStaminaSpendTick = null;
    state.nextCriticalDehydrationDamageTick = null;
    state.nextCriticalStarvationDamageTick = null;
    state.nextTemperatureDamageTick = null;
    state.lifeState = { type: 'alive' };
    state.revision += 1;
    entry.committed = true;
    this.damageBatches.delete(reservation.playerId);
    this.lethalDamageEvents.delete(reservation.playerId);
    return canonicalState(state);
  }

  private requirePlayer(playerId: PlayerId): MutablePlayerState {
    const state = this.players.get(playerId);
    if (state === undefined) {
      throw new Error(`Unknown survival player: ${playerId}`);
    }
    return state;
  }
}
