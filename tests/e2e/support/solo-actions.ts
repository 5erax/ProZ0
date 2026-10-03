import { expect, type Page } from '@playwright/test';
export async function walk(page: Page, x: number, y: number, tolerance = 0.65) {
  let held: string[] = [];
  let previous = '',
    stuck = 0;
  try {
    for (let n = 0; n < 1500; n++) {
      const p = await page.locator('canvas').evaluate((e) => ({
        x: Number(e.getAttribute('data-player-x')),
        y: Number(e.getAttribute('data-player-y')),
      }));
      const current = p.x.toFixed(2) + ',' + p.y.toFixed(2);
      stuck = current === previous ? stuck + 1 : 0;
      previous = current;
      if (stuck > 25)
        throw Error(
          'Movement blocked at ' + current + ' toward ' + x + ',' + y,
        );
      const dx = x - p.x,
        dy = y - p.y;
      if (Math.hypot(dx, dy) < tolerance) return;
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
      await page.waitForTimeout(Math.hypot(dx, dy) < 2 ? 16 : 200);
      // Do not keep moving while a slow locator round trip reads the pose.
      for (const k of held.toReversed()) await page.keyboard.up(k);
      held = [];
    }
    throw Error('Natural walk could not reach ' + String(x) + ',' + String(y));
  } finally {
    for (const k of held) await page.keyboard.up(k);
  }
}
export async function clickGround(page: Page, x: number, y: number) {
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
  await page.mouse.move(point.x, point.y);
  const ghost = page.locator('.sp-ghost');
  await expect(ghost).toBeVisible();
  await expect(ghost).toHaveAttribute('data-valid', 'true');
  const orientation = Number(await ghost.getAttribute('data-orientation'));
  await page.keyboard.press('r');
  await expect(ghost).toHaveAttribute(
    'data-orientation',
    String((orientation + 1) % 4),
  );
  await page.mouse.click(point.x, point.y);
  await expect(ghost).toBeHidden();
}
