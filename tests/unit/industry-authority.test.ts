import { describe, expect, it } from 'vitest';
import { INDUSTRY_FACILITIES, INDUSTRY_ITEM_IDS, INDUSTRY_RECIPES, validateIndustryContent } from '../../src/content/phase3/IndustryContent';
import { emptyIndustryState, validateIndustryState } from '../../src/simulation/industry/IndustryState';
import { industryTestFixture } from '../support/IndustryTestFixture';

describe('Phase 3 industry authority', () => {
  it('rejects surface industry transactions from an interior without moving stock or building at matching cave coordinates', () => {
    const f = industryTestFixture();
    const depot = f.build('depot', { x: 2, y: 0 });
    const before = f.industry.read(), ledger = f.items.exportLedgerSnapshot();
    f.setWorldspace('cave:test');
    for (const intent of [{ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 1 },
      { action: 'build', facilityKind: 'depot', position: { x: 4, y: 0 } },
      { action: 'dismantle', targetId: depot }] as const) expect(f.perform(intent)).toMatchObject({ status: 'rejected', reason: 'WRONG_WORLDSPACE' });
    expect(f.industry.read()).toEqual(before); expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
    f.setWorldspace('surface');
    expect(f.perform({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 1 }).status).toBe('committed');
  });
  it('uses compatible material identities and rejects condition-bearing tool storage', () => {
    validateIndustryContent();
    const f = industryTestFixture();
    for (const id of INDUSTRY_ITEM_IDS) expect(f.catalog.getAs(id, 'item').conditionMax).toBeNull();
    for (const definition of [...Object.values(INDUSTRY_FACILITIES), ...INDUSTRY_RECIPES])
      expect(definition.name.length).toBeGreaterThan(0);
    const depot = f.build('depot', { x: 2, y: 0 });
    expect(f.perform({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone-field-tool', quantity: 1 }))
      .toMatchObject({ status: 'rejected', reason: 'ITEM_NOT_SUPPORTED' });
  });
  it('research consumes real materials and honors shared colony prerequisites', () => {
    const f = industryTestFixture(emptyIndustryState());
    f.setResearchAvailable(false);
    const before = f.items.exportLedgerSnapshot();
    expect(f.perform({ action: 'research', targetId: 'automation' })).toMatchObject({ reason: 'RESEARCH_PREREQUISITE' });
    expect(f.items.exportLedgerSnapshot()).toEqual(before);
    f.setResearchAvailable(true);
    const command = f.command({ action: 'research', targetId: 'automation' });
    const result = f.industry.execute(command);
    expect(result.status).toBe('committed');
    expect(f.industry.execute(command)).toEqual(result);
    expect(f.industry.read().researchIds).toEqual(['automation']);
    const total = f.items.getContainerView('inventory:p1').stacks.filter(s => s.itemDefinitionId === 'item:metal-ore').reduce((sum, s) => sum + s.quantity, 0);
    expect(total).toBe(96);
  });
  it('previews spatial guards without stock or receipt mutation and revalidates changed ground', () => {
    const f = industryTestFixture();
    const before = f.industry.read(), stock = f.items.exportLedgerSnapshot();
    expect(f.industry.assessBuild('p1', 'depot', { x: 2, y: 0 })).toBeNull();
    expect(f.industry.assessBuild('missing', 'depot', { x: 2, y: 0 })).toBe('UNKNOWN_PLAYER');
    expect(f.industry.assessBuild('p1', 'depot', { x: 9, y: 0 })).toBe('OUT_OF_RANGE');
    expect(f.industry.assessBuild('p1', 'depot', { x: NaN, y: 0 })).toBe('INVALID_POSITION');
    f.setWorldspace('cave:test');
    expect(f.industry.assessBuild('p1', 'depot', { x: 2, y: 0 })).toBe('WRONG_WORLDSPACE');
    f.setWorldspace('surface');
    expect(f.industry.read()).toEqual(before);
    expect(f.items.exportLedgerSnapshot()).toEqual(stock);
    f.setPlace(() => false);
    expect(f.industry.assessBuild('p1', 'depot', { x: 2, y: 0 })).toBe('PLACEMENT_BLOCKED');
    expect(f.perform({ action: 'build', facilityKind: 'depot', position: { x: 2, y: 0 } })).toMatchObject({ reason: 'PLACEMENT_BLOCKED' });
    expect(f.industry.read()).toEqual(before);
    expect(f.items.exportLedgerSnapshot()).toEqual(stock);
  });
  it('rejects blocked, distant, overlapping and dead construction without spending supplies', () => {
    const f = industryTestFixture();
    const before = f.items.exportLedgerSnapshot();
    f.setPlace(() => false);
    expect(f.perform({ action: 'build', facilityKind: 'depot', position: { x: 2, y: 0 } })).toMatchObject({ reason: 'PLACEMENT_BLOCKED' });
    f.setPlace(() => true);
    expect(f.perform({ action: 'build', facilityKind: 'depot', position: { x: 8, y: 0 } })).toMatchObject({ reason: 'OUT_OF_RANGE' });
    expect(f.items.exportLedgerSnapshot()).toEqual(before);
    f.build('depot', { x: 2, y: 0 });
    expect(f.perform({ action: 'build', facilityKind: 'depot', position: { x: 2.5, y: 0 } })).toMatchObject({ reason: 'PLACEMENT_BLOCKED' });
    f.die();
    expect(f.perform({ action: 'build', facilityKind: 'depot', position: { x: 4, y: 0 } })).toMatchObject({ reason: 'PLAYER_DEAD' });
  });
  it('replays saved receipts and rejects conflicting and competing deposits', () => {
    const f = industryTestFixture();
    const depot = f.build('depot', { x: 2, y: 0 });
    const command = f.command({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 3 });
    const competing = f.command({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 2 }, 'p2');
    const result = f.industry.execute(command), ledger = f.items.exportLedgerSnapshot();
    expect(f.industry.execute(competing)).toMatchObject({ reason: 'STALE_REVISION' });
    f.reopen();
    expect(f.industry.execute(command)).toEqual(result);
    expect(f.industry.execute({ ...command, quantity: 4 })).toMatchObject({ reason: 'OPERATION_ID_CONFLICT' });
    expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  });
  it('runs a powered fiber-to-cordage-to-repair-patch processing chain', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 });
    const processor = f.build('fiber-processor', { x: 2, y: 0 });
    const fabricator = f.build('fabricator', { x: 4, y: 0 });
    expect(f.perform({ action: 'deposit', targetId: processor, itemDefinitionId: 'item:plant-fiber', quantity: 9 }).status).toBe('committed');
    f.perform({ action: 'deposit', targetId: fabricator, itemDefinitionId: 'item:metal-ore', quantity: 3 });
    f.perform({ action: 'connect', targetId: processor, destinationId: fabricator, itemDefinitionId: 'item:cordage' });
    f.step(1000);
    expect(f.industry.read().facilities.find(facility => facility.id === processor)?.cycleOrdinal).toBe(3);
    expect(f.industry.read().facilities.find(facility => facility.id === fabricator)?.buffer).toContainEqual({ itemDefinitionId: 'item:repair-patch', quantity: 1 });
    expect(f.perform({ action: 'withdraw', targetId: fabricator, itemDefinitionId: 'item:repair-patch', quantity: 1 }).status).toBe('committed');
    expect(f.industry.read().facilities.find(facility => facility.id === fabricator)?.buffer.some(i => i.itemDefinitionId === 'item:repair-patch')).toBe(false);
  });
  it('conserves conveyor stock and prevents the same item traversing two links in one tick', () => {
    const f = industryTestFixture();
    const a = f.build('depot', { x: 0, y: 2 }), b = f.build('depot', { x: 2, y: 2 }), c = f.build('depot', { x: 4, y: 2 });
    f.perform({ action: 'deposit', targetId: a, itemDefinitionId: 'item:stone', quantity: 3 });
    f.perform({ action: 'connect', targetId: a, destinationId: b });
    f.perform({ action: 'connect', targetId: b, destinationId: c });
    f.step(30);
    expect(f.industry.read().facilities.find(facility => facility.id === b)?.buffer).toEqual([{ itemDefinitionId: 'item:stone', quantity: 1 }]);
    expect(f.industry.read().facilities.find(facility => facility.id === c)?.buffer).toEqual([]);
    f.step(30);
    expect(f.industry.read().facilities.flatMap(facility => facility.buffer).reduce((sum, i) => sum + i.quantity, 0)).toBe(3);
    expect(f.industry.read().facilities.find(facility => facility.id === c)?.buffer).toEqual([{ itemDefinitionId: 'item:stone', quantity: 1 }]);
  });
  it('keeps full output/input buffers unchanged and resumes when space is freed', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 });
    const greenhouse = f.build('greenhouse', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: greenhouse, itemDefinitionId: 'item:edible-plant', quantity: 30 });
    f.perform({ action: 'deposit', targetId: greenhouse, itemDefinitionId: 'item:clean-water', quantity: 2 });
    const before = f.industry.read().facilities.find(facility => facility.id === greenhouse)!.buffer;
    f.step(10);
    expect(f.industry.read().facilities.find(facility => facility.id === greenhouse)).toMatchObject({ status: 'OUTPUT_FULL', progressTicks: 0, buffer: before });
    f.perform({ action: 'withdraw', targetId: greenhouse, itemDefinitionId: 'item:edible-plant', quantity: 3 });
    f.step(1);
    expect(f.industry.read().facilities.find(facility => facility.id === greenhouse)).toMatchObject({ status: 'RUNNING', progressTicks: 1 });
  });
  it('allocates independent grids, joins them through relays and never exceeds capacity', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 }); f.build('solar-array', { x: 12, y: 2 });
    const machines = [f.build('fabricator', { x: 2, y: 0 }), f.build('fabricator', { x: 4, y: 0 }), f.build('fabricator', { x: 6, y: 0 })];
    for (const targetId of machines) {
      f.perform({ action: 'deposit', targetId, itemDefinitionId: 'item:cordage', quantity: 1 });
      f.perform({ action: 'deposit', targetId, itemDefinitionId: 'item:metal-ore', quantity: 1 });
    }
    expect(f.industry.read().powerNetworks).toHaveLength(2);
    expect(f.industry.read().powerNetworks.every(n => n.usedCapacity <= n.capacity)).toBe(true);
    expect(f.industry.read().facilities.filter(facility => facility.kind === 'fabricator' && facility.powered)).toHaveLength(2);
    f.build('power-relay', { x: 6, y: 2 });
    expect(f.industry.read().powerNetworks).toHaveLength(1);
    expect(f.industry.read().powerNetworks[0]).toMatchObject({ capacity: 24, usedCapacity: 15 });
  });
  it('pauses at night and during disabled maintenance, then repairs with a real patch', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 });
    const processor = f.build('fiber-processor', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: processor, itemDefinitionId: 'item:plant-fiber', quantity: 3 });
    f.step(5); f.setDaylight(false); f.step(10);
    expect(f.industry.read().facilities.find(facility => facility.id === processor)?.progressTicks).toBe(5);
    f.setDaylight(true);
    const state = f.industry.read();
    expect(() => validateIndustryState({ ...state, nextFacilityOrdinal: 1 })).toThrow(/identity sequence/);
    const exhausted = validateIndustryState({ ...state, facilities: state.facilities.map(facility => facility.id === processor ? { ...facility, condition: 2, wearTicks: 299 } : facility) });
    const maintenance = industryTestFixture(exhausted);
    maintenance.step(1);
    expect(maintenance.industry.read().facilities.find(facility => facility.id === processor)).toMatchObject({ condition: 0, status: 'MAINTENANCE' });
    expect(maintenance.industry.read().events.at(-1)).toMatchObject({ type: 'BREAKDOWN', facilityId: processor });
    expect(maintenance.perform({ action: 'repair', targetId: processor }).status).toBe('committed');
    maintenance.step(1);
    expect(maintenance.industry.read().facilities.find(facility => facility.id === processor)).toMatchObject({ condition: 1000, status: 'RUNNING' });
  });
  it('upgrades greenhouse recipes, preserves supplies while switching and gives no offline yield', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 }); const greenhouse = f.build('greenhouse', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: greenhouse, itemDefinitionId: 'item:edible-plant', quantity: 1 });
    f.perform({ action: 'deposit', targetId: greenhouse, itemDefinitionId: 'item:clean-water', quantity: 2 });
    f.perform({ action: 'deposit', targetId: greenhouse, itemDefinitionId: 'item:plant-fiber', quantity: 1 });
    f.step(100);
    const buffer = f.industry.read().facilities.find(facility => facility.id === greenhouse)!.buffer;
    f.perform({ action: 'set-recipe', targetId: greenhouse, recipeId: 'intensive-crops' });
    expect(f.industry.read().facilities.find(facility => facility.id === greenhouse)).toMatchObject({ buffer, progressTicks: 0 });
    f.industry.tick(10_000);
    expect(f.industry.read().facilities.find(facility => facility.id === greenhouse)?.progressTicks).toBe(0);
    f.step(2400);
    expect(f.industry.read().facilities.find(facility => facility.id === greenhouse)?.buffer).toEqual([{ itemDefinitionId: 'item:edible-plant', quantity: 6 }]);
  });
  it('charges and drives cargo with its operator, rejects swept obstacles and cooldown teleporting', () => {
    const f = industryTestFixture();
    f.build('solar-array', { x: 0, y: 2 }); const rover = f.build('rover', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: rover, itemDefinitionId: 'item:metal-ore', quantity: 4 });
    f.step(500);
    f.setPlace(point => point.x < 3);
    expect(f.perform({ action: 'drive', targetId: rover, position: { x: 6, y: 0 } })).toMatchObject({ reason: 'PATH_BLOCKED' });
    f.setPlace(() => true);
    expect(f.perform({ action: 'drive', targetId: rover, position: { x: 6, y: 0 } }).status).toBe('committed');
    expect(f.industry.read().facilities.find(facility => facility.id === rover)).toMatchObject({ position: { x: 6, y: 0 }, energy: 920, buffer: [{ itemDefinitionId: 'item:metal-ore', quantity: 4 }] });
    expect(f.perform({ action: 'drive', targetId: rover, position: { x: 8, y: 0 } })).toMatchObject({ reason: 'DRIVE_COOLDOWN' });
    f.step(60);
    expect(f.perform({ action: 'drive', targetId: rover, position: { x: 8, y: 0 } }).status).toBe('committed');
  });
  it('rejects corrupt, future and cross-reference-invalid save extensions', () => {
    expect(() => validateIndustryState({ ...emptyIndustryState(), contentVersion: 2 })).toThrow();
    expect(() => validateIndustryState({ ...emptyIndustryState(), researchIds: ['mobility'] })).toThrow();
    const f = industryTestFixture(); f.build('depot', { x: 2, y: 0 });
    const state = f.industry.read();
    expect(() => validateIndustryState({ ...state, facilities: [{ ...state.facilities[0]!, buffer: [{ itemDefinitionId: 'item:stone', quantity: 65 }] }] })).toThrow();
    expect(() => validateIndustryState({ ...state, links: [{ id: 'bad', sourceId: state.facilities[0]!.id, destinationId: 'absent', itemDefinitionId: null, enabled: true }] })).toThrow();
    expect(() => validateIndustryState({ ...state, events: [{ id: 'future', facilityId: state.facilities[0]!.id, tick: 100, type: 'BREAKDOWN' }] })).toThrow();
  });
  it('dismantles empty facilities without losing costs and never reuses removed identities', () => {
    const f = industryTestFixture();
    const before = f.items.getContainerView('inventory:p1').stacks.reduce((sum, stack) => sum + stack.quantity, 0);
    const depot = f.build('depot', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 1 });
    expect(f.perform({ action: 'dismantle', targetId: depot })).toMatchObject({ reason: 'EMPTY_BUFFER_FIRST' });
    f.perform({ action: 'withdraw', targetId: depot, itemDefinitionId: 'item:stone', quantity: 1 });
    expect(f.perform({ action: 'dismantle', targetId: depot }).status).toBe('committed');
    expect(f.industry.read().facilities).toEqual([]);
    expect(f.items.getContainerView('inventory:p1').stacks.reduce((sum, stack) => sum + stack.quantity, 0)).toBe(before);
    const rebuilt = f.build('depot', { x: 2, y: 0 });
    expect(rebuilt).not.toBe(depot);
    expect(f.perform({ action: 'dismantle', targetId: depot })).toMatchObject({ reason: 'SOURCE_MISSING' });
  });
  it('keeps control revisions stable during network round trips while validating live stock', () => {
    const f = industryTestFixture(); const depot = f.build('depot', { x: 2, y: 0 });
    const command = f.command({ action: 'deposit', targetId: depot, itemDefinitionId: 'item:stone', quantity: 1 });
    const revision = f.industry.read().revision; f.step(60);
    expect(f.industry.read().revision).toBe(revision);
    expect(f.industry.execute(command).status).toBe('committed');
  });
});
