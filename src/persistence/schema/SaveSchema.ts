export const SAVE_FORMAT_ID = 'proz0-save' as const;
export const SAVE_SCHEMA_VERSION = 1 as const;

export type SaveFormatId = typeof SAVE_FORMAT_ID;
export type SaveSchemaVersion = typeof SAVE_SCHEMA_VERSION;

export type SaveRecordKind =
  | 'world-manifest'
  | 'player'
  | 'chunk'
  | 'portable-bundle';

export interface VersionedSaveRecord {
  readonly formatId: SaveFormatId;
  readonly schemaVersion: SaveSchemaVersion;
  readonly recordKind: SaveRecordKind;
}
