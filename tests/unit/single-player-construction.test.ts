import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { EXPEDITION_FACILITIES } from '../../src/content/singleplayer/ExpeditionContent';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { EXPEDITION_PLAYER_CARRY } from '../../src/simulation/items/ItemCapacity';
import {
  ExpeditionAuthority,
  type ExpeditionCommand,
} from '../../src/simulation/expedition/ExpeditionAuthority';
import {validateExpeditionState} from '../../src/simulation/expedition/ExpeditionState';
import { Phase1BuildingWorld } from '../../src/world/building/Phase1BuildingWorld';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
function fixture() {
  const spatial = new Phase1BuildingTestSpatial();
  const buildings = new Phase1BuildingWorld(spatial, undefined, true);
  const items = new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world: new Phase1ItemTestWorld(),
    playerCarryPolicy: EXPEDITION_PLAYER_CARRY,
    initialLedger: {
      containers: [
        {
          containerId: 'inventory:solo',
          ownerPlayerId: 'solo',
          kind: 'player-inventory',
          revision: 0,
          stacks: [
            {
              stackId: 'timber',
              itemDefinitionId: 'item:timber',
              quantity: 2,
              condition: null,
            },
            {
              stackId: 'fiber',
              itemDefinitionId: 'item:plant-fiber',
              quantity: 2,
              condition: null,
            },
          ],
        },
      ],
    },
  });
  const actor = { x: 100, y: 100, alive: true };
  const authority = new ExpeditionAuthority(items, buildings, () => actor);
  const command = (
    id: string,
    action: ExpeditionCommand['action'],
    target: string,
    extra: Partial<ExpeditionCommand> = {},
  ) =>
    authority.execute({
      id,
      action,
      target,
      playerId: 'solo',
      expectedRevision: authority.read().revision,
      expectedInventoryRevision:
        items.getContainerView('inventory:solo').revision,
      ...extra,
    });
  return { spatial, buildings, items, actor, authority, command };
}
it('remote blueprint consumes escrow once, survives reconstruction, and becomes a real crate without needing a kit', () => {
  const f = fixture();
  expect(
    f.command('cache', 'plan', 'supply-cache', { x: 102, y: 100 }),
  ).toEqual({ status: 'committed', message: 'plan:cache' });
  expect(f.items.getContainerView('inventory:solo').stacks).toHaveLength(2);
  expect(f.command('early', 'complete', 'plan:cache').status).toBe('rejected');
  const deposit: ExpeditionCommand = {
    id: 'deposit',
    action: 'deposit',
    target: 'plan:cache',
    playerId: 'solo',
    expectedRevision: f.authority.read().revision,
    expectedInventoryRevision: 0,
  };
  expect(f.authority.execute(deposit).status).toBe('committed');
  const ledger = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(deposit).status).toBe('committed');
  expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  const saved = f.authority.read();
  const restored = new ExpeditionAuthority(
    f.items,
    f.buildings,
    () => f.actor,
    saved,
  );
  expect(restored.read()).toEqual(saved);
  expect(
    f.command('move', 'move', 'plan:cache', { x: 103, y: 100, orientation: 1 })
      .status,
  ).toBe('committed');
  expect(f.command('finish', 'complete', 'plan:cache').status).toBe(
    'committed',
  );
  const facility = f.authority.read().facilities[0]!;
  expect(
    f.buildings.getStructure(facility.canonicalStructureId!)?.position,
  ).toEqual({ x: 103, y: 100 });
  const crate = f.buildings.getStructure(facility.canonicalStructureId!)!;
  expect(f.items.getContainerView(crate.containerId!).kind).toBe(
    'storage-crate',
  );
  expect(f.items.getContainerView('inventory:solo').stacks).toHaveLength(0);
  const rebuilt = new Phase1BuildingWorld(
    f.spatial,
    f.buildings.exportSnapshot(),
    true,
  );
  expect(rebuilt.getStructure(crate.structureId)).toEqual(crate);
});
it.each(EXPEDITION_FACILITIES)('$id can be planned without supplies and completed through material escrow', (def) => {
  const f = fixture();
  if (def.id === 'attached-habitat') { f.actor.x = 0; f.actor.y = 0; }
  const inventoryBefore = f.items.exportLedgerSnapshot();
  expect(f.command('matrix-plan', 'plan', def.id, { x: f.actor.x + 2, y: f.actor.y }).status).toBe('committed');
  expect(f.items.exportLedgerSnapshot()).toEqual(inventoryBefore);
  expect(f.command('matrix-early', 'complete', 'plan:matrix-plan').message).toBe('MATERIALS_MISSING');
  expect(f.items.commitColonyExchange({ operationId: 'matrix-supplies', playerId: 'solo', expectedInventoryRevision: 0, inputs: [], outputs: def.costs.map(([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity })) }).status).toBe('committed');
  expect(f.command('matrix-deposit', 'deposit', 'plan:matrix-plan').status).toBe('committed');
  expect(f.command('matrix-finish', 'complete', 'plan:matrix-plan')).toEqual({ status: 'committed', message: 'FACILITY_COMPLETED' });
  const facility = f.authority.read().facilities[0]!;
  expect(f.authority.read().plans).toHaveLength(0);
  expect(facility.definitionId).toBe(def.id);
  if (def.canonical) {
    const structure = f.buildings.getStructure(facility.canonicalStructureId!)!;
    expect(structure.definitionId).toBe(def.canonical);
    const reopened = new Phase1BuildingWorld(f.spatial, f.buildings.exportSnapshot(), true);
    expect(reopened.getStructure(structure.structureId)).toEqual(structure);
    if (structure.containerId) expect(f.items.getContainerView(structure.containerId).kind).toBe(def.id === 'colony-condenser' ? 'machine-output' : 'storage-crate');
    if (def.id === 'attached-habitat') expect(f.buildings.exportSnapshot().foothold.connections).toHaveLength(1);
  }
});

it('changing a funded blueprint keeps its identity and shared escrow, refunds surplus once and rejects blocked or stale changes', () => {
  const f = fixture();
  expect(f.command('cache', 'plan', 'supply-cache', { x: 102, y: 100 }).status).toBe('committed');
  expect(f.command('deposit', 'deposit', 'plan:cache').status).toBe('committed');
  const change: ExpeditionCommand = { id: 'change', action: 'replace', target: 'plan:cache', replacementDefinition: 'field-workbench', playerId: 'solo', expectedRevision: f.authority.read().revision, expectedInventoryRevision: f.items.getContainerView('inventory:solo').revision };
  f.spatial.blocking = true;
  const before = f.authority.read(), bag = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(change).status).toBe('rejected');
  expect(f.authority.read()).toEqual(before); expect(f.items.exportLedgerSnapshot()).toEqual(bag);
  f.spatial.blocking = false;
  expect(f.authority.execute(change).message).toBe('PLAN_REPLACED');
  expect(f.authority.read().plans[0]).toMatchObject({ id: 'plan:cache', definitionId: 'field-workbench', paid: { 'item:timber': 2 }, x: 102, y: 100 });
  expect(f.items.getContainerView('inventory:solo').stacks.map(s => [s.itemDefinitionId, s.quantity])).toEqual([['item:plant-fiber', 2]]);
  const after = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(change).message).toBe('PLAN_REPLACED');
  expect(f.items.exportLedgerSnapshot()).toEqual(after);
  expect(f.authority.execute({ ...change, id: 'stale' }).message).toBe('STALE_REVISION');
  const reopened = new ExpeditionAuthority(f.items, f.buildings, () => f.actor, f.authority.read());
  expect(reopened.execute(change).message).toBe('PLAN_REPLACED');
  expect(f.command('unfinished', 'complete', 'plan:cache').message).toBe('MATERIALS_MISSING');
});

it('full inventory retains the original funded blueprint when a replacement would refund materials', () => {
  const f = fixture();
  expect(f.command('cache', 'plan', 'supply-cache', { x: 102, y: 100 }).status).toBe('committed');
  expect(f.command('deposit', 'deposit', 'plan:cache').status).toBe('committed');
  expect(f.items.commitColonyExchange({ operationId: 'fill', playerId: 'solo', expectedInventoryRevision: 1, inputs: [], outputs: [{ itemDefinitionId: 'item:metal-ore', quantity: 20 }, { itemDefinitionId: 'item:metal-ore', quantity: 12 }] }).status).toBe('committed');
  const before = f.authority.read(), bag = f.items.exportLedgerSnapshot();
  expect(f.command('change', 'replace', 'plan:cache', { replacementDefinition: 'field-workbench' }).status).toBe('rejected');
  expect(f.authority.read()).toEqual(before); expect(f.items.exportLedgerSnapshot()).toEqual(bag);
});
it('cancel refunds once; a full bag or obstructed terrain leaves escrow intact', () => {
  const f = fixture();
  expect(
    f.command('cache', 'plan', 'supply-cache', { x: 102, y: 100 }).status,
  ).toBe('committed');
  expect(f.command('deposit', 'deposit', 'plan:cache').status).toBe(
    'committed',
  );
  f.spatial.blocking = true;
  expect(f.command('finish', 'complete', 'plan:cache').status).toBe('rejected');
  expect(f.authority.read().plans[0]!.paid).toEqual({
    'item:timber': 2,
    'item:plant-fiber': 2,
  });
  expect(
    f.items.commitColonyExchange({
      operationId: 'fixture-fill',
      playerId: 'solo',
      expectedInventoryRevision: 1,
      inputs: [],
      outputs: [10, 10, 4].map((quantity) => ({
        itemDefinitionId: 'item:timber',
        quantity,
      })),
    }).status,
  ).toBe('committed');
  const before = f.authority.read();
  expect(f.command('cancel-full', 'cancel', 'plan:cache').status).toBe(
    'rejected',
  );
  expect(f.authority.read()).toEqual(before);
  expect(
    f.items.commitColonyExchange({
      operationId: 'fixture-empty',
      playerId: 'solo',
      expectedInventoryRevision: 2,
      inputs: [{ itemDefinitionId: 'item:timber', quantity: 24 }],
      outputs: [],
    }).status,
  ).toBe('committed');
  const cancel: ExpeditionCommand = {
    id: 'refund',
    action: 'cancel',
    target: 'plan:cache',
    playerId: 'solo',
    expectedRevision: f.authority.read().revision,
    expectedInventoryRevision: 3,
  };
  expect(f.authority.execute(cancel).status).toBe('committed');
  const ledger = f.items.exportLedgerSnapshot();
  expect(f.authority.execute(cancel).status).toBe('committed');
  expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  expect(f.authority.read().plans).toHaveLength(0);
});
it('legacy build radius remains constrained; expedition still rejects unexplored ground and stale commands', () => {
  const f = fixture();
  const placement = {
    mode: 'free' as const,
    anchor: { x: 102, y: 100 },
    orientationQuarterTurns: 0 as const,
  };
  expect(
    new Phase1BuildingWorld(f.spatial).assessPlacement(
      'structure:storage-crate',
      placement,
    ),
  ).toBe('OUTSIDE_BASE_BUILD_ZONE');
  f.spatial.explored = false;
  expect(
    f.command('unknown', 'plan', 'supply-cache', { x: 102, y: 100 }).status,
  ).toBe('rejected');
  f.spatial.explored = true;
  expect(
    f.command('stale', 'plan', 'supply-cache', {
      x: 102,
      y: 100,
      expectedInventoryRevision: 42,
    }).message,
  ).toBe('STALE_INVENTORY_REVISION');
});

it('field craft preserves materials on station failure and issues a usable durable spear once', () => {
  const f = fixture();
  expect(
    f.items.commitColonyExchange({
      operationId: 'fixture-craft',
      playerId: 'solo',
      expectedInventoryRevision: 0,
      inputs: [],
      outputs: [
        { itemDefinitionId: 'item:stone', quantity: 2 },
        { itemDefinitionId: 'item:cordage', quantity: 1 },
      ],
    }).status,
  ).toBe('committed');
  const before = f.items.exportLedgerSnapshot();
  expect(
    f.authority.craft({
      id: 'tool',
      playerId: 'solo',
      recipeId: 'field-tool',
      expectedRevision: 0,
      expectedInventoryRevision: 1,
    }).message,
  ).toBe('NEARBY_FIELD_WORKBENCH_REQUIRED');
  expect(f.items.exportLedgerSnapshot()).toEqual(before);
  const command = {
    id: 'spear',
    playerId: 'solo',
    recipeId: 'field-spear',
    expectedRevision: 0,
    expectedInventoryRevision: 1,
  };
  expect(f.authority.craft(command).status).toBe('committed');
  const after = f.items.exportLedgerSnapshot();
  expect(
    f.items
      .getContainerView('inventory:solo')
      .stacks.find((s) => s.itemDefinitionId === 'item:basic-spear')?.condition,
  ).toBe(100);
  expect(f.authority.craft(command).status).toBe('committed');
  expect(f.items.exportLedgerSnapshot()).toEqual(after);
});

it('large field foundations reject ground under their edge; rotated overlap agrees with preview and legacy footprints stay unchanged',()=>{
  const f=fixture();
  const actualGround=f.spatial.isBuildableGround.bind(f.spatial);
  f.spatial.isBuildableGround=(position,profile,orientation)=>{
    const width=orientation%2 ? profile.footprint.depth : profile.footprint.width;
    return actualGround(position,profile,orientation) && position.x-width/2>=101;
  };
  expect(f.authority.assessPreview('solo','field-workbench',102,100,0)).toBe(null);
  expect(f.authority.assessPreview('solo','livestock-pen',102,100,0)).toBe('INVALID_TERRAIN');
  expect(f.command('bad','plan','livestock-pen',{x:102,y:100}).message).toBe('INVALID_TERRAIN');
  f.spatial.isBuildableGround=actualGround;
  expect(f.command('pen','plan','livestock-pen',{x:102,y:100}).status).toBe('committed');
  expect(f.authority.previewFootprint('livestock-pen',0,'plan:pen')).toEqual({width:3,depth:2.5});
  expect(f.command('overlap','plan','poultry-coop',{x:99.6,y:100}).message).toBe('PLAN_OVERLAP');
  expect(f.command('rotate','move','plan:pen',{x:102,y:100,orientation:1}).status).toBe('committed');
  expect(f.authority.previewFootprint('livestock-pen',1,'plan:pen')).toEqual({width:2.5,depth:3});
  expect(f.command('separate','plan','poultry-coop',{x:99.6,y:100}).status).toBe('committed');
  const saved=f.authority.read();
  expect(()=>validateExpeditionState({...saved,plans:saved.plans.map(p=>({...p,footprintVersion:2}))})).toThrow(/position/);
  expect(()=>validateExpeditionState({...saved,plans:saved.plans.map(p=>({...p,footprintVersion:null}))})).toThrow(/position/);
  const legacy=validateExpeditionState({...saved,plans:saved.plans.map(({footprintVersion,...plan})=>{void footprintVersion;return plan;})});
  const reopened=new ExpeditionAuthority(f.items,f.buildings,()=>f.actor,legacy);
  expect(reopened.previewFootprint('livestock-pen',1,'plan:pen')).toEqual({width:.75,depth:1.25});
  expect(reopened.assessPreview('solo','livestock-pen',102,100,1,'plan:pen')).toBe(null);
});
