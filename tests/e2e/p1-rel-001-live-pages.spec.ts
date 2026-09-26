import { expect, test, type Page } from '@playwright/test';
import {
  createHash,
} from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';
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

const TARGET_URL =
  process.env.P1_REL_TARGET_URL ?? 'https://5erax.github.io/ProZ0/';
const EXPECTED_ACCEPTED_MAIN =
  process.env.P1_REL_EXPECTED_SHA
  ?? '7a566d29b631f24b608f6661267be2ed786f265f';
const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-rel-001-live-browser',
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

function sha256(input: Uint8Array | string): string {
  return createHash('sha256').update(input).digest('hex');
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

function validateSave(
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
      'Release evidence Save V2 failed validation: '
        + validation.code + ': ' + validation.message,
    );
  }
  return bundle;
}

async function createCanonicalSave(
  worldId: string,
  players: readonly PlayerSeed[],
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
    return validateSave(
      portableBundle(composePhase1SaveV2(authority, { nowUtc: NOW_UTC })),
    );
  } finally {
    await authority.destroy();
  }
}

function productReviewUrl(input: {
  readonly worldId: string;
  readonly players: readonly string[];
  readonly localPlayerId: string;
  readonly databaseName: string;
}): string {
  const url = new URL(TARGET_URL);
  url.search = new URLSearchParams({
    proz0Mode: 'phase1-product-review',
    proz0WorldId: input.worldId,
    proz0WorldSeed: WORLD_SEED,
    proz0Players: input.players.join(','),
    proz0Player: input.localPlayerId,
    proz0SaveDb: input.databaseName,
  }).toString();
  return url.toString();
}

async function clearDatabase(
  page: Page,
  databaseName: string,
): Promise<void> {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (dbName) => {
    await new Promise<void>((resolveDelete) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolveDelete();
      request.onerror = () => resolveDelete();
      request.onblocked = () => resolveDelete();
    });
  }, databaseName);
}

async function seedIndexedDb(
  page: Page,
  databaseName: string,
  bundle: PortableSaveBundleV2,
): Promise<void> {
  await clearDatabase(page, databaseName);
  await page.evaluate(
    async ({ dbName, save }) => {
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
          request.error ?? new Error('IndexedDB release evidence open failed.'),
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
        for (const player of save.players) transaction.objectStore('players').put(player);
        for (const container of save.containers) transaction.objectStore('containers').put(container);
        for (const chunk of save.chunks) transaction.objectStore('chunks').put(chunk);
        for (const foothold of save.footholds) transaction.objectStore('footholds').put(foothold);
        for (const structure of save.structures) transaction.objectStore('structures').put(structure);
        transaction.oncomplete = () => resolveTx();
        transaction.onerror = () => rejectTx(
          transaction.error ?? new Error('IndexedDB release evidence write failed.'),
        );
        transaction.onabort = () => rejectTx(
          transaction.error ?? new Error('IndexedDB release evidence write aborted.'),
        );
      });
      database.close();
    },
    { dbName: databaseName, save: bundle },
  );
}

async function worldRecordCount(
  page: Page,
  databaseName: string,
): Promise<number> {
  return page.evaluate(async (dbName) => {
    return new Promise<number>((resolveCount, rejectCount) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('worlds')) {
          database.close();
          resolveCount(0);
          return;
        }
        const transaction = database.transaction('worlds', 'readonly');
        const count = transaction.objectStore('worlds').count();
        count.onsuccess = () => {
          database.close();
          resolveCount(count.result);
        };
        count.onerror = () => {
          database.close();
          rejectCount(count.error ?? new Error('IndexedDB count failed.'));
        };
      };
      request.onerror = () => rejectCount(
        request.error ?? new Error('IndexedDB count open failed.'),
      );
    });
  }, databaseName);
}

async function waitReady(
  page: Page,
  reopened: 'true' | 'false',
): Promise<void> {
  const root = page.locator('[data-proz0-autoboot]');
  await expect(root).toHaveAttribute('data-runtime-status', 'ready', {
    timeout: 15_000,
  });
  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'phase1-product-review',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-authority',
    'canonical',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-persistence',
    'indexeddb-save-v2',
  );
  await expect(root).toHaveAttribute(
    'data-product-review-reopened',
    reopened,
  );
  await expect(
    page.locator('[data-product-review-world="canonical"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-production-world-preview]')).toHaveCount(0);
}

async function verifyLiveBuildMatchesLocalDist(): Promise<{
  readonly indexSha256: string;
  readonly assets: readonly {
    readonly path: string;
    readonly sha256: string;
  }[];
}> {
  const liveIndexUrl = new URL('index.html', TARGET_URL);
  const response = await fetch(liveIndexUrl);
  if (!response.ok) {
    throw new Error(
      'Live Pages index fetch failed: '
        + String(response.status) + ' ' + response.statusText,
    );
  }
  const liveIndex = new Uint8Array(await response.arrayBuffer());
  const localIndex = readFileSync(resolve(process.cwd(), 'dist/index.html'));
  expect(sha256(liveIndex)).toBe(sha256(localIndex));

  const html = localIndex.toString('utf8');
  const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1]!)
    .filter((path) => path.includes('/assets/'));

  const assets: { path: string; sha256: string }[] = [];
  for (const path of paths) {
    const liveAssetResponse = await fetch(new URL(path, TARGET_URL));
    if (!liveAssetResponse.ok) {
      throw new Error(
        'Live Pages asset fetch failed: '
          + path + ' -> ' + String(liveAssetResponse.status),
      );
    }
    const liveBytes = new Uint8Array(await liveAssetResponse.arrayBuffer());
    const localRelative = path.replace(/^\/ProZ0\//, '');
    const localBytes = readFileSync(resolve(process.cwd(), 'dist', localRelative));
    const liveHash = sha256(liveBytes);
    expect(liveHash).toBe(sha256(localBytes));
    assets.push({ path, sha256: liveHash });
  }

  return Object.freeze({
    indexSha256: sha256(liveIndex),
    assets: Object.freeze(assets),
  });
}

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

test('P1-REL-001 live Pages browser startup, slice smoke, reopen and reset evidence', async ({ browser }) => {
  test.setTimeout(180_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const buildIdentity = await verifyLiveBuildMatchesLocalDist();

  const browserContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const localhostRequests: string[] = [];
  const observe = (page: Page): void => {
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      failedRequests.push(
        request.url() + ' :: ' + (request.failure()?.errorText ?? 'unknown'),
      );
    });
    page.on('request', (request) => {
      const hostname = new URL(request.url()).hostname;
      if (
        hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '0.0.0.0'
      ) {
        localhostRequests.push(request.url());
      }
    });
  };

  const worldId = 'world:p1-rel-001-live-browser';
  const dbName = 'proz0-p1-rel-001-live-browser';
  const players = Object.freeze(['release-local', 'release-zeta']);
  let page = await browserContext.newPage();
  observe(page);
  await clearDatabase(page, dbName);

  const newWorldUrl = productReviewUrl({
    worldId,
    players,
    localPlayerId: 'release-local',
    databaseName: dbName,
  });
  await page.goto(newWorldUrl, { waitUntil: 'networkidle' });
  await waitReady(page, 'false');

  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');
  const initialTick = Number(await canvas.getAttribute('data-authority-tick'));
  await expect.poll(
    async () => Number(await canvas.getAttribute('data-authority-tick')),
    { timeout: 5_000 },
  ).toBeGreaterThan(initialTick);

  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '01-startup-new-world.png'),
  });

  const startX = Number(await canvas.getAttribute('data-player-x'));
  const startY = Number(await canvas.getAttribute('data-player-y'));
  await page.keyboard.down('d');
  await page.waitForTimeout(450);
  await page.keyboard.up('d');
  await page.waitForTimeout(250);
  const movedX = Number(await canvas.getAttribute('data-player-x'));
  const movedY = Number(await canvas.getAttribute('data-player-y'));
  expect(
    Math.abs(movedX - startX) + Math.abs(movedY - startY),
  ).toBeGreaterThan(0.01);

  await page.keyboard.press('h');
  await expect(
    page.locator('[data-product-review-controls="open"]'),
  ).toHaveCount(1);
  const controlsText =
    await page.locator('[aria-label="Product Review controls"]').innerText();
  await page.keyboard.press('h');

  await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="inventory"]')).toHaveCount(1);
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '02-inventory-smoke.png'),
  });
  await page.keyboard.press('Escape');

  await page.keyboard.press('b');
  await expect(page.locator('[data-panel-kind="build"]')).toHaveCount(1);
  await expect(page.locator('[data-world-role="build-preview"]')).toHaveCount(1);
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '03-build-preview-smoke.png'),
  });
  await page.keyboard.press('Escape');

  await page.keyboard.press('m');
  await expect(page.locator('[data-panel-kind="map"]')).toHaveCount(1);
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '04-map-smoke.png'),
  });
  await page.keyboard.press('Escape');

  const liveWorldRecordsAfterSmoke = await worldRecordCount(page, dbName);

  await page.close();

  const canonicalSave = await createCanonicalSave(
    worldId,
    Object.freeze([
      Object.freeze({
        playerId: 'release-local',
        x: 1.25,
        y: 0.75,
        facing: 'E' as const,
      }),
      Object.freeze({
        playerId: 'release-zeta',
        x: -1.25,
        y: 0.75,
        facing: 'W' as const,
      }),
    ]),
  );

  page = await browserContext.newPage();
  observe(page);
  await seedIndexedDb(page, dbName, canonicalSave);
  await page.goto(newWorldUrl, { waitUntil: 'networkidle' });
  await waitReady(page, 'true');
  await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="inventory"]')).toHaveCount(1);
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '05-canonical-save-reopen.png'),
  });
  await page.close();

  page = await browserContext.newPage();
  observe(page);
  await clearDatabase(page, dbName);
  await page.goto(newWorldUrl, { waitUntil: 'networkidle' });
  await waitReady(page, 'false');
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '06-reset-recreate.png'),
  });

  const finalRootStatus = await root.count() === 0
    ? await page.locator('[data-proz0-autoboot]')
      .getAttribute('data-runtime-status')
    : await root.getAttribute('data-runtime-status');

  expect(localhostRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);

  const evidence = {
    schemaVersion: 1,
    task: 'P1-REL-001',
    evidenceKind: 'live-github-pages-browser-verification',
    targetUrl: TARGET_URL,
    expectedAcceptedMainSha: EXPECTED_ACCEPTED_MAIN,
    buildIdentity,
    browser: {
      engine: 'chromium',
      desktopViewport: '1280x720',
      startupRuntimeStatus: 'ready',
      runtimeMode: 'phase1-product-review',
      authority: 'canonical',
      persistence: 'indexeddb-save-v2',
      initialNewWorldReopened: false,
      canonicalSeededSaveReopened: true,
      resetRecreatedNewWorld: true,
      finalRuntimeStatus: finalRootStatus,
    },
    verticalSliceSmoke: {
      authorityTickAdvanced: true,
      movementAdvanced: true,
      inventoryPanel: true,
      buildPreview: true,
      mapPanel: true,
    },
    network: {
      localhostRequests,
      failedRequests,
      pageErrors,
      consoleErrors,
    },
    saveReopenReset: {
      liveWorldRecordsAfterSmoke,
      playerAccessibleSaveControlObserved:
        /\bSAVE\b|\bCHECKPOINT\b/i.test(controlsText),
      canonicalSaveV2SeededThroughBrowserStorage: true,
      reopenedFromCanonicalSaveV2: true,
      resetByDeletingReviewDatabase: true,
      recreatedAfterReset: true,
    },
    screenshots: [
      '01-startup-new-world.png',
      '02-inventory-smoke.png',
      '03-build-preview-smoke.png',
      '04-map-smoke.png',
      '05-canonical-save-reopen.png',
      '06-reset-recreate.png',
    ],
  };
  writeFileSync(
    resolve(EVIDENCE_DIR, 'release-browser-evidence.json'),
    JSON.stringify(evidence, null, 2) + '\n',
    'utf8',
  );

  await browserContext.close();
});
