import type { PlayerId } from '../../foundation';
import type { ContentId } from '../../content';

export interface GatherCostPort {
  canCompleteGather(
    playerId: PlayerId,
    resourceDefinitionId: ContentId,
  ): boolean;

  commitGatherCost(
    playerId: PlayerId,
    resourceDefinitionId: ContentId,
  ): void;
}

export const NOOP_GATHER_COST_PORT: GatherCostPort = Object.freeze({
  canCompleteGather(): boolean {
    return true;
  },
  commitGatherCost(): void {
    // P1-ENG-002 exposes the authority seam. P1 survival authority owns the
    // exact stamina mutation and may replace this port at composition time.
  },
});
