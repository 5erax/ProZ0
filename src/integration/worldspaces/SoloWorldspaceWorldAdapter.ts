import type { PlayerId, WorldPosition } from "../../foundation";
import type { SoloCaveAuthority } from "../../simulation/worldspaces/SoloCaveAuthority";
import type {
  WorldCollisionQuery,
  AxisSweepRequest,
} from "../../world/api/WorldCollisionQuery";
import type {
  ItemInteractionWorldPort,
  DropPlacementReservation,
} from "../../world/api/ItemInteractionWorld";
import type {
  SurvivalWorldPort,
  DeathCachePlacementReservation,
  RespawnPlacementReservation,
  PredatorCombatState,
} from "../../world/api/SurvivalWorld";
type SurfacePorts = WorldCollisionQuery &
  ItemInteractionWorldPort &
  SurvivalWorldPort;
/** Explicit three-port router. Switching space cannot fall through on a missing entity. */
export class SoloWorldspaceWorldAdapter
  implements WorldCollisionQuery, ItemInteractionWorldPort, SurvivalWorldPort
{
  private readonly overflowRecovery = new WeakSet<DeathCachePlacementReservation>();
  public constructor(
    private readonly surface: SurfacePorts,
    private readonly cave: () => SoloCaveAuthority | null,
  ) {}
  private interior(): SoloCaveAuthority | null {
    const cave = this.cave();
    return cave && !cave.isSurface() ? cave : null;
  }
  public getMovementSpeedMultiplier(position: WorldPosition): number {
    return (
      this.interior()?.getMovementSpeedMultiplier(position) ??
      this.surface.getMovementSpeedMultiplier?.(position) ??
      1
    );
  }
  public sweepAabbAxis(request: AxisSweepRequest) {
    const cave = this.interior();
    return cave
      ? cave.sweepAabbAxis(request)
      : this.surface.sweepAabbAxis(request);
  }
  public getPlayerPosition(playerId: PlayerId): WorldPosition {
    const cave = this.interior();
    if (!cave) return this.surface.getPlayerPosition(playerId);
    if (cave.read().actor.playerId !== playerId)
      throw Error("Unknown cave player");
    return cave.read().actor.location.position;
  }
  public isContainerAccessible(playerId: PlayerId, id: string): boolean {
    const cave = this.interior();
    return cave
      ? cave.isContainerAccessible(playerId, id)
      : !this.cave()?.ownsContainer(id) &&
          this.surface.isContainerAccessible(playerId, id);
  }
  public getResource(id: string) {
    const cave = this.interior();
    return cave
      ? cave.getResource(id)
      : this.cave()?.ownsResource(id)
        ? null
        : this.surface.getResource(id);
  }
  public isResourceInInteractionRange(playerId: PlayerId, id: string): boolean {
    const cave = this.interior();
    return cave
      ? cave.isResourceInInteractionRange(playerId, id)
      : !this.cave()?.ownsResource(id) &&
          this.surface.isResourceInInteractionRange(playerId, id);
  }
  public commitGather(id: string, revision: number) {
    const cave = this.interior();
    return cave
      ? cave.commitGather(id, revision)
      : this.cave()?.ownsResource(id)
        ? null
        : this.surface.commitGather(id, revision);
  }
  public getWorldDrop(id: string) {
    const cave = this.interior();
    return cave
      ? cave.getWorldDrop(id)
      : this.cave()?.ownsEntity(id)
        ? null
        : this.surface.getWorldDrop(id);
  }
  public isWorldDropInInteractionRange(
    playerId: PlayerId,
    id: string,
  ): boolean {
    const cave = this.interior();
    return cave
      ? cave.isWorldDropInInteractionRange(playerId, id)
      : !this.cave()?.ownsEntity(id) &&
          this.surface.isWorldDropInInteractionRange(playerId, id);
  }
  public resolveDropPlacement(playerId: PlayerId) {
    const cave = this.interior();
    return cave
      ? cave.resolveDropPlacement(playerId)
      : this.surface.resolveDropPlacement(playerId);
  }
  public commitCreateWorldDrop(request: {
    worldDropId: string;
    containerId: string;
    placement: DropPlacementReservation;
  }) {
    const cave = this.interior();
    return cave
      ? cave.commitCreateWorldDrop(request)
      : request.placement.token.startsWith("cave-drop:")
        ? null
        : this.surface.commitCreateWorldDrop(request);
  }
  public commitTakeWorldDrop(id: string, revision: number) {
    const cave = this.interior();
    return cave
      ? cave.commitTakeWorldDrop(id, revision)
      : this.cave()?.ownsEntity(id)
        ? null
        : this.surface.commitTakeWorldDrop(id, revision);
  }
  public getWorkbench(id: string) {
    if (this.interior()) return null;
    return this.surface.getWorkbench(id);
  }
  public isWorkbenchAccessible(playerId: PlayerId, id: string): boolean {
    return !this.interior() && this.surface.isWorkbenchAccessible(playerId, id);
  }
  public getEnvironmentExposure(playerId: PlayerId) {
    const cave = this.interior();
    if (cave) {
      if (cave.read().actor.playerId !== playerId)
        throw Error("Unknown cave player");
      return Object.freeze({ thermalTarget: 40, sheltered: true });
    }
    return this.surface.getEnvironmentExposure(playerId);
  }
  public reserveDeathCachePlacement(request: {
    deathId: string;
    ownerPlayerId: PlayerId;
    requestedPosition: WorldPosition;
  }) {
    const cave = this.interior();
    if (cave && cave.read().actor.playerId !== request.ownerPlayerId)
      throw Error("Unknown cave player");
    const space = cave?.read().spaces.find(s => s.progress.spaceId === cave.read().actor.location.spaceId);
    if (space && space.deathCaches.length >= 32) {
      // Preserve cargo when an interior reaches its bounded recovery capacity.
      // This trusted reservation creates a surface cache at the respawn landing;
      // no imported token can bypass the normal worldspace routing.
      const reservation = this.surface.reserveDeathCachePlacement({ ...request, requestedPosition: { x: 0, y: 0 } });
      this.overflowRecovery.add(reservation);
      return reservation;
    }
    return cave
      ? cave.reserveDeathCachePlacement(request)
      : this.surface.reserveDeathCachePlacement(request);
  }
  public commitReservedDeathCache(request: {
    entityId: string;
    deathId: string;
    ownerPlayerId: PlayerId;
    containerId: string;
    reservation: DeathCachePlacementReservation;
  }) {
    if (this.overflowRecovery.has(request.reservation)) {
      const cache = this.surface.commitReservedDeathCache(request);
      this.overflowRecovery.delete(request.reservation);
      return cache;
    }
    const cave = this.interior();
    return cave
      ? cave.commitReservedDeathCache(request)
      : this.surface.commitReservedDeathCache(request);
  }
  public getDeathCacheByContainer(id: string) {
    const cave = this.interior();
    return cave
      ? cave.getDeathCacheByContainer(id)
      : this.cave()?.ownsContainer(id)
        ? null
        : this.surface.getDeathCacheByContainer(id);
  }
  public removeEmptyDeathCache(id: string, revision: number): boolean {
    const cave = this.interior();
    return cave
      ? cave.removeEmptyDeathCache(id, revision)
      : !this.cave()?.ownsEntity(id) &&
          this.surface.removeEmptyDeathCache(id, revision);
  }
  public reservePlayerRespawn(playerId: PlayerId) {
    return this.surface.reservePlayerRespawn(playerId);
  }
  public commitReservedPlayerRespawn(
    reservation: RespawnPlacementReservation,
  ): void {
    const cave = this.interior();
    this.surface.commitReservedPlayerRespawn(reservation);
    if (cave) cave.finalizeSurfaceRespawn(reservation.position);
  }
  public getPredator(id: string) {
    return this.interior() ? null : this.surface.getPredator(id);
  }
  public commitPredatorRuntime(request: {
    entityId: string;
    expectedRevision: number;
    health: number;
    state: PredatorCombatState;
    targetPlayerId: PlayerId | null;
    stateUntilTick: number | null;
    outsideLeashTicks: number;
  }) {
    return this.interior() ? null : this.surface.commitPredatorRuntime(request);
  }
}
