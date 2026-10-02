import { expect, it } from 'vitest';
import { livingArt } from '../../src/client/presentation/LivingWorldArt';
import { CROPS, FORAGE, SPECIES } from '../../src/content/livingworld/LivingWorldContent';
import { worldDepthOrder } from '../../src/client/presentation/WorldDepth';
it('renders recognizable content-specific anatomy at distinct scales and valid crop stages', () => {
  const container = document.createElement('section');
  document.body.append(container);
  const sizes = new Set<string>(), silhouettes = new Set<string>();
  for (const species of SPECIES) {
    const adult = livingArt('animal', species.id, 0), young = livingArt('animal', species.id, 0, true);
    expect(young.width).toBeLessThan(adult.width);
    expect(young.height).toBeLessThan(adult.height);
    sizes.add(adult.width + ':' + adult.height); silhouettes.add(adult.markup);
    container.insertAdjacentHTML('beforeend', adult.markup);
    container.insertAdjacentHTML('beforeend', livingArt('animal', species.id, 0, false, true).markup);
  }
  expect(sizes.size).toBe(SPECIES.length); expect(silhouettes.size).toBe(SPECIES.length);
  for (const crop of CROPS) {
    expect(livingArt('plot', crop.id, 0).markup).not.toBe(livingArt('plot', crop.id, 1).markup);
    container.insertAdjacentHTML('beforeend', livingArt('plot', crop.id, 1).markup);
  }
  for (const forage of FORAGE) container.insertAdjacentHTML('beforeend', livingArt('forage', forage.id, 0).markup);
  for (const svg of container.querySelectorAll('svg')) {
    expect(svg.getAttribute('viewBox')).toBe('0 0 64 64');
    for (const path of svg.querySelectorAll('path')) expect(path.getTotalLength()).toBeGreaterThan(0);
  }
  expect(livingArt('animal', 'goat', 0)).toBe(livingArt('animal', 'goat', 0));
  container.remove();
});

it('foot order puts front flora above the actor, keeps gear together, and shifts all objects atomically far from origin', () => {
  const stage = document.createElement('section'); stage.style.setProperty('--world-camera-depth', '6000000'); document.body.append(stage);
  const node = (x: number, y: number, layer = 0) => { const e = document.createElement('span'); e.style.position = 'absolute'; e.style.zIndex = worldDepthOrder({ x, y }, layer); stage.append(e); return e; };
  const behind = node(2999, 3000), body = node(3000, 3000), wrap = node(3000, 3000, 1), spear = node(3000, 3000, 2), front = node(3001, 3000);
  const depth = (e: HTMLElement) => Number(getComputedStyle(e).zIndex);
  try {
    expect(depth(body)).toBe(100000); expect(depth(behind)).toBeLessThan(depth(body)); expect(depth(front)).toBeGreaterThan(depth(spear));
    expect(depth(wrap) - depth(body)).toBe(1); expect(depth(spear) - depth(body)).toBe(2);
    const saved = [behind, body, wrap, spear, front].map(e => ({ style: e.style.zIndex, depth: depth(e) }));
    stage.style.setProperty('--world-camera-depth', '6000250');
    [behind, body, wrap, spear, front].forEach((e, i) => { expect(e.style.zIndex).toBe(saved[i]!.style); expect(depth(e)).toBe(saved[i]!.depth - 250); });
    expect(depth(behind)).toBeGreaterThan(0);
  } finally { stage.remove(); }
});
