import {
  COLONY_BIOMES,
  type ColonyBiomeId,
} from "../../content/phase2/ColonyDepthContent";
import {
  terrainCellSprite,
  type Phase1ProductionSprite,
} from "./Phase1ProductionAssets";

function sprite(
  svg: string,
  assetPath: string,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  columns: number,
  index = 0,
): Phase1ProductionSprite {
  return Object.freeze({
    url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    assetPath,
    cellWidth: width,
    cellHeight: height,
    sourceWidth,
    sourceHeight,
    columns,
    index,
  });
}
function tiles(id: ColonyBiomeId): readonly Phase1ProductionSprite[] {
  const p = COLONY_BIOMES[id],
    accent = id === "mist-marsh" ? "#8cba94" : "#d7b87c";
  const cells = Array.from({ length: 8 }, (_, index) => {
    const water = index >= 4;
    const details = water
      ? '<path d="M14 17h8m10-7h6m2 12h8" stroke="' +
        accent +
        '" opacity=".4"/>'
      : id === "mist-marsh"
        ? '<path d="M' +
          String(12 + index * 5) +
          ' 18v-3m3 4v-5" stroke="' +
          accent +
          '" opacity=".7"/><path d="' +
          (index === 0
            ? "M26 22h9l3-3-8-2z"
            : index === 1
              ? "M36 13h4l2-2-5-1z"
              : index === 2
                ? "M17 21h5l3-2-5-1z"
                : "M27 14h2v1h-2z") +
          '" fill="' +
          p.water +
          '"/>'
        : '<path d="m19 19 5-5 9 2-4 5z" fill="' +
          accent +
          '"/><path d="m42 12 4 3-2 4-4-2z" fill="' +
          p.edge +
          '"/>';
    return (
      '<g transform="translate(' +
      String((index % 4) * 64) +
      " " +
      String(Math.floor(index / 4) * 32) +
      ')"><path d="M0 16 32 0 64 16 32 32z" fill="' +
      (water ? p.water : p.ground) +
      '"/>' +
      details +
      '<rect x="' +
      String(28 + (index % 4) * 2) +
      '" y="' +
      String(9 + (index % 3) * 3) +
      '" width="3" height="1" fill="' +
      accent +
      '"/></g>'
    );
  }).join("");
  const base = sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="64" shape-rendering="crispEdges">' +
      cells +
      "</svg>",
    "phase2:terrain:" + id,
    32,
    16,
    128,
    32,
    4,
  );
  return Object.freeze(
    Array.from({ length: 8 }, (_, index) => Object.freeze({ ...base, index })),
  );
}
const palettes = {
  "mist-marsh": tiles("mist-marsh"),
  "ochre-badlands": tiles("ochre-badlands"),
};
export function colonyTerrainSprite(
  biome: ColonyBiomeId,
  terrain: "ground" | "water",
  variant: number,
): Phase1ProductionSprite {
  return biome === "landing-grassland"
    ? terrainCellSprite(terrain, variant)
    : palettes[biome][
        (((variant % 4) + 4) % 4) + (terrain === "water" ? 4 : 0)
      ]!;
}
const sites = {
  "mist-marsh": sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path d="m3 49 29-14 29 14-29 14z" fill="#284a51"/><path d="m16 43 9-31 9-5 2 40-8 7z" fill="#618282"/><path d="m25 12 9-5 2 40-8 7z" fill="#8aa6a2"/><path d="M25 21h8v3h-8m-2 6h10v3H23m-2 6h12v3H21" stroke="#304952"/><rect x="28" y="15" width="3" height="3" fill="#c3d799"/><path d="M10 53v-9m4 11V43m29 7V40m4 8V38" stroke="#7cac85"/></svg>',
    "phase2:site:marsh-relay",
    64,
    64,
    64,
    64,
    1,
  ),
  "ochre-badlands": sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path d="m2 49 30-15 30 15-30 15z" fill="#755b4b"/><path d="m8 39 5-21 10 4-5 23zm17 4 5-21 10 4-5 23zm17-5 5-21 10 4-5 23z" fill="#b0aba0"/><path d="m13 18 10 4-5 23-4-3zm17 4 10 4-5 23-4-3zm17-5 10 4-5 23-4-3z" fill="#566269"/><path d="m8 49 9 4 18-1 15-7" stroke="#d7b87c" fill="none"/><rect x="31" y="27" width="3" height="4" fill="#e2ca95"/></svg>',
    "phase2:site:badlands-array",
    64,
    64,
    64,
    64,
    1,
  ),
};
export function colonySiteSprite(biome: ColonyBiomeId): Phase1ProductionSprite {
  return sites[biome === "mist-marsh" ? "mist-marsh" : "ochre-badlands"];
}

const trees = Object.fromEntries(
  Object.keys(COLONY_BIOMES).map((id) => {
    const marsh = id === "mist-marsh",
      arid = id === "ochre-badlands";
    const dark = marsh ? "#244d49" : arid ? "#4e6042" : "#2d4b3e",
      light = marsh ? "#678d69" : arid ? "#9caa68" : "#789663";
    const base =
      '<ellipse cx="16" cy="44" rx="13" ry="3" fill="#122b2b" opacity=".5"/><path d="M14 43V25h5v18zm3-11 6-5 2 2-6 6z" fill="#78654d"/><path d="M14 42h5v2h-5" fill="#b79868"/>';
    return [
      id,
      sprite(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" shape-rendering="crispEdges">' +
          base +
          '<path d="M5 25v-8h4V9h6V5h8v7h5v13h-4v5H9v-5z" fill="' +
          dark +
          '"/><path d="M9 15V9h6V5h8v7h-5v5h-9zm-4 5h8v4H5" fill="' +
          light +
          '"/><path d="M13 27h10v3H13" fill="#172f32"/></svg>',
        "phase2:tree:" + id,
        32,
        48,
        32,
        48,
        1,
      ),
    ];
  }),
) as Record<ColonyBiomeId, Phase1ProductionSprite>;
const stump = sprite(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" shape-rendering="crispEdges"><ellipse cx="16" cy="44" rx="10" ry="3" fill="#122b2b" opacity=".5"/><path d="M12 44v-8h9v8z" fill="#78654d"/><path d="M12 36h9v3h-9" fill="#c0a47b"/><path d="M15 37h4" stroke="#78654d"/></svg>',
  "phase2:tree:stump",
  32,
  48,
  32,
  48,
  1,
);
export function colonyTimberSprite(
  biome: ColonyBiomeId,
  depleted: boolean,
): Phase1ProductionSprite {
  return depleted ? stump : trees[biome];
}

const resourceAtlas = new Map<string, Phase1ProductionSprite>();
export function colonyResourceSprite(
  biome: ColonyBiomeId,
  id: string,
  depleted: boolean,
): Phase1ProductionSprite {
  if (id === "resource:timber-source")
    return colonyTimberSprite(biome, depleted);
  const key = biome + ":" + id + ":" + String(depleted),
    known = resourceAtlas.get(key);
  if (known) return known;
  const palette = COLONY_BIOMES[biome],
    shadow = '<path d="m3 38 13-6 13 6-13 6z" fill="#112b2c" opacity=".5"/>';
  const rock =
    id === "resource:metal-ore-node" || id === "resource:stone-outcrop";
  const water = id === "resource:potable-water-source";
  const shape = rock
    ? depleted
      ? '<path d="m7 38 6-3 7 2 5 3-11 3z" fill="#56656a"/>'
      : '<path d="m4 37 6-12 9-4 9 11-4 8-13 2z" fill="#4d6169"/><path d="m10 25 9-4 9 11-11-3z" fill="#98a6a0"/><path d="m17 29 11 3-4 8-8-2z" fill="#34454f"/>' +
        (id === "resource:metal-ore-node"
          ? '<path d="m10 29 5-2 2 3-5 3zm9 6 5-2 1 3-4 3z" fill="#dfb477"/>'
          : "")
    : water
      ? '<path d="m2 36 14-7 14 7-14 8z" fill="' +
        palette.edge +
        '"/><path d="m6 36 10-5 10 5-10 5z" fill="' +
        palette.water +
        '"/><path d="M11 35h7m-2 3h6" stroke="#98ccc8"/>'
      : depleted
        ? '<path d="M11 39v-4h2v4m7 0v-3h2v3" fill="#75694b"/>'
        : '<path d="M14 40V24h3v16m-2-10-7-6v-5l9 8m0 7 9-8v-5l-10 7" fill="#49785a"/><path d="M9 23v-6h5v7m4-2v-7h5v6m-4 6h8v4h-8" fill="#95b77a"/>' +
          (id === "resource:food-plant"
            ? '<rect x="10" y="25" width="4" height="4" fill="#d5a260"/><rect x="20" y="30" width="4" height="4" fill="#d5a260"/>'
            : '<path d="M13 18v-5m8 4v-6" stroke="#e2dba0"/>');
  const result = sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" shape-rendering="crispEdges">' +
      shadow +
      shape +
      "</svg>",
    "phase2:resource:" + key,
    32,
    48,
    32,
    48,
    1,
  );
  resourceAtlas.set(key, result);
  return result;
}
const naturalSites = {
  grove: sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path d="m4 52 27-13 29 13-27 12z" fill="#2d4b3e"/><path d="m13 47 34-15 5 6-34 16z" fill="#79684f"/><path d="m13 47 5 7 4-6-5-5z" fill="#c5aa79"/><path d="M10 51v-8m44 10v-9" stroke="#95b77a"/></svg>',
    "phase2:landmark:grove",
    64,
    64,
    64,
    64,
    1,
  ),
  spring: sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path d="m3 49 29-14 29 14-29 14z" fill="#456051"/><path d="m12 49 20-9 19 9-19 9z" fill="#467a85"/><path d="M23 47h13m-6 6h12" stroke="#a0cdc3"/><path d="m8 46 6-8 8 2-4 9zm35 5 8-9 7 2-4 8z" fill="#7f9690"/></svg>',
    "phase2:landmark:spring",
    64,
    64,
    64,
    64,
    1,
  ),
  seam: sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path d="m3 52 29-14 29 14-29 12z" fill="#505d52"/><path d="m10 49 7-15 15-7 23 17-8 13-22-1z" fill="#596971"/><path d="m17 34 15-7 23 17-23-6z" fill="#9ea9a0"/><path d="m25 46 8-5 7 4-9 5zm14 5 9-6 3 3-8 6z" fill="#d4b27b"/></svg>',
    "phase2:landmark:seam",
    64,
    64,
    64,
    64,
    1,
  ),
};
export function colonyLandmarkSprite(site: {
  biomeId: ColonyBiomeId;
  family?: "grove" | "spring" | "seam";
}): Phase1ProductionSprite {
  return site.family
    ? naturalSites[site.family]
    : colonySiteSprite(site.biomeId);
}
const colonyFacilities = {
  bed: sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" shape-rendering="crispEdges"><path d="m3 32 29-14 29 14-29 14z" fill="#8c7760"/><path d="m9 32 23-11 23 11-23 11z" fill="#4c4538"/><path d="m15 32 18-9m-8 13 17-9m-8 13 15-8" stroke="#927c5c"/><path d="M19 31v-6m14 12v-6m12 2v-6" stroke="#95b77a"/></svg>',
    "phase2:facility:bed",
    64,
    48,
    64,
    48,
    1,
  ),
  pen: sprite(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48" shape-rendering="crispEdges"><path d="m3 32 29-14 29 14-29 14z" fill="#456051"/><path d="M4 31V21m28 25V35m28-3V22M32 18V8" stroke="#bbab82" stroke-width="3"/><path d="m4 24 28-14 28 14m-56 4 28 14 28-14" stroke="#8f826a" stroke-width="2" fill="none"/></svg>',
    "phase2:facility:pen",
    64,
    48,
    64,
    48,
    1,
  ),
};
export function colonyFacilitySprite(
  id: "bed" | "pen",
): Phase1ProductionSprite {
  return colonyFacilities[id];
}
