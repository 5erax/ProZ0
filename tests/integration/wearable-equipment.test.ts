import {expect,it} from 'vitest';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {createPhase1ContentCatalog} from '../../src/content';
import {createRootsV2ContentCatalog} from '../../src/content/phase1/Phase1Catalog';
import {emptyWearables,WEARABLE_ITEMS,WEARABLE_PROFILES} from '../../src/content/livingworld/WearableContent';
import {createPhase1SaveV2Compatibility,reconstructPhase1ReopenState} from '../../src/persistence';
const config={worldId:'world:wearables',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0};
const portable=(b:Phase1AuthorityBundle)=>{const s=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});return {...s,formatId:s.world.formatId,schemaVersion:s.world.schemaVersion,recordKind:'portable-bundle'};};
it('four wearable slots have authoritative effects, conserve bag capacity, persist ownership and reject forged saves',async()=>{
  const b=await Phase1AuthorityBundle.create(config);let reopened:Phase1AuthorityBundle|null=null;
  try{
    await b.stepSolo();
    expect(b.items.commitColonyExchange({operationId:'fixture:wearables',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:WEARABLE_ITEMS.map(i=>({itemDefinitionId:i.id,quantity:1}))}).status).toBe('committed');
    const before=b.items.exportLedgerSnapshot();
    for(const profile of WEARABLE_PROFILES){
      const stack=b.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId===profile.id)!;
      expect(b.equipment.equipWearable('solo',profile.slot,stack.stackId).status).toBe('committed');
      expect(b.equipment.equipWeapon('solo',stack.stackId).status).toBe('rejected');
      expect(b.equipment.equipWearable('solo',profile.slot==='head'?'feet':'head',stack.stackId).status).toBe('rejected');
    }
    expect(b.items.exportLedgerSnapshot()).toEqual(before);
    expect(b.equipment.survivalModifiers('solo')).toEqual({heatProtection:8,coldProtection:8,sprintStaminaPercent:80,waterDrainPercent:80});
    const save=portable(b),policy=createPhase1SaveV2Compatibility(b.catalog,[3,4,5]),loaded=reconstructPhase1ReopenState(save,policy);
    expect(loaded.ok,JSON.stringify(loaded)).toBe(true);if(!loaded.ok)throw Error(loaded.message);
    reopened=await Phase1AuthorityBundle.create({...config,reopen:loaded.value});
    expect(reopened.equipment.getView('solo')).toEqual(b.equipment.getView('solo'));expect(reopened.items.exportLedgerSnapshot()).toEqual(before);
    const boots=save.players[0]!.equipment.wearables!.feet!;
    for(const wearables of [null,{...emptyWearables(),version:2},{...emptyWearables(),feet:'foreign'},{...emptyWearables(),head:boots},{...emptyWearables(),extra:'bad'}]){
      const invalid={...save,players:[{...save.players[0]!,equipment:{...save.players[0]!.equipment,wearables}}]};
      expect(reconstructPhase1ReopenState(invalid,policy).ok).toBe(false);
    }
    expect(b.items.execute({type:'wear',operationId:'fixture:broken-boots',playerId:'solo',inventoryContainerId:'inventory:solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,targetStackId:boots,conditionLoss:100}).status).toBe('committed');
    expect(b.equipment.survivalModifiers('solo').sprintStaminaPercent).toBe(100);
    expect(b.equipment.equipWearable('solo','feet',boots).status).toBe('rejected');
    const equipped=b.equipment.equippedStackIds('solo');expect(equipped).toHaveLength(4);
    const death=b.items.commitDeathCacheItems({deathId:'death:wearable',operationId:'death-items:wearable',playerId:'solo',inventoryContainerId:'inventory:solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,equippedStackIds:equipped});
    expect(death.status).toBe('committed');expect(b.equipment.reconcile('solo').wearables).toEqual(emptyWearables());
    expect(b.equipment.survivalModifiers('solo')).toEqual({heatProtection:0,coldProtection:0,sprintStaminaPercent:100,waterDrainPercent:100});
  }finally{await reopened?.destroy();await b.destroy();}
});
it('exact pre-wearable root saves retain surface generation, transplanted roots and legacy equipment without accepting hidden new items',async()=>{
  const old=await Phase1AuthorityBundle.create({...config,catalog:createRootsV2ContentCatalog()});let current:Phase1AuthorityBundle|null=null;
  try{
    await old.stepSolo();
    old.items.commitColonyExchange({operationId:'fixture:legacy-root',playerId:'solo',expectedInventoryRevision:old.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:root-timber-tree',quantity:1}]});
    const original=portable(old),save={...original,players:original.players.map(p=>({...p,equipment:{equippedWeaponStackId:p.equipment.equippedWeaponStackId,equippedThermalWrapStackId:p.equipment.equippedThermalWrapStackId}}))};
    const policy=createPhase1SaveV2Compatibility(createPhase1ContentCatalog(),[3,4,5]),loaded=reconstructPhase1ReopenState(save,policy);
    expect(loaded.ok,JSON.stringify(loaded)).toBe(true);if(!loaded.ok)throw Error(loaded.message);
    current=await Phase1AuthorityBundle.create({...config,reopen:loaded.value});
    expect(current.items.exportLedgerSnapshot()).toEqual(old.items.exportLedgerSnapshot());expect(current.world.getActiveChunkViews().map(c=>c.base)).toEqual(old.world.getActiveChunkViews().map(c=>c.base));expect(current.equipment.getView('solo').wearables).toEqual(emptyWearables());
    current.items.commitColonyExchange({operationId:'fixture:new-wearable',playerId:'solo',expectedInventoryRevision:current.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:sun-visor',quantity:1}]});
    const next=portable(current);expect(reconstructPhase1ReopenState(next,policy).ok).toBe(true);
    expect(reconstructPhase1ReopenState({...next,world:{...next.world,contentCompatibility:save.world.contentCompatibility}},policy).ok).toBe(false);
  }finally{await current?.destroy();await old.destroy();}
});
