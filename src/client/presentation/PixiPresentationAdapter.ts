import { Application, Graphics } from 'pixi.js';
import { WORLD_PIXELS_PER_UNIT } from '../../foundation';
import type { FacingDirection, SimulationSnapshot } from '../../simulation';
import type { StaticSolidAabb } from '../../world';
import { CameraPresenter } from './CameraPresenter';

const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;
const PLAYER_FRAME_WIDTH_PX = 32;
const PLAYER_FRAME_HEIGHT_PX = 48;

export interface PixiPresentationOptions {
  readonly solids: readonly StaticSolidAabb[];
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
    private readonly targetWindow: Window,
  ) {
    this.canvas = canvas;
    this.targetWindow.addEventListener('resize', this.applyIntegerScale);
  }

  public static async create(
    root: HTMLElement,
    options: PixiPresentationOptions,
  ): Promise<PixiPresentationAdapterImpl> {
    const app = new Application();

    await app.init({
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
      autoStart: false,
      antialias: false,
      backgroundColor: 0x0d1321,
      preference: 'webgl',
      resolution: 1,
    });

    app.canvas.id = 'proz0-canvas';
    app.canvas.dataset.renderer = 'pixi-webgl';
    app.canvas.style.imageRendering = 'pixelated';

    app.stage.sortableChildren = true;

    const background = new Graphics()
      .rect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)
      .fill(0x172033);
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

    const player = new Graphics()
      .rect(-12, -44, 24, 44)
      .fill(0xe6f2ff);
    player.zIndex = 0;
    app.stage.addChild(player);

    const facingMarker = new Graphics()
      .rect(-2, -2, 4, 4)
      .fill(0x61d6a8);
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
      targetWindow,
    );

    app.canvas.dataset.playerFrame = `${PLAYER_FRAME_WIDTH_PX}x${PLAYER_FRAME_HEIGHT_PX}`;
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

    const playerRasterX = Math.round(
      snapshot.player.position.x * WORLD_PIXELS_PER_UNIT,
    );
    const playerRasterY = Math.round(
      snapshot.player.position.y * WORLD_PIXELS_PER_UNIT,
    );

    this.player.position.set(
      playerRasterX - camera.rasterX + INTERNAL_WIDTH / 2,
      playerRasterY - camera.rasterY + INTERNAL_HEIGHT / 2,
    );
    this.player.zIndex = snapshot.player.position.y * 1000;

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
    const scale = Math.max(
      1,
      Math.floor(Math.min(
        this.targetWindow.innerWidth / INTERNAL_WIDTH,
        this.targetWindow.innerHeight / INTERNAL_HEIGHT,
      )),
    );

    this.canvas.style.width = `${INTERNAL_WIDTH * scale}px`;
    this.canvas.style.height = `${INTERNAL_HEIGHT * scale}px`;
  };
}

export async function createPixiPresentationAdapter(
  root: HTMLElement,
  options: PixiPresentationOptions,
): Promise<PixiPresentationAdapter> {
  return PixiPresentationAdapterImpl.create(root, options);
}
