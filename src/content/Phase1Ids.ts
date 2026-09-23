export const PHASE1_ITEM_IDS = Object.freeze([
  'item:plant-fiber',
  'item:timber',
  'item:stone',
  'item:metal-ore',
  'item:edible-plant',
  'item:clean-water',
  'item:cordage',
  'item:stone-field-tool',
  'item:basic-spear',
  'item:thermal-wrap',
  'item:field-dressing',
  'item:repair-patch',
  'item:storage-crate-kit',
  'item:workbench-kit',
  'item:habitat-kit',
  'item:power-unit-kit',
  'item:machine-kit',
  'item:ancient-alloy-shard',
] as const);

export const PHASE1_RECIPE_IDS = Object.freeze([
  'recipe:cordage',
  'recipe:stone-field-tool',
  'recipe:basic-spear',
  'recipe:thermal-wrap',
  'recipe:field-dressing',
  'recipe:storage-crate-kit',
  'recipe:workbench-kit',
  'recipe:repair-patch',
  'recipe:habitat-kit',
  'recipe:power-unit-kit',
  'recipe:machine-kit',
] as const);

export const PHASE1_RESOURCE_IDS = Object.freeze([
  'resource:fiber-plant',
  'resource:food-plant',
  'resource:potable-water-source',
  'resource:timber-source',
  'resource:stone-outcrop',
  'resource:metal-ore-node',
] as const);

export const PHASE1_STRUCTURE_IDS = Object.freeze([
  'structure:landing-module',
  'structure:storage-crate',
  'structure:workbench',
  'structure:habitat-room',
  'structure:compact-power-unit',
  'structure:atmospheric-water-condenser',
] as const);

export const PHASE1_REQUIRED_CONTENT_IDS = Object.freeze([
  ...PHASE1_ITEM_IDS,
  ...PHASE1_RECIPE_IDS,
  ...PHASE1_RESOURCE_IDS,
  'entity:passive-wildlife',
  ...PHASE1_STRUCTURE_IDS,
  'machine:atmospheric-water-condenser',
  'hazard:cold-exposure',
  'weather:cold-rain',
  'hostile:territorial-predator',
  'ruin:previous-civilization-ruin',
  'progression:phase1-early-progression',
  'skill:fieldcraft-basics',
  'skill:maintenance-basics',
  'profession:explorer-prototype',
  'profession:engineer-prototype',
  'profession-quest:chart-the-unknown',
  'profession-quest:bring-water-online',
] as const);
