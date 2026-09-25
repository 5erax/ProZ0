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
} from '../../src/integration';
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

    const first = await bootPersistedPhase1ProductReview(root, config);
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
    await wait(20);

    const warning =
      root.querySelector<HTMLElement>('.p1-toast[data-toast-kind="warning"]');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('SOURCE MISSING');
    expect(warning?.textContent).toContain('Consumable');
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
