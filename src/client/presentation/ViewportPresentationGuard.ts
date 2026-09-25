const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;

export interface ViewportPresentationGuard {
  destroy(): void;
}

class ViewportPresentationGuardImpl implements ViewportPresentationGuard {
  private readonly warning: HTMLDivElement;
  private readonly targetWindow: Window;

  public constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.targetWindow = root.ownerDocument.defaultView ?? window;
    this.warning = root.ownerDocument.createElement('div');
    this.warning.id = 'proz0-viewport-warning';
    this.warning.textContent =
      'Viewport too small · ProZ0 requires at least 640×360 logical pixels.';
    this.warning.style.position = 'absolute';
    this.warning.style.left = '50%';
    this.warning.style.top = '50%';
    this.warning.style.transform = 'translate(-50%, -50%)';
    this.warning.style.maxWidth = '560px';
    this.warning.style.padding = '12px 16px';
    this.warning.style.border = '1px solid #f4f6ef';
    this.warning.style.background = '#10141b';
    this.warning.style.color = '#f4f6ef';
    this.warning.style.fontFamily = 'monospace';
    this.warning.style.fontSize = '14px';
    this.warning.style.textAlign = 'center';
    this.warning.style.zIndex = '50';
    this.warning.hidden = true;
    this.root.append(this.warning);

    this.targetWindow.addEventListener('resize', this.apply);
    this.apply();
  }

  public destroy(): void {
    this.targetWindow.removeEventListener('resize', this.apply);
    this.warning.remove();
    delete this.root.dataset.viewportTooSmall;
  }

  private readonly apply = (): void => {
    const tooSmall =
      this.targetWindow.innerWidth < INTERNAL_WIDTH
      || this.targetWindow.innerHeight < INTERNAL_HEIGHT;

    this.root.dataset.viewportTooSmall = String(tooSmall);
    this.canvas.style.visibility = tooSmall ? 'hidden' : 'visible';
    this.warning.hidden = !tooSmall;
  };
}

export function createViewportPresentationGuard(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
): ViewportPresentationGuard {
  return new ViewportPresentationGuardImpl(root, canvas);
}
