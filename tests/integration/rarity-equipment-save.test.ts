import { expect, it } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1ContentCatalog } from '../../src/content';
import { createFishingV1ContentCatalog } from '../../src/content/phase1/Phase1Catalog';
import { GEAR_ITEMS } from '../../src/content/livingworld/EquipmentContent';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';

const config = { worldId:'world:rarity-save',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,worldGenerationVersion:5,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0 };
const portable = (bundle: Phase1AuthorityBundle) => { const save=composePhase1SaveV2(bundle,{nowUtc:'2026-10-03T00:00:00Z'});return {...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'}; };
it('all six weapon tiers conserve IDs/durability across Save V2 and reject forged equipment slots',async()=>{
  const bundle=await Phase1AuthorityBundle.create(config);let reopened:Phase1AuthorityBundle|null=null;
  try {
    bundle.getRuntime('solo');await bundle.stepSolo();
    expect(bundle.items.commitColonyExchange({ operationId:'fixture:all-tiers',playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:['item:basic-spear',...GEAR_ITEMS.map(i=>i.id)].map(itemDefinitionId=>({itemDefinitionId,quantity:1})) }).status).toBe('committed');
    const stack=bundle.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId==='item:mythic-relic-spear')!;
    expect(bundle.equipWeapon('solo',stack.stackId).status).toBe('committed');
    expect(bundle.items.execute({type:'wear',operationId:'fixture:prior-hit',playerId:'solo',inventoryContainerId:'inventory:solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,targetStackId:stack.stackId,conditionLoss:7}).status).toBe('committed');
    const save=portable(bundle),policy=createPhase1SaveV2Compatibility(bundle.catalog,[3,4,5]);
    const loaded=reconstructPhase1ReopenState(save,policy);expect(loaded.ok,JSON.stringify(loaded)).toBe(true);if(!loaded.ok)throw Error(loaded.message);
    reopened=await Phase1AuthorityBundle.create({...config,reopen:loaded.value});
    expect(reopened.items.exportLedgerSnapshot()).toEqual(bundle.items.exportLedgerSnapshot());expect(reopened.equipment.getView('solo')).toEqual(bundle.equipment.getView('solo'));
    expect(reopened.catalog.getAs(stack.itemDefinitionId,'item').rarity).toBe('mythic');
    expect(reopened.items.getContainerView('inventory:solo').stacks.find(s=>s.stackId===stack.stackId)!.condition).toBe(93);
    for(const equipment of [{...save.players[0]!.equipment,equippedWeaponStackId:'foreign:stack'},{...save.players[0]!.equipment,equippedThermalWrapStackId:stack.stackId}]) expect(reconstructPhase1ReopenState({...save,players:[{...save.players[0]!,equipment}]},policy).ok).toBe(false);
  } finally {await reopened?.destroy();await bundle.destroy();}
});
it('exact pre-rarity fishing saves retain generation and items but cannot hide rarity gear under the older catalog identity',async()=>{
  const old=await Phase1AuthorityBundle.create({...config,catalog:createFishingV1ContentCatalog()});let current:Phase1AuthorityBundle|null=null;
  try {
    old.getRuntime('solo');await old.stepSolo();
    expect(old.items.commitColonyExchange({operationId:'fixture:old-rod',playerId:'solo',expectedInventoryRevision:old.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:fishing-rod',quantity:1}]}).status).toBe('committed');
    const save=portable(old),policy=createPhase1SaveV2Compatibility(createPhase1ContentCatalog(),[3,4,5]),loaded=reconstructPhase1ReopenState(save,policy);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.message);
    current=await Phase1AuthorityBundle.create({...config,reopen:loaded.value});
    expect(current.items.exportLedgerSnapshot()).toEqual(old.items.exportLedgerSnapshot());expect(current.world.getActiveChunkViews().map(c=>c.base)).toEqual(old.world.getActiveChunkViews().map(c=>c.base));expect(current.livingWorld!.read()).toEqual(old.livingWorld!.read());
    expect(current.items.commitColonyExchange({operationId:'fixture:new-gear',playerId:'solo',expectedInventoryRevision:current.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:relic-spear',quantity:1}]}).status).toBe('committed');
    const after=portable(current);expect(reconstructPhase1ReopenState(after,policy).ok).toBe(true);
    expect(reconstructPhase1ReopenState({...after,world:{...after.world,contentCompatibility:save.world.contentCompatibility}},policy).ok).toBe(false);
    expect(reconstructPhase1ReopenState({...after,world:{...after.world,contentCompatibility:{...after.world.contentCompatibility,canonicalFingerprint:'unknown'}}},policy).ok).toBe(false);
  } finally {await current?.destroy();await old.destroy();}
});
