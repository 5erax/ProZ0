import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { COLONY_RESEARCH } from '../../src/content/phase2/ColonyDepthContent';
import { INDUSTRY_FACILITIES, INDUSTRY_RESEARCH, type IndustryCost, type IndustryFacilityKind } from '../../src/content/phase3/IndustryContent';
import type { IndustryIntent } from '../../src/client/runtime/IndustryPanel';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState, SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2, type PortableSaveBundleV2 } from '../../src/persistence';

const evidence = resolve('test-results/phase3-industry');
const playerId = 'industry-builder';
const databaseName = 'phase3-industry-ui';
const worldId = 'world:industry-ui';
test.use({ actionTimeout: 15000 });

async function fixture() {
  const bundle = await Phase1AuthorityBundle.create({ worldId, worldSeed: 'p1-world-golden', playerIds: [playerId], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 1.25, spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25 });
  let ordinal = 0;
  const fund = (outputs: readonly IndustryCost[]) => { const result = bundle.items.commitColonyExchange({ operationId: 'fixture:materials:' + ++ordinal, playerId, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision, inputs: [], outputs }); expect(result, 'canonical capacity-respecting raw material fixture').toMatchObject({ status: 'committed' }); };
  try {
    await bundle.stepSolo();
    // Explicit prerequisite/raw material fixture. Industry remains unresearched and unbuilt;
    // all Phase 3 costs, input/output transfers and simulation are exercised through the UI.
    for (const id of ['field-survey', 'expanded-storage']) {
      fund(COLONY_RESEARCH.find(research => research.id === id)!.costs);
      expect(bundle.colonyDepth.execute({ operationId: 'fixture:colony:' + id, playerId, action: 'research', targetId: id, expectedRevision: bundle.colonyDepth.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision }).status).toBe('committed');
    }
    bundle.getRuntime(playerId).relocatePlayer({ x: -4, y: 0 });
    await bundle.stepSolo();
    fund([{ itemDefinitionId: 'item:timber', quantity: 10 }]);
    fund([{ itemDefinitionId: 'item:timber', quantity: 1 }]);
    const timber = bundle.items.getContainerView('inventory:' + playerId).stacks.find(stack => stack.itemDefinitionId === 'item:timber' && stack.quantity >= 4)!;
    expect(bundle.items.execute({ type: 'drop', operationId: 'fixture:timber-drop', playerId, inventoryContainerId: 'inventory:' + playerId, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision, sourceStackId: timber.stackId, quantity: 6 }).status).toBe('committed');
    fund([{ itemDefinitionId: 'item:metal-ore', quantity: 20 }, { itemDefinitionId: 'item:cordage', quantity: 12 }, { itemDefinitionId: 'item:stone', quantity: 2 }, { itemDefinitionId: 'item:plant-fiber', quantity: 3 }, { itemDefinitionId: 'item:repair-patch', quantity: 1 }]);
    fund([{ itemDefinitionId: 'item:metal-ore', quantity: 1 }]);
    const positions: { x: number; y: number }[] = [];
    const profile = { structureDefinitionId: 'structure:storage-crate' as const, footprint: { width: 1, depth: 1 }, doorClearanceDepth: 0, connectorOffsetWorldUnits: null };
    for (let dx = -2; dx <= 2; dx += 0.5) for (let dy = -2; dy <= 2; dy += 0.5) {
      const position = { x: -4 + dx, y: dy };
      if (Math.hypot(dx, dy) > 2.4 || positions.some(p => Math.hypot(p.x - position.x, p.y - position.y) < 1.5)) continue;
      if (bundle.world.isFootprintExplored(position, profile, 0) && bundle.world.isBuildableGround(position, profile, 0) && !bundle.world.hasBlockingWorldCollision(position, profile, 0) && !bundle.world.overlapsProtectedRuin(position, profile, 0) && !bundle.world.obstructsDeathCache(position, profile, 0) && !bundle.world.blocksSpawnClearance(position, profile, 0) && !bundle.world.blocksRequiredAccess(position, profile, 0) && !bundle.buildings.exportSnapshot().foothold.structures.some(s => Math.hypot(s.position.x - position.x, s.position.y - position.y) < 1.5)) positions.push(position);
    }
    expect(positions.length).toBeGreaterThanOrEqual(4);
    const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-02T06:00:00.000Z' });
    const save: PortableSaveBundleV2 = { formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle', world: request.world, players: request.players, containers: request.containers, chunks: request.chunks, footholds: request.footholds, structures: request.structures };
    const validation = reconstructPhase1ReopenState(save, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(validation.ok).toBe(true);
    return { save, positions: positions.slice(0, 4) };
  } finally { await bundle.destroy(); }
}

async function advancedFixture(count: 3 | 12) {
  const bundle = await Phase1AuthorityBundle.create({ worldId, worldSeed: 'p1-world-golden', playerIds: [playerId], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 1.25, spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25 });
  let ordinal = 0;
  const fund = (outputs: readonly IndustryCost[]) => {
    for (const output of outputs) {
      const maximum = bundle.catalog.getAs(output.itemDefinitionId, 'item').maxStack;
      for (let remaining = output.quantity; remaining > 0; remaining -= maximum) expect(bundle.items.commitColonyExchange({ operationId: 'fixture:advanced-fund:' + ++ordinal, playerId, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision, inputs: [], outputs: [{ ...output, quantity: Math.min(remaining, maximum) }] }).status).toBe('committed');
    }
  };
  const action = (intent: IndustryIntent) => bundle.industry!.execute({ ...intent, operationId: 'fixture:advanced-action:' + ++ordinal, playerId, expectedRevision: bundle.industry!.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision });
  try {
    await bundle.stepSolo();
    for (const research of COLONY_RESEARCH) {
      fund(research.costs);
      expect(bundle.colonyDepth.execute({ operationId: 'fixture:advanced-colony:' + research.id, playerId, action: 'research', targetId: research.id, expectedRevision: bundle.colonyDepth.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision }).status).toBe('committed');
    }
    for (const research of INDUSTRY_RESEARCH) { fund(research.costs); expect(action({ action: 'research', targetId: research.id }).status).toBe('committed'); }
    const candidates: { x: number; y: number }[] = [];
    for (let x = -8.5; x <= 0.5; x += 1.5) for (let y = -6; y <= 6; y += 1.5) candidates.push({ x, y });
    candidates.sort((a, b) => Math.hypot(a.x + 4, a.y) - Math.hypot(b.x + 4, b.y));
    const kinds: IndustryFacilityKind[] = count === 3 ? ['solar-array', 'greenhouse', 'rover'] : ['solar-array', 'solar-array', 'solar-array', 'power-relay', 'fiber-processor', 'fiber-processor', 'fabricator', 'fabricator', 'greenhouse', 'greenhouse', 'rover', 'depot'];
    for (const kind of kinds) {
      fund(INDUSTRY_FACILITIES[kind].costs);
      let built = false;
      for (const position of candidates) {
        bundle.getRuntime(playerId).relocatePlayer({ x: position.x - 2, y: position.y });
        const result = action({ action: 'build', facilityKind: kind, position });
        if (result.status === 'committed') { built = true; break; }
      }
      expect(built, 'canonical explored build location for ' + kind).toBe(true);
    }
    const facilities = bundle.industry!.read().facilities;
    const greenhouse = facilities.find(facility => facility.kind === 'greenhouse')!;
    const rover = facilities.find(facility => facility.kind === 'rover')!;
    const observer = candidates.find(position => facilities.every(facility => Math.hypot(facility.position.x - position.x, facility.position.y - position.y) >= 1.4) && (count === 12 || (Math.hypot(greenhouse.position.x - position.x, greenhouse.position.y - position.y) <= 2.5 && Math.hypot(rover.position.x - position.x, rover.position.y - position.y) <= 2.5)))!;
    expect(observer).toBeDefined();
    if (count === 12) {
      for (const facility of facilities) {
        let inputs: IndustryCost[] = [];
        if (facility.kind === 'fiber-processor') inputs = [{ itemDefinitionId: 'item:plant-fiber', quantity: 12 }];
        if (facility.kind === 'fabricator') inputs = [{ itemDefinitionId: 'item:cordage', quantity: 3 }, { itemDefinitionId: 'item:metal-ore', quantity: 3 }];
        if (facility.kind === 'greenhouse') {
          bundle.getRuntime(playerId).relocatePlayer(facility.position);
          expect(action({ action: 'set-recipe', targetId: facility.id, recipeId: 'intensive-crops' }).status).toBe('committed');
          inputs = [{ itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 4 }, { itemDefinitionId: 'item:plant-fiber', quantity: 2 }];
        }
        bundle.getRuntime(playerId).relocatePlayer(facility.position);
        fund(inputs);
        for (const input of inputs) expect(action({ action: 'deposit', targetId: facility.id, ...input }).status).toBe('committed');
      }
    }
    bundle.getRuntime(playerId).relocatePlayer(observer);
    for (let tick = 0; tick < 310; tick++) await bundle.stepSolo();
    if (count === 3) fund([{ itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 2 }, { itemDefinitionId: 'item:plant-fiber', quantity: 1 }, { itemDefinitionId: 'item:stone', quantity: 2 }, { itemDefinitionId: 'item:repair-patch', quantity: 1 }]);
    const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-02T06:00:00.000Z' });
    const save: PortableSaveBundleV2 = { formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle', world: request.world, players: request.players, containers: request.containers, chunks: request.chunks, footholds: request.footholds, structures: request.structures };
    expect(reconstructPhase1ReopenState(save, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion])).ok).toBe(true);
    return { save, greenhouse, rover, observer };
  } finally { await bundle.destroy(); }
}

async function installSave(page: Page, save: PortableSaveBundleV2) {
  await page.goto('/');
  await page.evaluate(async ({ name, save }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('worlds', { keyPath: 'worldId' });
        for (const [storeName, keyPath] of [['players', ['worldId', 'playerId']], ['containers', ['worldId', 'containerId']], ['chunks', ['worldId', 'coord.x', 'coord.y']], ['footholds', ['worldId', 'footholdId']], ['structures', ['worldId', 'structureId']]] as const) {
          db.createObjectStore(storeName, { keyPath: [...keyPath] }).createIndex('worldId', 'worldId');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['worlds', 'players', 'containers', 'chunks', 'footholds', 'structures'], 'readwrite');
      tx.objectStore('worlds').put(save.world);
      for (const store of ['players', 'containers', 'chunks', 'footholds', 'structures'] as const) for (const record of save[store]) tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, { name: databaseName, save });
  await page.goto('/?' + new URLSearchParams({ proz0Mode: 'phase2-colony-review', proz0WorldId: worldId, proz0WorldSeed: save.world.worldSeed, proz0Players: playerId, proz0Player: playerId, proz0SaveDb: databaseName }));
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-runtime-status', 'ready');
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'true');
}

test('industry UI pays for a powered processing chain, conserves logistics stock, repairs and reopens; focus and compact viewport remain usable', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const seeded = await fixture();
  await installSave(page, seeded.save);
  const panel = page.getByRole('dialog', { name: 'Industry management', exact: true });
  await page.keyboard.press('o');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Build Fiber processor', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Research Cargo mobility', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Research Industrial automation', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Industrial automation researched');
  await panel.getByRole('button', { name: 'Research Conveyor logistics', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Conveyor logistics researched');
  await page.keyboard.press('Escape');
  await page.keyboard.press('e');
  await expect(page.locator('[data-world-role="world-drop"]')).toHaveCount(0);
  await page.keyboard.press('o');
  const kinds: IndustryFacilityKind[] = ['solar-array', 'fiber-processor', 'fabricator', 'depot'];
  for (const [index, kind] of kinds.entries()) {
    await panel.getByRole('button', { name: 'Construction', exact: true }).click();
    const position = seeded.positions[index]!;
    const x = panel.getByLabel('Offset X', { exact: true });
    await x.fill(String(position.x + 4));
    await panel.getByLabel('Offset Y', { exact: true }).fill(String(position.y));
    if (index === 0) {
      await x.focus();
      await page.waitForTimeout(700);
      await expect(x).toBeFocused();
      await expect(x).toHaveValue(String(position.x + 4));
      const before = await page.locator('canvas').getAttribute('data-player-x');
      await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w');
      await expect(page.locator('canvas')).toHaveAttribute('data-player-x', before!);
    }
    await panel.getByRole('button', { name: 'Build ' + INDUSTRY_FACILITIES[kind].name, exact: true }).click();
    await expect(panel.getByRole('status')).toContainText(INDUSTRY_FACILITIES[kind].name + ' built');
    await expect(page.locator('[data-industry-facility]')).toHaveCount(index + 1);
  }
  const selectFacility = async (kind: IndustryFacilityKind) => {
    await panel.getByRole('button', { name: 'Facilities', exact: true }).click();
    await panel.getByLabel('Facility', { exact: true }).selectOption('industry:' + kind + ':' + String(kinds.indexOf(kind) + 1));
    await panel.getByRole('heading', { name: INDUSTRY_FACILITIES[kind].name, exact: true }).click();
  };
  await selectFacility('fabricator');
  await panel.getByLabel('Recipe', { exact: true }).selectOption('industrial-power-kit');
  await expect(panel.getByRole('status')).toContainText('Recipe selected');
  await panel.getByLabel('Recipe', { exact: true }).selectOption('reinforced-patch');
  await expect(panel.getByRole('status')).toContainText('Recipe selected');
  await panel.locator('.industry-row').filter({ hasText: 'Metal Ore · buffer' }).getByRole('button', { name: 'Load 1', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Input loaded');
  await selectFacility('fiber-processor');
  await panel.getByRole('button', { name: 'Load 3', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Input loaded');
  await panel.getByRole('button', { name: 'Power & logistics', exact: true }).click();
  await expect(panel).toContainText('/12 power');
  const connect = async (from: string, to: string, filter: string) => {
    await panel.getByLabel('From', { exact: true }).selectOption(from);
    await panel.getByLabel('To', { exact: true }).selectOption(to);
    await panel.getByLabel('Item filter', { exact: true }).selectOption(filter);
    await panel.getByRole('button', { name: 'Connect conveyor', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Conveyor connected');
  };
  await connect('industry:fiber-processor:2', 'industry:fabricator:3', 'item:cordage');
  await connect('industry:fabricator:3', 'industry:depot:4', 'item:repair-patch');
  await selectFacility('depot');
  const patchRow = panel.getByRole('table', { name: 'Facility buffer' }).getByRole('row').filter({ hasText: 'Repair Patch' });
  await expect(patchRow).toContainText('1', { timeout: 25000 });
  await selectFacility('solar-array');
  await panel.getByRole('button', { name: 'Repair · 1 Repair Patch', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Facility repaired');
  await panel.getByRole('button', { name: 'Power & logistics', exact: true }).click();
  await expect(panel).toContainText('repaired');
  await page.screenshot({ path: resolve(evidence, 'industry-chain-1280.png') });
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await page.screenshot({ path: resolve(evidence, 'industry-world-1280.png') });
  await page.keyboard.press('l');
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  const committed = await page.evaluate(async ({ name, worldId, playerId }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(name, 2); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction(['worlds', 'containers'], 'readonly');
    const read = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const world = await read(tx.objectStore('worlds').get(worldId));
    const inventory = await read(tx.objectStore('containers').get([worldId, 'inventory:' + playerId]));
    db.close(); return { world, inventory };
  }, { name: databaseName, worldId, playerId });
  expect(committed.world.industry.researchIds).toEqual(['automation', 'logistics']);
  expect(committed.world.industry.facilities).toHaveLength(4);
  expect(committed.world.industry.links).toHaveLength(2);
  expect(committed.inventory.stacks.some((stack: IndustryCost) => stack.itemDefinitionId === 'item:metal-ore' || stack.itemDefinitionId === 'item:timber' || stack.itemDefinitionId === 'item:plant-fiber' || stack.itemDefinitionId === 'item:repair-patch')).toBe(false);
  expect(committed.world.industry.facilities.find((facility: { kind: string }) => facility.kind === 'depot').buffer).toEqual([{ itemDefinitionId: 'item:repair-patch', quantity: 1 }]);
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'true');
  await expect(page.locator('[data-industry-facility]')).toHaveCount(4);
  await page.keyboard.press('o');
  await page.getByRole('button', { name: 'Facilities', exact: true }).click();
  await page.getByLabel('Facility', { exact: true }).selectOption('industry:depot:4');
  await expect(panel).toBeVisible();
  await expect(patchRow).toContainText('1');
  await patchRow.getByRole('button', { name: 'Take 1', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Item collected');
  await expect(patchRow).toHaveCount(0);
  await page.setViewportSize({ width: 640, height: 360 });
  await panel.getByRole('button', { name: 'Construction', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Build Cargo rover', exact: true })).toBeDisabled();
  await page.screenshot({ path: resolve(evidence, 'industry-compact-640.png') });
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
  writeFileSync(resolve(evidence, 'journey.json'), JSON.stringify({ fixture: 'Validated Save V2; explicit Phase 2 prerequisite research and raw materials with a six-timber ground drop to respect bag capacity; pickup, Phase 3 research, four paid builds, recipe selection, active production, two conserved conveyors, repair, save/reload and collection run through actual UI; no natural-gathering or human-playtest claim', positions: seeded.positions, committedIndustry: committed.world.industry, errors }, null, 2));
});

test('greenhouse and rover UI grows upgraded crops and carries conserved cargo through real driving and save/reload', async ({ page }) => {
  test.setTimeout(100000);
  mkdirSync(evidence, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const seeded = await advancedFixture(3);
  await page.setViewportSize({ width: 1280, height: 720 });
  await installSave(page, seeded.save);
  // Labeled paid/researched infrastructure fixture; recipes, inputs, active growth,
  // cargo transactions, repair, driving and persistence use the player controls.
  await page.keyboard.press('o');
  await page.getByRole('button', { name: 'Facilities', exact: true }).click();
  await page.getByLabel('Facility', { exact: true }).selectOption(seeded.greenhouse.id);
  const panel = page.getByRole('dialog', { name: 'Industry management', exact: true });
  await panel.getByLabel('Recipe', { exact: true }).selectOption('intensive-crops');
  await expect(panel.getByRole('status')).toContainText('Recipe selected');
  for (const [item, quantity] of [['edible plant', 1], ['clean water', 2], ['plant fiber', 1]] as const) {
    await panel.locator('.industry-row').filter({ hasText: item + ' · buffer' }).getByRole('button', { name: 'Load ' + String(quantity), exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Input loaded');
  }
  await expect(panel.getByRole('progressbar', { name: 'Production cycle progress' })).not.toHaveAttribute('value', '0');
  const plant = panel.getByRole('table', { name: 'Facility buffer' }).getByRole('row').filter({ hasText: 'edible plant' });
  await expect(plant.getByRole('cell').nth(1)).toHaveText('6', { timeout: 50000 });
  await panel.getByRole('button', { name: 'Repair · 1 Repair Patch', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Facility repaired');
  await page.screenshot({ path: resolve(evidence, 'greenhouse-harvest-1280.png') });
  await panel.getByLabel('Facility', { exact: true }).selectOption(seeded.rover.id);
  const cargo = panel.locator('.industry-card').filter({ has: page.getByRole('heading', { name: 'Rover cargo', exact: true }) });
  for (let n = 0; n < 2; n++) {
    await cargo.locator('.industry-row').filter({ hasText: 'stone · bag' }).getByRole('button', { name: 'Load 1', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Cargo loaded');
  }
  const destination = { x: seeded.rover.position.x - 2, y: seeded.rover.position.y };
  await panel.getByLabel('Destination X', { exact: true }).fill(String(destination.x));
  await panel.getByLabel('Destination Y', { exact: true }).fill(String(destination.y));
  await panel.getByRole('button', { name: 'Drive rover', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Rover arrived');
  await expect.poll(async () => Number(await page.locator('canvas').getAttribute('data-player-x'))).toBe(destination.x);
  const stone = panel.getByRole('table', { name: 'Facility buffer' }).getByRole('row').filter({ hasText: 'stone' });
  await expect(stone.getByRole('cell').nth(1)).toHaveText('2');
  await expect(panel.getByRole('button', { name: 'Dismantle · refund materials', exact: true })).toBeDisabled();
  await page.screenshot({ path: resolve(evidence, 'rover-cargo-1280.png') });
  await page.keyboard.press('Escape'); await page.keyboard.press('l');
  await expect(page.locator('[data-product-review-save]')).toHaveAttribute('data-save-state', 'success');
  await page.reload();
  await expect(page.locator('[data-proz0-autoboot]')).toHaveAttribute('data-product-review-reopened', 'true');
  await page.keyboard.press('o');
  await page.getByRole('button', { name: 'Facilities', exact: true }).click();
  await page.getByLabel('Facility', { exact: true }).selectOption(seeded.rover.id);
  await expect(stone.getByRole('cell').nth(1)).toHaveText('2');
  await expect(panel).toContainText('Position ' + destination.x.toFixed(1) + ', ' + destination.y.toFixed(1));
  expect(errors).toEqual([]);
  writeFileSync(resolve(evidence, 'greenhouse-rover.json'), JSON.stringify({ fixture: 'Validated paid/researched infrastructure save; all intensive crop inputs, actual 40-second active growth, repair, two cargo loads, real route drive and reload use UI commands', greenhouse: seeded.greenhouse.id, rover: seeded.rover.id, destination, cropOutput: 6, cargo: 2, errors }, null, 2));
});

test('full scene frame pacing: twelve active industrial facilities preserve 50 FPS and 34 ms P95', async ({ page }) => {
  test.setTimeout(90000);
  mkdirSync(evidence, { recursive: true });
  const seeded = await advancedFixture(12);
  await page.setViewportSize({ width: 1280, height: 720 });
  await installSave(page, seeded.save);
  await expect(page.locator('[data-industry-facility]')).toHaveCount(12);
  await page.waitForTimeout(1000);
  const report = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
    const tick = Number(canvas.dataset.authorityTick);
    const progress = () => [...document.querySelectorAll<HTMLElement>('[data-industry-facility]')].filter(node => ['fabricator', 'greenhouse'].includes(node.dataset.kind ?? '')).reduce((sum, node) => sum + Number(node.dataset.industryProgressSeconds), 0);
    const before = progress();
    const samples: number[] = [];
    const start = performance.now(); let prior = start;
    await new Promise<void>(resolve => {
      const frame = (now: number) => { samples.push(now - prior); prior = now; if (now - start < 3000) requestAnimationFrame(frame); else resolve(); };
      requestAnimationFrame(frame);
    });
    const sorted = [...samples].sort((a, b) => a - b);
    return { fps: samples.length * 1000 / (prior - start), p95Ms: sorted[Math.floor(sorted.length * .95)]!, frames: samples.length, authorityTicks: Number(canvas.dataset.authorityTick) - tick, industryProgressBefore: before, industryProgressAfter: progress(), userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight] };
  });
  writeFileSync(resolve(evidence, 'frame-budget.json'), JSON.stringify({ sourceHeadSha: process.env.P0_TEST_HEAD_SHA ?? 'local-working-tree', fixture: 'Canonical Save V2 with 12 actually paid facilities, 3 arrays, relay, 2 working fiber processors, 2 working fabricators, 2 working upgraded greenhouses, charging rover and depot; active industry and the complete colony scene run together', threshold: { fpsMinimum: 50, p95MaximumMs: 34 }, ...report }, null, 2));
  await page.screenshot({ path: resolve(evidence, 'industry-full-scene-1280.png') });
  expect(report.authorityTicks).toBeGreaterThan(100);
  expect(report.industryProgressAfter).toBeGreaterThan(report.industryProgressBefore);
  expect(report.fps).toBeGreaterThanOrEqual(50);
  expect(report.p95Ms).toBeLessThanOrEqual(34);
});
