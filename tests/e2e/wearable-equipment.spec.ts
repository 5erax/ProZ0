import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {WEARABLE_ITEMS,WEARABLE_PROFILES} from '../../src/content/livingworld/WearableContent';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {installSaveFixture} from './support/save-fixture';

test('six wardrobe slots equip matching owned gear, show world layers, conserve stacks and restore all wearable references',async({page})=>{
  test.setTimeout(120000);
  const b=await Phase1AuthorityBundle.create({worldId:'world:wearable-ui',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>;
  try{
    await b.stepSolo();
    // Controlled wardrobe fixture; recipe/material conservation tested separately.
    expect(b.items.commitColonyExchange({operationId:'fixture:wearable-ui',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:WEARABLE_ITEMS.map(i=>({itemDefinitionId:i.id,quantity:1}))}).status).toBe('committed');
    save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});
  }finally{await b.destroy();}
  await installSaveFixture(page,'wearable-ui',save);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:wearable-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=wearable-ui');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await page.keyboard.press('i');const inventory=page.locator('[data-panel-kind="inventory"]');
  await expect(inventory.locator('[data-equipment-drop-slot]')).toHaveCount(6);
  const boots=inventory.locator('[data-equipment-drop-slot="feet"]'),visor=inventory.getByRole('button',{name:'Sun Visor',exact:true});
  await visor.dragTo(boots);await expect(boots).not.toHaveAttribute('data-equipped-stack');
  for(const profile of WEARABLE_PROFILES){
    const item=inventory.getByRole('button',{name:profile.name,exact:true}),slot=inventory.locator('[data-equipment-drop-slot="'+profile.slot+'"]');
    await expect(item).toHaveAttribute('draggable','true');
    if(profile.slot==='feet'){await item.dragTo(slot);await item.dragTo(slot);}else{await item.click();await inventory.locator('[aria-label="Selected item details"]').getByRole('button',{name:'Equip selected item [X]',exact:true}).click();}
    await expect(slot).toHaveAttribute('data-equipped-stack');await expect(inventory.locator('[data-avatar-equipment="'+profile.slot+'"]')).toHaveCount(1);await expect(item).toContainText('×1');
  }
  await inventory.evaluate(e=>{e.scrollTop=0;});mkdirSync('test-results/wearable-equipment',{recursive:true});await page.screenshot({path:'test-results/wearable-equipment/wardrobe-desktop.png'});
  await page.setViewportSize({width:640,height:360});await inventory.evaluate(e=>{e.scrollTop=0;});
  await expect(inventory.locator('[aria-label="Equipment and character preview"]')).toBeVisible();
  expect(await inventory.locator('.p1-wardrobe').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await page.screenshot({path:'test-results/wearable-equipment/wardrobe-640.png'});await page.setViewportSize({width:1280,height:720});
  await page.keyboard.press('Escape');
  for(const profile of WEARABLE_PROFILES)await expect(page.locator('[data-world-role="wearable-'+profile.slot+'"][data-world-id="solo"]')).toHaveCount(1);
  await page.screenshot({path:'test-results/wearable-equipment/world-outfit.png'});
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');await page.reload();await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');await page.keyboard.press('i');
  for(const profile of WEARABLE_PROFILES){await expect(inventory.locator('[data-equipment-drop-slot="'+profile.slot+'"]')).toHaveAttribute('data-equipped-stack');await expect(inventory.getByRole('button',{name:profile.name,exact:true})).toContainText('×1');}
  await boots.getByRole('button',{name:'Unequip feet',exact:true}).click();await expect(inventory.locator('[data-avatar-equipment="feet"]')).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.locator('[data-world-role="wearable-feet"][data-world-id="solo"]')).toHaveCount(0);expect(errors).toEqual([]);
});
