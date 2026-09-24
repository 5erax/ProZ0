import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
} from '../../src/foundation';
import {
  HOSTED_PROTOCOL_VERSION,
  serializeServerEnvelopeV1,
  type BaselineSnapshotV1,
  type JsonValue,
  type ServerEnvelopeV1,
} from '../../src/protocol';
import {
  Phase1ItemAuthority,
  Phase1ProgressionAuthority,
  Phase1SurvivalAuthority,
  type ContainerState,
  type ItemLedgerSnapshot,
} from '../../src/simulation';
import { HostedClientConnection, type HostedClientTransport } from '../../src/client/network';
import {
  HostedPhase1PresentationSource,
} from '../../src/client/runtime/HostedPhase1PresentationSource';
import { resolvePhase1PresentationQaFixture } from '../../src/client/qa/Phase1PresentationFixture';
import {
  applyPhase1AuthoritativeCommandFeedback,
  projectPhase1RuntimePresentation,
} from '../../src/client/runtime/Phase1PresentationBinding';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';
import { createPhase1WorldStore } from '../../src/world/phase1/Phase1WorldStore';
import { MemoryPhase1WorldPersistence } from '../helpers/MemoryPhase1WorldPersistence';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

class MemoryTransport implements HostedClientTransport {
  public readonly sent: string[] = [];

  public sendText(text: string): void {
    this.sent.push(text);
  }

  public close(): void {}
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function hello() {
  const catalog = createPhase1ContentCatalog();
  return {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: catalog.compatibility,
    worldCompatibility: {
      worldGenerationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
    },
  } as const;
}

function server(
  seq: number,
  messageType: ServerEnvelopeV1['messageType'],
  payload: JsonValue,
  options: {
    readonly epoch?: string;
    readonly authorityTick?: number;
  } = {},
): string {
  return serializeServerEnvelopeV1({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType,
    serverMessageSeq: seq,
    sessionId: 'session:test',
    sessionEpoch: options.epoch ?? 'epoch:a',
    authorityTick: options.authorityTick ?? 0,
    payload,
  });
}

function baseline(
  snapshotId: string,
  epoch: string,
  includeSharedState: boolean,
): BaselineSnapshotV1 {
  return Object.freeze({
    snapshotId,
    sessionEpoch: epoch,
    authorityTick: 8,
    worldId: 'world-alpha',
    playerId: 'player:1',
    contentCompatibility: hello().contentCompatibility,
    durableSaveRevision: 3,
    players: Object.freeze([
      Object.freeze({
        playerId: 'player:1',
        presentationIdentitySlot: 'LOCAL',
        authorityTick: 8,
        lastProcessedInputSeq: 4,
        position: Object.freeze({ x: 10, y: 12 }),
        facing: 'east',
        locomotionState: 'idle',
      }),
      ...(includeSharedState
        ? [Object.freeze({
            playerId: 'player:2',
            presentationIdentitySlot: 'TEAM_A',
            authorityTick: 8,
            lastProcessedInputSeq: 3,
            position: Object.freeze({ x: 20, y: 22 }),
            facing: 'west',
            locomotionState: 'moving',
          })]
        : []),
    ]),
    aggregates: includeSharedState
      ? Object.freeze([
          Object.freeze({
            aggregateType: 'exploration',
            aggregateId: 'region:0,0',
            revision: 4,
            tombstone: false,
            state: asJson({ words: [1, 2, 3] }),
          }),
          Object.freeze({
            aggregateType: 'ruin',
            aggregateId: 'ruin:alpha',
            revision: 5,
            tombstone: false,
            state: asJson({
              discoveryState: 'located',
              physicalRewardState: 'claimable',
            }),
          }),
        ])
      : Object.freeze([]),
  });
}

function connect(
  client: HostedClientConnection,
  snapshot: BaselineSnapshotV1,
  epoch: string,
): void {
  client.start();
  client.handleText(server(1, 'SESSION_ACCEPTED', asJson({
    worldId: 'world-alpha',
    playerId: 'player:1',
    connectionId: `connection:${epoch}`,
    resumeCredential: 'resume:stable',
    snapshotId: snapshot.snapshotId,
    maxPlayers: 4,
  }), { epoch }));
  client.handleText(server(
    2,
    'BASELINE_SNAPSHOT',
    asJson(snapshot),
    { epoch, authorityTick: snapshot.authorityTick },
  ));
  expect(client.getState()).toBe('READY');
}

describe('P1-UI-001 authoritative presentation binding', () => {
  it('projects actual Phase 1 authority reads and an actual stale rejection without locally committing success', async () => {
    const catalog = createPhase1ContentCatalog();
    const itemWorld = new Phase1ItemTestWorld();
    const initialLedger: ItemLedgerSnapshot = Object.freeze({
      containers: Object.freeze([
        Object.freeze({
          containerId: 'inventory:p1',
          kind: 'player-inventory',
          ownerPlayerId: 'p1',
          revision: 0,
          stacks: Object.freeze([
            Object.freeze({
              stackId: 'spear',
              itemDefinitionId: 'item:basic-spear',
              quantity: 1,
              condition: 80,
            }),
          ]),
        } satisfies ContainerState),
        Object.freeze({
          containerId: 'crate:shared',
          kind: 'storage-crate',
          ownerPlayerId: null,
          revision: 0,
          stacks: Object.freeze([
            Object.freeze({
              stackId: 'ore',
              itemDefinitionId: 'item:metal-ore',
              quantity: 20,
              condition: null,
            }),
          ]),
        } satisfies ContainerState),
      ]),
    });
    const items = new Phase1ItemAuthority({
      catalog,
      world: itemWorld,
      initialLedger,
    });
    const survival = new Phase1SurvivalAuthority({ catalog, items });
    survival.registerPlayer('p1');

    const progression = new Phase1ProgressionAuthority({ catalog });
    progression.applyEvent({
      type: 'expedition-band-entered',
      eventId: 'presentation:expedition',
      playerId: 'p1',
    });

    const world = createPhase1WorldStore({
      worldSeed: 'presentation-binding-world',
      catalog,
      persistence: new MemoryPhase1WorldPersistence(),
    });
    await world.initialize();

    const stale = items.execute({
      type: 'transfer',
      operationId: 'presentation:stale-transfer',
      playerId: 'p1',
      sourceContainerId: 'inventory:p1',
      sourceExpectedRevision: 99,
      targetContainerId: 'crate:shared',
      targetExpectedRevision: 0,
      sourceStackId: 'spear',
      quantity: 1,
    });
    expect(stale).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });
    if (stale.status !== 'rejected') {
      throw new Error('Expected authoritative stale rejection.');
    }

    const capacity = items.execute({
      type: 'transfer',
      operationId: 'presentation:capacity-transfer',
      playerId: 'p1',
      sourceContainerId: 'crate:shared',
      sourceExpectedRevision: 0,
      targetContainerId: 'inventory:p1',
      targetExpectedRevision: 0,
      sourceStackId: 'ore',
      quantity: 20,
    });
    expect(capacity).toMatchObject({
      status: 'rejected',
      reason: 'TARGET_CAPACITY_WEIGHT',
    });
    if (capacity.status !== 'rejected') {
      throw new Error('Expected authoritative capacity rejection.');
    }

    const inventory = items.getContainerView('inventory:p1');
    const crate = items.getContainerView('crate:shared');
    const state = projectPhase1RuntimePresentation({
      catalog,
      survival: survival.getPlayerView('p1'),
      inventory,
      equippedStackId: 'spear',
      environment: world.getEnvironmentView(),
      progression: progression.getPlayerView('p1'),
      playerMotions: Object.freeze([
        Object.freeze({
          playerId: 'p1',
          presentationIdentitySlot: 'LOCAL',
          authorityTick: 1,
          lastProcessedInputSeq: 0,
          position: Object.freeze({ x: 0, y: 0 }),
          facing: 'east',
          locomotionState: 'idle',
        }),
        Object.freeze({
          playerId: 'p2',
          presentationIdentitySlot: 'TEAM_B',
          authorityTick: 1,
          lastProcessedInputSeq: 0,
          position: Object.freeze({ x: 1, y: 1 }),
          facing: 'west',
          locomotionState: 'moving',
        }),
      ]),
      commandFeedback: {
        inputLabel: 'E',
        verb: 'TRANSFER',
        target: 'Shared Storage',
        result: Object.freeze({
          operationId: stale.operationId,
          status: 'rejected',
          acceptedAuthorityTick: 1,
          authorityIngressOrdinal: 1,
          reason: stale.reason,
        }),
      },
      panel: {
        kind: 'container',
        container: crate,
      },
    });

    expect(state).toMatchObject({
      health: { stateLabel: 'HEALTHY', value: 100 },
      food: { stateLabel: 'FED', value: 70 },
      water: { stateLabel: 'HYDRATED', value: 80 },
      temperature: { stateLabel: 'COMFORTABLE', value: 50 },
      equipment: {
        name: 'Basic Spear',
        condition: 80,
        stateLabel: 'EQUIPPED',
      },
      interaction: {
        state: 'BLOCKED',
        reason: 'STALE / WORLD STATE CHANGED',
      },
      world: {
        teammateCount: 2,
      },
    });
    expect(state.panel).toMatchObject({
      kind: 'container',
      feedback: 'STALE / WORLD STATE CHANGED',
    });
    expect(state.toasts).toContainEqual(expect.objectContaining({
      kind: 'warning',
      title: 'STALE / WORLD STATE CHANGED',
    }));
    expect(items.getContainerView('inventory:p1')).toEqual(inventory);

    const progressionState = projectPhase1RuntimePresentation({
      catalog,
      survival: survival.getPlayerView('p1'),
      inventory,
      environment: world.getEnvironmentView(),
      progression: progression.getPlayerView('p1'),
      panel: { kind: 'progression' },
    });
    expect(progressionState.panel).toMatchObject({
      kind: 'progression',
      levelLabel: 'Level 1',
      xpLabel: '20 / 100 XP',
    });

    const capacityState = projectPhase1RuntimePresentation({
      catalog,
      survival: survival.getPlayerView('p1'),
      inventory,
      environment: world.getEnvironmentView(),
      progression: progression.getPlayerView('p1'),
      commandFeedback: {
        inputLabel: 'E',
        verb: 'TRANSFER',
        target: 'Player Inventory',
        result: Object.freeze({
          operationId: capacity.operationId,
          status: 'rejected',
          acceptedAuthorityTick: 2,
          authorityIngressOrdinal: 2,
          reason: capacity.reason,
        }),
      },
    });
    expect(capacityState.interaction).toMatchObject({
      state: 'BLOCKED',
      reason: 'INVENTORY WEIGHT LIMIT',
    });

    const rejection = Object.freeze({
      inputLabel: 'E',
      verb: 'CRAFT',
      target: 'Cordage',
      panelTargetId: 'recipe:cordage',
      result: Object.freeze({
        operationId: 'presentation:craft-rejected',
        status: 'rejected' as const,
        acceptedAuthorityTick: 3,
        authorityIngressOrdinal: 3,
        reason: 'STALE_REVISION',
      }),
    });
    expect(applyPhase1AuthoritativeCommandFeedback(
      Object.freeze({
        kind: 'craft',
        title: 'Craft',
        rows: Object.freeze([
          Object.freeze({
            id: 'recipe:cordage',
            name: 'Cordage',
            outputLabel: '×1',
            requirementLabel: 'Plant Fiber',
            state: 'AVAILABLE' as const,
            reason: null,
          }),
        ]),
      }),
      rejection,
    )).toMatchObject({
      kind: 'craft',
      rows: [{
        id: 'recipe:cordage',
        state: 'BLOCKED',
        reason: 'STALE / WORLD STATE CHANGED',
      }],
    });
    expect(applyPhase1AuthoritativeCommandFeedback(
      Object.freeze({
        kind: 'build',
        title: 'Build',
        selectedStructure: 'Workbench',
        sourceKitLabel: 'Workbench Kit ×1',
        placementState: 'VALID' as const,
        reason: null,
      }),
      rejection,
    )).toMatchObject({
      kind: 'build',
      placementState: 'INVALID',
      reason: 'STALE / WORLD STATE CHANGED',
    });


    const identityCommon = {
      catalog,
      survival: survival.getPlayerView('p1'),
      inventory,
      environment: world.getEnvironmentView(),
      progression: progression.getPlayerView('p1'),
    } as const;
    const identityA = Object.freeze({
      playerId: 'p2',
      presentationIdentitySlot: 'TEAM_A' as const,
      authorityTick: 3,
      lastProcessedInputSeq: 0,
      position: Object.freeze({ x: 1, y: 0 }),
      facing: 'west',
      locomotionState: 'moving',
    });
    const identityB = Object.freeze({
      playerId: 'p3',
      presentationIdentitySlot: 'TEAM_B' as const,
      authorityTick: 3,
      lastProcessedInputSeq: 0,
      position: Object.freeze({ x: 2, y: 0 }),
      facing: 'west',
      locomotionState: 'idle',
    });
    const localMotion = Object.freeze({
      playerId: 'p1',
      presentationIdentitySlot: 'LOCAL' as const,
      authorityTick: 3,
      lastProcessedInputSeq: 0,
      position: Object.freeze({ x: 0, y: 0 }),
      facing: 'east',
      locomotionState: 'idle',
    });

    const rosterForward = projectPhase1RuntimePresentation({
      ...identityCommon,
      playerMotions: Object.freeze([localMotion, identityA, identityB]),
    });
    const rosterReverse = projectPhase1RuntimePresentation({
      ...identityCommon,
      playerMotions: Object.freeze([identityB, identityA, localMotion]),
    });
    expect(rosterForward.teammates).toEqual(rosterReverse.teammates);
    expect(rosterForward.teammates).toContainEqual(expect.objectContaining({
      playerId: 'p2',
      label: 'TEAM A',
      markerShape: 'circle',
    }));

    const afterLeave = projectPhase1RuntimePresentation({
      ...identityCommon,
      playerMotions: Object.freeze([localMotion, identityA]),
    });
    expect(afterLeave.teammates).toContainEqual(expect.objectContaining({
      playerId: 'p2',
      label: 'TEAM A',
      markerShape: 'circle',
    }));

    expect(applyPhase1AuthoritativeCommandFeedback(
      Object.freeze({
        kind: 'machine',
        title: 'Condenser',
        stateLabel: 'RUNNING' as const,
        powerLabel: '5 PU',
        outputLabel: '0/4 Clean Water',
        reason: null,
      }),
      rejection,
    )).toMatchObject({
      kind: 'machine',
      reason: 'STALE / WORLD STATE CHANGED',
    });
  });

  it('uses hosted baseline/result/tombstone/rejoin state and never resurrects stale shared UI', () => {
    const firstTransport = new MemoryTransport();
    const first = new HostedClientConnection({
      transport: firstTransport,
      hello: hello(),
    });
    const initial = baseline('snapshot:a', 'epoch:a', true);
    connect(first, initial, 'epoch:a');

    const fixture = resolvePhase1PresentationQaFixture('?qaPhase1=overview');
    if (fixture === null) {
      throw new Error('Expected Phase 1 overview fixture.');
    }
    const source = new HostedPhase1PresentationSource({
      connection: first,
      initialState: fixture.state,
      project: (readModel) => Object.freeze({
        ...fixture.state,
        world: Object.freeze({
          ...fixture.state.world,
          teammateCount: readModel.getPlayerMotions().length,
        }),
      }),
    });
    expect(source.getPlayerMotions().map((entry) => entry.playerId)).toEqual([
      'player:1',
      'player:2',
    ]);
    expect(source.read().world.teammateCount).toBe(2);
    expect(source.getExploration('region:0,0')).toMatchObject({
      revision: 4,
      words: [1, 2, 3],
    });
    expect(source.getRuin('ruin:alpha')).toMatchObject({
      revision: 5,
      discoveryState: 'located',
      physicalRewardState: 'claimable',
    });

    first.handleText(server(3, 'AGGREGATE_UPDATE', asJson({
      aggregateType: 'ruin',
      aggregateId: 'ruin:alpha',
      revision: 6,
      tombstone: true,
      state: null,
    }), { epoch: 'epoch:a', authorityTick: 9 }));
    expect(source.getRuin('ruin:alpha')).toBeNull();

    first.handleText(server(4, 'AGGREGATE_UPDATE', asJson({
      aggregateType: 'ruin',
      aggregateId: 'ruin:alpha',
      revision: 5,
      tombstone: false,
      state: {
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      },
    }), { epoch: 'epoch:a', authorityTick: 10 }));
    expect(source.getRuin('ruin:alpha')).toBeNull();

    first.handleText(server(5, 'COMMAND_RESULT', asJson({
      operationId: 'operation:stale',
      status: 'rejected',
      acceptedAuthorityTick: 10,
      authorityIngressOrdinal: 4,
      reason: 'STALE_REVISION',
    }), { epoch: 'epoch:a', authorityTick: 10 }));
    expect(source.getCommandResult('operation:stale')).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });

    const rejoinTransport = new MemoryTransport();
    const rejoined = new HostedClientConnection({
      transport: rejoinTransport,
      hello: {
        ...hello(),
        resumeCredential: 'resume:stable',
      },
    });
    connect(
      rejoined,
      baseline('snapshot:b', 'epoch:b', false),
      'epoch:b',
    );
    const refreshed = new HostedPhase1PresentationSource({
      connection: rejoined,
      initialState: fixture.state,
      project: (readModel) => Object.freeze({
        ...fixture.state,
        world: Object.freeze({
          ...fixture.state.world,
          teammateCount: readModel.getPlayerMotions().length,
        }),
      }),
    });
    expect(refreshed.getPlayerMotions().map((entry) => entry.playerId)).toEqual([
      'player:1',
    ]);
    expect(refreshed.read().world.teammateCount).toBe(1);
    expect(refreshed.getExploration('region:0,0')).toBeNull();
    expect(refreshed.getRuin('ruin:alpha')).toBeNull();
    expect(refreshed.getCommandResult('operation:stale')).toBeNull();
  });
});
