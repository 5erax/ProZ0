import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../src/foundation';
import {
  HOSTED_PROTOCOL_VERSION,
  type BaselineSnapshotV1,
  type ClientEnvelopeV1,
  type ClientHelloV1,
  type CommandResultV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type SessionAcceptedV1,
  type SessionRejectedV1,
} from '../../src/protocol';
import {
  ServerAuthorityHost,
  type HostedCommandDispatcher,
  type HostedDomainCommandContext,
  type HostedDomainCommandResult,
  type HostedPersistencePort,
} from '../../src/server';
import { createSimulationRuntime } from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';

interface ClientHarness {
  readonly transportId: string;
  readonly playerId: string;
  readonly connectionId: string;
  readonly resumeCredential: string;
  readonly baseline: BaselineSnapshotV1;
  nextClientSeq: number;
}

class CounterDispatcher implements HostedCommandDispatcher {
  public count = 0;
  public readonly ingress: number[] = [];

  public execute(
    context: HostedDomainCommandContext,
  ): HostedDomainCommandResult {
    this.ingress.push(context.authorityIngressOrdinal);
    if (context.command.commandType === 'reject-stale') {
      return Object.freeze({
        status: 'rejected',
        reason: 'STALE_REVISION',
      });
    }
    this.count += 1;
    return Object.freeze({
      status: 'committed',
      resultingRevisions: Object.freeze([{
        aggregateType: 'shared-counter',
        aggregateId: 'counter:main',
        revision: this.count,
      }]),
      aggregateUpdates: Object.freeze([{
        aggregateType: 'shared-counter',
        aggregateId: 'counter:main',
        revision: this.count,
        tombstone: false,
        state: this.count,
      }]),
    });
  }
}

class MemoryHostedPersistence implements HostedPersistencePort {
  public saveCount = 0;
  public readonly savedAuthorityTicks: number[] = [];
  public readonly observedStatesAtSave: number[] = [];

  public constructor(
    private readonly fail = false,
    private readonly revision = 7,
    private readonly observeState: (() => number) | null = null,
  ) {}

  public async save(authorityTick: number) {
    this.saveCount += 1;
    this.savedAuthorityTicks.push(authorityTick);
    if (this.observeState !== null) {
      this.observedStatesAtSave.push(this.observeState());
    }
    if (this.fail) throw new Error('injected-save-failure');
    return Object.freeze({
      authorityTick,
      durableSaveRevision: this.revision,
    });
  }
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function deterministicSequence(prefix: string): () => string {
  let ordinal = 0;
  return () => `${prefix}-${++ordinal}`;
}

function hello(
  resumeCredential?: string,
): ClientHelloV1 {
  const catalog = createPhase1ContentCatalog();
  return Object.freeze({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: Object.freeze({
      ...catalog.compatibility,
    }),
    worldCompatibility: Object.freeze({
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    }),
    ...(resumeCredential === undefined ? {} : { resumeCredential }),
  });
}

function createHost(options: {
  readonly maxPlayers?: number;
  readonly dispatcher?: CounterDispatcher;
  readonly persistence?: HostedPersistencePort;
  readonly resumeBindings?: ReadonlyMap<string, string>;
  readonly idsPrefix?: string;
  readonly initialDurabilityCheckpoint?: {
    readonly authorityTick: number;
    readonly durableSaveRevision: number;
  };
} = {}) {
  const dispatcher = options.dispatcher ?? new CounterDispatcher();
  const persistence = options.persistence ?? new MemoryHostedPersistence();
  const catalog = createPhase1ContentCatalog();
  const ids = deterministicSequence(options.idsPrefix ?? 'id');
  const credentials = deterministicSequence(
    `${options.idsPrefix ?? 'id'}-resume`,
  );
  const host = new ServerAuthorityHost({
    session: {
      worldId: 'world-alpha',
      maxPlayers: options.maxPlayers ?? 4,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
      idFactory: ids,
      resumeCredentialFactory: credentials,
      ...(options.resumeBindings === undefined
        ? {}
        : { initialResumeBindings: options.resumeBindings }),
    },
    runtimeFactory: {
      create: () => createSimulationRuntime({
        worldQuery: createStaticCollisionWorld([]),
        initialPlayerPosition: createWorldPosition(0, 0),
      }),
    },
    commandDispatcher: dispatcher,
    persistence,
    ...(options.initialDurabilityCheckpoint === undefined
      ? {}
      : {
          initialDurabilityCheckpoint:
            options.initialDurabilityCheckpoint,
        }),
  });
  host.start();
  return { host, dispatcher, persistence };
}

function clientEnvelope(
  client: Pick<ClientHarness, 'connectionId' | 'nextClientSeq'>,
  host: ServerAuthorityHost,
  messageType: ClientEnvelopeV1['messageType'],
  payload: JsonValue,
): ClientEnvelopeV1 {
  const envelope: ClientEnvelopeV1 = Object.freeze({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType,
    clientMessageSeq: client.nextClientSeq,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload,
  });
  return envelope;
}

function send(
  host: ServerAuthorityHost,
  transportId: string,
  envelope: unknown,
) {
  return host.receiveText(transportId, JSON.stringify(envelope));
}

function join(
  host: ServerAuthorityHost,
  transportId: string,
  resumeCredential?: string,
): ClientHarness {
  const accepted = send(host, transportId, {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'CLIENT_HELLO',
    clientMessageSeq: 0,
    payload: hello(resumeCredential),
  });
  const sessionAccepted = accepted.find(
    (entry) => entry.envelope.messageType === 'SESSION_ACCEPTED',
  );
  const baselineMessage = accepted.find(
    (entry) => entry.envelope.messageType === 'BASELINE_SNAPSHOT',
  );
  if (sessionAccepted === undefined || baselineMessage === undefined) {
    throw new Error('Expected hosted join acceptance and baseline.');
  }

  const metadata =
    sessionAccepted.envelope.payload as unknown as SessionAcceptedV1;
  const baseline =
    baselineMessage.envelope.payload as unknown as BaselineSnapshotV1;
  const client: ClientHarness = {
    transportId,
    playerId: metadata.playerId,
    connectionId: metadata.connectionId,
    resumeCredential: metadata.resumeCredential,
    baseline,
    nextClientSeq: 1,
  };

  const applied = clientEnvelope(
    client,
    host,
    'BASELINE_APPLIED',
    asJson({ snapshotId: metadata.snapshotId }),
  );
  client.nextClientSeq += 1;
  expect(send(host, transportId, applied)).toEqual([]);
  return client;
}

function command(
  operationId: string,
  payload: JsonValue = {},
): GameplayCommandEnvelopeV1 {
  return Object.freeze({
    operationId,
    commandType: 'counter.increment',
    expectedRevisions: Object.freeze([]),
    payload,
  });
}

function commandResult(
  messages: ReturnType<ServerAuthorityHost['step']>,
  operationId: string,
): CommandResultV1 {
  const message = messages.find(
    (entry) =>
      entry.envelope.messageType === 'COMMAND_RESULT'
      && (
        entry.envelope.payload as unknown as CommandResultV1
      ).operationId === operationId,
  );
  if (message === undefined) {
    throw new Error(`Missing command result for ${operationId}.`);
  }
  return message.envelope.payload as unknown as CommandResultV1;
}

describe('P1-NET-001 hosted session protocol', () => {
  it('admits 2–4 players, rejects the fifth, supports a structural maxPlayers=10, and fails compatibility explicitly', () => {
    const { host } = createHost({ maxPlayers: 4 });

    const clients = [
      join(host, 'transport:1'),
      join(host, 'transport:2'),
      join(host, 'transport:3'),
      join(host, 'transport:4'),
    ];
    expect(new Set(clients.map((entry) => entry.playerId)).size).toBe(4);
    expect(host.diagnostics().session).toMatchObject({
      connectedPlayers: 4,
      readyPlayers: 4,
      maxPlayers: 4,
    });

    const fifth = send(host, 'transport:5', {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: hello(),
    });
    expect(fifth[0]?.envelope.messageType).toBe('SESSION_REJECTED');
    expect(
      fifth[0]?.envelope.payload as unknown as SessionRejectedV1,
    ).toEqual({ reason: 'SESSION_FULL' });

    expect(() => createHost({ maxPlayers: 10 })).not.toThrow();

    const protocolMismatch = send(host, 'transport:protocol-mismatch', {
      protocolVersion: 99,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: hello(),
    });
    expect(protocolMismatch[0]?.envelope).toMatchObject({
      messageType: 'SESSION_REJECTED',
      payload: { reason: 'PROTOCOL_MISMATCH' },
    });

    const contentHost = createHost().host;
    const contentMismatch = send(contentHost, 'transport:content', {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: {
        ...hello(),
        contentCompatibility: {
          ...hello().contentCompatibility,
          canonicalFingerprint: 'drifted-content',
        },
      },
    });
    expect(contentMismatch[0]?.envelope).toMatchObject({
      messageType: 'SESSION_REJECTED',
      payload: { reason: 'CONTENT_MISMATCH' },
    });

    const generationHost = createHost().host;
    const generationMismatch = send(generationHost, 'transport:generation', {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: {
        ...hello(),
        worldCompatibility: {
          ...hello().worldCompatibility,
          worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION + 1,
        },
      },
    });
    expect(generationMismatch[0]?.envelope).toMatchObject({
      messageType: 'SESSION_REJECTED',
      payload: { reason: 'WORLD_GENERATION_MISMATCH' },
    });
  });

  it('requires baseline before READY, preserves PlayerId on resume with a new ConnectionId, and never treats credentials as diagnostics', () => {
    const { host } = createHost();
    const initial = join(host, 'transport:first');

    const diagnosticsText = JSON.stringify(host.diagnostics());
    expect(diagnosticsText).not.toContain(initial.resumeCredential);

    host.disconnect(initial.transportId);
    const resumed = join(
      host,
      'transport:resumed',
      initial.resumeCredential,
    );
    expect(resumed.playerId).toBe(initial.playerId);
    expect(resumed.connectionId).not.toBe(initial.connectionId);

    host.disconnect(resumed.transportId);
    const invalid = send(host, 'transport:invalid-resume', {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'CLIENT_HELLO',
      clientMessageSeq: 0,
      payload: hello('not-a-valid-credential'),
    });
    expect(invalid[0]?.envelope).toMatchObject({
      messageType: 'SESSION_REJECTED',
      payload: { reason: 'INVALID_RESUME_CREDENTIAL' },
    });
  });

  it('applies movement from logical input only, rejects stale inputSeq, expires held input, and neutralizes on disconnect', () => {
    const { host } = createHost();
    const player = join(host, 'transport:move');

    const move = clientEnvelope(
      player,
      host,
      'MOVEMENT_INPUT',
      asJson({
        inputSeq: 0,
        up: false,
        down: false,
        left: false,
        right: true,
      }),
    );
    player.nextClientSeq += 1;
    expect(send(host, player.transportId, move)).toEqual([]);

    const firstTick = host.step();
    const firstMotion = firstTick.find(
      (entry) =>
        entry.transportId === player.transportId
        && entry.envelope.messageType === 'PLAYER_MOTION'
        && (
          entry.envelope.payload as unknown as { readonly playerId: string }
        ).playerId === player.playerId,
    );
    expect(
      (
        firstMotion?.envelope.payload as unknown as {
          readonly position: { readonly x: number };
        }
      ).position.x,
    ).toBeGreaterThan(0);

    const stale = clientEnvelope(
      player,
      host,
      'MOVEMENT_INPUT',
      asJson({
        inputSeq: 0,
        up: false,
        down: false,
        left: true,
        right: false,
      }),
    );
    player.nextClientSeq += 1;
    expect(send(host, player.transportId, stale)[0]?.envelope).toMatchObject({
      messageType: 'ERROR',
      payload: { reason: 'INPUT_SEQUENCE_STALE' },
    });

    let expiryTick = firstTick;
    for (let index = 1; index < 60; index += 1) {
      expiryTick = host.step();
    }
    expect(host.diagnostics().movementLeaseExpiryCount).toBe(1);

    const atExpiry = expiryTick.find(
      (entry) =>
        entry.transportId === player.transportId
        && entry.envelope.messageType === 'PLAYER_MOTION'
        && (
          entry.envelope.payload as unknown as { readonly playerId: string }
        ).playerId === player.playerId,
    );
    const next = host.step().find(
      (entry) =>
        entry.transportId === player.transportId
        && entry.envelope.messageType === 'PLAYER_MOTION'
        && (
          entry.envelope.payload as unknown as { readonly playerId: string }
        ).playerId === player.playerId,
    );
    expect(
      (
        next?.envelope.payload as unknown as {
          readonly position: { readonly x: number };
        }
      ).position.x,
    ).toBe(
      (
        atExpiry?.envelope.payload as unknown as {
          readonly position: { readonly x: number };
        }
      ).position.x,
    );

    const beforeDisconnect = (
      next?.envelope.payload as unknown as {
        readonly position: { readonly x: number; readonly y: number };
      }
    ).position;
    host.disconnect(player.transportId);
    host.step();
    host.step();

    const resumed = join(
      host,
      'transport:move-resumed',
      player.resumeCredential,
    );
    const resumedMotion = resumed.baseline.players.find(
      (entry) => entry.playerId === player.playerId,
    );
    expect(resumedMotion?.position).toEqual(beforeDisconnect);
  });

  it('orders commands by server ingress, applies OperationId once, reconciles a lost response after rejoin, and does not carry the cache into a new SessionEpoch', () => {
    const dispatcher = new CounterDispatcher();
    const { host } = createHost({ dispatcher, idsPrefix: 'epoch-a' });
    const first = join(host, 'transport:op-a');
    const second = join(host, 'transport:op-b');

    const firstCommand = clientEnvelope(
      first,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:first', { amount: 1 })),
    );
    first.nextClientSeq += 1;
    const secondCommand = clientEnvelope(
      second,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:second', { amount: 1 })),
    );
    second.nextClientSeq += 1;
    expect(send(host, first.transportId, firstCommand)).toEqual([]);
    expect(send(host, second.transportId, secondCommand)).toEqual([]);

    const resolved = host.step();
    expect(commandResult(resolved, 'operation:first')).toMatchObject({
      status: 'committed',
      authorityIngressOrdinal: 1,
    });
    expect(commandResult(resolved, 'operation:second')).toMatchObject({
      status: 'committed',
      authorityIngressOrdinal: 2,
    });
    expect(dispatcher.ingress).toEqual([1, 2]);

    const duplicate = clientEnvelope(
      first,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:first', { amount: 1 })),
    );
    first.nextClientSeq += 1;
    const duplicateResult = send(host, first.transportId, duplicate);
    expect(duplicateResult[0]?.envelope).toMatchObject({
      messageType: 'COMMAND_RESULT',
      payload: {
        operationId: 'operation:first',
        status: 'committed',
        authorityIngressOrdinal: 1,
      },
    });
    expect(dispatcher.count).toBe(2);

    const conflicting = clientEnvelope(
      first,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:first', { amount: 99 })),
    );
    first.nextClientSeq += 1;
    expect(send(host, first.transportId, conflicting)[0]?.envelope).toMatchObject({
      messageType: 'COMMAND_RESULT',
      payload: {
        status: 'rejected',
        reason: 'OPERATION_ID_CONFLICT',
      },
    });
    expect(dispatcher.count).toBe(2);

    const lost = clientEnvelope(
      first,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:lost-response', { amount: 1 })),
    );
    first.nextClientSeq += 1;
    expect(send(host, first.transportId, lost)).toEqual([]);
    host.disconnect(first.transportId);
    host.step();
    expect(dispatcher.count).toBe(3);

    const resumed = join(
      host,
      'transport:op-resumed',
      first.resumeCredential,
    );
    const query = clientEnvelope(
      resumed,
      host,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:lost-response' }),
    );
    resumed.nextClientSeq += 1;
    expect(send(host, resumed.transportId, query)[0]?.envelope).toMatchObject({
      messageType: 'OPERATION_STATUS',
      payload: {
        operationId: 'operation:lost-response',
        state: 'resolved',
        result: {
          operationId: 'operation:lost-response',
          status: 'committed',
        },
      },
    });

    const restarted = createHost({
      resumeBindings: host.exportResumeBindings(),
      idsPrefix: 'epoch-b',
    }).host;
    expect(restarted.getSessionEpoch()).not.toBe(host.getSessionEpoch());
    const afterRestart = join(
      restarted,
      'transport:new-epoch',
      first.resumeCredential,
    );
    const oldQuery = clientEnvelope(
      afterRestart,
      restarted,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:lost-response' }),
    );
    afterRestart.nextClientSeq += 1;
    expect(
      send(restarted, afterRestart.transportId, oldQuery)[0]?.envelope,
    ).toMatchObject({
      messageType: 'OPERATION_STATUS',
      payload: {
        operationId: 'operation:lost-response',
        state: 'unknown',
      },
    });
  });

  it('continues canonical authority time from a nonzero durable checkpoint without offline replay', async () => {
    const persistence = new MemoryHostedPersistence(false, 22);
    const { host } = createHost({
      persistence,
      idsPrefix: 'restart',
      initialDurabilityCheckpoint: {
        authorityTick: 240,
        durableSaveRevision: 21,
      },
    });

    const player = join(host, 'transport:restart');
    expect(player.baseline).toMatchObject({
      authorityTick: 240,
      durableSaveRevision: 21,
    });
    expect(host.getAuthorityTick()).toBe(240);

    host.step();
    expect(host.getAuthorityTick()).toBe(241);

    const closing = await host.drainSaveAndClose();
    expect(persistence.savedAuthorityTicks).toEqual([241]);
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'DURABILITY_CHECKPOINT'
        && entry.envelope.authorityTick === 241
        && (
          entry.envelope.payload as unknown as {
            readonly authorityTick: number;
            readonly durableSaveRevision: number;
          }
        ).authorityTick === 241,
    )).toBe(true);
  });

  it('drains every pre-cutoff accepted command exactly once before save and rejects post-cutoff commands', async () => {
    const dispatcher = new CounterDispatcher();
    const persistence = new MemoryHostedPersistence(
      false,
      31,
      () => dispatcher.count,
    );
    const { host } = createHost({
      dispatcher,
      persistence,
      idsPrefix: 'drain',
    });
    const player = join(host, 'transport:drain');

    const accepted = clientEnvelope(
      player,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:pre-cutoff', { amount: 1 })),
    );
    player.nextClientSeq += 1;
    expect(send(host, player.transportId, accepted)).toEqual([]);
    expect(dispatcher.count).toBe(0);
    expect(host.getAuthorityTick()).toBe(0);

    const closingPromise = host.drainSaveAndClose();
    expect(host.getSessionState()).toBe('SAVING');

    const postCutoff = clientEnvelope(
      player,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:post-cutoff', { amount: 1 })),
    );
    player.nextClientSeq += 1;
    expect(send(host, player.transportId, postCutoff)[0]?.envelope)
      .toMatchObject({
        messageType: 'ERROR',
        payload: { reason: 'SESSION_CLOSING' },
      });

    const closing = await closingPromise;
    expect(dispatcher.count).toBe(1);
    expect(dispatcher.ingress).toEqual([1]);
    expect(persistence.observedStatesAtSave).toEqual([1]);
    expect(persistence.savedAuthorityTicks).toEqual([1]);
    expect(closing.filter(
      (entry) =>
        entry.envelope.messageType === 'COMMAND_RESULT'
        && (
          entry.envelope.payload as unknown as CommandResultV1
        ).operationId === 'operation:pre-cutoff',
    )).toHaveLength(1);
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'DURABILITY_CHECKPOINT'
        && (
          entry.envelope.payload as unknown as {
            readonly authorityTick: number;
          }
        ).authorityTick === 1,
    )).toBe(true);
  });

  it('keeps pre-cutoff resolved live authority canonical when the final save fails', async () => {
    const dispatcher = new CounterDispatcher();
    const persistence = new MemoryHostedPersistence(
      true,
      1,
      () => dispatcher.count,
    );
    const { host } = createHost({
      dispatcher,
      persistence,
      idsPrefix: 'drain-fail',
    });
    const player = join(host, 'transport:drain-fail');

    const accepted = clientEnvelope(
      player,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:survives-save-failure')),
    );
    player.nextClientSeq += 1;
    send(host, player.transportId, accepted);

    const closing = await host.drainSaveAndClose();
    expect(dispatcher.count).toBe(1);
    expect(persistence.observedStatesAtSave).toEqual([1]);
    expect(host.getAuthorityTick()).toBe(1);
    expect(host.getSessionState()).toBe('FAILED');
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'COMMAND_RESULT'
        && (
          entry.envelope.payload as unknown as CommandResultV1
        ).operationId === 'operation:survives-save-failure',
    )).toBe(true);
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'SESSION_CLOSING'
        && (
          entry.envelope.payload as unknown as {
            readonly saveStatus: string;
          }
        ).saveStatus === 'SAVE_FAILED',
    )).toBe(true);
  });

  it('reports accepted-pending and resolved operation states only to the owning PlayerId', () => {
    const dispatcher = new CounterDispatcher();
    const { host } = createHost({
      dispatcher,
      idsPrefix: 'pending-owner',
    });
    const owner = join(host, 'transport:pending-owner');
    const other = join(host, 'transport:pending-other');

    const pendingCommand = clientEnvelope(
      owner,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:pending-owner', { amount: 1 })),
    );
    owner.nextClientSeq += 1;
    expect(send(host, owner.transportId, pendingCommand)).toEqual([]);

    host.disconnect(owner.transportId);
    const resumed = join(
      host,
      'transport:pending-resumed',
      owner.resumeCredential,
    );

    const pendingQuery = clientEnvelope(
      resumed,
      host,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:pending-owner' }),
    );
    resumed.nextClientSeq += 1;
    expect(send(host, resumed.transportId, pendingQuery)[0]?.envelope)
      .toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId: 'operation:pending-owner',
          state: 'accepted-pending',
          acceptedAuthorityTick: 0,
          authorityIngressOrdinal: 1,
        },
      });

    const crossPlayerQuery = clientEnvelope(
      other,
      host,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:pending-owner' }),
    );
    other.nextClientSeq += 1;
    expect(send(host, other.transportId, crossPlayerQuery)[0]?.envelope)
      .toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId: 'operation:pending-owner',
          state: 'unknown',
        },
      });

    host.step();
    expect(dispatcher.count).toBe(1);

    const resolvedQuery = clientEnvelope(
      resumed,
      host,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:pending-owner' }),
    );
    resumed.nextClientSeq += 1;
    expect(send(host, resumed.transportId, resolvedQuery)[0]?.envelope)
      .toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          state: 'resolved',
          result: {
            operationId: 'operation:pending-owner',
            status: 'committed',
          },
        },
      });

    const crossPlayerResolved = clientEnvelope(
      other,
      host,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:pending-owner' }),
    );
    other.nextClientSeq += 1;
    expect(
      send(host, other.transportId, crossPlayerResolved)[0]?.envelope,
    ).toMatchObject({
      messageType: 'OPERATION_STATUS',
      payload: {
        operationId: 'operation:pending-owner',
        state: 'unknown',
      },
    });

    const restarted = createHost({
      resumeBindings: host.exportResumeBindings(),
      idsPrefix: 'pending-new-epoch',
    }).host;
    const newEpochOwner = join(
      restarted,
      'transport:pending-new-epoch',
      owner.resumeCredential,
    );
    const oldQuery = clientEnvelope(
      newEpochOwner,
      restarted,
      'OPERATION_STATUS_QUERY',
      asJson({ operationId: 'operation:pending-owner' }),
    );
    newEpochOwner.nextClientSeq += 1;
    expect(
      send(restarted, newEpochOwner.transportId, oldQuery)[0]?.envelope,
    ).toMatchObject({
      messageType: 'OPERATION_STATUS',
      payload: {
        operationId: 'operation:pending-owner',
        state: 'unknown',
      },
    });
  });

  it('replicates shared aggregates to all READY clients and separates live commit from successful or failed durability', async () => {
    const persistence = new MemoryHostedPersistence(false, 12);
    const { host } = createHost({ persistence });
    const first = join(host, 'transport:shared-a');
    const second = join(host, 'transport:shared-b');

    const shared = host.publishAggregate(Object.freeze({
      aggregateType: 'exploration',
      aggregateId: 'region:0,0',
      revision: 1,
      tombstone: false,
      state: asJson({ words: [1, 0, 0] }),
    }));
    expect(
      new Set(shared.map((entry) => entry.transportId)),
    ).toEqual(new Set([first.transportId, second.transportId]));

    const mutation = clientEnvelope(
      first,
      host,
      'GAMEPLAY_COMMAND',
      asJson(command('operation:not-yet-durable')),
    );
    first.nextClientSeq += 1;
    send(host, first.transportId, mutation);
    const live = host.step();
    expect(commandResult(live, 'operation:not-yet-durable').status).toBe(
      'committed',
    );
    expect(
      live.some(
        (entry) => entry.envelope.messageType === 'DURABILITY_CHECKPOINT',
      ),
    ).toBe(false);

    const closing = await host.drainSaveAndClose();
    expect(persistence.saveCount).toBe(1);
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'DURABILITY_CHECKPOINT'
        && (
          entry.envelope.payload as unknown as {
            readonly durableSaveRevision: number;
          }
        ).durableSaveRevision === 12,
    )).toBe(true);
    expect(closing.some(
      (entry) =>
        entry.envelope.messageType === 'SESSION_CLOSING'
        && (
          entry.envelope.payload as unknown as {
            readonly saveStatus: string;
          }
        ).saveStatus === 'SUCCESS',
    )).toBe(true);
    expect(host.getSessionState()).toBe('CLOSED');

    const failedPersistence = new MemoryHostedPersistence(true);
    const failedHost = createHost({
      persistence: failedPersistence,
      idsPrefix: 'fail',
    }).host;
    join(failedHost, 'transport:failed-save');
    const failedClosing = await failedHost.drainSaveAndClose();
    expect(failedClosing.some(
      (entry) =>
        entry.envelope.messageType === 'SESSION_CLOSING'
        && (
          entry.envelope.payload as unknown as {
            readonly saveStatus: string;
          }
        ).saveStatus === 'SAVE_FAILED',
    )).toBe(true);
    expect(failedHost.getSessionState()).toBe('FAILED');
  });
});
