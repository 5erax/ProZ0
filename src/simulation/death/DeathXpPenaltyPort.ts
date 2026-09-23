import type { PlayerId } from '../../foundation';

export interface DeathXpPenaltyReservation {
  readonly reservationId: string;
  readonly deathId: string;
  readonly playerId: PlayerId;
  readonly xpLoss: number;
}

export interface DeathXpPenaltyPort {
  reserveDeathXpPenalty(request: {
    readonly deathId: string;
    readonly playerId: PlayerId;
  }): Readonly<DeathXpPenaltyReservation>;

  /** Reservation makes finalization deterministic and non-throwing. */
  commitReservedDeathXpPenalty(
    reservation: Readonly<DeathXpPenaltyReservation>,
  ): void;

  releaseDeathXpPenalty(
    reservation: Readonly<DeathXpPenaltyReservation>,
  ): void;
}
