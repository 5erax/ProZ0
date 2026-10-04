import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import type { ColonyProfessionId } from '../../src/content/phase2/ColonyDepthContent';
import type { WorldPosition } from '../../src/foundation';
import { Phase1ItemAuthority, type ItemStackState } from '../../src/simulation';
import { ColonyDepthAuthority, colonyStorageMultiplier, emptyColonyDepthState, validateColonyDepthState,
  type ColonyDepthCommand } from '../../src/simulation/colony/ColonyDepthAuthority';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function fixture(crateMaterial = 'item:timber', crateQuantity = 0, secondEngineer = false) {
  const catalog = createPhase1ContentCatalog();
  const initial = validateColonyDepthState({ ...emptyColonyDepthState(),
    discoveredBiomes: ['landing-grassland', 'mist-marsh'],
    researchIds: ['field-survey', 'water-stewardship', 'expanded-storage', 'cultivation'],
    professions: { p1: 'engineer', ...(secondEngineer ? { p2: 'engineer' } : {}) } });
  const crateStacks: ItemStackState[] = [];
  const maxStack = catalog.getAs(crateMaterial, 'item').maxStack;
  for (let remaining = crateQuantity, ordinal = 0; remaining > 0; ordinal++) {
    const quantity = Math.min(maxStack, remaining); remaining -= quantity;
    crateStacks.push({ stackId: 'crate-stock:' + String(ordinal), itemDefinitionId: crateMaterial, quantity, condition: null });
  }
  let colony: ColonyDepthAuthority | undefined;
  const items = new Phase1ItemAuthority({ catalog, world: new Phase1ItemTestWorld(),
    storageCapacityMultiplier: () => colonyStorageMultiplier(colony?.read() ?? initial),
    initialLedger: { containers: [
      ...['p1', 'p2'].map(playerId => ({ containerId: 'inventory:' + playerId, kind: 'player-inventory' as const,
        ownerPlayerId: playerId, revision: 0, stacks: [] })),
      { containerId: 'crate:shared', kind: 'storage-crate', ownerPlayerId: null, revision: 0, stacks: crateStacks },
    ] } });
  let position: WorldPosition = { x: 0, y: 0 }, alive = true, remoteLab = false;
  const actor = (playerId: string) => {
    if (!['p1', 'p2'].includes(playerId)) throw new Error('Unknown fixture character.');
    return { position, alive };
  };
  const lab = () => remoteLab;
  colony = new ColonyDepthAuthority('profession-switch-fixture', items, actor, initial, lab);
  let ordinal = 0;
  const command = (targetId: ColonyProfessionId, playerId = 'p1'): ColonyDepthCommand => ({
    action: 'specialize', targetId, playerId, operationId: 'profession-switch:' + String(++ordinal),
    expectedRevision: colony!.read().revision, expectedInventoryRevision: items.getContainerView('inventory:' + playerId).revision });
  return { items, command, get colony() { return colony!; },
    move: (point: WorldPosition) => { position = point; },
    die: () => { alive = false; },
    setLab: (value: boolean) => { remoteLab = value; },
    reopen: () => { colony = new ColonyDepthAuthority('profession-switch-fixture', items, actor,
      JSON.parse(JSON.stringify(colony!.read())), lab); },
  };
}
describe('eligible active profession switching', () => {
  it('replaces the active bonus without stacking, material spending or repeat awards', () => {
    const f = fixture(), ledger = f.items.exportLedgerSnapshot();
    const command = f.command('explorer'), result = f.colony.execute(command);
    expect(result.status).toBe('committed'); expect(f.colony.read().professions).toEqual({ p1: 'explorer' });
    expect(colonyStorageMultiplier(f.colony.read())).toBe(1.5);
    f.reopen(); expect(f.colony.execute(command)).toEqual(result);
    expect(f.colony.execute(f.command('cultivator')).status).toBe('committed');
    expect(f.colony.read().professions).toEqual({ p1: 'cultivator' });
    expect(f.colony.execute(f.command('engineer')).status).toBe('committed');
    expect(f.colony.read().professions).toEqual({ p1: 'engineer' });
    expect(f.colony.execute(f.command('engineer'))).toMatchObject({ reason: 'ALREADY_SPECIALIZED' });
    expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  });
  it('requires current inventory revisions, live actors, eligibility and the existing station gate', () => {
    const f = fixture(), before = f.colony.read();
    expect(f.colony.execute({ ...f.command('cultivator'), expectedInventoryRevision: 1 })).toMatchObject({ reason: 'STALE_REVISION' });
    expect(f.colony.read()).toEqual(before);
    f.move({ x: 100, y: 0 });
    expect(f.colony.execute(f.command('cultivator'))).toMatchObject({ reason: 'RETURN_TO_BASE' });
    f.setLab(true); expect(f.colony.execute(f.command('cultivator')).status).toBe('committed');
    f.die(); expect(f.colony.execute(f.command('explorer'))).toMatchObject({ reason: 'PLAYER_DEAD' });
    const noExplorer = fixture();
    const state = { ...noExplorer.colony.read(), discoveredBiomes: ['landing-grassland'] as const };
    const restricted = new ColonyDepthAuthority('profession-switch-fixture', noExplorer.items,
      () => ({ position: { x: 0, y: 0 }, alive: true }), state);
    expect(restricted.execute(noExplorer.command('explorer'))).toMatchObject({ reason: 'PROFESSION_PREREQUISITE' });
  });
  it('blocks losing the last Engineer until shared crate volume fits the researched capacity', () => {
    const f = fixture('item:timber', 100), state = f.colony.read(), ledger = f.items.exportLedgerSnapshot();
    expect(f.items.getContainerView('crate:shared').totalVolume).toBe(200);
    expect(f.colony.execute(f.command('cultivator'))).toMatchObject({ reason: 'REDUCE_STORAGE_BEFORE_SWITCH' });
    expect(f.colony.read()).toEqual(state); expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
    expect(f.items.execute({ type: 'transfer', operationId: 'reduce-shared-load', playerId: 'p1', sourceContainerId: 'crate:shared',
      sourceExpectedRevision: 0, targetContainerId: 'inventory:p1', targetExpectedRevision: 0,
      sourceStackId: 'crate-stock:0', quantity: 10 }).status).toBe('committed');
    expect(f.items.getContainerView('crate:shared').totalVolume).toBe(180);
    expect(f.colony.execute(f.command('cultivator')).status).toBe('committed');
    expect(f.items.getContainerView('crate:shared').storageCapacityMultiplier).toBe(1.5);
    f.reopen(); expect(f.colony.profession('p1')).toBe('cultivator');
  });
  it('checks weight separately and permits switching while another Engineer retains capacity', () => {
    const heavy = fixture('item:metal-ore', 180);
    expect(heavy.items.getContainerView('crate:shared').totalVolume).toBe(135);
    expect(heavy.colony.execute(heavy.command('explorer'))).toMatchObject({ reason: 'REDUCE_STORAGE_BEFORE_SWITCH' });
    const shared = fixture('item:timber', 100, true);
    expect(shared.colony.execute(shared.command('cultivator')).status).toBe('committed');
    expect(shared.colony.read().professions).toEqual({ p1: 'cultivator', p2: 'engineer' });
    expect(colonyStorageMultiplier(shared.colony.read())).toBe(2);
    expect(shared.colony.execute(shared.command('explorer', 'p2'))).toMatchObject({ reason: 'REDUCE_STORAGE_BEFORE_SWITCH' });
  });
});
