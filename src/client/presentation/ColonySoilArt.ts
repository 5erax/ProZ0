import { COLONY_BIOMES, type ColonyBiomeId } from '../../content/phase2/ColonyDepthContent';
import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const tints: Record<string, string> = { loam: '#9a9871', sand: '#c2aa71', clay: '#a27a63', peat: '#44645a', rocky: '#87918a' };
const cache = new Map<string, Phase1ProductionSprite>();
const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function color(base: string, tint: string, variation: number, moisture: string) {
  const a = channels(base), b = channels(tint), value = moisture === 'wet' ? .76 : moisture === 'dry' ? 1.09 : 1;
  return '#' + a.map((c, i) => Math.round(Math.max(0, Math.min(255, (c * .88 + b[i]! * .12 + variation) * value))).toString(16).padStart(2, '0')).join('');
}
/** Bounded, authored terrain variants; biome identity stays dominant over local soil. */
export function colonyGroundSprite(biome: ColonyBiomeId, soil: string, variant: number, moisture: 'dry' | 'normal' | 'wet', shoreMask = 0): Phase1ProductionSprite {
  const shore = shoreMask & 6, height = shore ? 40 : 32;
  const v = ((variant % 8) + 8) % 8, key = [biome, soil, v, moisture, shore].join(':');
  const found = cache.get(key); if (found) return found;
  const p = COLONY_BIOMES[biome], tint = tints[soil] ?? tints.loam!;
  const base = color(p.ground, tint, v % 3 - 1, moisture), light = color(p.ground, tint, 9, moisture), dark = color(p.ground, tint, -12, moisture);
  const details = Array.from({ length: 8 }, (_, i) => {
    const x = 10 + (i * 13 + v * 7) % 43, y = 9 + (i * 5 + v * 3) % 15;
    return '<path d="M' + x + ' ' + y + 'h' + (2 + i % 3) + 'v1h-' + (2 + i % 3) + 'z" fill="' + (i % 3 ? light : dark) + '" opacity=".55"/>';
  }).join('');
  const clumps = soil === 'rocky' ? '<path fill="' + dark + '" d="m18 18 4-3 5 2-4 3zM39 13h4v2h-4z"/>' : soil === 'sand' ? '<path fill="none" stroke="' + light + '" opacity=".35" d="m13 18 8 4 10-2m2-12 12 6 5-2"/>' : '<path fill="' + light + '" opacity=".6" d="M17 17v-3h2v4zm25-4v-3h2v4z"/>';
  const faces = (shore & 2 ? '<path d="M64 16 32 32v6l32-16Z" fill="' + dark + '"/>' : '') + (shore & 4 ? '<path d="M0 16 32 32v6L0 22Z" fill="' + color(p.ground, tint, -26, moisture) + '"/>' : '');
  const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="' + height + '" shape-rendering="crispEdges">' + faces + '<defs><clipPath id="tile"><path d="M0 16 32 0 64 16 32 32z"/></clipPath></defs><g clip-path="url(#tile)"><path d="M0 16 32 0 64 16 32 32z" fill="' + base + '"/>' + details + clumps + (moisture === 'wet' ? '<path d="m24 24 8 3 9-4-7 1z" fill="' + p.water + '" opacity=".2"/>' : '') + '</g></svg>';
  const result = Object.freeze({ assetPath: 'phase2:soil:' + key, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup), cellWidth: 32, cellHeight: height / 2, sourceWidth: 32, sourceHeight: height / 2, columns: 1, index: 0 });
  cache.set(key, result); return result;
}
