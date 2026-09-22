import { afterEach, describe, expect, it } from 'vitest';
import { bootProZ0, type RuntimeHandle } from '../../src/client/main';

describe('Phase 0 browser runtime', () => {
  let handle: RuntimeHandle | null = null;
  let root: HTMLElement | null = null;

  afterEach(() => {
    handle?.destroy();
    root?.remove();
    handle = null;
    root = null;
  });

  it('boots Pixi presentation and exposes a ready runtime state', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root);

    expect(root.dataset.runtimeStatus).toBe('ready');
    expect(root.querySelector<HTMLCanvasElement>('#proz0-canvas')).not.toBeNull();
    expect(root.querySelector<HTMLCanvasElement>('#proz0-canvas')?.dataset.renderer).toBe(
      'pixi-webgl',
    );
  });
});
