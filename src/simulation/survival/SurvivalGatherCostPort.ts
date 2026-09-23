import type { ContentCatalogV1 } from '../../content';
import type {
  GatherCostPort,
  GatherCostReservation,
  GatherCostReservationResult,
} from '../items';
import type { Phase1SurvivalAuthority } from './SurvivalAuthority';

interface ReservationState {
  readonly reservation: GatherCostReservation;
  readonly staminaCost: number;
  committed: boolean;
  released: boolean;
}

export class SurvivalGatherCostPort implements GatherCostPort {
  private readonly reservations = new Map<string, ReservationState>();

  public constructor(
    private readonly catalog: ContentCatalogV1,
    private readonly survival: Phase1SurvivalAuthority,
  ) {}

  public canStartGather(
    playerId: string,
    resourceDefinitionId: string,
  ): boolean {
    return this.survival.canSpendStamina(
      playerId,
      this.costFor(resourceDefinitionId),
    );
  }

  public reserveGatherCost(request: {
    readonly operationId: string;
    readonly playerId: string;
    readonly resourceDefinitionId: string;
  }): GatherCostReservationResult {
    const existing = this.reservations.get(request.operationId);
    if (existing !== undefined) {
      return Object.freeze({
        status: 'reserved',
        reservation: existing.reservation,
      });
    }

    const staminaCost = this.costFor(request.resourceDefinitionId);
    if (!this.survival.canSpendStamina(request.playerId, staminaCost)) {
      return Object.freeze({
        status: 'rejected',
        reason: 'INSUFFICIENT_STAMINA',
      });
    }

    const reservation: GatherCostReservation = Object.freeze({
      reservationId: `survival-gather:${request.operationId}`,
      operationId: request.operationId,
      playerId: request.playerId,
      resourceDefinitionId: request.resourceDefinitionId,
    });
    this.reservations.set(request.operationId, {
      reservation,
      staminaCost,
      committed: false,
      released: false,
    });
    return Object.freeze({ status: 'reserved', reservation });
  }

  public commitReservedGatherCost(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    const state = this.requireReservation(reservation);
    if (state.committed) return;
    if (state.released) {
      throw new Error('Released gather cost reservation cannot commit.');
    }
    const tick = this.survival.getPlayerState(reservation.playerId).tick;
    this.survival.commitStaminaSpend(
      reservation.playerId,
      state.staminaCost,
      tick,
    );
    state.committed = true;
  }

  public releaseGatherCostReservation(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    const state = this.requireReservation(reservation);
    if (state.committed) return;
    state.released = true;
  }

  private costFor(resourceDefinitionId: string): number {
    const resource = this.catalog.getAs(resourceDefinitionId, 'resource');
    return resource.requiredToolItemId === null ? 2 : 5;
  }

  private requireReservation(
    reservation: Readonly<GatherCostReservation>,
  ): ReservationState {
    const state = this.reservations.get(reservation.operationId);
    if (
      state === undefined
      || state.reservation.reservationId !== reservation.reservationId
    ) {
      throw new Error('Unknown gather cost reservation.');
    }
    return state;
  }
}
