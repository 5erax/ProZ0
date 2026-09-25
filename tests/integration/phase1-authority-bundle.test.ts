import { describe, expect, it } from 'vitest';
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

});
