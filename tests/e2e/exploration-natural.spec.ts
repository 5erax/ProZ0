import {expect,test,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {colonyExplorationSites} from '../../src/world/phase2/ColonyExplorationSites';
async function walkTo(page: Page, x: number, y: number): Promise<void> {
  let previous = "";
  let stuck = 0;
  let held: string[] = [];
  try {
    // The longest leg crosses both regions. Allow slower CI frame scheduling
    // without granting items, relocating the player, or accepting blocked motion.
    for (let step = 0; step < 1800; step += 1) {
      const position = await page.locator("canvas").evaluate((element) => ({
        x: Number(element.getAttribute("data-player-x")),
        y: Number(element.getAttribute("data-player-y")),
      }));
      const dx = x - position.x;
      const dy = y - position.y;
      if (Math.hypot(dx, dy) <= 0.65) return;
      const current = position.x.toFixed(2) + "," + position.y.toFixed(2);
      stuck = current === previous ? stuck + 1 : 0;
      previous = current;
      if (stuck > 15)
        throw new Error(
          "Movement blocked at " +
            current +
            " toward " +
            String(x) +
            "," +
            String(y),
        );
      const keys =
        Math.abs(dx) >= Math.abs(dy)
          ? dx > 0
            ? ["s", "d"]
            : ["w", "a"]
          : dy > 0
            ? ["s", "a"]
            : ["w", "d"];
      if (keys.join(",") !== held.join(",")) {
        for (const key of held.toReversed()) await page.keyboard.up(key);
        for (const key of keys) await page.keyboard.down(key);
        held = keys;
      }
      await page.waitForTimeout(100);
    }
    throw new Error(
      "Normal movement failed toward " +
        String(x) +
        "," +
        String(y) +
        "; last position " +
        previous,
    );
  } finally {
    for (const key of held.toReversed()) await page.keyboard.up(key);
  }
}

test('three fresh exploration journeys: walk from landing to new lab, mine and shelter without grants or relocation',async({page})=>{
  test.setTimeout(360_000);mkdirSync('test-results/exploration-natural',{recursive:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const site of colonyExplorationSites('p1-world-golden',5).slice(5)){
    const worldId='world:natural:'+site.id;
    await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:worldId,proz0WorldSeed:'p1-world-golden',proz0Players:'solo',proz0Player:'solo',proz0SaveDb:'natural:'+site.id}));
    await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
    await expect(page.locator('[data-world-role="survey-site"]')).toHaveCount(0);
    await walkTo(page,0,12);await walkTo(page,site.position.x,site.position.y);
    const sprite=page.locator('[data-world-role="survey-site"][data-site-id="'+site.id+'"]');await expect(sprite).toBeVisible();
    await sprite.click();const row=page.locator('[data-discovered-landmark="'+site.id+'"]');await row.getByRole('button',{name:'Inspect',exact:true}).click();
    await expect(row.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);await expect(row).toContainText('Needs:');
    await page.keyboard.press('Escape');await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
    await page.reload();await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');await page.keyboard.press('j');
    await expect(row).toContainText(site.name);await expect(row.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);
    await page.screenshot({path:'test-results/exploration-natural/'+site.template+'.png'});
    await page.keyboard.press('Escape');await page.keyboard.press('m');await expect(page.locator('[data-panel-kind="map"]')).toBeVisible();await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});
