import {expect,it} from 'vitest';
import {colonyBiomeAt,colonyWeatherAt,colonyWeatherVisualAt} from '../../src/world/phase2/ColonyRegions';
it('weather art follows warning, rise, peak, fall and calm without changing gameplay weather',()=>{
  const seed='weather-visual';
  const point=Array.from({length:200},(_,i)=>({x:i*4,y:150})).find(p=>colonyBiomeAt(seed,p)==='ochre-badlands')!;
  expect(point).toBeDefined();
  const expected=['calm','warning','rise','peak','fall','calm'];
  [0,7200,9000,10000,14000,15000].forEach((tick,i)=>{
    const before=colonyWeatherAt(seed,point,tick),visual=colonyWeatherVisualAt(seed,point,tick);
    expect(visual.phase).toBe(expected[i]);expect(visual.intensity).toBeGreaterThanOrEqual(0);expect(visual.intensity).toBeLessThanOrEqual(1);
    expect(colonyWeatherAt(seed,point,tick)).toEqual(before);
    expect(colonyWeatherVisualAt(seed,point,tick)).toEqual(visual);
  });
  expect(Math.abs(colonyWeatherVisualAt(seed,point,8999).intensity-colonyWeatherVisualAt(seed,point,9000).intensity)).toBeLessThan(.001);
  expect(colonyWeatherVisualAt(seed,point,14999).intensity).toBeLessThan(.001);
  expect(()=>colonyWeatherVisualAt(seed,point,-1)).toThrow();
});
