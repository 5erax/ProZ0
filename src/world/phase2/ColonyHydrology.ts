import { DeterministicRng, deriveSeedState, type WorldPosition } from '../../foundation';

export interface ColonyWaterSample {
  readonly kind: 'river' | 'tributary';
  readonly salinity: 'fresh';
  readonly depthMeters: number;
  readonly flow: WorldPosition;
  readonly crossing: boolean;
  readonly shoreDistance: number;
}
interface RiverParameters {
  readonly quadrant: number;
  readonly offset: number;
  readonly phase: number;
  readonly phase2: number;
  readonly width: number;
}
const parameters = new Map<string, RiverParameters>();
function riverParameters(seed: string): RiverParameters {
  if (!seed.length) throw new RangeError('Hydrology requires a world seed.');
  const cached = parameters.get(seed); if (cached) return cached;
  const rng = new DeterministicRng(deriveSeedState({ worldSeed: seed, namespace: 'colony-hydrology:v1', stableIdentifiers: ['river-network'] }));
  const result = Object.freeze({ quadrant: rng.nextUint32() % 4, offset: (rng.nextUint32() % 2401) / 100 - 12, phase: (rng.nextUint32() % 6283) / 1000, phase2: (rng.nextUint32() % 6283) / 1000, width: 7 + (rng.nextUint32() % 301) / 100 });
  if (parameters.size >= 16) parameters.clear(); parameters.set(seed, result); return result;
}
function rotate(point: WorldPosition, quadrant: number): WorldPosition {
  switch (quadrant % 4) {
    case 1: return { x: -point.y, y: point.x };
    case 2: return { x: -point.x, y: -point.y };
    case 3: return { x: point.y, y: -point.x };
    default: return { x: point.x, y: point.y };
  }
}
function centerX(y: number, p: RiverParameters): number {
  return 164 + p.offset + 24 * Math.sin(y / 71 + p.phase) + 10 * Math.sin(y / 29 + p.phase2);
}
function slope(y: number, p: RiverParameters): number {
  return 24 / 71 * Math.cos(y / 71 + p.phase) + 10 / 29 * Math.cos(y / 29 + p.phase2);
}
/** Pure global-coordinate field. No per-chunk RNG, load-order state or clock-dependent terrain. */
export function colonyWaterAt(seed: string, position: WorldPosition): ColonyWaterSample | null {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new RangeError('Invalid hydrology position.');
  const p = riverParameters(seed), point = rotate(position, p.quadrant);
  const y = Math.max(-512, Math.min(512, point.y)), dx = point.x - centerX(y, p), dy = point.y - y;
  const distance = Math.hypot(dx / Math.hypot(1, slope(y, p)), dy);
  const crossing = [-128, 64, 256].some(at => Math.abs(y - at) < 5);
  const halfWidth = (p.width + 2 * Math.sin(y / 97 + p.phase2)) / 2;
  let sample: ColonyWaterSample | null = distance <= halfWidth ? {
    kind: 'river', salinity: 'fresh', depthMeters: crossing ? .25 : .3 + .4 * (1 - distance / halfWidth),
    flow: rotate({ x: slope(y, p), y: 1 }, 4 - p.quadrant), crossing, shoreDistance: halfWidth - distance,
  } : null;
  for (const [junction, start, direction] of [[-208, -384, 1], [224, 448, -1]] as const) {
    const end = centerX(junction, p), span = end - start, progress = (point.x - start) / span;
    if (progress < 0 || progress > 1) continue;
    const branchY = junction + 18 * Math.sin(Math.PI * progress) * Math.sin(progress * 4 + p.phase);
    const branchDistance = Math.abs(point.y - branchY), branchHalfWidth = 2.5 + progress;
    if (branchDistance > branchHalfWidth) continue;
    const candidate: ColonyWaterSample = { kind: 'tributary', salinity: 'fresh', depthMeters: .2 + .2 * (1 - branchDistance / branchHalfWidth), flow: rotate({ x: direction, y: 0 }, 4 - p.quadrant), crossing: false, shoreDistance: branchHalfWidth - branchDistance };
    if (!sample || candidate.depthMeters > sample.depthMeters) sample = candidate;
  }
  return sample ? Object.freeze({ ...sample, flow: Object.freeze(sample.flow) }) : null;
}
/** Generation uses the same 2 m cell centers as terrain, placement and the map. */
export function colonyRiverTerrainAt(seed: string, position: WorldPosition): 'ground' | 'water' {
  const cell = { x: Math.floor(position.x / 2) * 2 + 1, y: Math.floor(position.y / 2) * 2 + 1 };
  return colonyWaterAt(seed, cell) ? 'water' : 'ground';
}
export function colonyRiverLandmarks(seed: string): { readonly source: WorldPosition; readonly mouth: WorldPosition; readonly crossings: readonly WorldPosition[]; readonly confluences: readonly WorldPosition[] } {
  const p = riverParameters(seed), at = (y: number) => Object.freeze(rotate({ x: centerX(y, p), y }, 4 - p.quadrant));
  return Object.freeze({ source: at(-512), mouth: at(512), crossings: Object.freeze([-128, 64, 256].map(at)), confluences: Object.freeze([-208, 224].map(at)) });
}
