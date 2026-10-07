import { expect,it } from 'vitest';
import { capturePanelUi } from '../../src/client/presentation/PanelUiState';
import { fogFrontierSprite } from '../../src/client/presentation/FogFrontier';
import { materialSource,materialHint } from '../../src/client/presentation/MaterialGuide';
import { createPhase1ContentCatalog } from '../../src/content';
import { setLocale } from '../../src/client/localization/Locale';
it('retains nested scroll, source expansion and selected-button focus on a live panel rebuild',()=>{
 const root=document.createElement('section');root.style.cssText='height:100px;overflow:auto';document.body.append(root);
 const fill=()=>{root.innerHTML='<div style="height:40px"></div><div class="items" style="height:80px;overflow:auto"><div style="height:400px"><button data-review-action="select" data-review-item="stone">Stone</button></div></div><details><summary>Source</summary><p style="height:60px">Material source</p></details><div style="height:500px"></div>';};
 try{fill();root.querySelector<HTMLDetailsElement>('details')!.open=true;root.querySelector<HTMLButtonElement>('button')!.focus({preventScroll:true});root.scrollTop=75;root.querySelector('.items')!.scrollTop=45;
 const restore=capturePanelUi(root);fill();restore();expect(root.scrollTop).toBe(75);expect(root.querySelector('.items')!.scrollTop).toBe(45);expect(root.querySelector<HTMLDetailsElement>('details')!.open).toBe(true);expect(document.activeElement).toBe(root.querySelector('button'));
 }finally{root.remove();}
});
it('shows the shipped Vietnamese brick recipe and source without exposing canonical IDs',()=>{
 setLocale('vi');try{const catalog=createPhase1ContentCatalog(),source=materialSource(catalog,'item:brick');expect(source).toContain('Đất sét');expect(source).toContain('Gỗ');expect(source).not.toContain('item:');expect(source).not.toContain('clay-kiln');const hint=materialHint(document,'Gạch nung',source,0,2,'item:brick');expect(hint.querySelector('summary')!.getAttribute('aria-label')).toContain('Gạch nung');expect(hint.textContent).toContain(source);}finally{setLocale('en');}
});
it('decodes every native fog frontier without oversized texture crops',async()=>{
 for(let mask=0;mask<16;mask++){const sprite=fogFrontierSprite(mask),image=new Image();image.src=sprite.url;await image.decode();expect(image.naturalWidth).toBe(64);expect(image.naturalHeight).toBe(32);}
});
import {vi} from 'vitest';
import {Phase1AuthorityBundle} from '../../src/integration/Phase1AuthorityBundle';
import {createLivingWorldOverlay} from '../../src/client/presentation/LivingWorldOverlay';
it('keeps animals visible amid more forage than the render budget and communicates care',async()=>{
 const bundle=await Phase1AuthorityBundle.create({worldId:'world:animal-visibility',worldSeed:'p1-world-golden',playerIds:['solo'],singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});await bundle.stepSolo();
 const root=document.createElement('section'),canvas=document.createElement('canvas'),stage=document.createElement('div');stage.className='p1-product-world-stage';stage.dataset.rasterOriginX='0';stage.dataset.rasterOriginY='0';canvas.width=640;canvas.height=360;root.append(canvas,stage);document.body.append(root);
 const snapshot=bundle.livingWorld!.presentationSnapshot(),p=bundle.getPlayerPosition('solo');
 const animal={id:'fixture:goat',species:'goat',x:p.x,y:p.y,age:0,health:40,sex:0 as const,energy:9000,thirst:1000,breedTick:0,product:0,productTicks:0,pen:'fixture:pen',owner:'solo',anchorX:p.x,anchorY:p.y,attackTick:0,shearTick:0};
 const spy=vi.spyOn(bundle.livingWorld!,'presentationSnapshot').mockReturnValue({...snapshot,animals:[animal],plots:[],forage:Array.from({length:80},(_,i)=>({id:'fixture:forage:'+i,kind:'wild-grass',x:p.x,y:p.y,readyTick:0,cleared:false}))});
 const overlay=createLivingWorldOverlay(root,canvas,bundle,'solo',()=>{});
 try{overlay.render();expect(root.querySelectorAll('[data-living-role]')).toHaveLength(64);const goat=root.querySelector<HTMLElement>('[data-living-id="fixture:goat"]')!;expect(goat).not.toBeNull();expect(goat.getAttribute('aria-label')).toContain('Needs water');expect(goat.querySelector<HTMLElement>('.lw-state-cue')!.hidden).toBe(false);
   spy.mockReturnValue({...snapshot,animals:[animal],plots:[],forage:[]});
   overlay.open();const card=root.querySelector<HTMLElement>('[data-living-row="fixture:goat"]')!;
   expect(card.closest('[data-living-group]')?.getAttribute('data-living-group')).toBe('Livestock');
   expect(card.dataset.careState).toBe('needs-care');
   expect(card.querySelector('[role=meter][aria-label=Food]')!.getAttribute('aria-valuenow')).toBe('90');
   expect(card.querySelector('[role=meter][aria-label=Water]')!.getAttribute('aria-valuenow')).toBe('10');
 }finally{overlay.destroy();spy.mockRestore();root.remove();}
});
import {createPhase1HudOverlay} from '../../src/client/presentation/Phase1HudOverlay';
import {resolvePhase1PresentationQaFixture} from '../../src/client/qa/Phase1PresentationFixture';
it('keeps compact crafting arrows named in both languages and exposes material sufficiency',()=>{
 const root=document.createElement('section'),canvas=document.createElement('canvas');root.append(canvas);document.body.append(root);const fixture=resolvePhase1PresentationQaFixture('?qaPhase1=craft')!;
 const panel={kind:'craft' as const,title:'Craft',page:0,pageCount:2,rows:[{id:'brick',name:'Brick',outputLabel:'×1',requirementLabel:'Clay',state:'BLOCKED' as const,reason:null,ingredients:[{itemId:'item:clay',name:'Clay',source:'Gather Clay',have:0,need:2}]}]};
 const overlay=createPhase1HudOverlay(root,canvas,{...fixture.state,panel});
 try{const next=root.querySelector('[data-review-action=craft-next]')!;expect(next.textContent).toBe('›');expect(next.getAttribute('aria-label')).toBe('Next page [PgDn]');expect(root.querySelector('.p1-craft-ingredient')!.getAttribute('data-sufficient')).toBe('false');setLocale('vi');expect(next.getAttribute('aria-label')).toBe('Trang sau [PgDn]');expect(next.textContent).toBe('›');}finally{overlay.destroy();root.remove();setLocale('en');}
});
it('preserves the weather icon while its separate caption changes language',()=>{
 const root=document.createElement('section'),canvas=document.createElement('canvas');root.append(canvas);document.body.append(root);const fixture=resolvePhase1PresentationQaFixture('?qaPhase1=overview')!;
 const overlay=createPhase1HudOverlay(root,canvas,{...fixture.state,world:{...fixture.state.world,weatherLabel:'CLEAR'}});
 try{const weather=root.querySelector('.p1-world-weather')!;expect(weather.querySelector('[data-asset-path="assets/phase1/ui/icons/hud_status_icons.png"]')).not.toBeNull();setLocale('vi');expect(weather.querySelector('.p1-weather-label')!.textContent).toBe('Trời quang');expect(weather.querySelector('[data-asset-path="assets/phase1/ui/icons/hud_status_icons.png"]')).not.toBeNull();}finally{overlay.destroy();root.remove();setLocale('en');}
});

it('uses one opaque fog mass without per-cell gradients or texture detail',()=>{
 for(let mask=0;mask<16;mask++){
  const svg=decodeURIComponent(fogFrontierSprite(mask).url);
  expect(svg).not.toContain('Gradient');expect(svg).toContain('fill="#14252e"');
  expect(svg).not.toMatch(/terrain|biome|resource/);
 }
});
