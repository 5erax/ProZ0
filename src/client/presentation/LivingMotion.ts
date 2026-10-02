import type { WorldPosition } from '../../foundation';

/** Render-only smoothing. Never writes positions back into authority/save. */
export class LivingMotion {
  private samples = new Map<string, { from: WorldPosition; to: WorldPosition; started: number; duration: number; tick: number; anchor: string }>();
  position(id: string, to: WorldPosition, tick: number, now: number, anchor: string, moving: boolean): WorldPosition {
    const previous = this.samples.get(id);
    if (!previous || previous.anchor !== anchor || !moving || Math.hypot(to.x - previous.to.x, to.y - previous.to.y) > 2) {
      this.samples.set(id, { from: { ...to }, to: { ...to }, started: now, duration: 0, tick, anchor });
      return to;
    }
    if (previous.to.x !== to.x || previous.to.y !== to.y) {
      const current = this.interpolate(previous, now);
      const sample = { from: current, to: { ...to }, started: now, duration: Math.min(1000, Math.max(100, (tick - previous.tick) * 1000 / 60)), tick, anchor };
      this.samples.set(id, sample);
      return current;
    }
    return this.interpolate(previous, now);
  }
  private interpolate(sample: { from: WorldPosition; to: WorldPosition; started: number; duration: number }, now: number): WorldPosition {
    const alpha = sample.duration === 0 ? 1 : Math.max(0, Math.min(1, (now - sample.started) / sample.duration));
    return { x: sample.from.x + (sample.to.x - sample.from.x) * alpha, y: sample.from.y + (sample.to.y - sample.from.y) * alpha };
  }
  retain(ids: ReadonlySet<string>): void { for (const id of this.samples.keys()) if (!ids.has(id)) this.samples.delete(id); }
  clear(): void { this.samples.clear(); }
}
