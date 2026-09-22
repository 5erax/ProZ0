export interface WorldMutation {
  readonly boundary: 'world-mutation';
}

export const WORLD_MUTATION_BOUNDARY: WorldMutation = Object.freeze({
  boundary: 'world-mutation',
});
