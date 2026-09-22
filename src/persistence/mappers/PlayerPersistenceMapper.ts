import {
  createWorldPosition,
  type PlayerId,
} from '../../foundation';
import type {
  PlayerPersistenceState,
} from '../../simulation';
import {
  saveFailure,
  type SaveResult,
} from '../repository/SaveRepository';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION,
} from '../schema/SaveSchema';
import type { PlayerRecordV1 } from '../schema/v1/PlayerRecordV1';
import {
  validatePlayerRecordV1,
} from '../validation/SaveValidator';

export interface CreatePlayerRecordV1Input {
  readonly worldId: string;
  readonly playerId: PlayerId;
  readonly playerRevision: number;
  readonly state: Readonly<PlayerPersistenceState> | null;
}

export function createPlayerRecordV1(
  input: CreatePlayerRecordV1Input,
): SaveResult<PlayerRecordV1> {
  if (input.state === null) {
    return saveFailure(
      'CORRUPT_RECORD',
      'Cannot persist PlayerRecordV1 before the player has a valid logical facing.',
    );
  }

  return validatePlayerRecordV1({
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION,
    recordKind: 'player',
    worldId: input.worldId,
    playerId: input.playerId,
    playerRevision: input.playerRevision,
    position: {
      x: input.state.position.x,
      y: input.state.position.y,
    },
    facing: input.state.facing,
  }, input.worldId);
}

export function restorePlayerPersistenceState(
  record: PlayerRecordV1,
): Readonly<PlayerPersistenceState> {
  return Object.freeze({
    position: createWorldPosition(
      record.position.x,
      record.position.y,
    ),
    facing: record.facing,
  });
}
