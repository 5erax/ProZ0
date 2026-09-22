import { expect, test } from '@playwright/test';

test('production browser build boots without fatal console errors', async ({ page }) => {
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
  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(page.locator('#proz0-canvas')).toBeVisible();

  expect(fatalErrors).toEqual([]);
});
