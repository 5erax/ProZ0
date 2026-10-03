import type { WorldPosition } from '../../foundation';
import type { CavePortal } from './ColonyCaveLayout';
/** Optional cave-world landscape v1. Legacy surface generations remain byte-identical. */
export function mountainAt(point:WorldPosition,portals:readonly CavePortal[]) {
  for(let i=0;i<portals.length;i++){
    const p=portals[i]!,x=point.x-p.position.x,y=point.y-p.position.y,height=i===1?10:5;
    if(Math.abs(x)<=4&&y>=-6&&y<=0)return {height,ramp:false,portalId:p.id,profile:i===1?'high-mesa':'low-ridge'};
    if(Math.abs(x)<=1.6&&y>0&&y<8)return {height:height*(1-y/8),ramp:true,portalId:p.id,profile:i===1?'high-mesa':'low-ridge'};
  }
  return {height:0,ramp:false,portalId:null,profile:'plain'};
}
export function mountainFoundation(point:WorldPosition,portals:readonly CavePortal[]) {
  const value=mountainAt(point,portals);
  return !value.ramp&&!portals.some(p=>Math.hypot(p.position.x-point.x,p.position.y-point.y)<2);
}
