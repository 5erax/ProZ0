import { expect, it } from "vitest";
import { createPhase1ContentCatalog } from "../../src/content";
import { SoloCaveAuthority } from "../../src/simulation/worldspaces/SoloCaveAuthority";
import { SoloWorldspaceWorldAdapter } from "../../src/integration/worldspaces/SoloWorldspaceWorldAdapter";
import { Phase1ItemAuthority } from "../../src/simulation/items";
import {
  CAVE_TEMPLATE_IDS,
  generateCaveLayout,
} from "../../src/world/phase2/ColonyCaveLayout";
import { Phase1SurvivalTestWorld } from "../support/Phase1SurvivalTestWorld";
import type { WorldCollisionQuery } from "../../src/world/api/WorldCollisionQuery";
it("real item transactions cannot gather or craft with surface objects inside a cave; dropped cargo stays in its own space and respawn returns to surface", () => {
  const portals = CAVE_TEMPLATE_IDS.map((id, i) => ({
      id: "portal:" + id,
      position: { x: 100 + i * 50, y: 100 },
      layout: generateCaveLayout("router-fixture", "portal:" + id, id),
    })),
    actor = { playerId: "solo", position: { x: 100, y: 100 }, alive: true };
  const surface = Object.assign(new Phase1SurvivalTestWorld(), {
    sweepAabbAxis: ((r) => ({
      allowedDelta: r.desiredDelta,
      blocked: false,
    })) as WorldCollisionQuery["sweepAabbAxis"],
  });
  surface.setPlayerPosition("solo", actor.position);
  surface.addResource({
    resourceEntityId: "resource:surface",
    resourceDefinitionId: "resource:fiber-plant",
    revision: 0,
    remainingActions: 4,
    depleted: false,
  });
  surface.addWorkbench({
    structureInstanceId: "workbench:surface",
    revision: 0,
    functional: true,
  });
  surface.addPredator({
    entityId: "predator:surface",
    position: portals[0]!.layout.spawn,
    encounterAnchor: portals[0]!.layout.spawn,
    revision: 0,
    health: 20,
    state: "chase",
    targetPlayerId: "solo",
    stateUntilTick: null,
    outsideLeashTicks: 0,
  });
  const cave = new SoloCaveAuthority(portals, {
      actor: () => actor,
      surfaceExplored: () => true,
      surfaceStandable: () => true,
      relocate: (p) => {
        actor.position = p;
      },
      cancelActions: () => {},
    }),
    router = new SoloWorldspaceWorldAdapter(surface, () => cave);
  const items = new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world: router,
    initialLedger: {
      containers: [
        {
          containerId: "inventory:solo",
          kind: "player-inventory",
          ownerPlayerId: "solo",
          revision: 0,
          stacks: [
            {
              stackId: "fiber",
              itemDefinitionId: "item:plant-fiber",
              quantity: 6,
              condition: null,
            },
            {
              stackId: "cordage",
              itemDefinitionId: "item:cordage",
              quantity: 1,
              condition: null,
            },
          ],
        },
      ],
    },
  });
  expect(router.getPredator("predator:surface")).not.toBe(null);
  expect(router.getWorkbench("workbench:surface")).not.toBe(null);
  cave.transition({
    id: "enter",
    expectedRevision: 0,
    action: "enter",
    portalId: portals[0]!.id,
  });
  expect(router.getPredator("predator:surface")).toBe(null);
  expect(router.getResource("resource:surface")).toBe(null);
  expect(router.getEnvironmentExposure("solo")).toEqual({
    thermalTarget: 40,
    sheltered: true,
  });
  expect(() => router.getEnvironmentExposure("foreign-player")).toThrow(
    "Unknown cave player",
  );
  const inventory = items.exportLedgerSnapshot();
  expect(
    items.beginGather({
      operationId: "cross-gather",
      playerId: "solo",
      inventoryContainerId: "inventory:solo",
      expectedInventoryRevision: 0,
      resourceEntityId: "resource:surface",
      expectedResourceRevision: 0,
    }).status,
  ).toBe("rejected");
  const craft = {
    type: "craft" as const,
    operationId: "cross-craft",
    playerId: "solo",
    inventoryContainerId: "inventory:solo",
    expectedInventoryRevision: 0,
    recipeId: "recipe:thermal-wrap",
    workbench: {
      structureInstanceId: "workbench:surface",
      expectedRevision: 0,
    },
  };
  expect(items.execute(craft).status).toBe("rejected");
  expect(items.exportLedgerSnapshot()).toEqual(inventory);
  expect(
    items.execute({
      type: "drop",
      operationId: "cave-drop",
      playerId: "solo",
      inventoryContainerId: "inventory:solo",
      expectedInventoryRevision: 0,
      sourceStackId: "fiber",
      quantity: 2,
    }).status,
  ).toBe("committed");
  const drop = cave.read().spaces[0]!.drops[0]!,
    worldDrop = router.getWorldDrop(drop.worldDropId)!;
  expect(worldDrop.available).toBe(true);
  expect(items.getContainerView(drop.containerId).stacks[0]!.quantity).toBe(2);
  actor.position = portals[0]!.layout.exit;
  cave.synchronizePose();
  cave.transition({
    id: "exit",
    expectedRevision: cave.read().revision,
    action: "exit",
  });
  expect(router.getWorldDrop(drop.worldDropId)).toBe(null);
  expect(router.isContainerAccessible("solo", drop.containerId)).toBe(false);
  const pickup = {
    type: "pickup" as const,
    operationId: "cross-pickup",
    playerId: "solo",
    inventoryContainerId: "inventory:solo",
    expectedInventoryRevision:
      items.getContainerView("inventory:solo").revision,
    worldDropId: drop.worldDropId,
    expectedWorldDropRevision: 0,
    expectedDropContainerRevision: 0,
  };
  expect(items.execute(pickup).status).toBe("rejected");
  expect(items.getContainerView(drop.containerId).stacks[0]!.quantity).toBe(2);
  cave.transition({
    id: "reenter",
    expectedRevision: cave.read().revision,
    action: "enter",
    portalId: portals[0]!.id,
  });
  expect(
    items.execute({ ...pickup, operationId: "recover-cave-drop" }).status,
  ).toBe("committed");
  expect(router.getWorldDrop(drop.worldDropId)).toBe(null);
  expect(
    items
      .getContainerView("inventory:solo")
      .stacks.find((s) => s.itemDefinitionId === "item:plant-fiber")!.quantity,
  ).toBe(6);
  const reservation = router.reserveDeathCachePlacement({
    deathId: "death:router",
    ownerPlayerId: "solo",
    requestedPosition: actor.position,
  });
  const cache = router.commitReservedDeathCache({
    entityId: "cache:router",
    deathId: "death:router",
    ownerPlayerId: "solo",
    containerId: "death-cache:router",
    reservation,
  });
  expect(cave.read().spaces[0]!.deathCaches).toContainEqual(cache);
  const respawn = router.reservePlayerRespawn("solo")!;
  router.commitReservedPlayerRespawn(respawn);
  expect(cave.isSurface()).toBe(true);
  expect(actor.position).toEqual({ x: 0, y: 0 });
  expect(router.getDeathCacheByContainer("death-cache:router")).toBe(null);
  expect(router.getPredator("predator:surface")).not.toBe(null);
  actor.position = portals[0]!.position;
  cave.synchronizePose();
  cave.transition({
    id: "cache-reenter",
    expectedRevision: cave.read().revision,
    action: "enter",
    portalId: portals[0]!.id,
  });
  expect(router.getDeathCacheByContainer("death-cache:router")).toEqual(cache);
});
