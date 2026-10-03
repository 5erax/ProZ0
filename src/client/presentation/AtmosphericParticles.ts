export type AtmosphericKind = 'rain' | 'dry-wind';
const wrap = (n: number, size: number) => ((n % size) + size) % size;
/** Pixel particles travel continuously; the camera contributes depth-dependent parallax. */
export function atmosphericParticleAt(kind: AtmosphericKind, index: number, seconds: number, camera: { x: number; y: number }, reduced = false) {
  const hash = Math.imul(index + 11, 2654435761) >>> 0, near = index % 3 === 0, depth = near ? .85 : .35;
  const t = seconds * (reduced ? .2 : 1), speed = kind === 'rain' ? (near ? 115 : 72) : (near ? 48 : 28);
  const gust = kind === 'dry-wind' ? Math.sin(t * .8 + index * .3) * 12 : 0;
  return { x: Math.floor(wrap(hash % 680 + t * (kind === 'rain' ? 19 : speed) - camera.x * depth, 680) - 20), y: Math.floor(wrap((hash >>> 9) % 400 + (kind === 'rain' ? t * speed : gust) - camera.y * depth, 400) - 20), length: kind === 'rain' ? (near ? 9 : 5) : (near ? 3 : 1), alpha: near ? .38 : .19, near };
}
export function createAtmosphericParticles(document: Document) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  canvas.style.cssText = 'position:absolute;inset:0;width:640px;height:360px;pointer-events:none;image-rendering:pixelated';
  const context = canvas.getContext('2d');
  let previousFrame = -1;
  return { canvas, render(kind: AtmosphericKind, seconds: number, camera: { x: number; y: number }, reduced: boolean) {
    // Cap painter at 30 Hz. No textures, allocations of DOM nodes, or self-owned RAF.
    const frame = Math.floor(seconds * 30); if (!context || frame === previousFrame) return;
    previousFrame = frame; context.clearRect(0, 0, 640, 360);
    const count = reduced ? 24 : kind === 'rain' ? 96 : 32;
    for (let i = 0; i < count; i++) {
      const p = atmosphericParticleAt(kind, i, seconds, camera, reduced);
      context.globalAlpha = reduced ? p.alpha * .6 : p.alpha;
      context.fillStyle = kind === 'rain' ? p.near ? '#a9d3d5' : '#6f9ca6' : p.near ? '#d1b28a' : '#a98d70';
      if (kind === 'rain') { context.fillRect(p.x, p.y, 1, p.length); context.fillRect(p.x - 1, p.y - 2, 1, 3); }
      else { context.fillRect(p.x, p.y, p.length, 1); if (p.near) context.fillRect(p.x - 2, p.y + 2, 1, 1); }
    }
    context.globalAlpha = 1;
    canvas.dataset.particlePhase = String(frame); canvas.dataset.particleCount = String(count);
  } };
}
