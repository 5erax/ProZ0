import { expect, test } from '@playwright/test';
test('completing safe rest autosaves the colony and reopens its calendar without pressing Save', async ({ page }) => {
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:rest-autosave&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=rest-autosave');
  await page.getByRole('button', { name: 'Landing Lab · interact', exact: true }).click();
  await page.getByRole('button', { name: 'Sleep / rest · 8s', exact: true }).click();
  await expect(page.locator('.sp-expedition-panel')).toContainText('Rest started');
  await expect(page.getByRole('button', { name: 'Wake up', exact: true })).toBeVisible();
  const saved = page.locator('[data-product-review-save]');
  await expect(saved).toHaveAttribute('data-autosave-reason', 'rest', { timeout: 20000 });
  await expect(saved).toHaveAttribute('data-save-state', 'success');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-autosave-feedback]')).toBeVisible();
  const previousTick = Number(await page.locator('canvas').getAttribute('data-authority-tick'));
  expect(previousTick).toBeGreaterThanOrEqual(480);
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  const tick = Number(await page.locator('canvas').getAttribute('data-authority-tick'));
  expect(tick).toBeGreaterThanOrEqual(480);
  await expect(page.locator('canvas')).toHaveAttribute('data-calendar-day', '1');
  await expect(page.locator('[data-product-review-save]')).not.toHaveAttribute('data-autosave-reason', 'rest');
});

test('closing the rest panel cancels rest without creating an autosave checkpoint', async ({ page }) => {
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:rest-cancelled&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=rest-cancelled');
  await page.getByRole('button', { name: 'Landing Lab · interact', exact: true }).click();
  await page.getByRole('button', { name: 'Sleep / rest · 8s', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Wake up', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.getAttribute('data-authority-tick')) > 600);
  await expect(page.locator('[data-product-review-save]')).not.toHaveAttribute('data-autosave-reason', 'rest');
});
