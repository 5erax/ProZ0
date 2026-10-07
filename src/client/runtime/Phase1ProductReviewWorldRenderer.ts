import { fogFrontierSprite } from '../presentation/FogFrontier';
import { uiText } from '../localization/UiMessages';
import { contentDisplayName } from '../localization/ContentText';
import { bindUiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import { WEARABLE_SLOTS } from '../../content/livingworld/WearableContent';
import {naturalSoilMoisture, soilCellKey} from '../../simulation/livingworld/SoilMoisture';
import {soilAt} from '../../content/livingworld/LivingWorldContent';
import { localizedResourceFacts as resourceLifecycleFacts } from '../localization/ResourceFacts';
import { createSoloCaveScene } from '../presentation/SoloCaveScene';
import { mountainAt } from '../../world/phase2/SoloMountain';
import { fieldFacilitySprite } from '../presentation/FieldFacilityArt';
import { expeditionFacility } from '../../content/singleplayer/ExpeditionContent';
import { RESOURCE_SIZE_PROFILES, resourceHarvestDefinition } from '../../content/livingworld/ResourceSizeProfiles';
import { sizedResourceSprite, sizedResourceHitShape } from '../presentation/ResourceSizeArt';
import { moistureState } from '../../simulation/livingworld/PlantGrowth';
import { colonyGroundSprite } from '../presentation/ColonySoilArt';
import { colonyWaterSprite } from '../presentation/ColonyWaterArt';
import { colonyWaterAt } from '../../world/phase2/ColonyHydrology';
import { createAtmosphericParticles } from '../presentation/AtmosphericParticles';
import {playerSkinFilter,selectedPlayerSkin} from './PlayerProfile';
import { explorationSiteSprite, explorationTraceSprite } from '../presentation/ExplorationArt';
import { heldSpearSprite, wearableSprite } from '../presentation/EquipmentArt';
import { worldDepthOrder } from '../presentation/WorldDepth';
import { bindEntityInspection } from '../presentation/EntityInspection';
import {
  WORLD_PIXELS_PER_UNIT,
  type WorldPosition,
} from '../../foundation';
import type { Phase1AuthorityBundle } from '../../integration';
import { colonyBiomeAt, colonyWeatherAt, colonyWeatherVisualAt, colonyLandscapeTerrainAt } from '../../world/phase2/ColonyRegions';
import { colonyTerrainSprite, colonyLandmarkSprite, colonyResourceSprite } from '../presentation/ColonyRegionSprites';
import { projectPhase1Isometric, phase1IsometricFacing } from './Phase1IsometricProjection';
import { CULTIVATION_POSITION, PEN_POSITION } from '../../simulation/sustenance/ColonySustenanceAuthority';
import type {
  PlayerMotionViewV1,
  PresentationIdentitySlotV1,
} from '../../protocol';
import {
  fromWorldPosition,
  PHASE1_BUILD_ZONE_RADIUS_WU,
  toChunkLocalPosition,
  type Phase1StructureDefinitionId,
} from '../../world';
import {
  isExplorationCellKnown,
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  PHASE1_EXPLORATION_CELLS_PER_AXIS,
} from '../../world/phase1/ExplorationGrid';
import type {
  Phase1GeneratedWorldEntity,
} from '../../world/phase1/Phase1WorldTypes';
import {
  PHASE1_PRODUCTION_WORLD_SPRITES,
  applyProductionSprite,
  buildPreviewPatternSprite,
  coldRainSprite,
  condenserSprite,
  deathCacheSprite,
  habitatSprite,
  itemIconSprite,
  playerActorSprite,
  predatorActorSprite,
  resourceNodeSprite,
  ruinInspectMarkerSprite,
  teammateIdentitySprite,
  terrainCellSprite,
  thermalWrapActorSprite,
  type Phase1ActorFacing,
  type Phase1PlayerVisualState,
  type Phase1PredatorVisualState,
  type Phase1ProductionSprite,
} from '../presentation/Phase1ProductionAssets';

const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;
const HALF_WIDTH = INTERNAL_WIDTH / 2;
const HALF_HEIGHT = INTERNAL_HEIGHT / 2;
const VISIBLE_MARGIN_PX = 96;
const WORLD_HALF_WIDTH =
  (HALF_WIDTH + HALF_HEIGHT * 2) / WORLD_PIXELS_PER_UNIT;
const WORLD_HALF_HEIGHT =
  WORLD_HALF_WIDTH;
const EXPLORATION_CELL_LOGICAL_PIXELS =
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS * WORLD_PIXELS_PER_UNIT;
const EXPLORATION_CELL_RASTER_SCALE =
  EXPLORATION_CELL_LOGICAL_PIXELS / 32;
const DECORATIVE_FLORA_CLEARANCE_WORLD_UNITS = 4;

function stableDecorHash(x: number, y: number): number {
  let value =
    Math.imul(x | 0, 0x45d9f3b)
    ^ Math.imul(y | 0, 0x119de1f3);
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b);
  value ^= value >>> 16;
  return value >>> 0;
}

function decorativeFloraCell(gx: number, gy: number): boolean {
  const distance = Math.hypot(gx * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    gy * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS);
  if (distance < 3) return false;
  const clusterX = Math.floor(gx / 4);
  const clusterY = Math.floor(gy / 4);
  const density = distance <= 96 ? 3 : 2;
  if (stableDecorHash(clusterX, clusterY) % 5 >= density) {
    return false;
  }
  return stableDecorHash(gx, gy) % 3 === 0;
}

function withinDecorClearance(
  position: WorldPosition,
  anchors: readonly Readonly<WorldPosition>[],
): boolean {
  const clearanceSquared =
    DECORATIVE_FLORA_CLEARANCE_WORLD_UNITS
    * DECORATIVE_FLORA_CLEARANCE_WORLD_UNITS;
  return anchors.some((anchor) => {
    const dx = anchor.x - position.x;
    const dy = anchor.y - position.y;
    return dx * dx + dy * dy <= clearanceSquared;
  });
}

const EMPTY_CONTEXT: Phase1ProductReviewWorldPresentationContext =
  Object.freeze({
    localAction: null,
    localActionStartedTick: null,
    targetedDeathCacheId: null,
    recoveredDeathCache: null,
    buildPreview: null,
    focusedWorldTargetId: null,
  });

export interface Phase1ProductReviewBuildPreview {
  readonly definitionId: Exclude<
    Phase1StructureDefinitionId,
    'structure:landing-module'
  >;
  readonly position: WorldPosition;
  readonly orientationQuarterTurns: 0 | 1 | 2 | 3;
  readonly state: 'VALID' | 'INVALID' | 'CONNECTOR';
  readonly reason: string | null;
}

export interface Phase1ProductReviewRecoveredDeathCache {
  readonly entityId: string;
  readonly position: WorldPosition;
  readonly untilAuthorityTick: number;
}

export interface Phase1ProductReviewWorldPresentationContext {
  readonly localAction:
    | 'GATHER'
    | 'CONSUME'
    | 'UNARMED_ATTACK'
    | 'SPEAR_ATTACK'
    | null;
  readonly localActionStartedTick: number | null;
  readonly targetedDeathCacheId: string | null;
  readonly recoveredDeathCache:
    | Phase1ProductReviewRecoveredDeathCache
    | null;
  readonly buildPreview: Phase1ProductReviewBuildPreview | null;
  readonly focusedWorldTargetId: string | null;
}

function distancePx(
  world: WorldPosition,
  camera: WorldPosition,
): { readonly x: number; readonly y: number } {
  const point = projectPhase1Isometric(world, camera);
  return Object.freeze({ x: HALF_WIDTH + point.x, y: HALF_HEIGHT + point.y });
}

function setWorldAnchor(
  element: HTMLElement,
  position: WorldPosition,
  camera: WorldPosition,
  width: number,
  height: number,
  zIndex?: number | string,
  rasterOrigin: WorldPosition = camera,
): boolean {
  const visible = distancePx(position, camera);
  if (
    visible.x < -VISIBLE_MARGIN_PX
    || visible.x > INTERNAL_WIDTH + VISIBLE_MARGIN_PX
    || visible.y < -VISIBLE_MARGIN_PX
    || visible.y > INTERNAL_HEIGHT + VISIBLE_MARGIN_PX
  ) {
    return false;
  }

  const raster = distancePx(position, rasterOrigin);
  element.style.position = 'absolute';
  element.style.left = String(raster.x - width / 2) + 'px';
  element.style.top = String(raster.y - height) + 'px';
  element.style.zIndex = String(
    zIndex ?? worldDepthOrder(position),
  );
  return true;
}

function setWorldCenter(
  element: HTMLElement,
  position: WorldPosition,
  camera: WorldPosition,
  width: number,
  height: number,
  zIndex: number | string,
  rasterOrigin: WorldPosition = camera,
): boolean {
  const visible = distancePx(position, camera);
  if (
    visible.x < -VISIBLE_MARGIN_PX
    || visible.x > INTERNAL_WIDTH + VISIBLE_MARGIN_PX
    || visible.y < -VISIBLE_MARGIN_PX
    || visible.y > INTERNAL_HEIGHT + VISIBLE_MARGIN_PX
  ) {
    return false;
  }
  const raster = distancePx(position, rasterOrigin);
  element.style.position = 'absolute';
  element.style.left = String(raster.x - width / 2) + 'px';
  element.style.top = String(raster.y - height / 2) + 'px';
  element.style.zIndex = String(zIndex);
  return true;
}

export function phase1ResourcePresentationSprite(
  definitionId: string,
  depleted: boolean,
): Phase1ProductionSprite {
  switch (definitionId) {
    case 'resource:fiber-plant':
      return resourceNodeSprite(
        'fiberPlant',
        depleted ? 'DEPLETED' : 'NORMAL',
      );
    case 'resource:food-plant':
      return resourceNodeSprite(
        'foodPlant',
        depleted ? 'DEPLETED' : 'NORMAL',
      );
    case 'resource:timber-source':
      return resourceNodeSprite(
        'treeTimber',
        depleted ? 'DEPLETED' : 'NORMAL',
      );
    case 'resource:stone-outcrop':
      return resourceNodeSprite(
        'stoneOutcrop',
        depleted ? 'DEPLETED' : 'NORMAL',
      );
    case 'resource:metal-ore-node':
      return resourceNodeSprite(
        'metalOre',
        depleted ? 'DEPLETED' : 'NORMAL',
      );
    case 'resource:potable-water-source':
      return PHASE1_PRODUCTION_WORLD_SPRITES.potableWater;
    default:
      return PHASE1_PRODUCTION_WORLD_SPRITES.ground;
  }
}

function entitySprite(
  bundle: Phase1AuthorityBundle,
  entity: Readonly<Phase1GeneratedWorldEntity>,
): Phase1ProductionSprite {
  switch (entity.type) {
    case 'passive-wildlife':
      return PHASE1_PRODUCTION_WORLD_SPRITES.passiveWildlife;
    case 'hostile':
      return PHASE1_PRODUCTION_WORLD_SPRITES.predator;
    case 'ruin':
      return PHASE1_PRODUCTION_WORLD_SPRITES.ruin;
    case 'resource': {
      const state = bundle.worldStore.getResourceState(entity.entityId);
      const size = bundle.worldStore.getResourceSize(entity.entityId, entity.definitionId);
      if (size) return sizedResourceSprite(entity.definitionId, size, state?.depleted === true, state?.lifecycle?.kind === 'plant' ? state.lifecycle.stage : undefined);
      if(bundle.config.colonyDepthEnabled===true)return colonyResourceSprite(colonyBiomeAt(bundle.config.worldSeed,entity.position),entity.definitionId,state?.depleted===true);
      return phase1ResourcePresentationSprite(
        entity.definitionId,
        state?.depleted === true,
      );
    }
  }
}

function structureSprite(
  bundle: Phase1AuthorityBundle,
  structureId: string,
  definitionId: string,
): Phase1ProductionSprite {
  switch (definitionId) {
    case 'structure:landing-module':
      return PHASE1_PRODUCTION_WORLD_SPRITES.landingModule;
    case 'structure:storage-crate':
      return PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate;
    case 'structure:workbench':
      return PHASE1_PRODUCTION_WORLD_SPRITES.workbench;
    case 'structure:habitat-room': {
      const structure = bundle.buildings.getStructure(structureId);
      const orientation = structure?.orientationQuarterTurns ?? 0;
      return habitatSprite(
        (orientation * 90) as 0 | 90 | 180 | 270,
        'NORMAL',
      );
    }
    case 'structure:compact-power-unit':
      return PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit;
    case 'structure:atmospheric-water-condenser': {
      const view = bundle.machines.getView(structureId);
      return condenserSprite(
        view.derivedState === 'OUTPUT_FULL'
          ? 'OUTPUT_FULL'
          : view.derivedState === 'RUNNING'
            ? 'RUNNING_0'
            : view.derivedState,
      );
    }
    default:
      return PHASE1_PRODUCTION_WORLD_SPRITES.ground;
  }
}

function previewStructureSprite(
  preview: Readonly<Phase1ProductReviewBuildPreview>,
): Phase1ProductionSprite {
  switch (preview.definitionId) {
    case 'structure:storage-crate':
      return PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate;
    case 'structure:workbench':
      return PHASE1_PRODUCTION_WORLD_SPRITES.workbench;
    case 'structure:habitat-room':
      return habitatSprite(
        (preview.orientationQuarterTurns * 90) as 0 | 90 | 180 | 270,
        preview.state === 'CONNECTOR'
          ? 'CONNECTOR_TARGET'
          : 'NORMAL',
      );
    case 'structure:compact-power-unit':
      return PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit;
    case 'structure:atmospheric-water-condenser':
      return PHASE1_PRODUCTION_WORLD_SPRITES.condenser;
  }
}

function worldCell(
  worldX: number,
  worldY: number,
): WorldPosition {
  return Object.freeze({
    x: (worldX + 0.5)
      * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    y: (worldY + 0.5)
      * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  });
}

function explorationCellKnown(
  bundle: Phase1AuthorityBundle,
  globalCellX: number,
  globalCellY: number,
): boolean {
  const center = worldCell(globalCellX, globalCellY);
  const coord = fromWorldPosition(center);
  const chunk = bundle.worldStore.query(coord);
  if (chunk === undefined) return false;
  const local = toChunkLocalPosition(center, coord);
  const cellX = Math.min(
    PHASE1_EXPLORATION_CELLS_PER_AXIS - 1,
    Math.floor(
      local.x / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    ),
  );
  const cellY = Math.min(
    PHASE1_EXPLORATION_CELLS_PER_AXIS - 1,
    Math.floor(
      local.y / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    ),
  );
  return isExplorationCellKnown(
    coord,
    chunk.delta.exploration,
    cellX,
    cellY,
  );
}

export function worldPositionKnown(
  bundle: Phase1AuthorityBundle,
  position: WorldPosition,
): boolean {
  const globalCellX = Math.floor(
    position.x / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  );
  const globalCellY = Math.floor(
    position.y / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  );
  return explorationCellKnown(bundle, globalCellX, globalCellY);
}

function terrainForCell(
  bundle: Phase1AuthorityBundle,
  globalCellX: number,
  globalCellY: number,
): 'ground' | 'water' {
  const center = worldCell(globalCellX, globalCellY);
  const coord = fromWorldPosition(center);
  const chunk = bundle.worldStore.query(coord);
  if (chunk === undefined) return 'ground';
  const local = toChunkLocalPosition(center, coord);
  const cellX = Math.min(
    chunk.base.terrain.cellsPerAxis - 1,
    Math.floor(local.x / chunk.base.terrain.cellSizeWorldUnits),
  );
  const cellY = Math.min(
    chunk.base.terrain.cellsPerAxis - 1,
    Math.floor(local.y / chunk.base.terrain.cellSizeWorldUnits),
  );
  return chunk.base.terrain.cells[
    cellY * chunk.base.terrain.cellsPerAxis + cellX
  ] ?? 'ground';
}

function fogAdjacencyMask(
  bundle: Phase1AuthorityBundle,
  globalCellX: number,
  globalCellY: number,
): number {
  let mask = 0;
  if (!explorationCellKnown(bundle, globalCellX, globalCellY - 1)) {
    mask |= 1;
  }
  if (!explorationCellKnown(bundle, globalCellX + 1, globalCellY)) {
    mask |= 2;
  }
  if (!explorationCellKnown(bundle, globalCellX, globalCellY + 1)) {
    mask |= 4;
  }
  if (!explorationCellKnown(bundle, globalCellX - 1, globalCellY)) {
    mask |= 8;
  }
  return mask;
}

function facingFromVector(
  dx: number,
  dy: number,
): Phase1ActorFacing {
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
    return 'S';
  }
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(angle / (Math.PI / 4));
  switch ((octant + 8) % 8) {
    case 0: return 'E';
    case 1: return 'SE';
    case 2: return 'S';
    case 3: return 'SW';
    case 4: return 'W';
    case 5: return 'NW';
    case 6: return 'N';
    default: return 'NE';
  }
}

function playerFrameOrdinal(
  state: Phase1PlayerVisualState,
  authorityTick: number,
  startedTick: number | null,
): number {
  const elapsed = Math.max(
    0,
    authorityTick - (startedTick ?? authorityTick),
  );
  switch (state) {
    case 'IDLE': return Math.floor(authorityTick / 30);
    case 'MOVE': return Math.floor(authorityTick / 6);
    case 'GATHER': return Math.floor(authorityTick / 8);
    case 'CONSUME': return Math.floor(authorityTick / 15);
    case 'UNARMED_ATTACK': return Math.floor(elapsed / 4);
    case 'SPEAR_ATTACK': return Math.floor(elapsed / 4);
    case 'HURT': return Math.floor(elapsed / 6);
    case 'DEATH': return Math.min(5, Math.floor(elapsed / 10));
  }
}

function predatorVisualState(
  state: string,
  stateUntilTick: number | null,
  authorityTick: number,
): Phase1PredatorVisualState {
  switch (state) {
    case 'idle':
    case 'patrol':
      return 'IDLE_PATROL';
    case 'alert':
      return 'ALERT';
    case 'chase':
      return 'CHASE';
    case 'attack-windup':
      return 'ATTACK_WINDUP';
    case 'recovery':
      return stateUntilTick !== null
        && stateUntilTick - authorityTick >= 66
        ? 'ATTACK_RELEASE'
        : 'RECOVERY';
    case 'return':
      return 'RETURN';
    case 'dead':
      return 'DEAD';
    default:
      return 'IDLE_PATROL';
  }
}

function styleElement(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-product-world{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center;overflow:hidden;pointer-events:none;background:#111821;image-rendering:pixelated;}',
    '.p1-product-sprite,.p1-product-terrain,.p1-product-fog{position:absolute;image-rendering:pixelated;}',
    '.p1-product-player[data-local-player="true"]{filter:none;}',
    '.p1-product-focused-target{outline:1px solid #f4f6ef;outline-offset:1px;box-shadow:0 0 0 1px #111722;}',
    '.p1-product-focused-target[data-resource-size]{outline:none;box-shadow:none;filter:drop-shadow(1px 0 0 #e6ebcf) drop-shadow(-1px 0 0 #e6ebcf) drop-shadow(0 -1px 0 #e6ebcf);}',
    '.p1-product-critical{z-index:890000!important;}',
    '.p1-product-identity{z-index:930000!important;}',
    '.p1-product-predator-telegraph{filter:drop-shadow(0 0 1px #f6e2a7) drop-shadow(0 0 2px #7f341f);}',
    '.p1-product-night{position:absolute;inset:0;z-index:-50000;pointer-events:none;background:rgba(7,12,28,.28);mix-blend-mode:multiply;}',
    '.p1-product-weather{position:absolute;inset:0;z-index:800000;pointer-events:none;opacity:.24;}',
    '.p1-product-build-preview{z-index:920000!important;opacity:.82;}',
    '.p1-product-module-night{filter:drop-shadow(0 0 2px rgba(101,166,175,.42));}',
    '.p1-product-build-preview[data-placement-state="VALID"]{filter:drop-shadow(0 0 1px #d6e8ca);}',
    '.p1-product-build-preview[data-placement-state="INVALID"]{filter:drop-shadow(0 0 1px #ffe0a8) contrast(.82);}',
    '.p1-product-build-preview[data-placement-state="CONNECTOR"]{filter:drop-shadow(0 0 1px #c8dfff);}',
    '.p1-product-build-badge{z-index:925000!important;}',
    '.p1-product-world-drop-icon{z-index:891000!important;}',
  ].join('');
  return style;
}

export interface Phase1ProductReviewWorldRenderer {
  readonly canvas: HTMLCanvasElement;
  render(): void;
  destroy(): void;
}

export function createPhase1ProductReviewWorldRenderer(
  root: HTMLElement,
  bundle: Phase1AuthorityBundle,
  playerId: string,
  getPresentationContext: () =>
    Readonly<Phase1ProductReviewWorldPresentationContext> =
      () => EMPTY_CONTEXT,
  getPlayerMotions: () => readonly Readonly<PlayerMotionViewV1>[] =
    () => Object.freeze([]),
): Phase1ProductReviewWorldRenderer {
  const generationVersion = bundle.getWorldCompatibility().worldGenerationVersion;
  const document = root.ownerDocument;
  const targetWindow = document.defaultView ?? window;
  const canvas = document.createElement('canvas');
  canvas.id = 'proz0-canvas';
  canvas.width = INTERNAL_WIDTH;
  canvas.height = INTERNAL_HEIGHT;
  canvas.dataset.renderer = 'phase1-production-raster';
  canvas.dataset.internalRaster = '640x360';
  canvas.style.imageRendering = 'pixelated';

  const layer = document.createElement('div');
  layer.className = 'p1-product-world';
  layer.dataset.productReviewWorld = 'canonical';
  layer.dataset.productionAssetFoundation = 'p1-75-78';
  // UNKNOWN content is never rendered. A single cloud backdrop fills the
  // unrevealed area; only reveal-boundary cells need individual occluding masks.
  layer.style.backgroundColor = '#14252e';
  layer.append(styleElement(document));
  const worldStage = document.createElement('div');
  worldStage.className = 'p1-product-world-stage';
  worldStage.style.cssText = 'position:absolute;inset:0;will-change:transform;';
  layer.append(worldStage);
  const rasterOrigin = bundle.getPlayerPosition(playerId);
  worldStage.dataset.rasterOriginX = String(rasterOrigin.x);
  worldStage.dataset.rasterOriginY = String(rasterOrigin.y);
  const caveScene = createSoloCaveScene(root, worldStage, bundle, rasterOrigin);
  let cameraDepth = Number.NaN;
  const particles = createAtmosphericParticles(document);
  // Encapsulate the effect's internal raster; #proz0-canvas remains the public game surface.
  const particleHost = document.createElement('div');
  particleHost.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  particleHost.attachShadow({ mode: 'closed' }).append(particles.canvas);
  const groundParticleHost = document.createElement('div');
  groundParticleHost.style.cssText = 'position:absolute;width:640px;height:360px;z-index:-80000;pointer-events:none';
  groundParticleHost.attachShadow({mode:'closed'}).append(particles.groundCanvas);
  const motionPreference = targetWindow.matchMedia('(prefers-reduced-motion: reduce)');
  const soilMoistures = new Map<string, number>();
  let soilRevision = -1;
  let soilFieldSecond = -1;
  const naturalMoistures = new Map<string,number>();
  const terrainMoisture = (key:string,point:WorldPosition,tick:number):number => {
    const watered=soilMoistures.get(soilCellKey(point));if(watered!==undefined)return watered;
    const second=Math.floor(tick/60);
    if(second!==soilFieldSecond){soilFieldSecond=second;naturalMoistures.clear();}
    let value=naturalMoistures.get(key);
    if(value===undefined){value=naturalSoilMoisture(bundle.config.worldSeed,point,second*60);if(naturalMoistures.size>=4096)naturalMoistures.clear();naturalMoistures.set(key,value);}
    return value;
  };

  root.replaceChildren(canvas, layer);

  const previousPlayerHealth = new Map<string, number>();
  const playerHurtStartTick = new Map<string, number>();
  const playerDeathStartTick = new Map<string, number>();
  const previousPredatorHealth = new Map<string, number>();
  const predatorHurtStartTick = new Map<string, number>();
  const retained = new Map<string, HTMLElement>();
  const visibleKeys = new Set<string>();
  const spriteKeys = new WeakMap<HTMLElement, string>();
  const spriteDataKeys = new WeakMap<HTMLElement, readonly string[]>();
  const sceneElement = (key: string): HTMLElement => {
    visibleKeys.add(key);
    let element = retained.get(key);
    if (element === undefined) {
      element = document.createElement('div');
      retained.set(key, element);
    }
    return element;
  };
  const appendScene = (element: HTMLElement, screenSpace = false): void => {
    const parent = screenSpace ? layer : worldStage;
    if (element.parentElement !== parent) parent.append(element);
  };
  const applySprite = (element: HTMLElement, definition: Phase1ProductionSprite,
    scale = 1, flipX = false): void => {
    const key = [definition.assetPath, definition.index, definition.cellWidth,
      definition.cellHeight, definition.sourceWidth, definition.sourceHeight, scale, flipX].join(':');
    if (spriteKeys.get(element) === key) return;
    applyProductionSprite(element, definition, scale, flipX);
    spriteKeys.set(element, key);
  };
  const inViewport = (position: WorldPosition, camera: WorldPosition): boolean => {
    const point = distancePx(position, camera);
    return point.x >= -VISIBLE_MARGIN_PX && point.x <= INTERNAL_WIDTH + VISIBLE_MARGIN_PX
      && point.y >= -VISIBLE_MARGIN_PX && point.y <= INTERNAL_HEIGHT + VISIBLE_MARGIN_PX;
  };

  const applyScale = (): void => {
    const scale = Math.max(
      1,
      Math.min(
        targetWindow.innerWidth / INTERNAL_WIDTH,
        targetWindow.innerHeight / INTERNAL_HEIGHT,
        root.dataset.displayLimit === undefined || root.dataset.displayLimit === 'auto' ? Infinity : Number(root.dataset.displayLimit),
      ),
    );
    canvas.style.width = String(INTERNAL_WIDTH * scale) + 'px';
    canvas.style.height = String(INTERNAL_HEIGHT * scale) + 'px';
    canvas.dataset.displayScale = String(scale);
    layer.style.transform =
      'translate(-50%, -50%) scale(' + String(scale) + ')';
    layer.dataset.displayScale = String(scale);
  };

  const renderSprite = (
    spriteDefinition: Phase1ProductionSprite,
    position: WorldPosition,
    camera: WorldPosition,
    role: string,
    id: string,
    options: {
      readonly flipX?: boolean;
      readonly className?: string;
      readonly zIndex?: number | string;
      readonly data?: Readonly<Record<string, string>>;
    } = {},
  ): HTMLElement | null => {
    if (!inViewport(position, camera)) return null;
    const element = sceneElement('sprite:' + role + ':' + id);
    const className =
      'p1-product-sprite'
      + (options.className === undefined
        ? ''
        : ' ' + options.className) + (id === getPresentationContext().focusedWorldTargetId ? ' p1-product-focused-target' : '');
    if (element.className !== className) element.className = className;
    const focused = id === getPresentationContext().focusedWorldTargetId;
    if (focused) {
      if (element.dataset.focusedTarget !== 'true') element.dataset.focusedTarget = 'true';
    }
    if (!focused && element.dataset.focusedTarget !== undefined) delete element.dataset.focusedTarget;
    if (element.dataset.worldRole !== role) element.dataset.worldRole = role;
    if (element.dataset.worldId !== id) element.dataset.worldId = id;
    if (['hostile','structure','facility','survey-site','world-drop','death-cache','ruin'].includes(role)) {
      if(element.style.pointerEvents!=='auto' && (role!=='survey-site'||!options.data?.poiTemplate))element.style.pointerEvents='auto';
      if(role!=='survey-site'){element.setAttribute('role','button');element.tabIndex=0;}
      bindEntityInspection(element, () => {
        if(role==='facility'){const f=bundle.expedition?.read().facilities.find(f=>f.id===id);return f?{id,name:uiPhrase(expeditionFacility(f.definitionId)!.name),kind:uiText("ui.8a87bf95"),facts:[uiText("ui.e4948090")+f.orientation*90+'°',uiText("ui.7f1940ab")]}:null;}
        if (role === 'hostile') {
          const target = bundle.world.getPredator(id);
          if (!target || !worldPositionKnown(bundle,target.position)) return null;
          return {id,name:uiText("ui.38671cb3"),kind:uiText("ui.8f8735af"),facts:[uiText("ui.fde1b4ec")+target.state.replaceAll('_',' ').toLowerCase(),uiText("ui.a438be7d")+target.health,uiText("ui.f321724a")]};
        }
        if (!worldPositionKnown(bundle,position)) return null;
        if (role === 'structure') {
          const structure = bundle.buildings.exportSnapshot().foothold.structures.find(v => v.structureId === id);
          if (!structure) return null;
          const facts = [uiText("ui.f321724a")];
          if (structure.containerId) { const inventory = bundle.items.getContainerView(structure.containerId); facts.unshift(uiText("ui.6db47018")+inventory.totalWeightKg.toFixed(1)+' kg',uiText("ui.16c9f886")+inventory.totalVolume.toFixed(1)); }
          return {id,name:contentDisplayName(bundle.catalog.get(structure.definitionId)),kind:uiText("ui.8a87bf95"),facts};
        }
        if (role === 'survey-site') {
          const site = bundle.colonyDepth.sites().find(value => value.id === id);
          if (!site) return null;
          return {id,name:uiPhrase(site.name),kind:uiText("ui.7655028d"),facts:[uiText("ui.fde1b4ec")+bundle.colonyDepth.siteStage(id),uiText("ui.6c6837e1")+site.biomeId,uiText("ui.c072a99b")]};
        }
        return {id,name:element.getAttribute('aria-label') ?? role.replaceAll('-',' '),kind:role.replaceAll('-',' '),facts:[uiText("ui.ae805cdc")]};
      });
    }
    const data = options.data ?? {};
    for (const key of spriteDataKeys.get(element) ?? []) {
      if (!(key in data)) delete element.dataset[key];
    }
    spriteDataKeys.set(element, Object.keys(data));
    for (const [key, value] of Object.entries(data)) {
      if (element.dataset[key] !== value) element.dataset[key] = value;
    }
    applySprite(
      element,
      spriteDefinition,
      1,
      options.flipX === true,
    );
    if (
      !setWorldAnchor(
        element,
        position,
        camera,
        spriteDefinition.cellWidth,
        spriteDefinition.cellHeight,
        options.zIndex,
        rasterOrigin,
      )
    ) {
      return null;
    }
    appendScene(element);
    if(spriteDefinition.footOffsetY)element.style.top=Number.parseFloat(element.style.top)+spriteDefinition.footOffsetY+'px';
    if(bundle.caves?.isSurface())element.style.top=Number.parseFloat(element.style.top)-mountainAt(position,bundle.caves.portals).height*4+'px';
    return element;
  };

  const renderTerrain = (
    camera: WorldPosition,
    authorityTick: number,
    night: boolean,
    raining: boolean,
  ): void => {
    const knownGeneratedAnchors =
      bundle.world.getActiveGeneratedEntities()
        .filter((entity) =>
          worldPositionKnown(bundle, entity.position),
        )
        .map((entity) => entity.position);
    const knownStructureAnchors =
      bundle.buildings.exportSnapshot().foothold.structures
        .filter((structure) =>
          worldPositionKnown(bundle, structure.position),
        )
        .map((structure) => structure.position);
    const decorClearanceAnchors = Object.freeze([
      ...knownGeneratedAnchors,
      ...knownStructureAnchors,
      ...(bundle.sustenance.read().bedBuilt ? [CULTIVATION_POSITION] : []),
      ...(bundle.sustenance.read().penBuilt ? [PEN_POSITION] : []),
    ]);

    const cellSize = PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS;
    const minimumX = Math.floor(
      (camera.x - WORLD_HALF_WIDTH) / cellSize,
    ) - 1;
    const maximumX = Math.ceil(
      (camera.x + WORLD_HALF_WIDTH) / cellSize,
    ) + 1;
    const minimumY = Math.floor(
      (camera.y - WORLD_HALF_HEIGHT) / cellSize,
    ) - 1;
    const maximumY = Math.ceil(
      (camera.y + WORLD_HALF_HEIGHT) / cellSize,
    ) + 1;

    for (let gy = minimumY; gy <= maximumY; gy += 1) {
      for (let gx = minimumX; gx <= maximumX; gx += 1) {
        const position = worldCell(gx, gy);
        if (!inViewport(position, camera)) continue;
        const known = explorationCellKnown(bundle, gx, gy);
        const baseTerrain = known
          ? terrainForCell(bundle, gx, gy)
          : 'ground';
        const terrain=known&&bundle.config.colonyDepthEnabled===true?colonyLandscapeTerrainAt(bundle.config.worldSeed,position,baseTerrain,generationVersion):baseTerrain;
        const variant = terrain === 'water'
          ? Math.floor(authorityTick / 15)
          : (stableDecorHash(Math.floor(gx / 3), Math.floor(gy / 3))
            + (stableDecorHash(gx, gy) % 7 === 0 ? 1 : 0)) % 4;
        if (known) {
        const tile = sceneElement('terrain:' + String(gx) + ':' + String(gy));
        if (tile.dataset.worldRole !== 'terrain') {
          tile.className = 'p1-product-terrain'; tile.dataset.worldRole = 'terrain'; tile.dataset.explorationState = 'EXPLORED'; tile.dataset.soilCell=soilCellKey(position);
        }
        if (tile.dataset.terrainState !== terrain) tile.dataset.terrainState = terrain;
        if(bundle.livingWorld && terrain!=='water' && !tile.dataset.soil)tile.dataset.soil=soilAt(bundle.config.worldSeed,position).id;
        if(bundle.config.colonyDepthEnabled===true && !tile.dataset.biome)tile.dataset.biome=colonyBiomeAt(bundle.config.worldSeed,position);
        let groundShore = 0;
        if (terrain === 'ground') for (const [bit, dx, dy] of [[1,1,0],[2,0,1]] as const) {
          if (!explorationCellKnown(bundle, gx + dx, gy + dy)) continue;
          const neighbor = worldCell(gx + dx, gy + dy), base = terrainForCell(bundle, gx + dx, gy + dy);
          if ((bundle.config.colonyDepthEnabled === true ? colonyLandscapeTerrainAt(bundle.config.worldSeed, neighbor, base, generationVersion) : base) === 'water') groundShore |= 1 << bit;
        }
        let waterArt: Phase1ProductionSprite | null = null;
        if (terrain === 'water' && generationVersion >= 5) {
          const sample = colonyWaterAt(bundle.config.worldSeed, position);
          let shoreMask = 0;
          for (const [bit, dx, dy] of [[0,0,-1],[1,1,0],[2,0,1],[3,-1,0]] as const) {
            if (explorationCellKnown(bundle, gx + dx, gy + dy) && terrainForCell(bundle, gx + dx, gy + dy) === 'ground') shoreMask |= 1 << bit;
          }
          const flowDirection = sample ? (Math.abs(sample.flow.x) > Math.abs(sample.flow.y) ? sample.flow.x > 0 ? 0 : 2 : sample.flow.y > 0 ? 1 : 3) : 0;
          waterArt = colonyWaterSprite(colonyBiomeAt(bundle.config.worldSeed, position), shoreMask, Math.floor(authorityTick / 15), flowDirection, sample?.crossing ?? false);
          if (!tile.dataset.waterKind) { tile.dataset.waterKind = sample?.kind ?? 'spring'; tile.dataset.waterDepth = sample ? sample.depthMeters.toFixed(2) : 'shallow'; }
        }
        applySprite(
          tile,
          bundle.config.colonyDepthEnabled===true
            ? terrain === 'ground' ? colonyGroundSprite(colonyBiomeAt(bundle.config.worldSeed, position), tile.dataset.soil ?? 'loam', (stableDecorHash(Math.floor(gx/3),Math.floor(gy/3))+stableDecorHash(gx,gy)%3)%8, moistureState(terrainMoisture(gx+':'+gy,position,authorityTick)), groundShore) : waterArt ?? colonyTerrainSprite(colonyBiomeAt(bundle.config.worldSeed,position),terrain,variant)
            : terrainCellSprite(terrain, variant),
          EXPLORATION_CELL_RASTER_SCALE,
        );
        const filter = night ? 'brightness(.78) saturate(.72)' : '';
        if (tile.style.filter !== filter) tile.style.filter = filter;
        const moisture = moistureState(terrainMoisture(gx+':'+gy,position,authorityTick));
        if (tile.dataset.moisture !== moisture) tile.dataset.moisture = moisture;
        const raisedShore = groundShore !== 0;
        if (raisedShore && tile.dataset.terrainDepth !== 'raised-shore') {
          tile.style.boxShadow = bundle.config.colonyDepthEnabled === true ? '' : '0 3px 0 #38483f,0 6px 0 #203332,0 7px 0 #17282e'; tile.dataset.terrainDepth = 'raised-shore';
        } else if (!raisedShore && tile.dataset.terrainDepth !== undefined) {
          tile.style.boxShadow = ''; delete tile.dataset.terrainDepth;
        }
        if (known &&
          setWorldCenter(
            tile,
            position,
            camera,
            EXPLORATION_CELL_LOGICAL_PIXELS,
            EXPLORATION_CELL_LOGICAL_PIXELS / 2,
            tile.dataset.terrainDepth === 'raised-shore' ? -90000 : -100000,
            rasterOrigin,
          )
        ) {
          const elevation=bundle.caves?mountainAt(position,bundle.caves.portals):null;
          if(elevation?.height){tile.style.top=Number.parseFloat(tile.style.top)-elevation.height*4+'px';tile.dataset.elevation=String(elevation.height);tile.dataset.mountainProfile=elevation.profile;tile.dataset.ramp=String(elevation.ramp);
            const lift=Math.round(elevation.height*4);let face=tile.querySelector<SVGSVGElement>('[data-cliff-face]');if(!face){face=document.createElementNS('http://www.w3.org/2000/svg','svg');face.dataset.cliffFace='true';face.style.cssText='position:absolute;left:0;top:0;width:100%;pointer-events:none;z-index:-1';tile.append(face);}
            if(face.dataset.lift!==String(lift)){face.dataset.lift=String(lift);face.setAttribute('viewBox','0 0 64 '+(32+lift));face.style.height=32+lift+'px';face.innerHTML='<path fill="#31444a" d="M0 16 32 32 64 16V'+(16+lift)+'L32 '+(32+lift)+' 0 '+(16+lift)+'Z"/><path fill="#51605b" d="M32 32 64 16V'+(16+lift)+'L32 '+(32+lift)+'Z"/>';}
          }
          appendScene(tile);
        }
        }

        if (
          known
          && terrain === 'ground'
          && bundle.config.colonyDepthEnabled !== true
          && decorativeFloraCell(gx, gy)
          && !withinDecorClearance(
            position,
            decorClearanceAnchors,
          )
        ) {
          renderSprite(
            PHASE1_PRODUCTION_WORLD_SPRITES.floraDecor,
            position,
            camera,
            'flora-decor',
            'flora-decor:' + String(gx) + ':' + String(gy),
            {
              zIndex: -50000,
              data: Object.freeze({
                decorativeFlora: 'true',
                interactive: 'false',
                explorationState: 'EXPLORED',
              }),
            },
          );
        }

        if (raining && known && terrain === 'ground' && stableDecorHash(gx, gy) % 5 === 0) {
          renderSprite(coldRainSprite('GROUND_SPLASH',
            ((Math.floor(authorityTick / 9) + stableDecorHash(gx, gy)) % 4) as 0 | 1 | 2 | 3),
          position, camera, 'rain-splash', 'rain-splash:' + String(gx) + ':' + String(gy),
          { zIndex: -40000, data: Object.freeze({ explorationState: 'EXPLORED' }) });
        }

        if (!known) {
          const mask = fogAdjacencyMask(bundle, gx, gy);
          if (mask === 15) continue;
          const fog = sceneElement('fog:' + String(gx) + ':' + String(gy));
          fog.className = 'p1-product-fog';
          fog.dataset.worldRole = 'fog';
          fog.dataset.fogState = 'UNEXPLORED';
          fog.dataset.fogMask = String(mask);
          applySprite(fog,fogFrontierSprite(mask),1);
          fog.dataset.fogTreatment='soft-ground-frontier';
          if (
            setWorldCenter(
              fog,
              position,
              camera,
              EXPLORATION_CELL_LOGICAL_PIXELS,
              EXPLORATION_CELL_LOGICAL_PIXELS / 2,
              -50000,
              rasterOrigin,
            )
          ) {
            appendScene(fog);
          }
        }
      }
    }
  };

  const renderPlayer = (
    id: string,
    camera: WorldPosition,
    context: Readonly<Phase1ProductReviewWorldPresentationContext>,
    local: boolean,
    presentationIdentitySlot: PresentationIdentitySlotV1,
  ): void => {
    const runtime = bundle.getRuntime(id);
    const movement = runtime.getSnapshot().player;
    const survival = bundle.survival.getPlayerState(id);
    const priorHealth = previousPlayerHealth.get(id);
    if (
      priorHealth !== undefined
      && survival.healthMilli < priorHealth
      && survival.lifeState.type === 'alive'
    ) {
      playerHurtStartTick.set(id, bundle.authorityTick);
    }
    previousPlayerHealth.set(id, survival.healthMilli);

    if (
      survival.lifeState.type !== 'alive'
      && !playerDeathStartTick.has(id)
    ) {
      playerDeathStartTick.set(id, bundle.authorityTick);
    }
    if (survival.lifeState.type === 'alive') {
      playerDeathStartTick.delete(id);
    }

    const hurtStart = playerHurtStartTick.get(id);
    const hurtActive =
      hurtStart !== undefined
      && bundle.authorityTick - hurtStart < 12;
    if (hurtStart !== undefined && !hurtActive) {
      playerHurtStartTick.delete(id);
    }

    let state: Phase1PlayerVisualState;
    let startedTick: number | null = null;
    if (survival.lifeState.type !== 'alive') {
      state = 'DEATH';
      startedTick =
        playerDeathStartTick.get(id) ?? bundle.authorityTick;
    } else if (hurtActive) {
      state = 'HURT';
      startedTick = hurtStart ?? bundle.authorityTick;
    } else if (local && context.localAction !== null) {
      state = context.localAction;
      startedTick = context.localActionStartedTick;
    } else if (movement.locomotionState !== 'IDLE') {
      state = 'MOVE';
    } else {
      state = 'IDLE';
    }

    const frame = playerActorSprite(
      phase1IsometricFacing(movement.facing),
      state,
      playerFrameOrdinal(
        state,
        bundle.authorityTick,
        startedTick,
      ),
    );
    const player = renderSprite(
      frame.sprite,
      movement.position,
      camera,
      local ? 'player' : 'teammate',
      id,
      {
        flipX: frame.flipX,
        className: local
          ? 'p1-product-player'
          : 'p1-product-teammate',
        zIndex: worldDepthOrder(movement.position),
        data: Object.freeze({
          actorState: state,
          facing: movement.facing ?? 'S',
          localPlayer: String(local),
        }),
      },
    );
    if (player === null) return;
    if(local){const skin=selectedPlayerSkin();if(player.dataset.skin!==skin){player.style.filter=skin==='pioneer'?'':playerSkinFilter(skin)+' drop-shadow(1px 0 0 #f4f6ef) drop-shadow(-1px 0 0 #f4f6ef) drop-shadow(0 1px 0 #f4f6ef) drop-shadow(0 -1px 0 #f4f6ef)';player.dataset.skin=skin;}}

    const equipment = bundle.equipment.getView(id);
    if (equipment.equippedWeaponStackId !== null && state !== 'SPEAR_ATTACK' && state !== 'DEATH') {
      const stack = bundle.items.getContainerView('inventory:' + id).stacks.find(s => s.stackId === equipment.equippedWeaponStackId);
      const rarity = stack ? bundle.catalog.getAs(stack.itemDefinitionId, 'item').rarity : undefined;
      const held = heldSpearSprite(phase1IsometricFacing(movement.facing), rarity);
      renderSprite(held.sprite, movement.position, camera, 'held-weapon-overlay', id, { flipX: held.flipX, zIndex: worldDepthOrder(movement.position, 2), className: local ? 'p1-product-player' : 'p1-product-teammate', data: { actorState: state, rarity: rarity ?? 'common' } });
    }
    if (equipment.equippedThermalWrapStackId !== null) {
      const overlayFrame = thermalWrapActorSprite(
        phase1IsometricFacing(movement.facing),
        state,
        playerFrameOrdinal(
          state,
          bundle.authorityTick,
          startedTick,
        ),
      );
      renderSprite(
        overlayFrame.sprite,
        movement.position,
        camera,
        'thermal-wrap-overlay',
        id,
        {
          flipX: overlayFrame.flipX,
          className: local
            ? 'p1-product-player'
            : 'p1-product-teammate',
          zIndex: worldDepthOrder(movement.position, 1),
          data: Object.freeze({
            actorState: state,
          }),
        },
      );
    }

    if (state !== 'DEATH') for (const slot of WEARABLE_SLOTS) {
      if (equipment.wearables[slot] === null) continue;
      const overlay = wearableSprite(slot, phase1IsometricFacing(movement.facing), state === 'MOVE', playerFrameOrdinal(state, bundle.authorityTick, startedTick));
      renderSprite(overlay.sprite, movement.position, camera, 'wearable-' + slot, id, {flipX: overlay.flipX, zIndex: worldDepthOrder(movement.position, 3 + WEARABLE_SLOTS.indexOf(slot)), className: local ? 'p1-product-player' : 'p1-product-teammate', data: {actorState: state, equipmentSlot: slot}});
    }
    if (!local) {
      const shape = presentationIdentitySlot === 'TEAM_A'||presentationIdentitySlot==='TEAM_D'||presentationIdentitySlot==='TEAM_G'
        ? 'circle'
        : presentationIdentitySlot === 'TEAM_B'||presentationIdentitySlot==='TEAM_E'
          ? 'diamond'
          : presentationIdentitySlot === 'TEAM_C'||presentationIdentitySlot==='TEAM_F'
            ? 'triangle'
            : null;
      if (shape === null) return;
      const markerPosition = Object.freeze({
        x: movement.position.x,
        y: movement.position.y - 3.15,
      });
      const marker = renderSprite(
        teammateIdentitySprite(shape),
        markerPosition,
        camera,
        'teammate-identity',
        id,
        {
          className: 'p1-product-identity',
          zIndex: 930000,
          data: Object.freeze({
            identitySlot: presentationIdentitySlot,
            markerShape: shape,
          }),
        },
      );
      if (marker !== null) {
        marker.dataset.presentationIdentitySlot =
          presentationIdentitySlot;
      }
    }
  };

  const renderPredator = (
    entity: Extract<Phase1GeneratedWorldEntity, { readonly type: 'hostile' }>,
    camera: WorldPosition,
  ): void => {
    const predator = bundle.world.getPredator(entity.entityId);
    if (predator === null) return;
    const previous = previousPredatorHealth.get(predator.entityId);
    if (previous !== undefined && predator.health < previous) {
      predatorHurtStartTick.set(
        predator.entityId,
        bundle.authorityTick,
      );
    }
    previousPredatorHealth.set(predator.entityId, predator.health);

    const target = predator.targetPlayerId === null
      ? null
      : bundle.getPlayerPosition(predator.targetPlayerId);
    const facing = target === null
      ? facingFromVector(
          predator.encounterAnchor.x - predator.position.x,
          predator.encounterAnchor.y - predator.position.y,
        )
      : facingFromVector(
          target.x - predator.position.x,
          target.y - predator.position.y,
        );

    const hurtStart = predatorHurtStartTick.get(predator.entityId);
    const hurtActive =
      hurtStart !== undefined
      && bundle.authorityTick - hurtStart < 12
      && predator.state !== 'dead';
    if (hurtStart !== undefined && !hurtActive) {
      predatorHurtStartTick.delete(predator.entityId);
    }

    const canonicalVisual = predatorVisualState(
      predator.state,
      predator.stateUntilTick,
      bundle.authorityTick,
    );
    const visualState: Phase1PredatorVisualState =
      hurtActive
        && canonicalVisual !== 'ATTACK_WINDUP'
        && canonicalVisual !== 'ATTACK_RELEASE'
        ? 'HURT'
        : canonicalVisual;
    const cadence = visualState === 'ATTACK_WINDUP'
      ? 8
      : visualState === 'ATTACK_RELEASE'
        ? 3
        : visualState === 'DEAD'
          ? 10
          : 8;
    const ordinal = visualState === 'DEAD'
      ? Math.min(5, Math.floor(bundle.authorityTick / cadence))
      : Math.floor(bundle.authorityTick / cadence);
    const frame = predatorActorSprite(
      phase1IsometricFacing(facing) ?? 'S',
      visualState,
      ordinal,
    );
    const telegraph = (
      visualState === 'ALERT'
      || visualState === 'ATTACK_WINDUP'
      || visualState === 'ATTACK_RELEASE'
      || visualState === 'RECOVERY'
    );
    renderSprite(
      frame.sprite,
      predator.position,
      camera,
      'hostile',
      predator.entityId,
      {
        flipX: frame.flipX,
        ...(telegraph
          ? {
              className: 'p1-product-predator-telegraph',
              zIndex: worldDepthOrder(predator.position),
            }
          : {}),
        data: Object.freeze({
          predatorState: predator.state,
          predatorVisualState: visualState,
        }),
      },
    );
  };

  const renderBuildPreview = (
    preview: Readonly<Phase1ProductReviewBuildPreview>,
    camera: WorldPosition,
  ): void => {
    const sprite = previewStructureSprite(preview);
    const element = renderSprite(
      sprite,
      preview.position,
      camera,
      'build-preview',
      'build-preview:' + preview.definitionId,
      {
        className: 'p1-product-build-preview',
        zIndex: 920000,
        data: Object.freeze({
          placementState: preview.state,
          placementReason: preview.reason ?? '',
          structureDefinitionId: preview.definitionId,
        }),
      },
    );
    if (element === null) return;

    const pattern = buildPreviewPatternSprite(preview.state);
    const badgePosition = Object.freeze({
      x: preview.position.x
        - sprite.cellWidth / 64 - sprite.cellHeight / 16,
      y: preview.position.y
        + sprite.cellWidth / 64 - sprite.cellHeight / 16,
    });
    const badge = renderSprite(
      pattern,
      badgePosition,
      camera,
      'build-preview-pattern',
      'build-preview-pattern',
      {
        className: 'p1-product-build-badge',
        zIndex: 925000,
        data: Object.freeze({
          productionPatternState: preview.state,
        }),
      },
    );
    if (badge !== null) {
      badge.dataset.productionPatternState = preview.state;
    }
  };

  const render = (): void => {
    visibleKeys.clear();

    const camera = bundle.getPlayerPosition(playerId);
    const nextCameraDepth = Math.round((camera.x + camera.y) * 1000);
    // The shared depth origin only prevents large-coordinate underflow; relative
    // ordering does not depend on following each camera step. Rebase with 32 m
    // hysteresis so motion does not invalidate every descendant's z-index at 60 Hz.
    if (!Number.isFinite(cameraDepth) || Math.abs(nextCameraDepth - cameraDepth) > 32000) { cameraDepth = nextCameraDepth; worldStage.style.setProperty('--world-camera-depth', String(cameraDepth)); }
    const living = bundle.livingWorld?.presentationSnapshot();
    if (living && living.revision !== soilRevision) {
      soilRevision = living.revision; soilMoistures.clear();
      for (const p of living.soil?.patches ?? []) soilMoistures.set(p.key,p.moisture);
      for (const p of living.plots) soilMoistures.set(soilCellKey(p), p.moisture);
    }
    const offset = projectPhase1Isometric(camera, rasterOrigin);
    const cameraElevation=bundle.caves?.isSurface()?mountainAt(camera,bundle.caves.portals).height*4:0;
    worldStage.style.transform = 'translate(' + String(-offset.x) + 'px,' + String(-offset.y+cameraElevation) + 'px)';
    if (caveScene.render(camera)) {
      layer.style.backgroundImage = 'none';
      layer.style.backgroundColor = '#14252e';
      particleHost.hidden = true;
      const context = getPresentationContext();
      renderPlayer(playerId, camera, context, true, 'LOCAL');
      for (const [key, element] of retained) if (!visibleKeys.has(key)) {element.remove();retained.delete(key);}
      groundParticleHost.remove();
      canvas.dataset.playerX = camera.x.toFixed(6);canvas.dataset.playerY = camera.y.toFixed(6);
      canvas.dataset.authorityTick = String(bundle.authorityTick);canvas.dataset.weatherState = 'clear';
      canvas.dataset.worldspace = bundle.playerWorldspace();canvas.dataset.fogProjection = 'canonical-cave-fog';
      return;
    }
    canvas.dataset.worldspace = 'surface';
    layer.style.backgroundImage = 'none';
    layer.style.backgroundColor = '#14252e';
    particleHost.hidden = false;
    for(const f of bundle.expedition?.read().facilities??[]){
      if(f.canonicalStructureId!==null||!worldPositionKnown(bundle,{x:f.x,y:f.y}))continue;
      const footprint=bundle.expedition!.facilityFootprint(f.id)!;
      const rendered=renderSprite(fieldFacilitySprite(f.definitionId,footprint.width,footprint.depth,f.orientation),{x:f.x,y:f.y},camera,'facility',f.id);
      if(rendered){rendered.dataset.facilityDefinition=f.definitionId;rendered.dataset.facilityOrientation=String(f.orientation);bindUiText(rendered,"aria-label",uiPhrase(expeditionFacility(f.definitionId)!.name));}
    }
    const environment = bundle.worldStore.getEnvironmentView();
    if (environment.brightness !== undefined) {
      const brightness = Math.round(environment.brightness * 200) / 200;
      if (worldStage.dataset.brightness !== String(brightness)) {
        worldStage.dataset.brightness = String(brightness);
      }
      // An ancestor brightness filter re-rasterizes the entire moving SVG/DOM
      // world when an actor changes. A screen-space black alpha layer gives the
      // same RGB attenuation without putting the world inside a filter surface.
      if (brightness < 1) {
        const daylight = sceneElement('daylight');
        daylight.style.cssText = 'position:absolute;inset:0;z-index:740000;pointer-events:none;background:rgba(0,0,0,' + String(1 - brightness) + ')';
        daylight.dataset.worldLighting = 'calendar';
        appendScene(daylight, true);
      }
      canvas.dataset.timeSegment = environment.timeSegment;
      canvas.dataset.calendarDay = String(environment.dayIndex);
    }
    const context = getPresentationContext();
    const regionalWeather=bundle.config.colonyDepthEnabled===true?colonyWeatherAt(bundle.config.worldSeed,camera,bundle.authorityTick):null;
    if(bundle.livingWorld)layer.dataset.livingSeason=bundle.livingWorld.season().id;
    const raining = regionalWeather === null ? environment.coldRainStatus === 'active' : regionalWeather.weather === 'mist-rain';
    if(regionalWeather!==null){
      canvas.dataset.biome=regionalWeather.biomeId;canvas.dataset.regionalWeather=regionalWeather.weather;
      for(const site of bundle.colonyDepth.sites()){
        if(site.template){
          // Reveal each trace independently: seeing a trace never reveals its destination.
          const traces=[[-8,0,'paving'],[-5,1,'paving'],[-3,0,'conduit'],[4,3,'wall'],[5,-3,'wall'],[0,5,'paving']] as const;
          for(let index=0;index<traces.length;index++){const [dx,dy,kind]=traces[index]!,at={x:site.position.x+dx,y:site.position.y+dy};
            if(worldPositionKnown(bundle,at)){const trace=renderSprite(explorationTraceSprite(kind),at,camera,'ruin-trace',site.id+':trace:'+index,{zIndex:worldDepthOrder(at,kind==='wall'?-2:-80000),data:Object.freeze({traceKind:kind})});if(trace){trace.style.pointerEvents='none';trace.removeAttribute('role');trace.removeAttribute('tabindex');}}
          }
        }
        if(!worldPositionKnown(bundle,site.position))continue;
        const rendered = renderSprite(site.template ? explorationSiteSprite(site.template,bundle.colonyDepth.siteStage(site.id)) : colonyLandmarkSprite(site),site.position,camera,'survey-site',site.id,{zIndex:worldDepthOrder(site.position,-1),data:Object.freeze({siteId:site.id,biome:site.biomeId,inspected:String(bundle.colonyDepth.read().inspectedSites.includes(site.id)),explorationState:'EXPLORED',poiTemplate:site.template??'',poiStage:bundle.colonyDepth.siteStage(site.id)})});
        if(rendered && site.template){
          // The diorama floor is scenery: only its console receives pointer input.
          rendered.removeAttribute('role');rendered.removeAttribute('tabindex');rendered.style.pointerEvents='none';rendered.style.clipPath='none';rendered.removeAttribute('title');
          let console = rendered.querySelector<HTMLButtonElement>('[data-site-interaction]');
          if (!console) { console=document.createElement('button');console.type='button';console.dataset.siteInteraction='true';console.style.cssText='position:absolute;left:15px;top:44px;width:20px;height:20px;padding:0;border:1px solid #aedace55;background:transparent;cursor:pointer;pointer-events:auto';rendered.append(console); }
          const lockerHandle=site.template==='garden'||site.template==='shelter';
          console.style.left=lockerHandle?'58px':'15px';console.style.top=lockerHandle?'49px':'44px';
          bindUiText(console,"aria-label",uiText("ui.2cd3c2b4")+uiPhrase(site.name));

        }
      }
    }

    renderTerrain(
      camera,
      bundle.authorityTick,
      environment.brightness === undefined && environment.dayPeriod === 'night',
      raining,
    );

    if (environment.brightness === undefined && environment.dayPeriod === 'night') {
      const night = sceneElement('night');
      night.className = 'p1-product-night';
      night.dataset.dayPeriod = 'NIGHT';
      night.dataset.nightTreatment = 'accepted-value-treatment';
      appendScene(night, true);
    }

    for (const entity of bundle.world.getActiveGeneratedEntities()) {
      if (entity.type === 'resource') {
        if (bundle.worldStore.getResourceState(entity.entityId)?.uprootedVersion === 1) continue;
      }
      if (entity.type === 'passive-wildlife' && (bundle.livingWorld || entity.entityId === bundle.sustenance.read().animalEntityId)) continue;
      if (
        entity.type !== 'hostile'
        && !worldPositionKnown(bundle, entity.position)
      ) {
        continue;
      }

      if (entity.type === 'hostile') {
        if (worldPositionKnown(bundle, entity.position)) {
          renderPredator(entity, camera);
        }
        continue;
      }

      const rendered=renderSprite(
        entitySprite(bundle, entity),
        entity.position,
        camera,
        entity.type,
        entity.entityId,
      );
      if(rendered!==null && entity.type==='resource' && bundle.config.colonyDepthEnabled===true){
        // The authored 32×48 resource cell has transparent sky above a rock.
        // Do not let that empty rectangle steal clicks from a crop behind it.
        const size = bundle.worldStore.getResourceSize(entity.entityId, entity.definitionId);
        const resourceState = bundle.worldStore.getResourceState(entity.entityId);
        if (size) rendered.style.clipPath = sizedResourceHitShape(entity.definitionId, size, resourceState?.depleted === true, resourceState?.lifecycle?.kind === 'plant' ? resourceState.lifecycle.stage : undefined);
        if (resourceState?.lifecycle?.kind === 'plant') rendered.dataset.growthStage = resourceState.lifecycle.stage;
        else if (!size && (entity.definitionId === 'resource:stone-outcrop' || entity.definitionId === 'resource:metal-ore-node')) rendered.style.clipPath = 'polygon(8% 40%,65% 40%,94% 64%,94% 94%,8% 94%)';
        else if (!size && entity.definitionId === 'resource:potable-water-source') rendered.style.clipPath = 'polygon(0 59%,50% 57%,100% 75%,50% 96%,0 80%)';
        const name=uiText("ui.7cc2b63e")+contentDisplayName(bundle.catalog.getAs(entity.definitionId,'resource'));
        if(rendered.getAttribute('role')!=='button'){rendered.setAttribute('role','button');rendered.tabIndex=0;rendered.style.pointerEvents='auto';rendered.style.cursor='pointer';}
        if(rendered.getAttribute('aria-label')!==name)bindUiText(rendered,"aria-label",name);
        if (size) rendered.dataset.resourceSize = size;
        rendered.removeAttribute('title');
        bindEntityInspection(rendered, () => {
          if (!worldPositionKnown(bundle, entity.position)) return null;
          const current = bundle.worldStore.getResourceState(entity.entityId);
          const harvest = resourceHarvestDefinition(bundle.catalog.getAs(entity.definitionId,'resource'),size,current?.lifecycle?.kind === 'plant' ? current.lifecycle.stage : undefined);
          return {id:entity.entityId,name:contentDisplayName(bundle.catalog.getAs(entity.definitionId,'resource')),kind:uiText("ui.23b0d815"),facts:[...(size ? [uiText("ui.adb28456")+RESOURCE_SIZE_PROFILES[size].label] : []),uiText("ui.6ac9b7f4")+harvest.output.quantity+' '+contentDisplayName(bundle.catalog.getAs(harvest.output.itemId,'item')),uiText("ui.53d0e7d5")+harvest.gatherChannelSeconds+'s',...resourceLifecycleFacts(current?.lifecycle,bundle.authorityTick,current?.remainingGatherActions??null),...(current?.lifecycle ? [] : [current?.depleted ? uiText("ui.1e97f9d8")+Math.max(0,Math.ceil(((current.regenerationReadyTick??bundle.authorityTick)-bundle.authorityTick)/60))+uiText("ui.3b16e069") : uiText("ui.72402638")]),uiText("ui.f321724a")]};
        });
      }

      if (entity.type === 'ruin') {
        const ruin = bundle.worldStore.getRuinState(entity.entityId);
        if (ruin !== undefined && ruin.discoveryState !== 'unknown') {
          const markerPosition = Object.freeze({
            x: entity.position.x,
            y: entity.position.y - 0.5,
          });
          renderSprite(
            ruinInspectMarkerSprite(
              ruin.discoveryState === 'investigated'
                ? 'INVESTIGATED'
                : "AVAILABLE",
            ),
            markerPosition,
            camera,
            'ruin-inspect-marker',
            entity.entityId,
          );
        }
      }
    }

    for (
      const structure
      of bundle.buildings.exportSnapshot().foothold.structures
    ) {
      if (!worldPositionKnown(bundle, structure.position)) {
        continue;
      }
      const structureElement=renderSprite(
        structureSprite(
          bundle,
          structure.structureId,
          structure.definitionId,
        ),
        structure.position,
        camera,
        'structure',
        structure.structureId,
        { ...(environment.dayPeriod === 'night' ? { className: 'p1-product-module-night' } : {}) },
      );
      if(structureElement&&structure.containerId&&structure.definitionId==='structure:storage-crate'&&bundle.config.colonyDepthEnabled===true){
        const container=bundle.items.getContainerView(structure.containerId),capacity=bundle.catalog.getAs(structure.definitionId,'structure').container!;
        const multiplier=container.storageCapacityMultiplier??1,fill=Math.min(1,Math.max(container.totalWeightKg/(capacity.maxWeightKg*multiplier),container.totalVolume/(capacity.maxVolume*multiplier))),percent=Math.round(fill*100);
        let indicator=structureElement.querySelector<HTMLElement>('[data-storage-fill]');if(!indicator){indicator=document.createElement('div');indicator.dataset.storageFill='';indicator.style.cssText='position:absolute;bottom:2px;left:8px;width:24px;height:3px;border:1px solid #a7b8ae;pointer-events:none';structureElement.append(indicator);}
        if(indicator.dataset.storageFill!==String(percent)){indicator.dataset.storageFill=String(percent);indicator.style.background='linear-gradient(to right,'+(percent>=90?'#dda36b':'#8ac7a0')+' '+percent+'%,#21343a '+percent+'%)';structureElement.removeAttribute('title');}
      }
    }

    const colony = bundle.sustenance.read();
    for (const site of [
      { id: 'cultivation-bed', position: CULTIVATION_POSITION, built: colony.bedBuilt },
      { id: 'grazer-pen', position: PEN_POSITION, built: colony.penBuilt },
    ]) {
      if (!worldPositionKnown(bundle, site.position)) continue;
      if (!inViewport(site.position, camera)) continue;
      const pad = sceneElement('colony-site:' + site.id);
      pad.dataset.worldRole = site.id;
      pad.dataset.built = String(site.built);
      if (!setWorldCenter(pad, site.position, camera, 52, 36, worldDepthOrder(site.position), rasterOrigin)) continue;
      pad.style.width = '52px'; pad.style.height = '36px';
      if (pad.childElementCount === 0) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 52 36'); svg.setAttribute('shape-rendering', 'crispEdges');
      svg.style.width = '52px'; svg.style.height = '36px';
      const surfaces: [string, string][] = [
        ['M0 16L26 30V35L0 21Z', '#263b42'], ['M26 30L52 16V21L26 35Z', '#182a32'],
        ['M26 2L52 16L26 30L0 16Z', '#7e9898'],
        ['M26 6L44 16L26 26L8 16Z', site.id === 'cultivation-bed' ? '#344735' : '#45585d'],
      ];
      if (site.id === 'grazer-pen') surfaces.push(['M2 15V6L26 0L50 6V15H48V8L26 2L4 8V15Z', '#a0b9b2']);
      for (const [geometry, fill] of surfaces) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', geometry); path.setAttribute('fill', fill); svg.append(path);
      }
      pad.append(svg);
      const label = document.createElement('span');
      label.style.cssText = 'font:6px monospace;color:#d8e8db;position:absolute;bottom:1px;left:8px';
      pad.append(label);
      }
      pad.style.opacity = site.built ? '1' : '.45';
      const label = pad.querySelector('span')!;
      const labelText = (site.id === 'cultivation-bed' ? 'BED' : 'PEN') + (site.built ? '' : ' · N');
      if (label.textContent !== labelText) bindUiText(label,"textContent",labelText);
      appendScene(pad);
      if (site.id === 'cultivation-bed' && colony.cropProgressTicks !== null) {
        for (const offset of [-1, 0, 1]) renderSprite(PHASE1_PRODUCTION_WORLD_SPRITES.floraDecor,
          { x: site.position.x + offset, y: site.position.y }, camera, 'cultivated-crop', 'crop:' + String(offset));
      }
      if (site.id === 'grazer-pen' && colony.animalEntityId !== null) {
        renderSprite(PHASE1_PRODUCTION_WORLD_SPRITES.passiveWildlife, site.position, camera,
          'captive-grazer', colony.animalEntityId);
      }
    }
    const snapshot = bundle.world.exportSnapshot();
    for (const cache of snapshot.deathCaches.caches) {
      if (!worldPositionKnown(bundle, cache.position)) continue;
      const state =
        cache.entityId === context.targetedDeathCacheId
          ? 'TARGETED'
          : 'ACTIVE';
      renderSprite(
        deathCacheSprite(state),
        cache.position,
        camera,
        'death-cache',
        cache.entityId,
        {
          className: 'p1-product-critical',
          zIndex: state === 'ACTIVE' ? 890000 : 905000,
          data: Object.freeze({
            deathCacheState: state,
          }),
        },
      );
    }
    const recovered = context.recoveredDeathCache;
    if (
      recovered !== null
      && recovered.untilAuthorityTick >= bundle.authorityTick
    ) {
      renderSprite(
        deathCacheSprite('RECOVERED'),
        recovered.position,
        camera,
        'death-cache-recovered',
        recovered.entityId,
        {
          className: 'p1-product-critical',
          zIndex: 905000,
          data: Object.freeze({
            deathCacheState: 'RECOVERED',
          }),
        },
      );
    }

    for (const drop of snapshot.drops) {
      if (
        !drop.available
        || !worldPositionKnown(bundle, drop.position)
      ) {
        continue;
      }
      const container = bundle.items.getContainerView(drop.containerId);
      if (container.stacks.length === 0) continue;
      renderSprite(
        PHASE1_PRODUCTION_WORLD_SPRITES.worldDrop,
        drop.position,
        camera,
        'world-drop',
        drop.worldDropId,
        {
          className: 'p1-product-critical',
          zIndex: 890000,
        },
      );
      const stack = container.stacks[0];
      if (stack !== undefined) {
        const displayName =
          contentDisplayName(bundle.catalog.get(stack.itemDefinitionId));
        const icon = itemIconSprite(displayName);
        if (icon !== null) {
          const iconPosition = Object.freeze({
            x: drop.position.x,
            y: drop.position.y - 0.55,
          });
          renderSprite(
            icon,
            iconPosition,
            camera,
            'world-drop-item-icon',
            drop.worldDropId,
            {
              className: 'p1-product-world-drop-icon',
              zIndex: 891000,
              data: Object.freeze({
                itemDefinitionId: stack.itemDefinitionId,
              }),
            },
          );
        }
      }
    }

    if (context.buildPreview !== null) {
      for (const anchor of bundle.buildings.exportSnapshot().foothold.structures.filter(structure =>
        (structure.definitionId === 'structure:landing-module' || structure.definitionId === 'structure:habitat-room')
        && worldPositionKnown(bundle, structure.position))) {
      const zone = sceneElement('build-zone:' + anchor.structureId);
      zone.dataset.worldRole = 'build-zone';
      const width = Math.round(PHASE1_BUILD_ZONE_RADIUS_WU * Math.SQRT2 * 32);
      const height = Math.round(width / 2);
      setWorldCenter(zone, anchor.position, camera, width, height, -30000, rasterOrigin);
      zone.style.width = String(width) + 'px'; zone.style.height = String(height) + 'px';
      zone.style.border = '1px dashed #b3d5c1'; zone.style.borderRadius = '50%';
      zone.style.background = 'rgba(113,170,133,.06)';
      appendScene(zone);
      }
      renderBuildPreview(context.buildPreview, camera);
    }

    const playerMotions = getPlayerMotions();
    const slotOrder: Readonly<Record<string, number>> = Object.freeze({
      TEAM_A: 0,
      TEAM_B: 1,
      TEAM_C: 2,
      TEAM_D: 3, TEAM_E: 4, TEAM_F: 5, TEAM_G: 6,
      LOCAL: 3,
      UNASSIGNED: 4,
    });
    const teammates = playerMotions
      .filter((motion) =>
        motion.playerId !== playerId
        && (
          motion.presentationIdentitySlot === 'TEAM_A'
          || motion.presentationIdentitySlot === 'TEAM_B'
          || motion.presentationIdentitySlot === 'TEAM_C'
          || motion.presentationIdentitySlot === 'TEAM_D' || motion.presentationIdentitySlot === 'TEAM_E'
          || motion.presentationIdentitySlot === 'TEAM_F' || motion.presentationIdentitySlot === 'TEAM_G'
        ),
      )
      .sort(
        (left, right) =>
          slotOrder[left.presentationIdentitySlot]!
          - slotOrder[right.presentationIdentitySlot]!,
      );
    for (const motion of teammates) {
      renderPlayer(
        motion.playerId,
        camera,
        context,
        false,
        motion.presentationIdentitySlot,
      );
    }
    renderPlayer(playerId, camera, context, true, 'LOCAL');

    const windVisual = regionalWeather ? colonyWeatherVisualAt(bundle.config.worldSeed,camera,bundle.authorityTick) : undefined;
    const windVisible = regionalWeather?.biomeId === 'ochre-badlands' && windVisual?.phase !== 'calm';
    if (raining || windVisible) {
      const kind = raining ? 'rain' : 'dry-wind';
      const weather = sceneElement('weather:particles');
      weather.style.cssText = 'position:absolute;inset:0;z-index:790000;pointer-events:none';
      weather.dataset.weatherEffect = raining ? 'cold-rain' : 'dry-wind';
      if (particleHost.parentElement !== weather) weather.append(particleHost);
      const dustAnchors: {x:number;y:number;salt:number}[] = [];
      if (kind === 'dry-wind') {
        // Anchor sparse dust to known dry ground. Water and fog never emit it.
        const cx=Math.floor(camera.x/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS),cy=Math.floor(camera.y/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS);
        for(let y=cy-8;y<=cy+8 && dustAnchors.length<12;y++)for(let x=cx-10;x<=cx+10 && dustAnchors.length<12;x++) {
          if(!explorationCellKnown(bundle,x,y))continue;
          const point=worldCell(x,y),base=terrainForCell(bundle,x,y);
          if(colonyLandscapeTerrainAt(bundle.config.worldSeed,point,base,bundle.config.worldGenerationVersion??1)!=='ground')continue;
          if(moistureState(terrainMoisture(x+':'+y,point,bundle.authorityTick))!=='dry')continue;
          const raster=distancePx(point,camera);
          if(raster.x<0||raster.x>640||raster.y<0||raster.y>360)continue;
          dustAnchors.push({...raster,salt:stableDecorHash(x,y)});
        }
        groundParticleHost.style.left=offset.x+'px';groundParticleHost.style.top=offset.y+'px';
        worldStage.append(groundParticleHost);
        weather.dataset.weatherPhase=windVisual!.phase;weather.dataset.weatherIntensity=windVisual!.intensity.toFixed(2);weather.dataset.windDirection=String(windVisual!.direction);
      } else groundParticleHost.remove();
      particles.render(kind, targetWindow.performance.now() / 1000, offset, motionPreference.matches, kind==='dry-wind'?windVisual:undefined, dustAnchors);
      weather.dataset.groundDustCount=particles.groundCanvas.dataset.groundDustCount;
      weather.dataset.rainMotionPhase = particles.canvas.dataset.particlePhase;
      appendScene(weather, true);
      if (raining) {
        const haze = sceneElement('weather:atmosphere');
        haze.dataset.weatherEffect = 'atmospheric-mass';
        haze.style.cssText = 'position:absolute;inset:0;z-index:780000;pointer-events:none;background:linear-gradient(140deg,#9cbac20c,transparent 55%,#759ba00a)';
        appendScene(haze, true);
      }
    }

    if (!windVisible) groundParticleHost.remove();

    // Remove only entities that actually leave the visible canonical scene.
    // Repeated rendering preserves node/texture identity and does not churn DOM.
    for (const [key, element] of retained) {
      if (!visibleKeys.has(key)) {
        element.remove();
        retained.delete(key);
      }
    }

    canvas.dataset.playerX = camera.x.toFixed(6);
    canvas.dataset.playerY = camera.y.toFixed(6);
    canvas.dataset.authorityTick = String(bundle.authorityTick);
    canvas.dataset.weatherState = regionalWeather === null ? environment.coldRainStatus : regionalWeather.warning ? 'warning' : regionalWeather.weather === 'clear' ? 'clear' : 'active';
    canvas.dataset.dayPeriod = environment.dayPeriod;
    canvas.dataset.fogProjection = 'canonical-exploration';
    canvas.dataset.terrainProjection = 'accepted-raster';
    canvas.dataset.worldPerspective = 'isometric-2-to-1';
    canvas.dataset.teammateCount = String(teammates.length);
  };

  targetWindow.addEventListener('resize', applyScale);
  applyScale();

  return Object.freeze({
    canvas,
    render,
    destroy(): void {
      targetWindow.removeEventListener('resize', applyScale);
      layer.remove();
      retained.clear();
      caveScene.destroy();
      canvas.remove();
    },
  });
}
