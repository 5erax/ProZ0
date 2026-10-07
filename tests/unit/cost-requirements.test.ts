import { afterEach, expect, it } from 'vitest';
import { costRequirements, missingCostText } from '../../src/client/presentation/CostRequirements';
import { setLocale } from '../../src/client/localization/Locale';

afterEach(() => setLocale('en'));

it.each([0, 1, 2, 3])('lists all %i material deficits, retaining sufficient materials and inventory', count => {
  const costs = [{ itemId: 'cordage', quantity: 3 }, { itemId: 'stone', quantity: 6 }, { itemId: 'timber', quantity: 4 }];
  const stock = new Map(costs.map((cost, index) => [cost.itemId, cost.quantity - (index < count ? index + 1 : 0)]));
  const before = [...stock];
  const requirements = costRequirements(costs, id => stock.get(id)!, id => id);
  expect(requirements.filter(value => value.status === 'missing')).toHaveLength(count);
  for (const [index, cost] of costs.entries()) {
    expect(requirements[index]!.deficit).toBe(index < count ? index + 1 : 0);
    expect(requirements[index]!.required).toBe(cost.quantity);
  }
  expect(missingCostText(requirements)).toBe(count ? 'Missing: ' + ['1 cordage', '2 stone', '3 timber'].slice(0, count).join(' · ') : '');
  expect([...stock]).toEqual(before);
});

it('uses Vietnamese quantities, excludes surplus and never presents full cost as a deficit', () => {
  setLocale('vi');
  const requirements = costRequirements([{ itemId: 'rope', quantity: 3 }, { itemId: 'ore', quantity: 6 }, { itemId: 'wood', quantity: 4 }],
    id => ({ rope: 2, ore: 0, wood: 12 })[id]!, id => ({ rope: 'Dây thừng', ore: 'Quặng kim loại', wood: 'Gỗ' })[id]!);
  expect(missingCostText(requirements)).toBe('Thiếu: 1 Dây thừng · 6 Quặng kim loại');
  expect(requirements[2]!.deficit).toBe(0);
});
