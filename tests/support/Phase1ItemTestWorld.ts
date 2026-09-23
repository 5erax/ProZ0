import type { PlayerId } from '../../src/foundation';
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
} from '../../src/world';

interface MutableResourceNode {
  resourceEntityId: ResourceEntityId;
  resourceDefinitionId: string;
  revision: number;
  remainingActions: number | null;
  depleted: boolean;
}

interface MutableWorldDrop {
  worldDropId: WorldDropId;
  revision: number;
  containerId: string;
  available: boolean;
}

interface MutableWorkbench {
  structureInstanceId: StructureInstanceId;
  revision: number;
  functional: boolean;
}

function freezeResource(
  resource: MutableResourceNode,
): Readonly<ResourceNodeView> {
  return Object.freeze({ ...resource });
}

function freezeDrop(drop: MutableWorldDrop): Readonly<WorldDropView> {
  return Object.freeze({ ...drop });
}

function freezeWorkbench(
  workbench: MutableWorkbench,
): Readonly<WorkbenchView> {
  return Object.freeze({ ...workbench });
}

export class Phase1ItemTestWorld implements ItemInteractionWorldPort {
  private readonly resources = new Map<ResourceEntityId, MutableResourceNode>();
  private readonly drops = new Map<WorldDropId, MutableWorldDrop>();
  private readonly workbenches =
    new Map<StructureInstanceId, MutableWorkbench>();

  private readonly blockedContainers = new Set<string>();
  private readonly outOfRangeResources = new Set<ResourceEntityId>();
  private readonly outOfRangeDrops = new Set<WorldDropId>();
  private readonly inaccessibleWorkbenches = new Set<StructureInstanceId>();

  public dropPlacementAvailable = true;

  public addResource(resource: ResourceNodeView): void {
    this.resources.set(resource.resourceEntityId, { ...resource });
  }

  public addWorkbench(workbench: WorkbenchView): void {
    this.workbenches.set(workbench.structureInstanceId, { ...workbench });
  }

  public setContainerAccessible(
    containerId: string,
    accessible: boolean,
  ): void {
    if (accessible) {
      this.blockedContainers.delete(containerId);
    } else {
      this.blockedContainers.add(containerId);
    }
  }

  public setResourceInRange(
    resourceEntityId: ResourceEntityId,
    inRange: boolean,
  ): void {
    if (inRange) {
      this.outOfRangeResources.delete(resourceEntityId);
    } else {
      this.outOfRangeResources.add(resourceEntityId);
    }
  }

  public setDropInRange(worldDropId: WorldDropId, inRange: boolean): void {
    if (inRange) {
      this.outOfRangeDrops.delete(worldDropId);
    } else {
      this.outOfRangeDrops.add(worldDropId);
    }
  }

  public setWorkbenchAccessible(
    structureInstanceId: StructureInstanceId,
    accessible: boolean,
  ): void {
    if (accessible) {
      this.inaccessibleWorkbenches.delete(structureInstanceId);
    } else {
      this.inaccessibleWorkbenches.add(structureInstanceId);
    }
  }

  public isContainerAccessible(
    playerId: PlayerId,
    containerId: string,
  ): boolean {
    void playerId;
    return !this.blockedContainers.has(containerId);
  }

  public getResource(
    resourceEntityId: ResourceEntityId,
  ): Readonly<ResourceNodeView> | null {
    const resource = this.resources.get(resourceEntityId);
    return resource === undefined ? null : freezeResource(resource);
  }

  public isResourceInInteractionRange(
    playerId: PlayerId,
    resourceEntityId: ResourceEntityId,
  ): boolean {
    void playerId;
    return !this.outOfRangeResources.has(resourceEntityId);
  }

  public commitGather(
    resourceEntityId: ResourceEntityId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null {
    const resource = this.resources.get(resourceEntityId);
    if (
      resource === undefined
      || resource.revision !== expectedRevision
      || resource.depleted
    ) {
      return null;
    }

    if (resource.remainingActions !== null) {
      if (resource.remainingActions <= 0) {
        return null;
      }
      resource.remainingActions -= 1;
      resource.depleted = resource.remainingActions === 0;
    }

    resource.revision += 1;
    return Object.freeze({ revision: resource.revision });
  }

  public getWorldDrop(
    worldDropId: WorldDropId,
  ): Readonly<WorldDropView> | null {
    const drop = this.drops.get(worldDropId);
    return drop === undefined ? null : freezeDrop(drop);
  }

  public isWorldDropInInteractionRange(
    playerId: PlayerId,
    worldDropId: WorldDropId,
  ): boolean {
    void playerId;
    return !this.outOfRangeDrops.has(worldDropId);
  }

  public resolveDropPlacement(
    playerId: PlayerId,
  ): Readonly<DropPlacementReservation> | null {
    void playerId;
    return this.dropPlacementAvailable
      ? Object.freeze({ token: 'nearest-valid-reachable' })
      : null;
  }

  public commitCreateWorldDrop(request: {
    readonly worldDropId: WorldDropId;
    readonly containerId: string;
    readonly placement: DropPlacementReservation;
  }): Readonly<WorldDropView> | null {
    if (
      request.placement.token.length === 0
      || this.drops.has(request.worldDropId)
    ) {
      return null;
    }

    const drop: MutableWorldDrop = {
      worldDropId: request.worldDropId,
      revision: 0,
      containerId: request.containerId,
      available: true,
    };
    this.drops.set(request.worldDropId, drop);
    return freezeDrop(drop);
  }

  public commitTakeWorldDrop(
    worldDropId: WorldDropId,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null {
    const drop = this.drops.get(worldDropId);
    if (
      drop === undefined
      || !drop.available
      || drop.revision !== expectedRevision
    ) {
      return null;
    }

    drop.available = false;
    drop.revision += 1;
    return Object.freeze({ revision: drop.revision });
  }

  public getWorkbench(
    structureInstanceId: StructureInstanceId,
  ): Readonly<WorkbenchView> | null {
    const workbench = this.workbenches.get(structureInstanceId);
    return workbench === undefined ? null : freezeWorkbench(workbench);
  }

  public isWorkbenchAccessible(
    playerId: PlayerId,
    structureInstanceId: StructureInstanceId,
  ): boolean {
    void playerId;
    return !this.inaccessibleWorkbenches.has(structureInstanceId);
  }
}
