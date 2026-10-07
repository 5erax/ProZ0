import { costLabel, missingCostText, type CostRequirement } from './CostRequirements';
import { materialHint } from './MaterialGuide';

export function costList(document: Document, requirements: readonly CostRequirement[], source?: (id: string) => string): HTMLElement {
  const list = document.createElement('div');
  list.className = 'p2-cost-list';
  list.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  const label = document.createElement('span'); label.textContent = costLabel('costs'); list.append(label);
  for (const requirement of requirements) {
    list.append(materialHint(document, requirement.name, source?.(requirement.itemId) ?? '', requirement.have, requirement.required, requirement.itemId));
  }
  const missing = missingCostText(requirements);
  if (missing) {
    const reason = document.createElement('span'); reason.className = 'p2-cost-deficit'; reason.textContent = missing;
    reason.style.flexBasis = '100%'; list.append(reason);
  }
  return list;
}
