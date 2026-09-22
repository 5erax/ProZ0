import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function canonicalizePortableSaveBundle(
  bundle: PortableSaveBundleV1,
): PortableSaveBundleV1 {
  const players = [...bundle.players].sort((left, right) =>
    compareStrings(left.playerId, right.playerId),
  );
  const chunks = [...bundle.chunks].sort((left, right) => {
    if (left.coord.x !== right.coord.x) {
      return left.coord.x - right.coord.x;
    }
    return left.coord.y - right.coord.y;
  });

  return Object.freeze({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'portable-bundle',
    world: bundle.world,
    players: Object.freeze(players),
    chunks: Object.freeze(chunks),
  });
}

export function serializePortableSaveBundle(
  bundle: PortableSaveBundleV1,
): string {
  return JSON.stringify(canonicalizePortableSaveBundle(bundle));
}
