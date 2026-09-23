import type { ContentId } from '../../content';

export type ItemStackId = string;
export type ContainerId = string;
export type OperationId = string;

export type ContainerKind =
  | 'player-inventory'
  | 'storage-crate'
  | 'machine-output'
  | 'death-cache'
  | 'world-drop';

export interface ItemStackState {
  readonly stackId: ItemStackId;
  readonly itemDefinitionId: ContentId;
  readonly quantity: number;
  readonly condition: number | null;
}

export interface ContainerState {
  readonly containerId: ContainerId;
  readonly kind: ContainerKind;
  readonly revision: number;
  readonly stacks: readonly ItemStackState[];
}

export type PlayerWeightState =
  | 'NORMAL'
  | 'HEAVY'
  | 'OVERLOADED';

export interface ContainerView extends ContainerState {
  readonly totalWeightKg: number;
  readonly totalVolume: number;
  readonly playerWeightState: PlayerWeightState | null;
}

export interface ItemLedgerSnapshot {
  readonly containers: readonly ContainerState[];
}

export interface ExpectedContainerRevision {
  readonly containerId: ContainerId;
  readonly expectedRevision: number;
}
