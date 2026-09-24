import {
  canonicalJsonV1,
  checkpointProjectionV1,
  type CheckpointProjectionV1,
} from '../../protocol';

export async function clientCheckpointDigest(
  projection: CheckpointProjectionV1,
): Promise<string> {
  const encoded = new TextEncoder().encode(
    canonicalJsonV1(checkpointProjectionV1(projection)),
  );
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
