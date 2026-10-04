export const INDUSTRY_CONTENT_VERSION = 1 as const;
export const INDUSTRY_TICKS_PER_SECOND = 60;
export const INDUSTRY_TRANSPORT_INTERVAL_TICKS = 30;
export const INDUSTRY_MAINTENANCE_INTERVAL_TICKS = 300;
export const INDUSTRY_MAX_FACILITIES = 48;
export const INDUSTRY_MAX_LINKS = 96;
export const INDUSTRY_BUILD_RANGE = 4;
export const INDUSTRY_INTERACTION_RANGE = 2.5;
export const INDUSTRY_RESEARCH_RANGE = 7.5;
export const INDUSTRY_CONVEYOR_RANGE = 8;
export const INDUSTRY_ROVER_DRIVE_RANGE = 8;

export type IndustryFacilityKind = 'solar-array' | 'power-relay' | 'depot'
  | 'fiber-processor' | 'fabricator' | 'greenhouse' | 'rover';
export type IndustryResearchId = 'automation' | 'logistics' | 'greenhouse'
  | 'mobility' | 'advanced-greenhouse';
export interface IndustryCost { readonly itemDefinitionId: string; readonly quantity: number }
export interface IndustryFacilityDefinition {
  readonly id: IndustryFacilityKind;
  readonly name: string;
  readonly description: string;
  readonly costs: readonly IndustryCost[];
  readonly requiredResearch: IndustryResearchId | null;
  readonly powerDemand: number;
  readonly powerCapacity: number;
  readonly powerRadius: number;
  readonly bufferCapacity: number;
}
export interface IndustryRecipeDefinition {
  readonly id: string;
  readonly name: string;
  readonly facilityKind: 'fiber-processor' | 'fabricator' | 'greenhouse';
  readonly inputs: readonly IndustryCost[];
  readonly outputs: readonly IndustryCost[];
  readonly cycleTicks: number;
  readonly requiredResearch: IndustryResearchId | null;
}
export interface IndustryResearchDefinition {
  readonly id: IndustryResearchId;
  readonly name: string;
  readonly description: string;
  readonly prerequisites: readonly IndustryResearchId[];
  readonly colonyPrerequisite: string | null;
  readonly costs: readonly IndustryCost[];
}
const cost = (itemDefinitionId: string, quantity: number): IndustryCost => Object.freeze({ itemDefinitionId, quantity });
export const INDUSTRY_CONVEYOR_COSTS: readonly IndustryCost[] = Object.freeze([cost('item:cordage', 1), cost('item:metal-ore', 1)]);
export const INDUSTRY_REPAIR_COSTS: readonly IndustryCost[] = Object.freeze([cost('item:repair-patch', 1)]);
const definition = (value: IndustryFacilityDefinition): IndustryFacilityDefinition => Object.freeze({ ...value, costs: Object.freeze(value.costs) });
export const INDUSTRY_ITEM_IDS = Object.freeze([
  'item:plant-fiber', 'item:timber', 'item:stone', 'item:metal-ore',
  'item:edible-plant', 'item:clean-water', 'item:cordage', 'item:repair-patch',
  'item:storage-crate-kit', 'item:workbench-kit', 'item:habitat-kit',
  'item:power-unit-kit', 'item:machine-kit',
]);
export const INDUSTRY_FACILITIES: Readonly<Record<IndustryFacilityKind, IndustryFacilityDefinition>> = Object.freeze({
  'solar-array': definition({ id: 'solar-array', name: 'Solar array', description: 'Supplies 12 power units to an independent local network.', costs: [cost('item:metal-ore', 4), cost('item:timber', 2), cost('item:cordage', 1)], requiredResearch: 'automation', powerDemand: 0, powerCapacity: 12, powerRadius: 6, bufferCapacity: 0 }),
  'power-relay': definition({ id: 'power-relay', name: 'Power relay', description: 'Joins nearby arrays and carries their power within six world units.', costs: [cost('item:metal-ore', 1), cost('item:cordage', 1)], requiredResearch: 'automation', powerDemand: 0, powerCapacity: 0, powerRadius: 6, bufferCapacity: 0 }),
  depot: definition({ id: 'depot', name: 'Logistics depot', description: 'Stores 64 material units for conveyor routing.', costs: [cost('item:timber', 3), cost('item:stone', 2), cost('item:cordage', 1)], requiredResearch: 'automation', powerDemand: 0, powerCapacity: 0, powerRadius: 0, bufferCapacity: 64 }),
  'fiber-processor': definition({ id: 'fiber-processor', name: 'Fiber processor', description: 'Processes raw fiber into cordage.', costs: [cost('item:timber', 3), cost('item:metal-ore', 3), cost('item:cordage', 1)], requiredResearch: 'automation', powerDemand: 3, powerCapacity: 0, powerRadius: 0, bufferCapacity: 32 }),
  fabricator: definition({ id: 'fabricator', name: 'Fabricator', description: 'Turns processed supplies into repair patches and construction kits.', costs: [cost('item:timber', 3), cost('item:metal-ore', 4), cost('item:cordage', 2)], requiredResearch: 'automation', powerDemand: 5, powerCapacity: 0, powerRadius: 0, bufferCapacity: 32 }),
  greenhouse: definition({ id: 'greenhouse', name: 'Greenhouse', description: 'Cultivates protected food using clean water and seed plants.', costs: [cost('item:timber', 4), cost('item:metal-ore', 3), cost('item:cordage', 2)], requiredResearch: 'greenhouse', powerDemand: 4, powerCapacity: 0, powerRadius: 0, bufferCapacity: 32 }),
  rover: definition({ id: 'rover', name: 'Cargo rover', description: 'Carries 48 material units, charges near power and drives with its operator.', costs: [cost('item:timber', 2), cost('item:metal-ore', 6), cost('item:repair-patch', 1), cost('item:cordage', 2)], requiredResearch: 'mobility', powerDemand: 2, powerCapacity: 0, powerRadius: 0, bufferCapacity: 48 }),
});
export const INDUSTRY_RECIPES: readonly IndustryRecipeDefinition[] = Object.freeze([
  { id: 'fiber-cordage', name: 'Cordage', facilityKind: 'fiber-processor', inputs: [cost('item:plant-fiber', 3)], outputs: [cost('item:cordage', 1)], cycleTicks: 300, requiredResearch: 'automation' },
  { id: 'reinforced-patch', name: 'Repair patch', facilityKind: 'fabricator', inputs: [cost('item:cordage', 1), cost('item:metal-ore', 1)], outputs: [cost('item:repair-patch', 1)], cycleTicks: 600, requiredResearch: 'automation' },
  { id: 'industrial-machine-kit', name: 'Machine kit', facilityKind: 'fabricator', inputs: [cost('item:repair-patch', 1), cost('item:metal-ore', 4), cost('item:timber', 3)], outputs: [cost('item:machine-kit', 1)], cycleTicks: 900, requiredResearch: 'logistics' },
  { id: 'industrial-power-kit', name: 'Power unit kit', facilityKind: 'fabricator', inputs: [cost('item:repair-patch', 1), cost('item:metal-ore', 3), cost('item:timber', 3)], outputs: [cost('item:power-unit-kit', 1)], cycleTicks: 900, requiredResearch: 'logistics' },
  { id: 'protected-crops', name: 'Protected crops', facilityKind: 'greenhouse', inputs: [cost('item:edible-plant', 1), cost('item:clean-water', 2)], outputs: [cost('item:edible-plant', 4)], cycleTicks: 3600, requiredResearch: 'greenhouse' },
  { id: 'intensive-crops', name: 'Intensive crops', facilityKind: 'greenhouse', inputs: [cost('item:edible-plant', 1), cost('item:clean-water', 2), cost('item:plant-fiber', 1)], outputs: [cost('item:edible-plant', 6)], cycleTicks: 2400, requiredResearch: 'advanced-greenhouse' },
].map(value => Object.freeze({ ...value, inputs: Object.freeze(value.inputs), outputs: Object.freeze(value.outputs) })) as IndustryRecipeDefinition[]);
export const INDUSTRY_RESEARCH: readonly IndustryResearchDefinition[] = Object.freeze([
  { id: 'automation', name: 'Industrial automation', description: 'Unlock arrays, relays, material depots and processing machines.', prerequisites: [], colonyPrerequisite: 'expanded-storage', costs: [cost('item:metal-ore', 4), cost('item:cordage', 2)] },
  { id: 'logistics', name: 'Conveyor logistics', description: 'Unlock directed filtered conveyors and construction-kit processing.', prerequisites: ['automation'], colonyPrerequisite: null, costs: [cost('item:metal-ore', 3), cost('item:cordage', 2)] },
  { id: 'greenhouse', name: 'Protected cultivation', description: 'Unlock powered greenhouses after colony cultivation research.', prerequisites: ['automation'], colonyPrerequisite: 'cultivation', costs: [cost('item:edible-plant', 2), cost('item:clean-water', 2), cost('item:metal-ore', 2)] },
  { id: 'mobility', name: 'Cargo mobility', description: 'Unlock rechargeable rovers and shared material transport.', prerequisites: ['logistics'], colonyPrerequisite: null, costs: [cost('item:metal-ore', 4), cost('item:repair-patch', 1)] },
  { id: 'advanced-greenhouse', name: 'Intensive cultivation', description: 'Unlock a faster, higher-yield greenhouse recipe.', prerequisites: ['greenhouse'], colonyPrerequisite: null, costs: [cost('item:repair-patch', 2), cost('item:clean-water', 3)] },
].map(value => Object.freeze({ ...value, prerequisites: Object.freeze(value.prerequisites), costs: Object.freeze(value.costs) })) as IndustryResearchDefinition[]);

export function validateIndustryContent(): void {
  const natural = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;
  const validCosts = (costs: readonly IndustryCost[]): boolean => costs.length > 0
    && new Set(costs.map(c => c.itemDefinitionId)).size === costs.length
    && costs.every(c => INDUSTRY_ITEM_IDS.includes(c.itemDefinitionId) && natural(c.quantity) && c.quantity > 0);
  const research = new Map(INDUSTRY_RESEARCH.map(r => [r.id, r]));
  const visited = new Set<string>(), visiting = new Set<string>();
  const visit = (id: IndustryResearchId): void => {
    if (visiting.has(id)) throw new Error('Cyclic industry research.');
    if (visited.has(id)) return;
    const def = research.get(id);
    if (!def || !validCosts(def.costs)) throw new Error('Invalid industry research.');
    visiting.add(id); for (const parent of def.prerequisites) visit(parent);
    visiting.delete(id); visited.add(id);
  };
  if (research.size !== INDUSTRY_RESEARCH.length) throw new Error('Duplicate industry research.');
  for (const def of INDUSTRY_RESEARCH) visit(def.id);
  for (const [id, def] of Object.entries(INDUSTRY_FACILITIES)) {
    if (id !== def.id || !validCosts(def.costs)
      || ![def.powerDemand, def.powerCapacity, def.powerRadius, def.bufferCapacity].every(natural)
      || (def.requiredResearch !== null && !research.has(def.requiredResearch))) throw new Error('Invalid industry facility.');
  }
  if (new Set(INDUSTRY_RECIPES.map(r => r.id)).size !== INDUSTRY_RECIPES.length) throw new Error('Duplicate industry recipe.');
  for (const def of INDUSTRY_RECIPES)
    if (!validCosts(def.inputs) || !validCosts(def.outputs) || !natural(def.cycleTicks) || def.cycleTicks === 0
      || !Object.hasOwn(INDUSTRY_FACILITIES, def.facilityKind)
      || (def.requiredResearch !== null && !research.has(def.requiredResearch))) throw new Error('Invalid industry recipe.');
}
