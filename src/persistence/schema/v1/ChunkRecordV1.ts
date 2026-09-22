import type {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../SaveSchema';

export interface ChunkRecordV1 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
  readonly recordKind: 'chunk';

  readonly worldId: string;
  readonly coord: {
    readonly x: number;
    readonly y: number;
  };

  readonly generationVersion: number;
  readonly chunkRevision: number;
  readonly generated: true;
}
