import {expect,it} from 'vitest';
import {createPhase1ContentCatalog} from '../../src/content';
import {Phase1ItemAuthority,Phase1SurvivalAuthority,Phase1EquipmentAuthority} from '../../src/simulation';
import {WEARABLE_ITEMS,wearableThermalTarget} from '../../src/content/livingworld/WearableContent';
import {Phase1SurvivalTestWorld} from '../support/Phase1SurvivalTestWorld';
function fixture(worn:boolean){
  const catalog=createPhase1ContentCatalog(),items=new Phase1ItemAuthority({catalog,world:new Phase1SurvivalTestWorld(),initialLedger:{containers:[{containerId:'inventory:p',kind:'player-inventory',ownerPlayerId:'p',revision:0,stacks:WEARABLE_ITEMS.map((i,n)=>({stackId:'gear:'+n,itemDefinitionId:i.id,quantity:1,condition:100}))}]}});
  const equipment=new Phase1EquipmentAuthority(items);equipment.registerPlayer('p');
  if(worn){expect(equipment.equipWearable('p','feet','gear:2').status).toBe('committed');expect(equipment.equipWearable('p','accessory','gear:3').status).toBe('committed');}
  const survival=new Phase1SurvivalAuthority({catalog,items});survival.registerPlayer('p');return {survival,equipment,catalog,items};
}
it('worn boots reduce actual sprint cost to 6.4/s and the hydration pack drains 0.8 water/minute without supplying water',()=>{
  const ordinary=fixture(false),worn=fixture(true);
  for(let tick=1;tick<=3600;tick++)for(const actor of [ordinary,worn])actor.survival.stepPlayer('p',tick,{thermalTarget:50,thermalWrapActive:false,carryState:'NORMAL',sprinting:tick<=60,...actor.equipment.survivalModifiers('p')});
  expect(ordinary.survival.getPlayerState('p').waterMilli).toBe(79000);expect(worn.survival.getPlayerState('p').waterMilli).toBe(79200);
  // Test sprint alone before regeneration can refill the meter.
  const a=fixture(false),b=fixture(true);
  for(let tick=1;tick<=60;tick++)for(const actor of [a,b])actor.survival.stepPlayer('p',tick,{thermalTarget:50,thermalWrapActive:false,carryState:'NORMAL',sprinting:true,...actor.equipment.survivalModifiers('p')});
  expect(a.survival.getPlayerState('p').staminaMilli).toBe(92000);expect(b.survival.getPlayerState('p').staminaMilli).toBe(93600);
  expect(a.survival.getPlayerState('p').foodMilli).toBe(b.survival.getPlayerState('p').foodMilli);expect(b.survival.getPlayerState('p').foodMilli).toBe(69988);
  b.equipment.equipWearable('p','feet',null);
  for(let tick=61;tick<=120;tick++)b.survival.stepPlayer('p',tick,{thermalTarget:50,thermalWrapActive:false,carryState:'NORMAL',sprinting:true,...b.equipment.survivalModifiers('p')});
  expect(b.survival.getPlayerState('p').staminaMilli).toBe(85600);
});

it('head and leg insulation improve actual temperature in heat/cold and reject equip while dead',()=>{
  for(const [target,slot,stackId] of [[25,'legs','gear:1'],[75,'head','gear:0']] as const){
    const actor=fixture(false);actor.equipment.equipWearable('p',slot,stackId);
    const initial=actor.survival.exportSnapshot();
    const survival=new Phase1SurvivalAuthority({catalog:actor.catalog,items:actor.items,snapshot:{...initial,players:initial.players.map(p=>({...p,temperatureMilli:target*1000}))}});
    for(let tick=1;tick<=3600;tick++)survival.stepPlayer('p',tick,{thermalTarget:wearableThermalTarget(target,actor.equipment.survivalModifiers('p')),thermalWrapActive:false,carryState:'NORMAL'});
    expect(survival.getPlayerState('p').temperatureMilli).toBe((target===25?31:69)*1000);
    expect(wearableThermalTarget(49,actor.equipment.survivalModifiers('p'))).toBeGreaterThanOrEqual(49);
    const dead=new Phase1EquipmentAuthority(actor.items,[],()=>false);dead.registerPlayer('p');const before=dead.getView('p');
    expect(dead.equipWearable('p',slot,stackId)).toEqual({status:'rejected',reason:'NOT_ALIVE'});expect(dead.getView('p')).toEqual(before);
  }
});
