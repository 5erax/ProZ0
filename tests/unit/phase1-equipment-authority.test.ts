import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  Phase1EquipmentAuthority,
  Phase1ItemAuthority,
  type ContainerState,
} from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function items(): Phase1ItemAuthority {
  const inventory: ContainerState = Object.freeze({
    containerId: 'inventory:p1',
    kind: 'player-inventory',
    ownerPlayerId: 'p1',
    revision: 0,
    stacks: Object.freeze([
      Object.freeze({
        stackId: 'spear:p1',
        itemDefinitionId: 'item:basic-spear',
        quantity: 1,
        condition: 50,
      }),
      Object.freeze({
        stackId: 'wrap:p1',
        itemDefinitionId: 'item:thermal-wrap',
        quantity: 1,
        condition: 80,
      }),
      Object.freeze({
        stackId: 'fiber:p1',
        itemDefinitionId: 'item:plant-fiber',
        quantity: 2,
        condition: null,
      }),
    ]),
  });

  return new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world: new Phase1ItemTestWorld(),
    initialLedger: Object.freeze({
      containers: Object.freeze([inventory]),
    }),
  });
}

describe('Phase 1 equipment authority', () => {
  it('owns validated weapon/wrap refs and reconciles them with death item movement', () => {
    const itemAuthority = items();
    const equipment = new Phase1EquipmentAuthority(
      itemAuthority,
      Object.freeze([
        Object.freeze({
          playerId: 'p1',
          equippedWeaponStackId: 'spear:p1',
          equippedThermalWrapStackId: 'wrap:p1',
        }),
      ]),
    );

    expect(equipment.getView('p1')).toMatchObject({
      equippedWeaponStackId: 'spear:p1',
      equippedThermalWrapStackId: 'wrap:p1',
    });
    expect(equipment.isThermalWrapActive('p1')).toBe(true);
    expect(equipment.equipWeapon('p1', 'fiber:p1')).toEqual({
      status: 'rejected',
      reason: 'INVALID_EQUIPMENT',
    });

    const moved = itemAuthority.commitDeathCacheItems({
      deathId: 'death:p1:test',
      operationId: 'death-items:death:p1:test',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      equippedStackIds: equipment.equippedStackIds('p1'),
    });
    expect(moved).toMatchObject({
      status: 'committed',
      penalizedStackIds: ['spear:p1', 'wrap:p1'],
    });
    if (moved.status !== 'committed' || moved.cacheContainerId === null) {
      throw new Error('Expected death-cache item move.');
    }

    const cache = itemAuthority.getContainerView(moved.cacheContainerId);
    expect(cache.stacks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        stackId: 'spear:p1',
        condition: 40,
      }),
      expect.objectContaining({
        stackId: 'wrap:p1',
        condition: 70,
      }),
    ]));

    expect(equipment.reconcile('p1')).toMatchObject({
      equippedWeaponStackId: null,
      equippedThermalWrapStackId: null,
    });
  });

  it('rejects persisted equipment refs that are not owned by the player inventory', () => {
    const itemAuthority = items();
    expect(() => new Phase1EquipmentAuthority(
      itemAuthority,
      Object.freeze([
        Object.freeze({
          playerId: 'p1',
          equippedWeaponStackId: 'missing',
          equippedThermalWrapStackId: null,
        }),
      ]),
    )).toThrow(/equipment reference is invalid/);
  });
});
