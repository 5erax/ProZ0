import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../src/foundation';
import { HOSTED_PROTOCOL_VERSION } from '../../src/protocol';
import {
  ServerAuthorityHost,
  type HostedPersistencePort,
} from '../../src/server';
import { createSimulationRuntime } from '../../src/simulation';
import { createStaticCollisionWorld } from '../../src/world';
import {
  PHASE1_WORLD_GENERATION_VERSION,
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';
import { fromWorldPosition } from '../../src/world/chunks/ChunkCoord';
import { createPhase1WorldStore } from '../../src/world/phase1/Phase1WorldStore';
import { MemoryPhase1WorldPersistence } from '../helpers/MemoryPhase1WorldPersistence';

class NoopPersistence implements HostedPersistencePort {
  public async save(authorityTick: number) {
    return Object.freeze({ authorityTick, durableSaveRevision: 1 });
  }
}

function setupHost() {
  const catalog = createPhase1ContentCatalog();
  let id = 0;
  let credential = 0;
  const host = new ServerAuthorityHost({
    session: {
      worldId: 'world-alpha',
      maxPlayers: 4,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
      idFactory: () => `world-repl-id-${++id}`,
      resumeCredentialFactory: () => `world-repl-resume-${++credential}`,
    },
    runtimeFactory: {
      create: () => createSimulationRuntime({
        worldQuery: createStaticCollisionWorld([]),
        initialPlayerPosition: createWorldPosition(0, 0),
      }),
    },
    commandDispatcher: {
      execute: () => Object.freeze({ status: 'committed' as const }),
    },
    persistence: new NoopPersistence(),
  });
  host.start();
  return { host, catalog };
}

function join(
  host: ServerAuthorityHost,
  catalog: ReturnType<typeof createPhase1ContentCatalog>,
  transportId: string,
): void {
  const joined = host.receiveText(transportId, JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'CLIENT_HELLO',
    clientMessageSeq: 0,
    payload: {
      protocolVersion: HOSTED_PROTOCOL_VERSION,
      contentCompatibility: catalog.compatibility,
      worldCompatibility: {
        worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
        rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
        seedDerivationVersion: SEED_DERIVATION_VERSION,
      },
    },
  }));
  const accepted = joined.find(
    (entry) => entry.envelope.messageType === 'SESSION_ACCEPTED',
  );
  if (accepted === undefined) throw new Error('Expected session acceptance.');
  const payload = accepted.envelope.payload as unknown as {
    readonly connectionId: string;
    readonly snapshotId: string;
  };
  host.receiveText(transportId, JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'BASELINE_APPLIED',
    clientMessageSeq: 1,
    sessionId: host.getSessionId(),
    connectionId: payload.connectionId,
    payload: { snapshotId: payload.snapshotId },
  }));
}

describe('P1-NET-001 shared world replication', () => {
  it('replicates one canonical fog/ruin authority to both clients without duplicating ruin reward transitions', async () => {
    const { host, catalog } = setupHost();
    join(host, catalog, 'transport:world:a');
    join(host, catalog, 'transport:world:b');

    const persistence = new MemoryPhase1WorldPersistence();
    const worldSeed = 'p1-world-golden';
    const world = createPhase1WorldStore({
      worldSeed,
      catalog,
      persistence,
    });
    await world.initialize();

    const landmarks = getPhase1WorldLandmarks(worldSeed);
    await world.revealResolvedPlayerPosition(landmarks.ruinPosition);
    const coord = fromWorldPosition(landmarks.ruinPosition);
    const view = await world.requestActive(coord);

    const explorationMessages = host.publishAggregate({
      aggregateType: 'exploration',
      aggregateId: view.delta.exploration.regionId,
      revision: view.delta.exploration.revision,
      tombstone: false,
      state: {
        words: [...view.delta.exploration.words],
      },
    });
    expect(explorationMessages).toHaveLength(2);
    expect(
      new Set(explorationMessages.map((entry) => entry.transportId)),
    ).toEqual(new Set(['transport:world:a', 'transport:world:b']));

    const ruin = view.base.entities.find((entry) => entry.type === 'ruin');
    if (ruin === undefined || ruin.type !== 'ruin') {
      throw new Error('Expected generated ruin.');
    }
    const located = world.getRuinState(ruin.entityId);
    if (located === undefined) throw new Error('Expected located ruin.');

    expect(host.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: ruin.entityId,
      revision: located.revision,
      tombstone: false,
      state: {
        discoveryState: located.discoveryState,
        physicalRewardState: located.physicalRewardState,
      },
    })).toHaveLength(2);

    const investigated = world.investigateRuin(
      ruin.entityId,
      located.revision,
    );
    expect(investigated).toMatchObject({
      changed: true,
      rewardItemId: 'item:ancient-alloy-shard',
      rewardQuantity: 1,
    });
    expect(host.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: ruin.entityId,
      revision: investigated.state.revision,
      tombstone: false,
      state: {
        discoveryState: investigated.state.discoveryState,
        physicalRewardState: investigated.state.physicalRewardState,
      },
    })).toHaveLength(2);

    const duplicate = world.investigateRuin(
      ruin.entityId,
      investigated.state.revision,
    );
    expect(duplicate).toMatchObject({
      changed: false,
      rewardItemId: null,
      rewardQuantity: 0,
    });
    expect(host.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: ruin.entityId,
      revision: duplicate.state.revision,
      tombstone: false,
      state: {
        discoveryState: duplicate.state.discoveryState,
        physicalRewardState: duplicate.state.physicalRewardState,
      },
    })).toHaveLength(0);

    const claimed = world.markRuinRewardClaimed(
      ruin.entityId,
      investigated.state.revision,
    );
    expect(host.publishAggregate({
      aggregateType: 'ruin',
      aggregateId: ruin.entityId,
      revision: claimed.revision,
      tombstone: false,
      state: {
        discoveryState: claimed.discoveryState,
        physicalRewardState: claimed.physicalRewardState,
      },
    })).toHaveLength(2);

    const motion = host.step().filter(
      (entry) => entry.envelope.messageType === 'PLAYER_MOTION',
    );
    expect(motion).toHaveLength(4);
    for (const message of motion) {
      expect(message.envelope.payload).toMatchObject({
        position: { x: 0, y: 0 },
      });
    }

    await world.releaseInterest(coord);
  });
});
