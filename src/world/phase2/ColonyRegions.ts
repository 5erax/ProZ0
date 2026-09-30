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
}
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
    ].map((site) =>
      Object.freeze({ ...site, position: Object.freeze(site.position) }),
    ),
  );
}
export type ColonyWeather = "clear" | "mist-rain" | "dry-wind";
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
