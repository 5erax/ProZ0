import { expect, it } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2, createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';
import { SoloResourceMarkers, validateSoloResourceMarkers } from '../../src/simulation/worldspaces/SoloResourceMarkers';

it('only accepts observed nodes, checks owner/revision and supports idempotent removal',()=>{
  const markers=new SoloResourceMarkers('solo',id=>id==='known'?{resourceId:id,definitionId:'resource:stone-outcrop',spaceId:'surface',position:{x:1,y:1}}:null);
  expect(markers.set('solo',0,'hidden','surface',true)).toBe('UNEXPLORED_AREA');
  expect(markers.set('foreign',0,'known','surface',true)).toBe('WRONG_OWNER');
  expect(markers.set('solo',0,'known','surface',true)).toBe('COMPLETE');
  expect(markers.set('solo',0,'known','surface',false)).toBe('STALE_REVISION');
  expect(markers.read().markers).toHaveLength(1);
  expect(markers.set('solo',1,'known','surface',false)).toBe('COMPLETE');
  expect(markers.set('solo',2,'known','surface',false)).toBe('COMPLETE');
  expect(markers.read().revision).toBe(2);
  expect(()=>validateSoloResourceMarkers({...markers.read(),version:2})).toThrow();
  expect(()=>validateSoloResourceMarkers({...markers.read(),markers:Array(65).fill({})})).toThrow();
});
it('round-trips solo markers and rejects forged coordinates, unknown identities and owner',async()=>{
  const config={worldId:'world:markers',worldSeed:'p1-world-golden',playerIds:['solo'],singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,worldGenerationVersion:5,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25};
  const bundle=await Phase1AuthorityBundle.create(config);let reopened:Phase1AuthorityBundle|undefined;
  try {
    await bundle.stepSolo();
    const node=bundle.world.getActiveGeneratedEntities().find(e=>e.type==='resource')!;
    await bundle.worldStore.revealResolvedPlayerPosition(node.position,6.25);
    const authority=bundle.resourceMarkers!;
    expect(authority.set('solo',0,node.entityId,'surface',true)).toBe('COMPLETE');
    const r=composePhase1SaveV2(bundle,{nowUtc:'2026-10-04T00:00:00.000Z'});
    const saved={formatId:SAVE_FORMAT_ID,schemaVersion:SAVE_SCHEMA_VERSION_V2,recordKind:'portable-bundle' as const,world:r.world,players:r.players,containers:r.containers,chunks:r.chunks,footholds:r.footholds,structures:r.structures};
    const policy=createPhase1SaveV2Compatibility(bundle.catalog,[5]),restored=reconstructPhase1ReopenState(saved,policy);
    expect(restored.ok,JSON.stringify(restored)).toBe(true);if(!restored.ok)throw Error(restored.message);
    reopened=await Phase1AuthorityBundle.create({...config,reopen:restored.value});
    expect(reopened.resourceMarkers!.read()).toEqual(authority.read());
    for(const marker of [{...authority.read().markers[0]!,position:{x:123,y:456}},{...authority.read().markers[0]!,resourceId:'hidden'}]){
      expect(reconstructPhase1ReopenState({...saved,world:{...saved.world,soloResourceMarkers:{...authority.read(),markers:[marker]}}},policy).ok).toBe(false);
    }
    expect(reconstructPhase1ReopenState({...saved,world:{...saved.world,soloResourceMarkers:{...authority.read(),ownerPlayerId:'foreign'}}},policy).ok).toBe(false);
    const {soloResourceMarkers:omitted,...legacyWorld}=saved.world;expect(omitted).toBeDefined();
    expect(reconstructPhase1ReopenState({...saved,world:legacyWorld},policy).ok).toBe(true);
  } finally {await reopened?.destroy();await bundle.destroy();}
});
