import type {
  AxisSweepRequest,
  AxisSweepResult,
  WorldCollisionQuery,
} from './WorldCollisionQuery';

export interface WorldQuery extends WorldCollisionQuery {
  readonly boundary: 'world-query';
}

export const WORLD_QUERY_BOUNDARY: WorldQuery = Object.freeze({
  boundary: 'world-query',
  sweepAabbAxis(request: AxisSweepRequest): AxisSweepResult {
    void request;
    throw new Error('No authoritative collision geometry is attached to this WorldQuery.');
  },
});
