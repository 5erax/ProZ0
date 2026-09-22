export interface CameraPresentationPosition {
  readonly x: number;
  readonly y: number;
  readonly rasterX: number;
  readonly rasterY: number;
}

export class CameraPresenter {
  private x = 0;
  private y = 0;

  public setContinuousPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public getPosition(): CameraPresentationPosition {
    return Object.freeze({
      x: this.x,
      y: this.y,
      rasterX: Math.round(this.x),
      rasterY: Math.round(this.y),
    });
  }
}
