import { expect,it } from 'vitest';
import { Phase1AuthorityBundle,composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility,reconstructPhase1ReopenState } from '../../src/persistence';
import { EXPLORATION_TEMPLATES } from '../../src/content/phase2/ExplorationContent';
const config={worldId:'world:exploration',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,worldGenerationVersion:5,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0};
const command=(b:Phase1AuthorityBundle,action:'inspect-site'|'restore-site'|'recover-site'|'research',targetId:string)=>b.colonyDepth.execute({operationId:action+':'+targetId+':'+b.authorityTick+':'+b.colonyDepth.read().revision,playerId:'solo',expectedRevision:b.colonyDepth.read().revision,expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,action,targetId});
const supply=(b:Phase1AuthorityBundle,outputs:readonly {itemDefinitionId:string;quantity:number}[])=>b.items.commitColonyExchange({operationId:'fixture:'+b.items.getContainerView('inventory:solo').revision,playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs});
const portable=(b:Phase1AuthorityBundle)=>{const save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});return {...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'};};
it.each(EXPLORATION_TEMPLATES)('$id uses explored canonical terrain, real costs and one finite reward, then preserves progress/ledger in Save V2',async t=>{
  const b=await Phase1AuthorityBundle.create(config);let reopened:Phase1AuthorityBundle|null=null;
  try{
    b.getRuntime('solo');await b.stepSolo();const site=b.colonyDepth.sites().find(s=>s.id===t.siteId)!;
    expect(command(b,'inspect-site',site.id)).toMatchObject({status:'rejected',reason:'OUT_OF_RANGE'});
    // Position/material fixture: do not claim a natural exploration journey.
    b.getRuntime('solo').relocatePlayer(site.position);await b.stepSolo();expect(b.world.isExploredPosition(site.position)).toBe(true);
    expect(command(b,'inspect-site',site.id).status).toBe('committed');
    expect(supply(b,[...t.costs.map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity})),...(t.tool?[{itemDefinitionId:t.tool,quantity:1}]:[])]).status).toBe('committed');
    if(t.id==='laboratory')expect(command(b,'research','field-survey')).toMatchObject({status:'rejected',reason:'RETURN_TO_BASE'});
    const renewal=b.colonyDepth.recoveryMultiplier(site.position,'resource:fiber-plant');
    expect(command(b,'restore-site',site.id).status).toBe('committed');
    if(t.id==='garden'){
      expect(b.colonyDepth.recoveryMultiplier(site.position,'resource:fiber-plant')).toBeCloseTo(renewal*.8);
      expect(b.colonyDepth.recoveryMultiplier({x:site.position.x+17,y:site.position.y},'resource:fiber-plant')).not.toBeCloseTo(renewal*.8);
    }
    if(t.id==='laboratory'){
      expect(supply(b,[{itemDefinitionId:'item:plant-fiber',quantity:3},{itemDefinitionId:'item:stone',quantity:2}]).status).toBe('committed');
      expect(command(b,'research','field-survey').status).toBe('committed');expect(b.colonyDepth.hasResearch('field-survey')).toBe(true);
    }
    if(t.id==='array'){expect(b.colonyDepth.shelteredAt(site.position,1)).toBe(false);expect(b.colonyDepth.shelteredAt(site.position,9000)).toBe(true);expect(b.colonyDepth.shelteredAt({x:site.position.x+4,y:site.position.y},9000)).toBe(false);}
    if(t.id==='shelter'){
      expect(b.world.getEnvironmentExposure('solo')).toMatchObject({thermalTarget:50,sheltered:true});
      expect(b.expedition!.interact({id:'fixture:rest',playerId:'solo',target:site.id,action:'rest',expectedRevision:b.expedition!.read().revision,expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision})).toMatchObject({status:'committed',message:'REST_STARTED'});
      for(let i=0;i<480;i++)await b.stepSolo();expect(b.expedition!.restStatus('solo')).toBeNull();expect(b.expedition!.read().restCooldown.solo).toBeGreaterThan(b.authorityTick);
    }
    expect(command(b,'recover-site',site.id).status).toBe('committed');
    const save=portable(b),policy=createPhase1SaveV2Compatibility(b.catalog,[3,4,5]),loaded=reconstructPhase1ReopenState(save,policy);expect(loaded.ok,JSON.stringify(loaded)).toBe(true);if(!loaded.ok)throw Error(loaded.message);
    reopened=await Phase1AuthorityBundle.create({...config,reopen:loaded.value});await reopened.stepSolo();
    expect(reopened.colonyDepth.siteStage(site.id)).toBe('recovered');expect(reopened.colonyDepth.sites()).toEqual(b.colonyDepth.sites());expect(reopened.items.exportLedgerSnapshot()).toEqual(b.items.exportLedgerSnapshot());
    const before=reopened.items.exportLedgerSnapshot();expect(command(reopened,'recover-site',site.id)).toMatchObject({status:'rejected',reason:'SUPPLIES_ALREADY_RECOVERED'});expect(reopened.items.exportLedgerSnapshot()).toEqual(before);
    for(const exploration of [{version:2,entries:[]},{version:1,entries:[{siteId:site.id,stage:'unknown'}]},{version:1,entries:[{siteId:'unknown',stage:'recovered'}]}])expect(reconstructPhase1ReopenState({...save,world:{...save.world,colonyDepth:{...save.world.colonyDepth!,exploration}}},policy).ok).toBe(false);
  }finally{await reopened?.destroy();await b.destroy();}
});
