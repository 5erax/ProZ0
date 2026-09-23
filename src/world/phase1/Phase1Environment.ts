import type { ContentCatalogV1 } from '../../content';
import {
  DeterministicRng,
  SIMULATION_HZ,
  createWorldPosition,
  deriveSeedState,
} from '../../foundation';
import type {
  Phase1ColdRainStatus,
  Phase1EnvironmentState,
  Phase1EnvironmentView,
  Phase1WeatherEventState,
} from './Phase1WorldTypes';

export const PHASE1_WORLD_DAY_ACTIVE_SECONDS = 48 * 60;
export const PHASE1_NEW_WORLD_START_LOCAL_MINUTE = 9 * 60;
export const PHASE1_DAYLIGHT_START_LOCAL_MINUTE = 6 * 60;
export const PHASE1_DAYLIGHT_END_LOCAL_MINUTE = 20 * 60;
export const PHASE1_COLD_RAIN_NAMESPACE =
  'weather:cold-rain:first-session' as const;

function requireTick(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function stableEventId(worldSeed: string): string {
  const state = deriveSeedState({
    worldSeed,
    namespace: `${PHASE1_COLD_RAIN_NAMESPACE}:event-id`,
    stableIdentifiers: Object.freeze(['phase1']),
  });

  return `weather-event:cold-rain:${state
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('')}`;
}

export function createPhase1EnvironmentState(
  worldSeed: string,
  catalog: ContentCatalogV1,
): Phase1EnvironmentState {
  if (worldSeed.length === 0) {
    throw new RangeError('World seed must not be empty.');
  }

  const definition = catalog.getAs('weather:cold-rain', 'weather');
  const [minimumMinute, maximumMinute] =
    definition.firstSessionStartWindowActiveMinutes;
  const minimumTick = minimumMinute * 60 * SIMULATION_HZ;
  const maximumTick = maximumMinute * 60 * SIMULATION_HZ;

  if (
    !Number.isSafeInteger(minimumTick)
    || !Number.isSafeInteger(maximumTick)
    || maximumTick < minimumTick
  ) {
    throw new Error('Cold Rain content window cannot be represented in ticks.');
  }

  const rng = new DeterministicRng(deriveSeedState({
    worldSeed,
    namespace: PHASE1_COLD_RAIN_NAMESPACE,
    stableIdentifiers: Object.freeze([
      catalog.compatibility.canonicalFingerprint,
      `min:${minimumTick}`,
      `max:${maximumTick}`,
    ]),
  }));
  const span = maximumTick - minimumTick + 1;
  const startTick = minimumTick + (rng.nextUint32() % span);
  const warningTicks = definition.warningSeconds * SIMULATION_HZ;
  const durationTicks = definition.durationActiveSeconds * SIMULATION_HZ;

  const event: Phase1WeatherEventState = Object.freeze({
    weatherEventId: stableEventId(worldSeed),
    weatherDefinitionId: 'weather:cold-rain',
    revision: 0,
    startTick,
    warningStartTick: startTick - warningTicks,
    endTick: startTick + durationTicks,
  });

  return Object.freeze({
    activeTick: 0,
    cycleStartLocalMinute: PHASE1_NEW_WORLD_START_LOCAL_MINUTE,
    weatherEvents: Object.freeze([event]),
  });
}

export function validatePhase1EnvironmentState(
  state: Phase1EnvironmentState,
  catalog: ContentCatalogV1,
): Phase1EnvironmentState {
  requireTick(state.activeTick, 'Environment activeTick');

  if (
    !Number.isInteger(state.cycleStartLocalMinute)
    || state.cycleStartLocalMinute < 0
    || state.cycleStartLocalMinute >= 24 * 60
  ) {
    throw new Error('Environment cycleStartLocalMinute is invalid.');
  }

  if (state.weatherEvents.length !== 1) {
    throw new Error('Phase 1 requires exactly one canonical Cold Rain event.');
  }

  const definition = catalog.getAs('weather:cold-rain', 'weather');
  const event = state.weatherEvents[0];

  if (event.weatherDefinitionId !== definition.id) {
    throw new Error('Environment weather event references the wrong definition.');
  }

  if (event.weatherEventId.trim().length === 0) {
    throw new Error('Weather event identity must not be empty.');
  }

  if (!Number.isSafeInteger(event.revision) || event.revision < 0) {
    throw new Error('Weather event revision is invalid.');
  }

  requireTick(event.warningStartTick, 'Weather warningStartTick');
  requireTick(event.startTick, 'Weather startTick');
  requireTick(event.endTick, 'Weather endTick');

  if (
    event.warningStartTick >= event.startTick
    || event.startTick >= event.endTick
  ) {
    throw new Error('Weather event tick ordering is invalid.');
  }

  const expectedWarning =
    definition.warningSeconds * SIMULATION_HZ;
  const expectedDuration =
    definition.durationActiveSeconds * SIMULATION_HZ;

  if (
    event.startTick - event.warningStartTick !== expectedWarning
    || event.endTick - event.startTick !== expectedDuration
  ) {
    throw new Error('Weather event duration/warning does not match content.');
  }

  return Object.freeze({
    activeTick: state.activeTick,
    cycleStartLocalMinute: state.cycleStartLocalMinute,
    weatherEvents: Object.freeze([
      Object.freeze({ ...event }),
    ]),
  });
}

export function advancePhase1Environment(
  state: Phase1EnvironmentState,
  targetTick: number,
  catalog: ContentCatalogV1,
): Phase1EnvironmentState {
  const validated = validatePhase1EnvironmentState(state, catalog);
  requireTick(targetTick, 'Environment targetTick');

  if (targetTick < validated.activeTick) {
    throw new Error('Environment active time cannot move backwards.');
  }

  if (targetTick === validated.activeTick) {
    return validated;
  }

  return Object.freeze({
    ...validated,
    activeTick: targetTick,
  });
}

export function localMinuteOfDay(
  state: Phase1EnvironmentState,
): number {
  const dayTicks =
    PHASE1_WORLD_DAY_ACTIVE_SECONDS * SIMULATION_HZ;
  const normalizedTick = state.activeTick % dayTicks;
  const elapsedLocalMinutes = Math.floor(
    normalizedTick * (24 * 60) / dayTicks,
  );

  return (
    state.cycleStartLocalMinute + elapsedLocalMinutes
  ) % (24 * 60);
}

export function coldRainStatus(
  state: Phase1EnvironmentState,
): Phase1ColdRainStatus {
  const event = state.weatherEvents[0];

  if (state.activeTick < event.warningStartTick) return 'future';
  if (state.activeTick < event.startTick) return 'warning';
  if (state.activeTick < event.endTick) return 'active';
  return 'ended';
}

export function getPhase1EnvironmentView(
  state: Phase1EnvironmentState,
  catalog: ContentCatalogV1,
): Phase1EnvironmentView {
  const validated = validatePhase1EnvironmentState(state, catalog);
  const localMinute = localMinuteOfDay(validated);
  const dayPeriod =
    localMinute >= PHASE1_DAYLIGHT_START_LOCAL_MINUTE
    && localMinute < PHASE1_DAYLIGHT_END_LOCAL_MINUTE
      ? 'day'
      : 'night';

  return Object.freeze({
    state: validated,
    localMinuteOfDay: localMinute,
    dayPeriod,
    coldRainStatus: coldRainStatus(validated),
  });
}

// Keep this module platform-neutral; this export only prevents accidental
// introduction of renderer-driven environment positioning.
export const PHASE1_ENVIRONMENT_ORIGIN = createWorldPosition(0, 0);
