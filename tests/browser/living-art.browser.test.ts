import { expect, it } from 'vitest';
import { livingArt } from '../../src/client/presentation/LivingWorldArt';
import { CROPS, FORAGE, SPECIES } from '../../src/content/livingworld/LivingWorldContent';
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
