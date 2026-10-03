import type { ItemDefinitionV1 } from '../SchemaV1';
import type { FishingRecipe } from './FishingContent';

export const WEARABLE_SLOTS = ['head', 'legs', 'feet', 'accessory'] as const;
export type WearableSlot = typeof WEARABLE_SLOTS[number];
export interface WearableReferencesV1 {
  readonly version: 1;
  readonly head: string | null;
  readonly legs: string | null;
  readonly feet: string | null;
  readonly accessory: string | null;
}
export function emptyWearables(): WearableReferencesV1 {
  return Object.freeze({ version: 1, head: null, legs: null, feet: null, accessory: null });
}
export const WEARABLE_PROFILES = [
  { id: 'item:sun-visor', name: 'Sun Visor', slot: 'head', effect: 'Reduces hot-weather thermal target by 8 toward comfort (50).', weight: .4, volume: .7, rarity: 'uncommon' },
  { id: 'item:fur-trousers', name: 'Fur Trousers', slot: 'legs', effect: 'Raises cold-weather thermal target by 8 toward comfort (50).', weight: .8, volume: 1.2, rarity: 'uncommon' },
  { id: 'item:trail-boots', name: 'Trail Boots', slot: 'feet', effect: 'Reduces sprint stamina drain by 20%. Sprinting still increases hunger.', weight: .7, volume: 1, rarity: 'rare' },
  { id: 'item:hydration-pack', name: 'Hydration Pack', slot: 'accessory', effect: 'Reduces passive water drain by 20%. Does not create or restore water.', weight: .6, volume: 1.1, rarity: 'rare' },
] as const;
export const WEARABLE_ITEMS: readonly ItemDefinitionV1[] = WEARABLE_PROFILES.map(p => ({
  kind: 'item', id: p.id, displayName: p.name, rarity: p.rarity, category: 'equipment',
  unitWeightKg: p.weight, unitVolume: p.volume, maxStack: 1, conditionMax: 100,
  ordinaryStorageAllowed: true, capabilities: ['equippable'],
}));
export const WEARABLE_RECIPES: readonly FishingRecipe[] = [
  { id: 'sun-visor', name: 'Sun Visor', costs: [['item:leather', 1], ['item:cordage', 1], ['item:plant-fiber', 2]], output: 'item:sun-visor', quantity: 1, station: 'field-workbench' },
  { id: 'fur-trousers', name: 'Fur Trousers', costs: [['item:wool', 2], ['item:leather', 1], ['item:cordage', 1]], output: 'item:fur-trousers', quantity: 1, station: 'field-workbench' },
  { id: 'trail-boots', name: 'Trail Boots', costs: [['item:leather', 2], ['item:cordage', 2]], output: 'item:trail-boots', quantity: 1, station: 'field-workbench' },
  { id: 'hydration-pack', name: 'Hydration Pack', costs: [['item:leather', 2], ['item:cordage', 1], ['item:metal-ore', 1]], output: 'item:hydration-pack', quantity: 1, station: 'field-workbench' },
];
export function wearableSlotFor(id: string): WearableSlot | null {
  return WEARABLE_PROFILES.find(p => p.id === id)?.slot ?? null;
}
export function wearableThermalTarget(target: number, modifiers: {readonly coldProtection: number; readonly heatProtection: number}): number {
  return target < 50 ? Math.min(50, target + modifiers.coldProtection) : Math.max(50, target - modifiers.heatProtection);
}
export function validWearableReferences(value: unknown): value is WearableReferencesV1 {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.hasOwn(record, 'version') && record.version === 1 && Object.keys(record).length === 5 && Object.keys(record).every(key => key === 'version' || WEARABLE_SLOTS.some(slot => slot === key)) && WEARABLE_SLOTS.every(slot =>
    record[slot] === null || typeof record[slot] === 'string' && record[slot].length > 0 && record[slot].length <= 512);
}
