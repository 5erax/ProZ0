import {expect,it} from 'vitest';
import {Phase1AuthorityBundle} from '../../src/integration';
import {composePhase1SaveV2} from '../../src/integration/Phase1SaveV2Composer';
import {reconstructPhase1ReopenState} from '../../src/persistence/integration/Phase1ReopenState';
import {createPhase1SaveV2Compatibility} from '../../src/persistence/validation/SaveValidatorV2';
import {upgradeColonyEcosystem} from '../../src/persistence/migrations/ColonyEcosystemUpgrade';
import {Phase1ChunkGenerator} from '../../src/world/phase1/Phase1ChunkGenerator';
import {createChunkCoord} from '../../src/world/chunks/ChunkCoord';
import {createPhase1ContentCatalog} from '../../src/content';

it('v4 clusters are deterministic, denser, and leave v3 terrain and every legacy identity unchanged',()=>{
 const catalog=createPhase1ContentCatalog(),generator=new Phase1ChunkGenerator(catalog);
 for(const coord of [createChunkCoord(0,0),createChunkCoord(4,1),createChunkCoord(-4000,-4000)]){
  const input={worldSeed:'p1-world-golden',coord};const before=generator.generate({...input,generationVersion:3});
  const after=generator.generate({...input,generationVersion:4});
  expect(after).toEqual(generator.generate({...input,generationVersion:4}));
  expect(after.terrain).toEqual(before.terrain);
  expect(after.entities.length-before.entities.length).toBeGreaterThanOrEqual(6);
  for(const entity of before.entities)expect(after.entities).toContainEqual(entity);
  expect(after.baseGenerationFingerprint).not.toBe(before.baseGenerationFingerprint);
 }
});

it('accepted ecosystem upgrades preserve depletion, inventory, exploration and position; save/reopen does not duplicate new resources',async()=>{
 const config={worldId:'world:eco-upgrade',worldSeed:'p1-world-golden',playerIds:['colonist'],interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25,colonyDepthEnabled:true};
 const original=await Phase1AuthorityBundle.create(config);
 let reopened:Phase1AuthorityBundle|null=null;
 try{
  await original.stepSolo();
  const resource=original.world.getActiveGeneratedEntities().find(entity=>entity.type==='resource'&&entity.definitionId==='resource:fiber-plant')!;
  const prior=original.worldStore.getResourceState(resource.entityId)!;
  original.worldStore.commitResourceGather(resource.entityId,prior.revision,original.authorityTick);
  const spent=original.worldStore.getResourceState(resource.entityId)!;
  const request=composePhase1SaveV2(original,{nowUtc:'2026-10-01T00:00:00Z'});
  const portable={...request,formatId:request.world.formatId,schemaVersion:request.world.schemaVersion,recordKind:'portable-bundle'};
  const policy=createPhase1SaveV2Compatibility(original.catalog,[3,4]);
  const loaded=reconstructPhase1ReopenState(portable,policy);expect(loaded.ok).toBe(true);if(!loaded.ok)throw Error(loaded.message);
  const upgraded=upgradeColonyEcosystem(loaded.value,original.catalog);
  expect(upgraded.bundle.world.generationVersion).toBe(4);expect(loaded.value.bundle.world.generationVersion).toBe(3);
  expect(upgraded.itemLedger).toEqual(loaded.value.itemLedger);expect(upgraded.players).toEqual(loaded.value.players);
  expect(upgraded.bundle.chunks.flatMap(chunk=>chunk.resourceStates)).toContainEqual(spent);
  for(let i=0;i<loaded.value.chunks.length;i++)expect(upgraded.chunks[i]!.worldSlice.exploration).toEqual(loaded.value.chunks[i]!.worldSlice.exploration);
  expect(upgradeColonyEcosystem(upgraded,original.catalog)).toBe(upgraded);
  reopened=await Phase1AuthorityBundle.create({...config,reopen:upgraded});await reopened.stepSolo();
  expect(reopened.worldStore.getResourceState(resource.entityId)).toEqual(spent);
  const again=composePhase1SaveV2(reopened,{nowUtc:'2026-10-01T00:00:01Z'});
  const restore=reconstructPhase1ReopenState({...again,formatId:again.world.formatId,schemaVersion:again.world.schemaVersion,recordKind:'portable-bundle'},policy);
  expect(restore.ok).toBe(true);if(!restore.ok)throw Error(restore.message);
  expect(upgradeColonyEcosystem(restore.value,original.catalog).bundle.chunks.flatMap(chunk=>chunk.resourceStates).length).toBe(upgraded.bundle.chunks.flatMap(chunk=>chunk.resourceStates).length);
 }finally{await reopened?.destroy();await original.destroy();}
});
