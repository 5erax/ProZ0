import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GEAR_ITEMS, RARITY_STYLE } from '../../src/content/livingworld/EquipmentContent';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';

test('rarity UI: real workbench upgrade, six readable grades, owned equip and save preserve appearance', async ({ page }) => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:rarity-ui', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>;
  try {
    bundle.getRuntime('solo'); await bundle.stepSolo();
    // Explicit material/gear fixture, not a natural artifact acquisition journey.
    const expedition=bundle.expedition!;
    const command=(id:string, action:'plan'|'deposit'|'complete',target:string,position?:{x:number;y:number;orientation:0|1|2|3})=>expedition.execute({id,action,target,playerId:'solo',expectedRevision:expedition.read().revision,expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,...position});
    let planned=false;
    for(const orientation of [0,1,2,3] as const) { for(const [x,y] of [[3,0],[-3,0],[0,3],[0,-3],[2,2],[-2,-2]]) if(command('plan:workbench','plan','field-workbench',{x:x!,y:y!,orientation}).status==='committed'){planned=true;break;} if(planned)break; }
    expect(planned).toBe(true);
    expect(bundle.items.commitColonyExchange({operationId:'fixture:workbench-materials',playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:timber',quantity:3},{itemDefinitionId:'item:stone',quantity:2}]}).status).toBe('committed');
    expect(command('fund:workbench','deposit','plan:plan:workbench').status).toBe('committed');
    expect(command('finish:workbench','complete','plan:plan:workbench').status).toBe('committed');
    expect(bundle.items.commitColonyExchange({operationId:'fixture:gear',playerId:'solo',expectedInventoryRevision:bundle.items.getContainerView('inventory:solo').revision,inputs:[],outputs:[{itemDefinitionId:'item:basic-spear',quantity:1},{itemDefinitionId:'item:basic-spear',quantity:1},...GEAR_ITEMS.slice(1).map(i=>({itemDefinitionId:i.id,quantity:1})),{itemDefinitionId:'item:timber',quantity:2},{itemDefinitionId:'item:cordage',quantity:1}]}).status).toBe('committed');
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    const validation = validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(validation.ok, JSON.stringify(validation)).toBe(true);
  } finally { await bundle.destroy(); }
  await page.goto('/');
  await page.evaluate(async request => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('rarity-ui', 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [name, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(name!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(request.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:rarity-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=rarity-ui');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await page.keyboard.press('f'); const farm=page.locator('.lw-panel'); await farm.locator('[data-living-craft] > summary').click();
  const recipe=farm.locator('[data-living-row="recipe:reinforced-spear"]'); await expect(recipe).toHaveAttribute('data-rarity','uncommon'); await expect(recipe).toContainText('Uncommon');
  await recipe.getByRole('button',{name:'Craft Reinforced Spear',exact:true}).click(); await expect(farm.getByRole('status')).toContainText('crafted'); await page.keyboard.press('Escape');
  await page.keyboard.press('i'); const inventory=page.locator('[data-panel-kind="inventory"]'),weapon=inventory.locator('[data-equipment-drop-slot="weapon"]');
  for(const [name,rarity] of [['Basic Spear','common'],...GEAR_ITEMS.map(i=>[i.displayName,i.rarity!] as const)] as const){ const item=inventory.getByRole('button',{name,exact:true}); await expect(item).toHaveCount(1); await expect(item).toHaveAttribute('data-rarity',rarity); await expect(item).toContainText(RARITY_STYLE[rarity].label); await expect(item).toHaveCSS('border-color',await item.evaluate((_,colour)=>{const e=document.createElement('span');e.style.color=colour;document.body.append(e);const rgb=getComputedStyle(e).color;e.remove();return rgb;},RARITY_STYLE[rarity].colour)); }
  const mythic=inventory.getByRole('button',{name:'Mythic Relic Spear',exact:true}); await mythic.dragTo(weapon); await expect(weapon).toHaveAttribute('data-rarity','mythic');
  await expect(inventory.locator('[data-avatar-equipment="weapon"]')).toHaveAttribute('data-rarity','mythic');
  await mythic.click();
  const details=inventory.locator('[aria-label="Selected item details"]'); await details.locator('summary').click(); await expect(details).toContainText('Rarity: Mythic'); await expect(details).toContainText('Damage 50');
  mkdirSync('test-results/rarity-equipment',{recursive:true}); await page.screenshot({path:'test-results/rarity-equipment/six-tiers.png'});
  await inventory.evaluate(element => { element.scrollTop=0; }); await page.screenshot({path:'test-results/rarity-equipment/wardrobe-mythic.png'});
  await page.keyboard.press('Escape'); await expect(page.locator('[data-world-role="held-weapon-overlay"][data-world-id="solo"]')).toHaveAttribute('data-rarity','mythic');
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success'); await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready'); await page.keyboard.press('i');
  await expect(weapon).toHaveAttribute('data-rarity','mythic'); await expect(inventory.locator('[data-avatar-equipment="weapon"]')).toHaveAttribute('data-rarity','mythic');
  await expect(inventory.getByRole('button',{name:'Reinforced Spear',exact:true})).toContainText('×1');
  await weapon.getByRole('button',{name:'Unequip weapon',exact:true}).click(); await expect(inventory.locator('[data-avatar-equipment="weapon"]')).toHaveCount(0); await page.keyboard.press('Escape'); await expect(page.locator('[data-world-role="held-weapon-overlay"][data-world-id="solo"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
