import { expect, test } from '@playwright/test';

test('production browser build boots and moves without fatal console errors', async ({ page }) => {
  const fatalErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      fatalErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    fatalErrors.push(error.message);
  });

  await page.goto('/');

  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(canvas).toBeVisible();

  const startX = Number(await canvas.getAttribute('data-player-x'));

  await page.keyboard.down('d');
  await expect.poll(async () => Number(await canvas.getAttribute('data-player-x')))
    .toBeGreaterThan(startX);
  await page.keyboard.up('d');

  await page.waitForTimeout(60);
  const stoppedX = Number(await canvas.getAttribute('data-player-x'));
  await page.waitForTimeout(80);
  const settledX = Number(await canvas.getAttribute('data-player-x'));

  expect(settledX).toBeCloseTo(stoppedX, 5);
  expect(fatalErrors).toEqual([]);
});
