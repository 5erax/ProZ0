import {test,expect} from '@playwright/test';
import {walk} from './support/solo-actions';
import {soloCaveRegistry} from '../../src/world/phase2/SoloCaveRegistry';
test('cave expedition: natural ramp travel, scoped fog/map, finite mining and save/reopen return through the same portal',async({page})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const seed='p1-world-golden',portal=soloCaveRegistry(seed,5)[0]!;
  await page.goto('/?'+new URLSearchParams({proz0Mode:'phase2-colony-review',proz0WorldId:'world:cave-journey',proz0WorldSeed:seed,proz0Players:'solo',proz0Player:'solo',proz0SaveDb:'cave-journey'}));
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await walk(page,portal.position.x,portal.position.y+9);
  await walk(page,portal.position.x,portal.position.y);
  const entrance=page.locator('[data-world-role="cave-portal"][data-world-id="'+portal.id+'"]');
  await entrance.click();
  const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-worldspace',portal.layout.spaceId);
  await expect(page.locator('.lw-menu')).toBeHidden();await expect(page.locator('[data-weather-effect]')).toHaveCount(0);
  await page.keyboard.press('m');await expect(page.locator('.p1-panel-title')).toContainText('CAVE MAP');await page.keyboard.press('Escape');
  // Guided natural input, not a novice playtest or a grant/teleport fixture.
  const layout=portal.layout,start=Math.floor(layout.spawn.y)*layout.width+Math.floor(layout.spawn.x);
  const queue=[start],parents=new Map<number,number>();parents.set(start,start);
  for(let i=0;i<queue.length;i++){const at=queue[i]!;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=at%layout.width+dx!,y=Math.floor(at/layout.width)+dy!,n=y*layout.width+x;if(x<0||y<0||x>=layout.width||y>=layout.height||parents.has(n)||layout.cells[n]==='wall'||layout.cells[n]==='water')continue;parents.set(n,at);queue.push(n);}}
  const node=[...layout.nodes].filter(n=>parents.has(Math.floor(n.position.y)*layout.width+Math.floor(n.position.x))).sort((a,b)=>Math.hypot(a.position.x-layout.spawn.x,a.position.y-layout.spawn.y)-Math.hypot(b.position.x-layout.spawn.x,b.position.y-layout.spawn.y))[0]!;
  const cell=Math.floor(node.position.y)*layout.width+Math.floor(node.position.x),path:number[]=[];for(let n=cell;n!==start;n=parents.get(n)!){path.unshift(n);}
  for(const n of path)await walk(page,n%layout.width+.5,Math.floor(n/layout.width)+.5,.12);
  const deposit=page.locator('[data-cave-resource][data-world-id="'+node.id+'"]');
  await deposit.click({button:'right'});await expect(page.locator('[data-entity-inspection]')).toContainText('Finite cave deposit');
  await page.keyboard.press('Escape');await deposit.click();
  await expect(deposit).toHaveAttribute('data-depleted','true',{timeout:15000});
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Save world [L]',exact:true}).click();
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
  await page.reload();await expect(canvas).toHaveAttribute('data-worldspace',layout.spaceId);await expect(deposit).toHaveAttribute('data-depleted','true');
  for(const n of [...path].reverse().slice(1))await walk(page,n%layout.width+.5,Math.floor(n/layout.width)+.5,.12);
  await walk(page,layout.spawn.x,layout.spawn.y);await walk(page,layout.exit.x,layout.exit.y);await page.keyboard.press('e'); await test.info().attach('cave-return-state',{body:JSON.stringify(await page.locator('[data-proz0-autoboot]').evaluate(e=>e.dataset)),contentType:'application/json'}); await page.screenshot({path:'test-results/cave-return.png'});
  await expect(canvas).toHaveAttribute('data-worldspace','surface');
  const returned=await canvas.evaluate(e=>({x:Number(e.dataset.playerX),y:Number(e.dataset.playerY)}));expect(Math.hypot(returned.x-portal.position.x,returned.y-portal.position.y)).toBeLessThan(1.5);
  expect(errors).toEqual([]);
});
