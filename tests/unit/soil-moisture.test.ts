import {expect,it} from 'vitest';
import {naturalSoilMoisture,validateSoilState,wetSoilCell,advanceSoilPatches,MAX_SOIL_PATCHES,type SoilStateV1} from '../../src/simulation/livingworld/SoilMoisture';
import {colonyBiomeAt} from '../../src/world/phase2/ColonyRegions';
import {SEASON_TICKS} from '../../src/content/livingworld/LivingWorldContent';
it('rain has a continuous draining soil tail across the weather-cycle boundary and seasons affect the active-time field',()=>{
  const seed='soil-field',point=Array.from({length:80},(_,i)=>({x:i*4,y:-150})).find(p=>colonyBiomeAt(seed,p)==='mist-marsh')!;
  expect(point).toBeDefined();
  expect(Math.abs(naturalSoilMoisture(seed,point,17999)-naturalSoilMoisture(seed,point,18000))).toBeLessThanOrEqual(1);
  expect(naturalSoilMoisture(seed,point,15000)).toBeGreaterThan(naturalSoilMoisture(seed,point,18000));
  expect(naturalSoilMoisture(seed,point,SEASON_TICKS)).toBeLessThan(naturalSoilMoisture(seed,point,0));
  for(const tick of [0,9000,15000,18000,1e12])expect(naturalSoilMoisture(seed,point,tick)).toBeGreaterThanOrEqual(0);
});
it('watered ground persists, drains only on authority steps, and its bound never evicts a still-wet remote cell',()=>{
  const state:SoilStateV1={version:1,patches:[]};expect(wetSoilCell(state,{x:1,y:1},10000)).toBe(true);
  expect(validateSoilState(state)).toEqual(state);expect(state.patches[0]!.moisture).toBe(10000);
  advanceSoilPatches(state,'soil-field',60);expect(state.patches[0]!.moisture).toBeLessThan(10000);
  for(let i=1;i<MAX_SOIL_PATCHES;i++)expect(wetSoilCell(state,{x:i*4+1,y:1},10000)).toBe(true);
  const before=structuredClone(state);expect(wetSoilCell(state,{x:MAX_SOIL_PATCHES*4+1,y:1},10000)).toBe(false);expect(state).toEqual(before);
  expect(()=>validateSoilState({...state,version:2})).toThrow();expect(()=>validateSoilState({version:1,patches:[state.patches[0],state.patches[0]]})).toThrow();
});
