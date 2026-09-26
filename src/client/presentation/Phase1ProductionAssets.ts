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
const THERMAL_WRAP_URL = new URL(
  '../../../assets/phase1/actors/player_thermal_wrap_overlay.png',
  import.meta.url,
).href;
const PASSIVE_WILDLIFE_URL = new URL(
  '../../../assets/phase1/actors/wildlife_passive_phase1.png',
  import.meta.url,
).href;
const PREDATOR_URL = new URL(
  '../../../assets/phase1/actors/territorial_predator.png',
  import.meta.url,
).href;
const LANDING_MODULE_URL = new URL(
  '../../../assets/phase1/world/structures/landing_module.png',
  import.meta.url,
).href;
const HABITAT_URL = new URL(
  '../../../assets/phase1/world/structures/habitat_room.png',
  import.meta.url,
).href;
const STORAGE_CRATE_URL = new URL(
  '../../../assets/phase1/world/structures/storage_crate.png',
  import.meta.url,
).href;
const WORKBENCH_URL = new URL(
  '../../../assets/phase1/world/structures/workbench.png',
  import.meta.url,
).href;
const POWER_UNIT_URL = new URL(
  '../../../assets/phase1/world/structures/compact_power_unit.png',
  import.meta.url,
).href;
const CONDENSER_URL = new URL(
  '../../../assets/phase1/world/structures/atmospheric_water_condenser.png',
  import.meta.url,
).href;
const FIBER_PLANT_URL = new URL(
  '../../../assets/phase1/world/resources/fiber_plant.png',
  import.meta.url,
).href;
const FOOD_PLANT_URL = new URL(
  '../../../assets/phase1/world/resources/food_plant.png',
  import.meta.url,
).href;
const TREE_TIMBER_URL = new URL(
  '../../../assets/phase1/world/resources/tree_timber.png',
  import.meta.url,
).href;
const STONE_OUTCROP_URL = new URL(
  '../../../assets/phase1/world/resources/stone_outcrop.png',
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
const RUIN_URL = new URL(
  '../../../assets/phase1/world/discovery/previous_civilization_ruin.png',
  import.meta.url,
).href;
const RUIN_INSPECT_URL = new URL(
  '../../../assets/phase1/world/discovery/ruin_inspect_marker.png',
  import.meta.url,
).href;
const DEATH_CACHE_URL = new URL(
  '../../../assets/phase1/world/discovery/death_cache.png',
  import.meta.url,
).href;
const WORLD_DROP_URL = new URL(
  '../../../assets/phase1/world/discovery/world_drop_base.png',
  import.meta.url,
).href;
const FOG_MASK_URL = new URL(
  '../../../assets/phase1/world/effects/fog_mask_atlas.png',
  import.meta.url,
).href;
const COLD_RAIN_URL = new URL(
  '../../../assets/phase1/world/effects/cold_rain_fx.png',
  import.meta.url,
).href;
const WEATHER_DITHER_URL = new URL(
  '../../../assets/phase1/world/effects/weather_dither_pattern.png',
  import.meta.url,
).href;
const NONBUILDABLE_PATTERN_URL = new URL(
  '../../../assets/phase1/world/terrain/nonbuildable_pattern.png',
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
  nonbuildablePattern: atlasSprite(
    'assets/phase1/world/terrain/nonbuildable_pattern.png',
    NONBUILDABLE_PATTERN_URL,
    8,
    8,
    8,
    8,
    1,
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
  thermalWrap: atlasSprite(
    'assets/phase1/actors/player_thermal_wrap_overlay.png',
    THERMAL_WRAP_URL,
    32,
    48,
    1056,
    240,
    33,
    0,
  ),
  passiveWildlife: atlasSprite(
    'assets/phase1/actors/wildlife_passive_phase1.png',
    PASSIVE_WILDLIFE_URL,
    32,
    32,
    192,
    32,
    6,
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
  landingModule: atlasSprite(
    'assets/phase1/world/structures/landing_module.png',
    LANDING_MODULE_URL,
    128,
    96,
    256,
    96,
    2,
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
  storageCrate: atlasSprite(
    'assets/phase1/world/structures/storage_crate.png',
    STORAGE_CRATE_URL,
    32,
    32,
    32,
    32,
    1,
    0,
  ),
  workbench: atlasSprite(
    'assets/phase1/world/structures/workbench.png',
    WORKBENCH_URL,
    48,
    40,
    48,
    40,
    1,
    0,
  ),
  powerUnit: atlasSprite(
    'assets/phase1/world/structures/compact_power_unit.png',
    POWER_UNIT_URL,
    48,
    48,
    240,
    48,
    5,
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
  fiberPlant: atlasSprite(
    'assets/phase1/world/resources/fiber_plant.png',
    FIBER_PLANT_URL,
    32,
    32,
    64,
    32,
    2,
    0,
  ),
  foodPlant: atlasSprite(
    'assets/phase1/world/resources/food_plant.png',
    FOOD_PLANT_URL,
    32,
    32,
    64,
    32,
    2,
    0,
  ),
  treeTimber: atlasSprite(
    'assets/phase1/world/resources/tree_timber.png',
    TREE_TIMBER_URL,
    48,
    64,
    96,
    64,
    2,
    0,
  ),
  stoneOutcrop: atlasSprite(
    'assets/phase1/world/resources/stone_outcrop.png',
    STONE_OUTCROP_URL,
    48,
    40,
    96,
    40,
    2,
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
  ruinInspectMarker: atlasSprite(
    'assets/phase1/world/discovery/ruin_inspect_marker.png',
    RUIN_INSPECT_URL,
    16,
    16,
    16,
    48,
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
  worldDrop: atlasSprite(
    'assets/phase1/world/discovery/world_drop_base.png',
    WORLD_DROP_URL,
    16,
    12,
    16,
    12,
    1,
    0,
  ),
  fogMask: atlasSprite(
    'assets/phase1/world/effects/fog_mask_atlas.png',
    FOG_MASK_URL,
    32,
    32,
    128,
    128,
    4,
    0,
  ),
  coldRain: atlasSprite(
    'assets/phase1/world/effects/cold_rain_fx.png',
    COLD_RAIN_URL,
    16,
    16,
    64,
    32,
    4,
    0,
  ),
  weatherDither: atlasSprite(
    'assets/phase1/world/effects/weather_dither_pattern.png',
    WEATHER_DITHER_URL,
    16,
    16,
    16,
    16,
    1,
    0,
  ),
});

export const PHASE1_VERTICAL_SLICE_REQUIRED_VISUALS = Object.freeze([
  'ground',
  'player',
  'thermalWrap',
  'passiveWildlife',
  'predator',
  'landingModule',
  'habitat',
  'storageCrate',
  'workbench',
  'powerUnit',
  'condenser',
  'fiberPlant',
  'foodPlant',
  'treeTimber',
  'stoneOutcrop',
  'metalOre',
  'potableWater',
  'ruin',
  'ruinInspectMarker',
  'deathCache',
  'worldDrop',
  'fogMask',
  'coldRain',
  'weatherDither',
  'nonbuildablePattern',
] as const);

export type Phase1VerticalSliceVisualKey =
  (typeof PHASE1_VERTICAL_SLICE_REQUIRED_VISUALS)[number];

export function productionSpriteFrame(
  definition: Phase1ProductionSprite,
  index: number,
): Phase1ProductionSprite {
  const rows = definition.sourceHeight / definition.cellHeight;
  const totalFrames = definition.columns * rows;

  if (
    !Number.isInteger(rows)
    || !Number.isInteger(index)
    || index < 0
    || index >= totalFrames
  ) {
    throw new Error(
      'Production sprite frame index must fit the accepted atlas geometry.',
    );
  }

  return Object.freeze({ ...definition, index });
}

export type Phase1ActorFacing =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | null;

export interface Phase1OrientedSpriteFrame {
  readonly sprite: Phase1ProductionSprite;
  readonly flipX: boolean;
}

function actorFacingRow(
  facing: Phase1ActorFacing,
): { readonly row: number; readonly flipX: boolean } {
  switch (facing) {
    case 'N': return Object.freeze({ row: 4, flipX: false });
    case 'NE': return Object.freeze({ row: 3, flipX: false });
    case 'E': return Object.freeze({ row: 2, flipX: false });
    case 'SE': return Object.freeze({ row: 1, flipX: false });
    case 'S':
    case null:
      return Object.freeze({ row: 0, flipX: false });
    case 'SW': return Object.freeze({ row: 1, flipX: true });
    case 'W': return Object.freeze({ row: 2, flipX: true });
    case 'NW': return Object.freeze({ row: 3, flipX: true });
  }
}

function orientedActorFrame(
  sheet: Phase1ProductionSprite,
  facing: Phase1ActorFacing,
  stateStartColumn: number,
  frameCount: number,
  frameOrdinal: number,
): Phase1OrientedSpriteFrame {
  const orientation = actorFacingRow(facing);
  const frame = ((frameOrdinal % frameCount) + frameCount) % frameCount;
  return Object.freeze({
    sprite: productionSpriteFrame(
      sheet,
      orientation.row * sheet.columns + stateStartColumn + frame,
    ),
    flipX: orientation.flipX,
  });
}

export type Phase1PlayerVisualState =
  | 'IDLE'
  | 'MOVE'
  | 'GATHER'
  | 'UNARMED_ATTACK'
  | 'SPEAR_ATTACK'
  | 'CONSUME'
  | 'HURT'
  | 'DEATH';

export function playerActorSprite(
  facing: Phase1ActorFacing,
  state: Phase1PlayerVisualState,
  frameOrdinal: number,
): Phase1OrientedSpriteFrame {
  const frames: Readonly<Record<
    Phase1PlayerVisualState,
    readonly [number, number]
  >> = Object.freeze({
    IDLE: Object.freeze([0, 2] as const),
    MOVE: Object.freeze([2, 6] as const),
    GATHER: Object.freeze([8, 4] as const),
    UNARMED_ATTACK: Object.freeze([12, 4] as const),
    SPEAR_ATTACK: Object.freeze([16, 5] as const),
    CONSUME: Object.freeze([21, 4] as const),
    HURT: Object.freeze([25, 2] as const),
    DEATH: Object.freeze([27, 6] as const),
  });
  const [start, count] = frames[state];
  return orientedActorFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.player,
    facing,
    start,
    count,
    frameOrdinal,
  );
}

export function thermalWrapActorSprite(
  facing: Phase1ActorFacing,
  state: Phase1PlayerVisualState,
  frameOrdinal: number,
): Phase1OrientedSpriteFrame {
  const frames: Readonly<Record<
    Phase1PlayerVisualState,
    readonly [number, number]
  >> = Object.freeze({
    IDLE: Object.freeze([0, 2] as const),
    MOVE: Object.freeze([2, 6] as const),
    GATHER: Object.freeze([8, 4] as const),
    UNARMED_ATTACK: Object.freeze([12, 4] as const),
    SPEAR_ATTACK: Object.freeze([16, 5] as const),
    CONSUME: Object.freeze([21, 4] as const),
    HURT: Object.freeze([25, 2] as const),
    DEATH: Object.freeze([27, 6] as const),
  });
  const [start, count] = frames[state];
  return orientedActorFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.thermalWrap,
    facing,
    start,
    count,
    frameOrdinal,
  );
}

export type Phase1PredatorVisualState =
  | 'IDLE_PATROL'
  | 'ALERT'
  | 'CHASE'
  | 'ATTACK_WINDUP'
  | 'ATTACK_RELEASE'
  | 'RECOVERY'
  | 'RETURN'
  | 'HURT'
  | 'DEAD';

export function predatorActorSprite(
  facing: Phase1ActorFacing,
  state: Phase1PredatorVisualState,
  frameOrdinal: number,
): Phase1OrientedSpriteFrame {
  const frames: Readonly<Record<
    Phase1PredatorVisualState,
    readonly [number, number]
  >> = Object.freeze({
    IDLE_PATROL: Object.freeze([0, 4] as const),
    ALERT: Object.freeze([4, 2] as const),
    CHASE: Object.freeze([6, 6] as const),
    ATTACK_WINDUP: Object.freeze([12, 4] as const),
    ATTACK_RELEASE: Object.freeze([16, 2] as const),
    RECOVERY: Object.freeze([18, 2] as const),
    RETURN: Object.freeze([6, 6] as const),
    HURT: Object.freeze([20, 2] as const),
    DEAD: Object.freeze([22, 6] as const),
  });
  const [start, count] = frames[state];
  return orientedActorFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.predator,
    facing,
    start,
    count,
    frameOrdinal,
  );
}

export function terrainCellSprite(
  terrain: 'ground' | 'water',
  variantOrFrame: number,
): Phase1ProductionSprite {
  const normalized = ((variantOrFrame % 4) + 4) % 4;
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.ground,
    terrain === 'ground' ? normalized : 4 + normalized,
  );
}

export type Phase1ResourceVisualKind =
  | 'fiberPlant'
  | 'foodPlant'
  | 'treeTimber'
  | 'stoneOutcrop'
  | 'metalOre';

export function resourceNodeSprite(
  kind: Phase1ResourceVisualKind,
  state: 'NORMAL' | 'DEPLETED',
): Phase1ProductionSprite {
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES[kind],
    state === 'NORMAL' ? 0 : 1,
  );
}

export function deathCacheSprite(
  state: 'ACTIVE' | 'TARGETED' | 'RECOVERED',
): Phase1ProductionSprite {
  const index = state === 'ACTIVE' ? 0 : state === 'TARGETED' ? 1 : 2;
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.deathCache,
    index,
  );
}

export function ruinInspectMarkerSprite(
  state: 'AVAILABLE' | 'TARGETED' | 'INVESTIGATED',
): Phase1ProductionSprite {
  const index = state === 'AVAILABLE' ? 0 : state === 'TARGETED' ? 1 : 2;
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.ruinInspectMarker,
    index,
  );
}

export function fogMaskSprite(mask: number): Phase1ProductionSprite {
  if (!Number.isInteger(mask) || mask < 0 || mask > 15) {
    throw new Error('Fog adjacency mask must be an integer in 0..15.');
  }

  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.fogMask,
    mask,
  );
}

export function coldRainSprite(
  kind: 'RAIN_STREAK' | 'GROUND_SPLASH',
  frame: 0 | 1 | 2 | 3,
): Phase1ProductionSprite {
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.coldRain,
    kind === 'RAIN_STREAK' ? frame : frame + 4,
  );
}

export function habitatSprite(
  orientation: 0 | 90 | 180 | 270,
  state: 'NORMAL' | 'CONNECTOR_TARGET' | 'SHELTER_ACTIVE',
): Phase1ProductionSprite {
  const orientationIndex = orientation === 0
    ? 0
    : orientation === 90
      ? 1
      : orientation === 180
        ? 2
        : 3;
  const stateRow = state === 'NORMAL'
    ? 0
    : state === 'CONNECTOR_TARGET'
      ? 1
      : 2;

  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.habitat,
    stateRow * 4 + orientationIndex,
  );
}

export function powerUnitSprite(
  state: 'OPERATING_0' | 'OPERATING_1' | 'OPERATING_2' | 'OPERATING_3' | 'SELECTED',
): Phase1ProductionSprite {
  const index = state === 'OPERATING_0'
    ? 0
    : state === 'OPERATING_1'
      ? 1
      : state === 'OPERATING_2'
        ? 2
        : state === 'OPERATING_3'
          ? 3
          : 4;

  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit,
    index,
  );
}

export function condenserSprite(
  state:
    | 'DISABLED'
    | 'UNPOWERED'
    | 'RUNNING_0'
    | 'RUNNING_1'
    | 'RUNNING_2'
    | 'RUNNING_3'
    | 'OUTPUT_FULL',
): Phase1ProductionSprite {
  const order = Object.freeze([
    'DISABLED',
    'UNPOWERED',
    'RUNNING_0',
    'RUNNING_1',
    'RUNNING_2',
    'RUNNING_3',
    'OUTPUT_FULL',
  ] as const);
  return productionSpriteFrame(
    PHASE1_PRODUCTION_WORLD_SPRITES.condenser,
    order.indexOf(state),
  );
}

export function applyProductionSprite(
  element: HTMLElement,
  spriteDefinition: Phase1ProductionSprite,
  scale = 1,
  flipX = false,
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
  element.style.transform = flipX ? 'scaleX(-1)' : '';
  element.style.transformOrigin = 'center bottom';
}
