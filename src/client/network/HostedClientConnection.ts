import {
  HOSTED_PROTOCOL_VERSION,
  serializeClientEnvelopeV1,
  type BaselineSnapshotV1,
  type ClientEnvelopeV1,
  type ClientHelloV1,
  type CommandResultV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type MovementInputV1,
  type RevisionedAggregateViewV1,
  type ServerEnvelopeV1,
} from '../../protocol';
import { ClientReplicationStore } from './ClientReplicationStore';

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

function parseServerEnvelope(text: string): ServerEnvelopeV1 | null {
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (
    typeof input !== 'object'
    || input === null
    || Array.isArray(input)
  ) {
    return null;
  }
  const value = input as Partial<ServerEnvelopeV1>;
  if (
    value.protocolVersion !== HOSTED_PROTOCOL_VERSION
    || typeof value.messageType !== 'string'
    || !Number.isSafeInteger(value.serverMessageSeq)
    || typeof value.sessionId !== 'string'
    || typeof value.sessionEpoch !== 'string'
    || !Number.isSafeInteger(value.authorityTick)
  ) {
    return null;
  }
  return value as ServerEnvelopeV1;
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
  private resumeCredential: string | null;
  private pendingSnapshotId: string | null = null;
  private readonly commandResults = new Map<string, CommandResultV1>();
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
    const envelope = parseServerEnvelope(text);
    if (envelope === null) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }

    if (
      this.lastServerMessageSeq !== 0
      && envelope.serverMessageSeq !== this.lastServerMessageSeq + 1
    ) {
      this.state = 'RESYNC_REQUIRED';
      return;
    }
    this.lastServerMessageSeq = envelope.serverMessageSeq;
    this.replication.setAuthorityTick(envelope.authorityTick);

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

    switch (envelope.messageType) {
      case 'SESSION_ACCEPTED': {
        const payload = envelope.payload as unknown as {
          readonly playerId: string;
          readonly connectionId: string;
          readonly resumeCredential: string;
          readonly snapshotId: string;
        };
        this.sessionId = envelope.sessionId;
        this.sessionEpoch = envelope.sessionEpoch;
        this.playerId = payload.playerId;
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
        const baseline = envelope.payload as unknown as BaselineSnapshotV1;
        if (
          baseline.snapshotId !== this.pendingSnapshotId
          || baseline.sessionEpoch !== this.sessionEpoch
          || baseline.playerId !== this.playerId
        ) {
          this.state = 'RESYNC_REQUIRED';
          break;
        }
        this.replication.applyBaseline(baseline);
        this.send(
          'BASELINE_APPLIED',
          asJson({ snapshotId: baseline.snapshotId }),
          true,
        );
        this.pendingSnapshotId = null;
        this.state = 'READY';
        break;
      }

      case 'PLAYER_MOTION':
        break;

      case 'COMMAND_RESULT': {
        const result = envelope.payload as unknown as CommandResultV1;
        this.commandResults.set(result.operationId, Object.freeze({
          ...result,
        }));
        break;
      }

      case 'OPERATION_STATUS': {
        const status = envelope.payload as unknown as {
          readonly known: boolean;
          readonly result?: CommandResultV1;
        };
        if (status.known && status.result !== undefined) {
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
        this.durableSaveRevision = checkpoint.durableSaveRevision;
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

  public getCommandResult(operationId: string): CommandResultV1 | null {
    return this.commandResults.get(operationId) ?? null;
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
