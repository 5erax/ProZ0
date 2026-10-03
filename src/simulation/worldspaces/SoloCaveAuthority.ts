import { PLAYER_COLLISION_FOOTPRINT } from "../player/PlayerCollisionFootprint";
import { createWorldPosition, type WorldPosition } from "../../foundation";
import type {
  ItemInteractionWorldPort,
  DropPlacementReservation,
  ResourceNodeView,
  WorldDropView,
  WorldRevisionResult,
} from "../../world/api/ItemInteractionWorld";
import type {
  WorldCollisionQuery,
  AxisSweepRequest,
  AxisSweepResult,
} from "../../world/api/WorldCollisionQuery";
import type {
  DeathCachePlacementReservation,
  DeathCacheWorldView,
} from "../../world/api/SurvivalWorld";
import { DeathCacheWorldState } from "../../world/phase1/DeathCacheWorldState";
import {
  caveTileAt,
  type CaveLayout,
} from "../../world/phase2/ColonyCaveLayout";
import {
  emptySoloCaveState,
  validateSoloCaveState,
  type CavePortal,
  type CaveSpaceState,
  type SoloCaveStateV1,
} from "./SoloCaveState";
export interface SoloCaveServices {
  actor(): {
    readonly playerId: string;
    readonly position: WorldPosition;
    readonly alive: boolean;
  };
  surfaceExplored(position: WorldPosition): boolean;
  surfaceStandable(position: WorldPosition): boolean;
  relocate(position: WorldPosition): void;
  cancelActions(): void;
}
/** A cave query port never falls through to a surface resource/station/drop at matching x/y. */
export class SoloCaveAuthority
  implements ItemInteractionWorldPort, WorldCollisionQuery
{
  private state: SoloCaveStateV1;
  private readonly dropReservations = new Map<
    string,
    { spaceId: string; position: WorldPosition }
  >();
  private readonly caches = new Map<string, DeathCacheWorldState>();
  public constructor(
    public readonly portals: readonly CavePortal[],
    private readonly services: SoloCaveServices,
    snapshot?: SoloCaveStateV1,
  ) {
    const ids = new Set(portals.map((p) => p.id)),
      spaces = new Set(portals.map((p) => p.layout.spaceId));
    if (
      portals.length !== 3 ||
      ids.size !== 3 ||
      spaces.size !== 3 ||
      portals.some(
        (p) =>
          p.id !== p.layout.portalId ||
          !Number.isFinite(p.position.x) ||
          !Number.isFinite(p.position.y),
      )
    )
      throw Error("Invalid cave portal registry");
    const actor = services.actor();
    this.state = validateSoloCaveState(
      snapshot ?? emptySoloCaveState(actor.playerId, actor.position),
      portals,
      actor.playerId,
    );
    for (const space of this.state.spaces)
      this.caches.set(
        space.progress.spaceId,
        new DeathCacheWorldState({ caches: space.deathCaches }),
      );
  }
  public read(): SoloCaveStateV1 {
    return this.state;
  }
  public ownsResource(id: string): boolean {
    return this.portals.some((p) => p.layout.nodes.some((n) => n.id === id));
  }
  public ownsContainer(id: string): boolean {
    return this.state.spaces.some(
      (s) =>
        s.drops.some((d) => d.containerId === id) ||
        s.deathCaches.some((c) => c.containerId === id),
    );
  }
  public ownsEntity(id: string): boolean {
    return this.state.spaces.some(
      (s) =>
        s.drops.some((d) => d.worldDropId === id) ||
        s.deathCaches.some((c) => c.entityId === id),
    );
  }
  public activeLayout(): CaveLayout | null {
    return (
      this.portals.find(
        (p) => p.layout.spaceId === this.state.actor.location.spaceId,
      )?.layout ?? null
    );
  }
  public isSurface(): boolean {
    return this.state.actor.location.spaceId === "surface";
  }
  private publish(next: SoloCaveStateV1): void {
    if (this.state.revision >= Number.MAX_SAFE_INTEGER)
      throw Error("Cave revision exhausted");
    this.state = Object.freeze({ ...next, revision: this.state.revision + 1 });
  }
  private activeSpace(): CaveSpaceState | null {
    return (
      this.state.spaces.find(
        (s) => s.progress.spaceId === this.state.actor.location.spaceId,
      ) ?? null
    );
  }
  private mutateSpace(space: CaveSpaceState): void {
    this.publish({
      ...this.state,
      spaces: Object.freeze(
        this.state.spaces.map((s) =>
          s.progress.spaceId === space.progress.spaceId
            ? Object.freeze(space)
            : s,
        ),
      ),
    });
  }
  private actorIsLocal(playerId: string): boolean {
    return (
      playerId === this.state.actor.playerId &&
      !this.isSurface() &&
      this.services.actor().alive
    );
  }
  private dry(layout: CaveLayout, p: WorldPosition): boolean {
    return ["floor", "exit"].includes(caveTileAt(layout, p) ?? "");
  }
  private passable(
    layout: CaveLayout,
    p: WorldPosition,
    halfWidth: number,
    halfDepth: number,
  ): boolean {
    return [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [-halfWidth, halfDepth],
      [halfWidth, halfDepth],
    ].every(([x, y]) =>
      ["floor", "water", "exit"].includes(
        caveTileAt(layout, { x: p.x + x!, y: p.y + y! }) ?? "",
      ),
    );
  }
  /** Called only after the host's collision-resolved movement; inspection is read only. */
  public synchronizePose(): void {
    const actor = this.services.actor(),
      prior = this.state.actor.location,
      layout = this.activeLayout();
    if (
      layout &&
      !this.passable(
        layout,
        actor.position,
        PLAYER_COLLISION_FOOTPRINT.halfWidth,
        PLAYER_COLLISION_FOOTPRINT.halfDepth,
      )
    )
      throw Error("Resolved cave pose is outside walkable cells");
    if (
      prior.position.x !== actor.position.x ||
      prior.position.y !== actor.position.y
    )
      this.publish({
        ...this.state,
        actor: Object.freeze({
          ...this.state.actor,
          location: Object.freeze({
            ...prior,
            position: Object.freeze({ ...actor.position }),
          }),
        }),
      });
    if (layout) this.reveal(actor.position);
  }
  public transition(command: {
    id: string;
    expectedRevision: number;
    action: "enter" | "exit";
    portalId?: string;
  }): { status: "committed" | "rejected"; message: string } {
    const signature = JSON.stringify(command),
      receipt = this.state.receipts.find((r) => r.id === command.id);
    if (receipt)
      return receipt.signature === signature
        ? { status: "committed", message: receipt.result }
        : { status: "rejected", message: "OPERATION_ID_CONFLICT" };
    const reject = (message: string) => ({
      status: "rejected" as const,
      message,
    });
    if (!command.id || command.id.length > 512)
      return reject("INVALID_OPERATION_ID");
    if (command.expectedRevision !== this.state.revision)
      return reject("STALE_WORLDSPACE_REVISION");
    const actor = this.services.actor();
    if (!actor.alive) return reject("NOT_ALIVE");
    let next = this.state,
      position: WorldPosition,
      message: string;
    if (command.action === "enter") {
      if (!this.isSurface()) return reject("ALREADY_IN_CAVE");
      const portal = this.portals.find((p) => p.id === command.portalId);
      if (!portal) return reject("UNKNOWN_PORTAL");
      if (!this.services.surfaceExplored(portal.position))
        return reject("UNEXPLORED_PORTAL");
      if (
        Math.hypot(
          actor.position.x - portal.position.x,
          actor.position.y - portal.position.y,
        ) > 1.25
      )
        return reject("OUT_OF_RANGE");
      if (!this.services.surfaceStandable(actor.position))
        return reject("UNSAFE_RETURN_ANCHOR");
      position = portal.layout.spawn;
      let spaces = this.state.spaces;
      if (!spaces.some((s) => s.progress.spaceId === portal.layout.spaceId)) {
        const space: CaveSpaceState = {
          progress: {
            version: 1,
            spaceId: portal.layout.spaceId,
            exploredCellIndices: [],
            depletedNodeIds: [],
          },
          drops: [],
          deathCaches: [],
        };
        spaces = Object.freeze([...spaces, Object.freeze(space)]);
        this.caches.set(portal.layout.spaceId, new DeathCacheWorldState());
      }
      next = {
        ...next,
        spaces,
        actor: {
          playerId: actor.playerId,
          location: { spaceId: portal.layout.spaceId, position },
          returnAnchor: {
            portalId: portal.id,
            position: Object.freeze({ ...actor.position }),
          },
        },
      };
      message = "CAVE_ENTERED";
    } else if (command.action === "exit") {
      const layout = this.activeLayout();
      if (!layout) return reject("NOT_IN_CAVE");
      if (
        Math.hypot(
          actor.position.x - layout.exit.x,
          actor.position.y - layout.exit.y,
        ) > 1.25
      )
        return reject("OUT_OF_RANGE");
      const anchor = this.state.actor.returnAnchor!;
      position = this.services.surfaceStandable(anchor.position)
        ? anchor.position
        : createWorldPosition(0, 0);
      if (!this.services.surfaceStandable(position))
        return reject("RETURN_UNAVAILABLE");
      next = {
        ...next,
        actor: {
          playerId: actor.playerId,
          location: { spaceId: "surface", position },
          returnAnchor: null,
        },
      };
      message = "CAVE_EXITED";
    } else return reject("INVALID_TRANSITION");
    next = {
      ...next,
      receipts: [
        ...next.receipts,
        { id: command.id, signature, result: message },
      ].slice(-64),
    };
    const candidate = validateSoloCaveState(next, this.portals, actor.playerId);
    this.services.cancelActions();
    this.dropReservations.clear();
    this.services.relocate(position);
    this.publish(candidate);
    this.synchronizePose();
    return { status: "committed", message };
  }
  /** Trusted respawn finalization, called after ordinary DeathAuthority reservation validation. */
  public finalizeSurfaceRespawn(position: WorldPosition): void {
    this.services.cancelActions();
    this.dropReservations.clear();
    this.services.relocate(position);
    this.publish({
      ...this.state,
      actor: Object.freeze({
        playerId: this.state.actor.playerId,
        location: Object.freeze({
          spaceId: "surface",
          position: Object.freeze({ ...position }),
        }),
        returnAnchor: null,
      }),
    });
  }
  public getMovementSpeedMultiplier(position: WorldPosition): number {
    const l = this.activeLayout();
    return l && caveTileAt(l, position) === "water" ? 0.6 : 1;
  }
  public sweepAabbAxis(request: AxisSweepRequest): AxisSweepResult {
    const layout = this.activeLayout();
    if (!layout) throw Error("Cave collision requested in surface space");
    if (
      !Number.isFinite(request.desiredDelta) ||
      Math.abs(request.desiredDelta) > 4 ||
      !Number.isFinite(request.footprint.halfWidth) ||
      !Number.isFinite(request.footprint.halfDepth) ||
      request.footprint.halfWidth < 0 ||
      request.footprint.halfDepth < 0 ||
      request.footprint.halfWidth > 1 ||
      request.footprint.halfDepth > 1
    )
      throw Error("Invalid cave movement sweep");
    const count = Math.max(
      1,
      Math.ceil(Math.abs(request.desiredDelta) / 0.125),
    );
    let allowed = 0;
    for (let i = 1; i <= count; i++) {
      const delta = (request.desiredDelta * i) / count,
        p = {
          x: request.center.x + (request.axis === "x" ? delta : 0),
          y: request.center.y + (request.axis === "y" ? delta : 0),
        };
      if (
        !this.passable(
          layout,
          p,
          request.footprint.halfWidth,
          request.footprint.halfDepth,
        )
      )
        return {
          allowedDelta: allowed,
          blocked: true,
          hitSolidId: layout.spaceId + ":wall",
        };
      allowed = delta;
    }
    return { allowedDelta: allowed, blocked: false };
  }
  public clearLine(
    from: WorldPosition,
    to: WorldPosition,
    includeEndWall = false,
  ): boolean {
    const l = this.activeLayout();
    if (!l) return false;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(from.x - to.x, from.y - to.y) / 0.2),
    );
    if (steps > 120) return false;
    for (let i = 0; i <= steps; i++) {
      const tile = caveTileAt(l, {
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
      });
      if (
        tile === null ||
        (tile === "wall" &&
          !(
            includeEndWall &&
            Math.floor(from.x + ((to.x - from.x) * i) / steps) ===
              Math.floor(to.x) &&
            Math.floor(from.y + ((to.y - from.y) * i) / steps) ===
              Math.floor(to.y)
          ))
      )
        return false;
    }
    return true;
  }
  private reveal(position: WorldPosition): void {
    const l = this.activeLayout(),
      space = this.activeSpace();
    if (!l || !space) return;
    const known = new Set(space.progress.exploredCellIndices),
      before = known.size;
    for (
      let y = Math.max(0, Math.floor(position.y) - 4);
      y <= Math.min(l.height - 1, Math.floor(position.y) + 4);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(position.x) - 4);
        x <= Math.min(l.width - 1, Math.floor(position.x) + 4);
        x++
      ) {
        const center = { x: x + 0.5, y: y + 0.5 };
        if (
          Math.hypot(center.x - position.x, center.y - position.y) <= 4 &&
          this.clearLine(position, center, true)
        )
          known.add(y * l.width + x);
      }
    if (known.size !== before)
      this.mutateSpace({
        ...space,
        progress: Object.freeze({
          ...space.progress,
          exploredCellIndices: Object.freeze([...known].sort((a, b) => a - b)),
        }),
      });
  }
  public getResource(id: string): ResourceNodeView | null {
    const l = this.activeLayout(),
      space = this.activeSpace(),
      node = l?.nodes.find((n) => n.id === id);
    if (!node || !space || !l) return null;
    const cell =
      Math.floor(node.position.y) * l.width + Math.floor(node.position.x);
    if (!space.progress.exploredCellIndices.includes(cell)) return null;
    const depleted = space.progress.depletedNodeIds.includes(id);
    return Object.freeze({
      resourceEntityId: id,
      resourceDefinitionId: node.resourceDefinitionId,
      revision: depleted ? 1 : 0,
      remainingActions: depleted ? 0 : 1,
      depleted,
      size:
        node.yieldQuantity === 1
          ? "small"
          : node.yieldQuantity === 2
            ? "medium"
            : "large",
    });
  }
  public isResourceInInteractionRange(playerId: string, id: string): boolean {
    const node = this.activeLayout()?.nodes.find((n) => n.id === id),
      actor = this.services.actor();
    return (
      this.actorIsLocal(playerId) &&
      !!this.getResource(id) &&
      !!node &&
      Math.hypot(
        actor.position.x - node.position.x,
        actor.position.y - node.position.y,
      ) <= 1.25 &&
      this.clearLine(actor.position, node.position)
    );
  }
  public commitGather(
    id: string,
    expectedRevision: number,
  ): WorldRevisionResult | null {
    const resource = this.getResource(id),
      space = this.activeSpace();
    if (
      !resource ||
      !space ||
      resource.depleted ||
      resource.revision !== expectedRevision ||
      !this.isResourceInInteractionRange(this.state.actor.playerId, id)
    )
      return null;
    this.mutateSpace({
      ...space,
      progress: Object.freeze({
        ...space.progress,
        depletedNodeIds: Object.freeze(
          [...space.progress.depletedNodeIds, id].sort(),
        ),
      }),
    });
    return { revision: 1 };
  }
  public getWorkbench(): null {
    return null;
  }
  public isWorkbenchAccessible(): boolean {
    return false;
  }
  public getWorldDrop(id: string): WorldDropView | null {
    const drop = this.activeSpace()?.drops.find((d) => d.worldDropId === id);
    return drop
      ? Object.freeze({
          worldDropId: id,
          containerId: drop.containerId,
          revision: drop.revision,
          available: true,
        })
      : null;
  }
  public isWorldDropInInteractionRange(playerId: string, id: string): boolean {
    const drop = this.activeSpace()?.drops.find((d) => d.worldDropId === id),
      actor = this.services.actor();
    return (
      this.actorIsLocal(playerId) &&
      !!drop &&
      Math.hypot(
        actor.position.x - drop.position.x,
        actor.position.y - drop.position.y,
      ) <= 1.25 &&
      this.clearLine(actor.position, drop.position)
    );
  }
  public resolveDropPlacement(
    playerId: string,
  ): DropPlacementReservation | null {
    const l = this.activeLayout(),
      space = this.activeSpace(),
      actor = this.services.actor();
    if (
      !l ||
      !space ||
      !this.actorIsLocal(playerId) ||
      space.drops.length >= 32 ||
      this.dropReservations.size >= 16 ||
      !this.dry(l, actor.position)
    )
      return null;
    const token =
      "cave-drop:" + this.state.revision + ":" + this.dropReservations.size;
    this.dropReservations.set(token, {
      spaceId: l.spaceId,
      position: Object.freeze({ ...actor.position }),
    });
    return { token };
  }
  public commitCreateWorldDrop(request: {
    worldDropId: string;
    containerId: string;
    placement: DropPlacementReservation;
  }): WorldDropView | null {
    const placement = this.dropReservations.get(request.placement.token),
      space = this.activeSpace();
    if (
      !placement ||
      !space ||
      placement.spaceId !== space.progress.spaceId ||
      space.drops.length >= 32 ||
      this.state.spaces.some(
        (s) =>
          s.drops.some(
            (d) =>
              d.worldDropId === request.worldDropId ||
              d.containerId === request.containerId,
          ) ||
          s.deathCaches.some(
            (c) =>
              c.entityId === request.worldDropId ||
              c.containerId === request.containerId,
          ),
      )
    )
      return null;
    const drop = Object.freeze({
      worldDropId: request.worldDropId,
      containerId: request.containerId,
      revision: 0,
      position: placement.position,
    });
    this.mutateSpace({
      ...space,
      drops: Object.freeze([...space.drops, drop]),
    });
    this.dropReservations.delete(request.placement.token);
    return this.getWorldDrop(drop.worldDropId);
  }
  public commitTakeWorldDrop(
    id: string,
    expectedRevision: number,
  ): WorldRevisionResult | null {
    const drop = this.getWorldDrop(id),
      space = this.activeSpace();
    if (
      !drop ||
      !space ||
      drop.revision !== expectedRevision ||
      !this.isWorldDropInInteractionRange(this.state.actor.playerId, id)
    )
      return null;
    this.mutateSpace({
      ...space,
      drops: Object.freeze(space.drops.filter((d) => d.worldDropId !== id)),
    });
    return { revision: drop.revision + 1 };
  }
  public isContainerAccessible(playerId: string, id: string): boolean {
    if (playerId !== this.state.actor.playerId) return false;
    if (id === "inventory:" + playerId) return true;
    const space = this.activeSpace(),
      actor = this.services.actor();
    if (!space || !this.actorIsLocal(playerId)) return false;
    const drop = space.drops.find((d) => d.containerId === id);
    if (drop)
      return this.isWorldDropInInteractionRange(playerId, drop.worldDropId);
    const cache = space.deathCaches.find((c) => c.containerId === id);
    return (
      !!cache &&
      Math.hypot(
        actor.position.x - cache.position.x,
        actor.position.y - cache.position.y,
      ) <= 1.25 &&
      this.clearLine(actor.position, cache.position)
    );
  }
  public reserveDeathCachePlacement(request: {
    deathId: string;
    ownerPlayerId: string;
    requestedPosition: WorldPosition;
  }): DeathCachePlacementReservation {
    const l = this.activeLayout(),
      space = this.activeSpace();
    if (
      !l ||
      !space ||
      request.ownerPlayerId !== this.state.actor.playerId ||
      space.deathCaches.length >= 32
    )
      throw Error("Invalid cave death placement");
    return this.caches.get(l.spaceId)!.reservePlacement(request, {
      isValid: (p) => this.dry(l, p),
      nearestReachableFallback: () => l.spawn,
    });
  }
  public commitReservedDeathCache(request: {
    entityId: string;
    deathId: string;
    ownerPlayerId: string;
    containerId: string;
    reservation: DeathCachePlacementReservation;
  }): DeathCacheWorldView {
    const space = this.activeSpace();
    if (!space) throw Error("Cave death commit outside active cave");
    const cache = this.caches
      .get(space.progress.spaceId)!
      .commitReserved(request);
    this.mutateSpace({
      ...space,
      deathCaches: this.caches.get(space.progress.spaceId)!.exportSnapshot()
        .caches,
    });
    return cache;
  }
  public getDeathCacheByContainer(id: string): DeathCacheWorldView | null {
    const space = this.activeSpace();
    return space?.deathCaches.find((c) => c.containerId === id) ?? null;
  }
  public removeEmptyDeathCache(id: string, revision: number): boolean {
    const space = this.activeSpace();
    if (!space) return false;
    const caches = this.caches.get(space.progress.spaceId)!;
    if (!caches.removeEmpty(id, revision)) return false;
    this.mutateSpace({ ...space, deathCaches: caches.exportSnapshot().caches });
    return true;
  }
}
