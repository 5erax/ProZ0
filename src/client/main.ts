import {
  type PlayerId,
} from '../foundation';
import {
  createPhase0MovementDemoWorld,
  PHASE0_MOVEMENT_DEMO_SOLIDS,
} from '../world';
import { KeyboardInputAdapter } from './input/KeyboardInputAdapter';
import {
  isMovementInputCode,
  mapMovementInput,
} from './input/MovementInputMapper';
import {
  createPhase1HudOverlay,
  createPixiPresentationAdapter,
  createViewportPresentationGuard,
  type Phase1HudOverlay,
} from './presentation';
import { resolvePhase1PresentationQaFixture } from './qa/Phase1PresentationFixture';
import { resolveVisualQaFixture } from './qa/VisualQaFixture';
import { FixedStepHost } from './runtime/FixedStepHost';
import { LocalAuthorityHost } from './runtime/LocalAuthorityHost';
import {
  mountPhase1Presentation,
} from './runtime/Phase1PresentationMount';
import type { Phase1PresentationSource } from './runtime/Phase1PresentationBinding';
import {
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
} from '../integration/Phase1AuthorityBundle';
import {
  bootPersistedPhase1ProductReview,
  type PersistedPhase1ProductReviewConfig,
} from './runtime/Phase1ProductReviewPersistence';
import {
  createPhase1ProductReviewRuntime,
  type Phase1ProductReviewRuntimeConfig,
} from './runtime/Phase1ProductReviewRuntime';

const LOCAL_PLAYER_ID = 'local-player' satisfies PlayerId;

export interface RuntimeHandle {
  destroy(): void;
}

export type BootProZ0Options =
  | {
      readonly mode: 'local-demo';
    }
  | {
      readonly mode: 'phase1-presentation';
      readonly phase1PresentationSource: Phase1PresentationSource;
      readonly presentationCanvas: HTMLCanvasElement;
    }
  | {
      readonly mode: 'phase1-product-review';
      readonly config: Phase1ProductReviewRuntimeConfig;
    };

async function bootLocalDemo(
  root: HTMLElement,
): Promise<RuntimeHandle> {
  const visualQaFixture = resolveVisualQaFixture(window.location.search);
  const phase1QaFixture = resolvePhase1PresentationQaFixture(
    window.location.search,
  );
  root.dataset.runtimeMode = 'local-demo';
  root.dataset.visualQaMode = visualQaFixture.mode;
  root.dataset.phase1QaMode = phase1QaFixture?.mode ?? 'none';

  const authority = new LocalAuthorityHost({
    worldQuery: createPhase0MovementDemoWorld(),
    initialPlayerPosition: visualQaFixture.initialPlayerPosition,
  });
  const input = new KeyboardInputAdapter(
    mapMovementInput,
    isMovementInputCode,
  );
  const presentation = await createPixiPresentationAdapter(root, {
    solids: PHASE0_MOVEMENT_DEMO_SOLIDS,
    ...visualQaFixture.presentation,
  });
  const viewportGuard = createViewportPresentationGuard(
    root,
    presentation.canvas,
  );
  let phase1Hud: Phase1HudOverlay | null = null;
  if (phase1QaFixture !== null) {
    phase1Hud = createPhase1HudOverlay(
      root,
      presentation.canvas,
      phase1QaFixture.state,
    );
  }

  authority.start();
  input.start();

  const fixedStepHost = new FixedStepHost({
    onStep: (step) => {
      authority.submitInput(LOCAL_PLAYER_ID, input.sample());
      authority.step(step);
    },
    onRender: (alpha) => {
      presentation.render(authority.getSnapshot(), alpha);
    },
  });

  const onVisibilityChange = (): void => {
    input.reset();

    if (!document.hidden) {
      fixedStepHost.resetTiming();
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  fixedStepHost.start();
  root.dataset.runtimeStatus = 'ready';

  return {
    destroy(): void {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      fixedStepHost.stop();
      input.stop();
      authority.stop();
      phase1Hud?.destroy();
      viewportGuard.destroy();
      presentation.destroy();
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  };
}

function bootExternalPhase1Presentation(
  root: HTMLElement,
  options: Extract<
    BootProZ0Options,
    { readonly mode: 'phase1-presentation' }
  >,
): RuntimeHandle {
  root.dataset.runtimeMode = 'phase1-presentation';
  root.dataset.visualQaMode = 'none';
  root.dataset.phase1QaMode = 'none';

  const mount = mountPhase1Presentation(
    root,
    options.presentationCanvas,
    options.phase1PresentationSource,
  );

  root.dataset.runtimeStatus = 'ready';
  return {
    destroy(): void {
      mount.destroy();
      root.dataset.runtimeStatus = 'stopped';
    },
  };
}

function autoBootText(
  root: HTMLElement,
  key: keyof DOMStringMap,
  query: URLSearchParams,
  queryKey: string,
): string | undefined {
  const datasetValue = root.dataset[key]?.trim();
  if (datasetValue !== undefined && datasetValue.length > 0) {
    return datasetValue;
  }
  const queryValue = query.get(queryKey)?.trim();
  return queryValue === undefined || queryValue.length === 0
    ? undefined
    : queryValue;
}

function requiredAutoBootText(
  root: HTMLElement,
  key: keyof DOMStringMap,
  attributeName: string,
  query: URLSearchParams,
  queryKey: string,
): string {
  const value = autoBootText(root, key, query, queryKey);
  if (value === undefined) {
    throw new Error(
      'Product Review autoboot requires ' + attributeName
      + ' or ?' + queryKey + '=...',
    );
  }
  return value;
}


export function resolveProductReviewAutoBootConfig(
  root: HTMLElement,
  search = '',
): PersistedPhase1ProductReviewConfig {
  const query = new URLSearchParams(search);
  const playerIds = requiredAutoBootText(
    root,
    'proz0PlayerIds',
    'data-proz0-player-ids',
    query,
    'proz0Players',
  )
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (playerIds.length === 0) {
    throw new Error(
      'Product Review autoboot requires at least one player identity.',
    );
  }

  const databaseName = autoBootText(
    root,
    'proz0SaveDatabase',
    query,
    'proz0SaveDb',
  );

  return Object.freeze({
    worldId: requiredAutoBootText(
      root,
      'proz0WorldId',
      'data-proz0-world-id',
      query,
      'proz0WorldId',
    ),
    worldSeed: requiredAutoBootText(
      root,
      'proz0WorldSeed',
      'data-proz0-world-seed',
      query,
      'proz0WorldSeed',
    ),
    playerIds: Object.freeze(playerIds),
    localPlayerId: requiredAutoBootText(
      root,
      'proz0LocalPlayerId',
      'data-proz0-local-player-id',
      query,
      'proz0Player',
    ),
    interactionRangeWorldUnits:
      PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
    spawnClearanceRadiusWorldUnits:
      PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
    requiredAccessRadiusWorldUnits:
      PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
    ...(databaseName === undefined
      ? {}
      : { persistence: { databaseName } }),
  });
}

export async function bootAutoProZ0(
  root: HTMLElement,
  search = window.location.search,
): Promise<RuntimeHandle> {
  const query = new URLSearchParams(search);
  const mode =
    root.dataset.proz0Mode?.trim()
    || query.get('proz0Mode')?.trim()
    || 'local-demo';

  if (mode === 'local-demo') {
    return bootProZ0(root, { mode: 'local-demo' });
  }

  if (mode !== 'phase1-product-review') {
    throw new Error('Unsupported ProZ0 autoboot mode: ' + mode);
  }

  const persisted = await bootPersistedPhase1ProductReview(
    root,
    resolveProductReviewAutoBootConfig(root, search),
  );
  root.dataset.productReviewPersistence = 'indexeddb-save-v2';
  root.dataset.productReviewReopened = String(persisted.reopened);

  return Object.freeze({
    destroy(): void {
      persisted.destroy();
    },
  });
}

export async function bootProZ0(
  root: HTMLElement,
  options: BootProZ0Options,
): Promise<RuntimeHandle> {
  root.dataset.runtimeStatus = 'booting';

  if (options.mode === 'phase1-presentation') {
    return bootExternalPhase1Presentation(root, options);
  }

  if (options.mode === 'phase1-product-review') {
    return createPhase1ProductReviewRuntime(root, options.config);
  }

  return bootLocalDemo(root);
}

const autoBootRoot = document.querySelector<HTMLElement>('[data-proz0-autoboot]');

if (autoBootRoot !== null) {
  void bootAutoProZ0(autoBootRoot).catch(
    (error: unknown) => {
      autoBootRoot.dataset.runtimeStatus = 'failed';
      console.error('ProZ0 runtime failed to start.', error);
    },
  );
}
