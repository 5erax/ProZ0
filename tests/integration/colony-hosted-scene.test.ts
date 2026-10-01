import {expect,test} from 'vitest';
import {Phase1AuthorityBundle} from '../../src/integration';
import {colonyHostedMap,colonyHostedScene} from '../../src/integration/ColonyHostedScene';
import {fromWorldPosition,toChunkKey,toChunkLocalPosition} from '../../src/world/chunks/ChunkCoord';
import {isExplorationCellKnown} from '../../src/world/phase1/ExplorationGrid';

test('hosted scene/map never disclose unexplored cells and stable maps are cached independently of simulation time',async()=>{
  const bundle=await Phase1AuthorityBundle.create({worldId:'map:privacy',worldSeed:'p1-world-golden',playerIds:['viewer'],colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  try{
    await bundle.stepSolo();const first=colonyHostedMap(bundle),scene=colonyHostedScene(bundle,'viewer',{}, {viewer:'Bạn Việt'});
    expect(first.cells.length).toBeGreaterThan(0);
    const views=new Map(bundle.world.getActiveChunkViews().map(v=>[toChunkKey(v.base.coord),v]));
    for(const c of [...first.cells,...scene.terrain,...scene.entities]){const coord=fromWorldPosition(c),view=views.get(toChunkKey(coord));expect(view).toBeDefined();const local=toChunkLocalPosition(c,coord);expect(isExplorationCellKnown(coord,view!.delta.exploration,Math.floor(local.x/2),Math.floor(local.y/2))).toBe(true);}
    const unknown=bundle.world.getActiveGeneratedEntities().filter(e=>Math.hypot(e.position.x,e.position.y)>40);expect(unknown.length).toBeGreaterThan(0);expect(scene.entities.some(e=>unknown.some(u=>u.entityId===e.id))).toBe(false);
    expect(scene.playerNames).toEqual({viewer:'Bạn Việt'});expect(scene.survival).toMatchObject({stamina:100,temperature:50,lifeState:'alive'});
    await bundle.stepSolo();expect(colonyHostedMap(bundle)).toBe(first);
    expect(colonyHostedScene(bundle,'viewer',{}, {},false).map).toBeUndefined();
    bundle.getRuntime('viewer').relocatePlayer({x:18,y:10});await bundle.stepSolo();const moved=colonyHostedMap(bundle);expect(moved.revision).toBeGreaterThan(first.revision);expect(moved.cells.length).toBeGreaterThan(first.cells.length);
  }finally{await bundle.destroy();}
});
