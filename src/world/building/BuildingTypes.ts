import type { PlayerId, WorldPosition } from '../../foundation';

export type StructureId = string;
export type FootholdId = string;
export type ConnectorId = string;

export type Phase1StructureDefinitionId =
  | 'structure:landing-module'
  | 'structure:storage-crate'
  | 'structure:workbench'
  | 'structure:habitat-room'
  | 'structure:compact-power-unit'
  | 'structure:atmospheric-water-condenser';

export type QuarterTurn = 0 | 1 | 2 | 3;

export interface PlacementFootprint {
  readonly width: number;
  readonly depth: number;
}

export interface StructurePlacementProfile {
  readonly structureDefinitionId: Phase1StructureDefinitionId;
  readonly footprint: PlacementFootprint;
  readonly doorClearanceDepth: number;
  readonly connectorOffsetWorldUnits: number | null;
}

export interface ConnectorState {
  readonly connectorId: ConnectorId;
  readonly structureId: StructureId;
  readonly localConnectorKey: string;
  readonly occupiedByConnectionId: string | null;
}

export interface StructureConnection {
  readonly connectionId: string;
  readonly a: ConnectorId;
  readonly b: ConnectorId;
}

export interface StructureRuntimeState {
  readonly structureId: StructureId;
  readonly definitionId: Phase1StructureDefinitionId;
  readonly revision: number;
  readonly position: WorldPosition;
  readonly orientationQuarterTurns: QuarterTurn;
  readonly placedByPlayerId: PlayerId | null;
  readonly containerId: string | null;
  readonly placementOperationFingerprint: string | null;
}

export interface CondenserRuntimeState {
  readonly structureId: StructureId;
  readonly revision: number;
  readonly enabled: boolean;
  readonly productionProgressTicks: number;
  readonly completedCycleOrdinal: number;
  readonly outputContainerId: string;
}

export interface PowerNetworkState {
  readonly revision: number;
  readonly producerStructureId: StructureId | null;
  readonly capacityPu: number;
  readonly grantedConsumerIds: readonly StructureId[];
}

export interface CommittedDismantleOperation {
  readonly operationId: string;
  readonly commandFingerprint: string;
  readonly structureId: StructureId;
}

export interface FootholdBuildState {
  readonly footholdId: FootholdId;
  readonly buildRevision: number;
  readonly structures: readonly StructureRuntimeState[];
  readonly connectors: readonly ConnectorState[];
  readonly connections: readonly StructureConnection[];
  readonly power: PowerNetworkState;
  readonly condensers: readonly CondenserRuntimeState[];
  readonly recentDismantles: readonly CommittedDismantleOperation[];
}

export type PlacementRejectionReason =
  | 'UNEXPLORED_AREA'
  | 'INVALID_TERRAIN'
  | 'NON_BUILDABLE_SURFACE'
  | 'OBSTRUCTED'
  | 'STRUCTURE_OVERLAP'
  | 'BLOCKS_SPAWN'
  | 'BLOCKS_REQUIRED_ACCESS'
  | 'OUTSIDE_BASE_BUILD_ZONE'
  | 'CONNECTOR_REQUIRED'
  | 'INVALID_CONNECTOR'
  | 'BUILD_LIMIT_REACHED'
  | 'WORLD_STATE_CHANGED'
  | 'POSITION_TAKEN'
  | 'OPERATION_ID_CONFLICT';

export type DismantleRejectionReason =
  | 'SOURCE_MISSING'
  | 'STALE_REVISION'
  | 'WORLD_STATE_CHANGED'
  | 'NOT_DISMANTLABLE'
  | 'OUT_OF_RANGE'
  | 'CONTAINER_NOT_EMPTY'
  | 'PLAYER_INSIDE';

export interface FreePlacementIntent {
  readonly mode: 'free';
  readonly anchor: WorldPosition;
  readonly orientationQuarterTurns: QuarterTurn;
}

export interface ConnectorPlacementIntent {
  readonly mode: 'connector';
  readonly targetConnectorId: ConnectorId;
  readonly requestedOrientationQuarterTurns: QuarterTurn;
}

export type PlacementIntent =
  | FreePlacementIntent
  | ConnectorPlacementIntent;

export interface PlacementReservation {
  readonly operationId: string;
  readonly commandFingerprint: string;
  readonly actorPlayerId: PlayerId;
  readonly footholdId: FootholdId;
  readonly expectedBuildRevision: number;
  readonly structureId: StructureId;
  readonly definitionId: Exclude<
    Phase1StructureDefinitionId,
    'structure:landing-module'
  >;
  readonly finalPosition: WorldPosition;
  readonly orientationQuarterTurns: QuarterTurn;
  readonly containerId: string | null;
  readonly targetConnectorId: ConnectorId | null;
}

export interface DismantleReservation {
  readonly operationId: string;
  readonly commandFingerprint: string;
  readonly actorPlayerId: PlayerId;
  readonly footholdId: FootholdId;
  readonly expectedBuildRevision: number;
  readonly structure: StructureRuntimeState;
  readonly linkedContainerId: string | null;
  readonly returnedKitItemDefinitionId: string;
}

export interface BuildingWorldSnapshot {
  readonly foothold: FootholdBuildState;
}

export interface BuildingSpatialQuery {
  isFootprintExplored(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  isBuildableGround(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  hasNonBuildableSurface(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  hasBlockingWorldCollision(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  overlapsProtectedRuin(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  obstructsDeathCache(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  blocksSpawnClearance(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  blocksRequiredAccess(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean;

  isPlayerInsideStructure(structureId: StructureId): boolean;

  isPlayerInInteractionRange(
    playerId: PlayerId,
    structureId: StructureId,
  ): boolean;
}
