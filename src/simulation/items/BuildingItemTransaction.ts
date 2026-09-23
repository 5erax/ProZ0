import type { PlayerId } from '../../foundation';
import type {
  ContainerId,
  ContainerKind,
  ItemStackId,
  OperationId,
} from './ItemTypes';

export type BuildingItemRejectionReason =
  | 'SOURCE_MISSING'
  | 'STALE_REVISION'
  | 'KIT_UNAVAILABLE'
  | 'TARGET_CAPACITY_WEIGHT'
  | 'TARGET_CAPACITY_VOLUME'
  | 'CONTAINER_NOT_EMPTY'
  | 'OUTPUT_FULL'
  | 'OPERATION_ID_CONFLICT';

export interface PlacementItemCommitRequest {
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly sourceKitStackId: ItemStackId;
  readonly expectedKitItemDefinitionId: string;
  readonly createContainer:
    | {
        readonly containerId: ContainerId;
        readonly kind: Extract<
          ContainerKind,
          'storage-crate' | 'machine-output'
        >;
      }
    | null;
}

export interface DismantleItemCommitRequest {
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly returnedKitItemDefinitionId: string;
  readonly removeContainerId: ContainerId | null;
}

export interface MachineOutputCommitRequest {
  readonly operationId: OperationId;
  readonly outputContainerId: ContainerId;
  readonly expectedOutputRevision: number;
  readonly itemDefinitionId: 'item:clean-water';
}

export type BuildingItemCommitResult =
  | {
      readonly status: 'committed';
      readonly operationId: OperationId;
      readonly inventoryRevision: number | null;
      readonly containerId: ContainerId | null;
      readonly containerRevision: number | null;
      readonly createdStackIds: readonly ItemStackId[];
      readonly removedStackIds: readonly ItemStackId[];
    }
  | {
      readonly status: 'rejected';
      readonly operationId: OperationId;
      readonly reason: BuildingItemRejectionReason;
    };
