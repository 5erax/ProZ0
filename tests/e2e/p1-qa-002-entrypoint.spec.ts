import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/pilot/auth/me', route => route.fulfill({ json: { account: null } }));
});

const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-qa-002-entrypoint',
);

test('bare lobby launches a new solo colony with a skippable arrival', async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const fatalErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') fatalErrors.push(message.text());
  });
  page.on('pageerror', (error) => fatalErrors.push(error.message));

  await page.goto('/');

  const root = page.locator('[data-proz0-autoboot]');
  const entrypoint = page.locator('[data-game-lobby="ready"]');
  const start = page.locator('[data-start-phase2-review="true"]');

  await expect(root).toHaveAttribute(
    'data-runtime-mode',
    'game-lobby',
  );
  await expect(root).toHaveAttribute('data-runtime-status', 'entrypoint');
  await expect(entrypoint).toBeVisible();
  await expect(start).toHaveText('Bắt đầu thế giới mới');
  await expect(page.locator('#proz0-canvas')).toHaveCount(0);
  await page.screenshot({
    path: resolve(EVIDENCE_DIR, '01-bare-route-entrypoint.png'),
  });

  await Promise.all([
    page.waitForURL((url) =>
      url.searchParams.get('proz0Mode') === 'phase2-colony-review'
      && url.searchParams.get('proz0Player') === 'review-player'
      && url.searchParams.get('proz0Players') === 'review-player'
      && !!url.searchParams.get('proz0WorldSeed')
      && (url.searchParams.get('proz0WorldId')?.startsWith('world-') ?? false)
      && (url.searchParams.get('proz0SaveDb')?.startsWith('proz0-world-') ?? false),
    ),
    start.click(),
  ]);
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();

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
  await page.locator('[data-start-phase2-review]').click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.p1-product-save-box')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.p1-product-save-box')).toContainText('World saved');
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
  await page.locator('[data-start-phase2-review]').click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.p1-product-save-box')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.p1-product-save-box')).toContainText('not durable');
  await page.goto('/');
  await expect(resume).toHaveAttribute('href', savedUrl);
});

test('blocked navigation storage does not turn a committed save into a failure', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto('/');
  await page.locator('[data-start-phase2-review]').click();
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await page.keyboard.press('l');
  const save = page.locator('[data-product-review-save]');
  await expect(save).toHaveAttribute('data-save-state', 'success');
  await expect(page.locator('.p1-product-save-box')).toContainText('bookmark this page');
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
    await expect(page.locator('[data-start-phase2-review]')).toBeEnabled();
  }
});

test('skin reaches the solo world, keyboard completes arrival, and save-and-exit returns to a usable lobby', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skin', exact: true }).click();
  await page.getByRole('button', { name: 'Azure', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Azure', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Single Player', exact: true }).click();
  await page.locator('[data-start-phase2-review]').click();
  await expect(page.getByRole('dialog', { name: 'Đặt chân đến ProZ0' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await expect(page.locator('[data-skin="azure"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu và về sảnh', exact: true }).click();
  await expect(page.locator('[data-game-lobby="ready"]')).toBeVisible();
  await page.locator('[data-continue-phase1-review]').click();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'true');
  await expect(page.locator('.proz0-arrival')).toHaveCount(0);
});

test('lobby navigation and sign-in remain accessible on small and wide displays', async ({ page }) => {
  for (const width of [640, 1280, 1920]) {
    await page.setViewportSize({ width, height: width === 640 ? 360 : 720 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Multiplayer', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByLabel('Tên đăng nhập', { exact: true })).toBeVisible();
    await page.screenshot({ path: resolve(EVIDENCE_DIR, 'lobby-login-' + width + '.png'), fullPage: true });
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
    page.locator('[data-game-lobby]'),
  ).toHaveCount(0);
});
