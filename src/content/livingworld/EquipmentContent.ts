import type { ItemDefinitionV1 } from '../SchemaV1';
import type { FishingRecipe } from './FishingContent';

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;
export type ItemRarity = typeof ITEM_RARITIES[number];
/** Accessible labels accompany colour; absence on older definitions means common. */
export const RARITY_STYLE: Readonly<Record<ItemRarity, { colour: string; label: string; vi: string }>> = {
  common: { colour: '#eef0e8', label: 'Common', vi: 'Thông thường' },
  uncommon: { colour: '#92d879', label: 'Uncommon', vi: 'Không phổ biến' },
  rare: { colour: '#7fbbff', label: 'Rare', vi: 'Hiếm' },
  epic: { colour: '#cd9fff', label: 'Epic', vi: 'Sử thi' },
  legendary: { colour: '#ffdb70', label: 'Legendary', vi: 'Huyền thoại' },
  mythic: { colour: '#ff8991', label: 'Mythic', vi: 'Thần thoại' },
};
const tiers = [
  ['reinforced-spear', 'Reinforced Spear', 'uncommon', 28, 16],
  ['alloy-spear', 'Alloy Spear', 'rare', 32, 17],
  ['tempered-spear', 'Tempered Spear', 'epic', 37, 18],
  ['relic-spear', 'Relic Spear', 'legendary', 43, 19],
  ['mythic-relic-spear', 'Mythic Relic Spear', 'mythic', 50, 20],
] as const;
export const GEAR_ITEMS: readonly ItemDefinitionV1[] = tiers.map(([id, displayName, rarity, damage, staminaCost]) => ({
  kind: 'item', id: 'item:' + id, displayName, rarity, category: 'weapon', unitWeightKg: 1.8, unitVolume: 2.5, maxStack: 1, conditionMax: 100, ordinaryStorageAllowed: true,
  capabilities: ['equippable', 'usable', 'melee-weapon'],
  useProfile: { type: 'melee-weapon', rangeFootprints: 1.5, frontalArcDegrees: 90, staminaCost, damage, cooldownSeconds: .65, conditionCostOnSuccessfulHit: 1 },
}));
export const GEAR_RECIPES: readonly FishingRecipe[] = [
  { id: 'reinforced-spear', name: 'Reinforced Spear', costs: [['item:basic-spear', 1], ['item:cordage', 1], ['item:timber', 2]], output: 'item:reinforced-spear', quantity: 1, station: 'field-workbench' },
  { id: 'alloy-spear', name: 'Alloy Spear', costs: [['item:reinforced-spear', 1], ['item:metal-ore', 3], ['item:leather', 1]], output: 'item:alloy-spear', quantity: 1, station: 'field-workbench' },
  { id: 'tempered-spear', name: 'Tempered Spear', costs: [['item:alloy-spear', 1], ['item:metal-ore', 5], ['item:cordage', 2]], output: 'item:tempered-spear', quantity: 1, station: 'field-workbench' },
  { id: 'relic-spear', name: 'Relic Spear', costs: [['item:tempered-spear', 1], ['item:ancient-alloy-shard', 1], ['item:leather', 2]], output: 'item:relic-spear', quantity: 1, station: 'field-lab' },
  { id: 'mythic-relic-spear', name: 'Mythic Relic Spear', costs: [['item:relic-spear', 1], ['item:metal-ore', 8], ['item:cordage', 3], ['item:leather', 2]], output: 'item:mythic-relic-spear', quantity: 1, station: 'field-lab' },
];
/** Equipment is a bounded content extension, never an arbitrary client supplied ID. */
export function isKnownMeleeEquipment(id: string): boolean {
  return id === 'item:basic-spear' || GEAR_ITEMS.some(item => item.id === id);
}
