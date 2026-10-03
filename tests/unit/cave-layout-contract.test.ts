import {expect,it} from 'vitest';
import {CAVE_TEMPLATE_IDS,CAVE_WIDTH,generateCaveLayout,caveTileAt,validateWorldLocationV1,validateCaveProgressV1,type CaveLayout} from '../../src/world/phase2/ColonyCaveLayout';
function reachable(layout:CaveLayout):Set<number>{
  const origin=Math.floor(layout.spawn.y)*layout.width+Math.floor(layout.spawn.x),visited=new Set([origin]),queue=[origin];
  while(queue.length){const index=queue.shift()!,x=index%layout.width,y=Math.floor(index/layout.width);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx!,ny=y+dy!;if(nx<0||ny<0||nx>=layout.width||ny>=layout.height)continue;const next=ny*layout.width+nx;if(!visited.has(next)&&layout.cells[next]!=='wall'){visited.add(next);queue.push(next);}}}
  return visited;
}
it('20 seeds × three authored interiors have reachable dry spawn/exit and all finite nodes, with stable scoped IDs/load order',()=>{
  const signatures=new Set<string>();
  for(let i=0;i<20;i++)for(const template of CAVE_TEMPLATE_IDS){
    const seed='cave-seed:'+i,portal='portal:'+template,layout=generateCaveLayout(seed,portal,template),route=reachable(layout);
    expect(layout.cells).toHaveLength(480);expect(caveTileAt(layout,layout.spawn)).toBe('floor');expect(caveTileAt(layout,layout.exit)).toBe('exit');
    expect(route.has(Math.floor(layout.exit.y)*CAVE_WIDTH+Math.floor(layout.exit.x))).toBe(true);
    expect(layout.nodes).toHaveLength(4);expect(new Set(layout.nodes.map(n=>n.id)).size).toBe(4);
    for(const node of layout.nodes){expect(caveTileAt(layout,node.position)).toBe('floor');expect(route.has(Math.floor(node.position.y)*CAVE_WIDTH+Math.floor(node.position.x))).toBe(true);expect(node.yieldQuantity).toBeGreaterThanOrEqual(1);expect(node.yieldQuantity).toBeLessThanOrEqual(3);expect(node.id.startsWith(layout.spaceId+':layout:')).toBe(true);}
    generateCaveLayout(seed,'portal:unrelated','drip-grotto');expect(generateCaveLayout(seed,portal,template)).toEqual(layout);
    signatures.add(JSON.stringify({cells:layout.cells,nodes:layout.nodes.map(n=>[n.position,n.yieldQuantity])}));
    expect(Object.isFrozen(layout.cells)&&Object.isFrozen(layout.nodes)&&Object.isFrozen(layout.nodes[0]!.position)).toBe(true);
  }
  expect(signatures.size).toBeGreaterThan(40);
  expect(generateCaveLayout('world-a','portal:mine','iron-vault').nodes.map(n=>n.id)).not.toEqual(generateCaveLayout('world-b','portal:mine','iron-vault').nodes.map(n=>n.id));
});
it('world location validation keeps old surface positions and rejects unknown space, wall, out-of-bounds and non-finite coordinates',()=>{
  const layout=generateCaveLayout('seed','portal:mine','iron-vault');
  expect(validateWorldLocationV1({spaceId:'surface',position:{x:-123.75,y:234.5}},[layout])).toEqual({spaceId:'surface',position:{x:-123.75,y:234.5}});
  expect(validateWorldLocationV1({spaceId:layout.spaceId,position:layout.spawn},[layout])).toEqual({spaceId:layout.spaceId,position:layout.spawn});
  for(const value of [{spaceId:'cave:portal:foreign',position:layout.spawn},{spaceId:layout.spaceId,position:{x:0,y:0}},{spaceId:layout.spaceId,position:{x:24,y:20}},{spaceId:'surface',position:{x:NaN,y:0}},{spaceId:'surface',position:{x:1e15,y:0}},null])expect(()=>validateWorldLocationV1(value,[layout])).toThrow();
  expect(()=>generateCaveLayout('seed','not-a-portal','iron-vault')).toThrow();expect(()=>generateCaveLayout('','portal:mine','iron-vault')).toThrow();
});
it('bounded cave progress validates references/version and preserves finite depletion without silently accepting another space',()=>{
  const layout=generateCaveLayout('seed','portal:mine','iron-vault'),valid={version:1,spaceId:layout.spaceId,exploredCellIndices:[12,1],depletedNodeIds:[layout.nodes[0]!.id]};
  const progress=validateCaveProgressV1(valid,layout);expect(progress.exploredCellIndices).toEqual([1,12]);expect(progress.depletedNodeIds).toEqual(valid.depletedNodeIds);expect(Object.isFrozen(progress.depletedNodeIds)).toBe(true);
  for(const invalid of [{...valid,version:2},{...valid,spaceId:'surface'},{...valid,exploredCellIndices:[480]},{...valid,exploredCellIndices:[1,1]},{...valid,depletedNodeIds:[layout.nodes[0]!.id,layout.nodes[0]!.id]},{...valid,depletedNodeIds:['foreign-node']}])expect(()=>validateCaveProgressV1(invalid,layout)).toThrow();
});
