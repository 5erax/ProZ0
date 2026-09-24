import type {
  CommandResultV1,
  GameplayCommandEnvelopeV1,
  JsonValue,
  OperationStatusV1,
} from '../../protocol';

interface PendingOperation {
  readonly ownerPlayerId: string;
  readonly signature: string;
  readonly acceptedAuthorityTick: number;
  readonly authorityIngressOrdinal: number;
}

interface ResolvedOperation extends PendingOperation {
  readonly result: CommandResultV1;
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value !== null && typeof value === 'object') {
    const object = value as { readonly [key: string]: JsonValue };
    return Object.fromEntries(
      Object.keys(object)
        .sort()
        .map((key) => [key, canonicalize(object[key] ?? null)]),
    );
  }
  return value;
}

export function commandSignature(
  playerId: string,
  command: GameplayCommandEnvelopeV1,
): string {
  return JSON.stringify([
    playerId,
    command.commandType,
    [...command.expectedRevisions]
      .map((entry) => [
        entry.aggregateType,
        entry.aggregateId,
        entry.revision,
      ])
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      ),
    canonicalize(command.payload),
  ]);
}

export class OperationResultCache {
  private readonly pending = new Map<string, PendingOperation>();
  private readonly resolved = new Map<string, ResolvedOperation>();

  public begin(
    operationId: string,
    ownerPlayerId: string,
    signature: string,
    acceptedAuthorityTick: number,
    authorityIngressOrdinal: number,
  ):
    | { readonly status: 'accepted' }
    | { readonly status: 'pending-duplicate' }
    | { readonly status: 'resolved'; readonly result: CommandResultV1 }
    | { readonly status: 'conflict' } {
    const resolved = this.resolved.get(operationId);
    if (resolved !== undefined) {
      return resolved.ownerPlayerId === ownerPlayerId
        && resolved.signature === signature
        ? Object.freeze({ status: 'resolved', result: resolved.result })
        : Object.freeze({ status: 'conflict' });
    }

    const pending = this.pending.get(operationId);
    if (pending !== undefined) {
      return pending.ownerPlayerId === ownerPlayerId
        && pending.signature === signature
        ? Object.freeze({ status: 'pending-duplicate' })
        : Object.freeze({ status: 'conflict' });
    }

    this.pending.set(operationId, Object.freeze({
      ownerPlayerId,
      signature,
      acceptedAuthorityTick,
      authorityIngressOrdinal,
    }));
    return Object.freeze({ status: 'accepted' });
  }

  public resolve(
    operationId: string,
    result: CommandResultV1,
  ): void {
    const pending = this.pending.get(operationId);
    if (pending === undefined) {
      throw new Error('Cannot resolve an OperationId that was not accepted.');
    }
    this.pending.delete(operationId);
    this.resolved.set(operationId, Object.freeze({
      ...pending,
      result,
    }));
  }

  public status(
    operationId: string,
    ownerPlayerId: string,
  ): OperationStatusV1 {
    const resolved = this.resolved.get(operationId);
    if (
      resolved !== undefined
      && resolved.ownerPlayerId === ownerPlayerId
    ) {
      return Object.freeze({
        operationId,
        state: 'resolved',
        result: resolved.result,
      });
    }

    const pending = this.pending.get(operationId);
    if (
      pending !== undefined
      && pending.ownerPlayerId === ownerPlayerId
    ) {
      return Object.freeze({
        operationId,
        state: 'accepted-pending',
        acceptedAuthorityTick: pending.acceptedAuthorityTick,
        authorityIngressOrdinal: pending.authorityIngressOrdinal,
      });
    }

    return Object.freeze({
      operationId,
      state: 'unknown',
    });
  }

  public get(operationId: string): CommandResultV1 | null {
    return this.resolved.get(operationId)?.result ?? null;
  }

  public hasPending(operationId: string): boolean {
    return this.pending.has(operationId);
  }
}
