export const COLONY_DEPTH_CONTENT_VERSION = 1 as const;
export type ColonyBiomeId =
  | "landing-grassland"
  | "mist-marsh"
  | "ochre-badlands";
export type ColonyProfessionId = "explorer" | "engineer" | "cultivator";
export type ColonyResearchId =
  | "field-survey"
  | "water-stewardship"
  | "expanded-storage"
  | "cultivation";
export interface ColonyResearchDefinition {
  readonly id: ColonyResearchId;
  readonly name: string;
  readonly prerequisites: readonly ColonyResearchId[];
  readonly costs: readonly {
    readonly itemDefinitionId: string;
    readonly quantity: number;
  }[];
}
export const COLONY_BIOMES = Object.freeze({
  "landing-grassland": Object.freeze({
    name: "Landing Grassland",
    ground: "#56694d",
    edge: "#273d38",
    water: "#46737d",
    exposure: 50,
    recoveryMultiplier: 1,
  }),
  "mist-marsh": Object.freeze({
    name: "Mist Marsh",
    ground: "#416965",
    edge: "#173e48",
    water: "#428d9c",
    exposure: 38,
    recoveryMultiplier: 0.75,
  }),
  "ochre-badlands": Object.freeze({
    name: "Ochre Badlands",
    ground: "#a37b50",
    edge: "#594a45",
    water: "#5a7980",
    exposure: 62,
    recoveryMultiplier: 1.5,
  }),
});
// Renewal creates distinct supply patterns without rewriting accepted generation-v3 entities.
export const COLONY_RESOURCE_RENEWAL: Readonly<Record<ColonyBiomeId, Readonly<Record<string, number>>>> = Object.freeze({
  'landing-grassland': Object.freeze({}),
  'mist-marsh': Object.freeze({'resource:fiber-plant':0.75,'resource:food-plant':0.8,'resource:metal-ore-node':1.5}),
  'ochre-badlands': Object.freeze({'resource:fiber-plant':1.5,'resource:food-plant':1.5,'resource:stone-outcrop':0.6,'resource:metal-ore-node':0.6}),
});
export const COLONY_PROFESSIONS = Object.freeze({
  explorer: Object.freeze({
    name: "Explorer",
    requiredRegions: 2,
    requiredResearch: "field-survey" as const,
    description: "A broader local survey radius in explored expeditions.",
  }),
  engineer: Object.freeze({
    name: "Engineer",
    requiredRegions: 1,
    requiredResearch: "expanded-storage" as const,
    description: "Higher effective colony storage capacity.",
  }),
  cultivator: Object.freeze({
    name: "Cultivator",
    requiredRegions: 1,
    requiredResearch: "cultivation" as const,
    description: "Crops mature faster under active care.",
  }),
});
export const COLONY_RESEARCH: readonly ColonyResearchDefinition[] =
  Object.freeze(
    (
      [
        {
          id: "field-survey",
          name: "Field Survey",
          prerequisites: [],
          costs: [
            { itemDefinitionId: "item:plant-fiber", quantity: 3 },
            { itemDefinitionId: "item:stone", quantity: 2 },
          ],
        },
        {
          id: "water-stewardship",
          name: "Water Stewardship",
          prerequisites: ["field-survey"],
          costs: [
            { itemDefinitionId: "item:clean-water", quantity: 2 },
            { itemDefinitionId: "item:cordage", quantity: 1 },
          ],
        },
        {
          id: "expanded-storage",
          name: "Expanded Storage",
          prerequisites: ["field-survey"],
          costs: [
            { itemDefinitionId: "item:timber", quantity: 4 },
            { itemDefinitionId: "item:metal-ore", quantity: 2 },
          ],
        },
        {
          id: "cultivation",
          name: "Cultivation",
          prerequisites: ["water-stewardship"],
          costs: [
            { itemDefinitionId: "item:edible-plant", quantity: 2 },
            { itemDefinitionId: "item:timber", quantity: 2 },
          ],
        },
      ] satisfies ColonyResearchDefinition[]
    ).map((value) =>
      Object.freeze({
        ...value,
        prerequisites: Object.freeze([...value.prerequisites]),
        costs: Object.freeze(
          value.costs.map((cost) => Object.freeze({ ...cost })),
        ),
      }),
    ),
  );

export function validateColonyDepthContent(
  research: readonly ColonyResearchDefinition[] = COLONY_RESEARCH,
): void {
  const byId = new Map(research.map((value) => [value.id, value]));
  if (byId.size !== research.length)
    throw new Error("Duplicate colony research identity.");
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id))
      throw new Error("Cyclic colony research prerequisite.");
    if (visited.has(id)) return;
    const value = byId.get(id as ColonyResearchId);
    if (value === undefined || value.name.trim().length === 0)
      throw new Error("Missing colony research definition.");
    if (
      value.costs.length === 0 ||
      value.costs.some(
        (cost) =>
          !cost.itemDefinitionId.startsWith("item:") ||
          !Number.isSafeInteger(cost.quantity) ||
          cost.quantity <= 0,
      ) ||
      new Set(value.costs.map((cost) => cost.itemDefinitionId)).size !==
        value.costs.length
    )
      throw new Error("Invalid colony research costs.");
    visiting.add(id);
    for (const parent of value.prerequisites) visit(parent);
    visiting.delete(id);
    visited.add(id);
  };
  for (const value of research) visit(value.id);
}
