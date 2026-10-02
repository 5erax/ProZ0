import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { inspectItem } from '../../src/client/presentation/ItemInspection';
import { inspectCharacter } from '../../src/client/presentation/CharacterInspection';
import type { PlayerSurvivalView } from '../../src/simulation';
const catalog = createPhase1ContentCatalog();
it('item inspection uses actual consumable/weapon profiles, distinguishes tool actions and exposes no unexplored location', () => {
  for (const item of catalog.list('item')) {
    const details = inspectItem(catalog, item.id);
    expect(details.purpose.length).toBeGreaterThan(10);
    expect(details.facts[0]).toContain(item.unitWeightKg.toFixed(2) + ' kg');
    expect(details.facts[0]).toContain(item.unitVolume.toFixed(2) + ' bulk units');
    expect(inspectItem(catalog, item.id)).toBe(details);
    if (item.useProfile?.type === 'restore-stat') expect(details.facts).toContain('Restores ' + item.useProfile.amount + ' ' + item.useProfile.stat + ' · use takes ' + item.useProfile.channelSeconds + ' s');
  }
  expect(inspectItem(catalog, 'item:stone-field-tool').canEquip).toBe(false);
  expect(inspectItem(catalog, 'item:stone-field-tool').purpose).toContain('not a weapon');
  expect(inspectItem(catalog, 'item:root-berry-bush').facts.join()).toContain('Replant');
  expect(inspectItem(catalog, 'item:plant-fiber').recipes).toContain('Cordage');
  expect(() => inspectItem(catalog, 'unregistered')).toThrow();
});
it('status describes simultaneous real conditions, exact combined authority penalty and recovery removes derived conditions', () => {
  const s: PlayerSurvivalView = { playerId: 'solo', revision: 2, tick: 123, health: 25, food: 0, water: 0, stamina: 0, temperature: 2, lifeState: { type: 'alive' }, staminaRegenPenaltyPercent: 100 };
  const before = structuredClone(s), adverse = inspectCharacter(s, 'OVERLOADED');
  expect(adverse.staminaRegenPenaltyPercent).toBe(100);
  expect(adverse.effects.map(e => e.id)).toEqual(['injured', 'thirst', 'hunger', 'thermal', 'exhausted', 'carrying']);
  expect(adverse.effects.find(e => e.id === 'thermal')!.consequence).toContain('every 3 active seconds');
  expect(adverse.effects.find(e => e.id === 'thermal')!.consequence).toContain('no fixed expiry');
  expect(s).toEqual(before);
  expect(inspectCharacter({ ...s, health: 100, food: 70, water: 80, stamina: 100, temperature: 50, staminaRegenPenaltyPercent: 0 }, 'NORMAL').effects).toEqual([]);
  expect(inspectCharacter({ ...s, temperature: 18 }, 'NORMAL').effects.find(e => e.id === 'thermal')!.consequence).toContain('every 10 active seconds');
  expect(inspectCharacter({ ...s, temperature: 19.5 }, 'NORMAL').effects.find(e => e.id === 'thermal')!.consequence).toContain('Current thermal damage: none');
});
