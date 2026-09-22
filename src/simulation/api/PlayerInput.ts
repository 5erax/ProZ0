export interface PlayerInput {
  readonly moveUp: boolean;
  readonly moveDown: boolean;
  readonly moveLeft: boolean;
  readonly moveRight: boolean;
}

export const NEUTRAL_PLAYER_INPUT: PlayerInput = Object.freeze({
  moveUp: false,
  moveDown: false,
  moveLeft: false,
  moveRight: false,
});
