import { expect, test, type Page } from '@playwright/test';

async function walkTo(page: Page, x: number, y: number): Promise<void> {
  const canvas = page.locator('canvas');
  for (let step = 0; step < 300; step += 1) {
    const position = await canvas.evaluate(element => ({
      x: Number(element.getAttribute('data-player-x')),
      y: Number(element.getAttribute('data-player-y')),
    }));
    const dx = x - position.x; const dy = y - position.y;
    if (Math.hypot(dx, dy) <= 0.65) return;
    const keys = Math.abs(dx) >= Math.abs(dy)
      ? (dx > 0 ? ['s', 'd'] : ['w', 'a'])
      : (dy > 0 ? ['s', 'a'] : ['w', 'd']);
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(100);
    for (const key of keys.toReversed()) await page.keyboard.up(key);
  }
  throw new Error('Normal movement did not reach ' + String(x) + ',' + String(y));
}

test('new world: normal gather, mouse craft, storage construction and save without grants', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?' + new URLSearchParams({
    proz0Mode: 'phase1-product-review', proz0WorldId: 'world:new-base-loop',
    proz0WorldSeed: 'p1-world-golden', proz0Players: 'builder', proz0Player: 'builder',
    proz0SaveDb: 'new-base-loop-db',
  }).toString());
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'false');
  const interaction = page.locator('[data-region="interaction"]');
  await walkTo(page, 18, 10);
  await expect(interaction).toContainText('Fiber Plant');
  for (let count = 0; count < 3; count += 1) {
    await page.keyboard.press('e');
    await expect(interaction).toHaveAttribute('data-state', 'CHANNELING');
    await expect(interaction).toHaveAttribute('data-state', 'AVAILABLE', { timeout: 3_000 });
  }
  await page.getByRole('button', { name: 'Craft [C]', exact: true }).click();
  for (let count = 0; count < 2; count += 1) await page.locator('[data-review-action="craft-recipe:recipe:cordage"]').click();
  await page.keyboard.press('Escape');
  await walkTo(page, -36, -12);
  await expect(interaction).toContainText('Timber Source');
  for (let count = 0; count < 4; count += 1) {
    await page.keyboard.press('e');
    await expect(interaction).toHaveAttribute('data-state', 'CHANNELING');
    await expect(interaction).toHaveAttribute('data-state', 'AVAILABLE', { timeout: 3_000 });
  }
  await walkTo(page, -4, 0);
  await page.getByRole('button', { name: 'Build base [B]', exact: true }).click();
  await page.getByRole('button', { name: 'Select Storage Crate', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare kit', exact: true }).click();
  await page.locator('[data-review-action="craft-recipe:recipe:storage-crate-kit"]').click();
  await page.getByRole('button', { name: 'Build base [B]', exact: true }).click();
  const position = await page.locator('canvas').evaluate(element => ({
    x: Number(element.getAttribute('data-player-x')), y: Number(element.getAttribute('data-player-y')),
  }));
  await page.mouse.move((320 + (-3 - position.x + position.y) * 16) * 2,
    (180 + (-3 - position.x - position.y) * 8) * 2);
  await expect(page.locator('.p1-build-preview')).toHaveAttribute('data-placement-state', 'VALID');
  await page.getByRole('button', { name: 'Place [Enter]', exact: true }).click();
  await expect(page.locator('[data-structure-id="structure:storage-crate"]')).toHaveAttribute('data-built-count', '1');
  await expect(page.locator('[data-structure-id="structure:storage-crate"]')).toHaveAttribute('data-available-kit-count', '0');
  await page.keyboard.press('Escape');
  await page.keyboard.press('l');
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload();
  await expect(page.locator('[data-world-role="structure"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Build base [B]', exact: true }).click();
  await expect(page.locator('[data-structure-id="structure:storage-crate"]')).toHaveAttribute('data-built-count', '1');
});
