import { contentDisplayName } from '../localization/ContentText';
import { caveName } from '../localization/ResourceFacts';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
import type { Phase1AuthorityBundle } from '../../integration';
import type { WorldPosition } from '../../foundation';
import { projectPhase1Isometric } from '../runtime/Phase1IsometricProjection';
import { worldDepthOrder } from './WorldDepth';
import { bindEntityInspection } from './EntityInspection';
import { sizedResourceSprite } from './ResourceSizeArt';
import { applyProductionSprite } from './Phase1ProductionAssets';
import { resourceHarvestDefinition } from '../../content/livingworld/ResourceSizeProfiles';
import { mountainAt } from '../../world/phase2/SoloMountain';

/** One bounded interior, driven by canonical fog and cargo. No second RAF or simulation. */
export function createSoloCaveScene(root: HTMLElement, stage: HTMLElement, bundle: Phase1AuthorityBundle, origin: WorldPosition) {
  const nodes = new Map<string, HTMLElement>();
  const document = root.ownerDocument;
  const place = (id: string, p: WorldPosition, camera: WorldPosition, width: number, height: number, floor = false) => {
    const visible = projectPhase1Isometric(p, camera);
    if (Math.abs(visible.x) > 368 || Math.abs(visible.y) > 228) return null;
    let e = nodes.get(id);
    if (!e) { e = document.createElement('div'); nodes.set(id, e); stage.append(e); }
    const at = projectPhase1Isometric(p, origin);
    e.dataset.caveScene = 'true';
    e.style.position = 'absolute'; e.style.left = 320 + at.x - width/2 + 'px'; e.style.top = 180 + at.y - height + 'px';
    if(bundle.caves?.isSurface())e.style.top=Number.parseFloat(e.style.top)-mountainAt(p,bundle.caves.portals).height*4+'px';
    e.style.width = width+'px'; e.style.height = height+'px';
    e.style.zIndex = floor ? '-20000' : worldDepthOrder(p);
    return e;
  };
  const clear = () => { for (const e of nodes.values()) e.remove(); nodes.clear(); };
  const portal = (id:string,p:WorldPosition,camera:WorldPosition,name:string,exit=false) => {
    const e=place(id,p,camera,48,48); if(!e)return;
    e.dataset.worldRole='cave-portal';e.dataset.worldId=id;e.setAttribute('role','button');e.tabIndex=0;
    bindUiText(e,"aria-label",(exit?uiText("ui.a5b5dd5f"):uiText("ui.9104b6f7"))+name);e.style.pointerEvents='auto';e.style.cursor='pointer';
    if(!e.firstChild)e.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" shape-rendering="crispEdges" aria-hidden="true"><path fill="#31434b" d="M4 46V26h5V14h9V8h13v9h9v11h5v18Z"/><path fill="#71817b" d="M9 26V16h9v-5h10v8H17v8Z"/><path fill="#08121c" d="M17 46V28h4v-6h10v7h5v17Z"/><path fill="#b19a69" d="M14 43h24v3H14Zm7-4h12v3H21Z"/><path fill="#aac4c1" d="M36 24h3v7h-3Z"/></svg>';
    bindEntityInspection(e,()=>({id,name,kind:exit?uiText("ui.39d49ed8"):uiText("ui.7b067cb6"),facts:[uiText("ui.fb457a47"),uiText("ui.44f24764")+(exit?uiText("ui.7e787e9c"):uiText("ui.53fae749")),uiText("ui.9bf57e4e")]}));
  };
  let spaceId='';
  return {
    render(camera:WorldPosition):boolean {
      const caves=bundle.caves;if(!caves){clear();return false;}
      const next=caves.read().actor.location.spaceId;if(next!==spaceId){clear();spaceId=next;}
      const visibleIds=new Set<string>();
      if(caves.isSurface()){
        for(const p of caves.portals)if(bundle.world.isExploredPosition(p.position)){portal(p.id,p.position,camera,caveName(p.layout.templateId));visibleIds.add(p.id);}
      }else{
        const layout=caves.activeLayout()!,space=caves.read().spaces.find(s=>s.progress.spaceId===layout.spaceId)!;
        for(const i of space.progress.exploredCellIndices){
          const p={x:i%layout.width+.5,y:Math.floor(i/layout.width)+.5},tile=layout.cells[i]!,id='tile:'+i;
          const e=place(id,p,camera,32,tile==='wall'?36:16,tile!=='wall');if(!e)continue;visibleIds.add(id);
          e.dataset.caveTile=tile;e.style.pointerEvents='none';
          const tint=layout.templateId==='iron-vault'?'#736d5b':layout.templateId==='drip-grotto'?'#456e70':'#62747a';
          if(!e.firstChild)e.innerHTML=tile==='wall'?'<svg viewBox="0 0 32 36" aria-hidden="true"><path fill="'+tint+'" d="m0 8 16-8 16 8-16 8Z"/><path fill="#2e4148" d="m0 8 16 8v20L0 28Z"/><path fill="#3e5359" d="m16 16 16-8v20l-16 8Z"/><path fill="#80928b" opacity=".4" d="m4 8 12-6 12 6-12 6Z"/></svg>':'<svg viewBox="0 0 32 16" aria-hidden="true"><path fill="'+(tile==='water'?'#356572':tint)+'" d="m0 8 16-8 16 8-16 8Z"/><path fill="#172c30" opacity=".2" d="m4 8 12-6 12 6-12 6Z"/></svg>';
        }
        const exitId='exit:'+layout.portalId;portal(exitId,layout.exit,camera,caveName(layout.templateId),true);visibleIds.add(exitId);
        for(const n of layout.nodes){const r=caves.getResource(n.id);if(!r)continue;
          const e=place(n.id,n.position,camera,64,80);if(!e)continue;visibleIds.add(n.id);
          e.dataset.worldRole='resource';e.dataset.worldId=n.id;e.dataset.caveResource='true';e.dataset.depleted=String(r.depleted);e.setAttribute('role','button');e.tabIndex=0;e.style.pointerEvents='auto';e.style.cursor='pointer';
          applyProductionSprite(e,sizedResourceSprite(n.resourceDefinitionId,r.size!,r.depleted));
          bindUiText(e,"aria-label",uiText("ui.7cc2b63e")+contentDisplayName(bundle.catalog.get(n.resourceDefinitionId)));
          bindEntityInspection(e,()=>{const current=caves.getResource(n.id);if(!current)return null;const harvest=resourceHarvestDefinition(bundle.catalog.getAs(n.resourceDefinitionId,'resource'),current.size);return {id:n.id,name:contentDisplayName(bundle.catalog.get(n.resourceDefinitionId)),kind:uiText("ui.83272add"),facts:[current.depleted?uiText("ui.fd4adefb"):uiText("ui.6ac9b7f4")+harvest.output.quantity+' '+contentDisplayName(bundle.catalog.get(harvest.output.itemId)),uiText("ui.533cfe1b")]};});
        }
        for(const cargo of [...space.drops,...space.deathCaches]){
          const isDrop='worldDropId' in cargo,id=isDrop?cargo.worldDropId:cargo.entityId;
          if(!space.progress.exploredCellIndices.includes(Math.floor(cargo.position.y)*layout.width+Math.floor(cargo.position.x)))continue;
          const e=place(id,cargo.position,camera,24,20);if(!e)continue;visibleIds.add(id);
          e.dataset.worldRole=isDrop?'world-drop':'death-cache';e.dataset.worldId=id;e.setAttribute('role','button');e.tabIndex=0;e.style.pointerEvents='auto';
          bindUiText(e,"textContent",isDrop?'▣':'◇');e.style.cssText+=';font:20px monospace;color:#d6ba83;background:#233840';bindUiText(e,"aria-label",isDrop?uiText("ui.1eab2711"):uiText("ui.1db1eeeb"));
          bindEntityInspection(e,()=>bundle.interactionWorld.isContainerAccessible(bundle.caves!.read().actor.playerId,cargo.containerId)?{id,name:isDrop?uiText("ui.1eab2711"):uiText("ui.1db1eeeb"),kind:uiText("ui.2af99026"),facts:[uiText("ui.2cdc23ac")]}:null);
        }
      }
      for(const [id,e] of nodes)if(!visibleIds.has(id)){e.remove();nodes.delete(id);}
      root.dataset.worldspace=spaceId;
      return !caves.isSurface();
    },destroy:clear,
  };
}
