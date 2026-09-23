import type { PlayerId } from '../../foundation';
import type {
  DropPlacementReservation,
  ItemInteractionWorldPort,
  ResourceEntityId,
  ResourceNodeView,
  StructureInstanceId,
  WorkbenchView,
  WorldDropId,
  WorldDropView,
  WorldRevisionResult,
} from '../api/ItemInteractionWorld';
import type { Phase1BuildingWorld } from './Phase1BuildingWorld';

export class BuildingItemWorldAdapter implements ItemInteractionWorldPort {
  public constructor(
    private readonly base: ItemInteractionWorldPort,
    private readonly buildings: Phase1BuildingWorld,
  ) {}

  public isContainerAccessible(
    playerId: PlayerId,
    containerId: string,
  ): boolean {
    const structure = this.buildings.getStructureByContainerId(containerId);
    if (structure !== null) {
      return this.buildings.isStructureAccessible(
        playerId,
        structure.structureId,
      );
    }
    return this.base.isContainerAccessible(playerId, containerId);
  }

  public getResource(
    resourceEntityId: ResourceEntityId,
  ): Readonly<ResourceNodeView> | null {
    return this.base.getResource(resourceEntityId);
  }

  public isResourceInInteractionRange(
    playerId: PlayerId,
    resourceEntityId: ResourceEntityId,
  ): boolean {
    return this.base.isResourceInInteractionRange(
      playerId,
      resourceEntityId,
    );
  }

  public commitGather(
    resourceEntityId: ResourceEntityId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null {
    return this.base.commitGather(resourceEntityId, expectedRevision);
  }

  public getWorldDrop(
    worldDropId: WorldDropId,
  ): Readonly<WorldDropView> | null {
    return this.base.getWorldDrop(worldDropId);
  }

  public isWorldDropInInteractionRange(
    playerId: PlayerId,
    worldDropId: WorldDropId,
  ): boolean {
    return this.base.isWorldDropInInteractionRange(playerId, worldDropId);
  }

  public resolveDropPlacement(
    playerId: PlayerId,
  ): Readonly<DropPlacementReservation> | null {
    return this.base.resolveDropPlacement(playerId);
  }

  public commitCreateWorldDrop(request: {
    readonly worldDropId: WorldDropId;
    readonly containerId: string;
    readonly placement: DropPlacementReservation;
  }): Readonly<WorldDropView> | null {
    return this.base.commitCreateWorldDrop(request);
  }

  public commitTakeWorldDrop(
    worldDropId: WorldDropId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null {
    return this.base.commitTakeWorldDrop(
      worldDropId,
      expectedRevision,
    );
  }

  public getWorkbench(
    structureInstanceId: StructureInstanceId,
  ): Readonly<WorkbenchView> | null {
    const structure = this.buildings.getStructure(structureInstanceId);
    if (
      structure !== null
      && structure.definitionId === 'structure:workbench'
    ) {
      return Object.freeze({
        structureInstanceId,
        revision: structure.revision,
        functional: true,
      });
    }
    return this.base.getWorkbench(structureInstanceId);
  }

  public isWorkbenchAccessible(
    playerId: PlayerId,
    structureInstanceId: StructureInstanceId,
  ): boolean {
    const structure = this.buildings.getStructure(structureInstanceId);
    if (
      structure !== null
      && structure.definitionId === 'structure:workbench'
    ) {
      return this.buildings.isStructureAccessible(
        playerId,
        structureInstanceId,
      );
    }
    return this.base.isWorkbenchAccessible(
      playerId,
      structureInstanceId,
    );
  }
}
