import {expect,it} from 'vitest';
import {livingArt,livingArtVariant} from '../../src/client/presentation/LivingWorldArt';
it('six harvestable grass silhouettes retain the same size and foot pivot through growth',()=>{
  const variants=Array.from({length:6},(_,i)=>livingArt('forage','wild-grass',1,false,false,i));
  expect(new Set(variants.map(v=>v.markup)).size).toBe(6);
  expect(new Set(variants.map(v=>v.width+':'+v.height)).size).toBe(1);
  for(let i=0;i<6;i++){
    expect(livingArt('forage','wild-grass',1,false,false,i)).toBe(variants[i]);
    expect(livingArt('forage','wild-grass',0,false,false,i).markup).not.toBe(variants[i]!.markup);
    expect(livingArt('forage','wild-grass',.6,false,false,i).markup).not.toBe(variants[i]!.markup);
    expect(variants[i]!.markup).toContain(' 50V');
  }
  for(const id of ['wild:1','wild:2','root:1'])expect(livingArtVariant(id)).toBe(livingArtVariant(id));
});
