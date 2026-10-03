import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { walk } from './support/solo-actions';

test('resource sizes: fresh-world hover yield matches actual harvest and survives save/reopen', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:size-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=size-ui');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  const quantity = async () => {
    await page.keyboard.press('i');
    const row = page.locator('[data-panel-kind="inventory"]').getByRole('button', { name: 'Plant Fiber', exact: true });
    const n = await row.count() ? Number((await row.textContent())?.match(/×(\d+)/)?.[1]) : 0;
    await page.keyboard.press('Escape'); return n;
  };
  const before = await quantity();
  await walk(page, 18, 10);
  const target = page.locator('[data-world-role="resource"][data-focused-target="true"]');
  await expect(target).toHaveAttribute('aria-label', 'Gather Fiber Plant');
  const identity = await target.getAttribute('data-world-id'), size = await target.getAttribute('data-resource-size'), title = await target.getAttribute('title');
  expect(['small', 'medium', 'large']).toContain(size);
  const yieldCount = Number(title?.match(/· (\d+) Plant Fiber/)?.[1]); expect(yieldCount).toBeGreaterThan(0);
  await target.click();
  const interaction = page.locator('[data-region="interaction"]');
  await expect(interaction).toHaveAttribute('data-state', 'CHANNELING');
  await expect(interaction).toHaveAttribute('data-state', 'AVAILABLE', { timeout: 5000 });
  expect(await quantity()).toBe(before + yieldCount);
  mkdirSync('test-results/resource-size', { recursive: true });
  await page.screenshot({ path: 'test-results/resource-size/world.png' });
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await expect(page.locator('[data-world-id="' + identity + '"][data-world-role="resource"]')).toHaveAttribute('data-resource-size', size!);
  expect(await quantity()).toBe(before + yieldCount);
});
