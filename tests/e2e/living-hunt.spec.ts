import {expect,test} from '@playwright/test';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {installSaveFixture} from './support/save-fixture';
test('equipped mythic spear hunts wildlife with real wear, stamina, finite loot and saved removal',async({page})=>{
  test.setTimeout(60000);
  const b=await Phase1AuthorityBundle.create({worldId:'world:hunt-ui',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>;
  try{
    b.getRuntime('solo').relocatePlayer({x:-39,y:-12});await b.stepSolo();
    expect(b.items.commitColonyExchange({operationId:'fixture:hunt',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:mythic-relic-spear',quantity:1}]}).status).toBe('committed');
    expect(b.equipWeapon('solo',b.items.getContainerView('inventory:solo').stacks.find(s=>s.itemDefinitionId==='item:mythic-relic-spear')!.stackId).status).toBe('committed');
    save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});
    save.world.livingWorld!.animals=[{id:'wolf:hunt-ui',species:'wolf',x:-38.5,y:-12,anchorX:-38.5,anchorY:-12,age:18000,health:12,sex:0,energy:10000,thirst:10000,breedTick:0,product:0,productTicks:0,pen:null,owner:null,attackTick:0,shearTick:0}];
  }finally{await b.destroy();}
  await installSaveFixture(page,'hunt-ui',save);await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:hunt-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=hunt-ui');
  const wolf=page.locator('[data-living-id="wolf:hunt-ui"]'),panel=page.locator('.lw-panel');
  await wolf.click();await panel.getByRole('button',{name:'Hunt',exact:true}).click();await expect(panel.getByRole('status')).toHaveText('hit');
  await page.keyboard.press('Escape');await wolf.click({button:'right'});await expect(page.getByRole('region',{name:'Entity statistics',exact:true})).toContainText('Health: 4/12');await page.keyboard.press('Escape');
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');
  const receipt=await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const open=indexedDB.open('hunt-ui',2);open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
    const result=await new Promise<{condition:number;spentAt:number|null}>((resolve,reject)=>{const tx=db.transaction(['containers','players'],'readonly'),container=tx.objectStore('containers').get(['world:hunt-ui','inventory:solo']),player=tx.objectStore('players').get(['world:hunt-ui','solo']);tx.oncomplete=()=>resolve({condition:container.result.stacks.find((s:{itemDefinitionId:string})=>s.itemDefinitionId==='item:mythic-relic-spear').condition,spentAt:player.result.survival.lastStaminaSpendTick});tx.onerror=()=>reject(tx.error);});db.close();return result;
  });
  expect(receipt.condition).toBe(99);expect(receipt.spentAt).toBeGreaterThan(0);
  // Wildlife keeps moving during inspection/save; approach its visible foot with real keys.
  let reached=false;
  for(let i=0;i<40;i++){
    const delta=await wolf.evaluate(e=>{const r=e.getBoundingClientRect(),c=document.querySelector('canvas')!.getBoundingClientRect(),scale=c.width/640,x=(r.left+r.width/2-c.left-c.width/2)/scale,y=(r.top+r.height*50/64-c.top-c.height/2)/scale;return{x:x/32+y/16,y:y/16-x/32};});
    if(Math.hypot(delta.x,delta.y)<.6){reached=true;break;}
    const keys=Math.abs(delta.x)>=Math.abs(delta.y)?delta.x>0?['s','d']:['w','a']:delta.y>0?['s','a']:['w','d'];
    for(const key of keys)await page.keyboard.down(key);await page.waitForTimeout(60);for(const key of keys.toReversed())await page.keyboard.up(key);
  }
  expect(reached).toBe(true);
  await wolf.click();await panel.getByRole('button',{name:'Hunt',exact:true}).click();await expect(panel.getByRole('status')).toContainText('Animal down');
  await panel.getByRole('button',{name:'Collect meat, hide & bone',exact:true}).click();await expect(wolf).toHaveCount(0);
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');await page.reload();await expect(wolf).toHaveCount(0);
});
