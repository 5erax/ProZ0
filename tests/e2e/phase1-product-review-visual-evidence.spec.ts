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
  scale: 2 | 3,
  localPlayerId = 'visual-local',
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
    proz0Players: bundle.players
      .map((player) => player.playerId)
      .join(','),
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

test.use({ deviceScaleFactor: 1 });

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
  );
  await expect(
    page.locator('[data-world-role="terrain"][data-exploration-state="EXPLORED"]'),
  ).not.toHaveCount(0);
  await expect(page.locator('[data-world-role="fog"]')).not.toHaveCount(0);
  const terrainCoverage = await page.locator(
    '[data-world-role="terrain"]',
  ).evaluateAll((nodes) => {
    const boxes = nodes.map((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      const scale = Number(
        document.querySelector('#proz0-canvas')
          ?.getAttribute('data-display-scale') ?? '1',
      );
      return {
        left: rect.left / scale,
        top: rect.top / scale,
        width: rect.width / scale,
        height: rect.height / scale,
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
    .toHaveCSS('width', '128px');
  await expect(page.locator('[data-world-role="fog"]').first())
    .toHaveCSS('height', '128px');

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

  await captureViewport(page, 'normal-fog-coop-2x.png');
  files.push('normal-fog-coop-2x.png');

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
      integerScale2x3x: true,
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
