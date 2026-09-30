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
        ? '<path d="M18 17v-5m3 7v-8m19 11v-6" stroke="' +
          accent +
          '"/><path d="M26 22h9l3-3-8-2z" fill="' +
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
      '"/><path d="M0 16 32 32 64 16" fill="none" stroke="' +
      p.edge +
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
    64,
    32,
    256,
    64,
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
