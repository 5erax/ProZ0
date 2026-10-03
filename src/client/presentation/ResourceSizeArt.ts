import type { ResourceSize } from '../../content/livingworld/ResourceSizeProfiles';
import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const cache = new Map<string, Phase1ProductionSprite>();

/** Trim empty sky from interaction bounds, particularly around low plants/rocks. */
export function sizedResourceHitShape(id: string, size: ResourceSize, depleted: boolean, stage?: 'early' | 'growing' | 'mature'): string {
  const matureRank = size === 'small' ? 0 : size === 'medium' ? 1 : 2;
  const rank = stage === 'growing' ? Math.max(0, matureRank - 1) : matureRank;
  const tree = id === 'resource:timber-source';
  const rock = id === 'resource:stone-outcrop' || id === 'resource:metal-ore-node';
  const top = depleted ? tree ? 64 : 69 : tree ? [34, 20, 4][rank]! : rock ? [62, 55, 44][rank]! : 48 - rank * 5;
  const left = tree ? [14, 8, 0][rank]! : rock ? [21, 15, 8][rank]! : [16, 12, 8][rank]!;
  if (rock && !depleted) {
    // Match the native rock silhouette: its empty upper corners and ground shadow
    // must not steal pointer input from a small plant behind/next to the deposit.
    const right = 64 - left;
    return 'polygon(' + [[left,72],[left+4,top+5],[33,top],[right,top+10],[right,74],[32,79]].map(([x,y]) => x!/64*100+'% '+y!/80*100+'%').join(',') + ')';
  }
  return 'polygon(' + left / 64 * 100 + '% ' + top / 80 * 100 + '%,' + (64 - left) / 64 * 100 + '% ' + top / 80 * 100 + '%,' + (64 - left) / 64 * 100 + '% 100%,' + left / 64 * 100 + '% 100%)';
}

/** Each size has its own native silhouette and detail; scale never depends on camera. */
export function sizedResourceSprite(id: string, size: ResourceSize, depleted: boolean, stage?: 'early' | 'growing' | 'mature'): Phase1ProductionSprite {
  const key = id + ':' + size + ':' + depleted + ':' + (stage ?? 'legacy'), cached = cache.get(key);
  if (cached) return cached;
  const matureRank = size === 'small' ? 0 : size === 'medium' ? 1 : 2;
  const rank = stage === 'growing' ? Math.max(0, matureRank - 1) : matureRank;
  let body = '<path fill="#172c3088" d="M8 74 32 65 57 74 33 80Z"/>';
  if (id === 'resource:timber-source') {
    const top = [34, 20, 4][rank]!, left = [17, 11, 5][rank]!, width = 64 - left * 2;
    body += '<path fill="#473d30" d="M28 76V' + (top + 13) + 'h8v' + (63 - top) + 'h-8Z"/><path fill="#987d50" d="M29 74V' + (top + 17) + 'h3v' + (57 - top) + 'h-3Z"/><path fill="#5e533b" d="M20 76 29 68h6l9 8H20Z"/>';
    if (!depleted) {
      body += '<path fill="#314b3b" d="M' + left + ' ' + (top + 12) + 'h6v-6h8v-4h' + (width - 28) + 'v4h8v6h6v16h-5v6h-' + (width - 10) + 'v-6h-5Z"/>';
      body += '<path fill="#6d8860" d="M' + (left + 7) + ' ' + (top + 5) + 'h17v5h9v6H' + (left + 3) + 'v-6h4Z"/><path fill="#496b49" d="M' + (left + 10) + ' ' + (top + 17) + 'h21v6h-6v5H' + (left + 7) + 'v-5h3Z"/>';
      if (rank > 0) body += '<path fill="#506d48" d="M' + left + ' ' + (top + 24) + 'h12v8h8v9H' + (left + 4) + 'v-5h-4Z"/><path fill="#8b9c68" d="M' + (left + 4) + ' ' + (top + 24) + 'h9v3h-9Z"/>';
      if (rank === 2) body += '<path fill="#3e5b41" d="M41 23h15v6h4v15H41Z"/><path fill="#637b51" d="M44 24h11v4H44Z"/><path fill="#755d40" d="M34 52h4V40h4v-5h3v9h-3v12h-8Z"/>';
    } else body = body.split('<path fill="#473d30"')[0] + '<path fill="#56432f" d="M26 67h12v9H26Z"/><path fill="#bd9e69" d="M26 67 32 64 38 67 32 70Z"/><path fill="#756041" d="M29 67h6v1h-6Z"/>';
  } else if (id === 'resource:stone-outcrop' || id === 'resource:metal-ore-node') {
    const left = [21, 15, 8][rank]!, top = [62, 55, 44][rank]!, right = 64 - left;
    body += depleted ? '<path fill="#667a78" d="M23 74h7v3h-7Zm13-3h8v5h-8Z"/>' : '<path fill="#425d63" d="M' + left + ' 72 ' + (left + 4) + ' ' + (top + 5) + ' 33 ' + top + ' ' + right + ' ' + (top + 10) + ' ' + right + ' 74 32 79Z"/><path fill="#889994" d="M' + (left + 4) + ' ' + (top + 5) + ' 33 ' + top + ' 39 ' + (top + 10) + ' 27 70 ' + left + ' 72Z"/><path fill="#5e787b" d="M39 ' + (top + 10) + ' ' + right + ' ' + (top + 10) + ' ' + right + ' 74 28 77 27 70Z"/><path fill="#304b54" d="M33 ' + (top + 7) + 'h2v7h-2Zm8 13h2v7h-2Z"/>';
    if (id === 'resource:metal-ore-node' && !depleted) body += '<path fill="#b79262" d="M28 ' + (top + 11) + 'h5v4h-5Zm9 8h7v3h-7Zm-9 8h4v4h-4Z"/><path fill="#debf84" d="M28 ' + (top + 11) + 'h3v2h-3Zm9 8h4v1h-4Z"/>';
  } else {
    const count = rank + 2;
    for (let i = 0; i < count; i++) {
      const x = 22 - rank * 4 + i * 8, height = depleted ? 7 : 16 + rank * 5 + (i % 2) * 3;
      body += '<path fill="#4f6847" d="M' + x + ' 76v-' + height + 'h3v' + height + 'Z"/>';
      if (!depleted) body += '<path fill="#84a373" d="M' + (x - 5) + ' ' + (77 - height) + 'h5v5h-5Zm8-4h5v5h-5Z"/><path fill="' + (id === 'resource:food-plant' ? '#c5a262' : '#b1be8b') + '" d="M' + x + ' ' + (71 - height) + 'h4v5h-4Z"/>';
    }
  }
  const sprite = Object.freeze({ assetPath: 'procedural:resource-size:' + key, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80" shape-rendering="crispEdges">' + body + '</svg>'), cellWidth: 64, cellHeight: 80, sourceWidth: 64, sourceHeight: 80, columns: 1, index: 0 });
  if (cache.size >= 60) cache.delete(cache.keys().next().value!);
  cache.set(key, sprite); return sprite;
}
