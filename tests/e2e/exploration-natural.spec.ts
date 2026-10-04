import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {colonyExplorationSites} from '../../src/world/phase2/ColonyExplorationSites';
import { walkSurface as walkTo } from './support/surface-route';

test('three fresh exploration journeys: walk from landing to new lab, mine and shelter without grants or relocation',async({page})=>{
  // Three separate fresh-world round trips include ramp routing and save/reopen.
  test.setTimeout(600_000);mkdirSync('test-results/exploration-natural',{recursive:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const site of colonyExplorationSites('p1-world-golden',5).slice(5)){
    const worldId='world:natural:'+site.id;
    await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:worldId,proz0WorldSeed:'p1-world-golden',proz0Players:'solo',proz0Player:'solo',proz0SaveDb:'natural:'+site.id}));
    await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
    await expect(page.locator('[data-world-role="survey-site"]')).toHaveCount(0);
    await walkTo(page,0,12);await walkTo(page,site.position.x,site.position.y);
    const sprite=page.locator('[data-world-role="survey-site"][data-site-id="'+site.id+'"]');await expect(sprite).toBeVisible();
    await sprite.locator('[data-site-interaction]').click();const row=page.locator('[data-discovered-landmark="'+site.id+'"]');await expect(row.getByRole('button',{name:'Inspect',exact:true})).toBeEnabled({timeout:5000});await row.getByRole('button',{name:'Inspect',exact:true}).click();
    await expect(row.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);await expect(row).toContainText('Needs:');
    await page.keyboard.press('Escape');await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
    await page.reload();await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened','true');await page.keyboard.press('j');await expect(page.locator('.p2-colony-panel')).toBeVisible();
    await expect(row).toContainText(site.name);await expect(row.getByRole('button',{name:'Inspect',exact:true})).toHaveCount(0);
    await page.screenshot({path:'test-results/exploration-natural/'+site.template+'.png'});
    await page.keyboard.press('Escape');await page.keyboard.press('m');await expect(page.locator('[data-panel-kind="map"]')).toBeVisible();await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});
