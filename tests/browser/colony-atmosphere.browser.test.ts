import { expect, it } from 'vitest';
import { atmosphericParticleAt, createAtmosphericParticles } from '../../src/client/presentation/AtmosphericParticles';
import { colonyGroundSprite } from '../../src/client/presentation/ColonySoilArt';
it('paints changing rain and wind pixels with camera parallax, reduced-motion density and bounded native raster', () => {
  const effect = createAtmosphericParticles(document), ctx = effect.canvas.getContext('2d')!;
  effect.render('rain', 1, { x: 0, y: 0 }, false);
  const first = Array.from(ctx.getImageData(0, 0, 640, 360).data);
  expect(first.some(value => value > 0)).toBe(true);
  effect.render('rain', 1.2, { x: 0, y: 0 }, false);
  expect(Array.from(ctx.getImageData(0, 0, 640, 360).data)).not.toEqual(first);
  const p = atmosphericParticleAt('dry-wind', 1, 1, { x: 0, y: 0 });
  expect(atmosphericParticleAt('dry-wind', 1, 2, { x: 0, y: 0 }).x).not.toBe(p.x);
  expect(atmosphericParticleAt('dry-wind', 1, 1, { x: 20, y: 30 }).y).not.toBe(p.y);
  effect.render('dry-wind', 2, { x: 0, y: 0 }, true);
  expect(effect.canvas.dataset.particleCount).toBe('24');
  expect(effect.canvas.width).toBe(640); expect(effect.canvas.height).toBe(360);
});
it('uses shared soil states, subtle biome variants and darker wet surfaces without regenerating the map', () => {
  const normal = colonyGroundSprite('mist-marsh', 'loam', 0, 'normal');
  expect(normal).toBe(colonyGroundSprite('mist-marsh', 'loam', 0, 'normal'));
  expect(colonyGroundSprite('mist-marsh', 'clay', 0, 'normal').url).not.toBe(normal.url);
  expect(colonyGroundSprite('mist-marsh', 'loam', 1, 'normal').url).not.toBe(normal.url);
  const wet = decodeURIComponent(colonyGroundSprite('mist-marsh', 'loam', 0, 'wet').url), dry = decodeURIComponent(colonyGroundSprite('mist-marsh', 'loam', 0, 'dry').url);
  const main = (svg: string) => parseInt(svg.match(/z" fill="#([0-9a-f]{6})"/)![1]!, 16);
  expect(main(wet)).toBeLessThan(main(dry));
});
it('wind shares one direction, limits dust and clears both rasters at calm without advancing time', () => {
  const effect = createAtmosphericParticles(document);
  const anchors = Array.from({length:30},(_,salt)=>({x:180+salt*2,y:220,salt}));
  for (const direction of [-1,1] as const) {
    for (let i=0;i<12;i++) {
      const start=atmosphericParticleAt('dry-wind',i,1,{x:0,y:0},false,{phase:'peak',intensity:1,direction});
      const end=atmosphericParticleAt('dry-wind',i,1.2,{x:0,y:0},false,{phase:'peak',intensity:1,direction});
      // These short samples are away from the wrap boundary.
      if(Math.abs(end.x-start.x)<100)expect(Math.sign(end.x-start.x)).toBe(direction);
    }
  }
  effect.render('dry-wind',1,{x:0,y:0},false,{phase:'peak',intensity:1,direction:1},anchors);
  expect(effect.groundCanvas.dataset.groundDustCount).toBe('12');
  expect(Array.from(effect.groundCanvas.getContext('2d')!.getImageData(0,0,640,360).data).some(v=>v>0)).toBe(true);
  effect.render('dry-wind',1,{x:0,y:0},true,{phase:'peak',intensity:1,direction:1},anchors);
  expect(effect.groundCanvas.dataset.groundDustCount).toBe('4');
  effect.render('dry-wind',1,{x:0,y:0},false,{phase:'calm',intensity:0,direction:1},anchors);
  for(const canvas of [effect.canvas,effect.groundCanvas])expect(Array.from(canvas.getContext('2d')!.getImageData(0,0,640,360).data).every(v=>v===0)).toBe(true);
});
