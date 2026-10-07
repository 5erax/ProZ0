import { expect, test } from '@playwright/test';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';

test('blueprint UI fixture changes a funded plan and persists shared escrow and material refund', async ({ page }) => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:blueprint-ui', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>;
  try {
    bundle.getRuntime('solo'); await bundle.stepSolo();
    let placed = false;
    for (const [x, y] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2]] as const) {
      if (bundle.expedition!.execute({ id: 'fixture:cache', playerId: 'solo', expectedRevision: 0, expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, action: 'plan', target: 'supply-cache', x, y }).status === 'committed') { placed = true; break; }
    }
    expect(placed).toBe(true);
    // Explicit subsystem fixture grants only cache materials. Natural field construction has its own journey.
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:materials', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:timber', quantity: 2 }, { itemDefinitionId: 'item:plant-fiber', quantity: 2 }] }).status).toBe('committed');
    expect(bundle.expedition!.execute({ id: 'fixture:deposit', playerId: 'solo', expectedRevision: bundle.expedition!.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, action: 'deposit', target: 'plan:fixture:cache' }).status).toBe('committed');
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    const result = validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(result.ok, JSON.stringify(result)).toBe(true);
  } finally { await bundle.destroy(); }
  await page.goto('/');
  await page.evaluate(async request => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('blueprint-ui', 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [name, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(name!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(request.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:blueprint-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=blueprint-ui');
  const open = async () => {
    await page.getByRole('button', { name: 'Build base [B]', exact: true }).click();

  };
  await open();
  const panel = page.locator('.sp-expedition-panel'), plan = panel.locator('[data-expedition-plan="plan:fixture:cache"]');
  await expect(panel.getByRole('button', { name: 'Plan', exact: true })).toHaveCount(20);
  await plan.getByText('Change blueprint type', { exact: true }).click();
  await plan.getByRole('combobox', { name: 'Replacement for Supply Cache', exact: true }).selectOption('field-workbench');
  await plan.getByRole('button', { name: 'Change & refund surplus', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Shared materials are kept');
  await expect(plan).toContainText('Field Workbench');
  await expect(plan).toContainText('Timber 2/3');
  await expect(plan).toContainText('Stone 0/2');
  await plan.getByRole('button', { name: 'Complete', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Contribute the remaining materials');
  await page.screenshot({ path: 'test-results/blueprint-replacement.png' });
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload(); await open();
  await expect(plan).toContainText('Timber 2/3'); await expect(plan).toContainText('Stone 0/2');
  await expect(panel.locator('[data-expedition-plan]')).toHaveCount(1);
  await expect(panel.locator('article').filter({ has: page.getByText('Supply Cache', { exact: true }) }).first()).toContainText('Plant Fiber 2/2');
});
