import '../../src/client/presentation/UiTokens.css';
import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createPhase1ProductReviewRuntime } from '../../src/client/runtime/Phase1ProductReviewRuntime';
import { setLocale } from '../../src/client/localization/Locale';

it('keeps modal headers and close buttons fixed while only the body scrolls at supported sizes', async () => {
  const root=document.createElement('section');root.id='app';root.style.cssText='position:relative;width:100%;height:100%';document.body.append(root);
  const runtime=await createPhase1ProductReviewRuntime(root,{worldId:'world:shell',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  try {
    for(const [width,height] of [[1366,768],[1920,1080],[2560,1080],[640,360]]){
      await page.viewport(width!,height!);window.dispatchEvent(new Event('resize'));
      for(const language of ['en','vi'] as const){
        setLocale(language);
        for(const key of ['i','c','b','m','f','u','j','p','n','o','h']){
          await userEvent.keyboard('{Escape}');await userEvent.keyboard(key);
          const panel=[...root.querySelectorAll<HTMLElement>('[data-panel-shell]')].find(e=>!e.hidden&&e.getBoundingClientRect().height>0);
          expect(panel,'shell '+key).toBeDefined();
          const header=panel!.querySelector<HTMLElement>('.ui-panel-header')!;
          const body=panel!.querySelector<HTMLElement>('.ui-panel-body')!;
          const close=header.querySelector<HTMLButtonElement>('[data-panel-close]')!;
          expect(close.getAttribute('aria-label')).toBeTruthy();
          const before=header.getBoundingClientRect();
          for(const details of body.querySelectorAll('details'))details.open=true;
          body.scrollTop=body.scrollHeight;
          expect(header.getBoundingClientRect().top).toBe(before.top);
          expect(close.getBoundingClientRect().bottom).toBeLessThanOrEqual(header.getBoundingClientRect().bottom+1);
          expect(panel!.scrollTop).toBe(0);
          expect(getComputedStyle(body).overflowY).toBe('auto');
          expect(getComputedStyle(body).scrollbarWidth).toBe('thin');
          const bounds=panel!.getBoundingClientRect();
          expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(width!);
          expect(bounds.top).toBeGreaterThanOrEqual(0);expect(bounds.bottom).toBeLessThanOrEqual(height!);
          expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(height!);
          if(key==='o'){
            const tabs=panel!.querySelector<HTMLElement>('.industry-tabs')!;
            const top=tabs.getBoundingClientRect().top;
            for(const id of ['production','networks','research','build']){
              panel!.querySelector<HTMLButtonElement>('[data-industry-control=tab-'+id+']')!.click();
              const current=root.querySelector<HTMLElement>('.industry-tabs')!;
              expect(current.getBoundingClientRect().top).toBe(top);
            }
          }
        }
        await userEvent.keyboard('{Escape}');
        root.querySelector<HTMLButtonElement>('.p2-settings>button')!.click();
        const settings=root.querySelector<HTMLElement>('[data-colony-settings]')!;
        const settingsBody=settings.querySelector<HTMLElement>('.ui-panel-body')!;
        expect(settingsBody.querySelector('[data-locale-choice]')).not.toBeNull();
        expect(settingsBody.querySelector('.p2-audio-controls')).not.toBeNull();
        settingsBody.scrollTop=settingsBody.scrollHeight;
        const last=settingsBody.lastElementChild!.getBoundingClientRect();
        expect(last.bottom).toBeLessThanOrEqual(settings.getBoundingClientRect().bottom+1);
        expect(settings.querySelector('[data-panel-close]')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
        root.querySelector<HTMLButtonElement>('[data-colony-settings] [data-panel-close]')!.click();
        expect(settings.hidden).toBe(true);
      }
    }
  } finally {runtime.destroy();root.remove();setLocale('en');}
},30_000);
