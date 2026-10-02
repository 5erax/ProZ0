import {expect,it} from 'vitest';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {SAVE_FORMAT_ID,SAVE_SCHEMA_VERSION_V2,createPhase1SaveV2Compatibility,reconstructPhase1ReopenState} from '../../src/persistence';
it('reopens solo construction escrow and rejects multiplayer or foreign-owner expedition saves',async()=>{
 const config={worldId:'world:expedition-save',worldSeed:'p1-world-golden',playerIds:['solo'],singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0};
 const bundle=await Phase1AuthorityBundle.create(config);
 try{
  bundle.getRuntime('solo');await bundle.stepSolo();
  // Placement is a labelled subsystem fixture; natural exploration is verified separately.
  let placed=false;for(const [x,y] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,-2]]){
  const plan=bundle.expedition!.execute({id:'plan',playerId:'solo',expectedRevision:0,expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,action:'plan',target:'supply-cache',x:x!,y:y!});if(plan.status==='committed'){placed=true;break;}}expect(placed,JSON.stringify(bundle.expedition!.read())).toBe(true);
  const request=composePhase1SaveV2(bundle,{nowUtc:'2026-10-02T00:00:00.000Z'});
  const portable={formatId:SAVE_FORMAT_ID,schemaVersion:SAVE_SCHEMA_VERSION_V2,recordKind:'portable-bundle' as const,world:request.world,players:request.players,containers:request.containers,chunks:request.chunks,footholds:request.footholds,structures:request.structures};
  const compatibility=createPhase1SaveV2Compatibility(bundle.catalog,[request.world.generationVersion]);
  const result=reconstructPhase1ReopenState(portable,compatibility);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.message);
  const reopened=await Phase1AuthorityBundle.create({...config,reopen:result.value});try{expect(reopened.expedition!.read()).toEqual(bundle.expedition!.read());expect(reopened.items.exportLedgerSnapshot()).toEqual(bundle.items.exportLedgerSnapshot());}finally{await reopened.destroy();}
  await expect(Phase1AuthorityBundle.create({...config,singlePlayerExpeditionEnabled:false,reopen:result.value})).rejects.toThrow(/Expedition/);
  await expect(Phase1AuthorityBundle.create({...config,playerIds:['solo','guest']})).rejects.toThrow(/single-player/);
  const bad={...portable,world:{...portable.world,singlePlayerExpedition:{...bundle.expedition!.read(),supplyClaimed:['absent-player']}}};expect(reconstructPhase1ReopenState(bad,compatibility).ok).toBe(false);
 }finally{await bundle.destroy();}
});
