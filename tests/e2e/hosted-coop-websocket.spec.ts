import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { expect, test, type Page } from '@playwright/test';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../src/foundation';
import { HOSTED_PROTOCOL_VERSION } from '../../src/protocol';
import {
  ServerAuthorityHost,
  WebSocketServerTransport,
  type HostedPersistencePort,
  type ServerWebSocketLike,
} from '../../src/server';
import { createSimulationRuntime } from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class NoopPersistence implements HostedPersistencePort {
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
      throw new Error('WebSocket test frame is too large.');
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

async function startLoopbackServer() {
  const catalog = createPhase1ContentCatalog();
  let id = 0;
  let credential = 0;
  const host = new ServerAuthorityHost({
    session: {
      worldId: 'world-alpha',
      maxPlayers: 4,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
      idFactory: () => `browser-id-${++id}`,
      resumeCredentialFactory: () => `browser-resume-${++credential}`,
    },
    runtimeFactory: {
      create: () => createSimulationRuntime({
        worldQuery: createStaticCollisionWorld([]),
        initialPlayerPosition: createWorldPosition(0, 0),
      }),
    },
    commandDispatcher: {
      execute: () => Object.freeze({ status: 'committed' as const }),
    },
    persistence: new NoopPersistence(),
  });
  host.start();
  const transport = new WebSocketServerTransport(host);
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
    transport.attach(`browser:${++connectionOrdinal}`, peer);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Loopback WebSocket server did not bind TCP.');
  }

  return {
    host,
    transport,
    url: `ws://127.0.0.1:${address.port}`,
    hello: {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
    },
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

interface BrowserHostedState {
  readonly playerId: string;
  readonly connectionId: string;
}

async function connectBrowserClient(
  page: Page,
  url: string,
  hello: unknown,
): Promise<BrowserHostedState> {
  await page.goto('/');
  return page.evaluate(
    ({ websocketUrl, clientHello, protocolVersion }) =>
      new Promise<BrowserHostedState>((resolve, reject) => {
        const socket = new WebSocket(websocketUrl);
        const state: {
          socket: WebSocket;
          messages: Array<{
            messageType: string;
            sessionId: string;
            sessionEpoch: string;
            serverMessageSeq: number;
            payload: Record<string, unknown>;
          }>;
          nextClientSeq: number;
          sessionId: string | null;
          connectionId: string | null;
          playerId: string | null;
        } = {
          socket,
          messages: [],
          nextClientSeq: 0,
          sessionId: null,
          connectionId: null,
          playerId: null,
          protocolVersion,
        };
        (
          globalThis as unknown as {
            __proz0HostedTest?: typeof state;
          }
        ).__proz0HostedTest = state;

        const timeout = setTimeout(
          () => reject(new Error('Hosted WebSocket baseline timeout.')),
          5000,
        );

        socket.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Hosted WebSocket connection error.'));
        };
        socket.onopen = () => {
          socket.send(JSON.stringify({
            protocolVersion,
            messageType: 'CLIENT_HELLO',
            clientMessageSeq: state.nextClientSeq++,
            payload: clientHello,
          }));
        };
        socket.onmessage = (event) => {
          const message = JSON.parse(String(event.data)) as {
            messageType: string;
            sessionId: string;
            sessionEpoch: string;
            serverMessageSeq: number;
            payload: Record<string, unknown>;
          };
          state.messages.push(message);

          if (message.messageType === 'SESSION_ACCEPTED') {
            state.sessionId = message.sessionId;
            state.connectionId = String(message.payload.connectionId);
            state.playerId = String(message.payload.playerId);
          }

          if (message.messageType === 'BASELINE_SNAPSHOT') {
            if (
              state.sessionId === null
              || state.connectionId === null
              || state.playerId === null
            ) {
              clearTimeout(timeout);
              reject(new Error('Baseline arrived before session identity.'));
              return;
            }
            socket.send(JSON.stringify({
              protocolVersion,
              messageType: 'BASELINE_APPLIED',
              clientMessageSeq: state.nextClientSeq++,
              sessionId: state.sessionId,
              connectionId: state.connectionId,
              payload: {
                snapshotId: message.payload.snapshotId,
              },
            }));
            clearTimeout(timeout);
            resolve({
              playerId: state.playerId,
              connectionId: state.connectionId,
            });
          }
        };
      }),
    {
      websocketUrl: url,
      clientHello: hello,
      protocolVersion: HOSTED_PROTOCOL_VERSION,
    },
  );
}

async function sendRightMovement(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = (
      globalThis as unknown as {
        __proz0HostedTest?: {
          socket: WebSocket;
          nextClientSeq: number;
          sessionId: string | null;
          connectionId: string | null;
          protocolVersion: number;
        };
      }
    ).__proz0HostedTest;
    if (
      state === undefined
      || state.sessionId === null
      || state.connectionId === null
    ) {
      throw new Error('Hosted browser client is not connected.');
    }
    state.socket.send(JSON.stringify({
      protocolVersion: state.protocolVersion,
      messageType: 'MOVEMENT_INPUT',
      clientMessageSeq: state.nextClientSeq++,
      sessionId: state.sessionId,
      connectionId: state.connectionId,
      payload: {
        inputSeq: 0,
        up: false,
        down: false,
        left: false,
        right: true,
      },
    }));
  });
}

async function latestMotionX(
  page: Page,
  playerId: string,
): Promise<number | null> {
  return page.evaluate((targetPlayerId) => {
    const messages = (
      globalThis as unknown as {
        __proz0HostedTest?: {
          messages: Array<{
            messageType: string;
            payload: {
              playerId?: unknown;
              position?: { x?: unknown };
            };
          }>;
        };
      }
    ).__proz0HostedTest?.messages ?? [];
    const matching = messages.filter(
      (message) =>
        message.messageType === 'PLAYER_MOTION'
        && message.payload.playerId === targetPlayerId,
    );
    const latest = matching.at(-1);
    const x = latest?.payload.position?.x;
    return typeof x === 'number' ? x : null;
  }, playerId);
}

test('two real Chromium WebSocket clients baseline, move, replicate teammate motion, and survive peer disconnect', async ({ browser }) => {
  const loopback = await startLoopbackServer();
  const context = await browser.newContext();
  const firstPage = await context.newPage();
  const secondPage = await context.newPage();

  try {
    const [first, second] = await Promise.all([
      connectBrowserClient(firstPage, loopback.url, loopback.hello),
      connectBrowserClient(secondPage, loopback.url, loopback.hello),
    ]);
    expect(first.playerId).not.toBe(second.playerId);

    await expect.poll(
      () => loopback.host.diagnostics().session.readyPlayers,
    ).toBe(2);

    await sendRightMovement(firstPage);
    await expect.poll(() => {
      const connection = loopback.host.diagnostics().session.connections
        .find((entry) => entry.playerId === first.playerId);
      return connection?.lastMovementInputSeq ?? -1;
    }).toBe(0);

    loopback.transport.step();

    await expect.poll(
      () => latestMotionX(firstPage, first.playerId),
    ).toBeGreaterThan(0);
    const firstObserved = await latestMotionX(firstPage, first.playerId);
    await expect.poll(
      () => latestMotionX(secondPage, first.playerId),
    ).toBe(firstObserved);

    await firstPage.evaluate(() => {
      const state = (
        globalThis as unknown as {
          __proz0HostedTest?: { socket: WebSocket };
        }
      ).__proz0HostedTest;
      state?.socket.close(1000, 'e2e disconnect');
    });
    await expect.poll(
      () => loopback.host.diagnostics().session.connectedPlayers,
    ).toBe(1);

    loopback.transport.step();
    await expect.poll(
      () => latestMotionX(secondPage, second.playerId),
    ).not.toBeNull();
  } finally {
    await context.close();
    await loopback.close();
  }
});
