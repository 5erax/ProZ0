import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { Phase1HostedAuthorityComposition } from '../../src/integration';
import { colonyHostedScene } from '../../src/integration/ColonyHostedScene';
import { COLONY_RESEARCH } from '../../src/content/phase2/ColonyDepthContent';
import { INDUSTRY_FACILITIES, INDUSTRY_RESEARCH, type IndustryCost } from '../../src/content/phase3/IndustryContent';
import { roomStorageKey } from '../../src/client/runtime/ColonyCoopLauncher';
import { serializeServerEnvelopeV1 } from '../../src/protocol';
import type { HostedOutboundMessage } from '../../src/server';

test('hosted industry shares paid builds and resolves a committed cargo command after transport loss without duplicate stock', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const colony = await Phase1HostedAuthorityComposition.create({
    worldId: 'fixture:hosted-industry-ui', worldSeed: 'p1-world-golden', maxPlayers: 2,
    colonyDepthEnabled: true, interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25,
    persistence: { save: async authorityTick => ({ authorityTick, durableSaveRevision: 1 }) },
  });
  const server = createServer(), wsServer = new WebSocketServer({ server });
  const peers = new Map<string, WebSocket>();
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const errors: string[] = [];
  let dropResult = false, droppedOperationId = '';
  const flush = (messages: readonly HostedOutboundMessage[]) => {
    const lost = dropResult ? messages.find(message => message.envelope.messageType === 'COMMAND_RESULT'
      && (message.envelope.payload as { status?: string }).status === 'committed') : undefined;
    if (lost) {
      dropResult = false;
      droppedOperationId = (lost.envelope.payload as { operationId: string }).operationId;
      // The real authority has committed; intentionally lose its response and reconnect using the issued credential.
      peers.get(lost.transportId)!.terminate();
    }
    for (const message of messages) {
      if (lost?.transportId === message.transportId) continue;
      const peer = peers.get(message.transportId);
      if (peer?.readyState === WebSocket.OPEN) peer.send(serializeServerEnvelopeV1(message.envelope));
    }
  };
  wsServer.on('connection', socket => {
    const transport = randomUUID(); peers.set(transport, socket);
    socket.on('message', raw => {
      const text = raw.toString();
      if (JSON.parse(text).proz0Social === 1) return;
      flush(colony.host.receiveText(transport, text));
    });
    socket.on('close', () => { colony.host.disconnect(transport); peers.delete(transport); });
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Missing hosted industry fixture port');
  const endpoint = 'http://127.0.0.1:' + address.port + '/api/pilot', room = 'abcdefabcdefabcf';
  let stepping = false;
  const timer = setInterval(() => {
    if (stepping) return;
    stepping = true;
    void (async () => {
      for (let n = 0; n < 3; n++) flush(await colony.step());
      if (colony.bundle.authorityTick % 6 === 0) for (const playerId of colony.bundle.getActivePlayerIds()) flush(colony.host.publishAggregate({
        aggregateType: 'colony-scene', aggregateId: playerId, revision: colony.bundle.authorityTick,
        tombstone: false, state: colonyHostedScene(colony.bundle, playerId) as never,
      }));
    })().catch(error => errors.push(String(error))).finally(() => { stepping = false; });
  }, 50);
  try {
    for (const [index, page] of pages.entries()) {
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseURL + '/');
      await page.evaluate(({ key, details }) => localStorage.setItem(key, JSON.stringify(details)), {
        key: roomStorageKey(endpoint, room), details: { id: room, worldSeed: 'p1-world-golden',
          accessToken: 'fixture', clientKey: 'industry-fixture-' + index,
          contentCompatibility: colony.bundle.getContentCompatibility(), worldCompatibility: colony.bundle.getWorldCompatibility() },
      });
      await page.goto(baseURL + '/?' + new URLSearchParams({ proz0Mode: 'colony-coop', proz0Room: room, proz0Server: endpoint }));
      await expect(page.locator('[data-runtime-mode=colony-coop]')).toHaveAttribute('data-runtime-status', 'ready');
    }
    await expect.poll(() => colony.host.diagnostics().session.readyPlayers).toBe(2);
    const page = pages[0]!, teammate = pages[1]!;
    const root = page.locator('[data-runtime-mode=colony-coop]');
    const playerId = (await root.getAttribute('data-coop-player-id'))!;
    const teammateId = (await teammate.locator('[data-runtime-mode=colony-coop]').getAttribute('data-coop-player-id'))!;
    const teammateInventory = colony.bundle.items.getContainerView('inventory:' + teammateId);
    let ordinal = 0;
    const inventory = () => colony.bundle.items.getContainerView('inventory:' + playerId);
    const quantity = () => inventory().stacks.filter(stack => stack.itemDefinitionId === 'item:plant-fiber').reduce((sum, stack) => sum + stack.quantity, 0);
    // Only Phase 2 prerequisites and raw materials are supplied. Every Phase 3 action crosses the UI/host command boundary.
    const fund = (outputs: readonly IndustryCost[]) => expect(colony.bundle.items.commitColonyExchange({ operationId: 'hosted-ui:materials:' + ++ordinal,
      playerId, expectedInventoryRevision: inventory().revision, inputs: [], outputs }).status).toBe('committed');
    for (const targetId of ['field-survey', 'expanded-storage']) {
      fund(COLONY_RESEARCH.find(research => research.id === targetId)!.costs);
      expect(colony.bundle.colonyDepth.execute({ operationId: 'hosted-ui:colony:' + ++ordinal,
        playerId, action: 'research', targetId, expectedRevision: colony.bundle.colonyDepth.read().revision,
        expectedInventoryRevision: inventory().revision }).status).toBe('committed');
    }
    fund([...INDUSTRY_RESEARCH.find(research => research.id === 'automation')!.costs,
      ...INDUSTRY_FACILITIES.depot.costs, { itemDefinitionId: 'item:plant-fiber', quantity: 3 }]);
    const profile = { structureDefinitionId: 'structure:storage-crate' as const, footprint: { width: 1, depth: 1 }, doorClearanceDepth: 0, connectorOffsetWorldUnits: null };
    let position: { x: number; y: number } | undefined;
    for (let x = -2.5; x <= 2.5 && !position; x += 0.5) for (let y = -2.5; y <= 2.5 && !position; y += 0.5) {
      const candidate = { x, y };
      if (Math.hypot(x, y) > 2.5) continue;
      if (colony.bundle.world.isFootprintExplored(candidate, profile, 0) && colony.bundle.world.isBuildableGround(candidate, profile, 0)
        && !colony.bundle.world.hasBlockingWorldCollision(candidate, profile, 0) && !colony.bundle.world.overlapsProtectedRuin(candidate, profile, 0)
        && !colony.bundle.world.obstructsDeathCache(candidate, profile, 0) && !colony.bundle.world.blocksSpawnClearance(candidate, profile, 0)
        && !colony.bundle.world.blocksRequiredAccess(candidate, profile, 0)
        && !colony.bundle.buildings.exportSnapshot().foothold.structures.some(structure => Math.hypot(structure.position.x - x, structure.position.y - y) < 1.5)) position = candidate;
    }
    expect(position).toBeDefined();
    if (!position) throw Error('No nearby industry build position.');
    const panel = page.getByRole('dialog', { name: 'Industry management', exact: true });
    await page.keyboard.press('o');
    await panel.getByRole('button', { name: 'Research', exact: true }).click();
    await panel.getByRole('button', { name: 'Research Industrial automation', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Industrial automation researched');
    await teammate.keyboard.press('o');
    const sharedPanel = teammate.getByRole('dialog', { name: 'Industry management', exact: true });
    await sharedPanel.getByRole('button', { name: 'Research', exact: true }).click();
    await expect(sharedPanel.locator('[data-industry-research=automation]')).toContainText('Researched');
    await panel.getByRole('button', { name: 'Construction', exact: true }).click();
    await panel.getByLabel('Offset X', { exact: true }).fill(String(position.x));
    await panel.getByLabel('Offset Y', { exact: true }).fill(String(position.y));
    await panel.getByRole('button', { name: 'Build Logistics depot', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Logistics depot built');
    await expect(teammate.locator('[data-industry-facility]')).toHaveCount(1);
    const depotId = colony.bundle.industry!.read().facilities[0]!.id;
    await panel.getByRole('button', { name: 'Facilities', exact: true }).click();
    await panel.getByLabel('Facility', { exact: true }).selectOption(depotId);
    await panel.getByRole('heading', { name: 'Logistics depot', exact: true }).click();
    dropResult = true;
    await panel.locator('[data-industry-control="cargo-item:plant-fiber"]').click();
    await expect(root).toHaveAttribute('data-runtime-status', 'reconnecting');
    await expect(root).toHaveAttribute('data-runtime-status', 'ready', { timeout: 15000 });
    await expect(root).toHaveAttribute('data-coop-player-id', playerId);
    await expect(panel.getByRole('status')).toContainText('Cargo loaded');
    expect(droppedOperationId).not.toBe('');
    expect(colony.bundle.industry!.read().receipts.filter(receipt => receipt.operationId === droppedOperationId)).toHaveLength(1);
    expect(colony.bundle.industry!.read().facilities[0]!.buffer).toEqual([{ itemDefinitionId: 'item:plant-fiber', quantity: 1 }]);
    expect(quantity()).toBe(2);
    await sharedPanel.getByRole('button', { name: 'Facilities', exact: true }).click();
    await sharedPanel.getByLabel('Facility', { exact: true }).selectOption(depotId);
    const sharedStock = sharedPanel.getByRole('table', { name: 'Facility buffer' }).getByRole('row').filter({ hasText: 'plant fiber' });
    await expect(sharedStock).toContainText('1');
    const stock = panel.getByRole('table', { name: 'Facility buffer' }).getByRole('row').filter({ hasText: 'plant fiber' });
    await stock.getByRole('button', { name: 'Take 1', exact: true }).click();
    await expect(panel.getByRole('status')).toContainText('Item collected');
    await expect(sharedStock).toHaveCount(0);
    expect(quantity()).toBe(3);
    expect(colony.bundle.items.getContainerView('inventory:' + teammateId)).toEqual(teammateInventory);
    expect(errors).toEqual([]);
  } finally {
    clearInterval(timer);
    while (stepping) await new Promise(done => setTimeout(done, 10));
    for (const context of contexts) await context.close();
    for (const peer of peers.values()) peer.terminate();
    await new Promise<void>(done => wsServer.close(() => done()));
    await new Promise<void>(done => server.close(() => done()));
    await colony.destroy();
  }
});
