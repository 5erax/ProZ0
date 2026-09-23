import type { PlayerId } from '../../foundation';
import type {
  ResourceEntityId,
  StructureInstanceId,
  WorldDropId,
} from '../../world';
import type {
  ContainerId,
  ItemStackId,
  OperationId,
} from './ItemTypes';

export interface TransferItemCommand {
  readonly type: 'transfer';
  readonly operationId: OperationId;
  readonly sourceContainerId: ContainerId;
  readonly sourceExpectedRevision: number;
  readonly targetContainerId: ContainerId;
  readonly targetExpectedRevision: number;
  readonly sourceStackId: ItemStackId;
  readonly quantity: number;
}

export interface SplitStackCommand {
  readonly type: 'split';
  readonly operationId: OperationId;
  readonly containerId: ContainerId;
  readonly expectedRevision: number;
  readonly sourceStackId: ItemStackId;
  readonly quantity: number;
}

export interface MergeStacksCommand {
  readonly type: 'merge';
  readonly operationId: OperationId;
  readonly containerId: ContainerId;
  readonly expectedRevision: number;
  readonly sourceStackId: ItemStackId;
  readonly targetStackId: ItemStackId;
}

export interface DropItemCommand {
  readonly type: 'drop';
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly sourceStackId: ItemStackId;
  readonly quantity: number;
}

export interface PickupItemCommand {
  readonly type: 'pickup';
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly worldDropId: WorldDropId;
  readonly expectedWorldDropRevision: number;
  readonly expectedDropContainerRevision: number;
}

export interface WorkbenchAccessRef {
  readonly structureInstanceId: StructureInstanceId;
  readonly expectedRevision: number;
}

export interface CraftItemCommand {
  readonly type: 'craft';
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly recipeId: string;
  readonly workbench?: WorkbenchAccessRef;
}

export interface RepairItemCommand {
  readonly type: 'repair';
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly targetStackId: ItemStackId;
  readonly workbench: WorkbenchAccessRef;
}

export interface BeginGatherRequest {
  readonly operationId: OperationId;
  readonly playerId: PlayerId;
  readonly inventoryContainerId: ContainerId;
  readonly expectedInventoryRevision: number;
  readonly resourceEntityId: ResourceEntityId;
  readonly expectedResourceRevision: number;
  readonly toolStackId?: ItemStackId;
}

export type ItemCommand =
  | TransferItemCommand
  | SplitStackCommand
  | MergeStacksCommand
  | DropItemCommand
  | PickupItemCommand
  | CraftItemCommand
  | RepairItemCommand;
