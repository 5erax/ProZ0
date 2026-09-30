import {
  createPhase1ContentCatalog,
  type ContentCatalogV1,
} from '../../content';
import {
  IndexedDbSaveRepositoryV2,
} from '../../persistence/browser/IndexedDbSaveRepositoryV2';
import {
  loadPhase1ReopenState,
  type Phase1ReopenState,
} from '../../persistence/integration/Phase1ReopenState';
import type {
  SaveResult,
} from '../../persistence/repository/SaveRepositoryV2';
import type {
  WorldManifestV2,
} from '../../persistence/schema/v2/WorldManifestV2';
import {
  createPhase1SaveV2Compatibility,
  type SaveV2CompatibilityPolicy,
} from '../../persistence/validation/SaveValidatorV2';
import {
  createChunkCoord,
} from '../../world/chunks/ChunkCoord';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
} from '../../world/phase1/Phase1ChunkGenerator';
import {
  createPhase1ProductReviewRuntime,
  type Phase1ProductReviewRuntime,
  type Phase1ProductReviewRuntimeConfig,
} from './Phase1ProductReviewRuntime';
import {
  createPhase1ProductReviewSaveControl,
  type Phase1ProductReviewSaveControl,
} from './Phase1ProductReviewSaveControl';
import { rememberSavedReview } from './Phase1SavedReview';

export interface Phase1ProductReviewPersistenceOptions {
  readonly databaseName?: string;
  readonly indexedDbFactory?: IDBFactory;
  readonly catalog?: ContentCatalogV1;
}

export interface Phase1ProductReviewPersistence {
  readonly catalog: ContentCatalogV1;
  readonly compatibility: SaveV2CompatibilityPolicy;
  readonly repository: IndexedDbSaveRepositoryV2;
  loadReopenState(worldId: string): Promise<Phase1ReopenState | null>;
  close(): void;
}

export interface PersistedPhase1ProductReviewConfig
  extends Omit<
    Phase1ProductReviewRuntimeConfig,
    'catalog' | 'reopen'
  > {
  readonly persistence?: Phase1ProductReviewPersistenceOptions;
}

export interface PersistedPhase1ProductReviewRuntime {
  readonly reopened: boolean;
  readonly runtime: Phase1ProductReviewRuntime;
  checkpoint(
    nowUtc: string,
  ): Promise<SaveResult<WorldManifestV2>>;
  destroy(): void;
}

export function createPhase1ProductReviewPersistence(
  options: Phase1ProductReviewPersistenceOptions = {},
): Phase1ProductReviewPersistence {
  const catalog = options.catalog ?? createPhase1ContentCatalog();
  const compatibility = createPhase1SaveV2Compatibility(
    catalog,
    Object.freeze([PHASE1_WORLD_GENERATION_VERSION]),
  );
  const generator = new Phase1ChunkGenerator(catalog);
  const repository = new IndexedDbSaveRepositoryV2({
    catalog,
    compatibility,
    migration: {
      catalog,
      resolveBaseGenerationFingerprint: ({
        worldSeed,
        generationVersion,
        coord,
      }) => {
        if (generationVersion !== PHASE1_WORLD_GENERATION_VERSION) {
          return null;
        }
        return generator.generate({
          worldSeed,
          generationVersion,
          coord: createChunkCoord(coord.x, coord.y),
        }).baseGenerationFingerprint;
      },
    },
    ...(options.databaseName === undefined
      ? {}
      : { databaseName: options.databaseName }),
    ...(options.indexedDbFactory === undefined
      ? {}
      : { indexedDbFactory: options.indexedDbFactory }),
  });

  return Object.freeze({
    catalog,
    compatibility,
    repository,
    async loadReopenState(
      worldId: string,
    ): Promise<Phase1ReopenState | null> {
      const result = await loadPhase1ReopenState(
        repository,
        worldId,
        compatibility,
      );
      if (result.ok) return result.value;
      if (result.code === 'NOT_FOUND') return null;
      throw new Error(
        'Phase 1 Product Review reopen failed closed: '
          + result.code + ': ' + result.message,
      );
    },
    close(): void {
      repository.close();
    },
  });
}

export async function bootPersistedPhase1ProductReview(
  root: HTMLElement,
  config: PersistedPhase1ProductReviewConfig,
): Promise<PersistedPhase1ProductReviewRuntime> {
  const persistence = createPhase1ProductReviewPersistence(
    config.persistence,
  );
  let runtime: Phase1ProductReviewRuntime | null = null;
  let saveControl: Phase1ProductReviewSaveControl | null = null;

  try {
    const reopen = await persistence.loadReopenState(config.worldId);
    runtime = await createPhase1ProductReviewRuntime(root, {
      worldId: config.worldId,
      worldSeed: config.worldSeed,
      playerIds: config.playerIds,
      localPlayerId: config.localPlayerId,
      ...(config.colonyDepthEnabled===undefined && reopen?.bundle.world.colonyDepth===undefined?{}:{colonyDepthEnabled:config.colonyDepthEnabled===true || reopen?.bundle.world.colonyDepth!==undefined}),
      interactionRangeWorldUnits: config.interactionRangeWorldUnits,
      spawnClearanceRadiusWorldUnits:
        config.spawnClearanceRadiusWorldUnits,
      requiredAccessRadiusWorldUnits:
        config.requiredAccessRadiusWorldUnits,
      catalog: persistence.catalog,
      ...(reopen === null ? {} : { reopen }),
      ...(config.activatePlayersOnCreate === undefined
        ? {}
        : {
            activatePlayersOnCreate:
              config.activatePlayersOnCreate,
          }),
    });

    const activeRuntime = runtime;
    const targetWindow = root.ownerDocument.defaultView ?? window;
    const rememberCheckpoint = (): void => {
      root.dataset.savedReviewBookmark = rememberSavedReview(
        targetWindow, config.worldId,
      ) ? 'available' : 'unavailable';
    };
    if (reopen !== null) rememberCheckpoint();
    const checkpoint = async (nowUtc: string): Promise<SaveResult<WorldManifestV2>> => {
      const result = await activeRuntime.save(persistence.repository, nowUtc);
      if (result.ok) rememberCheckpoint();
      return result;
    };
    const canvas =
      root.querySelector<HTMLCanvasElement>('#proz0-canvas');
    if (canvas === null) {
      throw new Error(
        'Persisted Product Review requires the canonical Product Review canvas.',
      );
    }
    saveControl = createPhase1ProductReviewSaveControl(
      root,
      canvas,
      () => checkpoint(new Date().toISOString()),
    );
    const activeSaveControl = saveControl;

    return Object.freeze({
      reopened: reopen !== null,
      runtime: activeRuntime,
      checkpoint(
        nowUtc: string,
      ): Promise<SaveResult<WorldManifestV2>> {
        return checkpoint(nowUtc);
      },
      destroy(): void {
        activeSaveControl.destroy();
        activeRuntime.destroy();
        persistence.close();
      },
    });
  } catch (error) {
    saveControl?.destroy();
    runtime?.destroy();
    persistence.close();
    throw error;
  }
}
