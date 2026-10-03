import { expect, it } from "vitest";
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from "../../src/integration";
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
} from "../../src/persistence";
import { expeditionFacility } from "../../src/content/singleplayer/ExpeditionContent";
import type { ExpeditionCommand } from "../../src/simulation/expedition/ExpeditionAuthority";
const config = {
  worldId: "world:field-footprints",
  worldSeed: "p1-world-golden",
  playerIds: ["solo"],
  singlePlayerExpeditionEnabled: true,
  colonyDepthEnabled: true,
  interactionRangeWorldUnits: 1.25,
  spawnClearanceRadiusWorldUnits: 0,
  requiredAccessRadiusWorldUnits: 0,
};
it("a real large facility blocks its full edge after reopen and relocation checks the same dimensions", async () => {
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    const runtime = bundle.getRuntime("solo");
    await bundle.stepSolo();
    const a = bundle.expedition!;
    const run = (
      id: string,
      action: ExpeditionCommand["action"],
      target: string,
      extra: Partial<ExpeditionCommand> = {},
    ) =>
      a.execute({
        id,
        action,
        target,
        playerId: "solo",
        expectedRevision: a.read().revision,
        expectedInventoryRevision:
          bundle.items.getContainerView("inventory:solo").revision,
        ...extra,
      });
    let point: { x: number; y: number } | null = null;
    for (let y = -4; y <= 4 && !point; y += 0.5)
      for (let x = -4; x <= 4 && !point; x += 0.5) {
        if (
          Math.hypot(x, y) <= 4 &&
          a.assessPreview("solo", "livestock-pen", x, y, 0) === null
        )
          point = { x, y };
      }
    expect(point).not.toBe(null);
    if (!point) throw Error("No terrain fixture");
    expect(run("pen", "plan", "livestock-pen", point).status).toBe("committed");
    expect(
      bundle.items.commitColonyExchange({
        operationId: "fixture:materials",
        playerId: "solo",
        expectedInventoryRevision: 0,
        inputs: [],
        outputs: expeditionFacility("livestock-pen")!.costs.map(
          ([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }),
        ),
      }).status,
    ).toBe("committed");
    expect(run("deposit", "deposit", "plan:pen").status).toBe("committed");
    expect(run("complete", "complete", "plan:pen").status).toBe("committed");
    const f = a.read().facilities[0]!;
    expect(f.footprintVersion).toBe(1);
    const edge = { x: f.x - 1.8, y: f.y + 0.8 };
    const query = {
      center: edge,
      footprint: { halfWidth: 0.25, halfDepth: 0.25 },
      axis: "x" as const,
      desiredDelta: 0.1,
    };
    expect(bundle.world.sweepAabbAxis(query).blocked).toBe(true);
    expect(a.blocksFieldGround(f.x + 1.4, f.y + 0.8)).toBe(true);
    expect(a.blocksFieldGround(f.x + 2.1, f.y)).toBe(false);
    const save = composePhase1SaveV2(bundle, {
      nowUtc: "2026-10-03T00:00:00Z",
    });
    const portable = {
      ...save,
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: "portable-bundle" as const,
    };
    const compatibility = createPhase1SaveV2Compatibility(bundle.catalog, [
      save.world.generationVersion,
    ]);
    const result = reconstructPhase1ReopenState(portable, compatibility);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) throw Error(result.message);
    const reopened = await Phase1AuthorityBundle.create({
      ...config,
      reopen: result.value,
    });
    try {
      expect(reopened.world.sweepAabbAxis(query).blocked).toBe(true);
      expect(reopened.expedition!.facilityFootprint(f.id)).toEqual({
        width: 3,
        depth: 2.5,
      });
    } finally {
      await reopened.destroy();
    }
    const old = {
      ...portable,
      world: {
        ...portable.world,
        singlePlayerExpedition: {
          ...a.read(),
          facilities: a
            .read()
            .facilities.map(({ footprintVersion, ...other }) => {
              void footprintVersion;
              return other;
            }),
        },
      },
    };
    const oldResult = reconstructPhase1ReopenState(old, compatibility);
    expect(oldResult.ok).toBe(true);
    if (!oldResult.ok) throw Error(oldResult.message);
    const legacy = await Phase1AuthorityBundle.create({
      ...config,
      reopen: oldResult.value,
    });
    try {
      expect(legacy.world.sweepAabbAxis(query).blocked).toBe(false);
      expect(legacy.expedition!.facilityFootprint(f.id)).toEqual({
        width: 1.25,
        depth: 0.75,
      });
    } finally {
      await legacy.destroy();
    }
    runtime.relocatePlayer({ x: f.x, y: f.y + 2 }, "N");
    const ledger = bundle.items.exportLedgerSnapshot();
    expect(a.assessRelocationPreview("solo", f.id, 0, 0, 1)).not.toBe(null);
    expect(bundle.items.exportLedgerSnapshot()).toEqual(ledger);
  } finally {
    await bundle.destroy();
  }
});
it("funded escrow refunds to an accessible real crate when the bag is full, once across reopen, and rejects distant/stale/full targets without loss", async () => {
  const bundle = await Phase1AuthorityBundle.create({
    ...config,
    worldId: "world:field-refunds",
  });
  try {
    bundle.getRuntime("solo");
    await bundle.stepSolo();
    const a = bundle.expedition!;
    const run = (
      id: string,
      action: ExpeditionCommand["action"],
      target: string,
      extra: Partial<ExpeditionCommand> = {},
    ) =>
      a.execute({
        id,
        action,
        target,
        playerId: "solo",
        expectedRevision: a.read().revision,
        expectedInventoryRevision:
          bundle.items.getContainerView("inventory:solo").revision,
        ...extra,
      });
    const grant = (
      id: string,
      outputs: { itemDefinitionId: string; quantity: number }[],
    ) =>
      bundle.items.commitColonyExchange({
        operationId: id,
        playerId: "solo",
        expectedInventoryRevision:
          bundle.items.getContainerView("inventory:solo").revision,
        inputs: [],
        outputs,
      });
    let placed = false;
    for (const [x, y] of [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
      [2, 2],
      [-2, -2],
    ] as const) {
      if (
        run("cache", "plan", "supply-cache", { x, y }).status === "committed"
      ) {
        placed = true;
        break;
      }
    }
    expect(placed).toBe(true);
    expect(
      grant(
        "fixture:cache",
        expeditionFacility("supply-cache")!.costs.map(
          ([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }),
        ),
      ).status,
    ).toBe("committed");
    expect(run("cache-deposit", "deposit", "plan:cache").status).toBe(
      "committed",
    );
    expect(run("cache-complete", "complete", "plan:cache").status).toBe(
      "committed",
    );
    const crate = bundle.buildings.getStructure(
      a.read().facilities[0]!.canonicalStructureId!,
    )!;
    placed = false;
    for (let y = -3; y <= 3 && !placed; y++)
      for (let x = -3; x <= 3 && !placed; x++) {
        if (
          Math.hypot(x, y) <= 4 &&
          Math.hypot(x - crate.position.x, y - crate.position.y) <= 3 &&
          run("plan", "plan", "camp-bed", { x, y }).status === "committed"
        )
          placed = true;
      }
    expect(placed).toBe(true);
    expect(
      grant(
        "fixture:bed",
        expeditionFacility("camp-bed")!.costs.map(
          ([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity }),
        ),
      ).status,
    ).toBe("committed");
    expect(run("bed-deposit", "deposit", "plan:plan").status).toBe("committed");
    expect(
      grant("fixture:full-bag", [
        { itemDefinitionId: "item:metal-ore", quantity: 20 },
        { itemDefinitionId: "item:metal-ore", quantity: 10 },
      ]).status,
    ).toBe("committed");
    bundle
      .getRuntime("solo")
      .relocatePlayer(
        {
          x: crate.position.x - Math.sign(crate.position.x),
          y: crate.position.y - Math.sign(crate.position.y),
        },
        "N",
      );
    const command: ExpeditionCommand = {
      id: "cancel-refund",
      action: "cancel",
      target: "plan:plan",
      playerId: "solo",
      expectedRevision: a.read().revision,
      expectedInventoryRevision:
        bundle.items.getContainerView("inventory:solo").revision,
    };
    const bag = bundle.items.getContainerView("inventory:solo");
    expect(
      a.execute({
        ...command,
        expectedInventoryRevision: command.expectedInventoryRevision - 1,
      }).message,
    ).toBe("STALE_INVENTORY_REVISION");
    expect(a.read().plans).toHaveLength(1);
    expect(
      bundle.items.getContainerView(crate.containerId!).stacks,
    ).toHaveLength(0);
    expect(a.execute(command).message).toBe("PLAN_REFUNDED_TO_STORAGE");
    expect(a.read().plans).toHaveLength(0);
    expect(bundle.items.getContainerView("inventory:solo")).toEqual(bag);
    expect(
      bundle.items
        .getContainerView(crate.containerId!)
        .stacks.map((s) => [s.itemDefinitionId, s.quantity]),
    ).toEqual([
      ["item:timber", 2],
      ["item:plant-fiber", 4],
    ]);
    const ledger = bundle.items.exportLedgerSnapshot();
    expect(a.execute(command).message).toBe("PLAN_REFUNDED_TO_STORAGE");
    expect(bundle.items.exportLedgerSnapshot()).toEqual(ledger);
    const save = composePhase1SaveV2(bundle, {
        nowUtc: "2026-10-03T00:00:00Z",
      }),
      result = reconstructPhase1ReopenState(
        {
          ...save,
          formatId: SAVE_FORMAT_ID,
          schemaVersion: SAVE_SCHEMA_VERSION_V2,
          recordKind: "portable-bundle",
        },
        createPhase1SaveV2Compatibility(bundle.catalog, [
          save.world.generationVersion,
        ]),
      );
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.message);
    const reopened = await Phase1AuthorityBundle.create({
      ...config,
      worldId: "world:field-refunds",
      reopen: result.value,
    });
    try {
      expect(reopened.expedition!.execute(command).message).toBe(
        "PLAN_REFUNDED_TO_STORAGE",
      );
      expect(reopened.items.exportLedgerSnapshot()).toEqual(ledger);
      expect(
        reopened.items.commitColonyRefund({
          operationId: "fixture:fill-crate",
          playerId: "solo",
          expectedInventoryRevision: bag.revision,
          outputs: Array.from({ length: 5 }, () => ({
            itemDefinitionId: "item:timber",
            quantity: 10,
          })),
        }).status,
      ).toBe("committed");
      const full = reopened.items.exportLedgerSnapshot();
      expect(
        reopened.items.commitColonyRefund({
          operationId: "fixture:both-full",
          playerId: "solo",
          expectedInventoryRevision: bag.revision,
          outputs: [
            { itemDefinitionId: "item:plant-fiber", quantity: 1 },
            { itemDefinitionId: "item:timber", quantity: 10 },
          ],
        }).status,
      ).toBe("rejected");
      expect(reopened.items.exportLedgerSnapshot()).toEqual(full);
      reopened.getRuntime("solo").relocatePlayer({ x: 20, y: 20 }, "N");
      const before = reopened.items.exportLedgerSnapshot();
      expect(
        reopened.items.commitColonyRefund({
          operationId: "fixture:distant",
          playerId: "solo",
          expectedInventoryRevision: bag.revision,
          outputs: [{ itemDefinitionId: "item:timber", quantity: 2 }],
        }).status,
      ).toBe("rejected");
      expect(reopened.items.exportLedgerSnapshot()).toEqual(before);
    } finally {
      await reopened.destroy();
    }
  } finally {
    await bundle.destroy();
  }
});
