import type {
  BaselineSnapshotV1,
  RevisionedAggregateViewV1,
} from '../../protocol';

function keyOf(view: {
  readonly aggregateType: string;
  readonly aggregateId: string;
}): string {
  return `${view.aggregateType}\u0000${view.aggregateId}`;
}

export class ClientReplicationStore {
  private sessionEpoch: string | null = null;
  private authorityTick = 0;
  private readonly aggregates = new Map<string, RevisionedAggregateViewV1>();

  public applyBaseline(baseline: BaselineSnapshotV1): void {
    this.sessionEpoch = baseline.sessionEpoch;
    this.authorityTick = baseline.authorityTick;
    this.aggregates.clear();
    for (const view of baseline.aggregates) {
      this.aggregates.set(keyOf(view), Object.freeze({ ...view }));
    }
  }

  public applyAggregate(
    view: RevisionedAggregateViewV1,
  ): 'applied' | 'stale-or-duplicate' {
    const key = keyOf(view);
    const current = this.aggregates.get(key);
    if (current !== undefined && view.revision <= current.revision) {
      return 'stale-or-duplicate';
    }
    this.aggregates.set(key, Object.freeze({ ...view }));
    return 'applied';
  }

  public get(
    aggregateType: string,
    aggregateId: string,
  ): RevisionedAggregateViewV1 | null {
    return this.aggregates.get(
      keyOf({ aggregateType, aggregateId }),
    ) ?? null;
  }

  public getSessionEpoch(): string | null {
    return this.sessionEpoch;
  }

  public getAuthorityTick(): number {
    return this.authorityTick;
  }

  public setAuthorityTick(authorityTick: number): void {
    if (
      Number.isSafeInteger(authorityTick)
      && authorityTick >= this.authorityTick
    ) {
      this.authorityTick = authorityTick;
    }
  }

  public snapshot(): readonly RevisionedAggregateViewV1[] {
    return Object.freeze(
      [...this.aggregates.values()].sort((left, right) =>
        keyOf(left).localeCompare(keyOf(right)),
      ),
    );
  }
}
