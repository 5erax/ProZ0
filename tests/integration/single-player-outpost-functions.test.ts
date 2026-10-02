import { expect, it } from 'vitest';
import { Phase1AuthorityBundle } from '../../src/integration';
it('a completed camp bed gives local shelter, and a field lab grants remote research and specialization only within reach', async () => {
  const bundle = await Phase1AuthorityBundle.create({
    worldId: 'world:outpost-functions',
    worldSeed: 'p1-world-golden',
    playerIds: ['solo'],
    colonyDepthEnabled: true,
    singlePlayerExpeditionEnabled: true,
    interactionRangeWorldUnits: 4,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  });
  try {
    // Explicit subsystem setup; normal collection/placement is covered by the natural browser journey.
    bundle.getRuntime('solo').relocatePlayer({ x: 100, y: 100 });
    await bundle.stepSolo();
    expect(
      bundle.items.commitColonyExchange({
        operationId: 'fixture-outpost-materials',
        playerId: 'solo',
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
        inputs: [],
        outputs: [
          { itemDefinitionId: 'item:timber', quantity: 10 },
          { itemDefinitionId: 'item:plant-fiber', quantity: 10 },
          { itemDefinitionId: 'item:stone', quantity: 10 },
          { itemDefinitionId: 'item:cordage', quantity: 1 },
          { itemDefinitionId: 'item:metal-ore', quantity: 2 },
        ],
      }).status,
    ).toBe('committed');
    const expedition = bundle.expedition!;
    const build = (id: string, definition: string) => {
      let planned = false;
      for (const [x, y] of [
        [102, 100],
        [98, 100],
        [100, 102],
        [100, 98],
        [102, 102],
        [98, 98],
      ]) {
        const result = expedition.execute({
          id,
          playerId: 'solo',
          action: 'plan',
          target: definition,
          expectedRevision: expedition.read().revision,
          expectedInventoryRevision:
            bundle.items.getContainerView('inventory:solo').revision,
          x: x!,
          y: y!,
        });
        if (result.status === 'committed') {
          planned = true;
          break;
        }
      }
      expect(planned).toBe(true);
      for (const action of ['deposit', 'complete'] as const)
        expect(
          expedition.execute({
            id: id + '-' + action,
            playerId: 'solo',
            action,
            target: 'plan:' + id,
            expectedRevision: expedition.read().revision,
            expectedInventoryRevision:
              bundle.items.getContainerView('inventory:solo').revision,
          }).status,
        ).toBe('committed');
      return expedition
        .read()
        .facilities.find((f) => f.id === 'facility:plan:' + id)!;
    };
    const bed = build('bed', 'camp-bed'),
      lab = build('lab', 'field-lab');
    bundle.getRuntime('solo').relocatePlayer({ x: bed.x, y: bed.y + 1.25 });
    expect(bundle.world.getEnvironmentExposure('solo')).toEqual({
      thermalTarget: 50,
      sheltered: true,
    });
    bundle.getRuntime('solo').relocatePlayer({ x: lab.x, y: lab.y + 1.25 });
    expect(expedition.hasRemoteLab('solo')).toBe(true);
    const command = (
      id: string,
      action: 'research' | 'specialize',
      targetId: string,
    ) =>
      bundle.colonyDepth.execute({
        operationId: id,
        playerId: 'solo',
        action,
        targetId,
        expectedRevision: bundle.colonyDepth.read().revision,
        expectedInventoryRevision:
          bundle.items.getContainerView('inventory:solo').revision,
      });
    expect(command('survey', 'research', 'field-survey').status).toBe(
      'committed',
    );
    expect(command('storage', 'research', 'expanded-storage').status).toBe(
      'committed',
    );
    expect(command('engineer', 'specialize', 'engineer').status).toBe(
      'committed',
    );
    bundle.getRuntime('solo').relocatePlayer({ x: 120, y: 120 });
    expect(expedition.hasRemoteLab('solo')).toBe(false);
    expect(
      command('outside-lab', 'research', 'water-stewardship'),
    ).toMatchObject({ status: 'rejected', reason: 'RETURN_TO_BASE' });
  } finally {
    await bundle.destroy();
  }
});
