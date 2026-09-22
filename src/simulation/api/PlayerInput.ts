export interface PlayerInput {
  readonly moveX: -1 | 0 | 1;
  readonly moveY: -1 | 0 | 1;
}

export const NEUTRAL_PLAYER_INPUT: PlayerInput = Object.freeze({
  moveX: 0,
  moveY: 0,
});
