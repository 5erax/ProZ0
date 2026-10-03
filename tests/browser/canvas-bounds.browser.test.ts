import { expect, it } from 'vitest';
import { createCanvasBounds } from '../../src/client/presentation/CanvasBounds';
it('cached placement geometry follows actual canvas resize and viewport events', async () => {
  const root = document.createElement('div'), canvas = document.createElement('canvas');
  root.style.cssText = 'position:relative;width:400px;height:240px'; canvas.style.cssText = 'width:320px;height:180px'; root.append(canvas); document.body.append(root);
  const bounds = createCanvasBounds(root, canvas), settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  try {
    await settle(); const initial = bounds.read(); expect(initial.canvas.width).toBe(320);
    expect(bounds.read()).toBe(initial);
    canvas.style.width = '380px'; await settle();
    expect(bounds.read().canvas.width).toBe(380); expect(bounds.read()).not.toBe(initial);
    const resized = bounds.read(); window.dispatchEvent(new Event('resize')); expect(bounds.read()).not.toBe(resized);
  } finally { bounds.destroy(); root.remove(); }
});
