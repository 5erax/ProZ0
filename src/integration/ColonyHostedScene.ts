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
  skins: Record<string, string> = {},
  names: Record<string, string> = {},
  includeMap = true,
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
        ...(s.containerId ? { containerId: s.containerId } : {}),
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
  for (const cache of bundle.world.exportSnapshot().deathCaches.caches)
    if (
      nearby(cache.position.x, cache.position.y) &&
      known(cache.position.x, cache.position.y)
    )
      entities.push({
        id: cache.entityId,
        definitionId: "death-cache",
        type: "death-cache",
        x: cache.position.x,
        y: cache.position.y,
        revision: cache.revision,
        depleted: false,
        containerId: cache.containerId,
      });
  for (const drop of bundle.world.exportSnapshot().drops)
    if (
      drop.available &&
      nearby(drop.position.x, drop.position.y) &&
      known(drop.position.x, drop.position.y)
    )
      entities.push({
        id: drop.worldDropId,
        definitionId: "world-drop",
        type: "world-drop",
        x: drop.position.x,
        y: drop.position.y,
        revision: drop.revision,
        depleted: false,
        containerId: drop.containerId,
      });
  return {
    version: 1,
    worldSeed: bundle.config.worldSeed,
    tick: bundle.authorityTick,
    playerSkins: skins,
    playerNames: names,
    ...(includeMap ? { map: colonyHostedMap(bundle).cells } : {}),
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
      stamina: survival.staminaMilli / 1000,
      temperature: survival.temperatureMilli / 1000,
      lifeState: survival.lifeState.type,
    },
  };
}

const mapCache = new WeakMap<
  Phase1AuthorityBundle,
  {
    signature: string;
    revision: number;
    cells: NonNullable<ColonySceneV1["map"]>;
  }
>();
export function colonyHostedMap(bundle: Phase1AuthorityBundle) {
  const signature = bundle.world
    .getActiveChunkViews()
    .map((v) => toChunkKey(v.base.coord) + ":" + v.delta.exploration.revision)
    .sort()
    .join("|");
  const previous = mapCache.get(bundle);
  if (previous?.signature === signature) return previous;
  const map: { x: number; y: number; terrain: "ground" | "water" }[] = [];
  for (const view of bundle.world.getActiveChunkViews()) {
    const coord = view.base.coord;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (!isExplorationCellKnown(coord, view.delta.exploration, x, y))
          continue;
        const wx = coord.x * 32 + x * 2 + 1,
          wy = coord.y * 32 + y * 2 + 1;
        const axis = view.base.terrain.cellsPerAxis,
          size = view.base.terrain.cellSizeWorldUnits;
        const base =
          view.base.terrain.cells[
            Math.floor((y * 2 + 1) / size) * axis +
              Math.floor((x * 2 + 1) / size)
          ]!;
        map.push({
          x: wx,
          y: wy,
          terrain: colonyLandscapeTerrainAt(
            bundle.config.worldSeed,
            { x: wx, y: wy },
            base,
          ),
        });
      }
  }
  const value = {
    signature,
    revision: (previous?.revision ?? -1) + 1,
    cells: map,
  };
  mapCache.set(bundle, value);
  return value;
}
