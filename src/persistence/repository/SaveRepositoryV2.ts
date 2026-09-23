import type { ChunkRecordV2 } from '../schema/v2/ChunkRecordV2';
import type { ContainerRecordV2 } from '../schema/v2/ContainerRecordV2';
import type { FootholdRecordV2 } from '../schema/v2/FootholdRecordV2';
import type { PlayerRecordV2 } from '../schema/v2/PlayerRecordV2';
import type { PortableSaveBundleV2 } from '../schema/v2/PortableSaveBundleV2';
import type { StructureRecordV2 } from '../schema/v2/StructureRecordV2';
import type { WorldManifestV2 } from '../schema/v2/WorldManifestV2';
import type { SaveFailureCode as LegacySaveFailureCode } from './SaveRepository';

export type SaveFailureCode = LegacySaveFailureCode
  | 'UNSUPPORTED_CONTENT_SCHEMA'
  | 'UNSUPPORTED_CONTENT_PACK'
  | 'CONTENT_FINGERPRINT_MISMATCH'
  | 'CROSS_REFERENCE_FAILURE';

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

export function saveFailure(code: SaveFailureCode, message: string): SaveFailure {
  return Object.freeze({ ok: false, code, message });
}

export interface SaveCommitRequestV2 {
  readonly world: WorldManifestV2;
  readonly players: readonly PlayerRecordV2[];
  readonly containers: readonly ContainerRecordV2[];
  readonly chunks: readonly ChunkRecordV2[];
  readonly footholds: readonly FootholdRecordV2[];
  readonly structures: readonly StructureRecordV2[];
  readonly expectedPreviousWorldRevision: number | null;
}

export interface DurabilityCheckpointV1 {
  readonly authorityTick: number;
  readonly durableSaveRevision: number;
}

export function durabilityCheckpointForManifest(
  world: WorldManifestV2,
): DurabilityCheckpointV1 {
  return Object.freeze({
    authorityTick: world.authorityTick,
    durableSaveRevision: world.worldRevision,
  });
}

export interface SaveRepositoryV2 {
  loadManifest(worldId: string): Promise<SaveResult<WorldManifestV2>>;
  loadPlayer(worldId: string, playerId: string): Promise<SaveResult<PlayerRecordV2>>;
  loadChunk(worldId: string, x: number, y: number): Promise<SaveResult<ChunkRecordV2>>;
  loadWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV2>>;
  commit(request: SaveCommitRequestV2): Promise<SaveResult<WorldManifestV2>>;
  exportWorld(worldId: string): Promise<SaveResult<PortableSaveBundleV2>>;
  importWorld(bundle: unknown): Promise<SaveResult<WorldManifestV2>>;
}
