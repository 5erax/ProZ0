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
      interactionRangeWorldUnits: 2,
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
        interactionRangeWorldUnits: 2,
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
