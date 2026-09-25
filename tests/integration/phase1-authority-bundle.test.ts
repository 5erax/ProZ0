import { describe, expect, it, vi } from 'vitest';
import { Phase1AuthorityBundle } from '../../src/integration';
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
      interactionRangeWorldUnits: 0,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
    });

    try {
      const inventory = bundle.items.getContainerView('inventory:p1');
      expect(inventory.stacks).toEqual([]);
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
    } finally {
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
        cacheEntityId: null,
        cacheContainerId: null,
      });
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
