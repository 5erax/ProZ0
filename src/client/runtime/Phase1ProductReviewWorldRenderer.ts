import {
  WORLD_PIXELS_PER_UNIT,
  type WorldPosition,
} from '../../foundation';
import type { Phase1AuthorityBundle } from '../../integration';
import type {
  Phase1GeneratedWorldEntity,
} from '../../world/phase1/Phase1WorldTypes';
import {
  PHASE1_PRODUCTION_WORLD_SPRITES,
  applyProductionSprite,
  coldRainSprite,
  condenserSprite,
  deathCacheSprite,
  habitatSprite,
  resourceNodeSprite,
  ruinInspectMarkerSprite,
  type Phase1ProductionSprite,
} from '../presentation/Phase1ProductionAssets';

const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;
const HALF_WIDTH = INTERNAL_WIDTH / 2;
const HALF_HEIGHT = INTERNAL_HEIGHT / 2;
const VISIBLE_MARGIN_PX = 96;

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
  element.style.zIndex = String(Math.round(position.y * 1000));
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

function styleElement(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-product-world{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center;overflow:hidden;pointer-events:none;image-rendering:pixelated;}',
    '.p1-product-ground{position:absolute;inset:0;background:#18202b;}',
    '.p1-product-sprite{position:absolute;image-rendering:pixelated;}',
    '.p1-product-player{z-index:900000!important;}',
    '.p1-product-weather{position:absolute;inset:0;pointer-events:none;opacity:.7;}',
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

  const ground = document.createElement('div');
  ground.className = 'p1-product-ground';
  layer.append(ground);

  root.replaceChildren(canvas, layer);

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
  ): void => {
    const element = document.createElement('div');
    element.className = 'p1-product-sprite';
    element.dataset.worldRole = role;
    element.dataset.worldId = id;
    applyProductionSprite(element, spriteDefinition);
    if (
      setWorldAnchor(
        element,
        position,
        camera,
        spriteDefinition.cellWidth,
        spriteDefinition.cellHeight,
      )
    ) {
      layer.append(element);
    }
  };

  const render = (): void => {
    const style = layer.querySelector('style');
    const groundNode = layer.querySelector('.p1-product-ground');
    layer.replaceChildren();
    if (style !== null) layer.append(style);
    if (groundNode !== null) layer.append(groundNode);

    const camera = bundle.getPlayerPosition(playerId);
    const environment = bundle.worldStore.getEnvironmentView();

    for (const entity of bundle.world.getActiveGeneratedEntities()) {
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
          const marker = document.createElement('div');
          marker.className = 'p1-product-sprite';
          marker.dataset.worldRole = 'ruin-inspect-marker';
          marker.dataset.worldId = entity.entityId;
          applyProductionSprite(
            marker,
            ruinInspectMarkerSprite(
              ruin.discoveryState === 'investigated'
                ? 'INVESTIGATED'
                : 'AVAILABLE',
            ),
          );
          const markerPosition = Object.freeze({
            x: entity.position.x,
            y: entity.position.y - 0.5,
          });
          if (
            setWorldAnchor(
              marker,
              markerPosition,
              camera,
              16,
              16,
            )
          ) {
            layer.append(marker);
          }
        }
      }
    }

    for (const structure of bundle.buildings.exportSnapshot().foothold.structures) {
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
      renderSprite(
        deathCacheSprite('ACTIVE'),
        cache.position,
        camera,
        'death-cache',
        cache.entityId,
      );
    }
    for (const drop of snapshot.drops) {
      if (!drop.available) continue;
      renderSprite(
        PHASE1_PRODUCTION_WORLD_SPRITES.worldDrop,
        drop.position,
        camera,
        'world-drop',
        drop.worldDropId,
      );
    }

    const player = document.createElement('div');
    player.className = 'p1-product-sprite p1-product-player';
    player.dataset.worldRole = 'player';
    player.dataset.worldId = playerId;
    applyProductionSprite(
      player,
      PHASE1_PRODUCTION_WORLD_SPRITES.player,
    );
    player.style.left =
      String(HALF_WIDTH - PHASE1_PRODUCTION_WORLD_SPRITES.player.cellWidth / 2)
      + 'px';
    player.style.top =
      String(HALF_HEIGHT - PHASE1_PRODUCTION_WORLD_SPRITES.player.cellHeight)
      + 'px';
    layer.append(player);

    if (environment.coldRainStatus === 'active') {
      const weather = document.createElement('div');
      weather.className = 'p1-product-weather';
      weather.dataset.weatherEffect = 'cold-rain';
      const rain = coldRainSprite('RAIN_STREAK', 0);
      weather.style.backgroundImage = 'url("' + rain.url + '")';
      weather.style.backgroundSize =
        String(rain.sourceWidth) + 'px ' + String(rain.sourceHeight) + 'px';
      weather.style.imageRendering = 'pixelated';
      layer.append(weather);
    }

    canvas.dataset.playerX = camera.x.toFixed(6);
    canvas.dataset.playerY = camera.y.toFixed(6);
    canvas.dataset.authorityTick = String(bundle.authorityTick);
    canvas.dataset.weatherState = environment.coldRainStatus;
  };

  targetWindow.addEventListener('resize', applyScale);
  applyScale();
  render();

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
