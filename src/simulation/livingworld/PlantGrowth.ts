import { forageDefinition } from '../../content/livingworld/LivingWorldContent';
import type { LivingForage } from './LivingWorldState';

export const renewablePlant = (kind: string) => kind.startsWith('wild-') || kind === 'berry-bush';
export const moistureState = (moisture: number) => moisture < 2500 ? 'dry' : moisture >= 7000 ? 'wet' : 'normal';
/** Shared gameplay/presentation thresholds. Immature plants yield less and reset to roots. */
export function plantGrowthView(progress: number, maximum: number, rate: number, moisture: number, maximumYield: number) {
  const fraction = Math.max(0, Math.min(1, progress / maximum));
  const stage = fraction >= 1 ? 'mature' : fraction >= .5 ? 'growing' : 'early';
  const next = fraction >= 1 ? maximum : fraction >= .5 ? maximum : maximum / 2;
  return Object.freeze({ fraction, stage, maximumYield, harvestYield: stage === 'mature' ? maximumYield : stage === 'growing' ? Math.max(1, Math.floor(maximumYield / 2)) : 0,
    moisture, condition: moisture === 0 ? 'growth-paused' : moistureState(moisture) === 'dry' ? 'needs-water' : 'normal',
    nextStageSeconds: fraction >= 1 ? 0 : moisture === 0 || rate <= 0 ? null : Math.ceil((next - progress) / (60 * rate)),
  });
}
export function forageGrowthView(f: LivingForage, tick: number, rate: number) {
  const d = forageDefinition(f.kind)!;
  // Keep legacy countdown unchanged until its next harvest; no invented past catch-up.
  const progress = f.growth?.progress ?? (tick >= f.readyTick ? d.renewalTicks : 0);
  return plantGrowthView(progress, d.renewalTicks, rate, f.growth?.moisture ?? 8000, d.quantity);
}
