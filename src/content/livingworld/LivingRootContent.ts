import type { ItemDefinitionV1 } from '../SchemaV1';
import { FORAGE } from './LivingWorldContent';
export const LIVING_ROOT_ITEMS: readonly ItemDefinitionV1[] = FORAGE.filter(f => f.id.startsWith('wild-') || f.id === 'berry-bush').map(f => ({
  kind: 'item', id: 'item:root-' + f.id, displayName: f.name + ' Root', category: 'raw-resource', unitWeightKg: .15, unitVolume: .25, maxStack: 20, conditionMax: null, ordinaryStorageAllowed: true, capabilities: [],
}));
export const LIVING_ROOT_RECIPES = LIVING_ROOT_ITEMS.map(item => ({ id: 'compost-' + item.id.slice(10), name: 'Compost · ' + item.displayName, costs: [[item.id, 1] as const], output: 'item:compost', quantity: 1, station: 'compost-bin' }));
