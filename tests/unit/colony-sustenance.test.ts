import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { Phase1ItemAuthority } from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { ColonySustenanceAuthority, CULTIVATION_POSITION, PEN_POSITION, CROP_CYCLE_TICKS,
  GRAZER_CARE_TICKS, emptyColonySustenanceState, validateColonySustenanceState,
  type ColonySustenanceAction } from '../../src/simulation/sustenance/ColonySustenanceAuthority';

function fixture() {
  let position: { x: number; y: number } = CULTIVATION_POSITION;
  let alive = true;
  const items = new Phase1ItemAuthority({ catalog: createPhase1ContentCatalog(), world: new Phase1ItemTestWorld(),
    initialLedger: { containers: ['p1', 'p2'].map(player => ({ containerId: 'inventory:' + player,
      kind: 'player-inventory' as const, ownerPlayerId: player, revision: 0,
      stacks: [{ stackId: player + ':timber', itemDefinitionId: 'item:timber', quantity: 7, condition: null },
        { stackId: player + ':cord', itemDefinitionId: 'item:cordage', quantity: 4, condition: null },
        { stackId: player + ':food', itemDefinitionId: 'item:edible-plant', quantity: 2, condition: null },
        { stackId: player + ':water', itemDefinitionId: 'item:clean-water', quantity: 2, condition: null }] })) } });
  const colony = new ColonySustenanceAuthority(items, () => ({ position, alive }),
    id => id === 'grazer' ? PEN_POSITION : null);
  let ordinal = 0;
  const command = (action: ColonySustenanceAction, player = 'p1') => ({ operationId: 'action:' + String(++ordinal),
    playerId: player, expectedRevision: colony.read().revision,
    expectedInventoryRevision: items.getContainerView('inventory:' + player).revision, action,
    ...(action === 'capture' ? { animalEntityId: 'grazer' } : {}) });
  return { items, colony, command, move: (pen: boolean) => { position = pen ? PEN_POSITION : CULTIVATION_POSITION; },
    die: () => { alive = false; } };
}

describe('colony sustenance authority', () => {
  it('grows food, keeps retries atomic, rejects competing harvest and resumes saved progress', () => {
    const f = fixture();
    expect(f.colony.execute(f.command('build-bed')).status).toBe('committed');
    const plant = f.command('plant');
    const result = f.colony.execute(plant);
    const inventory = f.items.exportLedgerSnapshot();
    expect(f.colony.execute(plant)).toEqual(result);
    expect(f.items.exportLedgerSnapshot()).toEqual(inventory);
    for (let tick = 0; tick < 120; tick++) f.colony.tick();
    const saved = JSON.parse(JSON.stringify(f.colony.read()));
    expect(validateColonySustenanceState(saved).cropProgressTicks).toBe(120);
    const reopened = new ColonySustenanceAuthority(f.items, () => ({ position: CULTIVATION_POSITION, alive: true }), () => null, saved);
    for (let tick = 120; tick < CROP_CYCLE_TICKS; tick++) reopened.tick();
    const revision = reopened.read().revision;
    const first = { ...f.command('harvest'), expectedRevision: revision };
    const second = { ...f.command('harvest', 'p2'), expectedRevision: revision };
    expect(reopened.execute(first).status).toBe('committed');
    expect(reopened.execute(second)).toMatchObject({ status: 'rejected', reason: 'STALE_REVISION' });
    expect(f.items.getContainerView('inventory:p1').stacks.find(s => s.itemDefinitionId === 'item:edible-plant')?.quantity).toBe(4);
  });
  it('captures one real animal, converts care to fertilizer and shortens one growing cycle', () => {
    const f = fixture();
    f.colony.execute(f.command('build-bed')); f.colony.execute(f.command('plant'));
    f.move(true);
    expect(f.colony.execute(f.command('build-pen')).status).toBe('committed');
    expect(f.colony.execute(f.command('capture')).status).toBe('committed');
    expect(f.colony.execute(f.command('capture')).status).toBe('rejected');
    expect(f.colony.execute(f.command('care')).status).toBe('committed');
    for (let tick = 0; tick < GRAZER_CARE_TICKS; tick++) f.colony.tick();
    expect(f.colony.read()).toMatchObject({ fertilizer: 1, animalEntityId: 'grazer', careProgressTicks: null });
    f.move(false);
    f.colony.execute(f.command('harvest')); f.colony.execute(f.command('plant', 'p2'));
    expect(f.colony.execute(f.command('fertilize', 'p2')).status).toBe('committed');
    expect(f.colony.read()).toMatchObject({ fertilizer: 0, cropCycleTicks: 5400 });
  });
  it('rejects dead or distant actors and rolls back partial material removal', () => {
    const f = fixture(); f.move(true);
    const before = f.items.exportLedgerSnapshot();
    expect(f.colony.execute(f.command('build-bed'))).toMatchObject({ reason: 'OUT_OF_RANGE' });
    f.move(false); f.die();
    expect(f.colony.execute(f.command('build-bed'))).toMatchObject({ reason: 'PLAYER_DEAD' });
    expect(f.items.exportLedgerSnapshot()).toEqual(before);
    expect(f.items.commitColonyExchange({ operationId: 'missing', playerId: 'p1', expectedInventoryRevision: 0,
      inputs: [{ itemDefinitionId: 'item:timber', quantity: 3 }, { itemDefinitionId: 'item:stone', quantity: 1 }], outputs: [] }).status).toBe('rejected');
    expect(f.items.exportLedgerSnapshot()).toEqual(before);
  });
  it('rejects corrupt save dependencies', () => {
    expect(() => validateColonySustenanceState({ ...emptyColonySustenanceState(), cropProgressTicks: 5 })).toThrow();
    expect(() => validateColonySustenanceState({ ...emptyColonySustenanceState(), animalEntityId: 'grazer' })).toThrow();
  });
});
