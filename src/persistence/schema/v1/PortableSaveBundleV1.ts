import type {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../SaveSchema';
import type { ChunkRecordV1 } from './ChunkRecordV1';
import type { PlayerRecordV1 } from './PlayerRecordV1';
import type { WorldManifestV1 } from './WorldManifestV1';

export interface PortableSaveBundleV1 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly recordKind: 'portable-bundle';

  readonly world: WorldManifestV1;
  readonly players: readonly PlayerRecordV1[];
  readonly chunks: readonly ChunkRecordV1[];
}
