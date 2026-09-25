import { describe, expect, it, vi } from 'vitest';
import { createWorldPosition } from '../../src/foundation';
import {
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
  Phase1AuthorityBundle,
} from '../../src/integration';
import {
  PHASE1_STRUCTURE_PLACEMENT_PROFILES,
} from '../../src/world';
import {
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';

describe('Phase 1 canonical authority bundle', () => {
  it('runs new-world movement, survival, fog reveal and authority respawn on one canonical state graph', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-integration-new',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits:
        PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
      spawnClearanceRadiusWorldUnits:
        PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
      requiredAccessRadiusWorldUnits:
        PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
    });

    try {
      const inventory = bundle.items.getContainerView('inventory:p1');
      expect(inventory.stacks).toEqual([
        expect.objectContaining({
          stackId: 'starter:stone-field-tool:p1',
          itemDefinitionId: 'item:stone-field-tool',
          quantity: 1,
          condition: 100,
        }),
      ]);
      expect(PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS).toBe(1.25);
      expect(PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS).toBe(1.25);
      expect(PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS).toBe(1.25);
      expect(bundle.survival.getPlayerView('p1')).toMatchObject({
        health: 100,
        food: 70,
        water: 80,
        stamina: 100,
        temperature: 50,
      });
      expect(bundle.authorityTick).toBe(0);

      bundle.submitInput('p1', {
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: true,
      });
      await bundle.stepSolo();

      const moved = bundle.getPlayerPosition('p1');
      expect(moved.x).toBeGreaterThan(0);
      expect(moved.y).toBe(0);
      expect(bundle.authorityTick).toBe(1);
      expect(bundle.worldStore.getEnvironmentView().state.activeTick).toBe(1);
      expect(bundle.survival.getPlayerState('p1').tick).toBe(1);

      expect(bundle.world.isFootprintExplored(
        moved,
        PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:storage-crate'],
        0,
      )).toBe(true);

      const reservation = bundle.world.reservePlayerRespawn('p1');
      expect(reservation).not.toBeNull();
      bundle.world.commitReservedPlayerRespawn(reservation!);
      expect(bundle.getPlayerPosition('p1')).toMatchObject({ x: 0, y: 0 });
      expect(bundle.getRuntime('p1').getSnapshot().player.locomotionState)
        .toBe('IDLE');
    } finally {
      await bundle.destroy();
    }
  });

  it('applies approved 1.25 WU interaction and Landing clearance boundaries inclusively', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-approved-spatial-tuning',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits:
        PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
      spawnClearanceRadiusWorldUnits:
        PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
      requiredAccessRadiusWorldUnits:
        PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
    });

    try {
      const resource = bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (resource === null || resource.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      bundle.getRuntime('p1').relocatePlayer(createWorldPosition(
        resource.position.x
          + PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
        resource.position.y,
      ));
      expect(bundle.world.isResourceInInteractionRange(
        'p1',
        resource.entityId,
      )).toBe(true);

      bundle.getRuntime('p1').relocatePlayer(createWorldPosition(
        resource.position.x
          + PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS
          + 0.0001,
        resource.position.y,
      ));
      expect(bundle.world.isResourceInInteractionRange(
        'p1',
        resource.entityId,
      )).toBe(false);

      const habitat =
        PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:habitat-room'];
      const directEastConnectorCenter = createWorldPosition(2, 0);
      expect(bundle.world.blocksSpawnClearance(
        directEastConnectorCenter,
        habitat,
        0,
      )).toBe(false);
      expect(bundle.world.blocksRequiredAccess(
        directEastConnectorCenter,
        habitat,
        0,
      )).toBe(false);

      const storage =
        PHASE1_STRUCTURE_PLACEMENT_PROFILES['structure:storage-crate'];
      expect(bundle.world.blocksSpawnClearance(
        createWorldPosition(0, 0),
        storage,
        0,
      )).toBe(true);
      expect(bundle.world.blocksRequiredAccess(
        createWorldPosition(0, 0),
        storage,
        0,
      )).toBe(true);
    } finally {
      await bundle.destroy();
    }
  });

  it('supports hosted ordering by preparing environment before command resolution and completing domain state after movement', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-integration-hosted-order',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1', 'p2'],
      interactionRangeWorldUnits: 0,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      await bundle.prepareAuthorityTick(1);
      expect(bundle.authorityTick).toBe(1);
      expect(bundle.worldStore.getEnvironmentView().state.activeTick).toBe(1);
      expect(bundle.survival.getPlayerState('p1').tick).toBe(0);

      await bundle.completeAuthorityTick(1);
      expect(bundle.survival.getPlayerState('p1').tick).toBe(1);
      expect(bundle.survival.getPlayerState('p2').tick).toBe(1);

      await expect(bundle.prepareAuthorityTick(1)).rejects.toThrow(
        /advance exactly one/,
      );
    } finally {
      await bundle.destroy();
    }
  });

  it('centralizes machine progression for canonical item transfer and machine interaction', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-machine-progression-integration',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits: 0,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const baseline = bundle.buildings.exportSnapshot();
      vi.spyOn(bundle.buildings, 'exportSnapshot').mockReturnValue(
        Object.freeze({
          ...baseline,
          foothold: Object.freeze({
            ...baseline.foothold,
            condensers: Object.freeze([
              Object.freeze({
                structureId: 'structure-instance:test-condenser',
                revision: 0,
                enabled: true,
                productionProgressTicks: 0,
                completedCycleOrdinal: 1,
                outputContainerId: 'machine-output:test-condenser',
              }),
            ]),
          }),
        }),
      );

      const originalGetContainer =
        bundle.items.getContainerView.bind(bundle.items);
      vi.spyOn(bundle.items, 'getContainerView').mockImplementation(
        (containerId) => containerId === 'machine-output:test-condenser'
          ? Object.freeze({
              containerId,
              kind: 'machine-output' as const,
              ownerPlayerId: null,
              revision: 0,
              stacks: Object.freeze([
                Object.freeze({
                  stackId: 'stack:test-clean-water',
                  itemDefinitionId: 'item:clean-water',
                  quantity: 1,
                  condition: null,
                }),
              ]),
              totalWeightKg: 0.5,
              totalVolume: 0.5,
              playerWeightState: null,
            })
          : originalGetContainer(containerId),
      );
      vi.spyOn(bundle.items, 'execute').mockReturnValue(Object.freeze({
        status: 'committed' as const,
        operationId: 'machine-output:test-collect',
        resultingRevisions: Object.freeze([]),
        resultingWorldRevisions: Object.freeze([]),
        createdStackIds: Object.freeze([]),
        removedStackIds: Object.freeze([]),
      }));

      const transfer = {
        type: 'transfer' as const,
        operationId: 'machine-output:test-collect',
        playerId: 'p1',
        sourceContainerId: 'machine-output:test-condenser',
        sourceExpectedRevision: 0,
        targetContainerId: 'inventory:p1',
        targetExpectedRevision: 0,
        sourceStackId: 'stack:test-clean-water',
        quantity: 1,
      };
      expect(bundle.executeItemCommand(transfer).status).toBe('committed');
      expect(bundle.progression.getPlayerView('p1').totalXp).toBe(20);
      expect(
        bundle.progression.getPlayerView('p1').milestoneRuleIds,
      ).toContain('first-machine-output:clean-water');

      // Same operation ID maps to the same progression event receipt.
      expect(bundle.executeItemCommand(transfer).status).toBe('committed');
      expect(bundle.progression.getPlayerView('p1').totalXp).toBe(20);

      const applyEvent = vi.spyOn(bundle.progression, 'applyEvent');
      applyEvent.mockClear();
      vi.spyOn(bundle.machines, 'setEnabled').mockReturnValue(Object.freeze({
        status: 'committed' as const,
        operationId: 'machine-toggle:test',
        revision: 1,
        enabled: true,
      }));
      vi.spyOn(bundle.buildings, 'isCondenserPowered').mockReturnValue(true);

      expect(bundle.setCondenserEnabled({
        operationId: 'machine-toggle:test',
        actorPlayerId: 'p1',
        structureId: 'structure-instance:test-condenser',
        expectedRevision: 0,
        enabled: true,
      }).status).toBe('committed');
      expect(applyEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'powered-machine-interacted',
        eventId: 'powered-machine-interacted:machine-toggle:test',
        playerId: 'p1',
        machineId: 'machine:atmospheric-water-condenser',
        powered: true,
      }));
    } finally {
      vi.restoreAllMocks();
      await bundle.destroy();
    }
  });

  it('keeps shared ruin discovery world-owned while awarding personal locate/inspect progression only to the acting player', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-ruin-integration',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1', 'p2'],
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const landmarks = getPhase1WorldLandmarks('p1-world-golden');
      const ruin = bundle.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      expect(ruin).not.toBeNull();

      bundle.getRuntime('p1').relocatePlayer(landmarks.ruinPosition);
      await bundle.stepSolo();

      const located = bundle.worldStore.getRuinState(ruin!.entityId);
      expect(located?.discoveryState).toBe('located');
      expect(
        bundle.progression.getPlayerView('p1').milestoneRuleIds,
      ).toContain('first-ruin-locate:previous-civilization-ruin');
      expect(
        bundle.progression.getPlayerView('p2').milestoneRuleIds,
      ).not.toContain('first-ruin-locate:previous-civilization-ruin');

      const inspected = bundle.inspectRuin({
        operationId: 'op:ruin-inspect:p1',
        playerId: 'p1',
        ruinEntityId: ruin!.entityId,
        expectedRevision: located!.revision,
      });
      expect(inspected.status).toBe('committed');
      expect(bundle.worldStore.getRuinState(ruin!.entityId)).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimable',
      });
      expect(
        bundle.progression.getPlayerView('p1').milestoneRuleIds,
      ).toContain('first-ruin-inspect:previous-civilization-ruin');
      expect(
        bundle.progression.getPlayerView('p2').milestoneRuleIds,
      ).not.toContain('first-ruin-inspect:previous-civilization-ruin');

      const claimable = bundle.worldStore.getRuinState(ruin!.entityId);
      const inventory = bundle.items.getContainerView('inventory:p1');
      const claim = bundle.claimRuinReward({
        operationId: 'op:ruin-reward:p1',
        playerId: 'p1',
        ruinEntityId: ruin!.entityId,
        expectedRuinRevision: claimable!.revision,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
      });
      expect(claim).toMatchObject({
        status: 'committed',
        operationId: 'op:ruin-reward:p1',
        inventoryRevision: inventory.revision + 1,
        ruinRevision: claimable!.revision + 1,
      });
      expect(
        bundle.items.getContainerView('inventory:p1').stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:ancient-alloy-shard',
        quantity: 1,
      }));
      expect(bundle.worldStore.getRuinState(ruin!.entityId)).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      });

      expect(bundle.claimRuinReward({
        operationId: 'op:ruin-reward:p1',
        playerId: 'p1',
        ruinEntityId: ruin!.entityId,
        expectedRuinRevision: claimable!.revision,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
      })).toEqual(claim);
      expect(
        bundle.items.getContainerView('inventory:p1').stacks.filter(
          (stack) =>
            stack.itemDefinitionId === 'item:ancient-alloy-shard',
        ),
      ).toHaveLength(1);

      expect(bundle.claimRuinReward({
        operationId: 'op:ruin-reward:p1',
        playerId: 'p1',
        ruinEntityId: ruin!.entityId,
        expectedRuinRevision: claimable!.revision,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision + 1,
      })).toMatchObject({
        status: 'rejected',
        reason: 'OPERATION_ID_CONFLICT',
      });

      bundle.getRuntime('p2').relocatePlayer(landmarks.ruinPosition);
      const claimed = bundle.worldStore.getRuinState(ruin!.entityId)!;
      const p2Inventory = bundle.items.getContainerView('inventory:p2');
      expect(bundle.claimRuinReward({
        operationId: 'op:ruin-reward:p2',
        playerId: 'p2',
        ruinEntityId: ruin!.entityId,
        expectedRuinRevision: claimed.revision,
        inventoryContainerId: p2Inventory.containerId,
        expectedInventoryRevision: p2Inventory.revision,
      })).toMatchObject({
        status: 'rejected',
        reason: 'REWARD_NOT_CLAIMABLE',
      });
    } finally {
      await bundle.destroy();
    }
  });


  it('releases the ruin claim reservation on item-capacity rejection and allows a fresh later claim', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-ruin-reward-capacity',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const landmarks = getPhase1WorldLandmarks('p1-world-golden');
      const ruin = bundle.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      if (ruin === null || ruin.type !== 'ruin') {
        throw new Error('Expected canonical Phase 1 ruin.');
      }
      bundle.getRuntime('p1').relocatePlayer(landmarks.ruinPosition);
      await bundle.stepSolo();
      const located = bundle.worldStore.getRuinState(ruin.entityId);
      if (located === undefined) {
        throw new Error('Expected located ruin state.');
      }
      expect(bundle.inspectRuin({
        operationId: 'op:ruin-capacity:inspect',
        playerId: 'p1',
        ruinEntityId: ruin.entityId,
        expectedRevision: located.revision,
      }).status).toBe('committed');

      const claimable = bundle.worldStore.getRuinState(ruin.entityId)!;
      const inventory = bundle.items.getContainerView('inventory:p1');
      const itemCommit = vi.spyOn(
        bundle.items,
        'commitRuinRewardItems',
      ).mockReturnValueOnce(Object.freeze({
        status: 'rejected' as const,
        operationId: 'op:ruin-capacity:full',
        reason: 'TARGET_CAPACITY_VOLUME' as const,
      }));

      expect(bundle.claimRuinReward({
        operationId: 'op:ruin-capacity:full',
        playerId: 'p1',
        ruinEntityId: ruin.entityId,
        expectedRuinRevision: claimable.revision,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
      })).toMatchObject({
        status: 'rejected',
        reason: 'TARGET_CAPACITY_VOLUME',
      });
      expect(bundle.worldStore.getRuinState(ruin.entityId)).toEqual(
        claimable,
      );
      expect(
        bundle.items.getContainerView(inventory.containerId).stacks,
      ).not.toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:ancient-alloy-shard',
      }));

      itemCommit.mockRestore();
      const freshInventory =
        bundle.items.getContainerView('inventory:p1');
      expect(bundle.claimRuinReward({
        operationId: 'op:ruin-capacity:retry',
        playerId: 'p1',
        ruinEntityId: ruin.entityId,
        expectedRuinRevision: claimable.revision,
        inventoryContainerId: freshInventory.containerId,
        expectedInventoryRevision: freshInventory.revision,
      })).toMatchObject({
        status: 'committed',
        ruinRevision: claimable.revision + 1,
        inventoryRevision: freshInventory.revision + 1,
      });
      expect(bundle.worldStore.getRuinState(ruin.entityId)).toMatchObject({
        physicalRewardState: 'claimed',
      });
      expect(
        bundle.items.getContainerView('inventory:p1').stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:ancient-alloy-shard',
        quantity: 1,
      }));
    } finally {
      vi.restoreAllMocks();
      await bundle.destroy();
    }
  });

  it('orchestrates one stable death transition and canonical respawn after lethal authority damage', async () => {
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:p1-integration-death',
      worldSeed: 'p1-world-golden',
      playerIds: ['p1'],
      interactionRangeWorldUnits: 0,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      await bundle.stepSolo();
      expect(bundle.authorityTick).toBe(1);

      const lethal = bundle.survival.applyAuthorityDamage({
        damageId: 'test:lethal:boundary',
        sourceType: 'hostile-attack',
        sourceEntityId: 'test:predator',
        targetPlayerId: 'p1',
        amount: 100,
        tick: 1,
      });
      expect(lethal).toMatchObject({
        status: 'applied',
        lethal: true,
        healthAfter: 0,
      });

      // The next tick resolves the completed prior-tick lethal event before
      // advancing survival, preserving its canonical source tick/DeathId.
      await bundle.stepSolo();

      const death = bundle.getLastDeathResult('p1');
      expect(death).toMatchObject({
        status: 'committed',
        deathId: 'death:p1:test:lethal:boundary',
      });
      if (
        death === null
        || death.status !== 'committed'
        || death.cacheEntityId === null
        || death.cacheContainerId === null
      ) {
        throw new Error('Starter tool must enter the canonical Death Cache.');
      }
      expect(
        bundle.items.getContainerView(death.cacheContainerId).stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:stone-field-tool',
        quantity: 1,
        condition: 100,
      }));
      const dead = bundle.survival.getPlayerState('p1');
      expect(dead.lifeState).toMatchObject({
        type: 'dead-pending-respawn',
        deathId: 'death:p1:test:lethal:boundary',
      });
      if (dead.lifeState.type !== 'dead-pending-respawn') {
        throw new Error('Expected canonical pending respawn.');
      }

      const respawnAtTick = dead.lifeState.respawnAtTick;
      while (bundle.authorityTick < respawnAtTick) {
        await bundle.stepSolo();
      }

      expect(bundle.getLastRespawnResult('p1')).toMatchObject({
        status: 'respawned',
        playerId: 'p1',
        position: { x: 0, y: 0 },
      });
      expect(bundle.survival.getPlayerState('p1').lifeState)
        .toEqual({ type: 'alive' });
      expect(bundle.items.getContainerView('inventory:p1').stacks)
        .toEqual([]);
      expect(bundle.getPlayerPosition('p1')).toMatchObject({
        x: 0,
        y: 0,
      });
      expect(bundle.death.exportSnapshot().processed).toHaveLength(1);
    } finally {
      await bundle.destroy();
    }
  });

});
