import type { ContentCatalogV1 } from '../../content';
import {
  createWorldPosition,
  type PlayerId,
  type WorldPosition,
} from '../../foundation';
import type {
  BuildingSpatialQuery,
  QuarterTurn,
  StructurePlacementProfile,
  StructureRuntimeState,
} from '../building/BuildingTypes';
import type {
  DropPlacementReservation,
  ItemInteractionWorldPort,
  ResourceNodeView,
  WorkbenchView,
  WorldDropView,
  WorldRevisionResult,
} from '../api/ItemInteractionWorld';
import type {
  DeathCachePlacementReservation,
  DeathCacheWorldView,
  EnvironmentExposureView,
  PredatorCombatState,
  PredatorWorldView,
  RespawnPlacementReservation,
  SurvivalWorldPort,
} from '../api/SurvivalWorld';
import {
  fromWorldPosition,
  toChunkKey,
  toChunkLocalPosition,
  type ChunkCoord,
} from '../chunks/ChunkCoord';
import {
  isExplorationCellKnown,
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
} from './ExplorationGrid';
import {
  PHASE1_LANDING_POSITION,
} from './Phase1ChunkGenerator';
import {
  DeathCacheWorldState,
  type DeathCacheWorldSnapshot,
} from './DeathCacheWorldState';
import type {
  Phase1GeneratedWorldEntity,
  Phase1WorldChunkView,
} from './Phase1WorldStore';
import { Phase1WorldStore } from './Phase1WorldStore';

interface MutableWorldDrop {
  readonly worldDropId: string;
  revision: number;
  readonly containerId: string;
  readonly position: WorldPosition;
  available: boolean;
}

interface MutablePredator {
  readonly entityId: string;
  position: WorldPosition;
  readonly encounterAnchor: WorldPosition;
  revision: number;
  health: number;
  state: PredatorCombatState;
  targetPlayerId: PlayerId | null;
  stateUntilTick: number | null;
  outsideLeashTicks: number;
}

export interface Phase1VerticalSliceWorldSnapshot {
  readonly deathCaches: DeathCacheWorldSnapshot;
  readonly drops: readonly Readonly<MutableWorldDrop>[];
  readonly predators: readonly Readonly<MutablePredator>[];
}

export interface Phase1VerticalSlicePlayerPositionPort {
  get(playerId: PlayerId): WorldPosition;
  set(playerId: PlayerId, position: WorldPosition): void;
}

export interface Phase1VerticalSliceWorldAdapterOptions {
  readonly catalog: ContentCatalogV1;
  readonly store: Phase1WorldStore;
  readonly playerPositions: Phase1VerticalSlicePlayerPositionPort;
  readonly authorityTick: () => number;
  readonly interactionRangeWorldUnits: number;
  readonly spawnClearanceRadiusWorldUnits: number;
  readonly requiredAccessRadiusWorldUnits: number;
  readonly structures: () => readonly Readonly<StructureRuntimeState>[];
  readonly playerIds: () => readonly PlayerId[];
  readonly playerInsideStructure?: (
    playerId: PlayerId,
    structureId: string,
  ) => boolean;
  readonly initialSnapshot?: Phase1VerticalSliceWorldSnapshot;
}

function distanceSquared(a: WorldPosition, b: WorldPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function positionInsideFootprint(
  point: WorldPosition,
  center: WorldPosition,
  profile: StructurePlacementProfile,
  orientationQuarterTurns: QuarterTurn,
): boolean {
  const swapped = orientationQuarterTurns % 2 === 1;
  const width = swapped ? profile.footprint.depth : profile.footprint.width;
  const depth = swapped ? profile.footprint.width : profile.footprint.depth;
  return Math.abs(point.x - center.x) <= width / 2
    && Math.abs(point.y - center.y) <= depth / 2;
}

function copyDrop(drop: MutableWorldDrop): Readonly<MutableWorldDrop> {
  return Object.freeze({
    ...drop,
    position: createWorldPosition(drop.position.x, drop.position.y),
  });
}

function copyPredator(
  predator: MutablePredator,
): Readonly<MutablePredator> {
  return Object.freeze({
    ...predator,
    position: createWorldPosition(
      predator.position.x,
      predator.position.y,
    ),
    encounterAnchor: createWorldPosition(
      predator.encounterAnchor.x,
      predator.encounterAnchor.y,
    ),
  });
}

/**
 * Canonical Phase 1 world adapter used by the vertical-slice composition.
 *
 * Generated resource/ruin/fog/environment state stays owned by Phase1WorldStore.
 * Spatial drops, death caches and hostile runtime state remain world-owned here.
 * Player positions are read/written through the injected authority position
 * port so this adapter never creates a second movement authority.
 */
export class Phase1VerticalSliceWorldAdapter
  implements ItemInteractionWorldPort, SurvivalWorldPort, BuildingSpatialQuery {
  private readonly activeChunks = new Map<string, Phase1WorldChunkView>();
  private readonly activeCoords = new Map<string, ChunkCoord>();
  private readonly drops = new Map<string, MutableWorldDrop>();
  private readonly predators = new Map<string, MutablePredator>();
  private readonly dropReservations = new Map<string, WorldPosition>();
  private readonly deathCaches: DeathCacheWorldState;

  public constructor(
    private readonly options: Phase1VerticalSliceWorldAdapterOptions,
  ) {
    for (const [value, label] of [
      [options.interactionRangeWorldUnits, 'interaction range'],
      [options.spawnClearanceRadiusWorldUnits, 'spawn clearance'],
      [options.requiredAccessRadiusWorldUnits, 'required access'],
    ] as const) {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(
          'Phase 1 vertical-slice ' + label + ' must be finite and non-negative.',
        );
      }
    }

    this.deathCaches = new DeathCacheWorldState(
      options.initialSnapshot?.deathCaches,
    );

    for (const drop of options.initialSnapshot?.drops ?? []) {
      if (
        drop.worldDropId.length === 0
        || drop.containerId.length === 0
        || this.drops.has(drop.worldDropId)
      ) {
        throw new Error('Invalid Phase 1 vertical-slice world-drop snapshot.');
      }
      this.drops.set(drop.worldDropId, {
        ...drop,
        position: createWorldPosition(drop.position.x, drop.position.y),
      });
    }

    for (const predator of options.initialSnapshot?.predators ?? []) {
      if (predator.entityId.length === 0 || this.predators.has(predator.entityId)) {
        throw new Error('Invalid Phase 1 vertical-slice predator snapshot.');
      }
      this.predators.set(predator.entityId, {
        ...predator,
        position: createWorldPosition(
          predator.position.x,
          predator.position.y,
        ),
        encounterAnchor: createWorldPosition(
          predator.encounterAnchor.x,
          predator.encounterAnchor.y,
        ),
      });
    }
  }

  public async activatePosition(
    position: WorldPosition,
  ): Promise<Phase1WorldChunkView> {
    return this.activateCoord(fromWorldPosition(position));
  }

  public async activateCoord(
    coord: ChunkCoord,
  ): Promise<Phase1WorldChunkView> {
    const key = toChunkKey(coord);
    const existing = this.activeChunks.get(key);
    if (existing !== undefined) return existing;

    const view = await this.options.store.requestActive(coord);
    this.activeChunks.set(key, view);
    this.activeCoords.set(key, coord);
    this.indexHostiles(view);
    return view;
  }

  public async releaseAll(): Promise<void> {
    const coords = [...this.activeCoords.values()];
    this.activeChunks.clear();
    this.activeCoords.clear();

    for (const coord of coords) {
      await this.options.store.releaseInterest(coord);
    }
  }

  public findGeneratedEntityByDefinition(
    definitionId: string,
  ): Readonly<Phase1GeneratedWorldEntity> | null {
    for (const view of this.activeChunks.values()) {
      const entity = view.base.entities.find(
        (candidate) => candidate.definitionId === definitionId,
      );
      if (entity !== undefined) return entity;
    }
    return null;
  }

  public getPlayerPosition(playerId: PlayerId): WorldPosition {
    return this.options.playerPositions.get(playerId);
  }

  public isContainerAccessible(
    playerId: PlayerId,
    containerId: string,
  ): boolean {
    if (containerId === 'inventory:' + playerId) return true;

    const drop = [...this.drops.values()].find(
      (entry) => entry.containerId === containerId && entry.available,
    );
    if (drop !== undefined) {
      return this.inInteractionRange(
        this.getPlayerPosition(playerId),
        drop.position,
      );
    }

    const deathCache = this.deathCaches.getByContainer(containerId);
    if (deathCache !== null) {
      return this.inInteractionRange(
        this.getPlayerPosition(playerId),
        deathCache.position,
      );
    }

    return false;
  }

  public getResource(
    resourceEntityId: string,
  ): Readonly<ResourceNodeView> | null {
    const entity = this.findGeneratedEntity(resourceEntityId);
    if (entity === null || entity.type !== 'resource') return null;
    const state = this.options.store.getResourceState(resourceEntityId);
    if (state === undefined) return null;
    return Object.freeze({
      resourceEntityId,
      resourceDefinitionId: entity.definitionId,
      revision: state.revision,
      remainingActions: state.remainingGatherActions,
      depleted: state.depleted,
    });
  }

  public isResourceInInteractionRange(
    playerId: PlayerId,
    resourceEntityId: string,
  ): boolean {
    const entity = this.findGeneratedEntity(resourceEntityId);
    return entity !== null
      && entity.type === 'resource'
      && this.inInteractionRange(
        this.getPlayerPosition(playerId),
        entity.position,
      );
  }

  public commitGather(
    resourceEntityId: string,
    expectedRevision: number,
  ): Readonly<WorldRevisionResult> | null {
    try {
      const result = this.options.store.commitResourceGather(
        resourceEntityId,
        expectedRevision,
        this.options.authorityTick(),
      );
      return Object.freeze({ revision: result.state.revision });
    } catch {
      return null;
    }
  }

  public getWorldDrop(
    worldDropId: string,
  ): Readonly<WorldDropView> | null {
    const drop = this.drops.get(worldDropId);
    if (drop === undefined) return null;
    return Object.freeze({
      worldDropId: drop.worldDropId,
      revision: drop.revision,
      containerId: drop.containerId,
      available: drop.available,
    });
  }

  public isWorldDropInInteractionRange(
    playerId: PlayerId,
    worldDropId: string,
  ): boolean {
    const drop = this.drops.get(worldDropId);
    return drop !== undefined
      && drop.available
      && this.inInteractionRange(
        this.getPlayerPosition(playerId),
        drop.position,
      );
  }

  public resolveDropPlacement(
    playerId: PlayerId,
  ): Readonly<DropPlacementReservation> | null {
    const position = this.getPlayerPosition(playerId);
    if (!this.isPositionBuildable(position)) return null;
    const token = [
      'phase1-drop',
      playerId,
      this.options.authorityTick(),
      position.x,
      position.y,
    ].join(':');
    this.dropReservations.set(
      token,
      createWorldPosition(position.x, position.y),
    );
    return Object.freeze({ token });
  }

  public commitCreateWorldDrop(request: {
    readonly worldDropId: string;
    readonly containerId: string;
    readonly placement: DropPlacementReservation;
  }): Readonly<WorldDropView> | null {
    const position = this.dropReservations.get(request.placement.token);
    if (
      position === undefined
      || this.drops.has(request.worldDropId)
      || request.containerId.length === 0
    ) {
      return null;
    }
    this.dropReservations.delete(request.placement.token);
    const drop: MutableWorldDrop = {
      worldDropId: request.worldDropId,
      revision: 0,
      containerId: request.containerId,
      position,
      available: true,
    };
    this.drops.set(drop.worldDropId, drop);
    return this.getWorldDrop(drop.worldDropId);
  }

  public commitTakeWorldDrop(
    worldDropId: string,
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
    structureInstanceId: string,
  ): Readonly<WorkbenchView> | null {
    const structure = this.structureById(structureInstanceId);
    if (
      structure === null
      || structure.definitionId !== 'structure:workbench'
    ) {
      return null;
    }
    return Object.freeze({
      structureInstanceId,
      revision: structure.revision,
      functional: true,
    });
  }

  public isWorkbenchAccessible(
    playerId: PlayerId,
    structureInstanceId: string,
  ): boolean {
    return this.isPlayerInInteractionRange(playerId, structureInstanceId);
  }

  public reservePlayerRespawn(
    playerId: PlayerId,
  ): Readonly<RespawnPlacementReservation> | null {
    if (!this.isPositionBuildable(PHASE1_LANDING_POSITION)) return null;
    return Object.freeze({
      token: 'phase1-respawn:' + playerId,
      playerId,
      position: PHASE1_LANDING_POSITION,
    });
  }

  public commitReservedPlayerRespawn(
    reservation: Readonly<RespawnPlacementReservation>,
  ): void {
    this.options.playerPositions.set(
      reservation.playerId,
      reservation.position,
    );
  }

  public getEnvironmentExposure(
    playerId: PlayerId,
  ): Readonly<EnvironmentExposureView> {
    const environment = this.options.store.getEnvironmentView();
    const weather = this.options.catalog.getAs('weather:cold-rain', 'weather');

    const habitat = [...this.structureValues()].find(
      (structure) =>
        structure.definitionId === 'structure:habitat-room'
        && this.playerInsideStructure(playerId, structure),
    );

    if (habitat !== undefined) {
      const definition = this.options.catalog.getAs(
        habitat.definitionId,
        'structure',
      );
      if (definition.shelter === undefined) {
        throw new Error('Habitat shelter definition is missing.');
      }
      return Object.freeze({
        thermalTarget: definition.shelter.thermalTarget,
        sheltered: true,
      });
    }

    return Object.freeze({
      thermalTarget: environment.coldRainStatus === 'active'
        ? environment.dayPeriod === 'day'
          ? weather.dayThermalTarget
          : weather.nightThermalTarget
        : 50,
      sheltered: false,
    });
  }

  public reserveDeathCachePlacement(request: {
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly requestedPosition: WorldPosition;
  }): Readonly<DeathCachePlacementReservation> {
    return this.deathCaches.reservePlacement(request, {
      isValid: (position) => this.isPositionBuildable(position),
      nearestReachableFallback: () => PHASE1_LANDING_POSITION,
    });
  }

  public commitReservedDeathCache(request: {
    readonly entityId: string;
    readonly deathId: string;
    readonly ownerPlayerId: PlayerId;
    readonly containerId: string;
    readonly reservation: DeathCachePlacementReservation;
  }): Readonly<DeathCacheWorldView> {
    return this.deathCaches.commitReserved(request);
  }

  public getDeathCacheByContainer(
    containerId: string,
  ): Readonly<DeathCacheWorldView> | null {
    return this.deathCaches.getByContainer(containerId);
  }

  public removeEmptyDeathCache(
    entityId: string,
    expectedRevision: number,
  ): boolean {
    return this.deathCaches.removeEmpty(entityId, expectedRevision);
  }

  public getPredator(
    entityId: string,
  ): Readonly<PredatorWorldView> | null {
    const predator = this.predators.get(entityId);
    return predator === undefined ? null : copyPredator(predator);
  }

  public commitPredatorRuntime(request: {
    readonly entityId: string;
    readonly expectedRevision: number;
    readonly health: number;
    readonly state: PredatorCombatState;
    readonly targetPlayerId: PlayerId | null;
    readonly stateUntilTick: number | null;
    readonly outsideLeashTicks: number;
  }): Readonly<PredatorWorldView> | null {
    const predator = this.predators.get(request.entityId);
    if (
      predator === undefined
      || predator.revision !== request.expectedRevision
    ) {
      return null;
    }
    predator.revision += 1;
    predator.health = request.health;
    predator.state = request.state;
    predator.targetPlayerId = request.targetPlayerId;
    predator.stateUntilTick = request.stateUntilTick;
    predator.outsideLeashTicks = request.outsideLeashTicks;
    return copyPredator(predator);
  }

  public isFootprintExplored(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    return this.sampleFootprint(
      position,
      profile,
      orientationQuarterTurns,
    ).every((sample) => this.isPositionExplored(sample));
  }

  public isBuildableGround(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    return this.sampleFootprint(
      position,
      profile,
      orientationQuarterTurns,
    ).every((sample) => this.isPositionBuildable(sample));
  }

  public hasNonBuildableSurface(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    return !this.isBuildableGround(
      position,
      profile,
      orientationQuarterTurns,
    );
  }

  public hasBlockingWorldCollision(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    for (const view of this.activeChunks.values()) {
      for (const entity of view.base.entities) {
        if (
          entity.type !== 'ruin'
          && positionInsideFootprint(
            entity.position,
            position,
            profile,
            orientationQuarterTurns,
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  public overlapsProtectedRuin(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    for (const view of this.activeChunks.values()) {
      if (view.base.entities.some(
        (entity) =>
          entity.type === 'ruin'
          && positionInsideFootprint(
            entity.position,
            position,
            profile,
            orientationQuarterTurns,
          ),
      )) {
        return true;
      }
    }
    return false;
  }

  public obstructsDeathCache(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    return this.deathCaches.exportSnapshot().caches.some(
      (cache) => positionInsideFootprint(
        cache.position,
        position,
        profile,
        orientationQuarterTurns,
      ),
    );
  }

  public blocksSpawnClearance(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    const nearest = this.sampleFootprint(
      position,
      profile,
      orientationQuarterTurns,
    ).reduce(
      (minimum, sample) => Math.min(
        minimum,
        Math.sqrt(distanceSquared(sample, PHASE1_LANDING_POSITION)),
      ),
      Number.POSITIVE_INFINITY,
    );
    return nearest < this.options.spawnClearanceRadiusWorldUnits;
  }

  public blocksRequiredAccess(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    const nearest = this.sampleFootprint(
      position,
      profile,
      orientationQuarterTurns,
    ).reduce(
      (minimum, sample) => Math.min(
        minimum,
        Math.sqrt(distanceSquared(sample, PHASE1_LANDING_POSITION)),
      ),
      Number.POSITIVE_INFINITY,
    );
    return nearest < this.options.requiredAccessRadiusWorldUnits;
  }

  public isPlayerInsideStructure(structureId: string): boolean {
    for (const playerId of this.knownPlayerIds()) {
      const structure = this.structureById(structureId);
      if (
        structure !== null
        && this.playerInsideStructure(playerId, structure)
      ) {
        return true;
      }
    }
    return false;
  }

  public isPlayerInInteractionRange(
    playerId: PlayerId,
    structureId: string,
  ): boolean {
    const structure = this.structureById(structureId);
    return structure !== null
      && this.inInteractionRange(
        this.getPlayerPosition(playerId),
        structure.position,
      );
  }

  public exportSnapshot(): Phase1VerticalSliceWorldSnapshot {
    return Object.freeze({
      deathCaches: this.deathCaches.exportSnapshot(),
      drops: Object.freeze(
        [...this.drops.values()]
          .sort((a, b) => a.worldDropId.localeCompare(b.worldDropId))
          .map(copyDrop),
      ),
      predators: Object.freeze(
        [...this.predators.values()]
          .sort((a, b) => a.entityId.localeCompare(b.entityId))
          .map(copyPredator),
      ),
    });
  }

  private findGeneratedEntity(
    entityId: string,
  ): Readonly<Phase1GeneratedWorldEntity> | null {
    for (const view of this.activeChunks.values()) {
      const found = view.base.entities.find(
        (candidate) => candidate.entityId === entityId,
      );
      if (found !== undefined) return found;
    }
    return null;
  }

  private indexHostiles(view: Phase1WorldChunkView): void {
    const definition = this.options.catalog.getAs(
      'hostile:territorial-predator',
      'hostile',
    );
    for (const entity of view.base.entities) {
      if (
        entity.type !== 'hostile'
        || this.predators.has(entity.entityId)
      ) {
        continue;
      }
      this.predators.set(entity.entityId, {
        entityId: entity.entityId,
        position: createWorldPosition(entity.position.x, entity.position.y),
        encounterAnchor: createWorldPosition(
          entity.position.x,
          entity.position.y,
        ),
        revision: 0,
        health: definition.maxHealth,
        state: 'idle',
        targetPlayerId: null,
        stateUntilTick: null,
        outsideLeashTicks: 0,
      });
    }
  }

  private inInteractionRange(
    a: WorldPosition,
    b: WorldPosition,
  ): boolean {
    const range = this.options.interactionRangeWorldUnits;
    return distanceSquared(a, b) <= range * range;
  }

  private sampleFootprint(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): readonly WorldPosition[] {
    const swapped = orientationQuarterTurns % 2 === 1;
    const width = swapped ? profile.footprint.depth : profile.footprint.width;
    const depth = swapped ? profile.footprint.width : profile.footprint.depth;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    return Object.freeze([
      position,
      createWorldPosition(position.x - halfWidth, position.y - halfDepth),
      createWorldPosition(position.x + halfWidth, position.y - halfDepth),
      createWorldPosition(position.x - halfWidth, position.y + halfDepth),
      createWorldPosition(position.x + halfWidth, position.y + halfDepth),
    ]);
  }

  private isPositionBuildable(position: WorldPosition): boolean {
    const view = this.activeChunks.get(toChunkKey(fromWorldPosition(position)));
    if (view === undefined) return false;
    const local = toChunkLocalPosition(position, view.base.coord);
    const cellSize = 32 / view.base.terrain.cellsPerAxis;
    const cellX = Math.min(
      view.base.terrain.cellsPerAxis - 1,
      Math.floor(local.x / cellSize),
    );
    const cellY = Math.min(
      view.base.terrain.cellsPerAxis - 1,
      Math.floor(local.y / cellSize),
    );
    return view.base.terrain.cells[
      cellY * view.base.terrain.cellsPerAxis + cellX
    ] === 'ground';
  }

  private isPositionExplored(position: WorldPosition): boolean {
    const view = this.activeChunks.get(toChunkKey(fromWorldPosition(position)));
    if (view === undefined) return false;
    const local = toChunkLocalPosition(position, view.base.coord);
    const cellX = Math.floor(
      local.x / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    );
    const cellY = Math.floor(
      local.y / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    );
    return isExplorationCellKnown(
      view.base.coord,
      view.delta.exploration,
      cellX,
      cellY,
    );
  }

  private playerInsideStructure(
    playerId: PlayerId,
    structure: Readonly<StructureRuntimeState>,
  ): boolean {
    if (this.options.playerInsideStructure !== undefined) {
      return this.options.playerInsideStructure(
        playerId,
        structure.structureId,
      );
    }
    const definition = this.options.catalog.getAs(
      structure.definitionId,
      'structure',
    );
    if (definition.shelter === undefined) return false;
    return distanceSquared(
      this.getPlayerPosition(playerId),
      structure.position,
    ) <= 1;
  }

  private structureValues(): readonly Readonly<StructureRuntimeState>[] {
    return this.options.structures();
  }

  private structureById(
    structureId: string,
  ): Readonly<StructureRuntimeState> | null {
    return this.structureValues().find(
      (entry) => entry.structureId === structureId,
    ) ?? null;
  }

  private knownPlayerIds(): readonly PlayerId[] {
    return this.options.playerIds();
  }
}
