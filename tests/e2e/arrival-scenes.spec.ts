import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('arrival scenes: EN/VI composition, descent motion, selected player, keyboard handoff and reduced motion', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync('test-results/arrival-scenes',{recursive:true});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const evidence:unknown[]=[];
  for(const [width,height] of [[1280,720],[1920,1080],[640,360]]){
    for(const language of ['en','vi']){
      await page.setViewportSize({width:width!,height:height!});
      await page.goto('/');
      await page.evaluate(()=>localStorage.setItem('proz0:skin','azure'));
      await page.locator('[data-locale-choice]').selectOption(language!);
      await page.locator('[data-start-phase2-review]').click();
      const art=page.locator('.arrival-art'),next=page.locator('.arrival-next');
      for(let shot=0;shot<3;shot++){
        await expect(art).toHaveAttribute('data-shot',String(shot));
        await expect(next).toBeFocused();
        if(shot===1){
          const initial=await art.locator('.arrival-descending').evaluate(e=>getComputedStyle(e).transform);
          await page.waitForTimeout(850);
          const landed=await art.locator('.arrival-descending').evaluate(e=>getComputedStyle(e).transform);
          expect(initial).not.toBe(landed);evidence.push({width,height,language,initial,landed});
        }else await page.waitForTimeout(650);
        if(shot===2)await expect(art.locator('[data-scene-role=player]')).toHaveAttribute('data-skin','azure');
        const bounds=await next.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height!);
        expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height!);
        await page.screenshot({path:'test-results/arrival-scenes/'+width+'-'+language+'-'+shot+'.png'});
        await page.keyboard.press('Enter');
      }
      await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');await page.locator('[data-start-phase2-review]').click();
  await expect(page.locator('.arrival-next')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.locator('.arrival-descending').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
  await page.keyboard.press('Escape');
  await expect(page.locator('.proz0-arrival')).toHaveCount(0);
  expect(errors).toEqual([]);
  writeFileSync('test-results/arrival-scenes/transitions.json',JSON.stringify({evidence,errors},null,2));
});
