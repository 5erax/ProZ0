import { expect, it } from "vitest";
import { Phase1AuthorityBundle } from "../../src/integration/Phase1AuthorityBundle";
import { composePhase1SaveV2 } from "../../src/integration/Phase1SaveV2Composer";
import {
  validateColonyDepthState,
  emptyColonyDepthState,
} from "../../src/simulation/colony/ColonyDepthAuthority";
import {
  colonyLandscapeTerrainAt,
  colonySurveySites,
} from "../../src/world/phase2/ColonyRegions";
import { PHASE1_STRUCTURE_PLACEMENT_PROFILES } from "../../src/world/building/Phase1BuildingWorld";
import { reconstructPhase1ReopenState } from "../../src/persistence/integration/Phase1ReopenState";
import { createPhase1SaveV2Compatibility } from "../../src/persistence/validation/SaveValidatorV2";

const config = {
  worldId: "priority-world",
  worldSeed: "p1-world-golden",
  playerIds: ["early", "late"],
  colonyDepthEnabled: true,
  interactionRangeWorldUnits: 1.25,
  spawnClearanceRadiusWorldUnits: 1.25,
  requiredAccessRadiusWorldUnits: 1.25,
};
it("late admission is immediately coherent with the live save tick", async () => {
  const bundle = await Phase1AuthorityBundle.create({
    ...config,
    activatePlayersOnCreate: false,
  });
  try {
    bundle.createPlayerRuntime("early");
    for (let n = 0; n < 120; n++) await bundle.stepSolo();
    bundle.createPlayerRuntime("late");
    expect(bundle.survival.getPlayerState("late").tick).toBe(
      bundle.authorityTick,
    );
    const request = composePhase1SaveV2(bundle, {
        nowUtc: "2026-10-01T00:00:00Z",
      }),
      portable = {
        ...request,
        formatId: request.world.formatId,
        schemaVersion: request.world.schemaVersion,
        recordKind: "portable-bundle",
      };
    expect(
      reconstructPhase1ReopenState(
        portable,
        createPhase1SaveV2Compatibility(bundle.catalog, [3, 4]),
      ).ok,
    ).toBe(true);
  } finally {
    await bundle.destroy();
  }
});
it("v1 colony records migrate to v2 without changing progress, and reject unknown journal sites", () => {
  const legacy = {
    ...emptyColonyDepthState(),
    contentVersion: 1,
    inspectedSites: ["site:marsh-relay"],
  };
  const next = validateColonyDepthState(legacy);
  expect(next.contentVersion).toBe(2);
  expect(next.inspectedSites).toEqual(legacy.inspectedSites);
  expect(next.researchIds).toEqual(legacy.researchIds);
  expect(() =>
    validateColonyDepthState({ ...legacy, inspectedSites: ["site:invented"] }),
  ).toThrow();
  expect(
    colonySurveySites("one")
      .filter((s) => s.family)
      .map((s) => s.family),
  ).toEqual(["grove", "spring", "seam"]);
});
it("seeded shallow channels agree with physical movement and placement, without trapping players", async () => {
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    const marsh = colonySurveySites(config.worldSeed)[0]!.position;
    bundle.getRuntime("early").relocatePlayer(marsh);
    await bundle.stepSolo();
    const candidates = bundle.world
      .getActiveChunkViews()
      .flatMap((view) =>
        view.base.terrain.cells.map((base, index) => ({
          base,
          position: {
            x:
              view.base.coord.x * 32 +
              (index % view.base.terrain.cellsPerAxis) *
                view.base.terrain.cellSizeWorldUnits +
              view.base.terrain.cellSizeWorldUnits / 2,
            y:
              view.base.coord.y * 32 +
              Math.floor(index / view.base.terrain.cellsPerAxis) *
                view.base.terrain.cellSizeWorldUnits +
              view.base.terrain.cellSizeWorldUnits / 2,
          },
        })),
      );
    const channel = candidates.find(
      (c) =>
        c.base === "ground" &&
        colonyLandscapeTerrainAt(config.worldSeed, c.position, c.base) ===
          "water",
    );
    expect(channel).toBeDefined();
    if (!channel) throw Error("No channel fixture");
    expect(
      colonyLandscapeTerrainAt(config.worldSeed, channel.position, "ground"),
    ).toBe("water");
    expect(bundle.world.getMovementSpeedMultiplier(channel.position)).toBe(0.7);
    expect(
      bundle.world.isBuildableGround(
        channel.position,
        PHASE1_STRUCTURE_PLACEMENT_PROFILES["structure:storage-crate"],
        0,
      ),
    ).toBe(false);
    bundle.getRuntime("early").relocatePlayer(channel.position);
    await bundle.stepSolo();
    const before = bundle.getPlayerPosition("early");
    bundle.submitInput("early", {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: true,
    });
    await bundle.stepSolo();
    const after = bundle.getPlayerPosition("early");
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.x - before.x).toBeCloseTo((2.8125 / 60) * 0.7, 6);
  } finally {
    await bundle.destroy();
  }
});
