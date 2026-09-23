import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';
import type { ChunkRecordV2 } from './ChunkRecordV2';
import type { ContainerRecordV2 } from './ContainerRecordV2';
import type { FootholdRecordV2 } from './FootholdRecordV2';
import type { PlayerRecordV2 } from './PlayerRecordV2';
import type { StructureRecordV2 } from './StructureRecordV2';
import type { WorldManifestV2 } from './WorldManifestV2';

export interface PortableSaveBundleV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'portable-bundle';
  readonly world: WorldManifestV2;
  readonly players: readonly PlayerRecordV2[];
  readonly containers: readonly ContainerRecordV2[];
  readonly chunks: readonly ChunkRecordV2[];
  readonly footholds: readonly FootholdRecordV2[];
  readonly structures: readonly StructureRecordV2[];
}
