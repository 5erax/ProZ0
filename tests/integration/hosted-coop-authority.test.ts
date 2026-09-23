import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import {
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
} from '../../src/foundation';
import {
  HOSTED_PROTOCOL_VERSION,
  type ClientEnvelopeV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type SessionAcceptedV1,
} from '../../src/protocol';
import {
  Phase1HostedCommandDispatcher,
  ServerAuthorityHost,
  type HostedPersistencePort,
} from '../../src/server';
import {
  Phase1BuildingAuthority,
  Phase1CondenserAuthority,
  Phase1DeathAuthority,
  Phase1ItemAuthority,
  Phase1SurvivalAuthority,
  createSimulationRuntime,
  type ContainerState,
  type DeathXpPenaltyPort,
  type ItemLedgerSnapshot,
} from '../../src/simulation';
import {
  BuildingItemWorldAdapter,
  Phase1BuildingWorld,
  createStaticCollisionWorld,
} from '../../src/world';
import { PHASE1_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1SurvivalTestWorld } from '../support/Phase1SurvivalTestWorld';

interface Client {
  readonly transportId: string;
  readonly playerId: string;
  readonly connectionId: string;
  nextSeq: number;
}

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function container(
  containerId: string,
  kind: ContainerState['kind'],
  ownerPlayerId: string | null,
  stacks: ContainerState['stacks'],
): ContainerState {
  return Object.freeze({
    containerId,
    kind,
    ownerPlayerId,
    revision: 0,
    stacks: Object.freeze([...stacks]),
  });
}

function stack(
  stackId: string,
  itemDefinitionId: string,
  quantity = 1,
) {
  return Object.freeze({
    stackId,
    itemDefinitionId,
    quantity,
    condition: null,
  });
}

class NoopPersistence implements HostedPersistencePort {
  public async save(authorityTick: number) {
    return Object.freeze({
      authorityTick,
      durableSaveRevision: 1,
    });
  }
}

function setup() {
  const catalog = createPhase1ContentCatalog();
  const spatial = new Phase1BuildingTestSpatial();
  const buildings = new Phase1BuildingWorld(spatial);
  const world = new Phase1SurvivalTestWorld();
  const itemWorld = new BuildingItemWorldAdapter(world, buildings);
  const ledger: ItemLedgerSnapshot = Object.freeze({
    containers: Object.freeze([
      container(
        'inventory:player:1',
        'player-inventory',
        'player:1',
        [stack('p1-workbench-kit', 'item:workbench-kit')],
      ),
      container(
        'inventory:player:2',
        'player-inventory',
        'player:2',
        [stack('p2-workbench-kit', 'item:workbench-kit')],
      ),
      container(
        'shared:storage',
        'storage-crate',
        null,
        [stack('shared-fiber', 'item:plant-fiber', 2)],
      ),
      container(
        'machine:output',
        'machine-output',
        null,
        [stack('machine-water', 'item:clean-water', 4)],
      ),
      container(
        'death-cache:player:1',
        'death-cache',
        null,
        [stack('death-fiber', 'item:plant-fiber', 2)],
      ),
    ]),
  });
  const items = new Phase1ItemAuthority({
    catalog,
    world: itemWorld,
    initialLedger: ledger,
  });
  const buildingAuthority = new Phase1BuildingAuthority(
    catalog,
    items,
    buildings,
  );
  const machines = new Phase1CondenserAuthority(items, buildings);
  const survival = new Phase1SurvivalAuthority({ catalog, items });
  const xp: DeathXpPenaltyPort = {
    reserveDeathXpPenalty: ({ deathId, playerId }) => Object.freeze({
      reservationId: `xp:${deathId}`,
      deathId,
      playerId,
      xpLoss: 0,
    }),
    commitReservedDeathXpPenalty: () => undefined,
    releaseDeathXpPenalty: () => undefined,
  };
  const death = new Phase1DeathAuthority(
    survival,
    items,
    world,
    xp,
  );

  const deathReservation = world.reserveDeathCachePlacement({
    deathId: 'death:player:1',
    ownerPlayerId: 'player:1',
    requestedPosition: createWorldPosition(1, 1),
  });
  world.commitReservedDeathCache({
    entityId: 'death-cache-entity:player:1',
    deathId: 'death:player:1',
    ownerPlayerId: 'player:1',
    containerId: 'death-cache:player:1',
    reservation: deathReservation,
  });

  const dispatcher = new Phase1HostedCommandDispatcher({
    items,
    buildings: buildingAuthority,
    machines,
    death,
  });

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
      idFactory: () => `authority-id-${++id}`,
      resumeCredentialFactory: () => `authority-resume-${++credential}`,
    },
    runtimeFactory: {
      create: () => createSimulationRuntime({
        worldQuery: createStaticCollisionWorld([]),
        initialPlayerPosition: createWorldPosition(0, 0),
      }),
    },
    commandDispatcher: dispatcher,
    persistence: new NoopPersistence(),
  });
  host.start();

  return {
    host,
    items,
    buildings,
    world,
  };
}

function join(host: ServerAuthorityHost, transportId: string): Client {
  const catalog = createPhase1ContentCatalog();
  const messages = host.receiveText(transportId, JSON.stringify({
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
  const accepted = messages.find(
    (entry) => entry.envelope.messageType === 'SESSION_ACCEPTED',
  );
  const baseline = messages.find(
    (entry) => entry.envelope.messageType === 'BASELINE_SNAPSHOT',
  );
  if (accepted === undefined || baseline === undefined) {
    throw new Error('Expected accepted hosted client.');
  }
  const metadata =
    accepted.envelope.payload as unknown as SessionAcceptedV1;
  const client: Client = {
    transportId,
    playerId: metadata.playerId,
    connectionId: metadata.connectionId,
    nextSeq: 1,
  };
  host.receiveText(transportId, JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'BASELINE_APPLIED',
    clientMessageSeq: client.nextSeq++,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload: { snapshotId: metadata.snapshotId },
  }));
  return client;
}

function sendCommand(
  host: ServerAuthorityHost,
  client: Client,
  command: GameplayCommandEnvelopeV1,
): void {
  const envelope: ClientEnvelopeV1 = {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'GAMEPLAY_COMMAND',
    clientMessageSeq: client.nextSeq++,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload: asJson(command),
  };
  expect(host.receiveText(
    client.transportId,
    JSON.stringify(envelope),
  )).toEqual([]);
}

function resultFor(
  messages: ReturnType<ServerAuthorityHost['step']>,
  operationId: string,
) {
  const result = messages.find(
    (entry) =>
      entry.envelope.messageType === 'COMMAND_RESULT'
      && (
        entry.envelope.payload as unknown as {
          readonly operationId: string;
        }
      ).operationId === operationId,
  );
  if (result === undefined) {
    throw new Error(`Missing result for ${operationId}.`);
  }
  return result.envelope.payload as unknown as {
    readonly status: string;
    readonly reason?: string;
  };
}

function itemTransfer(
  operationId: string,
  sourceContainerId: string,
  sourceRevision: number,
  targetContainerId: string,
  targetRevision: number,
  sourceStackId: string,
  quantity: number,
): GameplayCommandEnvelopeV1 {
  return Object.freeze({
    operationId,
    commandType: 'item.transfer',
    expectedRevisions: Object.freeze([
      {
        aggregateType: 'container',
        aggregateId: sourceContainerId,
        revision: sourceRevision,
      },
      {
        aggregateType: 'container',
        aggregateId: targetContainerId,
        revision: targetRevision,
      },
    ]),
    payload: asJson({
      sourceContainerId,
      targetContainerId,
      sourceStackId,
      quantity,
    }),
  });
}

describe('P1-NET-001 hosted domain-authority contention', () => {
  it('lets exactly one client win shared container and build-position contention while the loser retains canonical state', () => {
    const ctx = setup();
    const first = join(ctx.host, 'transport:authority:1');
    const second = join(ctx.host, 'transport:authority:2');
    expect([first.playerId, second.playerId]).toEqual([
      'player:1',
      'player:2',
    ]);

    sendCommand(
      ctx.host,
      first,
      itemTransfer(
        'shared-take:first',
        'shared:storage',
        0,
        'inventory:player:1',
        0,
        'shared-fiber',
        1,
      ),
    );
    sendCommand(
      ctx.host,
      second,
      itemTransfer(
        'shared-take:second',
        'shared:storage',
        0,
        'inventory:player:2',
        0,
        'shared-fiber',
        1,
      ),
    );
    const transferResults = ctx.host.step();
    expect(resultFor(transferResults, 'shared-take:first')).toMatchObject({
      status: 'committed',
    });
    expect(resultFor(transferResults, 'shared-take:second')).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });
    expect(
      ctx.items.getContainerView('shared:storage'),
    ).toMatchObject({
      revision: 1,
      stacks: [{ stackId: 'shared-fiber', quantity: 1 }],
    });
    expect(
      ctx.items.getContainerView('inventory:player:2').stacks.some(
        (entry) => entry.itemDefinitionId === 'item:plant-fiber',
      ),
    ).toBe(false);

    sendCommand(ctx.host, first, Object.freeze({
      operationId: 'build:first',
      commandType: 'building.place',
      expectedRevisions: Object.freeze([
        {
          aggregateType: 'container',
          aggregateId: 'inventory:player:1',
          revision: 1,
        },
        {
          aggregateType: 'foothold',
          aggregateId: 'foothold:landing',
          revision: 0,
        },
      ]),
      payload: asJson({
        structureDefinitionId: 'structure:workbench',
        sourceKitStackId: 'p1-workbench-kit',
        inventoryContainerId: 'inventory:player:1',
        placement: {
          mode: 'free',
          x: 2.5,
          y: 0,
          orientationQuarterTurns: 0,
        },
      }),
    }));
    sendCommand(ctx.host, second, Object.freeze({
      operationId: 'build:second',
      commandType: 'building.place',
      expectedRevisions: Object.freeze([
        {
          aggregateType: 'container',
          aggregateId: 'inventory:player:2',
          revision: 0,
        },
        {
          aggregateType: 'foothold',
          aggregateId: 'foothold:landing',
          revision: 0,
        },
      ]),
      payload: asJson({
        structureDefinitionId: 'structure:workbench',
        sourceKitStackId: 'p2-workbench-kit',
        inventoryContainerId: 'inventory:player:2',
        placement: {
          mode: 'free',
          x: 2.5,
          y: 0,
          orientationQuarterTurns: 0,
        },
      }),
    }));
    const buildResults = ctx.host.step();
    expect(resultFor(buildResults, 'build:first')).toMatchObject({
      status: 'committed',
    });
    expect(resultFor(buildResults, 'build:second')).toMatchObject({
      status: 'rejected',
      reason: 'WORLD_STATE_CHANGED',
    });
    expect(
      ctx.items.getContainerView('inventory:player:2').stacks.some(
        (entry) => entry.stackId === 'p2-workbench-kit',
      ),
    ).toBe(true);
    expect(
      ctx.buildings.exportSnapshot().foothold.structures.filter(
        (entry) => entry.definitionId === 'structure:workbench',
      ),
    ).toHaveLength(1);
  });

  it('preserves exact item totals under concurrent Condenser-output collection', () => {
    const ctx = setup();
    const first = join(ctx.host, 'transport:water:1');
    const second = join(ctx.host, 'transport:water:2');

    sendCommand(
      ctx.host,
      first,
      itemTransfer(
        'water:first',
        'machine:output',
        0,
        'inventory:player:1',
        0,
        'machine-water',
        1,
      ),
    );
    sendCommand(
      ctx.host,
      second,
      itemTransfer(
        'water:second',
        'machine:output',
        0,
        'inventory:player:2',
        0,
        'machine-water',
        1,
      ),
    );
    const results = ctx.host.step();
    expect(resultFor(results, 'water:first')).toMatchObject({
      status: 'committed',
    });
    expect(resultFor(results, 'water:second')).toMatchObject({
      status: 'rejected',
      reason: 'STALE_REVISION',
    });

    const all = [
      ctx.items.getContainerView('machine:output'),
      ctx.items.getContainerView('inventory:player:1'),
      ctx.items.getContainerView('inventory:player:2'),
    ];
    const totalWater = all.flatMap((entry) => entry.stacks)
      .filter((entry) => entry.itemDefinitionId === 'item:clean-water')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    expect(totalWater).toBe(4);
  });

  it('allows teammate Death Cache recovery through normal authoritative transfer without duplication', () => {
    const ctx = setup();
    join(ctx.host, 'transport:recovery:owner');
    const teammate = join(ctx.host, 'transport:recovery:teammate');

    const recover = (
      operationId: string,
      sourceRevision: number,
      targetRevision: number,
    ): GameplayCommandEnvelopeV1 => Object.freeze({
      operationId,
      commandType: 'death-cache.recover',
      expectedRevisions: Object.freeze([
        {
          aggregateType: 'container',
          aggregateId: 'death-cache:player:1',
          revision: sourceRevision,
        },
        {
          aggregateType: 'container',
          aggregateId: 'inventory:player:2',
          revision: targetRevision,
        },
      ]),
      payload: asJson({
        sourceContainerId: 'death-cache:player:1',
        targetContainerId: 'inventory:player:2',
        sourceStackId: 'death-fiber',
        quantity: 1,
      }),
    });

    sendCommand(ctx.host, teammate, recover('recover:first', 0, 0));
    expect(resultFor(ctx.host.step(), 'recover:first')).toMatchObject({
      status: 'committed',
    });
    expect(
      ctx.world.getDeathCacheByContainer('death-cache:player:1'),
    ).not.toBeNull();

    sendCommand(ctx.host, teammate, recover('recover:second', 1, 1));
    expect(resultFor(ctx.host.step(), 'recover:second')).toMatchObject({
      status: 'committed',
    });
    expect(
      ctx.world.getDeathCacheByContainer('death-cache:player:1'),
    ).toBeNull();

    expect(
      ctx.items.getContainerView('inventory:player:2').stacks
        .filter((entry) => entry.itemDefinitionId === 'item:plant-fiber')
        .reduce((sum, entry) => sum + entry.quantity, 0),
    ).toBe(2);
  });
});
