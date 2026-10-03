import { expect, it } from 'vitest';
import { mountMapViewport } from '../../src/client/presentation/MapViewport';
import { setLocale } from '../../src/client/localization/Locale';
it('bounds zoom, pans by keyboard, preserves view on rerender and translates controls',async()=>{
  const state={zoom:1,x:0,y:0},field=document.createElement('div');field.style.width='500px';field.style.height='190px';
  const view=mountMapViewport(field,state);view.style.width='300px';document.body.append(view);await Promise.resolve();
  try {
    const plus=view.querySelector<HTMLButtonElement>('[data-map-zoom-action=zoomIn]')!,viewport=view.querySelector<HTMLElement>('.p1-map-viewport')!;
    for(let i=0;i<20;i++)plus.click();expect(state.zoom).toBe(4);
    viewport.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));expect(state.x).toBeLessThan(0);
    const current={...state};const replacement=document.createElement('div');replacement.style.width='500px';replacement.style.height='190px';
    const next=mountMapViewport(replacement,state);next.style.width='300px';view.replaceWith(next);await Promise.resolve();expect(state).toEqual(current);
    setLocale('vi');expect(next.querySelector('[data-map-zoom-action=zoomIn]')?.getAttribute('aria-label')).toBe('Phóng to');
    const port=next.querySelector<HTMLElement>('.p1-map-viewport')!;
    port.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));expect(state).toEqual({zoom:1,x:0,y:0});
    for(let i=0;i<20;i++)port.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true,cancelable:true}));expect(state.zoom).toBe(1);next.remove();
  } finally {setLocale('en');view.remove();}
});
