import type { ContentCatalogV1 } from '../../content';
import type {
  GatherCostPort,
  GatherCostReservation,
  GatherCostReservationResult,
} from '../items';
import type { Phase1SurvivalAuthority } from './SurvivalAuthority';
import type { SurvivalStaminaReservation } from './SurvivalTypes';

interface ReservationState {
  readonly reservation: GatherCostReservation;
  readonly staminaReservation: SurvivalStaminaReservation;
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
    const staminaReservation = this.survival.reserveStaminaSpend(
      `gather-stamina:${request.operationId}`,
      request.playerId,
      staminaCost,
    );
    if (staminaReservation === null) {
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
      staminaReservation,
      committed: false,
      released: false,
    });
    return Object.freeze({ status: 'reserved', reservation });
  }

  public commitReservedGatherCost(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    const state = this.findReservation(reservation);
    if (state === null || state.committed || state.released) return;
    this.survival.commitReservedStaminaSpend(state.staminaReservation);
    state.committed = true;
  }

  public releaseGatherCostReservation(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    const state = this.findReservation(reservation);
    if (state === null || state.committed || state.released) return;
    this.survival.releaseStaminaReservation(state.staminaReservation);
    state.released = true;
  }

  private costFor(resourceDefinitionId: string): number {
    const resource = this.catalog.getAs(resourceDefinitionId, 'resource');
    return resource.requiredToolItemId === null ? 2 : 5;
  }

  private findReservation(
    reservation: Readonly<GatherCostReservation>,
  ): ReservationState | null {
    const state = this.reservations.get(reservation.operationId);
    if (
      state === undefined
      || state.reservation.reservationId !== reservation.reservationId
    ) {
      return null;
    }
    return state;
  }
}
