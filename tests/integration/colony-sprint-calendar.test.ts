import { expect, it, vi } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { Phase1ItemAuthority, Phase1SurvivalAuthority, createSimulationRuntime } from '../../src/simulation';
import { createPhase1ContentCatalog } from '../../src/content';
import type { WorldCollisionQuery } from '../../src/world';
import { createWorldPosition, createSimulationStep, toSimulationTick } from '../../src/foundation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { reconstructPhase1ReopenState, SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2, createPhase1SaveV2Compatibility } from '../../src/persistence';

it('spends exactly 8 stamina/second, drains food 25% faster, and starts regen only after sprint stops', () => {
  const catalog = createPhase1ContentCatalog(), items = new Phase1ItemAuthority({ catalog, world: new Phase1ItemTestWorld(), initialLedger: { containers: [] } });
  const survival = new Phase1SurvivalAuthority({ catalog, items }); survival.registerPlayer('p');
  const normal = { thermalTarget: 50, thermalWrapActive: false, carryState: 'NORMAL' as const };
  for (let tick = 1; tick <= 600; tick++) survival.stepPlayer('p', tick, { ...normal, sprinting: true });
  expect(survival.getPlayerState('p').staminaMilli).toBe(20000);
  expect(survival.getPlayerState('p').foodMilli).toBe(69875);
  survival.stepPlayer('p', 601, normal);
  expect(survival.getPlayerState('p').staminaMilli).toBe(20000);
  for (let tick = 602; tick <= 720; tick++) survival.stepPlayer('p', tick, normal);
  expect(survival.getPlayerState('p').staminaMilli).toBeGreaterThan(20000);
});
it('a sprint request alone cannot alter simulation speed without authority approval', () => {
  const freeWorld: WorldCollisionQuery = { sweepAabbAxis: request => ({ allowedDelta: request.desiredDelta, blocked: false }) };
  const normal = createSimulationRuntime({ worldQuery: freeWorld, initialPlayerPosition: createWorldPosition(0, 0) });
  const sprint = createSimulationRuntime({ worldQuery: freeWorld, initialPlayerPosition: createWorldPosition(0, 0), movementMultiplier: input => input.sprint ? 1.6 : 1 });
  const input = { moveUp: false, moveDown: false, moveLeft: false, moveRight: true, sprint: true };
  normal.submitInput('p', input); sprint.submitInput('p', input);
  normal.step(createSimulationStep(toSimulationTick(1))); sprint.step(createSimulationStep(toSimulationTick(1)));
  expect(sprint.getSnapshot().player.position.x / normal.getSnapshot().player.position.x).toBeCloseTo(1.6);
});
it('saves/reopens the new calendar without rerolling seed/time/weather and does not upgrade an absent calendar field', async () => {
  const config = { worldId: 'world:calendar', worldSeed: 'p1-world-golden', playerIds: ['solo'], singlePlayerExpeditionEnabled: true, colonyDepthEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    await bundle.stepSolo();
    const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00.000Z' });
    expect(request.world.environment.calendarVersion).toBe(1);
    const portable = { formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle' as const, ...request };
    const policy = createPhase1SaveV2Compatibility(bundle.catalog, [request.world.generationVersion]);
    const loaded = reconstructPhase1ReopenState(portable, policy); expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error(loaded.message);
    const reopened = await Phase1AuthorityBundle.create({ ...config, reopen: loaded.value });
    try { expect(reopened.worldStore.getEnvironmentView()).toEqual(bundle.worldStore.getEnvironmentView()); } finally { await reopened.destroy(); }
    const legacyEnvironment = { ...request.world.environment }; delete legacyEnvironment.calendarVersion;
    const legacy = reconstructPhase1ReopenState({ ...portable, world: { ...request.world, environment: legacyEnvironment } }, policy);
    expect(legacy.ok).toBe(true);
    if (!legacy.ok) throw new Error(legacy.message);
    const old = await Phase1AuthorityBundle.create({ ...config, reopen: legacy.value });
    try { expect(old.worldStore.getEnvironmentView().state.calendarVersion).toBeUndefined(); } finally { await old.destroy(); }
  } finally { await bundle.destroy(); }
});

it('authority denies sprint with reserved stamina, charges only resolved movement, and resumes exhausted running at 15 stamina', async () => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:sprint-gates', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  const input = { moveUp: false, moveDown: false, moveLeft: false, moveRight: true, sprint: true };
  const collision = vi.spyOn(bundle.world, 'sweepAabbAxis').mockImplementation(request => ({ allowedDelta: request.desiredDelta, blocked: false }));
  try {
    bundle.submitInput('solo', { ...input, sprint: false }); await bundle.stepSolo();
    const walking = Math.hypot(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x, bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.y);
    const reservation = bundle.survival.reserveStaminaSpend('fixture-other-action', 'solo', 100)!;
    expect(reservation).not.toBeNull();
    bundle.submitInput('solo', input); await bundle.stepSolo();
    expect(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x).toBeCloseTo(walking);
    bundle.survival.releaseStaminaReservation(reservation);
    await bundle.stepSolo();
    expect(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x).toBeCloseTo(walking * 1.6);
    const running = bundle.survival.getPlayerState('solo').staminaMilli;
    collision.mockImplementation(() => ({ allowedDelta: 0, blocked: true }));
    for (let i = 0; i < 10; i++) await bundle.stepSolo();
    expect(bundle.survival.getPlayerState('solo').staminaMilli).toBe(running);
    bundle.submitInput('solo', { ...input, moveRight: false }); await bundle.stepSolo();
    expect(bundle.survival.getPlayerState('solo').staminaMilli).toBe(running);
    collision.mockImplementation(request => ({ allowedDelta: request.desiredDelta, blocked: false }));
    bundle.survival.commitStaminaSpend('solo', 99, bundle.authorityTick);
    bundle.submitInput('solo', input); await bundle.stepSolo();
    expect(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x).toBeCloseTo(walking);
    while (bundle.survival.getPlayerState('solo').staminaMilli < 15000) {
      await bundle.stepSolo();
      if (bundle.survival.getPlayerState('solo').staminaMilli < 15000) expect(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x).toBeCloseTo(walking);
    }
    await bundle.stepSolo();
    expect(bundle.getRuntime('solo').getSnapshot().player.intendedVelocity.x).toBeCloseTo(walking * 1.6);
  } finally { collision.mockRestore(); await bundle.destroy(); }
});
