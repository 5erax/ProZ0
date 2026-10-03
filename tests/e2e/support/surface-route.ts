import type { Page } from '@playwright/test';
import { Phase1AuthorityBundle } from '../../../src/integration/Phase1AuthorityBundle';
import { createChunkCoord } from '../../../src/world/chunks/ChunkCoord';
import { PLAYER_COLLISION_FOOTPRINT } from '../../../src/simulation/player/PlayerCollisionFootprint';
import { walk } from './solo-actions';

const worlds = new Map<string, Promise<Phase1AuthorityBundle>>();
/** Plan against a separate canonical seeded world, then execute ordinary keyboard
 * movement in the browser. No browser relocation, item grants or collision bypass.
 * These fresh-world journeys must use ramps and walk around cliffs. */
export async function walkSurface(page: Page, x: number, y: number) {
  const seed = 'p1-world-golden';
  let pending = worlds.get(seed);
  if (!pending) {
    pending = Phase1AuthorityBundle.create({worldId:'world:route-reference',worldSeed:seed,worldGenerationVersion:5,playerIds:['walker'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,soloCavesEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
    worlds.set(seed,pending);
  }
  const bundle = await pending;
  const start = await page.locator('canvas').evaluate(e=>({x:Number(e.dataset.playerX),y:Number(e.dataset.playerY)}));
  const minX=Math.floor(Math.min(start.x,x))-16,maxX=Math.ceil(Math.max(start.x,x))+16,minY=Math.floor(Math.min(start.y,y))-16,maxY=Math.ceil(Math.max(start.y,y))+16;
  for(let cy=Math.floor(minY/32);cy<=Math.floor(maxY/32);cy++)for(let cx=Math.floor(minX/32);cx<=Math.floor(maxX/32);cx++)await bundle.world.activateCoord(createChunkCoord(cx,cy));
  const key=(p:{x:number;y:number})=>p.x.toFixed(4)+','+p.y.toFixed(4);
  const clear=(from:{x:number;y:number},to:{x:number;y:number})=>{
    const axis=from.x===to.x?'y':'x',delta=to[axis]-from[axis];
    const result=bundle.world.sweepAabbAxis({center:from,footprint:PLAYER_COLLISION_FOOTPRINT,axis,desiredDelta:delta});
    return Math.abs(result.allowedDelta-delta)<1e-8;
  };
  const distance=(p:{x:number;y:number})=>Math.abs(p.x-x)+Math.abs(p.y-y);
  const directCorner={x,y:start.y};
  if(clear(start,directCorner)&&clear(directCorner,{x,y})){
    await walk(page,x,start.y,.15);await walk(page,x,y,.15);return;
  }
  const open=[{p:start,cost:0}],parents=new Map<string,string>(),points=new Map([[key(start),start]]),costs=new Map([[key(start),0]]);
  let finish:string|undefined;
  for(let n=0;open.length&&n<100000;n++){
    open.sort((a,b)=>Number((b.cost+distance(b.p)-a.cost-distance(a.p)).toFixed(6))||distance(b.p)-distance(a.p));
    const current=open.pop()!,id=key(current.p);
    if(current.cost!==costs.get(id))continue;
    const corner={x,y:current.p.y};
    if(distance(current.p)<2&&clear(current.p,corner)&&clear(corner,{x,y})){finish=id;break;}
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const p={x:current.p.x+dx!,y:current.p.y+dy!},next=key(p),cost=current.cost+1;
      if(p.x<minX||p.x>maxX||p.y<minY||p.y>maxY||cost>=(costs.get(next)??Infinity)||!clear(current.p,p))continue;
      costs.set(next,cost);parents.set(next,id);points.set(next,p);open.push({p,cost});
    }
  }
  if(!finish)throw Error('No canonical walking route to '+x+','+y);
  const path:{x:number;y:number}[]=[];
  for(let id=finish;id!==key(start);id=parents.get(id)!)path.unshift(points.get(id)!);
  // Keep turns, but avoid hundreds of needless browser round trips on straight legs.
  for(let i=0;i<path.length;i++){
    const before=i===0?start:path[i-1]!,at=path[i]!,after=path[i+1];
    if(!after||(at.x-before.x)!==(after.x-at.x)||(at.y-before.y)!==(after.y-at.y))await walk(page,at.x,at.y,.15);
  }
  const last=path.at(-1)??start;
  await walk(page,x,last.y,.15);await walk(page,x,y,.15);
}
