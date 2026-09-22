import { SIMULATION_HZ } from '../../foundation';

export const INV_SQRT_2 = 0.7071067811865476;

export const PLAYER_MOVEMENT_CONFIG = Object.freeze({
  baseMoveSpeed: 2.8125,
  diagonalComponentScale: INV_SQRT_2,
  cardinalDeltaPerTick: 2.8125 / SIMULATION_HZ,
});
