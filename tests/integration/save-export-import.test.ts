import { describe, expect, it } from 'vitest';
import {
  canonicalizePortableSaveBundle,
  createPlayerRecordV1,
  restorePlayerPersistenceState,
  serializePortableSaveBundle,
} from '../../src/persistence';
import {
  createSimulationRuntime,
} from '../../src/simulation';
import {
  createStaticCollisionWorld,
  createChunkCoord,
} from '../../src/world';
import {
  makeChunkRecord,
  makePlayerRecord,
  makePortableBundle,
} from '../helpers/persistenceFixtures';

describe('Phase 0 portable save and player persistence seams', () => {
  it('SAVE-017 canonicalizes player and chunk export ordering', () => {
    const bundle = makePortableBundle({
      players: [
        makePlayerRecord({ playerId: 'z-player' }),
        makePlayerRecord({ playerId: 'a-player' }),
      ],
      chunks: [
        makeChunkRecord({ coord: createChunkCoord(4, -1) }),
        makeChunkRecord({ coord: createChunkCoord(-2, 9) }),
        makeChunkRecord({ coord: createChunkCoord(-2, -5) }),
      ],
    });

    const canonical = canonicalizePortableSaveBundle(bundle);

    expect(canonical.players.map((player) => player.playerId)).toEqual([
      'a-player',
      'z-player',
    ]);
    expect(canonical.chunks.map((chunk) => [
      chunk.coord.x,
      chunk.coord.y,
    ])).toEqual([
      [-2, -5],
      [-2, 9],
      [4, -1],
    ]);
  });

  it('serializes equivalent canonical save data independent of input array order', () => {
    const playerA = makePlayerRecord({ playerId: 'a-player' });
    const playerB = makePlayerRecord({ playerId: 'b-player' });
    const chunkA = makeChunkRecord({ coord: createChunkCoord(-1, 2) });
    const chunkB = makeChunkRecord({ coord: createChunkCoord(3, -4) });

    const first = makePortableBundle({
      players: [playerB, playerA],
      chunks: [chunkB, chunkA],
    });
    const second = makePortableBundle({
      players: [playerA, playerB],
      chunks: [chunkA, chunkB],
    });

    expect(serializePortableSaveBundle(first)).toBe(
      serializePortableSaveBundle(second),
    );
  });

  it('round-trips approved authoritative player position and facing without presentation state', () => {
    const runtime = createSimulationRuntime({
      worldQuery: createStaticCollisionWorld([]),
      initialPlayerPosition: { x: 7.5, y: -3.25 },
      initialPlayerFacing: 'SW',
    });

    const state = runtime.getPlayerPersistenceState();
    const record = createPlayerRecordV1({
      worldId: 'world-alpha',
      playerId: 'player-1',
      playerRevision: 4,
      state,
    });

    expect(record.ok).toBe(true);
    if (!record.ok) {
      throw new Error(record.message);
    }

    const restored = restorePlayerPersistenceState(record.value);
    const reloadedRuntime = createSimulationRuntime({
      worldQuery: createStaticCollisionWorld([]),
      initialPlayerPosition: restored.position,
      initialPlayerFacing: restored.facing,
    });

    expect(reloadedRuntime.getPlayerPersistenceState()).toEqual(state);
  });

  it('does not invent an initial facing when authoritative facing is not initialized', () => {
    const runtime = createSimulationRuntime({
      worldQuery: createStaticCollisionWorld([]),
      initialPlayerPosition: { x: 0, y: 0 },
    });

    expect(runtime.getPlayerPersistenceState()).toBeNull();

    const record = createPlayerRecordV1({
      worldId: 'world-alpha',
      playerId: 'player-1',
      playerRevision: 0,
      state: runtime.getPlayerPersistenceState(),
    });

    expect(record).toMatchObject({
      ok: false,
      code: 'CORRUPT_RECORD',
    });
  });
});
