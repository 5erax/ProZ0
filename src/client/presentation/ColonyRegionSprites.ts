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
        ? '<path d="M'+String(12+index*5)+' 18v-3m3 4v-5" stroke="' +
          accent +
          '" opacity=".7"/><path d="'+(index===0?'M26 22h9l3-3-8-2z':index===1?'M36 13h4l2-2-5-1z':index===2?'M17 21h5l3-2-5-1z':'M27 14h2v1h-2z')+'" fill="' +
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

const trees = Object.fromEntries(Object.keys(COLONY_BIOMES).map(id=>{
  const marsh=id==='mist-marsh',arid=id==='ochre-badlands';
  const dark=marsh?'#244d49':arid?'#4e6042':'#2d4b3e',light=marsh?'#678d69':arid?'#9caa68':'#789663';
  const base='<ellipse cx="16" cy="44" rx="13" ry="3" fill="#122b2b" opacity=".5"/><path d="M14 43V25h5v18zm3-11 6-5 2 2-6 6z" fill="#78654d"/><path d="M14 42h5v2h-5" fill="#b79868"/>';
  return [id,sprite('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" shape-rendering="crispEdges">'+base+'<path d="M5 25v-8h4V9h6V5h8v7h5v13h-4v5H9v-5z" fill="'+dark+'"/><path d="M9 15V9h6V5h8v7h-5v5h-9zm-4 5h8v4H5" fill="'+light+'"/><path d="M13 27h10v3H13" fill="#172f32"/></svg>','phase2:tree:'+id,32,48,32,48,1)];
})) as Record<ColonyBiomeId,Phase1ProductionSprite>;
const stump=sprite('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" shape-rendering="crispEdges"><ellipse cx="16" cy="44" rx="10" ry="3" fill="#122b2b" opacity=".5"/><path d="M12 44v-8h9v8z" fill="#78654d"/><path d="M12 36h9v3h-9" fill="#c0a47b"/><path d="M15 37h4" stroke="#78654d"/></svg>','phase2:tree:stump',32,48,32,48,1);
export function colonyTimberSprite(biome:ColonyBiomeId,depleted:boolean):Phase1ProductionSprite{return depleted?stump:trees[biome];}
