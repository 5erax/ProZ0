import {
  HOSTED_PROTOCOL_VERSION,
  type ServerEnvelopeV1,
} from '../../protocol';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, maximum = 256): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function natural(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function json(value: unknown, depth = 0): boolean {
  if (depth > 16) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 4096 && value.every(entry => json(entry, depth + 1));
  return object(value) && Object.keys(value).length <= 4096
    && Object.entries(value).every(([key, entry]) => text(key, 128) && json(entry, depth + 1));
}

function revisions(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 4096 && value.every(entry =>
    object(entry) && keys(entry, ['aggregateType', 'aggregateId', 'revision'])
    && text(entry.aggregateType, 128) && text(entry.aggregateId) && natural(entry.revision),
  );
}

function commandResult(value: unknown): boolean {
  return object(value)
    && keys(value, ['operationId', 'status', 'acceptedAuthorityTick', 'committedAuthorityTick', 'authorityIngressOrdinal', 'reason', 'resultingRevisions'])
    && text(value.operationId) && ['committed', 'rejected'].includes(String(value.status))
    && natural(value.acceptedAuthorityTick) && natural(value.authorityIngressOrdinal)
    && (value.committedAuthorityTick === undefined
      || (natural(value.committedAuthorityTick) && value.committedAuthorityTick >= value.acceptedAuthorityTick))
    && (value.reason === undefined || text(value.reason, 4096))
    && (value.resultingRevisions === undefined || revisions(value.resultingRevisions));
}

/** Validate state-bearing payloads before the client touches identity or replicated state. */
function payload(envelope: ServerEnvelopeV1): boolean {
  const value: unknown = envelope.payload;
  if (!object(value)) return false;
  switch (envelope.messageType) {
    case 'SESSION_ACCEPTED':
      return keys(value, ['worldId', 'playerId', 'connectionId', 'resumeCredential', 'snapshotId', 'maxPlayers'])
        && ['worldId', 'playerId', 'connectionId', 'resumeCredential', 'snapshotId'].every(key => text(value[key]))
        && natural(value.maxPlayers) && value.maxPlayers > 0 && value.maxPlayers <= 8;
    case 'SESSION_REJECTED':
    case 'ERROR':
    case 'RESYNC_REQUIRED':
      return keys(value, ['reason']) && text(value.reason, 4096);
    case 'COMMAND_RESULT':
      return commandResult(value);
    case 'OPERATION_STATUS':
      if (!text(value.operationId)) return false;
      if (value.state === 'unknown') return keys(value, ['operationId', 'state']);
      if (value.state === 'accepted-pending')
        return keys(value, ['operationId', 'state', 'acceptedAuthorityTick', 'authorityIngressOrdinal'])
          && natural(value.acceptedAuthorityTick) && natural(value.authorityIngressOrdinal);
      return value.state === 'resolved' && keys(value, ['operationId', 'state', 'result'])
        && commandResult(value.result) && object(value.result)
        && value.result.operationId === value.operationId;
    case 'AGGREGATE_UPDATE':
      return keys(value, ['aggregateType', 'aggregateId', 'revision', 'tombstone', 'state'])
        && text(value.aggregateType, 128) && text(value.aggregateId) && natural(value.revision)
        && typeof value.tombstone === 'boolean' && json(value.state)
        && (!value.tombstone || value.state === null);
    case 'PONG':
      return keys(value, ['pingId', 'clientSentAtMs']) && text(value.pingId, 128)
        && typeof value.clientSentAtMs === 'number' && Number.isFinite(value.clientSentAtMs);
    case 'AUTHORITY_CHECKPOINT':
      return keys(value, ['authorityTick', 'aggregateRevisions', 'stateDigest'])
        && natural(value.authorityTick) && value.authorityTick <= envelope.authorityTick
        && revisions(value.aggregateRevisions)
        && (value.stateDigest === undefined || text(value.stateDigest, 4096));
    case 'DURABILITY_CHECKPOINT':
      return keys(value, ['authorityTick', 'durableSaveRevision'])
        && natural(value.authorityTick) && value.authorityTick <= envelope.authorityTick
        && natural(value.durableSaveRevision);
    case 'SESSION_CLOSING':
      return keys(value, ['saveStatus', 'durableSaveRevision', 'reason'])
        && ['SUCCESS', 'SAVE_FAILED'].includes(String(value.saveStatus))
        && (value.durableSaveRevision === undefined || natural(value.durableSaveRevision))
        && (value.reason === undefined || text(value.reason, 4096));
    case 'BASELINE_SNAPSHOT':
    case 'PLAYER_MOTION':
      // The public protocol validators handle these in the read-model application path.
      return true;
    default:
      return false;
  }
}

export function parseHostedServerEnvelope(textValue: string): ServerEnvelopeV1 | null {
  let value: unknown;
  try {
    value = JSON.parse(textValue) as unknown;
  } catch {
    return null;
  }
  if (!object(value) || !keys(value, ['protocolVersion', 'messageType', 'serverMessageSeq', 'sessionId', 'sessionEpoch', 'authorityTick', 'payload'])
    || value.protocolVersion !== HOSTED_PROTOCOL_VERSION || !text(value.messageType, 64)
    || !natural(value.serverMessageSeq) || value.serverMessageSeq === 0
    || !text(value.sessionId) || !text(value.sessionEpoch) || !natural(value.authorityTick)) return null;
  const envelope = value as unknown as ServerEnvelopeV1;
  return payload(envelope) ? envelope : null;
}
