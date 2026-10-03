import {expect,test} from '@playwright/test';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {installSaveFixture} from './support/save-fixture';

test('solo building interaction: mouse and E open the lab only, right click stays read-only',async({page})=>{
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:targeted-lab&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=targeted-lab');
  const lab=page.getByRole('button',{name:'Landing Lab · interact',exact:true});
  await lab.click({button:'right'});
  await expect(page.getByRole('region',{name:'Entity statistics',exact:true})).toContainText('Landing Lab');
  await expect(page.locator('.sp-expedition-panel')).toBeHidden();
  await lab.click();const panel=page.locator('.sp-expedition-panel');
  await expect(panel).toHaveAttribute('data-target-entity','landing-lab');
  await expect(panel.locator('article')).toHaveCount(1);
  await expect(panel.getByRole('button',{name:'Plan',exact:true})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Emergency supplies · once',exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Entity statistics',exact:true})).toBeHidden();
  await page.keyboard.press('Escape');await page.keyboard.press('e');
  await expect(panel).toHaveAttribute('data-target-entity','landing-lab');await expect(panel).toBeVisible();
  await page.setViewportSize({width:640,height:360});const b=await panel.boundingBox();expect(b!.x+b!.width).toBeLessThanOrEqual(640);expect(b!.width).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Build base [B]',exact:true}).click();
  await page.getByRole('button',{name:'Expedition blueprints · materials later',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Plan',exact:true})).toHaveCount(20);
});


test('solo movement releases promptly and async authority backlog stays bounded',async({page})=>{
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:input-queue&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=input-queue');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await page.keyboard.down('d');
  const queued=await page.locator('[data-proz0-autoboot]').evaluate(async root=>{const values:number[]=[];for(let i=0;i<25;i++){await new Promise(requestAnimationFrame);values.push(Number((root as HTMLElement).dataset.soloPendingSteps));}return values;});
  expect(Math.max(...queued)).toBeLessThanOrEqual(4);expect(queued.every(Number.isFinite)).toBe(true);
  await page.keyboard.up('d');
  const stopped=await page.locator('canvas').evaluate(async e=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return{x:Number((e as HTMLElement).dataset.playerX),y:Number((e as HTMLElement).dataset.playerY)};});
  await page.waitForTimeout(300);
  const later=await page.locator('canvas').evaluate(e=>({x:Number((e as HTMLElement).dataset.playerX),y:Number((e as HTMLElement).dataset.playerY)}));
  expect(Math.hypot(later.x-stopped.x,later.y-stopped.y)).toBeLessThan(.15);
});

test('targeted blueprint stays on its completed building instead of becoming an empty panel',async({page})=>{
  const b=await Phase1AuthorityBundle.create({worldId:'world:target-plan',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>,id:string;
  try {
    b.getRuntime('solo').relocatePlayer({x:-39,y:-12});await b.stepSolo();
    expect(b.items.commitColonyExchange({operationId:'fixture:build',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:timber',quantity:4},{itemDefinitionId:'item:plant-fiber',quantity:4}]}).status).toBe('committed');
    expect(b.expedition!.execute({id:'fixture:bed-plan',playerId:'solo',expectedRevision:b.expedition!.read().revision,expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,action:'plan',target:'camp-bed',x:-40,y:-12,orientation:0}).status).toBe('committed');
    id=b.expedition!.read().plans[0]!.id;save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});
  }finally{await b.destroy();}
  await installSaveFixture(page,'target-plan',save);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:target-plan&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=target-plan');
  await page.getByRole('button',{name:'Camp Bed · blueprint',exact:true}).click();
  const panel=page.locator('.sp-expedition-panel');await expect(panel).toHaveAttribute('data-target-entity',id);
  await panel.getByRole('button',{name:'Contribute',exact:true}).click();await panel.getByRole('button',{name:'Complete',exact:true}).click();
  await expect(panel).toHaveAttribute('data-target-entity','facility:'+id);
  await expect(panel.locator('[data-expedition-facility]')).toHaveCount(1);
  await expect(panel.getByRole('button',{name:'Sleep / rest',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'Dismantle & refund',exact:true}).click();await expect(panel.locator('[data-expedition-facility]')).toHaveCount(0);
  await expect(panel.getByRole('status')).toContainText('Building materials returned');
});
