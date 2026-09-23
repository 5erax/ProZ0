import type { ContentId } from '../../../content';
import type { PlayerId } from '../../../foundation';
import type { ContainerId } from '../../../simulation/items';
import type { StructureId } from '../../../world/building';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';

export interface CondenserSaveV2 {
  readonly enabled: boolean;
  readonly productionProgressTicks: number;
  readonly completedCycleOrdinal: number;
}

export interface StructureRecordV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'structure';
  readonly worldId: string;
  readonly footholdId: string;
  readonly structureId: StructureId;
  readonly structureDefinitionId: ContentId;
  readonly revision: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly orientationQuarterTurns: 0 | 1 | 2 | 3;
  readonly placedByPlayerId: PlayerId | null;
  readonly placementOperationFingerprint: string | null;
  readonly outputContainerId: ContainerId | null;
  readonly machine: CondenserSaveV2 | null;
}
