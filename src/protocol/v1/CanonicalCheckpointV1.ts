import type {
  JsonValue,
  RevisionRefV1,
} from './MessagesV1';

export interface CheckpointProjectionV1 {
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly aggregateRevisions: readonly RevisionRefV1[];
  readonly durableSaveRevision: number | null;
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => canonicalize(entry)));
  }
  if (value !== null && typeof value === 'object') {
    const object = value as { readonly [key: string]: JsonValue };
    return Object.freeze(Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key] ?? null)]),
    ));
  }
  return value;
}

export function canonicalJsonV1(value: JsonValue): string {
  return JSON.stringify(canonicalize(value));
}

export function checkpointProjectionV1(
  input: CheckpointProjectionV1,
): JsonValue {
  return Object.freeze({
    sessionEpoch: input.sessionEpoch,
    authorityTick: input.authorityTick,
    aggregateRevisions: Object.freeze(
      [...input.aggregateRevisions]
        .sort((left, right) =>
          left.aggregateType.localeCompare(right.aggregateType)
          || left.aggregateId.localeCompare(right.aggregateId),
        )
        .map((entry) => Object.freeze({
          aggregateType: entry.aggregateType,
          aggregateId: entry.aggregateId,
          revision: entry.revision,
        })),
    ),
    durableSaveRevision: input.durableSaveRevision,
  });
}
