import { DeterministicRng, deriveSeedState } from "../../foundation";
import { colonyRiverTerrainAt } from "./ColonyHydrology";
import {
  CAVE_TEMPLATE_IDS,
  generateCaveLayout,
  type CavePortal,
} from "./ColonyCaveLayout";

/** Optional worldspace content. Never changes generated surface chunks or their IDs. */
export function soloCaveRegistry(
  seed: string,
  generationVersion: number,
): readonly CavePortal[] {
  if (!seed || ![3, 4, 5].includes(generationVersion))
    throw Error("Unsupported cave registry identity");
  const rng = new DeterministicRng(
    deriveSeedState({
      worldSeed: seed,
      namespace: "solo-caves:portals:v1",
      stableIdentifiers: [String(generationVersion)],
    }),
  );
  return Object.freeze(
    CAVE_TEMPLATE_IDS.map((template, i) => {
      // Three separate dry approaches inside the first expedition ring. The legacy
      // marsh stripe overlay only starts beyond 110 m; the starter pond is remote.
      const centers = [
        { x: -68, y: -36 },
        { x: 68, y: 36 },
        { x: -44, y: 76 },
      ];
      const center = centers[i]!,
        jitterX = Number(rng.nextUint32() % 5) * 2 - 4,
        jitterY = Number(rng.nextUint32() % 5) * 2 - 4;
      let position = { x: center.x + jitterX + 1, y: center.y + jitterY + 1 };
      if (
        generationVersion === 5 &&
        colonyRiverTerrainAt(seed, position) === "water"
      ) {
        // Defensive bounded search if future seed parameters put a tributary here.
        const candidates = Array.from({ length: 25 }, (_, n) => ({
          x: center.x + ((n % 5) - 2) * 2 + 1,
          y: center.y + (Math.floor(n / 5) - 2) * 2 + 1,
        }));
        const dry = candidates.find(
          (p) => colonyRiverTerrainAt(seed, p) === "ground",
        );
        if (!dry) throw Error("Cave approach has no dry ground");
        position = dry;
      }
      const id = "portal:" + template;
      return Object.freeze({
        id,
        position: Object.freeze(position),
        layout: generateCaveLayout(seed, id, template),
      });
    }),
  );
}
