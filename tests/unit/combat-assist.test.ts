import { describe, expect, it, vi } from 'vitest';
import { CombatAssist, type AssistTarget } from '../../src/client/input/CombatAssist';
import { traversableSegment } from '../../src/world/collision/TraversableSegment';
import type { WorldPosition } from '../../src/foundation';

const idle = { moveUp:false, moveDown:false, moveLeft:false, moveRight:false };
function setup(clearPath:(from:WorldPosition,to:WorldPosition)=>boolean = () => true) {
  let actor:WorldPosition = {x:0,y:0}, tick = 0;
  let targets:AssistTarget[] = [{id:'b',position:{x:2,y:0},range:1,ready:true}];
  const attack = vi.fn(), aim = vi.fn();
  const assist = new CombatAssist({actor:()=>actor,tick:()=>tick,targets:()=>targets,clearPath,attack,aim});
  return {assist,attack,aim,setActor:(p:WorldPosition)=>{actor=p;},setTick:(t:number)=>{tick=t;},setTargets:(v:AssistTarget[])=>{targets=v;}};
}
describe('solo combat input assistance', () => {
  it('chases with movement input, stops immediately on release and never attacks out of range', () => {
    const {assist,attack,aim}=setup(); assist.hold();
    expect(assist.sample(idle)).toEqual({...idle,moveRight:true});
    expect(attack).not.toHaveBeenCalled(); expect(aim).toHaveBeenCalledWith('E');
    assist.release(); expect(assist.sample(idle)).toEqual(idle); expect(assist.target()).toBeNull();
  });
  it('manual WASD cancels assistance until a new hold', () => {
    const {assist,attack}=setup(); assist.hold();
    const manual={...idle,moveUp:true};expect(assist.sample(manual)).toBe(manual);
    expect(assist.sample(idle)).toEqual(idle);expect(attack).not.toHaveBeenCalled();
  });
  it('acquires a deterministic nearest target and respects authoritative cooldown/removal', () => {
    const {assist,attack,setTargets}=setup();
    setTargets([{id:'b',position:{x:0,y:.5},range:1,ready:true},{id:'a',position:{x:.5,y:0},range:1,ready:false}]);
    assist.hold();expect(assist.sample(idle)).toEqual(idle);expect(assist.target()).toBe('a');expect(attack).not.toHaveBeenCalled();
    setTargets([{id:'b',position:{x:0,y:.5},range:1,ready:true}]);assist.sample(idle);
    expect(attack).toHaveBeenCalledOnce();expect(attack.mock.calls[0]![0].id).toBe('b');
    setTargets([]);assist.sample(idle);expect(assist.target()).toBeNull();expect(attack).toHaveBeenCalledOnce();
  });
  it('bounds repeated rejected attempts while an eligible target remains ready', () => {
    const {assist,attack,setTargets,setTick}=setup();
    setTargets([{id:'a',position:{x:.5,y:0},range:1,ready:true}]);assist.hold();
    for(let tick=0;tick<60;tick++){setTick(tick);assist.sample(idle);}
    expect(attack).toHaveBeenCalledTimes(10);
  });
  it('does not attack through a barrier or move when no traversable route exists', () => {
    const {assist,attack}=setup(()=>false);assist.hold();
    expect(assist.sample(idle)).toEqual(idle);expect(attack).not.toHaveBeenCalled();
  });
  it('finds a local route around a blocked straight segment', () => {
    const clear=(a:WorldPosition,b:WorldPosition)=>!(Math.min(a.x,b.x)<1.1&&Math.max(a.x,b.x)>.9&&Math.min(a.y,b.y)<.6);
    const {assist,attack,setActor,setTick}=setup(clear);assist.hold();
    let p={x:0,y:0};
    for(let tick=0;tick<150&&!attack.mock.calls.length;tick++) {
      setTick(tick);const movement=assist.sample(idle);
      const next={x:p.x+(Number(movement.moveRight)-Number(movement.moveLeft))*.125,y:p.y+(Number(movement.moveDown)-Number(movement.moveUp))*.125};
      expect(clear(p,next)).toBe(true);p=next;setActor(p);
    }
    expect(p.y).toBeGreaterThan(.6);expect(attack).toHaveBeenCalledOnce();
  });
});
describe('walking-footprint combat visibility', () => {
  it('samples intervening geometry rather than checking only endpoints', () => {
    const world={sweepAabbAxis:vi.fn(({center,axis,desiredDelta})=>({allowedDelta:desiredDelta,blocked:axis==='x'&&center.x<.5&&center.x+desiredDelta>=.5}))};
    expect(traversableSegment(world,{x:0,y:0},{x:1,y:0},{halfWidth:.3125,halfDepth:.1875})).toBe(false);
    expect(world.sweepAabbAxis.mock.calls.length).toBeGreaterThan(1);
  });
  it('bounds its workload and rejects non-finite coordinates', () => {
    const world={sweepAabbAxis:vi.fn()};
    expect(traversableSegment(world,{x:0,y:0},{x:17,y:0},{halfWidth:1,halfDepth:1})).toBe(false);
    expect(traversableSegment(world,{x:NaN,y:0},{x:1,y:0},{halfWidth:1,halfDepth:1})).toBe(false);
    expect(world.sweepAabbAxis).not.toHaveBeenCalled();
  });
});
