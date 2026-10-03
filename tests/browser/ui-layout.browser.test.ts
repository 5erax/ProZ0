import '../../src/client/presentation/UiTokens.css';
import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createPhase1ProductReviewRuntime } from '../../src/client/runtime/Phase1ProductReviewRuntime';
import { setLocale } from '../../src/client/localization/Locale';

it('keeps primary panels and the document within three viewports in EN/VI, with scrollable hidden bars',async()=>{
  const root=document.createElement('section');root.id='app';root.style.cssText='position:relative;width:100%;height:100%;';document.body.append(root);
  const runtime=await createPhase1ProductReviewRuntime(root,{worldId:'world:ui-layout',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  try {
    for(const [width,height] of [[1280,720],[1920,1080],[640,360]]){
      await page.viewport(width!,height!);window.dispatchEvent(new Event('resize'));
      for(const language of ['en','vi'] as const){
        setLocale(language);
        const water = root.querySelector<HTMLElement>('[data-region=survival] [data-meter=water]');
        const stamina = root.querySelector<HTMLElement>('[data-region=survival] [data-meter=stamina]');
        expect(water).not.toBeNull();expect(stamina).not.toBeNull();
        expect(water).not.toBe(stamina);
        expect(water!.getAttribute('aria-label')).toContain(language==='vi'?'Nước':'Water');
        expect(stamina!.getAttribute('aria-label')).toContain(language==='vi'?'Thể lực':'Stamina');
        for(const key of ['i','c','b','m','u','j','p','h']){
          await userEvent.keyboard('{Escape}');await userEvent.keyboard(key);
          const panel=Array.from(root.querySelectorAll<HTMLElement>('.p1-panel,.p2-colony-panel,.p1-product-controls-panel')).find(e=>!e.hidden&&e.getBoundingClientRect().height>0);
          expect(panel,'panel '+key).toBeDefined();
          const bounds=panel!.getBoundingClientRect();
          expect(bounds.left,key+' left').toBeGreaterThanOrEqual(-1);expect(bounds.right,key+' right').toBeLessThanOrEqual(width!+1);
          expect(bounds.top,key+' top').toBeGreaterThanOrEqual(-1);expect(bounds.bottom,key+' bottom').toBeLessThanOrEqual(height!+1);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width!);
          expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height!);
          expect(getComputedStyle(panel!).scrollbarWidth).toBe('none');
          if(key==='i')await page.elementLocator(root).screenshot({path:`../../.vitest/attachments/ui-inventory-${width}-${language}.png`});
        }
      }
    }
  } finally {runtime.destroy();root.remove();setLocale('en');}
},30_000);
