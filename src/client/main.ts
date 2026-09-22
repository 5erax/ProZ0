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
import { createPixiPresentationAdapter } from './presentation';
import { resolveVisualQaFixture } from './qa/VisualQaFixture';
import { FixedStepHost } from './runtime/FixedStepHost';
import { LocalAuthorityHost } from './runtime/LocalAuthorityHost';

const LOCAL_PLAYER_ID = 'local-player' satisfies PlayerId;

export interface RuntimeHandle {
  destroy(): void;
}

export async function bootProZ0(root: HTMLElement): Promise<RuntimeHandle> {
  root.dataset.runtimeStatus = 'booting';

  const visualQaFixture = resolveVisualQaFixture(window.location.search);
  root.dataset.visualQaMode = visualQaFixture.mode;

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
      presentation.destroy();
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  };
}

const autoBootRoot = document.querySelector<HTMLElement>('[data-proz0-autoboot]');

if (autoBootRoot !== null) {
  void bootProZ0(autoBootRoot).catch((error: unknown) => {
    autoBootRoot.dataset.runtimeStatus = 'failed';
    console.error('ProZ0 runtime failed to start.', error);
  });
}
