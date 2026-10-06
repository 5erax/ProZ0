import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { RNG_ALGORITHM_VERSION, SEED_DERIVATION_VERSION } from '../../src/foundation';
import { HostedClientConnection, type HostedClientTransport } from '../../src/client/network';
import {
  HOSTED_PROTOCOL_VERSION,
  type BaselineSnapshotV1,
  type ClientHelloV1,
  type JsonValue,
  type ServerEnvelopeV1,
} from '../../src/protocol';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

class MemoryTransport implements HostedClientTransport {
  public sent: string[] = [];
  public sendText(text: string) { this.sent.push(text); }
  public close() {}
}

function hello(resumeCredential?: string): ClientHelloV1 {
  return {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: createPhase1ContentCatalog().compatibility,
    worldCompatibility: {
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    },
    ...(resumeCredential ? { resumeCredential } : {}),
  };
}

function envelope(seq: number, messageType: ServerEnvelopeV1['messageType'], payload: unknown, tick = 10, epoch = 'epoch:one') {
  return JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType,
    serverMessageSeq: seq,
    sessionId: 'session:one',
    sessionEpoch: epoch,
    authorityTick: tick,
    payload,
  });
}

function accepted() {
  return {
    worldId: 'world:one', playerId: 'player:one', connectionId: 'connection:one',
    resumeCredential: 'resume:one', snapshotId: 'snapshot:one', maxPlayers: 3,
  };
}

function baseline(): BaselineSnapshotV1 {
  return {
    snapshotId: 'snapshot:one', sessionEpoch: 'epoch:one', authorityTick: 10,
    worldId: 'world:one', playerId: 'player:one', contentCompatibility: hello().contentCompatibility,
    durableSaveRevision: 4,
    players: [{
      playerId: 'player:one', presentationIdentitySlot: 'LOCAL', authorityTick: 10,
      lastProcessedInputSeq: -1, position: { x: 0, y: 0 }, facing: null, locomotionState: 'IDLE',
    }],
    aggregates: [{ aggregateType: 'exploration', aggregateId: 'region:one', revision: 1, tombstone: false, state: { words: [1] } }],
  };
}

function ready() {
  const transport = new MemoryTransport();
  const client = new HostedClientConnection({ transport, hello: hello() });
  client.start();
  client.handleText(envelope(1, 'SESSION_ACCEPTED', accepted()));
  client.handleText(envelope(2, 'BASELINE_SNAPSHOT', baseline()));
  expect(client.getState()).toBe('READY');
  return { client, transport };
}

const result = {
  operationId: 'operation:one', status: 'committed', acceptedAuthorityTick: 10,
  committedAuthorityTick: 11, authorityIngressOrdinal: 0,
};

describe('Hosted client validates state-bearing messages', () => {
  it.each([
    ['COMMAND_RESULT', null],
    ['COMMAND_RESULT', { ...result, authorityIngressOrdinal: -1 }],
    ['COMMAND_RESULT', { ...result, committedAuthorityTick: 9 }],
    ['COMMAND_RESULT', { ...result, resultingRevisions: [{ aggregateType: 'container', aggregateId: 'inventory:one', revision: -1 }] }],
    ['OPERATION_STATUS', null],
    ['OPERATION_STATUS', { operationId: 'operation:one', state: 'resolved' }],
    ['OPERATION_STATUS', { operationId: 'operation:other', state: 'resolved', result }],
    ['OPERATION_STATUS', { operationId: 'operation:one', state: 'accepted-pending', acceptedAuthorityTick: 10, authorityIngressOrdinal: -1 }],
    ['AGGREGATE_UPDATE', null],
    ['AGGREGATE_UPDATE', { aggregateType: 'exploration', aggregateId: 'region:one', revision: -1, tombstone: false, state: {} }],
    ['AGGREGATE_UPDATE', { aggregateType: 'exploration', aggregateId: 'region:one', revision: 2, tombstone: true, state: {} }],
    ['PONG', null],
    ['PONG', { pingId: 'ping:one', clientSentAtMs: 'invalid' }],
    ['DURABILITY_CHECKPOINT', null],
    ['DURABILITY_CHECKPOINT', { authorityTick: 12, durableSaveRevision: 5 }],
    ['DURABILITY_CHECKPOINT', { authorityTick: 11, durableSaveRevision: -1 }],
    ['AUTHORITY_CHECKPOINT', { authorityTick: 11, aggregateRevisions: null }],
    ['SESSION_CLOSING', { saveStatus: 'UNKNOWN' }],
  ] as const)('fails closed on malformed %s without throwing or applying state', (type, payload) => {
    const { client } = ready();
    const before = client.replication.snapshot();
    expect(() => client.handleText(envelope(3, type, payload, 11))).not.toThrow();
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.snapshot()).toEqual(before);
    expect(client.replication.getAuthorityTick()).toBe(10);
    expect(client.getCommandResult('operation:one')).toBeNull();
    expect(client.getOperationStatus('operation:one')).toBeNull();
    expect(client.getDurableSaveRevision()).toBe(4);
    expect(client.getRttMs()).toBeNull();
  });

  it.each([null, {}, { ...accepted(), resumeCredential: '' }, { ...accepted(), maxPlayers: 0 }])('rejects malformed admission before changing identity', payload => {
    const client = new HostedClientConnection({ transport: new MemoryTransport(), hello: hello() });
    client.start();
    expect(() => client.handleText(envelope(1, 'SESSION_ACCEPTED', payload))).not.toThrow();
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.getPlayerId()).toBeNull();
    expect(client.getResumeCredential()).toBeNull();
  });

  it('cannot replace an accepted identity with a second admission', () => {
    const { client } = ready();
    client.handleText(envelope(3, 'SESSION_ACCEPTED', { ...accepted(), playerId: 'player:other', resumeCredential: 'resume:other' }));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.getPlayerId()).toBe('player:one');
    expect(client.getResumeCredential()).toBe('resume:one');
  });

  it.each(['HANDSHAKING', 'BASELINING'] as const)('refuses gameplay updates during %s', state => {
    const client = new HostedClientConnection({ transport: new MemoryTransport(), hello: hello() });
    client.start();
    if (state === 'BASELINING') client.handleText(envelope(1, 'SESSION_ACCEPTED', accepted()));
    client.handleText(envelope(state === 'HANDSHAKING' ? 1 : 2, 'AGGREGATE_UPDATE', baseline().aggregates[0], 11));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.snapshot()).toEqual([]);
    expect(client.replication.getAuthorityTick()).toBe(state === 'HANDSHAKING' ? 0 : 10);
  });

  it('keeps terminal resync state and the last coherent model when later messages arrive', () => {
    const { client } = ready();
    client.handleText(envelope(4, 'COMMAND_RESULT', result, 11));
    client.handleText(envelope(3, 'AGGREGATE_UPDATE', { ...baseline().aggregates[0], revision: 2, state: { words: [99] } }, 11));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.snapshot()).toEqual(baseline().aggregates);
    expect(client.replication.getAuthorityTick()).toBe(10);
  });

  it('keeps closed sessions closed and ignores their later messages', () => {
    const { client } = ready();
    client.leave();
    client.handleText(envelope(3, 'AGGREGATE_UPDATE', { ...baseline().aggregates[0], revision: 2 }, 11));
    expect(client.getState()).toBe('CLOSED');
    expect(client.replication.snapshot()).toEqual(baseline().aggregates);
    expect(client.replication.getAuthorityTick()).toBe(10);
  });

  it('does not advance time from a foreign session epoch', () => {
    const { client } = ready();
    client.handleText(envelope(3, 'COMMAND_RESULT', result, 99, 'epoch:other'));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.getAuthorityTick()).toBe(10);
  });

  it.each([
    { ...baseline(), worldId: 'world:other' },
    { ...baseline(), authorityTick: 9 },
    { ...baseline(), contentCompatibility: { ...hello().contentCompatibility, packVersion: 999 } },
    { ...baseline(), players: [...baseline().players, ...baseline().players] },
    { ...baseline(), aggregates: [...baseline().aggregates, ...baseline().aggregates] },
  ])('rejects mismatched or ambiguous baselines without acknowledging them', snapshot => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({ transport, hello: hello() });
    client.start();
    client.handleText(envelope(1, 'SESSION_ACCEPTED', accepted()));
    client.handleText(envelope(2, 'BASELINE_SNAPSHOT', snapshot));
    expect(client.getState()).toBe('RESYNC_REQUIRED');
    expect(client.replication.snapshot()).toEqual([]);
    expect(transport.sent).toHaveLength(1);
  });

  it('rejects unknown message types and invalid envelope clocks', () => {
    for (const invalid of [
      { messageType: 'UNKNOWN' }, { authorityTick: -1 }, { serverMessageSeq: 0 }, { sessionEpoch: '' },
    ]) {
      const { client } = ready();
      client.handleText(JSON.stringify({ ...JSON.parse(envelope(3, 'PONG', { pingId: 'ping:one', clientSentAtMs: Date.now() })), ...invalid }));
      expect(client.getState()).toBe('RESYNC_REQUIRED');
      expect(client.replication.getAuthorityTick()).toBe(10);
    }
  });

  it('ignores stale or future motion while retaining the last authoritative position', () => {
    const { client } = ready();
    const motion = baseline().players[0]!;
    client.handleText(envelope(3, 'PLAYER_MOTION', { ...motion, authorityTick: 9, position: { x: 8, y: 8 } }, 11));
    client.handleText(envelope(4, 'PLAYER_MOTION', { ...motion, authorityTick: 99, position: { x: 8, y: 8 } }, 11));
    expect(client.getState()).toBe('READY');
    expect(client.getPlayerMotions()).toEqual([motion]);
  });

  it('reconnects with the preserved credential and reconciles valid operations and durability', () => {
    const transport = new MemoryTransport();
    const client = new HostedClientConnection({ transport, hello: hello('resume:one') });
    client.start();
    expect(JSON.parse(transport.sent[0]!).payload.resumeCredential).toBe('resume:one');
    client.handleText(envelope(1, 'SESSION_ACCEPTED', accepted()));
    client.handleText(envelope(2, 'BASELINE_SNAPSHOT', baseline()));
    expect(client.getDurableSaveRevision()).toBe(4);
    client.queryOperation('operation:one');
    client.handleText(envelope(3, 'OPERATION_STATUS', { operationId: 'operation:one', state: 'resolved', result }, 11));
    expect(client.getCommandResult('operation:one')).toEqual(result);
    client.handleText(envelope(4, 'DURABILITY_CHECKPOINT', { authorityTick: 11, durableSaveRevision: 5 }, 11));
    client.handleText(envelope(5, 'DURABILITY_CHECKPOINT', { authorityTick: 10, durableSaveRevision: 4 }, 11));
    expect(client.getDurableSaveRevision()).toBe(5);
    client.handleText(envelope(6, 'AGGREGATE_UPDATE', { ...baseline().aggregates[0], revision: 2, state: { words: [3] } } as JsonValue, 11));
    expect(client.replication.get('exploration', 'region:one')?.revision).toBe(2);
    client.handleText(envelope(7, 'PONG', { pingId: 'ping:one', clientSentAtMs: Date.now() }, 11));
    expect(client.getRttMs()).toBeGreaterThanOrEqual(0);
    client.handleText(envelope(8, 'AUTHORITY_CHECKPOINT', { authorityTick: 11, aggregateRevisions: [] }, 11));
    expect(client.getState()).toBe('READY');
    client.handleText(envelope(9, 'SESSION_CLOSING', { saveStatus: 'SUCCESS', durableSaveRevision: 5 }, 11));
    expect(client.getState()).toBe('CLOSED');
    expect(client.getSessionClosingStatus()).toBe('SUCCESS');
  });
});
