import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test('world/map readability: known-state fitted map, stable readable markers and EN/VI desktop evidence',async({page})=>{
 mkdirSync('test-results/world-map-readability',{recursive:true});
 for(const [width,height] of [[1280,720],[1920,1080]])for(const language of ['en','vi']){
  await page.setViewportSize({width:width!,height:height!});
  await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:'world:map-readability-'+width+'-'+language,proz0WorldSeed:'p1-world-golden',proz0Players:'solo',proz0Player:'solo',proz0SaveDb:'readability-'+width+'-'+language}));
  await expect(page.locator('[data-runtime-status=ready]')).toBeVisible();
  await page.getByRole('button',{name:/Settings|Cài đặt/,exact:true}).click();await page.locator('[data-locale-choice]').selectOption(language);await page.keyboard.press('Escape');
  const world=page.locator('.p1-product-world');await expect(world).toHaveCSS('background-image','none');
  await expect(page.locator('[data-world-role=terrain][data-exploration-state=UNEXPLORED]')).toHaveCount(0);
  await page.screenshot({path:'test-results/world-map-readability/'+width+'-'+language+'-world.png'});
  await page.keyboard.press('m');const field=page.locator('[data-map-spatial]'),port=page.locator('.p1-map-viewport');
  const f=(await field.boundingBox())!,p=(await port.boundingBox())!;
  expect(Math.max(f.width/p.width,f.height/p.height)).toBeGreaterThan(.97);
  expect(f.width).toBeLessThanOrEqual(p.width);expect(f.height).toBeLessThanOrEqual(p.height);
  const occupied=await field.locator('[data-map-cell-state=EXPLORED]').evaluateAll(nodes=>{
   const rects=nodes.map(node=>node.getBoundingClientRect());
   return {width:Math.max(...rects.map(r=>r.right))-Math.min(...rects.map(r=>r.left)),height:Math.max(...rects.map(r=>r.bottom))-Math.min(...rects.map(r=>r.top))};
  });
  expect(Math.max(occupied.width/p.width,occupied.height/p.height)).toBeGreaterThan(.5);
  await expect(page.locator('[data-panel-kind=map]')).toHaveCSS('background-color','rgb(16, 33, 41)');
  const marker=page.locator('.p1-map-marker-position[data-map-marker-kind=player]');
  const before=(await marker.boundingBox())!;expect(before.width).toBeGreaterThanOrEqual(15);expect(before.width).toBeLessThanOrEqual(18);
  const known=await field.getAttribute('data-explored-cell-count');
  await page.locator('[data-map-zoom-action=zoomIn]').click();const after=(await marker.boundingBox())!;expect(Math.abs(after.width-before.width)).toBeLessThan(.1);
  expect(await field.getAttribute('data-explored-cell-count')).toBe(known);
  await page.locator('[data-map-zoom-action=resetMap]').click();
  await expect(page.locator('.p1-map-orientation')).toContainText(language==='vi'?'Bắc':'N');
  await expect(page.locator('[data-map-cell-state=UNKNOWN_BOUNDARY][data-terrain-state]')).toHaveCount(0);
  await page.screenshot({path:'test-results/world-map-readability/'+width+'-'+language+'-map.png'});
 }
});
