import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
async function walk(page: Page, x: number, y: number) {
  let held: string[] = [];
  try {
    for (let n = 0; n < 1500; n++) {
      const p = await page
        .locator('canvas')
        .evaluate((e) => ({
          x: Number(e.getAttribute('data-player-x')),
          y: Number(e.getAttribute('data-player-y')),
        }));
      const dx = x - p.x,
        dy = y - p.y;
      if (Math.hypot(dx, dy) < 0.15) return;
      const keys =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? ['s', 'd']
            : ['w', 'a']
          : dy > 0
            ? ['s', 'a']
            : ['w', 'd'];
      if (keys.join() !== held.join()) {
        for (const k of held) await page.keyboard.up(k);
        for (const k of keys) await page.keyboard.down(k);
        held = keys;
      }
      await page.waitForTimeout(80);
    }
    throw Error('Natural walk could not reach ' + String(x) + ',' + String(y));
  } finally {
    for (const k of held) await page.keyboard.up(k);
  }
}
async function clickGround(page: Page, x: number, y: number) {
  const point = await page.locator('canvas').evaluate(
    (e, target) => {
      const r = e.getBoundingClientRect(),
        px = Number(e.getAttribute('data-player-x')),
        py = Number(e.getAttribute('data-player-y'));
      return {
        x:
          r.left +
          ((320 + (target.x - px - target.y + py) * 16) * r.width) / 640,
        y:
          r.top +
          ((180 + (target.x - px + target.y - py) * 8) * r.height) / 360,
      };
    },
    { x, y },
  );
  await page.mouse.click(point.x, point.y);
}
test('solo expedition: real gathering builds remote storage and reload preserves inventory, plans and lab receipts', async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  const url =
    '/?' +
    new URLSearchParams({
      proz0Mode: 'phase2-colony-review',
      proz0WorldId: 'world:solo-natural',
      proz0WorldSeed: 'p1-world-golden',
      proz0Players: 'solo',
      proz0Player: 'solo',
      proz0SaveDb: 'solo-natural',
    });
  await page.goto(url);
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute(
    'data-runtime-status',
    'ready',
  );
  await expect(page.locator('[data-region="carry"]')).toContainText('/32');
  const interaction = page.locator('[data-region="interaction"]');
  const gather = async (n: number) => {
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('e');
      await expect(interaction).toHaveAttribute('data-state', 'CHANNELING');
      await expect(interaction).toHaveAttribute('data-state', 'AVAILABLE', {
        timeout: 4000,
      });
    }
  };
  await walk(page, 18, 10);
  await gather(2);
  await walk(page, -36, -12);
  await gather(2);
  await walk(page, -39, -12);
  await page
    .getByRole('button', { name: 'Build base [B]', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Expedition blueprints · materials later',
      exact: true,
    })
    .click();
  const panel = page.locator('.sp-expedition-panel');
  await panel
    .locator('article')
    .filter({ has: page.getByText('Supply Cache', { exact: true }) })
    .getByRole('button', { name: 'Plan', exact: true })
    .click();
  await clickGround(page, -40, -13);
  const plan = panel.locator('[data-expedition-plan]');
  await expect(plan).toHaveCount(1);
  await plan.getByRole('button', { name: 'Contribute', exact: true }).click();
  await expect(plan).toContainText('Timber 2/2');
  await expect(plan).toContainText('Plant Fiber 2/2');
  await plan.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(plan).toHaveCount(0);
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.locator(
      '[data-world-role="structure"][data-world-id*="expedition-build"]',
    ),
  ).toHaveCount(1);
  await walk(page, -40, -12);
  await page.keyboard.press('i');
  await expect(page.locator('[data-panel-kind="container"]')).toBeVisible();
  const playerPane = page.locator('[data-inventory-pane="player"]');
  await playerPane
    .getByRole('button', { name: 'Plant Fiber', exact: true })
    .click();
  await page.getByRole('button', { name: 'Move one', exact: true }).click();
  await expect(page.locator('[data-inventory-pane="storage"]')).toContainText(
    'Plant Fiber',
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'Build base [B]', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Expedition blueprints · materials later',
      exact: true,
    })
    .click();
  await panel
    .locator('article')
    .filter({ has: page.getByText('Camp Bed', { exact: true }) })
    .getByRole('button', { name: 'Plan', exact: true })
    .click();
  await clickGround(page, -42, -11);
  await expect(plan).toHaveCount(1);
  const directory = resolve('test-results/single-player-expedition');
  mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: resolve(directory, 'remote-outpost-blueprint.png'),
  });
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save world [L]', exact: true })
    .click();
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute(
    'data-save-state',
    'success',
  );
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute(
    'data-product-review-reopened',
    'true',
  );
  await expect(page.locator('.sp-blueprint[data-plan-id]')).toHaveCount(1);
  await page.keyboard.press('i');
  await expect(page.locator('[data-inventory-pane="storage"]')).toContainText(
    'Plant Fiber',
  );
  await page.keyboard.press('Escape');
  await walk(page, -38, -10);
  await walk(page, 0, 0);
  await page
    .getByRole('button', { name: 'Landing Lab · interact', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Emergency supplies · once', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText(
    'FACILITY_ACTION_COMPLETED',
  );
  await panel
    .getByRole('button', { name: 'Emergency supplies · once', exact: true })
    .click();
  await expect(panel.getByRole('status')).toHaveText(
    'SUPPLIES_ALREADY_CLAIMED',
  );
  await panel
    .getByRole('button', { name: 'Sleep / rest · 8s', exact: true })
    .click();
  await expect(panel).toContainText('Resting');
  await expect(
    panel.getByRole('button', { name: 'Wake up', exact: true }),
  ).toHaveCount(0, { timeout: 12000 });
  await page.screenshot({ path: resolve(directory, 'landing-lab-rest.png') });
  for (const [width, height] of [
    [640, 360],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width: width!, height: height! });
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width!);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height!);
    await expect(
      panel.getByRole('button', { name: 'Close', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: resolve(directory, 'lab-' + String(width) + '.png'),
    });
  }
  expect(errors).toEqual([]);
});

test('solo launcher rolls distinct default seeds and accepts a reproducible custom seed', async ({
  page,
}) => {
  const start = async (seed?: string) => {
    await page.goto('/');
    if (seed)
      await page
        .getByLabel('Seed thế giới · để trống để tạo ngẫu nhiên', {
          exact: true,
        })
        .fill(seed);
    await page
      .getByRole('button', { name: 'Bắt đầu thế giới mới', exact: true })
      .click();
    await page.waitForURL(
      (url) => url.searchParams.get('proz0Mode') === 'phase2-colony-review',
    );
    return new URL(page.url());
  };
  const a = await start(),
    b = await start();
  expect(a.searchParams.get('proz0WorldSeed')).not.toBe(
    b.searchParams.get('proz0WorldSeed'),
  );
  expect(a.searchParams.get('proz0WorldId')).not.toBe(
    b.searchParams.get('proz0WorldId'),
  );
  const c = await start('owner-expedition-2026');
  expect(c.searchParams.get('proz0WorldSeed')).toBe('owner-expedition-2026');
  expect(c.searchParams.get('proz0SaveDb')).not.toBe(
    b.searchParams.get('proz0SaveDb'),
  );
});
