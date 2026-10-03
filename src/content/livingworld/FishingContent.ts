import type { ItemDefinitionV1 } from '../SchemaV1';

export const FISH_SPECIES = [
  { itemId: 'item:pond-minnow', name: 'Pond Minnow', weight: .15, volume: .15 },
  { itemId: 'item:river-trout', name: 'River Trout', weight: .4, volume: .3 },
  { itemId: 'item:marsh-perch', name: 'Marsh Perch', weight: .3, volume: .25 },
] as const;
const portable = (id: string, name: string, weight: number, volume: number): ItemDefinitionV1 => ({ kind: 'item', id, displayName: name, category: 'raw-resource', unitWeightKg: weight, unitVolume: volume, maxStack: 20, conditionMax: null, ordinaryStorageAllowed: true, capabilities: [] });
export const FISHING_ITEMS: readonly ItemDefinitionV1[] = [
  { ...portable('item:fishing-rod', 'Field Fishing Rod', .7, .75), category: 'tool', maxStack: 1 },
  portable('item:fishing-bait', 'Plant Fishing Bait', .025, .025),
  ...FISH_SPECIES.map(f => portable(f.itemId, f.name, f.weight, f.volume)),
  { ...portable('item:cooked-fish', 'Cooked Fish', .3, .2), category: 'food', capabilities: ['consumable'], useProfile: { type: 'restore-stat', stat: 'food', amount: 25, channelSeconds: 1 } },
];
export interface FishingRecipe { id: string; name: string; costs: readonly (readonly [string, number])[]; output: string; quantity: number; station: string | null }
export const FISHING_RECIPES: readonly FishingRecipe[] = [
  { id: 'field-fishing-rod', name: 'Field Fishing Rod', costs: [['item:timber', 2], ['item:cordage', 1], ['item:stone', 1]], output: 'item:fishing-rod', quantity: 1, station: null },
  { id: 'plant-fishing-bait', name: 'Plant Fishing Bait', costs: [['item:plant-fiber', 1], ['item:berries', 1]], output: 'item:fishing-bait', quantity: 4, station: null },
  ...FISH_SPECIES.map(f => ({ id: 'cook-' + f.itemId.slice(5), name: 'Cook ' + f.name, costs: [[f.itemId, 1], ['item:timber', 1]] as const, output: 'item:cooked-fish', quantity: 1, station: 'campfire' })),
] as const;
export const FISHING_STOCK_CAP = 8;
export const FISHING_SPOT_CAP = 128;
export const FISHING_RANGE = 4;
export const FISHING_REEL_WINDOW_TICKS = 240;
