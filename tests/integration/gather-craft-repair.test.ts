import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  Phase1ItemAuthority,
  type ContainerState,
  type GatherCostPort,
  type ItemAuthorityEvent,
  type ItemAuthorityEventSink,
  type ItemLedgerSnapshot,
  type ItemStackState,
} from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function stack(
  stackId: string,
  itemDefinitionId: string,
  quantity: number,
  condition: number | null = null,
): ItemStackState {
  return Object.freeze({
    stackId,
    itemDefinitionId,
    quantity,
    condition,
  });
}

function inventory(
  stacks: readonly ItemStackState[],
  revision = 0,
): ContainerState {
  return Object.freeze({
    containerId: 'inventory:p1',
    kind: 'player-inventory',
    ownerPlayerId: 'p1',
    revision,
    stacks: Object.freeze([...stacks]),
  });
}

function makeAuthority(
  world: Phase1ItemTestWorld,
  playerInventory: ContainerState,
  options: {
    readonly gatherCost?: GatherCostPort;
    readonly events?: ItemAuthorityEventSink;
  } = {},
): Phase1ItemAuthority {
  const initialLedger: ItemLedgerSnapshot = Object.freeze({
    containers: Object.freeze([playerInventory]),
  });

  return new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world,
    initialLedger,
    ...(options.gatherCost === undefined
      ? {}
      : { gatherCost: options.gatherCost }),
    ...(options.events === undefined ? {} : { events: options.events }),
  });
}

function itemQuantity(
  authority: Phase1ItemAuthority,
  itemDefinitionId: string,
): number {
  return authority
    .getContainerView('inventory:p1')
    .stacks
    .filter((entry) => entry.itemDefinitionId === itemDefinitionId)
    .reduce((sum, entry) => sum + entry.quantity, 0);
}

function tickUntilResolved(
  authority: Phase1ItemAuthority,
  requiredTicks: number,
) {
  let result = authority.tickGather('p1');
  for (let tick = 1; tick < requiredTicks; tick += 1) {
    result = authority.tickGather('p1');
  }
  return result;
}

describe('Phase1 gathering', () => {
  it('cancels a channel with no resource output or tool mutation', () => {
    const world = new Phase1ItemTestWorld();
    world.addResource({
      resourceEntityId: 'resource-instance:fiber',
      resourceDefinitionId: 'resource:fiber-plant',
      revision: 0,
      remainingActions: 4,
      depleted: false,
    });

    const authority = makeAuthority(world, inventory([]));
    const started = authority.beginGather({
      operationId: 'op:gather:cancel',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      resourceEntityId: 'resource-instance:fiber',
      expectedResourceRevision: 0,
    });

    expect(started).toMatchObject({
      status: 'started',
      requiredTicks: 36,
    });

    for (let tick = 0; tick < 5; tick += 1) {
      expect(authority.tickGather('p1').status).toBe('channeling');
    }

    world.setResourceInRange('resource-instance:fiber', false);
    expect(authority.tickGather('p1')).toMatchObject({
      status: 'canceled',
      reason: 'OUT_OF_RANGE',
    });

    expect(itemQuantity(authority, 'item:plant-fiber')).toBe(0);
    expect(authority.getContainerView('inventory:p1').revision).toBe(0);
    expect(world.getResource('resource-instance:fiber')).toMatchObject({
      revision: 0,
      remainingActions: 4,
      depleted: false,
    });
  });

  it('completes hard gathering after 60 ticks with exact yield and -2 tool condition', () => {
    const world = new Phase1ItemTestWorld();
    world.addResource({
      resourceEntityId: 'resource-instance:timber',
      resourceDefinitionId: 'resource:timber-source',
      revision: 0,
      remainingActions: 5,
      depleted: false,
    });

    const events: ItemAuthorityEvent[] = [];
    const authority = makeAuthority(
      world,
      inventory([
        stack('tool-a', 'item:stone-field-tool', 1, 100),
      ]),
      {
        events: {
          emit(event): void {
            events.push(event);
          },
        },
      },
    );

    const request = {
      operationId: 'op:gather:timber',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      resourceEntityId: 'resource-instance:timber',
      expectedResourceRevision: 0,
      toolStackId: 'tool-a',
    } as const;

    expect(authority.beginGather(request)).toMatchObject({
      status: 'started',
      requiredTicks: 60,
    });

    const result = tickUntilResolved(authority, 60);
    expect(result).toMatchObject({
      status: 'resolved',
      result: { status: 'committed' },
    });

    expect(itemQuantity(authority, 'item:timber')).toBe(1);
    expect(
      authority
        .getContainerView('inventory:p1')
        .stacks
        .find((entry) => entry.stackId === 'tool-a')?.condition,
    ).toBe(98);
    expect(authority.getContainerView('inventory:p1').revision).toBe(1);
    expect(world.getResource('resource-instance:timber')).toMatchObject({
      revision: 1,
      remainingActions: 4,
      depleted: false,
    });
    expect(events).toEqual([
      {
        type: 'gather-completed',
        operationId: 'op:gather:timber',
        playerId: 'p1',
        resourceEntityId: 'resource-instance:timber',
        resourceDefinitionId: 'resource:timber-source',
      },
    ]);

    const retry = authority.beginGather(request);
    expect(retry).toMatchObject({
      status: 'resolved',
      result: { status: 'committed' },
    });
    expect(itemQuantity(authority, 'item:timber')).toBe(1);
    expect(world.getResource('resource-instance:timber')?.remainingActions).toBe(4);
  });

  it('rejects capacity and broken-tool gather starts without mutation', () => {
    const world = new Phase1ItemTestWorld();
    world.addResource({
      resourceEntityId: 'resource-instance:fiber',
      resourceDefinitionId: 'resource:fiber-plant',
      revision: 0,
      remainingActions: 4,
      depleted: false,
    });
    world.addResource({
      resourceEntityId: 'resource-instance:ore',
      resourceDefinitionId: 'resource:metal-ore-node',
      revision: 0,
      remainingActions: 6,
      depleted: false,
    });

    const full = makeAuthority(
      world,
      inventory([stack('ore-full', 'item:metal-ore', 20)]),
    );
    expect(full.beginGather({
      operationId: 'op:gather:full',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      resourceEntityId: 'resource-instance:fiber',
      expectedResourceRevision: 0,
    })).toMatchObject({
      status: 'rejected',
      reason: 'TARGET_CAPACITY_WEIGHT',
    });

    const broken = makeAuthority(
      world,
      inventory([
        stack('tool-broken', 'item:stone-field-tool', 1, 0),
      ]),
    );
    expect(broken.beginGather({
      operationId: 'op:gather:broken',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      resourceEntityId: 'resource-instance:ore',
      expectedResourceRevision: 0,
      toolStackId: 'tool-broken',
    })).toMatchObject({
      status: 'rejected',
      reason: 'TOOL_BROKEN',
    });

    expect(world.getResource('resource-instance:fiber')?.revision).toBe(0);
    expect(world.getResource('resource-instance:ore')?.revision).toBe(0);
  });

  it('honors the external stamina eligibility seam without spending on failure', () => {
    const world = new Phase1ItemTestWorld();
    world.addResource({
      resourceEntityId: 'resource-instance:fiber',
      resourceDefinitionId: 'resource:fiber-plant',
      revision: 0,
      remainingActions: 4,
      depleted: false,
    });

    let commits = 0;
    const gatherCost: GatherCostPort = {
      canCompleteGather(): boolean {
        return false;
      },
      commitGatherCost(): void {
        commits += 1;
      },
    };

    const authority = makeAuthority(world, inventory([]), { gatherCost });
    expect(authority.beginGather({
      operationId: 'op:gather:no-stamina',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      resourceEntityId: 'resource-instance:fiber',
      expectedResourceRevision: 0,
    })).toMatchObject({
      status: 'rejected',
      reason: 'INSUFFICIENT_STAMINA',
    });
    expect(commits).toBe(0);
  });
});

describe('Phase1 crafting and repair', () => {
  it('handcraft consumes exact inputs iff output commits', () => {
    const world = new Phase1ItemTestWorld();
    const authority = makeAuthority(
      world,
      inventory([stack('fiber-a', 'item:plant-fiber', 3)]),
    );

    const result = authority.execute({
      type: 'craft',
      operationId: 'op:craft:cordage',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      recipeId: 'recipe:cordage',
    });

    expect(result).toMatchObject({ status: 'committed' });
    expect(itemQuantity(authority, 'item:plant-fiber')).toBe(0);
    expect(itemQuantity(authority, 'item:cordage')).toBe(1);
    expect(authority.getContainerView('inventory:p1').revision).toBe(1);
  });

  it('Tier 1 crafting requires a functional accessible Workbench', () => {
    const world = new Phase1ItemTestWorld();
    world.addWorkbench({
      structureInstanceId: 'workbench:a',
      revision: 4,
      functional: true,
    });

    const inputs = [
      stack('fiber-a', 'item:plant-fiber', 2),
      stack('ore-a', 'item:metal-ore', 1),
    ];
    const authority = makeAuthority(world, inventory(inputs));

    const noStation = authority.execute({
      type: 'craft',
      operationId: 'op:craft:no-station',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      recipeId: 'recipe:repair-patch',
    });
    expect(noStation).toMatchObject({
      status: 'rejected',
      reason: 'STATION_REQUIRED',
    });
    expect(itemQuantity(authority, 'item:repair-patch')).toBe(0);

    const committed = authority.execute({
      type: 'craft',
      operationId: 'op:craft:patch',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      recipeId: 'recipe:repair-patch',
      workbench: {
        structureInstanceId: 'workbench:a',
        expectedRevision: 4,
      },
    });

    expect(committed).toMatchObject({ status: 'committed' });
    expect(itemQuantity(authority, 'item:plant-fiber')).toBe(0);
    expect(itemQuantity(authority, 'item:metal-ore')).toBe(0);
    expect(itemQuantity(authority, 'item:repair-patch')).toBe(1);
  });

  it('craft output capacity failure leaves every input unchanged', () => {
    const world = new Phase1ItemTestWorld();
    const authority = makeAuthority(
      world,
      inventory([
        stack('ore-load', 'item:metal-ore', 16),
        stack('timber-a', 'item:timber', 4),
        stack('cordage-a', 'item:cordage', 2),
      ]),
    );

    const before = authority.exportLedgerSnapshot();
    const result = authority.execute({
      type: 'craft',
      operationId: 'op:craft:overflow',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      recipeId: 'recipe:storage-crate-kit',
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'TARGET_CAPACITY_WEIGHT',
    });
    expect(authority.exportLedgerSnapshot()).toEqual(before);
  });

  it('repair consumes one patch iff condition increases by 25 capped at 100', () => {
    const world = new Phase1ItemTestWorld();
    world.addWorkbench({
      structureInstanceId: 'workbench:a',
      revision: 0,
      functional: true,
    });

    const authority = makeAuthority(
      world,
      inventory([
        stack('tool-a', 'item:stone-field-tool', 1, 60),
        stack('patch-a', 'item:repair-patch', 1),
      ]),
    );

    const result = authority.execute({
      type: 'repair',
      operationId: 'op:repair:tool',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      targetStackId: 'tool-a',
      workbench: {
        structureInstanceId: 'workbench:a',
        expectedRevision: 0,
      },
    });

    expect(result).toMatchObject({ status: 'committed' });
    expect(
      authority
        .getContainerView('inventory:p1')
        .stacks
        .find((entry) => entry.stackId === 'tool-a')?.condition,
    ).toBe(85);
    expect(itemQuantity(authority, 'item:repair-patch')).toBe(0);
  });

  it('full-condition or invalid repair target consumes no patch', () => {
    const world = new Phase1ItemTestWorld();
    world.addWorkbench({
      structureInstanceId: 'workbench:a',
      revision: 0,
      functional: true,
    });

    const full = makeAuthority(
      world,
      inventory([
        stack('tool-full', 'item:stone-field-tool', 1, 100),
        stack('patch-a', 'item:repair-patch', 1),
      ]),
    );
    const fullBefore = full.exportLedgerSnapshot();

    expect(full.execute({
      type: 'repair',
      operationId: 'op:repair:full',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      targetStackId: 'tool-full',
      workbench: {
        structureInstanceId: 'workbench:a',
        expectedRevision: 0,
      },
    })).toMatchObject({
      status: 'rejected',
      reason: 'ITEM_FULL_CONDITION',
    });
    expect(full.exportLedgerSnapshot()).toEqual(fullBefore);

    const invalid = makeAuthority(
      world,
      inventory([
        stack('fiber-a', 'item:plant-fiber', 1),
        stack('patch-b', 'item:repair-patch', 1),
      ]),
    );
    const invalidBefore = invalid.exportLedgerSnapshot();

    expect(invalid.execute({
      type: 'repair',
      operationId: 'op:repair:invalid',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      targetStackId: 'fiber-a',
      workbench: {
        structureInstanceId: 'workbench:a',
        expectedRevision: 0,
      },
    })).toMatchObject({
      status: 'rejected',
      reason: 'INVALID_REPAIR_TARGET',
    });
    expect(invalid.exportLedgerSnapshot()).toEqual(invalidBefore);
  });
});
