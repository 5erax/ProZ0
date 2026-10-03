import {it,expect} from 'vitest';
import {advancePlantWork,canonicalPlantRate,type ResourceGrowthWork} from '../../src/world/phase1/DynamicResourceGrowth';
import {mountainAt,mountainFoundation} from '../../src/world/phase2/SoloMountain';
import {soloCaveRegistry} from '../../src/world/phase2/SoloCaveRegistry';
it('active growth is independent of tick batching, retains irrigation across seasons and never advances through UI reads',()=>{
  const seed='p1-world-golden',p={x:40,y:20},work:ResourceGrowthWork={completedWork:0,progressMilli:0,lastGrowthTick:0,durationTicks:108000,wateredTick:60,rateMilli:1000};
  const initial={...work,wateredTick:null},dry=advancePlantWork(initial,seed,p,9000),wet=advancePlantWork(work,seed,p,9000);
  expect(wet.progressMilli).toBeGreaterThan(dry.progressMilli);
  let stepped:ResourceGrowthWork=initial;for(let tick=17;tick<50000;tick+=17)stepped=advancePlantWork(stepped,seed,p,tick);stepped=advancePlantWork(stepped,seed,p,50000);
  expect(stepped).toEqual(advancePlantWork(initial,seed,p,50000));
  expect(canonicalPlantRate(seed,p,129600,null)).toBeLessThan(canonicalPlantRate(seed,p,0,null));
  expect(initial.progressMilli).toBe(0);
});
it('two mountain profiles share safe ramps and deny sloped or portal-blocking foundations',()=>{
  const portals=soloCaveRegistry('p1-world-golden',5);
  expect(mountainAt(portals[0]!.position,portals).height).toBe(5);expect(mountainAt(portals[1]!.position,portals).height).toBe(10);
  for(const portal of portals){const south={x:portal.position.x,y:portal.position.y+4};expect(mountainAt(south,portals).ramp).toBe(true);expect(mountainFoundation(south,portals)).toBe(false);expect(mountainFoundation(portal.position,portals)).toBe(false);}
});
