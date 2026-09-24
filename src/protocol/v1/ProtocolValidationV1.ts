import {
  HOSTED_PROTOCOL_VERSION,
  type ClientEnvelopeV1,
  type ClientHelloV1,
  type ClientMessageTypeV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type MovementInputV1,
} from './MessagesV1';

export interface ProtocolValidationFailure {
  readonly ok: false;
  readonly reason: 'INVALID_MESSAGE' | 'PROTOCOL_MISMATCH';
  readonly message: string;
}

export interface ProtocolValidationSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export type ProtocolValidationResult<T> =
  | ProtocolValidationSuccess<T>
  | ProtocolValidationFailure;

const CLIENT_MESSAGE_TYPES = new Set<ClientMessageTypeV1>([
  'CLIENT_HELLO',
  'BASELINE_APPLIED',
  'MOVEMENT_INPUT',
  'GAMEPLAY_COMMAND',
  'OPERATION_STATUS_QUERY',
  'PING',
  'CLIENT_CHECKPOINT',
  'LEAVE_SESSION',
]);

function success<T>(value: T): ProtocolValidationSuccess<T> {
  return Object.freeze({ ok: true, value });
}

function failure(
  reason: ProtocolValidationFailure['reason'],
  message: string,
): ProtocolValidationFailure {
  return Object.freeze({ ok: false, reason, message });
}

function objectValue(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
}

function nonEmpty(value: unknown, maxLength = 256): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function jsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 16) return false;
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) {
    return value.length <= 4096
      && value.every((entry) => jsonValue(entry, depth + 1));
  }
  if (!objectValue(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 4096
    && entries.every(([key, entry]) =>
      key.length > 0
      && key.length <= 128
      && jsonValue(entry, depth + 1),
    );
}

export function parseClientEnvelopeV1(
  text: string,
): ProtocolValidationResult<ClientEnvelopeV1> {
  if (text.length === 0 || text.length > 256 * 1024) {
    return failure('INVALID_MESSAGE', 'Wire message size is invalid.');
  }

  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    return failure('INVALID_MESSAGE', 'Wire message is not valid JSON.');
  }

  if (
    !objectValue(input)
    || !onlyKeys(input, [
      'protocolVersion',
      'messageType',
      'clientMessageSeq',
      'sessionId',
      'connectionId',
      'payload',
    ])
  ) {
    return failure('INVALID_MESSAGE', 'Client envelope must contain only protocol fields.');
  }
  if (input.protocolVersion !== HOSTED_PROTOCOL_VERSION) {
    return failure('PROTOCOL_MISMATCH', 'Hosted protocol version mismatch.');
  }
  if (
    typeof input.messageType !== 'string'
    || !CLIENT_MESSAGE_TYPES.has(input.messageType as ClientMessageTypeV1)
    || !nonNegativeSafeInteger(input.clientMessageSeq)
    || !jsonValue(input.payload)
  ) {
    return failure('INVALID_MESSAGE', 'Client envelope fields are invalid.');
  }
  if (
    input.sessionId !== undefined
    && !nonEmpty(input.sessionId)
  ) {
    return failure('INVALID_MESSAGE', 'Client sessionId is invalid.');
  }
  if (
    input.connectionId !== undefined
    && !nonEmpty(input.connectionId)
  ) {
    return failure('INVALID_MESSAGE', 'Client connectionId is invalid.');
  }

  return success(input as unknown as ClientEnvelopeV1);
}

export function validateClientHelloV1(
  input: unknown,
): ProtocolValidationResult<ClientHelloV1> {
  if (
    !objectValue(input)
    || !onlyKeys(input, [
      'protocolVersion',
      'clientBuild',
      'contentCompatibility',
      'worldCompatibility',
      'resumeCredential',
    ])
  ) {
    return failure('INVALID_MESSAGE', 'ClientHello contains unknown fields.');
  }
  if (input.protocolVersion !== HOSTED_PROTOCOL_VERSION) {
    return failure('PROTOCOL_MISMATCH', 'Hosted protocol version mismatch.');
  }

  const content = input.contentCompatibility;
  const world = input.worldCompatibility;
  if (
    !objectValue(content)
    || !onlyKeys(content, [
      'formatId',
      'schemaVersion',
      'packId',
      'packVersion',
      'canonicalFingerprint',
    ])
    || !nonEmpty(content.formatId)
    || !nonNegativeSafeInteger(content.schemaVersion)
    || !nonEmpty(content.packId)
    || !nonNegativeSafeInteger(content.packVersion)
    || !nonEmpty(content.canonicalFingerprint, 512)
    || !objectValue(world)
    || !onlyKeys(world, [
      'worldGenerationVersion',
      'rngAlgorithmVersion',
      'seedDerivationVersion',
    ])
    || !nonNegativeSafeInteger(world.worldGenerationVersion)
    || !nonEmpty(world.rngAlgorithmVersion)
    || !nonEmpty(world.seedDerivationVersion)
    || (
      input.clientBuild !== undefined
      && !nonEmpty(input.clientBuild, 512)
    )
    || (
      input.resumeCredential !== undefined
      && !nonEmpty(input.resumeCredential, 1024)
    )
  ) {
    return failure('INVALID_MESSAGE', 'ClientHello fields are invalid.');
  }

  return success(input as unknown as ClientHelloV1);
}

export function validateMovementInputV1(
  input: unknown,
): ProtocolValidationResult<MovementInputV1> {
  if (
    !objectValue(input)
    || !onlyKeys(input, ['inputSeq', 'up', 'down', 'left', 'right'])
    || !nonNegativeSafeInteger(input.inputSeq)
    || typeof input.up !== 'boolean'
    || typeof input.down !== 'boolean'
    || typeof input.left !== 'boolean'
    || typeof input.right !== 'boolean'
  ) {
    return failure('INVALID_MESSAGE', 'Movement input fields are invalid.');
  }

  return success(input as unknown as MovementInputV1);
}

export function validateGameplayCommandEnvelopeV1(
  input: unknown,
): ProtocolValidationResult<GameplayCommandEnvelopeV1> {
  if (
    !objectValue(input)
    || !onlyKeys(input, [
      'operationId',
      'commandType',
      'expectedRevisions',
      'payload',
    ])
    || !nonEmpty(input.operationId, 256)
    || !nonEmpty(input.commandType, 128)
    || !Array.isArray(input.expectedRevisions)
    || input.expectedRevisions.length > 64
    || !jsonValue(input.payload)
  ) {
    return failure('INVALID_MESSAGE', 'Gameplay command fields are invalid.');
  }

  for (const revision of input.expectedRevisions) {
    if (
      !objectValue(revision)
      || !onlyKeys(revision, [
        'aggregateType',
        'aggregateId',
        'revision',
      ])
      || !nonEmpty(revision.aggregateType, 128)
      || !nonEmpty(revision.aggregateId, 256)
      || !nonNegativeSafeInteger(revision.revision)
    ) {
      return failure(
        'INVALID_MESSAGE',
        'Gameplay command expected revision is invalid.',
      );
    }
  }

  return success(input as unknown as GameplayCommandEnvelopeV1);
}

export function validateBaselineAppliedV1(
  input: unknown,
): ProtocolValidationResult<{ readonly snapshotId: string }> {
  if (
    !objectValue(input)
    || !onlyKeys(input, ['snapshotId'])
    || !nonEmpty(input.snapshotId)
  ) {
    return failure('INVALID_MESSAGE', 'BaselineApplied is invalid.');
  }
  return success(Object.freeze({ snapshotId: input.snapshotId }));
}

export function validateOperationStatusQueryV1(
  input: unknown,
): ProtocolValidationResult<{ readonly operationId: string }> {
  if (
    !objectValue(input)
    || !onlyKeys(input, ['operationId'])
    || !nonEmpty(input.operationId, 256)
  ) {
    return failure('INVALID_MESSAGE', 'OperationStatusQuery is invalid.');
  }
  return success(Object.freeze({ operationId: input.operationId }));
}

export function validatePingV1(
  input: unknown,
): ProtocolValidationResult<{
  readonly pingId: string;
  readonly clientSentAtMs: number;
}> {
  if (
    !objectValue(input)
    || !onlyKeys(input, ['pingId', 'clientSentAtMs'])
    || !nonEmpty(input.pingId, 128)
    || !finite(input.clientSentAtMs)
  ) {
    return failure('INVALID_MESSAGE', 'Ping is invalid.');
  }
  return success(Object.freeze({
    pingId: input.pingId,
    clientSentAtMs: input.clientSentAtMs,
  }));
}
