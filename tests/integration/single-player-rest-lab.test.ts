import { expect, it } from 'vitest';
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from '../../src/integration';
it('landing lab supplies are finite, rest costs food/water, and movement or damage cancels without recovery', async () => {
  const bundle = await Phase1AuthorityBundle.create({
    worldId: 'world:lab-rest',
    worldSeed: 'p1-world-golden',
    playerIds: ['solo'],
    colonyDepthEnabled: true,
    singlePlayerExpeditionEnabled: true,
    interactionRangeWorldUnits: 4,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  });
  try {
    const expedition = bundle.expedition!;
    const action = (id: string, kind: 'rest' | 'supplies') =>
      expedition.interact({
        id,
        playerId: 'solo',
        target: 'landing-lab',
        action: kind,
        expectedRevision: expedition.read().revision,
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
      });
    expect(action('supplies', 'supplies').status).toBe('committed');
    const after = bundle.items.exportLedgerSnapshot();
    expect(action('supplies-again', 'supplies').message).toBe(
      'SUPPLIES_ALREADY_CLAIMED',
    );
    expect(bundle.items.exportLedgerSnapshot()).toEqual(after);
    const damage = (id: string) =>
      bundle.survival.applyAuthorityDamage({
        damageId: id,
        sourceType: 'hostile-attack',
        sourceEntityId: 'test-fixture',
        targetPlayerId: 'solo',
        amount: 10,
        tick: bundle.authorityTick,
      });
    damage('injury');
    expect(action('rest-moving', 'rest').status).toBe('committed');
    bundle.submitInput('solo', {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: true,
    });
    for (let i = 0; i < 10; i++) await bundle.stepSolo();
    expect(expedition.restStatus('solo')).toBeNull();
    expect(bundle.survival.getPlayerView('solo').health).toBe(90);
    bundle.submitInput('solo', {
      moveUp: false,
      moveDown: false,
      moveLeft: false,
      moveRight: false,
    });
    expect(action('rest-damaged', 'rest').status).toBe('committed');
    damage('interrupt');
    await bundle.stepSolo();
    expect(expedition.restStatus('solo')).toBeNull();
    expect(bundle.survival.getPlayerView('solo').health).toBe(80);
    const before = bundle.survival.getPlayerView('solo');
    expect(action('rest-success', 'rest').status).toBe('committed');
    for (let i = 0; i < 480; i++) await bundle.stepSolo();
    const rested = bundle.survival.getPlayerView('solo');
    expect(rested.health).toBe(95);
    expect(rested.food).toBeLessThanOrEqual(before.food - 5);
    expect(rested.water).toBeLessThanOrEqual(before.water - 5);
    expect(action('cooldown', 'rest').message).toBe('REST_COOLDOWN');
    const save = composePhase1SaveV2(bundle, {
      nowUtc: '2026-10-02T00:00:00.000Z',
    });
    expect(save.world.singlePlayerExpedition?.supplyClaimed).toEqual(['solo']);
    expect(save.world.singlePlayerExpedition?.restCooldown.solo).toBe(
      bundle.authorityTick + 1800,
    );
  } finally {
    await bundle.destroy();
  }
});
