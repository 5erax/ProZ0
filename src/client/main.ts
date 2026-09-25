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
  void bootProZ0(autoBootRoot, { mode: 'local-demo' }).catch(
    (error: unknown) => {
      autoBootRoot.dataset.runtimeStatus = 'failed';
      console.error('ProZ0 runtime failed to start.', error);
    },
  );
}
