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
        tick: e.hasAttribute('data-authority-tick') ? Number(e.getAttribute('data-authority-tick')) : null,
      }));
      const current = p.x.toFixed(2) + ',' + p.y.toFixed(2);
      if(n>0&&n%300===0)console.info('Walking approach', {step:n,target:{x,y},position:p,tolerance});
      stuck = current === previous ? stuck + 1 : 0;
      previous = current;
      if (stuck > 25)
        throw Error(
          'Movement blocked at ' + current + ' toward ' + x + ',' + y,
        );
      const dx = x - p.x,
        dy = y - p.y;
      if (Math.hypot(dx, dy) < tolerance) return;
      // Align the other axis when a footprint clips a nearby corner. A greedy
      // walker must not repeatedly push into a real crate or cave wall.
      const preferX = Math.abs(dx) >= Math.abs(dy);
      const useX = stuck >= 2 && Math.min(Math.abs(dx),Math.abs(dy)) > .03 ? !preferX : preferX;
      const keys =
        useX
          ? dx > 0
            ? ['s', 'd']
            : ['w', 'a']
          : dy > 0
            ? ['s', 'a']
            : ['w', 'd'];
      if (keys.join() !== held.join()) {
        await Promise.all(held.map(k=>page.keyboard.up(k)));
        await Promise.all(keys.map(k=>page.keyboard.down(k)));
        held = keys;
      }
      await page.waitForTimeout(Math.hypot(dx, dy) < 2 ? 16 : 200);
      // Async chunk preparation can outlast a short key pulse on a busy runner.
      // Hold real keys until a subsequent authority step has sampled the intent.
      if(p.tick!==null)await expect.poll(async()=>Number(await page.locator('canvas').getAttribute('data-authority-tick')),{intervals:[16,32,50],timeout:5000}).toBeGreaterThan(p.tick+1);
      // Do not keep moving while a slow locator round trip reads the pose.
      await Promise.all(held.map(k=>page.keyboard.up(k)));
      held = [];
      if(Math.hypot(dx,dy)<2)await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
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
