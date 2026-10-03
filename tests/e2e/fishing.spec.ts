import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';
import { colonyRiverLandmarks, colonyRiverTerrainAt } from '../../src/world/phase2/ColonyHydrology';
import { FISH_SPECIES } from '../../src/content/livingworld/FishingContent';

test('fishing material fixture: craft rod/bait, build a bank campfire, cast/reopen/reel/cook and preserve the real catch', async ({ page }) => {
  test.setTimeout(60000);
  const seed = 'p1-world-golden', name = 'fishing-ui', worldId = 'world:fishing-ui';
  const bundle = await Phase1AuthorityBundle.create({ worldId, worldSeed: seed, worldGenerationVersion: 5, resourceProfileVersion: 1, playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>, water!: { x: number; y: number }, ground!: { x: number; y: number };
  try {
    const crossing = colonyRiverLandmarks(seed).crossings[0]!, center = { x: Math.floor(crossing.x / 2) * 2 + 1, y: Math.floor(crossing.y / 2) * 2 + 1 };
    search: for (let dy = -12; dy <= 12; dy += 2) for (let dx = -12; dx <= 12; dx += 2) {
      const bank = { x: center.x + dx, y: center.y + dy }; if (colonyRiverTerrainAt(seed, bank) !== 'ground') continue;
      bundle.getRuntime('solo').relocatePlayer(bank); await bundle.stepSolo();
      const wet = [{ x: bank.x - 2, y: bank.y }, { x: bank.x + 2, y: bank.y }, { x: bank.x, y: bank.y - 2 }, { x: bank.x, y: bank.y + 2 }].find(p => bundle.world.isExploredWater(p) && bundle.world.hasClearFishingLine(bank,p));
      if (!wet) continue;
      for (let gy = -2; gy <= 2; gy++) for (let gx = -2; gx <= 2; gx++) {
        const candidate = { x: bank.x + gx, y: bank.y + gy };
        if (bundle.expedition!.assessPreview('solo', 'campfire', candidate.x, candidate.y, 0) === null) { water = wet; ground = candidate; break search; }
      }
    }
    expect(water).toBeDefined(); expect(ground).toBeDefined();
    // Explicit material/position fixture; no rod, bait, fish or facility is granted.
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:fish-materials', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [['item:timber',4], ['item:stone',4], ['item:cordage',1], ['item:plant-fiber',1], ['item:berries',1]].map(([id,q]) => ({ itemDefinitionId: id as string, quantity: q as number })) }).status).toBe('committed');
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    expect(validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [5])).ok).toBe(true);
  } finally { await bundle.destroy(); }
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto('/');
  await page.evaluate(async ({ name, save }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const open = indexedDB.open(name, 2); open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [store,key] of [['players','playerId'],['containers','containerId'],['chunks','coord'],['footholds','footholdId'],['structures','structureId']]) open.result.createObjectStore(store!, { keyPath: key === 'coord' ? ['worldId','coord.x','coord.y'] : ['worldId',key!] }).createIndex('worldId','worldId'); }; open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
    await new Promise<void>((done, reject) => { const tx = db.transaction(['worlds','players','containers','chunks','footholds','structures'],'readwrite'); tx.objectStore('worlds').put(save.world); for (const key of ['players','containers','chunks','footholds','structures'] as const) for (const record of save[key]) tx.objectStore(key).put(record); tx.oncomplete = () => done(); tx.onerror = () => reject(tx.error); }); db.close();
  }, { name, save });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?' + new URLSearchParams({ proz0Mode: 'phase2-colony-review', proz0WorldId: worldId, proz0WorldSeed: seed, proz0Players: 'solo', proz0Player: 'solo', proz0SaveDb: name }));
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  const screen = async (position: { x: number; y: number }) => page.locator('canvas').evaluate((e,p) => { const r = e.getBoundingClientRect(), d = (e as HTMLElement).dataset, dx=p.x-Number(d.playerX),dy=p.y-Number(d.playerY); return { x:r.left+(320+(dx-dy)*16)*r.width/640,y:r.top+(180+(dx+dy)*8)*r.height/360 }; },position);
  await page.keyboard.press('f'); const farm = page.locator('.lw-panel'); await farm.locator('details summary').click();
  await farm.getByRole('button',{name:'Craft Field Fishing Rod',exact:true}).click(); await expect(farm.getByRole('status')).toContainText('crafted');
  await farm.getByRole('button',{name:'Craft Plant Fishing Bait',exact:true}).click(); await page.keyboard.press('Escape');
  await page.keyboard.press('b'); await page.getByRole('button',{name:'Expedition blueprints · materials later',exact:true}).click();
  const expedition = page.locator('.sp-expedition-panel'); await expedition.locator('article').filter({has:page.getByText('Campfire',{exact:true})}).getByRole('button',{name:'Plan',exact:true}).click();
  const bank = await screen(ground); await page.mouse.move(bank.x,bank.y); await expect(page.locator('.sp-ghost')).toHaveAttribute('data-valid','true'); await page.mouse.click(bank.x,bank.y);
  const plan = expedition.locator('[data-expedition-plan]'); await plan.getByRole('button',{name:'Contribute',exact:true}).click(); await plan.getByRole('button',{name:'Complete',exact:true}).click(); await expect(plan).toHaveCount(0); await expedition.getByRole('button',{name:'Close',exact:true}).click();
  const cast = async () => { await page.keyboard.press('f'); await farm.getByRole('button',{name:'Fish nearby water',exact:true}).click(); const point=await screen(water); await page.mouse.move(point.x,point.y); await expect(page.locator('.lw-ghost')).toHaveAttribute('data-valid','true'); await page.mouse.click(point.x,point.y); await expect(page.locator('.lw-fishing-status')).toHaveAttribute('data-phase','waiting'); };
  await cast(); await expect(page.getByRole('button',{name:'Reel [Space]',exact:true})).toBeDisabled(); await page.keyboard.press('Space'); await expect(page.locator('[data-fishing-bobber]')).toBeVisible();
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success'); await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready');
  await expect(page.locator('[data-fishing-bobber]')).toBeVisible();
  await expect(page.locator('.lw-fishing-status')).toHaveAttribute('data-phase','bite',{timeout:15000});
  mkdirSync('test-results/fishing-ui',{recursive:true}); await page.screenshot({path:'test-results/fishing-ui/bite.png'}); await page.keyboard.press('Space');
  await expect(page.locator('[data-fishing-bobber]')).toBeHidden(); await expect(page.locator('.lw-fishing-status')).toContainText('Caught');
  await page.keyboard.press('i'); const inventory=page.locator('[data-panel-kind="inventory"]');
  // Read the actual caught species from UI, rather than granting or predicting its item.
  let caught = '';
  for (const f of FISH_SPECIES) if (await inventory.getByRole('button',{name:f.name,exact:true}).count()) caught=f.name;
  expect(caught).not.toBe('');
  await expect(inventory.getByRole('button',{name:'Plant Fishing Bait',exact:true})).toContainText('×3'); await page.keyboard.press('Escape');
  await page.keyboard.press('f'); await farm.locator('details summary').click(); await farm.getByRole('button',{name:'Craft Cook '+caught,exact:true}).click(); await expect(farm.getByRole('status')).toContainText('crafted');
  await page.keyboard.press('Escape'); await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state','success'); await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status','ready'); await page.keyboard.press('i');
  await expect(inventory.getByRole('button',{name:'Cooked Fish',exact:true})).toContainText('×1'); await expect(inventory.getByRole('button',{name:caught,exact:true})).toHaveCount(0);
  const population = await page.evaluate(async ({name,worldId}) => { const db = await new Promise<IDBDatabase>((resolve,reject)=>{const open=indexedDB.open(name,2);open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);}); const world = await new Promise<{livingWorld:{fishing:{spots:{stock:number;ordinal:number}[];sessions:unknown[]}}}>((resolve,reject)=>{const get=db.transaction('worlds','readonly').objectStore('worlds').get(worldId);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);});db.close();return world.livingWorld.fishing;},{name,worldId});
  expect(population.spots[0]!.stock).toBe(7); expect(population.spots[0]!.ordinal).toBe(1); expect(population.sessions).toHaveLength(0);
  await page.keyboard.press('Escape'); await cast(); await page.mouse.click((await screen(water)).x,(await screen(water)).y,{button:'right'}); await expect(page.locator('[data-fishing-bobber]')).toBeHidden();
  await page.keyboard.press('i'); await expect(inventory.getByRole('button',{name:'Plant Fishing Bait',exact:true})).toContainText('×2');
  await page.screenshot({path:'test-results/fishing-ui/cooked-save.png'}); expect(errors).toEqual([]);
});
