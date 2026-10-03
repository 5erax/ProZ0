import { uiPhrase } from '../localization/UiMessages';
import { uiText } from '../localization/UiMessages';
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
  if (s.health <= 60 && s.health > 0) add('injured', uiText("ui.fd624ada"), s.health <= 30, uiText("ui.503512ea"), uiText("ui.a4c1bc09"));
  if (s.water <= 49) add('thirst', s.water <= 0 ? uiText("ui.c2d4b5c3") : s.water <= 24 ? uiText("ui.1e975507") : uiText("ui.a8ca6410"), s.water <= 24, s.water <= 0 ? uiText("ui.4b865550") : uiText("ui.d3f3d214"), uiText("ui.bb446a4"));
  if (s.food <= 39) add('hunger', s.food <= 0 ? uiText("ui.169949bb") : s.food <= 19 ? uiText("ui.2f93f05b") : uiText("ui.570ae59c"), s.food <= 19, s.food <= 0 ? uiText("ui.98a6f1e6") : uiText("ui.2a0ff44f"), uiText("ui.6d23fc38"));
  if (s.temperature <= 34 || s.temperature >= 66) {
    const damage = damagingTemperature(s.temperature), penalty = temperaturePenalty(s.temperature);
    add('thermal', s.temperature <= 34 ? uiText("ui.76336af8") : uiText("ui.62a78a34"), damage !== null, (damage ? uiText("ui.10538ecd") + damage.cadence / 60 + uiText("ui.9e91dfc2") : uiText("ui.7e240fe8")) + uiText("ui.564a1648") + penalty + uiPhrase(' percentage points. This condition follows your current body temperature; it has no fixed expiry.'), uiText("ui.c92b4dbf"));
  }
  if (s.stamina <= 0) add('exhausted', uiText("ui.7634cdec"), true, uiText("ui.93d3bf4d"), uiPhrase('Stop sprinting and attacking. Stamina regenerates after the spending delay; resolve thirst, hunger, temperature and heavy carrying if recovery is slow.'));
  if (carry !== 'NORMAL') add('carrying', carry === 'HEAVY' ? uiText("ui.aa258be1") : uiText("ui.8657cca6"), carry === 'OVERLOADED', uiText("ui.ce2feb48") + (carry === 'HEAVY' ? '20' : '50') + uiText("ui.3d76abdb"), uiText("ui.359797d"));
  return { values: [{ name: uiText("ui.986145af"), value: Math.round(s.health) }, { name: uiText("ui.d63556b0"), value: Math.round(s.water) }, { name: uiText("ui.bd7cbfe9"), value: Math.round(s.food) }, { name: uiText("ui.17a0b8d6"), value: Math.round(s.stamina) }, { name: uiText("ui.835cf1c7"), value: Math.round(s.temperature) }], staminaRegenPenaltyPercent: s.staminaRegenPenaltyPercent, effects };
}
