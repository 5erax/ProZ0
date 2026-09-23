export const SAVE_FORMAT_ID = 'proz0-save' as const;
export const SAVE_SCHEMA_VERSION_V1 = 1 as const;
export const SAVE_SCHEMA_VERSION = 2 as const;
export const SAVE_SCHEMA_VERSION_V2 = SAVE_SCHEMA_VERSION;

export type SaveFormatId = typeof SAVE_FORMAT_ID;
export type SaveSchemaVersion =
  | typeof SAVE_SCHEMA_VERSION_V1
  | typeof SAVE_SCHEMA_VERSION_V2;

export type SaveRecordKind =
  | 'world-manifest'
  | 'player'
  | 'container'
  | 'chunk'
  | 'foothold'
  | 'structure'
  | 'portable-bundle';

export interface VersionedSaveRecord {
  readonly formatId: SaveFormatId;
  readonly schemaVersion: SaveSchemaVersion;
  readonly recordKind: SaveRecordKind;
}
