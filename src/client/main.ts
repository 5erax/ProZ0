import type { PlayerId } from '../foundation';
import { NEUTRAL_PLAYER_INPUT } from '../simulation';
import { KeyboardInputAdapter } from './input/KeyboardInputAdapter';
import { createPixiPresentationAdapter } from './presentation';
import { FixedStepHost } from './runtime/FixedStepHost';
import { LocalAuthorityHost } from './runtime/LocalAuthorityHost';

const LOCAL_PLAYER_ID = 'local-player' satisfies PlayerId;

export interface RuntimeHandle {
  destroy(): void;
}

export async function bootProZ0(root: HTMLElement): Promise<RuntimeHandle> {
  root.dataset.runtimeStatus = 'booting';

  const authority = new LocalAuthorityHost();
  const input = new KeyboardInputAdapter(() => NEUTRAL_PLAYER_INPUT);
  const presentation = await createPixiPresentationAdapter(root);

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
