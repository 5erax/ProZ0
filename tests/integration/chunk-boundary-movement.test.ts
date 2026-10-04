import {expect,it} from 'vitest';
import {Phase1AuthorityBundle} from '../../src/integration/Phase1AuthorityBundle';
import {createWorldPosition} from '../../src/foundation';

it('reads movement terrain and reveals exploration across a rounded negative chunk edge without crashing authority',async()=>{
  const bundle=await Phase1AuthorityBundle.create({worldId:'world:rounded-chunk-edge',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  try {
    for(const position of [createWorldPosition(-1e-16,9.68),createWorldPosition(9.68,-1e-16)]){
      await bundle.world.activatePosition(position);
      expect([.7,1]).toContain(bundle.world.getMovementSpeedMultiplier(position));
      await bundle.worldStore.revealResolvedPlayerPosition(position);
      expect(bundle.world.isExploredPosition(position)).toBe(true);
    }
    await bundle.stepSolo();expect(bundle.authorityTick).toBe(1);
  }finally{await bundle.destroy();}
});
