import { expect, it } from 'vitest';
import { Phase1AuthorityBundle } from '../../src/integration';
import { Phase1ProductReviewPresentationSource } from '../../src/client/runtime/Phase1ProductReviewPresentationSource';

it('solo character details include the actual carry contribution in the authority stamina penalty', async () => {
  const bundle = await Phase1AuthorityBundle.create({ worldId: 'world:carry-inspection', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 });
  try {
    bundle.getRuntime('solo');
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:heavy', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:metal-ore', quantity: 20 }, { itemDefinitionId: 'item:metal-ore', quantity: 8 }] }).status).toBe('committed');
    const inventory = bundle.items.getContainerView('inventory:solo');
    expect(inventory.playerWeightState).toBe('HEAVY');
    const source = new Phase1ProductReviewPresentationSource(bundle, 'solo', () => []);
    source.togglePanel('inventory');
    const panel = source.read().panel;
    if (panel?.kind !== 'inventory') throw Error('Expected inventory');
    expect(panel.character!.staminaRegenPenaltyPercent).toBe(bundle.survival.getPlayerView('solo', inventory.playerWeightState!).staminaRegenPenaltyPercent);
    expect(panel.character!.staminaRegenPenaltyPercent).toBeGreaterThan(0);
    expect(panel.character!.effects.find(e => e.id === 'carrying')!.name).toBe('Heavy carrying');
    expect(panel.character!.staminaRegenPenaltyPercent).toBe(20);
  } finally { await bundle.destroy(); }
});
