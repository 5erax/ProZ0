import type { ItemDefinitionV1 } from '../SchemaV1';
export const SEASON_TICKS = 12 * 60 * 60;
export const SEASONS = [
  {
    id: 'spring',
    name: 'Spring',
    growthMilli: 1350,
    evaporationMilli: 1000,
    yieldMilli: 1000,
    thermalOffset: 0,
  },
  {
    id: 'summer',
    name: 'Summer',
    growthMilli: 1000,
    evaporationMilli: 2000,
    yieldMilli: 1000,
    thermalOffset: 15,
  },
  {
    id: 'autumn',
    name: 'Autumn',
    growthMilli: 1000,
    evaporationMilli: 800,
    yieldMilli: 1250,
    thermalOffset: -8,
  },
  {
    id: 'winter',
    name: 'Winter',
    growthMilli: 450,
    evaporationMilli: 700,
    yieldMilli: 1000,
    thermalOffset: -32,
  },
] as const;
export function seasonAt(tick: number) {
  if (!Number.isSafeInteger(tick) || tick < 0)
    throw Error('Invalid season clock');
  return {
    ...SEASONS[Math.floor(tick / SEASON_TICKS) % 4]!,
    year: Math.floor(tick / (SEASON_TICKS * 4)) + 1,
    remainingTicks: SEASON_TICKS - (tick % SEASON_TICKS),
  };
}
export const SOILS = [
  { id: 'loam', name: 'Loam', growthMilli: 1000, retentionMilli: 1000 },
  { id: 'sand', name: 'Sand', growthMilli: 700, retentionMilli: 650 },
  { id: 'clay', name: 'Clay', growthMilli: 900, retentionMilli: 1200 },
  { id: 'peat', name: 'Peat', growthMilli: 1250, retentionMilli: 1350 },
  { id: 'rocky', name: 'Rocky', growthMilli: 450, retentionMilli: 600 },
] as const;
export function livingHash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
}
export function soilAt(seed: string, position: { x: number; y: number }) {
  if (!seed || !Number.isFinite(position.x) || !Number.isFinite(position.y))
    throw Error('Invalid soil query');
  const biome =
      livingHash(
        seed +
          ':soil-region:' +
          Math.floor(position.x / 64) +
          ':' +
          Math.floor(position.y / 64),
      ) % 3,
    h = livingHash(
      seed +
        ':soil:' +
        Math.floor(position.x / 4) +
        ':' +
        Math.floor(position.y / 4),
    );
  const choices =
    biome === 1
      ? [0, 2, 3, 3, 0]
      : biome === 2
        ? [1, 4, 1, 2, 0]
        : [0, 0, 2, 3, 1];
  return SOILS[choices[h % choices.length]!]!;
}
export const CROPS = [
  {
    id: 'grain',
    name: 'Grain',
    seed: 'item:grain-seed',
    output: 'item:grain',
    cycleTicks: 18000,
    yield: 4,
  },
  {
    id: 'root',
    name: 'Root Vegetables',
    seed: 'item:root-seed',
    output: 'item:root-vegetable',
    cycleTicks: 14400,
    yield: 4,
  },
  {
    id: 'flax',
    name: 'Flax',
    seed: 'item:flax-seed',
    output: 'item:plant-fiber',
    cycleTicks: 14400,
    yield: 4,
  },
  {
    id: 'herb',
    name: 'Medicinal Herbs',
    seed: 'item:herb-seed',
    output: 'item:medicinal-herb',
    cycleTicks: 10800,
    yield: 4,
  },
] as const;
export type CropId = (typeof CROPS)[number]['id'];
export const cropDefinition = (id: string) => CROPS.find((c) => c.id === id);
export const SPECIES = [
  {
    id: 'chicken',
    name: 'Chicken',
    matureSeconds: 120,
    breedSeconds: 180,
    health: 4,
    meat: 1,
    product: 'item:egg',
    productSeconds: 120,
    diet: [] as readonly string[],
    tame: true,
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    matureSeconds: 90,
    breedSeconds: 150,
    health: 4,
    meat: 1,
    product: null,
    productSeconds: 0,
    diet: [] as readonly string[],
    tame: true,
  },
  {
    id: 'goat',
    name: 'Goat',
    matureSeconds: 240,
    breedSeconds: 300,
    health: 8,
    meat: 3,
    product: 'item:milk',
    productSeconds: 180,
    diet: [] as readonly string[],
    tame: true,
  },
  {
    id: 'boar',
    name: 'Boar',
    matureSeconds: 180,
    breedSeconds: 240,
    health: 10,
    meat: 4,
    product: null,
    productSeconds: 0,
    diet: [] as readonly string[],
    tame: true,
  },
  {
    id: 'fox',
    name: 'Fox',
    matureSeconds: 200,
    breedSeconds: 300,
    health: 6,
    meat: 1,
    product: null,
    productSeconds: 0,
    diet: ['chicken', 'rabbit'],
    tame: false,
  },
  {
    id: 'wolf',
    name: 'Wolf',
    matureSeconds: 300,
    breedSeconds: 360,
    health: 12,
    meat: 2,
    product: null,
    productSeconds: 0,
    diet: ['goat', 'boar'],
    tame: false,
  },
] as const;
export type SpeciesId = (typeof SPECIES)[number]['id'];
export const speciesDefinition = (id: string) =>
  SPECIES.find((s) => s.id === id);
export const FORAGE = [
  {
    id: 'berry-bush',
    name: 'Berry Bush',
    output: 'item:berries',
    quantity: 2,
    renewalTicks: 10800,
  },
  {
    id: 'wild-grain',
    name: 'Wild Grain',
    output: 'item:grain-seed',
    quantity: 2,
    renewalTicks: 9000,
  },
  {
    id: 'wild-flax',
    name: 'Wild Flax',
    output: 'item:flax-seed',
    quantity: 2,
    renewalTicks: 12000,
  },
  {
    id: 'wild-herbs',
    name: 'Wild Herbs',
    output: 'item:herb-seed',
    quantity: 2,
    renewalTicks: 10800,
  },
  {
    id: 'clay-bank',
    name: 'Clay Bank',
    output: 'item:clay',
    quantity: 3,
    renewalTicks: 18000,
  },
  {
    id: 'salt-stone',
    name: 'Salt Deposit',
    output: 'item:salt',
    quantity: 2,
    renewalTicks: 18000,
  },
] as const;
export type ForageId = (typeof FORAGE)[number]['id'];
export const forageDefinition = (id: string) => FORAGE.find((f) => f.id === id);
type Cost = readonly [string, number];
export const LIVING_FACILITIES = [
  {
    id: 'livestock-pen',
    name: 'Livestock Pen',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 4],
      ['item:cordage', 1],
    ],
    purpose:
      'Tether, feed and breed local livestock; protects animals from wild predators.',
  },
  {
    id: 'poultry-coop',
    name: 'Poultry Coop',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 3],
      ['item:plant-fiber', 4],
    ],
    purpose: 'Shelter chickens and collect eggs after feeding.',
  },
  {
    id: 'greenhouse',
    name: 'Field Greenhouse',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 4],
      ['item:plant-fiber', 6],
      ['item:clay', 2],
    ],
    purpose: 'Protect nearby crops from frost and reduce evaporation.',
  },
  {
    id: 'irrigation-tank',
    name: 'Irrigation Tank',
    canonical: null,
    shape: 'structure:storage-crate',
    costs: [
      ['item:timber', 3],
      ['item:clay', 3],
    ],
    purpose:
      'Fill with carried water; automatically waters nearby plots with a finite reservoir.',
  },
  {
    id: 'compost-bin',
    name: 'Compost Bin',
    canonical: null,
    shape: 'structure:storage-crate',
    costs: [
      ['item:timber', 2],
      ['item:plant-fiber', 3],
    ],
    purpose: 'Convert organic material into soil fertilizer.',
  },
  {
    id: 'clay-kiln',
    name: 'Clay Kiln',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:stone', 4],
      ['item:clay', 4],
    ],
    purpose: 'Fire bricks and make charcoal from timber.',
  },
  {
    id: 'smoking-rack',
    name: 'Smoking Rack',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 3],
      ['item:cordage', 1],
    ],
    purpose: 'Preserve hunted meat with salt and charcoal.',
  },
  {
    id: 'grain-mill',
    name: 'Hand Grain Mill',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:stone', 3],
      ['item:timber', 2],
    ],
    purpose: 'Mill harvested grain into flour for bread.',
  },
  {
    id: 'tannery',
    name: 'Field Tannery',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 3],
      ['item:stone', 2],
    ],
    purpose: 'Process raw hides into leather for clothing and tools.',
  },
  {
    id: 'field-cabin',
    name: 'Field Cabin',
    canonical: null,
    shape: 'structure:workbench',
    costs: [
      ['item:timber', 6],
      ['item:plant-fiber', 4],
      ['item:cordage', 1],
    ],
    purpose:
      'Independent shelter and safe rest anywhere on suitable explored ground.',
  },
] as const;
export const LIVING_RECIPES: readonly {
  id: string;
  name: string;
  costs: readonly Cost[];
  output: string;
  quantity: number;
  station: string | null;
}[] = [
  {
    id: 'root-seeds',
    name: 'Prepare Root Seeds',
    costs: [['item:edible-plant', 1]],
    output: 'item:root-seed',
    quantity: 2,
    station: null,
  },
  {
    id: 'field-hoe',
    name: 'Field Hoe',
    costs: [
      ['item:stone', 2],
      ['item:timber', 1],
      ['item:cordage', 1],
    ],
    output: 'item:field-hoe',
    quantity: 1,
    station: null,
  },
  {
    id: 'watering-can',
    name: 'Watering Can',
    costs: [
      ['item:clay', 2],
      ['item:timber', 1],
    ],
    output: 'item:watering-can',
    quantity: 1,
    station: null,
  },
  {
    id: 'animal-feed',
    name: 'Animal Feed',
    costs: [['item:grain', 2]],
    output: 'item:animal-feed',
    quantity: 3,
    station: null,
  },
  {
    id: 'compost',
    name: 'Compost',
    costs: [
      ['item:edible-plant', 2],
      ['item:plant-fiber', 2],
    ],
    output: 'item:compost',
    quantity: 2,
    station: 'compost-bin',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    costs: [['item:timber', 1]],
    output: 'item:charcoal',
    quantity: 2,
    station: 'clay-kiln',
  },
  {
    id: 'brick',
    name: 'Fired Bricks',
    costs: [
      ['item:clay', 2],
      ['item:timber', 1],
    ],
    output: 'item:brick',
    quantity: 2,
    station: 'clay-kiln',
  },
  {
    id: 'cooked-meat',
    name: 'Cooked Meat',
    costs: [
      ['item:raw-meat', 1],
      ['item:timber', 1],
    ],
    output: 'item:cooked-meat',
    quantity: 1,
    station: 'campfire',
  },
  {
    id: 'dried-meat',
    name: 'Smoked Meat',
    costs: [
      ['item:raw-meat', 2],
      ['item:salt', 1],
      ['item:charcoal', 1],
    ],
    output: 'item:dried-meat',
    quantity: 2,
    station: 'smoking-rack',
  },
  {
    id: 'flour',
    name: 'Flour',
    costs: [['item:grain', 2]],
    output: 'item:flour',
    quantity: 2,
    station: 'grain-mill',
  },
  {
    id: 'bread',
    name: 'Bread',
    costs: [
      ['item:flour', 2],
      ['item:clean-water', 1],
      ['item:timber', 1],
    ],
    output: 'item:bread',
    quantity: 2,
    station: 'campfire',
  },
  {
    id: 'leather',
    name: 'Leather',
    costs: [
      ['item:raw-hide', 2],
      ['item:salt', 1],
    ],
    output: 'item:leather',
    quantity: 2,
    station: 'tannery',
  },
  {
    id: 'warm-cloak',
    name: 'Warm Cloak',
    costs: [
      ['item:wool', 3],
      ['item:leather', 1],
      ['item:cordage', 1],
    ],
    output: 'item:warm-cloak',
    quantity: 1,
    station: 'field-workbench',
  },
  {
    id: 'herbal-salve',
    name: 'Herbal Salve',
    costs: [
      ['item:medicinal-herb', 2],
      ['item:plant-fiber', 1],
    ],
    output: 'item:herbal-salve',
    quantity: 1,
    station: null,
  },
];
const resourceItem = (
  id: string,
  name: string,
  weight = 0.15,
  volume = 0.15,
): ItemDefinitionV1 => ({
  kind: 'item',
  id,
  displayName: name,
  category: 'raw-resource',
  unitWeightKg: weight,
  unitVolume: volume,
  maxStack: 20,
  conditionMax: null,
  ordinaryStorageAllowed: true,
  capabilities: [],
});
const food = (id: string, name: string, amount: number): ItemDefinitionV1 => ({
  ...resourceItem(id, name),
  category: 'food',
  capabilities: ['consumable'],
  useProfile: { type: 'restore-stat', stat: 'food', amount, channelSeconds: 1 },
});
export const LIVING_ITEMS: readonly ItemDefinitionV1[] = [
  ...CROPS.map((c) => resourceItem(c.seed, c.name + ' Seeds', 0.02, 0.02)),
  resourceItem('item:grain', 'Grain'),
  food('item:root-vegetable', 'Root Vegetable', 15),
  resourceItem('item:medicinal-herb', 'Medicinal Herb'),
  food('item:berries', 'Berries', 10),
  resourceItem('item:raw-meat', 'Raw Meat', 0.4, 0.3),
  food('item:cooked-meat', 'Cooked Meat', 30),
  food('item:egg', 'Egg', 12),
  food('item:milk', 'Milk', 18),
  resourceItem('item:wool', 'Wool', 0.2, 0.4),
  resourceItem('item:raw-hide', 'Raw Hide', 0.3, 0.3),
  resourceItem('item:leather', 'Leather', 0.2, 0.2),
  resourceItem('item:bone', 'Bone', 0.15, 0.15),
  resourceItem('item:clay', 'Clay', 0.6, 0.4),
  resourceItem('item:salt', 'Salt', 0.1, 0.1),
  resourceItem('item:charcoal', 'Charcoal', 0.15, 0.2),
  resourceItem('item:compost', 'Compost', 0.3, 0.3),
  resourceItem('item:animal-feed', 'Animal Feed', 0.2, 0.2),
  resourceItem('item:brick', 'Brick', 0.75, 0.5),
  resourceItem('item:flour', 'Flour'),
  food('item:bread', 'Bread', 25),
  food('item:dried-meat', 'Smoked Meat', 35),
  {
    ...resourceItem('item:field-hoe', 'Field Hoe', 1, 0.75),
    category: 'tool',
    maxStack: 1,
  },
  {
    ...resourceItem('item:watering-can', 'Watering Can', 0.6, 1),
    category: 'tool',
    maxStack: 1,
  },
  {
    ...resourceItem('item:warm-cloak', 'Warm Cloak', 1, 1.2),
    category: 'equipment',
    maxStack: 1,
    capabilities: ['equippable', 'thermal-equipment'],
    useProfile: {
      type: 'thermal-protection',
      harmfulThermalRateMultiplier: 0.5,
    },
  },
  {
    ...resourceItem('item:herbal-salve', 'Herbal Salve', 0.1, 0.1),
    category: 'medical',
    capabilities: ['consumable'],
    useProfile: {
      type: 'restore-stat',
      stat: 'health',
      amount: 20,
      channelSeconds: 2,
    },
  },
];
