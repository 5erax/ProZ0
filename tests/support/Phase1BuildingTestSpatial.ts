import type { PlayerId, WorldPosition } from '../../src/foundation';
import type {
  BuildingSpatialQuery,
  QuarterTurn,
  StructurePlacementProfile,
} from '../../src/world';

export class Phase1BuildingTestSpatial implements BuildingSpatialQuery {
  public explored = true;
  public buildable = true;
  public blocking = false;
  public protectedRuin = false;
  public deathCacheObstruction = false;
  public spawnBlocked = false;
  public requiredAccessBlocked = false;
  public playerInside = false;
  public inInteractionRange = true;

  public isFootprintExplored(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.explored;
  }

  public isBuildableGround(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.buildable;
  }

  public hasBlockingWorldCollision(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.blocking;
  }

  public overlapsProtectedRuin(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.protectedRuin;
  }

  public obstructsDeathCache(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.deathCacheObstruction;
  }

  public blocksSpawnClearance(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.spawnBlocked;
  }

  public blocksRequiredAccess(
    position: WorldPosition,
    profile: StructurePlacementProfile,
    orientationQuarterTurns: QuarterTurn,
  ): boolean {
    void position;
    void profile;
    void orientationQuarterTurns;
    return this.requiredAccessBlocked;
  }

  public isPlayerInsideStructure(structureId: string): boolean {
    void structureId;
    return this.playerInside;
  }

  public isPlayerInInteractionRange(
    playerId: PlayerId,
    structureId: string,
  ): boolean {
    void playerId;
    void structureId;
    return this.inInteractionRange;
  }
}
