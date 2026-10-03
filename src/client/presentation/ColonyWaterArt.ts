import { COLONY_BIOMES, type ColonyBiomeId } from '../../content/phase2/ColonyDepthContent';
import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const cache = new Map<string, Phase1ProductionSprite>();
/** Shore masks are world-neighbor bits N/E/S/W, with native isometric edges. */
export function colonyWaterSprite(biome: ColonyBiomeId, shoreMask: number, phase: number, flowDirection: number, shallow: boolean): Phase1ProductionSprite {
  const mask = shoreMask & 15, frame = ((phase % 4) + 4) % 4, direction = flowDirection & 3;
  const key = [biome, mask, frame, direction, shallow].join(':');
  const known = cache.get(key); if (known) return known;
  const p = COLONY_BIOMES[biome], water = shallow ? '#426f73' : p.water, shine = '#86b6ad';
  const edges = ['M32 0 64 16', 'M64 16 32 32', 'M32 32 0 16', 'M0 16 32 0'];
  const banks = edges.map((edge, bit) => mask & (1 << bit) ? '<path d="' + edge + '" fill="none" stroke="' + p.ground + '" stroke-width="5"/><path d="' + edge + '" fill="none" stroke="#95aaa0" stroke-width="1" opacity=".5"/>' : '').join('');
  const marks = Array.from({ length: 5 }, (_, i) => {
    const x = 12 + ((i * 11 + frame * 3) % 40), y = 10 + ((i * 3 + frame) % 12);
    return '<path d="M' + x + ' ' + y + (direction % 2 ? 'l4 -2h3' : 'l4 2h3') + '" stroke="' + shine + '" opacity="' + (i % 2 ? '.2' : '.38') + '" fill="none"/>';
  }).join('');
  const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" shape-rendering="crispEdges"><defs><clipPath id="water"><path d="M0 16 32 0 64 16 32 32z"/></clipPath></defs><g clip-path="url(#water)"><path d="M0 16 32 0 64 16 32 32z" fill="' + water + '"/>' + marks + banks + '</g></svg>';
  const result = Object.freeze({ assetPath: 'phase2:water:' + key, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup), cellWidth: 32, cellHeight: 16, sourceWidth: 32, sourceHeight: 16, columns: 1, index: 0 });
  cache.set(key, result); return result;
}
