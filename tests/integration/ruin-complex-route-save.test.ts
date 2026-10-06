import { expect, it } from 'vitest';
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from '../../src/integration';
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
} from '../../src/persistence';
import {
  colonyRuinComplexRoute,
  colonyRuinObservedRouteView,
} from '../../src/world/phase2/ColonyRuinComplexRoute';

it('recomputes the same ruin-complex route after Save V2 reopen without persisting route coordinates or changing world identity', async () => {
  const config = {
    worldId: 'world:p2-ruin-route-save',
    worldSeed: 'p1-world-golden',
    playerIds: ['solo'],
    colonyDepthEnabled: true,
    singlePlayerExpeditionEnabled: true,
    worldGenerationVersion: 5,
    interactionRangeWorldUnits: 4,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  } as const;

  const original = await Phase1AuthorityBundle.create(config);
  let reopened: Phase1AuthorityBundle | null = null;

  try {
    original.getRuntime('solo');
    await original.stepSolo();

    const routeBefore = colonyRuinComplexRoute(
      config.worldSeed,
      config.worldGenerationVersion,
    );
    const observedBefore = colonyRuinObservedRouteView(routeBefore, [
      'route:ruin:trace-b',
      'route:ruin:site-threshold',
      'route:ruin:covered-edge',
    ]);

    const request = composePhase1SaveV2(original, {
      nowUtc: '2026-10-06T00:00:00.000Z',
    });
    const portable = {
      ...request,
      formatId: request.world.formatId,
      schemaVersion: request.world.schemaVersion,
      recordKind: 'portable-bundle' as const,
    };

    expect(request.world.generationVersion).toBe(5);
    expect(JSON.stringify(portable)).not.toContain('route:ruin:');
    expect(JSON.stringify(portable)).not.toContain('open-court');
    expect(JSON.stringify(portable)).not.toContain('covered-edge');

    const policy = createPhase1SaveV2Compatibility(
      original.catalog,
      [5],
    );
    const reconstructed = reconstructPhase1ReopenState(
      portable,
      policy,
    );
    expect(reconstructed.ok, JSON.stringify(reconstructed)).toBe(true);
    if (!reconstructed.ok) throw new Error(reconstructed.message);

    reopened = await Phase1AuthorityBundle.create({
      ...config,
      reopen: reconstructed.value,
    });
    await reopened.stepSolo();

    const routeAfter = colonyRuinComplexRoute(
      config.worldSeed,
      config.worldGenerationVersion,
    );
    const observedAfter = colonyRuinObservedRouteView(routeAfter, [
      'route:ruin:trace-b',
      'route:ruin:site-threshold',
      'route:ruin:covered-edge',
    ]);

    expect(routeAfter).toEqual(routeBefore);
    expect(observedAfter).toEqual(observedBefore);
  } finally {
    await reopened?.destroy();
    await original.destroy();
  }
});
