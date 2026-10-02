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
it('reopens solo construction escrow and rejects multiplayer or foreign-owner expedition saves', async () => {
  const config = {
    worldId: 'world:expedition-save',
    worldSeed: 'p1-world-golden',
    playerIds: ['solo'],
    singlePlayerExpeditionEnabled: true,
    colonyDepthEnabled: true,
    interactionRangeWorldUnits: 4,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  };
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    bundle.getRuntime('solo');
    await bundle.stepSolo();
    // Placement is a labelled subsystem fixture; natural exploration is verified separately.
    let placed = false;
    for (const [x, y] of [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
      [2, 2],
      [-2, -2],
    ]) {
      const plan = bundle.expedition!.execute({
        id: 'plan',
        playerId: 'solo',
        expectedRevision: 0,
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
        action: 'plan',
        target: 'supply-cache',
        x: x!,
        y: y!,
      });
      if (plan.status === 'committed') {
        placed = true;
        break;
      }
    }
    expect(placed, JSON.stringify(bundle.expedition!.read())).toBe(true);
    expect(
      bundle.items.commitColonyExchange({
        operationId: 'fixture-materials',
        playerId: 'solo',
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
        inputs: [],
        outputs: [
          { itemDefinitionId: 'item:timber', quantity: 10 },
          { itemDefinitionId: 'item:timber', quantity: 5 },
          { itemDefinitionId: 'item:stone', quantity: 20 },
          { itemDefinitionId: 'item:plant-fiber', quantity: 2 },
        ],
      }).status,
    ).toBe('committed');
    expect(
      bundle.expedition!.execute({
        id: 'deposit',
        playerId: 'solo',
        expectedRevision: bundle.expedition!.read().revision,
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
        action: 'deposit',
        target: 'plan:plan',
      }).status,
    ).toBe('committed');
    expect(
      bundle.items.getContainerView('inventory:solo').totalWeightKg,
    ).toBeGreaterThan(25);
    const request = composePhase1SaveV2(bundle, {
      nowUtc: '2026-10-02T00:00:00.000Z',
    });
    const portable = {
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'portable-bundle' as const,
      world: request.world,
      players: request.players,
      containers: request.containers,
      chunks: request.chunks,
      footholds: request.footholds,
      structures: request.structures,
    };
    const compatibility = createPhase1SaveV2Compatibility(bundle.catalog, [
      request.world.generationVersion,
    ]);
    const result = reconstructPhase1ReopenState(portable, compatibility);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(result.message);
    const reopened = await Phase1AuthorityBundle.create({
      ...config,
      reopen: result.value,
    });
    try {
      expect(reopened.expedition!.read()).toEqual(bundle.expedition!.read());
      expect(reopened.items.exportLedgerSnapshot()).toEqual(
        bundle.items.exportLedgerSnapshot(),
      );
    } finally {
      await reopened.destroy();
    }
    await expect(
      Phase1AuthorityBundle.create({
        ...config,
        singlePlayerExpeditionEnabled: false,
        reopen: result.value,
      }),
    ).rejects.toThrow(/Expedition/);
    await expect(
      Phase1AuthorityBundle.create({ ...config, playerIds: ['solo', 'guest'] }),
    ).rejects.toThrow(/single-player/);
    const bad = {
      ...portable,
      world: {
        ...portable.world,
        singlePlayerExpedition: {
          ...bundle.expedition!.read(),
          supplyClaimed: ['absent-player'],
        },
      },
    };
    expect(reconstructPhase1ReopenState(bad, compatibility).ok).toBe(false);
    const future = {
      ...portable,
      world: {
        ...portable.world,
        singlePlayerExpedition: {
          ...bundle.expedition!.read(),
          events: [
            {
              tick: bundle.authorityTick + 1,
              untilTick: bundle.authorityTick + 10801,
              region: '0:0',
              kind: 'growth-flush' as const,
            },
          ],
        },
      },
    };
    expect(reconstructPhase1ReopenState(future, compatibility).ok).toBe(false);
    const finish = {
      id: 'finish',
      playerId: 'solo',
      expectedRevision: bundle.expedition!.read().revision,
      expectedInventoryRevision:
        bundle.items.getContainerView('inventory:solo').revision,
      action: 'complete' as const,
      target: 'plan:plan',
    };
    expect(bundle.expedition!.execute(finish).status).toBe('committed');
    expect(bundle.progression.getPlayerView('solo').milestoneRuleIds).toContain(
      'first-place:storage-crate',
    );
    const placedXp = bundle.progression.getPlayerView('solo').totalXp;
    expect(bundle.expedition!.execute(finish).status).toBe('committed');
    expect(bundle.progression.getPlayerView('solo').totalXp).toBe(placedXp);
    expect(
      bundle.items.commitColonyExchange({
        operationId: 'fixture-craft-supplies',
        playerId: 'solo',
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
        inputs: [],
        outputs: [{ itemDefinitionId: 'item:plant-fiber', quantity: 3 }],
      }).status,
    ).toBe('committed');
    const craft = {
      id: 'cordage',
      playerId: 'solo',
      recipeId: 'field-cordage',
      expectedRevision: bundle.expedition!.read().revision,
      expectedInventoryRevision:
        bundle.items.getContainerView('inventory:solo').revision,
    };
    expect(bundle.expedition!.craft(craft).status).toBe('committed');
    expect(bundle.progression.getPlayerView('solo').milestoneRuleIds).toContain(
      'first-craft:cordage',
    );
    const craftedXp = bundle.progression.getPlayerView('solo').totalXp;
    expect(bundle.expedition!.craft(craft).status).toBe('committed');
    expect(bundle.progression.getPlayerView('solo').totalXp).toBe(craftedXp);
  } finally {
    await bundle.destroy();
  }
});
