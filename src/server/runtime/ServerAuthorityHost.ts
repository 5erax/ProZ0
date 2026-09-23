import {
  createSimulationStep,
  toSimulationTick,
  type PlayerId,
} from '../../foundation';
import {
  NEUTRAL_PLAYER_INPUT,
  type AuthorityRuntime,
  type PlayerInput,
} from '../../simulation';
import {
  HOSTED_PROTOCOL_VERSION,
  MOVEMENT_INPUT_LEASE_TICKS,
  parseClientEnvelopeV1,
  validateBaselineAppliedV1,
  validateClientHelloV1,
  validateGameplayCommandEnvelopeV1,
  validateMovementInputV1,
  validateOperationStatusQueryV1,
  validatePingV1,
  type AuthorityCheckpointV1,
  type BaselineSnapshotV1,
  type ClientCheckpointV1,
  type CommandResultV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type PlayerMotionViewV1,
  type RevisionRefV1,
  type RevisionedAggregateViewV1,
  type ServerEnvelopeV1,
} from '../../protocol';
import type { DurabilityCheckpointV1 } from '../../persistence';
import { HostedSession, type HostedSessionConfig } from '../session/HostedSession';
import {
  OperationResultCache,
  commandSignature,
} from '../session/OperationResultCache';
import { ReplicationCoordinator } from '../session/ReplicationCoordinator';
import type { HostedPersistencePort } from './HostedPersistence';

export interface HostedRuntimeFactory {
  create(playerId: PlayerId): AuthorityRuntime;
}

export interface HostedDomainCommandContext {
  readonly playerId: PlayerId;
  readonly authorityTick: number;
  readonly authorityIngressOrdinal: number;
  readonly command: GameplayCommandEnvelopeV1;
}

export interface HostedDomainCommandResult {
  readonly status: 'committed' | 'rejected';
  readonly reason?: string;
  readonly resultingRevisions?: readonly RevisionRefV1[];
  readonly aggregateUpdates?: readonly RevisionedAggregateViewV1[];
}

export interface HostedCommandDispatcher {
  execute(
    context: HostedDomainCommandContext,
  ): HostedDomainCommandResult;
}

export interface HostedBaselineProvider {
  filterForPlayer?(
    playerId: PlayerId,
    aggregates: readonly RevisionedAggregateViewV1[],
  ): readonly RevisionedAggregateViewV1[];
  stateDigest?(): string;
}

export interface ServerAuthorityHostOptions {
  readonly session: HostedSessionConfig;
  readonly runtimeFactory: HostedRuntimeFactory;
  readonly commandDispatcher: HostedCommandDispatcher;
  readonly persistence: HostedPersistencePort;
  readonly baselineProvider?: HostedBaselineProvider;
  readonly initialDurabilityCheckpoint?: DurabilityCheckpointV1 | null;
}

export interface HostedOutboundMessage {
  readonly transportId: string;
  readonly envelope: ServerEnvelopeV1;
}

interface QueuedCommand {
  readonly transportId: string;
  readonly playerId: PlayerId;
  readonly command: GameplayCommandEnvelopeV1;
  readonly signature: string;
  readonly acceptedAuthorityTick: number;
  readonly authorityIngressOrdinal: number;
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function movementToPlayerInput(input: {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}): PlayerInput {
  return Object.freeze({
    moveUp: input.up,
    moveDown: input.down,
    moveLeft: input.left,
    moveRight: input.right,
  });
}

function revisionKey(ref: RevisionRefV1): string {
  return `${ref.aggregateType}\u0000${ref.aggregateId}`;
}

function actorMismatch(payload: JsonValue, playerId: string): boolean {
  if (payload === null || Array.isArray(payload) || typeof payload !== 'object') {
    return false;
  }
  const actor = payload.playerId;
  return actor !== undefined && actor !== playerId;
}

export class ServerAuthorityHost {
  private readonly session: HostedSession;
  private readonly replication = new ReplicationCoordinator();
  private readonly operations = new OperationResultCache();
  private readonly runtimes = new Map<PlayerId, AuthorityRuntime>();
  private readonly commandQueue: QueuedCommand[] = [];
  private readonly lastProcessedInputSeq = new Map<PlayerId, number>();
  private authorityTick = 0;
  private nextIngressOrdinal = 1;
  private lastDurabilityCheckpoint: DurabilityCheckpointV1 | null;
  private commandCommittedCount = 0;
  private commandRejectedCount = 0;
  private movementLeaseExpiryCount = 0;
  private resyncCount = 0;

  public constructor(private readonly options: ServerAuthorityHostOptions) {
    this.session = new HostedSession(options.session);
    this.lastDurabilityCheckpoint =
      options.initialDurabilityCheckpoint ?? null;
  }

  public start(): void {
    this.session.open();
  }

  public getAuthorityTick(): number {
    return this.authorityTick;
  }

  public getSessionId(): string {
    return this.session.sessionId;
  }

  public getSessionEpoch(): string {
    return this.session.sessionEpoch;
  }

  public getSessionState() {
    return this.session.getState();
  }

  public receiveText(
    transportId: string,
    text: string,
  ): readonly HostedOutboundMessage[] {
    const parsed = parseClientEnvelopeV1(text);
    if (!parsed.ok) {
      return this.singleUnauthenticatedError(
        transportId,
        parsed.reason,
      );
    }

    const envelope = parsed.value;
    const existing = this.session.getConnection(transportId);

    if (existing === null) {
      if (envelope.messageType !== 'CLIENT_HELLO') {
        return this.singleUnauthenticatedError(
          transportId,
          'INVALID_MESSAGE',
        );
      }
      const hello = validateClientHelloV1(envelope.payload);
      if (!hello.ok) {
        return this.singleUnauthenticatedRejection(
          transportId,
          hello.reason === 'PROTOCOL_MISMATCH'
            ? 'PROTOCOL_MISMATCH'
            : 'INVALID_HELLO',
        );
      }

      const joined = this.session.join(
        transportId,
        envelope.clientMessageSeq,
        hello.value,
        this.authorityTick,
      );
      if (!joined.accepted) {
        return this.singleUnauthenticatedRejection(
          transportId,
          joined.reason,
        );
      }

      try {
        this.ensureRuntime(joined.connection.playerId);
      } catch {
        this.session.disconnect(transportId);
        return this.singleUnauthenticatedRejection(
          transportId,
          'PLAYER_STATE_UNAVAILABLE',
        );
      }

      const accepted = this.envelope(
        transportId,
        'SESSION_ACCEPTED',
        asJson({
          worldId: this.session.getWorldId(),
          playerId: joined.connection.playerId,
          connectionId: joined.connection.connectionId,
          resumeCredential: joined.resumeCredential,
          snapshotId: joined.connection.snapshotId,
          maxPlayers: this.session.getMaxPlayers(),
        }),
      );
      const baseline = this.envelope(
        transportId,
        'BASELINE_SNAPSHOT',
        asJson(this.buildBaseline(
          joined.connection.playerId,
          joined.connection.snapshotId,
        )),
      );
      return Object.freeze(
        [accepted, baseline].filter(
          (entry): entry is HostedOutboundMessage => entry !== null,
        ),
      );
    }

    const sequence = this.session.acceptClientEnvelope(transportId, envelope);
    if (sequence !== 'OK') {
      return this.singleConnectionError(transportId, sequence);
    }

    switch (envelope.messageType) {
      case 'CLIENT_HELLO':
        return this.singleConnectionError(transportId, 'INVALID_CONNECTION');

      case 'BASELINE_APPLIED': {
        const applied = validateBaselineAppliedV1(envelope.payload);
        if (!applied.ok) {
          return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
        }
        if (!this.session.markBaselineApplied(
          transportId,
          applied.value.snapshotId,
        )) {
          return this.singleConnectionError(transportId, 'RESYNC_REQUIRED');
        }
        return Object.freeze([]);
      }

      case 'MOVEMENT_INPUT': {
        const input = validateMovementInputV1(envelope.payload);
        if (!input.ok) {
          return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
        }
        const accepted = this.session.acceptMovement(
          transportId,
          input.value,
          this.authorityTick,
        );
        if (accepted !== 'OK') {
          return this.singleConnectionError(transportId, accepted);
        }
        const connection = this.requireConnection(transportId);
        const runtime = this.requireRuntime(connection.playerId);
        runtime.submitInput(
          connection.playerId,
          movementToPlayerInput(input.value),
        );
        this.lastProcessedInputSeq.set(
          connection.playerId,
          input.value.inputSeq,
        );
        return Object.freeze([]);
      }

      case 'GAMEPLAY_COMMAND': {
        const connection = this.requireConnection(transportId);
        if (connection.state !== 'READY') {
          return this.singleConnectionError(transportId, 'NOT_READY');
        }
        const command = validateGameplayCommandEnvelopeV1(envelope.payload);
        if (!command.ok) {
          return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
        }
        if (actorMismatch(command.value.payload, connection.playerId)) {
          return this.singleConnectionError(transportId, 'INVALID_CONNECTION');
        }
        return this.acceptCommand(
          transportId,
          connection.playerId,
          command.value,
        );
      }

      case 'OPERATION_STATUS_QUERY': {
        const connection = this.requireConnection(transportId);
        if (connection.state !== 'READY') {
          return this.singleConnectionError(transportId, 'NOT_READY');
        }
        const query = validateOperationStatusQueryV1(envelope.payload);
        if (!query.ok) {
          return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
        }
        const result = this.operations.get(query.value.operationId);
        const response = this.envelope(
          transportId,
          'OPERATION_STATUS',
          asJson({
            operationId: query.value.operationId,
            known: result !== null,
            ...(result === null ? {} : { result }),
          }),
        );
        return response === null
          ? Object.freeze([])
          : Object.freeze([response]);
      }

      case 'PING': {
        const ping = validatePingV1(envelope.payload);
        if (!ping.ok) {
          return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
        }
        const response = this.envelope(
          transportId,
          'PONG',
          asJson(ping.value),
        );
        return response === null
          ? Object.freeze([])
          : Object.freeze([response]);
      }

      case 'CLIENT_CHECKPOINT': {
        const connection = this.requireConnection(transportId);
        if (connection.state !== 'READY') {
          return this.singleConnectionError(transportId, 'NOT_READY');
        }
        return this.handleClientCheckpoint(
          transportId,
          envelope.payload as unknown as ClientCheckpointV1,
        );
      }

      case 'LEAVE_SESSION':
        this.disconnect(transportId);
        return Object.freeze([]);
    }
  }

  public disconnect(transportId: string): void {
    const connection = this.session.disconnect(transportId);
    if (connection === null) return;
    const runtime = this.runtimes.get(connection.playerId);
    runtime?.submitInput(connection.playerId, NEUTRAL_PLAYER_INPUT);
  }

  public step(): readonly HostedOutboundMessage[] {
    if (this.session.getState() !== 'OPEN') {
      throw new Error('ServerAuthorityHost steps only while OPEN.');
    }

    const nextTick = this.authorityTick + 1;
    const expired = this.session.neutralizeExpiredMovement(
      nextTick,
      MOVEMENT_INPUT_LEASE_TICKS,
    );
    for (const connection of expired) {
      const runtime = this.requireRuntime(connection.playerId);
      runtime.submitInput(connection.playerId, NEUTRAL_PLAYER_INPUT);
      this.movementLeaseExpiryCount += 1;
    }

    const step = createSimulationStep(toSimulationTick(nextTick));
    for (const runtime of this.runtimes.values()) {
      runtime.step(step);
    }
    this.authorityTick = nextTick;

    const outbound: HostedOutboundMessage[] = [];
    this.commandQueue.sort(
      (left, right) =>
        left.authorityIngressOrdinal - right.authorityIngressOrdinal,
    );
    while (this.commandQueue.length > 0) {
      const queued = this.commandQueue.shift();
      if (queued === undefined) break;
      outbound.push(...this.executeQueuedCommand(queued));
    }

    for (const connection of this.session.getReadyConnections()) {
      for (const [playerId, runtime] of this.runtimes) {
        const snapshot = runtime.getSnapshot();
        const motion: PlayerMotionViewV1 = Object.freeze({
          playerId,
          authorityTick: this.authorityTick,
          lastProcessedInputSeq:
            this.lastProcessedInputSeq.get(playerId) ?? -1,
          position: Object.freeze({
            x: snapshot.player.position.x,
            y: snapshot.player.position.y,
          }),
          facing: snapshot.player.facing,
          locomotionState: snapshot.player.locomotionState,
        });
        const message = this.envelope(
          connection.transportId,
          'PLAYER_MOTION',
          asJson(motion),
        );
        if (message !== null) outbound.push(message);
      }
    }

    return Object.freeze(outbound);
  }

  public publishAggregate(
    view: RevisionedAggregateViewV1,
  ): readonly HostedOutboundMessage[] {
    if (!this.replication.publish(view)) {
      return Object.freeze([]);
    }
    return this.broadcastReady('AGGREGATE_UPDATE', asJson(view));
  }

  public requireResync(
    transportId: string,
    reason:
      | 'SERVER_SEQUENCE_GAP'
      | 'AGGREGATE_REVISION_GAP'
      | 'STATE_DIGEST_MISMATCH'
      | 'SLOW_CLIENT',
  ): readonly HostedOutboundMessage[] {
    this.resyncCount += 1;
    const message = this.envelope(
      transportId,
      'RESYNC_REQUIRED',
      asJson({ reason }),
    );
    return message === null
      ? Object.freeze([])
      : Object.freeze([message]);
  }

  public authorityCheckpoint(): readonly HostedOutboundMessage[] {
    const checkpoint: AuthorityCheckpointV1 = Object.freeze({
      authorityTick: this.authorityTick,
      aggregateRevisions: this.replication.revisionRefs(),
      ...(this.options.baselineProvider?.stateDigest === undefined
        ? {}
        : { stateDigest: this.options.baselineProvider.stateDigest() }),
    });
    return this.broadcastReady(
      'AUTHORITY_CHECKPOINT',
      asJson(checkpoint),
    );
  }

  public async drainSaveAndClose(): Promise<
    readonly HostedOutboundMessage[]
  > {
    this.session.beginDraining();
    for (const connection of this.session.getLiveConnections()) {
      const runtime = this.runtimes.get(connection.playerId);
      runtime?.submitInput(connection.playerId, NEUTRAL_PLAYER_INPUT);
    }
    this.session.beginSaving();

    try {
      const checkpoint = await this.options.persistence.save(
        this.authorityTick,
      );
      this.lastDurabilityCheckpoint = checkpoint;
      const closing = this.broadcastLive(
        'DURABILITY_CHECKPOINT',
        asJson(checkpoint),
      );
      const final = this.broadcastLive(
        'SESSION_CLOSING',
        asJson({
          saveStatus: 'SUCCESS',
          durableSaveRevision: checkpoint.durableSaveRevision,
        }),
      );
      this.session.close();
      return Object.freeze([...closing, ...final]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const final = this.broadcastLive(
        'SESSION_CLOSING',
        asJson({
          saveStatus: 'SAVE_FAILED',
          reason,
        }),
      );
      this.session.fail();
      return final;
    }
  }

  public diagnostics() {
    return Object.freeze({
      sessionId: this.session.sessionId,
      sessionEpoch: this.session.sessionEpoch,
      worldId: this.session.getWorldId(),
      authorityTick: this.authorityTick,
      session: this.session.diagnostics(),
      nextAuthorityIngressOrdinal: this.nextIngressOrdinal,
      commandCommittedCount: this.commandCommittedCount,
      commandRejectedCount: this.commandRejectedCount,
      movementLeaseExpiryCount: this.movementLeaseExpiryCount,
      resyncCount: this.resyncCount,
      lastDurableSaveRevision:
        this.lastDurabilityCheckpoint?.durableSaveRevision ?? null,
    });
  }

  public exportResumeBindings(): ReadonlyMap<string, string> {
    return this.session.exportResumeBindings();
  }

  private acceptCommand(
    transportId: string,
    playerId: PlayerId,
    command: GameplayCommandEnvelopeV1,
  ): readonly HostedOutboundMessage[] {
    const signature = commandSignature(playerId, command);
    const ingress = this.nextIngressOrdinal;
    const begun = this.operations.begin(
      command.operationId,
      signature,
      this.authorityTick,
      ingress,
    );

    if (begun.status === 'conflict') {
      const result: CommandResultV1 = Object.freeze({
        operationId: command.operationId,
        status: 'rejected',
        acceptedAuthorityTick: this.authorityTick,
        authorityIngressOrdinal: ingress,
        reason: 'OPERATION_ID_CONFLICT',
      });
      const message = this.envelope(
        transportId,
        'COMMAND_RESULT',
        asJson(result),
      );
      return message === null
        ? Object.freeze([])
        : Object.freeze([message]);
    }

    if (begun.status === 'resolved') {
      const message = this.envelope(
        transportId,
        'COMMAND_RESULT',
        asJson(begun.result),
      );
      return message === null
        ? Object.freeze([])
        : Object.freeze([message]);
    }

    if (begun.status === 'pending-duplicate') {
      return Object.freeze([]);
    }

    this.nextIngressOrdinal += 1;
    this.commandQueue.push(Object.freeze({
      transportId,
      playerId,
      command,
      signature,
      acceptedAuthorityTick: this.authorityTick,
      authorityIngressOrdinal: ingress,
    }));
    return Object.freeze([]);
  }

  private executeQueuedCommand(
    queued: QueuedCommand,
  ): readonly HostedOutboundMessage[] {
    let domain: HostedDomainCommandResult;
    try {
      domain = this.options.commandDispatcher.execute(Object.freeze({
        playerId: queued.playerId,
        authorityTick: this.authorityTick,
        authorityIngressOrdinal: queued.authorityIngressOrdinal,
        command: queued.command,
      }));
    } catch (error) {
      domain = Object.freeze({
        status: 'rejected',
        reason: error instanceof Error ? error.message : 'COMMAND_FAILED',
      });
    }

    const result: CommandResultV1 = Object.freeze({
      operationId: queued.command.operationId,
      status: domain.status,
      acceptedAuthorityTick: queued.acceptedAuthorityTick,
      committedAuthorityTick: this.authorityTick,
      authorityIngressOrdinal: queued.authorityIngressOrdinal,
      ...(domain.reason === undefined ? {} : { reason: domain.reason }),
      ...(domain.resultingRevisions === undefined
        ? {}
        : { resultingRevisions: Object.freeze([...domain.resultingRevisions]) }),
    });
    this.operations.resolve(queued.command.operationId, result);

    if (domain.status === 'committed') {
      this.commandCommittedCount += 1;
    } else {
      this.commandRejectedCount += 1;
    }

    const outbound: HostedOutboundMessage[] = [];
    const connection = this.session.getConnection(queued.transportId);
    if (connection?.state === 'READY') {
      const message = this.envelope(
        queued.transportId,
        'COMMAND_RESULT',
        asJson(result),
      );
      if (message !== null) outbound.push(message);
    }

    for (const update of domain.aggregateUpdates ?? []) {
      if (!this.replication.publish(update)) continue;
      outbound.push(...this.broadcastReady(
        'AGGREGATE_UPDATE',
        asJson(update),
      ));
    }

    return Object.freeze(outbound);
  }

  private handleClientCheckpoint(
    transportId: string,
    checkpoint: ClientCheckpointV1,
  ): readonly HostedOutboundMessage[] {
    if (
      !Number.isSafeInteger(checkpoint.lastAppliedServerMessageSeq)
      || checkpoint.lastAppliedServerMessageSeq < 0
      || !Number.isSafeInteger(checkpoint.lastAppliedAuthorityTick)
      || checkpoint.lastAppliedAuthorityTick < 0
      || !Array.isArray(checkpoint.aggregateRevisions)
    ) {
      return this.singleConnectionError(transportId, 'INVALID_MESSAGE');
    }

    const authoritative = new Map(
      this.replication.revisionRefs().map((ref) => [revisionKey(ref), ref.revision]),
    );
    const mismatch = checkpoint.aggregateRevisions.some((ref) =>
      !Number.isSafeInteger(ref.revision)
      || ref.revision < 0
      || (authoritative.get(revisionKey(ref)) ?? -1) !== ref.revision,
    );
    const digest = this.options.baselineProvider?.stateDigest?.();
    const digestMismatch = checkpoint.stateDigest !== undefined
      && digest !== undefined
      && checkpoint.stateDigest !== digest;

    if (mismatch || digestMismatch) {
      this.resyncCount += 1;
      const message = this.envelope(
        transportId,
        'RESYNC_REQUIRED',
        asJson({
          reason: digestMismatch
            ? 'STATE_DIGEST_MISMATCH'
            : 'AGGREGATE_REVISION_GAP',
        }),
      );
      return message === null
        ? Object.freeze([])
        : Object.freeze([message]);
    }
    return Object.freeze([]);
  }

  private buildBaseline(
    playerId: PlayerId,
    snapshotId: string,
  ): BaselineSnapshotV1 {
    const allAggregates = this.replication.baseline();
    const aggregates = this.options.baselineProvider?.filterForPlayer?.(
      playerId,
      allAggregates,
    ) ?? allAggregates;
    const players = [...this.runtimes].map(([id, runtime]) => {
      const snapshot = runtime.getSnapshot();
      return Object.freeze({
        playerId: id,
        authorityTick: this.authorityTick,
        lastProcessedInputSeq: this.lastProcessedInputSeq.get(id) ?? -1,
        position: Object.freeze({
          x: snapshot.player.position.x,
          y: snapshot.player.position.y,
        }),
        facing: snapshot.player.facing,
        locomotionState: snapshot.player.locomotionState,
      });
    });

    return Object.freeze({
      snapshotId,
      sessionEpoch: this.session.sessionEpoch,
      authorityTick: this.authorityTick,
      worldId: this.session.getWorldId(),
      playerId,
      contentCompatibility: this.session.getContentCompatibility(),
      durableSaveRevision:
        this.lastDurabilityCheckpoint?.durableSaveRevision ?? null,
      players: Object.freeze(players),
      aggregates: Object.freeze([...aggregates]),
    });
  }

  private ensureRuntime(playerId: PlayerId): AuthorityRuntime {
    const existing = this.runtimes.get(playerId);
    if (existing !== undefined) return existing;

    const runtime = this.options.runtimeFactory.create(playerId);
    runtime.submitInput(playerId, NEUTRAL_PLAYER_INPUT);
    for (let tick = 1; tick <= this.authorityTick; tick += 1) {
      runtime.step(createSimulationStep(toSimulationTick(tick)));
    }
    this.runtimes.set(playerId, runtime);
    this.lastProcessedInputSeq.set(playerId, -1);
    return runtime;
  }

  private requireRuntime(playerId: PlayerId): AuthorityRuntime {
    const runtime = this.runtimes.get(playerId);
    if (runtime === undefined) {
      throw new Error(`Hosted runtime missing for ${playerId}.`);
    }
    return runtime;
  }

  private requireConnection(transportId: string) {
    const connection = this.session.getConnection(transportId);
    if (connection === null) {
      throw new Error('Hosted connection is unavailable.');
    }
    return connection;
  }

  private envelope(
    transportId: string,
    messageType: Parameters<HostedSession['nextServerEnvelope']>[1],
    payload: JsonValue,
  ): HostedOutboundMessage | null {
    const envelope = this.session.nextServerEnvelope(
      transportId,
      messageType,
      this.authorityTick,
      payload,
    );
    return envelope === null
      ? null
      : Object.freeze({ transportId, envelope });
  }

  private broadcastReady(
    messageType: Parameters<HostedSession['nextServerEnvelope']>[1],
    payload: JsonValue,
  ): readonly HostedOutboundMessage[] {
    return Object.freeze(
      this.session.getReadyConnections()
        .map((connection) =>
          this.envelope(connection.transportId, messageType, payload),
        )
        .filter(
          (entry): entry is HostedOutboundMessage => entry !== null,
        ),
    );
  }

  private broadcastLive(
    messageType: Parameters<HostedSession['nextServerEnvelope']>[1],
    payload: JsonValue,
  ): readonly HostedOutboundMessage[] {
    return Object.freeze(
      this.session.getLiveConnections()
        .map((connection) =>
          this.envelope(connection.transportId, messageType, payload),
        )
        .filter(
          (entry): entry is HostedOutboundMessage => entry !== null,
        ),
    );
  }

  private singleConnectionError(
    transportId: string,
    reason: string,
  ): readonly HostedOutboundMessage[] {
    const message = this.envelope(
      transportId,
      'ERROR',
      asJson({ reason }),
    );
    return message === null
      ? Object.freeze([])
      : Object.freeze([message]);
  }

  private singleUnauthenticatedError(
    transportId: string,
    reason: string,
  ): readonly HostedOutboundMessage[] {
    const envelope: ServerEnvelopeV1 = Object.freeze({
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'ERROR',
      serverMessageSeq: 1,
      sessionId: this.session.sessionId,
      sessionEpoch: this.session.sessionEpoch,
      authorityTick: this.authorityTick,
      payload: asJson({ reason }),
    });
    return Object.freeze([
      Object.freeze({ transportId, envelope }),
    ]);
  }

  private singleUnauthenticatedRejection(
    transportId: string,
    reason: string,
  ): readonly HostedOutboundMessage[] {
    const envelope: ServerEnvelopeV1 = Object.freeze({
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType: 'SESSION_REJECTED',
      serverMessageSeq: 1,
      sessionId: this.session.sessionId,
      sessionEpoch: this.session.sessionEpoch,
      authorityTick: this.authorityTick,
      payload: asJson({ reason }),
    });
    return Object.freeze([
      Object.freeze({ transportId, envelope }),
    ]);
  }
}
