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
  PHASE1_WORLD_GENERATION_VERSION,
} from '../world/phase1/Phase1ChunkGenerator';
import {
  fromWorldPosition,
  toChunkKey,
} from '../world';

export interface Phase1SaveV2ComposeOptions {
  readonly nowUtc: string;
}

function previousPlayerRevision(
  bundle: Phase1AuthorityBundle,
  playerId: string,
): number | null {
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

      return null;
    },
  });
}

export function composePhase1SaveV2(
  bundle: Phase1AuthorityBundle,
  options: Phase1SaveV2ComposeOptions,
): SaveCommitRequestV2 {
  if (options.nowUtc.length === 0) {
    throw new Error('Save checkpoint UTC timestamp is required.');
  }

  const previousWorldRevision =
    bundle.config.reopen?.bundle.world.worldRevision ?? null;
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
        previousPlayerRevision(bundle, playerId),
      ),
      authorityTick: bundle.authorityTick,
      position: movement.position,
      facing: movement.facing,
      inventoryContainerId: 'inventory:' + playerId,
      equippedWeaponStackId: equipment.equippedWeaponStackId,
      equippedThermalWrapStackId:
        equipment.equippedThermalWrapStackId,
      survival: bundle.survival.getPlayerState(playerId),
      progression: progressionState,
    }, bundle.catalog);
  });

  const containers = itemLedgerSnapshotToContainerRecordsV2(
    bundle.config.worldId,
    bundle.items.exportLedgerSnapshot(),
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
    worldSeed: bundle.config.worldSeed,
    generationVersion: PHASE1_WORLD_GENERATION_VERSION,
    rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
    seedDerivationVersion: SEED_DERIVATION_VERSION,
    contentCompatibility: bundle.catalog.compatibility,
    environment: environmentStateToManifestFieldsV2(environment),
    createdAtUtc:
      bundle.config.reopen?.bundle.world.createdAtUtc ?? options.nowUtc,
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

export async function savePhase1AuthorityBundle(
  bundle: Phase1AuthorityBundle,
  repository: SaveRepositoryV2,
  options: Phase1SaveV2ComposeOptions,
): Promise<SaveResultV2<WorldManifestV2>> {
  return repository.commit(composePhase1SaveV2(bundle, options));
}
