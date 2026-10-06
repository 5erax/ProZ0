import { expect, test, type Page } from '@playwright/test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { Phase1HostedAuthorityComposition } from '../../src/integration';
import { colonyHostedScene } from '../../src/integration/ColonyHostedScene';
import { serializeServerEnvelopeV1 } from '../../src/protocol';
import { roomStorageKey } from '../../src/client/runtime/ColonyCoopLauncher';
import type { HostedOutboundMessage } from '../../src/server';

const MAXIMUM_VISIBLE_START_MS = 350;

async function measureVisibleStart(page: Page, code: 'KeyA' | 'KeyD') {
  await expect(page.locator('.coop-stage canvas')).toHaveAttribute('data-player-locomotion', 'IDLE');
  return page.evaluate(async key => {
    const root = document.querySelector<HTMLElement>('[data-runtime-mode=colony-coop]')!;
    const canvas = root.querySelector<HTMLCanvasElement>('.coop-stage canvas')!;
    const player = Array.from(root.querySelectorAll<HTMLElement>('[data-world-role=player]'))
      .find(element => element.dataset.coopEntity === root.dataset.coopPlayerId)!;
    const world = player.parentElement!;
    // Establish an idle displayed position after prior key-up, including a full rendered frame.
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const x = Number(canvas.dataset.visualPlayerX), y = Number(canvas.dataset.visualPlayerY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error('Missing displayed player position');
    const beforeTransform = getComputedStyle(world).transform;
    const tick = Number(canvas.dataset.authorityTick), startedAt = performance.now();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: key, bubbles: true }));
    let moved = false;
    try {
      await new Promise<void>(done => {
        const frame = () => {
          const displayedDistance = Math.hypot(Number(canvas.dataset.visualPlayerX) - x, Number(canvas.dataset.visualPlayerY) - y);
          const spriteDistance = Math.hypot(Number(player.dataset.worldX) - x, Number(player.dataset.worldY) - y);
          moved = displayedDistance > 0.02 && spriteDistance > 0.02
            && getComputedStyle(world).transform !== beforeTransform;
          if (moved || performance.now() - startedAt > 1500) done();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      return {
        latencyMs: performance.now() - startedAt, moved, key, x, y,
        displayedX: Number(canvas.dataset.visualPlayerX), displayedY: Number(canvas.dataset.visualPlayerY),
        spriteX: Number(player.dataset.worldX), spriteY: Number(player.dataset.worldY),
        beforeTransform, afterTransform: getComputedStyle(world).transform,
        authorityTicks: Number(canvas.dataset.authorityTick) - tick,
        playerId: root.dataset.coopPlayerId, runtimeStatus: root.dataset.runtimeStatus,
        userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight],
      };
    } finally {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: key, bubbles: true }));
    }
  }, code);
}

test('three authoritative co-op clients show movement within 350 ms and preserve the same character after reconnect', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const colony = await Phase1HostedAuthorityComposition.create({
    worldId: 'fixture:coop-visible-start', worldSeed: 'p1-world-golden', maxPlayers: 3,
    colonyDepthEnabled: true, interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25,
    persistence: { save: async authorityTick => ({ authorityTick, durableSaveRevision: 1 }) },
  });
  const server = createServer(), wsServer = new WebSocketServer({ server });
  const peers = new Map<string, WebSocket>(), playerTransports = new Map<string, string>();
  const errors: string[] = [], samples: unknown[] = [];
  const contexts = await Promise.all(Array.from({ length: 3 }, () => browser.newContext({ viewport: { width: 1280, height: 720 } })));
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const flush = (messages: readonly HostedOutboundMessage[]) => {
    for (const message of messages) {
      if (message.envelope.messageType === 'SESSION_ACCEPTED')
        playerTransports.set((message.envelope.payload as unknown as { playerId: string }).playerId, message.transportId);
      const socket = peers.get(message.transportId);
      if (socket?.readyState === WebSocket.OPEN) socket.send(serializeServerEnvelopeV1(message.envelope));
    }
  };
  wsServer.on('connection', socket => {
    const transport = randomUUID();
    peers.set(transport, socket);
    socket.on('message', raw => {
      const text = raw.toString();
      if (JSON.parse(text).proz0Social === 1) return;
      flush(colony.host.receiveText(transport, text));
    });
    socket.on('close', () => {
      colony.host.disconnect(transport);
      peers.delete(transport);
    });
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Missing co-op fixture port');
  const endpoint = 'http://127.0.0.1:' + address.port + '/api/pilot', room = 'abcdefabcdefabce';
  let stepping = false;
  const timer = setInterval(() => {
    if (stepping) return;
    stepping = true;
    void (async () => {
      for (let step = 0; step < 3; step++) flush(await colony.step());
      if (colony.bundle.authorityTick % 6 === 0)
        for (const playerId of colony.bundle.getActivePlayerIds())
          flush(colony.host.publishAggregate({
            aggregateType: 'colony-scene', aggregateId: playerId,
            revision: colony.bundle.authorityTick, tombstone: false,
            state: colonyHostedScene(colony.bundle, playerId) as never,
          }));
    })().catch(error => errors.push(String(error))).finally(() => { stepping = false; });
  }, 50);
  const directory = resolve('test-results/phase2-coop-visible-latency');
  mkdirSync(directory, { recursive: true });
  try {
    for (const [index, page] of pages.entries()) {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && message.text().includes('runtime failed')) {
          errors.push(message.text());
          void Promise.all(message.args().map(argument => argument.evaluate(value =>
            value instanceof Error ? value.stack ?? value.message : String(value),
          ))).then(details => errors.push(...details));
        }
      });
      await page.goto(baseURL + '/');
      await page.evaluate(({ key, details }) => localStorage.setItem(key, JSON.stringify(details)), {
        key: roomStorageKey(endpoint, room),
        details: {
          id: room, worldSeed: 'p1-world-golden', accessToken: 'fixture', clientKey: 'fixture-' + index,
          contentCompatibility: colony.bundle.getContentCompatibility(), worldCompatibility: colony.bundle.getWorldCompatibility(),
        },
      });
      await page.goto(baseURL + '/?' + new URLSearchParams({ proz0Mode: 'colony-coop', proz0Room: room, proz0Server: endpoint }));
      await expect(page.locator('[data-runtime-mode=colony-coop]')).toHaveAttribute('data-runtime-status', 'ready');
    }
    await expect.poll(() => colony.host.diagnostics().session.readyPlayers).toBe(3);
    for (const page of pages) await expect(page.locator('.coop-stage canvas')).toHaveAttribute('data-teammate-count', '2');
    for (const [index, page] of pages.entries()) {
      for (let start = 0; start < 4; start++) {
        const sample = await measureVisibleStart(page, start % 2 ? 'KeyA' : 'KeyD');
        samples.push({ phase: 'three-player', client: index, ...sample });
        expect(sample.moved).toBe(true);
        expect(sample.authorityTicks).toBeGreaterThan(0);
        expect(sample.latencyMs).toBeLessThanOrEqual(MAXIMUM_VISIBLE_START_MS);
      }
    }
    const host = pages[0]!, root = host.locator('[data-runtime-mode=colony-coop]');
    const playerId = (await root.getAttribute('data-coop-player-id'))!;
    const originalInventory = colony.bundle.items.getContainerView('inventory:' + playerId);
    // Force a real transport loss. The runtime reconnects using the saved credential.
    peers.get(playerTransports.get(playerId)!)!.terminate();
    await expect(root).toHaveAttribute('data-runtime-status', 'reconnecting');
    await expect(root).toHaveAttribute('data-runtime-status', 'ready', { timeout: 15000 });
    await expect(root).toHaveAttribute('data-coop-player-id', playerId);
    await expect.poll(() => colony.host.diagnostics().session.readyPlayers).toBe(3);
    expect(colony.bundle.items.getContainerView('inventory:' + playerId)).toEqual(originalInventory);
    for (let start = 0; start < 4; start++) {
      const sample = await measureVisibleStart(host, start % 2 ? 'KeyA' : 'KeyD');
      samples.push({ phase: 'reconnected', client: 0, ...sample });
      expect(sample.moved).toBe(true);
      expect(sample.latencyMs).toBeLessThanOrEqual(MAXIMUM_VISIBLE_START_MS);
    }
    expect(errors).toEqual([]);
  } finally {
    writeFileSync(resolve(directory, 'visible-start.json'), JSON.stringify({
      sourceHeadSha: process.env.P0_TEST_HEAD_SHA ?? 'local-working-tree',
      fixture: 'Three isolated browser clients over local WebSockets, real 60 Hz authority; no Redis, Internet or human playtest claim',
      maximumVisibleStartMs: MAXIMUM_VISIBLE_START_MS, samples, errors,
    }, null, 2));
    clearInterval(timer);
    while (stepping) await new Promise(done => setTimeout(done, 10));
    for (const context of contexts) await context.close();
    for (const socket of peers.values()) socket.terminate();
    await new Promise<void>(done => wsServer.close(() => done()));
    await new Promise<void>(done => server.close(() => done()));
    await colony.destroy();
  }
});
