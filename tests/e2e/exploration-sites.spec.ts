import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {Phase1AuthorityBundle,composePhase1SaveV2} from '../../src/integration';
import {createPhase1SaveV2Compatibility,validatePortableSaveBundleV2} from '../../src/persistence';
import {EXPLORATION_TEMPLATES} from '../../src/content/phase2/ExplorationContent';

for(const template of EXPLORATION_TEMPLATES)test('exploration UI: '+template.id+' inspect, restoration, finite supplies and save',async({page})=>{
  const b=await Phase1AuthorityBundle.create({worldId:'world:exploration-ui',worldSeed:'p1-world-golden',playerIds:['solo'],colonyDepthEnabled:true,singlePlayerExpeditionEnabled:true,worldGenerationVersion:5,resourceProfileVersion:1,interactionRangeWorldUnits:4,spawnClearanceRadiusWorldUnits:0,requiredAccessRadiusWorldUnits:0});
  let save:ReturnType<typeof composePhase1SaveV2>;
  try{
    const site=b.colonyDepth.sites().find(s=>s.id===template.siteId)!;
    // Only location and materials are fixture setup; all POI transactions use real UI.
    b.getRuntime('solo').relocatePlayer(site.position);await b.stepSolo();
    expect(b.items.commitColonyExchange({operationId:'fixture:poi-materials',playerId:'solo',expectedInventoryRevision:b.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[...template.costs.map(([itemDefinitionId,quantity])=>({itemDefinitionId,quantity})),...(template.tool?[{itemDefinitionId:template.tool,quantity:1}]:[]),...(template.id==='laboratory'?[{itemDefinitionId:'item:plant-fiber',quantity:3},{itemDefinitionId:'item:stone',quantity:2}]:[])]}).status).toBe('committed');
    save=composePhase1SaveV2(b,{nowUtc:'2026-10-03T00:00:00Z'});
    expect(validatePortableSaveBundleV2({...save,formatId:save.world.formatId,schemaVersion:save.world.schemaVersion,recordKind:'portable-bundle'},createPhase1SaveV2Compatibility(b.catalog,[3,4,5])).ok).toBe(true);
  }finally{await b.destroy();}
  await page.goto('/');
  await page.evaluate(async request => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('exploration-ui', 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [name, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(name!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(request.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);

  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:exploration-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=exploration-ui');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  const sprite=page.locator('[data-world-role="survey-site"][data-site-id="'+template.siteId+'"]');
  await expect(sprite).toHaveAttribute('data-poi-template',template.id);await expect(sprite).toHaveAttribute('data-poi-stage','unrestored');
  const other=template.id==='laboratory'?'site:abandoned-shelter':'site:abandoned-lab';await expect(page.locator('[data-world-role="survey-site"][data-site-id="'+other+'"]')).toHaveCount(0);
  // Keyboard and mouse entry points both open the discovered site and focus its action.
  if(template.id==='shelter'){await expect(page.locator('[data-region="interaction"]')).toContainText('EXPLORE');await page.keyboard.press('e');}else if(template.id==='relay'){await sprite.locator('[data-site-interaction]').focus();await page.keyboard.press('Enter');}else await sprite.locator('[data-site-interaction]').click();
  const panel=page.locator('.p2-colony-panel'),row=panel.locator('[data-discovered-landmark="'+template.siteId+'"]');
  await expect(row.getByRole('button',{name:'Inspect',exact:true})).toBeFocused();
  await page.keyboard.press('Enter');await expect(row.locator('[data-colony-action="restore-site:'+template.siteId+'"]')).toBeVisible();
  await row.getByRole('button',{name:template.restoreLabel,exact:true}).click();await expect(sprite).toHaveAttribute('data-poi-stage','restored');
  if(template.id==='relay')await expect(row.locator('[data-relay-signal]')).toContainText('Abandoned Field Laboratory');
  await row.getByRole('button',{name:'Recover supplies',exact:true}).click();await expect(row).toHaveAttribute('data-poi-stage','recovered');await expect(sprite).toHaveAttribute('data-poi-stage','recovered');
  await expect(row).toContainText('does not refill');await expect(row.getByRole('button',{name:'Recover supplies',exact:true})).toHaveCount(0);
  if(template.id==='shelter'){
    await page.setViewportSize({width:640,height:360});const bounds=await panel.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(640);await page.screenshot({path:'test-results/exploration-narrow.png'});await page.setViewportSize({width:1280,height:720});
    await row.getByRole('button',{name:'Sleep / rest · 8s',exact:true}).click();await expect(row.locator('[data-poi-rest]')).toContainText('Resting');
    await expect(row.locator('[data-poi-rest]')).toContainText('Rest complete',{timeout:12000});await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success',{timeout:5000});
  }
  mkdirSync('test-results/exploration-sites',{recursive:true});await page.screenshot({path:'test-results/exploration-sites/'+template.id+'-journal.png'});
  await page.keyboard.press('Escape');await page.screenshot({path:'test-results/exploration-sites/'+template.id+'-world.png'});
  await page.keyboard.press('l');await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success');await page.reload();await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await expect(sprite).toHaveAttribute('data-poi-stage','recovered');await page.keyboard.press('j');await expect(row).toContainText('does not refill');
  if(template.id==='laboratory'){
    await page.keyboard.press('u');const research=panel.locator('[data-colony-action="research:field-survey"]');await expect(research).toBeEnabled();await research.click();await expect(research).toHaveText('✓ Completed');
  }
  await page.keyboard.press('Escape');await page.keyboard.press('m');await expect(page.locator('[data-panel-kind="map"]')).toBeVisible();await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
