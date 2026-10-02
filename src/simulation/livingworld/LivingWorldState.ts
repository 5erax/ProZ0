import {
  cropDefinition,
  speciesDefinition,
  forageDefinition,
} from '../../content/livingworld/LivingWorldContent';
export interface LivingPlot {
  id: string;
  owner: string;
  x: number;
  y: number;
  crop: string | null;
  progress: number;
  moisture: number;
  dryTicks: number;
  dead: boolean;
  fertility: number;
}
export interface LivingAnimal {
  id: string;
  species: string;
  x: number;
  y: number;
  age: number;
  health: number;
  sex: 0 | 1;
  energy: number;
  thirst: number;
  breedTick: number;
  product: number;
  productTicks: number;
  pen: string | null;
  owner: string | null;
  anchorX: number;
  anchorY: number;
  attackTick: number;
  shearTick: number;
}
export interface LivingForage {
  id: string;
  kind: string;
  x: number;
  y: number;
  readyTick: number;
  cleared: boolean;
  /** Additive v1 plant growth. Absent fields retain a saved legacy readyTick. */
  growth?: { version: 1; progress: number; moisture: number; dryTicks: number; cut: boolean };
  lineage?: string;
}
export interface LivingStation {
  id: string;
  water: number;
  fireUntil: number;
}
export interface LivingWorldState {
  version: 1;
  revision: number;
  lastTick: number;
  serial: number;
  regions: string[];
  spawned: string[];
  plots: LivingPlot[];
  animals: LivingAnimal[];
  forage: LivingForage[];
  stations: LivingStation[];
  receipts: { id: string; signature: string; message: string }[];
}
export const emptyLivingWorld = (tick = 0): LivingWorldState => ({
  version: 1,
  revision: 0,
  lastTick: tick,
  serial: 0,
  regions: [],
  spawned: [],
  plots: [],
  animals: [],
  forage: [],
  stations: [],
  receipts: [],
});
export function validateLivingWorld(value: unknown): LivingWorldState {
  const s = value as LivingWorldState,
    n = (v: unknown): v is number =>
      Number.isSafeInteger(v) && (v as number) >= 0,
    point = (v: { x: number; y: number }) =>
      Number.isFinite(v.x) &&
      Number.isFinite(v.y) &&
      Math.abs(v.x) <= 1e7 &&
      Math.abs(v.y) <= 1e7;
  if (
    !s ||
    s.version !== 1 ||
    ![s.revision, s.lastTick, s.serial].every(n) ||
    !Array.isArray(s.regions) ||
    s.regions.length > 128 ||
    !Array.isArray(s.spawned) ||
    s.spawned.length > 640 ||
    new Set(s.spawned).size !== s.spawned.length ||
    s.spawned.some((id) => !/^wild:-?\d+:-?\d+:[0-4]$/.test(id)) ||
    new Set(s.regions).size !== s.regions.length ||
    s.regions.some((r) => !/^[-]?\d+:[-]?\d+$/.test(r)) ||
    !Array.isArray(s.plots) ||
    s.plots.length > 256 ||
    !Array.isArray(s.animals) ||
    s.animals.length > 96 ||
    !Array.isArray(s.forage) ||
    s.forage.length > 896 ||
    !Array.isArray(s.stations) ||
    s.stations.length > 64 ||
    !Array.isArray(s.receipts) ||
    s.receipts.length > 96
  )
    throw Error('Invalid living world');
  const ids = new Set<string>();
  for (const e of [...s.plots, ...s.animals, ...s.forage, ...s.stations]) {
    if (
      !e ||
      typeof e.id !== 'string' ||
      !e.id ||
      e.id.length > 180 ||
      ids.has(e.id)
    )
      throw Error('Invalid living identity');
    ids.add(e.id);
  }
  for (const p of s.plots)
    if (
      !point(p) ||
      !p.owner ||
      ![p.progress, p.moisture, p.dryTicks, p.fertility].every(n) ||
      p.moisture > 10000 ||
      p.fertility > 3 ||
      p.progress > 100000 ||
      typeof p.dead !== 'boolean' ||
      (p.crop !== null && !cropDefinition(p.crop))
    )
      throw Error('Invalid plot');
  for (const a of s.animals) {
    const d = speciesDefinition(a.species);
    if (
      !d ||
      !point(a) ||
      !Number.isFinite(a.anchorX) ||
      !Number.isFinite(a.anchorY) ||
      Math.abs(a.anchorX) > 1e7 ||
      Math.abs(a.anchorY) > 1e7 ||
      ![
        a.age,
        a.health,
        a.energy,
        a.thirst,
        a.breedTick,
        a.product,
        a.productTicks,
        a.attackTick,
        a.shearTick,
      ].every(n) ||
      a.health > d.health ||
      a.energy > 10000 ||
      a.thirst > 10000 ||
      a.product > 8 ||
      a.productTicks > 36000 ||
      ![0, 1].includes(a.sex) ||
      !(
        (a.pen === null && a.owner === null) ||
        (typeof a.pen === 'string' &&
          a.pen.length > 0 &&
          typeof a.owner === 'string' &&
          a.owner.length > 0)
      )
    )
      throw Error('Invalid animal');
  }
  for (const f of s.forage)
    if (
      !point(f) ||
      !forageDefinition(f.kind) ||
      !n(f.readyTick) ||
      typeof f.cleared !== 'boolean' ||
      (f.lineage !== undefined && (typeof f.lineage !== 'string' || !f.lineage || f.lineage.length > 180 || !f.growth)) ||
      (f.growth !== undefined && (
        !f.growth || f.growth.version !== 1 ||
        !(f.kind.startsWith('wild-') || f.kind === 'berry-bush') ||
        ![f.growth.progress, f.growth.moisture, f.growth.dryTicks].every(n) ||
        f.growth.progress > forageDefinition(f.kind)!.renewalTicks ||
        f.growth.moisture > 10000 || typeof f.growth.cut !== 'boolean'
      ))
    )
      throw Error('Invalid forage');
  for (const f of s.stations)
    if (!n(f.water) || f.water > 24 || !n(f.fireUntil))
      throw Error('Invalid station');
  const receipts = new Set<string>();
  for (const r of s.receipts)
    if (
      !r ||
      !r.id ||
      r.id.length > 120 ||
      receipts.has(r.id) ||
      typeof r.signature !== 'string' ||
      r.signature.length > 2048 ||
      typeof r.message !== 'string'
    )
      throw Error('Invalid living receipt');
    else receipts.add(r.id);
  return structuredClone(s);
}
