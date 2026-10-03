import { expect, it } from "vitest";
import { soloCaveRegistry } from "../../src/world/phase2/SoloCaveRegistry";
import { colonyRiverTerrainAt } from "../../src/world/phase2/ColonyHydrology";
it("derives three stable, separate dry approaches without consuming surface generation RNG", () => {
  const signatures = new Set<string>();
  for (let n = 0; n < 100; n++)
    for (const version of [3, 4, 5]) {
      const seed = "cave-registry:" + n,
        portals = soloCaveRegistry(seed, version);
      expect(soloCaveRegistry(seed, version)).toEqual(portals);
      expect(new Set(portals.map((p) => p.layout.spaceId)).size).toBe(3);
      for (const p of portals) {
        expect(Math.hypot(p.position.x, p.position.y)).toBeLessThan(110);
        if (version === 5)
          expect(colonyRiverTerrainAt(seed, p.position)).toBe("ground");
        expect(p.layout.portalId).toBe(p.id);
      }
      signatures.add(JSON.stringify(portals.map((p) => p.position)));
    }
  expect(signatures.size).toBeGreaterThan(200);
  expect(() => soloCaveRegistry("seed", 6)).toThrow("Unsupported");
});
