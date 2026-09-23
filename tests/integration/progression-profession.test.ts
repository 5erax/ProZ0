import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  Phase1ItemAuthority,
  Phase1ProgressionAuthority,
  ProgressionItemEventSink,
  type ContainerState,
  type ItemLedgerSnapshot,
  type ItemStackState,
  type PlayerProgressionSnapshot,
  type ProgressionAuthoritySnapshot,
  type ProgressionGameplayEvent,
} from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function progression(
  snapshot?: ProgressionAuthoritySnapshot,
): Phase1ProgressionAuthority {
  return new Phase1ProgressionAuthority({
    catalog: createPhase1ContentCatalog(),
    ...(snapshot === undefined ? {} : { snapshot }),
  });
}

function apply(
  authority: Phase1ProgressionAuthority,
  event: ProgressionGameplayEvent,
): number {
  const result = authority.applyEvent(event);
  if (result.status === 'rejected') {
    throw new Error('Unexpected progression rejection: ' + result.reason);
  }
  return result.xpAwarded;
}

function emptyPlayerSnapshot(
  totalXp: number,
  level: number,
): PlayerProgressionSnapshot {
  return Object.freeze({
    playerId: 'p1',
    revision: 0,
    totalXp,
    level,
    milestoneRuleIds: Object.freeze([]),
    repeatCounts: Object.freeze({ gather: 0, craft: 0, repair: 0 }),
    skillIds: Object.freeze([]),
    questStates: Object.freeze([
      Object.freeze({
        questId: 'profession-quest:chart-the-unknown' as const,
        completedObjectives: 0,
        completed: false,
      }),
      Object.freeze({
        questId: 'profession-quest:bring-water-online' as const,
        completedObjectives: 0,
        completed: false,
      }),
    ]),
    professionIds: Object.freeze([]),
    eventReceipts: Object.freeze([]),
  });
}

function stack(
  stackId: string,
  itemDefinitionId: string,
  quantity: number,
): ItemStackState {
  return Object.freeze({
    stackId,
    itemDefinitionId,
    quantity,
    condition: null,
  });
}

function inventory(
  stacks: readonly ItemStackState[],
  revision = 0,
): ContainerState {
  return Object.freeze({
    containerId: 'inventory:p1',
    kind: 'player-inventory',
    ownerPlayerId: 'p1',
    revision,
    stacks: Object.freeze([...stacks]),
  });
}

describe('Phase 1 progression XP and anti-grind', () => {
  it('uses exact approved milestone rewards, repeat caps, and level thresholds', () => {
    const authority = progression();
    const resources = [
      'resource:fiber-plant',
      'resource:food-plant',
      'resource:potable-water-source',
      'resource:timber-source',
      'resource:stone-outcrop',
      'resource:metal-ore-node',
    ] as const;
    resources.forEach((resourceId, index) => {
      expect(apply(authority, {
        type: 'gather-completed',
        eventId: 'gather:first:' + index,
        playerId: 'p1',
        resourceId,
      })).toBe(8);
    });

    for (let index = 0; index < 21; index += 1) {
      expect(apply(authority, {
        type: 'gather-completed',
        eventId: 'gather:repeat:' + index,
        playerId: 'p1',
        resourceId: 'resource:fiber-plant',
      })).toBe(index < 20 ? 2 : 0);
    }

    const recipes = [
      'recipe:cordage',
      'recipe:stone-field-tool',
      'recipe:basic-spear',
      'recipe:thermal-wrap',
      'recipe:field-dressing',
      'recipe:storage-crate-kit',
      'recipe:workbench-kit',
      'recipe:repair-patch',
      'recipe:habitat-kit',
      'recipe:power-unit-kit',
      'recipe:machine-kit',
    ] as const;
    recipes.forEach((recipeId, index) => {
      expect(apply(authority, {
        type: 'craft-completed',
        eventId: 'craft:first:' + index,
        playerId: 'p1',
        recipeId,
      })).toBe(8);
    });
    for (let index = 0; index < 6; index += 1) {
      expect(apply(authority, {
        type: 'craft-completed',
        eventId: 'craft:repeat:' + index,
        playerId: 'p1',
        recipeId: 'recipe:cordage',
      })).toBe(index < 5 ? 2 : 0);
    }

    expect(apply(authority, {
      type: 'repair-completed',
      eventId: 'repair:first',
      playerId: 'p1',
      conditionBefore: 50,
      conditionAfter: 75,
    })).toBe(12);
    for (let index = 0; index < 4; index += 1) {
      expect(apply(authority, {
        type: 'repair-completed',
        eventId: 'repair:repeat:' + index,
        playerId: 'p1',
        conditionBefore: 50,
        conditionAfter: 75,
      })).toBe(index < 3 ? 4 : 0);
    }

    const structures = [
      ['structure:storage-crate', 15],
      ['structure:workbench', 20],
      ['structure:habitat-room', 30],
      ['structure:compact-power-unit', 25],
      ['structure:atmospheric-water-condenser', 35],
    ] as const;
    structures.forEach(([structureId, xp], index) => {
      expect(apply(authority, {
        type: 'structure-placed',
        eventId: 'place:first:' + index,
        playerId: 'p1',
        structureId,
      })).toBe(xp);
    });

    expect(apply(authority, {
      type: 'machine-output-collected',
      eventId: 'machine:first-water',
      playerId: 'p1',
      machineId: 'machine:atmospheric-water-condenser',
      itemId: 'item:clean-water',
      quantity: 1,
    })).toBe(20);
    expect(apply(authority, {
      type: 'expedition-band-entered',
      eventId: 'exploration:expedition',
      playerId: 'p1',
    })).toBe(20);
    expect(apply(authority, {
      type: 'ruin-located',
      eventId: 'exploration:ruin-locate',
      playerId: 'p1',
      ruinId: 'ruin:previous-civilization-ruin',
    })).toBe(30);
    expect(apply(authority, {
      type: 'ruin-inspected',
      eventId: 'exploration:ruin-inspect',
      playerId: 'p1',
      ruinId: 'ruin:previous-civilization-ruin',
    })).toBe(100);

    expect(apply(authority, {
      type: 'hostile-resolved',
      eventId: 'predator:retreat',
      playerId: 'p1',
      hostileId: 'hostile:territorial-predator',
      resolution: 'retreat',
      eligibleParticipant: true,
    })).toBe(20);
    expect(apply(authority, {
      type: 'hostile-resolved',
      eventId: 'predator:kill',
      playerId: 'p1',
      hostileId: 'hostile:territorial-predator',
      resolution: 'kill',
      eligibleParticipant: true,
    })).toBe(10);

    expect(apply(authority, {
      type: 'own-death-cache-recovered',
      eventId: 'recovery:first',
      playerId: 'p1',
      quantity: 1,
    })).toBe(15);

    expect(authority.getPlayerView('p1')).toMatchObject({
      totalXp: 550,
      level: 4,
      repeatCounts: {
        gather: 20,
        craft: 5,
        repair: 3,
      },
    });
  });

  it('is duplicate-safe across retry/rejoin and rejects changed payload reuse', () => {
    const authority = progression();
    const first: ProgressionGameplayEvent = {
      type: 'gather-completed',
      eventId: 'event:gather:stable',
      playerId: 'p1',
      resourceId: 'resource:fiber-plant',
    };
    expect(apply(authority, first)).toBe(8);

    const duplicate = authority.applyEvent(first);
    expect(duplicate).toMatchObject({
      status: 'duplicate',
      xpAwarded: 0,
    });

    expect(authority.applyEvent({
      ...first,
      resourceId: 'resource:food-plant',
    })).toMatchObject({
      status: 'rejected',
      reason: 'OPERATION_ID_CONFLICT',
    });

    const repeat: ProgressionGameplayEvent = {
      type: 'gather-completed',
      eventId: 'event:gather:repeat',
      playerId: 'p1',
      resourceId: 'resource:fiber-plant',
    };
    expect(apply(authority, repeat)).toBe(2);

    const snapshot = authority.exportSnapshot();
    const reopened = progression(snapshot);
    expect(reopened.exportSnapshot()).toEqual(snapshot);
    expect(reopened.applyEvent(first)).toMatchObject({
      status: 'duplicate',
      xpAwarded: 0,
    });
    expect(reopened.applyEvent(repeat)).toMatchObject({
      status: 'duplicate',
      xpAwarded: 0,
    });
    expect(reopened.getPlayerView('p1').totalXp).toBe(10);
  });

  it('unlocks both prototype professions without a permanent class lock', () => {
    const authority = progression(Object.freeze({
      players: Object.freeze([emptyPlayerSnapshot(225, 3)]),
    }));

    expect(authority.applyEvent({
      type: 'expedition-band-entered',
      eventId: 'explorer:expedition',
      playerId: 'p1',
    })).toMatchObject({
      status: 'applied',
      xpAwarded: 20,
      unlockedSkillIds: ['skill:fieldcraft-basics'],
    });
    expect(authority.getPlayerView('p1').quests).toContainEqual(
      expect.objectContaining({
        questId: 'profession-quest:chart-the-unknown',
        status: 'available',
      }),
    );

    apply(authority, {
      type: 'ruin-located',
      eventId: 'explorer:locate',
      playerId: 'p1',
      ruinId: 'ruin:previous-civilization-ruin',
    });
    apply(authority, {
      type: 'ruin-inspected',
      eventId: 'explorer:inspect',
      playerId: 'p1',
      ruinId: 'ruin:previous-civilization-ruin',
    });
    expect(authority.applyEvent({
      type: 'returned-to-base-alive',
      eventId: 'explorer:return',
      playerId: 'p1',
      structureId: 'structure:landing-module',
      alive: true,
    })).toMatchObject({
      status: 'applied',
      xpAwarded: 40,
      unlockedProfessionIds: ['profession:explorer-prototype'],
    });

    expect(authority.applyEvent({
      type: 'repair-completed',
      eventId: 'engineer:repair',
      playerId: 'p1',
      conditionBefore: 25,
      conditionAfter: 50,
    })).toMatchObject({
      status: 'applied',
      xpAwarded: 12,
      unlockedSkillIds: ['skill:maintenance-basics'],
    });

    expect(apply(authority, {
      type: 'powered-machine-interacted',
      eventId: 'engineer:too-early',
      playerId: 'p1',
      machineId: 'machine:atmospheric-water-condenser',
      powered: true,
    })).toBe(0);

    apply(authority, {
      type: 'structures-present',
      eventId: 'engineer:structures',
      playerId: 'p1',
      structureIds: [
        'structure:compact-power-unit',
        'structure:atmospheric-water-condenser',
      ],
    });
    apply(authority, {
      type: 'powered-machine-interacted',
      eventId: 'engineer:interact',
      playerId: 'p1',
      machineId: 'machine:atmospheric-water-condenser',
      powered: true,
    });
    expect(authority.applyEvent({
      type: 'machine-output-collected',
      eventId: 'engineer:collect',
      playerId: 'p1',
      machineId: 'machine:atmospheric-water-condenser',
      itemId: 'item:clean-water',
      quantity: 1,
    })).toMatchObject({
      status: 'applied',
      xpAwarded: 60,
      unlockedProfessionIds: ['profession:engineer-prototype'],
    });

    expect(authority.getPlayerView('p1').professionIds).toEqual([
      'profession:engineer-prototype',
      'profession:explorer-prototype',
    ]);
  });

  it('applies the exact death XP-loss formula without reducing level', () => {
    const authority = progression(Object.freeze({
      players: Object.freeze([emptyPlayerSnapshot(300, 3)]),
    }));

    const reservation = authority.reserveDeathXpPenalty({
      deathId: 'death:1',
      playerId: 'p1',
    });
    expect(reservation.xpLoss).toBe(3);
    authority.commitReservedDeathXpPenalty(reservation);
    expect(authority.getPlayerView('p1')).toMatchObject({
      totalXp: 297,
      level: 3,
    });
    authority.commitReservedDeathXpPenalty(reservation);
    expect(authority.getPlayerView('p1').totalXp).toBe(297);

    const released = authority.reserveDeathXpPenalty({
      deathId: 'death:2',
      playerId: 'p1',
    });
    authority.releaseDeathXpPenalty(released);
    authority.commitReservedDeathXpPenalty(released);
    expect(authority.getPlayerView('p1').totalXp).toBe(297);

    const atFloor = progression(Object.freeze({
      players: Object.freeze([emptyPlayerSnapshot(225, 3)]),
    }));
    const floorReservation = atFloor.reserveDeathXpPenalty({
      deathId: 'death:floor',
      playerId: 'p1',
    });
    expect(floorReservation.xpLoss).toBe(0);
    atFloor.commitReservedDeathXpPenalty(floorReservation);
    expect(atFloor.getPlayerView('p1')).toMatchObject({
      totalXp: 225,
      level: 3,
    });
  });

  it('keeps personal co-op XP independent and does not award remote discovery XP', () => {
    const authority = progression();
    apply(authority, {
      type: 'expedition-band-entered',
      eventId: 'p1:expedition',
      playerId: 'p1',
    });
    apply(authority, {
      type: 'expedition-band-entered',
      eventId: 'p2:expedition',
      playerId: 'p2',
    });
    expect(authority.getPlayerView('p1').totalXp).toBe(20);
    expect(authority.getPlayerView('p2').totalXp).toBe(20);

    apply(authority, {
      type: 'ruin-inspected',
      eventId: 'p1:inspect',
      playerId: 'p1',
      ruinId: 'ruin:previous-civilization-ruin',
    });
    expect(authority.getPlayerView('p1').totalXp).toBe(120);
    expect(authority.getPlayerView('p2').totalXp).toBe(20);
  });

  it('round-trips canonical state and fails reconstruction before publish on corruption', () => {
    const authority = progression();
    apply(authority, {
      type: 'gather-completed',
      eventId: 'roundtrip:gather',
      playerId: 'p1',
      resourceId: 'resource:fiber-plant',
    });
    const snapshot = authority.exportSnapshot();
    expect(progression(snapshot).exportSnapshot()).toEqual(snapshot);

    const player = snapshot.players[0];
    if (player === undefined) throw new Error('Expected player snapshot.');

    expect(() => progression(Object.freeze({
      players: Object.freeze([
        Object.freeze({ ...player, level: 99 }),
      ]),
    }))).toThrow(/scalar state is corrupt/);

    expect(() => progression(Object.freeze({
      players: Object.freeze([
        Object.freeze({
          ...player,
          repeatCounts: Object.freeze({
            ...player.repeatCounts,
            gather: 21,
          }),
        }),
      ]),
    }))).toThrow(/repeat counter is corrupt/);
  });
});

describe('Progression authoritative item-event seam', () => {
  it('awards only successful committed craft events and does not double-award retries', () => {
    const catalog = createPhase1ContentCatalog();
    const progressionAuthority = new Phase1ProgressionAuthority({ catalog });
    const world = new Phase1ItemTestWorld();
    const initialLedger: ItemLedgerSnapshot = Object.freeze({
      containers: Object.freeze([
        inventory([
          stack('fiber', 'item:plant-fiber', 4),
        ]),
      ]),
    });
    const items = new Phase1ItemAuthority({
      catalog,
      world,
      initialLedger,
      events: new ProgressionItemEventSink(progressionAuthority),
    });

    const command = {
      type: 'craft' as const,
      operationId: 'craft:cordage',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      recipeId: 'recipe:cordage',
    };
    expect(items.execute(command)).toMatchObject({ status: 'committed' });
    expect(progressionAuthority.getPlayerView('p1').totalXp).toBe(8);

    expect(items.execute(command)).toMatchObject({ status: 'committed' });
    expect(progressionAuthority.getPlayerView('p1').totalXp).toBe(8);

    expect(items.execute({
      ...command,
      operationId: 'craft:stale',
      expectedInventoryRevision: 0,
    })).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });
    expect(progressionAuthority.getPlayerView('p1').totalXp).toBe(8);
  });
});
