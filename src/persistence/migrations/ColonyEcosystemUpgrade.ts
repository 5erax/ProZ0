import type {ContentCatalogV1} from '../../content';
import {Phase1ChunkGenerator,COLONY_WORLD_GENERATION_VERSION,PHASE1_WORLD_GENERATION_VERSION} from '../../world/phase1/Phase1ChunkGenerator';
import {createChunkCoord} from '../../world/chunks/ChunkCoord';
import {reconstructPhase1ReopenState,type Phase1ReopenState} from '../integration/Phase1ReopenState';
import {createPhase1SaveV2Compatibility} from '../validation/SaveValidatorV2';

/** Explicit additive v3 -> v4 upgrade: legacy terrain, identities and deltas stay;
 * only new ecosystem nodes receive initial state. Saved inventory is never granted. */
export function upgradeColonyEcosystem(reopen:Phase1ReopenState,catalog:ContentCatalogV1):Phase1ReopenState{
  if(reopen.bundle.world.generationVersion===COLONY_WORLD_GENERATION_VERSION)return reopen;
  if(reopen.bundle.world.generationVersion!==PHASE1_WORLD_GENERATION_VERSION)throw Error('Unsupported ecosystem upgrade source');
  const generator=new Phase1ChunkGenerator(catalog);
  const chunks=reopen.bundle.chunks.map(record=>{
    const coord=createChunkCoord(record.coord.x,record.coord.y),worldSeed=reopen.bundle.world.worldSeed;
    const previous=generator.generate({coord,worldSeed,generationVersion:PHASE1_WORLD_GENERATION_VERSION});
    if(previous.baseGenerationFingerprint!==record.baseGenerationFingerprint)throw Error('Ecosystem upgrade refuses a mismatched legacy chunk');
    const next=generator.generate({coord,worldSeed,generationVersion:COLONY_WORLD_GENERATION_VERSION});
    const states=new Map(record.resourceStates.map(state=>[state.resourceEntityId,state]));
    const resourceStates=next.entities.filter(entity=>entity.type==='resource').map(entity=>states.get(entity.entityId)??Object.freeze({resourceEntityId:entity.entityId,revision:0,remainingGatherActions:catalog.getAs(entity.definitionId,'resource').maxGatherActions,depleted:false,regenerationReadyTick:null}));
    if(record.resourceStates.some(state=>!next.entities.some(entity=>entity.entityId===state.resourceEntityId)))throw Error('Upgrade would remove a legacy resource');
    return Object.freeze({...record,generationVersion:COLONY_WORLD_GENERATION_VERSION,baseGenerationFingerprint:next.baseGenerationFingerprint,chunkRevision:record.chunkRevision+1,resourceStates:Object.freeze(resourceStates.sort((a,b)=>a.resourceEntityId.localeCompare(b.resourceEntityId)))});
  });
  const bundle=Object.freeze({...reopen.bundle,world:Object.freeze({...reopen.bundle.world,generationVersion:COLONY_WORLD_GENERATION_VERSION}),chunks:Object.freeze(chunks)});
  const result=reconstructPhase1ReopenState(bundle,createPhase1SaveV2Compatibility(catalog,[3,4]));
  if(!result.ok)throw Error('Ecosystem upgrade failed validation: '+result.message);
  return result.value;
}
