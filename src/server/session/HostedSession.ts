import type {
  ClientEnvelopeV1,
  ClientHelloV1,
  ContentCompatibilityIdentityV1Wire,
  MovementInputV1,
  ServerEnvelopeV1,
  ServerMessageTypeV1,
  SessionRejectionReasonV1,
  WorldCompatibilityV1,
  JsonValue,
} from '../../protocol';

export type HostedSessionState =
  | 'STARTING'
  | 'OPEN'
  | 'DRAINING'
  | 'SAVING'
  | 'CLOSED'
  | 'FAILED';

export type HostedConnectionState =
  | 'BASELINING'
  | 'READY'
  | 'DISCONNECTED';

export interface HostedSessionConfig {
  readonly worldId: string;
  readonly maxPlayers: number;
  readonly contentCompatibility: ContentCompatibilityIdentityV1Wire;
  readonly worldCompatibility: WorldCompatibilityV1;
  readonly sessionId?: string;
  readonly sessionEpoch?: string;
  readonly idFactory?: () => string;
  readonly resumeCredentialFactory?: () => string;
  readonly initialResumeBindings?: ReadonlyMap<string, string>;
}

export interface HostedConnection {
  readonly transportId: string;
  readonly connectionId: string;
  readonly playerId: string;
  readonly state: HostedConnectionState;
  readonly snapshotId: string;
  readonly lastClientMessageSeq: number;
  readonly lastServerMessageSeq: number;
  readonly lastMovementInputSeq: number;
  readonly lastMovementInputTick: number;
  readonly movement: MovementInputV1;
}

interface MutableConnection {
  transportId: string;
  connectionId: string;
  playerId: string;
  state: HostedConnectionState;
  snapshotId: string;
  lastClientMessageSeq: number;
  lastServerMessageSeq: number;
  lastMovementInputSeq: number;
  lastMovementInputTick: number;
  movement: MovementInputV1;
}

export type JoinResult =
  | {
      readonly accepted: true;
      readonly connection: HostedConnection;
      readonly resumeCredential: string;
      readonly resumed: boolean;
    }
  | {
      readonly accepted: false;
      readonly reason: SessionRejectionReasonV1;
    };

const NEUTRAL_MOVEMENT: MovementInputV1 = Object.freeze({
  inputSeq: 0,
  up: false,
  down: false,
  left: false,
  right: false,
});

function sameContent(
  left: ContentCompatibilityIdentityV1Wire,
  right: ContentCompatibilityIdentityV1Wire,
): boolean {
  return left.formatId === right.formatId
    && left.schemaVersion === right.schemaVersion
    && left.packId === right.packId
    && left.packVersion === right.packVersion
    && left.canonicalFingerprint === right.canonicalFingerprint;
}

function sameWorld(
  left: WorldCompatibilityV1,
  right: WorldCompatibilityV1,
): boolean {
  return left.worldGenerationVersion === right.worldGenerationVersion
    && left.rngAlgorithmVersion === right.rngAlgorithmVersion
    && left.seedDerivationVersion === right.seedDerivationVersion;
}

function randomHex(bytes = 16): string {
  const values = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(values);
  return [...values]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function copyMovement(input: MovementInputV1): MovementInputV1 {
  return Object.freeze({ ...input });
}

function freezeConnection(connection: MutableConnection): HostedConnection {
  return Object.freeze({
    ...connection,
    movement: copyMovement(connection.movement),
  });
}

export class HostedSession {
  public readonly sessionId: string;
  public readonly sessionEpoch: string;

  private state: HostedSessionState = 'STARTING';
  private readonly connectionsByTransport = new Map<string, MutableConnection>();
  private readonly activeTransportByPlayer = new Map<string, string>();
  private readonly resumeToPlayer = new Map<string, string>();
  private readonly playerToResume = new Map<string, string>();
  private nextPlayerOrdinal = 1;

  public constructor(private readonly config: HostedSessionConfig) {
    if (
      !Number.isSafeInteger(config.maxPlayers)
      || config.maxPlayers < 2
      || config.maxPlayers > 10
    ) {
      throw new RangeError('Hosted maxPlayers must be an integer from 2 through 10.');
    }

    const idFactory = config.idFactory ?? (() => randomHex(12));
    this.sessionId = config.sessionId ?? `session:${idFactory()}`;
    this.sessionEpoch = config.sessionEpoch ?? `epoch:${idFactory()}`;

    for (const [credential, playerId] of config.initialResumeBindings ?? []) {
      if (credential.length === 0 || playerId.length === 0) {
        throw new Error('Initial resume binding is invalid.');
      }
      this.resumeToPlayer.set(credential, playerId);
      this.playerToResume.set(playerId, credential);
      this.bumpPlayerOrdinal(playerId);
    }
  }

  public getState(): HostedSessionState {
    return this.state;
  }

  public getMaxPlayers(): number {
    return this.config.maxPlayers;
  }

  public getWorldId(): string {
    return this.config.worldId;
  }

  public getContentCompatibility(): ContentCompatibilityIdentityV1Wire {
    return Object.freeze({ ...this.config.contentCompatibility });
  }

  public getWorldCompatibility(): WorldCompatibilityV1 {
    return Object.freeze({ ...this.config.worldCompatibility });
  }

  public open(): void {
    if (this.state !== 'STARTING') {
      throw new Error('Hosted session may open only from STARTING.');
    }
    this.state = 'OPEN';
  }

  public beginDraining(): void {
    if (this.state !== 'OPEN') {
      throw new Error('Hosted session may drain only from OPEN.');
    }
    this.state = 'DRAINING';
    for (const connection of this.connectionsByTransport.values()) {
      connection.movement = Object.freeze({
        ...NEUTRAL_MOVEMENT,
        inputSeq: connection.lastMovementInputSeq,
      });
    }
  }

  public beginSaving(): void {
    if (this.state !== 'DRAINING') {
      throw new Error('Hosted session may save only from DRAINING.');
    }
    this.state = 'SAVING';
  }

  public close(): void {
    if (this.state !== 'SAVING') {
      throw new Error('Hosted session may close only from SAVING.');
    }
    this.state = 'CLOSED';
  }

  public fail(): void {
    if (this.state === 'CLOSED') {
      throw new Error('Closed hosted session cannot transition to FAILED.');
    }
    this.state = 'FAILED';
  }

  public join(
    transportId: string,
    clientMessageSeq: number,
    hello: ClientHelloV1,
    authorityTick: number,
  ): JoinResult {
    if (this.state === 'STARTING') {
      return Object.freeze({ accepted: false, reason: 'SERVER_STARTING' });
    }
    if (this.state !== 'OPEN') {
      return Object.freeze({ accepted: false, reason: 'SESSION_CLOSING' });
    }
    if (!sameContent(
      hello.contentCompatibility,
      this.config.contentCompatibility,
    )) {
      return Object.freeze({ accepted: false, reason: 'CONTENT_MISMATCH' });
    }
    if (!sameWorld(
      hello.worldCompatibility,
      this.config.worldCompatibility,
    )) {
      return Object.freeze({
        accepted: false,
        reason: 'WORLD_GENERATION_MISMATCH',
      });
    }

    let playerId: string;
    let resumeCredential: string;
    let resumed = false;

    if (hello.resumeCredential !== undefined) {
      const boundPlayer = this.resumeToPlayer.get(hello.resumeCredential);
      if (boundPlayer === undefined) {
        return Object.freeze({
          accepted: false,
          reason: 'INVALID_RESUME_CREDENTIAL',
        });
      }
      if (this.activeTransportByPlayer.has(boundPlayer)) {
        return Object.freeze({
          accepted: false,
          reason: 'PLAYER_ALREADY_CONNECTED',
        });
      }
      playerId = boundPlayer;
      resumeCredential = hello.resumeCredential;
      resumed = true;
    } else {
      if (this.activeTransportByPlayer.size >= this.config.maxPlayers) {
        return Object.freeze({ accepted: false, reason: 'SESSION_FULL' });
      }
      playerId = this.allocatePlayerId();
      resumeCredential = this.issueResumeCredential(playerId);
    }

    if (this.connectionsByTransport.has(transportId)) {
      return Object.freeze({ accepted: false, reason: 'INVALID_HELLO' });
    }

    const idFactory = this.config.idFactory ?? (() => randomHex(12));
    const connection: MutableConnection = {
      transportId,
      connectionId: `connection:${idFactory()}`,
      playerId,
      state: 'BASELINING',
      snapshotId: `snapshot:${idFactory()}`,
      lastClientMessageSeq: clientMessageSeq,
      lastServerMessageSeq: 0,
      lastMovementInputSeq: -1,
      lastMovementInputTick: authorityTick,
      movement: NEUTRAL_MOVEMENT,
    };
    this.connectionsByTransport.set(transportId, connection);
    this.activeTransportByPlayer.set(playerId, transportId);

    return Object.freeze({
      accepted: true,
      connection: freezeConnection(connection),
      resumeCredential,
      resumed,
    });
  }

  public acceptClientEnvelope(
    transportId: string,
    envelope: ClientEnvelopeV1,
  ): 'OK' | 'INVALID_CONNECTION' | 'CLIENT_SEQUENCE_STALE' {
    const connection = this.connectionsByTransport.get(transportId);
    if (
      connection === undefined
      || connection.state === 'DISCONNECTED'
      || envelope.sessionId !== this.sessionId
      || envelope.connectionId !== connection.connectionId
    ) {
      return 'INVALID_CONNECTION';
    }
    if (envelope.clientMessageSeq <= connection.lastClientMessageSeq) {
      return 'CLIENT_SEQUENCE_STALE';
    }
    connection.lastClientMessageSeq = envelope.clientMessageSeq;
    return 'OK';
  }

  public markBaselineApplied(
    transportId: string,
    snapshotId: string,
  ): boolean {
    const connection = this.connectionsByTransport.get(transportId);
    if (
      connection === undefined
      || connection.state !== 'BASELINING'
      || connection.snapshotId !== snapshotId
    ) {
      return false;
    }
    connection.state = 'READY';
    return true;
  }

  public acceptMovement(
    transportId: string,
    input: MovementInputV1,
    authorityTick: number,
  ): 'OK' | 'NOT_READY' | 'INPUT_SEQUENCE_STALE' {
    const connection = this.connectionsByTransport.get(transportId);
    if (connection === undefined || connection.state !== 'READY') {
      return 'NOT_READY';
    }
    if (input.inputSeq <= connection.lastMovementInputSeq) {
      return 'INPUT_SEQUENCE_STALE';
    }
    connection.lastMovementInputSeq = input.inputSeq;
    connection.lastMovementInputTick = authorityTick;
    connection.movement = copyMovement(input);
    return 'OK';
  }

  public neutralizeExpiredMovement(
    authorityTick: number,
    leaseTicks: number,
  ): readonly HostedConnection[] {
    const expired: HostedConnection[] = [];
    for (const connection of this.connectionsByTransport.values()) {
      if (
        connection.state === 'READY'
        && (
          connection.movement.up
          || connection.movement.down
          || connection.movement.left
          || connection.movement.right
        )
        && authorityTick - connection.lastMovementInputTick >= leaseTicks
      ) {
        connection.movement = Object.freeze({
          ...NEUTRAL_MOVEMENT,
          inputSeq: connection.lastMovementInputSeq,
        });
        expired.push(freezeConnection(connection));
      }
    }
    return Object.freeze(expired);
  }

  public disconnect(transportId: string): HostedConnection | null {
    const connection = this.connectionsByTransport.get(transportId);
    if (connection === undefined || connection.state === 'DISCONNECTED') {
      return null;
    }
    connection.state = 'DISCONNECTED';
    connection.movement = Object.freeze({
      ...NEUTRAL_MOVEMENT,
      inputSeq: connection.lastMovementInputSeq,
    });
    this.activeTransportByPlayer.delete(connection.playerId);
    return freezeConnection(connection);
  }

  public getConnection(transportId: string): HostedConnection | null {
    const connection = this.connectionsByTransport.get(transportId);
    return connection === undefined ? null : freezeConnection(connection);
  }

  public getReadyConnections(): readonly HostedConnection[] {
    return Object.freeze(
      [...this.connectionsByTransport.values()]
        .filter((connection) => connection.state === 'READY')
        .map(freezeConnection),
    );
  }

  public getLiveConnections(): readonly HostedConnection[] {
    return Object.freeze(
      [...this.connectionsByTransport.values()]
        .filter((connection) => connection.state !== 'DISCONNECTED')
        .map(freezeConnection),
    );
  }

  public nextServerEnvelope(
    transportId: string,
    messageType: ServerMessageTypeV1,
    authorityTick: number,
    payload: JsonValue,
  ): ServerEnvelopeV1 | null {
    const connection = this.connectionsByTransport.get(transportId);
    if (connection === undefined || connection.state === 'DISCONNECTED') {
      return null;
    }
    connection.lastServerMessageSeq += 1;
    return Object.freeze({
      protocolVersion: 1,
      messageType,
      serverMessageSeq: connection.lastServerMessageSeq,
      sessionId: this.sessionId,
      sessionEpoch: this.sessionEpoch,
      authorityTick,
      payload,
    });
  }

  public diagnostics(): {
    readonly state: HostedSessionState;
    readonly connectedPlayers: number;
    readonly readyPlayers: number;
    readonly maxPlayers: number;
    readonly connections: readonly {
      readonly connectionId: string;
      readonly playerId: string;
      readonly state: HostedConnectionState;
      readonly lastClientMessageSeq: number;
      readonly lastServerMessageSeq: number;
      readonly lastMovementInputSeq: number;
    }[];
  } {
    const live = this.getLiveConnections();
    return Object.freeze({
      state: this.state,
      connectedPlayers: live.length,
      readyPlayers: live.filter((entry) => entry.state === 'READY').length,
      maxPlayers: this.config.maxPlayers,
      connections: Object.freeze(live.map((entry) => Object.freeze({
        connectionId: entry.connectionId,
        playerId: entry.playerId,
        state: entry.state,
        lastClientMessageSeq: entry.lastClientMessageSeq,
        lastServerMessageSeq: entry.lastServerMessageSeq,
        lastMovementInputSeq: entry.lastMovementInputSeq,
      }))),
    });
  }

  public exportResumeBindings(): ReadonlyMap<string, string> {
    return new Map(this.resumeToPlayer);
  }

  private allocatePlayerId(): string {
    let playerId = `player:${this.nextPlayerOrdinal}`;
    while (this.playerToResume.has(playerId)) {
      this.nextPlayerOrdinal += 1;
      playerId = `player:${this.nextPlayerOrdinal}`;
    }
    this.nextPlayerOrdinal += 1;
    return playerId;
  }

  private issueResumeCredential(playerId: string): string {
    const factory = this.config.resumeCredentialFactory
      ?? (() => `resume:${randomHex(24)}`);
    let credential = factory();
    while (this.resumeToPlayer.has(credential)) {
      credential = factory();
    }
    if (credential.length === 0) {
      throw new Error('Resume credential factory produced an empty credential.');
    }
    this.resumeToPlayer.set(credential, playerId);
    this.playerToResume.set(playerId, credential);
    return credential;
  }

  private bumpPlayerOrdinal(playerId: string): void {
    const match = /^player:(\d+)$/.exec(playerId);
    if (match === null) return;
    const parsed = Number(match[1]);
    if (Number.isSafeInteger(parsed) && parsed >= this.nextPlayerOrdinal) {
      this.nextPlayerOrdinal = parsed + 1;
    }
  }
}
