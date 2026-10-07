import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, validatePortableSaveBundleV2 } from '../../src/persistence';
import { colonyRiverLandmarks, colonyRiverTerrainAt } from '../../src/world/phase2/ColonyHydrology';

async function groundPoint(page: Page, target: { x: number; y: number }) {
  return page.locator('canvas').evaluate((element, p) => {
    const rect = element.getBoundingClientRect(), data = (element as HTMLElement).dataset;
    const dx = p.x - Number(data.playerX), dy = p.y - Number(data.playerY);
    return { x: rect.left + (320 + (dx - dy) * 16) * rect.width / 640, y: rect.top + (180 + (dx + dy) * 8) * rect.height / 360 };
  }, target);
}

test('river UI fixture: reject water blueprints, place an empty-bank plan and reopen the same seeded river', async ({ page }) => {
  test.setTimeout(60000);
  const seed = 'p1-world-golden', name = 'river-ui', worldId = 'world:river-ui';
  const bundle = await Phase1AuthorityBundle.create({ worldId, worldSeed: seed, worldGenerationVersion: 5, resourceProfileVersion: 1, playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  let save: ReturnType<typeof composePhase1SaveV2>;
  let water!: { x: number; y: number }, ground!: { x: number; y: number };
  try {
    const crossing = colonyRiverLandmarks(seed).crossings[0]!;
    const center = { x: Math.floor(crossing.x / 2) * 2 + 1, y: Math.floor(crossing.y / 2) * 2 + 1 };
    // Only the starting position is a fixture. Placement/save/map use real UI input.
    search: for (let dy = -12; dy <= 12; dy += 2) for (let dx = -12; dx <= 12; dx += 2) {
      const bank = { x: center.x + dx, y: center.y + dy };
      if (colonyRiverTerrainAt(seed, bank) !== 'ground') continue;
      const wet = [{ x: bank.x - 2, y: bank.y }, { x: bank.x + 2, y: bank.y }, { x: bank.x, y: bank.y - 2 }, { x: bank.x, y: bank.y + 2 }].find(p => colonyRiverTerrainAt(seed, p) === 'water');
      if (!wet) continue;
      bundle.getRuntime('solo').relocatePlayer(bank); await bundle.stepSolo();
      for (let gy = -2; gy <= 2; gy++) for (let gx = -2; gx <= 2; gx++) {
        const candidate = { x: bank.x + gx, y: bank.y + gy };
        if (bundle.expedition!.assessPreview('solo', 'campfire', candidate.x, candidate.y, 0) === null) { water = wet; ground = candidate; break search; }
      }
    }
    expect(water).toBeDefined(); expect(ground).toBeDefined();
    expect(bundle.expedition!.assessPreview('solo', 'campfire', water.x, water.y, 0)).not.toBeNull();
    save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    expect(validatePortableSaveBundleV2({ ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [5])).ok).toBe(true);
  } finally { await bundle.destroy(); }
  await page.setViewportSize({ width: 1280, height: 720 }); await page.goto('/');
  await page.evaluate(async ({ name, save }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(name, 2);
      open.onupgradeneeded = () => { open.result.createObjectStore('worlds', { keyPath: 'worldId' }); for (const [store, key] of [['players', 'playerId'], ['containers', 'containerId'], ['chunks', 'coord'], ['footholds', 'footholdId'], ['structures', 'structureId']]) open.result.createObjectStore(store!, { keyPath: key === 'coord' ? ['worldId', 'coord.x', 'coord.y'] : ['worldId', key!] }).createIndex('worldId', 'worldId'); };
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((done, reject) => { const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite'); tx.objectStore('worlds').put(save.world); for (const key of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of save[key]) tx.objectStore(key).put(record); tx.oncomplete = () => done(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); db.close();
  }, { name, save });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?' + new URLSearchParams({ proz0Mode: 'phase2-colony-review', proz0WorldId: worldId, proz0WorldSeed: seed, proz0Players: 'solo', proz0Player: 'solo', proz0SaveDb: name }));
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  const river = page.locator('[data-world-role="terrain"][data-water-kind="river"]'); await expect(river.first()).toBeVisible();
  const count = await river.count();
  await page.keyboard.press('b');
  const panel = page.locator('.sp-expedition-panel');
  await panel.locator('article').filter({ has: page.getByText('Campfire', { exact: true }) }).getByRole('button', { name: 'Plan', exact: true }).click();
  const wet = await groundPoint(page, water); await page.mouse.move(wet.x, wet.y);
  const ghost = page.locator('.sp-ghost'); await expect(ghost).toHaveAttribute('data-valid', 'false');
  await page.mouse.click(wet.x, wet.y); await expect(page.locator('[data-expedition-plan]')).toHaveCount(0); await expect(ghost).toBeVisible();
  const dry = await groundPoint(page, ground); await page.mouse.move(dry.x, dry.y); await expect(ghost).toHaveAttribute('data-valid', 'true');
  await page.mouse.click(dry.x, dry.y); const plan = panel.locator('[data-expedition-plan]'); await expect(plan).toHaveCount(1);
  await expect(plan).toContainText('Timber 0/');
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  mkdirSync('test-results/river-ui', { recursive: true }); await page.screenshot({ path: 'test-results/river-ui/shore-plan.png' });
  await page.keyboard.press('m'); await expect(page.locator('[data-map-spatial="true"]')).toBeVisible(); await page.keyboard.press('Escape');
  await page.keyboard.press('l'); await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload(); await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready'); await expect(river).toHaveCount(count);
  await page.keyboard.press('b');
  await expect(plan).toHaveCount(1); await expect(plan).toContainText('Timber 0/');
  expect(errors).toEqual([]);
});
