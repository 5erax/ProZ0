import type {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V1,
} from '../SaveSchema';

export type PlayerFacingV1 =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export interface PlayerRecordV1 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V1;
  readonly recordKind: 'player';

  readonly worldId: string;
  readonly playerId: string;
  readonly playerRevision: number;

  readonly position: {
    readonly x: number;
    readonly y: number;
  };

  readonly facing: PlayerFacingV1;
}
