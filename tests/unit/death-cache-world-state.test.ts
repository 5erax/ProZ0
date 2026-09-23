import { describe, expect, it } from 'vitest';
import { createWorldPosition } from '../../src/foundation';
import {
  DeathCacheWorldState,
  resolveDeathCachePlacement,
} from '../../src/world';

describe('DeathCacheWorldState', () => {
  it('uses deterministic canonical search order before fallback', () => {
    const origin = createWorldPosition(10, 20);
    const visited: string[] = [];
    const resolved = resolveDeathCachePlacement(origin, {
      isValid(position) {
        visited.push(`${position.x},${position.y}`);
        return position.x === 10.625 && position.y === 20;
      },
      nearestReachableFallback() {
        return createWorldPosition(99, 99);
      },
    });

    expect(resolved).toEqual(createWorldPosition(10.625, 20));
    expect(visited.slice(0, 3)).toEqual([
      '10,20',
      '10,19.375',
      '10.625,20',
    ]);
  });

  it('uses explicit valid reachable fallback after preferred 3-width search', () => {
    const fallback = createWorldPosition(7, 8);
    const resolved = resolveDeathCachePlacement(
      createWorldPosition(0, 0),
      {
        isValid(position) {
          return position.x === fallback.x && position.y === fallback.y;
        },
        nearestReachableFallback() {
          return fallback;
        },
      },
    );
    expect(resolved).toEqual(fallback);
  });

  it('round-trips canonical cache identity, position and revision', () => {
    const state = new DeathCacheWorldState();
    const reservation = state.reservePlacement(
      {
        deathId: 'death:p1:1',
        ownerPlayerId: 'p1',
        requestedPosition: createWorldPosition(2, 3),
      },
      {
        isValid() {
          return true;
        },
        nearestReachableFallback(position) {
          return position;
        },
      },
    );
    state.commitReserved({
      entityId: 'death-cache-entity:death:p1:1',
      deathId: 'death:p1:1',
      ownerPlayerId: 'p1',
      containerId: 'death-cache:death:p1:1',
      reservation,
    });

    const snapshot = state.exportSnapshot();
    const restored = new DeathCacheWorldState(snapshot);

    expect(restored.exportSnapshot()).toEqual(snapshot);
    expect(
      restored.getByContainer('death-cache:death:p1:1'),
    ).toMatchObject({
      deathId: 'death:p1:1',
      ownerPlayerId: 'p1',
      revision: 0,
      position: createWorldPosition(2, 3),
    });
  });
});
