import { expect, it } from "vitest";
import { createPhase1ContentCatalog } from "../../src/content";
import { ItemLedger } from "../../src/simulation/items/ItemLedger";
import {
  colonyStorageMultiplier,
  emptyColonyDepthState,
} from "../../src/simulation/colony/ColonyDepthAuthority";

it("research and engineer capacity accepts larger real ledgers, reopens them and rejects overflow without changing stacks", () => {
  const catalog = createPhase1ContentCatalog();
  const expanded = {
    ...emptyColonyDepthState(),
    researchIds: ["field-survey", "expanded-storage"] as const,
  };
  const engineer = {
    ...expanded,
    professions: { colonist: "engineer" as const },
  };
  expect(colonyStorageMultiplier(expanded)).toBe(1.5);
  expect(colonyStorageMultiplier(engineer)).toBe(2);
  const item = catalog.getAs("item:stone", "item");
  const quantity = Math.floor(110 / item.unitWeightKg);
  const stacks = Array.from(
    { length: Math.ceil(quantity / item.maxStack) },
    (_, i) => ({
      stackId: "stone:" + String(i),
      itemDefinitionId: item.id,
      quantity: Math.min(item.maxStack, quantity - i * item.maxStack),
      condition: null,
    }),
  );
  const initial = {
    containers: [
      {
        containerId: "crate:colony",
        kind: "storage-crate" as const,
        ownerPlayerId: null,
        revision: 0,
        stacks,
      },
    ],
  };
  expect(() => new ItemLedger(catalog, initial)).toThrow(/capacity/);
  const ledger = new ItemLedger(catalog, initial, () =>
    colonyStorageMultiplier(expanded),
  );
  expect(ledger.getContainerView("crate:colony").totalWeightKg).toBeGreaterThan(
    100,
  );
  const reopened = new ItemLedger(catalog, ledger.exportSnapshot(), () =>
    colonyStorageMultiplier(expanded),
  );
  expect(reopened.exportSnapshot()).toEqual(ledger.exportSnapshot());
  const draft = reopened.createDraft();
  const before = draft.snapshot();
  const result = draft.insert({
    containerId: "crate:colony",
    itemDefinitionId: "item:storage-crate-kit",
    quantity: 1,
    condition: null,
    operationId: "fill:kit",
    generatedOrdinal: 0,
  });
  if (typeof result === "string") expect(draft.snapshot()).toEqual(before);
  else {
    // Fill successive distinct kits until the researched absolute budget rejects.
    let rejected = false;
    for (let i = 1; i < 30; i++) {
      const prior = draft.snapshot();
      const next = draft.insert({
        containerId: "crate:colony",
        itemDefinitionId: "item:storage-crate-kit",
        quantity: 1,
        condition: null,
        operationId: "fill:" + String(i),
        generatedOrdinal: 0,
      });
      if (typeof next === "string") {
        expect(next).toMatch(/^TARGET_CAPACITY_/);
        expect(draft.snapshot()).toEqual(prior);
        rejected = true;
        break;
      }
    }
    expect(rejected).toBe(true);
  }
});
