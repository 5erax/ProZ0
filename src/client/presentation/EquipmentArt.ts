import type { Phase1ActorFacing, Phase1ProductionSprite } from './Phase1ProductionAssets';
const spear: Phase1ProductionSprite = {
  assetPath: 'procedural:held-basic-spear', url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" width="32" height="48" shape-rendering="crispEdges"><path fill="#382e29" d="M25 10h3v9h-1v9h-1v9h-1v7h-3v-8h1v-9h1v-9h1Z"/><path fill="#ae8456" d="M26 11h1v8h-1v9h-1v9h-1v6h-1v-7h1v-9h1v-9h1Z"/><path fill="#526b75" d="M27 3h2v8h-1v3h-3v-4h1V6h1Z"/><path fill="#b4c6c4" d="M28 3h1v8h-2V7h1Z"/><path fill="#c5a276" d="M25 13h3v2h-3Zm-1 16h3v3h-3Z"/></svg>'),
  cellWidth: 32, cellHeight: 48, sourceWidth: 32, sourceHeight: 48, columns: 1, index: 0,
};
/** Shared idle-held spear layer. Attack animation already contains the weapon. */
export function heldSpearSprite(facing: Phase1ActorFacing) { return { sprite: spear, flipX: facing === 'SW' || facing === 'W' || facing === 'NW' }; }
