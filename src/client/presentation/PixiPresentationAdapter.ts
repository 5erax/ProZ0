import { Application, Graphics } from 'pixi.js';
import { WORLD_PIXELS_PER_UNIT } from '../../foundation';
import type { FacingDirection, SimulationSnapshot } from '../../simulation';
import type { StaticSolidAabb } from '../../world';
import { CameraPresenter } from './CameraPresenter';
import {
  DEFAULT_PLAYER_PRESENTATION_FRAME,
  projectPlayerPresentation,
  validatePlayerPresentationFrame,
  type PlayerPresentationFrame,
} from './PlayerPresentation';

const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;
const DARK_GROUND = 0x172033;
const LIGHT_GROUND = 0xc8d0c2;

export type GroundTone = 'dark' | 'light';

export interface TallDepthVisual {
  readonly id: string;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly widthPx: number;
  readonly heightPx: number;
}

export interface PixiPresentationOptions {
  readonly solids: readonly StaticSolidAabb[];
  readonly playerFrame?: PlayerPresentationFrame;
  readonly groundTone?: GroundTone;
  readonly displayScale?: number;
  readonly tallDepthVisual?: TallDepthVisual;
}

export interface PixiPresentationAdapter {
  readonly canvas: HTMLCanvasElement;
  render(snapshot: Readonly<SimulationSnapshot>, alpha: number): void;
  destroy(): void;
}

interface ObstacleVisual {
  readonly solid: StaticSolidAabb;
  readonly graphics: Graphics;
  readonly anchorX: number;
  readonly anchorY: number;
}

interface TallDepthVisualRuntime {
  readonly config: TallDepthVisual;
  readonly graphics: Graphics;
}

function facingOffset(facing: FacingDirection | null): { x: number; y: number } {
  switch (facing) {
    case 'N': return { x: 0, y: -1 };
    case 'NE': return { x: 1, y: -1 };
    case 'E': return { x: 1, y: 0 };
    case 'SE': return { x: 1, y: 1 };
    case 'S': return { x: 0, y: 1 };
    case 'SW': return { x: -1, y: 1 };
    case 'W': return { x: -1, y: 0 };
    case 'NW': return { x: -1, y: -1 };
    case null: return { x: 0, y: 0 };
  }
}

function validateDisplayScale(scale: number | undefined): void {
  if (
    scale !== undefined
    && (!Number.isInteger(scale) || scale < 1)
  ) {
    throw new Error('Display scale must be a positive integer.');
  }
}

function validateTallDepthVisual(
  visual: TallDepthVisual | undefined,
): void {
  if (visual === undefined) {
    return;
  }

  if (
    visual.id.length === 0
    || !Number.isFinite(visual.anchorX)
    || !Number.isFinite(visual.anchorY)
    || !Number.isFinite(visual.widthPx)
    || !Number.isFinite(visual.heightPx)
    || visual.widthPx <= 0
    || visual.heightPx <= 0
  ) {
    throw new Error('Tall depth visual must define valid finite bounds and anchor.');
  }
}

class PixiPresentationAdapterImpl implements PixiPresentationAdapter {
  public readonly canvas: HTMLCanvasElement;

  private readonly camera = new CameraPresenter();
  private lastRenderTimeMs: number | null = null;

  private constructor(
    private readonly app: Application,
    canvas: HTMLCanvasElement,
    private readonly player: Graphics,
    private readonly facingMarker: Graphics,
    private readonly obstacles: readonly ObstacleVisual[],
    private readonly playerFrame: PlayerPresentationFrame,
    private readonly groundTone: GroundTone,
    private readonly requestedDisplayScale: number | undefined,
    private readonly tallDepthVisual: TallDepthVisualRuntime | null,
    private readonly targetWindow: Window,
  ) {
    this.canvas = canvas;
    this.targetWindow.addEventListener('resize', this.applyIntegerScale);
  }

  public static async create(
    root: HTMLElement,
    options: PixiPresentationOptions,
  ): Promise<PixiPresentationAdapterImpl> {
    const playerFrame = options.playerFrame ?? DEFAULT_PLAYER_PRESENTATION_FRAME;
    const groundTone = options.groundTone ?? 'dark';

    validatePlayerPresentationFrame(playerFrame);
    validateDisplayScale(options.displayScale);
    validateTallDepthVisual(options.tallDepthVisual);

    const app = new Application();

    await app.init({
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
      autoStart: false,
      antialias: false,
      backgroundColor: groundTone === 'light' ? LIGHT_GROUND : DARK_GROUND,
      preference: 'webgl',
      resolution: 1,
    });

    app.canvas.id = 'proz0-canvas';
    app.canvas.dataset.renderer = 'pixi-webgl';
    app.canvas.dataset.groundTone = groundTone;
    app.canvas.dataset.internalRaster = `${INTERNAL_WIDTH}x${INTERNAL_HEIGHT}`;
    app.canvas.style.imageRendering = 'pixelated';

    app.stage.sortableChildren = true;

    const background = new Graphics()
      .rect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)
      .fill(groundTone === 'light' ? LIGHT_GROUND : DARK_GROUND);
    background.zIndex = -1_000_000;
    app.stage.addChild(background);

    const obstacles = options.solids.map((solid) => {
      const widthPx = (solid.maxX - solid.minX) * WORLD_PIXELS_PER_UNIT;
      const depthPx = (solid.maxY - solid.minY) * WORLD_PIXELS_PER_UNIT;
      const visibleHeightPx = Math.max(depthPx, 32);
      const graphics = new Graphics()
        .rect(-widthPx / 2, -visibleHeightPx, widthPx, visibleHeightPx)
        .fill(0x8c5f3d);

      const anchorX = (solid.minX + solid.maxX) / 2;
      const anchorY = solid.maxY;
      graphics.zIndex = anchorY * 1000;
      app.stage.addChild(graphics);

      return Object.freeze({ solid, graphics, anchorX, anchorY });
    });

    const tallDepthVisual = options.tallDepthVisual === undefined
      ? null
      : (() => {
        const config = options.tallDepthVisual;
        const graphics = new Graphics()
          .rect(
            -config.widthPx / 2,
            -config.heightPx,
            config.widthPx,
            config.heightPx,
          )
          .fill(0x50613f)
          .rect(-config.widthPx / 2, -8, config.widthPx, 8)
          .fill(0x293321);

        graphics.zIndex = config.anchorY * 1000;
        app.stage.addChild(graphics);

        return Object.freeze({ config, graphics });
      })();

    const player = new Graphics()
      .rect(
        -playerFrame.bodyWidthPx / 2 - 1,
        -playerFrame.bodyHeightPx - 1,
        playerFrame.bodyWidthPx + 2,
        playerFrame.bodyHeightPx + 2,
      )
      .fill(0x152033)
      .rect(
        -playerFrame.bodyWidthPx / 2,
        -playerFrame.bodyHeightPx,
        playerFrame.bodyWidthPx,
        playerFrame.bodyHeightPx,
      )
      .fill(0xe6f2ff);
    player.zIndex = 0;
    app.stage.addChild(player);

    const facingMarker = new Graphics()
      .rect(-2, -2, 4, 4)
      .fill(0xffc857);
    facingMarker.zIndex = 1;
    app.stage.addChild(facingMarker);

    root.replaceChildren(app.canvas);

    const targetWindow = root.ownerDocument.defaultView ?? window;
    const adapter = new PixiPresentationAdapterImpl(
      app,
      app.canvas,
      player,
      facingMarker,
      obstacles,
      playerFrame,
      groundTone,
      options.displayScale,
      tallDepthVisual,
      targetWindow,
    );

    app.canvas.dataset.playerFrame = `${playerFrame.widthPx}x${playerFrame.heightPx}`;
    adapter.applyIntegerScale();
    app.renderer.render(app.stage);

    return adapter;
  }

  public render(snapshot: Readonly<SimulationSnapshot>, alpha: number): void {
    const now = performance.now();
    const deltaSeconds = this.lastRenderTimeMs === null
      ? 0
      : Math.min(Math.max(0, now - this.lastRenderTimeMs) / 1000, 0.05);
    this.lastRenderTimeMs = now;

    this.camera.update(snapshot.player.position, deltaSeconds);
    const camera = this.camera.getPosition();
    const playerProjection = projectPlayerPresentation(
      snapshot.player,
      camera,
      this.playerFrame,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
    );

    this.player.position.set(
      playerProjection.anchorX,
      playerProjection.anchorY,
    );
    this.player.zIndex = playerProjection.zIndex;

    const facing = facingOffset(snapshot.player.facing);
    this.facingMarker.position.set(
      this.player.position.x + facing.x * 14,
      this.player.position.y + facing.y * 14 - 8,
    );
    this.facingMarker.zIndex = this.player.zIndex + 1;

    for (const obstacle of this.obstacles) {
      const rasterX = Math.round(obstacle.anchorX * WORLD_PIXELS_PER_UNIT);
      const rasterY = Math.round(obstacle.anchorY * WORLD_PIXELS_PER_UNIT);

      obstacle.graphics.position.set(
        rasterX - camera.rasterX + INTERNAL_WIDTH / 2,
        rasterY - camera.rasterY + INTERNAL_HEIGHT / 2,
      );
      obstacle.graphics.zIndex = obstacle.anchorY * 1000;
    }

    if (this.tallDepthVisual !== null) {
      const { config, graphics } = this.tallDepthVisual;
      const rasterX = Math.round(config.anchorX * WORLD_PIXELS_PER_UNIT);
      const rasterY = Math.round(config.anchorY * WORLD_PIXELS_PER_UNIT);

      graphics.position.set(
        rasterX - camera.rasterX + INTERNAL_WIDTH / 2,
        rasterY - camera.rasterY + INTERNAL_HEIGHT / 2,
      );
      graphics.zIndex = config.anchorY * 1000;

      this.canvas.dataset.depthRelation =
        snapshot.player.position.y < config.anchorY
          ? 'behind'
          : snapshot.player.position.y > config.anchorY
            ? 'front'
            : 'equal';
      this.canvas.dataset.depthObject = config.id;
    } else {
      delete this.canvas.dataset.depthRelation;
      delete this.canvas.dataset.depthObject;
    }

    this.canvas.dataset.tick = String(Number(snapshot.tick));
    this.canvas.dataset.interpolationAlpha = alpha.toFixed(4);
    this.canvas.dataset.playerX = snapshot.player.position.x.toFixed(6);
    this.canvas.dataset.playerY = snapshot.player.position.y.toFixed(6);
    this.canvas.dataset.playerState = snapshot.player.locomotionState;
    this.canvas.dataset.playerFacing = snapshot.player.facing ?? 'NONE';
    this.canvas.dataset.blockedX = String(snapshot.player.collision.blockedX);
    this.canvas.dataset.blockedY = String(snapshot.player.collision.blockedY);
    this.canvas.dataset.cameraX = camera.x.toFixed(6);
    this.canvas.dataset.cameraY = camera.y.toFixed(6);
    this.canvas.dataset.cameraRasterX = String(camera.rasterX);
    this.canvas.dataset.cameraRasterY = String(camera.rasterY);

    this.app.renderer.render(this.app.stage);
  }

  public destroy(): void {
    this.targetWindow.removeEventListener('resize', this.applyIntegerScale);
    this.app.destroy(true, true);
  }

  private readonly applyIntegerScale = (): void => {
    const fittedScale = Math.max(
      1,
      Math.floor(Math.min(
        this.targetWindow.innerWidth / INTERNAL_WIDTH,
        this.targetWindow.innerHeight / INTERNAL_HEIGHT,
      )),
    );
    const scale = this.requestedDisplayScale ?? fittedScale;

    this.canvas.style.width = `${INTERNAL_WIDTH * scale}px`;
    this.canvas.style.height = `${INTERNAL_HEIGHT * scale}px`;
    this.canvas.dataset.displayScale = String(scale);
    this.canvas.dataset.groundTone = this.groundTone;
  };
}

export async function createPixiPresentationAdapter(
  root: HTMLElement,
  options: PixiPresentationOptions,
): Promise<PixiPresentationAdapter> {
  return PixiPresentationAdapterImpl.create(root, options);
}
