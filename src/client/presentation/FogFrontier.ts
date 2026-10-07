import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const cache=new Map<number,Phase1ProductionSprite>();
/** Fog remains below discovered silhouettes. Unknown entities are excluded by authority knowledge. */
export function fogFrontierSprite(mask:number):Phase1ProductionSprite {
 if(!Number.isInteger(mask)||mask<0||mask>15)throw Error('Invalid fog mask');const cached=cache.get(mask);if(cached)return cached;
 const edges=[[1,'M0 16 32 0'],[2,'M32 0 64 16'],[4,'M64 16 32 32'],[8,'M32 32 0 16']] as const;
 const fringe=edges.filter(([bit])=>!(mask&bit)).map(([,d])=>'<path d="'+d+'" fill="none" stroke="#263d43" stroke-width="7" opacity=".35"/>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><path d="M0 16 32 0 64 16 32 32Z" fill="#14252e"/>'+fringe+'</svg>';
 const sprite={assetPath:'procedural:fog-frontier:'+mask,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),cellWidth:64,cellHeight:32,sourceWidth:64,sourceHeight:32,columns:1,index:0};cache.set(mask,sprite);return sprite;
}
