import type {
  ResourceEntityId,
  WorldDropId,
} from '../../world';
import type {
  ContainerId,
  ItemStackId,
  OperationId,
} from './ItemTypes';

export type TransactionRejectionReason =
  | 'STALE_REVISION'
  | 'SOURCE_MISSING'
  | 'QUANTITY_UNAVAILABLE'
  | 'TARGET_UNAVAILABLE'
  | 'TARGET_CAPACITY_WEIGHT'
  | 'TARGET_CAPACITY_VOLUME'
  | 'STACK_INCOMPATIBLE'
  | 'STACK_LIMIT'
  | 'INVALID_QUANTITY'
  | 'INVALID_WORLD_PLACEMENT'
  | 'TARGET_ALREADY_TAKEN'
  | 'TOOL_REQUIRED'
  | 'TOOL_BROKEN'
  | 'INSUFFICIENT_STAMINA'
  | 'STATION_REQUIRED'
  | 'INVALID_RECIPE'
  | 'INVALID_REPAIR_TARGET'
  | 'ITEM_FULL_CONDITION'
  | 'RESOURCE_DEPLETED'
  | 'OUT_OF_RANGE'
  | 'OPERATION_ID_CONFLICT';

export interface ResultingContainerRevision {
  readonly containerId: ContainerId;
  readonly revision: number;
}

export type ResultingWorldRevision =
  | {
      readonly kind: 'resource';
      readonly resourceEntityId: ResourceEntityId;
      readonly revision: number;
    }
  | {
      readonly kind: 'world-drop';
      readonly worldDropId: WorldDropId;
      readonly revision: number;
    };

export interface CommittedItemTransactionResult {
  readonly status: 'committed';
  readonly operationId: OperationId;
  readonly resultingRevisions: readonly ResultingContainerRevision[];
  readonly resultingWorldRevisions: readonly ResultingWorldRevision[];
  readonly createdStackIds: readonly ItemStackId[];
  readonly removedStackIds: readonly ItemStackId[];
}

export interface RejectedItemTransactionResult {
  readonly status: 'rejected';
  readonly operationId: OperationId;
  readonly reason: TransactionRejectionReason;
}

export type ItemTransactionResult =
  | CommittedItemTransactionResult
  | RejectedItemTransactionResult;

export type GatherStartResult =
  | {
      readonly status: 'started';
      readonly operationId: OperationId;
      readonly requiredTicks: number;
    }
  | {
      readonly status: 'resolved';
      readonly result: ItemTransactionResult;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: OperationId;
      readonly reason: TransactionRejectionReason;
    };

export type GatherTickResult =
  | { readonly status: 'idle' }
  | {
      readonly status: 'channeling';
      readonly operationId: OperationId;
      readonly elapsedTicks: number;
      readonly requiredTicks: number;
    }
  | {
      readonly status: 'canceled';
      readonly operationId: OperationId;
      readonly reason: TransactionRejectionReason;
    }
  | {
      readonly status: 'resolved';
      readonly result: ItemTransactionResult;
    };
