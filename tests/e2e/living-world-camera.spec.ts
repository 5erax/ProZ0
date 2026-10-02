import { expect, test } from '@playwright/test';

test('living plants share the terrain raster anchor through continuous camera motion and resize', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?' + new URLSearchParams({ proz0Mode: 'phase2-colony-review', proz0WorldId: 'world:camera-anchoring', proz0WorldSeed: 'p1-world-golden', proz0Players: 'solo', proz0Player: 'solo', proz0SaveDb: 'camera-anchoring' }));
  const plant = page.locator('.lw-object[data-living-role="forage"]').first();
  await expect(plant).toBeVisible();
  const id = await plant.getAttribute('data-living-id');
  const retained = page.locator('.lw-object[data-living-id="' + id + '"]');
  const before = await retained.evaluate(element => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top, stage: !!element.closest('.p1-product-world-stage') }));
  expect(before.stage).toBe(true);
  const cameraBefore = await page.locator('.p1-product-world-stage').evaluate(element => (element as HTMLElement).style.transform);
  await expect(page.locator('[data-world-role="player"]')).toHaveCSS('z-index', '100000');
  for (const direction of ['d', 's', 'a', 'w']) {
    await page.keyboard.down(direction);
    const anchors = await retained.evaluate(async element => {
      const samples: string[] = [];
      for (let i = 0; i < 12; i++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const node = element as HTMLElement;
        samples.push(node.style.left + ':' + node.style.top);
      }
      return samples;
    });
    await page.keyboard.up(direction);
    expect(new Set(anchors)).toEqual(new Set([before.left + ':' + before.top]));
  }
  const stableOrder = await page.locator('.p1-product-world-stage').evaluate(async stage => {
    const plant = stage.querySelector<HTMLElement>('.lw-object[data-living-role="forage"]');
    const lab = stage.querySelector<HTMLElement>('[data-world-role="structure"][data-world-id="structure-instance:landing-module"]');
    if (!plant || !lab) throw Error('Missing static plant/lab anchors');
    const differences: number[] = [];
    for (let i = 0; i < 8; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      differences.push(Number(getComputedStyle(plant).zIndex) - Number(getComputedStyle(lab).zIndex));
    }
    return differences;
  });
  expect(new Set(stableOrder).size).toBe(1);
  await page.keyboard.down('d');
  await page.keyboard.down('s');
  await page.waitForTimeout(250);
  await page.keyboard.up('d');
  await page.keyboard.up('s');
  expect(await page.locator('.p1-product-world-stage').evaluate(element => (element as HTMLElement).style.transform)).not.toBe(cameraBefore);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(retained).toBeVisible();
  expect(await retained.evaluate(element => ({ left: (element as HTMLElement).style.left, top: (element as HTMLElement).style.top }))).toEqual({ left: before.left, top: before.top });
  await retained.click();
  await expect(page.locator('.lw-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  const prevented = await retained.evaluate(element => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    element.dispatchEvent(event); return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await page.screenshot({ path: 'test-results/living-camera-world.png' });
  expect(errors).toEqual([]);
});

test('secondary click cancels a solo blueprint placement without placing or consuming materials', async ({ page }) => {
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:secondary-click&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=secondary-click');
  await page.getByRole('button', { name: 'Build base [B]', exact: true }).click();
  await page.getByRole('button', { name: 'Expedition blueprints · materials later', exact: true }).click();
  const panel = page.locator('.sp-expedition-panel');
  await panel.locator('article').filter({ has: page.getByText('Campfire', { exact: true }) }).getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(page.locator('.sp-placement-hint')).toBeVisible();
  await page.locator('canvas').click({ button: 'right', position: { x: 200, y: 180 }, force: true });
  await expect(page.locator('.sp-placement-hint')).toBeHidden();
  await expect(page.locator('.sp-ghost')).toBeHidden();
  expect(await page.locator('[data-plan-id]').count()).toBe(0);
});
