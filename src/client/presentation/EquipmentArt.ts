import { RARITY_STYLE, type ItemRarity } from '../../content/livingworld/EquipmentContent';
import type { Phase1ActorFacing, Phase1ProductionSprite } from './Phase1ProductionAssets';
const spear: Phase1ProductionSprite = {
  assetPath: 'procedural:held-basic-spear', url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" width="32" height="48" shape-rendering="crispEdges"><path fill="#382e29" d="M25 10h3v9h-1v9h-1v9h-1v7h-3v-8h1v-9h1v-9h1Z"/><path fill="#ae8456" d="M26 11h1v8h-1v9h-1v9h-1v6h-1v-7h1v-9h1v-9h1Z"/><path fill="#526b75" d="M27 3h2v8h-1v3h-3v-4h1V6h1Z"/><path fill="#b4c6c4" d="M28 3h1v8h-2V7h1Z"/><path fill="#c5a276" d="M25 13h3v2h-3Zm-1 16h3v3h-3Z"/></svg>'),
  cellWidth: 32, cellHeight: 48, sourceWidth: 32, sourceHeight: 48, columns: 1, index: 0,
};
/** Shared idle-held spear layer. Attack animation already contains the weapon. */
const tierSprites = new Map<ItemRarity, Phase1ProductionSprite>([['common', spear]]);
export function heldSpearSprite(facing: Phase1ActorFacing, rarity: ItemRarity = 'common') {
  let sprite = tierSprites.get(rarity);
  if (!sprite) {
    const source = decodeURIComponent(spear.url.slice(spear.url.indexOf(',') + 1));
    const markup = source.replaceAll('#b4c6c4', RARITY_STYLE[rarity].colour).replaceAll('#c5a276', RARITY_STYLE[rarity].colour).replace('</svg>', '<path fill="' + RARITY_STYLE[rarity].colour + '" d="M24 9h2v2h-2Zm5 0h2v2h-2Z"/></svg>');
    sprite = { ...spear, assetPath: 'procedural:held-spear:' + rarity, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup) };
    tierSprites.set(rarity, sprite);
  }
  return { sprite, flipX: facing === 'SW' || facing === 'W' || facing === 'NW' }; }
