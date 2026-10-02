import { expect, it } from 'vitest';
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from '../../src/integration';
import {
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
} from '../../src/persistence';
it('a solo predator patrols, chases a nearby player, telegraphs attacks, and keeps its actual position after reopen', async () => {
  const config = {
    worldId: 'world:predator-motion',
    worldSeed: 'p1-world-golden',
    playerIds: ['solo'],
    colonyDepthEnabled: true,
    singlePlayerExpeditionEnabled: true,
    interactionRangeWorldUnits: 4,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  };
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    const entity = bundle.world.findGeneratedEntityByDefinition(
      'hostile:territorial-predator',
    )!;
    const initial = bundle.world.getPredator(entity.entityId)!;
    for (let i = 0; i < 30; i++) await bundle.stepSolo();
    const patrol = bundle.world.getPredator(entity.entityId)!;
    expect(patrol.position).not.toEqual(initial.position);
    // Explicit hostile fixture: this tests combat motion, not a novice exploration journey.
    bundle
      .getRuntime('solo')
      .relocatePlayer({ x: patrol.position.x + 2, y: patrol.position.y }, 'W');
    for (let i = 0; i < 40; i++) await bundle.stepSolo();
    const chase = bundle.world.getPredator(entity.entityId)!;
    expect(chase.state).toBe('chase');
    expect(
      Math.hypot(
        chase.position.x - bundle.getPlayerPosition('solo').x,
        chase.position.y - bundle.getPlayerPosition('solo').y,
      ),
    ).toBeLessThan(2);
    const save = composePhase1SaveV2(bundle, {
        nowUtc: '2026-10-02T00:00:00.000Z',
      }),
      portable = {
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle' as const,
        world: save.world,
        players: save.players,
        containers: save.containers,
        chunks: save.chunks,
        footholds: save.footholds,
        structures: save.structures,
      };
    const result = reconstructPhase1ReopenState(
      portable,
      createPhase1SaveV2Compatibility(bundle.catalog, [
        save.world.generationVersion,
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.message);
    const reopened = await Phase1AuthorityBundle.create({
      ...config,
      reopen: result.value,
    });
    try {
      expect(reopened.world.getPredator(entity.entityId)?.position).toEqual(
        chase.position,
      );
    } finally {
      await reopened.destroy();
    }
    let windup = false;
    for (let i = 0; i < 120; i++) {
      await bundle.stepSolo();
      if (
        bundle.world.getPredator(entity.entityId)?.state === 'attack-windup'
      ) {
        windup = true;
        break;
      }
    }
    expect(windup).toBe(true);
  } finally {
    await bundle.destroy();
  }
});
