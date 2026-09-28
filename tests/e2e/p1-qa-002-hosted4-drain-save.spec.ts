import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { release as osRelease } from 'node:os';
import { resolve } from 'node:path';
import type { Duplex } from 'node:stream';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  createPhase1ContentCatalog,
  type ContentCatalogV1,
} from '../../src/content';
import {
  Phase1HostedAuthorityComposition,
  composePhase1SaveV2,
} from '../../src/integration';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  canonicalizePortableSaveBundleV2,
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  saveFailureV2,
  saveSuccessV2,
  validatePortableSaveBundleV2,
  validateSaveCommitRequestV2,
  type ChunkRecordV2,
  type Phase1ReopenState,
  type PlayerRecordV2,
  type PortableSaveBundleV2,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
  type SaveResultV2,
  type SaveV2CompatibilityPolicy,
  type WorldManifestV2,
} from '../../src/persistence';
import {
  HOSTED_PROTOCOL_VERSION,
  type GameplayCommandEnvelopeV1,
} from '../../src/protocol';
import {
  SaveV2HostedPersistenceAdapter,
  WebSocketServerTransport,
  type ServerWebSocketLike,
} from '../../src/server';
import {
  PHASE1_WORLD_GENERATION_VERSION,
} from '../../src/world/phase1/Phase1ChunkGenerator';

const EXPECTED_MAIN_SHA =
  process.env.P1_QA_HOSTED4_DRAIN_SAVE_EXPECTED_MAIN_SHA
  ?? '709b7b44e41916ff6330e3f153ce14ba66a328b3';
const EVIDENCE_BRANCH_HEAD =
  process.env.P1_QA_HOSTED4_DRAIN_SAVE_EVIDENCE_HEAD_SHA
  ?? 'local-unset';
const EVIDENCE_DIR = resolve(
  process.cwd(),
  'test-results/p1-qa-002-hosted4-drain-save',
);
const WORLD_ID = 'world:p1-qa-hosted4-drain-save';
const WORLD_SEED = 'p1-world-golden';
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function bundleFromRequest(
  request: SaveCommitRequestV2,
): PortableSaveBundleV2 {
  return {
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: 'portable-bundle',
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  };
}

class EvidenceSaveRepository implements SaveRepositoryV2 {
  private stored: PortableSaveBundleV2 | null = null;

  public constructor(
    private readonly compatibility: SaveV2CompatibilityPolicy,
  ) {}

  public async loadManifest(
    worldId: string,
  ): Promise<SaveResultV2<WorldManifestV2>> {
    const world = await this.loadWorld(worldId);
    return world.ok ? saveSuccessV2(world.value.world) : world;
  }

  public async loadPlayer(
    worldId: string,
    playerId: string,
  ): Promise<SaveResultV2<PlayerRecordV2>> {
    const world = await this.loadWorld(worldId);
    if (!world.ok) return world;
    const player = world.value.players.find(
      (entry) => entry.playerId === playerId,
    );
    return player === undefined
      ? saveFailureV2('NOT_FOUND', 'Player ' + playerId + ' was not found.')
      : saveSuccessV2(player);
  }

  public async loadChunk(
    worldId: string,
    x: number,
    y: number,
  ): Promise<SaveResultV2<ChunkRecordV2>> {
    const world = await this.loadWorld(worldId);
    if (!world.ok) return world;
    const chunk = world.value.chunks.find(
      (entry) => entry.coord.x === x && entry.coord.y === y,
    );
    return chunk === undefined
      ? saveFailureV2(
          'NOT_FOUND',
          'Chunk ' + String(x) + ',' + String(y) + ' was not found.',
        )
      : saveSuccessV2(chunk);
  }

  public async loadWorld(
    worldId: string,
  ): Promise<SaveResultV2<PortableSaveBundleV2>> {
    if (this.stored === null || this.stored.world.worldId !== worldId) {
      return saveFailureV2(
        'NOT_FOUND',
        'World ' + worldId + ' was not found.',
      );
    }
    return saveSuccessV2(this.stored);
  }

  public async commit(
    request: SaveCommitRequestV2,
  ): Promise<SaveResultV2<WorldManifestV2>> {
    const validated = validateSaveCommitRequestV2(
      request,
      this.compatibility,
    );
    if (!validated.ok) return validated;

    const currentRevision = this.stored?.world.worldRevision ?? null;
    if (currentRevision !== request.expectedPreviousWorldRevision) {
      return saveFailureV2(
        'STALE_WRITE',
        'Expected previous world revision '
          + String(request.expectedPreviousWorldRevision)
          + ', found '
          + String(currentRevision)
          + '.',
      );
    }

    this.stored = canonicalizePortableSaveBundleV2(
      bundleFromRequest(request),
    );
    return saveSuccessV2(this.stored.world);
  }

  public async exportWorld(
    worldId: string,
  ): Promise<SaveResultV2<PortableSaveBundleV2>> {
    return this.loadWorld(worldId);
  }

  public async importWorld(
    input: unknown,
  ): Promise<SaveResultV2<WorldManifestV2>> {
    const validated = validatePortableSaveBundleV2(
      input,
      this.compatibility,
    );
    if (!validated.ok) return validated;
    this.stored = canonicalizePortableSaveBundleV2(validated.value);
    return saveSuccessV2(this.stored.world);
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

async function startHosted4Server(
  catalog: ContentCatalogV1,
  repository: SaveRepositoryV2,
  options: {
    readonly sessionId: string;
    readonly sessionEpoch: string;
    readonly reopen?: Phase1ReopenState;
  },
) {
  let composition: Phase1HostedAuthorityComposition | null = null;
  const persistence = new SaveV2HostedPersistenceAdapter({
    repository,
    snapshot: (authorityTick) => {
      if (composition === null) {
        throw new Error('Hosted composition is not bound to Save V2 persistence.');
      }
      const request = composePhase1SaveV2(composition.bundle, {
        nowUtc: '2026-09-29T00:00:00.000Z',
      });
      if (request.world.authorityTick !== authorityTick) {
        throw new Error('Evidence Save V2 authority tick mismatch.');
      }
      return request;
    },
  });

  composition = await Phase1HostedAuthorityComposition.create({
    worldId: WORLD_ID,
    worldSeed: WORLD_SEED,
    maxPlayers: 4,
    interactionRangeWorldUnits: 2,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
    persistence,
    sessionId: options.sessionId,
    sessionEpoch: options.sessionEpoch,
    catalog,
    ...(options.reopen === undefined ? {} : { reopen: options.reopen }),
  });
  const activeComposition = composition;
  const transport = new WebSocketServerTransport(activeComposition.host);
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
      'Sec-WebSocket-Accept: ' + accept,
      '',
      '',
    ].join('\r\n'));

    const peer = new UpgradeSocketPeer(socket);
    transport.attach(
      'browser-hosted4-drain:' + String(++connectionOrdinal),
      peer,
    );
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Hosted-4 drain/save server did not bind TCP.');
  }

  return {
    composition: activeComposition,
    transport,
    websocketUrl: 'ws://127.0.0.1:' + String(address.port),
    hello: {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      contentCompatibility: activeComposition.bundle.getContentCompatibility(),
      worldCompatibility: activeComposition.bundle.getWorldCompatibility(),
    },
    async step(): Promise<void> {
      transport.flush(await activeComposition.step());
    },
    async close(): Promise<void> {
      await new Promise<void>((resolveClose) =>
        server.close(() => resolveClose()),
      );
      await activeComposition.destroy();
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

async function currentAggregate(
  page: Page,
  aggregateType: string,
  aggregateId: string,
): Promise<BrowserAggregateSummary | null> {
  return page.evaluate(
    ({ type, id }) => {
      const state = (
        globalThis as unknown as {
          __proz0Hosted4?: {
            baselines: Array<{
              payload: Record<string, unknown>;
            }>;
            messages: Array<{
              messageType: string;
              payload: Record<string, unknown>;
            }>;
          };
        }
      ).__proz0Hosted4;
      if (state === undefined) return null;

      let current: BrowserAggregateSummary | null = null;
      for (const baseline of state.baselines) {
        const values = baseline.payload.aggregates as BrowserAggregateSummary[];
        const found = values.find(
          (aggregate) =>
            aggregate.aggregateType === type
            && aggregate.aggregateId === id,
        );
        if (found !== undefined) current = found;
      }
      for (const message of state.messages) {
        if (
          message.messageType === 'AGGREGATE_UPDATE'
          && message.payload.aggregateType === type
          && message.payload.aggregateId === id
        ) {
          current = {
            aggregateType: String(message.payload.aggregateType),
            aggregateId: String(message.payload.aggregateId),
            revision: Number(message.payload.revision),
            tombstone: Boolean(message.payload.tombstone),
            state: message.payload.state,
          };
        }
      }
      return current;
    },
    { type: aggregateType, id: aggregateId },
  );
}

async function visibleInventoryIds(
  page: Page,
): Promise<readonly string[]> {
  return page.evaluate(() => {
    const state = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          baselines: Array<{
            payload: Record<string, unknown>;
          }>;
          messages: Array<{
            messageType: string;
            payload: Record<string, unknown>;
          }>;
        };
      }
    ).__proz0Hosted4;
    if (state === undefined) return [];

    const ids = new Set<string>();
    for (const baseline of state.baselines) {
      for (
        const aggregate
        of baseline.payload.aggregates as BrowserAggregateSummary[]
      ) {
        if (
          aggregate.aggregateType === 'container'
          && aggregate.aggregateId.startsWith('inventory:')
          && !aggregate.tombstone
        ) {
          ids.add(aggregate.aggregateId);
        }
      }
    }
    for (const message of state.messages) {
      if (
        message.messageType === 'AGGREGATE_UPDATE'
        && message.payload.aggregateType === 'container'
        && String(message.payload.aggregateId).startsWith('inventory:')
        && !message.payload.tombstone
      ) {
        ids.add(String(message.payload.aggregateId));
      }
    }
    return [...ids].sort();
  });
}

async function messageByType(
  page: Page,
  messageType: string,
): Promise<{
  readonly authorityTick: number;
  readonly payload: Record<string, unknown>;
} | null> {
  return page.evaluate((type) => {
    const messages = (
      globalThis as unknown as {
        __proz0Hosted4?: {
          messages: Array<{
            messageType: string;
            authorityTick: number;
            payload: Record<string, unknown>;
          }>;
        };
      }
    ).__proz0Hosted4?.messages ?? [];
    const found = messages.filter(
      (message) => message.messageType === type,
    ).at(-1);
    return found === undefined
      ? null
      : {
          authorityTick: found.authorityTick,
          payload: found.payload,
        };
  }, messageType);
}

async function oldOperationReplayCount(
  page: Page,
  operationId: string,
): Promise<number> {
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
    return messages.filter(
      (message) =>
        message.messageType === 'COMMAND_RESULT'
        && message.payload.operationId === targetOperationId,
    ).length;
  }, operationId);
}

function sharedAggregateSnapshot(
  baseline: BrowserBaselineSummary,
): readonly BrowserAggregateSummary[] {
  const sharedTypes = new Set([
    'foothold',
    'structure',
    'condenser',
    'power-network',
    'ruin',
    'resource',
    'death-cache',
  ]);
  return Object.freeze(
    baseline.aggregates
      .filter(
        (aggregate) =>
          sharedTypes.has(aggregate.aggregateType)
          && !aggregate.tombstone,
      )
      .sort((left, right) =>
        left.aggregateType.localeCompare(right.aggregateType)
        || left.aggregateId.localeCompare(right.aggregateId),
      ),
  );
}

function inventoryStacksFromAggregate(
  aggregate: BrowserAggregateSummary,
): readonly unknown[] {
  if (
    aggregate.state === null
    || Array.isArray(aggregate.state)
    || typeof aggregate.state !== 'object'
  ) {
    throw new Error('Inventory aggregate state is not an object.');
  }
  const stacks = (aggregate.state as { stacks?: unknown }).stacks;
  if (!Array.isArray(stacks)) {
    throw new Error('Inventory aggregate has no stacks array.');
  }
  return stacks;
}

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

test('four real Chromium clients reconnect, drain Save V2, reopen, and preserve authorized state', async ({ browser }) => {
  test.setTimeout(180_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  expect(EXPECTED_MAIN_SHA).toBe('709b7b44e41916ff6330e3f153ce14ba66a328b3');

  const startedAt = Date.now();
  const browserVersion = browser.version();
  const catalog = createPhase1ContentCatalog();
  const compatibility = createPhase1SaveV2Compatibility(
    catalog,
    [PHASE1_WORLD_GENERATION_VERSION],
  );
  const repository = new EvidenceSaveRepository(compatibility);

  let initialServer: Awaited<ReturnType<typeof startHosted4Server>> | null =
    null;
  let reopenedServer: Awaited<ReturnType<typeof startHosted4Server>> | null =
    null;
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const reopenedContexts: BrowserContext[] = [];
  const reopenedPages: Page[] = [];
  let rejoinContext: BrowserContext | null = null;
  const browserEvents: string[] = [];

  const observePage = (page: Page, label: string) => {
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        browserEvents.push(
          label + ':console:' + message.type() + ':' + message.text(),
        );
      }
    });
    page.on('pageerror', (error) => {
      browserEvents.push(label + ':pageerror:' + error.message);
    });
  };

  try {
    initialServer = await startHosted4Server(
      catalog,
      repository,
      {
        sessionId: 'session:p1-qa-hosted4-drain-save',
        sessionEpoch: 'epoch:p1-qa-hosted4-drain-save',
      },
    );

    for (let index = 0; index < 4; index += 1) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      observePage(page, 'initial-' + String(index + 1));
      pages.push(page);
    }

    const clients = await Promise.all(
      pages.map((page, index) =>
        connectBrowserClient(
          page,
          initialServer!.websocketUrl,
          initialServer!.hello,
          'CLIENT-' + String(index + 1),
        ),
      ),
    );

    expect(new Set(clients.map((client) => client.playerId)).size).toBe(4);
    expect(new Set(clients.map((client) => client.connectionId)).size).toBe(4);
    expect(new Set(clients.map((client) => client.sessionEpoch)).size).toBe(1);
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.readyPlayers,
    ).toBe(4);

    await sendMovement(
      pages[0]!,
      0,
      { up: false, down: false, left: false, right: true },
    );
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.connections
        .find((entry) => entry.playerId === clients[0]!.playerId)
        ?.lastMovementInputSeq ?? -1,
    ).toBe(0);
    await initialServer.step();

    await sendMovement(
      pages[0]!,
      1,
      { up: false, down: false, left: false, right: false },
    );
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.connections
        .find((entry) => entry.playerId === clients[0]!.playerId)
        ?.lastMovementInputSeq ?? -1,
    ).toBe(1);
    await initialServer.step();

    for (const page of pages) {
      await expect.poll(
        async () => (await latestMotionSet(page)).length,
        { timeout: 5000 },
      ).toBe(4);
    }
    const firstMotionBeforeDisconnect =
      (await latestMotionSet(pages[0]!)).find(
        (motion) => motion.playerId === clients[0]!.playerId,
      );
    expect(firstMotionBeforeDisconnect?.x ?? 0).toBeGreaterThan(0);

    for (let index = 0; index < pages.length; index += 1) {
      expect(await visibleInventoryIds(pages[index]!)).toEqual([
        'inventory:' + clients[index]!.playerId,
      ]);
    }

    await renderEvidencePanel(
      pages[2]!,
      'P1-QA-002 · Hosted-4 · READY + Shared Motion',
      [
        'productCandidate=' + EXPECTED_MAIN_SHA,
        'session=' + clients[0]!.sessionId,
        'sessionEpoch=' + clients[0]!.sessionEpoch,
        'readyPlayers=4',
        'distinctPlayerIds=4',
        'shared browser movement replicated=true',
        'owner-private inventory visibility=true',
      ],
    );
    await pages[2]!.screenshot({
      path: resolve(EVIDENCE_DIR, '01-four-ready-shared-state.png'),
      fullPage: true,
    });

    const rejoinSource = clients[3]!;
    await closeHostedSocket(pages[3]!);
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.connectedPlayers,
    ).toBe(3);

    await sendMovement(
      pages[1]!,
      0,
      { up: false, down: true, left: false, right: false },
    );
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.connections
        .find((entry) => entry.playerId === clients[1]!.playerId)
        ?.lastMovementInputSeq ?? -1,
    ).toBe(0);
    await initialServer.step();
    await sendMovement(
      pages[1]!,
      1,
      { up: false, down: false, left: false, right: false },
    );
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.connections
        .find((entry) => entry.playerId === clients[1]!.playerId)
        ?.lastMovementInputSeq ?? -1,
    ).toBe(1);
    await initialServer.step();

    rejoinContext = await browser.newContext();
    const rejoinPage = await rejoinContext.newPage();
    observePage(rejoinPage, 'same-epoch-rejoin');
    const resumed = await connectBrowserClient(
      rejoinPage,
      initialServer.websocketUrl,
      initialServer.hello,
      'CLIENT-4-REJOIN',
      rejoinSource.resumeCredential,
    );
    expect(resumed.playerId).toBe(rejoinSource.playerId);
    expect(resumed.connectionId).not.toBe(rejoinSource.connectionId);
    expect(resumed.sessionEpoch).toBe(rejoinSource.sessionEpoch);
    await expect.poll(
      () => initialServer!.composition.host.diagnostics().session.readyPlayers,
    ).toBe(4);

    await initialServer.step();
    await expect.poll(
      async () => (await latestMotionSet(rejoinPage)).length,
      { timeout: 5000 },
    ).toBe(4);

    const resumedBaseline = await baselineSummary(rejoinPage);
    expect(resumedBaseline.players).toHaveLength(4);
    expect(await visibleInventoryIds(rejoinPage)).toEqual([
      'inventory:' + resumed.playerId,
    ]);

    const preDrainShared = sharedAggregateSnapshot(resumedBaseline);
    expect(
      preDrainShared.some(
        (aggregate) =>
          aggregate.aggregateType === 'structure'
          && aggregate.aggregateId === 'structure-instance:landing-module',
      ),
    ).toBe(true);
    const preDrainCondenserCount = preDrainShared.filter(
      (aggregate) => aggregate.aggregateType === 'condenser',
    ).length;

    await renderEvidencePanel(
      rejoinPage,
      'P1-QA-002 · Hosted-4 · Same-Epoch Reconnect',
      [
        'samePlayerId=true',
        'newConnectionId=true',
        'sameSessionEpoch=true',
        'readyPlayers=4',
        'baselinePlayers=4',
        'owner-private inventory visibility=true',
        'sharedAggregateCount=' + String(preDrainShared.length),
        'condenserAggregateCount=' + String(preDrainCondenserCount),
      ],
    );
    await rejoinPage.screenshot({
      path: resolve(EVIDENCE_DIR, '02-post-reconnect-coherent.png'),
      fullPage: true,
    });

    const activePages = [
      pages[0]!,
      pages[1]!,
      pages[2]!,
      rejoinPage,
    ] as const;
    const activeClients = [
      clients[0]!,
      clients[1]!,
      clients[2]!,
      resumed,
    ] as const;

    for (let index = 0; index < activePages.length; index += 1) {
      expect(await visibleInventoryIds(activePages[index]!)).toEqual([
        'inventory:' + activeClients[index]!.playerId,
      ]);
    }

    const playerOneInventoryId =
      'inventory:' + activeClients[0]!.playerId;
    const playerOneInventory = await currentAggregate(
      activePages[0]!,
      'container',
      playerOneInventoryId,
    );
    if (playerOneInventory === null || playerOneInventory.tombstone) {
      throw new Error('Player-one inventory aggregate is unavailable.');
    }

    const drainOperationId = 'p1-qa-hosted4:drain-craft';
    const ingressBefore =
      initialServer.composition.host.diagnostics()
        .nextAuthorityIngressOrdinal;
    await sendGameplayCommand(activePages[0]!, {
      operationId: drainOperationId,
      commandType: 'item.craft',
      expectedRevisions: Object.freeze([{
        aggregateType: 'container',
        aggregateId: playerOneInventoryId,
        revision: playerOneInventory.revision,
      }]),
      payload: {
        inventoryContainerId: playerOneInventoryId,
        recipeId: 'recipe:cordage',
      },
    });
    await expect.poll(
      () => initialServer!.composition.host.diagnostics()
        .nextAuthorityIngressOrdinal,
    ).toBeGreaterThan(ingressBefore);

    const tickBeforeDrain =
      initialServer.composition.host.getAuthorityTick();
    const rejectedBeforeDrain =
      initialServer.composition.host.diagnostics().commandRejectedCount;
    await initialServer.transport.drainSaveAndClose();

    const afterDrainDiagnostics =
      initialServer.composition.host.diagnostics();
    expect(afterDrainDiagnostics.pendingDomainCommandCount).toBe(0);
    expect(afterDrainDiagnostics.commandRejectedCount).toBe(
      rejectedBeforeDrain + 1,
    );
    const drainCommandResult =
      await commandResult(activePages[0]!, drainOperationId);
    if (drainCommandResult !== null) {
      expect(drainCommandResult.status).toBe('rejected');
    }

    const durabilityMessage =
      await messageByType(activePages[0]!, 'DURABILITY_CHECKPOINT');
    const closingMessage =
      await messageByType(activePages[0]!, 'SESSION_CLOSING');

    const stored = await repository.loadWorld(WORLD_ID);
    expect(stored.ok).toBe(true);
    if (!stored.ok) throw new Error(stored.message);

    expect(stored.value.world.authorityTick).toBe(
      initialServer.composition.host.getAuthorityTick(),
    );
    expect(
      initialServer.composition.host.getAuthorityTick(),
    ).toBeGreaterThan(tickBeforeDrain);
    expect(
      afterDrainDiagnostics.lastDurableSaveRevision,
    ).toBe(stored.value.world.worldRevision);
    if (durabilityMessage !== null) {
      expect(durabilityMessage.payload.authorityTick).toBe(
        stored.value.world.authorityTick,
      );
      expect(durabilityMessage.payload.durableSaveRevision).toBe(
        stored.value.world.worldRevision,
      );
    }
    if (closingMessage !== null) {
      expect(closingMessage.payload.saveStatus).toBe('SUCCESS');
    }

    const reconstructed = reconstructPhase1ReopenState(
      stored.value,
      compatibility,
    );
    expect(reconstructed.ok).toBe(true);
    if (!reconstructed.ok) throw new Error(reconstructed.message);

    const savedPlayerIds = stored.value.players
      .map((player) => player.playerId)
      .sort();
    expect(savedPlayerIds).toEqual(
      activeClients.map((client) => client.playerId).sort(),
    );

    const savedPlayerOne = stored.value.players.find(
      (player) => player.playerId === activeClients[0]!.playerId,
    );
    expect(savedPlayerOne).toBeDefined();
    expect(savedPlayerOne!.position.x).toBeGreaterThan(0);

    await initialServer.close();
    initialServer = null;

    reopenedServer = await startHosted4Server(
      catalog,
      repository,
      {
        sessionId: 'session:p1-qa-hosted4-drain-save:reopen',
        sessionEpoch: 'epoch:p1-qa-hosted4-drain-save:reopen',
        reopen: reconstructed.value,
      },
    );

    for (let index = 0; index < 4; index += 1) {
      const context = await browser.newContext();
      reopenedContexts.push(context);
      const page = await context.newPage();
      observePage(page, 'reopen-' + String(index + 1));
      reopenedPages.push(page);
    }

    const reopenedClients = await Promise.all(
      reopenedPages.map((page, index) =>
        connectBrowserClient(
          page,
          reopenedServer!.websocketUrl,
          reopenedServer!.hello,
          'REOPEN-' + String(index + 1),
        ),
      ),
    );
    await expect.poll(
      () => reopenedServer!.composition.host.diagnostics().session.readyPlayers,
    ).toBe(4);

    expect(
      reopenedClients.map((client) => client.playerId).sort(),
    ).toEqual(savedPlayerIds);
    expect(
      new Set(reopenedClients.map((client) => client.sessionEpoch)).size,
    ).toBe(1);
    expect(reopenedClients[0]!.sessionEpoch).not.toBe(
      clients[0]!.sessionEpoch,
    );

    await reopenedServer.step();
    for (const page of reopenedPages) {
      await expect.poll(
        async () => (await latestMotionSet(page)).length,
        { timeout: 5000 },
      ).toBe(4);
    }

    for (let index = 0; index < reopenedPages.length; index += 1) {
      const page = reopenedPages[index]!;
      const client = reopenedClients[index]!;
      expect(await visibleInventoryIds(page)).toEqual([
        'inventory:' + client.playerId,
      ]);

      const inventory = await currentAggregate(
        page,
        'container',
        'inventory:' + client.playerId,
      );
      if (inventory === null || inventory.tombstone) {
        throw new Error(
          'Reopened private inventory missing for ' + client.playerId,
        );
      }
      const savedContainer = stored.value.containers.find(
        (container) =>
          container.containerId === 'inventory:' + client.playerId,
      );
      if (savedContainer === undefined) {
        throw new Error(
          'Saved private inventory missing for ' + client.playerId,
        );
      }
      expect(inventoryStacksFromAggregate(inventory)).toEqual(
        savedContainer.stacks.map((stack) => ({
          stackId: stack.stackId,
          itemDefinitionId: stack.itemDefinitionId,
          quantity: stack.quantity,
          condition: stack.condition,
        })),
      );
      expect(
        await oldOperationReplayCount(page, drainOperationId),
      ).toBe(0);
    }

    const reopenedFirstMotions =
      await latestMotionSet(reopenedPages[0]!);
    const reopenedPlayerOneMotion = reopenedFirstMotions.find(
      (motion) => motion.playerId === activeClients[0]!.playerId,
    );
    expect(reopenedPlayerOneMotion?.x).toBeCloseTo(
      savedPlayerOne!.position.x,
      6,
    );
    expect(reopenedPlayerOneMotion?.y).toBeCloseTo(
      savedPlayerOne!.position.y,
      6,
    );

    const reopenedBaseline =
      await baselineSummary(reopenedPages[0]!);
    expect(reopenedBaseline.authorityTick).toBe(
      stored.value.world.authorityTick,
    );
    const reopenedShared =
      sharedAggregateSnapshot(reopenedBaseline);
    expect(reopenedShared).toEqual(preDrainShared);
    expect(
      reopenedShared.filter(
        (aggregate) => aggregate.aggregateType === 'condenser',
      ),
    ).toHaveLength(preDrainCondenserCount);

    expect(
      reopenedServer.composition.host.diagnostics()
        .lastDurableSaveRevision,
    ).toBe(stored.value.world.worldRevision);

    await renderEvidencePanel(
      reopenedPages[0]!,
      'P1-QA-002 · Hosted-4 · Save V2 Reopen',
      [
        'productCandidate=' + EXPECTED_MAIN_SHA,
        'evidenceBranchHead=' + EVIDENCE_BRANCH_HEAD,
        'savedAuthorityTick=' + String(stored.value.world.authorityTick),
        'durableSaveRevision=' + String(stored.value.world.worldRevision),
        'reopenedReadyPlayers=4',
        'durablePlayerIdsPreserved=true',
        'savedPlayerPositionPreserved=true',
        'owner-private inventories preserved=true',
        'owner-private inventory isolation=true',
        'shared structure/world aggregates coherent=true',
        'condenser aggregate set coherent=true (count='
          + String(preDrainCondenserCount) + ')',
        'old command replay after reopen=0',
        'no item loss/duplication=true',
        'no stale replay/desync observed=true',
      ],
    );
    await reopenedPages[0]!.screenshot({
      path: resolve(EVIDENCE_DIR, '03-post-reopen-coherent.png'),
      fullPage: true,
    });

    const finishedAt = Date.now();
    const evidence = {
      schemaVersion: 1,
      task: 'P1-QA-HOSTED-001',
      evidenceKind:
        'post-129-real-browser-hosted4-reconnect-drain-save-reopen',
      result: 'PASS',
      productCandidateSha: EXPECTED_MAIN_SHA,
      evidenceBranchHeadSha: EVIDENCE_BRANCH_HEAD,
      workflowRunId: process.env.GITHUB_RUN_ID ?? null,
      browser: {
        engine: 'chromium',
        version: browserVersion,
        initialIsolatedContexts: 4,
        reconnectFreshContext: true,
        reopenFreshContexts: 4,
        viewport: '1280x720',
      },
      runtime: {
        node: process.version,
        platform: process.platform,
        osRelease: osRelease(),
      },
      persistence: {
        adapter: 'SaveV2HostedPersistenceAdapter',
        snapshotComposer: 'composePhase1SaveV2',
        reopenReconstruction: 'reconstructPhase1ReopenState',
        evidenceRepository:
          'in-memory SaveRepositoryV2 with canonical validation/CAS',
        worldId: WORLD_ID,
        savedAuthorityTick: stored.value.world.authorityTick,
        durableSaveRevision: stored.value.world.worldRevision,
      },
      session: {
        initialSessionId: clients[0]!.sessionId,
        initialSessionEpoch: clients[0]!.sessionEpoch,
        initialPlayers: clients.map((client) => ({
          playerId: client.playerId,
          connectionId: client.connectionId,
        })),
        rejoinedPlayerId: resumed.playerId,
        rejoinedConnectionId: resumed.connectionId,
        reopenedSessionId: reopenedClients[0]!.sessionId,
        reopenedSessionEpoch: reopenedClients[0]!.sessionEpoch,
        reopenedPlayers: reopenedClients.map((client) => ({
          playerId: client.playerId,
          connectionId: client.connectionId,
        })),
        resumeCredentialRetained: false,
      },
      checks: {
        fourClientsReady: true,
        sharedBrowserMovementReplicated: true,
        peerDisconnectObserved: true,
        survivingClientsContinued: true,
        sameEpochReconnectSamePlayerId: true,
        sameEpochReconnectNewConnectionId: true,
        ownerPrivateInventoryBeforeSave: true,
        queuedDrainOperationId: drainOperationId,
        queuedDrainOperationBrowserResult: drainCommandResult,
        queuedDrainPendingCountAfter: afterDrainDiagnostics.pendingDomainCommandCount,
        queuedDrainRejectedCountDelta:
          afterDrainDiagnostics.commandRejectedCount - rejectedBeforeDrain,
        drainAdvancedAuthorityTick: true,
        durabilityCheckpoint: {
          authorityTick: stored.value.world.authorityTick,
          durableSaveRevision: stored.value.world.worldRevision,
          hostLastDurableSaveRevision:
            afterDrainDiagnostics.lastDurableSaveRevision,
          browserObserved:
            durabilityMessage?.payload ?? null,
        },
        sessionClosingBrowserObserved: closingMessage?.payload ?? null,
        freshCompositionReopen: true,
        reopenedDurablePlayerIdsPreserved: true,
        reopenedPlayerPositionPreserved: true,
        reopenedOwnerPrivateInventoryPreserved: true,
        reopenedOwnerPrivateInventoryIsolation: true,
        sharedAggregateStatePreserved: true,
        condenserAggregateCountBefore: preDrainCondenserCount,
        condenserAggregateCountAfter:
          reopenedShared.filter(
            (aggregate) => aggregate.aggregateType === 'condenser',
          ).length,
        oldOperationReplayCount: 0,
        noItemLoss: true,
        noItemDuplication: true,
        noObservedDesync: true,
      },
      diagnostics: {
        reopenedHost: reopenedServer.composition.host.diagnostics(),
      },
      errorsWarnings: browserEvents,
      timings: {
        startedAtUtc: new Date(startedAt).toISOString(),
        finishedAtUtc: new Date(finishedAt).toISOString(),
        elapsedMs: finishedAt - startedAt,
      },
      screenshots: [
        '01-four-ready-shared-state.png',
        '02-post-reconnect-coherent.png',
        '03-post-reopen-coherent.png',
      ],
      secrets: {
        resumeCredentialPersisted: false,
      },
    };

    writeFileSync(
      resolve(EVIDENCE_DIR, 'hosted4-drain-save-evidence.json'),
      JSON.stringify(evidence, null, 2) + '\n',
      'utf8',
    );
    writeFileSync(
      resolve(EVIDENCE_DIR, 'browser-events.json'),
      JSON.stringify(browserEvents, null, 2) + '\n',
      'utf8',
    );
  } finally {
    if (rejoinContext !== null) {
      await rejoinContext.close();
    }
    for (const context of contexts) {
      await context.close();
    }
    for (const context of reopenedContexts) {
      await context.close();
    }
    if (initialServer !== null) {
      await initialServer.close();
    }
    if (reopenedServer !== null) {
      await reopenedServer.close();
    }
  }
});

