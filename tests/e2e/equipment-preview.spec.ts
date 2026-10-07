import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';

test('equipment UI: owned drag/drop and keyboard equip match avatar/world, conserve stacks and survive save', async ({ page }) => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:equipment-ui', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>, spearId: string, wrapId: string;
  try {
    bundle.getRuntime('solo'); await bundle.stepSolo();
    // Explicit wardrobe fixture; gathering/crafting and equipment authority have separate journeys.
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:gear', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:basic-spear', quantity: 1 }, { itemDefinitionId: 'item:thermal-wrap', quantity: 1 }] }).status).toBe('committed');
    const stacks = bundle.items.getContainerView('inventory:solo').stacks;
    spearId = stacks.find(s => s.itemDefinitionId === 'item:basic-spear')!.stackId;
    wrapId = stacks.find(s => s.itemDefinitionId === 'item:thermal-wrap')!.stackId;
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    const validation = validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(validation.ok, JSON.stringify(validation)).toBe(true);
  } finally { await bundle.destroy(); }
  await page.goto('/');
  await page.evaluate(async request => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('equipment-ui', 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [name, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(name!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(request.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:equipment-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=equipment-ui');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  const hudWeapon=page.locator('[data-equipment-slot="weapon"]');
  await expect(hudWeapon).toHaveAttribute('data-equipment-state','EMPTY');
  await expect(hudWeapon.locator('.p1-equipment-icon')).toHaveCount(0);
  await page.keyboard.press('i');
  const inventory = page.locator('[data-panel-kind="inventory"]');
  const weapon = inventory.locator('[data-equipment-drop-slot="weapon"]'), protection = inventory.locator('[data-equipment-drop-slot="protection"]');
  const spear = inventory.locator('[data-review-item="' + spearId + '"]');
  const wrap = inventory.locator('[data-review-item="' + wrapId + '"]');
  await expect(spear).toHaveAttribute('draggable', 'true');
  await wrap.dragTo(weapon);
  await expect(weapon).not.toHaveAttribute('data-equipped-stack');
  await spear.dragTo(weapon);
  await expect(weapon).toHaveAttribute('data-equipped-stack', spearId);
  await expect(hudWeapon.locator('.p1-equipment-icon')).toHaveCount(1);
  await expect(hudWeapon).not.toHaveAttribute('data-equipment-state','EMPTY');
  await expect(hudWeapon).toContainText('100%');
  await expect(hudWeapon).toHaveAttribute('title', /condition.*\d+\/\d+/);
  await expect(hudWeapon).toHaveAttribute('aria-label', await hudWeapon.getAttribute('title') ?? '');
  await expect(inventory.locator('[data-avatar-equipment="weapon"]')).toHaveCount(1);
  // Repeated drop is idempotent, unlike the explicit X toggle.
  await spear.dragTo(weapon); await expect(weapon).toHaveAttribute('data-equipped-stack', spearId);
  await inventory.getByRole('button', { name: 'Thermal Wrap', exact: true }).click();
  const equip = protection.getByRole('button', { name: 'Equip selected torso', exact: true });
  await equip.focus(); await page.keyboard.press('Enter');
  await expect(protection).toHaveAttribute('data-equipped-stack', wrapId);
  await expect(inventory.locator('[data-avatar-equipment="protection"]')).toHaveCount(1);
  // External/stale stack IDs cannot replace an owned reference.
  await weapon.evaluate(element => { const transfer = new DataTransfer(); transfer.setData('application/x-proz0-inventory-stack', 'unowned:stack'); element.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer })); });
  await expect(weapon).toHaveAttribute('data-equipped-stack', spearId);
  await expect(spear).toContainText('×1'); await expect(wrap).toContainText('×1');
  mkdirSync('test-results/equipment-preview', { recursive: true });
  await page.screenshot({ path: 'test-results/equipment-preview/wardrobe.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-world-role="held-weapon-overlay"][data-world-id="solo"]')).toHaveCount(1);
  await expect(page.locator('[data-world-role="thermal-wrap-overlay"][data-world-id="solo"]')).toHaveCount(1);
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready'); await page.keyboard.press('i');
  await expect(weapon).toHaveAttribute('data-equipped-stack', spearId); await expect(protection).toHaveAttribute('data-equipped-stack', wrapId);
  await expect(hudWeapon.locator('.p1-equipment-icon')).toHaveCount(1);
  const unequip = weapon.getByRole('button', { name: 'Unequip weapon', exact: true });
  await unequip.focus(); await page.keyboard.press('Space');
  await expect(weapon).not.toHaveAttribute('data-equipped-stack');
  await expect(hudWeapon).toHaveAttribute('data-equipment-state','EMPTY');
  await expect(hudWeapon.locator('.p1-equipment-icon')).toHaveCount(0);
  await expect(inventory.locator('[data-avatar-equipment="weapon"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-world-role="held-weapon-overlay"][data-world-id="solo"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
