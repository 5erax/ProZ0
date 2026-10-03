import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { FishingAuthority, type FishingCommand } from '../../src/simulation/livingworld/FishingAuthority';
import { validateFishingState, type FishingState } from '../../src/simulation/livingworld/FishingState';
import { SEASON_TICKS } from '../../src/content/livingworld/LivingWorldContent';

function fixture(options: { saved?: FishingState; full?: boolean; tick?: number; rod?: boolean; bait?: boolean } = {}) {
  let tick = options.tick ?? 0, water = true, line = true, serial = 0;
  const actor = { x: 100, y: 100, alive: true, healthMilli: 100000 };
  const items = new Phase1ItemAuthority({ catalog: createPhase1ContentCatalog(), world: new Phase1ItemTestWorld(),
    ...(options.full ? { playerCarryPolicy: { maxWeightKg: 1.25, hardWeightKg: 1.25, maxVolume: 100 } } : {}),
    initialLedger: { containers: [{ containerId: 'inventory:solo', kind: 'player-inventory', ownerPlayerId: 'solo', revision: 0, stacks: [
      ...(options.rod === false ? [] : [{ stackId: 'rod', itemDefinitionId: 'item:fishing-rod', quantity: 1, condition: null }]),
      ...(options.bait === false ? [] : [{ stackId: 'bait', itemDefinitionId: 'item:fishing-bait', quantity: 20, condition: null }]),
    ] }] } });
  const services = { seed: 'fish-test', tick: () => tick, actor: (id: string) => { if (id !== 'solo') throw Error(); return actor; }, water: (x: number, y: number) => water && !(x === actor.x && y === actor.y), clearLine: () => line, habitat: () => 'river' as const, cancelRest: () => {} };
  const authority = new FishingAuthority(items, services, options.saved);
  const command = (action: FishingCommand['action'], extra: Partial<FishingCommand> = {}): FishingCommand => ({ id: 'fish:' + ++serial, playerId: 'solo', action, expectedRevision: authority.revision(), expectedInventoryRevision: items.getContainerView('inventory:solo').revision, x: 103, y: 101, ...extra });
  return { actor, items, authority, services, command, setWater: (v: boolean) => { water = v; }, setLine: (v: boolean) => { line = v; }, advance: (v: number) => { tick = v; authority.tick(); } };
}

it('invalid water/range/line/tool/bait/stale casts pay nothing and create no fishing stock or RNG ordinal', () => {
  const f = fixture();
  const before = f.items.exportLedgerSnapshot();
  f.setWater(false); expect(f.authority.execute(f.command('cast')).message).toBe('FISHING_WATER_REQUIRED');
  f.setWater(true); expect(f.authority.execute(f.command('cast', { x: 120 })).message).toBe('OUT_OF_RANGE');
  f.setLine(false); expect(f.authority.execute(f.command('cast')).message).toBe('FISHING_LINE_BLOCKED');
  f.setLine(true); expect(f.authority.execute(f.command('cast', { expectedRevision: 99 })).status).toBe('rejected');
  expect(f.authority.execute(f.command('cast', { x: NaN })).message).toBe('INVALID_POSITION');
  expect(f.authority.read()).toBeUndefined(); expect(f.items.exportLedgerSnapshot()).toEqual(before);
  const noRod = fixture({ rod: false }), noBait = fixture({ bait: false });
  expect(noRod.authority.execute(noRod.command('cast')).message).toBe('FISHING_ROD_REQUIRED');
  expect(noBait.authority.execute(noBait.command('cast')).status).toBe('rejected'); expect(noBait.authority.read()).toBeUndefined();
  const submerged = fixture(); submerged.services.water = () => true;
  expect(submerged.authority.assessCast('solo',103,101)).toBe('FISHING_STAND_ON_BANK');
  expect(submerged.authority.execute(submerged.command('cast')).message).toBe('FISHING_STAND_ON_BANK'); expect(submerged.authority.read()).toBeUndefined();
});

it('a cast pays one bait; reload preserves selected fish/bite/ordinal and repeated reel cannot mint another catch', () => {
  const f = fixture(), cast = f.command('cast'); expect(f.authority.execute(cast).status).toBe('committed');
  const session = f.authority.session('solo')!; expect(Object.isFrozen(session)).toBe(true);
  expect(f.items.getContainerView('inventory:solo').stacks.find(s => s.stackId === 'bait')!.quantity).toBe(19);
  expect(f.authority.execute(cast).status).toBe('committed');
  expect(f.authority.execute(f.command('reel')).message).toBe('FISHING_WAIT_FOR_BITE');
  const reopened = new FishingAuthority(f.items, f.services, f.authority.read()); expect(reopened.session('solo')).toEqual(session);
  f.advance(session.biteTick); reopened.tick();
  const reel = f.command('reel', { expectedRevision: reopened.revision() });
  expect(reopened.execute(reel).message).toBe('FISHING_CAUGHT:' + session.fishItemId);
  const ledger = f.items.exportLedgerSnapshot(), state = reopened.read();
  expect(reopened.execute(reel).status).toBe('committed'); expect(f.items.exportLedgerSnapshot()).toEqual(ledger); expect(reopened.read()).toEqual(state);
  expect(reopened.execute({ ...reel, x: 99 }).message).toBe('OPERATION_ID_CONFLICT');
  expect(state!.spots[0]!.stock).toBe(7); expect(state!.spots[0]!.ordinal).toBe(1);
});

it('cancel, move, damage, death, rod loss and late reels interrupt without a catch or stock consumption', () => {
  for (const reason of ['cancel', 'move', 'damage', 'death', 'rod', 'late'] as const) {
    const f = fixture(); expect(f.authority.execute(f.command('cast')).status).toBe('committed'); const session = f.authority.session('solo')!;
    if (reason === 'cancel') expect(f.authority.execute(f.command('cancel')).message).toBe('FISHING_CANCELLED');
    if (reason === 'move') f.actor.x++;
    if (reason === 'damage') f.actor.healthMilli--;
    if (reason === 'death') f.actor.alive = false;
    if (reason === 'rod') f.items.commitColonyExchange({ operationId: 'remove', playerId: 'solo', expectedInventoryRevision: f.items.getContainerView('inventory:solo').revision, inputs: [{ itemDefinitionId: 'item:fishing-rod', quantity: 1 }], outputs: [] });
    f.advance(reason === 'late' ? session.endTick + 1 : 1);
    expect(f.authority.session('solo')).toBeUndefined(); expect(f.authority.read()!.spots[0]!.stock).toBe(8);
    expect(f.items.getContainerView('inventory:solo').stacks.some(s => s.itemDefinitionId === session.fishItemId)).toBe(false);
    expect(f.authority.read()!.spots[0]!.ordinal).toBe(1);
  }
});

it('full bag rejects reel atomically and keeps the bite for a retry after freeing space', () => {
  const f = fixture({ full: true }); expect(f.authority.execute(f.command('cast')).status).toBe('committed');
  f.advance(f.authority.session('solo')!.biteTick); const before = f.authority.read(), ledger = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(f.command('reel')).message).toBe('TARGET_CAPACITY_WEIGHT');
  expect(f.authority.read()).toEqual(before); expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  expect(f.items.commitColonyExchange({ operationId: 'free-space', playerId: 'solo', expectedInventoryRevision: f.items.getContainerView('inventory:solo').revision, inputs: [{ itemDefinitionId: 'item:fishing-bait', quantity: 10 }], outputs: [] }).status).toBe('committed');
  expect(f.authority.execute(f.command('reel')).status).toBe('committed'); expect(f.authority.read()!.spots[0]!.stock).toBe(7);
});

it('nearby water cells share finite stock, reload does not replenish, and winter regeneration has one bounded active step', () => {
  const start = SEASON_TICKS * 3, f = fixture({ tick: start });
  for (let i = 0; i < 8; i++) { expect(f.authority.execute(f.command('cast', { y: i % 2 ? 99 : 101 })).status).toBe('committed'); f.advance(f.authority.session('solo')!.biteTick); expect(f.authority.execute(f.command('reel')).status).toBe('committed'); }
  expect(f.authority.read()!.spots).toHaveLength(1); expect(f.authority.read()!.spots[0]!.stock).toBe(0);
  expect(f.authority.execute(f.command('cast')).message).toBe('FISHING_STOCK_RECOVERING');
  const reopened = new FishingAuthority(f.items, f.services, f.authority.read()); expect(reopened.read()!.spots[0]!.stock).toBe(0);
  f.advance(start + 10800); reopened.tick(); expect(reopened.read()!.spots[0]!.stock).toBe(1);
});

it('fishing persistence rejects duplicate players, unsupported versions and forged timing/species/populations', () => {
  const f = fixture(); f.authority.execute(f.command('cast')); const state = f.authority.read()!;
  for (const bad of [ { ...state, version: 2 }, { ...state, sessions: [...state.sessions, { ...state.sessions[0]!, id: 'duplicate' }] }, { ...state, spots: [{ ...state.spots[0]!, stock: 9 }] }, { ...state, sessions: [{ ...state.sessions[0]!, biteTick: state.lastTick }] }, { ...state, sessions: [{ ...state.sessions[0]!, fishItemId: 'item:mythic-fake' }] } ]) expect(() => validateFishingState(bad)).toThrow();
});
