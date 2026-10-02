import {expect,it} from 'vitest';
import {createPhase1ContentCatalog} from '../../src/content';
import {expeditionRenewalMultiplier} from '../../src/content/singleplayer/ExpeditionEcology';
import {createPhase1WorldStore} from '../../src/world/phase1/Phase1WorldStore';
import {createChunkCoord} from '../../src/world/chunks/ChunkCoord';
import {MemoryPhase1WorldPersistence} from '../helpers/MemoryPhase1WorldPersistence';
it('solo renewal regenerates depleted fiber after two active minutes, keeping partial nodes and legacy deadlines intact',async()=>{
 const store=createPhase1WorldStore({worldSeed:'p1-world-golden',catalog:createPhase1ContentCatalog(),persistence:new MemoryPhase1WorldPersistence()});await store.initialize();store.setRenewalPolicy({multiplier:(_,id)=>expeditionRenewalMultiplier(id),harvested:()=>{}});
 const view=await store.requestActive(createChunkCoord(0,0));const fiber=view.base.entities.find(e=>e.type==='resource'&&e.definitionId==='resource:fiber-plant')!;
 let revision=0;for(let i=0;i<4;i++)revision=store.commitResourceGather(fiber.entityId,revision,0).state.revision;
 expect(store.getResourceState(fiber.entityId)?.regenerationReadyTick).toBe(7200);await store.advanceEnvironment(7199);expect(store.getResourceState(fiber.entityId)?.depleted).toBe(true);await store.advanceEnvironment(7200);expect(store.getResourceState(fiber.entityId)).toMatchObject({depleted:false,remainingGatherActions:4});
 expect(expeditionRenewalMultiplier('resource:metal-ore-node')).toBe(1/6);expect(expeditionRenewalMultiplier('resource:food-plant','growth-flush')).toBeLessThan(.2);expect(expeditionRenewalMultiplier('resource:timber-source','dry-spell')).toBeGreaterThan(.2);
});
