import {
  createWorldPosition,
  type PlayerId,
  type WorldPosition,
} from '../../foundation';
import type {
  BuildingSpatialQuery,
  BuildingWorldSnapshot,
  CondenserRuntimeState,
  ConnectorId,
  ConnectorState,
  DismantleRejectionReason,
  DismantleReservation,
  FootholdBuildState,
  Phase1StructureDefinitionId,
  PlacementIntent,
  PlacementRejectionReason,
  PlacementReservation,
  PowerNetworkState,
  QuarterTurn,
  StructureConnection,
  StructureId,
  StructurePlacementProfile,
  StructureRuntimeState,
} from './BuildingTypes';

export const PHASE1_FOOTHOLD_ID = 'foothold:landing' as const;
export const PHASE1_BUILD_ZONE_RADIUS_WU = 7.5;
export const PHASE1_POWER_RADIUS_WU = 5;
export const PHASE1_POWER_CAPACITY_PU = 10;
export const PHASE1_CONDENSER_DEMAND_PU = 5;

export const PHASE1_STRUCTURE_PLACEMENT_PROFILES:
  Readonly<Record<Phase1StructureDefinitionId, StructurePlacementProfile>> =
  Object.freeze({
    'structure:landing-module': Object.freeze({
      structureDefinitionId: 'structure:landing-module',
      footprint: Object.freeze({ width: 1.5, depth: 1.25 }),
      doorClearanceDepth: 0.75,
      connectorOffsetWorldUnits: 0.75,
    }),
    'structure:storage-crate': Object.freeze({
      structureDefinitionId: 'structure:storage-crate',
      footprint: Object.freeze({ width: 0.75, depth: 0.75 }),
      doorClearanceDepth: 0,
      connectorOffsetWorldUnits: null,
    }),
    'structure:workbench': Object.freeze({
      structureDefinitionId: 'structure:workbench',
      footprint: Object.freeze({ width: 1.25, depth: 0.75 }),
      doorClearanceDepth: 0.5,
      connectorOffsetWorldUnits: null,
    }),
    'structure:habitat-room': Object.freeze({
      structureDefinitionId: 'structure:habitat-room',
      footprint: Object.freeze({ width: 2.5, depth: 2 }),
      doorClearanceDepth: 0.75,
      connectorOffsetWorldUnits: 1.25,
    }),
    'structure:compact-power-unit': Object.freeze({
      structureDefinitionId: 'structure:compact-power-unit',
      footprint: Object.freeze({ width: 1, depth: 1 }),
      doorClearanceDepth: 0,
      connectorOffsetWorldUnits: null,
    }),
    'structure:atmospheric-water-condenser': Object.freeze({
      structureDefinitionId: 'structure:atmospheric-water-condenser',
      footprint: Object.freeze({ width: 1, depth: 1 }),
      doorClearanceDepth: 0.5,
      connectorOffsetWorldUnits: null,
    }),
  });

const CAPS: Readonly<Record<Phase1StructureDefinitionId, number>> =
  Object.freeze({
    'structure:landing-module': 1,
    'structure:storage-crate': 4,
    'structure:workbench': 1,
    'structure:habitat-room': 1,
    'structure:compact-power-unit': 1,
    'structure:atmospheric-water-condenser': 1,
  });

const KIT_BY_STRUCTURE: Readonly<
  Record<
    Exclude<Phase1StructureDefinitionId, 'structure:landing-module'>,
    string
  >
> = Object.freeze({
  'structure:storage-crate': 'item:storage-crate-kit',
  'structure:workbench': 'item:workbench-kit',
  'structure:habitat-room': 'item:habitat-kit',
  'structure:compact-power-unit': 'item:power-unit-kit',
  'structure:atmospheric-water-condenser': 'item:machine-kit',
});

interface PendingPlacement {
  readonly reservation: PlacementReservation;
  readonly profile: StructurePlacementProfile;
}

interface MutableStructure extends StructureRuntimeState {
  revision: number;
}

interface MutableCondenser extends CondenserRuntimeState {
  revision: number;
  enabled: boolean;
  productionProgressTicks: number;
  completedCycleOrdinal: number;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function squaredDistance(a: WorldPosition, b: WorldPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function rotatedSize(
  profile: StructurePlacementProfile,
  orientation: QuarterTurn,
): { readonly width: number; readonly depth: number } {
  return orientation % 2 === 0
    ? profile.footprint
    : Object.freeze({
        width: profile.footprint.depth,
        depth: profile.footprint.width,
      });
}

function overlaps(
  leftPos: WorldPosition,
  leftProfile: StructurePlacementProfile,
  leftOrientation: QuarterTurn,
  rightPos: WorldPosition,
  rightProfile: StructurePlacementProfile,
  rightOrientation: QuarterTurn,
): boolean {
  const left = rotatedSize(leftProfile, leftOrientation);
  const right = rotatedSize(rightProfile, rightOrientation);
  return (
    Math.abs(leftPos.x - rightPos.x)
      < (left.width + right.width) / 2
    && Math.abs(leftPos.y - rightPos.y)
      < (left.depth + right.depth) / 2
  );
}

function connectorVector(key: string): { readonly x: number; readonly y: number } {
  switch (key) {
    case 'east': return Object.freeze({ x: 1, y: 0 });
    case 'south': return Object.freeze({ x: 0, y: 1 });
    case 'west': return Object.freeze({ x: -1, y: 0 });
    default: return Object.freeze({ x: 0, y: -1 });
  }
}

function connectorQuarterTurn(key: string): QuarterTurn {
  switch (key) {
    case 'east': return 0;
    case 'south': return 1;
    case 'west': return 2;
    default: return 3;
  }
}

function freezeStructure(value: StructureRuntimeState): StructureRuntimeState {
  return Object.freeze({
    ...value,
    position: Object.freeze({ ...value.position }),
  });
}

function freezeCondenser(
  value: CondenserRuntimeState,
): CondenserRuntimeState {
  return Object.freeze({ ...value });
}

function freezeConnector(value: ConnectorState): ConnectorState {
  return Object.freeze({ ...value });
}

function freezeConnection(value: StructureConnection): StructureConnection {
  return Object.freeze({ ...value });
}

function defaultLandingConnectors(): readonly ConnectorState[] {
  return Object.freeze(
    ['east', 'south', 'west', 'north'].map((key) =>
      freezeConnector({
        connectorId: `connector:landing:${key}`,
        structureId: 'structure-instance:landing-module',
        localConnectorKey: key,
        occupiedByConnectionId: null,
      }),
    ),
  );
}

export class Phase1BuildingWorld {
  private readonly structures = new Map<StructureId, MutableStructure>();
  private readonly condensers = new Map<StructureId, MutableCondenser>();
  private readonly connectors = new Map<ConnectorId, ConnectorState>();
  private readonly connections = new Map<string, StructureConnection>();
  private readonly pendingPlacements = new Map<string, PendingPlacement>();
  private readonly requestedConsumers = new Set<StructureId>();
  private buildRevision = 0;
  private powerRevision = 0;
  private producerStructureId: StructureId | null = null;
  private grantedConsumerIds: StructureId[] = [];

  public constructor(
    private readonly spatial: BuildingSpatialQuery,
    snapshot?: BuildingWorldSnapshot,
  ) {
    if (snapshot === undefined) {
      this.structures.set('structure-instance:landing-module', {
        structureId: 'structure-instance:landing-module',
        definitionId: 'structure:landing-module',
        revision: 0,
        position: createWorldPosition(0, 0),
        orientationQuarterTurns: 0,
        placedByPlayerId: null,
        containerId: null,
      });
      for (const connector of defaultLandingConnectors()) {
        this.connectors.set(connector.connectorId, connector);
      }
      return;
    }

    if (snapshot.foothold.footholdId !== PHASE1_FOOTHOLD_ID) {
      throw new Error('Unsupported foothold snapshot identity.');
    }
    this.buildRevision = snapshot.foothold.buildRevision;
    this.powerRevision = snapshot.foothold.power.revision;
    this.producerStructureId =
      snapshot.foothold.power.producerStructureId;
    this.grantedConsumerIds = [
      ...snapshot.foothold.power.grantedConsumerIds,
    ].sort(compareStrings);
    for (const id of this.grantedConsumerIds) {
      this.requestedConsumers.add(id);
    }
    for (const structure of snapshot.foothold.structures) {
      if (this.structures.has(structure.structureId)) {
        throw new Error('Duplicate structure identity in snapshot.');
      }
      this.structures.set(structure.structureId, {
        ...structure,
        position: createWorldPosition(
          structure.position.x,
          structure.position.y,
        ),
      });
    }
    for (const connector of snapshot.foothold.connectors) {
      if (this.connectors.has(connector.connectorId)) {
        throw new Error('Duplicate connector identity in snapshot.');
      }
      this.connectors.set(connector.connectorId, freezeConnector(connector));
    }
    for (const connection of snapshot.foothold.connections) {
      this.connections.set(
        connection.connectionId,
        freezeConnection(connection),
      );
    }
    for (const condenser of snapshot.foothold.condensers) {
      if (!this.structures.has(condenser.structureId)) {
        throw new Error('Condenser references missing structure.');
      }
      this.condensers.set(condenser.structureId, {
        ...condenser,
      });
    }
    this.validateReconstructedSnapshot();
  }

  public getBuildRevision(): number {
    return this.buildRevision;
  }

  public getStructure(structureId: StructureId):
    Readonly<StructureRuntimeState> | null {
    const structure = this.structures.get(structureId);
    return structure === undefined ? null : freezeStructure(structure);
  }

  public getCondenser(structureId: StructureId):
    Readonly<CondenserRuntimeState> | null {
    const condenser = this.condensers.get(structureId);
    return condenser === undefined ? null : freezeCondenser(condenser);
  }

  public matchesCommittedPlacement(
    structureId: StructureId,
    placement: PlacementIntent,
  ): boolean {
    const structure = this.structures.get(structureId);
    if (structure === undefined) return false;

    if (placement.mode === 'free') {
      return (
        structure.position.x === placement.anchor.x
        && structure.position.y === placement.anchor.y
        && structure.orientationQuarterTurns
          === placement.orientationQuarterTurns
      );
    }

    const connector = this.connectors.get(
      `connector:${structureId}:habitat`,
    );
    if (
      connector === undefined
      || connector.occupiedByConnectionId === null
    ) {
      return false;
    }
    const connection = this.connections.get(
      connector.occupiedByConnectionId,
    );
    if (connection === undefined) return false;
    return (
      connection.a === placement.targetConnectorId
      || connection.b === placement.targetConnectorId
    );
  }

  public getPowerNetwork(): Readonly<PowerNetworkState> {
    return Object.freeze({
      revision: this.powerRevision,
      producerStructureId: this.producerStructureId,
      capacityPu:
        this.producerStructureId === null
          ? 0
          : PHASE1_POWER_CAPACITY_PU,
      grantedConsumerIds: Object.freeze([
        ...this.grantedConsumerIds,
      ].sort(compareStrings)),
    });
  }

  public isSheltered(position: WorldPosition): boolean {
    const habitat = [...this.structures.values()].find(
      (structure) =>
        structure.definitionId === 'structure:habitat-room',
    );
    if (habitat === undefined) return false;
    const profile =
      PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:habitat-room'];
    const size = rotatedSize(
      profile,
      habitat.orientationQuarterTurns,
    );
    return (
      Math.abs(position.x - habitat.position.x) <= size.width / 2
      && Math.abs(position.y - habitat.position.y) <= size.depth / 2
    );
  }

  public getShelterThermalTarget(position: WorldPosition): number | null {
    return this.isSheltered(position) ? 50 : null;
  }

  public reservePlacement(request: {
    readonly operationId: string;
    readonly actorPlayerId: PlayerId;
    readonly definitionId: Exclude<
      Phase1StructureDefinitionId,
      'structure:landing-module'
    >;
    readonly expectedBuildRevision: number;
    readonly placement: PlacementIntent;
  }): PlacementReservation | PlacementRejectionReason {
    if (request.expectedBuildRevision !== this.buildRevision) {
      return 'WORLD_STATE_CHANGED';
    }
    const existing = this.pendingPlacements.get(request.operationId);
    if (existing !== undefined) return existing.reservation;

    if (
      this.countDefinition(request.definitionId)
      >= CAPS[request.definitionId]
    ) {
      return 'BUILD_LIMIT_REACHED';
    }

    const profile = PHASE1_STRUCTURE_PLACEMENT_PROFILES[
      request.definitionId
    ];
    let finalPosition: WorldPosition;
    let orientation: QuarterTurn;
    let targetConnectorId: ConnectorId | null = null;

    if (request.definitionId === 'structure:habitat-room') {
      if (request.placement.mode !== 'connector') {
        return 'CONNECTOR_REQUIRED';
      }
      const connector = this.connectors.get(
        request.placement.targetConnectorId,
      );
      if (
        connector === undefined
        || connector.structureId !== 'structure-instance:landing-module'
        || connector.occupiedByConnectionId !== null
      ) {
        return 'INVALID_CONNECTOR';
      }
      targetConnectorId = connector.connectorId;
      const vector = connectorVector(connector.localConnectorKey);
      const landing =
        this.structures.get('structure-instance:landing-module');
      if (landing === undefined) {
        throw new Error('Landing Module missing.');
      }
      const landingProfile =
        PHASE1_STRUCTURE_PLACEMENT_PROFILES[
          'structure:landing-module'
        ];
      const landingOffset =
        landingProfile.connectorOffsetWorldUnits ?? 0;
      const habitatOffset =
        profile.connectorOffsetWorldUnits ?? 0;
      finalPosition = createWorldPosition(
        landing.position.x
          + vector.x * (landingOffset + habitatOffset),
        landing.position.y
          + vector.y * (landingOffset + habitatOffset),
      );
      orientation = connectorQuarterTurn(
        connector.localConnectorKey,
      );
    } else {
      if (request.placement.mode !== 'free') {
        return 'INVALID_CONNECTOR';
      }
      finalPosition = createWorldPosition(
        request.placement.anchor.x,
        request.placement.anchor.y,
      );
      orientation = request.placement.orientationQuarterTurns;
    }

    const spatialFailure = this.validateSpatial(
      request.definitionId,
      finalPosition,
      orientation,
    );
    if (spatialFailure !== null) return spatialFailure;

    const structureId = `structure-instance:${request.operationId}`;
    if (this.structures.has(structureId)) {
      return 'OPERATION_ID_CONFLICT';
    }

    for (const pending of this.pendingPlacements.values()) {
      if (
        overlaps(
          finalPosition,
          profile,
          orientation,
          pending.reservation.finalPosition,
          pending.profile,
          pending.reservation.orientationQuarterTurns,
        )
      ) {
        return 'POSITION_TAKEN';
      }
      if (
        targetConnectorId !== null
        && pending.reservation.targetConnectorId === targetConnectorId
      ) {
        return 'POSITION_TAKEN';
      }
    }

    const containerId =
      request.definitionId === 'structure:storage-crate'
        ? `container:${structureId}:storage`
        : request.definitionId
          === 'structure:atmospheric-water-condenser'
          ? `container:${structureId}:output`
          : null;

    const reservation = Object.freeze({
      operationId: request.operationId,
      actorPlayerId: request.actorPlayerId,
      footholdId: PHASE1_FOOTHOLD_ID,
      expectedBuildRevision: request.expectedBuildRevision,
      structureId,
      definitionId: request.definitionId,
      finalPosition,
      orientationQuarterTurns: orientation,
      containerId,
      targetConnectorId,
    });
    this.pendingPlacements.set(request.operationId, {
      reservation,
      profile,
    });
    return reservation;
  }

  public releasePlacementReservation(
    reservation: Readonly<PlacementReservation>,
  ): void {
    const current = this.pendingPlacements.get(
      reservation.operationId,
    );
    if (current?.reservation.structureId === reservation.structureId) {
      this.pendingPlacements.delete(reservation.operationId);
    }
  }

  public commitReservedPlacement(
    reservation: Readonly<PlacementReservation>,
  ): Readonly<StructureRuntimeState> {
    const existing = this.structures.get(reservation.structureId);
    if (existing !== undefined) return freezeStructure(existing);
    const pending = this.pendingPlacements.get(
      reservation.operationId,
    );
    if (
      pending === undefined
      || pending.reservation.structureId !== reservation.structureId
    ) {
      throw new Error('Placement reservation is not active.');
    }

    const state: MutableStructure = {
      structureId: reservation.structureId,
      definitionId: reservation.definitionId,
      revision: 0,
      position: reservation.finalPosition,
      orientationQuarterTurns:
        reservation.orientationQuarterTurns,
      placedByPlayerId: reservation.actorPlayerId,
      containerId: reservation.containerId,
    };
    this.structures.set(state.structureId, state);

    if (reservation.targetConnectorId !== null) {
      const target = this.connectors.get(
        reservation.targetConnectorId,
      );
      if (target === undefined) {
        throw new Error('Reserved connector disappeared.');
      }
      const connectionId =
        `connection:${reservation.operationId}`;
      const habitatConnectorId =
        `connector:${state.structureId}:habitat`;
      this.connectors.set(
        target.connectorId,
        freezeConnector({
          ...target,
          occupiedByConnectionId: connectionId,
        }),
      );
      this.connectors.set(
        habitatConnectorId,
        freezeConnector({
          connectorId: habitatConnectorId,
          structureId: state.structureId,
          localConnectorKey: 'habitat',
          occupiedByConnectionId: connectionId,
        }),
      );
      this.connections.set(
        connectionId,
        freezeConnection({
          connectionId,
          a: target.connectorId,
          b: habitatConnectorId,
        }),
      );
    }

    if (
      state.definitionId
        === 'structure:atmospheric-water-condenser'
    ) {
      if (state.containerId === null) {
        throw new Error('Condenser missing output container.');
      }
      this.condensers.set(state.structureId, {
        structureId: state.structureId,
        revision: 0,
        enabled: true,
        productionProgressTicks: 0,
        completedCycleOrdinal: 0,
        outputContainerId: state.containerId,
      });
      this.requestedConsumers.add(state.structureId);
    }

    this.buildRevision += 1;
    this.pendingPlacements.delete(reservation.operationId);
    this.recalculatePower();
    return freezeStructure(state);
  }

  public reserveDismantle(request: {
    readonly operationId: string;
    readonly actorPlayerId: PlayerId;
    readonly structureId: StructureId;
    readonly expectedStructureRevision: number;
    readonly expectedBuildRevision: number;
  }): DismantleReservation | DismantleRejectionReason {
    if (request.expectedBuildRevision !== this.buildRevision) {
      return 'WORLD_STATE_CHANGED';
    }
    const structure = this.structures.get(request.structureId);
    if (structure === undefined) return 'SOURCE_MISSING';
    if (structure.definitionId === 'structure:landing-module') {
      return 'NOT_DISMANTLABLE';
    }
    if (structure.revision !== request.expectedStructureRevision) {
      return 'STALE_REVISION';
    }
    if (
      !this.spatial.isPlayerInInteractionRange(
        request.actorPlayerId,
        request.structureId,
      )
    ) {
      return 'OUT_OF_RANGE';
    }
    if (
      structure.definitionId === 'structure:habitat-room'
      && this.spatial.isPlayerInsideStructure(request.structureId)
    ) {
      return 'PLAYER_INSIDE';
    }

    return Object.freeze({
      operationId: request.operationId,
      actorPlayerId: request.actorPlayerId,
      footholdId: PHASE1_FOOTHOLD_ID,
      expectedBuildRevision: request.expectedBuildRevision,
      structure: freezeStructure(structure),
      linkedContainerId: structure.containerId,
      returnedKitItemDefinitionId:
        KIT_BY_STRUCTURE[
          structure.definitionId as Exclude<
            Phase1StructureDefinitionId,
            'structure:landing-module'
          >
        ],
    });
  }

  public commitReservedDismantle(
    reservation: Readonly<DismantleReservation>,
  ): void {
    const structure = this.structures.get(
      reservation.structure.structureId,
    );
    if (structure === undefined) return;
    this.structures.delete(structure.structureId);
    this.condensers.delete(structure.structureId);
    this.requestedConsumers.delete(structure.structureId);

    for (const [id, connector] of this.connectors) {
      if (connector.structureId !== structure.structureId) continue;
      const connectionId = connector.occupiedByConnectionId;
      this.connectors.delete(id);
      if (connectionId !== null) {
        const connection = this.connections.get(connectionId);
        if (connection !== undefined) {
          const otherId =
            connection.a === id ? connection.b : connection.a;
          const other = this.connectors.get(otherId);
          if (other !== undefined) {
            this.connectors.set(
              otherId,
              freezeConnector({
                ...other,
                occupiedByConnectionId: null,
              }),
            );
          }
          this.connections.delete(connectionId);
        }
      }
    }

    this.buildRevision += 1;
    this.recalculatePower();
  }

  public setCondenserEnabled(
    structureId: StructureId,
    expectedRevision: number,
    enabled: boolean,
  ): Readonly<CondenserRuntimeState> | 'STALE_REVISION' | 'SOURCE_MISSING' {
    const state = this.condensers.get(structureId);
    if (state === undefined) return 'SOURCE_MISSING';
    if (state.enabled === enabled) return freezeCondenser(state);
    if (state.revision !== expectedRevision) return 'STALE_REVISION';
    state.enabled = enabled;
    state.revision += 1;
    if (enabled) {
      this.requestedConsumers.add(structureId);
    } else {
      this.requestedConsumers.delete(structureId);
    }
    this.recalculatePower();
    return freezeCondenser(state);
  }

  public isCondenserPowered(structureId: StructureId): boolean {
    return this.grantedConsumerIds.includes(structureId);
  }

  public setCondenserPowerRequest(
    structureId: StructureId,
    requested: boolean,
  ): void {
    const condenser = this.condensers.get(structureId);
    if (condenser === undefined) {
      throw new Error('Unknown condenser.');
    }
    const shouldRequest = requested && condenser.enabled;
    const had = this.requestedConsumers.has(structureId);
    if (shouldRequest === had) return;
    if (shouldRequest) {
      this.requestedConsumers.add(structureId);
    } else {
      this.requestedConsumers.delete(structureId);
    }
    this.recalculatePower();
  }

  public getStructureByContainerId(
    containerId: string,
  ): Readonly<StructureRuntimeState> | null {
    const structure = [...this.structures.values()].find(
      (candidate) => candidate.containerId === containerId,
    );
    return structure === undefined ? null : freezeStructure(structure);
  }

  public isStructureAccessible(
    playerId: PlayerId,
    structureId: StructureId,
  ): boolean {
    return this.spatial.isPlayerInInteractionRange(playerId, structureId);
  }

  public commitCondenserCycle(
    structureId: StructureId,
    expectedRevision: number,
  ): Readonly<CondenserRuntimeState> | 'STALE_REVISION' | 'SOURCE_MISSING' {
    const state = this.condensers.get(structureId);
    if (state === undefined) return 'SOURCE_MISSING';
    if (state.revision !== expectedRevision) return 'STALE_REVISION';
    state.completedCycleOrdinal += 1;
    state.productionProgressTicks = Math.max(
      0,
      state.productionProgressTicks - 5400,
    );
    state.revision += 1;
    return freezeCondenser(state);
  }

  public incrementCondenserProgress(
    structureId: StructureId,
  ): Readonly<CondenserRuntimeState> {
    const state = this.condensers.get(structureId);
    if (state === undefined) {
      throw new Error('Unknown condenser.');
    }
    state.productionProgressTicks += 1;
    state.revision += 1;
    return freezeCondenser(state);
  }

  public exportSnapshot(): BuildingWorldSnapshot {
    const foothold: FootholdBuildState = Object.freeze({
      footholdId: PHASE1_FOOTHOLD_ID,
      buildRevision: this.buildRevision,
      structures: Object.freeze(
        [...this.structures.values()]
          .sort((a,b)=>compareStrings(a.structureId,b.structureId))
          .map(freezeStructure),
      ),
      connectors: Object.freeze(
        [...this.connectors.values()]
          .sort((a,b)=>compareStrings(a.connectorId,b.connectorId))
          .map(freezeConnector),
      ),
      connections: Object.freeze(
        [...this.connections.values()]
          .sort((a,b)=>compareStrings(a.connectionId,b.connectionId))
          .map(freezeConnection),
      ),
      power: this.getPowerNetwork(),
      condensers: Object.freeze(
        [...this.condensers.values()]
          .sort((a,b)=>compareStrings(a.structureId,b.structureId))
          .map(freezeCondenser),
      ),
    });
    return Object.freeze({ foothold });
  }

  private countDefinition(id: Phase1StructureDefinitionId): number {
    return [...this.structures.values()].filter(
      (structure) => structure.definitionId === id,
    ).length;
  }

  private validateSpatial(
    definitionId: Exclude<
      Phase1StructureDefinitionId,
      'structure:landing-module'
    >,
    position: WorldPosition,
    orientation: QuarterTurn,
  ): PlacementRejectionReason | null {
    const profile = PHASE1_STRUCTURE_PLACEMENT_PROFILES[
      definitionId
    ];
    if (!this.spatial.isFootprintExplored(
      position, profile, orientation,
    )) return 'UNEXPLORED_AREA';
    if (!this.spatial.isBuildableGround(
      position, profile, orientation,
    )) return 'INVALID_TERRAIN';
    if (this.spatial.hasNonBuildableSurface(
      position, profile, orientation,
    )) return 'NON_BUILDABLE_SURFACE';
    if (this.spatial.hasBlockingWorldCollision(
      position, profile, orientation,
    )) return 'OBSTRUCTED';

    for (const structure of this.structures.values()) {
      const otherProfile =
        PHASE1_STRUCTURE_PLACEMENT_PROFILES[
          structure.definitionId
        ];
      if (overlaps(
        position, profile, orientation,
        structure.position, otherProfile,
        structure.orientationQuarterTurns,
      )) return 'STRUCTURE_OVERLAP';
    }
    if (this.spatial.overlapsProtectedRuin(
      position, profile, orientation,
    )) return 'OBSTRUCTED';
    if (this.spatial.obstructsDeathCache(
      position, profile, orientation,
    )) return 'OBSTRUCTED';
    if (this.spatial.blocksSpawnClearance(
      position, profile, orientation,
    )) return 'BLOCKS_SPAWN';
    if (this.spatial.blocksRequiredAccess(
      position, profile, orientation,
    )) return 'BLOCKS_REQUIRED_ACCESS';

    const anchors = [...this.structures.values()].filter(
      (structure) =>
        structure.definitionId === 'structure:landing-module'
        || structure.definitionId === 'structure:habitat-room',
    );
    if (!anchors.some(
      (anchor) =>
        squaredDistance(position, anchor.position)
          <= PHASE1_BUILD_ZONE_RADIUS_WU ** 2,
    )) return 'OUTSIDE_BASE_BUILD_ZONE';
    return null;
  }

  private recalculatePower(): void {
    const producer = [...this.structures.values()].find(
      (structure) =>
        structure.definitionId
          === 'structure:compact-power-unit',
    );
    const previousProducer = this.producerStructureId;
    const previous = [...this.grantedConsumerIds].sort(compareStrings);
    this.producerStructureId = producer?.structureId ?? null;

    const stillValid = this.grantedConsumerIds.filter((id) => {
      const condenser = this.condensers.get(id);
      const structure = this.structures.get(id);
      return (
        producer !== undefined
        && condenser !== undefined
        && structure !== undefined
        && condenser.enabled
        && this.requestedConsumers.has(id)
        && squaredDistance(
          structure.position,
          producer.position,
        ) <= PHASE1_POWER_RADIUS_WU ** 2
      );
    });

    let used = stillValid.length * PHASE1_CONDENSER_DEMAND_PU;
    const candidates = [...this.condensers.values()]
      .filter((state) => !stillValid.includes(state.structureId))
      .filter(
        (state) =>
          state.enabled
          && this.requestedConsumers.has(state.structureId),
      )
      .sort((a,b)=>compareStrings(a.structureId,b.structureId));

    const next = [...stillValid];
    if (producer !== undefined) {
      for (const candidate of candidates) {
        const structure = this.structures.get(candidate.structureId);
        if (structure === undefined) continue;
        if (
          squaredDistance(structure.position, producer.position)
            > PHASE1_POWER_RADIUS_WU ** 2
        ) continue;
        if (
          used + PHASE1_CONDENSER_DEMAND_PU
            > PHASE1_POWER_CAPACITY_PU
        ) continue;
        next.push(candidate.structureId);
        used += PHASE1_CONDENSER_DEMAND_PU;
      }
    }
    next.sort(compareStrings);
    this.grantedConsumerIds = next;

    if (
      previousProducer !== this.producerStructureId
      || previous.length !== next.length
      || previous.some((id,index)=>id !== next[index])
    ) {
      this.powerRevision += 1;
    }
  }

  private validateReconstructedSnapshot(): void {
    if (
      !Number.isSafeInteger(this.buildRevision)
      || this.buildRevision < 0
      || !Number.isSafeInteger(this.powerRevision)
      || this.powerRevision < 0
    ) {
      throw new Error('Building aggregate revision is corrupt.');
    }

    const landing = this.structures.get(
      'structure-instance:landing-module',
    );
    if (
      landing === undefined
      || landing.definitionId !== 'structure:landing-module'
      || landing.position.x !== 0
      || landing.position.y !== 0
      || landing.placedByPlayerId !== null
      || landing.containerId !== null
    ) {
      throw new Error('Landing Module reconstruction is corrupt.');
    }

    for (const id of Object.keys(CAPS) as Phase1StructureDefinitionId[]) {
      if (this.countDefinition(id) > CAPS[id]) {
        throw new Error(`Structure cap exceeded for ${id}.`);
      }
    }

    for (const structure of this.structures.values()) {
      if (
        !(structure.definitionId in PHASE1_STRUCTURE_PLACEMENT_PROFILES)
        || !Number.isSafeInteger(structure.revision)
        || structure.revision < 0
        || ![0, 1, 2, 3].includes(structure.orientationQuarterTurns)
      ) {
        throw new Error('Structure reconstruction is corrupt.');
      }

      const requiresContainer =
        structure.definitionId === 'structure:storage-crate'
        || structure.definitionId
          === 'structure:atmospheric-water-condenser';
      if (requiresContainer !== (structure.containerId !== null)) {
        throw new Error('Structure/container reference is corrupt.');
      }
    }

    const structures = [...this.structures.values()];
    for (let leftIndex = 0; leftIndex < structures.length; leftIndex += 1) {
      const left = structures[leftIndex];
      if (left === undefined) continue;
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < structures.length;
        rightIndex += 1
      ) {
        const right = structures[rightIndex];
        if (right === undefined) continue;
        if (overlaps(
          left.position,
          PHASE1_STRUCTURE_PLACEMENT_PROFILES[left.definitionId],
          left.orientationQuarterTurns,
          right.position,
          PHASE1_STRUCTURE_PLACEMENT_PROFILES[right.definitionId],
          right.orientationQuarterTurns,
        )) {
          throw new Error('Reconstructed structures overlap.');
        }
      }
    }

    for (const connector of this.connectors.values()) {
      if (!this.structures.has(connector.structureId)) {
        throw new Error('Connector references missing structure.');
      }
      if (
        connector.occupiedByConnectionId !== null
        && !this.connections.has(connector.occupiedByConnectionId)
      ) {
        throw new Error('Connector references missing connection.');
      }
    }

    for (const connection of this.connections.values()) {
      const a = this.connectors.get(connection.a);
      const b = this.connectors.get(connection.b);
      if (
        a === undefined
        || b === undefined
        || a.occupiedByConnectionId !== connection.connectionId
        || b.occupiedByConnectionId !== connection.connectionId
      ) {
        throw new Error('Structure connection reconstruction is corrupt.');
      }
    }

    for (const condenser of this.condensers.values()) {
      const structure = this.structures.get(condenser.structureId);
      if (
        structure?.definitionId
          !== 'structure:atmospheric-water-condenser'
        || structure.containerId !== condenser.outputContainerId
        || !Number.isSafeInteger(condenser.revision)
        || condenser.revision < 0
        || !Number.isSafeInteger(condenser.productionProgressTicks)
        || condenser.productionProgressTicks < 0
        || condenser.productionProgressTicks >= 5400
        || !Number.isSafeInteger(condenser.completedCycleOrdinal)
        || condenser.completedCycleOrdinal < 0
      ) {
        throw new Error('Condenser reconstruction is corrupt.');
      }
    }

    if (
      this.producerStructureId !== null
      && this.structures.get(this.producerStructureId)
        ?.definitionId !== 'structure:compact-power-unit'
    ) {
      throw new Error('Power producer reference is corrupt.');
    }

    if (
      this.grantedConsumerIds.length * PHASE1_CONDENSER_DEMAND_PU
      > (this.producerStructureId === null
        ? 0
        : PHASE1_POWER_CAPACITY_PU)
    ) {
      throw new Error('Power grants exceed capacity.');
    }

    for (const id of this.grantedConsumerIds) {
      const condenser = this.condensers.get(id);
      const structure = this.structures.get(id);
      const producer =
        this.producerStructureId === null
          ? undefined
          : this.structures.get(this.producerStructureId);
      if (
        condenser === undefined
        || !condenser.enabled
        || structure === undefined
        || producer === undefined
        || squaredDistance(structure.position, producer.position)
          > PHASE1_POWER_RADIUS_WU ** 2
      ) {
        throw new Error('Power grant reconstruction is corrupt.');
      }
    }
  }
}
