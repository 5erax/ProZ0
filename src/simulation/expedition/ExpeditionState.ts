import {
  expeditionFacility,
  type ExpeditionFacilityId,
} from '../../content/singleplayer/ExpeditionContent';
export interface ExpeditionPlan {
  readonly id: string;
  readonly owner: string;
  readonly definitionId: ExpeditionFacilityId;
  readonly x: number;
  readonly y: number;
  readonly orientation: 0 | 1 | 2 | 3;
  readonly paid: Readonly<Record<string, number>>;
}
export interface ExpeditionFacility {
  readonly id: string;
  readonly owner: string;
  readonly definitionId: ExpeditionFacilityId;
  readonly x: number;
  readonly y: number;
  readonly orientation: 0 | 1 | 2 | 3;
  readonly canonicalStructureId: string | null;
  readonly water: number;
  readonly progress: number;
}
export interface ExpeditionEvent {
  readonly tick: number;
  readonly region: string;
  readonly kind:
    | 'growth-flush'
    | 'dry-spell'
    | 'mineral-bloom'
    | 'wildlife-drift';
  readonly untilTick: number;
}
export interface ExpeditionState {
  readonly version: 1;
  readonly revision: number;
  readonly plans: readonly ExpeditionPlan[];
  readonly facilities: readonly ExpeditionFacility[];
  readonly supplyClaimed: readonly string[];
  readonly restCooldown: Readonly<Record<string, number>>;
  readonly nextEventTick: number;
  readonly events: readonly ExpeditionEvent[];
  readonly receipts: readonly {
    readonly id: string;
    readonly signature: string;
    readonly result: string;
  }[];
}
export const emptyExpeditionState = (): ExpeditionState => ({
  version: 1,
  revision: 0,
  plans: [],
  facilities: [],
  supplyClaimed: [],
  restCooldown: {},
  nextEventTick: 7200,
  events: [],
  receipts: [],
});
export function validateExpeditionState(value: unknown): ExpeditionState {
  const s = value as ExpeditionState;
  const natural = (v: unknown): v is number =>
    Number.isSafeInteger(v) && (v as number) >= 0;
  if (
    !s ||
    s.version !== 1 ||
    !natural(s.revision) ||
    !Array.isArray(s.plans) ||
    s.plans.length > 32 ||
    !Array.isArray(s.facilities) ||
    s.facilities.length > 64 ||
    !Array.isArray(s.supplyClaimed) ||
    s.supplyClaimed.length > 8 ||
    new Set(s.supplyClaimed).size !== s.supplyClaimed.length ||
    s.supplyClaimed.some((p) => typeof p !== 'string' || !p) ||
    !s.restCooldown ||
    typeof s.restCooldown !== 'object' ||
    Array.isArray(s.restCooldown) ||
    Object.keys(s.restCooldown).length > 8 ||
    Object.entries(s.restCooldown).some(([p, t]) => !p || !natural(t)) ||
    !natural(s.nextEventTick) ||
    !Array.isArray(s.events) ||
    s.events.length > 32 ||
    !Array.isArray(s.receipts) ||
    s.receipts.length > 96
  )
    throw Error('Invalid expedition state');
  const ids = new Set<string>();
  for (const item of [...s.plans, ...s.facilities]) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      !item.id ||
      item.id.length > 180 ||
      ids.has(item.id) ||
      typeof item.owner !== 'string' ||
      !item.owner ||
      !expeditionFacility(item.definitionId) ||
      !Number.isFinite(item.x) ||
      !Number.isFinite(item.y) ||
      Math.abs(item.x) > 1e7 ||
      Math.abs(item.y) > 1e7 ||
      ![0, 1, 2, 3].includes(item.orientation)
    )
      throw Error('Invalid expedition identity/position');
    ids.add(item.id);
  }
  for (const p of s.plans) {
    const def = expeditionFacility(p.definitionId)!;
    if (
      !p.paid ||
      typeof p.paid !== 'object' ||
      Array.isArray(p.paid) ||
      Object.entries(p.paid).some(
        ([id, q]) =>
          !natural(q) ||
          !def.costs.some(([item, max]) => item === id && q <= max),
      )
    )
      throw Error('Invalid construction escrow');
  }
  for (const f of s.facilities) {
    const def = expeditionFacility(f.definitionId)!;
    if (
      !natural(f.water) ||
      f.water > 4 ||
      !natural(f.progress) ||
      f.progress >= 3600 ||
      (def.canonical === null
        ? f.canonicalStructureId !== null
        : typeof f.canonicalStructureId !== 'string' || !f.canonicalStructureId)
    )
      throw Error('Invalid expedition facility');
  }
  for (const e of s.events)
    if (
      !e ||
      !natural(e.tick) ||
      !natural(e.untilTick) ||
      e.untilTick <= e.tick ||
      typeof e.region !== 'string' ||
      !/^-?\d+:-?\d+$/.test(e.region) ||
      ![
        'growth-flush',
        'dry-spell',
        'mineral-bloom',
        'wildlife-drift',
      ].includes(e.kind)
    )
      throw Error('Invalid expedition event');
  if (
    new Set(s.receipts.map((r) => r.id)).size !== s.receipts.length ||
    s.receipts.some(
      (r) =>
        !r ||
        typeof r.id !== 'string' ||
        !r.id ||
        typeof r.signature !== 'string' ||
        !r.signature ||
        typeof r.result !== 'string' ||
        !r.result,
    )
  )
    throw Error('Invalid expedition receipt');
  const freeze = (object: unknown): void => {
    if (object && typeof object === 'object') {
      for (const child of Object.values(object)) freeze(child);
      Object.freeze(object);
    }
  };
  const copy = structuredClone(s);
  freeze(copy);
  return copy;
}
