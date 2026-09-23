import type { ContentCatalogV1 } from '../../content';
import type { PlayerId } from '../../foundation';
import type {
  Phase1BuildingWorld,
} from '../../world/building/Phase1BuildingWorld';
import type {
  DismantleRejectionReason,
  Phase1StructureDefinitionId,
  PlacementIntent,
  PlacementRejectionReason,
  StructureRuntimeState,
} from '../../world/building/BuildingTypes';
import type {
  BuildingItemRejectionReason,
  Phase1ItemAuthority,
} from '../items';

export interface PlaceStructureCommand {
  readonly operationId: string;
  readonly actorPlayerId: PlayerId;
  readonly structureDefinitionId: Exclude<
    Phase1StructureDefinitionId,
    'structure:landing-module'
  >;
  readonly sourceKitStackId: string;
  readonly inventoryContainerId: string;
  readonly expectedInventoryRevision: number;
  readonly expectedBuildRevision: number;
  readonly placement: PlacementIntent;
}

export type PlaceStructureRejectionReason =
  | PlacementRejectionReason
  | BuildingItemRejectionReason
  | 'INVALID_STRUCTURE'
  | 'KIT_UNAVAILABLE';

export type PlaceStructureResult =
  | {
      readonly status: 'committed';
      readonly operationId: string;
      readonly structure: Readonly<StructureRuntimeState>;
      readonly buildRevision: number;
      readonly inventoryRevision: number;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: string;
      readonly reason: PlaceStructureRejectionReason;
    };

export interface DismantleStructureCommand {
  readonly operationId: string;
  readonly actorPlayerId: PlayerId;
  readonly structureId: string;
  readonly inventoryContainerId: string;
  readonly expectedInventoryRevision: number;
  readonly expectedStructureRevision: number;
  readonly expectedBuildRevision: number;
}

export type DismantleStructureResult =
  | {
      readonly status: 'committed';
      readonly operationId: string;
      readonly structureId: string;
      readonly buildRevision: number;
      readonly inventoryRevision: number;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: string;
      readonly reason: DismantleRejectionReason | BuildingItemRejectionReason;
    };

interface Cached<T> {
  readonly signature: string;
  readonly result: T;
}

function placeSignature(command: PlaceStructureCommand): string {
  const placementFingerprint = command.placement.mode === 'free'
    ? [
        'free',
        command.placement.anchor.x,
        command.placement.anchor.y,
        command.placement.orientationQuarterTurns,
      ]
    : [
        'connector',
        command.placement.targetConnectorId,
        command.placement.requestedOrientationQuarterTurns,
      ];
  return JSON.stringify([
    command.operationId,
    command.actorPlayerId,
    command.structureDefinitionId,
    command.sourceKitStackId,
    command.inventoryContainerId,
    command.expectedInventoryRevision,
    command.expectedBuildRevision,
    placementFingerprint,
  ]);
}

function dismantleSignature(command: DismantleStructureCommand): string {
  return JSON.stringify([
    command.operationId,
    command.actorPlayerId,
    command.structureId,
    command.inventoryContainerId,
    command.expectedInventoryRevision,
    command.expectedStructureRevision,
    command.expectedBuildRevision,
  ]);
}

export class Phase1BuildingAuthority {
  private readonly placements =
    new Map<string, Cached<PlaceStructureResult>>();
  private readonly dismantles =
    new Map<string, Cached<DismantleStructureResult>>();

  public constructor(
    private readonly catalog: ContentCatalogV1,
    private readonly items: Phase1ItemAuthority,
    private readonly world: Phase1BuildingWorld,
  ) {}

  public place(command: PlaceStructureCommand): PlaceStructureResult {
    const signature = placeSignature(command);
    const structureId = `structure-instance:${command.operationId}`;
    const existingStructure = this.world.getStructure(structureId);
    if (existingStructure !== null) {
      if (existingStructure.placementOperationFingerprint !== signature) {
        return Object.freeze({
          status: 'rejected',
          operationId: command.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }

      const inventory = this.items.getContainerView(
        command.inventoryContainerId,
      );
      return Object.freeze({
        status: 'committed',
        operationId: command.operationId,
        structure: existingStructure,
        buildRevision: this.world.getBuildRevision(),
        inventoryRevision: inventory.revision,
      });
    }

    const cached = this.placements.get(command.operationId);
    if (cached !== undefined) {
      return cached.signature === signature
        ? cached.result
        : Object.freeze({
            status: 'rejected',
            operationId: command.operationId,
            reason: 'OPERATION_ID_CONFLICT',
          });
    }

    let definition;
    try {
      definition = this.catalog.getAs(
        command.structureDefinitionId,
        'structure',
      );
    } catch {
      return this.cachePlace(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: 'INVALID_STRUCTURE',
      });
    }
    if (
      !definition.placeableByPlayer
      || definition.sourceKitItemId === null
    ) {
      return this.cachePlace(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: 'INVALID_STRUCTURE',
      });
    }

    const expectedContainerId =
      command.structureDefinitionId === 'structure:storage-crate'
        ? `container:${structureId}:storage`
        : command.structureDefinitionId
            === 'structure:atmospheric-water-condenser'
          ? `container:${structureId}:output`
          : null;
    const createContainer =
      command.structureDefinitionId === 'structure:storage-crate'
        ? {
            containerId: expectedContainerId!,
            kind: 'storage-crate' as const,
          }
        : command.structureDefinitionId
            === 'structure:atmospheric-water-condenser'
          ? {
              containerId: expectedContainerId!,
              kind: 'machine-output' as const,
            }
          : null;
    const itemRequest = {
      operationId: command.operationId,
      playerId: command.actorPlayerId,
      inventoryContainerId: command.inventoryContainerId,
      expectedInventoryRevision: command.expectedInventoryRevision,
      sourceKitStackId: command.sourceKitStackId,
      expectedKitItemDefinitionId: definition.sourceKitItemId,
      createContainer,
    };
    const itemFailure = this.items.validatePlacementItems(itemRequest);
    if (itemFailure !== null) {
      return this.cachePlace(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: itemFailure,
      });
    }

    const reservation = this.world.reservePlacement({
      operationId: command.operationId,
      commandFingerprint: signature,
      actorPlayerId: command.actorPlayerId,
      definitionId: command.structureDefinitionId,
      expectedBuildRevision: command.expectedBuildRevision,
      placement: command.placement,
    });
    if (typeof reservation === 'string') {
      return this.cachePlace(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: reservation,
      });
    }
    if (reservation.containerId !== expectedContainerId) {
      throw new Error('Reserved placement container identity drifted.');
    }

    const itemResult = this.items.commitPlacementItems(itemRequest);
    if (itemResult.status !== 'committed') {
      this.world.releasePlacementReservation(reservation);
      return this.cachePlace(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: itemResult.reason,
      });
    }

    const structure = this.world.commitReservedPlacement(reservation);
    return this.cachePlace(command.operationId, signature, {
      status: 'committed',
      operationId: command.operationId,
      structure,
      buildRevision: this.world.getBuildRevision(),
      inventoryRevision: itemResult.inventoryRevision ?? 0,
    });
  }

  public dismantle(
    command: DismantleStructureCommand,
  ): DismantleStructureResult {
    const signature = dismantleSignature(command);
    const committed = this.world.getCommittedDismantle(command.operationId);
    if (committed !== null) {
      if (committed.commandFingerprint !== signature) {
        return Object.freeze({
          status: 'rejected',
          operationId: command.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }
      const inventory = this.items.getContainerView(
        command.inventoryContainerId,
      );
      return Object.freeze({
        status: 'committed',
        operationId: command.operationId,
        structureId: committed.structureId,
        buildRevision: this.world.getBuildRevision(),
        inventoryRevision: inventory.revision,
      });
    }

    const cached = this.dismantles.get(command.operationId);
    if (cached !== undefined) {
      return cached.signature === signature
        ? cached.result
        : Object.freeze({
            status: 'rejected',
            operationId: command.operationId,
            reason: 'OPERATION_ID_CONFLICT',
          });
    }

    const reservation = this.world.reserveDismantle({
      operationId: command.operationId,
      commandFingerprint: signature,
      actorPlayerId: command.actorPlayerId,
      structureId: command.structureId,
      expectedStructureRevision: command.expectedStructureRevision,
      expectedBuildRevision: command.expectedBuildRevision,
    });
    if (typeof reservation === 'string') {
      return this.cacheDismantle(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: reservation,
      });
    }

    const itemResult = this.items.commitDismantleItems({
      operationId: command.operationId,
      playerId: command.actorPlayerId,
      inventoryContainerId: command.inventoryContainerId,
      expectedInventoryRevision: command.expectedInventoryRevision,
      returnedKitItemDefinitionId:
        reservation.returnedKitItemDefinitionId,
      removeContainerId: reservation.linkedContainerId,
    });
    if (itemResult.status !== 'committed') {
      return this.cacheDismantle(command.operationId, signature, {
        status: 'rejected',
        operationId: command.operationId,
        reason: itemResult.reason,
      });
    }

    this.world.commitReservedDismantle(reservation);
    return this.cacheDismantle(command.operationId, signature, {
      status: 'committed',
      operationId: command.operationId,
      structureId: command.structureId,
      buildRevision: this.world.getBuildRevision(),
      inventoryRevision: itemResult.inventoryRevision ?? 0,
    });
  }

  private cachePlace(
    operationId: string,
    signature: string,
    result: PlaceStructureResult,
  ): PlaceStructureResult {
    const frozen = Object.freeze(result);
    this.placements.set(operationId, { signature, result: frozen });
    return frozen;
  }

  private cacheDismantle(
    operationId: string,
    signature: string,
    result: DismantleStructureResult,
  ): DismantleStructureResult {
    const frozen = Object.freeze(result);
    this.dismantles.set(operationId, { signature, result: frozen });
    return frozen;
  }
}
