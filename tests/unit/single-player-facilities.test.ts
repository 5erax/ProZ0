import {expect,it} from 'vitest';
import {createPhase1ContentCatalog} from '../../src/content';
import {Phase1ItemAuthority} from '../../src/simulation/items';
import {ExpeditionAuthority} from '../../src/simulation/expedition/ExpeditionAuthority';
import {emptyExpeditionState} from '../../src/simulation/expedition/ExpeditionState';
import {Phase1BuildingWorld} from '../../src/world/building/Phase1BuildingWorld';
import {Phase1BuildingTestSpatial} from '../support/Phase1BuildingTestSpatial';
import {Phase1ItemTestWorld} from '../support/Phase1ItemTestWorld';
it('rain collector grows a bounded buffer only during rain, harvests once, and campfire spends real ingredients',()=>{
 const items=new Phase1ItemAuthority({catalog:createPhase1ContentCatalog(),world:new Phase1ItemTestWorld(),initialLedger:{containers:[{containerId:'inventory:solo',kind:'player-inventory',ownerPlayerId:'solo',revision:0,stacks:[{stackId:'plant',itemDefinitionId:'item:edible-plant',quantity:2,condition:null}]}]}});
 let tick=0,weather='clear',meals=0;const facility={id:'collector',owner:'solo',definitionId:'rain-collector' as const,x:0,y:0,orientation:0 as const,canonicalStructureId:null,water:0,progress:0};
 const authority=new ExpeditionAuthority(items,new Phase1BuildingWorld(new Phase1BuildingTestSpatial(),undefined,true),()=>({x:0,y:0,alive:true}),{...emptyExpeditionState(),facilities:[facility,{...facility,id:'fire',definitionId:'campfire'}]}, {tick:()=>tick,survival:()=>({healthMilli:100000,foodMilli:60000,waterMilli:60000,lifeState:{type:'alive'}}),completeRest:()=>false,meal:()=>{meals++;return true;},weather:()=>weather,hostileNear:()=>false});
 for(tick=0;tick<100;tick++)authority.tick();expect(authority.read().facilities[0]?.progress).toBe(0);weather='mist-rain';for(tick=100;tick<3610;tick++)authority.tick();expect(authority.read().facilities[0]?.water).toBe(0);for(;tick<14500;tick++)authority.tick();expect(authority.read().facilities[0]?.water).toBe(4);expect(authority.read().facilities[0]?.progress).toBe(0);
 const water={id:'collect',playerId:'solo',target:'collector',action:'water' as const,expectedRevision:authority.read().revision,expectedInventoryRevision:0};expect(authority.interact(water).status).toBe('committed');const ledger=items.exportLedgerSnapshot();expect(authority.interact(water).status).toBe('committed');expect(items.exportLedgerSnapshot()).toEqual(ledger);expect(authority.read().facilities[0]?.water).toBe(0);
 expect(authority.interact({id:'meal',playerId:'solo',target:'fire',action:'cook',expectedRevision:authority.read().revision,expectedInventoryRevision:1}).status).toBe('committed');expect(meals).toBe(1);expect(items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId==='item:clean-water')?.quantity).toBe(3);expect(items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId==='item:edible-plant')?.quantity).toBe(1);
});
