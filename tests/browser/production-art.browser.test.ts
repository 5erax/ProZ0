import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { applyProductionSprite, PHASE1_PRODUCTION_WORLD_SPRITES, playerActorSprite, itemIconSprite, type Phase1ProductionSprite } from '../../src/client/presentation/Phase1ProductionAssets';
import { fieldFacilitySprite } from '../../src/client/presentation/FieldFacilityArt';
import { livingArt } from '../../src/client/presentation/LivingWorldArt';
import { heldSpearSprite, wearableSprite } from '../../src/client/presentation/EquipmentArt';
it('decodes every new pose and facility and captures a same-scale art comparison',async()=>{
  await page.viewport(1100,800);
  const sheet=document.createElement('section');sheet.style.cssText='width:1000px;background:#30453f;color:#e2e8d6;font:14px monospace;padding:16px;';document.body.append(sheet);
  const sprite=(value:Phase1ProductionSprite,host:HTMLElement,x:number,y:number,scale=2)=>{const node=document.createElement('span');applyProductionSprite(node,value,scale);node.style.cssText+=';position:absolute;left:'+x+'px;bottom:'+y+'px;';host.append(node);};
  const decode=async(s:Phase1ProductionSprite)=>{const image=new Image();image.src=s.url;await image.decode();expect(image.naturalWidth).toBe(s.sourceWidth);};
  try {
    await decode(PHASE1_PRODUCTION_WORLD_SPRITES.player);await decode(PHASE1_PRODUCTION_WORLD_SPRITES.thermalWrap);
    const assets=[['storage-crate',.75,.75],['workbench',1.25,.75],['compact-power-unit',1,1],['atmospheric-water-condenser',1,1],['habitat-room',2.5,2],['greenhouse',2,2],['rain-collector',1,1]] as const;
    for(const [id,w,d] of assets)for(let rotation=0;rotation<4;rotation++)await decode(fieldFacilitySprite(id,w,d,rotation));
    const original:Phase1ProductionSprite={assetPath:'before',url:new URL('../../assets/phase1/actors/player_pioneer.png',import.meta.url).href,cellWidth:32,cellHeight:48,sourceWidth:1056,sourceHeight:240,columns:33,index:0};
    const before=original;
    await decode(before);
    for(const [label,old] of [['Before — existing assets',true],['After — native diorama art',false]] as const){
      const title=document.createElement('h2');title.textContent=label;sheet.append(title);
      const stage=document.createElement('div');stage.style.cssText='position:relative;width:960px;height:230px;border:1px solid #68857a;background:#314c40;';sheet.append(stage);
      stage.insertAdjacentHTML('beforeend',`<div style="position:absolute;left:20px;bottom:0;width:100px;height:100px;transform:scale(1.5);transform-origin:bottom left">${livingArt('forage','fiber-plant',0).markup}</div><div style="position:absolute;right:20px;bottom:0;width:100px;height:100px">${livingArt('animal','goat',0).markup}</div>`);
      sprite(old?before:playerActorSprite('S','IDLE',0).sprite,stage,140,12);
      if(!old){sprite(heldSpearSprite('S').sprite,stage,140,12);sprite(wearableSprite('head','S').sprite,stage,140,12);}
      const oldPaths=['storage_crate','workbench','compact_power_unit','atmospheric_water_condenser','habitat_room'];
      for(let i=0;i<5;i++){
        const [id,w,d]=assets[i]!,fresh=fieldFacilitySprite(id,w,d,0);
        const dimensions=[[32,32,32,32],[48,40,48,40],[48,48,240,48],[64,64,448,64],[128,96,512,288]][i]!;
        const value=old?{assetPath:'before:'+id,url:new URL('../../assets/phase1/world/structures/'+oldPaths[i]+'.png',import.meta.url).href,cellWidth:dimensions[0]!,cellHeight:dimensions[1]!,sourceWidth:dimensions[2]!,sourceHeight:dimensions[3]!,columns:dimensions[2]!/dimensions[0]!,index:0}:fresh;
        await decode(value);sprite(value,stage,240+i*118,12);
      }
      for(const [i,name] of ['Cordage','Stone Field Tool','Basic Spear','Thermal Wrap','Storage Crate Kit'].entries())sprite(old?{assetPath:'before:item',url:new URL('../../assets/phase1/items/item_icon_atlas.png',import.meta.url).href,cellWidth:24,cellHeight:24,sourceWidth:144,sourceHeight:72,columns:6,index:[6,7,8,9,12][i]!}:itemIconSprite(name)!,stage,140+i*100,160);
    }
    await page.elementLocator(sheet).screenshot({path:'../../.vitest/attachments/art-comparison-2026-10-04.png'});
  } finally {sheet.remove();}
});
