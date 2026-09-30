import { describe, expect, it } from "vitest";
import { createPhase1ContentCatalog } from "../../src/content";
import {
  COLONY_RESEARCH,
  validateColonyDepthContent,
} from "../../src/content/phase2/ColonyDepthContent";
import {
  colonyBiomeAt,
  colonySurveySites,
  colonyWeatherAt,
} from "../../src/world/phase2/ColonyRegions";

describe("Colony depth contracts and seeded regions", () => {
  it("validates real material identities and acyclic prerequisites", () => {
    validateColonyDepthContent();
    const catalog = createPhase1ContentCatalog();
    for (const research of COLONY_RESEARCH)
      for (const cost of research.costs)
        expect(catalog.getAs(cost.itemDefinitionId, "item")).toBeDefined();
    expect(() =>
      validateColonyDepthContent([
        { ...COLONY_RESEARCH[0]!, prerequisites: ["field-survey"] },
      ]),
    ).toThrow(/Cyclic/);
    expect(() =>
      validateColonyDepthContent([
        {
          ...COLONY_RESEARCH[0]!,
          costs: [{ itemDefinitionId: "item:stone", quantity: 0 }],
        },
      ]),
    ).toThrow(/costs/);
    expect(() =>
      validateColonyDepthContent([
        { ...COLONY_RESEARCH[0]!, prerequisites: ["cultivation"] },
      ]),
    ).toThrow(/Missing/);
  });
  it("preserves Landing and places distinct sites in the correct region for every orientation", () => {
    for (const seed of ["one", "two", "three", "four", "p1-world-golden"]) {
      expect(colonyBiomeAt(seed, { x: 0, y: 0 })).toBe("landing-grassland");
      const sites = colonySurveySites(seed);
      expect(sites.map((site) => colonyBiomeAt(seed, site.position))).toEqual([
        "mist-marsh",
        "ochre-badlands",
      ]);
      expect(colonySurveySites(seed)).toEqual(sites);
      for (const site of sites) {
        expect(colonyWeatherAt(seed, site.position, 7199).warning).toBe(false);
        expect(colonyWeatherAt(seed, site.position, 7200).warning).toBe(true);
        expect(colonyWeatherAt(seed, site.position, 9000).weather).not.toBe(
          "clear",
        );
        expect(colonyWeatherAt(seed, site.position, 18000 + 9000).weather).toBe(
          colonyWeatherAt(seed, site.position, 9000).weather,
        );
      }
    }
  });
});
