import { Application, Graphics } from 'pixi.js';
import type { SimulationSnapshot } from '../../simulation';

export interface PixiPresentationAdapter {
  readonly canvas: HTMLCanvasElement;
  render(snapshot: Readonly<SimulationSnapshot>, alpha: number): void;
  destroy(): void;
}

class PixiPresentationAdapterImpl implements PixiPresentationAdapter {
  public readonly canvas: HTMLCanvasElement;

  private constructor(
    private readonly app: Application,
    canvas: HTMLCanvasElement,
  ) {
    this.canvas = canvas;
  }

  public static async create(root: HTMLElement): Promise<PixiPresentationAdapterImpl> {
    const app = new Application();

    await app.init({
      width: 640,
      height: 360,
      autoStart: false,
      antialias: false,
      backgroundColor: 0x0d1321,
      preference: 'webgl',
      resolution: 1,
    });

    app.canvas.id = 'proz0-canvas';
    app.canvas.dataset.renderer = 'pixi-webgl';
    app.canvas.style.width = 'min(100vw, 1280px)';
    app.canvas.style.height = 'auto';
    app.canvas.style.aspectRatio = '16 / 9';
    app.canvas.style.imageRendering = 'pixelated';

    const background = new Graphics()
      .rect(0, 0, 640, 360)
      .fill(0x0d1321);

    const bootstrapMarker = new Graphics()
      .rect(-8, -8, 16, 16)
      .fill(0x5eead4);

    bootstrapMarker.position.set(320, 180);
    app.stage.addChild(background, bootstrapMarker);
    root.replaceChildren(app.canvas);
    app.renderer.render(app.stage);

    return new PixiPresentationAdapterImpl(app, app.canvas);
  }

  public render(snapshot: Readonly<SimulationSnapshot>, alpha: number): void {
    this.canvas.dataset.tick = String(Number(snapshot.tick));
    this.canvas.dataset.interpolationAlpha = alpha.toFixed(4);
    this.app.renderer.render(this.app.stage);
  }

  public destroy(): void {
    this.app.destroy(true, true);
  }
}

export async function createPixiPresentationAdapter(
  root: HTMLElement,
): Promise<PixiPresentationAdapter> {
  return PixiPresentationAdapterImpl.create(root);
}
