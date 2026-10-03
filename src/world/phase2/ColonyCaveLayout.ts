import { DeterministicRng,deriveSeedState,type WorldPosition } from '../../foundation';
import { fromWorldPosition } from '../chunks/ChunkCoord';

/** D4.1 content contract only. No runtime portal or Save V2 mutation is enabled here. */
export const CAVE_LAYOUT_VERSION=1 as const;
export const CAVE_WIDTH=24;
export const CAVE_HEIGHT=20;
export const CAVE_TEMPLATE_IDS=['echo-gallery','iron-vault','drip-grotto'] as const;
export type CaveTemplateId=typeof CAVE_TEMPLATE_IDS[number];
export type CaveTile='wall'|'floor'|'water'|'exit';
export interface CaveNode {
  readonly id:string;
  readonly position:WorldPosition;
  readonly resourceDefinitionId:'resource:metal-ore-node'|'resource:stone-outcrop';
  readonly yieldQuantity:number;
}
export interface CaveLayout {
  readonly version:1;
  readonly spaceId:string;
  readonly portalId:string;
  readonly templateId:CaveTemplateId;
  readonly width:typeof CAVE_WIDTH;
  readonly height:typeof CAVE_HEIGHT;
  readonly cells:readonly CaveTile[];
  readonly spawn:WorldPosition;
  readonly exit:WorldPosition;
  readonly nodes:readonly CaveNode[];
}
export interface CavePortal {
  readonly id: string;
  readonly position: WorldPosition;
  readonly layout: CaveLayout;
}
function portalKey(id:string):string {
  if(typeof id!=='string'||!/^portal:[a-z0-9][a-z0-9:-]{0,95}$/.test(id))throw Error('Invalid cave portal ID');
  return 'cave:'+id;
}
/** Same world/portal/template always yields the same local space, irrespective of load order. */
export function generateCaveLayout(seed:string,portalId:string,templateId:CaveTemplateId):CaveLayout {
  if(typeof seed!=='string'||!seed || !CAVE_TEMPLATE_IDS.includes(templateId))throw Error('Invalid cave layout request');
  const spaceId=portalKey(portalId),seedState=deriveSeedState({worldSeed:seed,namespace:'colony-cave:layout:v1',stableIdentifiers:[portalId,templateId]}),layoutIdentity=seedState.map(n=>n.toString(16).padStart(8,'0')).join(''),rng=new DeterministicRng(seedState);
  const cells:CaveTile[]=Array.from({length:CAVE_WIDTH*CAVE_HEIGHT},()=> 'wall');
  const rectangle=(left:number,top:number,right:number,bottom:number,tile:CaveTile='floor')=>{for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)cells[y*CAVE_WIDTH+x]=tile;};
  if(templateId==='echo-gallery'){
    rectangle(2,2,21,17);
    for(const x of [7,16])rectangle(x,3,x,16,'wall');
    for(const [x,y] of [[7,6],[7,13],[16,9],[16,14]])rectangle(x!,y!,x!,y!);
  }else if(templateId==='iron-vault'){
    rectangle(3,3,10,9);rectangle(13,3,20,9);rectangle(5,12,18,17);
    rectangle(9,8,14,13);rectangle(10,7,13,8);
  }else{
    rectangle(2,3,9,14);rectangle(11,2,20,8);rectangle(8,10,21,17);
    rectangle(8,6,13,12);rectangle(14,11,20,16,'water');
    rectangle(18,13,19,14,'floor');
  }
  rectangle(11,17,12,18);cells[19*CAVE_WIDTH+12]='exit';
  // Horizontal reflection changes spatial discovery while preserving the guaranteed dry path.
  const reflect=(rng.nextUint32()&1)===1;
  const point=(x:number,y:number)=>Object.freeze({x:(reflect?CAVE_WIDTH-1-x:x)+.5,y:y+.5});
  const finalCells=reflect?cells.map((_,i)=>cells[Math.floor(i/CAVE_WIDTH)*CAVE_WIDTH+(CAVE_WIDTH-1-i%CAVE_WIDTH)]!):cells;
  const candidates=finalCells.flatMap((tile,i)=>tile==='floor' && Math.floor(i/CAVE_WIDTH)<16 ? [i]:[]);
  const selected:number[]=[];
  for(let n=0;n<4;n++){
    const index=rng.nextUint32()%candidates.length,cell=candidates.splice(index,1)[0]!;selected.push(cell);
  }
  const nodes=selected.map((index,n)=>Object.freeze({id:spaceId+':layout:'+layoutIdentity+':node:'+n,position:Object.freeze({x:index%CAVE_WIDTH+.5,y:Math.floor(index/CAVE_WIDTH)+.5}),resourceDefinitionId:n<2?'resource:metal-ore-node' as const:'resource:stone-outcrop' as const,yieldQuantity:1+rng.nextUint32()%3}));
  return Object.freeze({version:CAVE_LAYOUT_VERSION,spaceId,portalId,templateId,width:CAVE_WIDTH,height:CAVE_HEIGHT,cells:Object.freeze(finalCells),spawn:point(12,18),exit:point(12,19),nodes:Object.freeze(nodes)});
}
export function caveTileAt(layout:CaveLayout,position:WorldPosition):CaveTile|null {
  if(!Number.isFinite(position.x)||!Number.isFinite(position.y)||position.x<0||position.y<0||position.x>=layout.width||position.y>=layout.height)return null;
  return layout.cells[Math.floor(position.y)*layout.width+Math.floor(position.x)]??null;
}
export interface WorldLocationV1 {
  readonly spaceId:string;
  readonly position:WorldPosition;
}
/** Loader must supply the authoritative registry; an arbitrary well-formed space ID grants no access. */
export function validateWorldLocationV1(value:unknown,layouts:readonly CaveLayout[]):WorldLocationV1 {
  const location=value as WorldLocationV1;
  if(!location || typeof location.spaceId!=='string' || !location.position || !Number.isFinite(location.position.x)||!Number.isFinite(location.position.y))throw Error('Invalid world location');
  if(location.spaceId==='surface')fromWorldPosition(location.position);
  else{
    const layout=layouts.find(l=>l.spaceId===location.spaceId);
    if(!layout || !['floor','water','exit'].includes(caveTileAt(layout,location.position)??''))throw Error('Unknown or blocked worldspace location');
  }
  return Object.freeze({spaceId:location.spaceId,position:Object.freeze({x:location.position.x,y:location.position.y})});
}
export interface CaveProgressV1 {
  readonly version:1;
  readonly spaceId:string;
  readonly exploredCellIndices:readonly number[];
  readonly depletedNodeIds:readonly string[];
}
/** Persisted-content candidate validation. Wiring/migration is a later D4 gate. */
export function validateCaveProgressV1(value:unknown,layout:CaveLayout):CaveProgressV1 {
  const state=value as CaveProgressV1;
  if(!state || state.version!==1 || state.spaceId!==layout.spaceId || !Array.isArray(state.exploredCellIndices) || state.exploredCellIndices.length>layout.cells.length || new Set(state.exploredCellIndices).size!==state.exploredCellIndices.length || state.exploredCellIndices.some(i=>!Number.isSafeInteger(i)||i<0||i>=layout.cells.length) || !Array.isArray(state.depletedNodeIds) || state.depletedNodeIds.length>layout.nodes.length || new Set(state.depletedNodeIds).size!==state.depletedNodeIds.length || state.depletedNodeIds.some(id=>!layout.nodes.some(n=>n.id===id)))throw Error('Invalid cave progress');
  return Object.freeze({version:1,spaceId:layout.spaceId,exploredCellIndices:Object.freeze([...state.exploredCellIndices].sort((a,b)=>a-b)),depletedNodeIds:Object.freeze([...state.depletedNodeIds].sort())});
}
