import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  createPhase1EnvironmentState,
  getPhase1EnvironmentView,
} from '../../src/world/phase1/Phase1Environment';
import {
  createPhase1WorldStore,
} from '../../src/world/phase1/Phase1WorldStore';
import { MemoryPhase1WorldPersistence } from '../helpers/MemoryPhase1WorldPersistence';

describe('Phase 1 world browser evidence', () => {
  it('keeps deterministic shared environment and fog behavior in Chromium', async () => {
    const catalog = createPhase1ContentCatalog();
    const environment = createPhase1EnvironmentState(
      'p1-world-golden',
      catalog,
    );

    expect(getPhase1EnvironmentView(environment, catalog)).toMatchObject({
      localMinuteOfDay: 540,
      dayPeriod: 'day',
      coldRainStatus: 'future',
    });

    const persistence = new MemoryPhase1WorldPersistence();
    const store = createPhase1WorldStore({
      worldSeed: 'p1-world-golden',
      catalog,
      persistence,
    });
    await store.initialize();

    expect(
      await store.revealResolvedPlayerPosition({ x: 0, y: 0 }),
    ).toBeGreaterThan(0);
    expect(persistence.chunks.size).toBeGreaterThan(0);
  });
});
