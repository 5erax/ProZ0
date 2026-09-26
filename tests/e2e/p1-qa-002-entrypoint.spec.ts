import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-qa-002-entrypoint',
);

test('bare production route launches canonical Phase 1 Product Review without query knowledge', async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const fatalErrors: string[] = [];
  const localhostRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') fatalErrors.push(message.text());
  });
  page.on('pageerror', (error) => fatalErrors.push(error.message));
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

  await page.goto('/');

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
    path: resolve(EVIDENCE_DIR, '01-bare-route-entrypoint.png'),
  });

  await Promise.all([
    page.waitForURL((url) =>
      url.searchParams.get('proz0Mode') === 'phase1-product-review'
      && url.searchParams.get('proz0Player') === 'review-player'
      && url.searchParams.get('proz0Players') === 'review-player'
      && url.searchParams.get('proz0WorldSeed') === 'phase1-product-review'
      && (url.searchParams.get('proz0WorldId')?.startsWith('review-world-') ?? false)
      && (url.searchParams.get('proz0SaveDb')?.startsWith('proz0-review-') ?? false),
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
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '02-phase1-review-started.png'),
  });

  expect(localhostRequests).toEqual([]);
  expect(fatalErrors).toEqual([]);
});

test('explicit QA Product Review query still bypasses the launcher', async ({ page }) => {
  const query = new URLSearchParams({
    proz0Mode: 'phase1-product-review',
    proz0WorldId: 'qa-entrypoint-regression',
    proz0WorldSeed: 'phase1-product-review',
    proz0Players: 'qa-player',
    proz0Player: 'qa-player',
    proz0SaveDb: 'proz0-qa-entrypoint-regression',
  });

  await page.goto('/?' + query.toString());

  const root = page.locator('[data-proz0-autoboot]');
  await expect(root).toHaveAttribute('data-runtime-status', 'ready', {
    timeout: 15_000,
  });
  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'phase1-product-review',
  );
  await expect(
    page.locator('[data-phase1-review-entrypoint]'),
  ).toHaveCount(0);
});
