import { expect, it } from "vitest";
import {
  createWorldPosition,
  createSimulationStep,
  toSimulationTick,
} from "../../src/foundation";
import { createSimulationRuntime } from "../../src/simulation";
import { SoloCaveAuthority } from "../../src/simulation/worldspaces/SoloCaveAuthority";
import {
  validateSoloCaveState,
  type SoloCaveStateV1,
} from "../../src/simulation/worldspaces/SoloCaveState";
import {
  CAVE_TEMPLATE_IDS,
  generateCaveLayout,
  caveTileAt,
} from "../../src/world/phase2/ColonyCaveLayout";
function fixture() {
  const portals = CAVE_TEMPLATE_IDS.map((id, i) => ({
    id: "portal:" + id,
    position: { x: 100 + i * 50, y: 100 },
    layout: generateCaveLayout("cave-query-fixture", "portal:" + id, id),
  }));
  const actor = {
    playerId: "solo",
    position: createWorldPosition(100, 100),
    alive: true,
  };
  let explored = true,
    standable = true,
    cancelled = 0;
  const services = {
    actor: () => actor,
    surfaceExplored: () => explored,
    surfaceStandable: (p: { x: number; y: number }) =>
      standable || (p.x === 0 && p.y === 0),
    relocate: (p: { x: number; y: number }) => {
      actor.position = createWorldPosition(p.x, p.y);
    },
    cancelActions: () => {
      cancelled++;
    },
  };
  const cave = new SoloCaveAuthority(portals, services);
  return {
    portals,
    actor,
    services,
    cave,
    setExplored: (v: boolean) => {
      explored = v;
    },
    setStandable: (v: boolean) => {
      standable = v;
    },
    cancelled: () => cancelled,
  };
}
it("cave transitions guard range, visibility, life state and revision; replay cannot relocate again and exit has a safe fallback", () => {
  const f = fixture(),
    enter = {
      id: "enter",
      expectedRevision: 0,
      action: "enter" as const,
      portalId: f.portals[0]!.id,
    };
  f.setExplored(false);
  expect(f.cave.transition(enter).message).toBe("UNEXPLORED_PORTAL");
  f.setExplored(true);
  f.actor.position = createWorldPosition(103, 100);
  expect(f.cave.transition(enter).message).toBe("OUT_OF_RANGE");
  f.actor.position = createWorldPosition(100, 100);
  f.actor.alive = false;
  expect(f.cave.transition(enter).message).toBe("NOT_ALIVE");
  f.actor.alive = true;
  expect(f.cave.transition({ ...enter, expectedRevision: 1 }).message).toBe(
    "STALE_WORLDSPACE_REVISION",
  );
  expect(f.cave.transition(enter).message).toBe("CAVE_ENTERED");
  expect(f.cancelled()).toBe(1);
  expect(f.actor.position).toEqual(f.portals[0]!.layout.spawn);
  expect(f.cave.read().actor.returnAnchor?.position).toEqual({
    x: 100,
    y: 100,
  });
  expect(
    f.cave.read().spaces[0]!.progress.exploredCellIndices.length,
  ).toBeGreaterThan(1);
  const before = f.cave.read();
  expect(f.cave.transition(enter).message).toBe("CAVE_ENTERED");
  expect(f.cave.read()).toBe(before);
  expect(f.cancelled()).toBe(1);
  f.actor.position = createWorldPosition(
    f.actor.position.x,
    f.actor.position.y - 2,
  );
  f.cave.synchronizePose();
  expect(
    f.cave.transition({
      id: "far-exit",
      expectedRevision: f.cave.read().revision,
      action: "exit",
    }).message,
  ).toBe("OUT_OF_RANGE");
  f.actor.position = f.portals[0]!.layout.exit;
  f.cave.synchronizePose();
  f.setStandable(false);
  expect(
    f.cave.transition({
      id: "exit",
      expectedRevision: f.cave.read().revision,
      action: "exit",
    }).message,
  ).toBe("CAVE_EXITED");
  expect(f.actor.position).toEqual({ x: 0, y: 0 });
  expect(f.cave.read().actor.returnAnchor).toBe(null);
});
it("the real movement runtime uses cave walls and cannot tunnel or reveal through them", () => {
  const f = fixture();
  f.cave.transition({
    id: "enter",
    expectedRevision: 0,
    action: "enter",
    portalId: f.portals[0]!.id,
  });
  const runtime = createSimulationRuntime({
    worldQuery: f.cave,
    initialPlayerPosition: f.actor.position,
  });
  const initial = runtime.getSnapshot().player.position;
  for (let tick = 1; tick <= 120; tick++) {
    runtime.submitInput("solo", {
      moveLeft: true,
      moveRight: false,
      moveUp: false,
      moveDown: false,
    });
    runtime.step(createSimulationStep(toSimulationTick(tick)));
    f.actor.position = runtime.getSnapshot().player.position;
    f.cave.synchronizePose();
  }
  expect(f.actor.position.x).toBeLessThan(initial.x);
  expect(f.actor.position.x).toBeGreaterThanOrEqual(11.3125);
  expect(caveTileAt(f.cave.activeLayout()!, f.actor.position)).toBe("floor");
  expect(
    f.cave.sweepAabbAxis({
      center: f.actor.position,
      footprint: { halfWidth: 0.3125, halfDepth: 0.1875 },
      axis: "x",
      desiredDelta: -4,
    }).blocked,
  ).toBe(true);
  expect(f.cave.clearLine(f.actor.position, { x: 8.5, y: 18.5 })).toBe(false);
  expect(f.cave.read().spaces[0]!.progress.exploredCellIndices).not.toContain(
    18 * 24 + 8,
  );
  expect(() =>
    f.cave.sweepAabbAxis({
      center: f.actor.position,
      footprint: { halfWidth: 0.3, halfDepth: 0.2 },
      axis: "x",
      desiredDelta: 1e9,
    }),
  ).toThrow();
});
it("bounded worldspace state rejects unknown/future spaces and references; snapshots retain isolated drops and cave death caches", () => {
  const f = fixture();
  f.cave.transition({
    id: "enter",
    expectedRevision: 0,
    action: "enter",
    portalId: f.portals[0]!.id,
  });
  const placement = f.cave.resolveDropPlacement("solo")!;
  expect(
    f.cave.commitCreateWorldDrop({
      worldDropId: "drop:cave",
      containerId: "container:cave-drop",
      placement,
    })?.available,
  ).toBe(true);
  const reserve = f.cave.reserveDeathCachePlacement({
    deathId: "death:fixture",
    ownerPlayerId: "solo",
    requestedPosition: { x: 0, y: 0 },
  });
  const cache = f.cave.commitReservedDeathCache({
    entityId: "cache:fixture",
    deathId: "death:fixture",
    ownerPlayerId: "solo",
    containerId: "death-cache:fixture",
    reservation: reserve,
  });
  expect(cache.position).toEqual(f.portals[0]!.layout.spawn);
  const saved = f.cave.read();
  expect(validateSoloCaveState(saved, f.portals, "solo")).toEqual(saved);
  const reopened = new SoloCaveAuthority(f.portals, f.services, saved);
  expect(reopened.getWorldDrop("drop:cave")).toEqual(
    f.cave.getWorldDrop("drop:cave"),
  );
  expect(reopened.getDeathCacheByContainer("death-cache:fixture")).toEqual(
    cache,
  );
  expect(reopened.isContainerAccessible("solo", "storage:surface")).toBe(false);
  expect(reopened.isWorkbenchAccessible()).toBe(false);
  expect(reopened.getResource("surface:resource")).toBe(null);
  expect(reopened.isContainerAccessible("foreign", "death-cache:fixture")).toBe(
    false,
  );
  for (const bad of [
    { ...saved, version: 2 },
    { ...saved, spaces: [...saved.spaces, ...saved.spaces] },
    { ...saved, actor: { ...saved.actor, playerId: "foreign" } },
    {
      ...saved,
      actor: {
        ...saved.actor,
        location: { spaceId: "cave:foreign", position: { x: 1, y: 1 } },
      },
    },
    {
      ...saved,
      spaces: saved.spaces.map((s) => ({
        ...s,
        progress: { ...s.progress, depletedNodeIds: ["foreign-node"] },
      })),
    },
    {
      ...saved,
      spaces: saved.spaces.map((s) => ({
        ...s,
        drops: Array.from({ length: 33 }, () => s.drops[0]!),
      })),
    },
  ])
    expect(() => validateSoloCaveState(bad, f.portals, "solo")).toThrow();
  f.actor.position = f.portals[0]!.layout.exit;
  f.cave.synchronizePose();
  f.cave.transition({
    id: "exit",
    expectedRevision: f.cave.read().revision,
    action: "exit",
  });
  expect(f.cave.getWorldDrop("drop:cave")).toBe(null);
  expect(f.cave.getDeathCacheByContainer("death-cache:fixture")).toBe(null);
  f.actor.position = f.portals[1]!.position;
  f.cave.synchronizePose();
  f.cave.transition({
    id: "enter-other",
    expectedRevision: f.cave.read().revision,
    action: "enter",
    portalId: f.portals[1]!.id,
  });
  expect(f.cave.getWorldDrop("drop:cave")).toBe(null);
  expect(f.cave.isContainerAccessible("solo", "death-cache:fixture")).toBe(
    false,
  );
  expect(Object.isFrozen(f.cave.read().actor)).toBe(true);
  expect(Object.isFrozen(f.cave.read().spaces)).toBe(true);
  const forged = {
    ...saved,
    spaces: saved.spaces.map((s) => ({
      ...s,
      deathCaches: [
        ...s.deathCaches,
        { ...cache, entityId: "cache:duplicate" },
      ],
    })),
  } as SoloCaveStateV1;
  expect(() => validateSoloCaveState(forged, f.portals, "solo")).toThrow();
});
