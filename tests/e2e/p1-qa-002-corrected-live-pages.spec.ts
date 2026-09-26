import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_URL =
  process.env.P1_QA_CORRECTED_TARGET_URL ?? 'https://5erax.github.io/ProZ0/';
const EXPECTED_MAIN_SHA =
  process.env.P1_QA_EXPECTED_MAIN_SHA
  ?? '4c1e6a2732d096783f8ec8c354479fdda03d5e7d';
const EXPECTED_PAGES_RUN =
  process.env.P1_QA_EXPECTED_PAGES_RUN ?? '36243798830';
const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-qa-002-corrected-pages',
);

function sha256(input: Uint8Array | string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function verifyLiveBuildMatchesAcceptedMain(): Promise<{
  readonly indexSha256: string;
  readonly assets: readonly { readonly path: string; readonly sha256: string }[];
}> {
  const indexResponse = await fetch(new URL('index.html', TARGET_URL));
  if (!indexResponse.ok) {
    throw new Error(
      'Live index fetch failed: '
        + String(indexResponse.status)
        + ' '
        + indexResponse.statusText,
    );
  }

  const liveIndex = new Uint8Array(await indexResponse.arrayBuffer());
  const localIndex = readFileSync(resolve(process.cwd(), 'dist/index.html'));
  expect(sha256(liveIndex)).toBe(sha256(localIndex));

  const html = localIndex.toString('utf8');
  const referenced = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1]!)
    .filter((path) => path.includes('/assets/'));

  const assets: { path: string; sha256: string }[] = [];
  for (const path of referenced) {
    const liveResponse = await fetch(new URL(path, TARGET_URL));
    if (!liveResponse.ok) {
      throw new Error(
        'Live asset fetch failed: '
          + path
          + ' -> '
          + String(liveResponse.status),
      );
    }
    const liveBytes = new Uint8Array(await liveResponse.arrayBuffer());
    const localPath = path.replace(/^\/ProZ0\//, '');
    const localBytes = readFileSync(resolve(process.cwd(), 'dist', localPath));
    const liveHash = sha256(liveBytes);
    expect(liveHash).toBe(sha256(localBytes));
    assets.push({ path, sha256: liveHash });
  }

  return Object.freeze({
    indexSha256: sha256(liveIndex),
    assets: Object.freeze(assets),
  });
}

function observeBrowser(page: Page, diagnostics: {
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  localhostRequests: string[];
}): void {
  page.on('pageerror', (error) => diagnostics.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    diagnostics.failedRequests.push(
      request.url() + ' :: ' + (request.failure()?.errorText ?? 'unknown'),
    );
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname === '0.0.0.0'
    ) {
      diagnostics.localhostRequests.push(url.toString());
    }
  });
}

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

test('corrected public Pages bare route reaches canonical Product Review', async ({ page }) => {
  test.setTimeout(120_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const buildIdentity = await verifyLiveBuildMatchesAcceptedMain();
  const diagnostics = {
    pageErrors: [] as string[],
    consoleErrors: [] as string[],
    failedRequests: [] as string[],
    localhostRequests: [] as string[],
  };
  observeBrowser(page, diagnostics);

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  const root = page.locator('[data-proz0-autoboot]');
  const entrypoint = page.locator('[data-phase1-review-entrypoint="ready"]');
  const start = page.locator('[data-start-phase1-review="true"]');

  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'phase1-review-entrypoint',
  );
  await expect(root).toHaveAttribute('data-runtime-status', 'entrypoint');
  await expect(entrypoint).toBeVisible();
  await expect(start).toHaveText('START PHASE 1 REVIEW');
  await expect(page.locator('#proz0-canvas')).toHaveCount(0);

  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '01-live-bare-route-entrypoint.png'),
  });

  await Promise.all([
    page.waitForURL((url) =>
      url.searchParams.get('proz0Mode') === 'phase1-product-review'
      && url.searchParams.get('proz0Player') === 'review-player'
      && url.searchParams.get('proz0Players') === 'review-player'
      && url.searchParams.get('proz0WorldSeed') === 'phase1-product-review'
      && (url.searchParams.get('proz0WorldId')?.startsWith('review-world-') ?? false)
      && (url.searchParams.get('proz0SaveDb')?.startsWith('proz0-review-') ?? false),
      { timeout: 15_000 },
    ),
    start.click(),
  ]);

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
    'false',
  );
  await expect(
    page.locator('[data-product-review-world="canonical"]'),
  ).toHaveCount(1);
  await expect(page.locator('[data-production-world-preview]')).toHaveCount(0);

  const canvas = page.locator('#proz0-canvas');
  const initialTick = Number(await canvas.getAttribute('data-authority-tick'));
  await expect.poll(
    async () => Number(await canvas.getAttribute('data-authority-tick')),
    { timeout: 5_000 },
  ).toBeGreaterThan(initialTick);

  const startX = Number(await canvas.getAttribute('data-player-x'));
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  await expect.poll(
    async () => Number(await canvas.getAttribute('data-player-x')),
    { timeout: 5_000 },
  ).toBeGreaterThan(startX);

  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '02-live-product-review-started.png'),
  });

  expect(diagnostics.localhostRequests).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);

  const liveUrl = new URL(page.url());
  const manifest = {
    schemaVersion: 1,
    task: 'P1-QA-002',
    evidenceKind: 'corrected-live-pages-base-route-browser-verification',
    exactAcceptedMainSha: EXPECTED_MAIN_SHA,
    pagesRunId: EXPECTED_PAGES_RUN,
    targetUrl: TARGET_URL,
    buildIdentity,
    browser: {
      engine: 'chromium',
      viewport: '1280x720',
      bareRouteEntrypointVisible: true,
      productReviewLaunchReady: true,
      runtimeMode: 'phase1-product-review',
      canonicalAuthority: true,
      persistence: 'indexeddb-save-v2',
      qaFixtureAbsent: true,
      authorityTickAdvanced: true,
      movementObserved: true,
    },
    generatedReviewIdentity: {
      worldId: liveUrl.searchParams.get('proz0WorldId'),
      saveDatabase: liveUrl.searchParams.get('proz0SaveDb'),
      worldSeed: liveUrl.searchParams.get('proz0WorldSeed'),
      player: liveUrl.searchParams.get('proz0Player'),
    },
    diagnostics,
    screenshots: [
      '01-live-bare-route-entrypoint.png',
      '02-live-product-review-started.png',
    ],
  };

  writeFileSync(
    resolve(EVIDENCE_DIR, 'corrected-pages-browser-evidence.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});
