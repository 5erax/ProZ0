import {
  createPhase1HudOverlay,
  createViewportPresentationGuard,
} from '../presentation';
import type { Phase1PresentationSource } from './Phase1PresentationBinding';

export interface Phase1PresentationMount {
  destroy(): void;
}

export function mountPhase1Presentation(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  source: Phase1PresentationSource,
): Phase1PresentationMount {
  if (!root.contains(canvas)) {
    throw new Error(
      'Phase 1 presentation canvas must belong to the canonical runtime root.',
    );
  }

  const viewportGuard = createViewportPresentationGuard(root, canvas);
  const hud = createPhase1HudOverlay(root, canvas, source.read());
  const unsubscribe = source.subscribe((state) => {
    hud.update(state);
  });

  return {
    destroy(): void {
      unsubscribe();
      hud.destroy();
      viewportGuard.destroy();
    },
  };
}
