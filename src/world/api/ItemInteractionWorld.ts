import type { PlayerId } from '../../foundation';
import type { ContentId } from '../../content';

export type ResourceEntityId = string;
export type WorldDropId = string;
export type StructureInstanceId = string;

export interface ResourceNodeView {
  readonly resourceEntityId: ResourceEntityId;
  readonly resourceDefinitionId: ContentId;
  readonly revision: number;
  readonly remainingActions: number | null;
  readonly depleted: boolean;
}

export interface WorldDropView {
  readonly worldDropId: WorldDropId;
  readonly revision: number;
  readonly containerId: string;
  readonly available: boolean;
}

export interface WorkbenchView {
  readonly structureInstanceId: StructureInstanceId;
  readonly revision: number;
  readonly functional: boolean;
}

export interface DropPlacementReservation {
  readonly token: string;
}

export interface WorldRevisionResult {
  readonly revision: number;
}

export interface ItemInteractionWorldPort {
  isContainerAccessible(
    playerId: PlayerId,
    containerId: string,
  ): boolean;

  getResource(resourceEntityId: ResourceEntityId): Readonly<ResourceNodeView> | null;
  isResourceInInteractionRange(
    playerId: PlayerId,
    resourceEntityId: ResourceEntityId,
  ): boolean;
  commitGather(
    resourceEntityId: ResourceEntityId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null;

  getWorldDrop(worldDropId: WorldDropId): Readonly<WorldDropView> | null;
  isWorldDropInInteractionRange(
    playerId: PlayerId,
    worldDropId: WorldDropId,
  ): boolean;
  resolveDropPlacement(
    playerId: PlayerId,
  ): Readonly<DropPlacementReservation> | null;
  commitCreateWorldDrop(request: {
    readonly worldDropId: WorldDropId;
    readonly containerId: string;
    readonly placement: DropPlacementReservation;
  }): Readonly<WorldDropView> | null;
  commitTakeWorldDrop(
    worldDropId: WorldDropId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null;

  getWorkbench(
    structureInstanceId: StructureInstanceId,
  ): Readonly<WorkbenchView> | null;
  isWorkbenchAccessible(
    playerId: PlayerId,
    structureInstanceId: StructureInstanceId,
  ): boolean;
}
