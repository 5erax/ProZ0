import {
  HOSTED_PROTOCOL_VERSION,
  serializeClientEnvelopeV1,
  validateBaselineSnapshotV1,
  validatePlayerMotionViewV1,
  type ClientEnvelopeV1,
  type ClientHelloV1,
  type CommandResultV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type MovementInputV1,
  type OperationStatusV1,
  type PlayerMotionViewV1,
  type RevisionedAggregateViewV1,
} from '../../protocol';
import { ClientReplicationStore } from './ClientReplicationStore';
import { parseHostedServerEnvelope } from './HostedServerValidation';

export interface HostedClientTransport {
  sendText(text: string): void;
  close(): void;
}

export type HostedClientState =
  | 'DISCONNECTED'
  | 'HANDSHAKING'
  | 'BASELINING'
  | 'READY'
  | 'RESYNC_REQUIRED'
  | 'CLOSED';

export interface HostedClientConnectionOptions {
  readonly transport: HostedClientTransport;
  readonly hello: ClientHelloV1;
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

export class HostedClientConnection {
  public readonly replication = new ClientReplicationStore();

  private state: HostedClientState = 'DISCONNECTED';
  private clientMessageSeq = 0;
  private movementInputSeq = 0;
  private lastServerMessageSeq = 0;
  private sessionId: string | null = null;
  private sessionEpoch: string | null = null;
  private connectionId: string | null = null;
  private playerId: string | null = null;
  private worldId: string | null = null;
  private resumeCredential: string | null;
  private pendingSnapshotId: string | null = null;
  private readonly commandResults = new Map<string, CommandResultV1>();
  private readonly playerMotions = new Map<string, PlayerMotionViewV1>();
  private readonly readModelListeners = new Set<() => void>();
  private readonly operationStatuses =
    new Map<string, OperationStatusV1>();
  private durableSaveRevision: number | null = null;
  private rttMs: number | null = null;
  private sessionClosingStatus: 'SUCCESS' | 'SAVE_FAILED' | null = null;

  public constructor(private readonly options: HostedClientConnectionOptions) {
    this.resumeCredential = options.hello.resumeCredential ?? null;
  }

  public start(): void {
    if (this.state !== 'DISCONNECTED') {
      throw new Error('Hosted client may start only from DISCONNECTED.');
    }
    this.state = 'HANDSHAKING';
    this.send('CLIENT_HELLO', asJson(this.options.hello), false);
  }

  public handleText(text: string): void {
    this.applyServerText(text);
    this.notifyReadModelListeners();
  }

  private applyServerText(text: string): void {
    if (this.state === 'CLOSED' || this.state === 'RESYNC_REQUIRED') return;
    const envelope = parseHostedServerEnvelope(text);
    if (envelope === null) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }

    if (
      envelope.serverMessageSeq !== this.lastServerMessageSeq + 1
    ) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }
    if (
      this.sessionId !== null
      && (
        envelope.sessionId !== this.sessionId
        || envelope.sessionEpoch !== this.sessionEpoch
      )
    ) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }

    const terminalResponse = ['ERROR', 'SESSION_REJECTED', 'RESYNC_REQUIRED', 'SESSION_CLOSING'].includes(envelope.messageType);
    if (
      this.state === 'DISCONNECTED'
      || (envelope.messageType === 'SESSION_ACCEPTED' && this.state !== 'HANDSHAKING')
      || (envelope.messageType === 'BASELINE_SNAPSHOT' && this.state !== 'BASELINING')
      || (!terminalResponse && !['SESSION_ACCEPTED', 'BASELINE_SNAPSHOT'].includes(envelope.messageType) && this.state !== 'READY')
      || (envelope.messageType === 'SESSION_REJECTED' && this.state !== 'HANDSHAKING')
    ) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }
    this.lastServerMessageSeq = envelope.serverMessageSeq;

    switch (envelope.messageType) {
      case 'SESSION_ACCEPTED': {
        const payload = envelope.payload as unknown as {
          readonly playerId: string;
          readonly worldId: string;
          readonly connectionId: string;
          readonly resumeCredential: string;
          readonly snapshotId: string;
        };
        this.sessionId = envelope.sessionId;
        this.sessionEpoch = envelope.sessionEpoch;
        this.playerId = payload.playerId;
        this.worldId = payload.worldId;
        this.connectionId = payload.connectionId;
        this.resumeCredential = payload.resumeCredential;
        this.pendingSnapshotId = payload.snapshotId;
        this.state = 'BASELINING';
        break;
      }

      case 'SESSION_REJECTED':
      case 'ERROR':
        if (this.state !== 'READY') {
          this.state = 'CLOSED';
        }
        break;

      case 'BASELINE_SNAPSHOT': {
        if (this.state !== 'BASELINING') {
          this.state = 'RESYNC_REQUIRED';
          break;
        }
        const validatedBaseline =
          validateBaselineSnapshotV1(envelope.payload);
        if (!validatedBaseline.ok) {
          this.state = 'RESYNC_REQUIRED';
          break;
        }
        const baseline = validatedBaseline.value;
        if (
          baseline.snapshotId !== this.pendingSnapshotId
          || baseline.sessionEpoch !== this.sessionEpoch
          || baseline.playerId !== this.playerId
          || baseline.worldId !== this.worldId
          || baseline.authorityTick !== envelope.authorityTick
          || Object.entries(this.options.hello.contentCompatibility).some(
            ([key, value]) => baseline.contentCompatibility[key as keyof typeof baseline.contentCompatibility] !== value,
          )
          || new Set(baseline.players.map(player => player.playerId)).size !== baseline.players.length
          || new Set(baseline.aggregates.map(view => `${view.aggregateType}\u0000${view.aggregateId}`)).size !== baseline.aggregates.length
        ) {
          this.state = 'RESYNC_REQUIRED';
          break;
        }
        this.replication.applyBaseline(baseline);
        this.durableSaveRevision = baseline.durableSaveRevision;
        this.playerMotions.clear();
        for (const motion of baseline.players) {
          this.playerMotions.set(
            motion.playerId,
            Object.freeze({
              ...motion,
              position: Object.freeze({ ...motion.position }),
            }),
          );
        }
        this.send(
          'BASELINE_APPLIED',
          asJson({ snapshotId: baseline.snapshotId }),
          true,
        );
        this.pendingSnapshotId = null;
        this.state = 'READY';
        break;
      }

      case 'PLAYER_MOTION': {
        const validatedMotion =
          validatePlayerMotionViewV1(envelope.payload);
        if (validatedMotion.ok) {
          const motion = validatedMotion.value;
          if (motion.authorityTick > envelope.authorityTick) break;
          const previous = this.playerMotions.get(motion.playerId);
          if (previous !== undefined && motion.authorityTick < previous.authorityTick) break;
          this.playerMotions.set(
            motion.playerId,
            Object.freeze({
              ...motion,
              position: Object.freeze({ ...motion.position }),
            }),
          );
        }
        break;
      }

      case 'COMMAND_RESULT': {
        const result = envelope.payload as unknown as CommandResultV1;
        const frozen = Object.freeze({ ...result });
        this.commandResults.set(result.operationId, frozen);
        this.operationStatuses.set(result.operationId, Object.freeze({
          operationId: result.operationId,
          state: 'resolved',
          result: frozen,
        }));
        break;
      }

      case 'OPERATION_STATUS': {
        const status =
          envelope.payload as unknown as OperationStatusV1;
        this.operationStatuses.set(
          status.operationId,
          Object.freeze({ ...status }),
        );
        if (status.state === 'resolved') {
          this.commandResults.set(
            status.result.operationId,
            Object.freeze({ ...status.result }),
          );
        }
        break;
      }

      case 'AGGREGATE_UPDATE':
        this.replication.applyAggregate(
          envelope.payload as unknown as RevisionedAggregateViewV1,
        );
        break;

      case 'PONG': {
        const payload = envelope.payload as unknown as {
          readonly clientSentAtMs: number;
        };
        this.rttMs = Math.max(0, Date.now() - payload.clientSentAtMs);
        break;
      }

      case 'DURABILITY_CHECKPOINT': {
        const checkpoint = envelope.payload as unknown as {
          readonly durableSaveRevision: number;
        };
        this.durableSaveRevision = Math.max(this.durableSaveRevision ?? 0, checkpoint.durableSaveRevision);
        break;
      }

      case 'RESYNC_REQUIRED':
        this.state = 'RESYNC_REQUIRED';
        break;

      case 'SESSION_CLOSING': {
        const payload = envelope.payload as unknown as {
          readonly saveStatus: 'SUCCESS' | 'SAVE_FAILED';
        };
        this.sessionClosingStatus = payload.saveStatus;
        this.state = 'CLOSED';
        break;
      }

      case 'AUTHORITY_CHECKPOINT':
        break;
    }
    if (this.state !== 'RESYNC_REQUIRED') {
      this.replication.setAuthorityTick(envelope.authorityTick);
    }
  }

  public sendMovement(input: Omit<MovementInputV1, 'inputSeq'>): void {
    this.assertReady();
    this.movementInputSeq += 1;
    this.send('MOVEMENT_INPUT', asJson({
      inputSeq: this.movementInputSeq,
      ...input,
    }), true);
  }

  public sendGameplayCommand(
    command: GameplayCommandEnvelopeV1,
  ): void {
    this.assertReady();
    this.send('GAMEPLAY_COMMAND', asJson(command), true);
  }

  public queryOperation(operationId: string): void {
    this.assertReady();
    this.send(
      'OPERATION_STATUS_QUERY',
      asJson({ operationId }),
      true,
    );
  }

  public ping(pingId: string): void {
    if (this.connectionId === null) {
      throw new Error('Hosted client is not connected.');
    }
    this.send('PING', asJson({
      pingId,
      clientSentAtMs: Date.now(),
    }), true);
  }

  public leave(): void {
    if (this.connectionId !== null && this.state === 'READY') {
      this.send('LEAVE_SESSION', asJson({}), true);
    }
    this.options.transport.close();
    this.state = 'CLOSED';
  }

  public getState(): HostedClientState {
    return this.state;
  }

  public getPlayerId(): string | null {
    return this.playerId;
  }

  public getConnectionId(): string | null {
    return this.connectionId;
  }

  public getSessionEpoch(): string | null {
    return this.sessionEpoch;
  }

  public getResumeCredential(): string | null {
    return this.resumeCredential;
  }

  public getPlayerMotions(): readonly Readonly<PlayerMotionViewV1>[] {
    return Object.freeze(
      [...this.playerMotions.values()]
        .sort((left, right) => left.playerId.localeCompare(right.playerId)),
    );
  }

  public subscribeReadModel(listener: () => void): () => void {
    this.readModelListeners.add(listener);
    return () => {
      this.readModelListeners.delete(listener);
    };
  }

  public getCommandResult(operationId: string): CommandResultV1 | null {
    return this.commandResults.get(operationId) ?? null;
  }

  public getOperationStatus(
    operationId: string,
  ): OperationStatusV1 | null {
    return this.operationStatuses.get(operationId) ?? null;
  }

  public getDurableSaveRevision(): number | null {
    return this.durableSaveRevision;
  }

  public getRttMs(): number | null {
    return this.rttMs;
  }

  public getSessionClosingStatus(): 'SUCCESS' | 'SAVE_FAILED' | null {
    return this.sessionClosingStatus;
  }

  private notifyReadModelListeners(): void {
    for (const listener of this.readModelListeners) {
      listener();
    }
  }

  private send(
    messageType: ClientEnvelopeV1['messageType'],
    payload: JsonValue,
    bound: boolean,
  ): void {
    const envelope: ClientEnvelopeV1 = Object.freeze({
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      messageType,
      clientMessageSeq: this.clientMessageSeq,
      ...(bound && this.sessionId !== null
        ? { sessionId: this.sessionId }
        : {}),
      ...(bound && this.connectionId !== null
        ? { connectionId: this.connectionId }
        : {}),
      payload,
    });
    this.clientMessageSeq += 1;
    this.options.transport.sendText(serializeClientEnvelopeV1(envelope));
  }

  private assertReady(): void {
    if (this.state !== 'READY') {
      throw new Error('Hosted client is not READY.');
    }
  }
}
