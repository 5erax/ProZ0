import { describe, expect, it } from 'vitest';
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
import {
  PHASE1_WORLD_GENERATION_VERSION,
} from '../../src/world/phase1/Phase1ChunkGenerator';

describe('Phase 1 Save V2 integration composition', () => {
  it('round-trips canonical authority state through Save V2 reopen and continues ticking', async () => {
    const original = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-save-roundtrip',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits: 21,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      original.submitInput('p1', {
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: true,
      });
      await original.stepSolo();

      original.submitInput('p1', {
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
      });

      const fiber = original.world.getActiveGeneratedEntities().find(
        (entity) =>
          entity.type === 'resource'
          && entity.definitionId === 'resource:fiber-plant',
      );
      if (fiber === undefined || fiber.type !== 'resource') {
        throw new Error('Expected canonical nearby Fiber Plant.');
      }

      for (const ordinal of [1, 2] as const) {
        const inventory = original.items.getContainerView('inventory:p1');
        const resource = original.world.getResource(fiber.entityId);
        if (resource === null) {
          throw new Error('Expected canonical Fiber Plant runtime state.');
        }
        const gather = original.items.beginGather({
          operationId: 'save-roundtrip:gather:' + String(ordinal),
          playerId: 'p1',
          inventoryContainerId: inventory.containerId,
          expectedInventoryRevision: inventory.revision,
          resourceEntityId: fiber.entityId,
          expectedResourceRevision: resource.revision,
        });
        expect(gather.status).toBe('started');
        if (gather.status !== 'started') {
          throw new Error('Expected Fiber gather channel to start.');
        }
        for (let tick = 0; tick < gather.requiredTicks; tick += 1) {
          await original.stepSolo();
        }
      }

      const gatheredInventory =
        original.items.getContainerView('inventory:p1');
      expect(gatheredInventory.stacks).toContainEqual(
        expect.objectContaining({
          itemDefinitionId: 'item:plant-fiber',
          quantity: 4,
        }),
      );

      const crafted = original.items.execute({
        type: 'craft',
        operationId: 'save-roundtrip:craft:cordage',
        playerId: 'p1',
        inventoryContainerId: gatheredInventory.containerId,
        expectedInventoryRevision: gatheredInventory.revision,
        recipeId: 'recipe:cordage',
      });
      expect(crafted.status).toBe('committed');

      const craftedInventory =
        original.items.getContainerView('inventory:p1');
      expect(craftedInventory.stacks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            itemDefinitionId: 'item:plant-fiber',
            quantity: 1,
          }),
          expect.objectContaining({
            itemDefinitionId: 'item:cordage',
            quantity: 1,
          }),
        ]),
      );

      const beforePosition = original.getPlayerPosition('p1');
      const beforeSurvival = original.survival.getPlayerState('p1');
      const request = composePhase1SaveV2(original, {
        nowUtc: '2026-09-26T00:00:00.000Z',
      });

      expect(request.world.worldRevision).toBe(0);
      expect(request.expectedPreviousWorldRevision).toBeNull();
      expect(request.world.authorityTick).toBe(original.authorityTick);
      expect(request.players[0]?.facing).toBe('E');

      const portable = Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle' as const,
        world: request.world,
        players: request.players,
        containers: request.containers,
        chunks: request.chunks,
        footholds: request.footholds,
        structures: request.structures,
      });
      const compatibility = createPhase1SaveV2Compatibility(
        original.catalog,
        [PHASE1_WORLD_GENERATION_VERSION],
      );
      const reconstructed = reconstructPhase1ReopenState(
        portable,
        compatibility,
      );
      expect(reconstructed.ok).toBe(true);
      if (!reconstructed.ok) {
        throw new Error(reconstructed.message);
      }

      const reopened = await Phase1AuthorityBundle.create({
        worldId: 'world:p1-save-roundtrip',
        worldSeed: 'p1-world-golden',
        playerIds: ['p1'],
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
        reopen: reconstructed.value,
      });
      try {
        expect(reopened.authorityTick).toBe(original.authorityTick);
        expect(reopened.getPlayerPosition('p1')).toEqual(beforePosition);
        expect(reopened.survival.getPlayerState('p1')).toEqual(
          beforeSurvival,
        );
        expect(reopened.items.exportLedgerSnapshot()).toEqual(
          original.items.exportLedgerSnapshot(),
        );
        expect(
          reopened.items.getContainerView('inventory:p1').stacks,
        ).toEqual(expect.arrayContaining([
          expect.objectContaining({
            itemDefinitionId: 'item:plant-fiber',
            quantity: 1,
          }),
          expect.objectContaining({
            itemDefinitionId: 'item:cordage',
            quantity: 1,
          }),
        ]));
        expect(
          reopened.buildings.exportSnapshot(),
        ).toEqual(original.buildings.exportSnapshot());

        reopened.submitInput('p1', {
          moveUp: false,
          moveDown: true,
          moveLeft: false,
          moveRight: false,
        });
        await reopened.stepSolo();
        expect(reopened.authorityTick).toBe(original.authorityTick + 1);
        expect(reopened.getPlayerPosition('p1').y).toBeGreaterThan(
          beforePosition.y,
        );

        const second = composePhase1SaveV2(reopened, {
          nowUtc: '2026-09-26T00:01:00.000Z',
        });
        expect(second.expectedPreviousWorldRevision).toBe(0);
        expect(second.world.worldRevision).toBe(1);
        expect(second.players[0]?.playerRevision).toBe(1);
        expect(second.world.createdAtUtc).toBe(
          '2026-09-26T00:00:00.000Z',
        );
      } finally {
        await reopened.destroy();
      }
    } finally {
      await original.destroy();
    }
  });
});
