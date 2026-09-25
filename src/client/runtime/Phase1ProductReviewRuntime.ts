import type { PlayerId } from '../../foundation';
import {
  Phase1AuthorityBundle,
  type Phase1AuthorityBundleConfig,
} from '../../integration/Phase1AuthorityBundle';
import type {
  GatherStartResult,
  GatherTickResult,
} from '../../simulation';
import {
  savePhase1AuthorityBundle,
} from '../../integration/Phase1SaveV2Composer';
import type {
  SaveRepositoryV2,
  SaveResult,
} from '../../persistence/repository/SaveRepositoryV2';
import type {
  WorldManifestV2,
} from '../../persistence/schema/v2/WorldManifestV2';
import { KeyboardInputAdapter } from '../input/KeyboardInputAdapter';
import {
  isMovementInputCode,
  mapMovementInput,
} from '../input/MovementInputMapper';
import {
  createPhase1ProductReviewWorldRenderer,
} from './Phase1ProductReviewWorldRenderer';
import {
  Phase1ProductReviewPresentationSource,
} from './Phase1ProductReviewPresentationSource';
import type {
  Phase1CraftPanelPresentation,
} from '../presentation/Phase1PresentationModel';
import {
  mountPhase1Presentation,
} from './Phase1PresentationMount';
import { FixedStepHost } from './FixedStepHost';

export interface Phase1ProductReviewRuntimeConfig
  extends Phase1AuthorityBundleConfig {
  readonly localPlayerId: PlayerId;
}

export interface Phase1ProductReviewRuntime {
  save(
    repository: SaveRepositoryV2,
    nowUtc: string,
  ): Promise<SaveResult<WorldManifestV2>>;
  getAuthorityTick(): number;
  destroy(): void;
}

interface GatherInteractionState {
  readonly operationId: string;
  readonly targetName: string;
  readonly requiredTicks: number;
}

const CRAFT_PAGE_SIZE = 6;

function squaredDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function validateProductReviewConfig(
  config: Phase1ProductReviewRuntimeConfig,
): void {
  if (!config.playerIds.includes(config.localPlayerId)) {
    throw new Error('Product Review local player must belong to session players.');
  }
  if (
    !Number.isFinite(config.interactionRangeWorldUnits)
    || config.interactionRangeWorldUnits <= 0
  ) {
    throw new Error(
      'Product Review requires an approved positive ordinary interaction range.',
    );
  }
  if (
    !Number.isFinite(config.spawnClearanceRadiusWorldUnits)
    || config.spawnClearanceRadiusWorldUnits < 0
    || !Number.isFinite(config.requiredAccessRadiusWorldUnits)
    || config.requiredAccessRadiusWorldUnits < 0
  ) {
    throw new Error(
      'Product Review requires approved non-negative placement-clearance tuning.',
    );
  }
}

export async function createPhase1ProductReviewRuntime(
  root: HTMLElement,
  config: Phase1ProductReviewRuntimeConfig,
): Promise<Phase1ProductReviewRuntime> {
  validateProductReviewConfig(config);

  root.dataset.runtimeMode = 'phase1-product-review';
  root.dataset.phase1QaMode = 'none';
  root.dataset.visualQaMode = 'none';
  root.dataset.runtimeStatus = 'booting';

  const bundle = await Phase1AuthorityBundle.create(config);
  const input = new KeyboardInputAdapter(
    mapMovementInput,
    isMovementInputCode,
  );
  const worldRenderer = createPhase1ProductReviewWorldRenderer(
    root,
    bundle,
    config.localPlayerId,
  );
  const source = new Phase1ProductReviewPresentationSource(
    bundle,
    config.localPlayerId,
  );
  const presentation = mountPhase1Presentation(
    root,
    worldRenderer.canvas,
    source,
  );

  let operationOrdinal = 0;
  let activeGather: GatherInteractionState | null = null;
  let actionPanel: 'craft' | null = null;
  let craftPage = 0;
  let destroyed = false;
  let stepQueue = Promise.resolve();

  const nextOperationId = (kind: string): string =>
    'product-review:' + kind + ':' + String(++operationOrdinal);

  const playerPosition = () =>
    bundle.getPlayerPosition(config.localPlayerId);

  const interactionRangeSquared =
    config.interactionRangeWorldUnits
    * config.interactionRangeWorldUnits;

  const distanceFromPlayerSquared = (
    x: number,
    y: number,
  ): number => {
    const player = playerPosition();
    return squaredDistance(player.x, player.y, x, y);
  };

  const resourceTarget = () => {
    return bundle.world.getActiveGeneratedEntities()
      .filter((entity) => entity.type === 'resource')
      .map((entity) => ({
        entity,
        distance: distanceFromPlayerSquared(
          entity.position.x,
          entity.position.y,
        ),
      }))
      .filter((candidate) =>
        candidate.distance <= interactionRangeSquared,
      )
      .sort((left, right) =>
        left.distance - right.distance
        || left.entity.entityId.localeCompare(right.entity.entityId),
      )[0]?.entity ?? null;
  };

  const deathCacheTarget = () => {
    return bundle.world.exportSnapshot().deathCaches.caches
      .map((cache) => ({
        cache,
        distance: distanceFromPlayerSquared(
          cache.position.x,
          cache.position.y,
        ),
      }))
      .filter((candidate) =>
        candidate.distance <= interactionRangeSquared,
      )
      .sort((left, right) =>
        left.distance - right.distance
        || left.cache.entityId.localeCompare(right.cache.entityId),
      )
      .find((candidate) =>
        bundle.items.getContainerView(
          candidate.cache.containerId,
        ).stacks.length > 0,
      )?.cache ?? null;
  };

  const ruinTarget = () => {
    const entity = bundle.world.findGeneratedEntityByDefinition(
      'ruin:previous-civilization-ruin',
    );
    if (
      entity === null
      || entity.type !== 'ruin'
      || !bundle.world.isGeneratedEntityInInteractionRange(
        config.localPlayerId,
        entity.entityId,
      )
    ) {
      return null;
    }
    const state = bundle.worldStore.getRuinState(entity.entityId);
    if (
      state === undefined
      || state.discoveryState !== 'located'
    ) {
      return null;
    }
    return Object.freeze({ entity, state });
  };

  const craftRecipes = () =>
    Object.freeze(
      [...bundle.catalog.list('recipe')].sort(
        (left, right) => left.id.localeCompare(right.id),
      ),
    );

  const accessibleWorkbench = () => {
    const workbench = bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .find(
        (structure) =>
          structure.definitionId === 'structure:workbench'
          && bundle.world.isWorkbenchAccessible(
            config.localPlayerId,
            structure.structureId,
          ),
      );
    return workbench ?? null;
  };

  const itemQuantity = (itemDefinitionId: string): number =>
    bundle.items
      .getContainerView('inventory:' + config.localPlayerId)
      .stacks
      .filter((stack) => stack.itemDefinitionId === itemDefinitionId)
      .reduce((sum, stack) => sum + stack.quantity, 0);

  const craftPanel = (): Phase1CraftPanelPresentation => {
    const recipes = craftRecipes();
    const pageCount = Math.max(
      1,
      Math.ceil(recipes.length / CRAFT_PAGE_SIZE),
    );
    craftPage = Math.min(Math.max(0, craftPage), pageCount - 1);
    const workbench = accessibleWorkbench();
    const page = recipes.slice(
      craftPage * CRAFT_PAGE_SIZE,
      (craftPage + 1) * CRAFT_PAGE_SIZE,
    );

    return Object.freeze({
      kind: 'craft',
      title:
        'CRAFT · PAGE '
        + String(craftPage + 1)
        + '/'
        + String(pageCount)
        + ' · [1-6] CRAFT · [ / ] PAGE',
      rows: Object.freeze(page.map((recipe, index) => {
        const missing = recipe.inputs.find(
          (input) => itemQuantity(input.itemId) < input.quantity,
        );
        const stationBlocked =
          recipe.requiredStationStructureId !== null
          && workbench === null;
        const reason = missing !== undefined
          ? 'NEED '
            + String(missing.quantity)
            + ' '
            + bundle.catalog.get(missing.itemId).displayName
          : stationBlocked
            ? 'WORKBENCH REQUIRED'
            : null;

        return Object.freeze({
          id: recipe.id,
          name: '[' + String(index + 1) + '] ' + recipe.displayName,
          outputLabel: recipe.outputs
            .map((output) =>
              String(output.quantity)
              + '× '
              + bundle.catalog.get(output.itemId).displayName,
            )
            .join(' + '),
          requirementLabel: recipe.inputs
            .map((input) =>
              String(input.quantity)
              + '× '
              + bundle.catalog.get(input.itemId).displayName,
            )
            .concat(
              recipe.requiredStationStructureId === null
                ? []
                : ['Workbench'],
            )
            .join(' + '),
          state: reason === null ? 'AVAILABLE' : 'BLOCKED',
          reason,
        });
      })),
    });
  };

  const refreshCraftPanel = (): void => {
    if (actionPanel !== 'craft') return;
    source.setPresentationPanel(craftPanel());
  };

  const toggleCraftPanel = (): void => {
    if (actionPanel === 'craft') {
      actionPanel = null;
      source.setPresentationPanel(null);
      return;
    }
    actionPanel = 'craft';
    craftPage = 0;
    source.clearCommandFeedback();
    source.setPresentationPanel(craftPanel());
  };

  const changeCraftPage = (delta: number): void => {
    if (actionPanel !== 'craft') return;
    const pageCount = Math.max(
      1,
      Math.ceil(craftRecipes().length / CRAFT_PAGE_SIZE),
    );
    craftPage =
      (craftPage + delta + pageCount) % pageCount;
    source.clearCommandFeedback();
    source.setPresentationPanel(craftPanel());
  };

  const craftRecipeAtSlot = (slot: number): void => {
    if (actionPanel !== 'craft') return;
    const recipe = craftRecipes()[
      craftPage * CRAFT_PAGE_SIZE + slot
    ];
    if (recipe === undefined) return;

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const workbench = accessibleWorkbench();
    const result = bundle.items.execute({
      type: 'craft',
      operationId: nextOperationId('craft'),
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      recipeId: recipe.id,
      ...(recipe.requiredStationStructureId === null
        || workbench === null
        ? {}
        : {
            workbench: {
              structureInstanceId: workbench.structureId,
              expectedRevision: workbench.revision,
            },
          }),
    });

    source.setPresentationPanel(craftPanel());
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'CRAFT',
      target: recipe.displayName,
      panelTargetId: recipe.id,
    });
  };

  const resolveGatherTool = (
    resourceDefinitionId: string,
  ): string | undefined => {
    const definition = bundle.catalog.getAs(
      resourceDefinitionId,
      'resource',
    );
    if (definition.requiredToolItemId === null) return undefined;
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    return inventory.stacks.find(
      (stack) =>
        stack.itemDefinitionId === definition.requiredToolItemId
        && (stack.condition === null || stack.condition > 0),
    )?.stackId;
  };

  const presentGatherStart = (
    start: Readonly<GatherStartResult>,
    targetName: string,
  ): void => {
    if (start.status === 'started') {
      activeGather = Object.freeze({
        operationId: start.operationId,
        targetName,
        requiredTicks: start.requiredTicks,
      });
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'GATHER',
        target: targetName,
        state: 'CHANNELING',
        reason: null,
        progress: 0,
      }));
      return;
    }

    if (start.status === 'resolved') {
      source.setLocalCommandFeedback({
        operationId: start.result.operationId,
        status: start.result.status,
        ...(start.result.status === 'rejected'
          ? { reason: start.result.reason }
          : {}),
        verb: 'GATHER',
        target: targetName,
      });
      return;
    }

    source.setLocalCommandFeedback({
      operationId: start.operationId,
      status: 'rejected',
      reason: start.reason,
      verb: 'GATHER',
      target: targetName,
    });
  };

  const beginGather = (): void => {
    if (activeGather !== null) {
      bundle.items.cancelGather(config.localPlayerId);
      activeGather = null;
      source.setInteraction(null);
      return;
    }

    const entity = resourceTarget();
    if (entity === null || entity.type !== 'resource') {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'INTERACT',
        target: 'WORLD',
        state: 'UNAVAILABLE',
        reason: 'NO TARGET IN RANGE',
        progress: null,
      }));
      return;
    }

    const resource = bundle.worldStore.getResourceState(
      entity.entityId,
    );
    if (resource === undefined) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'GATHER',
        target: entity.definitionId,
        state: 'BLOCKED',
        reason: 'SOURCE MISSING',
        progress: null,
      }));
      return;
    }

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const definition = bundle.catalog.getAs(
      entity.definitionId,
      'resource',
    );
    const operationId = nextOperationId('gather');
    const toolStackId = resolveGatherTool(entity.definitionId);
    const start = bundle.items.beginGather({
      operationId,
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      resourceEntityId: entity.entityId,
      expectedResourceRevision: resource.revision,
      ...(toolStackId === undefined ? {} : { toolStackId }),
    });
    presentGatherStart(start, definition.displayName);
  };

  const recoverDeathCache = (): boolean => {
    const cache = deathCacheTarget();
    if (cache === null) return false;

    const sourceContainer =
      bundle.items.getContainerView(cache.containerId);
    const stack = sourceContainer.stacks[0];
    if (stack === undefined) return false;
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const result = bundle.death.recoverFromDeathCache({
      type: 'transfer',
      operationId: nextOperationId('death-cache-recover'),
      playerId: config.localPlayerId,
      sourceContainerId: sourceContainer.containerId,
      sourceExpectedRevision: sourceContainer.revision,
      targetContainerId: inventory.containerId,
      targetExpectedRevision: inventory.revision,
      sourceStackId: stack.stackId,
      quantity: stack.quantity,
    });
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'RECOVER',
      target: 'Death Cache',
    });
    return true;
  };

  const inspectRuin = (): boolean => {
    const target = ruinTarget();
    if (target === null) return false;
    const result = bundle.inspectRuin({
      operationId: nextOperationId('ruin-inspect'),
      playerId: config.localPlayerId,
      ruinEntityId: target.entity.entityId,
      expectedRevision: target.state.revision,
    });
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'INSPECT',
      target: 'Previous-Civilization Ruin',
    });
    return true;
  };

  const refreshContextInteraction = (): void => {
    if (activeGather !== null) return;

    const cache = deathCacheTarget();
    if (cache !== null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'RECOVER',
        target: 'Death Cache',
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    const ruin = ruinTarget();
    if (ruin !== null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'INSPECT',
        target: 'Previous-Civilization Ruin',
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    const resource = resourceTarget();
    if (resource !== null && resource.type === 'resource') {
      const definition = bundle.catalog.getAs(
        resource.definitionId,
        'resource',
      );
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'GATHER',
        target: definition.displayName,
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    source.setInteraction(Object.freeze({
      inputLabel: 'E',
      verb: 'INTERACT',
      target: 'Move near an interactable',
      state: 'UNAVAILABLE',
      reason: null,
      progress: null,
    }));
  };

  const beginContextInteraction = (): void => {
    if (activeGather !== null) {
      bundle.items.cancelGather(config.localPlayerId);
      activeGather = null;
      refreshContextInteraction();
      return;
    }
    if (recoverDeathCache()) return;
    if (inspectRuin()) return;
    beginGather();
  };

  const updateGather = (
    result: Readonly<GatherTickResult> | null,
  ): void => {
    if (activeGather === null || result === null) return;

    switch (result.status) {
      case 'idle':
        return;
      case 'channeling':
        if (result.operationId !== activeGather.operationId) return;
        source.setInteraction(Object.freeze({
          inputLabel: 'E',
          verb: 'GATHER',
          target: activeGather.targetName,
          state: 'CHANNELING',
          reason: null,
          progress: result.requiredTicks <= 0
            ? 1
            : result.elapsedTicks / result.requiredTicks,
        }));
        return;
      case 'resolved': {
        const targetName = activeGather.targetName;
        activeGather = null;
        source.setLocalCommandFeedback({
          operationId: result.result.operationId,
          status: result.result.status,
          ...(result.result.status === 'rejected'
            ? { reason: result.result.reason }
            : {}),
          verb: 'GATHER',
          target: targetName,
        });
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    switch (event.code) {
      case 'KeyE':
        event.preventDefault();
        beginContextInteraction();
        break;
      case 'KeyC':
        event.preventDefault();
        toggleCraftPanel();
        break;
      case 'BracketLeft':
        event.preventDefault();
        changeCraftPage(-1);
        break;
      case 'BracketRight':
        event.preventDefault();
        changeCraftPage(1);
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        if (actionPanel === 'craft') {
          event.preventDefault();
          craftRecipeAtSlot(Number(event.code.slice(-1)) - 1);
        }
        break;
      case 'Escape':
        event.preventDefault();
        actionPanel = null;
        source.setPresentationPanel(null);
        source.setPanel(null);
        break;
      case 'KeyI':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('inventory');
        break;
      case 'KeyM':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('map');
        break;
      case 'KeyP':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('progression');
        break;
    }
  };

  const host = new FixedStepHost({
    onStep: () => {
      const sampled = input.sample();
      stepQueue = stepQueue.then(async () => {
        if (destroyed) return;
        bundle.submitInput(config.localPlayerId, sampled);
        await bundle.stepSolo();
        updateGather(
          bundle.getLastGatherResult(config.localPlayerId),
        );
        source.refresh();
        refreshCraftPanel();
        refreshContextInteraction();
        worldRenderer.render();
      }).catch((error: unknown) => {
        root.dataset.runtimeStatus = 'failed';
        console.error('Phase 1 Product Review authority step failed.', error);
      });
    },
    onRender: () => {
      // Canonical async authority ticks publish complete snapshots through
      // the queued step above; presentation never predicts authority state.
    },
  });

  input.start();
  root.ownerDocument.addEventListener('keydown', onKeyDown);
  host.start();
  root.dataset.runtimeStatus = 'ready';
  root.dataset.productReviewAuthority = 'canonical';

  refreshContextInteraction();

  return Object.freeze({
    async save(
      repository: SaveRepositoryV2,
      nowUtc: string,
    ): Promise<SaveResult<WorldManifestV2>> {
      await stepQueue;
      if (destroyed) {
        throw new Error(
          'Cannot save a destroyed Phase 1 Product Review runtime.',
        );
      }
      return savePhase1AuthorityBundle(
        bundle,
        repository,
        { nowUtc },
      );
    },
    getAuthorityTick(): number {
      return bundle.authorityTick;
    },
    destroy(): void {
      destroyed = true;
      host.stop();
      input.stop();
      root.ownerDocument.removeEventListener('keydown', onKeyDown);
      presentation.destroy();
      worldRenderer.destroy();
      void bundle.destroy();
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  });
}
