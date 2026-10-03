import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../foundation';
import type { Phase1AuthorityBundle } from './Phase1AuthorityBundle';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  buildingSnapshotToRecordsV2,
  environmentStateToManifestFieldsV2,
  itemLedgerSnapshotToContainerRecordsV2,
  playerStateToRecordV2,
  worldSliceChunkToRecordV2,
  type ContainerOwnerRefV2,
  type PersistentWorldEntitySaveV2,
  type PredatorSaveV2,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
  type SaveResultV2,
  type WorldManifestV2,
} from '../persistence';
import {
} from '../world/phase1/Phase1ChunkGenerator';
import {
  fromWorldPosition,
  toChunkKey,
} from '../world';

export interface Phase1SaveV2ComposeOptions {
  readonly nowUtc: string;
}

interface Phase1SaveV2RevisionState {
  readonly previousWorldRevision: number | null;
  readonly playerRevisions: ReadonlyMap<string, number | null>;
  readonly createdAtUtc: string | null;
}

function initialRevisionState(
  bundle: Phase1AuthorityBundle,
): Phase1SaveV2RevisionState {
  return Object.freeze({
    previousWorldRevision:
      bundle.config.reopen?.bundle.world.worldRevision ?? null,
    playerRevisions: new Map(
      (bundle.config.reopen?.players ?? []).map((entry) => [
        entry.record.playerId,
        entry.record.playerRevision,
      ]),
    ),
    createdAtUtc:
      bundle.config.reopen?.bundle.world.createdAtUtc ?? null,
  });
}

function previousPlayerRevision(
  bundle: Phase1AuthorityBundle,
  state: Phase1SaveV2RevisionState,
  playerId: string,
): number | null {
  if (state.playerRevisions.has(playerId)) {
    return state.playerRevisions.get(playerId) ?? null;
  }
  return bundle.config.reopen?.players.find(
    (entry) => entry.record.playerId === playerId,
  )?.record.playerRevision ?? null;
}

function nextRecordRevision(previous: number | null): number {
  if (previous === null) return 0;
  if (previous >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Save record revision exhausted safe integer range.');
  }
  return previous + 1;
}

function worldEntityRecords(
  bundle: Phase1AuthorityBundle,
): readonly PersistentWorldEntitySaveV2[] {
  const snapshot = bundle.world.exportSnapshot();
  return Object.freeze([
    ...snapshot.drops
      .filter((drop) => drop.available)
      .map((drop) => Object.freeze({
        type: 'ground-drop' as const,
        entityId: drop.worldDropId,
        revision: drop.revision,
        position: Object.freeze({ ...drop.position }),
        containerId: drop.containerId,
      })),
    ...snapshot.deathCaches.caches.map((cache) => Object.freeze({
      type: 'death-cache' as const,
      entityId: cache.entityId,
      revision: cache.revision,
      deathId: cache.deathId,
      ownerPlayerId: cache.ownerPlayerId,
      containerId: cache.containerId,
      position: Object.freeze({ ...cache.position }),
    })),
  ]);
}

function predatorRecords(
  bundle: Phase1AuthorityBundle,
): readonly PredatorSaveV2[] {
  return Object.freeze(
    bundle.world.exportSnapshot().predators.map((predator) =>
      Object.freeze({
        entityId: predator.entityId,
        position:Object.freeze({...predator.position}),
        outsideLeashTicks:predator.outsideLeashTicks,
        revision: predator.revision,
        health: predator.health,
        state: predator.state,
        targetPlayerId: predator.targetPlayerId,
        stateUntilTick: predator.stateUntilTick,
        encounterAnchor: Object.freeze({
          ...predator.encounterAnchor,
        }),
      }),
    ),
  );
}

function ledgerSnapshotForPersistence(
  bundle: Phase1AuthorityBundle,
) {
  const snapshot = bundle.items.exportLedgerSnapshot();
  const world = bundle.world.exportSnapshot();
  const activePlayerIds = new Set(bundle.getActivePlayerIds());
  const liveWorldContainerIds = new Set([
    ...(bundle.caves?.read().spaces.flatMap(s=>[...s.deathCaches.map(c=>c.containerId),...s.drops.map(d=>d.containerId)]) ?? []),
    ...world.deathCaches.caches.map((entry) => entry.containerId),
    ...world.drops
      .filter((entry) => entry.available)
      .map((entry) => entry.containerId),
  ]);

  return Object.freeze({
    containers: Object.freeze(
      snapshot.containers.filter((container) => {
        if (container.kind === 'player-inventory') {
          return container.ownerPlayerId !== null
            && activePlayerIds.has(container.ownerPlayerId);
        }
        if (
          container.kind !== 'death-cache'
          && container.kind !== 'world-drop'
        ) {
          return true;
        }
        if (liveWorldContainerIds.has(container.containerId)) {
          return true;
        }
        if (container.stacks.length === 0) {
          // Live authority intentionally retains an empty world-container
          // revision surface so stale/concurrent retries remain deterministic.
          // Once its world entity is gone, that empty retry tombstone has no
          // durable owner and must not be serialized into Save V2.
          return false;
        }
        throw new Error(
          'Non-empty world item container lost its canonical world owner: '
            + container.containerId,
        );
      }),
    ),
  });
}

function ownerResolver(
  bundle: Phase1AuthorityBundle,
): { resolveOwner(containerId: string): ContainerOwnerRefV2 | null } {
  const structures =
    bundle.buildings.exportSnapshot().foothold.structures;
  const world = bundle.world.exportSnapshot();

  return Object.freeze({
    resolveOwner(containerId: string): ContainerOwnerRefV2 | null {
      const structure = structures.find(
        (entry) => entry.containerId === containerId,
      );
      if (structure !== undefined) {
        return Object.freeze({
          type: 'structure' as const,
          structureId: structure.structureId,
        });
      }

      const cache = world.deathCaches.caches.find(
        (entry) => entry.containerId === containerId,
      );
      if (cache !== undefined) {
        return Object.freeze({
          type: 'world-entity' as const,
          entityId: cache.entityId,
        });
      }

      const drop = world.drops.find(
        (entry) =>
          entry.available && entry.containerId === containerId,
      );
      if (drop !== undefined) {
        return Object.freeze({
          type: 'world-entity' as const,
          entityId: drop.worldDropId,
        });
      }

      for (const space of bundle.caves?.read().spaces ?? []) {
        const cache = space.deathCaches.find(c=>c.containerId===containerId);
        if (cache) return Object.freeze({type:'world-entity' as const,entityId:cache.entityId});
        const drop = space.drops.find(d=>d.containerId===containerId);
        if (drop) return Object.freeze({type:'world-entity' as const,entityId:drop.worldDropId});
      }
      return null;
    },
  });
}

function composePhase1SaveV2AtRevision(
  bundle: Phase1AuthorityBundle,
  options: Phase1SaveV2ComposeOptions,
  revisionState: Phase1SaveV2RevisionState,
): SaveCommitRequestV2 {
  if (options.nowUtc.length === 0) {
    throw new Error('Save checkpoint UTC timestamp is required.');
  }

  bundle.caves?.synchronizePose();
  bundle.expedition?.reconcile();
  const previousWorldRevision = revisionState.previousWorldRevision;
  const worldRevision = nextRecordRevision(previousWorldRevision);
  const environment = bundle.worldStore.getEnvironmentView().state;
  if (
    environment.activeTick !== bundle.authorityTick
  ) {
    throw new Error(
      'Save checkpoint requires environment and authority tick coherence.',
    );
  }

  const progression = bundle.progression.exportSnapshot();
  const players = bundle.getActivePlayerIds().map((playerId) => {
    const runtime = bundle.getRuntime(playerId);
    const movement = runtime.getSnapshot().player;
    if (movement.facing === null) {
      throw new Error(
        'Save checkpoint requires a canonical non-null player facing.',
      );
    }
    const progressionState = progression.players.find(
      (entry) => entry.playerId === playerId,
    );
    if (progressionState === undefined) {
      throw new Error('Save checkpoint is missing player progression state.');
    }

    const equipment = bundle.equipment.reconcile(playerId);
    return playerStateToRecordV2({
      worldId: bundle.config.worldId,
      playerId,
      playerRevision: nextRecordRevision(
        previousPlayerRevision(bundle, revisionState, playerId),
      ),
      authorityTick: bundle.authorityTick,
      position: movement.position,
      facing: movement.facing,
      inventoryContainerId: 'inventory:' + playerId,
      equippedWeaponStackId: equipment.equippedWeaponStackId,
      equippedThermalWrapStackId:
        equipment.equippedThermalWrapStackId,
      wearables: equipment.wearables,
      survival: bundle.survival.getPlayerState(playerId),
      progression: progressionState,
    }, bundle.catalog);
  });

  const containers = itemLedgerSnapshotToContainerRecordsV2(
    bundle.config.worldId,
    ledgerSnapshotForPersistence(bundle),
    ownerResolver(bundle),
  );

  const building = buildingSnapshotToRecordsV2(
    bundle.config.worldId,
    bundle.buildings.exportSnapshot(),
  );

  const entities = worldEntityRecords(bundle);
  const predators = predatorRecords(bundle);
  const chunks = bundle.world.getActiveChunkViews().map((view) => {
    const key = toChunkKey(view.base.coord);
    const chunkEntities = entities.filter(
      (entry) => toChunkKey(fromWorldPosition(entry.position)) === key,
    );
    const chunkPredators = predators.filter(
      (entry) =>
        toChunkKey(fromWorldPosition(entry.encounterAnchor)) === key,
    );
    const chunkStructures = building.structures
      .filter((entry) =>
        toChunkKey(fromWorldPosition(entry.position)) === key,
      )
      .map((entry) => entry.structureId);

    return worldSliceChunkToRecordV2(
      bundle.config.worldId,
      Object.freeze({
        coord: view.base.coord,
        generationVersion: view.delta.generationVersion,
        revision: view.delta.revision,
        generated: true as const,
        baseGenerationFingerprint:
          view.delta.baseGenerationFingerprint,
        contentCompatibility: view.delta.contentCompatibility,
        resourceStates: view.delta.resourceStates,
        ruinStates: view.delta.ruinStates,
        exploration: view.delta.exploration,
      }),
      Object.freeze({
        predatorStates: chunkPredators,
        createdEntities: chunkEntities,
        structureIds: chunkStructures,
      }),
    );
  });

  const world: WorldManifestV2 = Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'world-manifest',
    worldId: bundle.config.worldId,
    worldRevision,
    authorityTick: bundle.authorityTick,
    sustenance: bundle.sustenance.read(),
    ...(bundle.resourceMarkers?{soloResourceMarkers:bundle.resourceMarkers.read()}:{}),
    ...(bundle.caves?{soloCaves:bundle.caves.read()}:{}),
    ...(bundle.livingWorld?{livingWorld:bundle.livingWorld.read()}:{}),
    ...(bundle.expedition?{singlePlayerExpedition:bundle.expedition.read()}:{}),
    ...(bundle.config.colonyDepthEnabled === true || bundle.config.reopen?.bundle.world.colonyDepth !== undefined
      ? { colonyDepth: bundle.colonyDepth.read() } : {}),
    worldSeed: bundle.config.worldSeed,
    generationVersion: bundle.getWorldCompatibility().worldGenerationVersion,
    rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
    seedDerivationVersion: SEED_DERIVATION_VERSION,
    contentCompatibility: bundle.catalog.compatibility,
    environment: environmentStateToManifestFieldsV2(environment),
    createdAtUtc: revisionState.createdAtUtc ?? options.nowUtc,
    lastActiveAtUtc: options.nowUtc,
  });

  return Object.freeze({
    world,
    players: Object.freeze(players),
    containers,
    chunks: Object.freeze(chunks),
    footholds: Object.freeze([building.foothold]),
    structures: building.structures,
    expectedPreviousWorldRevision: previousWorldRevision,
  });
}

export function composePhase1SaveV2(
  bundle: Phase1AuthorityBundle,
  options: Phase1SaveV2ComposeOptions,
): SaveCommitRequestV2 {
  return composePhase1SaveV2AtRevision(
    bundle,
    options,
    initialRevisionState(bundle),
  );
}

/**
 * Owns the durable Save V2 revision lifecycle for one active authority bundle.
 *
 * Save records remain snapshots only; this coordinator never repairs or
 * mutates live gameplay authority. It advances its revision cursor only after
 * the repository confirms a successful atomic commit and serializes concurrent
 * checkpoint requests so each commit observes the previous committed revision.
 */
export class Phase1SaveV2CheckpointCoordinator {
  private previousWorldRevision: number | null;
  private readonly playerRevisions = new Map<string, number | null>();
  private createdAtUtc: string | null;
  private commitQueue: Promise<void> = Promise.resolve();

  public constructor(private readonly bundle: Phase1AuthorityBundle) {
    const initial = initialRevisionState(bundle);
    this.previousWorldRevision = initial.previousWorldRevision;
    this.createdAtUtc = initial.createdAtUtc;
    for (const [playerId, revision] of initial.playerRevisions) {
      this.playerRevisions.set(playerId, revision);
    }
  }

  public checkpoint(
    repository: SaveRepositoryV2,
    options: Phase1SaveV2ComposeOptions,
  ): Promise<SaveResultV2<WorldManifestV2>> {
    const operation = this.commitQueue.then(async () => {
      const request = composePhase1SaveV2AtRevision(
        this.bundle,
        options,
        Object.freeze({
          previousWorldRevision: this.previousWorldRevision,
          playerRevisions: this.playerRevisions,
          createdAtUtc: this.createdAtUtc,
        }),
      );
      const result = await repository.commit(request);
      if (result.ok) {
        this.previousWorldRevision = result.value.worldRevision;
        this.createdAtUtc = result.value.createdAtUtc;
        for (const player of request.players) {
          this.playerRevisions.set(
            player.playerId,
            player.playerRevision,
          );
        }
      }
      return result;
    });

    this.commitQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}

export async function savePhase1AuthorityBundle(
  bundle: Phase1AuthorityBundle,
  repository: SaveRepositoryV2,
  options: Phase1SaveV2ComposeOptions,
): Promise<SaveResultV2<WorldManifestV2>> {
  return repository.commit(composePhase1SaveV2(bundle, options));
}
