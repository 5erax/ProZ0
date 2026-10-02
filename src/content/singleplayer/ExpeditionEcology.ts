export const EXPEDITION_RENEWAL: Readonly<Record<string, number>> =
  Object.freeze({
    'resource:fiber-plant': 0.2,
    'resource:food-plant': 0.2,
    'resource:timber-source': 0.2,
    'resource:stone-outcrop': 1 / 3,
    'resource:metal-ore-node': 1 / 6,
  });
export type ExpeditionEventKind =
  | 'growth-flush'
  | 'dry-spell'
  | 'mineral-bloom'
  | 'wildlife-drift';
export function expeditionRegion(point: { x: number; y: number }): string {
  return (
    String(Math.floor(point.x / 64)) + ':' + String(Math.floor(point.y / 64))
  );
}
export function expeditionEventKind(
  seed: string,
  tick: number,
  region: string,
  harvests: number,
  weather: string,
): ExpeditionEventKind {
  let hash = 2166136261;
  for (const c of seed +
    ':' +
    String(tick) +
    ':' +
    region +
    ':' +
    String(harvests) +
    ':' +
    weather) {
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507) >>> 0;
  hash ^= hash >>> 13;
  return (
    ['growth-flush', 'dry-spell', 'mineral-bloom', 'wildlife-drift'] as const
  )[(hash >>> 0) % 4]!;
}
export function expeditionRenewalMultiplier(
  resource: string,
  event?: ExpeditionEventKind,
): number {
  const base = EXPEDITION_RENEWAL[resource] ?? 1;
  const organic =
    resource === 'resource:fiber-plant' ||
    resource === 'resource:food-plant' ||
    resource === 'resource:timber-source';
  const mineral =
    resource === 'resource:stone-outcrop' ||
    resource === 'resource:metal-ore-node';
  return (
    base *
    (event === 'growth-flush' && organic
      ? 0.65
      : event === 'dry-spell'
        ? 1.35
        : event === 'mineral-bloom' && mineral
          ? 0.65
          : 1)
  );
}
