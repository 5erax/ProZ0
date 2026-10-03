import { WEARABLE_RECIPES, WEARABLE_PROFILES } from '../../content/livingworld/WearableContent';
import type { ContentCatalogV1, ItemDefinitionV1 } from '../../content';
import { CROPS, FORAGE, LIVING_RECIPES } from '../../content/livingworld/LivingWorldContent';
import { LIVING_ROOT_RECIPES } from '../../content/livingworld/LivingRootContent';
import { GEAR_RECIPES, RARITY_STYLE } from '../../content/livingworld/EquipmentContent';
import { FISHING_RECIPES, FISH_SPECIES } from '../../content/livingworld/FishingContent';

export interface ItemInspection {
  readonly purpose: string;
  readonly facts: readonly string[];
  readonly sources: readonly string[];
  readonly recipes: readonly string[];
  readonly canEquip: boolean;
  readonly canConsume: boolean;
}
const specific: Readonly<Record<string, string>> = {
  'item:stone-field-tool': 'Automatically used for resource gathering. Keep it in your bag; it is not a weapon.',
  'item:field-hoe': 'Till nearby suitable ground, uproot a mature harvested wild plant, or replant a carried root.',
  'item:watering-can': 'Water a planted crop or wild plant using one carried Clean Water.',
  'item:animal-feed': 'Feed a captured animal in its pen or coop to support growth, breeding and products.',
  'item:compost': 'Fertilize a cultivated plot to improve its fertility.',
  'item:raw-meat': 'A hunting ingredient. Cook or preserve it at the relevant station.',
  'item:raw-hide': 'A hunting ingredient. Process it into leather at a Tannery.',
  'item:fishing-rod': 'Keep this rod and plant bait in your bag. Homestead → Fish nearby water, then click explored water within 4 m. Wait for the bite and reel with Space. Moving or taking damage interrupts fishing.',
  'item:fishing-bait': 'One bait is used by a successful cast. Cancelling or missing the bite does not return it. Nearby water cells share a finite population that recovers during active world time.',
};
const categoryPurpose: Readonly<Record<ItemDefinitionV1['category'], string>> = {
  'raw-resource': 'A gathered material used in crafting or construction.',
  component: 'A processed ingredient used in crafting or construction.',
  food: 'A food item or cooking ingredient. Only items with a restoration profile can be consumed directly.',
  water: 'A water supply used for survival or cultivation.',
  tool: 'A tool for world interactions. Keep it in your inventory.',
  weapon: 'Equip this weapon to attack using its defined range and stamina cost.',
  equipment: 'Wear this equipment for its defined protection.',
  medical: 'A medical supply for recovering health.',
  'construction-kit': 'A portable construction kit for the core Build menu. Field blueprints can be placed before supplying materials.',
  'discovery-item': 'A discovery item. Its identity does not reveal an unexplored location.',
};
const cache = new WeakMap<ContentCatalogV1, Map<string, ItemInspection>>();
/** Read-only inspection of the catalog/actions; this does not introduce new item stats or save fields. */
export function inspectItem(catalog: ContentCatalogV1, id: string): ItemInspection {
  let definitions = cache.get(catalog);
  if (!definitions) { definitions = new Map(); cache.set(catalog, definitions); }
  const existing = definitions.get(id); if (existing) return existing;
  const item = catalog.getAs(id, 'item'), profile = item.useProfile;
  const facts = [
    'Per item: ' + item.unitWeightKg.toFixed(2) + ' kg · ' + item.unitVolume.toFixed(2) + ' bulk units',
    'Stack limit: ' + item.maxStack + (item.conditionMax === null ? '' : ' · maximum durability: ' + item.conditionMax),
  ];
  if (item.category === 'weapon' || item.category === 'equipment') facts.push('Rarity: ' + RARITY_STYLE[item.rarity ?? 'common'].label);
  if (profile?.type === 'restore-stat') facts.push('Restores ' + profile.amount + ' ' + profile.stat + ' · use takes ' + profile.channelSeconds + ' s');
  if (profile?.type === 'melee-weapon') facts.push('Damage ' + profile.damage + ' · range ' + profile.rangeFootprints + ' footprints · arc ' + profile.frontalArcDegrees + '°', 'Attack costs ' + profile.staminaCost + ' stamina · cooldown ' + profile.cooldownSeconds + ' s · durability loss per hit ' + profile.conditionCostOnSuccessfulHit);
  if (profile?.type === 'thermal-protection') facts.push('Harmful thermal change ×' + profile.harmfulThermalRateMultiplier + '. Slows exposure; does not instantly restore body temperature.');
  const crop = CROPS.find(c => c.seed === id);
  if (crop) facts.push('Plant on a cultivated plot to grow ' + crop.name + '. Water and seasonal soil growth rules apply.');
  if (id.startsWith('item:root-')) facts.push('After a mature wild-plant harvest, uproot using a Field Hoe. Replant this root on suitable explored ground.');
  const sources = [
    ...catalog.list('resource').filter(r => r.output.itemId === id).map(r => 'Gather ' + r.displayName),
    ...FORAGE.filter(f => f.output === id).map(f => 'Forage ' + f.name),
    ...CROPS.filter(c => c.output === id).map(c => 'Harvest ' + c.name),
  ];
  const recipes = [
    ...catalog.list('recipe').filter(r => r.inputs.some(i => i.itemId === id)).map(r => r.displayName),
    ...[...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES, ...WEARABLE_RECIPES].filter(r => r.costs.some(([i]) => i === id)).map(r => r.name),
  ];
  for (const recipe of catalog.list('recipe').filter(r => r.outputs.some(i => i.itemId === id))) sources.push('Craft ' + recipe.displayName + (recipe.requiredStationStructureId ? ' at ' + catalog.get(recipe.requiredStationStructureId).displayName : ' by hand'));
  for (const recipe of [...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES, ...WEARABLE_RECIPES].filter(r => r.output === id)) sources.push('Craft ' + recipe.name + (recipe.station ? ' at ' + recipe.station.replaceAll('-', ' ') : ' by hand'));
  if (FISH_SPECIES.some(f => f.itemId === id)) sources.push('Fish explored water with a Field Fishing Rod and Plant Fishing Bait. Cook at a campfire; raw fish is not directly consumable.');
  const wearable = WEARABLE_PROFILES.find(p => p.id === id);
  if (wearable) facts.push('Slot: ' + wearable.slot, wearable.effect, 'Bonuses require equipped, owned, unbroken gear. Passive gear does not lose durability simply for being worn.');
  const result = Object.freeze({ purpose: specific[id] ?? wearable?.effect ?? (id.startsWith('item:root-') ? 'A living wild-plant root for relocation and regrowth.' : categoryPurpose[item.category]), facts: Object.freeze(facts), sources: Object.freeze([...new Set(sources)]), recipes: Object.freeze([...new Set(recipes)]), canEquip: item.capabilities.includes('equippable') && (profile?.type === 'melee-weapon' || profile?.type === 'thermal-protection' || wearable !== undefined), canConsume: item.capabilities.includes('consumable') && profile?.type === 'restore-stat' });
  definitions.set(id, result); return result;
}
