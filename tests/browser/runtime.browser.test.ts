import { afterEach, describe, expect, it } from 'vitest';
import { bootProZ0, type RuntimeHandle } from '../../src/client/main';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
    expect(root.querySelector<HTMLCanvasElement>('#proz0-canvas')?.dataset.playerFrame).toBe(
      '32x48',
    );
  });

  it('moves from held input and clears held state on focus loss', async () => {
    root = document.createElement('div');
    document.body.append(root);
    handle = await bootProZ0(root);

    const canvas = root.querySelector<HTMLCanvasElement>('#proz0-canvas');
    expect(canvas).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(100);

    const movedX = Number(canvas?.dataset.playerX);
    expect(movedX).toBeGreaterThan(0);

    window.dispatchEvent(new Event('blur'));
    await wait(60);
    const stoppedX = Number(canvas?.dataset.playerX);
    await wait(80);

    expect(Number(canvas?.dataset.playerX)).toBeCloseTo(stoppedX, 10);
  });

  it('owns arrow-key movement so the browser does not handle scrolling', async () => {
    root = document.createElement('div');
    document.body.append(root);
    handle = await bootProZ0(root);

    const keyDown = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      cancelable: true,
    });

    expect(window.dispatchEvent(keyDown)).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keyup', {
      code: 'ArrowRight',
      cancelable: true,
    }));
  });
});
