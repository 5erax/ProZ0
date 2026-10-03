import type { WorldPosition } from '../../foundation';
import type { WorldCollisionQuery } from '../api/WorldCollisionQuery';
import type { AabbHalfExtents } from './Aabb';
/** Same swept footprint as walking. Bounded, read-only, and rejects unloaded geometry. */
export function traversableSegment(world:WorldCollisionQuery,from:WorldPosition,to:WorldPosition,footprint:AabbHalfExtents):boolean {
  const distance=Math.hypot(to.x-from.x,to.y-from.y);
  if(!Number.isFinite(distance)||distance>16)return false;
  const count=Math.max(1,Math.ceil(distance/.125));let center=from;
  for(let i=1;i<=count;i++){
    const next={x:from.x+(to.x-from.x)*i/count,y:from.y+(to.y-from.y)*i/count};
    for(const axis of ['x','y'] as const){const delta=next[axis]-center[axis],result=world.sweepAabbAxis({center,axis,desiredDelta:delta,footprint});if(result.blocked||Math.abs(result.allowedDelta-delta)>1e-8)return false;center={...center,[axis]:next[axis]};}
  }
  return true;
}
