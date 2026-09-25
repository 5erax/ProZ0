import type { ContentCatalogV1 } from '../../content';
import type { PlayerProgressionSnapshot } from '../../simulation/progression';
import type { ItemLedgerSnapshot } from '../../simulation/items';
import type { PlayerSurvivalState } from '../../simulation/survival';
import type { BuildingWorldSnapshot } from '../../world/building';
import {
  validatePhase1EnvironmentState,
} from '../../world/phase1/Phase1Environment';
import type {
  Phase1EnvironmentState,
} from '../../world/phase1/Phase1WorldTypes';
import type {
  PersistedPhase1WorldSliceChunkRecord,
} from '../../world/phase1/Phase1WorldPersistencePort';
import {
  saveFailure,
  saveSuccess,
  durabilityCheckpointForManifest,
  type DurabilityCheckpointV1,
  type SaveRepositoryV2,
  type SaveResult,
} from '../repository/SaveRepositoryV2';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';
import {
  validatePortableSaveBundleV2,
  type SaveV2CompatibilityPolicy,
} from '../validation/SaveValidatorV2';
import {
  containerRecordsV2ToItemLedgerSnapshot,
} from '../mappers/ItemLedgerPersistenceMapperV2';
import {
  playerRecordV2ToProgressionSnapshot,
  playerRecordV2ToSurvivalState,
} from '../mappers/PlayerPersistenceMapperV2';
import {
  recordsV2ToBuildingSnapshot,
} from '../mappers/StructurePersistenceMapperV2';
import {
  chunkRecordV2ToWorldSlice,
} from '../mappers/WorldDeltaPersistenceMapperV2';

export interface Phase1ReopenPlayerState {
  readonly record: PlayerRecordV2;
  readonly survival: PlayerSurvivalState;
  readonly progression: PlayerProgressionSnapshot;
}

export interface Phase1ReopenChunkState {
  readonly record: PortableSaveBundleV2['chunks'][number];
  readonly worldSlice: PersistedPhase1WorldSliceChunkRecord;
}

export interface Phase1ReopenState {
  readonly bundle: PortableSaveBundleV2;
  readonly durabilityCheckpoint: DurabilityCheckpointV1;
  readonly environment: Phase1EnvironmentState;
  readonly players: readonly Phase1ReopenPlayerState[];
  readonly itemLedger: ItemLedgerSnapshot;
  readonly chunks: readonly Phase1ReopenChunkState[];
  readonly buildings: readonly BuildingWorldSnapshot[];
}

function reconstructEnvironment(
  bundle: PortableSaveBundleV2,
  catalog: ContentCatalogV1,
): Phase1EnvironmentState {
  return validatePhase1EnvironmentState(Object.freeze({
    activeTick: bundle.world.environment.activeTick,
    cycleStartLocalMinute: bundle.world.environment.cycleStartLocalMinute,
    weatherEvents: Object.freeze(
      bundle.world.environment.weatherEvents.map((event) =>
        Object.freeze({ ...event }),
      ),
    ),
  }), catalog);
}

function reconstructBuildings(
  bundle: PortableSaveBundleV2,
  catalog: ContentCatalogV1,
): readonly BuildingWorldSnapshot[] {
  return Object.freeze(bundle.footholds.map((foothold) => {
    const structures = bundle.structures.filter(
      (structure) => structure.footholdId === foothold.footholdId,
    );
    return recordsV2ToBuildingSnapshot(
      foothold,
      structures,
      bundle.containers,
      catalog,
    );
  }));
}

export function reconstructPhase1ReopenState(
  input: unknown,
  compatibility: SaveV2CompatibilityPolicy,
): SaveResult<Phase1ReopenState> {
  const validated = validatePortableSaveBundleV2(
    input,
    compatibility,
  );
  if (!validated.ok) {
    return validated;
  }

  const bundle = validated.value;
  try {
    const players = Object.freeze(bundle.players.map((record) =>
      Object.freeze({
        record,
        survival: playerRecordV2ToSurvivalState(
          record,
          bundle.world.authorityTick,
        ),
        progression: playerRecordV2ToProgressionSnapshot(
          record,
          compatibility.catalog,
        ),
      }),
    ));

    const chunks = Object.freeze(bundle.chunks.map((record) =>
      Object.freeze({
        record,
        worldSlice: chunkRecordV2ToWorldSlice(record),
      }),
    ));

    return saveSuccess(Object.freeze({
      bundle,
      durabilityCheckpoint: durabilityCheckpointForManifest(
        bundle.world,
      ),
      environment: reconstructEnvironment(
        bundle,
        compatibility.catalog,
      ),
      players,
      itemLedger: containerRecordsV2ToItemLedgerSnapshot(
        bundle.containers,
      ),
      chunks,
      buildings: reconstructBuildings(
        bundle,
        compatibility.catalog,
      ),
    }));
  } catch (error) {
    return saveFailure(
      'CROSS_REFERENCE_FAILURE',
      `Failed to reconstruct canonical Phase 1 runtime state: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export async function loadPhase1ReopenState(
  repository: SaveRepositoryV2,
  worldId: string,
  compatibility: SaveV2CompatibilityPolicy,
): Promise<SaveResult<Phase1ReopenState>> {
  const loaded = await repository.loadWorld(worldId);
  if (!loaded.ok) {
    return loaded;
  }
  return reconstructPhase1ReopenState(
    loaded.value,
    compatibility,
  );
}
