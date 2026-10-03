import {expect,it} from 'vitest';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {createPhase1ContentCatalog} from '../../src/content';
import {createEquipmentV1ContentCatalog} from '../../src/content/phase1/Phase1Catalog';
import {createPhase1SaveV2Compatibility,reconstructPhase1ReopenState} from '../../src/persistence';
import type {LivingCommand} from '../../src/simulation/livingworld/LivingWorldAuthority';

const config = {worldId:'world:canonical-root',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0};
const portable = (b:Phase1AuthorityBundle) => {const s=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});return {...s,formatId:s.world.formatId,schemaVersion:s.world.schemaVersion,recordKind:'portable-bundle'};};
function command(b:Phase1AuthorityBundle,action:LivingCommand['action'],target:string,extra:Partial<LivingCommand>={}) {
  return {id:'root:'+action+':'+b.livingWorld!.read().revision,playerId:'solo',action,target,expectedRevision:b.livingWorld!.read().revision,expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,...extra};
}

it('canonical cut roots transfer once, remain removed after save/streaming, and can grow on a new explored site', async()=>{
  for (const version of [undefined,1] as const) {
    const bundle=await Phase1AuthorityBundle.create({...config,...(version?{resourceLifecycleVersion:version}:{})});let reopened:Phase1AuthorityBundle|undefined;
    try {
      const tree=bundle.world.getActiveGeneratedEntities().find(e=>e.type==='resource'&&e.definitionId==='resource:timber-source')!;
      expect(tree).toBeDefined(); bundle.getRuntime('solo').relocatePlayer(tree.position);await bundle.stepSolo();
      // Explicit boundary fixture prepares a harvested stump; uproot/replant use the real authority.
      while (!bundle.worldStore.getResourceState(tree.entityId)!.depleted) bundle.worldStore.commitResourceGather(tree.entityId,bundle.worldStore.getResourceState(tree.entityId)!.revision,bundle.authorityTick);
      expect(bundle.items.commitColonyExchange({operationId:'fixture:hoe',playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:field-hoe',quantity:1}]}).status).toBe('committed');
      const rootState=bundle.worldStore.getResourceState(tree.entityId)!;
      const stale=command(bundle,'uproot-canonical',tree.entityId,{resourceRevision:rootState.revision-1});
      expect(bundle.livingWorld!.execute(stale)).toMatchObject({status:'rejected',message:'STALE_RESOURCE_REVISION'});
      const uproot=command(bundle,'uproot-canonical',tree.entityId,{resourceRevision:rootState.revision});
      expect(bundle.livingWorld!.execute(uproot)).toMatchObject({status:'committed'});
      const after=bundle.items.exportLedgerSnapshot();expect(bundle.livingWorld!.execute(uproot)).toMatchObject({status:'committed'});expect(bundle.items.exportLedgerSnapshot()).toEqual(after);
      expect(bundle.world.getResource(tree.entityId)).toBeNull();
      expect(bundle.worldStore.getResourceState(tree.entityId)).toMatchObject({uprootedVersion:1,depleted:true,regenerationReadyTick:null});
      const sites=[];for(let y=tree.position.y-3;y<=tree.position.y+3;y++)for(let x=tree.position.x-3;x<=tree.position.x+3;x++)if(Math.hypot(x-tree.position.x,y-tree.position.y)<=4&&typeof bundle.buildings.assessPlacement('structure:storage-crate',{mode:'free',anchor:{x,y},orientationQuarterTurns:0},true)!=='string')sites.push({x,y});
      let planted=false;
      for (const site of sites) {const result=bundle.livingWorld!.execute(command(bundle,'replant','item:root-timber-tree',site));if(result.status==='committed'){planted=true;break;}}
      expect(planted).toBe(true);
      expect(bundle.items.getContainerView('inventory:solo').stacks.some(s=>s.itemDefinitionId==='item:root-timber-tree')).toBe(false);
      const sapling=bundle.livingWorld!.read().forage.find(f=>f.kind==='timber-tree')!;expect(sapling).toMatchObject({growth:{progress:0},lineage:'item:root-timber-tree'});
      const save=portable(bundle),policy=createPhase1SaveV2Compatibility(bundle.catalog,[3,4,5]);const restored=reconstructPhase1ReopenState(save,policy);expect(restored.ok,JSON.stringify(restored)).toBe(true);if(!restored.ok)throw Error(restored.message);
      reopened=await Phase1AuthorityBundle.create({...config,reopen:restored.value});await reopened.stepSolo();
      expect(reopened.world.getResource(tree.entityId)).toBeNull();expect(reopened.livingWorld!.read().forage.find(f=>f.id===sapling.id)).toMatchObject({kind:'timber-tree',lineage:'item:root-timber-tree'});
      expect(reopened.worldStore.getEnvironmentView().state.resourceLifecycleVersion).toBe(version);
    } finally {await bundle.destroy();await reopened?.destroy();}
  }
});

it('a full bag rejects uprooting before committing the canonical tombstone',async()=>{
  const bundle=await Phase1AuthorityBundle.create({...config,resourceLifecycleVersion:1});
  try {
    const tree=bundle.world.getActiveGeneratedEntities().find(e=>e.type==='resource'&&e.definitionId==='resource:timber-source')!;
    bundle.getRuntime('solo').relocatePlayer(tree.position);await bundle.stepSolo();
    while(!bundle.worldStore.getResourceState(tree.entityId)!.depleted)bundle.worldStore.commitResourceGather(tree.entityId,bundle.worldStore.getResourceState(tree.entityId)!.revision,bundle.authorityTick);
    expect(bundle.items.commitColonyExchange({operationId:'full:hoe',playerId:'solo',expectedInventoryRevision:0,inputs:[],outputs:[{itemDefinitionId:'item:field-hoe',quantity:1}]}).status).toBe('committed');
    // Fill by real exchanges until capacity refuses another unit; no direct ledger mutation.
    for(let n=0;n<600;n++){const r=bundle.items.commitColonyExchange({operationId:'full:'+n,playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:plant-fiber',quantity:1}]});if(r.status==='rejected')break;}
    const state=bundle.worldStore.getResourceState(tree.entityId)!,ledger=bundle.items.exportLedgerSnapshot();
    const r=bundle.livingWorld!.execute(command(bundle,'uproot-canonical',tree.entityId,{resourceRevision:state.revision}));
    expect(r.status).toBe('rejected');expect(bundle.items.exportLedgerSnapshot()).toEqual(ledger);expect(bundle.worldStore.getResourceState(tree.entityId)).toEqual(state);
  } finally {await bundle.destroy();}
});

it('the exact pre-transplant release catalog reopens without changing terrain, inventory or clock',async()=>{
  const old=await Phase1AuthorityBundle.create({...config,catalog:createEquipmentV1ContentCatalog()});let upgraded:Phase1AuthorityBundle|undefined;
  try {
    await old.stepSolo();const save=portable(old),policy=createPhase1SaveV2Compatibility(createPhase1ContentCatalog(),[3,4,5]);
    const restored=reconstructPhase1ReopenState(save,policy);expect(restored.ok,JSON.stringify(restored)).toBe(true);if(!restored.ok)throw Error(restored.message);
    upgraded=await Phase1AuthorityBundle.create({...config,reopen:restored.value});
    expect(upgraded.authorityTick).toBe(old.authorityTick);expect(upgraded.items.exportLedgerSnapshot()).toEqual(old.items.exportLedgerSnapshot());expect(upgraded.world.getActiveChunkViews().map(c=>c.base)).toEqual(old.world.getActiveChunkViews().map(c=>c.base));
  } finally {await old.destroy();await upgraded?.destroy();}
});
