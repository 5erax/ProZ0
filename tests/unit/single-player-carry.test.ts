import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { ItemLedger } from '../../src/simulation/items/ItemLedger';
import {
  EXPEDITION_PLAYER_CARRY,
  getPlayerWeightState,
} from '../../src/simulation/items/ItemCapacity';
it('solo expedition inventory accepts useful timber/stone loads, reopens and rejects additional weight atomically; legacy remains smaller', () => {
  const catalog = createPhase1ContentCatalog();
  const empty = {
    containers: [
      {
        containerId: 'inventory:solo',
        kind: 'player-inventory' as const,
        ownerPlayerId: 'solo',
        revision: 0,
        stacks: [],
      },
    ],
  };
  const ledger = new ItemLedger(
    catalog,
    empty,
    () => 1,
    EXPEDITION_PLAYER_CARRY,
  );
  const draft = ledger.createDraft();
  for (const [id, quantity] of [
    ['item:timber', 5],
    ['item:timber', 10],
    ['item:stone', 20],
  ] as const) {
    expect(
      typeof draft.insert({
        containerId: 'inventory:solo',
        itemDefinitionId: id,
        quantity,
        condition: null,
        operationId: id + quantity,
        generatedOrdinal: 0,
      }),
    ).toBe('object');
  }
  ledger.publish(draft);
  const view = ledger.getContainerView('inventory:solo');
  expect(view.totalWeightKg).toBe(30);
  expect(view.playerCarryPolicy).toEqual(EXPEDITION_PLAYER_CARRY);
  expect(view.playerWeightState).toBe('HEAVY');
  const before = draft.snapshot();
  expect(
    draft.insert({
      containerId: 'inventory:solo',
      itemDefinitionId: 'item:stone',
      quantity: 4,
      condition: null,
      operationId: 'overflow',
      generatedOrdinal: 0,
    }),
  ).toBe('TARGET_CAPACITY_WEIGHT');
  expect(draft.snapshot()).toEqual(before);
  expect(
    new ItemLedger(
      catalog,
      ledger.exportSnapshot(),
      () => 1,
      EXPEDITION_PLAYER_CARRY,
    ).exportSnapshot(),
  ).toEqual(ledger.exportSnapshot());
  expect(() => new ItemLedger(catalog, ledger.exportSnapshot())).toThrow(
    /capacity/,
  );
  expect(getPlayerWeightState(18)).toBe('HEAVY');
  expect(getPlayerWeightState(18, EXPEDITION_PLAYER_CARRY)).toBe('NORMAL');
});
