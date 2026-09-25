import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createSimulationStep,
  createWorldPosition,
  toSimulationTick,
  type PlayerId,
  type WorldPosition,
} from '../foundation';
import {
  createPhase1ContentCatalog,
  type ContentCatalogV1,
} from '../content';
import {
  Phase1BuildingAuthority,
  Phase1CombatAuthority,
  Phase1CondenserAuthority,
  Phase1DeathAuthority,
  Phase1EquipmentAuthority,
  Phase1ItemAuthority,
  Phase1ProgressionAuthority,
  Phase1SurvivalAuthority,
  ProgressionItemEventSink,
  SurvivalGatherCostPort,
  createSimulationRuntime,
  type AuthorityRuntime,
  type ContainerState,
  type ConsumeTickResult,
  type DeathTransitionResult,
  type GatherCostPort,
  type GatherCostReservation,
  type GatherTickResult,
  type GatherCostReservationResult,
  type ItemLedgerSnapshot,
  type PlayerInput,
  type ProgressionAuthoritySnapshot,
  type RespawnResult,
  type SurvivalAuthoritySnapshot,
} from '../simulation';
import type {
  Phase1ReopenState,
} from '../persistence';
import {
  BuildingItemWorldAdapter,
  Phase1BuildingWorld,
  Phase1SessionWorldPersistence,
  Phase1VerticalSliceWorldAdapter,
  createChunkCoord,
  fromWorldPosition,
  type BuildingWorldSnapshot,
  type Phase1VerticalSliceWorldSnapshot,
} from '../world';
import {
  PHASE1_LANDING_POSITION,
  PHASE1_WORLD_GENERATION_VERSION,
  getPhase1WorldLandmarks,
} from '../world/phase1/Phase1ChunkGenerator';
import {
  PHASE1_RUIN_LOCATE_RADIUS_WORLD_UNITS,
  Phase1WorldStore,
} from '../world/phase1/Phase1WorldStore';

class DeferredGatherCostPort implements GatherCostPort {
  private target: GatherCostPort | null = null;

  public bind(target: GatherCostPort): void {
    if (this.target !== null) {
      throw new Error('Gather-cost authority is already bound.');
    }
    this.target = target;
  }

  public canStartGather(
    playerId: PlayerId,
    resourceDefinitionId: string,
  ): boolean {
    return this.requireTarget().canStartGather(
      playerId,
      resourceDefinitionId,
    );
  }

  public reserveGatherCost(request: {
    readonly operationId: string;
    readonly playerId: PlayerId;
    readonly resourceDefinitionId: string;
  }): GatherCostReservationResult {
    return this.requireTarget().reserveGatherCost(request);
  }

  public commitReservedGatherCost(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    this.requireTarget().commitReservedGatherCost(reservation);
  }

  public releaseGatherCostReservation(
    reservation: Readonly<GatherCostReservation>,
  ): void {
    this.requireTarget().releaseGatherCostReservation(reservation);
  }

  private requireTarget(): GatherCostPort {
    if (this.target === null) {
      throw new Error('Gather-cost authority was used before binding.');
    }
    return this.target;
  }
}

class RuntimePositionPort {
  private readonly initialPositions = new Map<PlayerId, WorldPosition>();
  private readonly runtimes = new Map<PlayerId, AuthorityRuntime>();

  public seed(playerId: PlayerId, position: WorldPosition): void {
    this.initialPositions.set(
      playerId,
      createWorldPosition(position.x, position.y),
    );
  }

  public bind(playerId: PlayerId, runtime: AuthorityRuntime): void {
    if (this.runtimes.has(playerId)) {
      throw new Error('Player runtime is already bound.');
    }
    this.runtimes.set(playerId, runtime);
  }

  public get(playerId: PlayerId): WorldPosition {
    const runtime = this.runtimes.get(playerId);
    if (runtime !== undefined) {
      return runtime.getSnapshot().player.position;
    }
    const initial = this.initialPositions.get(playerId);
    if (initial === undefined) {
      throw new Error('Unknown Phase 1 player position: ' + playerId);
    }
    return initial;
  }

  public set(playerId: PlayerId, position: WorldPosition): void {
    const runtime = this.runtimes.get(playerId);
    if (runtime !== undefined) {
      runtime.relocatePlayer(position);
      return;
    }
    this.seed(playerId, position);
  }

  public getRuntime(playerId: PlayerId): AuthorityRuntime | null {
    return this.runtimes.get(playerId) ?? null;
  }
}

function emptyInventory(playerId: PlayerId): ContainerState {
  return Object.freeze({
    containerId: 'inventory:' + playerId,
    kind: 'player-inventory',
    ownerPlayerId: playerId,
    revision: 0,
    stacks: Object.freeze([]),
  });
}

function initialLedger(
  playerIds: readonly PlayerId[],
  reopen: Phase1ReopenState | undefined,
): ItemLedgerSnapshot {
  const existing = new Map(
    (reopen?.itemLedger.containers ?? []).map((container) => [
      container.containerId,
      container,
    ]),
  );
  for (const playerId of playerIds) {
    const id = 'inventory:' + playerId;
    if (!existing.has(id)) {
      existing.set(id, emptyInventory(playerId));
    }
  }
  return Object.freeze({
    containers: Object.freeze(
      [...existing.values()]
        .sort((left, right) =>
          left.containerId.localeCompare(right.containerId),
        ),
    ),
  });
}

function survivalSnapshot(
  reopen: Phase1ReopenState | undefined,
): SurvivalAuthoritySnapshot | undefined {
  if (reopen === undefined) return undefined;
  return Object.freeze({
    players: Object.freeze(reopen.players.map((entry) => entry.survival)),
    appliedDamageIds: Object.freeze([]),
    lethalDamageEvents: Object.freeze([]),
  });
}

function progressionSnapshot(
  reopen: Phase1ReopenState | undefined,
): ProgressionAuthoritySnapshot | undefined {
  if (reopen === undefined) return undefined;
  return Object.freeze({
    players: Object.freeze(reopen.players.map((entry) => entry.progression)),
  });
}

function buildingSnapshot(
  reopen: Phase1ReopenState | undefined,
): BuildingWorldSnapshot | undefined {
  if (reopen === undefined || reopen.buildings.length === 0) {
    return undefined;
  }
  if (reopen.buildings.length !== 1) {
    throw new Error('Phase 1 vertical slice expects one canonical foothold.');
  }
  return reopen.buildings[0];
}

function initialWorldSnapshot(
  reopen: Phase1ReopenState | undefined,
): Phase1VerticalSliceWorldSnapshot | undefined {
  if (reopen === undefined) return undefined;

  const deathCaches = [];
  const drops = [];
  const predators = [];

  for (const chunk of reopen.bundle.chunks) {
    for (const entity of chunk.createdEntities) {
      if (entity.type === 'death-cache') {
        deathCaches.push(Object.freeze({
          entityId: entity.entityId,
          deathId: entity.deathId,
          ownerPlayerId: entity.ownerPlayerId,
          containerId: entity.containerId,
          position: createWorldPosition(
            entity.position.x,
            entity.position.y,
          ),
          revision: entity.revision,
        }));
      } else {
        drops.push(Object.freeze({
          worldDropId: entity.entityId,
          revision: entity.revision,
          containerId: entity.containerId,
          position: createWorldPosition(
            entity.position.x,
            entity.position.y,
          ),
          available: true,
        }));
      }
    }
    for (const predator of chunk.predatorStates) {
      if (predator.state === 'patrol') {
        throw new Error(
          'Save V2 predator patrol state has no accepted combat-runtime equivalent.',
        );
      }
      predators.push(Object.freeze({
        entityId: predator.entityId,
        revision: predator.revision,
        health: predator.health,
        state: predator.state,
        targetPlayerId: predator.targetPlayerId,
        stateUntilTick: predator.stateUntilTick,
        outsideLeashTicks: 0,
        position: createWorldPosition(
          predator.encounterAnchor.x,
          predator.encounterAnchor.y,
        ),
        encounterAnchor: createWorldPosition(
          predator.encounterAnchor.x,
          predator.encounterAnchor.y,
        ),
      }));
    }
  }

  return Object.freeze({
    deathCaches: Object.freeze({
      caches: Object.freeze(deathCaches),
    }),
    drops: Object.freeze(drops),
    predators: Object.freeze(predators),
  });
}

function corridorChunkCoords(worldSeed: string) {
  const landmarks = getPhase1WorldLandmarks(worldSeed);
  const points = [
    PHASE1_LANDING_POSITION,
    landmarks.predatorPosition,
    landmarks.ruinPosition,
  ];
  const coords = points.map(fromWorldPosition);
  const minX = Math.min(...coords.map((coord) => coord.x)) - 1;
  const maxX = Math.max(...coords.map((coord) => coord.x)) + 1;
  const minY = Math.min(...coords.map((coord) => coord.y)) - 1;
  const maxY = Math.max(...coords.map((coord) => coord.y)) + 1;
  const values = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      values.push(createChunkCoord(x, y));
    }
  }
  return Object.freeze(values);
}

export type Phase1RuinInspectResult =
  | {
      readonly status: 'committed';
      readonly operationId: string;
      readonly revision: number;
      readonly changed: boolean;
      readonly rewardItemId: string | null;
      readonly rewardQuantity: number;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: string;
      readonly reason:
        | 'SOURCE_MISSING'
        | 'OUT_OF_RANGE'
        | 'STALE_REVISION'
        | 'RUIN_NOT_LOCATED';
    };

export interface Phase1AuthorityBundleConfig {
  readonly worldId: string;
  readonly worldSeed: string;
  readonly playerIds: readonly PlayerId[];
  readonly interactionRangeWorldUnits: number;
  readonly spawnClearanceRadiusWorldUnits: number;
  readonly requiredAccessRadiusWorldUnits: number;
  readonly reopen?: Phase1ReopenState;
  readonly catalog?: ContentCatalogV1;
  /**
   * Solo/browser compositions activate configured players immediately.
   * Hosted composition may disable this so only admitted session players
   * materialize runtime/survival/progression state.
   */
  readonly activatePlayersOnCreate?: boolean;
}

export class Phase1AuthorityBundle {
  public readonly catalog: ContentCatalogV1;
  public readonly worldPersistence: Phase1SessionWorldPersistence;
  public readonly worldStore: Phase1WorldStore;
  public readonly world: Phase1VerticalSliceWorldAdapter;
  public readonly buildings: Phase1BuildingWorld;
  public readonly items: Phase1ItemAuthority;
  public readonly equipment: Phase1EquipmentAuthority;
  public readonly survival: Phase1SurvivalAuthority;
  public readonly progression: Phase1ProgressionAuthority;
  public readonly buildingAuthority: Phase1BuildingAuthority;
  public readonly machines: Phase1CondenserAuthority;
  public readonly combat: Phase1CombatAuthority;
  public readonly death: Phase1DeathAuthority;

  private readonly runtimes = new Map<PlayerId, AuthorityRuntime>();
  private readonly registeredSurvival = new Set<PlayerId>();
  private readonly lastGatherResults = new Map<PlayerId, GatherTickResult>();
  private readonly lastConsumeResults = new Map<PlayerId, ConsumeTickResult>();
  private readonly lastDeathResults =
    new Map<PlayerId, DeathTransitionResult>();
  private readonly lastRespawnResults =
    new Map<PlayerId, RespawnResult>();

  private constructor(
    public readonly config: Phase1AuthorityBundleConfig,
    private readonly positions: RuntimePositionPort,
    private readonly authorityTickRef: { value: number },
    catalog: ContentCatalogV1,
    worldPersistence: Phase1SessionWorldPersistence,
    worldStore: Phase1WorldStore,
    world: Phase1VerticalSliceWorldAdapter,
    buildings: Phase1BuildingWorld,
    items: Phase1ItemAuthority,
    equipment: Phase1EquipmentAuthority,
    survival: Phase1SurvivalAuthority,
    progression: Phase1ProgressionAuthority,
    buildingAuthority: Phase1BuildingAuthority,
    machines: Phase1CondenserAuthority,
    combat: Phase1CombatAuthority,
    death: Phase1DeathAuthority,
  ) {
    this.catalog = catalog;
    this.worldPersistence = worldPersistence;
    this.worldStore = worldStore;
    this.world = world;
    this.buildings = buildings;
    this.items = items;
    this.equipment = equipment;
    this.survival = survival;
    this.progression = progression;
    this.buildingAuthority = buildingAuthority;
    this.machines = machines;
    this.combat = combat;
    this.death = death;

    for (const player of config.reopen?.players ?? []) {
      this.registeredSurvival.add(player.record.playerId);
    }
  }

  public static async create(
    config: Phase1AuthorityBundleConfig,
  ): Promise<Phase1AuthorityBundle> {
    if (config.worldId.length === 0 || config.worldSeed.length === 0) {
      throw new Error('Phase 1 vertical-slice world identity is required.');
    }
    if (config.playerIds.length === 0 || config.playerIds.length > 4) {
      throw new Error('Phase 1 vertical slice supports 1-4 configured players.');
    }
    const playerIds = [...new Set(config.playerIds)];
    if (
      playerIds.length !== config.playerIds.length
      || playerIds.some((id) => id.length === 0)
    ) {
      throw new Error('Phase 1 vertical-slice player identities are invalid.');
    }

    const catalog = config.catalog ?? createPhase1ContentCatalog();
    const reopen = config.reopen;
    if (
      reopen !== undefined
      && (
        reopen.bundle.world.worldId !== config.worldId
        || reopen.bundle.world.worldSeed !== config.worldSeed
      )
    ) {
      throw new Error('Reopen state does not match requested world identity.');
    }

    const worldPersistence = new Phase1SessionWorldPersistence({
      environment: reopen?.environment ?? null,
      chunks: reopen?.chunks.map((entry) => entry.worldSlice) ?? [],
    });
    const worldStore = new Phase1WorldStore({
      worldSeed: config.worldSeed,
      catalog,
      persistence: worldPersistence,
    });
    await worldStore.initialize();

    const positions = new RuntimePositionPort();
    for (const playerId of playerIds) {
      const reopened = reopen?.players.find(
        (entry) => entry.record.playerId === playerId,
      );
      positions.seed(
        playerId,
        reopened === undefined
          ? PHASE1_LANDING_POSITION
          : createWorldPosition(
              reopened.record.position.x,
              reopened.record.position.y,
            ),
      );
    }

    const authorityTickRef = {
      value: reopen?.bundle.world.authorityTick ?? 0,
    };
    let buildings: Phase1BuildingWorld | null = null;
    const reopenedWorld = initialWorldSnapshot(reopen);
    const world = new Phase1VerticalSliceWorldAdapter({
      catalog,
      store: worldStore,
      playerPositions: positions,
      authorityTick: () => authorityTickRef.value,
      interactionRangeWorldUnits: config.interactionRangeWorldUnits,
      spawnClearanceRadiusWorldUnits: config.spawnClearanceRadiusWorldUnits,
      requiredAccessRadiusWorldUnits: config.requiredAccessRadiusWorldUnits,
      structures: () =>
        buildings?.exportSnapshot().foothold.structures ?? Object.freeze([]),
      playerIds: () => Object.freeze([...playerIds]),
      playerInsideStructure: (playerId, structureId) => {
        const structure = buildings?.getStructure(structureId) ?? null;
        return structure !== null
          && structure.definitionId === 'structure:habitat-room'
          && (buildings?.isSheltered(positions.get(playerId)) ?? false);
      },
      ...(reopenedWorld === undefined
        ? {}
        : { initialSnapshot: reopenedWorld }),
    });

    for (const coord of corridorChunkCoords(config.worldSeed)) {
      await world.activateCoord(coord);
    }

    buildings = new Phase1BuildingWorld(
      world,
      buildingSnapshot(reopen),
    );
    const itemWorld = new BuildingItemWorldAdapter(world, buildings);
    const reopenedProgression = progressionSnapshot(reopen);
    const progression = new Phase1ProgressionAuthority({
      catalog,
      ...(reopenedProgression === undefined
        ? {}
        : { snapshot: reopenedProgression }),
    });
    const gatherCost = new DeferredGatherCostPort();
    const items = new Phase1ItemAuthority({
      catalog,
      world: itemWorld,
      initialLedger: initialLedger(playerIds, reopen),
      gatherCost,
      events: new ProgressionItemEventSink(progression),
    });
    const equipment = new Phase1EquipmentAuthority(
      items,
      Object.freeze(
        (reopen?.players ?? []).map((entry) => Object.freeze({
          playerId: entry.record.playerId,
          equippedWeaponStackId:
            entry.record.equipment.equippedWeaponStackId,
          equippedThermalWrapStackId:
            entry.record.equipment.equippedThermalWrapStackId,
        })),
      ),
    );
    const reopenedSurvival = survivalSnapshot(reopen);
    const survival = new Phase1SurvivalAuthority({
      catalog,
      items,
      ...(reopenedSurvival === undefined
        ? {}
        : { snapshot: reopenedSurvival }),
    });
    gatherCost.bind(new SurvivalGatherCostPort(catalog, survival));

    const buildingAuthority =
      new Phase1BuildingAuthority(catalog, items, buildings);
    const machines = new Phase1CondenserAuthority(items, buildings);
    const combat = new Phase1CombatAuthority(
      catalog,
      survival,
      items,
      world,
    );
    const death = new Phase1DeathAuthority(
      survival,
      items,
      world,
      progression,
    );

    const bundle = new Phase1AuthorityBundle(
      config,
      positions,
      authorityTickRef,
      catalog,
      worldPersistence,
      worldStore,
      world,
      buildings,
      items,
      equipment,
      survival,
      progression,
      buildingAuthority,
      machines,
      combat,
      death,
    );

    if (config.activatePlayersOnCreate !== false) {
      for (const playerId of playerIds) {
        bundle.createPlayerRuntime(playerId);
      }
    }

    return bundle;
  }

  public get authorityTick(): number {
    return this.authorityTickRef.value;
  }

  public getActivePlayerIds(): readonly PlayerId[] {
    return Object.freeze(
      [...this.registeredSurvival].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  }

  public createPlayerRuntime(playerId: PlayerId): AuthorityRuntime {
    const existing = this.runtimes.get(playerId);
    if (existing !== undefined) return existing;
    if (!this.config.playerIds.includes(playerId)) {
      throw new Error('Player is outside configured Phase 1 session capacity.');
    }

    const reopened = this.config.reopen?.players.find(
      (entry) => entry.record.playerId === playerId,
    );
    const runtime = createSimulationRuntime({
      worldQuery: this.world,
      initialPlayerPosition: this.positions.get(playerId),
      ...(reopened?.record.facing === undefined
        ? {}
        : { initialPlayerFacing: reopened.record.facing }),
    });
    this.positions.bind(playerId, runtime);
    this.runtimes.set(playerId, runtime);

    this.equipment.registerPlayer(playerId);
    this.combat.setEquippedWeapon(
      playerId,
      this.equipment.getView(playerId).equippedWeaponStackId,
    );

    if (!this.registeredSurvival.has(playerId)) {
      this.survival.registerPlayer(playerId);
      this.registeredSurvival.add(playerId);
    }
    // Progression is intentionally lazy internally, but an admitted gameplay
    // player needs a canonical zero-state record for coherent Save V2 output.
    this.progression.getPlayerView(playerId);
    return runtime;
  }

  public submitInput(playerId: PlayerId, input: PlayerInput): void {
    this.createPlayerRuntime(playerId).submitInput(playerId, input);
  }

  public placeStructure(
    command: Parameters<Phase1BuildingAuthority['place']>[0],
  ): ReturnType<Phase1BuildingAuthority['place']> {
    const result = this.buildingAuthority.place(command);
    if (result.status === 'committed') {
      this.progression.applyEvent(Object.freeze({
        type: 'structure-placed',
        eventId: 'structure-placed:' + result.operationId,
        playerId: command.actorPlayerId,
        structureId: command.structureDefinitionId,
      }));
    }
    return result;
  }

  public executeItemCommand(
    command: Parameters<Phase1ItemAuthority['execute']>[0],
  ): ReturnType<Phase1ItemAuthority['execute']> {
    const machineOutput = command.type === 'transfer'
      ? (() => {
          const condenser = this.buildings
            .exportSnapshot()
            .foothold.condensers.find(
              (entry) =>
                entry.outputContainerId === command.sourceContainerId,
            );
          if (condenser === undefined) return null;
          const source = this.items.getContainerView(
            command.sourceContainerId,
          );
          const stack = source.stacks.find(
            (entry) => entry.stackId === command.sourceStackId,
          );
          if (stack === undefined) return null;
          return Object.freeze({
            itemId: stack.itemDefinitionId,
            quantity: command.quantity,
          });
        })()
      : null;

    const result = this.items.execute(command);
    if (result.status === 'committed' && machineOutput !== null) {
      this.progression.applyEvent(Object.freeze({
        type: 'machine-output-collected',
        eventId: 'machine-output-collected:' + result.operationId,
        playerId: command.playerId,
        machineId: 'machine:atmospheric-water-condenser',
        itemId: machineOutput.itemId,
        quantity: machineOutput.quantity,
      }));
    }
    return result;
  }

  public setCondenserEnabled(
    command: Parameters<Phase1CondenserAuthority['setEnabled']>[0],
  ): ReturnType<Phase1CondenserAuthority['setEnabled']> {
    const result = this.machines.setEnabled(command);
    if (result.status === 'committed') {
      this.progression.applyEvent(Object.freeze({
        type: 'powered-machine-interacted',
        eventId: 'powered-machine-interacted:' + result.operationId,
        playerId: command.actorPlayerId,
        machineId: 'machine:atmospheric-water-condenser',
        powered: this.buildings.isCondenserPowered(command.structureId),
      }));
    }
    return result;
  }

  public async stepSolo(): Promise<void> {
    const nextAuthorityTick = this.authorityTickRef.value + 1;
    await this.prepareAuthorityTick(nextAuthorityTick);

    for (const playerId of this.getActivePlayerIds()) {
      const runtime = this.createPlayerRuntime(playerId);
      const localTick = Number(runtime.getSnapshot().tick) + 1;
      runtime.step(createSimulationStep(toSimulationTick(localTick)));
    }

    await this.completeAuthorityTick(nextAuthorityTick);
  }

  public async prepareAuthorityTick(authorityTick: number): Promise<void> {
    if (
      !Number.isSafeInteger(authorityTick)
      || authorityTick !== this.authorityTickRef.value + 1
    ) {
      throw new Error(
        'Phase 1 authority tick preparation must advance exactly one.',
      );
    }

    // Resolve any canonical lethal event published at the completed prior
    // tick before advancing survival state past that DeathId source tick.
    this.processPendingDeaths(this.authorityTickRef.value);

    await this.worldStore.advanceEnvironment(authorityTick);
    this.authorityTickRef.value = authorityTick;
  }

  public async completeAuthorityTick(authorityTick: number): Promise<void> {
    if (authorityTick !== this.authorityTickRef.value) {
      throw new Error(
        'Phase 1 authority tick completion must match the prepared tick.',
      );
    }

    for (const playerId of this.getActivePlayerIds()) {
      const inventory = this.items.getContainerView('inventory:' + playerId);
      const exposure = this.world.getEnvironmentExposure(playerId);
      const equipment = this.equipment.reconcile(playerId);
      this.combat.setEquippedWeapon(
        playerId,
        equipment.equippedWeaponStackId,
      );
      const thermalWrapActive =
        this.equipment.isThermalWrapActive(playerId);
      this.survival.stepPlayer(playerId, authorityTick, {
        thermalTarget: exposure.thermalTarget,
        thermalWrapActive,
        carryState: inventory.playerWeightState ?? 'NORMAL',
      });
      this.lastGatherResults.set(
        playerId,
        this.items.tickGather(playerId),
      );
      this.lastConsumeResults.set(
        playerId,
        this.survival.tickConsume(playerId),
      );
      const ruinEntity = this.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      await this.worldStore.revealResolvedPlayerPosition(
        this.positions.get(playerId),
      );
      if (
        ruinEntity !== null
        && this.isWithinRuinLocateRange(
          this.positions.get(playerId),
          ruinEntity.position,
        )
      ) {
        this.progression.applyEvent(Object.freeze({
          type: 'ruin-located',
          eventId: 'ruin-located:' + playerId + ':' + ruinEntity.entityId,
          playerId,
          ruinId: 'ruin:previous-civilization-ruin',
        }));
      }
    }

    this.processPendingDeaths(authorityTick);

    for (const structure of this.buildings.exportSnapshot().foothold.structures) {
      if (structure.definitionId === 'structure:atmospheric-water-condenser') {
        this.machines.tick(structure.structureId);
      }
    }

    const predator = this.world.findGeneratedEntityByDefinition(
      'hostile:territorial-predator',
    );
    if (predator !== null) {
      this.combat.tickPredator(
        predator.entityId,
        this.getActivePlayerIds(),
      );
    }

    this.processPendingDeaths(authorityTick);
    this.processPendingRespawns(authorityTick);
  }

  public getLastGatherResult(
    playerId: PlayerId,
  ): Readonly<GatherTickResult> | null {
    return this.lastGatherResults.get(playerId) ?? null;
  }

  public getLastConsumeResult(
    playerId: PlayerId,
  ): Readonly<ConsumeTickResult> | null {
    return this.lastConsumeResults.get(playerId) ?? null;
  }

  public getLastDeathResult(
    playerId: PlayerId,
  ): Readonly<DeathTransitionResult> | null {
    return this.lastDeathResults.get(playerId) ?? null;
  }

  public getLastRespawnResult(
    playerId: PlayerId,
  ): Readonly<RespawnResult> | null {
    return this.lastRespawnResults.get(playerId) ?? null;
  }

  public equipWeapon(
    playerId: PlayerId,
    stackId: string | null,
  ) {
    const result = this.equipment.equipWeapon(playerId, stackId);
    if (result.status === 'committed') {
      this.combat.setEquippedWeapon(
        playerId,
        result.view.equippedWeaponStackId,
      );
    }
    return result;
  }

  public equipThermalWrap(
    playerId: PlayerId,
    stackId: string | null,
  ) {
    return this.equipment.equipThermalWrap(playerId, stackId);
  }

  public inspectRuin(request: {
    readonly operationId: string;
    readonly playerId: PlayerId;
    readonly ruinEntityId: string;
    readonly expectedRevision: number;
  }): Phase1RuinInspectResult {
    const entity = this.world.getActiveGeneratedEntities().find(
      (candidate) =>
        candidate.entityId === request.ruinEntityId
        && candidate.type === 'ruin',
    );
    if (entity === undefined) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    if (
      !this.world.isGeneratedEntityInInteractionRange(
        request.playerId,
        request.ruinEntityId,
      )
    ) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'OUT_OF_RANGE',
      });
    }

    const current = this.worldStore.getRuinState(request.ruinEntityId);
    if (current === undefined) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
    }
    if (current.revision !== request.expectedRevision) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'STALE_REVISION',
      });
    }
    if (current.discoveryState === 'unknown') {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'RUIN_NOT_LOCATED',
      });
    }

    const result = this.worldStore.investigateRuin(
      request.ruinEntityId,
      request.expectedRevision,
    );
    this.progression.applyEvent(Object.freeze({
      type: 'ruin-inspected',
      eventId: 'ruin-inspected:' + request.playerId + ':'
        + request.ruinEntityId,
      playerId: request.playerId,
      ruinId: 'ruin:previous-civilization-ruin',
    }));

    return Object.freeze({
      status: 'committed',
      operationId: request.operationId,
      revision: result.state.revision,
      changed: result.changed,
      rewardItemId: result.rewardItemId,
      rewardQuantity: result.rewardQuantity,
    });
  }

  private processPendingDeaths(authorityTick: number): void {
    for (const playerId of this.getActivePlayerIds()) {
      const state = this.survival.getPlayerState(playerId);
      if (
        state.lifeState.type !== 'alive'
        || state.healthMilli !== 0
      ) {
        continue;
      }

      const lethal = this.survival.getCanonicalLethalDamage(
        playerId,
        authorityTick,
      );
      if (lethal === null) continue;

      const inventory = this.items.getContainerView(
        'inventory:' + playerId,
      );
      const deathId =
        'death:' + playerId + ':' + lethal.damageId;
      const result = this.death.processDeath({
        deathId,
        playerId,
        deathPosition: this.positions.get(playerId),
        deathTick: authorityTick,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
        equippedStackIds:
          this.equipment.equippedStackIds(playerId),
      });
      this.lastDeathResults.set(playerId, result);

      if (
        result.status === 'committed'
        || result.status === 'duplicate'
      ) {
        this.equipment.clear(playerId);
        this.combat.setEquippedWeapon(playerId, null);
      }
    }
  }

  private processPendingRespawns(authorityTick: number): void {
    for (const playerId of this.getActivePlayerIds()) {
      const state = this.survival.getPlayerState(playerId);
      if (state.lifeState.type !== 'dead-pending-respawn') continue;
      const result = this.death.processRespawn(
        playerId,
        authorityTick,
      );
      this.lastRespawnResults.set(playerId, result);
    }
  }

  private isWithinRuinLocateRange(
    player: WorldPosition,
    ruin: WorldPosition,
  ): boolean {
    const dx = player.x - ruin.x;
    const dy = player.y - ruin.y;
    return dx * dx + dy * dy
      <= PHASE1_RUIN_LOCATE_RADIUS_WORLD_UNITS ** 2;
  }

  public getRuntime(playerId: PlayerId): AuthorityRuntime {
    return this.createPlayerRuntime(playerId);
  }

  public getPlayerPosition(playerId: PlayerId): WorldPosition {
    return this.positions.get(playerId);
  }

  public getContentCompatibility() {
    return this.catalog.compatibility;
  }

  public getWorldCompatibility() {
    return Object.freeze({
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    });
  }

  public async destroy(): Promise<void> {
    await this.world.releaseAll();
  }
}
