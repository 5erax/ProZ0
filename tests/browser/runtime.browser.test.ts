import { afterEach, describe, expect, it } from 'vitest';
import { bootProZ0, type RuntimeHandle } from '../../src/client/main';
import { resolvePhase1PresentationQaFixture } from '../../src/client/qa/Phase1PresentationFixture';
import type { Phase1PresentationSource } from '../../src/client/runtime/Phase1PresentationBinding';
import {
  bootPersistedPhase1ProductReview,
} from '../../src/client/runtime/Phase1ProductReviewPersistence';
import {
  deleteIndexedDbSaveDatabase,
} from '../../src/persistence/browser/IndexedDbSaveRepository';

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


  it('boots canonical Phase 1 Product Review runtime without QA fixtures', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        // Test-only integration values. Production Product Review remains
        // fail-closed until gameplay/clearance tuning is owner-approved.
        interactionRangeWorldUnits: 2,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    const canvas = root.querySelector<HTMLCanvasElement>('#proz0-canvas');
    const ui = root.querySelector<HTMLElement>('#proz0-phase1-ui');
    expect(root.dataset.runtimeMode).toBe('phase1-product-review');
    expect(root.dataset.runtimeStatus).toBe('ready');
    expect(root.dataset.phase1QaMode).toBe('none');
    expect(root.dataset.productReviewAuthority).toBe('canonical');
    expect(canvas?.dataset.renderer).toBe('phase1-production-raster');
    expect(
      root.querySelector<HTMLElement>('[data-product-review-world="canonical"]')
        ?.dataset.productionAssetFoundation,
    ).toBe('p1-75-78');
    expect(
      root.querySelector(
        '[data-world-role="player"]'
        + '[data-asset-path="assets/phase1/actors/player_pioneer.png"]',
      ),
    ).not.toBeNull();
    expect(root.querySelector('[data-production-world-preview]')).toBeNull();
    expect(ui?.dataset.presentationAuthority).toBe('derived-read-only');

    const initialX = Number(canvas?.dataset.playerX);
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(180);
    window.dispatchEvent(new KeyboardEvent('keyup', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(40);
    expect(Number(canvas?.dataset.playerX)).toBeGreaterThan(initialX);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyI',
      cancelable: true,
    }));
    await wait(20);
    expect(
      root.querySelector('[data-panel-kind="inventory"]'),
    ).not.toBeNull();
  });

  it('checkpoints canonical Product Review state to IndexedDB and reopens it before publish', async () => {
    const databaseName = 'proz0-test-product-review-reopen';
    await deleteIndexedDbSaveDatabase(databaseName);

    root = document.createElement('div');
    document.body.append(root);

    const config = {
      worldId: 'world:browser-product-review-reopen',
      worldSeed: 'p1-world-golden',
      playerIds: ['browser-player'],
      localPlayerId: 'browser-player',
      // Integration-test values only; production still waits for owner-approved
      // ordinary interaction / placement-clearance tuning.
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: { databaseName },
    } as const;

    let first = await bootPersistedPhase1ProductReview(root, config);
    let second: Awaited<
      ReturnType<typeof bootPersistedPhase1ProductReview>
    > | null = null;

    try {
      expect(first.reopened).toBe(false);
      const firstCanvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      expect(firstCanvas).not.toBeNull();
      const initialX = Number(firstCanvas?.dataset.playerX);

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(180);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(50);

      const savedX = Number(firstCanvas?.dataset.playerX);
      expect(savedX).toBeGreaterThan(initialX);
      const savedTick = first.runtime.getAuthorityTick();
      const firstSave = await first.checkpoint(
        '2026-09-25T18:00:00.000Z',
      );
      expect(firstSave).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 0,
          authorityTick: savedTick,
        },
      });

      first.destroy();
      second = await bootPersistedPhase1ProductReview(root, config);
      expect(second.reopened).toBe(true);

      const reopenedCanvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      expect(Number(reopenedCanvas?.dataset.playerX))
        .toBeCloseTo(savedX, 6);
      expect(second.runtime.getAuthorityTick())
        .toBeGreaterThanOrEqual(savedTick);

      const secondSave = await second.checkpoint(
        '2026-09-25T18:01:00.000Z',
      );
      expect(secondSave).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 1,
        },
      });
    } finally {
      second?.destroy();
      if (second === null) {
        first.destroy();
      }
      await deleteIndexedDbSaveDatabase(databaseName);
    }
  });

  it('fails closed when Product Review gameplay tuning is not approved', async () => {
    root = document.createElement('div');
    document.body.append(root);

    await expect(bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-invalid',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 0,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    })).rejects.toThrow(/approved positive ordinary interaction range/);
  });

});
