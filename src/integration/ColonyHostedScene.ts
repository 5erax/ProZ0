import type { Phase1AuthorityBundle } from "./Phase1AuthorityBundle";
import type { ColonySceneV1 } from "../protocol/v1/ColonySceneV1";
import {
  fromWorldPosition,
  toChunkKey,
  toChunkLocalPosition,
} from "../world/chunks/ChunkCoord";
import {
  isExplorationCellKnown,
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS as explorationSize,
} from "../world/phase1/ExplorationGrid";
import {
  colonySurveySites,
  colonyLandscapeTerrainAt,
} from "../world/phase2/ColonyRegions";
import {
  CULTIVATION_POSITION,
  PEN_POSITION,
} from "../simulation/sustenance/ColonySustenanceAuthority";

export function colonyHostedScene(
  bundle: Phase1AuthorityBundle,
  playerId: string,
  skins:Record<string,string>={},
): ColonySceneV1 {
  const position = bundle.getPlayerPosition(playerId);
  const views = new Map(
    bundle.world
      .getActiveChunkViews()
      .map((view) => [toChunkKey(view.base.coord), view]),
  );
  const known = (x: number, y: number): boolean => {
    const coord = fromWorldPosition({ x, y }),
      view = views.get(toChunkKey(coord));
    if (view === undefined) return false;
    const local = toChunkLocalPosition({ x, y }, coord);
    return isExplorationCellKnown(
      coord,
      view.delta.exploration,
      Math.floor(local.x / explorationSize),
      Math.floor(local.y / explorationSize),
    );
  };
  const nearby = (x: number, y: number): boolean =>
    Math.abs(x - position.x) <= 22 && Math.abs(y - position.y) <= 22;
  const terrain: ColonySceneV1["terrain"][number][] = [];
  for (
    let y = Math.floor(position.y / 2) * 2 - 24;
    y <= position.y + 24;
    y += 2
  )
    for (
      let x = Math.floor(position.x / 2) * 2 - 24;
      x <= position.x + 24;
      x += 2
    ) {
      if (!known(x + 1, y + 1)) continue;
      const coord = fromWorldPosition({ x: x + 1, y: y + 1 }),
        view = views.get(toChunkKey(coord))!;
      const local = toChunkLocalPosition({ x: x + 1, y: y + 1 }, coord),
        axis = view.base.terrain.cellsPerAxis;
      terrain.push({
        x: x + 1,
        y: y + 1,
        terrain: colonyLandscapeTerrainAt(
          bundle.config.worldSeed,
          { x: x + 1, y: y + 1 },
          view.base.terrain.cells[
            Math.floor(local.y / view.base.terrain.cellSizeWorldUnits) * axis +
              Math.floor(local.x / view.base.terrain.cellSizeWorldUnits)
          ]!,
        ),
      });
    }
  const entities: ColonySceneV1["entities"][number][] = bundle.world
    .getActiveGeneratedEntities()
    .filter(
      (e) =>
        nearby(e.position.x, e.position.y) && known(e.position.x, e.position.y),
    )
    .map((e) => ({
      id: e.entityId,
      definitionId: e.definitionId,
      type: e.type,
      x: e.position.x,
      y: e.position.y,
      revision: bundle.worldStore.getResourceState(e.entityId)?.revision ?? 0,
      depleted:
        bundle.worldStore.getResourceState(e.entityId)?.depleted ?? false,
    }));
  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index]!;
    if (entity.type === "hostile") {
      const predator = bundle.world.getPredator(entity.id);
      if (predator)
        entities[index] = {
          ...entity,
          x: predator.position.x,
          y: predator.position.y,
          revision: predator.revision,
          depleted: predator.state === "dead",
        };
    }
  }
  for (const s of bundle.buildings.exportSnapshot().foothold.structures)
    if (nearby(s.position.x, s.position.y) && known(s.position.x, s.position.y))
      entities.push({
        id: s.structureId,
        definitionId: s.definitionId,
        type: "structure",
        x: s.position.x,
        y: s.position.y,
        revision: s.revision,
        depleted: false,
      });
  const colony = bundle.sustenance.read();
  for (const [id, position, built] of [
    ["bed", CULTIVATION_POSITION, colony.bedBuilt],
    ["pen", PEN_POSITION, colony.penBuilt],
  ] as const)
    if (
      built &&
      nearby(position.x, position.y) &&
      known(position.x, position.y)
    )
      entities.push({
        id: "colony:" + id,
        definitionId: "colony:" + id,
        type: "colony-site",
        ...position,
        revision: colony.revision,
        depleted: false,
      });
  const survival = bundle.survival.getPlayerState(playerId);
  return {
    version: 1,
    worldSeed: bundle.config.worldSeed,
    tick: bundle.authorityTick,
    playerSkins:skins,
    terrain,
    entities,
    sites: colonySurveySites(bundle.config.worldSeed)
      .filter(
        (s) =>
          nearby(s.position.x, s.position.y) &&
          known(s.position.x, s.position.y),
      )
      .map((s) => ({
        id: s.id,
        biomeId: s.biomeId,
        name: s.name,
        x: s.position.x,
        y: s.position.y,
      })),
    survival: {
      health: survival.healthMilli / 1000,
      food: survival.foodMilli / 1000,
      water: survival.waterMilli / 1000,
    },
  };
}
