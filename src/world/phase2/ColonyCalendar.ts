import { SEASON_TICKS, seasonAt } from '../../content/livingworld/LivingWorldContent';

export const COLONY_CALENDAR_VERSION = 1;
export const COLONY_DAY_TICKS = SEASON_TICKS;
export type ColonyTimeSegment = 'MORNING' | 'NOON' | 'AFTERNOON' | 'DUSK' | 'MIDNIGHT' | 'PREDAWN';
const daylightHours = [12, 16, 12, 8] as const;
const segments: readonly ColonyTimeSegment[] = ['MORNING', 'NOON', 'AFTERNOON', 'DUSK', 'MIDNIGHT', 'PREDAWN'];
const levels = [.82, 1, .84, .62, .43, .60] as const;

/** One 12-active-minute day per season. No wall-clock/offline catch-up. */
export function colonyCalendarAt(tick: number, startMinute = 540) {
  if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isInteger(startMinute) || startMinute < 0 || startMinute >= 1440) throw new RangeError('Invalid calendar clock.');
  const absoluteMinutes = startMinute + tick * 1440 / COLONY_DAY_TICKS;
  const minute = absoluteMinutes % 1440;
  const seasonIndex = Math.floor(tick / SEASON_TICKS), season = seasonAt(tick);
  // Blend the daylight schedule for one active minute after a season changes.
  const blend = seasonIndex === 0 ? 1 : Math.min(1, (tick % SEASON_TICKS) / 3600);
  const current = daylightHours[seasonIndex % 4]!, previous = daylightHours[(seasonIndex + 3) % 4]!;
  const hours = previous + (current - previous) * blend;
  const dawn = (12 - hours / 2) * 60, dusk = (12 + hours / 2) * 60;
  const daylight = minute >= dawn && minute < dusk;
  const phase = daylight ? (minute - dawn) / (dusk - dawn) * 3 : ((minute - dusk + 1440) % 1440) / (1440 - dusk + dawn) * 3 + 3;
  const index = Math.min(5, Math.floor(phase));
  // Interpolate between the centers of the six periods, including the wrap.
  const lightingPhase = (phase + 5.5) % 6, lightIndex = Math.floor(lightingPhase), lightBlend = lightingPhase - lightIndex;
  const brightness = levels[lightIndex]! * (1 - lightBlend) + levels[(lightIndex + 1) % 6]! * lightBlend;
  return Object.freeze({
    version: COLONY_CALENDAR_VERSION, localMinuteOfDay: Math.floor(minute),
    dayIndex: Math.floor(absoluteMinutes / 1440) + 1,
    nightOrdinal: Math.floor((absoluteMinutes - dawn) / 1440),
    dayPeriod: daylight ? 'day' as const : 'night' as const,
    timeSegment: segments[index]!, brightness,
    dawnMinute: dawn, duskMinute: dusk, daylightHours: hours,
    seasonId: season.id, daysPerSeason: 1,
  });
}
