import { expect, it } from "vitest";
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from "../../src/integration";
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
} from "../../src/persistence";
import { fromWorldPosition } from "../../src/world";

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const mutable = <T>(value: T): Mutable<T> =>
  structuredClone(value) as Mutable<T>;
const config = {
  worldId: "world:cave-save",
  worldSeed: "cave-save-fixture",
  playerIds: ["solo"],
  colonyDepthEnabled: true,
  singlePlayerExpeditionEnabled: true,
  soloCavesEnabled: true,
  worldGenerationVersion: 5,
  interactionRangeWorldUnits: 1.25,
  spawnClearanceRadiusWorldUnits: 1.25,
  requiredAccessRadiusWorldUnits: 1.25,
};
function portable(bundle: Phase1AuthorityBundle) {
  const r = composePhase1SaveV2(bundle, { nowUtc: "2026-10-03T00:00:00.000Z" });
  return {
    formatId: SAVE_FORMAT_ID,
    schemaVersion: SAVE_SCHEMA_VERSION_V2,
    recordKind: "portable-bundle" as const,
    world: r.world,
    players: r.players,
    containers: r.containers,
    chunks: r.chunks,
    footholds: r.footholds,
    structures: r.structures,
  };
}
async function enter(bundle: Phase1AuthorityBundle, ordinal = 0) {
  const cave = bundle.caves!,
    portal = cave.portals[ordinal]!;
  // Explicit subsystem fixture relocation; browser exploration has a separate gate.
  await bundle.world.activateCoord(fromWorldPosition(portal.position));
  await bundle.worldStore.revealResolvedPlayerPosition(portal.position, 6.25);
  bundle.getRuntime("solo").relocatePlayer(portal.position);
  cave.synchronizePose();
  expect(
    cave.transition({
      id: "enter:" + ordinal + ":" + cave.read().revision,
      expectedRevision: cave.read().revision,
      action: "enter",
      portalId: portal.id,
    }).status,
  ).toBe("committed");
}
it("round-trips real cave ledger cargo and local movement, rejects forged cross-space owners and preserves the untouched surface generator", async () => {
  const bundle = await Phase1AuthorityBundle.create(config);
  let reopened: Phase1AuthorityBundle | undefined;
  try {
    await bundle.stepSolo();
    const beforeSurface = bundle.world
      .getActiveChunkViews()
      .map((v) => ({
        key: v.base.coord,
        fingerprint: v.delta.baseGenerationFingerprint,
      }));
    await enter(bundle);
    expect(
      bundle.items.commitColonyExchange({
        operationId: "fixture-fiber",
        playerId: "solo",
        expectedInventoryRevision: 0,
        inputs: [],
        outputs: [{ itemDefinitionId: "item:plant-fiber", quantity: 3 }],
      }).status,
    ).toBe("committed");
    const inventory = bundle.items.getContainerView("inventory:solo"),
      fiber = inventory.stacks.find(
        (s) => s.itemDefinitionId === "item:plant-fiber",
      )!;
    expect(
      bundle.items.execute({
        type: "drop",
        operationId: "cave-drop-save",
        playerId: "solo",
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
        sourceStackId: fiber.stackId,
        quantity: 2,
      }).status,
    ).toBe("committed");
    bundle.submitInput("solo", {
      moveUp: false,
      moveDown: false,
      moveLeft: true,
      moveRight: false,
    });
    for (let i = 0; i < 60; i++) await bundle.stepSolo();
    bundle.submitInput("solo", {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false,
    });
    const saved = portable(bundle),
      policy = createPhase1SaveV2Compatibility(bundle.catalog, [5]);
    expect(saved.world.soloCaves!.actor.location.position).toEqual(
      bundle.getPlayerPosition("solo"),
    );
    expect(
      saved.chunks
        .flatMap((c) => c.createdEntities)
        .some(
          (e) =>
            e.entityId ===
            saved.world.soloCaves!.spaces[0]!.drops[0]!.worldDropId,
        ),
    ).toBe(false);
    const restored = reconstructPhase1ReopenState(saved, policy);
    expect(restored.ok, JSON.stringify(restored)).toBe(true);
    if (!restored.ok) throw Error(restored.message);
    reopened = await Phase1AuthorityBundle.create({
      ...config,
      reopen: restored.value,
    });
    expect(reopened.caves!.read()).toEqual(bundle.caves!.read());
    expect(reopened.items.exportLedgerSnapshot()).toEqual(
      bundle.items.exportLedgerSnapshot(),
    );
    await reopened.stepSolo();
    expect(
      reopened.world.isResourceInInteractionRange(
        "solo",
        reopened.world
          .getActiveGeneratedEntities()
          .find((e) => e.type === "resource")!.entityId,
      ),
    ).toBe(false);
    expect(
      reopened.expedition!.interact({
        id: "cross-lab",
        playerId: "solo",
        target: "landing-lab",
        action: "supplies",
        expectedRevision: reopened.expedition!.read().revision,
        expectedInventoryRevision:
          reopened.items.getContainerView("inventory:solo").revision,
      }).message,
    ).toBe("WRONG_WORLDSPACE");
    const drop = saved.world.soloCaves!.spaces[0]!.drops[0]!;
    const wrongOwner = mutable(saved);
    wrongOwner.containers.find(
      (c) => c.containerId === drop.containerId,
    )!.owner = { type: "world-entity", entityId: "surface:forged" };
    expect(reconstructPhase1ReopenState(wrongOwner, policy).ok).toBe(false);
    const wrongInventory = mutable(saved);
    wrongInventory.world.soloCaves!.spaces[0]!.drops[0]!.containerId =
      "inventory:solo";
    expect(reconstructPhase1ReopenState(wrongInventory, policy).ok).toBe(false);
    const wrongActor = mutable(saved);
    wrongActor.players[0]!.position = { x: 0, y: 0 };
    expect(reconstructPhase1ReopenState(wrongActor, policy).ok).toBe(false);
    const future = mutable(saved);
    (future.world.soloCaves as unknown as { version: number }).version = 2;
    expect(reconstructPhase1ReopenState(future, policy).ok).toBe(false);
    await expect(
      Phase1AuthorityBundle.create({
        ...config,
        soloCavesEnabled: false,
        reopen: restored.value,
      }),
    ).rejects.toThrow("Cave saves require");
    for (const initial of beforeSurface)
      expect(
        bundle.world
          .getActiveChunkViews()
          .find(
            (v) =>
              v.base.coord.x === initial.key.x &&
              v.base.coord.y === initial.key.y,
          )!.delta.baseGenerationFingerprint,
      ).toBe(initial.fingerprint);
  } finally {
    await reopened?.destroy();
    await bundle.destroy();
  }
});

it("real death moves all carried cargo into the current cave, resumes pending respawn after reopen, and recovers only after re-entry", async () => {
  const bundle = await Phase1AuthorityBundle.create({
    ...config,
    worldId: "world:cave-death",
  });
  let reopened: Phase1AuthorityBundle | undefined;
  try {
    await enter(bundle);
    await bundle.stepSolo();
    const inventory = bundle.items.getContainerView("inventory:solo");
    expect(inventory.stacks.length).toBeGreaterThan(0);
    bundle.survival.applyAuthorityDamage({
      damageId: "fixture-lethal-cave",
      targetPlayerId: "solo",
      sourceEntityId: null,
      sourceType: "critical-starvation",
      amount: 100,
      tick: bundle.authorityTick,
    });
    await bundle.stepSolo();
    const dead = bundle.survival.getPlayerState("solo");
    expect(dead.lifeState.type).toBe("dead-pending-respawn");
    const cache = bundle.caves!.read().spaces[0]!.deathCaches[0]!;
    expect(bundle.items.getContainerView(cache.containerId).stacks).toEqual(
      inventory.stacks,
    );
    const saved = portable(bundle),
      restored = reconstructPhase1ReopenState(
        saved,
        createPhase1SaveV2Compatibility(bundle.catalog, [5]),
      );
    expect(restored.ok, JSON.stringify(restored)).toBe(true);
    if (!restored.ok) throw Error(restored.message);
    reopened = await Phase1AuthorityBundle.create({
      ...config,
      worldId: "world:cave-death",
      reopen: restored.value,
    });
    const state = reopened.survival.getPlayerState("solo");
    if (state.lifeState.type !== "dead-pending-respawn")
      throw Error("Expected pending respawn");
    while (reopened.authorityTick <= state.lifeState.respawnAtTick)
      await reopened.stepSolo();
    expect(reopened.caves!.isSurface()).toBe(true);
    expect(reopened.getPlayerPosition("solo")).toEqual({ x: 0, y: 0 });
    expect(
      reopened.interactionWorld.isContainerAccessible(
        "solo",
        cache.containerId,
      ),
    ).toBe(false);
    await enter(reopened);
    const contents = reopened.items.getContainerView(cache.containerId),
      carried = reopened.items.getContainerView("inventory:solo");
    expect(
      reopened.death.recoverFromDeathCache({
        type: "transfer",
        operationId: "recover-cave-tool",
        playerId: "solo",
        sourceContainerId: cache.containerId,
        sourceExpectedRevision: contents.revision,
        targetContainerId: carried.containerId,
        targetExpectedRevision: carried.revision,
        sourceStackId: contents.stacks[0]!.stackId,
        quantity: 1,
      }).status,
    ).toBe("committed");
    expect(reopened.caves!.read().spaces[0]!.deathCaches).toHaveLength(0);
    expect(
      reconstructPhase1ReopenState(
        portable(reopened),
        createPhase1SaveV2Compatibility(reopened.catalog, [5]),
      ).ok,
    ).toBe(true);
  } finally {
    await reopened?.destroy();
    await bundle.destroy();
  }
});

it("preserves real death cargo at Landing when the active cave has 32 occupied caches", async () => {
  const bundle = await Phase1AuthorityBundle.create({
    ...config,
    worldId: "world:cave-recovery-cap",
  });
  try {
    await enter(bundle);
    // Fill the bounded recovery registry with real item containers. This is a
    // capacity fixture, not 32 natural player deaths or free runtime material.
    for (let i = 0; i < 32; i++) {
      const deathId = "fixture-cap:" + i,
        inventory = bundle.items.getContainerView("inventory:solo");
      const reservation = bundle.interactionWorld.reserveDeathCachePlacement({
        deathId,
        ownerPlayerId: "solo",
        requestedPosition: bundle.getPlayerPosition("solo"),
      });
      const items = bundle.items.commitDeathCacheItems({
        deathId,
        operationId: "fixture-cache:" + i,
        playerId: "solo",
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
        equippedStackIds: [],
      });
      expect(items.status).toBe("committed");
      if (items.status !== "committed" || !items.cacheContainerId)
        throw Error("Expected real cache cargo");
      bundle.interactionWorld.commitReservedDeathCache({
        deathId,
        ownerPlayerId: "solo",
        entityId: "fixture-cache-entity:" + i,
        containerId: items.cacheContainerId,
        reservation,
      });
      expect(
        bundle.items.commitColonyExchange({
          operationId: "fixture-next:" + i,
          playerId: "solo",
          expectedInventoryRevision:
            bundle.items.getContainerView("inventory:solo").revision,
          inputs: [],
          outputs: [{ itemDefinitionId: "item:plant-fiber", quantity: 1 }],
        }).status,
      ).toBe("committed");
    }
    await bundle.stepSolo();
    const cargo = bundle.items.getContainerView("inventory:solo").stacks;
    bundle.survival.applyAuthorityDamage({
      damageId: "fixture-overflow-lethal",
      targetPlayerId: "solo",
      sourceEntityId: null,
      sourceType: "critical-starvation",
      amount: 100,
      tick: bundle.authorityTick,
    });
    await bundle.stepSolo();
    expect(bundle.survival.getPlayerState("solo").lifeState.type).toBe(
      "dead-pending-respawn",
    );
    expect(bundle.caves!.read().spaces[0]!.deathCaches).toHaveLength(32);
    const surfaceCache = bundle.world.exportSnapshot().deathCaches.caches[0]!;
    expect(surfaceCache.position).toEqual({ x: 0, y: 0 });
    expect(
      bundle.items.getContainerView(surfaceCache.containerId).stacks,
    ).toEqual(cargo);
    const saved = portable(bundle),
      restored = reconstructPhase1ReopenState(
        saved,
        createPhase1SaveV2Compatibility(bundle.catalog, [5]),
      );
    expect(restored.ok, JSON.stringify(restored)).toBe(true);
  } finally {
    await bundle.destroy();
  }
});
