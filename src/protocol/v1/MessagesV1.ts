export const HOSTED_PROTOCOL_VERSION = 1 as const;
export const MOVEMENT_INPUT_REFRESH_MAX_TICKS = 15 as const;
export const MOVEMENT_INPUT_LEASE_TICKS = 60 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ClientMessageTypeV1 =
  | 'CLIENT_HELLO'
  | 'BASELINE_APPLIED'
  | 'MOVEMENT_INPUT'
  | 'GAMEPLAY_COMMAND'
  | 'OPERATION_STATUS_QUERY'
  | 'PING'
  | 'CLIENT_CHECKPOINT'
  | 'LEAVE_SESSION';

export type ServerMessageTypeV1 =
  | 'SESSION_ACCEPTED'
  | 'SESSION_REJECTED'
  | 'BASELINE_SNAPSHOT'
  | 'PLAYER_MOTION'
  | 'COMMAND_RESULT'
  | 'OPERATION_STATUS'
  | 'AGGREGATE_UPDATE'
  | 'PONG'
  | 'AUTHORITY_CHECKPOINT'
  | 'DURABILITY_CHECKPOINT'
  | 'RESYNC_REQUIRED'
  | 'SESSION_CLOSING'
  | 'ERROR';

export interface ClientEnvelopeV1 {
  readonly protocolVersion: typeof HOSTED_PROTOCOL_VERSION;
  readonly messageType: ClientMessageTypeV1;
  readonly clientMessageSeq: number;
  readonly sessionId?: string;
  readonly connectionId?: string;
  readonly payload: JsonValue;
}

export interface ServerEnvelopeV1 {
  readonly protocolVersion: typeof HOSTED_PROTOCOL_VERSION;
  readonly messageType: ServerMessageTypeV1;
  readonly serverMessageSeq: number;
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly payload: JsonValue;
}

export interface ContentCompatibilityIdentityV1Wire {
  readonly formatId: string;
  readonly schemaVersion: number;
  readonly packId: string;
  readonly packVersion: string;
  readonly canonicalFingerprint: string;
}

export interface WorldCompatibilityV1 {
  readonly worldGenerationVersion: number;
  readonly rngAlgorithmVersion: string;
  readonly seedDerivationVersion: string;
}

export interface ClientHelloV1 {
  readonly protocolVersion: typeof HOSTED_PROTOCOL_VERSION;
  readonly clientBuild?: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1Wire;
  readonly worldCompatibility: WorldCompatibilityV1;
  readonly resumeCredential?: string;
}

export type SessionRejectionReasonV1 =
  | 'PROTOCOL_MISMATCH'
  | 'CONTENT_MISMATCH'
  | 'WORLD_GENERATION_MISMATCH'
  | 'SERVER_STARTING'
  | 'SESSION_CLOSING'
  | 'SESSION_FULL'
  | 'INVALID_RESUME_CREDENTIAL'
  | 'PLAYER_ALREADY_CONNECTED'
  | 'PLAYER_STATE_UNAVAILABLE'
  | 'INVALID_HELLO';

export interface SessionAcceptedV1 {
  readonly worldId: string;
  readonly playerId: string;
  readonly connectionId: string;
  readonly resumeCredential: string;
  readonly snapshotId: string;
  readonly maxPlayers: number;
}

export interface SessionRejectedV1 {
  readonly reason: SessionRejectionReasonV1;
}

export interface BaselineAppliedV1 {
  readonly snapshotId: string;
}

export interface MovementInputV1 {
  readonly inputSeq: number;
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

export interface ExpectedRevisionV1 {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
}

export interface GameplayCommandEnvelopeV1 {
  readonly operationId: string;
  readonly commandType: string;
  readonly expectedRevisions: readonly ExpectedRevisionV1[];
  readonly payload: JsonValue;
}

export interface RevisionRefV1 {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
}

export interface CommandResultV1 {
  readonly operationId: string;
  readonly status: 'committed' | 'rejected';
  readonly acceptedAuthorityTick: number;
  readonly committedAuthorityTick?: number;
  readonly authorityIngressOrdinal: number;
  readonly reason?: string;
  readonly resultingRevisions?: readonly RevisionRefV1[];
}

export interface OperationStatusQueryV1 {
  readonly operationId: string;
}

export interface OperationStatusV1 {
  readonly operationId: string;
  readonly known: boolean;
  readonly result?: CommandResultV1;
}

export interface PlayerMotionViewV1 {
  readonly playerId: string;
  readonly authorityTick: number;
  readonly lastProcessedInputSeq: number;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly facing: string | null;
  readonly locomotionState: string;
}

export interface RevisionedAggregateViewV1 {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
  readonly tombstone: boolean;
  readonly state: JsonValue;
}

export interface BaselineSnapshotV1 {
  readonly snapshotId: string;
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly worldId: string;
  readonly playerId: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1Wire;
  readonly durableSaveRevision: number | null;
  readonly players: readonly PlayerMotionViewV1[];
  readonly aggregates: readonly RevisionedAggregateViewV1[];
}

export interface DurabilityCheckpointV1Wire {
  readonly authorityTick: number;
  readonly durableSaveRevision: number;
}

export interface PingV1 {
  readonly pingId: string;
  readonly clientSentAtMs: number;
}

export interface PongV1 {
  readonly pingId: string;
  readonly clientSentAtMs: number;
}

export interface ClientCheckpointV1 {
  readonly lastAppliedServerMessageSeq: number;
  readonly lastAppliedAuthorityTick: number;
  readonly aggregateRevisions: readonly RevisionRefV1[];
  readonly stateDigest?: string;
}

export interface AuthorityCheckpointV1 {
  readonly authorityTick: number;
  readonly aggregateRevisions: readonly RevisionRefV1[];
  readonly stateDigest?: string;
}

export interface ResyncRequiredV1 {
  readonly reason:
    | 'SERVER_SEQUENCE_GAP'
    | 'AGGREGATE_REVISION_GAP'
    | 'STATE_DIGEST_MISMATCH'
    | 'SLOW_CLIENT';
}

export interface SessionClosingV1 {
  readonly saveStatus: 'SUCCESS' | 'SAVE_FAILED';
  readonly durableSaveRevision?: number;
  readonly reason?: string;
}

export interface ProtocolErrorV1 {
  readonly reason:
    | 'INVALID_MESSAGE'
    | 'PROTOCOL_MISMATCH'
    | 'NOT_READY'
    | 'SESSION_FULL'
    | 'SESSION_CLOSING'
    | 'INVALID_CONNECTION'
    | 'INVALID_RESUME_CREDENTIAL'
    | 'PLAYER_ALREADY_CONNECTED'
    | 'CLIENT_SEQUENCE_STALE'
    | 'INPUT_SEQUENCE_STALE'
    | 'RATE_LIMITED'
    | 'RESYNC_REQUIRED';
}

export function serializeClientEnvelopeV1(
  envelope: ClientEnvelopeV1,
): string {
  return JSON.stringify(envelope);
}

export function serializeServerEnvelopeV1(
  envelope: ServerEnvelopeV1,
): string {
  return JSON.stringify(envelope);
}
