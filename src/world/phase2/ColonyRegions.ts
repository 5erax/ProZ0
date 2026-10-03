import {
  DeterministicRng,
  deriveSeedState,
  type WorldPosition,
} from "../../foundation";
import {
  COLONY_BIOMES,
  type ColonyBiomeId,
} from "../../content/phase2/ColonyDepthContent";

const orientations = new Map<string, number>();
function seedQuadrant(seed: string): number {
  const known = orientations.get(seed);
  if (known !== undefined) return known;
  const value =
    new DeterministicRng(
      deriveSeedState({
        worldSeed: seed,
        namespace: "colony-depth:regions:v1",
        stableIdentifiers: ["orientation"],
      }),
    ).nextUint32() % 4;
  if (orientations.size >= 16) orientations.clear();
  orientations.set(seed, value);
  return value;
}
function rotate(point: WorldPosition, quadrant: number): WorldPosition {
  switch (quadrant) {
    case 1:
      return { x: -point.y, y: point.x };
    case 2:
      return { x: -point.x, y: -point.y };
    case 3:
      return { x: point.y, y: -point.x };
    default:
      return point;
  }
}
export function colonyRegionPosition(seed: string, point: WorldPosition): WorldPosition { return rotate(point, (4-seedQuadrant(seed))%4); }
export function colonyBiomeAt(
  seed: string,
  point: WorldPosition,
): ColonyBiomeId {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    seed.length === 0
  )
    throw new Error("Invalid colony region query.");
  if (Math.hypot(point.x, point.y) < 96) return "landing-grassland";
  const oriented = rotate(point, seedQuadrant(seed));
  return oriented.y < 0 ? "mist-marsh" : "ochre-badlands";
}
export interface ColonySurveySite {
  readonly id: string;
  readonly biomeId: ColonyBiomeId;
  readonly position: WorldPosition;
  readonly name: string;
  readonly observation: string;
  readonly unresolved: string;
  readonly family?: 'grove' | 'spring' | 'seam';
  readonly resources?: readonly string[];
}
export const COLONY_SURVEY_SITE_IDS=['site:marsh-relay','site:badlands-array','site:windfall-grove','site:clear-spring','site:exposed-seam'] as const;
export function colonySurveySites(seed: string): readonly ColonySurveySite[] {
  const undo = (4 - seedQuadrant(seed)) % 4;
  return Object.freeze(
    [
      {
        id: "site:marsh-relay",
        biomeId: "mist-marsh" as const,
        position: rotate({ x: 48, y: -120 }, undo),
        name: "Flooded Relay",
        observation:
          "An angled support emerges from the wet ground. Its repeated grooves are visible beneath mineral deposits.",
        unresolved: "Was this raised before the water reached the support?",
      },
      {
        id: "site:badlands-array",
        biomeId: "ochre-badlands" as const,
        position: rotate({ x: -48, y: 120 }, undo),
        name: "Weathered Array",
        observation:
          "Several matching plates face the same direction. Sand covers their lower edges.",
        unresolved: "What aligned these plates, and what once connected them?",
      },
      {id:'site:windfall-grove',biomeId:'landing-grassland' as const,position:{x:-36,y:-10},name:'Windfall Grove',family:'grove' as const,resources:['resource:timber-source','resource:fiber-plant'],observation:'Mature trees and low plants form a sheltered resource pocket. Cut timber leaves a stump; renewed growth takes time.',unresolved:'Can a lighter harvest keep this pocket productive while the base grows?'},
      {id:'site:clear-spring',biomeId:'landing-grassland' as const,position:{x:32,y:-18},name:'Clear Spring',family:'spring' as const,resources:['resource:potable-water-source'],observation:'Clear water collects below the grassy bank. The visible water source can be gathered; shallow water slows travel and cannot support a new building.',unresolved:'Which route brings water home with the least repeated travel?'},
      {id:'site:exposed-seam',biomeId:'landing-grassland' as const,position:{x:48,y:26},name:'Exposed Seam',family:'seam' as const,resources:['resource:stone-outcrop','resource:metal-ore-node'],observation:'Broken rock exposes a mineral seam beside the stone outcrop. A field tool reduces the work needed for suitable deposits.',unresolved:'Would storage near the base make this heavier supply route easier?'},
    ].map((site) =>
      Object.freeze({ ...site, position: Object.freeze(site.position) }),
    ),
  );
}
export type ColonyWeather = "clear" | "mist-rain" | "dry-wind";
/** Content-v2 surface rules are a separate overlay: generated v3/v4 bases and entity IDs stay unchanged. */
export function colonyLandscapeTerrainAt(seed:string,point:WorldPosition,base:'ground'|'water',generationVersion=4):'ground'|'water'{
  // V5 stores its river raster in the generated base; do not add legacy stripes.
  if(generationVersion>=5)return base;
  if(base==='water'||colonyBiomeAt(seed,point)!=='mist-marsh'||Math.hypot(point.x,point.y)<110)return base;
  const cell={x:Math.floor(point.x/4)*4+2,y:Math.floor(point.y/4)*4+2},oriented=rotate(cell,seedQuadrant(seed));
  const bend=((Math.floor(oriented.y/32)%3)+3)%3;
  const column=Math.floor((oriented.x+bend*4)/4);
  return ((column%9)+9)%9===4?'water':'ground';
}
export function colonyWeatherAt(
  seed: string,
  point: WorldPosition,
  tick: number,
): {
  readonly biomeId: ColonyBiomeId;
  readonly weather: ColonyWeather;
  readonly warning: boolean;
  readonly thermalTarget: number;
  readonly cycle: number;
} {
  if (!Number.isSafeInteger(tick) || tick < 0)
    throw new Error("Invalid colony weather tick.");
  const biomeId = colonyBiomeAt(seed, point);
  const cycleTicks = 18000;
  const phase = tick % cycleTicks;
  const active =
    phase >= 9000 && phase < (biomeId === "landing-grassland" ? 12000 : 15000);
  return Object.freeze({
    biomeId,
    weather: active
      ? biomeId === "ochre-badlands"
        ? "dry-wind"
        : "mist-rain"
      : "clear",
    warning: phase >= 7200 && phase < 9000,
    thermalTarget: active
      ? biomeId === "mist-marsh"
        ? 24
        : biomeId === "ochre-badlands"
          ? 78
          : 42
      : COLONY_BIOMES[biomeId].exposure,
    cycle: Math.floor(tick / cycleTicks),
  });
}


const windDirections = new Map<string, -1 | 1>();
export interface ColonyWeatherVisual {
  readonly phase: 'calm' | 'warning' | 'rise' | 'peak' | 'fall';
  readonly intensity: number;
  readonly direction: -1 | 1;
}
/** Read-only envelope. Does not draw from gameplay RNG or change weather/thermal timing. */
export function colonyWeatherVisualAt(seed: string, point: WorldPosition, tick: number): ColonyWeatherVisual {
  const weather=colonyWeatherAt(seed,point,tick), phase=tick%18000;
  const end=weather.biomeId==='landing-grassland'?12000:15000;
  const key=seed+':'+weather.cycle;
  let direction=windDirections.get(key);
  if(direction===undefined){direction=(new DeterministicRng(deriveSeedState({worldSeed:seed,namespace:'colony:weather-art:v1',stableIdentifiers:[String(weather.cycle)]})).nextUint32()%2)?1:-1;if(windDirections.size>=16)windDirections.clear();windDirections.set(key,direction);}
  if(weather.warning) return {phase:'warning',intensity:.08+.1*(phase-7200)/1800,direction};
  if(weather.weather==='clear') return {phase:'calm',intensity:0,direction};
  if(phase<9900) return {phase:'rise',intensity:.18+.82*(phase-9000)/900,direction};
  if(phase>end-1200) return {phase:'fall',intensity:Math.max(0,(end-phase)/1200),direction};
  return {phase:'peak',intensity:1,direction};
}
