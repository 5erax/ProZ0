import { describe, expect, it } from 'vitest';
import { clientCheckpointDigest } from '../../src/client/network';
import {
  checkpointProjectionV1,
  type CheckpointProjectionV1,
} from '../../src/protocol';
import { authorityCheckpointDigest } from '../../src/server';

function projection(
  revisions: CheckpointProjectionV1['aggregateRevisions'],
): CheckpointProjectionV1 {
  return Object.freeze({
    sessionEpoch: 'epoch:test',
    authorityTick: 120,
    aggregateRevisions: Object.freeze([...revisions]),
    durableSaveRevision: 7,
  });
}

describe('P1-NET-001 checkpoint digest', () => {
  it('produces the same SHA-256 digest on server and browser-compatible client code independent of aggregate ordering', async () => {
    const left = projection([
      { aggregateType: 'ruin', aggregateId: 'ruin:b', revision: 3 },
      { aggregateType: 'container', aggregateId: 'inventory:p1', revision: 8 },
    ]);
    const reordered = projection([
      { aggregateType: 'container', aggregateId: 'inventory:p1', revision: 8 },
      { aggregateType: 'ruin', aggregateId: 'ruin:b', revision: 3 },
    ]);

    expect(checkpointProjectionV1(left)).toEqual(
      checkpointProjectionV1(reordered),
    );

    const authority = authorityCheckpointDigest(left);
    expect(await clientCheckpointDigest(left)).toBe(authority);
    expect(await clientCheckpointDigest(reordered)).toBe(authority);
  });

  it('changes when canonical authority revision changes', async () => {
    const before = projection([
      { aggregateType: 'exploration', aggregateId: 'region:0,0', revision: 4 },
    ]);
    const after = projection([
      { aggregateType: 'exploration', aggregateId: 'region:0,0', revision: 5 },
    ]);

    expect(authorityCheckpointDigest(after)).not.toBe(
      authorityCheckpointDigest(before),
    );
    expect(await clientCheckpointDigest(after)).not.toBe(
      await clientCheckpointDigest(before),
    );
  });
});
