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
  getPhase1WorldLandmarks,
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
          && entity.definitionId === 'resource:fiber-plant'
          && original.world.isResourceInInteractionRange(
            'p1',
            entity.entityId,
          ),
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

  it('reopens Ruin reward claimable/claimed states without auto-creating or reissuing the Shard', async () => {
    const worldId = 'world:p1-save-ruin-reward';
    const worldSeed = 'p1-world-golden';
    const original = await Phase1AuthorityBundle.create({
      worldId,
      worldSeed,
      playerIds: ['p1'],
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const landmarks = getPhase1WorldLandmarks(worldSeed);
      const ruin = original.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      if (ruin === null || ruin.type !== 'ruin') {
        throw new Error('Expected canonical Phase 1 ruin.');
      }
      original.getRuntime('p1').relocatePlayer(landmarks.ruinPosition);
      await original.stepSolo();
      const located = original.worldStore.getRuinState(ruin.entityId);
      if (located === undefined) {
        throw new Error('Expected located Ruin state.');
      }
      expect(original.inspectRuin({
        operationId: 'save-ruin:inspect',
        playerId: 'p1',
        ruinEntityId: ruin.entityId,
        expectedRevision: located.revision,
      }).status).toBe('committed');
      expect(original.worldStore.getRuinState(ruin.entityId)).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimable',
      });
      expect(
        original.items.getContainerView('inventory:p1').stacks,
      ).not.toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:ancient-alloy-shard',
      }));

      const claimableSave = composePhase1SaveV2(original, {
        nowUtc: '2026-09-26T00:10:00.000Z',
      });
      const claimablePortable = Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle' as const,
        world: claimableSave.world,
        players: claimableSave.players,
        containers: claimableSave.containers,
        chunks: claimableSave.chunks,
        footholds: claimableSave.footholds,
        structures: claimableSave.structures,
      });
      const compatibility = createPhase1SaveV2Compatibility(
        original.catalog,
        [PHASE1_WORLD_GENERATION_VERSION],
      );
      const claimableReconstruction = reconstructPhase1ReopenState(
        claimablePortable,
        compatibility,
      );
      expect(claimableReconstruction.ok).toBe(true);
      if (!claimableReconstruction.ok) {
        throw new Error(claimableReconstruction.message);
      }

      const claimableReopen = await Phase1AuthorityBundle.create({
        worldId,
        worldSeed,
        playerIds: ['p1'],
        interactionRangeWorldUnits: 2,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
        reopen: claimableReconstruction.value,
      });
      try {
        const reopenedClaimable =
          claimableReopen.worldStore.getRuinState(ruin.entityId);
        expect(reopenedClaimable).toMatchObject({
          discoveryState: 'investigated',
          physicalRewardState: 'claimable',
        });
        expect(
          claimableReopen.items.getContainerView('inventory:p1').stacks,
        ).toEqual([
          expect.objectContaining({
            itemDefinitionId: 'item:stone-field-tool',
            quantity: 1,
            condition: 100,
          }),
        ]);

        const inventory =
          claimableReopen.items.getContainerView('inventory:p1');
        expect(claimableReopen.claimRuinReward({
          operationId: 'save-ruin:claim',
          playerId: 'p1',
          ruinEntityId: ruin.entityId,
          expectedRuinRevision: reopenedClaimable!.revision,
          inventoryContainerId: inventory.containerId,
          expectedInventoryRevision: inventory.revision,
        })).toMatchObject({
          status: 'committed',
          ruinRevision: reopenedClaimable!.revision + 1,
          inventoryRevision: inventory.revision + 1,
        });

        const claimedSave = composePhase1SaveV2(claimableReopen, {
          nowUtc: '2026-09-26T00:11:00.000Z',
        });
        const claimedPortable = Object.freeze({
          formatId: SAVE_FORMAT_ID,
          schemaVersion: SAVE_SCHEMA_VERSION_V2,
          recordKind: 'portable-bundle' as const,
          world: claimedSave.world,
          players: claimedSave.players,
          containers: claimedSave.containers,
          chunks: claimedSave.chunks,
          footholds: claimedSave.footholds,
          structures: claimedSave.structures,
        });
        const claimedReconstruction = reconstructPhase1ReopenState(
          claimedPortable,
          compatibility,
        );
        expect(claimedReconstruction.ok).toBe(true);
        if (!claimedReconstruction.ok) {
          throw new Error(claimedReconstruction.message);
        }

        const claimedReopen = await Phase1AuthorityBundle.create({
          worldId,
          worldSeed,
          playerIds: ['p1'],
          interactionRangeWorldUnits: 2,
          spawnClearanceRadiusWorldUnits: 0,
          requiredAccessRadiusWorldUnits: 0,
          reopen: claimedReconstruction.value,
        });
        try {
          const claimed =
            claimedReopen.worldStore.getRuinState(ruin.entityId);
          expect(claimed).toMatchObject({
            discoveryState: 'investigated',
            physicalRewardState: 'claimed',
          });
          const claimedInventory =
            claimedReopen.items.getContainerView('inventory:p1');
          expect(
            claimedInventory.stacks.filter(
              (stack) =>
                stack.itemDefinitionId === 'item:ancient-alloy-shard',
            ),
          ).toHaveLength(1);
          expect(
            claimedInventory.stacks.filter(
              (stack) =>
                stack.itemDefinitionId === 'item:stone-field-tool',
            ),
          ).toHaveLength(1);
          expect(claimedReopen.claimRuinReward({
            operationId: 'save-ruin:claim-again',
            playerId: 'p1',
            ruinEntityId: ruin.entityId,
            expectedRuinRevision: claimed!.revision,
            inventoryContainerId: claimedInventory.containerId,
            expectedInventoryRevision: claimedInventory.revision,
          })).toMatchObject({
            status: 'rejected',
            reason: 'REWARD_NOT_CLAIMABLE',
          });
          expect(
            claimedReopen.items
              .getContainerView('inventory:p1').stacks.filter(
                (stack) =>
                  stack.itemDefinitionId === 'item:ancient-alloy-shard',
              ),
          ).toHaveLength(1);
        } finally {
          await claimedReopen.destroy();
        }
      } finally {
        await claimableReopen.destroy();
      }
    } finally {
      await original.destroy();
    }
  });

  it('reopens located ruin, pending death and Death Cache, then respawns and recovers canonically', async () => {
    const worldId = 'world:p1-save-death-recovery';
    const worldSeed = 'p1-world-golden';
    const original = await Phase1AuthorityBundle.create({
      worldId,
      worldSeed,
      playerIds: ['p1'],
      interactionRangeWorldUnits: 21,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const fiber = original.world.getActiveGeneratedEntities().find(
        (entity) =>
          entity.type === 'resource'
          && entity.definitionId === 'resource:fiber-plant'
          && original.world.isResourceInInteractionRange(
            'p1',
            entity.entityId,
          ),
      );
      if (fiber === undefined || fiber.type !== 'resource') {
        throw new Error('Expected canonical nearby Fiber Plant.');
      }

      const inventoryBeforeGather =
        original.items.getContainerView('inventory:p1');
      const resource = original.world.getResource(fiber.entityId);
      if (resource === null) {
        throw new Error('Expected canonical Fiber Plant runtime state.');
      }
      const gather = original.items.beginGather({
        operationId: 'save-death:gather',
        playerId: 'p1',
        inventoryContainerId: inventoryBeforeGather.containerId,
        expectedInventoryRevision: inventoryBeforeGather.revision,
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

      const landmarks = getPhase1WorldLandmarks(worldSeed);
      const ruin = original.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      if (ruin === null || ruin.type !== 'ruin') {
        throw new Error('Expected canonical Phase 1 ruin.');
      }
      original.getRuntime('p1').relocatePlayer(
        landmarks.ruinPosition,
        'E',
      );
      await original.stepSolo();
      expect(
        original.worldStore.getRuinState(ruin.entityId)?.discoveryState,
      ).toBe('located');

      const deathTick = original.authorityTick;
      expect(original.survival.applyAuthorityDamage({
        damageId: 'save-death:lethal',
        sourceType: 'hostile-attack',
        sourceEntityId: 'save-death:test-predator',
        targetPlayerId: 'p1',
        amount: 100,
        tick: deathTick,
      })).toMatchObject({
        status: 'applied',
        healthAfter: 0,
      });

      const inventoryAtDeath =
        original.items.getContainerView('inventory:p1');
      const death = original.death.processDeath({
        deathId: 'death:save-reopen:p1',
        playerId: 'p1',
        deathPosition: landmarks.ruinPosition,
        deathTick,
        inventoryContainerId: inventoryAtDeath.containerId,
        expectedInventoryRevision: inventoryAtDeath.revision,
        equippedStackIds: Object.freeze([]),
      });
      expect(death).toMatchObject({
        status: 'committed',
      });
      if (
        death.status !== 'committed'
        || death.cacheContainerId === null
        || death.cacheEntityId === null
      ) {
        throw new Error('Expected canonical persisted Death Cache.');
      }

      const deadBeforeSave = original.survival.getPlayerState('p1');
      expect(deadBeforeSave.lifeState.type).toBe('dead-pending-respawn');
      const cacheBeforeSave =
        original.world.getDeathCacheByContainer(death.cacheContainerId);
      expect(cacheBeforeSave).not.toBeNull();
      expect(
        original.items.getContainerView(death.cacheContainerId).stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:plant-fiber',
        quantity: 2,
      }));

      const request = composePhase1SaveV2(original, {
        nowUtc: '2026-09-26T00:02:00.000Z',
      });
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
        worldId,
        worldSeed,
        playerIds: ['p1'],
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
        reopen: reconstructed.value,
      });
      try {
        expect(
          reopened.worldStore.getRuinState(ruin.entityId)?.discoveryState,
        ).toBe('located');
        const reopenedLife = reopened.survival.getPlayerState('p1').lifeState;
        expect(reopenedLife.type).toBe('dead-pending-respawn');
        if (reopenedLife.type !== 'dead-pending-respawn') {
          throw new Error('Expected reopened pending respawn state.');
        }

        const reopenedCache =
          reopened.world.getDeathCacheByContainer(death.cacheContainerId);
        expect(reopenedCache).not.toBeNull();
        expect(
          reopened.items.getContainerView(death.cacheContainerId).stacks,
        ).toContainEqual(expect.objectContaining({
          itemDefinitionId: 'item:plant-fiber',
          quantity: 2,
        }));
        expect(
          reopened.items.getContainerView('inventory:p1').stacks,
        ).toEqual([]);

        while (reopened.authorityTick < reopenedLife.respawnAtTick) {
          await reopened.stepSolo();
        }
        expect(reopened.survival.getPlayerState('p1').lifeState)
          .toMatchObject({ type: 'alive' });
        expect(reopened.getPlayerPosition('p1'))
          .toMatchObject({ x: 0, y: 0 });

        const cache = reopened.world.getDeathCacheByContainer(
          death.cacheContainerId,
        );
        if (cache === null) {
          throw new Error('Expected reopened Death Cache before recovery.');
        }
        reopened.getRuntime('p1').relocatePlayer(cache.position);

        let recoveryOrdinal = 0;
        while (
          reopened.items.getContainerView(
            death.cacheContainerId,
          ).stacks.length > 0
        ) {
          const cacheContainer =
            reopened.items.getContainerView(death.cacheContainerId);
          const stack = cacheContainer.stacks[0];
          if (stack === undefined) {
            throw new Error('Expected reopened Death Cache item.');
          }
          const target =
            reopened.items.getContainerView('inventory:p1');
          const recovered = reopened.death.recoverFromDeathCache({
            type: 'transfer',
            operationId:
              'save-death:recover:' + String(++recoveryOrdinal),
            playerId: 'p1',
            sourceContainerId: cacheContainer.containerId,
            sourceExpectedRevision: cacheContainer.revision,
            targetContainerId: target.containerId,
            targetExpectedRevision: target.revision,
            sourceStackId: stack.stackId,
            quantity: stack.quantity,
          });
          expect(recovered.status).toBe('committed');
        }
        expect(
          reopened.items.getContainerView('inventory:p1').stacks,
        ).toEqual(expect.arrayContaining([
          expect.objectContaining({
            itemDefinitionId: 'item:plant-fiber',
            quantity: 2,
          }),
          expect.objectContaining({
            itemDefinitionId: 'item:stone-field-tool',
            quantity: 1,
            condition: 100,
          }),
        ]));
        expect(
          reopened.world.getDeathCacheByContainer(
            death.cacheContainerId,
          ),
        ).toBeNull();

        const afterRecovery = composePhase1SaveV2(reopened, {
          nowUtc: '2026-09-26T00:03:00.000Z',
        });
        expect(
          afterRecovery.containers.some(
            (container) =>
              container.containerId === death.cacheContainerId,
          ),
        ).toBe(false);
        expect(
          afterRecovery.chunks.flatMap(
            (chunk) => chunk.createdEntities,
          ).some(
            (entity) =>
              entity.type === 'death-cache'
              && entity.entityId === death.cacheEntityId,
          ),
        ).toBe(false);
      } finally {
        await reopened.destroy();
      }
    } finally {
      await original.destroy();
    }
  });

  it('reopens a valid Save V2 predator PATROL state without remapping or rejecting it', async () => {
    const worldId = 'world:p1-save-patrol';
    const worldSeed = 'p1-world-golden';
    const original = await Phase1AuthorityBundle.create({
      worldId,
      worldSeed,
      playerIds: ['p1'],
      interactionRangeWorldUnits: 21,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      original.getRuntime('p1').relocatePlayer(
        original.getPlayerPosition('p1'),
        'E',
      );
      const request = composePhase1SaveV2(original, {
        nowUtc: '2026-09-26T00:04:00.000Z',
      });
      let patrolInjected = false;
      const chunks = Object.freeze(request.chunks.map((chunk) => {
        if (chunk.predatorStates.length === 0) return chunk;
        patrolInjected = true;
        return Object.freeze({
          ...chunk,
          predatorStates: Object.freeze(chunk.predatorStates.map(
            (predator) => Object.freeze({
              ...predator,
              state: 'patrol' as const,
              targetPlayerId: null,
              stateUntilTick: null,
            }),
          )),
        });
      }));
      expect(patrolInjected).toBe(true);

      const portable = Object.freeze({
        formatId: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle' as const,
        world: request.world,
        players: request.players,
        containers: request.containers,
        chunks,
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
        worldId,
        worldSeed,
        playerIds: ['p1'],
        interactionRangeWorldUnits: 21,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
        reopen: reconstructed.value,
      });
      try {
        expect(reopened.world.exportSnapshot().predators).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ state: 'patrol' }),
          ]),
        );
      } finally {
        await reopened.destroy();
      }
    } finally {
      await original.destroy();
    }
  });

});
