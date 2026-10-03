import { PLAYER_COLLISION_FOOTPRINT } from "../player/PlayerCollisionFootprint";
import type { WorldPosition } from "../../foundation";
import {
  caveTileAt,
  validateCaveProgressV1,
  validateWorldLocationV1,
  type CaveLayout,
  type CaveProgressV1,
  type WorldLocationV1,
} from "../../world/phase2/ColonyCaveLayout";
import type { DeathCacheWorldView } from "../../world/api/SurvivalWorld";
export interface CavePortal {
  readonly id: string;
  readonly position: WorldPosition;
  readonly layout: CaveLayout;
}
export interface CaveDrop {
  readonly worldDropId: string;
  readonly revision: number;
  readonly containerId: string;
  readonly position: WorldPosition;
}
export interface CaveSpaceState {
  readonly progress: CaveProgressV1;
  readonly drops: readonly CaveDrop[];
  readonly deathCaches: readonly DeathCacheWorldView[];
}
export interface SoloCaveStateV1 {
  readonly version: 1;
  readonly revision: number;
  readonly actor: {
    readonly playerId: string;
    readonly location: WorldLocationV1;
    readonly returnAnchor: {
      readonly portalId: string;
      readonly position: WorldPosition;
    } | null;
  };
  readonly spaces: readonly CaveSpaceState[];
  readonly receipts: readonly {
    readonly id: string;
    readonly signature: string;
    readonly result: string;
  }[];
}
const natural = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0;
const identity = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 512;
const exact = (v: object, keys: readonly string[]) =>
  Object.keys(v).every((k) => keys.includes(k));
const floor = (layout: CaveLayout, p: WorldPosition) =>
  ["floor", "exit"].includes(caveTileAt(layout, p) ?? "");
export function emptySoloCaveState(
  playerId: string,
  position: WorldPosition,
): SoloCaveStateV1 {
  return {
    version: 1,
    revision: 0,
    actor: {
      playerId,
      location: { spaceId: "surface", position },
      returnAnchor: null,
    },
    spaces: [],
    receipts: [],
  };
}
/** The registry comes from the world seed, never from an imported save. */
export function validateSoloCaveState(
  value: unknown,
  portals: readonly CavePortal[],
  playerId: string,
): SoloCaveStateV1 {
  const state = value as SoloCaveStateV1;
  if (
    !state ||
    state.version !== 1 ||
    !natural(state.revision) ||
    !exact(state, ["version", "revision", "actor", "spaces", "receipts"]) ||
    !state.actor ||
    !exact(state.actor, ["playerId", "location", "returnAnchor"]) ||
    state.actor.playerId !== playerId ||
    !identity(playerId) ||
    !Array.isArray(state.spaces) ||
    state.spaces.length > 3 ||
    !Array.isArray(state.receipts) ||
    state.receipts.length > 64
  )
    throw Error("Invalid solo cave state");
  const layouts = portals.map((p) => p.layout),
    location = validateWorldLocationV1(state.actor.location, layouts);
  if (
    !exact(state.actor.location, ["spaceId", "position"]) ||
    !exact(state.actor.location.position, ["x", "y"])
  )
    throw Error("Unknown cave location data");
  if (location.spaceId !== "surface") {
    const layout = layouts.find((l) => l.spaceId === location.spaceId)!;
    const { halfWidth, halfDepth } = PLAYER_COLLISION_FOOTPRINT;
    if (
      ![
        [-halfWidth, -halfDepth],
        [halfWidth, -halfDepth],
        [-halfWidth, halfDepth],
        [halfWidth, halfDepth],
      ].every(([x, y]) =>
        ["floor", "water", "exit"].includes(
          caveTileAt(layout, {
            x: location.position.x + x!,
            y: location.position.y + y!,
          }) ?? "",
        ),
      )
    )
      throw Error("Cave location body overlaps a wall");
  }
  const anchor = state.actor.returnAnchor;
  if (location.spaceId === "surface" ? anchor !== null : !anchor)
    throw Error("Invalid cave return anchor");
  if (anchor) {
    const portal = portals.find((p) => p.id === anchor.portalId);
    if (
      !portal ||
      portal.layout.spaceId !== location.spaceId ||
      !exact(anchor, ["portalId", "position"]) ||
      !anchor.position ||
      !exact(anchor.position, ["x", "y"]) ||
      !Number.isFinite(anchor.position.x) ||
      !Number.isFinite(anchor.position.y) ||
      Math.hypot(
        anchor.position.x - portal.position.x,
        anchor.position.y - portal.position.y,
      ) > 1.25
    )
      throw Error("Unknown cave return portal");
  }
  const spaceIds = new Set<string>(),
    entityIds = new Set<string>(),
    containerIds = new Set<string>(),
    deathIds = new Set<string>();
  for (const space of state.spaces) {
    if (
      !space ||
      !exact(space, ["progress", "drops", "deathCaches"]) ||
      !space.progress ||
      !exact(space.progress, [
        "version",
        "spaceId",
        "exploredCellIndices",
        "depletedNodeIds",
      ]) ||
      spaceIds.has(space.progress.spaceId) ||
      !Array.isArray(space.drops) ||
      space.drops.length > 32 ||
      !Array.isArray(space.deathCaches) ||
      space.deathCaches.length > 32
    )
      throw Error("Invalid cave worldspace");
    const layout = layouts.find((l) => l.spaceId === space.progress.spaceId);
    if (!layout) throw Error("Unknown cave worldspace");
    validateCaveProgressV1(space.progress, layout);
    spaceIds.add(layout.spaceId);
    for (const entity of [...space.drops, ...space.deathCaches]) {
      const id = "worldDropId" in entity ? entity.worldDropId : entity.entityId;
      if (
        !identity(id) ||
        entityIds.has(id) ||
        !identity(entity.containerId) ||
        entity.containerId === "inventory:" + playerId ||
        containerIds.has(entity.containerId) ||
        !natural(entity.revision) ||
        !entity.position ||
        !exact(entity.position, ["x", "y"]) ||
        !floor(layout, entity.position)
      )
        throw Error("Invalid cave entity location or identity");
      if ("worldDropId" in entity) {
        if (
          !exact(entity, ["worldDropId", "revision", "containerId", "position"])
        )
          throw Error("Unknown cave drop data");
      } else if (
        !exact(entity, [
          "entityId",
          "revision",
          "containerId",
          "position",
          "deathId",
          "ownerPlayerId",
        ]) ||
        !identity(entity.deathId) ||
        deathIds.has(entity.deathId) ||
        entity.ownerPlayerId !== playerId
      )
        throw Error("Invalid cave death cache");
      if ("deathId" in entity) deathIds.add(entity.deathId);
      entityIds.add(id);
      containerIds.add(entity.containerId);
    }
  }
  if (location.spaceId !== "surface" && !spaceIds.has(location.spaceId))
    throw Error("Active cave has no persisted worldspace");
  if (
    new Set(state.receipts.map((r) => r?.id)).size !== state.receipts.length ||
    state.receipts.some(
      (r) =>
        !r ||
        !exact(r, ["id", "signature", "result"]) ||
        !identity(r.id) ||
        !identity(r.result) ||
        typeof r.signature !== "string" ||
        !r.signature ||
        r.signature.length > 4096,
    )
  )
    throw Error("Invalid cave transition receipt");
  const copy = structuredClone({
    ...state,
    actor: { ...state.actor, location },
  });
  const freeze = (v: unknown): void => {
    if (v && typeof v === "object") {
      for (const child of Object.values(v)) freeze(child);
      Object.freeze(v);
    }
  };
  freeze(copy);
  return copy;
}
