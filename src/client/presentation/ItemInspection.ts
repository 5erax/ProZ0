import { contentDisplayName } from '../localization/ContentText';
import { uiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import { locale, formatNumber } from '../localization/Locale';
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
  'item:field-hoe': uiText("ui.5adfa2a"),
  'item:watering-can': uiText("ui.bcc5f5c1"),
  'item:animal-feed': uiText("ui.56022d18"),
  'item:compost': uiText("ui.165e2bdb"),
  'item:raw-meat': uiText("ui.eed270b"),
  'item:raw-hide': uiText("ui.1523bbe8"),
  'item:fishing-rod': uiText("ui.1c9a33a4"),
  'item:fishing-bait': uiText("ui.3e0cb6a5"),
};
const categoryPurpose: Readonly<Record<ItemDefinitionV1['category'], string>> = {
  'raw-resource': uiText("ui.c4b540e9"),
  component: uiText("ui.4052f55"),
  food: uiText("ui.abc927b8"),
  water: uiText("ui.73d869e3"),
  tool: uiText("ui.7458945a"),
  weapon: uiText("ui.992dc123"),
  equipment: uiText("ui.81314661"),
  medical: uiText("ui.b780084f"),
  'construction-kit': uiText("ui.21312a6e"),
  'discovery-item': uiText("ui.7bf3af96"),
};
const cache = new WeakMap<ContentCatalogV1, Map<string, ItemInspection>>();
/** Read-only inspection of the catalog/actions; this does not introduce new item stats or save fields. */
export function inspectItem(catalog: ContentCatalogV1, id: string): ItemInspection {
  let definitions = cache.get(catalog);
  if (!definitions) { definitions = new Map(); cache.set(catalog, definitions); }
  const cacheKey=locale()+':'+id;
  const existing = definitions.get(cacheKey); if (existing) return existing;
  const item = catalog.getAs(id, 'item'), profile = item.useProfile;
  const facts = [
    uiText("ui.ec492781") + formatNumber(item.unitWeightKg,{minimumFractionDigits:2,maximumFractionDigits:2}) + ' kg · ' + formatNumber(item.unitVolume,{minimumFractionDigits:2,maximumFractionDigits:2}) + uiText("ui.c273f254"),
    uiText("ui.ccb153a6") + item.maxStack + (item.conditionMax === null ? '' : uiText("ui.15171153") + item.conditionMax),
  ];
  if (item.category === 'weapon' || item.category === 'equipment') facts.push(uiText("ui.d7f31bb0") + RARITY_STYLE[item.rarity ?? 'common'].label);
  if (profile?.type === 'restore-stat') facts.push(uiText("ui.2376d972") + formatNumber(profile.amount) + ' ' + (locale()==='en'?profile.stat:uiPhrase(profile.stat)) + uiText("ui.abfdf8f9") + formatNumber(profile.channelSeconds) + ' s');
  if (profile?.type === 'melee-weapon') facts.push(uiText("ui.9d2320c0") + profile.damage + uiText("ui.616600c7") + profile.rangeFootprints + uiText("ui.98591fd2") + profile.frontalArcDegrees + '°', uiText("ui.c1babb35") + profile.staminaCost + uiText("ui.b16111da") + profile.cooldownSeconds + uiText("ui.7d95e85f") + profile.conditionCostOnSuccessfulHit);
  if (profile?.type === 'thermal-protection') facts.push(uiText("ui.c71958f2") + profile.harmfulThermalRateMultiplier + '. Slows exposure; does not instantly restore body temperature.');
  const crop = CROPS.find(c => c.seed === id);
  if (crop) facts.push(uiText("ui.4673e88e") + uiPhrase(crop.name) + '. Water and seasonal soil growth rules apply.');
  if (id.startsWith('item:root-')) facts.push(uiText("ui.c00d6279"));
  const sources = [
    ...catalog.list('resource').filter(r => r.output.itemId === id).map(r => uiText("ui.7cc2b63e") + contentDisplayName(r)),
    ...FORAGE.filter(f => f.output === id).map(f => uiText("ui.147925d1") + uiPhrase(f.name)),
    ...CROPS.filter(c => c.output === id).map(c => uiText("ui.f63419d6") + uiPhrase(c.name)),
  ];
  const recipes = [
    ...catalog.list('recipe').filter(r => r.inputs.some(i => i.itemId === id)).map(r => contentDisplayName(r)),
    ...[...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES, ...WEARABLE_RECIPES].filter(r => r.costs.some(([i]) => i === id)).map(r => uiPhrase(r.name)),
  ];
  for (const recipe of catalog.list('recipe').filter(r => r.outputs.some(i => i.itemId === id))) sources.push(uiText("ui.93077f53") + contentDisplayName(recipe) + (recipe.requiredStationStructureId ? ' at ' + contentDisplayName(catalog.get(recipe.requiredStationStructureId)) : uiText("ui.911c3173")));
  for (const recipe of [...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES, ...WEARABLE_RECIPES].filter(r => r.output === id)) sources.push(uiText("ui.93077f53") + uiPhrase(recipe.name) + (recipe.station ? ' at ' + recipe.station.replaceAll('-', ' ') : uiText("ui.911c3173")));
  if (FISH_SPECIES.some(f => f.itemId === id)) sources.push('Fish explored water with a Field Fishing Rod and Plant Fishing Bait. Cook at a campfire; raw fish is not directly consumable.');
  const wearable = WEARABLE_PROFILES.find(p => p.id === id);
  if (wearable) facts.push(uiText("ui.691adcc3") + wearable.slot, wearable.effect, uiText("ui.9f94fb56"));
  const result = Object.freeze({ purpose: uiPhrase(specific[id] ?? wearable?.effect ?? (id.startsWith('item:root-') ? uiText("ui.e0c8816d") : categoryPurpose[item.category])), facts: Object.freeze(facts), sources: Object.freeze([...new Set(sources)]), recipes: Object.freeze([...new Set(recipes)]), canEquip: item.capabilities.includes('equippable') && (profile?.type === 'melee-weapon' || profile?.type === 'thermal-protection' || wearable !== undefined), canConsume: item.capabilities.includes('consumable') && profile?.type === 'restore-stat' });
  definitions.set(cacheKey, result); return result;
}
