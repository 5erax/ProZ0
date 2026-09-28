import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createPhase1ContentCatalog,
} from '../../src/content';
import {
  composePhase1SaveV2,
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
  Phase1AuthorityBundle,
} from '../../src/integration';
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  type PortableSaveBundleV2,
} from '../../src/persistence';
import {
  getPhase1WorldLandmarks,
  PHASE1_WORLD_GENERATION_VERSION,
} from '../../src/world/phase1/Phase1ChunkGenerator';

const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-int-001-product-review',
);
const WORLD_SEED = 'p1-world-golden';
const NOW_UTC = '2026-09-26T00:00:00.000Z';

type PlayerFacing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

interface PlayerSeed {
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
}

function portableBundle(
  request: ReturnType<typeof composePhase1SaveV2>,
): PortableSaveBundleV2 {
  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  });
}

function validateEvidenceBundle(
  bundle: PortableSaveBundleV2,
): PortableSaveBundleV2 {
  const catalog = createPhase1ContentCatalog();
  const validation = reconstructPhase1ReopenState(
    bundle,
    createPhase1SaveV2Compatibility(
      catalog,
      Object.freeze([PHASE1_WORLD_GENERATION_VERSION]),
    ),
  );
  if (!validation.ok) {
    throw new Error(
      'Evidence Save V2 failed canonical validation: '
        + validation.code + ': ' + validation.message,
    );
  }
  return bundle;
}

async function createBaseSave(
  worldId: string,
  players: readonly PlayerSeed[],
  mutate?: (bundle: Phase1AuthorityBundle) => Promise<void> | void,
): Promise<PortableSaveBundleV2> {
  const authority = await Phase1AuthorityBundle.create({
    worldId,
    worldSeed: WORLD_SEED,
    playerIds: Object.freeze(players.map((entry) => entry.playerId)),
    interactionRangeWorldUnits:
      PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
    spawnClearanceRadiusWorldUnits:
      PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
    requiredAccessRadiusWorldUnits:
      PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  });

  try {
    for (const player of players) {
      authority.getRuntime(player.playerId).relocatePlayer(
        Object.freeze({ x: player.x, y: player.y }),
        player.facing,
      );
    }
    await authority.stepSolo();
    await mutate?.(authority);
    for (const player of players) {
      const runtime = authority.getRuntime(player.playerId);
      const movement = runtime.getSnapshot().player;
      runtime.relocatePlayer(movement.position, movement.facing ?? player.facing);
    }
    return validateEvidenceBundle(
      portableBundle(composePhase1SaveV2(authority, {
        nowUtc: NOW_UTC,
      })),
    );
  } finally {
    await authority.destroy();
  }
}

function withAuthorityTick(
  bundle: PortableSaveBundleV2,
  authorityTick: number,
): PortableSaveBundleV2 {
  return validateEvidenceBundle(Object.freeze({
    ...bundle,
    world: Object.freeze({
      ...bundle.world,
      authorityTick,
      environment: Object.freeze({
        ...bundle.world.environment,
        activeTick: authorityTick,
      }),
    }),
  }));
}

function withLocalLoadout(
  bundle: PortableSaveBundleV2,
  playerId: string,
  options: {
    readonly thermalWrap?: boolean;
    readonly spear?: boolean;
    readonly habitatKit?: boolean;
    readonly machineKit?: boolean;
  },
): PortableSaveBundleV2 {
  const inventoryId = 'inventory:' + playerId;
  const extraStacks = [
    ...(options.thermalWrap
      ? [Object.freeze({
          stackId: 'evidence:thermal-wrap:' + playerId,
          itemDefinitionId: 'item:thermal-wrap',
          quantity: 1,
          condition: 100,
        })]
      : []),
    ...(options.spear
      ? [Object.freeze({
          stackId: 'evidence:basic-spear:' + playerId,
          itemDefinitionId: 'item:basic-spear',
          quantity: 1,
          condition: 100,
        })]
      : []),
    ...(options.habitatKit
      ? [Object.freeze({
          stackId: 'evidence:habitat-kit:' + playerId,
          itemDefinitionId: 'item:habitat-kit',
          quantity: 1,
          condition: null,
        })]
      : []),
    ...(options.machineKit
      ? [Object.freeze({
          stackId: 'evidence:machine-kit:' + playerId,
          itemDefinitionId: 'item:machine-kit',
          quantity: 1,
          condition: null,
        })]
      : []),
  ];

  const next = Object.freeze({
    ...bundle,
    players: Object.freeze(bundle.players.map((player) =>
      player.playerId !== playerId
        ? player
        : Object.freeze({
            ...player,
            equipment: Object.freeze({
              equippedWeaponStackId: options.spear
                ? 'evidence:basic-spear:' + playerId
                : player.equipment.equippedWeaponStackId,
              equippedThermalWrapStackId: options.thermalWrap
                ? 'evidence:thermal-wrap:' + playerId
                : player.equipment.equippedThermalWrapStackId,
            }),
          }),
    )),
    containers: Object.freeze(bundle.containers.map((container) =>
      container.containerId !== inventoryId
        ? container
        : Object.freeze({
            ...container,
            revision: container.revision + (extraStacks.length > 0 ? 1 : 0),
            stacks: Object.freeze([
              ...container.stacks,
              ...extraStacks,
            ]),
          }),
    )),
  });
  return validateEvidenceBundle(next);
}

async function createPredatorWindupSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const entity = authority.world.findGeneratedEntityByDefinition(
        'hostile:territorial-predator',
      );
      if (entity === null || entity.type !== 'hostile') {
        throw new Error('Evidence setup could not resolve canonical predator.');
      }
      authority.getRuntime('visual-local').relocatePlayer(
        Object.freeze({
          x: entity.position.x - 0.35,
          y: entity.position.y,
        }),
        'E',
      );
      await authority.stepSolo();
      const predator = authority.world.getPredator(entity.entityId);
      if (predator === null) {
        throw new Error('Evidence setup lost canonical predator state.');
      }
      const committed = authority.world.commitPredatorRuntime({
        entityId: predator.entityId,
        expectedRevision: predator.revision,
        health: predator.health,
        state: 'attack-windup',
        targetPlayerId: 'visual-local',
        stateUntilTick: authority.authorityTick + 120,
        outsideLeashTicks: 0,
      });
      if (committed === null) {
        throw new Error('Evidence setup could not stage canonical windup.');
      }
    },
  );
}

async function createDeathSave(
  worldId: string,
  respawn: boolean,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const lethalTick = authority.authorityTick;
      const lethal = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:lethal',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:predator',
        targetPlayerId: 'visual-local',
        amount: 100,
        tick: lethalTick,
      });
      if (lethal.status !== 'applied' || !lethal.lethal) {
        throw new Error('Evidence setup failed to stage canonical lethal damage.');
      }
      await authority.stepSolo();

      if (!respawn) return;
      const state = authority.survival.getPlayerState('visual-local');
      if (state.lifeState.type !== 'dead-pending-respawn') {
        throw new Error('Evidence setup expected pending respawn.');
      }
      while (authority.authorityTick < state.lifeState.respawnAtTick) {
        await authority.stepSolo();
      }
    },
  );
}

async function createCriticalHealthSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    async (authority) => {
      const result = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:critical-health',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:predator',
        targetPlayerId: 'visual-local',
        amount: 75,
        tick: authority.authorityTick,
      });
      if (result.status !== 'applied' || result.healthAfter > 30) {
        throw new Error('Evidence setup failed to stage critical health.');
      }
      await authority.stepSolo();
    },
  );
}

async function createResourceFocusSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
    (authority) => {
      const resource = authority.world.getActiveGeneratedEntities().find(
        (entity) =>
          entity.type === 'resource'
          && entity.definitionId === 'resource:fiber-plant',
      );
      if (resource === undefined) {
        throw new Error('Evidence setup could not resolve canonical Fiber Plant.');
      }
      authority.getRuntime('visual-local').relocatePlayer(
        Object.freeze({
          x: resource.position.x - 0.5,
          y: resource.position.y,
        }),
        'E',
      );
    },
  );
}

async function createWorldDropSave(
  worldId: string,
): Promise<PortableSaveBundleV2> {
  return createBaseSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 3,
        y: 3,
        facing: 'E' as const,
      }),
    ]),
    (authority) => {
      const inventory = authority.items.getContainerView(
        'inventory:visual-local',
      );
      const tool = inventory.stacks.find(
        (stack) => stack.itemDefinitionId === 'item:stone-field-tool',
      );
      if (tool === undefined) {
        throw new Error('Evidence setup is missing canonical starter tool.');
      }
      const result = authority.executeItemCommand({
        type: 'drop',
        operationId: 'evidence:world-drop',
        playerId: 'visual-local',
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
        sourceStackId: tool.stackId,
        quantity: 1,
      });
      if (result.status !== 'committed') {
        throw new Error(
          'Evidence setup failed canonical world drop: ' + result.reason,
        );
      }
    },
  );
}

async function createSpatialMapEvidenceSave(
  worldId: string,
  finalPlayerPosition: Readonly<{ x: number; y: number }> | null = null,
): Promise<PortableSaveBundleV2> {
  const players = Object.freeze([
    Object.freeze({
      playerId: 'visual-local',
      x: 0,
      y: 0,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-teammate',
      x: 6,
      y: 4,
      facing: 'NW' as const,
    }),
  ]);

  return createBaseSave(
    worldId,
    players,
    async (authority) => {
      const runtime = authority.getRuntime('visual-local');

      // Reveal representative water while preserving binary discovery.
      runtime.relocatePlayer(
        Object.freeze({ x: 34, y: -18 }),
        'E',
      );
      await authority.stepSolo();

      // Locate the canonical ruin through ordinary authoritative reveal.
      const landmarks = getPhase1WorldLandmarks(WORLD_SEED);
      runtime.relocatePlayer(landmarks.ruinPosition, 'W');
      await authority.stepSolo();
      const ruin =
        authority.world.findGeneratedEntityByDefinition(
          'ruin:previous-civilization-ruin',
        );
      if (ruin === null || ruin.type !== 'ruin') {
        throw new Error(
          'Map evidence could not resolve canonical ruin.',
        );
      }
      const ruinState = authority.worldStore.getRuinState(
        ruin.entityId,
      );
      if (
        ruinState === undefined
        || ruinState.discoveryState === 'unknown'
      ) {
        throw new Error(
          'Map evidence expected authoritative LOCATED ruin state.',
        );
      }

      // Stage a recovery target in the accepted MID commitment band.
      runtime.relocatePlayer(
        Object.freeze({ x: 100, y: 0 }),
        'W',
      );
      await authority.stepSolo();
      const lethal = authority.survival.applyAuthorityDamage({
        damageId: 'evidence:p1-polish-002-map-cache',
        sourceType: 'hostile-attack',
        sourceEntityId: 'evidence:map-cache-source',
        targetPlayerId: 'visual-local',
        amount: 100,
        tick: authority.authorityTick,
      });
      if (lethal.status !== 'applied' || !lethal.lethal) {
        throw new Error(
          'Map evidence failed to stage canonical lethal damage.',
        );
      }
      await authority.stepSolo();

      const pending = authority.survival.getPlayerState(
        'visual-local',
      );
      if (pending.lifeState.type !== 'dead-pending-respawn') {
        throw new Error(
          'Map evidence expected pending authoritative respawn.',
        );
      }
      while (
        authority.authorityTick
        < pending.lifeState.respawnAtTick
      ) {
        await authority.stepSolo();
      }

      const cache =
        authority.world.exportSnapshot().deathCaches.caches[0];
      if (cache === undefined) {
        throw new Error(
          'Map evidence expected an active Death Cache.',
        );
      }
      const contents = authority.items.getContainerView(
        cache.containerId,
      );
      if (contents.stacks.length === 0) {
        throw new Error(
          'Map evidence Death Cache must retain recoverable items.',
        );
      }

      if (finalPlayerPosition !== null) {
        runtime.relocatePlayer(
          Object.freeze({
            x: finalPlayerPosition.x,
            y: finalPlayerPosition.y,
          }),
          'W',
        );
        await authority.stepSolo();
      }
    },
  );
}

async function seedIndexedDb(
  page: Page,
  databaseName: string,
  bundle: PortableSaveBundleV2,
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    async ({ dbName, save }) => {
      await new Promise<void>((resolveDelete) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolveDelete();
        request.onerror = () => resolveDelete();
        request.onblocked = () => resolveDelete();
      });

      const database = await new Promise<IDBDatabase>((resolveOpen, rejectOpen) => {
        const request = indexedDB.open(dbName, 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          const transaction = request.transaction;
          if (transaction === null) {
            rejectOpen(new Error('IndexedDB upgrade transaction unavailable.'));
            return;
          }
          const specs: readonly [string, string | string[]][] = [
            ['players', ['worldId', 'playerId']],
            ['containers', ['worldId', 'containerId']],
            ['chunks', ['worldId', 'coord.x', 'coord.y']],
            ['footholds', ['worldId', 'footholdId']],
            ['structures', ['worldId', 'structureId']],
          ];
          if (!db.objectStoreNames.contains('worlds')) {
            db.createObjectStore('worlds', { keyPath: 'worldId' });
          }
          for (const [storeName, keyPath] of specs) {
            const store = db.objectStoreNames.contains(storeName)
              ? transaction.objectStore(storeName)
              : db.createObjectStore(storeName, { keyPath });
            if (!store.indexNames.contains('worldId')) {
              store.createIndex('worldId', 'worldId');
            }
          }
        };
        request.onsuccess = () => resolveOpen(request.result);
        request.onerror = () => rejectOpen(
          request.error ?? new Error('IndexedDB evidence open failed.'),
        );
      });

      await new Promise<void>((resolveTx, rejectTx) => {
        const storeNames = [
          'worlds',
          'players',
          'containers',
          'chunks',
          'footholds',
          'structures',
        ];
        const transaction = database.transaction(storeNames, 'readwrite');
        transaction.objectStore('worlds').put(save.world);
        for (const player of save.players) {
          transaction.objectStore('players').put(player);
        }
        for (const container of save.containers) {
          transaction.objectStore('containers').put(container);
        }
        for (const chunk of save.chunks) {
          transaction.objectStore('chunks').put(chunk);
        }
        for (const foothold of save.footholds) {
          transaction.objectStore('footholds').put(foothold);
        }
        for (const structure of save.structures) {
          transaction.objectStore('structures').put(structure);
        }
        transaction.oncomplete = () => resolveTx();
        transaction.onerror = () => rejectTx(
          transaction.error ?? new Error('IndexedDB evidence write failed.'),
        );
        transaction.onabort = () => rejectTx(
          transaction.error ?? new Error('IndexedDB evidence write aborted.'),
        );
      });
      database.close();
    },
    { dbName: databaseName, save: bundle },
  );
}

async function openProductReview(
  page: Page,
  bundle: PortableSaveBundleV2,
  databaseName: string,
  scale: 1 | 2 | 3,
  localPlayerId = 'visual-local',
  sessionPlayerIds?: readonly string[],
): Promise<void> {
  await page.setViewportSize({
    width: 640 * scale,
    height: 360 * scale,
  });
  await seedIndexedDb(page, databaseName, bundle);
  const query = new URLSearchParams({
    proz0Mode: 'phase1-product-review',
    proz0WorldId: bundle.world.worldId,
    proz0WorldSeed: bundle.world.worldSeed,
    proz0Players: (
      sessionPlayerIds
      ?? bundle.players.map((player) => player.playerId)
    ).join(','),
    proz0Player: localPlayerId,
    proz0SaveDb: databaseName,
  });
  const diagnostics: string[] = [];
  const onConsole = (message: { type(): string; text(): string }): void => {
    if (message.type() === 'error') diagnostics.push(message.text());
  };
  const onPageError = (error: Error): void => {
    diagnostics.push(error.message);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  await page.goto('/?' + query.toString());

  const root = page.locator('[data-proz0-autoboot]');
  const world = page.locator('[data-product-review-world="canonical"]');
  await expect.poll(
    async () => root.getAttribute('data-runtime-status'),
    { timeout: 5_000 },
  ).not.toBe('booting');
  const runtimeStatus = await root.getAttribute('data-runtime-status');
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  if (runtimeStatus !== 'ready') {
    throw new Error(
      'Product Review evidence boot failed: '
        + (diagnostics.join(' | ') || 'no browser diagnostic'),
    );
  }
  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'phase1-product-review',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-authority',
    'canonical',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-reopened',
    'true',
  );
  await expect(world).toHaveAttribute(
    'data-production-asset-foundation',
    'p1-75-78',
  );
  await expect(page.locator('[data-production-world-preview]')).toHaveCount(0);
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-display-scale',
    String(scale),
  );
}

async function captureViewport(
  page: Page,
  fileName: string,
): Promise<void> {
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
    fullPage: false,
  });
}

async function captureProductWorld(
  page: Page,
  fileName: string,
): Promise<void> {
  await page.locator('[data-product-review-world="canonical"]').screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
  });
}

async function assertPanelCompositionIsolated(
  page: Page,
  activePanelSelector: string,
): Promise<void> {
  const geometry = await page.evaluate((panelSelector) => {
    type Rect = {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    };

    const visibleRect = (element: Element | null): Rect | null => {
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      if (
        style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) === 0
      ) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };

    const panel = visibleRect(document.querySelector(panelSelector));
    const controlsHint = visibleRect(
      document.querySelector('.p1-product-controls-hint'),
    );
    const firstAction = visibleRect(
      document.querySelector('[data-first-action-cue="visible"]'),
    );
    const contextualHud = [
      ...document.querySelectorAll('.p1-context-hud'),
    ].map(visibleRect).filter((rect): rect is Rect => rect !== null);

    return {
      panel,
      controlsHint,
      firstAction,
      contextualHud,
      viewport: {
        width: innerWidth,
        height: innerHeight,
      },
    };
  }, activePanelSelector);

  if (geometry.panel === null) {
    throw new Error(
      'Expected visible active panel: ' + activePanelSelector,
    );
  }
  const activePanel = geometry.panel;

  const intersects = (
    left: NonNullable<typeof geometry.panel>,
    right: typeof geometry.controlsHint,
  ): boolean => {
    if (right === null) return false;
    return !(
      left.right <= right.left
      || right.right <= left.left
      || left.bottom <= right.top
      || right.bottom <= left.top
    );
  };

  expect(
    intersects(activePanel, geometry.controlsHint),
    'Controls hint must not intersect active panel',
  ).toBe(false);
  expect(
    intersects(activePanel, geometry.firstAction),
    'First-action cue must not intersect active panel',
  ).toBe(false);
  expect(geometry.controlsHint).toBeNull();
  expect(geometry.firstAction).toBeNull();
  expect(geometry.contextualHud).toEqual([]);

  expect(activePanel.left).toBeGreaterThanOrEqual(0);
  expect(activePanel.top).toBeGreaterThanOrEqual(0);
  expect(activePanel.right).toBeLessThanOrEqual(
    geometry.viewport.width,
  );
  expect(activePanel.bottom).toBeLessThanOrEqual(
    geometry.viewport.height,
  );
}

test.use({ deviceScaleFactor: 1 });

test('P1-POLISH-001 isolates primary panels from contextual HUD at required integer scales', async ({ page }) => {
  const normal = await createBaseSave(
    'world:p1-polish-001-panel-composition',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
  );

  const layouts = [
    Object.freeze({ label: '1x', scale: 1 as const, viewport: null }),
    Object.freeze({ label: '2x', scale: 2 as const, viewport: null }),
    Object.freeze({ label: '3x', scale: 3 as const, viewport: null }),
    Object.freeze({
      label: '1363x936',
      scale: 2 as const,
      viewport: Object.freeze({ width: 1363, height: 936 }),
    }),
  ] as const;

  const panels = [
    Object.freeze({
      label: 'inventory',
      key: 'i',
      selector: '[data-panel-kind="inventory"]',
    }),
    Object.freeze({
      label: 'craft',
      key: 'c',
      selector: '[data-panel-kind="craft"]',
    }),
    Object.freeze({
      label: 'map',
      key: 'm',
      selector: '[data-panel-kind="map"]',
    }),
    Object.freeze({
      label: 'build',
      key: 'b',
      selector: '[data-panel-kind="build"]',
    }),
    Object.freeze({
      label: 'help',
      key: 'h',
      selector: '.p1-product-controls-panel',
    }),
  ] as const;

  for (const layout of layouts) {
    for (const panelCase of panels) {
      const databaseName =
        'proz0-p1-polish-001-panel-'
        + layout.label
        + '-'
        + panelCase.label;
      await openProductReview(
        page,
        normal,
        databaseName,
        layout.scale,
      );

      if (layout.viewport !== null) {
        await page.setViewportSize(layout.viewport);
        await expect(page.locator('#proz0-canvas')).toHaveAttribute(
          'data-display-scale',
          String(layout.scale),
        );
      }

      await expect(page.locator('.p1-product-controls-hint')).toBeVisible();
      await expect(
        page.locator('[data-first-action-cue="visible"]'),
      ).toBeVisible();

      await page.keyboard.press(panelCase.key);
      await expect(page.locator(panelCase.selector)).toBeVisible();

      await assertPanelCompositionIsolated(
        page,
        panelCase.selector,
      );

      if (panelCase.label === 'help') {
        await expect(
          page.locator('[data-proz0-autoboot]'),
        ).toHaveAttribute('data-product-review-help-open', 'true');
      } else {
        await expect(
          page.locator('[data-proz0-autoboot]'),
        ).toHaveAttribute('data-product-review-panel-open', 'true');
      }
    }
  }
});

test('P1-POLISH-002 captures authoritative spatial map evidence', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const evidence = await createSpatialMapEvidenceSave(
    'world:p1-polish-002-map-evidence-near',
  );
  const midEvidence = await createSpatialMapEvidenceSave(
    'world:p1-polish-002-map-evidence-mid',
    Object.freeze({ x: 100, y: 0 }),
  );
  const baseReadability = await createBaseSave(
    'world:p1-polish-002-base-anchor',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 0,
        y: 0,
        facing: 'E' as const,
      }),
    ]),
  );
  const decorReadability = await createBaseSave(
    'world:p1-polish-002-decor-readability',
    Object.freeze([
      Object.freeze({
        playerId: 'visual-local',
        x: 8,
        y: 1,
        facing: 'E' as const,
      }),
    ]),
  );
  const worldReadability = await createResourceFocusSave(
    'world:p1-polish-002-resource-readability',
  );
  const playerIds = ['visual-local', 'visual-teammate'] as const;
  const files: string[] = [];

  const assertSpatialMap = async (
    expectedBaseBand: 'NEAR' | 'MID' | 'FAR',
    expectedCacheBand: 'NEAR' | 'MID' | 'FAR',
  ): Promise<void> => {
    const field = page.locator('[data-map-spatial="true"]');
    await expect(field).toBeVisible();
    await expect(field).toHaveAttribute(
      'data-map-knowledge',
      'explored-only',
    );
    await expect(
      field.locator('[data-map-marker-kind="player"]'),
    ).toHaveAttribute('data-map-marker-label', 'YOU');
    await expect(
      field.locator('[data-map-marker-kind="base"]'),
    ).toHaveAttribute('data-distance-band', expectedBaseBand);
    await expect(
      field.locator('[data-map-marker-kind="ruin"]'),
    ).toHaveAttribute('data-distance-band', 'FAR');
    await expect(
      field.locator('[data-map-marker-kind="death-cache"]'),
    ).toHaveAttribute('data-distance-band', expectedCacheBand);
    await expect(
      field.locator('[data-map-marker-kind="teammate"]'),
    ).toHaveAttribute(
      'data-presentation-identity-slot',
      'TEAM_A',
    );
    await expect(
      field.locator('[data-map-marker-kind="resource"]'),
    ).toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="EXPLORED"]'
          + '[data-terrain-state="ground"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="EXPLORED"]'
          + '[data-terrain-state="water"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="UNKNOWN_BOUNDARY"]',
      ),
    ).not.toHaveCount(0);
    await expect(
      field.locator(
        '[data-map-cell-state="UNKNOWN_BOUNDARY"]'
          + '[data-terrain-state]',
      ),
    ).toHaveCount(0);
    await expect(field).not.toContainText('HOME');
    await expect(field).not.toContainText('Fiber');
    await expect(field).not.toContainText('Metal Ore');

    const boundaryTouchesExploredWater = await field.evaluate(
      (node) => {
        const element = node as HTMLElement;
        const scale = Number(
          element.dataset.mapCellScale ?? '0',
        );
        const water = [
          ...element.querySelectorAll<HTMLElement>(
            '[data-map-cell-state="EXPLORED"]'
              + '[data-terrain-state="water"]',
          ),
        ];
        const boundary = [
          ...element.querySelectorAll<HTMLElement>(
            '[data-map-cell-state="UNKNOWN_BOUNDARY"]',
          ),
        ];
        const position = (entry: HTMLElement) => ({
          x: Number.parseFloat(entry.style.left),
          y: Number.parseFloat(entry.style.top),
        });
        return water.some((waterCell) => {
          const w = position(waterCell);
          return boundary.some((unknownCell) => {
            const u = position(unknownCell);
            return (
              Math.abs(w.x - u.x)
              + Math.abs(w.y - u.y)
            ) === scale;
          });
        });
      },
    );
    expect(boundaryTouchesExploredWater).toBe(true);
  };

  for (const scale of [1, 2, 3] as const) {
    await openProductReview(
      page,
      evidence,
      'proz0-p1-polish-002-map-' + String(scale) + 'x',
      scale,
      'visual-local',
      playerIds,
    );

    await page.keyboard.press('m');
    await assertSpatialMap('NEAR', 'NEAR');

    const initialDetail = page.locator('.p1-map-detail');
    await expect(initialDetail).toContainText(
      'LANDING MODULE · BASE · NEAR',
    );

    const scaleFile =
      'p1-polish-002-map-' + String(scale) + 'x.png';
    await captureViewport(page, scaleFile);
    files.push(scaleFile);

    if (scale === 2) {
      await page.keyboard.press('Tab');
      await expect(page.locator('.p1-map-detail'))
        .toContainText('UNINVESTIGATED RUIN · FAR');
      await captureViewport(
        page,
        'p1-polish-002-map-ruin-far-2x.png',
      );
      files.push('p1-polish-002-map-ruin-far-2x.png');

      await page.keyboard.press('Tab');
      await expect(page.locator('.p1-map-detail'))
        .toContainText('DEATH CACHE · NEAR');

      await page.locator('[data-panel-kind="map"]').evaluate(
        (panel) => {
          (panel as HTMLElement).style.filter = 'grayscale(1)';
        },
      );
      await captureViewport(
        page,
        'p1-polish-002-map-grayscale-2x.png',
      );
      files.push('p1-polish-002-map-grayscale-2x.png');
    }
  }

  await openProductReview(
    page,
    baseReadability,
    'proz0-p1-polish-002-base-anchor-2x',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="structure"]'
        + '[data-world-id="structure-instance:landing-module"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-world-role="player"][data-local-player="true"]',
    ),
  ).toHaveCount(1);
  await captureProductWorld(
    page,
    'p1-polish-002-base-anchor-2x.png',
  );
  files.push('p1-polish-002-base-anchor-2x.png');

  await openProductReview(
    page,
    decorReadability,
    'proz0-p1-polish-002-decor-readability-2x',
    2,
  );
  await expect(
    page.locator('[data-world-role="flora-decor"]'),
  ).not.toHaveCount(0);
  await expect(
    page.locator('[data-world-role="flora-decor"]').first(),
  ).toHaveAttribute('data-interactive', 'false');
  await expect(
    page.locator('[data-world-role="flora-decor"]').first(),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/world/terrain/flora_decor.png',
  );
  await captureProductWorld(
    page,
    'p1-polish-002-decor-readability-2x.png',
  );
  files.push('p1-polish-002-decor-readability-2x.png');

  await openProductReview(
    page,
    worldReadability,
    'proz0-p1-polish-002-resource-readability-2x',
    2,
  );
  await expect(
    page.locator('[data-world-role="resource"]'),
  ).not.toHaveCount(0);
  await expect(
    page.locator(
      '[data-world-role="resource"][data-focused-target="true"]',
    ),
  ).toHaveCount(1);
  await captureProductWorld(
    page,
    'p1-polish-002-resource-readability-2x.png',
  );
  files.push(
    'p1-polish-002-resource-readability-2x.png',
  );

  await openProductReview(
    page,
    midEvidence,
    'proz0-p1-polish-002-map-mid-2x',
    2,
    'visual-local',
    playerIds,
  );
  await page.keyboard.press('m');
  await assertSpatialMap('MID', 'MID');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('LANDING MODULE · BASE · MID');
  await page.keyboard.press('Tab');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('UNINVESTIGATED RUIN · FAR');
  await page.keyboard.press('Tab');
  await expect(page.locator('.p1-map-detail'))
    .toContainText('DEATH CACHE · MID');
  await captureViewport(
    page,
    'p1-polish-002-map-cache-mid-2x.png',
  );
  files.push('p1-polish-002-map-cache-mid-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P1-POLISH-002',
    evidenceKind: 'authoritative-spatial-map',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    runtime: {
      mode: 'phase1-product-review',
      canonicalAuthority: true,
      persistence: 'indexeddb-save-v2',
      qaFixture: false,
    },
    cases: {
      map1x: 'p1-polish-002-map-1x.png',
      map2x: 'p1-polish-002-map-2x.png',
      map3x: 'p1-polish-002-map-3x.png',
      ruinFar2x: 'p1-polish-002-map-ruin-far-2x.png',
      deathCacheMid2x: 'p1-polish-002-map-cache-mid-2x.png',
      nearCaseIncludesBaseAndCache: true,
      midCaseMovesPlayerThroughAuthority: true,
      grayscale2x: 'p1-polish-002-map-grayscale-2x.png',
      baseAnchor2x: 'p1-polish-002-base-anchor-2x.png',
      decorReadability2x:
        'p1-polish-002-decor-readability-2x.png',
      resourceReadability2x:
        'p1-polish-002-resource-readability-2x.png',
    },
    invariants: {
      playerFirstReadMarker: true,
      baseAnchorNoHomeState: true,
      exploredUnknownBinary: true,
      unknownCarriesNoTerrainDetail: true,
      waterBoundaryEvidence: true,
      ruinLocatedMarker: true,
      activeDeathCacheMarker: true,
      teammateCurrentPositionOnly: true,
      noGenericResourcePins: true,
      nearMidFarOnlyEligibleTargets: true,
      integerPresentation1x2x3x: true,
      grayscaleEvidence: true,
      baseAnchorWorldEvidence: true,
      decorativeFloraPresentationOnly: true,
      deterministicDecorRevealFixture: true,
      gatherableVsDecorWorldEvidence: true,
    },
    files,
  };
  writeFileSync(
    resolve(
      EVIDENCE_DIR,
      'p1-polish-002-map-manifest.json',
    ),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});

test('P1-INT-001 captures direct Product Review visual correction evidence', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const players = Object.freeze([
    Object.freeze({
      playerId: 'visual-local',
      x: 0,
      y: 0,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-zeta',
      x: 2.25,
      y: 0.25,
      facing: 'W' as const,
    }),
    Object.freeze({
      playerId: 'visual-alpha',
      x: -2.25,
      y: 0.25,
      facing: 'E' as const,
    }),
    Object.freeze({
      playerId: 'visual-mu',
      x: 0.25,
      y: -2.25,
      facing: 'S' as const,
    }),
  ]);
  const normalBase = await createBaseSave(
    'world:p1-int-001-visual-normal',
    players,
  );
  const normal = normalBase;
  const thermal = withLocalLoadout(
    normalBase,
    'visual-local',
    { thermalWrap: true },
  );
  const dualEquipment = withLocalLoadout(
    normalBase,
    'visual-local',
    { thermalWrap: true, spear: true },
  );
  const buildValid = withLocalLoadout(
    normalBase,
    'visual-local',
    { machineKit: true },
  );
  const buildConnector = withLocalLoadout(
    normalBase,
    'visual-local',
    { habitatKit: true },
  );

  const files: string[] = [];

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-2x',
    2,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await expect(
    page.locator('[data-world-role="terrain"][data-exploration-state="EXPLORED"]'),
  ).not.toHaveCount(0);
  await expect(page.locator('[data-world-role="fog"]')).not.toHaveCount(0);
  const terrainCoverage = await page.locator(
    '[data-world-role="terrain"]',
  ).evaluateAll((nodes) => {
    const boxes = nodes.map((node) => {
      const element = node as HTMLElement;
      return {
        left: Number.parseFloat(element.style.left),
        top: Number.parseFloat(element.style.top),
        width: Number.parseFloat(element.style.width),
        height: Number.parseFloat(element.style.height),
      };
    });
    const widths = [...new Set(boxes.map((box) => box.width))];
    const heights = [...new Set(boxes.map((box) => box.height))];
    const xs = [...new Set(boxes.map((box) => box.left))]
      .sort((left, right) => left - right);
    const ys = [...new Set(boxes.map((box) => box.top))]
      .sort((left, right) => left - right);
    return {
      widths,
      heights,
      maxXGap: Math.max(
        0,
        ...xs.slice(1).map((value, index) => value - xs[index]!),
      ),
      maxYGap: Math.max(
        0,
        ...ys.slice(1).map((value, index) => value - ys[index]!),
      ),
    };
  });
  expect(terrainCoverage.widths).toEqual([64]);
  expect(terrainCoverage.heights).toEqual([64]);
  expect(terrainCoverage.maxXGap).toBeLessThanOrEqual(64);
  expect(terrainCoverage.maxYGap).toBeLessThanOrEqual(64);
  await expect(page.locator('[data-world-role="fog"]').first())
    .toHaveCSS('width', '64px');
  await expect(page.locator('[data-world-role="fog"]').first())
    .toHaveCSS('height', '64px');

  await expect(
    page.locator('[data-world-role="teammate-identity"]'),
  ).toHaveCount(3);

  // Runtime admission order is deliberately non-lexicographic:
  // zeta -> TEAM_A, alpha -> TEAM_B, mu -> TEAM_C. A renderer that sorts
  // PlayerIds would produce a different assignment and fail this regression.
  const expectedIdentity = [
    ['visual-zeta', 'TEAM_A', 'circle'],
    ['visual-alpha', 'TEAM_B', 'diamond'],
    ['visual-mu', 'TEAM_C', 'triangle'],
  ] as const;
  for (const [playerId, slot, shape] of expectedIdentity) {
    const worldMarker = page.locator(
      '[data-world-role="teammate-identity"]'
        + '[data-world-id="' + playerId + '"]',
    );
    await expect(worldMarker).toHaveAttribute(
      'data-presentation-identity-slot',
      slot,
    );
    await expect(worldMarker).toHaveAttribute(
      'data-marker-shape',
      shape,
    );

    const hudRow = page.locator(
      '.p1-teammate[data-player-id="' + playerId + '"]',
    );
    await expect(hudRow).toHaveAttribute(
      'data-presentation-identity-slot',
      slot,
    );
    await expect(hudRow).toHaveAttribute(
      'data-marker-shape',
      shape,
    );
  }
  await expect(page.locator('[data-region="world"]'))
    .toContainText('4 TEAM');

  await expect(
    page.locator('[data-first-action-cue="visible"]'),
  ).toContainText('FIRST STEP · Move near a resource.');
  await expect(
    page.locator('[data-world-role="player"][data-local-player="true"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      '[data-world-role="structure"]'
        + '[data-world-id="structure-instance:landing-module"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-world-role="player"][data-local-player="true"]'),
  ).not.toHaveCSS('filter', 'none');
  await expect(page.locator('.p1-product-controls-panel')).toBeHidden();

  await captureViewport(page, 'polish-first-entry-2x.png');
  files.push('polish-first-entry-2x.png');

  await expect(page.locator('.p1-product-controls-hint')).toBeVisible();
  const hudLaneBounds = await page.evaluate(() => {
    const survival = document.querySelector<HTMLElement>(
      '[data-region="survival"]',
    );
    const controlsHint = document.querySelector<HTMLElement>(
      '.p1-product-controls-hint',
    );
    if (survival === null || controlsHint === null) {
      throw new Error(
        'Polish evidence requires survival and controls elements.',
      );
    }
    const survivalRect = survival.getBoundingClientRect();
    const controlsRect = controlsHint.getBoundingClientRect();
    return {
      survivalBottom: survivalRect.bottom,
      controlsTop: controlsRect.top,
      survivalHeight: survivalRect.height,
      controlsHeight: controlsRect.height,
      controlsDisplay: getComputedStyle(controlsHint).display,
      controlsVisibility: getComputedStyle(controlsHint).visibility,
    };
  });
  expect(hudLaneBounds.survivalHeight).toBeGreaterThan(0);
  expect(hudLaneBounds.controlsHeight).toBeGreaterThan(0);
  expect(hudLaneBounds.controlsDisplay).not.toBe('none');
  expect(hudLaneBounds.controlsVisibility).not.toBe('hidden');
  expect(hudLaneBounds.survivalBottom).toBeLessThanOrEqual(
    hudLaneBounds.controlsTop,
  );

  await captureViewport(page, 'normal-fog-coop-2x.png');
  files.push('normal-fog-coop-2x.png');

  const resourceFocus = await createResourceFocusSave(
    'world:p1-polish-001-resource-focus',
  );
  await openProductReview(
    page,
    resourceFocus,
    'proz0-p1-polish-001-resource-focus',
    2,
  );
  await expect(page.locator('.p1-interaction-main')).toContainText(
    '[E] GATHER · Fiber Plant',
  );
  await expect(
    page.locator('[data-first-action-cue="visible"]'),
  ).toContainText('[E] GATHER · Fiber Plant');
  await expect(
    page.locator(
      '[data-world-role="resource"][data-focused-target="true"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'polish-exact-target-2x.png');
  files.push('polish-exact-target-2x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-polish-001-inventory',
    2,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="inventory"]')).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="inventory"] .p1-item-icon').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="inventory"] .p1-item-row[data-selected="true"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'polish-inventory-2x.png');
  files.push('polish-inventory-2x.png');

  await page.keyboard.press('Escape');
  await page.keyboard.press('c');
  await expect(page.locator('[data-panel-kind="craft"]')).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="craft"] .p1-craft-ingredient').first(),
  ).toBeVisible();
  await expect(
    page.locator('[data-panel-kind="craft"] .p1-craft-station').first(),
  ).toBeVisible();
  const craftIcons2x = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(
      '[data-panel-kind="craft"] .p1-craft-ingredient-icon',
    )].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        assetPath: element.dataset.assetPath ?? null,
        inlineWidth: element.style.width,
        inlineHeight: element.style.height,
        backgroundSize: element.style.backgroundSize,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        connected: element.isConnected,
        display: getComputedStyle(element).display,
        visibility: getComputedStyle(element).visibility,
      };
    }),
  );
  expect(craftIcons2x.length).toBeGreaterThan(0);
  for (const icon of craftIcons2x) {
    expect(icon.assetPath).toBe('assets/phase1/items/item_icon_atlas.png');
    expect(icon.inlineWidth).toBe('24px');
    expect(icon.inlineHeight).toBe('24px');
    expect(icon.backgroundSize).toBe('144px 72px');
    expect(icon.connected).toBe(true);
    expect(icon.display).not.toBe('none');
    expect(icon.visibility).not.toBe('hidden');
    expect(icon.renderedWidth).toBe(48);
    expect(icon.renderedHeight).toBe(48);
  }
  const craftLayout = await page.locator(
    '[data-panel-kind="craft"]',
  ).evaluate((panel) => {
    const element = panel as HTMLElement;
    const rows = [
      ...element.querySelectorAll<HTMLElement>('.p1-craft-row'),
    ];
    const panelRect = element.getBoundingClientRect();
    const lastRowRect = rows.at(-1)?.getBoundingClientRect();
    return {
      rowCount: rows.length,
      panelBottom: panelRect.bottom,
      lastRowBottom: lastRowRect?.bottom ?? Number.POSITIVE_INFINITY,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
  expect(craftLayout.rowCount).toBe(6);
  expect(craftLayout.lastRowBottom).toBeLessThanOrEqual(
    craftLayout.panelBottom,
  );
  expect(craftLayout.scrollHeight).toBeLessThanOrEqual(
    craftLayout.clientHeight,
  );
  await captureViewport(page, 'polish-craft-have-need-2x.png');
  files.push('polish-craft-have-need-2x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-polish-001-craft-1x',
    1,
    'visual-local',
    players.map((player) => player.playerId),
  );
  await page.keyboard.press('c');
  await expect(page.locator('[data-panel-kind="craft"]')).toBeVisible();
  const craftIcons1x = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(
      '[data-panel-kind="craft"] .p1-craft-ingredient-icon',
    )].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        assetPath: element.dataset.assetPath ?? null,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        backgroundImage: getComputedStyle(element).backgroundImage,
        connected: element.isConnected,
        display: getComputedStyle(element).display,
        visibility: getComputedStyle(element).visibility,
      };
    }),
  );
  expect(craftIcons1x.length).toBeGreaterThan(0);
  for (const icon of craftIcons1x) {
    expect(icon.assetPath).toBe('assets/phase1/items/item_icon_atlas.png');
    expect(icon.connected).toBe(true);
    expect(icon.display).not.toBe('none');
    expect(icon.visibility).not.toBe('hidden');
    expect(icon.renderedWidth).toBe(24);
    expect(icon.renderedHeight).toBe(24);
    expect(icon.backgroundImage).not.toBe('none');
  }
  await captureViewport(page, 'polish-craft-have-need-1x.png');
  files.push('polish-craft-have-need-1x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-1x',
    1,
  );
  await captureViewport(page, 'polish-normal-1x.png');
  files.push('polish-normal-1x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-1363',
    2,
  );
  await page.setViewportSize({ width: 1363, height: 936 });
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-display-scale',
    '2',
  );
  await expect(page.locator('#proz0-canvas')).toHaveCSS('width', '1280px');
  await expect(page.locator('#proz0-canvas')).toHaveCSS('height', '720px');
  await captureViewport(page, 'polish-1363x936-centered-2x.png');
  files.push('polish-1363x936-centered-2x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-normal-3x',
    3,
  );
  await captureViewport(page, 'normal-3x.png');
  files.push('normal-3x.png');

  await openProductReview(
    page,
    dualEquipment,
    'proz0-p1-polish-001-dual-equipment',
    2,
  );
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).toContainText('Basic Spear');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('Thermal Wrap');
  await expect(
    page.locator('[data-equipment-slot="weapon"]'),
  ).toContainText('C100');
  await expect(
    page.locator('[data-equipment-slot="protection"]'),
  ).toContainText('C100');
  const equipmentOverflow = await page.locator(
    '[data-region="equipment"]',
  ).evaluate((panel) =>
    [...panel.querySelectorAll<HTMLElement>('.p1-equipment-slot')]
      .map((row) => ({
        scrollWidth: row.scrollWidth,
        clientWidth: row.clientWidth,
      })),
  );
  for (const row of equipmentOverflow) {
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  }
  await captureViewport(page, 'polish-dual-equipment-2x.png');
  files.push('polish-dual-equipment-2x.png');

  await openProductReview(
    page,
    thermal,
    'proz0-p1-int-001-thermal-wrap',
    2,
  );
  await expect(
    page.locator('[data-world-role="thermal-wrap-overlay"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'thermal-wrap-2x.png');
  files.push('thermal-wrap-2x.png');

  await openProductReview(
    page,
    buildValid,
    'proz0-p1-int-001-build-valid',
    3,
  );
  await page.keyboard.press('b');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'VALID');
  await captureViewport(page, 'build-valid-3x.png');
  await captureProductWorld(page, 'build-valid-world-3x.png');
  files.push('build-valid-3x.png', 'build-valid-world-3x.png');

  await openProductReview(
    page,
    buildConnector,
    'proz0-p1-int-001-build-connector',
    3,
  );
  await page.keyboard.press('b');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'CONNECTOR');
  await expect(
    page.locator('[data-world-role="build-preview-pattern"]'),
  ).toHaveAttribute('data-production-pattern-state', 'CONNECTOR');
  await captureViewport(page, 'build-connector-3x.png');
  await captureProductWorld(page, 'build-connector-world-3x.png');
  files.push('build-connector-3x.png', 'build-connector-world-3x.png');

  await openProductReview(
    page,
    normal,
    'proz0-p1-int-001-build-invalid',
    3,
  );
  await page.keyboard.press('b');
  await expect(
    page.locator('[data-world-role="build-preview"]'),
  ).toHaveAttribute('data-placement-state', 'INVALID');
  await expect(
    page.locator('[data-panel-kind="build"]'),
  ).toContainText('KIT UNAVAILABLE');
  await captureViewport(page, 'build-invalid-3x.png');
  await captureProductWorld(page, 'build-invalid-world-3x.png');
  files.push('build-invalid-3x.png', 'build-invalid-world-3x.png');

  const criticalHealth = await createCriticalHealthSave(
    'world:p1-polish-001-critical-health',
  );
  await openProductReview(
    page,
    criticalHealth,
    'proz0-p1-polish-001-critical-health',
    2,
  );
  await expect(
    page.locator('[data-region="survival"] .p1-meter[data-severity="critical"]').first(),
  ).toBeVisible();
  await captureViewport(page, 'polish-critical-survival-2x.png');
  files.push('polish-critical-survival-2x.png');

  await page.keyboard.press('h');
  await expect(page.locator('.p1-product-controls-panel')).toBeVisible();
  await captureViewport(page, 'polish-controls-open-2x.png');
  files.push('polish-controls-open-2x.png');

  const nightRain = withAuthorityTick(
    normal,
    135_000,
  );
  await openProductReview(
    page,
    nightRain,
    'proz0-p1-int-001-night-rain',
    2,
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-weather-state',
    'active',
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-day-period',
    'night',
  );
  await expect(
    page.locator('[data-weather-effect="cold-rain"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-night-treatment="accepted-value-treatment"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'cold-rain-night-2x.png');
  files.push('cold-rain-night-2x.png');

  let windup = await createPredatorWindupSave(
    'world:p1-int-001-visual-windup',
  );
  windup = withLocalLoadout(
    windup,
    'visual-local',
    { spear: true },
  );
  await openProductReview(
    page,
    windup,
    'proz0-p1-int-001-windup',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="hostile"][data-predator-visual-state="ATTACK_WINDUP"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'predator-windup-2x.png');
  files.push('predator-windup-2x.png');

  await page.keyboard.press('Space');
  await expect(
    page.locator('[data-world-role="player"]'),
  ).toHaveAttribute('data-actor-state', 'SPEAR_ATTACK');
  await captureViewport(page, 'player-spear-attack-2x.png');
  files.push('player-spear-attack-2x.png');

  const dead = await createDeathSave(
    'world:p1-int-001-visual-dead',
    false,
  );
  await openProductReview(
    page,
    dead,
    'proz0-p1-int-001-dead',
    2,
  );
  await expect(
    page.locator('[data-world-role="player"]'),
  ).toHaveAttribute('data-actor-state', 'DEATH');
  await expect(
    page.locator('[data-world-role="death-cache"]'),
  ).not.toHaveCount(0);
  await captureViewport(page, 'player-death-cache-2x.png');
  files.push('player-death-cache-2x.png');

  const recovered = await createDeathSave(
    'world:p1-int-001-visual-recovery',
    true,
  );
  await openProductReview(
    page,
    recovered,
    'proz0-p1-int-001-recovery',
    2,
  );
  await expect(
    page.locator(
      '[data-world-role="death-cache"][data-death-cache-state="TARGETED"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'death-cache-targeted-2x.png');
  files.push('death-cache-targeted-2x.png');

  await page.keyboard.press('e');
  await expect(
    page.locator(
      '[data-world-role="death-cache-recovered"][data-death-cache-state="RECOVERED"]',
    ),
  ).toHaveCount(1);
  await captureViewport(page, 'death-cache-recovered-2x.png');
  files.push('death-cache-recovered-2x.png');

  const drop = await createWorldDropSave(
    'world:p1-int-001-visual-drop',
  );
  await openProductReview(
    page,
    drop,
    'proz0-p1-int-001-drop',
    2,
  );
  await expect(
    page.locator('[data-world-role="world-drop"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-world-role="world-drop-item-icon"]'),
  ).toHaveCount(1);
  await captureViewport(page, 'world-drop-item-icon-2x.png');
  files.push('world-drop-item-icon-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P1-INT-001',
    polishTask: 'P1-POLISH-001',
    evidenceKind: 'direct-phase1-product-review',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    referenceRaster: { width: 640, height: 360 },
    productionAssetFoundation: '#75-#78 accepted raster chain',
    runtime: {
      mode: 'phase1-product-review',
      canonicalAuthority: true,
      persistence: 'indexeddb-save-v2',
      qaFixture: false,
    },
    cases: {
      normalFogCoop2x: 'normal-fog-coop-2x.png',
      polishFirstEntry2x: 'polish-first-entry-2x.png',
      polishExactTarget2x: 'polish-exact-target-2x.png',
      polishNormal1x: 'polish-normal-1x.png',
      polish1363Centered2x: 'polish-1363x936-centered-2x.png',
      polishInventory2x: 'polish-inventory-2x.png',
      polishCraftHaveNeed1x: 'polish-craft-have-need-1x.png',
      polishCraftHaveNeed2x: 'polish-craft-have-need-2x.png',
      polishDualEquipment2x: 'polish-dual-equipment-2x.png',
      polishCriticalSurvival2x: 'polish-critical-survival-2x.png',
      polishControlsOpen2x: 'polish-controls-open-2x.png',
      normal3x: 'normal-3x.png',
      thermalWrap2x: 'thermal-wrap-2x.png',
      buildValid3x: 'build-valid-3x.png',
      buildValidWorld3x: 'build-valid-world-3x.png',
      buildConnector3x: 'build-connector-3x.png',
      buildConnectorWorld3x: 'build-connector-world-3x.png',
      buildInvalid3x: 'build-invalid-3x.png',
      buildInvalidWorld3x: 'build-invalid-world-3x.png',
      coldRainNight2x: 'cold-rain-night-2x.png',
      predatorWindup2x: 'predator-windup-2x.png',
      playerSpearAttack2x: 'player-spear-attack-2x.png',
      playerDeathCache2x: 'player-death-cache-2x.png',
      deathCacheTargeted2x: 'death-cache-targeted-2x.png',
      deathCacheRecovered2x: 'death-cache-recovered-2x.png',
      worldDropItemIcon2x: 'world-drop-item-icon-2x.png',
    },
    invariants: {
      directProductReviewPath: true,
      canonicalAuthority: true,
      saveV2Reopen: true,
      noQaWorldPreview: true,
      integerScale1x2x3x: true,
      centered1363x936Uses2x: true,
      survivalControlsDoNotOverlap: true,
      craftShowsAllHaveNeedAndStation: true,
      craftUsesNativeItemIcons: true,
      dualEquipmentVisible: true,
      firstActionCueBoundToProgression: true,
      firstEntryBeforeControlsShowsPlayerBaseAndCue: true,
      focusedTargetMatchesInteractionResolver: true,
      terrainAndFogFromCanonicalWorld: true,
      continuousCanonicalCellCoverage: true,
      runtimeOwnedCoopIdentitySlots: true,
      nonLexicographicIdentityRegression: true,
      acceptedRasterStateProjection: true,
    },
    files,
  };
  writeFileSync(
    resolve(EVIDENCE_DIR, 'visual-evidence-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});
