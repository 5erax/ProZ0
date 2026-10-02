import {expect,it} from 'vitest';
import {createPhase1ContentCatalog} from '../../src/content';
import {Phase1ItemAuthority} from '../../src/simulation/items';
import {ExpeditionAuthority} from '../../src/simulation/expedition/ExpeditionAuthority';
import {Phase1BuildingWorld} from '../../src/world/building/Phase1BuildingWorld';
import {Phase1BuildingTestSpatial} from '../support/Phase1BuildingTestSpatial';
import {Phase1ItemTestWorld} from '../support/Phase1ItemTestWorld';
import {expeditionEventKind} from '../../src/content/singleplayer/ExpeditionEcology';
it('time and ecology generate saved regional events; reopen keeps the cursor and never duplicates a due event',()=>{
 const items=new Phase1ItemAuthority({catalog:createPhase1ContentCatalog(),world:new Phase1ItemTestWorld(),initialLedger:{containers:[{containerId:'inventory:solo',kind:'player-inventory',ownerPlayerId:'solo',revision:0,stacks:[]}]}});
 let tick=0;const services={seed:'expedition-alpha',pressure:()=>7,tick:()=>tick,survival:()=>({healthMilli:100000,foodMilli:60000,waterMilli:60000,lifeState:{type:'alive'}}),completeRest:()=>false,meal:()=>false,weather:()=> 'clear',hostileNear:()=>false};const buildings=new Phase1BuildingWorld(new Phase1BuildingTestSpatial(),undefined,true),actor=()=>({x:80,y:-2,alive:true});
 const original=new ExpeditionAuthority(items,buildings,actor,undefined,services);tick=7199;original.tick();expect(original.read().events).toHaveLength(0);tick=7200;original.tick();expect(original.read().events).toHaveLength(1);expect(original.read().events[0]?.region).toBe('1:-1');
 const reopened=new ExpeditionAuthority(items,buildings,actor,original.read(),services);reopened.tick();expect(reopened.read()).toEqual(original.read());expect(reopened.currentEvent({x:80,y:-2})).toBeDefined();expect(reopened.currentEvent({x:0,y:0})).toBeUndefined();tick=14400;original.tick();reopened.tick();expect(reopened.read()).toEqual(original.read());expect(reopened.read().events).toHaveLength(2);
 expect(new Set(Array.from({length:20},(_,i)=>expeditionEventKind('seed-'+String(i),7200,'1:-1',i,'clear'))).size).toBe(4);
});
