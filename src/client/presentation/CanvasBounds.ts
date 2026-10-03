/** Measure layout on viewport changes rather than after world DOM writes every frame. */
export function createCanvasBounds(root: HTMLElement, canvas: HTMLCanvasElement) {
  const targetWindow = root.ownerDocument.defaultView!;
  let cached: { readonly canvas: DOMRect; readonly root: DOMRect } | null = null;
  const invalidate = () => { cached = null; };
  const observer = new targetWindow.ResizeObserver(invalidate);
  observer.observe(root); observer.observe(canvas);
  targetWindow.addEventListener('resize', invalidate);
  targetWindow.addEventListener('scroll', invalidate, true);
  root.ownerDocument.addEventListener('fullscreenchange', invalidate);
  return {
    read() { return cached ??= { canvas: canvas.getBoundingClientRect(), root: root.getBoundingClientRect() }; },
    destroy() { observer.disconnect(); targetWindow.removeEventListener('resize', invalidate); targetWindow.removeEventListener('scroll', invalidate, true); root.ownerDocument.removeEventListener('fullscreenchange', invalidate); cached = null; },
  };
}
