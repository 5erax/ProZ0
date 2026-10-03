import { expect, it } from 'vitest';
import { colonyCalendarAt, COLONY_DAY_TICKS } from '../../src/world/phase2/ColonyCalendar';
import { ColonyAutosaveCrossings } from '../../src/client/runtime/ColonyAutosave';
import { createPhase1ContentCatalog } from '../../src/content';
import { createPhase1EnvironmentState, getPhase1EnvironmentView, validatePhase1EnvironmentState } from '../../src/world/phase1/Phase1Environment';

it('keeps monotonic calendar days and six continuous lighting segments across seasonal daylight changes', () => {
  const segments = new Set<string>();
  let lastDay = 1, lastLight = colonyCalendarAt(0).brightness, lastNight = colonyCalendarAt(0).nightOrdinal;
  for (let tick = 0; tick <= COLONY_DAY_TICKS * 5; tick += 60) {
    const clock = colonyCalendarAt(tick);
    expect(clock.dayIndex).toBeGreaterThanOrEqual(lastDay);
    expect(clock.nightOrdinal).toBeGreaterThanOrEqual(lastNight);
    expect(clock.brightness).toBeGreaterThanOrEqual(.43);
    expect(clock.brightness).toBeLessThanOrEqual(1);
    expect(Math.abs(clock.brightness - lastLight)).toBeLessThan(.015);
    segments.add(clock.timeSegment);
    lastDay = clock.dayIndex; lastNight = clock.nightOrdinal; lastLight = clock.brightness;
  }
  expect(segments.size).toBe(6);
  expect(colonyCalendarAt(COLONY_DAY_TICKS + 3600).daylightHours).toBe(16);
  expect(colonyCalendarAt(COLONY_DAY_TICKS * 3 + 3600).daylightHours).toBe(8);
});
it('keeps legacy clocks exactly as saved, carries the optional new calendar through validation, and rejects unknown versions', () => {
  const catalog = createPhase1ContentCatalog();
  const legacy = { ...createPhase1EnvironmentState('clock', catalog), activeTick: 3600 };
  expect(getPhase1EnvironmentView(legacy, catalog).localMinuteOfDay).toBe(570);
  const newClock = { ...createPhase1EnvironmentState('clock', catalog, 1), activeTick: 3600 };
  expect(getPhase1EnvironmentView(validatePhase1EnvironmentState(newClock, catalog), catalog).localMinuteOfDay).toBe(660);
  expect(() => validatePhase1EnvironmentState({ ...newClock, calendarVersion: 2 } as never, catalog)).toThrow('calendar version');
});
it('autosaves exactly on completed rest or dawn; cancelled rest/death and reopening the same checkpoint do not fire', () => {
  const crossings = new ColonyAutosaveCrossings(0, 0);
  expect(crossings.advance('w', 'p', 400, 0, 0, true)).toBeNull();
  expect(crossings.advance('w', 'p', 480, 0, 2280, true)?.reason).toBe('rest');
  expect(crossings.advance('w', 'p', 481, 0, 2280, true)).toBeNull();
  expect(crossings.advance('w', 'p', 43000, 1, 2280, false)).toBeNull();
  const reloaded = new ColonyAutosaveCrossings(1, 2280);
  expect(reloaded.advance('w', 'p', 43001, 1, 2280, true)).toBeNull();
  expect(reloaded.advance('w', 'p', 86000, 2, 2280, true)).toMatchObject({ reason: 'dawn', id: 'w:p:dawn:2' });
});
