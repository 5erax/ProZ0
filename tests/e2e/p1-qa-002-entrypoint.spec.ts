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

  page.on('console', (message) => {
    if (message.type() === 'error') fatalErrors.push(message.text());
  });
  page.on('pageerror', (error) => fatalErrors.push(error.message));

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

  const hiddenLocalhostDependencies = await page.evaluate(() => {
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    return performance.getEntriesByType('resource')
      .map((entry) => new URL(entry.name))
      .filter((url) =>
        localHosts.has(url.hostname)
        && url.origin !== window.location.origin,
      )
      .map((url) => url.toString());
  });
  expect(hiddenLocalhostDependencies).toEqual([]);
  expect(fatalErrors).toEqual([]);
});

test('player can return from the bare launcher to the last committed world, not an unsaved new world', async ({ page }) => {
  await page.goto('/');
  const resume = page.locator('[data-continue-phase1-review]');
  await expect(resume).toHaveCount(0);
  await page.locator('[data-start-phase1-review]').click();
  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');
  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  const savedUrl = page.url();
  await page.keyboard.down('s');
  await expect.poll(async () => Number(await canvas.getAttribute('data-player-y')))
    .toBeGreaterThan(1);
  await page.keyboard.up('s');
  await page.keyboard.press('i');
  const save = page.locator('[data-product-review-save]');
  await page.keyboard.press('l');
  await expect(save).toHaveAttribute('data-save-state', 'success');
  await expect(save.locator('[role="status"]')).toBeVisible();
  await expect(save).toContainText('World saved');
  const savedY = Number(await canvas.getAttribute('data-player-y'));
  await page.goto('/');
  await expect(resume).toHaveAttribute('href', savedUrl);
  await resume.click();
  await expect(root).toHaveAttribute('data-product-review-reopened', 'true');
  expect(Number(await canvas.getAttribute('data-player-y'))).toBeCloseTo(savedY, 5);
  await page.keyboard.down('s');
  await expect.poll(async () => Number(await canvas.getAttribute('data-player-y')))
    .toBeGreaterThan(savedY + 1);
  await page.keyboard.up('s');
  await page.keyboard.press('l');
  await expect(save).toHaveAttribute('data-save-state', 'success');
  const secondSavedY = Number(await canvas.getAttribute('data-player-y'));
  await page.goto('/');
  await resume.click();
  await expect(root).toHaveAttribute('data-product-review-reopened', 'true');
  expect(Number(await canvas.getAttribute('data-player-y'))).toBeCloseTo(secondSavedY, 5);
  await page.goto('/');
  await page.locator('[data-start-phase1-review]').click();
  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  expect(page.url()).not.toBe(savedUrl);
  await expect(root).toHaveAttribute('data-product-review-reopened', 'false');
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (stores, mode, options) {
      if (mode === 'readwrite') throw new DOMException('Test storage failure', 'QuotaExceededError');
      return original.call(this, stores, mode, options);
    };
  });
  await page.keyboard.press('i');
  await page.keyboard.press('l');
  await expect(save).toHaveAttribute('data-save-state', 'failure');
  await expect(save.locator('[role="status"]')).toBeVisible();
  await expect(save).toContainText('not durable');
  await page.goto('/');
  await expect(resume).toHaveAttribute('href', savedUrl);
});

test('blocked navigation storage does not turn a committed save into a failure', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto('/');
  await page.locator('[data-start-phase1-review]').click();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await page.keyboard.press('l');
  const save = page.locator('[data-product-review-save]');
  await expect(save).toHaveAttribute('data-save-state', 'success');
  await expect(save).toContainText('bookmark this page');
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'true');
  await page.goto('/');
  await expect(page.locator('[data-continue-phase1-review]')).toHaveCount(0);
});

test('launcher rejects malformed or off-site saved navigation records', async ({ page }) => {
  await page.goto('/');
  for (const value of ['not a review', 'https://example.com/?proz0Mode=phase1-product-review', 'javascript:alert(1)']) {
    await page.evaluate((entry) => localStorage.setItem('proz0:last-saved-review:v1', entry), value);
    await page.reload();
    await expect(page.locator('[data-continue-phase1-review]')).toHaveCount(0);
    await expect(page.locator('[data-start-phase1-review]')).toBeEnabled();
  }
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
