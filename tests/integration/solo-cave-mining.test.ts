import { expect, it } from "vitest";
import { createPhase1ContentCatalog } from "../../src/content";
import { resourceHarvestDefinition } from "../../src/content/livingworld/ResourceSizeProfiles";
import { SoloCaveAuthority } from "../../src/simulation/worldspaces/SoloCaveAuthority";
import {
  CAVE_TEMPLATE_IDS,
  generateCaveLayout,
} from "../../src/world/phase2/ColonyCaveLayout";
import {
  Phase1ItemAuthority,
  type GatherCostPort,
} from "../../src/simulation/items";
import { EXPEDITION_PLAYER_CARRY } from "../../src/simulation/items/ItemCapacity";
import { Phase1SurvivalAuthority } from "../../src/simulation/survival/SurvivalAuthority";
import { SurvivalGatherCostPort } from "../../src/simulation/survival/SurvivalGatherCostPort";
it("real cave mining spends tool condition and stamina once, retains finite depletion on reconstruction and rejects capacity without consuming the node", () => {
  const catalog = createPhase1ContentCatalog(),
    portals = CAVE_TEMPLATE_IDS.map((id, i) => ({
      id: "portal:" + id,
      position: { x: 100 + i * 50, y: 100 },
      layout: generateCaveLayout("mining-fixture", "portal:" + id, id),
    })),
    actor = { playerId: "solo", position: { x: 100, y: 100 }, alive: true };
  const services = {
    actor: () => actor,
    surfaceExplored: () => true,
    surfaceStandable: () => true,
    relocate: (p: { x: number; y: number }) => {
      actor.position = p;
    },
    cancelActions: () => {},
  };
  const cave = new SoloCaveAuthority(portals, services);
  cave.transition({
    id: "enter",
    expectedRevision: 0,
    action: "enter",
    portalId: portals[0]!.id,
  });
  const deferred: GatherCostPort = {
    canStartGather: (...args) => cost.canStartGather(...args),
    reserveGatherCost: (r) => cost.reserveGatherCost(r),
    commitReservedGatherCost: (r) => cost.commitReservedGatherCost(r),
    releaseGatherCostReservation: (r) => cost.releaseGatherCostReservation(r),
  };
  const items = new Phase1ItemAuthority({
    catalog,
    world: cave,
    gatherCost: deferred,
    playerCarryPolicy: EXPEDITION_PLAYER_CARRY,
    initialLedger: {
      containers: [
        {
          containerId: "inventory:solo",
          kind: "player-inventory",
          ownerPlayerId: "solo",
          revision: 0,
          stacks: [
            {
              stackId: "tool",
              itemDefinitionId: "item:stone-field-tool",
              quantity: 1,
              condition: 100,
            },
          ],
        },
      ],
    },
  });
  const survival = new Phase1SurvivalAuthority({ catalog, items });
  survival.registerPlayer("solo");
  const cost = new SurvivalGatherCostPort(catalog, survival);
  const node = portals[0]!.layout.nodes[0]!;
  // Explicit authority-query fixture places an actor at an authored node; not a novice portal journey.
  actor.position = node.position;
  cave.synchronizePose();
  expect(cave.getResource(node.id)?.depleted).toBe(false);
  const request = {
    operationId: "mine",
    playerId: "solo",
    inventoryContainerId: "inventory:solo",
    expectedInventoryRevision: 0,
    resourceEntityId: node.id,
    expectedResourceRevision: 0,
    toolStackId: "tool",
  };
  const start = items.beginGather(request);
  expect(start.status).toBe("started");
  if (start.status !== "started") throw Error("Mine did not start");
  for (let i = 0; i < start.requiredTicks; i++) items.tickGather("solo");
  const effective = resourceHarvestDefinition(
    catalog.getAs(node.resourceDefinitionId, "resource"),
    cave.getResource(node.id)!.size,
  );
  expect(
    items
      .getContainerView("inventory:solo")
      .stacks.find((s) => s.itemDefinitionId === effective.output.itemId)
      ?.quantity,
  ).toBe(effective.output.quantity);
  expect(
    items
      .getContainerView("inventory:solo")
      .stacks.find((s) => s.stackId === "tool")?.condition,
  ).toBe(100 - effective.toolConditionCostPerSuccessfulGather);
  expect(survival.getPlayerState("solo").staminaMilli).toBe(95000);
  expect(cave.getResource(node.id)).toMatchObject({
    depleted: true,
    remainingActions: 0,
    revision: 1,
  });
  const ledger = items.exportLedgerSnapshot();
  items.beginGather(request);
  expect(items.exportLedgerSnapshot()).toEqual(ledger);
  expect(survival.getPlayerState("solo").staminaMilli).toBe(95000);
  const saved = cave.read(),
    reopened = new SoloCaveAuthority(portals, services, saved);
  expect(reopened.getResource(node.id)).toMatchObject({
    depleted: true,
    revision: 1,
  });
  expect(reopened.commitGather(node.id, 0)).toBe(null);
  const nextNode = portals[0]!.layout.nodes[1]!;
  actor.position = nextNode.position;
  cave.synchronizePose();
  expect(
    items.commitColonyExchange({
      operationId: "fixture:fill",
      playerId: "solo",
      expectedInventoryRevision:
        items.getContainerView("inventory:solo").revision,
      inputs: [],
      outputs: [
        { itemDefinitionId: "item:metal-ore", quantity: 20 },
        {
          itemDefinitionId: "item:metal-ore",
          quantity: 10 - node.yieldQuantity,
        },
      ],
    }).status,
  ).toBe("committed");
  const before = items.exportLedgerSnapshot(),
    beforeWorld = cave.read(),
    stamina = survival.getPlayerState("solo").staminaMilli;
  const full = items.beginGather({
    ...request,
    operationId: "full",
    resourceEntityId: nextNode.id,
    expectedInventoryRevision:
      items.getContainerView("inventory:solo").revision,
  });
  if (full.status === "started")
    for (let i = 0; i < full.requiredTicks; i++) items.tickGather("solo");
  expect(items.exportLedgerSnapshot()).toEqual(before);
  expect(cave.read()).toEqual(beforeWorld);
  expect(survival.getPlayerState("solo").staminaMilli).toBe(stamina);
});
