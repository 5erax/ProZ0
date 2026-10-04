import { createPhase1ContentCatalog } from '../../src/content';
import { INDUSTRY_ITEM_IDS, type IndustryFacilityKind } from '../../src/content/phase3/IndustryContent';
import type { WorldPosition } from '../../src/foundation';
import { Phase1ItemAuthority, type ItemStackState } from '../../src/simulation';
import { IndustryAuthority, type IndustryCommand } from '../../src/simulation/industry/IndustryAuthority';
import { emptyIndustryState, type IndustryState } from '../../src/simulation/industry/IndustryState';
import { Phase1ItemTestWorld } from './Phase1ItemTestWorld';

/** Rich supplies and an explicitly enlarged carry fixture exercise authority transactions without gathering delays. */
export function industryTestFixture(initial?: IndustryState, initialStocks?: Readonly<Record<string, number>>) {
  const catalog = createPhase1ContentCatalog();
  const stock = initialStocks ?? Object.fromEntries(INDUSTRY_ITEM_IDS.map(id => [id, 100]));
  const items = new Phase1ItemAuthority({ catalog, world: new Phase1ItemTestWorld(),
    playerCarryPolicy: { maxWeightKg: 100_000, hardWeightKg: 100_000, maxVolume: 100_000 },
    initialLedger: { containers: ['p1', 'p2'].map(player => {
      const stacks: ItemStackState[] = [];
      for (const [id, quantity] of Object.entries(stock)) {
        const definition = catalog.getAs(id, 'item');
        for (let remaining = quantity, ordinal = 0; remaining > 0; ordinal++) {
          const count = Math.min(remaining, definition.maxStack); remaining -= count;
          stacks.push({ stackId: player + ':' + id + ':' + String(ordinal), itemDefinitionId: id,
            quantity: count, condition: definition.conditionMax });
        }
      }
      return { containerId: 'inventory:' + player, kind: 'player-inventory' as const,
        ownerPlayerId: player, revision: 0, stacks };
    }) } });
  let position: WorldPosition = { x: 0, y: 0 }, alive = true, daylight = true;
  let spaceId = 'surface';
  let place: (position: WorldPosition) => boolean = () => true;
  let researchAvailable = true;
  const actor = (player: string) => {
    if (!['p1', 'p2'].includes(player)) throw new Error('Unknown fixture player.');
    return { position, alive, spaceId };
  };
  const world = { canPlace: (point: WorldPosition) => place(point), hasResearch: () => researchAvailable,
    solarActive: () => daylight,
    movePlayer: (_player: string, point: WorldPosition) => { position = { ...point }; return true; } };
  let industry = new IndustryAuthority(items, actor, world, initial ?? { ...emptyIndustryState(),
    researchIds: ['automation', 'logistics', 'greenhouse', 'mobility', 'advanced-greenhouse'] });
  let ordinal = Math.max(0, ...(initial?.receipts ?? []).map(r => Number(r.operationId.split(':').at(-1)) || 0));
  const command = (intent: Omit<IndustryCommand, 'operationId' | 'playerId' | 'expectedRevision' | 'expectedInventoryRevision'>,
    playerId = 'p1'): IndustryCommand => ({ ...intent, playerId, operationId: 'industry-test:' + String(++ordinal),
      expectedRevision: industry.read().revision, expectedInventoryRevision: items.getContainerView('inventory:' + playerId).revision });
  const build = (facilityKind: IndustryFacilityKind, point: WorldPosition): string => {
    position = point;
    const result = industry.execute(command({ action: 'build', facilityKind, position: point }));
    if (result.status !== 'committed' || !result.entityId) throw new Error('Fixture construction failed: ' + JSON.stringify(result));
    return result.entityId;
  };
  const perform = (intent: Parameters<typeof command>[0]) => {
    if (intent.targetId) {
      const facility = industry.read().facilities.find(f => f.id === intent.targetId);
      if (facility) position = facility.position;
    }
    return industry.execute(command(intent));
  };
  const step = (count: number): void => {
    for (let i = 0; i < count; i++) industry.tick(industry.read().lastTick + 1);
  };
  return { items, catalog, command, build, perform, step,
    get industry() { return industry; },
    move: (point: WorldPosition) => { position = point; },
    die: () => { alive = false; },
    setDaylight: (value: boolean) => { daylight = value; },
    setWorldspace: (value: string) => { spaceId = value; },
    setPlace: (predicate: (point: WorldPosition) => boolean) => { place = predicate; },
    setResearchAvailable: (value: boolean) => { researchAvailable = value; },
    reopen: () => { industry = new IndustryAuthority(items, actor, world, JSON.parse(JSON.stringify(industry.read()))); },
  };
}
