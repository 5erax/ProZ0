import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {installSaveFixture} from './support/save-fixture';

test('canonical stump fixture: inspect, uproot with hoe, replant timber root and reopen without the original tree',async({page})=>{
  const bundle=await Phase1AuthorityBundle.create({worldId:'world:canonical-root-ui',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,resourceLifecycleVersion:1,resourceProfileVersion:1,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>,id:string,destination:{x:number;y:number};
  try {
    const tree=bundle.world.getActiveGeneratedEntities().filter(e=>e.type==='resource'&&e.definitionId==='resource:timber-source').sort((a,b)=>Math.hypot(a.position.x,a.position.y)-Math.hypot(b.position.x,b.position.y))[0]!;
    expect(tree).toBeDefined();id=tree.entityId;bundle.getRuntime('solo').relocatePlayer(tree.position);await bundle.stepSolo();
    while(!bundle.worldStore.getResourceState(id)!.depleted)bundle.worldStore.commitResourceGather(id,bundle.worldStore.getResourceState(id)!.revision,bundle.authorityTick);
    expect(bundle.items.commitColonyExchange({operationId:'fixture:hoe',playerId:'solo',expectedInventoryRevision:0,inputs:[],outputs:[{itemDefinitionId:'item:field-hoe',quantity:1}]}).status).toBe('committed');
    const positions=[];for(let y=tree.position.y-3;y<=tree.position.y+3;y++)for(let x=tree.position.x-3;x<=tree.position.x+3;x++)if(Math.hypot(x-tree.position.x,y-tree.position.y)<=4&&typeof bundle.buildings.assessPlacement('structure:storage-crate',{mode:'free',anchor:{x,y},orientationQuarterTurns:0},true)!=='string'&&!bundle.livingWorld!.read().forage.some(f=>!f.cleared&&Math.hypot(f.x-x,f.y-y)<1.25))positions.push({x,y});
    destination=positions.find(p=>Math.hypot(p.x-tree.position.x,p.y-tree.position.y)>=1.5)!;expect(destination).toBeDefined();
    save=composePhase1SaveV2(bundle,{nowUtc:'2026-10-03T00:00:00Z'});
  } finally {await bundle.destroy();}
  await installSaveFixture(page,'canonical-root-ui',save);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:canonical-root-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=canonical-root-ui');
  const tree=page.locator('[data-world-id="'+id+'"][data-world-role="resource"]');
  // The starter stump lies behind the grove diorama; inspect its focused target by keyboard.
  await tree.focus();await page.keyboard.press('Shift+F10');await expect(page.getByRole('region',{name:'Entity statistics',exact:true})).toContainText('Early growth');
  await page.keyboard.press('f');const panel=page.locator('.lw-panel');
  await panel.locator('[data-living-row="'+id+'"]').getByRole('button',{name:'Uproot · Field Hoe',exact:true}).click();
  await expect(tree).toHaveCount(0);await panel.getByRole('button',{name:'Replant Timber Tree Root',exact:true}).click();
  // Root placement shares the isometric ground projection; no state injection after boot.
  const point=await page.locator('canvas').evaluate((e,target)=>{const r=e.getBoundingClientRect(),c=(e as HTMLElement).dataset;return{x:r.left+(320+(target.x-Number(c.playerX)-target.y+Number(c.playerY))*16)*r.width/640,y:r.top+(180+(target.x-Number(c.playerX)+target.y-Number(c.playerY))*8)*r.height/360};},destination);
  await page.mouse.move(point.x,point.y);await expect(page.locator('.lw-ghost')).toBeVisible();await page.mouse.click(point.x,point.y);
  await expect(panel.getByRole('status')).toContainText('root replanted');await page.keyboard.press('Escape');
  const sapling=page.locator('[data-living-id^="replant:"]');await expect(sapling).toHaveCount(1);const identity=await sapling.getAttribute('data-living-id');
  await sapling.click({button:'right'});await expect(page.getByRole('region',{name:'Entity statistics',exact:true})).toContainText('Timber Tree');
  mkdirSync('test-results/canonical-root',{recursive:true});await page.screenshot({path:'test-results/canonical-root/replanted.png'});
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');await page.reload();
  await expect(tree).toHaveCount(0);await expect(page.locator('[data-living-id="'+identity+'"]')).toHaveCount(1);
});
