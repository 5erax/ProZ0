import type { PlayerSurvivalView, PlayerWeightState } from '../../simulation';
import { damagingTemperature, temperaturePenalty } from '../../simulation/survival/SurvivalThermalRules';
export interface CharacterEffectInspection {
  readonly id: string;
  readonly name: string;
  readonly severity: 'warning' | 'critical';
  readonly consequence: string;
  readonly remedy: string;
}
export interface CharacterInspection {
  readonly values: readonly { readonly name: string; readonly value: number }[];
  readonly staminaRegenPenaltyPercent: number;
  readonly effects: readonly CharacterEffectInspection[];
}
/** Describes existing authority states. No client debuff, timer, damage or modifier is created here. */
export function inspectCharacter(s: Readonly<PlayerSurvivalView>, carry: PlayerWeightState): CharacterInspection {
  const effects: CharacterEffectInspection[] = [];
  const add = (id: string, name: string, critical: boolean, consequence: string, remedy: string) => effects.push({ id, name, severity: critical ? 'critical' : 'warning', consequence, remedy });
  if (s.health <= 60 && s.health > 0) add('injured', 'Injured', s.health <= 30, 'Health is reduced. Damage can be lethal at zero health.', 'Use a Field Dressing. In solo, safe rest at the lab or a completed bed/cabin can also recover health.');
  if (s.water <= 49) add('thirst', s.water <= 0 ? 'Critical dehydration' : s.water <= 24 ? 'Dehydrated' : 'Thirsty', s.water <= 24, s.water <= 0 ? 'Stamina recovery is stopped. At zero water, health loses 1 point every 5 active seconds after the damage timer starts.' : 'Water shortage reduces stamina recovery.', 'Select Clean Water in Inventory and use it. Collect more from an operating condenser or a rain collector in solo.');
  if (s.food <= 39) add('hunger', s.food <= 0 ? 'Critical starvation' : s.food <= 19 ? 'Starving' : 'Hungry', s.food <= 19, s.food <= 0 ? 'Food shortage reduces stamina recovery. At zero food, health loses 1 point every 10 active seconds after the damage timer starts.' : 'Food shortage reduces stamina recovery.', 'Use an edible item with a Food restoration value. Cooking a meal at a completed campfire is another solo option.');
  if (s.temperature <= 34 || s.temperature >= 66) {
    const damage = damagingTemperature(s.temperature), penalty = temperaturePenalty(s.temperature);
    add('thermal', s.temperature <= 34 ? 'Cold exposure' : 'Heat exposure', damage !== null, (damage ? 'Exposure causes 1 health damage every ' + damage.cadence / 60 + ' active seconds.' : 'Current thermal damage: none.') + ' Thermal contribution to stamina recovery penalty: ' + penalty + ' percentage points. This condition follows your current body temperature; it has no fixed expiry.', 'Reach shelter or a safer climate. A usable Thermal Wrap slows harmful exposure. In solo, a fuelled campfire within 4 m or entering a Field Cabin helps restore a safe thermal target.');
  }
  if (s.stamina <= 0) add('exhausted', 'Exhausted', true, 'Actions that need stamina cannot start. Keeping Shift held resumes sprint only after its recovery threshold.', 'Stop sprinting and attacking. Stamina regenerates after the spending delay; resolve thirst, hunger, temperature and heavy carrying if recovery is slow.');
  if (carry !== 'NORMAL') add('carrying', carry === 'HEAVY' ? 'Heavy carrying' : 'Overloaded', carry === 'OVERLOADED', 'Carrying contributes ' + (carry === 'HEAVY' ? '20' : '50') + ' percentage points to the stamina recovery penalty. Bulk and weight are separate limits.', 'Store supplies in a nearby crate/cache, or drop a selected quantity. Empty grid space does not remove item bulk.');
  return { values: [{ name: 'Health', value: Math.round(s.health) }, { name: 'Water', value: Math.round(s.water) }, { name: 'Food', value: Math.round(s.food) }, { name: 'Stamina', value: Math.round(s.stamina) }, { name: 'Body temperature index', value: Math.round(s.temperature) }], staminaRegenPenaltyPercent: s.staminaRegenPenaltyPercent, effects };
}
