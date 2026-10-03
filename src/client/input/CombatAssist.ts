import type { WorldPosition } from '../../foundation';
import type { PlayerInput, FacingDirection } from '../../simulation';
export interface AssistTarget {readonly id:string;readonly position:WorldPosition;readonly range:number;readonly ready:boolean;}
const neutral:PlayerInput={moveUp:false,moveDown:false,moveLeft:false,moveRight:false};
const facing=(dx:number,dy:number):FacingDirection=>{
  const angle=Math.round(Math.atan2(dy,dx)/(Math.PI/4));return (['E','SE','S','SW','W','NW','N','NE'] as const)[(angle+8)%8]!;
};
/** Bounded solo input assistance. Damage, stamina, wear and cooldown stay authoritative. */
export class CombatAssist {
  private lastAttempt=-Infinity;private held=false;private targetId:string|null=null;private path:WorldPosition[]=[];private plannedAt=-Infinity;private goal:WorldPosition|null=null;
  constructor(private readonly services:{tick():number;actor():WorldPosition;targets():readonly AssistTarget[];clearPath(from:WorldPosition,to:WorldPosition):boolean;aim(facing:FacingDirection):void;attack(target:AssistTarget):void;}){}
  hold():void { this.held=true; }
  release():void {this.held=false;this.targetId=null;this.path=[];this.goal=null;}
  target():string|null {return this.targetId;}
  sample(manual:PlayerInput):PlayerInput {
    if(manual.moveUp||manual.moveDown||manual.moveLeft||manual.moveRight){this.release();return manual;}
    if(!this.held)return manual;
    const p=this.services.actor(),distance=(q:WorldPosition)=>Math.hypot(q.x-p.x,q.y-p.y);
    const targets=this.services.targets().filter(t=>Number.isFinite(t.range)&&t.range>0&&distance(t.position)<=8).sort((a,b)=>distance(a.position)-distance(b.position)||(a.id<b.id?-1:a.id>b.id?1:0));
    const target=targets.find(t=>t.id===this.targetId)??targets[0];
    if(!target){this.targetId=null;this.path=[];return neutral;}
    if(target.id!==this.targetId){this.path=[];this.plannedAt=-Infinity;}this.targetId=target.id;
    this.services.aim(facing(target.position.x-p.x,target.position.y-p.y));
    if(distance(target.position)<=target.range&&this.services.clearPath(p,target.position)){this.path=[];if(target.ready && this.services.tick()-this.lastAttempt>=6){this.lastAttempt=this.services.tick();this.services.attack(target);}return neutral;}
    const tick=this.services.tick();
    if(tick-this.plannedAt>=30||!this.goal||Math.hypot(target.position.x-this.goal.x,target.position.y-this.goal.y)>.5){this.path=this.plan(p,target);this.plannedAt=tick;this.goal=target.position;}
    while(this.path.length&&distance(this.path[0]!)<.18)this.path.shift();
    const next=this.path[0];if(!next||!this.services.clearPath(p,next))return neutral;
    const dx=next.x-p.x,dy=next.y-p.y;
    return {moveRight:dx>.1,moveLeft:dx<-.1,moveDown:dy>.1,moveUp:dy<-.1};
  }
  private plan(start:WorldPosition,target:AssistTarget):WorldPosition[]{
    if(this.services.clearPath(start,target.position))return [target.position];
    // Local half-metre grid: at most 1024 expansions, no unknown/global map lookup.
    const queue=[{x:0,y:0}],parents=new Map<string,string>([['0,0','0,0']]),positions=new Map<string,WorldPosition>([['0,0',start]]);
    for(let i=0;i<queue.length&&i<1024;i++){
      const cell=queue[i]!,key=cell.x+','+cell.y,p=positions.get(key)!;
      if(Math.hypot(p.x-target.position.x,p.y-target.position.y)<=target.range&&this.services.clearPath(p,target.position)){
        const path:WorldPosition[]=[];for(let at=key;at!=='0,0';at=parents.get(at)!)path.unshift(positions.get(at)!);return path;
      }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const){const x=cell.x+dx,y=cell.y+dy,k=x+','+y;if(Math.abs(x)>16||Math.abs(y)>16||parents.has(k))continue;const next={x:start.x+x*.5,y:start.y+y*.5};if(!this.services.clearPath(p,next))continue;parents.set(k,key);positions.set(k,next);queue.push({x,y});}
    }
    return [];
  }
}
