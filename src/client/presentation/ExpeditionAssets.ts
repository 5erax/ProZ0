import { EXPEDITION_FACILITIES } from '../../content/singleplayer/ExpeditionContent';
import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const url = new URL(
  '../../../assets/singleplayer/expedition_facilities.svg',
  import.meta.url,
).href;
export function expeditionSprite(id: string): Phase1ProductionSprite {
  const index = EXPEDITION_FACILITIES.findIndex((f) => f.id === id);
  if (index < 0) throw Error('Unknown expedition facility art');
  return {
    assetPath: 'assets/singleplayer/expedition_facilities.svg',
    url,
    cellWidth: 64,
    cellHeight: 64,
    sourceWidth: 448,
    sourceHeight: 64,
    columns: 7,
    index,
  };
}
