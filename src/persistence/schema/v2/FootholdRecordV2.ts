import type { StructureId } from '../../../world/building';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';

export interface FootholdRecordV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'foothold';
  readonly worldId: string;
  readonly footholdId: string;
  readonly buildRevision: number;
  readonly structureIds: readonly StructureId[];
  readonly connectionEdges: readonly {
    readonly aConnectorId: string;
    readonly bConnectorId: string;
  }[];
  readonly powerNetwork: {
    readonly revision: number;
    readonly producerStructureId: StructureId | null;
    readonly grantedConsumerIds: readonly StructureId[];
  };
}
