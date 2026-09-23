import type { PlayerId } from '../../foundation';
import type { ContentId } from '../../content';
import type { OperationId } from './ItemTypes';

export interface GatherCostReservation {
  readonly reservationId: string;
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly resourceDefinitionId: ContentId;
}

export type GatherCostReservationResult =
  | {
      readonly status: 'reserved';
      readonly reservation: Readonly<GatherCostReservation>;
    }
  | {
      readonly status: 'rejected';
      readonly reason: 'INSUFFICIENT_STAMINA' | 'STALE_REVISION';
    };

export interface GatherCostReservationRequest {
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly resourceDefinitionId: ContentId;
}

export interface GatherCostPort {
  /**
   * Advisory preflight only. This must not mutate canonical survival state.
   */
  canStartGather(
    playerId: PlayerId,
    resourceDefinitionId: ContentId,
  ): boolean;

  /**
   * Performs every failure-capable stamina/cost validation and reserves the
   * exact successful-gather cost before any world/item canonical commit.
   * Expected refusal is returned explicitly and must not throw.
   */
  reserveGatherCost(
    request: Readonly<GatherCostReservationRequest>,
  ): GatherCostReservationResult;

  /**
   * Finalizes a previously reserved cost after the world commit succeeds.
   * Once reserveGatherCost returned "reserved", this method is required to be
   * deterministic and non-throwing. It must not perform new validation.
   */
  commitReservedGatherCost(
    reservation: Readonly<GatherCostReservation>,
  ): void;

  /**
   * Releases a reservation when a later pre-commit world CAS fails.
   * This method is required to be idempotent and non-throwing.
   */
  releaseGatherCostReservation(
    reservation: Readonly<GatherCostReservation>,
  ): void;
}

export const NOOP_GATHER_COST_PORT: GatherCostPort = Object.freeze({
  canStartGather(): boolean {
    return true;
  },

  reserveGatherCost(
    request: Readonly<GatherCostReservationRequest>,
  ): GatherCostReservationResult {
    return Object.freeze({
      status: 'reserved',
      reservation: Object.freeze({
        reservationId: `noop-gather-cost:${request.operationId}`,
        operationId: request.operationId,
        playerId: request.playerId,
        resourceDefinitionId: request.resourceDefinitionId,
      }),
    });
  },

  commitReservedGatherCost(): void {
    // P1-ENG-002 exposes the staged authority seam. P1 survival authority
    // owns the exact stamina mutation and plugs into this reserved commit.
  },

  releaseGatherCostReservation(): void {
    // NOOP reservation carries no canonical state.
  },
});
