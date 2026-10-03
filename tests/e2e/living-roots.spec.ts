import { expect, test } from '@playwright/test';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';
test('root UI fixture: mature harvest, uproot, ground preview, transplant and save/reopen keep one root lineage', async ({ page }) => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:root-ui', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>, source: { x: number; y: number }, destination: { x: number; y: number };
  try {
    bundle.getRuntime('solo').relocatePlayer({ x: 100, y: 100 });
    for (let i = 0; i < 60; i++) await bundle.stepSolo();
    const available = [];
    for (let y = 98; y <= 102; y++) for (let x = 98; x <= 102; x++) if (typeof bundle.buildings.assessPlacement('structure:storage-crate', { mode: 'free', anchor: { x, y }, orientationQuarterTurns: 0 }, true) !== 'string') available.push({ x, y });
    source = available[0]!; destination = available.find(p => Math.hypot(p.x - source.x, p.y - source.y) >= 1.5)!;
    expect(source).toBeDefined(); expect(destination).toBeDefined();
    // Explicit UI fixture supplies a hoe and mature patch; the separate living-world journey crafts naturally.
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:hoe', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:field-hoe', quantity: 1 }] }).status).toBe('committed');
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    save = { ...save, world: { ...save.world, livingWorld: { ...save.world.livingWorld!, forage: [...save.world.livingWorld!.forage.map(f => ({ ...f, cleared: true })), { id: 'fixture:berry', kind: 'berry-bush', ...source, readyTick: 0, cleared: false, growth: { version: 1, progress: 10800, moisture: 8000, dryTicks: 0, cut: false } }] } } };
    const result = validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(result.ok, JSON.stringify(result)).toBe(true);
  } finally { await bundle.destroy(); }
  await page.goto('/');
  await page.evaluate(async request => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('root-ui', 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [name, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(name!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(request.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of request[key]) tx.objectStore(key).put(record); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  }, save);
  await page.goto('/?proz0Mode=phase2-colony-review&proz0WorldId=world:root-ui&proz0WorldSeed=p1-world-golden&proz0Players=solo&proz0Player=solo&proz0SaveDb=root-ui');
  await page.locator('[data-living-id="fixture:berry"]').click();
  const panel = page.locator('.lw-panel'), row = panel.locator('[data-living-row="fixture:berry"]');
  await expect(row).toContainText('Maximum growth reached');
  await row.getByRole('button', { name: 'Gather', exact: true }).click();
  await expect(row).toContainText('Early growth');
  await row.getByRole('button', { name: 'Uproot · Field Hoe', exact: true }).click();
  await expect(row).toHaveCount(0);
  await panel.getByRole('button', { name: 'Replant Berry Bush Root', exact: true }).click();
  const point = await page.locator('canvas').evaluate((e, p) => { const r = e.getBoundingClientRect(), c = (e as HTMLElement).dataset; return { x: r.left + (320 + (p.x - Number(c.playerX) - p.y + Number(c.playerY)) * 16) * r.width / 640, y: r.top + (180 + (p.x - Number(c.playerX) + p.y - Number(c.playerY)) * 8) * r.height / 360 }; }, destination);
  await page.mouse.move(point.x, point.y); await expect(page.locator('.lw-ghost')).toBeVisible(); await page.mouse.click(point.x, point.y);
  await expect(panel.getByRole('status')).toContainText('root replanted');
  await expect(panel.getByRole('button', { name: 'Replant Berry Bush Root', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const replanted = page.locator('[data-living-id^="replant:"]'); await expect(replanted).toHaveCount(1);
  const identity = await replanted.getAttribute('data-living-id');
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload(); await expect(page.locator('[data-living-id="' + identity + '"]')).toHaveCount(1);
  await expect(page.locator('[data-living-id="fixture:berry"]')).toHaveCount(0);
});
