import { describe, expect, it } from 'vitest';
import {
  Phase1AuthorityBundle,
  Phase1SaveV2CheckpointCoordinator,
} from '../../src/integration';
import {
  saveFailure,
  saveSuccess,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
} from '../../src/persistence/repository/SaveRepositoryV2';

interface CasRepositoryHarness {
  readonly repository: SaveRepositoryV2;
  readonly requests: SaveCommitRequestV2[];
  failNext(): void;
}

function createCasRepository(): CasRepositoryHarness {
  const requests: SaveCommitRequestV2[] = [];
  let currentRevision: number | null = null;
  let shouldFailNext = false;

  const repository = {
    async commit(request: SaveCommitRequestV2) {
      requests.push(request);
      if (shouldFailNext) {
        shouldFailNext = false;
        return saveFailure(
          'STORAGE_FAILURE',
          'Injected checkpoint failure.',
        );
      }
      if (request.expectedPreviousWorldRevision !== currentRevision) {
        return saveFailure(
          'STALE_WRITE',
          'Injected CAS repository observed a stale revision.',
        );
      }
      currentRevision = request.world.worldRevision;
      return saveSuccess(request.world);
    },
  } as unknown as SaveRepositoryV2;

  return {
    repository,
    requests,
    failNext(): void {
      shouldFailNext = true;
    },
  };
}

async function createBundle() {
  const bundle = await Phase1AuthorityBundle.create({
    worldId: 'world:p1-polish-004',
    worldSeed: 'p1-world-golden',
    playerIds: ['p1'],
    interactionRangeWorldUnits: 2,
    spawnClearanceRadiusWorldUnits: 0,
    requiredAccessRadiusWorldUnits: 0,
  });
  bundle.submitInput('p1', {
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: true,
  });
  await bundle.stepSolo();
  bundle.submitInput('p1', {
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
  });
  return bundle;
}

describe('P1-POLISH-004 Save V2 checkpoint lifecycle', () => {
  it('advances world and player revisions across repeated same-runtime checkpoints', async () => {
    const bundle = await createBundle();
    try {
      const harness = createCasRepository();
      const coordinator = new Phase1SaveV2CheckpointCoordinator(bundle);

      const first = await coordinator.checkpoint(
        harness.repository,
        { nowUtc: '2026-09-28T00:00:00.000Z' },
      );
      expect(first).toMatchObject({
        ok: true,
        value: { worldRevision: 0 },
      });

      await bundle.stepSolo();

      const second = await coordinator.checkpoint(
        harness.repository,
        { nowUtc: '2026-09-28T00:01:00.000Z' },
      );
      expect(second).toMatchObject({
        ok: true,
        value: { worldRevision: 1 },
      });
      expect(harness.requests.map((request) => ({
        expected: request.expectedPreviousWorldRevision,
        world: request.world.worldRevision,
        player: request.players[0]?.playerRevision,
      }))).toEqual([
        { expected: null, world: 0, player: 0 },
        { expected: 0, world: 1, player: 1 },
      ]);
      expect(harness.requests[1]?.world.createdAtUtc)
        .toBe('2026-09-28T00:00:00.000Z');
    } finally {
      await bundle.destroy();
    }
  });

  it('does not advance revision state after a failed commit and retries the same CAS revision', async () => {
    const bundle = await createBundle();
    try {
      const harness = createCasRepository();
      const coordinator = new Phase1SaveV2CheckpointCoordinator(bundle);

      expect(await coordinator.checkpoint(
        harness.repository,
        { nowUtc: '2026-09-28T00:00:00.000Z' },
      )).toMatchObject({
        ok: true,
        value: { worldRevision: 0 },
      });

      harness.failNext();
      expect(await coordinator.checkpoint(
        harness.repository,
        { nowUtc: '2026-09-28T00:01:00.000Z' },
      )).toMatchObject({
        ok: false,
        code: 'STORAGE_FAILURE',
      });

      expect(await coordinator.checkpoint(
        harness.repository,
        { nowUtc: '2026-09-28T00:02:00.000Z' },
      )).toMatchObject({
        ok: true,
        value: { worldRevision: 1 },
      });

      expect(harness.requests.slice(1).map((request) => ({
        expected: request.expectedPreviousWorldRevision,
        world: request.world.worldRevision,
        player: request.players[0]?.playerRevision,
      }))).toEqual([
        { expected: 0, world: 1, player: 1 },
        { expected: 0, world: 1, player: 1 },
      ]);
    } finally {
      await bundle.destroy();
    }
  });

  it('serializes concurrent checkpoint requests before composing the next revision', async () => {
    const bundle = await createBundle();
    try {
      const requests: SaveCommitRequestV2[] = [];
      let releaseFirst!: () => void;
      let announceFirst!: () => void;
      const firstStarted = new Promise<void>((resolve) => {
        announceFirst = () => resolve();
      });
      const firstGate = new Promise<void>((resolve) => {
        releaseFirst = () => resolve();
      });
      let currentRevision: number | null = null;

      const repository = {
        async commit(request: SaveCommitRequestV2) {
          requests.push(request);
          if (requests.length === 1) {
            announceFirst();
            await firstGate;
          }
          if (request.expectedPreviousWorldRevision !== currentRevision) {
            return saveFailure('STALE_WRITE', 'Unexpected concurrent CAS.');
          }
          currentRevision = request.world.worldRevision;
          return saveSuccess(request.world);
        },
      } as unknown as SaveRepositoryV2;

      const coordinator = new Phase1SaveV2CheckpointCoordinator(bundle);
      const first = coordinator.checkpoint(
        repository,
        { nowUtc: '2026-09-28T00:00:00.000Z' },
      );
      await firstStarted;

      const second = coordinator.checkpoint(
        repository,
        { nowUtc: '2026-09-28T00:00:01.000Z' },
      );
      await Promise.resolve();

      expect(requests).toHaveLength(1);
      releaseFirst();

      expect(await first).toMatchObject({
        ok: true,
        value: { worldRevision: 0 },
      });
      expect(await second).toMatchObject({
        ok: true,
        value: { worldRevision: 1 },
      });
      expect(requests.map((request) => ({
        expected: request.expectedPreviousWorldRevision,
        world: request.world.worldRevision,
      }))).toEqual([
        { expected: null, world: 0 },
        { expected: 0, world: 1 },
      ]);
    } finally {
      await bundle.destroy();
    }
  });
});
