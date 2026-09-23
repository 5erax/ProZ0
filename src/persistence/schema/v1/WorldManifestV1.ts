import type {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V1,
} from '../SaveSchema';

export interface WorldManifestV1 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V1;
  readonly recordKind: 'world-manifest';

  readonly worldId: string;
  readonly worldRevision: number;

  readonly worldSeed: string;
  readonly generationVersion: number;
  readonly rngAlgorithmVersion: string;
  readonly seedDerivationVersion: string;

  readonly createdAtUtc: string;
  readonly lastActiveAtUtc: string;
}
