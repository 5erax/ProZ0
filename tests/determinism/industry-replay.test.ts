import { describe, expect, it } from 'vitest';
import { industryTestFixture } from '../support/IndustryTestFixture';

function script(f: ReturnType<typeof industryTestFixture>): void {
  f.build('solar-array', { x: 0, y: 2 });
  const processor = f.build('fiber-processor', { x: 2, y: 0 });
  const fabricator = f.build('fabricator', { x: 4, y: 0 });
  f.perform({ action: 'deposit', targetId: processor, itemDefinitionId: 'item:plant-fiber', quantity: 9 });
  f.perform({ action: 'deposit', targetId: fabricator, itemDefinitionId: 'item:metal-ore', quantity: 3 });
  f.perform({ action: 'connect', targetId: processor, destinationId: fabricator, itemDefinitionId: 'item:cordage' });
}
describe('industrial deterministic continuation', () => {
  it('matches uninterrupted, saved/reopened and independently replayed ticks exactly', () => {
    const uninterrupted = industryTestFixture(), resumed = industryTestFixture(), replay = industryTestFixture();
    for (const f of [uninterrupted, resumed, replay]) script(f);
    uninterrupted.step(1800);
    resumed.step(479); resumed.reopen(); resumed.step(1321);
    replay.step(1800);
    expect(resumed.industry.read()).toEqual(uninterrupted.industry.read());
    expect(replay.industry.read()).toEqual(uninterrupted.industry.read());
    expect(resumed.items.exportLedgerSnapshot()).toEqual(uninterrupted.items.exportLedgerSnapshot());
  });
  it('is independent of serialized facility/link ordering', () => {
    const ordered = industryTestFixture(), reordered = industryTestFixture(); script(ordered); script(reordered);
    const saved = reordered.industry.read();
    const shuffled = industryTestFixture({ ...saved, facilities: [...saved.facilities].reverse(), links: [...saved.links].reverse() });
    ordered.step(1000); shuffled.step(1000);
    expect(shuffled.industry.read()).toEqual(ordered.industry.read());
  });
});
