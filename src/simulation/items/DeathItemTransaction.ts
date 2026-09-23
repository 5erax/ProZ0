import type { PlayerId } from '../../foundation';
import type {
  ContainerId,
  ItemStackId,
  OperationId,
} from './ItemTypes';

export interface CommitDeathCacheItemsRequest {
  readonly deathId: string;
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly equippedStackIds: readonly ItemStackId[];
}

export type DeathCacheItemCommitResult =
  | {
      readonly status: 'committed';
      readonly deathId: string;
      readonly operationId: OperationId;
      readonly inventoryRevision: number;
      readonly cacheContainerId: ContainerId | null;
      readonly cacheRevision: number | null;
      readonly movedStackIds: readonly ItemStackId[];
      readonly penalizedStackIds: readonly ItemStackId[];
    }
  | {
      readonly status: 'rejected';
      readonly deathId: string;
      readonly operationId: OperationId;
      readonly reason:
        | 'STALE_REVISION'
        | 'SOURCE_MISSING'
        | 'OPERATION_ID_CONFLICT';
    };
