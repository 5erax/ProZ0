import { afterEach, describe, expect, it } from 'vitest';
import { bootProZ0, type RuntimeHandle } from '../../src/client/main';
import { resolvePhase1PresentationQaFixture } from '../../src/client/qa/Phase1PresentationFixture';
import type { Phase1PresentationSource } from '../../src/client/runtime/Phase1PresentationBinding';

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

    handle = await bootProZ0(root, { mode: 'local-demo' });

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
    handle = await bootProZ0(root, { mode: 'local-demo' });

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
    handle = await bootProZ0(root, { mode: 'local-demo' });

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

  it('mounts an external Phase 1 source without starting the local demo authority', async () => {
    root = document.createElement('div');
    document.body.append(root);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    canvas.dataset.displayScale = '1';
    canvas.dataset.playerX = 'canonical-external';
    root.append(canvas);

    const fixture = resolvePhase1PresentationQaFixture('?qaPhase1=overview');
    if (fixture === null) {
      throw new Error('Expected Phase 1 overview fixture.');
    }

    let current = fixture.state;
    const listeners = new Set<
      (state: typeof current) => void
    >();
    const source: Phase1PresentationSource = {
      read: () => current,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    handle = await bootProZ0(root, {
      mode: 'phase1-presentation',
      phase1PresentationSource: source,
      presentationCanvas: canvas,
    });

    expect(root.dataset.runtimeMode).toBe('phase1-presentation');
    expect(root.querySelectorAll('canvas')).toHaveLength(1);
    expect(canvas.dataset.renderer).toBeUndefined();
    expect(
      root.querySelector<HTMLElement>('#proz0-phase1-ui')
        ?.dataset.productionAssetFoundation,
    ).toBe('p1-75-78');
    expect(
      root.querySelector('[data-production-world-preview]'),
    ).toBeNull();
    expect(
      root.querySelector(
        '[data-asset-path="assets/phase1/ui/icons/hud_status_icons.png"]',
      ),
    ).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(80);
    expect(canvas.dataset.playerX).toBe('canonical-external');

    current = Object.freeze({
      ...fixture.state,
      water: Object.freeze({
        ...fixture.state.water,
        value: 18,
        stateLabel: 'DEHYDRATED',
        severity: 'critical',
      }),
    });
    for (const listener of listeners) {
      listener(current);
    }

    expect(
      root.querySelector<HTMLElement>('[data-region="survival"]')
        ?.textContent,
    ).toContain('DEHYDRATED');
  });

});
