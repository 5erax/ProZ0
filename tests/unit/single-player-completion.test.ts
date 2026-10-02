import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { EXPEDITION_PLAYER_CARRY } from '../../src/simulation/items/ItemCapacity';
import {
  ExpeditionAuthority,
  type ExpeditionCommand,
} from '../../src/simulation/expedition/ExpeditionAuthority';
import { emptyExpeditionState } from '../../src/simulation/expedition/ExpeditionState';
import { Phase1BuildingWorld } from '../../src/world/building/Phase1BuildingWorld';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
function fixture(
  full = false,
  water = 0,
  owner = 'solo',
  canonical: string | null = null,
) {
  const items = new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world: new Phase1ItemTestWorld(),
    playerCarryPolicy: EXPEDITION_PLAYER_CARRY,
    initialLedger: {
      containers: [
        {
          containerId: 'inventory:solo',
          kind: 'player-inventory',
          ownerPlayerId: 'solo',
          revision: 0,
          stacks: full
            ? [
                {
                  stackId: 'ore1',
                  itemDefinitionId: 'item:metal-ore',
                  quantity: 20,
                  condition: null,
                },
                {
                  stackId: 'ore2',
                  itemDefinitionId: 'item:metal-ore',
                  quantity: 12,
                  condition: null,
                },
              ]
            : [],
        },
      ],
    },
  });
  const spatial = new Phase1BuildingTestSpatial();
  const buildings = new Phase1BuildingWorld(spatial, undefined, true);
  const actor = { x: 100, y: 100, alive: true };
  const authority = new ExpeditionAuthority(items, buildings, () => actor, {
    ...emptyExpeditionState(),
    facilities: [
      {
        id: 'field',
        owner,
        definitionId: canonical
          ? 'field-workbench'
          : water
            ? 'rain-collector'
            : 'camp-bed',
        canonicalStructureId: canonical,
        x: 102,
        y: 100,
        orientation: 0,
        water,
        progress: 0,
      },
    ],
  });
  const command = (
    id: string,
    action: ExpeditionCommand['action'] = 'dismantle',
  ): ExpeditionCommand => ({
    id,
    action,
    target: 'field',
    playerId: 'solo',
    expectedRevision: authority.read().revision,
    expectedInventoryRevision:
      items.getContainerView('inventory:solo').revision,
  });
  return { authority, items, actor, spatial, command };
}
it('custom salvage refunds exact materials once, restores space and survives receipt reopen', () => {
  const f = fixture();
  const command = f.command('remove');
  expect(f.authority.execute(command)).toEqual({
    status: 'committed',
    message: 'FACILITY_DISMANTLED',
  });
  expect(f.authority.read().facilities).toHaveLength(0);
  const view = f.items.getContainerView('inventory:solo');
  expect(view.stacks.map((s) => [s.itemDefinitionId, s.quantity])).toEqual(
    expect.arrayContaining([
      ['item:timber', 2],
      ['item:plant-fiber', 4],
    ]),
  );
  expect(f.authority.execute(command).status).toBe('committed');
  expect(f.items.getContainerView('inventory:solo')).toEqual(view);
  const reopened = new ExpeditionAuthority(
    f.items,
    new Phase1BuildingWorld(f.spatial, undefined, true),
    () => f.actor,
    f.authority.read(),
  );
  expect(reopened.execute(command).status).toBe('committed');
  expect(f.items.getContainerView('inventory:solo')).toEqual(view);
});
it('failed salvage retains the entire facility and inventory at capacity', () => {
  const f = fixture(true);
  const before = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(f.command('full')).message).toBe(
    'TARGET_CAPACITY_WEIGHT',
  );
  expect(f.authority.read().facilities).toHaveLength(1);
  expect(f.items.exportLedgerSnapshot()).toEqual(before);
});
it('salvage rejects distant, dead, foreign, full collector and canonical targets', () => {
  const far = fixture();
  far.actor.x = 120;
  expect(far.authority.execute(far.command('far')).message).toBe(
    'OUT_OF_RANGE',
  );
  const dead = fixture();
  dead.actor.alive = false;
  expect(dead.authority.execute(dead.command('dead')).message).toBe(
    'PLAYER_DEAD',
  );
  const foreign = fixture(false, 0, 'other');
  expect(foreign.authority.execute(foreign.command('foreign')).message).toBe(
    'FACILITY_MISSING',
  );
  const wet = fixture(false, 1);
  expect(wet.authority.execute(wet.command('wet')).message).toBe(
    'COLLECT_WATER_FIRST',
  );
  const canonical = fixture(false, 0, 'solo', 'canonical:bench');
  expect(
    canonical.authority.execute(canonical.command('canonical')).message,
  ).toBe('USE_CANONICAL_DISMANTLE');
  for (const f of [far, dead, foreign, wet, canonical])
    expect(f.authority.read().facilities).toHaveLength(1);
});
it('preview uses real footprint, terrain and range without changing revisions or inventory', () => {
  const f = fixture();
  const before = f.authority.read(),
    items = f.items.exportLedgerSnapshot();
  expect(f.authority.assessPreview('solo', 'camp-bed', 100, 102, 0)).toBeNull();
  expect(f.authority.assessPreview('solo', 'camp-bed', 102, 100, 0)).toBe(
    'PLAN_OVERLAP',
  );
  expect(f.authority.assessPreview('solo', 'camp-bed', 120, 100, 0)).toBe(
    'OUT_OF_RANGE',
  );
  f.spatial.buildable = false;
  expect(f.authority.assessPreview('solo', 'camp-bed', 100, 102, 0)).toBe(
    'INVALID_TERRAIN',
  );
  expect(f.authority.read()).toBe(before);
  expect(f.items.exportLedgerSnapshot()).toEqual(items);
  const a = f.authority.previewFootprint('camp-bed', 0)!,
    b = f.authority.previewFootprint('camp-bed', 1)!;
  expect(a.width).toBe(b.depth);
  expect(a.depth).toBe(b.width);
});
