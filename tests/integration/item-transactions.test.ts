import { describe, expect, it } from 'vitest';
import {
  Phase1ItemAuthority,
  createPhase1ContentCatalog,
  type ContainerKind,
  type ContainerState,
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

function container(
  containerId: string,
  kind: ContainerKind,
  ownerPlayerId: string | null,
  stacks: readonly ItemStackState[] = [],
  revision = 0,
): ContainerState {
  return Object.freeze({
    containerId,
    kind,
    ownerPlayerId,
    revision,
    stacks: Object.freeze([...stacks]),
  });
}

function snapshot(
  containers: readonly ContainerState[],
): ItemLedgerSnapshot {
  return Object.freeze({
    containers: Object.freeze([...containers]),
  });
}

function authority(
  world: Phase1ItemTestWorld,
  containers: readonly ContainerState[],
): Phase1ItemAuthority {
  return new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world,
    initialLedger: snapshot(containers),
  });
}

function quantityOf(
  authorityState: Phase1ItemAuthority,
  containerId: string,
  itemDefinitionId: string,
): number {
  return authorityState
    .getContainerView(containerId)
    .stacks
    .filter((entry) => entry.itemDefinitionId === itemDefinitionId)
    .reduce((sum, entry) => sum + entry.quantity, 0);
}

describe('Phase1 item transactions', () => {
  it('derives player weight state from approved 20 kg capacity', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('ore', 'item:metal-ore', 17)],
      ),
    ]);

    const view = runtime.getContainerView('inventory:p1');

    expect(view.totalWeightKg).toBe(17);
    expect(view.totalVolume).toBe(12.75);
    expect(view.playerWeightState).toBe('HEAVY');
  });

  it('transfers exact requested quantity once and caches duplicate OperationId', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('fiber-a', 'item:plant-fiber', 10)],
      ),
      container('crate:a', 'storage-crate', null),
    ]);

    const command = {
      type: 'transfer' as const,
      operationId: 'op:transfer:1',
      playerId: 'p1',
      sourceContainerId: 'inventory:p1',
      sourceExpectedRevision: 0,
      targetContainerId: 'crate:a',
      targetExpectedRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 4,
    };

    const first = runtime.execute(command);
    const afterFirst = runtime.exportLedgerSnapshot();
    const retry = runtime.execute(command);
    const afterRetry = runtime.exportLedgerSnapshot();

    expect(first).toEqual(retry);
    expect(first.status).toBe('committed');
    expect(afterRetry).toEqual(afterFirst);
    expect(quantityOf(runtime, 'inventory:p1', 'item:plant-fiber')).toBe(6);
    expect(quantityOf(runtime, 'crate:a', 'item:plant-fiber')).toBe(4);
    expect(runtime.getContainerView('inventory:p1').revision).toBe(1);
    expect(runtime.getContainerView('crate:a').revision).toBe(1);

    const conflict = runtime.execute({
      ...command,
      quantity: 3,
    });
    expect(conflict).toMatchObject({
      status: 'rejected',
      reason: 'OPERATION_ID_CONFLICT',
    });
  });

  it('rejects stale revision without mutating either container', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('fiber-a', 'item:plant-fiber', 5)],
        2,
      ),
      container('crate:a', 'storage-crate', null, [], 3),
    ]);

    const before = runtime.exportLedgerSnapshot();
    const result = runtime.execute({
      type: 'transfer',
      operationId: 'op:stale',
      playerId: 'p1',
      sourceContainerId: 'inventory:p1',
      sourceExpectedRevision: 1,
      targetContainerId: 'crate:a',
      targetExpectedRevision: 3,
      sourceStackId: 'fiber-a',
      quantity: 1,
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });
    expect(runtime.exportLedgerSnapshot()).toEqual(before);
  });

  it('rejects inbound player weight overflow atomically', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('ore-full', 'item:metal-ore', 20)],
      ),
      container(
        'crate:a',
        'storage-crate',
        null,
        [stack('fiber-a', 'item:plant-fiber', 1)],
      ),
    ]);

    const before = runtime.exportLedgerSnapshot();
    const result = runtime.execute({
      type: 'transfer',
      operationId: 'op:capacity',
      playerId: 'p1',
      sourceContainerId: 'crate:a',
      sourceExpectedRevision: 0,
      targetContainerId: 'inventory:p1',
      targetExpectedRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 1,
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'TARGET_CAPACITY_WEIGHT',
    });
    expect(runtime.exportLedgerSnapshot()).toEqual(before);
  });

  it('split then merge conserves quantity and uses deterministic new stack identity', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('fiber-a', 'item:plant-fiber', 10)],
      ),
    ]);

    const split = runtime.execute({
      type: 'split',
      operationId: 'op:split',
      playerId: 'p1',
      containerId: 'inventory:p1',
      expectedRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 3,
    });
    expect(split).toMatchObject({ status: 'committed' });

    const splitId = 'generated-stack:op:split:0';
    expect(runtime.getContainerView('inventory:p1').stacks).toEqual([
      stack('fiber-a', 'item:plant-fiber', 7),
      stack(splitId, 'item:plant-fiber', 3),
    ]);

    const merge = runtime.execute({
      type: 'merge',
      operationId: 'op:merge',
      playerId: 'p1',
      containerId: 'inventory:p1',
      expectedRevision: 1,
      sourceStackId: splitId,
      targetStackId: 'fiber-a',
    });
    expect(merge).toMatchObject({ status: 'committed' });
    expect(runtime.getContainerView('inventory:p1').stacks).toEqual([
      stack('fiber-a', 'item:plant-fiber', 10),
    ]);
    expect(runtime.getContainerView('inventory:p1').revision).toBe(2);
  });

  it('shared crate contention commits once and rejects the stale second actor', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container('inventory:p1', 'player-inventory', 'p1'),
      container('inventory:p2', 'player-inventory', 'p2'),
      container(
        'crate:a',
        'storage-crate',
        null,
        [stack('fiber-a', 'item:plant-fiber', 5)],
      ),
    ]);

    const first = runtime.execute({
      type: 'transfer',
      operationId: 'op:p1-take',
      playerId: 'p1',
      sourceContainerId: 'crate:a',
      sourceExpectedRevision: 0,
      targetContainerId: 'inventory:p1',
      targetExpectedRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 5,
    });
    const second = runtime.execute({
      type: 'transfer',
      operationId: 'op:p2-take',
      playerId: 'p2',
      sourceContainerId: 'crate:a',
      sourceExpectedRevision: 0,
      targetContainerId: 'inventory:p2',
      targetExpectedRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 5,
    });

    expect(first).toMatchObject({ status: 'committed' });
    expect(second).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });
    expect(quantityOf(runtime, 'inventory:p1', 'item:plant-fiber')).toBe(5);
    expect(quantityOf(runtime, 'inventory:p2', 'item:plant-fiber')).toBe(0);
    expect(quantityOf(runtime, 'crate:a', 'item:plant-fiber')).toBe(0);
  });

  it('drop placement failure leaves inventory unchanged', () => {
    const world = new Phase1ItemTestWorld();
    world.dropPlacementAvailable = false;

    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('fiber-a', 'item:plant-fiber', 3)],
      ),
    ]);

    const before = runtime.exportLedgerSnapshot();
    const result = runtime.execute({
      type: 'drop',
      operationId: 'op:drop-invalid',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 2,
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'INVALID_WORLD_PLACEMENT',
    });
    expect(runtime.exportLedgerSnapshot()).toEqual(before);
    expect(world.getWorldDrop('generated-drop:op:drop-invalid')).toBeNull();
  });

  it('world drop moves exact canonical stack once and first pickup wins', () => {
    const world = new Phase1ItemTestWorld();
    const runtime = authority(world, [
      container(
        'inventory:p1',
        'player-inventory',
        'p1',
        [stack('fiber-a', 'item:plant-fiber', 3)],
      ),
      container('inventory:p2', 'player-inventory', 'p2'),
      container('inventory:p3', 'player-inventory', 'p3'),
    ]);

    const dropped = runtime.execute({
      type: 'drop',
      operationId: 'op:drop',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      sourceStackId: 'fiber-a',
      quantity: 3,
    });
    expect(dropped).toMatchObject({ status: 'committed' });

    const dropId = 'generated-drop:op:drop';
    const drop = world.getWorldDrop(dropId);
    expect(drop).toMatchObject({
      available: true,
      revision: 0,
      containerId: 'generated-container:op:drop:drop',
    });

    const pickupCommand = {
      type: 'pickup' as const,
      operationId: 'op:pickup:p2',
      playerId: 'p2',
      inventoryContainerId: 'inventory:p2',
      expectedInventoryRevision: 0,
      worldDropId: dropId,
      expectedWorldDropRevision: 0,
      expectedDropContainerRevision: 0,
    };
    const firstPickup = runtime.execute(pickupCommand);
    const retry = runtime.execute(pickupCommand);

    expect(firstPickup).toEqual(retry);
    expect(firstPickup).toMatchObject({ status: 'committed' });
    expect(quantityOf(runtime, 'inventory:p2', 'item:plant-fiber')).toBe(3);
    expect(runtime.getContainerView('inventory:p2').stacks[0]?.stackId).toBe(
      'fiber-a',
    );

    const secondPickup = runtime.execute({
      ...pickupCommand,
      operationId: 'op:pickup:p3',
      playerId: 'p3',
      inventoryContainerId: 'inventory:p3',
    });
    expect(secondPickup).toMatchObject({
      status: 'rejected',
      reason: 'TARGET_ALREADY_TAKEN',
    });
    expect(quantityOf(runtime, 'inventory:p3', 'item:plant-fiber')).toBe(0);
    expect(world.getWorldDrop(dropId)?.available).toBe(false);
  });
});
