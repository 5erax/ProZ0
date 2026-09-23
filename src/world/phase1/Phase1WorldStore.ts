import type {
  ContentCatalogV1,
  ContentCompatibilityIdentityV1,
  ContentId,
  ResourceNodeDefinitionV1,
} from '../../content';
import {
  SIMULATION_HZ,
  createWorldPosition,
  type WorldPosition,
} from '../../foundation';
import {
  activateMaterializedChunk,
  beginChunkSave,
  canFinalizeChunkEviction,
  commitChunkSave,
  createUnloadedChunkMeta,
  failChunkSave,
  markPersistentChunkMutation,
  transitionChunkLifecycle,
  type ChunkRuntimeMeta,
} from '../chunks/ChunkLifecycle';
import {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
  fromWorldPosition,
  sameChunkCoord,
  toChunkKey,
  type ChunkCoord,
} from '../chunks/ChunkCoord';
import {
  createEmptyExplorationFragment,
  revealExplorationCircle,
  validateExplorationFragment,
} from './ExplorationGrid';
import {
  advancePhase1Environment,
  createPhase1EnvironmentState,
  getPhase1EnvironmentView,
  validatePhase1EnvironmentState,
} from './Phase1Environment';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
} from './Phase1ChunkGenerator';
import type {
  PersistedPhase1WorldSliceChunkRecord,
  Phase1WorldPersistencePort,
  Phase1WorldSliceChunkSnapshot,
} from './Phase1WorldPersistencePort';
import type {
  Phase1EnvironmentState,
  Phase1EnvironmentView,
  Phase1GeneratedChunkBase,
  Phase1GeneratedResourceEntity,
  Phase1GeneratedRuinEntity,
  Phase1GeneratedWorldEntity,
  Phase1ResourceRuntimeState,
  Phase1RuinRuntimeState,
  Phase1WorldSliceChunkDelta,
} from './Phase1WorldTypes';

export const PHASE1_FOG_REVEAL_RADIUS_WORLD_UNITS = 6.25;
export const PHASE1_RUIN_LOCATE_RADIUS_WORLD_UNITS = 3.75;

export interface Phase1WorldStoreConfig {
  readonly worldSeed: string;
  readonly catalog: ContentCatalogV1;
  readonly persistence: Phase1WorldPersistencePort;
}

export interface Phase1WorldChunkView {
  readonly meta: ChunkRuntimeMeta;
  readonly base: Phase1GeneratedChunkBase;
  readonly delta: Phase1WorldSliceChunkDelta;
}

export interface Phase1ResourceGatherCommitResult {
  readonly changed: boolean;
  readonly state: Phase1ResourceRuntimeState;
}

export interface Phase1RuinInvestigationResult {
  readonly changed: boolean;
  readonly state: Phase1RuinRuntimeState;
  readonly rewardItemId: ContentId | null;
  readonly rewardQuantity: number;
}

interface Phase1WorldChunkEntry {
  meta: ChunkRuntimeMeta;
  interestCount: number;
  base: Phase1GeneratedChunkBase | null;
  delta: Phase1WorldSliceChunkDelta | null;
  materialization: Promise<void> | null;
  save: Promise<void> | null;
  failureReason: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compatibilityMatches(
  left: ContentCompatibilityIdentityV1,
  right: ContentCompatibilityIdentityV1,
): boolean {
  return (
    left.formatId === right.formatId
    && left.schemaVersion === right.schemaVersion
    && left.packId === right.packId
    && left.packVersion === right.packVersion
    && left.canonicalFingerprint === right.canonicalFingerprint
  );
}

function incrementRevision(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
  if (value === Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${label} exhausted Number.MAX_SAFE_INTEGER.`);
  }
  return value + 1;
}

function sortedById<T extends { readonly entityId?: string }>(
  values: readonly T[],
  getId: (value: T) => string,
): readonly T[] {
  return Object.freeze([...values].sort((left, right) => {
    const leftId = getId(left);
    const rightId = getId(right);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  }));
}

function resourceEntities(
  base: Phase1GeneratedChunkBase,
): readonly Phase1GeneratedResourceEntity[] {
  return base.entities.filter(
    (entity): entity is Phase1GeneratedResourceEntity =>
      entity.type === 'resource',
  );
}

function ruinEntities(
  base: Phase1GeneratedChunkBase,
): readonly Phase1GeneratedRuinEntity[] {
  return base.entities.filter(
    (entity): entity is Phase1GeneratedRuinEntity =>
      entity.type === 'ruin',
  );
}

function createInitialResourceState(
  entity: Phase1GeneratedResourceEntity,
  definition: ResourceNodeDefinitionV1,
): Phase1ResourceRuntimeState {
  return Object.freeze({
    resourceEntityId: entity.entityId,
    revision: 0,
    remainingGatherActions: definition.maxGatherActions,
    depleted: false,
    regenerationReadyTick: null,
  });
}

function createInitialDelta(
  base: Phase1GeneratedChunkBase,
  catalog: ContentCatalogV1,
): Phase1WorldSliceChunkDelta {
  const resourceStates = resourceEntities(base).map((entity) =>
    createInitialResourceState(
      entity,
      catalog.getAs(entity.definitionId, 'resource'),
    ),
  );
  const ruinStates = ruinEntities(base).map((entity) =>
    Object.freeze({
      ruinEntityId: entity.entityId,
      ruinDefinitionId: entity.definitionId,
      revision: 0,
      discoveryState: 'unknown' as const,
      physicalRewardState: 'unspawned' as const,
    }),
  );

  return Object.freeze({
    coord: base.coord,
    generationVersion: base.generationVersion,
    baseGenerationFingerprint: base.baseGenerationFingerprint,
    contentCompatibility: base.contentCompatibility,
    revision: 0,
    resourceStates: sortedById(
      resourceStates,
      (state) => state.resourceEntityId,
    ),
    ruinStates: sortedById(
      ruinStates,
      (state) => state.ruinEntityId,
    ),
    exploration: createEmptyExplorationFragment(base.coord),
  });
}

function requireNonNegativeRevision(
  value: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function validateResourceState(
  state: Phase1ResourceRuntimeState,
  entity: Phase1GeneratedResourceEntity,
  definition: ResourceNodeDefinitionV1,
): Phase1ResourceRuntimeState {
  if (state.resourceEntityId !== entity.entityId) {
    throw new Error('Resource runtime state identity does not match generated base.');
  }
  requireNonNegativeRevision(state.revision, 'Resource revision');

  if (definition.maxGatherActions === null) {
    if (
      state.remainingGatherActions !== null
      || state.depleted
      || state.regenerationReadyTick !== null
    ) {
      throw new Error('Unlimited resource runtime state is corrupt.');
    }
  } else {
    if (
      !Number.isInteger(state.remainingGatherActions)
      || state.remainingGatherActions === null
      || state.remainingGatherActions < 0
      || state.remainingGatherActions > definition.maxGatherActions
    ) {
      throw new Error('Finite resource remainingGatherActions is corrupt.');
    }

    if (state.depleted !== (state.remainingGatherActions === 0)) {
      throw new Error('Resource depleted flag disagrees with remaining actions.');
    }

    if (state.depleted) {
      if (
        definition.regenerationActiveSeconds === null
        || !Number.isSafeInteger(state.regenerationReadyTick)
        || state.regenerationReadyTick === null
        || state.regenerationReadyTick < 0
      ) {
        throw new Error('Depleted resource regenerationReadyTick is corrupt.');
      }
    } else if (state.regenerationReadyTick !== null) {
      throw new Error('Available resource must not retain a regenerationReadyTick.');
    }
  }

  return Object.freeze({ ...state });
}

function validateRuinState(
  state: Phase1RuinRuntimeState,
  entity: Phase1GeneratedRuinEntity,
): Phase1RuinRuntimeState {
  if (
    state.ruinEntityId !== entity.entityId
    || state.ruinDefinitionId !== entity.definitionId
  ) {
    throw new Error('Ruin runtime state identity does not match generated base.');
  }
  requireNonNegativeRevision(state.revision, 'Ruin revision');

  const validDiscovery = (
    state.discoveryState === 'unknown'
    || state.discoveryState === 'located'
    || state.discoveryState === 'investigated'
  );
  const validReward = (
    state.physicalRewardState === 'unspawned'
    || state.physicalRewardState === 'claimable'
    || state.physicalRewardState === 'claimed'
  );

  if (!validDiscovery || !validReward) {
    throw new Error('Ruin runtime state enum value is corrupt.');
  }

  if (
    state.discoveryState !== 'investigated'
    && state.physicalRewardState !== 'unspawned'
  ) {
    throw new Error('Uninvestigated ruin cannot have a physical reward state.');
  }

  if (
    state.discoveryState === 'investigated'
    && state.physicalRewardState === 'unspawned'
  ) {
    throw new Error('Investigated ruin must expose its one-time reward state.');
  }

  return Object.freeze({ ...state });
}

function validatePersistedDelta(
  record: PersistedPhase1WorldSliceChunkRecord,
  base: Phase1GeneratedChunkBase,
  catalog: ContentCatalogV1,
): Phase1WorldSliceChunkDelta {
  if (!sameChunkCoord(record.coord, base.coord)) {
    throw new Error('Persisted Phase 1 delta coordinate does not match generated base.');
  }
  if (record.generationVersion !== base.generationVersion) {
    throw new Error('Persisted Phase 1 delta generation version is incompatible.');
  }
  if (record.generated !== true) {
    throw new Error('Persisted Phase 1 delta is missing generated marker.');
  }
  if (record.baseGenerationFingerprint !== base.baseGenerationFingerprint) {
    throw new Error('Persisted Phase 1 delta base generation fingerprint mismatch.');
  }
  if (!compatibilityMatches(
    record.contentCompatibility,
    base.contentCompatibility,
  )) {
    throw new Error('Persisted Phase 1 delta content compatibility mismatch.');
  }
  requireNonNegativeRevision(record.revision, 'Chunk delta revision');

  const expectedResources = resourceEntities(base);
  const resourceById = new Map(
    expectedResources.map((entity) => [entity.entityId, entity]),
  );
  if (record.resourceStates.length !== expectedResources.length) {
    throw new Error('Persisted Phase 1 resource state set is incomplete or contains extras.');
  }
  const resourceIds = new Set<string>();
  const resources = record.resourceStates.map((state) => {
    if (resourceIds.has(state.resourceEntityId)) {
      throw new Error('Duplicate persisted resource runtime identity.');
    }
    resourceIds.add(state.resourceEntityId);

    const entity = resourceById.get(state.resourceEntityId);
    if (entity === undefined) {
      throw new Error('Persisted resource state references unknown generated entity.');
    }
    return validateResourceState(
      state,
      entity,
      catalog.getAs(entity.definitionId, 'resource'),
    );
  });

  const expectedRuins = ruinEntities(base);
  const ruinById = new Map(
    expectedRuins.map((entity) => [entity.entityId, entity]),
  );
  if (record.ruinStates.length !== expectedRuins.length) {
    throw new Error('Persisted Phase 1 ruin state set is incomplete or contains extras.');
  }
  const ruinIds = new Set<string>();
  const ruins = record.ruinStates.map((state) => {
    if (ruinIds.has(state.ruinEntityId)) {
      throw new Error('Duplicate persisted ruin runtime identity.');
    }
    ruinIds.add(state.ruinEntityId);

    const entity = ruinById.get(state.ruinEntityId);
    if (entity === undefined) {
      throw new Error('Persisted ruin state references unknown generated entity.');
    }
    return validateRuinState(state, entity);
  });

  return Object.freeze({
    coord: base.coord,
    generationVersion: base.generationVersion,
    baseGenerationFingerprint: base.baseGenerationFingerprint,
    contentCompatibility: base.contentCompatibility,
    revision: record.revision,
    resourceStates: sortedById(resources, (state) => state.resourceEntityId),
    ruinStates: sortedById(ruins, (state) => state.ruinEntityId),
    exploration: validateExplorationFragment(base.coord, record.exploration),
  });
}

function immutableSnapshot(
  delta: Phase1WorldSliceChunkDelta,
): Phase1WorldSliceChunkSnapshot {
  return Object.freeze({
    coord: delta.coord,
    generationVersion: delta.generationVersion,
    revision: delta.revision,
    generated: true,
    baseGenerationFingerprint: delta.baseGenerationFingerprint,
    contentCompatibility: delta.contentCompatibility,
    resourceStates: Object.freeze(delta.resourceStates.map((state) =>
      Object.freeze({ ...state }),
    )),
    ruinStates: Object.freeze(delta.ruinStates.map((state) =>
      Object.freeze({ ...state }),
    )),
    exploration: Object.freeze({
      regionId: delta.exploration.regionId,
      revision: delta.exploration.revision,
      words: Object.freeze([...delta.exploration.words]),
    }),
  });
}

function circleChunkCoords(
  position: WorldPosition,
  radius: number,
): readonly ChunkCoord[] {
  const minimum = fromWorldPosition(createWorldPosition(
    position.x - radius,
    position.y - radius,
  ));
  const maximum = fromWorldPosition(createWorldPosition(
    position.x + radius,
    position.y + radius,
  ));
  const coords: ChunkCoord[] = [];

  for (let y = minimum.y; y <= maximum.y; y += 1) {
    for (let x = minimum.x; x <= maximum.x; x += 1) {
      coords.push(createChunkCoord(x, y));
    }
  }

  return Object.freeze(coords);
}

export class Phase1WorldStore {
  private readonly entries = new Map<string, Phase1WorldChunkEntry>();
  private readonly entityChunk = new Map<string, string>();
  private readonly generator: Phase1ChunkGenerator;
  private environment: Phase1EnvironmentState | null = null;
  private environmentDirty = false;

  public constructor(
    private readonly config: Phase1WorldStoreConfig,
  ) {
    if (config.worldSeed.length === 0) {
      throw new RangeError('Phase1WorldStore worldSeed must not be empty.');
    }
    this.generator = new Phase1ChunkGenerator(config.catalog);
  }

  public async initialize(): Promise<void> {
    if (this.environment !== null) {
      return;
    }

    const persisted = await this.config.persistence.loadEnvironment();

    if (persisted === null) {
      this.environment = createPhase1EnvironmentState(
        this.config.worldSeed,
        this.config.catalog,
      );
      this.environmentDirty = true;
      return;
    }

    this.environment = validatePhase1EnvironmentState(
      persisted,
      this.config.catalog,
    );
    this.environmentDirty = false;
  }

  public getEnvironmentView(): Phase1EnvironmentView {
    return getPhase1EnvironmentView(
      this.requireEnvironment(),
      this.config.catalog,
    );
  }

  public async advanceEnvironment(targetTick: number): Promise<void> {
    const current = this.requireEnvironment();
    const next = advancePhase1Environment(
      current,
      targetTick,
      this.config.catalog,
    );

    if (next.activeTick === current.activeTick) {
      return;
    }

    this.environment = next;
    this.environmentDirty = true;

    for (const entry of this.entries.values()) {
      if (
        entry.meta.lifecycle !== 'ACTIVE'
        || entry.base === null
        || entry.delta === null
      ) {
        continue;
      }
      this.applyReadyRegeneration(entry, targetTick);
    }
  }

  public async flushEnvironment(): Promise<void> {
    const environment = this.requireEnvironment();

    if (!this.environmentDirty) {
      return;
    }

    await this.config.persistence.saveEnvironment(environment);
    if (this.environment === environment) {
      this.environmentDirty = false;
    }
  }

  public async requestActive(
    coord: ChunkCoord,
  ): Promise<Phase1WorldChunkView> {
    this.requireEnvironment();
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle === 'FAILED') {
      throw new Error(
        'Phase 1 chunk materialization previously failed; explicit retry is required.',
      );
    }

    entry.interestCount += 1;

    if (entry.meta.lifecycle === 'ACTIVE') {
      return this.requireView(entry);
    }

    if (entry.meta.lifecycle === 'EVICTING') {
      entry.meta = transitionChunkLifecycle(entry.meta, 'ACTIVE');
      return this.requireView(entry);
    }

    if (entry.meta.lifecycle === 'MATERIALIZING') {
      await this.requireMaterialization(entry);
      return this.requireView(entry);
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'MATERIALIZING');
    entry.materialization = this.materialize(entry);

    try {
      await entry.materialization;
      return this.requireView(entry);
    } catch (error) {
      entry.interestCount = 0;
      throw error;
    }
  }

  public async retryMaterialization(
    coord: ChunkCoord,
  ): Promise<Phase1WorldChunkView> {
    this.requireEnvironment();
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle !== 'FAILED') {
      throw new Error('Phase 1 materialization retry requires FAILED lifecycle.');
    }

    entry.interestCount = 1;
    entry.failureReason = null;
    entry.meta = transitionChunkLifecycle(entry.meta, 'MATERIALIZING');
    entry.materialization = this.materialize(entry);

    try {
      await entry.materialization;
      return this.requireView(entry);
    } catch (error) {
      entry.interestCount = 0;
      throw error;
    }
  }

  public discardFailed(coord: ChunkCoord): void {
    const entry = this.getOrCreateEntry(coord);

    if (entry.meta.lifecycle !== 'FAILED') {
      throw new Error('Only a FAILED Phase 1 chunk can be discarded.');
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'UNLOADED');
    entry.base = null;
    entry.delta = null;
    entry.failureReason = null;
    entry.interestCount = 0;
  }

  public query(
    coord: ChunkCoord,
  ): Phase1WorldChunkView | undefined {
    const entry = this.entries.get(
      toChunkKey(createChunkCoord(coord.x, coord.y)),
    );
    if (entry === undefined || entry.meta.lifecycle !== 'ACTIVE') {
      return undefined;
    }
    return this.requireView(entry);
  }

  public getMeta(
    coord: ChunkCoord,
  ): ChunkRuntimeMeta | undefined {
    return this.entries.get(
      toChunkKey(createChunkCoord(coord.x, coord.y)),
    )?.meta;
  }

  public getFailureReason(
    coord: ChunkCoord,
  ): string | null {
    return this.entries.get(
      toChunkKey(createChunkCoord(coord.x, coord.y)),
    )?.failureReason ?? null;
  }

  public async releaseInterest(coord: ChunkCoord): Promise<void> {
    const entry = this.requireEntry(coord);

    if (entry.interestCount <= 0) {
      throw new Error('Cannot release Phase 1 chunk interest below zero.');
    }

    entry.interestCount -= 1;
    if (entry.interestCount > 0) {
      return;
    }

    if (entry.meta.lifecycle !== 'ACTIVE') {
      throw new Error('Last Phase 1 chunk interest requires ACTIVE lifecycle.');
    }

    entry.meta = transitionChunkLifecycle(entry.meta, 'EVICTING');
    await this.finishEviction(entry);
  }

  public async retryEviction(coord: ChunkCoord): Promise<void> {
    const entry = this.requireEntry(coord);
    if (entry.meta.lifecycle !== 'ACTIVE' || entry.interestCount !== 0) {
      throw new Error('Phase 1 eviction retry requires ACTIVE with zero interests.');
    }
    entry.meta = transitionChunkLifecycle(entry.meta, 'EVICTING');
    await this.finishEviction(entry);
  }

  public async revealResolvedPlayerPosition(
    position: WorldPosition,
  ): Promise<number> {
    this.requireEnvironment();
    const coords = circleChunkCoords(
      position,
      PHASE1_FOG_REVEAL_RADIUS_WORLD_UNITS,
    );
    let changedCells = 0;

    for (const coord of coords) {
      const view = await this.requestActive(coord);
      try {
        const entry = this.requireEntry(coord);
        const reveal = revealExplorationCircle(
          coord,
          view.delta.exploration,
          position,
          PHASE1_FOG_REVEAL_RADIUS_WORLD_UNITS,
        );

        let changed = false;
        let delta = view.delta;

        if (reveal.changedCells > 0) {
          delta = Object.freeze({
            ...delta,
            exploration: reveal.fragment,
          });
          changed = true;
          changedCells += reveal.changedCells;
        }

        const updatedRuins = delta.ruinStates.map((state) => {
          if (state.discoveryState !== 'unknown') {
            return state;
          }
          const entity = view.base.entities.find(
            (candidate) =>
              candidate.type === 'ruin'
              && candidate.entityId === state.ruinEntityId,
          );
          if (entity === undefined) {
            throw new Error('Ruin state lost its generated entity during reveal.');
          }

          const dx = entity.position.x - position.x;
          const dy = entity.position.y - position.y;
          if (
            dx * dx + dy * dy
            > PHASE1_RUIN_LOCATE_RADIUS_WORLD_UNITS ** 2
          ) {
            return state;
          }

          changed = true;
          return Object.freeze({
            ...state,
            revision: incrementRevision(state.revision, 'Ruin revision'),
            discoveryState: 'located' as const,
          });
        });

        if (changed) {
          if (updatedRuins.some((value, index) =>
            value !== delta.ruinStates[index],
          )) {
            delta = Object.freeze({
              ...delta,
              ruinStates: sortedById(
                updatedRuins,
                (state) => state.ruinEntityId,
              ),
            });
          }
          this.publishDeltaMutation(entry, delta);
        }
      } finally {
        await this.releaseInterest(coord);
      }
    }

    return changedCells;
  }

  public getResourceState(
    resourceEntityId: string,
  ): Phase1ResourceRuntimeState | undefined {
    const entry = this.activeEntryForEntity(resourceEntityId);
    return entry?.delta?.resourceStates.find(
      (state) => state.resourceEntityId === resourceEntityId,
    );
  }

  public commitResourceGather(
    resourceEntityId: string,
    expectedRevision: number,
    authorityTick: number,
  ): Phase1ResourceGatherCommitResult {
    const environment = this.requireEnvironment();
    if (authorityTick !== environment.activeTick) {
      throw new Error('Resource gather tick must equal canonical environment activeTick.');
    }

    const entry = this.requireActiveEntryForEntity(resourceEntityId);
    const base = entry.base;
    const delta = entry.delta;
    if (base === null || delta === null) {
      throw new Error('Active resource chunk is missing base/delta state.');
    }

    const entity = base.entities.find(
      (candidate): candidate is Phase1GeneratedResourceEntity =>
        candidate.type === 'resource'
        && candidate.entityId === resourceEntityId,
    );
    if (entity === undefined) {
      throw new Error('Generated resource entity was not found.');
    }

    const definition = this.config.catalog.getAs(
      entity.definitionId,
      'resource',
    );
    const index = delta.resourceStates.findIndex(
      (state) => state.resourceEntityId === resourceEntityId,
    );
    if (index < 0) {
      throw new Error('Resource runtime state was not found.');
    }

    const current = delta.resourceStates[index];
    if (current.revision !== expectedRevision) {
      throw new Error('Resource runtime revision is stale.');
    }
    if (current.depleted) {
      throw new Error('Resource is depleted.');
    }

    if (definition.maxGatherActions === null) {
      return Object.freeze({ changed: false, state: current });
    }

    if (
      current.remainingGatherActions === null
      || current.remainingGatherActions <= 0
    ) {
      throw new Error('Finite resource remaining actions are corrupt.');
    }

    const remaining = current.remainingGatherActions - 1;
    const depleted = remaining === 0;
    const regenerationReadyTick = depleted
      ? authorityTick
        + this.requireRegenerationTicks(definition)
      : null;
    const next = Object.freeze({
      ...current,
      revision: incrementRevision(current.revision, 'Resource revision'),
      remainingGatherActions: remaining,
      depleted,
      regenerationReadyTick,
    });
    const states = [...delta.resourceStates];
    states[index] = next;

    this.publishDeltaMutation(entry, Object.freeze({
      ...delta,
      resourceStates: sortedById(
        states,
        (state) => state.resourceEntityId,
      ),
    }));

    return Object.freeze({ changed: true, state: next });
  }

  public getRuinState(
    ruinEntityId: string,
  ): Phase1RuinRuntimeState | undefined {
    const entry = this.activeEntryForEntity(ruinEntityId);
    return entry?.delta?.ruinStates.find(
      (state) => state.ruinEntityId === ruinEntityId,
    );
  }

  public investigateRuin(
    ruinEntityId: string,
    expectedRevision: number,
  ): Phase1RuinInvestigationResult {
    const entry = this.requireActiveEntryForEntity(ruinEntityId);
    const base = entry.base;
    const delta = entry.delta;
    if (base === null || delta === null) {
      throw new Error('Active ruin chunk is missing base/delta state.');
    }

    const entity = base.entities.find(
      (candidate): candidate is Phase1GeneratedRuinEntity =>
        candidate.type === 'ruin'
        && candidate.entityId === ruinEntityId,
    );
    if (entity === undefined) {
      throw new Error('Generated ruin entity was not found.');
    }

    const definition = this.config.catalog.getAs(
      entity.definitionId,
      'ruin',
    );
    const index = delta.ruinStates.findIndex(
      (state) => state.ruinEntityId === ruinEntityId,
    );
    if (index < 0) {
      throw new Error('Ruin runtime state was not found.');
    }

    const current = delta.ruinStates[index];
    if (current.revision !== expectedRevision) {
      throw new Error('Ruin runtime revision is stale.');
    }

    if (current.discoveryState === 'investigated') {
      return Object.freeze({
        changed: false,
        state: current,
        rewardItemId: null,
        rewardQuantity: 0,
      });
    }

    const next = Object.freeze({
      ...current,
      revision: incrementRevision(current.revision, 'Ruin revision'),
      discoveryState: 'investigated' as const,
      physicalRewardState: 'claimable' as const,
    });
    const states = [...delta.ruinStates];
    states[index] = next;
    this.publishDeltaMutation(entry, Object.freeze({
      ...delta,
      ruinStates: sortedById(states, (state) => state.ruinEntityId),
    }));

    return Object.freeze({
      changed: true,
      state: next,
      rewardItemId: definition.oneTimePhysicalReward.itemId,
      rewardQuantity: definition.oneTimePhysicalReward.quantity,
    });
  }

  public markRuinRewardClaimed(
    ruinEntityId: string,
    expectedRevision: number,
  ): Phase1RuinRuntimeState {
    const entry = this.requireActiveEntryForEntity(ruinEntityId);
    const delta = entry.delta;
    if (delta === null) {
      throw new Error('Active ruin chunk is missing delta state.');
    }

    const index = delta.ruinStates.findIndex(
      (state) => state.ruinEntityId === ruinEntityId,
    );
    if (index < 0) {
      throw new Error('Ruin runtime state was not found.');
    }
    const current = delta.ruinStates[index];

    if (current.revision !== expectedRevision) {
      throw new Error('Ruin runtime revision is stale.');
    }
    if (
      current.discoveryState !== 'investigated'
      || current.physicalRewardState !== 'claimable'
    ) {
      throw new Error('Ruin reward is not claimable.');
    }

    const next = Object.freeze({
      ...current,
      revision: incrementRevision(current.revision, 'Ruin revision'),
      physicalRewardState: 'claimed' as const,
    });
    const states = [...delta.ruinStates];
    states[index] = next;
    this.publishDeltaMutation(entry, Object.freeze({
      ...delta,
      ruinStates: sortedById(states, (state) => state.ruinEntityId),
    }));

    return next;
  }

  private requireEnvironment(): Phase1EnvironmentState {
    if (this.environment === null) {
      throw new Error('Phase1WorldStore.initialize() must complete before use.');
    }
    return this.environment;
  }

  private getOrCreateEntry(coord: ChunkCoord): Phase1WorldChunkEntry {
    const canonical = createChunkCoord(coord.x, coord.y);
    const key = toChunkKey(canonical);
    const existing = this.entries.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const entry: Phase1WorldChunkEntry = {
      meta: createUnloadedChunkMeta(canonical),
      interestCount: 0,
      base: null,
      delta: null,
      materialization: null,
      save: null,
      failureReason: null,
    };
    this.entries.set(key, entry);
    return entry;
  }

  private requireEntry(coord: ChunkCoord): Phase1WorldChunkEntry {
    const entry = this.entries.get(
      toChunkKey(createChunkCoord(coord.x, coord.y)),
    );
    if (entry === undefined) {
      throw new Error('Phase 1 chunk is not known to the world store.');
    }
    return entry;
  }

  private requireMaterialization(
    entry: Phase1WorldChunkEntry,
  ): Promise<void> {
    if (entry.materialization === null) {
      throw new Error('MATERIALIZING Phase 1 chunk has no materialization promise.');
    }
    return entry.materialization;
  }

  private async materialize(
    entry: Phase1WorldChunkEntry,
  ): Promise<void> {
    try {
      const record = await this.config.persistence.loadChunk(entry.meta.coord);
      const base = this.generator.generate({
        worldSeed: this.config.worldSeed,
        coord: entry.meta.coord,
        generationVersion: PHASE1_WORLD_GENERATION_VERSION,
      });
      const delta = record === null
        ? createInitialDelta(base, this.config.catalog)
        : validatePersistedDelta(record, base, this.config.catalog);

      entry.base = base;
      entry.delta = delta;
      entry.meta = activateMaterializedChunk(
        entry.meta,
        record?.revision ?? 0,
      );
      this.indexEntities(entry);

      if (record !== null) {
        this.applyReadyRegeneration(
          entry,
          this.requireEnvironment().activeTick,
        );
      }

      entry.failureReason = null;
    } catch (error) {
      this.unindexEntities(entry);
      entry.base = null;
      entry.delta = null;
      entry.failureReason = errorMessage(error);
      entry.meta = transitionChunkLifecycle(entry.meta, 'FAILED');
      throw error;
    } finally {
      entry.materialization = null;
    }
  }

  private applyReadyRegeneration(
    entry: Phase1WorldChunkEntry,
    authorityTick: number,
  ): void {
    if (
      entry.base === null
      || entry.delta === null
      || entry.meta.lifecycle !== 'ACTIVE'
    ) {
      return;
    }

    let changed = false;
    const states = entry.delta.resourceStates.map((state) => {
      if (
        !state.depleted
        || state.regenerationReadyTick === null
        || state.regenerationReadyTick > authorityTick
      ) {
        return state;
      }

      const entity = entry.base?.entities.find(
        (candidate): candidate is Phase1GeneratedResourceEntity =>
          candidate.type === 'resource'
          && candidate.entityId === state.resourceEntityId,
      );
      if (entity === undefined) {
        throw new Error('Regenerating resource lost its generated entity.');
      }
      const definition = this.config.catalog.getAs(
        entity.definitionId,
        'resource',
      );
      if (definition.maxGatherActions === null) {
        throw new Error('Unlimited resource cannot be in depleted regeneration state.');
      }

      changed = true;
      return Object.freeze({
        ...state,
        revision: incrementRevision(state.revision, 'Resource revision'),
        remainingGatherActions: definition.maxGatherActions,
        depleted: false,
        regenerationReadyTick: null,
      });
    });

    if (changed) {
      this.publishDeltaMutation(entry, Object.freeze({
        ...entry.delta,
        resourceStates: sortedById(states, (state) => state.resourceEntityId),
      }));
    }
  }

  private requireRegenerationTicks(
    definition: ResourceNodeDefinitionV1,
  ): number {
    if (
      definition.regenerationActiveSeconds === null
      || !Number.isFinite(definition.regenerationActiveSeconds)
      || definition.regenerationActiveSeconds <= 0
    ) {
      throw new Error('Finite resource is missing a valid regeneration duration.');
    }

    const ticks = definition.regenerationActiveSeconds * SIMULATION_HZ;
    if (!Number.isSafeInteger(ticks) || ticks <= 0) {
      throw new Error('Resource regeneration duration cannot be represented in ticks.');
    }
    return ticks;
  }

  private publishDeltaMutation(
    entry: Phase1WorldChunkEntry,
    deltaWithoutRevision: Phase1WorldSliceChunkDelta,
  ): void {
    entry.meta = markPersistentChunkMutation(entry.meta);
    entry.delta = Object.freeze({
      ...deltaWithoutRevision,
      revision: entry.meta.revision,
    });
  }

  private async finishEviction(
    entry: Phase1WorldChunkEntry,
  ): Promise<void> {
    if (entry.meta.persistence === 'DIRTY') {
      if (entry.delta === null) {
        throw new Error('DIRTY Phase 1 chunk has no delta.');
      }

      const saveStart = beginChunkSave(entry.meta);
      entry.meta = saveStart.meta;

      if (entry.delta.revision !== saveStart.snapshot.revision) {
        throw new Error('Phase 1 delta revision does not match lifecycle save revision.');
      }

      const snapshot = immutableSnapshot(entry.delta);
      entry.save = this.persist(entry, snapshot);
    }

    if (entry.meta.persistence === 'SAVING') {
      if (entry.save === null) {
        throw new Error('SAVING Phase 1 chunk has no save promise.');
      }
      await entry.save;
    }

    if (
      entry.interestCount === 0
      && entry.meta.lifecycle === 'EVICTING'
      && canFinalizeChunkEviction(entry.meta)
    ) {
      this.unindexEntities(entry);
      entry.meta = transitionChunkLifecycle(entry.meta, 'UNLOADED');
      entry.base = null;
      entry.delta = null;
      entry.failureReason = null;
    }
  }

  private async persist(
    entry: Phase1WorldChunkEntry,
    snapshot: Phase1WorldSliceChunkSnapshot,
  ): Promise<void> {
    try {
      await this.config.persistence.saveChunk(snapshot);
      entry.meta = commitChunkSave(entry.meta, snapshot.revision);
      entry.failureReason = null;
    } catch (error) {
      entry.meta = failChunkSave(entry.meta);
      entry.failureReason = errorMessage(error);

      if (entry.meta.lifecycle === 'EVICTING') {
        entry.meta = transitionChunkLifecycle(entry.meta, 'ACTIVE');
      }
      throw error;
    } finally {
      entry.save = null;
    }
  }

  private requireView(
    entry: Phase1WorldChunkEntry,
  ): Phase1WorldChunkView {
    if (
      entry.meta.lifecycle !== 'ACTIVE'
      || entry.base === null
      || entry.delta === null
    ) {
      throw new Error('Phase 1 chunk is not ACTIVE and queryable.');
    }

    return Object.freeze({
      meta: entry.meta,
      base: entry.base,
      delta: entry.delta,
    });
  }

  private indexEntities(entry: Phase1WorldChunkEntry): void {
    if (entry.base === null) return;
    const key = toChunkKey(entry.base.coord);

    for (const entity of entry.base.entities) {
      const existing = this.entityChunk.get(entity.entityId);
      if (existing !== undefined && existing !== key) {
        throw new Error('Generated world entity identity collision detected.');
      }
      this.entityChunk.set(entity.entityId, key);
    }
  }

  private unindexEntities(entry: Phase1WorldChunkEntry): void {
    if (entry.base === null) return;
    const key = toChunkKey(entry.base.coord);

    for (const entity of entry.base.entities) {
      if (this.entityChunk.get(entity.entityId) === key) {
        this.entityChunk.delete(entity.entityId);
      }
    }
  }

  private activeEntryForEntity(
    entityId: string,
  ): Phase1WorldChunkEntry | undefined {
    const key = this.entityChunk.get(entityId);
    if (key === undefined) return undefined;

    const entry = this.entries.get(key);
    if (entry?.meta.lifecycle !== 'ACTIVE') return undefined;
    return entry;
  }

  private requireActiveEntryForEntity(
    entityId: string,
  ): Phase1WorldChunkEntry {
    const entry = this.activeEntryForEntity(entityId);
    if (entry === undefined) {
      throw new Error('World entity is not in an ACTIVE Phase 1 chunk.');
    }
    return entry;
  }
}

export function createPhase1WorldStore(
  config: Phase1WorldStoreConfig,
): Phase1WorldStore {
  return new Phase1WorldStore(config);
}

export function generatedEntityAt(
  view: Phase1WorldChunkView,
  entityId: string,
): Phase1GeneratedWorldEntity | undefined {
  return view.base.entities.find((entity) => entity.entityId === entityId);
}
