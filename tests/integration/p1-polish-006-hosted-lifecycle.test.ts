import { describe, expect, it } from 'vitest';
import {
  HostedClientConnection,
  type HostedClientTransport,
} from '../../src/client/network';
import {
  Phase1HostedAuthorityComposition,
  composePhase1SaveV2,
} from '../../src/integration';
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  saveSuccessV2,
  type Phase1ReopenState,
  type SaveCommitRequestV2,
  type SaveRepositoryV2,
} from '../../src/persistence';
import {
  HOSTED_PROTOCOL_VERSION,
  serializeServerEnvelopeV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type RevisionedAggregateViewV1,
} from '../../src/protocol';
import {
  SaveV2HostedPersistenceAdapter,
} from '../../src/server';
import {
  PHASE1_WORLD_GENERATION_VERSION,
} from '../../src/world/phase1/Phase1ChunkGenerator';

class PacketTransport implements HostedClientTransport {
  public readonly sent: string[] = [];
  public closed = false;

  public sendText(text: string): void {
    this.sent.push(text);
  }

  public close(): void {
    this.closed = true;
  }
}

interface PacketClient {
  readonly transportId: string;
  readonly transport: PacketTransport;
  readonly connection: HostedClientConnection;
}

function hello(
  composition: Phase1HostedAuthorityComposition,
  resumeCredential?: string,
) {
  return Object.freeze({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility: composition.bundle.getContentCompatibility(),
    worldCompatibility: composition.bundle.getWorldCompatibility(),
    ...(resumeCredential === undefined
      ? {}
      : { resumeCredential }),
  });
}

function deliver(
  clients: readonly PacketClient[],
  messages: readonly {
    readonly transportId: string;
    readonly envelope: Parameters<typeof serializeServerEnvelopeV1>[0];
  }[],
): void {
  for (const message of messages) {
    const client = clients.find(
      (entry) => entry.transportId === message.transportId,
    );
    client?.connection.handleText(
      serializeServerEnvelopeV1(message.envelope),
    );
  }
}

function pumpClientToHost(
  composition: Phase1HostedAuthorityComposition,
  client: PacketClient,
): void {
  let safety = 0;
  while (client.transport.sent.length > 0) {
    safety += 1;
    if (safety > 32) {
      throw new Error('Hosted packet pump exceeded bounded handshake work.');
    }
    const text = client.transport.sent.shift();
    if (text === undefined) break;
    deliver(
      [client],
      composition.host.receiveText(client.transportId, text),
    );
  }
}

function connectClient(
  composition: Phase1HostedAuthorityComposition,
  transportId: string,
  resumeCredential?: string,
): PacketClient {
  const transport = new PacketTransport();
  const connection = new HostedClientConnection({
    transport,
    hello: hello(composition, resumeCredential),
  });
  const client = Object.freeze({
    transportId,
    transport,
    connection,
  });
  connection.start();
  pumpClientToHost(composition, client);
  expect(connection.getState()).toBe('READY');
  return client;
}

async function stepAndDeliver(
  composition: Phase1HostedAuthorityComposition,
  clients: readonly PacketClient[],
) {
  const messages = await composition.step();
  deliver(clients, messages);
  for (const client of clients) {
    pumpClientToHost(composition, client);
  }
  return messages;
}

function requireAggregate(
  client: PacketClient,
  aggregateType: string,
  aggregateId: string,
): RevisionedAggregateViewV1 {
  const aggregate = client.connection.replication.get(
    aggregateType,
    aggregateId,
  );
  if (aggregate === null || aggregate.tombstone) {
    throw new Error(
      'Missing client aggregate '
        + aggregateType
        + ':'
        + aggregateId,
    );
  }
  return aggregate;
}

function objectState(
  aggregate: RevisionedAggregateViewV1,
): Record<string, JsonValue> {
  if (
    aggregate.state === null
    || Array.isArray(aggregate.state)
    || typeof aggregate.state !== 'object'
  ) {
    throw new Error('Expected object aggregate state.');
  }
  return aggregate.state as Record<string, JsonValue>;
}

function stacks(
  client: PacketClient,
  containerId: string,
): readonly {
  readonly stackId: string;
  readonly itemDefinitionId: string;
  readonly quantity: number;
  readonly condition: number | null;
}[] {
  const value = objectState(
    requireAggregate(client, 'container', containerId),
  ).stacks;
  if (!Array.isArray(value)) {
    throw new Error('Expected replicated container stacks.');
  }
  return value as unknown as readonly {
    readonly stackId: string;
    readonly itemDefinitionId: string;
    readonly quantity: number;
    readonly condition: number | null;
  }[];
}

function quantityOf(
  client: PacketClient,
  containerId: string,
  itemDefinitionId: string,
): number {
  return stacks(client, containerId)
    .filter((entry) => entry.itemDefinitionId === itemDefinitionId)
    .reduce((sum, entry) => sum + entry.quantity, 0);
}

function sendGameplay(
  composition: Phase1HostedAuthorityComposition,
  client: PacketClient,
  command: GameplayCommandEnvelopeV1,
): void {
  client.connection.sendGameplayCommand(command);
  pumpClientToHost(composition, client);
}

async function waitForCommand(
  composition: Phase1HostedAuthorityComposition,
  clients: readonly PacketClient[],
  client: PacketClient,
  operationId: string,
  maxTicks = 120,
) {
  for (let tick = 0; tick < maxTicks; tick += 1) {
    const existing = client.connection.getCommandResult(operationId);
    if (existing !== null) return existing;
    await stepAndDeliver(composition, clients);
  }
  throw new Error('Hosted command did not resolve: ' + operationId);
}

function gatherCommand(
  client: PacketClient,
  operationId: string,
  resourceEntityId: string,
): GameplayCommandEnvelopeV1 {
  const playerId = client.connection.getPlayerId();
  if (playerId === null) {
    throw new Error('Hosted packet client has no player identity.');
  }
  const inventoryId = 'inventory:' + playerId;
  const inventory = requireAggregate(
    client,
    'container',
    inventoryId,
  );
  const resource = requireAggregate(
    client,
    'resource',
    resourceEntityId,
  );
  return Object.freeze({
    operationId,
    commandType: 'item.gather',
    expectedRevisions: Object.freeze([
      {
        aggregateType: 'container',
        aggregateId: inventoryId,
        revision: inventory.revision,
      },
      {
        aggregateType: 'resource',
        aggregateId: resourceEntityId,
        revision: resource.revision,
      },
    ]),
    payload: {
      inventoryContainerId: inventoryId,
      resourceEntityId,
    },
  });
}

function craftCordageCommand(
  client: PacketClient,
  operationId: string,
): GameplayCommandEnvelopeV1 {
  const playerId = client.connection.getPlayerId();
  if (playerId === null) {
    throw new Error('Hosted packet client has no player identity.');
  }
  const inventoryId = 'inventory:' + playerId;
  const inventory = requireAggregate(client, 'container', inventoryId);
  return Object.freeze({
    operationId,
    commandType: 'item.craft',
    expectedRevisions: Object.freeze([{
      aggregateType: 'container',
      aggregateId: inventoryId,
      revision: inventory.revision,
    }]),
    payload: {
      inventoryContainerId: inventoryId,
      recipeId: 'recipe:cordage',
    },
  });
}

async function gatherOnce(
  composition: Phase1HostedAuthorityComposition,
  clients: readonly PacketClient[],
  client: PacketClient,
  resourceEntityId: string,
  operationId: string,
) {
  sendGameplay(
    composition,
    client,
    gatherCommand(client, operationId, resourceEntityId),
  );
  return waitForCommand(
    composition,
    clients,
    client,
    operationId,
  );
}

function portableBundle(request: SaveCommitRequestV2) {
  return Object.freeze({
    world: request.world,
    players: request.players,
    containers: request.containers,
    chunks: request.chunks,
    footholds: request.footholds,
    structures: request.structures,
  });
}

interface PersistenceHarness {
  readonly composition: Phase1HostedAuthorityComposition;
  readonly requests: SaveCommitRequestV2[];
}

async function createPersistenceHarness(
  worldId: string,
  reopen?: Phase1ReopenState,
): Promise<PersistenceHarness> {
  const requests: SaveCommitRequestV2[] = [];
  const repository = {
    async commit(request: SaveCommitRequestV2) {
      requests.push(request);
      return saveSuccessV2(request.world);
    },
  } as unknown as SaveRepositoryV2;

  let composition:
    | Phase1HostedAuthorityComposition
    | null = null;
  const persistence = new SaveV2HostedPersistenceAdapter({
    repository,
    snapshot: () => {
      if (composition === null) {
        throw new Error('Hosted composition is not bound to persistence.');
      }
      return composePhase1SaveV2(composition.bundle, {
        nowUtc: '2026-09-28T02:00:00.000Z',
      });
    },
  });

  composition = await Phase1HostedAuthorityComposition.create({
    worldId,
    worldSeed: 'p1-world-golden',
    maxPlayers: 2,
    persistence,
    sessionId: 'session:' + worldId,
    sessionEpoch: 'epoch:' + worldId,
    ...(reopen === undefined ? {} : { reopen }),
  });
  return Object.freeze({ composition, requests });
}

function reconstruct(
  composition: Phase1HostedAuthorityComposition,
  request: SaveCommitRequestV2,
): Phase1ReopenState {
  const result = reconstructPhase1ReopenState(
    portableBundle(request),
    createPhase1SaveV2Compatibility(
      composition.bundle.catalog,
      [PHASE1_WORLD_GENERATION_VERSION],
    ),
  );
  if (!result.ok) {
    throw new Error(
      'Expected coherent hosted reopen state: '
        + result.code
        + ' '
        + result.message,
    );
  }
  return result.value;
}

async function makePlayerFacingPersistable(
  composition: Phase1HostedAuthorityComposition,
  client: PacketClient,
): Promise<void> {
  client.connection.sendMovement({
    up: false,
    down: false,
    left: false,
    right: true,
  });
  pumpClientToHost(composition, client);
  await stepAndDeliver(composition, [client]);
}

describe('P1-POLISH-006 hosted client-state projection', () => {
  it('lets two logical packet clients contend, gather, observe inventory, craft, and reconnect from replicated state only', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-polish-006-packets',
      worldSeed: 'p1-world-golden',
      maxPlayers: 2,
      persistence: {
        async save(authorityTick: number) {
          return Object.freeze({
            authorityTick,
            durableSaveRevision: 0,
          });
        },
      },
      sessionId: 'session:p1-polish-006-packets',
      sessionEpoch: 'epoch:p1-polish-006-packets',
    });

    try {
      const first = connectClient(composition, 'transport:packet:first');
      const second = connectClient(composition, 'transport:packet:second');
      const clients = [first, second] as const;
      const firstPlayerId = first.connection.getPlayerId();
      const secondPlayerId = second.connection.getPlayerId();
      if (firstPlayerId === null || secondPlayerId === null) {
        throw new Error('Expected two admitted hosted packet clients.');
      }

      const firstInventoryId = 'inventory:' + firstPlayerId;
      const secondInventoryId = 'inventory:' + secondPlayerId;
      requireAggregate(first, 'container', firstInventoryId);
      requireAggregate(second, 'container', secondInventoryId);
      requireAggregate(first, 'foothold', 'foothold:landing');
      requireAggregate(
        second,
        'structure',
        'structure-instance:landing-module',
      );

      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      composition.bundle.getRuntime(firstPlayerId).relocatePlayer(
        fiber.position,
      );
      composition.bundle.getRuntime(secondPlayerId).relocatePlayer(
        fiber.position,
      );

      const initialResource = requireAggregate(
        first,
        'resource',
        fiber.entityId,
      );
      expect(
        objectState(initialResource).remainingGatherActions,
      ).toBe(4);

      sendGameplay(
        composition,
        first,
        gatherCommand(first, 'packet:contend:first', fiber.entityId),
      );
      sendGameplay(
        composition,
        second,
        gatherCommand(second, 'packet:contend:second', fiber.entityId),
      );

      const firstResultPromise = waitForCommand(
        composition,
        clients,
        first,
        'packet:contend:first',
      );
      const secondResultPromise = waitForCommand(
        composition,
        clients,
        second,
        'packet:contend:second',
      );
      const [firstResult, secondResult] = await Promise.all([
        firstResultPromise,
        secondResultPromise,
      ]);

      const committed = [
        [first, firstResult] as const,
        [second, secondResult] as const,
      ].filter(([, result]) => result.status === 'committed');
      const rejected = [
        [first, firstResult] as const,
        [second, secondResult] as const,
      ].filter(([, result]) => result.status === 'rejected');
      expect(committed).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(
        objectState(requireAggregate(
          first,
          'resource',
          fiber.entityId,
        )).remainingGatherActions,
      ).toBe(3);

      const winner = committed[0]?.[0];
      const loser = rejected[0]?.[0];
      if (winner === undefined || loser === undefined) {
        throw new Error('Expected one gather winner and one stale loser.');
      }

      expect(await gatherOnce(
        composition,
        clients,
        winner,
        fiber.entityId,
        'packet:winner:retry',
      )).toMatchObject({ status: 'committed' });
      expect(await gatherOnce(
        composition,
        clients,
        loser,
        fiber.entityId,
        'packet:loser:first',
      )).toMatchObject({ status: 'committed' });
      expect(await gatherOnce(
        composition,
        clients,
        loser,
        fiber.entityId,
        'packet:loser:second',
      )).toMatchObject({ status: 'committed' });

      expect(quantityOf(
        first,
        firstInventoryId,
        'item:plant-fiber',
      )).toBeGreaterThanOrEqual(3);
      expect(quantityOf(
        second,
        secondInventoryId,
        'item:plant-fiber',
      )).toBeGreaterThanOrEqual(3);

      sendGameplay(
        composition,
        first,
        craftCordageCommand(first, 'packet:craft:first'),
      );
      sendGameplay(
        composition,
        second,
        craftCordageCommand(second, 'packet:craft:second'),
      );
      await stepAndDeliver(composition, clients);

      expect(first.connection.getCommandResult('packet:craft:first'))
        .toMatchObject({ status: 'committed' });
      expect(second.connection.getCommandResult('packet:craft:second'))
        .toMatchObject({ status: 'committed' });
      expect(quantityOf(first, firstInventoryId, 'item:cordage')).toBe(1);
      expect(quantityOf(second, secondInventoryId, 'item:cordage')).toBe(1);

      const resumeCredential = second.connection.getResumeCredential();
      if (resumeCredential === null) {
        throw new Error('Expected hosted resume credential.');
      }
      second.connection.leave();
      pumpClientToHost(composition, second);

      const resumed = connectClient(
        composition,
        'transport:packet:second:resumed',
        resumeCredential,
      );
      expect(resumed.connection.getPlayerId()).toBe(secondPlayerId);
      expect(
        quantityOf(resumed, secondInventoryId, 'item:cordage'),
      ).toBe(1);
      expect(
        objectState(requireAggregate(
          resumed,
          'resource',
          fiber.entityId,
        )).remainingGatherActions,
      ).toBe(0);
      requireAggregate(
        resumed,
        'structure',
        'structure-instance:landing-module',
      );
    } finally {
      await composition.destroy();
    }
  });
});

describe('P1-POLISH-006 hosted drain/save lifecycle', () => {
  it('saves and reopens coherently with an empty command queue', async () => {
    const harness = await createPersistenceHarness(
      'world:p1-polish-006-empty-drain',
    );
    const composition = harness.composition;
    const client = connectClient(
      composition,
      'transport:empty-drain',
    );

    try {
      await makePlayerFacingPersistable(composition, client);
      const beforeDrainTick = composition.host.getAuthorityTick();
      const final = await composition.drainSaveAndClose();
      deliver([client], final);

      expect(composition.host.getSessionState()).toBe('CLOSED');
      expect(harness.requests).toHaveLength(1);
      const saved = harness.requests[0]!;
      expect(saved.world.authorityTick).toBe(beforeDrainTick);
      expect(composition.bundle.authorityTick).toBe(beforeDrainTick);
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(0);

      const reopen = reconstruct(composition, saved);
      await composition.destroy();
      const reopened = await createPersistenceHarness(
        'world:p1-polish-006-empty-drain',
        reopen,
      );
      try {
        expect(reopened.composition.host.getAuthorityTick())
          .toBe(saved.world.authorityTick);
        expect(reopened.composition.bundle.authorityTick)
          .toBe(saved.world.authorityTick);
        expect(reopened.composition.host.diagnostics().pendingDomainCommandCount)
          .toBe(0);
      } finally {
        await reopened.composition.destroy();
      }
    } finally {
      if (composition.host.getSessionState() !== 'CLOSED') {
        await composition.destroy();
      }
    }
  });

  it('coordinates the queued-command drain tick before Save V2 snapshot and reopen', async () => {
    const harness = await createPersistenceHarness(
      'world:p1-polish-006-queued-drain',
    );
    const composition = harness.composition;
    const client = connectClient(
      composition,
      'transport:queued-drain',
    );

    try {
      await makePlayerFacingPersistable(composition, client);
      const playerId = client.connection.getPlayerId();
      if (playerId === null) {
        throw new Error('Expected queued-drain player.');
      }
      const inventoryId = 'inventory:' + playerId;
      sendGameplay(
        composition,
        client,
        craftCordageCommand(client, 'queued-drain:craft'),
      );
      const beforeDrainTick = composition.host.getAuthorityTick();

      const final = await composition.drainSaveAndClose();
      deliver([client], final);

      expect(composition.host.getAuthorityTick()).toBe(beforeDrainTick + 1);
      expect(composition.bundle.authorityTick).toBe(beforeDrainTick + 1);
      expect(client.connection.getCommandResult('queued-drain:craft'))
        .toMatchObject({ status: 'rejected' });
      expect(harness.requests).toHaveLength(1);
      const saved = harness.requests[0]!;
      expect(saved.world.authorityTick).toBe(beforeDrainTick + 1);
      expect(
        saved.containers.find(
          (entry) => entry.containerId === inventoryId,
        ),
      ).toBeDefined();
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(0);

      const reopen = reconstruct(composition, saved);
      await composition.destroy();
      const reopened = await createPersistenceHarness(
        'world:p1-polish-006-queued-drain',
        reopen,
      );
      try {
        expect(reopened.composition.host.getAuthorityTick())
          .toBe(saved.world.authorityTick);
        expect(reopened.composition.bundle.authorityTick)
          .toBe(saved.world.authorityTick);
      } finally {
        await reopened.composition.destroy();
      }
    } finally {
      if (composition.host.getSessionState() !== 'CLOSED') {
        await composition.destroy();
      }
    }
  });

  it('cancels an active multi-tick gather before persistence and reopens without a pending reward', async () => {
    const harness = await createPersistenceHarness(
      'world:p1-polish-006-active-gather-drain',
    );
    const composition = harness.composition;
    const client = connectClient(
      composition,
      'transport:active-gather-drain',
    );

    try {
      const playerId = client.connection.getPlayerId();
      if (playerId === null) {
        throw new Error('Expected active-gather player.');
      }
      const inventoryId = 'inventory:' + playerId;
      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      composition.bundle.getRuntime(playerId).relocatePlayer(
        fiber.position,
      );

      sendGameplay(
        composition,
        client,
        gatherCommand(
          client,
          'active-gather-drain:gather',
          fiber.entityId,
        ),
      );
      await stepAndDeliver(composition, [client]);
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(1);
      expect(
        client.connection.getCommandResult(
          'active-gather-drain:gather',
        ),
      ).toBeNull();

      const beforeDrainTick = composition.host.getAuthorityTick();
      const final = await composition.drainSaveAndClose();
      deliver([client], final);

      expect(composition.host.getAuthorityTick()).toBe(beforeDrainTick);
      expect(composition.bundle.authorityTick).toBe(beforeDrainTick);
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(0);
      expect(
        client.connection.getCommandResult(
          'active-gather-drain:gather',
        ),
      ).toMatchObject({
        status: 'rejected',
        reason: 'GATHER_INTERRUPTED',
      });
      expect(harness.requests).toHaveLength(1);
      const saved = harness.requests[0]!;
      const inventory = saved.containers.find(
        (entry) => entry.containerId === inventoryId,
      );
      expect(
        inventory?.stacks.some(
          (entry) => entry.itemDefinitionId === 'item:plant-fiber',
        ),
      ).toBe(false);

      const reopen = reconstruct(composition, saved);
      await composition.destroy();
      const reopened = await createPersistenceHarness(
        'world:p1-polish-006-active-gather-drain',
        reopen,
      );
      try {
        expect(
          reopened.composition.bundle.items
            .getContainerView(inventoryId).stacks.some(
              (entry) => entry.itemDefinitionId === 'item:plant-fiber',
            ),
        ).toBe(false);
        expect(
          reopened.composition.host.diagnostics().pendingDomainCommandCount,
        ).toBe(0);
      } finally {
        await reopened.composition.destroy();
      }
    } finally {
      if (composition.host.getSessionState() !== 'CLOSED') {
        await composition.destroy();
      }
    }
  });
});
