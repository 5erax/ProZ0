import { afterEach, describe, expect, it } from 'vitest';
import {
  bootAutoProZ0,
  bootProZ0,
  resolveProductReviewAutoBootConfig,
  type RuntimeHandle,
} from '../../src/client/main';
import {
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
} from '../../src/integration/Phase1AuthorityBundle';
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

function productReviewAuthorityTick(runtime: RuntimeHandle): number {
  const productReviewRuntime = runtime as RuntimeHandle & {
    getAuthorityTick?: () => number;
  };
  if (productReviewRuntime.getAuthorityTick === undefined) {
    throw new Error('Expected a Product Review authority runtime handle.');
  }
  return productReviewRuntime.getAuthorityTick();
}

async function waitPastProductReviewFeedbackLifetime(
  runtime: RuntimeHandle,
  feedbackStartTick: number,
): Promise<void> {
  const minimumExpiredTick = feedbackStartTick + 13;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (productReviewAuthorityTick(runtime) >= minimumExpiredTick) return;
    await wait(10);
  }
  throw new Error(
    'Product Review authority did not advance past command feedback lifetime.',
  );
}

async function waitForSaveState(
  root: HTMLElement,
  state: 'idle' | 'pending' | 'success' | 'failure',
): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const control = root.querySelector<HTMLElement>(
      '[data-product-review-save="local-authority"]',
    );
    if (control?.dataset.saveState === state) return control;
    await wait(10);
  }
  throw new Error('Product Review SAVE WORLD did not reach state ' + state + '.');
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


  it('exposes discoverable Product Review controls without debug-console knowledge', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-controls',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    const controls = root.querySelector<HTMLElement>(
      '[data-product-review-controls]',
    );
    expect(controls?.dataset.productReviewControls).toBe('closed');
    expect(controls?.textContent).toContain('H · CONTROLS');

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyH',
      cancelable: true,
    }));
    await wait(10);

    expect(controls?.dataset.productReviewControls).toBe('open');
    expect(controls?.textContent).toContain('WASD / ARROWS');
    expect(controls?.textContent).toContain('V · CONSUME');
    expect(controls?.textContent).toContain('SPACE · ATTACK');
    expect(controls?.textContent).toContain('C · CRAFT');
    expect(controls?.textContent).toContain('B · BUILD');
  });

  it('resolves Product Review autoboot from declarative deployment config and uses persisted Save V2', async () => {
    const databaseName = 'proz0-test-product-review-autoboot';
    await deleteIndexedDbSaveDatabase(databaseName);

    root = document.createElement('div');
    root.dataset.proz0Mode = 'phase1-product-review';
    root.dataset.proz0WorldId = 'world:browser-product-review-autoboot';
    root.dataset.proz0WorldSeed = 'p1-world-golden';
    root.dataset.proz0PlayerIds = 'browser-player';
    root.dataset.proz0LocalPlayerId = 'browser-player';
    root.dataset.proz0SaveDatabase = databaseName;
    document.body.append(root);

    try {
      handle = await bootAutoProZ0(root);

      expect(root.dataset.runtimeMode).toBe('phase1-product-review');
      expect(root.dataset.runtimeStatus).toBe('ready');
      expect(root.dataset.productReviewAuthority).toBe('canonical');
      expect(root.dataset.productReviewPersistence).toBe('indexeddb-save-v2');
      expect(root.dataset.productReviewReopened).toBe('false');
      expect(
        root.querySelector<HTMLCanvasElement>('#proz0-canvas')
          ?.dataset.renderer,
      ).toBe('phase1-production-raster');
    } finally {
      handle?.destroy();
      handle = null;
      await deleteIndexedDbSaveDatabase(databaseName);
    }
  });

  it('uses approved canonical Product Review tuning without deployment overrides', () => {
    root = document.createElement('div');
    root.dataset.proz0Mode = 'phase1-product-review';
    root.dataset.proz0WorldId = 'world:browser-product-review-approved-tuning';
    root.dataset.proz0WorldSeed = 'p1-world-golden';
    root.dataset.proz0PlayerIds = 'browser-player';
    root.dataset.proz0LocalPlayerId = 'browser-player';
    document.body.append(root);

    expect(resolveProductReviewAutoBootConfig(root!)).toMatchObject({
      interactionRangeWorldUnits:
        PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
      spawnClearanceRadiusWorldUnits:
        PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
      requiredAccessRadiusWorldUnits:
        PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
    });
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

  it('serializes repeated Product Review checkpoints and reopens the latest same-runtime state', async () => {
    const databaseName = 'proz0-test-product-review-reopen';
    await deleteIndexedDbSaveDatabase(databaseName);

    root = document.createElement('div');
    document.body.append(root);

    const config = {
      worldId: 'world:browser-product-review-reopen',
      worldSeed: 'p1-world-golden',
      playerIds: ['browser-player'],
      localPlayerId: 'browser-player',
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: { databaseName },
    } as const;

    const first = await bootPersistedPhase1ProductReview(root, config);
    let firstDestroyed = false;
    let second: Awaited<
      ReturnType<typeof bootPersistedPhase1ProductReview>
    > | null = null;
    let secondDestroyed = false;
    let third: Awaited<
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

      const firstSavedX = Number(firstCanvas?.dataset.playerX);
      expect(firstSavedX).toBeGreaterThan(initialX);
      const firstSavedTick = first.runtime.getAuthorityTick();
      expect(await first.checkpoint(
        '2026-09-28T00:00:00.000Z',
      )).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 0,
          authorityTick: firstSavedTick,
        },
      });

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(160);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(50);

      const secondSavedX = Number(firstCanvas?.dataset.playerX);
      expect(secondSavedX).toBeGreaterThan(firstSavedX);
      const secondSavedTick = first.runtime.getAuthorityTick();
      expect(await first.checkpoint(
        '2026-09-28T00:01:00.000Z',
      )).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 1,
          authorityTick: secondSavedTick,
          createdAtUtc: '2026-09-28T00:00:00.000Z',
        },
      });

      first.destroy();
      firstDestroyed = true;
      second = await bootPersistedPhase1ProductReview(root, config);
      expect(second.reopened).toBe(true);

      const secondCanvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      expect(Number(secondCanvas?.dataset.playerX))
        .toBeCloseTo(secondSavedX, 6);
      expect(second.runtime.getAuthorityTick())
        .toBeGreaterThanOrEqual(secondSavedTick);

      expect(await second.checkpoint(
        '2026-09-28T00:02:00.000Z',
      )).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 2,
          createdAtUtc: '2026-09-28T00:00:00.000Z',
        },
      });

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(140);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(50);

      const reopenedLatestX = Number(secondCanvas?.dataset.playerX);
      expect(reopenedLatestX).toBeGreaterThan(secondSavedX);
      expect(await second.checkpoint(
        '2026-09-28T00:03:00.000Z',
      )).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 3,
        },
      });

      second.destroy();
      secondDestroyed = true;
      third = await bootPersistedPhase1ProductReview(root, config);
      expect(third.reopened).toBe(true);
      expect(
        Number(
          root.querySelector<HTMLCanvasElement>('#proz0-canvas')
            ?.dataset.playerX,
        ),
      ).toBeCloseTo(reopenedLatestX, 6);
    } finally {
      third?.destroy();
      if (second !== null && !secondDestroyed) {
        second.destroy();
      }
      if (!firstDestroyed) {
        first.destroy();
      }
      await deleteIndexedDbSaveDatabase(databaseName);
    }
  });

  it('exposes local SAVE WORLD, keeps S movement-only, and reopens the latest successful checkpoint', async () => {
    const databaseName = 'proz0-test-product-review-save-world';
    await deleteIndexedDbSaveDatabase(databaseName);

    root = document.createElement('div');
    document.body.append(root);

    const config = {
      worldId: 'world:browser-product-review-save-world',
      worldSeed: 'p1-world-golden',
      playerIds: ['browser-player'],
      localPlayerId: 'browser-player',
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: { databaseName },
    } as const;

    let current = await bootPersistedPhase1ProductReview(root, config);
    try {
      const saveControl = root.querySelector<HTMLElement>(
        '[data-product-review-save="local-authority"]',
      );
      expect(saveControl?.dataset.saveState).toBe('idle');
      expect(saveControl?.textContent).toContain('L · SAVE WORLD');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyH',
        cancelable: true,
      }));
      expect(
        root.querySelector<HTMLElement>('[data-product-review-save-help]')
          ?.textContent,
      ).toBe('L · SAVE WORLD');
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyH',
        cancelable: true,
      }));

      const movementCanvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      const initialY = Number(movementCanvas?.dataset.playerY);
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyS',
        cancelable: true,
        bubbles: true,
      }));
      await wait(140);
      document.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyS',
        cancelable: true,
        bubbles: true,
      }));
      await wait(30);

      expect(Number(movementCanvas?.dataset.playerY))
        .toBeGreaterThan(initialY);
      expect(
        root.querySelector<HTMLElement>('[data-product-review-save]')
          ?.dataset.saveState,
      ).toBe('idle');

      current.destroy();
      current = await bootPersistedPhase1ProductReview(root, config);
      expect(current.reopened).toBe(false);

      const canvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
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
      const firstSavedX = Number(canvas?.dataset.playerX);
      expect(firstSavedX).toBeGreaterThan(initialX);

      const beforeSaveX = Number(canvas?.dataset.playerX);
      const beforeSaveY = Number(canvas?.dataset.playerY);
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyL',
        cancelable: true,
        bubbles: true,
      }));
      expect(
        root.querySelector<HTMLElement>('[data-product-review-save]')
          ?.dataset.saveState,
      ).toBe('pending');
      expect(
        root.querySelector<HTMLElement>('[data-product-review-save]')
          ?.textContent,
      ).toContain('Saving…');

      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyL',
        cancelable: true,
        bubbles: true,
      }));
      await waitForSaveState(root, 'success');
      document.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyL',
        cancelable: true,
        bubbles: true,
      }));
      await wait(30);

      expect(Number(canvas?.dataset.playerX)).toBeCloseTo(beforeSaveX, 6);
      expect(Number(canvas?.dataset.playerY)).toBeCloseTo(beforeSaveY, 6);
      expect(
        root.querySelector<HTMLElement>('[data-product-review-save]')
          ?.textContent,
      ).toContain('World saved');

      expect(await current.checkpoint(
        '2026-09-28T01:40:00.000Z',
      )).toMatchObject({
        ok: true,
        value: {
          worldId: config.worldId,
          worldRevision: 1,
        },
      });

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(160);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(40);
      const unsavedX = Number(canvas?.dataset.playerX);
      expect(unsavedX).toBeGreaterThan(firstSavedX);

      current.destroy();
      current = await bootPersistedPhase1ProductReview(root, config);
      const reopenedCanvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      expect(Number(reopenedCanvas?.dataset.playerX))
        .toBeCloseTo(firstSavedX, 6);

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(160);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(40);
      const secondSavedX = Number(reopenedCanvas?.dataset.playerX);
      expect(secondSavedX).toBeGreaterThan(firstSavedX);

      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyL',
        cancelable: true,
      }));
      await waitForSaveState(root, 'success');

      current.destroy();
      current = await bootPersistedPhase1ProductReview(root, config);
      expect(
        Number(
          root.querySelector<HTMLCanvasElement>('#proz0-canvas')
            ?.dataset.playerX,
        ),
      ).toBeCloseTo(secondSavedX, 6);
    } finally {
      current.destroy();
      await deleteIndexedDbSaveDatabase(databaseName);
    }
  });

  it('reports SAVE WORLD failure without advancing the durable checkpoint', async () => {
    const databaseName = 'proz0-test-product-review-save-failure';
    await deleteIndexedDbSaveDatabase(databaseName);

    root = document.createElement('div');
    document.body.append(root);

    const config = {
      worldId: 'world:browser-product-review-save-failure',
      worldSeed: 'p1-world-golden',
      playerIds: ['browser-player'],
      localPlayerId: 'browser-player',
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: { databaseName },
    } as const;

    let current = await bootPersistedPhase1ProductReview(root, config);
    const originalTransaction = IDBDatabase.prototype.transaction;
    try {
      const canvas =
        root.querySelector<HTMLCanvasElement>('#proz0-canvas');
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(160);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(40);
      const durableX = Number(canvas?.dataset.playerX);

      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyL',
        cancelable: true,
      }));
      await waitForSaveState(root, 'success');

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(160);
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyD',
        cancelable: true,
      }));
      await wait(40);
      const failedSaveX = Number(canvas?.dataset.playerX);
      expect(failedSaveX).toBeGreaterThan(durableX);

      let failNextWrite = true;
      IDBDatabase.prototype.transaction = function (
        storeNames: string | Iterable<string>,
        mode?: IDBTransactionMode,
        options?: IDBTransactionOptions,
      ): IDBTransaction {
        if (failNextWrite && mode === 'readwrite') {
          failNextWrite = false;
          throw new DOMException(
            'Forced Product Review SAVE WORLD storage failure.',
            'InvalidStateError',
          );
        }
        return originalTransaction.call(
          this,
          storeNames,
          mode,
          options,
        );
      };

      document.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyL',
        cancelable: true,
      }));
      const failed = await waitForSaveState(root, 'failure');
      root.dataset.productReviewPanelOpen = 'true';
      expect(getComputedStyle(failed).display).not.toBe('none');
      delete root.dataset.productReviewPanelOpen;
      expect(failed.textContent).toContain('Save failed');
      expect(failed.textContent).toContain('not durable');
      expect(failed.textContent).toContain('Retry Save');

      IDBDatabase.prototype.transaction = originalTransaction;

      current.destroy();
      current = await bootPersistedPhase1ProductReview(root, config);
      expect(
        Number(
          root.querySelector<HTMLCanvasElement>('#proz0-canvas')
            ?.dataset.playerX,
        ),
      ).toBeCloseTo(durableX, 6);
    } finally {
      IDBDatabase.prototype.transaction = originalTransaction;
      current.destroy();
      await deleteIndexedDbSaveDatabase(databaseName);
    }
  });

  it('exposes canonical context interaction without debug-console knowledge', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-context',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        // Test-only range reaches the canonical nearby Fiber Plant from
        // landing; production still requires owner-approved tuning.
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    const interaction =
      root.querySelector<HTMLElement>('[data-region="interaction"]');
    expect(interaction?.dataset.state).toBe('AVAILABLE');
    expect(interaction?.textContent).toContain('GATHER');
    expect(interaction?.textContent).toContain('Fiber');

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyE',
      cancelable: true,
    }));
    await wait(20);

    const channeling =
      root.querySelector<HTMLElement>('[data-region="interaction"]');
    expect(channeling?.dataset.state).toBe('CHANNELING');
    expect(channeling?.textContent).toContain('GATHER');
  });

  it('routes Product Review craft choices through canonical item authority', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-craft',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyC',
      cancelable: true,
    }));
    await wait(20);

    const panel =
      root.querySelector<HTMLElement>('[data-panel-kind="craft"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('PAGE 1/');
    expect(panel?.textContent).toContain('[1]');

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Digit1',
      cancelable: true,
    }));
    await wait(20);

    expect(
      root.querySelector<HTMLElement>('.p1-toast[data-toast-kind="warning"]'),
    ).not.toBeNull();
    expect(
      root.querySelector<HTMLElement>('[data-panel-kind="craft"]'),
    ).not.toBeNull();
  });

  it('routes Product Review build placement through canonical building authority', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-build',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyB',
      cancelable: true,
    }));
    await wait(20);

    const panel =
      root.querySelector<HTMLElement>('[data-panel-kind="build"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('TAB STRUCTURE');
    expect(panel?.textContent).toContain('KIT UNAVAILABLE');

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Enter',
      cancelable: true,
    }));
    await wait(20);

    expect(
      root.querySelector<HTMLElement>('.p1-toast[data-toast-kind="warning"]'),
    ).not.toBeNull();
    expect(
      root.querySelector<HTMLElement>('[data-panel-kind="build"]'),
    ).not.toBeNull();
  });

  it('routes Product Review consume input through canonical survival authority', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-consume',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyV',
      cancelable: true,
    }));
    expect(
      root.querySelector<HTMLElement>('.p1-interaction-main')?.textContent,
    ).toContain('[V] CONSUME · Consumable');
    await wait(20);

    const warning =
      root.querySelector<HTMLElement>('.p1-toast[data-toast-kind="warning"]');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('SOURCE MISSING');
    expect(warning?.textContent).toContain('[V] CONSUME · Consumable');
  });

  it('keeps Product Review command feedback observable but bounded', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-input-feedback',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });

    const assertFeedbackLifetime = async (
      code: 'KeyQ' | 'KeyT' | 'KeyV',
      expected: RegExp,
    ): Promise<void> => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        code,
        cancelable: true,
      }));
      const feedbackStartTick = productReviewAuthorityTick(handle!);

      await wait(20);
      expect(
        root?.querySelector<HTMLElement>('.p1-toast')?.textContent,
      ).toMatch(expected);
      expect(
        root?.querySelector<HTMLElement>('.p1-interaction-main')?.textContent,
      ).toMatch(/^\[E\] /);

      await waitPastProductReviewFeedbackLifetime(
        handle!,
        feedbackStartTick,
      );
      await wait(20);

      expect(
        root?.querySelector<HTMLElement>('.p1-toast')?.textContent ?? '',
      ).not.toMatch(expected);
      expect(
        root?.querySelector<HTMLElement>('.p1-interaction-main')?.textContent,
      ).toMatch(/^\[E\] /);
    };

    await assertFeedbackLifetime(
      'KeyQ',
      /\[Q\] (EQUIP|UNEQUIP) · Basic Spear/,
    );
    await assertFeedbackLifetime(
      'KeyT',
      /\[T\] (EQUIP|UNEQUIP) · Thermal Wrap/,
    );
    await assertFeedbackLifetime(
      'KeyV',
      /\[V\] CONSUME · Consumable/,
    );
  });

  it('projects Product Review map from explored knowledge without resource scanning', async () => {
    root = document.createElement('div');
    document.body.append(root);

    handle = await bootProZ0(root, {
      mode: 'phase1-product-review',
      config: {
        worldId: 'world:browser-product-review-spatial-map',
        worldSeed: 'p1-world-golden',
        playerIds: ['browser-player', 'browser-teammate'],
        localPlayerId: 'browser-player',
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
      },
    });
    await wait(80);

    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(80);
    window.dispatchEvent(new KeyboardEvent('keyup', {
      code: 'KeyD',
      cancelable: true,
    }));
    await wait(30);

    document.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyM',
      cancelable: true,
    }));
    await wait(30);

    const map = root.querySelector<HTMLElement>(
      '[data-panel-kind="map"] [data-map-spatial="true"]',
    );
    expect(map).not.toBeNull();
    expect(map?.dataset.mapKnowledge).toBe('explored-only');
    expect(Number(map?.dataset.exploredCellCount)).toBeGreaterThan(0);
    expect(Number(map?.dataset.unknownBoundaryCount)).toBeGreaterThan(0);
    expect(Number(map?.dataset.mapCellScale) % 1).toBe(0);
    expect(Number(map?.dataset.mapCellScale)).toBeGreaterThanOrEqual(3);
    expect(
      Number(map?.dataset.visibleExploredCellCount),
    ).toBeGreaterThan(0);

    const playerMarker = map?.querySelector<HTMLElement>(
      '[data-map-marker-kind="player"]',
    );
    expect(playerMarker?.dataset.mapMarkerIndex).toBe('0');
    expect(playerMarker?.dataset.mapMarkerLabel).toBe('YOU');
    expect(playerMarker?.dataset.facing).not.toBe('');

    const baseMarker = map?.querySelector<HTMLElement>(
      '[data-map-marker-kind="base"]',
    );
    expect(baseMarker?.dataset.mapMarkerIndex).toBe('4');
    expect(baseMarker?.dataset.mapMarkerLabel).toBe('BASE');
    expect(baseMarker?.dataset.distanceBand).toBe('NEAR');
    expect(
      map?.querySelector<HTMLElement>(
        '[data-map-selection-label="BASE"]',
      )?.textContent,
    ).toBe('BASE');

    const teammateMarker = map?.querySelector<HTMLElement>(
      '[data-map-marker-kind="teammate"]',
    );
    expect(teammateMarker).not.toBeNull();
    expect(teammateMarker?.dataset.distanceBand).toBeUndefined();

    expect(
      map?.querySelector('[data-map-marker-kind="resource"]'),
    ).toBeNull();
    expect(map?.textContent).not.toMatch(
      /Fiber|Food Plant|Timber|Stone|Metal Ore|Water Source/,
    );

    const explored = map?.querySelector<HTMLElement>(
      '[data-map-cell-state="EXPLORED"]',
    );
    expect(explored?.dataset.terrainState).toMatch(/ground|water/);

    const unknownBoundary = map?.querySelector<HTMLElement>(
      '[data-map-cell-state="UNKNOWN_BOUNDARY"]',
    );
    expect(unknownBoundary?.dataset.hiddenDetail).toBe('opaque');
    expect(unknownBoundary?.dataset.terrainState).toBeUndefined();

    expect(
      root.querySelector<HTMLElement>('.p1-map-detail')
        ?.textContent,
    ).toContain('LANDING MODULE · BASE · NEAR');
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
