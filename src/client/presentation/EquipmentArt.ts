import { RARITY_STYLE, type ItemRarity } from '../../content/livingworld/EquipmentContent';
import type { Phase1ActorFacing, Phase1ProductionSprite } from './Phase1ProductionAssets';
import type { WearableSlot } from '../../content/livingworld/WearableContent';
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

const wearableArt = new Map<string, Phase1ProductionSprite>();
/** Same 32×48 frame and feet pivot as the actor in wardrobe and world. */
export function wearableSprite(slot: WearableSlot, facing: Phase1ActorFacing, walking = false, ordinal = 0) {
  const phase = walking ? Math.floor(ordinal) % 2 : 0;
  const key = slot + ':' + phase;
  let sprite = wearableArt.get(key);
  if (!sprite) {
    const shapes: Record<WearableSlot, string> = {
      head: '<path fill="#263c43" d="M10 8h12v6H10Z"/><path fill="#92d879" d="M11 9h10v2H11Z"/><path fill="#d9ddc0" d="M8 12h16v2H8Z"/><path fill="#566c62" d="M9 14h3v2H9Zm11 0h3v2h-3Z"/>',
      legs: '<path fill="#615346" d="M10 30h12v5H10Zm1 5h5v7h-5Zm6 0h5v7h-5Z"/><path fill="#b2aa8b" d="M10 30h12v2H10Zm1 3h2v7h-2Zm8 0h2v7h-2Z"/><path fill="#343939" d="M15 34h2v8h-2Z"/>',
      feet: '<path fill="#344954" d="M10 ' + (39 + phase) + 'h6v6h-7v-3h1Zm7 ' + (40 - phase) + 'h6v5h-6Z"/><path fill="#9bab9e" d="M10 ' + (40 + phase) + 'h5v1h-5Zm8 ' + (41 - phase) + 'h4v1h-4Z"/><path fill="#1d2c35" d="M9 45h7v2H9Zm8 0h6v2h-6Z"/>',
      accessory: '<path fill="#273d45" d="M8 17h3v13H8Zm13 0h4v14h-4Z"/><path fill="#7fbbff" d="M22 18h2v10h-2Z"/><path fill="#98b2a4" d="M10 18h12v2H10Zm-1 8h14v2H9Z"/><path fill="#536c75" d="M21 29h5v4h-5Z"/>',
    };
    sprite = { ...spear, assetPath: 'procedural:wearable:' + key, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" width="32" height="48" shape-rendering="crispEdges">' + shapes[slot] + '</svg>') };
    wearableArt.set(key, sprite);
  }
  return { sprite, flipX: facing === 'SW' || facing === 'W' || facing === 'NW' };
}
