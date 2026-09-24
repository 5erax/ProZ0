import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../src/foundation';
import { HOSTED_PROTOCOL_VERSION } from '../../src/protocol';
import {
  BACKPRESSURE_HARD_BYTES,
  BACKPRESSURE_SOFT_BYTES,
  BACKPRESSURE_SOFT_DURATION_MS,
  ServerAuthorityHost,
  WebSocketServerTransport,
  type HostedPersistencePort,
  type ServerWebSocketLike,
} from '../../src/server';
import { createSimulationRuntime } from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

class NoopPersistence implements HostedPersistencePort {
  public async save(authorityTick: number) {
    return Object.freeze({
      authorityTick,
      durableSaveRevision: 1,
    });
  }
}

class FakeSocket implements ServerWebSocketLike {
  public bufferedAmount = 0;
  public readonly sent: string[] = [];
  public closed: { readonly code?: number; readonly reason?: string } | null =
    null;

  private readonly listeners = new Map<
    string,
    Array<(data?: unknown) => void>
  >();

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(code?: number, reason?: string): void {
    this.closed = Object.freeze({
      ...(code === undefined ? {} : { code }),
      ...(reason === undefined ? {} : { reason }),
    });
    this.emit('close');
  }

  public on(
    type: 'message' | 'close' | 'error',
    listener: (data?: unknown) => void,
  ): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  public emit(type: 'message' | 'close' | 'error', data?: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(data);
    }
  }
}

function setup() {
  const catalog = createPhase1ContentCatalog();
  let id = 0;
  let credential = 0;
  let nowMs = 0;
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
      idFactory: () => `transport-id-${++id}`,
      resumeCredentialFactory: () => `transport-resume-${++credential}`,
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
  return {
    host,
    transport: new WebSocketServerTransport(host, {
      nowMs: () => nowMs,
    }),
    catalog,
    advanceTime: (deltaMs: number) => {
      nowMs += deltaMs;
    },
  };
}

function connect(
  transport: WebSocketServerTransport,
  host: ServerAuthorityHost,
  socket: FakeSocket,
  transportId: string,
  catalog: ReturnType<typeof createPhase1ContentCatalog>,
): void {
  transport.attach(transportId, socket);
  socket.emit('message', JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'CLIENT_HELLO',
    clientMessageSeq: 0,
    payload: {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
    },
  }));

  const accepted = socket.sent
    .map((entry) => JSON.parse(entry) as {
      readonly messageType: string;
      readonly payload: {
        readonly connectionId?: string;
        readonly snapshotId?: string;
      };
    })
    .find((entry) => entry.messageType === 'SESSION_ACCEPTED');
  if (
    accepted?.payload.connectionId === undefined
    || accepted.payload.snapshotId === undefined
  ) {
    throw new Error('Expected WebSocket session acceptance.');
  }

  socket.emit('message', JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'BASELINE_APPLIED',
    clientMessageSeq: 1,
    sessionId: host.getSessionId(),
    connectionId: accepted.payload.connectionId,
    payload: { snapshotId: accepted.payload.snapshotId },
  }));
}

describe('P1-NET-001 WebSocket transport backpressure', () => {
  it('coalesces after the accepted soft backlog duration, then disconnects at the hard limit without stalling healthy peers', () => {
    const { host, transport, catalog, advanceTime } = setup();
    const slow = new FakeSocket();
    const healthy = new FakeSocket();
    connect(transport, host, slow, 'transport:slow', catalog);
    connect(transport, host, healthy, 'transport:healthy', catalog);
    expect(host.diagnostics().session.readyPlayers).toBe(2);

    slow.bufferedAmount = BACKPRESSURE_SOFT_BYTES + 1;
    transport.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: 'ruin:test',
      revision: 1,
      tombstone: false,
      state: { discoveryState: 'located' },
    });
    expect(slow.closed).toBeNull();
    expect(host.diagnostics().resyncCount).toBe(0);

    advanceTime(BACKPRESSURE_SOFT_DURATION_MS + 1);
    transport.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: 'ruin:test',
      revision: 2,
      tombstone: false,
      state: { discoveryState: 'investigated' },
    });
    expect(slow.closed).toBeNull();
    expect(
      slow.sent.map((entry) => JSON.parse(entry) as { messageType: string })
        .some((entry) => entry.messageType === 'RESYNC_REQUIRED'),
    ).toBe(true);
    expect(host.diagnostics().resyncCount).toBe(1);

    slow.bufferedAmount = BACKPRESSURE_HARD_BYTES + 1;
    transport.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: 'ruin:test',
      revision: 3,
      tombstone: false,
      state: { discoveryState: 'investigated', claimed: true },
    });

    expect(slow.closed).toMatchObject({
      code: 4008,
      reason: 'slow client',
    });
    expect(
      healthy.sent.map((entry) => JSON.parse(entry) as { messageType: string })
        .some((entry) => entry.messageType === 'AGGREGATE_UPDATE'),
    ).toBe(true);
    expect(host.diagnostics()).toMatchObject({
      resyncCount: 1,
      session: {
        connectedPlayers: 1,
        readyPlayers: 1,
      },
    });

    expect(() => transport.step()).not.toThrow();
    expect(host.getAuthorityTick()).toBe(1);
    expect(
      healthy.sent.map((entry) => JSON.parse(entry) as { messageType: string })
        .some((entry) => entry.messageType === 'PLAYER_MOTION'),
    ).toBe(true);
  });
});
