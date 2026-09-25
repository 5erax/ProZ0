import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../src/foundation';
import {
  HostedClientConnection,
  ClientReplicationStore,
  type HostedClientTransport,
} from '../../src/client/network';
import {
  HOSTED_PROTOCOL_VERSION,
  serializeServerEnvelopeV1,
  type BaselineSnapshotV1,
  type JsonValue,
  type ServerEnvelopeV1,
} from '../../src/protocol';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

class MemoryTransport implements HostedClientTransport {
  public readonly sent: string[] = [];
  public closed = false;

  public sendText(text: string): void {
    this.sent.push(text);
  }

  public close(): void {
    this.closed = true;
  }
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function hello() {
  const catalog = createPhase1ContentCatalog();
  return {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: catalog.compatibility,
    worldCompatibility: {
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    },
  } as const;
}

function server(
  seq: number,
  messageType: ServerEnvelopeV1['messageType'],
  payload: JsonValue,
  authorityTick = 0,
): string {
  return serializeServerEnvelopeV1({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType,
    serverMessageSeq: seq,
    sessionId: 'session:test',
    sessionEpoch: 'epoch:test',
    authorityTick,
    payload,
  });
}

function baseline(): BaselineSnapshotV1 {
  return Object.freeze({
    snapshotId: 'snapshot:test',
    sessionEpoch: 'epoch:test',
    authorityTick: 0,
    worldId: 'world-alpha',
    playerId: 'player:1',
    contentCompatibility: hello().contentCompatibility,
    durableSaveRevision: null,
    players: Object.freeze([]),
    aggregates: Object.freeze([{
      aggregateType: 'exploration',
      aggregateId: 'region:0,0',
      revision: 1,
      tombstone: false,
      state: asJson({ words: [1] }),
    }]),
  });
}

describe('Hosted client network state', () => {
  it('does not become READY before a coherent complete baseline and detects sequence gaps', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({
      transport,
      hello: hello(),
    });
    client.start();
    expect(client.getState()).toBe('HANDSHAKING');
    expect(JSON.parse(transport.sent[0] ?? '{}')).toMatchObject({
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
    });

    client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    expect(client.getState()).toBe('BASELINING');

    client.handleText(server(3, 'BASELINE_SNAPSHOT', asJson(baseline())));
    expect(client.getState()).toBe('RESYNC_REQUIRED');

    const transport2 = new MemoryTransport();
    const coherent = new HostedClientConnection({
      transport: transport2,
      hello: hello(),
    });
    coherent.start();
    coherent.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    coherent.handleText(server(2, 'BASELINE_SNAPSHOT', asJson(baseline())));
    expect(coherent.getState()).toBe('READY');
    expect(JSON.parse(transport2.sent[1] ?? '{}')).toMatchObject({
      messageType: 'BASELINE_APPLIED',
      clientMessageSeq: 1,
      sessionId: 'session:test',
      connectionId: 'connection:test',
      payload: { snapshotId: 'snapshot:test' },
    });
  });


  it('fails closed before READY when a same-version baseline omits required presentation identity', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({
      transport,
      hello: hello(),
    });
    client.start();
    client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    expect(client.getState()).toBe('BASELINING');

    client.handleText(server(2, 'BASELINE_SNAPSHOT', asJson({
      ...baseline(),
      players: [{
        playerId: 'player:1',
        authorityTick: 0,
        lastProcessedInputSeq: -1,
        position: { x: 0, y: 0 },
        facing: null,
        locomotionState: 'IDLE',
      }],
    })));

    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(transport.sent).toHaveLength(1);
    expect(client.getPlayerMotions()).toEqual([]);
  });

  it('ignores malformed incremental player motion identity without fabricating a teammate slot', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({
      transport,
      hello: hello(),
    });
    client.start();
    client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    client.handleText(server(2, 'BASELINE_SNAPSHOT', asJson(baseline())));
    expect(client.getState()).toBe('READY');

    client.handleText(server(3, 'PLAYER_MOTION', asJson({
      playerId: 'player:2',
      authorityTick: 1,
      lastProcessedInputSeq: 0,
      position: { x: 1, y: 1 },
      facing: 'east',
      locomotionState: 'MOVING',
    }), 1));

    expect(client.getState()).toBe('READY');
    expect(client.getPlayerMotions()).toEqual([]);
  });

  it('preserves accepted-pending versus resolved operation reconciliation state', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({
      transport,
      hello: hello(),
    });
    client.start();
    client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    client.handleText(server(2, 'BASELINE_SNAPSHOT', asJson(baseline())));
    expect(client.getState()).toBe('READY');

    client.handleText(server(3, 'OPERATION_STATUS', asJson({
      operationId: 'operation:test',
      state: 'accepted-pending',
      acceptedAuthorityTick: 7,
      authorityIngressOrdinal: 3,
    }), 7));
    expect(client.getOperationStatus('operation:test')).toEqual({
      operationId: 'operation:test',
      state: 'accepted-pending',
      acceptedAuthorityTick: 7,
      authorityIngressOrdinal: 3,
    });
    expect(client.getCommandResult('operation:test')).toBeNull();

    client.handleText(server(4, 'OPERATION_STATUS', asJson({
      operationId: 'operation:test',
      state: 'resolved',
      result: {
        operationId: 'operation:test',
        status: 'committed',
        acceptedAuthorityTick: 7,
        committedAuthorityTick: 8,
        authorityIngressOrdinal: 3,
      },
    }), 8));
    expect(client.getOperationStatus('operation:test')).toMatchObject({
      state: 'resolved',
      result: {
        operationId: 'operation:test',
        status: 'committed',
      },
    });
    expect(client.getCommandResult('operation:test')).toMatchObject({
      status: 'committed',
      committedAuthorityTick: 8,
    });
  });

  it('ignores stale aggregate revisions and tombstones prevent stale resurrection', () => {
    const store = new ClientReplicationStore();
    store.applyBaseline(baseline());

    expect(store.applyAggregate({
      aggregateType: 'exploration',
      aggregateId: 'region:0,0',
      revision: 1,
      tombstone: false,
      state: asJson({ words: [99] }),
    })).toBe('stale-or-duplicate');

    expect(store.applyAggregate({
      aggregateType: 'exploration',
      aggregateId: 'region:0,0',
      revision: 2,
      tombstone: true,
      state: null,
    })).toBe('applied');

    expect(store.applyAggregate({
      aggregateType: 'exploration',
      aggregateId: 'region:0,0',
      revision: 1,
      tombstone: false,
      state: asJson({ words: [7] }),
    })).toBe('stale-or-duplicate');

    expect(store.get('exploration', 'region:0,0')).toMatchObject({
      revision: 2,
      tombstone: true,
    });
  });

  it('treats session epoch drift as resync rather than applying new-session deltas', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({
      transport,
      hello: hello(),
    });
    client.start();
    client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
      worldId: 'world-alpha',
      playerId: 'player:1',
      connectionId: 'connection:test',
      resumeCredential: 'resume:test',
      snapshotId: 'snapshot:test',
      maxPlayers: 4,
    })));
    client.handleText(server(2, 'BASELINE_SNAPSHOT', asJson(baseline())));
    expect(client.getState()).toBe('READY');

    const wrongEpoch: ServerEnvelopeV1 = {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'AGGREGATE_UPDATE',
      serverMessageSeq: 3,
      sessionId: 'session:test',
      sessionEpoch: 'epoch:new',
      authorityTick: 1,
      payload: asJson({
        aggregateType: 'exploration',
        aggregateId: 'region:0,0',
        revision: 2,
        tombstone: false,
        state: { words: [3] },
      }),
    };
    client.handleText(serializeServerEnvelopeV1(wrongEpoch));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.get('exploration', 'region:0,0')).toMatchObject({
      revision: 1,
    });
  });
});
