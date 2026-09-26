import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Duplex } from 'node:stream';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { Phase1HostedAuthorityComposition } from '../../src/integration';
import {
  HOSTED_PROTOCOL_VERSION,
  type GameplayCommandEnvelopeV1,
} from '../../src/protocol';
import {
  WebSocketServerTransport,
  type HostedPersistencePort,
  type ServerWebSocketLike,
} from '../../src/server';
import {
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';

const EXPECTED_MAIN_SHA =
  process.env.P1_QA_HOSTED4_EXPECTED_MAIN_SHA
  ?? '4c1e6a2732d096783f8ec8c354479fdda03d5e7d';
const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-qa-002-hosted4',
);
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class NoopHostedPersistence implements HostedPersistencePort {
  public async save(authorityTick: number) {
    return Object.freeze({
      authorityTick,
      durableSaveRevision: 1,
    });
  }
}

class UpgradeSocketPeer implements ServerWebSocketLike {
  public readonly bufferedAmount = 0;
  private buffer = Buffer.alloc(0);
  private readonly listeners = new Map<
    string,
    Array<(data?: unknown) => void>
  >();

  public constructor(private readonly socket: Duplex) {
    socket.on('data', (chunk: Buffer) => this.consume(chunk));
    socket.on('close', () => this.emit('close'));
    socket.on('error', () => this.emit('error'));
  }

  public send(data: string): void {
    this.socket.write(encodeFrame(0x1, Buffer.from(data, 'utf8')));
  }

  public close(code = 1000, reason = ''): void {
    const reasonBytes = Buffer.from(reason, 'utf8');
    const payload = Buffer.allocUnsafe(2 + reasonBytes.length);
    payload.writeUInt16BE(code, 0);
    reasonBytes.copy(payload, 2);
    this.socket.write(encodeFrame(0x8, payload));
    this.socket.end();
  }

  public on(
    type: 'message' | 'close' | 'error',
    listener: (data?: unknown) => void,
  ): void {
    const values = this.listeners.get(type) ?? [];
    values.push(listener);
    this.listeners.set(type, values);
  }

  private emit(
    type: 'message' | 'close' | 'error',
    data?: unknown,
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(data);
    }
  }

  private consume(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const parsed = decodeClientFrame(this.buffer);
      if (parsed === null) return;
      this.buffer = this.buffer.subarray(parsed.bytesConsumed);

      if (parsed.opcode === 0x8) {
        this.socket.end();
        return;
      }
      if (parsed.opcode === 0x9) {
        this.socket.write(encodeFrame(0xA, parsed.payload));
        continue;
      }
      if (parsed.opcode !== 0x1) {
        this.close(1003, 'text frames required');
        return;
      }
      this.emit('message', parsed.payload.toString('utf8'));
    }
  }
}

function encodeFrame(opcode: number, payload: Buffer): Buffer {
  const first = 0x80 | opcode;
  if (payload.length < 126) {
    return Buffer.concat([
      Buffer.from([first, payload.length]),
      payload,
    ]);
  }
  if (payload.length <= 0xffff) {
    const header = Buffer.allocUnsafe(4);
    header[0] = first;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.allocUnsafe(10);
  header[0] = first;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function decodeClientFrame(buffer: Buffer): {
  readonly opcode: number;
  readonly payload: Buffer;
  readonly bytesConsumed: number;
} | null {
  if (buffer.length < 2) return null;

  const opcode = buffer[0]! & 0x0f;
  const masked = (buffer[1]! & 0x80) !== 0;
  let length = buffer[1]! & 0x7f;
  let offset = 2;

  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return null;
    const large = buffer.readBigUInt64BE(2);
    if (large > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('WebSocket evidence frame is too large.');
    }
    length = Number(large);
    offset = 10;
  }

  if (!masked) {
    throw new Error('Browser client frames must be masked.');
  }
  if (buffer.length < offset + 4 + length) return null;

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const encoded = buffer.subarray(offset, offset + length);
  const payload = Buffer.allocUnsafe(length);
  for (let index = 0; index < length; index += 1) {
    payload[index] = encoded[index]! ^ mask[index % 4]!;
  }
  return Object.freeze({
    opcode,
    payload,
    bytesConsumed: offset + length,
  });
}

interface BrowserHostedState {
  readonly playerId: string;
  readonly connectionId: string;
  readonly resumeCredential: string;
  readonly sessionId: string;
  readonly sessionEpoch: string;
}

interface BrowserAggregateSummary {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
  readonly tombstone: boolean;
  readonly state: unknown;
}

interface BrowserBaselineSummary {
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly players: readonly {
    readonly playerId: string;
    readonly presentationIdentitySlot: string;
  }[];
  readonly aggregates: readonly BrowserAggregateSummary[];
}

async function startHosted4Server() {
  const composition = await Phase1HostedAuthorityComposition.create({
    worldId: 'world:p1-qa-hosted4',
    worldSeed: 'p1-world-golden',
    maxPlayers: 4,
    interactionRangeWorldUnits: 2,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
    persistence: new NoopHostedPersistence(),
    sessionId: 'session:p1-qa-hosted4',
    sessionEpoch: 'epoch:p1-qa-hosted4',
  });
  const transport = new WebSocketServerTransport(composition.host);
  let connectionOrdinal = 0;

  const server = createServer();
  server.on('upgrade', (request, socket) => {
    const key = request.headers['sec-websocket-key'];
    if (typeof key !== 'string') {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1')
      .update(key + WEBSOCKET_GUID)
      .digest('base64');
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n'));

    const peer = new UpgradeSocketPeer(socket);
    transport.attach(
      `browser-hosted4:${++connectionOrdinal}`,
      peer,
    );
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Hosted-4 WebSocket server did not bind TCP.');
  }

  return {
    composition,
    transport,
    websocketUrl: `ws://127.0.0.1:${address.port}`,
    hello: {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      contentCompatibility: composition.bundle.getContentCompatibility(),
      worldCompatibility: composition.bundle.getWorldCompatibility(),
    },
    async step(): Promise<void> {
      transport.flush(await composition.step());
    },
    async close(): Promise<void> {
      await new Promise<void>((resolveClose) =>
        server.close(() => resolveClose()),
      );
      await composition.destroy();
    },
  };
}

async function connectBrowserClient(
  page: Page,
  websocketUrl: string,
  hello: unknown,
  label: string,
  resumeCredential?: string,
): Promise<BrowserHostedState> {
  await page.goto('/?proz0Mode=local-demo');

  return page.evaluate(
    ({ url, clientHello, protocolVersion, clientLabel, resume }) =>
      new Promise<BrowserHostedState>((resolveConnect, reject) => {
        type ServerMessage = {
          messageType: string;
          sessionId: string;
          sessionEpoch: string;
          serverMessageSeq: number;
          authorityTick: number;
          payload: Record<string, unknown>;
        };
        const socket = new WebSocket(url);
        const state: {
          socket: WebSocket;
          label: string;
          messages: ServerMessage[];
          baselines: ServerMessage[];
          nextClientSeq: number;
          sessionId: string | null;
          sessionEpoch: string | null;
          connectionId: string | null;
          playerId: string | null;
          resumeCredential: string | null;
          protocolVersion: number;
        } = {
          socket,
          label: clientLabel,
          messages: [],
          baselines: [],
          nextClientSeq: 0,
          sessionId: null,
          sessionEpoch: null,
          connectionId: null,
          playerId: null,
          resumeCredential: null,
          protocolVersion,
        };

        (
          globalThis as unknown as {
            __proz0Hosted4?: typeof state;
          }
        ).__proz0Hosted4 = state;

        const timeout = setTimeout(
          () => reject(new Error(clientLabel + ' Hosted-4 baseline timeout.')),
          8000,
        );

        socket.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(clientLabel + ' Hosted-4 WebSocket error.'));
        };
        socket.onopen = () => {
          socket.send(JSON.stringify({
            protocolVersion,
            messageType: 'CLIENT_HELLO',
            clientMessageSeq: state.nextClientSeq++,
            payload: {
              ...(clientHello as Record<string, unknown>),
              ...(resume === undefined
                ? {}
                : { resumeCredential: resume }),
            },
          }));
        };
        socket.onmessage = (event) => {
          const message = JSON.parse(String(event.data)) as ServerMessage;
          state.messages.push(message);

          if (message.messageType === 'SESSION_ACCEPTED') {
            state.sessionId = message.sessionId;
            state.sessionEpoch = message.sessionEpoch;
            state.connectionId = String(message.payload.connectionId);
            state.playerId = String(message.payload.playerId);
            state.resumeCredential = String(message.payload.resumeCredential);
          }

          if (message.messageType === 'BASELINE_SNAPSHOT') {
            state.baselines.push(message);
            if (
              state.sessionId === null
              || state.sessionEpoch === null
              || state.connectionId === null
              || state.playerId === null
              || state.resumeCredential === null
            ) {
              clearTimeout(timeout);
              reject(new Error(clientLabel + ' baseline before session identity.'));
              return;
            }
            socket.send(JSON.stringify({
              protocolVersion,
              messageType: 'BASELINE_APPLIED',
              clientMessageSeq: state.nextClientSeq++,
              sessionId: state.sessionId,
              connectionId: state.connectionId,
              payload: { snapshotId: message.payload.snapshotId },
            }));
            clearTimeout(timeout);
            resolveConnect({
              playerId: state.playerId,
              connectionId: state.connectionId,
              resumeCredential: state.resumeCredential,
              sessionId: state.sessionId,
              sessionEpoch: state.sessionEpoch,
            });
          }
        };
      }),
    {
      url: websocketUrl,
      clientHello: hello,
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      clientLabel: label,
      resume: resumeCredential,
    },
  );
}

async function sendMovement(
  page: Page,
  inputSeq: number,
  direction: {
    readonly up: boolean;
    readonly down: boolean;
    readonly left: boolean;
    readonly right: boolean;
  },
): Promise<void> {
  await page.evaluate(
    ({ sequence, movement }) => {
      const state = (
        globalThis as unknown as {
          __proz0Hosted4?: {
            socket: WebSocket;
            nextClientSeq: number;
            sessionId: string | null;
            connectionId: string | null;
            protocolVersion: number;
          };
        }
      ).__proz0Hosted4;
      if (
        state === undefined
        || state.sessionId === null
        || state.connectionId === null
      ) {
        throw new Error('Hosted-4 client is not READY.');
      }
      state.socket.send(JSON.stringify({
        protocolVersion: state.protocolVersion,
        messageType: 'MOVEMENT_INPUT',
        clientMessageSeq: state.nextClientSeq++,
        sessionId: state.sessionId,
        connectionId: state.connectionId,
        payload: {
          inputSeq: sequence,
          ...movement,
        },
      }));
    },
    { sequence: inputSeq, movement: direction },
  );
}

async function sendGameplayCommand(
  page: Page,
  command: GameplayCommandEnvelopeV1,
): Promise<void> {
  const serializedCommand = JSON.stringify(command);
  await page.evaluate((gameplayCommandJson) => {
    const state = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          socket: WebSocket;
          nextClientSeq: number;
          sessionId: string | null;
          connectionId: string | null;
          protocolVersion: number;
        };
      }
    ).__proz0Hosted4;
    if (
      state === undefined
      || state.sessionId === null
      || state.connectionId === null
    ) {
      throw new Error('Hosted-4 client is not READY.');
    }
    state.socket.send(JSON.stringify({
      protocolVersion: state.protocolVersion,
      messageType: 'GAMEPLAY_COMMAND',
      clientMessageSeq: state.nextClientSeq++,
      sessionId: state.sessionId,
      connectionId: state.connectionId,
      payload: JSON.parse(gameplayCommandJson) as Record<string, unknown>,
    }));
  }, serializedCommand);
}

async function closeHostedSocket(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (
      globalThis as unknown as {
        __proz0Hosted4?: { socket: WebSocket };
      }
    ).__proz0Hosted4;
    state?.socket.close(1000, 'Hosted-4 same-epoch rejoin evidence');
  });
}

async function latestMotionSet(page: Page): Promise<readonly {
  readonly playerId: string;
  readonly presentationIdentitySlot: string;
  readonly x: number;
  readonly y: number;
}[]> {
  return page.evaluate(() => {
    const messages = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          messages: Array<{
            messageType: string;
            payload: Record<string, unknown>;
          }>;
        };
      }
    ).__proz0Hosted4?.messages ?? [];

    const latest = new Map<string, {
      playerId: string;
      presentationIdentitySlot: string;
      x: number;
      y: number;
    }>();
    for (const message of messages) {
      if (message.messageType !== 'PLAYER_MOTION') continue;
      const playerId = String(message.payload.playerId);
      const position = message.payload.position as {
        x?: unknown;
        y?: unknown;
      } | undefined;
      latest.set(playerId, {
        playerId,
        presentationIdentitySlot: String(
          message.payload.presentationIdentitySlot,
        ),
        x: Number(position?.x),
        y: Number(position?.y),
      });
    }
    return [...latest.values()].sort(
      (left, right) => left.playerId.localeCompare(right.playerId),
    );
  });
}

async function latestAggregate(
  page: Page,
  aggregateType: string,
  aggregateId: string,
): Promise<BrowserAggregateSummary | null> {
  return page.evaluate(
    ({ type, id }) => {
      const messages = (
        globalThis as unknown as {
          __proz0Hosted4?: {
            messages: Array<{
              messageType: string;
              payload: Record<string, unknown>;
            }>;
          };
        }
      ).__proz0Hosted4?.messages ?? [];

      const matching = messages.filter(
        (message) =>
          message.messageType === 'AGGREGATE_UPDATE'
          && message.payload.aggregateType === type
          && message.payload.aggregateId === id,
      );
      const latest = matching.at(-1);
      if (latest === undefined) return null;
      return {
        aggregateType: String(latest.payload.aggregateType),
        aggregateId: String(latest.payload.aggregateId),
        revision: Number(latest.payload.revision),
        tombstone: Boolean(latest.payload.tombstone),
        state: latest.payload.state,
      };
    },
    { type: aggregateType, id: aggregateId },
  );
}

async function commandResult(
  page: Page,
  operationId: string,
): Promise<{
  readonly operationId: string;
  readonly status: string;
  readonly reason?: string;
} | null> {
  return page.evaluate((targetOperationId) => {
    const messages = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          messages: Array<{
            messageType: string;
            payload: Record<string, unknown>;
          }>;
        };
      }
    ).__proz0Hosted4?.messages ?? [];
    const matching = messages.filter(
      (message) =>
        message.messageType === 'COMMAND_RESULT'
        && message.payload.operationId === targetOperationId,
    );
    const latest = matching.at(-1);
    if (latest === undefined) return null;
    const reason = latest.payload.reason;
    return {
      operationId: String(latest.payload.operationId),
      status: String(latest.payload.status),
      ...(typeof reason === 'string' ? { reason } : {}),
    };
  }, operationId);
}

async function baselineSummary(
  page: Page,
): Promise<BrowserBaselineSummary> {
  return page.evaluate(() => {
    const baselines = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          baselines: Array<{
            sessionEpoch: string;
            authorityTick: number;
            payload: Record<string, unknown>;
          }>;
        };
      }
    ).__proz0Hosted4?.baselines ?? [];
    const latest = baselines.at(-1);
    if (latest === undefined) {
      throw new Error('Hosted-4 baseline summary unavailable.');
    }
    const players = latest.payload.players as Array<{
      playerId: string;
      presentationIdentitySlot: string;
    }>;
    const aggregates = latest.payload.aggregates as Array<{
      aggregateType: string;
      aggregateId: string;
      revision: number;
      tombstone: boolean;
      state: unknown;
    }>;
    return {
      sessionEpoch: latest.sessionEpoch,
      authorityTick: latest.authorityTick,
      players: players.map((player) => ({
        playerId: player.playerId,
        presentationIdentitySlot: player.presentationIdentitySlot,
      })),
      aggregates: aggregates.map((aggregate) => ({
        aggregateType: aggregate.aggregateType,
        aggregateId: aggregate.aggregateId,
        revision: aggregate.revision,
        tombstone: aggregate.tombstone,
        state: aggregate.state,
      })),
    };
  });
}

async function renderEvidencePanel(
  page: Page,
  title: string,
  lines: readonly string[],
): Promise<void> {
  await page.evaluate(
    ({ panelTitle, panelLines }) => {
      document.title = panelTitle;
      document.body.replaceChildren();
      document.body.style.margin = '0';
      document.body.style.background = '#05070d';
      document.body.style.color = '#f4f6ef';
      document.body.style.fontFamily = 'monospace';

      const panel = document.createElement('main');
      panel.style.padding = '24px';
      panel.style.maxWidth = '1000px';

      const heading = document.createElement('h1');
      heading.textContent = panelTitle;
      heading.style.fontSize = '22px';
      panel.append(heading);

      const badge = document.createElement('p');
      badge.textContent = 'EVIDENCE HARNESS · REAL CHROMIUM CLIENT';
      badge.style.fontWeight = '700';
      panel.append(badge);

      for (const line of panelLines) {
        const row = document.createElement('pre');
        row.textContent = line;
        row.style.whiteSpace = 'pre-wrap';
        row.style.margin = '8px 0';
        panel.append(row);
      }
      document.body.append(panel);
    },
    { panelTitle: title, panelLines: [...lines] },
  );
}

function totalAncientAlloyShards(
  composition: Phase1HostedAuthorityComposition,
  playerIds: readonly string[],
): number {
  return playerIds.reduce((total, playerId) => {
    const inventory = composition.bundle.items.getContainerView(
      'inventory:' + playerId,
    );
    return total + inventory.stacks
      .filter((stack) => stack.itemDefinitionId === 'item:ancient-alloy-shard')
      .reduce((quantity, stack) => quantity + stack.quantity, 0);
  }, 0);
}

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

test('four real Chromium clients share canonical state, contend once, disconnect and same-epoch rejoin', async ({ browser }) => {
  test.setTimeout(180_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const startedAt = Date.now();
  const server = await startHosted4Server();
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  let rejoinContext: BrowserContext | null = null;

  try {
    for (let index = 0; index < 4; index += 1) {
      const context = await browser.newContext();
      contexts.push(context);
      pages.push(await context.newPage());
    }

    const clients = await Promise.all(
      pages.map((page, index) =>
        connectBrowserClient(
          page,
          server.websocketUrl,
          server.hello,
          'CLIENT-' + String(index + 1),
        ),
      ),
    );

    expect(new Set(clients.map((client) => client.playerId)).size).toBe(4);
    expect(new Set(clients.map((client) => client.connectionId)).size).toBe(4);
    expect(new Set(clients.map((client) => client.sessionEpoch)).size).toBe(1);
    await expect.poll(
      () => server.composition.host.diagnostics().session.readyPlayers,
    ).toBe(4);
    expect(server.composition.bundle.getActivePlayerIds()).toHaveLength(4);

    await sendMovement(
      pages[0]!,
      0,
      { up: false, down: false, left: false, right: true },
    );
    await expect.poll(
      () => server.composition.host.diagnostics().session.connections
        .find((entry) => entry.playerId === clients[0]!.playerId)
        ?.lastMovementInputSeq ?? -1,
    ).toBe(0);
    await server.step();

    for (const page of pages) {
      await expect.poll(
        async () => (await latestMotionSet(page)).length,
        { timeout: 5_000 },
      ).toBe(4);
    }
    const motionSets = await Promise.all(
      pages.map((page) => latestMotionSet(page)),
    );
    for (const motions of motionSets) {
      expect(new Set(motions.map((motion) => motion.playerId)).size).toBe(4);
    }
    for (let viewerIndex = 0; viewerIndex < motionSets.length; viewerIndex += 1) {
      const motions = motionSets[viewerIndex]!;
      const viewer = clients[viewerIndex]!;
      expect(
        motions.find((motion) => motion.playerId === viewer.playerId)
          ?.presentationIdentitySlot,
      ).toBe('LOCAL');
      expect(
        motions
          .filter((motion) => motion.playerId !== viewer.playerId)
          .map((motion) => motion.presentationIdentitySlot)
          .sort(),
      ).toEqual(['TEAM_A', 'TEAM_B', 'TEAM_C']);
    }
    expect(
      motionSets[1]!.find(
        (motion) => motion.playerId === clients[0]!.playerId,
      )?.x,
    ).toBeGreaterThan(0);

    await renderEvidencePanel(
      pages[0]!,
      'P1-QA-002 · Hosted-4 · Four READY Clients',
      [
        'candidate=' + EXPECTED_MAIN_SHA,
        'session=' + clients[0]!.sessionId,
        'sessionEpoch=' + clients[0]!.sessionEpoch,
        'readyPlayers=4',
        'viewer=' + clients[0]!.playerId,
        'visible identities=' + motionSets[0]!
          .map((motion) =>
            motion.playerId + ':' + motion.presentationIdentitySlot,
          )
          .join(', '),
        'teammate motion replicated=true',
      ],
    );
    await pages[0]!.screenshot({
      path: resolve(EVIDENCE_DIR, '01-four-ready-shared-motion.png'),
      fullPage: true,
    });

    const landmarks = getPhase1WorldLandmarks('p1-world-golden');
    const ruin = server.composition.bundle.world
      .findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
    if (ruin === null) {
      throw new Error('Expected canonical Phase 1 ruin.');
    }

    server.composition.bundle.getRuntime(clients[0]!.playerId)
      .relocatePlayer(landmarks.ruinPosition);
    server.composition.bundle.getRuntime(clients[1]!.playerId)
      .relocatePlayer(landmarks.ruinPosition);
    await server.step();

    for (const page of pages) {
      await expect.poll(
        async () => (
          await latestAggregate(page, 'ruin', ruin.entityId)
        )?.state,
      ).toMatchObject({
        discoveryState: 'located',
      });
    }

    const located =
      server.composition.bundle.worldStore.getRuinState(ruin.entityId);
    if (located === undefined) {
      throw new Error('Expected located ruin runtime state.');
    }

    await sendGameplayCommand(pages[0]!, {
      operationId: 'hosted4:ruin-inspect',
      commandType: 'world.ruin-inspect',
      expectedRevisions: Object.freeze([{
        aggregateType: 'ruin',
        aggregateId: ruin.entityId,
        revision: located.revision,
      }]),
      payload: { ruinEntityId: ruin.entityId },
    });
    await expect.poll(
      () => server.composition.host.diagnostics()
        .nextAuthorityIngressOrdinal,
    ).toBeGreaterThanOrEqual(2);
    await server.step();

    await expect.poll(
      () => commandResult(pages[0]!, 'hosted4:ruin-inspect'),
    ).toMatchObject({
      operationId: 'hosted4:ruin-inspect',
      status: 'committed',
    });
    for (const page of pages) {
      await expect.poll(
        async () => (
          await latestAggregate(page, 'ruin', ruin.entityId)
        )?.state,
      ).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimable',
      });
    }

    const claimable =
      server.composition.bundle.worldStore.getRuinState(ruin.entityId);
    if (claimable === undefined) {
      throw new Error('Expected claimable ruin runtime state.');
    }
    const inventory1 = server.composition.bundle.items.getContainerView(
      'inventory:' + clients[0]!.playerId,
    );
    const inventory2 = server.composition.bundle.items.getContainerView(
      'inventory:' + clients[1]!.playerId,
    );

    const claim1 = Object.freeze({
      operationId: 'hosted4:ruin-claim:client1',
      commandType: 'world.ruin-reward-claim',
      expectedRevisions: Object.freeze([
        {
          aggregateType: 'ruin',
          aggregateId: ruin.entityId,
          revision: claimable.revision,
        },
        {
          aggregateType: 'container',
          aggregateId: inventory1.containerId,
          revision: inventory1.revision,
        },
      ]),
      payload: {
        ruinEntityId: ruin.entityId,
        inventoryContainerId: inventory1.containerId,
      },
    } satisfies GameplayCommandEnvelopeV1);
    const claim2 = Object.freeze({
      operationId: 'hosted4:ruin-claim:client2',
      commandType: 'world.ruin-reward-claim',
      expectedRevisions: Object.freeze([
        {
          aggregateType: 'ruin',
          aggregateId: ruin.entityId,
          revision: claimable.revision,
        },
        {
          aggregateType: 'container',
          aggregateId: inventory2.containerId,
          revision: inventory2.revision,
        },
      ]),
      payload: {
        ruinEntityId: ruin.entityId,
        inventoryContainerId: inventory2.containerId,
      },
    } satisfies GameplayCommandEnvelopeV1);

    await Promise.all([
      sendGameplayCommand(pages[0]!, claim1),
      sendGameplayCommand(pages[1]!, claim2),
    ]);
    await expect.poll(
      () => server.composition.host.diagnostics()
        .nextAuthorityIngressOrdinal,
    ).toBeGreaterThanOrEqual(4);
    await server.step();

    await expect.poll(
      () => commandResult(pages[0]!, claim1.operationId),
    ).not.toBeNull();
    await expect.poll(
      () => commandResult(pages[1]!, claim2.operationId),
    ).not.toBeNull();

    const claimResults = [
      await commandResult(pages[0]!, claim1.operationId),
      await commandResult(pages[1]!, claim2.operationId),
    ];
    expect(claimResults.filter((result) => result?.status === 'committed'))
      .toHaveLength(1);
    expect(claimResults.filter((result) => result?.status === 'rejected'))
      .toHaveLength(1);

    const playerIds = clients.map((client) => client.playerId);
    expect(totalAncientAlloyShards(server.composition, playerIds)).toBe(1);
    expect(
      server.composition.bundle.worldStore.getRuinState(ruin.entityId),
    ).toMatchObject({
      discoveryState: 'investigated',
      physicalRewardState: 'claimed',
    });

    for (const page of pages) {
      await expect.poll(
        async () => (
          await latestAggregate(page, 'ruin', ruin.entityId)
        )?.state,
      ).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      });
    }

    await renderEvidencePanel(
      pages[1]!,
      'P1-QA-002 · Hosted-4 · Shared Ruin Contention',
      [
        'shared ruin=' + ruin.entityId,
        'all 4 browsers saw located=true',
        'all 4 browsers saw investigated=true',
        'concurrent reward claims=2',
        'committed claims=1',
        'rejected claims=1',
        'total Ancient Alloy Shard across party=1',
        'no duplicate reward=true',
      ],
    );
    await pages[1]!.screenshot({
      path: resolve(EVIDENCE_DIR, '02-shared-ruin-no-duplicate.png'),
      fullPage: true,
    });

    const rejoinSource = clients[3]!;
    await closeHostedSocket(pages[3]!);
    await expect.poll(
      () => server.composition.host.diagnostics().session.connectedPlayers,
    ).toBe(3);

    rejoinContext = await browser.newContext();
    const rejoinPage = await rejoinContext.newPage();
    const resumed = await connectBrowserClient(
      rejoinPage,
      server.websocketUrl,
      server.hello,
      'CLIENT-4-REJOIN',
      rejoinSource.resumeCredential,
    );

    expect(resumed.playerId).toBe(rejoinSource.playerId);
    expect(resumed.connectionId).not.toBe(rejoinSource.connectionId);
    expect(resumed.sessionEpoch).toBe(rejoinSource.sessionEpoch);
    await expect.poll(
      () => server.composition.host.diagnostics().session.readyPlayers,
    ).toBe(4);

    const resumedBaseline = await baselineSummary(rejoinPage);
    expect(resumedBaseline.sessionEpoch).toBe(rejoinSource.sessionEpoch);
    expect(resumedBaseline.players).toHaveLength(4);
    expect(
      resumedBaseline.aggregates.find(
        (aggregate) =>
          aggregate.aggregateType === 'ruin'
          && aggregate.aggregateId === ruin.entityId,
      ),
    ).toMatchObject({
      tombstone: false,
      state: {
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      },
    });

    await server.step();
    await expect.poll(
      async () => (await latestMotionSet(rejoinPage)).length,
      { timeout: 5_000 },
    ).toBe(4);
    const resumedMotions = await latestMotionSet(rejoinPage);
    expect(totalAncientAlloyShards(server.composition, playerIds)).toBe(1);

    await renderEvidencePanel(
      rejoinPage,
      'P1-QA-002 · Hosted-4 · Same-Epoch Rejoin',
      [
        'playerId preserved=' + resumed.playerId,
        'connectionId changed=true',
        'sessionEpoch preserved=' + resumed.sessionEpoch,
        'readyPlayers after rejoin=4',
        'baseline players=4',
        'baseline shared ruin state=investigated/claimed',
        'post-rejoin visible motions=4',
        'party Ancient Alloy Shard total still=1',
      ],
    );
    await rejoinPage.screenshot({
      path: resolve(EVIDENCE_DIR, '03-same-epoch-rejoin-coherent.png'),
      fullPage: true,
    });

    const finishedAt = Date.now();
    const evidence = {
      schemaVersion: 1,
      task: 'P1-QA-002',
      evidenceKind: 'exact-main-hosted4-real-browser-acceptance',
      exactAcceptedMainSha: EXPECTED_MAIN_SHA,
      browser: {
        engine: 'chromium',
        isolatedInitialContexts: 4,
        rejoinUsedFreshContext: true,
        viewport: '1280x720',
      },
      session: {
        sessionId: clients[0]!.sessionId,
        sessionEpoch: clients[0]!.sessionEpoch,
        initialPlayers: clients.map((client) => ({
          playerId: client.playerId,
          connectionId: client.connectionId,
        })),
        resumeCredentialPersistedToEvidence: false,
      },
      checks: {
        fourClientsReady: true,
        fourDistinctPlayerIds: true,
        visiblePresentationIdentitySlots:
          motionSets[0]!.map((motion) => ({
            playerId: motion.playerId,
            slot: motion.presentationIdentitySlot,
          })),
        teammateMotionReplicated: true,
        sharedRuinLocatedObservedByAllFour: true,
        sharedRuinInvestigatedObservedByAllFour: true,
        concurrentSharedMutation: 'two browsers contend for one ruin reward',
        concurrentClaimResults: claimResults,
        ancientAlloyShardPartyTotal: 1,
        noDuplicateReward: true,
        disconnectObservedConnectedPlayers: 3,
        sameEpochRejoinSamePlayerId: true,
        sameEpochRejoinNewConnectionId: true,
        rejoinBaselinePlayers: resumedBaseline.players.length,
        rejoinBaselineRuinState: resumedBaseline.aggregates.find(
          (aggregate) =>
            aggregate.aggregateType === 'ruin'
            && aggregate.aggregateId === ruin.entityId,
        ) ?? null,
        postRejoinVisiblePlayers: resumedMotions.length,
        postRejoinAncientAlloyShardPartyTotal: 1,
      },
      diagnostics: {
        host: server.composition.host.diagnostics(),
      },
      timings: {
        startedAtUtc: new Date(startedAt).toISOString(),
        finishedAtUtc: new Date(finishedAt).toISOString(),
        elapsedMs: finishedAt - startedAt,
      },
      screenshots: [
        '01-four-ready-shared-motion.png',
        '02-shared-ruin-no-duplicate.png',
        '03-same-epoch-rejoin-coherent.png',
      ],
    };

    writeFileSync(
      resolve(EVIDENCE_DIR, 'hosted4-evidence.json'),
      JSON.stringify(evidence, null, 2) + '\n',
      'utf8',
    );
  } finally {
    if (rejoinContext !== null) {
      await rejoinContext.close();
    }
    for (const context of contexts) {
      await context.close();
    }
    await server.close();
  }
});
