import {
  WORLD_PIXELS_PER_UNIT,
  type WorldPosition,
} from '../../foundation';
import type { Phase1AuthorityBundle } from '../../integration';
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
  fogMaskSprite,
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
const FOG_CLOUDS_URL = new URL('../../../assets/phase1/world/effects/fog_clouds_v1.svg', import.meta.url).href;
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
  zIndex?: number,
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
    zIndex ?? Math.round((position.x + position.y) * 1000),
  );
  return true;
}

function setWorldCenter(
  element: HTMLElement,
  position: WorldPosition,
  camera: WorldPosition,
  width: number,
  height: number,
  zIndex: number,
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

function worldPositionKnown(
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
    '.p1-product-player,.p1-product-teammate{z-index:900000!important;}',
    '.p1-product-player[data-local-player="true"]{filter:drop-shadow(1px 0 0 #f4f6ef) drop-shadow(-1px 0 0 #f4f6ef) drop-shadow(0 1px 0 #f4f6ef) drop-shadow(0 -1px 0 #f4f6ef);}',
    '.p1-product-focused-target{outline:1px solid #f4f6ef;outline-offset:1px;box-shadow:0 0 0 1px #111722;}',
    '.p1-product-critical{z-index:890000!important;}',
    '.p1-product-identity{z-index:930000!important;}',
    '.p1-product-predator-telegraph{filter:drop-shadow(0 0 1px #f6e2a7) drop-shadow(0 0 2px #7f341f);z-index:910000!important;}',
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
  layer.style.backgroundImage = 'url("' + FOG_CLOUDS_URL + '")';
  layer.style.backgroundSize = '128px 128px';
  layer.append(styleElement(document));
  const worldStage = document.createElement('div');
  worldStage.className = 'p1-product-world-stage';
  worldStage.style.cssText = 'position:absolute;inset:0;will-change:transform;';
  layer.append(worldStage);
  const rasterOrigin = bundle.getPlayerPosition(playerId);
  const rainFrames: string[] = [];
  const rainAtlas = document.createElement('img');
  rainAtlas.addEventListener('load', () => {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = INTERNAL_WIDTH; frameCanvas.height = INTERNAL_HEIGHT;
    const context = frameCanvas.getContext('2d');
    if (context === null) return;
    context.imageSmoothingEnabled = false;
    for (let frame = 0; frame < 4; frame += 1) {
      context.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      for (let y = -32; y < INTERNAL_HEIGHT; y += 48) for (let x = -32; x < INTERNAL_WIDTH; x += 48) {
        const hash = stableDecorHash(x, y);
        if (hash % 3 === 0) continue;
        const index = (frame + hash) % 4;
        context.drawImage(rainAtlas, index * 16, 0, 16, 16, x + hash % 16, y, 32, 32);
      }
      rainFrames.push(frameCanvas.toDataURL('image/png'));
    }
  }, { once: true });
  rainAtlas.src = PHASE1_PRODUCTION_WORLD_SPRITES.coldRain.url;

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
    const key = [definition.url, definition.index, definition.cellWidth,
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
      readonly zIndex?: number;
      readonly data?: Readonly<Record<string, string>>;
    } = {},
  ): HTMLElement | null => {
    if (!inViewport(position, camera)) return null;
    const element = sceneElement('sprite:' + role + ':' + id);
    element.className =
      'p1-product-sprite'
      + (options.className === undefined
        ? ''
        : ' ' + options.className);
    const focused = id === getPresentationContext().focusedWorldTargetId;
    if (focused) {
      element.classList.add('p1-product-focused-target');
      element.dataset.focusedTarget = 'true';
    }
    if (!focused) delete element.dataset.focusedTarget;
    element.dataset.worldRole = role;
    element.dataset.worldId = id;
    const data = options.data ?? {};
    for (const key of spriteDataKeys.get(element) ?? []) {
      if (!(key in data)) delete element.dataset[key];
    }
    spriteDataKeys.set(element, Object.keys(data));
    for (const [key, value] of Object.entries(data)) {
      element.dataset[key] = value;
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
        const terrain = known
          ? terrainForCell(bundle, gx, gy)
          : 'ground';
        const variant = terrain === 'water'
          ? Math.floor(authorityTick / 15)
          : (stableDecorHash(Math.floor(gx / 3), Math.floor(gy / 3))
            + (stableDecorHash(gx, gy) % 7 === 0 ? 1 : 0)) % 4;
        if (known) {
        const tile = sceneElement('terrain:' + String(gx) + ':' + String(gy));
        tile.className = 'p1-product-terrain';
        tile.dataset.worldRole = 'terrain';
        tile.dataset.terrainState = terrain;
        tile.dataset.explorationState =
          known ? 'EXPLORED' : 'UNEXPLORED';
        applySprite(
          tile,
          terrainCellSprite(terrain, variant),
          EXPLORATION_CELL_RASTER_SCALE,
        );
        tile.style.filter = night ? 'brightness(.78) saturate(.72)' : '';
        tile.style.boxShadow = '';
        delete tile.dataset.terrainDepth;
        if (known && terrain === 'ground' && explorationCellKnown(bundle, gx, gy + 1)
          && terrainForCell(bundle, gx, gy + 1) === 'water') {
          tile.style.boxShadow = '0 3px 0 #38483f,0 6px 0 #203332,0 7px 0 #17282e';
          tile.style.zIndex = '-90000';
          tile.dataset.terrainDepth = 'raised-shore';
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
          appendScene(tile);
        }
        }

        if (
          known
          && terrain === 'ground'
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
          applySprite(
            fog,
            fogMaskSprite(mask),
            EXPLORATION_CELL_RASTER_SCALE,
          );
          // Preserve the canonical reveal mask while replacing the hatch with layered pixel clouds.
          fog.style.height = String(EXPLORATION_CELL_LOGICAL_PIXELS / 2) + 'px';
          fog.style.clipPath = 'polygon(50% -.5%,100.5% 50%,50% 100.5%,-.5% 50%)';
          fog.style.backgroundImage = 'url("' + FOG_CLOUDS_URL + '")';
          fog.style.backgroundSize = '128px 128px';
          fog.style.backgroundRepeat = 'repeat';
          const drift = Math.floor(authorityTick / 120);
          fog.style.backgroundPosition = String(-(gx - gy) * EXPLORATION_CELL_LOGICAL_PIXELS / 2
            + EXPLORATION_CELL_LOGICAL_PIXELS / 2 + drift) + 'px '
            + String(-(gx + gy) * EXPLORATION_CELL_LOGICAL_PIXELS / 4) + 'px';
          fog.dataset.fogTreatment = 'layered-pixel-clouds';
          if (
            setWorldCenter(
              fog,
              position,
              camera,
              EXPLORATION_CELL_LOGICAL_PIXELS,
              EXPLORATION_CELL_LOGICAL_PIXELS / 2,
              700000,
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
        zIndex: 900000,
        data: Object.freeze({
          actorState: state,
          facing: movement.facing ?? 'S',
          localPlayer: String(local),
        }),
      },
    );
    if (player === null) return;

    const equipment = bundle.equipment.getView(id);
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
          zIndex: 900001,
          data: Object.freeze({
            actorState: state,
          }),
        },
      );
    }

    if (!local) {
      const shape = presentationIdentitySlot === 'TEAM_A'
        ? 'circle'
        : presentationIdentitySlot === 'TEAM_B'
          ? 'diamond'
          : presentationIdentitySlot === 'TEAM_C'
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
              zIndex: 910000,
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
    const offset = projectPhase1Isometric(camera, rasterOrigin);
    worldStage.style.transform = 'translate(' + String(-offset.x) + 'px,' + String(-offset.y) + 'px)';
    // Atmospheric cloud drift is screen-space; camera motion must not repaint
    // the full viewport backdrop on each simulation tick.
    layer.style.backgroundPosition = String(Math.floor(bundle.authorityTick / 120)) + 'px 0px';
    const environment = bundle.worldStore.getEnvironmentView();
    const context = getPresentationContext();

    renderTerrain(
      camera,
      bundle.authorityTick,
      environment.dayPeriod === 'night',
      environment.coldRainStatus === 'active',
    );

    if (environment.dayPeriod === 'night') {
      const night = sceneElement('night');
      night.className = 'p1-product-night';
      night.dataset.dayPeriod = 'NIGHT';
      night.dataset.nightTreatment = 'accepted-value-treatment';
      appendScene(night, true);
    }

    for (const entity of bundle.world.getActiveGeneratedEntities()) {
      if (entity.type === 'passive-wildlife' && entity.entityId === bundle.sustenance.read().animalEntityId) continue;
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

      renderSprite(
        entitySprite(bundle, entity),
        entity.position,
        camera,
        entity.type,
        entity.entityId,
      );

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
                : 'AVAILABLE',
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
      renderSprite(
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
      if (!setWorldCenter(pad, site.position, camera, 52, 36, Math.round((site.position.x + site.position.y) * 1000), rasterOrigin)) continue;
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
      if (label.textContent !== labelText) label.textContent = labelText;
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
          bundle.catalog.get(stack.itemDefinitionId).displayName;
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

    if (environment.coldRainStatus === 'active') {
      const weather = sceneElement('weather:rain');
      weather.className = 'p1-product-weather';
      weather.dataset.weatherEffect = 'cold-rain';
      if (rainFrames.length === 4) {
        const frame = Math.floor(bundle.authorityTick / 6) % 4;
        if (spriteKeys.get(weather) !== 'rain-frame:' + String(frame)) {
          weather.style.backgroundImage = 'url("' + rainFrames[frame]! + '")';
          weather.style.backgroundSize = '640px 360px';
          weather.style.backgroundRepeat = 'no-repeat';
          spriteKeys.set(weather, 'rain-frame:' + String(frame));
        }
      } else for (let y = -32; y < INTERNAL_HEIGHT; y += 48) {
        for (let x = -32; x < INTERNAL_WIDTH; x += 48) {
          const hash = stableDecorHash(x, y);
          if (hash % 3 === 0) continue;
          const streak = sceneElement('weather:streak:' + String(x) + ':' + String(y));
          applySprite(streak, coldRainSprite('RAIN_STREAK',
            ((Math.floor(bundle.authorityTick / 6) + hash) % 4) as 0 | 1 | 2 | 3), 2);
          streak.style.position = 'absolute';
          streak.style.left = String(x + hash % 16) + 'px';
          streak.style.top = String(y) + 'px';
          if (streak.parentElement !== weather) weather.append(streak);
        }
      }
      const atmosphere = sceneElement('weather:atmosphere');
      atmosphere.dataset.weatherEffect = 'atmospheric-mass';
      const drift = Math.floor(bundle.authorityTick / 90) % 64;
      if (atmosphere.dataset.drift !== String(drift)) {
      atmosphere.style.cssText = 'position:absolute;inset:-64px;z-index:790000;pointer-events:none;opacity:.12;'
        + 'background-image:url("' + PHASE1_PRODUCTION_WORLD_SPRITES.weatherDither.url + '");'
        + 'background-position:' + String(drift) + 'px ' + String(-drift) + 'px;'
        + 'clip-path:polygon(0 0,42% 0,34% 18%,63% 34%,100% 12%,100% 52%,66% 70%,28% 48%,0 68%);';
      atmosphere.dataset.drift = String(drift);
      }
      appendScene(atmosphere, true);
      appendScene(weather, true);
    }

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
    canvas.dataset.weatherState = environment.coldRainStatus;
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
      canvas.remove();
    },
  });
}
