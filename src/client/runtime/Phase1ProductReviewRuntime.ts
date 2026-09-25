import type { PlayerId } from '../../foundation';
import {
  Phase1AuthorityBundle,
  type Phase1AuthorityBundleConfig,
} from '../../integration/Phase1AuthorityBundle';
import type {
  GatherStartResult,
  GatherTickResult,
} from '../../simulation';
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
import {
  mountPhase1Presentation,
} from './Phase1PresentationMount';
import { FixedStepHost } from './FixedStepHost';

export interface Phase1ProductReviewRuntimeConfig
  extends Phase1AuthorityBundleConfig {
  readonly localPlayerId: PlayerId;
}

export interface Phase1ProductReviewRuntime {
  destroy(): void;
}

interface GatherInteractionState {
  readonly operationId: string;
  readonly targetName: string;
  readonly requiredTicks: number;
}

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
  let destroyed = false;
  let stepQueue = Promise.resolve();

  const nextOperationId = (kind: string): string =>
    'product-review:' + kind + ':' + String(++operationOrdinal);

  const resourceTarget = () => {
    const player = bundle.getPlayerPosition(config.localPlayerId);
    const maxDistanceSquared =
      config.interactionRangeWorldUnits
      * config.interactionRangeWorldUnits;
    return bundle.world.getActiveGeneratedEntities()
      .filter((entity) => entity.type === 'resource')
      .map((entity) => ({
        entity,
        distance: squaredDistance(
          player.x,
          player.y,
          entity.position.x,
          entity.position.y,
        ),
      }))
      .filter((candidate) =>
        candidate.distance <= maxDistanceSquared,
      )
      .sort((left, right) =>
        left.distance - right.distance
        || left.entity.entityId.localeCompare(right.entity.entityId),
      )[0]?.entity ?? null;
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
        beginGather();
        break;
      case 'KeyI':
        event.preventDefault();
        source.togglePanel('inventory');
        break;
      case 'KeyM':
        event.preventDefault();
        source.togglePanel('map');
        break;
      case 'KeyP':
        event.preventDefault();
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

  source.setInteraction(Object.freeze({
    inputLabel: 'E',
    verb: 'INTERACT',
    target: 'Move near a resource',
    state: 'UNAVAILABLE',
    reason: null,
    progress: null,
  }));

  return Object.freeze({
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
