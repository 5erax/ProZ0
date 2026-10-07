import { expect, test, type Page } from '@playwright/test';
import { walk } from './support/solo-actions';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
async function ground(page: Page, x: number, y: number) {
  const pt = await page.locator('canvas').evaluate(
    (e, p) => {
      const r = e.getBoundingClientRect(),
        px = Number(e.getAttribute('data-player-x')),
        py = Number(e.getAttribute('data-player-y'));
      return {
        x: r.left + ((320 + (p.x - px - p.y + py) * 16) * r.width) / 640,
        y: r.top + ((180 + (p.x - px + p.y - py) * 8) * r.height) / 360,
      };
    },
    { x, y },
  );
  await page.mouse.click(pt.x, pt.y);
}
test('living world: natural materials craft a hoe, plant remote soil, observe growth and preserve crops through save/reopen', async ({
  page,
}) => {
  test.setTimeout(360000);
  page.setDefaultTimeout(30000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const url =
    '/?' +
    new URLSearchParams({
      proz0Mode: 'phase2-colony-review',
      proz0WorldId: 'world:living-natural',
      proz0WorldSeed: 'p1-world-golden',
      proz0Players: 'solo',
      proz0Player: 'solo',
      proz0SaveDb: 'living-natural',
    });
  await page.goto(url);
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute(
    'data-runtime-status',
    'ready',
  );
  await expect(page.locator('.lw-season')).toContainText('Spring');
  await page
    .getByRole('button', { name: 'Landing Lab · interact', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Emergency supplies · once', exact: true })
    .click();
  await page.keyboard.press('Escape');
  const interaction = page.locator('[data-region="interaction"]');
  const gather = async () => {
    await page.keyboard.press('e');
    await expect(interaction).toHaveAttribute('data-state', 'CHANNELING');
    await expect(interaction).toHaveAttribute('data-state', 'AVAILABLE', {
      timeout: 5000,
    });
  };
  await walk(page, -36, -12);
  await gather();
  await gather();
  await walk(page, 48, 24);
  await gather();
  await page
    .getByRole('button', { name: 'Build base [B]', exact: true })
    .click();

  const expedition = page.locator('.sp-expedition-panel');
  await expedition
    .locator('article')
    .filter({ has: page.getByText('Field Cordage', { exact: true }) })
    .getByRole('button', { name: 'Craft', exact: true })
    .click();
  await expect(expedition.getByRole('status')).toHaveAttribute(
    'data-result',
    'CRAFTED',
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Homestead farming and wildlife' })
    .click();
  const panel = page.locator('.lw-panel');
  await panel.locator('[data-living-scope=recipes]').click();
  if (
    !(await panel
      .locator('[data-living-craft]')
      .evaluate((e) => (e as HTMLDetailsElement).open))
  )
    await panel.locator('[data-living-craft] > summary').click();
  await panel
    .getByRole('button', { name: 'Craft Field Hoe', exact: true })
    .click();
  await expect(panel.getByRole('status')).toContainText('crafted');
  // Crafting details stay open across authority updates.
  if (
    !(await panel
      .locator('[data-living-craft]')
      .evaluate((e) => (e as HTMLDetailsElement).open))
  )
    await panel.locator('[data-living-craft] > summary').click();
  await panel
    .getByRole('button', { name: 'Craft Prepare Root Seeds', exact: true })
    .click();
  await expect(panel.getByRole('status')).toContainText('crafted');
  await panel.locator('[data-living-scope=farm]').click();
  await panel
    .getByRole('button', { name: 'Till a new plot', exact: true })
    .click();
  await expect(page.locator('.lw-ghost')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.lw-ghost')).toBeHidden();
  await expect(page.locator('[data-colony-settings]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Homestead farming and wildlife' })
    .click();
  let planted = false;
  for (const [x, y] of [
    [46, 22],
    [47, 22],
    [46, 24],
    [48, 22],
    [49, 22],
    [50, 24],
  ]) {
    await panel
      .getByRole('button', { name: 'Till a new plot', exact: true })
      .click();
    await ground(page, x!, y!);
    if (await panel.isVisible()) {
      planted = true;
      break;
    }
    await page.keyboard.press('Escape');
    await page
      .getByRole('button', { name: 'Homestead farming and wildlife' })
      .click();
  }
  expect(planted, 'Natural explored soil near the stone outcrop').toBe(true);
  const plantedPoint = await page.locator('.lw-ghost').evaluate((e) => ({
    x: Number((e as HTMLElement).dataset.x),
    y: Number((e as HTMLElement).dataset.y),
  }));
  const row = panel.locator('[data-living-row^="plot:"]').first();
  await row
    .getByRole('button', { name: 'Plant Root Vegetables', exact: true })
    .click();
  await expect(row).toContainText('Root Vegetables');
  await expect(row).toContainText(/Root Vegetables [1-9][0-9]*%/, {
    timeout: 30000,
  });
  const id = await row.getAttribute('data-living-row');
  await page.keyboard.press('Escape');
  await expect(
    page.locator('.lw-object[data-living-id="' + id + '"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save world [L]', exact: true })
    .click();
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute(
    'data-save-state',
    'success',
    { timeout: 15000 },
  );
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute(
    'data-runtime-status',
    'ready',
  );
  await expect(
    page.locator('.lw-object[data-living-id="' + id + '"]'),
  ).toBeVisible();
  await page.screenshot({path: resolve('test-results', 'living-reopened-before-input.png')});
  await test.info().attach('world-hit-regions', {body: JSON.stringify(await page.locator('.lw-object[data-living-id="'+id+'"],.p1-product-sprite[data-world-role="resource"]').evaluateAll(elements => elements.map(e => ({id:(e as HTMLElement).dataset.livingId??(e as HTMLElement).dataset.worldId,rect:e.getBoundingClientRect().toJSON(),depth:getComputedStyle(e).zIndex,clip:getComputedStyle(e).clipPath})))),contentType:'application/json'});
  await page.locator('.lw-object[data-living-id="' + id + '"]').click();
  await expect(panel.locator('[data-living-row="' + id + '"]')).toContainText(
    'Root Vegetables',
  );
  await page.keyboard.press('Escape');
  await walk(page, plantedPoint.x, plantedPoint.y);
  await page.keyboard.press('e');
  await expect(panel.locator('[data-living-row="' + id + '"]')).toContainText(
    'Root Vegetables',
  );
  const folder = resolve('test-results', 'living-world');
  mkdirSync(folder, { recursive: true });
  await page.screenshot({ path: resolve(folder, 'remote-crop-reopened.png') });
  await page.keyboard.press('Escape');await page.keyboard.press('f');
  const management=panel.locator('[data-living-group="Plots"] [data-living-row="'+id+'"]');
  await expect(management).toBeVisible();
  await expect.poll(async()=>Number(await management.getByRole('meter',{name:'Growth',exact:true}).getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  await expect(management.getByRole('meter',{name:'Moisture',exact:true})).toBeVisible();
  await page.screenshot({path:resolve(folder,'remote-crop-management.png')});
  expect(errors).toEqual([]);
});
