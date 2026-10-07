import { formatNumber, message, type MessageDictionary } from '../localization/Locale';

const messages: MessageDictionary = {
  en: { costs: 'Requires:', outputs: 'Produces:', missing: 'Missing: {items}', sufficient: 'Enough materials', amount: '{quantity} {name}' },
  vi: { costs: 'Cần:', outputs: 'Nhận:', missing: 'Thiếu: {items}', sufficient: 'Đủ nguyên liệu', amount: '{quantity} {name}' },
};

export interface CostRequirement {
  readonly itemId: string;
  readonly name: string;
  readonly have: number;
  readonly required: number;
  readonly deficit: number;
  readonly status: 'sufficient' | 'missing';
}

/** Read-only presentation projection. Inventory validation and spending stay in authority. */
export function costRequirements(
  costs: readonly { readonly itemId: string; readonly quantity: number }[],
  available: (itemId: string) => number,
  name: (itemId: string) => string,
): readonly CostRequirement[] {
  return costs.map(cost => {
    const have = available(cost.itemId);
    const deficit = Math.max(cost.quantity - have, 0);
    return { itemId: cost.itemId, name: name(cost.itemId), have, required: cost.quantity, deficit, status: deficit > 0 ? 'missing' : 'sufficient' };
  });
}

export function missingCostText(requirements: readonly CostRequirement[]): string {
  const missing = requirements.filter(requirement => requirement.status === 'missing');
  return missing.length ? message(messages, 'missing', {
    items: missing.map(requirement => message(messages, 'amount', {
      quantity: formatNumber(requirement.deficit), name: requirement.name,
    })).join(' · '),
  }) : '';
}

export function costLabel(kind: 'costs' | 'outputs' | 'sufficient'): string {
  return message(messages, kind);
}
