import { createHash } from 'node:crypto';
import {
  canonicalJsonV1,
  checkpointProjectionV1,
  type CheckpointProjectionV1,
} from '../../protocol';

export function authorityCheckpointDigest(
  projection: CheckpointProjectionV1,
): string {
  const canonical = canonicalJsonV1(
    checkpointProjectionV1(projection),
  );
  return createHash('sha256').update(canonical).digest('hex');
}
