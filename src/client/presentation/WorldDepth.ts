import type { WorldPosition } from '../../foundation';
/** Shared foot order. One camera variable shifts every object together, including static flora. */
export function worldDepthOrder(position: WorldPosition, layer = 0): string {
  return 'calc(100000 + ' + (Math.round((position.x + position.y) * 1000) + layer) + ' - var(--world-camera-depth, 0))';
}
