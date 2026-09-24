import type {
  RevisionRefV1,
  RevisionedAggregateViewV1,
} from '../../protocol';

function keyOf(view: {
  readonly aggregateType: string;
  readonly aggregateId: string;
}): string {
  return `${view.aggregateType}\u0000${view.aggregateId}`;
}

export class ReplicationCoordinator {
  private readonly views = new Map<string, RevisionedAggregateViewV1>();

  public publish(view: RevisionedAggregateViewV1): boolean {
    if (!Number.isSafeInteger(view.revision) || view.revision < 0) {
      throw new RangeError('Aggregate revision must be non-negative.');
    }

    const key = keyOf(view);
    const current = this.views.get(key);
    if (current !== undefined && view.revision <= current.revision) {
      return false;
    }

    this.views.set(key, Object.freeze({
      ...view,
      state: view.state,
    }));
    return true;
  }

  public baseline(): readonly RevisionedAggregateViewV1[] {
    return Object.freeze(
      [...this.views.values()].sort((left, right) =>
        keyOf(left).localeCompare(keyOf(right)),
      ),
    );
  }

  public revisionRefs(): readonly RevisionRefV1[] {
    return Object.freeze(this.baseline().map((view) => Object.freeze({
      aggregateType: view.aggregateType,
      aggregateId: view.aggregateId,
      revision: view.revision,
    })));
  }

  public get(
    aggregateType: string,
    aggregateId: string,
  ): RevisionedAggregateViewV1 | null {
    return this.views.get(keyOf({ aggregateType, aggregateId })) ?? null;
  }
}
