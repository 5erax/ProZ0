import type { ExplorationTemplateId } from '../../content/phase2/ExplorationContent';
import type { Phase1ProductionSprite } from './Phase1ProductionAssets';
const cache=new Map<string,Phase1ProductionSprite>();
/** Walkable ruin dioramas. Their footprint anchor never animates with the camera. */
export function explorationSiteSprite(template:ExplorationTemplateId,stage:'unrestored'|'restored'|'recovered'):Phase1ProductionSprite {
  const key=template+':'+stage,known=cache.get(key);if(known)return known;
  const glow=stage==='unrestored'?'#617174':'#bedcad',opened=stage==='recovered';
  const floor='<path fill="#334448" d="m2 56 46-23 46 23-46 23z"/><path fill="#53676a" d="m8 56 40-20 40 20-40 20z"/><path fill="#819491" d="m15 57 24-12 4 2-24 12zM52 43l25 12-4 2-25-12z"/>';
  const console='<path fill="#25373b" d="m15 48 8-4 8 4v9l-8 4-8-4z"/><path fill="'+glow+'" d="m18 47 5-2 5 2-5 3z"/><path fill="#809897" d="M20 52h3v3h-3z"/>';
  const locker=opened?'<path fill="#4e6063" d="m58 59 10-5 12 6-10 5z"/><path fill="#1a2e34" d="m61 59 7-3 8 4-6 3z"/><path fill="#8a9b91" d="m60 58 2-12 12 5 4 6-10-5z"/>':'<path fill="#4e6063" d="m58 54 10-5 12 6v10l-10 5-12-6z"/><path fill="#a1aca0" d="m58 54 10-5 12 6-10 5z"/><path fill="'+glow+'" d="M66 61h3v3h-3z"/>';
  let details='';
  switch(template){
    case 'relay': details='<path fill="#46636a" d="m37 48 8-38 12-6 5 43-13 7z"/><path fill="#9cadab" d="m45 10 12-6 5 43-13 7z"/><path fill="#344a52" d="M46 19h11v4H46zm-2 10h15v4H44zm-2 10h18v4H42z"/><path fill="'+glow+'" d="M49 14h4v4h-4zM48 34h4v4h-4z"/><path stroke="#be9d71" stroke-width="2" fill="none" d="m26 54 9 5 13-7"/>'+console+locker;break;
    case 'laboratory':details='<path fill="#354a52" d="m29 31 26-13 28 14v24L55 70 29 57z"/><path fill="#7e9493" d="m29 31 26-13 28 14-28 14z"/><path fill="#a0b2aa" d="m31 28 20-10 7 4-20 10z"/><path fill="#122b34" d="m42 37 14-7 10 5-14 7z"/><path fill="#7e9493" d="M29 32h5v23h-5zM78 35h5v19h-5z"/><path fill="'+glow+'" d="M63 45h8v7h-8z"/><path fill="#d3bc89" d="M42 52h9v3h-9zM45 49h3v9h-3z"/>'+console+locker;break;
    case 'garden':details='<path fill="#785f43" d="m17 44 16-8 20 10-16 8zm19 18 19-10 19 10-19 10z"/><path fill="#364f3c" d="m20 44 13-6 14 7-11 6zm19 18 16-8 14 8-14 6z"/><path fill="#86a565" d="M29 29h4v12h-4zM23 34h7v4h-7zM34 31h5v5h-5zM49 47h5v14h-5zM43 51h6v5h-6zM55 50h7v5h-7z"/><path fill="#ccb276" d="M28 29h4v4h-4zM51 45h4v4h-4z"/><path stroke="'+glow+'" stroke-width="2" d="m57 33 7 4v10"/>'+locker;break;
    case 'mine':details='<path fill="#786e59" d="M34 23h5v32h-5zM65 19h5v34h-5z"/><path fill="#b2a78b" d="m34 23 33-7 4 5-34 8z"/><path stroke="#657b80" stroke-width="3" d="m28 62 46-23m-39 28 46-23"/><path fill="#40555d" d="m42 45 13-6 14 7v9l-13 6-14-7z"/><path fill="#83968e" d="m42 45 13-6 14 7-13 6z"/><path fill="#283a3b" d="M45 53h4v4h-4zM62 55h4v4h-4z"/><path fill="'+(opened?'#3d5056':'#b29d6d')+'" d="m47 45 6-8 7 4 5 5-10 4z"/>'+console;break;
    case 'array':details='<path fill="#46575e" d="m31 46 5-31 14 7-5 31zm20 9 5-32 14 7-5 32zm20-8 5-32 13 7-4 31z"/><path fill="#a7aaa0" d="m36 15 14 7-5 31-4-3zm20 8 14 7-5 32-4-3zm20-8 13 7-4 31-4-3z"/><path fill="'+glow+'" d="M40 27h4v4h-4zM60 37h4v4h-4zM80 27h4v4h-4z"/><path stroke="#b19b6c" fill="none" stroke-width="2" d="m25 53 20 7 24-3 13-7"/>'+console;break;
    case 'shelter':details='<path fill="#596e60" d="m25 30 27-17 32 18-28 14z"/><path fill="#92a18b" d="m25 30 27-17 4 32z"/><path fill="#354b4c" d="m56 45 28-14v5L56 50z"/><path fill="'+(stage==='unrestored'?'#263b40':'#75866c')+'" d="m42 23 10-6 8 5-5 12-6-6z"/><path stroke="#b7a17b" stroke-width="3" d="M28 32v22m28-9v22m24-30v20"/><path fill="#7b7060" d="m35 51 18-9 15 8-18 9z"/><path fill="#aaa48a" d="m38 50 5-3 10 5-5 3z"/>'+locker;break;
  }
  const markup='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80" shape-rendering="crispEdges">'+floor+details+'</svg>';
  const sprite:Phase1ProductionSprite={assetPath:'phase2:exploration:'+key,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(markup),cellWidth:96,cellHeight:80,sourceWidth:96,sourceHeight:80,columns:1,index:0};cache.set(key,sprite);return sprite;
}
