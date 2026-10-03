import {expect,it} from 'vitest';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {createPhase1SaveV2Compatibility,reconstructPhase1ReopenState} from '../../src/persistence';
import type {LivingCommand} from '../../src/simulation/livingworld/LivingWorldAuthority';

async function fixture(weapon:string,condition=100){
  const config={worldId:'world:hunt',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0,interactionRangeWorldUnits:4};
  const source=await Phase1AuthorityBundle.create(config);
  try {
    await source.stepSolo();
    expect(source.items.commitColonyExchange({operationId:'fixture:weapon',playerId:'solo',expectedInventoryRevision:source.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:weapon,quantity:1}]}).status).toBe('committed');
    const stack=source.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId===weapon)!;
    expect(source.equipWeapon('solo',stack.stackId).status).toBe('committed');
    const composed=composePhase1SaveV2(source,{nowUtc:'2026-10-03T00:00:00Z'});
    const save={...composed,containers:composed.containers.map(c=>({...c,stacks:c.stacks.map(s=>s.stackId===stack.stackId?{...s,condition}:s)}))};
    save.world.livingWorld!.animals=[0,1].map(i=>({id:'wolf:'+i,species:'wolf',x:.5,y:i*.25,anchorX:.5,anchorY:i*.25,age:18000,health:12,sex:0,energy:10000,thirst:10000,breedTick:0,product:0,productTicks:0,pen:null,owner:null,attackTick:0,shearTick:0}));
    const restored=reconstructPhase1ReopenState({...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'},createPhase1SaveV2Compatibility(source.catalog,[3,4,5]));
    expect(restored.ok).toBe(true);if(!restored.ok)throw Error(restored.message);
    return await Phase1AuthorityBundle.create({...config,reopen:restored.value});
  } finally {await source.destroy();}
}
const command=(b:Phase1AuthorityBundle,id:string,target='wolf:0'):LivingCommand=>({id,playerId:'solo',expectedRevision:b.livingWorld!.read().revision,expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,action:'hunt',target});
it('hunting uses equipped rarity damage and atomically spends actual stamina and weapon wear once',async()=>{
  for(const [weapon,damage,cost] of [['item:basic-spear',4,15],['item:mythic-relic-spear',8,20]] as const){
    const b=await fixture(weapon);
    try{
      const op=command(b,'hunt:one'),before=b.survival.getPlayerState('solo'),stack=b.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId===weapon)!;
      expect(b.livingWorld!.execute(op).status).toBe('committed');
      expect(b.livingWorld!.read().animals[0]!.health).toBe(12-damage);
      expect(b.survival.getPlayerState('solo').staminaMilli).toBe(before.staminaMilli-cost*1000);
      expect(b.items.getContainerView('inventory:solo').stacks.find(s=>s.stackId===stack.stackId)!.condition).toBe(99);
      const ledger=b.items.exportLedgerSnapshot(),survival=b.survival.getPlayerState('solo'),living=b.livingWorld!.read();
      expect(b.livingWorld!.execute(op).status).toBe('committed');
      expect(b.livingWorld!.execute(command(b,'hunt:other','wolf:1')).message).toBe('COOLDOWN');
      expect(b.items.exportLedgerSnapshot()).toEqual(ledger);expect(b.survival.getPlayerState('solo')).toEqual(survival);expect(b.livingWorld!.read()).toEqual(living);
    }finally{await b.destroy();}
  }
});
it('out-of-range, exhausted and broken hunts keep wildlife, ledger and stamina unchanged',async()=>{
  for(const reason of ['OUT_OF_WEAPON_RANGE','EXHAUSTED','BROKEN_WEAPON']){
    const b=await fixture('item:basic-spear',reason==='BROKEN_WEAPON'?0:100);
    try{
      if(reason==='OUT_OF_WEAPON_RANGE'){b.getRuntime('solo').relocatePlayer({x:2,y:0});await b.stepSolo();}
      if(reason==='EXHAUSTED')b.survival.commitStaminaSpend('solo',100,b.survival.getPlayerState('solo').tick);
      const living=b.livingWorld!.read(),ledger=b.items.exportLedgerSnapshot(),survival=b.survival.getPlayerState('solo');
      const result=b.livingWorld!.execute(command(b,'hunt:rejected'));
      expect(result.message).toBe(reason);
      expect(b.livingWorld!.read()).toEqual(living);expect(b.items.exportLedgerSnapshot()).toEqual(ledger);expect(b.survival.getPlayerState('solo')).toEqual(survival);
    }finally{await b.destroy();}
  }
});
it('player hunting cooldown survives reopening and wildlife AI cooldown never makes an animal invulnerable',async()=>{
  const b=await fixture('item:basic-spear');let reopened:Phase1AuthorityBundle|null=null;
  try{
    const source=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});
    source.world.livingWorld!.animals[0]!.attackTick=180;
    const policy=createPhase1SaveV2Compatibility(b.catalog,[3,4,5]);
    const restore=(save:typeof source)=>reconstructPhase1ReopenState({...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'},policy);
    const initial=restore(source);expect(initial.ok).toBe(true);if(!initial.ok)throw Error(initial.message);
    reopened=await Phase1AuthorityBundle.create({...b.config,reopen:initial.value});
    expect(reopened.livingWorld!.execute(command(reopened,'hunt:ai-independent')).status).toBe('committed');
    expect(reopened.livingWorld!.read().animals[0]!.attackTick).toBe(180);
    const save=composePhase1SaveV2(reopened,{nowUtc:'2026-10-03T00:00:00Z'}),again=restore(save);expect(again.ok).toBe(true);if(!again.ok)throw Error(again.message);
    await reopened.destroy();reopened=await Phase1AuthorityBundle.create({...b.config,reopen:again.value});
    expect(reopened.livingWorld!.execute(command(reopened,'hunt:after-reopen','wolf:1')).message).toBe('COOLDOWN');
    expect(reopened.combat.prepareLivingHunt('solo',reopened.items.getContainerView('inventory:solo').revision,{x:.5,y:.25})).toBe('COOLDOWN');
    for(const cooldowns of [{version:2,until:{}},{version:1,until:{missing:40}},{version:1,until:{solo:100000}},null]){
      const invalid={...save,world:{...save.world,livingWorld:{...save.world.livingWorld!,huntCooldowns:cooldowns}}};
      expect(reconstructPhase1ReopenState({...invalid,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'},policy).ok).toBe(false);
    }
  }finally{await reopened?.destroy();await b.destroy();}
});
