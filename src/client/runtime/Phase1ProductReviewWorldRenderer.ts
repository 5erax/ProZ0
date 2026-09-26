import {
  WORLD_PIXELS_PER_UNIT,
  type WorldPosition,
} from '../../foundation';
import type { Phase1AuthorityBundle } from '../../integration';
import {
  fromWorldPosition,
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
const INTERNAL_HEIGHT = 360;
const HALF_WIDTH = INTERNAL_WIDTH / 2;
const HALF_HEIGHT = INTERNAL_HEIGHT / 2;
const VISIBLE_MARGIN_PX = 96;
const WORLD_HALF_WIDTH =
  HALF_WIDTH / WORLD_PIXELS_PER_UNIT;
const WORLD_HALF_HEIGHT =
  HALF_HEIGHT / WORLD_PIXELS_PER_UNIT;

const EMPTY_CONTEXT: Phase1ProductReviewWorldPresentationContext =
  Object.freeze({
    localAction: null,
    localActionStartedTick: null,
    targetedDeathCacheId: null,
    recoveredDeathCache: null,
    buildPreview: null,
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
}

function distancePx(
  world: WorldPosition,
  camera: WorldPosition,
): { readonly x: number; readonly y: number } {
  return Object.freeze({
    x: HALF_WIDTH + Math.round(
      (world.x - camera.x) * WORLD_PIXELS_PER_UNIT,
    ),
    y: HALF_HEIGHT + Math.round(
      (world.y - camera.y) * WORLD_PIXELS_PER_UNIT,
    ),
  });
}

function setWorldAnchor(
  element: HTMLElement,
  position: WorldPosition,
  camera: WorldPosition,
  width: number,
  height: number,
  zIndex?: number,
): boolean {
  const raster = distancePx(position, camera);
  if (
    raster.x < -VISIBLE_MARGIN_PX
    || raster.x > INTERNAL_WIDTH + VISIBLE_MARGIN_PX
    || raster.y < -VISIBLE_MARGIN_PX
    || raster.y > INTERNAL_HEIGHT + VISIBLE_MARGIN_PX
  ) {
    return false;
  }

  element.style.position = 'absolute';
  element.style.left = String(raster.x - width / 2) + 'px';
  element.style.top = String(raster.y - height) + 'px';
  element.style.zIndex = String(
    zIndex ?? Math.round(position.y * 1000),
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
): boolean {
  const raster = distancePx(position, camera);
  if (
    raster.x < -VISIBLE_MARGIN_PX
    || raster.x > INTERNAL_WIDTH + VISIBLE_MARGIN_PX
    || raster.y < -VISIBLE_MARGIN_PX
    || raster.y > INTERNAL_HEIGHT + VISIBLE_MARGIN_PX
  ) {
    return false;
  }
  element.style.position = 'absolute';
  element.style.left = String(raster.x - width / 2) + 'px';
  element.style.top = String(raster.y - height / 2) + 'px';
  element.style.zIndex = String(zIndex);
  return true;
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
      const depleted = state?.depleted === true;
      switch (entity.definitionId) {
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
        case 'resource:tree-timber':
          return resourceNodeSprite(
            'treeTimber',
            depleted ? 'DEPLETED' : 'NORMAL',
          );
        case 'resource:stone-outcrop':
          return resourceNodeSprite(
            'stoneOutcrop',
            depleted ? 'DEPLETED' : 'NORMAL',
          );
        case 'resource:metal-ore':
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
    '.p1-product-critical{z-index:890000!important;}',
    '.p1-product-identity{z-index:930000!important;}',
    '.p1-product-predator-telegraph{filter:drop-shadow(0 0 1px #f6e2a7) drop-shadow(0 0 2px #7f341f);z-index:910000!important;}',
    '.p1-product-night{position:absolute;inset:0;z-index:-50000;pointer-events:none;background:rgba(7,12,28,.48);mix-blend-mode:multiply;}',
    '.p1-product-weather{position:absolute;inset:0;z-index:800000;pointer-events:none;opacity:.54;}',
    '.p1-product-build-preview{z-index:920000!important;opacity:.82;}',
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
  layer.append(styleElement(document));

  root.replaceChildren(canvas, layer);

  const previousPlayerHealth = new Map<string, number>();
  const playerHurtStartTick = new Map<string, number>();
  const playerDeathStartTick = new Map<string, number>();
  const previousPredatorHealth = new Map<string, number>();
  const predatorHurtStartTick = new Map<string, number>();

  const applyScale = (): void => {
    const scale = Math.max(
      1,
      Math.floor(Math.min(
        targetWindow.innerWidth / INTERNAL_WIDTH,
        targetWindow.innerHeight / INTERNAL_HEIGHT,
      )),
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
    const element = document.createElement('div');
    element.className =
      'p1-product-sprite'
      + (options.className === undefined
        ? ''
        : ' ' + options.className);
    element.dataset.worldRole = role;
    element.dataset.worldId = id;
    for (const [key, value] of Object.entries(options.data ?? {})) {
      element.dataset[key] = value;
    }
    applyProductionSprite(
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
      )
    ) {
      return null;
    }
    layer.append(element);
    return element;
  };

  const renderTerrain = (
    camera: WorldPosition,
    authorityTick: number,
    night: boolean,
  ): void => {
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
        const known = explorationCellKnown(bundle, gx, gy);
        const terrain = known
          ? terrainForCell(bundle, gx, gy)
          : 'ground';
        const variant = terrain === 'water'
          ? Math.floor(authorityTick / 15)
          : Math.abs(gx * 31 + gy * 17);
        const tile = document.createElement('div');
        tile.className = 'p1-product-terrain';
        tile.dataset.worldRole = 'terrain';
        tile.dataset.terrainState = terrain;
        tile.dataset.explorationState =
          known ? 'EXPLORED' : 'UNEXPLORED';
        applyProductionSprite(
          tile,
          terrainCellSprite(terrain, variant),
        );
        if (night) {
          tile.style.filter = 'brightness(.62) saturate(.72)';
        }
        if (
          setWorldCenter(
            tile,
            position,
            camera,
            32,
            32,
            -100000,
          )
        ) {
          layer.append(tile);
        }

        if (!known) {
          const fog = document.createElement('div');
          fog.className = 'p1-product-fog';
          fog.dataset.worldRole = 'fog';
          fog.dataset.fogState = 'UNEXPLORED';
          const mask = fogAdjacencyMask(bundle, gx, gy);
          fog.dataset.fogMask = String(mask);
          applyProductionSprite(fog, fogMaskSprite(mask));
          if (
            setWorldCenter(
              fog,
              position,
              camera,
              32,
              32,
              700000,
            )
          ) {
            layer.append(fog);
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
    teammateOrdinal: number,
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
      movement.facing,
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
        }),
      },
    );
    if (player === null) return;

    const equipment = bundle.equipment.getView(id);
    if (equipment.equippedThermalWrapStackId !== null) {
      const overlayFrame = thermalWrapActorSprite(
        movement.facing,
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
      const shape = teammateOrdinal === 0
        ? 'circle'
        : teammateOrdinal === 1
          ? 'diamond'
          : 'triangle';
      const slot = teammateOrdinal === 0
        ? 'TEAM_A'
        : teammateOrdinal === 1
          ? 'TEAM_B'
          : 'TEAM_C';
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
            identitySlot: slot,
            markerShape: shape,
          }),
        },
      );
      if (marker !== null) {
        marker.dataset.presentationIdentitySlot = slot;
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
      facing,
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
        - sprite.cellWidth / WORLD_PIXELS_PER_UNIT / 2,
      y: preview.position.y
        - sprite.cellHeight / WORLD_PIXELS_PER_UNIT,
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
    const style = layer.querySelector('style');
    layer.replaceChildren();
    if (style !== null) layer.append(style);

    const camera = bundle.getPlayerPosition(playerId);
    const environment = bundle.worldStore.getEnvironmentView();
    const context = getPresentationContext();

    renderTerrain(
      camera,
      bundle.authorityTick,
      environment.dayPeriod === 'night',
    );

    if (environment.dayPeriod === 'night') {
      const night = document.createElement('div');
      night.className = 'p1-product-night';
      night.dataset.dayPeriod = 'NIGHT';
      night.dataset.nightTreatment = 'accepted-value-treatment';
      layer.append(night);
    }

    for (const entity of bundle.world.getActiveGeneratedEntities()) {
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
      );
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
          zIndex: 890000,
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
          zIndex: 890000,
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
      const container = bundle.items.getContainerView(drop.containerId);
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
      renderBuildPreview(context.buildPreview, camera);
    }

    const activePlayerIds = bundle.getActivePlayerIds();
    const teammates = activePlayerIds
      .filter((id) => id !== playerId)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 3);
    for (const [index, id] of teammates.entries()) {
      renderPlayer(id, camera, context, false, index);
    }
    renderPlayer(playerId, camera, context, true, -1);

    if (environment.coldRainStatus === 'active') {
      const weather = document.createElement('div');
      weather.className = 'p1-product-weather';
      weather.dataset.weatherEffect = 'cold-rain';
      const rain = coldRainSprite(
        'RAIN_STREAK',
        (Math.floor(bundle.authorityTick / 6) % 4) as 0 | 1 | 2 | 3,
      );
      weather.style.backgroundImage = 'url("' + rain.url + '")';
      weather.style.backgroundSize =
        String(rain.sourceWidth) + 'px '
        + String(rain.sourceHeight) + 'px';
      weather.style.backgroundPosition =
        String(
          -(rain.index % rain.columns) * rain.cellWidth,
        ) + 'px '
        + String(
          -Math.floor(rain.index / rain.columns) * rain.cellHeight,
        ) + 'px';
      weather.style.imageRendering = 'pixelated';
      layer.append(weather);
    }

    canvas.dataset.playerX = camera.x.toFixed(6);
    canvas.dataset.playerY = camera.y.toFixed(6);
    canvas.dataset.authorityTick = String(bundle.authorityTick);
    canvas.dataset.weatherState = environment.coldRainStatus;
    canvas.dataset.dayPeriod = environment.dayPeriod;
    canvas.dataset.fogProjection = 'canonical-exploration';
    canvas.dataset.terrainProjection = 'accepted-raster';
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
      canvas.remove();
    },
  });
}
