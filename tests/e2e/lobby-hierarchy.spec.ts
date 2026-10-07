import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('lobby hierarchy: primary solo action, secondary appearance, selected outfit and EN/VI layout', async ({page})=>{
  mkdirSync('test-results/lobby-hierarchy',{recursive:true});
  await page.route('**/api/pilot/auth/me',route=>route.fulfill({json:{account:null}}));
  for(const [width,height] of [[1920,1080],[1280,720],[640,360]]){
    await page.setViewportSize({width:width!,height:height!});
    for(const language of ['en','vi']){
      await page.goto('/');await page.locator('[data-language='+language+']').click();
      const primary=page.locator('[data-primary-journey]');await expect(primary).toBeInViewport();
      await primary.click();await expect(page.locator('[data-start-phase2-review]')).toBeFocused();
      expect(await page.locator('.lobby-tabs [data-lobby-view=skins]').count()).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width!);
      await page.screenshot({path:'test-results/lobby-hierarchy/'+width+'-'+language+'-solo.png'});
      await page.locator('[data-lobby-view=skins]').click();
      await page.getByRole('button',{name:'Moss',exact:true}).click();
      await expect(page.getByRole('button',{name:'Moss',exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('.lobby-skins [aria-pressed=true] [data-selected-appearance]')).toHaveText(language==='vi'?'✓ Đã chọn':'✓ Selected');
      await page.screenshot({path:'test-results/lobby-hierarchy/'+width+'-'+language+'-appearance.png'});
      await page.reload();await page.locator('[data-lobby-view=skins]').click();
      await expect(page.getByRole('button',{name:'Moss',exact:true})).toHaveAttribute('aria-pressed','true');
    }
  }
});
