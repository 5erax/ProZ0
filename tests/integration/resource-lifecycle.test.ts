import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { resourceHarvestDefinition } from '../../src/content/livingworld/ResourceSizeProfiles';
import { createPhase1WorldStore } from '../../src/world/phase1/Phase1WorldStore';
import { createChunkCoord } from '../../src/world/chunks/ChunkCoord';
import { resourceGrowthCheckpoint, validateResourceLifecycle } from '../../src/world/phase1/ResourceLifecycle';
import { MemoryPhase1WorldPersistence } from '../helpers/MemoryPhase1WorldPersistence';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';
import { Phase1ItemAuthority } from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

it('irrigated canonical roots keep exact work across streaming/reopen and stale watering cannot alter progression',async()=>{
  const catalog=createPhase1ContentCatalog(),persistence=new MemoryPhase1WorldPersistence(),options={worldSeed:'p1-world-golden',catalog,persistence,resourceLifecycleVersion:1 as const};
  const first=createPhase1WorldStore(options);await first.initialize();first.setRenewalPolicy({multiplier:()=>1,growthMultiplier:()=>1,harvested:()=>{}});
  const coord=createChunkCoord(0,0),view=await first.requestActive(coord),plant=view.base.entities.find(e=>e.type==='resource'&&e.definitionId==='resource:fiber-plant')!;
  while(!first.getResourceState(plant.entityId)!.depleted)first.commitResourceGather(plant.entityId,first.getResourceState(plant.entityId)!.revision,0);
  await first.advanceEnvironment(120);const current=first.getResourceState(plant.entityId)!;
  expect(first.commitResourceWater(plant.entityId,current.revision,120)).toBeNull();const watered=first.getResourceState(plant.entityId)!;
  expect(first.commitResourceWater(plant.entityId,current.revision,120)).toBe('STALE_RESOURCE_REVISION');expect(first.getResourceState(plant.entityId)).toEqual(watered);
  expect(watered.lifecycle).toMatchObject({version:2,work:{wateredTick:120}});
  await first.flushEnvironment();await first.releaseInterest(coord);await first.advanceEnvironment(43260);await first.flushEnvironment();
  const reopened=createPhase1WorldStore(options);await reopened.initialize();await reopened.requestActive(coord);
  await first.requestActive(coord);expect(reopened.getResourceState(plant.entityId)).toEqual(first.getResourceState(plant.entityId));
  const valid=reopened.getResourceState(plant.entityId)!.lifecycle!;expect(()=>validateResourceLifecycle({...valid,work:{...(valid.kind==='plant'?valid.work:{}),completedWork:-1}})).toThrow();
});

it('new-world plants grow in bounded stages, including unloaded time, while minerals stay exhausted after reload', async () => {
  const catalog = createPhase1ContentCatalog(), persistence = new MemoryPhase1WorldPersistence();
  const options = {worldSeed:'p1-world-golden',catalog,persistence,resourceLifecycleVersion:1 as const};
  const store = createPhase1WorldStore(options); await store.initialize();
  const coord = createChunkCoord(0,0), chunk = await store.requestActive(coord);
  const fiber = chunk.base.entities.find(e => e.type === 'resource' && e.definitionId === 'resource:fiber-plant')!;
  for (let n=0;n<4;n++) store.commitResourceGather(fiber.entityId, store.getResourceState(fiber.entityId)!.revision,0);
  const early = store.getResourceState(fiber.entityId)!;
  expect(early).toMatchObject({depleted:true,lifecycle:{kind:'plant',stage:'early',cutTick:0,matureTick:36000}});
  if (early.lifecycle?.kind !== 'plant') throw Error('Missing plant state');
  const checkpoint = resourceGrowthCheckpoint(early.lifecycle);
  await store.advanceEnvironment(checkpoint-1); expect(store.getResourceState(fiber.entityId)!.depleted).toBe(true);
  await store.advanceEnvironment(checkpoint);
  const growing = store.getResourceState(fiber.entityId)!;
  expect(growing).toMatchObject({depleted:false,remainingGatherActions:4,lifecycle:{stage:'growing'}});
  expect(()=>store.commitResourceGather(fiber.entityId,early.revision,checkpoint)).toThrow('stale');
  await store.flushEnvironment(); await store.releaseInterest(coord);
  await store.advanceEnvironment(36000); await store.flushEnvironment();
  const reopened = createPhase1WorldStore(options); await reopened.initialize();
  await reopened.requestActive(coord);
  expect(reopened.getResourceState(fiber.entityId)).toMatchObject({depleted:false,lifecycle:{stage:'mature'}});
  const minerals = (await reopened.requestActive(createChunkCoord(1,0))).base.entities.filter(e => e.type === 'resource' && ['resource:stone-outcrop','resource:metal-ore-node'].includes(e.definitionId));
  expect(minerals.length).toBeGreaterThan(0);
  for (const mineral of minerals) {
    while (!reopened.getResourceState(mineral.entityId)!.depleted) reopened.commitResourceGather(mineral.entityId,reopened.getResourceState(mineral.entityId)!.revision,36000);
    expect(reopened.getResourceState(mineral.entityId)).toMatchObject({remainingGatherActions:0,depleted:true,regenerationReadyTick:null,lifecycle:{kind:'mineral'}});
  }
  await reopened.advanceEnvironment(1000000); await reopened.flushEnvironment(); await reopened.releaseInterest(createChunkCoord(1,0));
  const final = createPhase1WorldStore(options); await final.initialize(); await final.requestActive(createChunkCoord(1,0));
  for (const mineral of minerals) expect(final.getResourceState(mineral.entityId)).toMatchObject({remainingGatherActions:0,depleted:true,regenerationReadyTick:null});
});

it('growing yield is paid by the real gather transaction and replay cannot mint another harvest', () => {
  const catalog = createPhase1ContentCatalog(), world = new Phase1ItemTestWorld();
  world.addResource({resourceEntityId:'plant',resourceDefinitionId:'resource:fiber-plant',revision:0,remainingActions:4,depleted:false,size:'large',growthStage:'growing'});
  const items = new Phase1ItemAuthority({catalog,world,initialLedger:{containers:[{containerId:'inventory:p1',kind:'player-inventory',ownerPlayerId:'p1',revision:0,stacks:[]}]}});
  const request = {operationId:'grow:gather',playerId:'p1',inventoryContainerId:'inventory:p1',expectedInventoryRevision:0,resourceEntityId:'plant',expectedResourceRevision:0};
  const started = items.beginGather(request); expect(started.status).toBe('started');
  if (started.status !== 'started') throw Error('Gather not started');
  for (let n=0;n<started.requiredTicks;n++) items.tickGather('p1');
  expect(items.getContainerView('inventory:p1').stacks).toEqual([expect.objectContaining({itemDefinitionId:'item:plant-fiber',quantity:3})]);
  const ledger = items.exportLedgerSnapshot(); items.beginGather(request); expect(items.exportLedgerSnapshot()).toEqual(ledger);
  expect(resourceHarvestDefinition(catalog.getAs('resource:fiber-plant','resource'),'large','mature').output.quantity).toBe(6);
});

it('portable save preserves explicit lifecycle, rejects corruption/future versions, and never opts legacy worlds in', async () => {
  const catalog = createPhase1ContentCatalog(), policy = createPhase1SaveV2Compatibility(catalog,[3,4]);
  for (const version of [undefined,1] as const) {
    const config = {worldId:'world:lifecycle:'+String(version),worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0,...(version ? {resourceLifecycleVersion:version} : {})};
    const first = await Phase1AuthorityBundle.create(config); let second: Phase1AuthorityBundle | undefined;
    try {
      await first.stepSolo();
      const save = composePhase1SaveV2(first,{nowUtc:'2026-10-03T00:00:00Z'});
      const portable = {...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'};
      const restored = reconstructPhase1ReopenState(portable,policy); expect(restored.ok,JSON.stringify(restored)).toBe(true);
      if (!restored.ok) throw Error(restored.message);
      second = await Phase1AuthorityBundle.create({...config,resourceLifecycleVersion:1,reopen:restored.value});
      expect(second.worldStore.getEnvironmentView().state.resourceLifecycleVersion).toBe(version);
      expect(second.world.getActiveChunkViews().map(v=>v.delta.resourceStates)).toEqual(first.world.getActiveChunkViews().map(v=>v.delta.resourceStates));
      expect(reconstructPhase1ReopenState({...portable,world:{...save.world,environment:{...save.world.environment,resourceLifecycleVersion:2}}},policy).ok).toBe(false);
      if (version) {
        const chunks = structuredClone(save.chunks), resource = chunks.flatMap(c=>c.resourceStates).find(r=>r.lifecycle?.kind === 'plant')!;
        Object.assign(resource,{lifecycle:{version:2,kind:'plant',stage:'mature',cutTick:0,matureTick:0}});
        expect(reconstructPhase1ReopenState({...portable,chunks},policy).ok).toBe(false);
        expect(reconstructPhase1ReopenState({...portable,world:{...save.world,environment:{...save.world.environment,resourceLifecycleVersion:undefined}}},policy).ok).toBe(false);
      }
    } finally { await first.destroy(); await second?.destroy(); }
  }
  expect(()=>validateResourceLifecycle({version:1,kind:'plant',stage:'early',cutTick:10,matureTick:5})).toThrow();
  expect(()=>validateResourceLifecycle({version:1,kind:'mineral'},'resource:timber-source')).toThrow();
});
