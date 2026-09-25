export interface Phase1ProductionSprite {
  readonly assetPath: string;
  readonly url: string;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly columns: number;
  readonly index: number;
}

const ITEM_ICON_ATLAS_URL = new URL(
  '../../../assets/phase1/items/item_icon_atlas.png',
  import.meta.url,
).href;
const HUD_STATUS_ATLAS_URL = new URL(
  '../../../assets/phase1/ui/icons/hud_status_icons.png',
  import.meta.url,
).href;
const INTERACTION_ATLAS_URL = new URL(
  '../../../assets/phase1/ui/icons/interaction_icons.png',
  import.meta.url,
).href;
const MAP_MARKER_ATLAS_URL = new URL(
  '../../../assets/phase1/ui/map/map_marker_atlas.png',
  import.meta.url,
).href;
const PROGRESSION_ATLAS_URL = new URL(
  '../../../assets/phase1/ui/icons/progression_icon_atlas.png',
  import.meta.url,
).href;
const COOP_IDENTITY_ATLAS_URL = new URL(
  '../../../assets/phase1/ui/icons/coop_identity_markers.png',
  import.meta.url,
).href;
const PANEL_SKIN_URL = new URL(
  '../../../assets/phase1/ui/panels/ui_panel_skin.png',
  import.meta.url,
).href;
const BUILD_PREVIEW_PATTERN_URL = new URL(
  '../../../assets/phase1/ui/effects/build_preview_pattern.png',
  import.meta.url,
).href;
const TERRAIN_ATLAS_URL = new URL(
  '../../../assets/phase1/world/terrain/terrain_region_atlas.png',
  import.meta.url,
).href;
const PLAYER_URL = new URL(
  '../../../assets/phase1/actors/player_pioneer.png',
  import.meta.url,
).href;
const PREDATOR_URL = new URL(
  '../../../assets/phase1/actors/territorial_predator.png',
  import.meta.url,
).href;
const RUIN_URL = new URL(
  '../../../assets/phase1/world/discovery/previous_civilization_ruin.png',
  import.meta.url,
).href;
const HABITAT_URL = new URL(
  '../../../assets/phase1/world/structures/habitat_room.png',
  import.meta.url,
).href;
const CONDENSER_URL = new URL(
  '../../../assets/phase1/world/structures/atmospheric_water_condenser.png',
  import.meta.url,
).href;
const METAL_ORE_URL = new URL(
  '../../../assets/phase1/world/resources/metal_ore_node.png',
  import.meta.url,
).href;
const POTABLE_WATER_URL = new URL(
  '../../../assets/phase1/world/resources/potable_water_source.png',
  import.meta.url,
).href;
const DEATH_CACHE_URL = new URL(
  '../../../assets/phase1/world/discovery/death_cache.png',
  import.meta.url,
).href;

function sprite(
  assetPath: string,
  url: string,
  cellWidth: number,
  cellHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  index: number,
): Phase1ProductionSprite {
  return Object.freeze({
    assetPath,
    url,
    cellWidth,
    cellHeight,
    sourceWidth,
    sourceHeight,
    columns,
    index,
  });
}

const ITEM_NAMES = Object.freeze([
  'Plant Fiber',
  'Timber',
  'Stone',
  'Metal Ore',
  'Edible Plant',
  'Clean Water',
  'Cordage',
  'Stone Field Tool',
  'Basic Spear',
  'Thermal Wrap',
  'Field Dressing',
  'Repair Patch',
  'Storage Crate Kit',
  'Workbench Kit',
  'Habitat Kit',
  'Power Unit Kit',
  'Machine Kit',
  'Ancient Alloy Shard',
] as const);

const HUD_LABELS: Readonly<Record<string, number>> = Object.freeze({
  HEALTH: 0,
  FOOD: 1,
  WATER: 2,
  STAMINA: 3,
  TEMPERATURE: 4,
  TEMP: 4,
  WEIGHT: 5,
  VOLUME: 6,
  CONDITION: 7,
  COLD: 8,
  EXHAUSTED: 9,
  BROKEN: 10,
  DAMAGE: 11,
  WEATHER: 12,
  POWER: 13,
  DISCOVERY: 14,
  'DEATH CACHE': 15,
  XP: 16,
  LEVEL: 17,
});

const INTERACTION_VERBS: Readonly<Record<string, number>> = Object.freeze({
  INTERACT: 0,
  GATHER: 1,
  'PICK UP': 2,
  DROP: 3,
  TRANSFER: 4,
  CONSUME: 5,
  CRAFT: 6,
  REPAIR: 7,
  BUILD: 8,
  PLACE: 8,
  'BUILD / PLACE': 8,
  'OPEN CONTAINER': 9,
  'USE MACHINE': 10,
  INSPECT: 11,
  ATTACK: 12,
  RECOVER: 13,
  DISMANTLE: 14,
});

function atlasSprite(
  assetPath: string,
  url: string,
  cellWidth: number,
  cellHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  index: number,
): Phase1ProductionSprite {
  return sprite(
    assetPath,
    url,
    cellWidth,
    cellHeight,
    sourceWidth,
    sourceHeight,
    columns,
    index,
  );
}

export function itemIconSprite(
  name: string,
): Phase1ProductionSprite | null {
  const index = ITEM_NAMES.indexOf(name as (typeof ITEM_NAMES)[number]);
  return index === -1
    ? null
    : atlasSprite(
        'assets/phase1/items/item_icon_atlas.png',
        ITEM_ICON_ATLAS_URL,
        24,
        24,
        144,
        72,
        6,
        index,
      );
}

export function hudStatusSprite(
  label: string,
): Phase1ProductionSprite | null {
  const index = HUD_LABELS[label.toUpperCase()];
  return index === undefined
    ? null
    : atlasSprite(
        'assets/phase1/ui/icons/hud_status_icons.png',
        HUD_STATUS_ATLAS_URL,
        12,
        12,
        72,
        36,
        6,
        index,
      );
}

export function interactionSprite(
  verb: string,
): Phase1ProductionSprite | null {
  const index = INTERACTION_VERBS[verb.toUpperCase()];
  return index === undefined
    ? null
    : atlasSprite(
        'assets/phase1/ui/icons/interaction_icons.png',
        INTERACTION_ATLAS_URL,
        12,
        12,
        60,
        36,
        5,
        index,
      );
}

export function teammateIdentitySprite(
  shape: 'circle' | 'diamond' | 'triangle',
): Phase1ProductionSprite {
  const index = shape === 'circle' ? 1 : shape === 'diamond' ? 2 : 3;
  return atlasSprite(
    'assets/phase1/ui/icons/coop_identity_markers.png',
    COOP_IDENTITY_ATLAS_URL,
    12,
    12,
    48,
    12,
    4,
    index,
  );
}

export function mapMarkerSprite(index: number): Phase1ProductionSprite {
  return atlasSprite(
    'assets/phase1/ui/map/map_marker_atlas.png',
    MAP_MARKER_ATLAS_URL,
    12,
    12,
    36,
    36,
    3,
    index,
  );
}

export function progressionSprite(index: number): Phase1ProductionSprite {
  return atlasSprite(
    'assets/phase1/ui/icons/progression_icon_atlas.png',
    PROGRESSION_ATLAS_URL,
    16,
    16,
    112,
    16,
    7,
    index,
  );
}

export function buildPreviewPatternSprite(
  state: 'VALID' | 'INVALID' | 'CONNECTOR',
): Phase1ProductionSprite {
  const index = state === 'VALID' ? 0 : state === 'INVALID' ? 1 : 2;
  return atlasSprite(
    'assets/phase1/ui/effects/build_preview_pattern.png',
    BUILD_PREVIEW_PATTERN_URL,
    4,
    4,
    16,
    4,
    4,
    index,
  );
}

export function panelSkinCornerSprite(): Phase1ProductionSprite {
  return atlasSprite(
    'assets/phase1/ui/panels/ui_panel_skin.png',
    PANEL_SKIN_URL,
    16,
    16,
    64,
    32,
    4,
    0,
  );
}

export const PHASE1_PRODUCTION_WORLD_SPRITES = Object.freeze({
  ground: atlasSprite(
    'assets/phase1/world/terrain/terrain_region_atlas.png',
    TERRAIN_ATLAS_URL,
    32,
    32,
    192,
    128,
    6,
    0,
  ),
  player: atlasSprite(
    'assets/phase1/actors/player_pioneer.png',
    PLAYER_URL,
    32,
    48,
    1056,
    240,
    33,
    0,
  ),
  predator: atlasSprite(
    'assets/phase1/actors/territorial_predator.png',
    PREDATOR_URL,
    48,
    48,
    1344,
    240,
    28,
    0,
  ),
  ruin: atlasSprite(
    'assets/phase1/world/discovery/previous_civilization_ruin.png',
    RUIN_URL,
    128,
    128,
    128,
    128,
    1,
    0,
  ),
  habitat: atlasSprite(
    'assets/phase1/world/structures/habitat_room.png',
    HABITAT_URL,
    128,
    96,
    512,
    288,
    4,
    0,
  ),
  condenser: atlasSprite(
    'assets/phase1/world/structures/atmospheric_water_condenser.png',
    CONDENSER_URL,
    64,
    64,
    448,
    64,
    7,
    0,
  ),
  metalOre: atlasSprite(
    'assets/phase1/world/resources/metal_ore_node.png',
    METAL_ORE_URL,
    48,
    40,
    96,
    40,
    2,
    0,
  ),
  potableWater: atlasSprite(
    'assets/phase1/world/resources/potable_water_source.png',
    POTABLE_WATER_URL,
    32,
    32,
    32,
    32,
    1,
    0,
  ),
  deathCache: atlasSprite(
    'assets/phase1/world/discovery/death_cache.png',
    DEATH_CACHE_URL,
    32,
    24,
    96,
    24,
    3,
    0,
  ),
});

export function applyProductionSprite(
  element: HTMLElement,
  spriteDefinition: Phase1ProductionSprite,
  scale = 1,
): void {
  const column = spriteDefinition.index % spriteDefinition.columns;
  const row = Math.floor(spriteDefinition.index / spriteDefinition.columns);

  element.dataset.assetPath = spriteDefinition.assetPath;
  element.dataset.assetIndex = String(spriteDefinition.index);
  element.style.width = String(spriteDefinition.cellWidth * scale) + 'px';
  element.style.height = String(spriteDefinition.cellHeight * scale) + 'px';
  element.style.backgroundImage = 'url("' + spriteDefinition.url + '")';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundSize =
    String(spriteDefinition.sourceWidth * scale)
    + 'px '
    + String(spriteDefinition.sourceHeight * scale)
    + 'px';
  element.style.backgroundPosition =
    String(-column * spriteDefinition.cellWidth * scale)
    + 'px '
    + String(-row * spriteDefinition.cellHeight * scale)
    + 'px';
  element.style.imageRendering = 'pixelated';
}
