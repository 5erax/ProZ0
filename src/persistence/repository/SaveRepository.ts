import type { ChunkCoord } from '../../world';
import type { ChunkRecordV1 } from '../schema/v1/ChunkRecordV1';
import type { PlayerRecordV1 } from '../schema/v1/PlayerRecordV1';
import type { PortableSaveBundleV1 } from '../schema/v1/PortableSaveBundleV1';
import type { WorldManifestV1 } from '../schema/v1/WorldManifestV1';

export type SaveFailureCode =
  | 'NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_NEWER_SCHEMA'
  | 'UNSUPPORTED_GENERATION_VERSION'
  | 'UNSUPPORTED_RNG_VERSION'
  | 'UNSUPPORTED_SEED_DERIVATION_VERSION'
  | 'CORRUPT_RECORD'
  | 'MIGRATION_FAILED'
  | 'STORAGE_FAILURE'
  | 'STALE_WRITE';

export interface SaveFailure {
  readonly ok: false;
  readonly code: SaveFailureCode;
  readonly message: string;
}

export interface SaveSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

export type SaveResult<T> = SaveSuccess<T> | SaveFailure;

export function saveSuccess<T>(value: T): SaveSuccess<T> {
  return Object.freeze({ ok: true, value });
}

export function saveFailure(
  code: SaveFailureCode,
  message: string,
): SaveFailure {
  return Object.freeze({ ok: false, code, message });
}

export interface SaveCommitRequestV1 {
  readonly world: WorldManifestV1;
  readonly players: readonly PlayerRecordV1[];
  readonly chunks: readonly ChunkRecordV1[];
  readonly expectedPreviousWorldRevision: number | null;
}

export interface SaveRepository {
  loadManifest(worldId: string): Promise<SaveResult<WorldManifestV1>>;
  loadPlayer(
    worldId: string,
    playerId: string,
  ): Promise<SaveResult<PlayerRecordV1>>;
  loadChunk(
    worldId: string,
    coord: ChunkCoord,
  ): Promise<SaveResult<ChunkRecordV1 | null>>;
  loadWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV1>>;

  commit(
    request: SaveCommitRequestV1,
  ): Promise<SaveResult<{ readonly worldRevision: number }>>;

  exportWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV1>>;
  importWorld(
    bundle: unknown,
  ): Promise<SaveResult<{ readonly worldId: string }>>;
}
