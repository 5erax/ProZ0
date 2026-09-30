import { describe, expect, it, vi } from 'vitest';
import { SIMULATION_HZ } from '../../src/foundation';
import {
  Phase1HostedAuthorityComposition,
} from '../../src/integration';
import {
  HOSTED_PROTOCOL_VERSION,
  type ClientEnvelopeV1,
  type GameplayCommandEnvelopeV1,
  type JsonValue,
  type SessionAcceptedV1,
} from '../../src/protocol';
import type {
  HostedOutboundMessage,
  HostedPersistencePort,
  ServerAuthorityHost,
} from '../../src/server';
import {
  getPhase1WorldLandmarks,
} from '../../src/world/phase1/Phase1ChunkGenerator';

interface HostedClientHarness {
  readonly transportId: string;
  readonly playerId: string;
  readonly connectionId: string;
  readonly resumeCredential: string;
  nextSeq: number;
}

class NoopHostedPersistence implements HostedPersistencePort {
  public async save(authorityTick: number) {
    return Object.freeze({
      authorityTick,
      durableSaveRevision: 0,
    });
  }
}

it('Phase 2 admits eight real authority clients, rejects overflow and preserves seven distinct teammate slots after resume',async()=>{
  const composition=await Phase1HostedAuthorityComposition.create({worldId:'world:p2-hosted-eight',worldSeed:'p1-world-golden',maxPlayers:8,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25,persistence:new NoopHostedPersistence(),sessionId:'session:p2-eight',sessionEpoch:'epoch:p2-eight'});
  try{
    const clients=Array.from({length:8},(_,i)=>join(composition,'transport:p2:'+String(i)));
    expect(composition.bundle.getActivePlayerIds()).toHaveLength(8);
    const full=composition.host.receiveText('transport:p2:overflow',JSON.stringify({protocolVersion:HOSTED_PROTOCOL_VERSION,messageType:'CLIENT_HELLO',clientMessageSeq:0,payload:helloPayload(composition)}));
    expect(full[0]?.envelope).toMatchObject({messageType:'SESSION_REJECTED',payload:{reason:'SESSION_FULL'}});
    const outbound=await composition.step();
    const first=clients[0]!;
    const slots=outbound.filter(m=>m.transportId===first.transportId&&m.envelope.messageType==='PLAYER_MOTION').map(m=>(m.envelope.payload as unknown as {presentationIdentitySlot:string}).presentationIdentitySlot);
    expect(new Set(slots)).toEqual(new Set(['LOCAL','TEAM_A','TEAM_B','TEAM_C','TEAM_D','TEAM_E','TEAM_F','TEAM_G']));
    composition.host.disconnect(clients[7]!.transportId);
    const resumed=join(composition,'transport:p2:resume',clients[7]!.resumeCredential);
    expect(resumed.playerId).toBe(clients[7]!.playerId);
    const after=await composition.step();
    expect(after.filter(m=>m.transportId===first.transportId&&m.envelope.messageType==='PLAYER_MOTION').map(m=>(m.envelope.payload as unknown as {presentationIdentitySlot:string}).presentationIdentitySlot)).toEqual(slots);
    expect(composition.bundle.colonyDepth.read().discoveredBiomes).toEqual(['landing-grassland']);
  }finally{await composition.destroy();}
});

function helloPayload(
  composition: Phase1HostedAuthorityComposition,
) {
  return Object.freeze({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    contentCompatibility:
      composition.bundle.getContentCompatibility(),
    worldCompatibility:
      composition.bundle.getWorldCompatibility(),
  });
}

it('eight-player colony research resolves one competing transaction and replicates its shared revision to every client', async () => {
  const c = await Phase1HostedAuthorityComposition.create({
    worldId: 'world:p2-shared-research', worldSeed: 'p1-world-golden', maxPlayers: 8,
    colonyDepthEnabled: true, interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25,
    persistence: new NoopHostedPersistence(),
  });
  try {
    const clients = Array.from({length:8}, (_,i) => join(c, 'p2:research:' + String(i)));
    await c.step();
    for (const client of clients.slice(0,2)) {
      expect(c.bundle.items.commitColonyExchange({
        operationId:'fixture:fund:'+client.playerId,playerId:client.playerId,
        expectedInventoryRevision:c.bundle.items.getContainerView('inventory:'+client.playerId).revision,
        inputs:[],outputs:[{itemDefinitionId:'item:plant-fiber',quantity:3},{itemDefinitionId:'item:stone',quantity:2}],
      }).status).toBe('committed');
    }
    const command=(client:HostedClientHarness,operationId:string):GameplayCommandEnvelopeV1=>({
      operationId,commandType:'colony.depth',expectedRevisions:[
        {aggregateType:'colony-depth',aggregateId:'colony',revision:c.bundle.colonyDepth.read().revision},
        {aggregateType:'container',aggregateId:'inventory:'+client.playerId,revision:c.bundle.items.getContainerView('inventory:'+client.playerId).revision},
      ],payload:{action:'research',targetId:'field-survey'},
    });
    const first=command(clients[0]!,'p2:research:first');
    const competing=command(clients[1]!,'p2:research:competing');
    const uncharged=c.bundle.items.getContainerView('inventory:'+clients[1]!.playerId);
    sendCommand(c.host,clients[0]!,first);sendCommand(c.host,clients[1]!,competing);
    const outbound=await c.step();
    expect(c.bundle.colonyDepth.read().researchIds).toEqual(['field-survey']);
    expect(queryOperationStatus(c.host,clients[1]!,competing.operationId)?.envelope.payload).toMatchObject({state:'resolved',result:{status:'rejected',reason:'STALE_REVISION'}});
    expect(c.bundle.items.getContainerView(uncharged.containerId)).toEqual(uncharged);
    for(const client of clients) expect(outbound.some(message=>message.transportId===client.transportId&&JSON.stringify(message.envelope).includes('field-survey'))).toBe(true);
    const ledger=c.bundle.items.exportLedgerSnapshot();
    sendCommand(c.host,clients[0]!,first);await c.step();
    expect(c.bundle.items.exportLedgerSnapshot()).toEqual(ledger);
  } finally {await c.destroy();}
});

function join(
  composition: Phase1HostedAuthorityComposition,
  transportId: string,
  resumeCredential?: string,
): HostedClientHarness {
  const host = composition.host;
  const joined = host.receiveText(transportId, JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'CLIENT_HELLO',
    clientMessageSeq: 0,
    payload: {
      ...helloPayload(composition),
      ...(resumeCredential === undefined
        ? {}
        : { resumeCredential }),
    },
  }));
  const accepted = joined.find(
    (entry) => entry.envelope.messageType === 'SESSION_ACCEPTED',
  );
  const baseline = joined.find(
    (entry) => entry.envelope.messageType === 'BASELINE_SNAPSHOT',
  );
  if (accepted === undefined || baseline === undefined) {
    throw new Error('Expected hosted Phase 1 client acceptance.');
  }

  const metadata =
    accepted.envelope.payload as unknown as SessionAcceptedV1;
  const client: HostedClientHarness = {
    transportId,
    playerId: metadata.playerId,
    connectionId: metadata.connectionId,
    resumeCredential: metadata.resumeCredential,
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

function sendMovement(
  host: ServerAuthorityHost,
  client: HostedClientHarness,
  inputSeq: number,
  direction: {
    readonly up: boolean;
    readonly down: boolean;
    readonly left: boolean;
    readonly right: boolean;
  },
): void {
  const envelope: ClientEnvelopeV1 = {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'MOVEMENT_INPUT',
    clientMessageSeq: client.nextSeq++,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload: {
      inputSeq,
      ...direction,
    },
  };
  expect(
    host.receiveText(
      client.transportId,
      JSON.stringify(envelope),
    ),
  ).toEqual([]);
}

function sendCommand(
  host: ServerAuthorityHost,
  client: HostedClientHarness,
  command: GameplayCommandEnvelopeV1,
): void {
  const envelope: ClientEnvelopeV1 = {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'GAMEPLAY_COMMAND',
    clientMessageSeq: client.nextSeq++,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload: command as unknown as JsonValue,
  };
  host.receiveText(
    client.transportId,
    JSON.stringify(envelope),
  );
}

function queryOperationStatus(
  host: ServerAuthorityHost,
  client: HostedClientHarness,
  operationId: string,
): HostedOutboundMessage | undefined {
  const envelope: ClientEnvelopeV1 = {
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'OPERATION_STATUS_QUERY',
    clientMessageSeq: client.nextSeq++,
    sessionId: host.getSessionId(),
    connectionId: client.connectionId,
    payload: { operationId },
  };
  return host.receiveText(
    client.transportId,
    JSON.stringify(envelope),
  )[0];
}

describe('Phase 1 hosted vertical-slice composition', () => {
  it.each([2, 3] as const)(
    'runs the same canonical hosted authority composition at %i-player capacity',
    async (maxPlayers) => {
      const composition = await Phase1HostedAuthorityComposition.create({
        worldId: 'world:p1-hosted-capacity-' + String(maxPlayers),
        worldSeed: 'p1-world-golden',
        maxPlayers,
        interactionRangeWorldUnits: 2,
        spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0,
        persistence: new NoopHostedPersistence(),
        sessionId: 'session:p1-hosted-capacity-' + String(maxPlayers),
        sessionEpoch: 'epoch:p1-hosted-capacity-' + String(maxPlayers),
      });

      try {
        const clients = Array.from(
          { length: maxPlayers },
          (_, index) => join(
            composition,
            'transport:capacity:' + String(maxPlayers) + ':' + String(index),
          ),
        );

        expect(composition.bundle.getActivePlayerIds()).toHaveLength(
          maxPlayers,
        );

        const outbound = await composition.step();
        for (const client of clients) {
          expect(
            outbound.filter(
              (entry) =>
                entry.transportId === client.transportId
                && entry.envelope.messageType === 'PLAYER_MOTION',
            ),
          ).toHaveLength(maxPlayers);
        }

        const firstViewer = clients[0];
        if (firstViewer === undefined) {
          throw new Error('Expected admitted hosted capacity viewer.');
        }
        const slots = outbound
          .filter(
            (entry) =>
              entry.transportId === firstViewer.transportId
              && entry.envelope.messageType === 'PLAYER_MOTION',
          )
          .map((entry) => (
            entry.envelope.payload as unknown as {
              readonly playerId: string;
              readonly presentationIdentitySlot: string;
            }
          ))
          .sort((left, right) =>
            left.playerId.localeCompare(right.playerId),
          );

        expect(slots.map((entry) => entry.presentationIdentitySlot))
          .toEqual(
            maxPlayers === 2
              ? ['LOCAL', 'TEAM_A']
              : ['LOCAL', 'TEAM_A', 'TEAM_B'],
          );
      } finally {
        await composition.destroy();
      }
    },
  );

  it('keeps hosted gather accepted-pending until the canonical terminal tick and ignores exact pending duplicates', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-hosted-gather-pending',
      worldSeed: 'p1-world-golden',
      maxPlayers: 2,
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: new NoopHostedPersistence(),
      sessionId: 'session:p1-hosted-gather-pending',
      sessionEpoch: 'epoch:p1-hosted-gather-pending',
    });

    try {
      const client = join(
        composition,
        'transport:hosted-gather-pending',
      );
      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      composition.bundle.getRuntime(client.playerId).relocatePlayer(
        fiber.position,
      );
      const resource =
        composition.bundle.worldStore.getResourceState(fiber.entityId);
      if (resource === undefined) {
        throw new Error('Expected canonical Fiber Plant runtime state.');
      }
      const inventory = composition.bundle.items.getContainerView(
        'inventory:' + client.playerId,
      );
      const operationId = 'hosted:gather:pending:fiber';
      const command = Object.freeze({
        operationId,
        commandType: 'item.gather',
        expectedRevisions: Object.freeze([
          {
            aggregateType: 'container',
            aggregateId: inventory.containerId,
            revision: inventory.revision,
          },
          {
            aggregateType: 'resource',
            aggregateId: fiber.entityId,
            revision: resource.revision,
          },
        ]),
        payload: {
          inventoryContainerId: inventory.containerId,
          resourceEntityId: fiber.entityId,
        },
      } satisfies GameplayCommandEnvelopeV1);

      sendCommand(composition.host, client, command);
      const first = await composition.step();
      expect(first.some(
        (entry) =>
          entry.transportId === client.transportId
          && entry.envelope.messageType === 'COMMAND_RESULT'
          && (
            entry.envelope.payload as unknown as {
              readonly operationId: string;
            }
          ).operationId === operationId,
      )).toBe(false);
      expect(queryOperationStatus(
        composition.host,
        client,
        operationId,
      )?.envelope).toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId,
          state: 'accepted-pending',
          acceptedAuthorityTick: 0,
          authorityIngressOrdinal: 1,
        },
      });

      // Same semantic OperationId while pending must not restart the channel.
      sendCommand(composition.host, client, command);

      const requiredTicks = Math.round(
        composition.bundle.catalog.getAs(
          'resource:fiber-plant',
          'resource',
        ).gatherChannelSeconds * SIMULATION_HZ,
      );
      for (let elapsed = 1; elapsed < requiredTicks - 1; elapsed += 1) {
        const interim = await composition.step();
        expect(interim.some(
          (entry) =>
            entry.transportId === client.transportId
            && entry.envelope.messageType === 'COMMAND_RESULT'
            && (
              entry.envelope.payload as unknown as {
                readonly operationId: string;
              }
            ).operationId === operationId,
        )).toBe(false);
      }

      expect(queryOperationStatus(
        composition.host,
        client,
        operationId,
      )?.envelope).toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId,
          state: 'accepted-pending',
        },
      });

      const terminal = await composition.step();
      expect(
        terminal.find(
          (entry) =>
            entry.transportId === client.transportId
            && entry.envelope.messageType === 'COMMAND_RESULT'
            && (
              entry.envelope.payload as unknown as {
                readonly operationId: string;
              }
            ).operationId === operationId,
        )?.envelope.payload,
      ).toMatchObject({
        operationId,
        status: 'committed',
        acceptedAuthorityTick: 0,
        authorityIngressOrdinal: 1,
        resultingRevisions: expect.arrayContaining([
          expect.objectContaining({
            aggregateType: 'container',
            aggregateId: inventory.containerId,
            revision: inventory.revision + 1,
          }),
          expect.objectContaining({
            aggregateType: 'resource',
            aggregateId: fiber.entityId,
            revision: resource.revision + 1,
          }),
        ]),
      });
      expect(queryOperationStatus(
        composition.host,
        client,
        operationId,
      )?.envelope).toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId,
          state: 'resolved',
          result: {
            operationId,
            status: 'committed',
            acceptedAuthorityTick: 0,
            authorityIngressOrdinal: 1,
          },
        },
      });
      expect(
        composition.bundle.items
          .getContainerView(inventory.containerId).stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:plant-fiber',
        quantity: 2,
      }));
    } finally {
      await composition.destroy();
    }
  });

  it('cancels hosted gather on disconnect and reconciles the same OperationId as rejected after same-epoch resume', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-hosted-gather-disconnect',
      worldSeed: 'p1-world-golden',
      maxPlayers: 2,
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: new NoopHostedPersistence(),
      sessionId: 'session:p1-hosted-gather-disconnect',
      sessionEpoch: 'epoch:p1-hosted-gather-disconnect',
    });

    try {
      const client = join(
        composition,
        'transport:hosted-gather-disconnect',
      );
      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      composition.bundle.getRuntime(client.playerId).relocatePlayer(
        fiber.position,
      );
      const resource =
        composition.bundle.worldStore.getResourceState(fiber.entityId);
      if (resource === undefined) {
        throw new Error('Expected canonical Fiber Plant runtime state.');
      }
      const inventory = composition.bundle.items.getContainerView(
        'inventory:' + client.playerId,
      );
      const operationId = 'hosted:gather:disconnect:fiber';
      sendCommand(composition.host, client, {
        operationId,
        commandType: 'item.gather',
        expectedRevisions: Object.freeze([
          {
            aggregateType: 'container',
            aggregateId: inventory.containerId,
            revision: inventory.revision,
          },
          {
            aggregateType: 'resource',
            aggregateId: fiber.entityId,
            revision: resource.revision,
          },
        ]),
        payload: {
          inventoryContainerId: inventory.containerId,
          resourceEntityId: fiber.entityId,
        },
      });
      await composition.step();
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(1);

      composition.host.disconnect(client.transportId);
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(0);
      const resumed = join(
        composition,
        'transport:hosted-gather-disconnect-resumed',
        client.resumeCredential,
      );
      expect(resumed.playerId).toBe(client.playerId);
      expect(queryOperationStatus(
        composition.host,
        resumed,
        operationId,
      )?.envelope).toMatchObject({
        messageType: 'OPERATION_STATUS',
        payload: {
          operationId,
          state: 'resolved',
          result: {
            operationId,
            status: 'rejected',
            acceptedAuthorityTick: 0,
            authorityIngressOrdinal: 1,
            reason: 'GATHER_INTERRUPTED',
          },
        },
      });

      for (let tick = 0; tick < SIMULATION_HZ; tick += 1) {
        await composition.step();
      }
      expect(
        composition.bundle.items
          .getContainerView(inventory.containerId).stacks,
      ).not.toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:plant-fiber',
      }));
      expect(
        composition.bundle.worldStore.getResourceState(fiber.entityId),
      ).toMatchObject({
        revision: resource.revision,
        remainingGatherActions: resource.remainingGatherActions,
      });
    } finally {
      await composition.destroy();
    }
  });

  it('cancels accepted-pending hosted gather before graceful durability save', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-hosted-gather-drain',
      worldSeed: 'p1-world-golden',
      maxPlayers: 2,
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: new NoopHostedPersistence(),
      sessionId: 'session:p1-hosted-gather-drain',
      sessionEpoch: 'epoch:p1-hosted-gather-drain',
    });

    try {
      const client = join(
        composition,
        'transport:hosted-gather-drain',
      );
      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical Fiber Plant.');
      }
      composition.bundle.getRuntime(client.playerId).relocatePlayer(
        fiber.position,
      );
      const resource =
        composition.bundle.worldStore.getResourceState(fiber.entityId);
      if (resource === undefined) {
        throw new Error('Expected canonical Fiber Plant runtime state.');
      }
      const inventory = composition.bundle.items.getContainerView(
        'inventory:' + client.playerId,
      );
      const operationId = 'hosted:gather:drain:fiber';
      sendCommand(composition.host, client, {
        operationId,
        commandType: 'item.gather',
        expectedRevisions: Object.freeze([
          {
            aggregateType: 'container',
            aggregateId: inventory.containerId,
            revision: inventory.revision,
          },
          {
            aggregateType: 'resource',
            aggregateId: fiber.entityId,
            revision: resource.revision,
          },
        ]),
        payload: {
          inventoryContainerId: inventory.containerId,
          resourceEntityId: fiber.entityId,
        },
      });
      await composition.step();
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(1);

      const drained = await composition.drainSaveAndClose();
      expect(composition.host.getSessionState()).toBe('CLOSED');
      expect(composition.host.diagnostics().pendingDomainCommandCount)
        .toBe(0);
      expect(
        drained.find(
          (entry) =>
            entry.envelope.messageType === 'COMMAND_RESULT'
            && (
              entry.envelope.payload as unknown as {
                readonly operationId: string;
              }
            ).operationId === operationId,
        )?.envelope.payload,
      ).toMatchObject({
        operationId,
        status: 'rejected',
        reason: 'GATHER_INTERRUPTED',
      });
      expect(
        composition.bundle.items
          .getContainerView(inventory.containerId).stacks,
      ).not.toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:plant-fiber',
      }));
      expect(
        composition.bundle.worldStore.getResourceState(fiber.entityId),
      ).toMatchObject({
        revision: resource.revision,
        remainingGatherActions: resource.remainingGatherActions,
      });
    } finally {
      await composition.destroy();
    }
  });

  it('routes hosted building placement through shared personal progression exactly once', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-hosted-building-progression',
      worldSeed: 'p1-world-golden',
      maxPlayers: 2,
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: new NoopHostedPersistence(),
      sessionId: 'session:p1-hosted-building-progression',
      sessionEpoch: 'epoch:p1-hosted-building-progression',
    });

    try {
      const client = join(
        composition,
        'transport:hosted-building-progression',
      );
      const landing = composition.bundle.buildings.getStructure(
        'structure-instance:landing-module',
      );
      if (landing === null) {
        throw new Error('Expected canonical Landing Module.');
      }

      const committed = Object.freeze({
        status: 'committed' as const,
        operationId: 'hosted:place:storage',
        structure: Object.freeze({
          ...landing,
          structureId: 'structure-instance:hosted:place:storage',
          definitionId: 'structure:storage-crate' as const,
        }),
        buildRevision: 1,
        inventoryRevision: 1,
      });
      vi.spyOn(
        composition.bundle.buildingAuthority,
        'place',
      ).mockReturnValue(committed);

      const command = Object.freeze({
        operationId: committed.operationId,
        commandType: 'building.place',
        expectedRevisions: Object.freeze([
          {
            aggregateType: 'container',
            aggregateId: 'inventory:' + client.playerId,
            revision: 0,
          },
          {
            aggregateType: 'foothold',
            aggregateId: 'foothold:landing',
            revision: 0,
          },
        ]),
        payload: {
          structureDefinitionId: 'structure:storage-crate',
          sourceKitStackId: 'test:storage-kit',
          inventoryContainerId: 'inventory:' + client.playerId,
          placement: {
            mode: 'free',
            x: 2,
            y: 2,
            orientationQuarterTurns: 0,
          },
        },
      } satisfies GameplayCommandEnvelopeV1);

      sendCommand(composition.host, client, command);
      const outbound = await composition.step();
      expect(
        outbound.find(
          (entry) =>
            entry.transportId === client.transportId
            && entry.envelope.messageType === 'COMMAND_RESULT',
        )?.envelope.payload,
      ).toMatchObject({
        operationId: committed.operationId,
        status: 'committed',
      });

      const progressed =
        composition.bundle.progression.getPlayerView(client.playerId);
      expect(progressed.milestoneRuleIds).toContain(
        'first-place:storage-crate',
      );
      expect(progressed.totalXp).toBe(15);

      // The integration event ID is stable by placement operation, so even
      // an authority retry cannot duplicate personal progression.
      composition.bundle.placeStructure({
        operationId: committed.operationId,
        actorPlayerId: client.playerId,
        structureDefinitionId: 'structure:storage-crate',
        sourceKitStackId: 'test:storage-kit',
        inventoryContainerId: 'inventory:' + client.playerId,
        expectedInventoryRevision: 0,
        expectedBuildRevision: 0,
        placement: {
          mode: 'free',
          anchor: { x: 2, y: 2 },
          orientationQuarterTurns: 0,
        },
      });
      expect(
        composition.bundle.progression.getPlayerView(client.playerId).totalXp,
      ).toBe(15);
    } finally {
      vi.restoreAllMocks();
      await composition.destroy();
    }
  });

  it('integrates 4 admitted players, stable co-op identity, shared discovery and authoritative ruin inspect', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({
      worldId: 'world:p1-hosted-integration',
      worldSeed: 'p1-world-golden',
      maxPlayers: 4,
      interactionRangeWorldUnits: 2,
      spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0,
      persistence: new NoopHostedPersistence(),
      sessionId: 'session:p1-hosted-integration',
      sessionEpoch: 'epoch:p1-hosted-integration',
    });

    try {
      const clients = [
        join(composition, 'transport:a'),
        join(composition, 'transport:b'),
        join(composition, 'transport:c'),
        join(composition, 'transport:d'),
      ];
      expect(clients.map((client) => client.playerId)).toEqual([
        'player:1',
        'player:2',
        'player:3',
        'player:4',
      ]);
      expect(composition.bundle.getActivePlayerIds()).toEqual([
        'player:1',
        'player:2',
        'player:3',
        'player:4',
      ]);

      const full = composition.host.receiveText(
        'transport:e',
        JSON.stringify({
          protocolVersion: HOSTED_PROTOCOL_VERSION,
          messageType: 'CLIENT_HELLO',
          clientMessageSeq: 0,
          payload: helloPayload(composition),
        }),
      );
      expect(full).toHaveLength(1);
      expect(full[0]?.envelope).toMatchObject({
        messageType: 'SESSION_REJECTED',
        payload: { reason: 'SESSION_FULL' },
      });

      sendMovement(
        composition.host,
        clients[0]!,
        1,
        { up: false, down: false, left: false, right: true },
      );
      const firstStep = await composition.step();
      const viewerMotions = firstStep
        .filter(
          (entry) =>
            entry.transportId === 'transport:a'
            && entry.envelope.messageType === 'PLAYER_MOTION',
        )
        .map((entry) => entry.envelope.payload as unknown as {
          readonly playerId: string;
          readonly presentationIdentitySlot: string;
        });
      expect(viewerMotions).toHaveLength(4);
      expect(
        Object.fromEntries(
          viewerMotions.map((entry) => [
            entry.playerId,
            entry.presentationIdentitySlot,
          ]),
        ),
      ).toEqual({
        'player:1': 'LOCAL',
        'player:2': 'TEAM_A',
        'player:3': 'TEAM_B',
        'player:4': 'TEAM_C',
      });
      expect(
        composition.bundle.getPlayerPosition('player:1').x,
      ).toBeGreaterThan(0);

      const landmarks = getPhase1WorldLandmarks('p1-world-golden');
      const ruin = composition.bundle.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
      if (ruin === null) throw new Error('Expected canonical Phase 1 ruin.');

      composition.bundle.getRuntime('player:1').relocatePlayer(
        landmarks.ruinPosition,
      );
      const discoveryStep = await composition.step();
      const ruinDiscoveryMessages = discoveryStep.filter(
        (entry) =>
          entry.envelope.messageType === 'AGGREGATE_UPDATE'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateType: string;
              readonly aggregateId: string;
            }
          ).aggregateType === 'ruin'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateId: string;
            }
          ).aggregateId === ruin.entityId,
      );
      expect(
        new Set(
          ruinDiscoveryMessages.map((entry) => entry.transportId),
        ),
      ).toEqual(new Set([
        'transport:a',
        'transport:b',
        'transport:c',
        'transport:d',
      ]));

      const located =
        composition.bundle.worldStore.getRuinState(ruin.entityId);
      expect(located?.discoveryState).toBe('located');
      expect(
        composition.bundle.progression
          .getPlayerView('player:1').milestoneRuleIds,
      ).toContain('first-ruin-locate:previous-civilization-ruin');
      expect(
        composition.bundle.progression
          .getPlayerView('player:2').milestoneRuleIds,
      ).not.toContain('first-ruin-locate:previous-civilization-ruin');

      sendCommand(composition.host, clients[0]!, {
        operationId: 'hosted:ruin-inspect:p1',
        commandType: 'world.ruin-inspect',
        expectedRevisions: Object.freeze([{
          aggregateType: 'ruin',
          aggregateId: ruin.entityId,
          revision: located!.revision,
        }]),
        payload: {
          ruinEntityId: ruin.entityId,
        },
      });
      const inspectStep = await composition.step();
      expect(
        inspectStep.find(
          (entry) =>
            entry.transportId === 'transport:a'
            && entry.envelope.messageType === 'COMMAND_RESULT',
        )?.envelope.payload,
      ).toMatchObject({
        operationId: 'hosted:ruin-inspect:p1',
        status: 'committed',
      });
      expect(
        composition.bundle.worldStore.getRuinState(ruin.entityId),
      ).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimable',
      });
      expect(
        composition.bundle.progression
          .getPlayerView('player:1').milestoneRuleIds,
      ).toContain('first-ruin-inspect:previous-civilization-ruin');
      expect(
        composition.bundle.progression
          .getPlayerView('player:2').milestoneRuleIds,
      ).not.toContain('first-ruin-inspect:previous-civilization-ruin');

      const claimable =
        composition.bundle.worldStore.getRuinState(ruin.entityId);
      const claimantInventory =
        composition.bundle.items.getContainerView('inventory:player:1');
      sendCommand(composition.host, clients[0]!, {
        operationId: 'hosted:ruin-reward-claim:p1',
        commandType: 'world.ruin-reward-claim',
        expectedRevisions: Object.freeze([
          {
            aggregateType: 'ruin',
            aggregateId: ruin.entityId,
            revision: claimable!.revision,
          },
          {
            aggregateType: 'container',
            aggregateId: claimantInventory.containerId,
            revision: claimantInventory.revision,
          },
        ]),
        payload: {
          ruinEntityId: ruin.entityId,
          inventoryContainerId: claimantInventory.containerId,
        },
      });
      const claimStep = await composition.step();
      expect(
        claimStep.find(
          (entry) =>
            entry.transportId === 'transport:a'
            && entry.envelope.messageType === 'COMMAND_RESULT',
        )?.envelope.payload,
      ).toMatchObject({
        operationId: 'hosted:ruin-reward-claim:p1',
        status: 'committed',
        resultingRevisions: expect.arrayContaining([
          expect.objectContaining({
            aggregateType: 'ruin',
            aggregateId: ruin.entityId,
            revision: claimable!.revision + 1,
          }),
          expect.objectContaining({
            aggregateType: 'container',
            aggregateId: claimantInventory.containerId,
            revision: claimantInventory.revision + 1,
          }),
        ]),
      });
      expect(
        composition.bundle.worldStore.getRuinState(ruin.entityId),
      ).toMatchObject({
        discoveryState: 'investigated',
        physicalRewardState: 'claimed',
      });
      expect(
        composition.bundle.items
          .getContainerView('inventory:player:1').stacks,
      ).toContainEqual(expect.objectContaining({
        itemDefinitionId: 'item:ancient-alloy-shard',
        quantity: 1,
      }));

      const fiber = composition.bundle.world.findGeneratedEntityByDefinition(
        'resource:fiber-plant',
      );
      if (fiber === null || fiber.type !== 'resource') {
        throw new Error('Expected canonical local Fiber Plant.');
      }
      sendMovement(
        composition.host,
        clients[0]!,
        2,
        { up: false, down: false, left: false, right: false },
      );
      composition.bundle.getRuntime('player:1').relocatePlayer(
        fiber.position,
      );
      const fiberState =
        composition.bundle.worldStore.getResourceState(fiber.entityId);
      if (fiberState === undefined) {
        throw new Error('Expected active Fiber Plant runtime state.');
      }
      const inventoryBeforeGather =
        composition.bundle.items.getContainerView('inventory:player:1');
      const gather = composition.bundle.items.beginGather({
        operationId: 'hosted:recovery-seed-gather',
        playerId: 'player:1',
        inventoryContainerId: inventoryBeforeGather.containerId,
        expectedInventoryRevision: inventoryBeforeGather.revision,
        resourceEntityId: fiber.entityId,
        expectedResourceRevision: fiberState.revision,
      });
      expect(gather.status).toBe('started');
      if (gather.status !== 'started') {
        throw new Error('Expected Fiber Plant gather channel to start.');
      }
      for (let tick = 0; tick < gather.requiredTicks; tick += 1) {
        await composition.step();
      }
      const gatheredInventory =
        composition.bundle.items.getContainerView('inventory:player:1');
      const fiberStack = gatheredInventory.stacks.find(
        (stack) => stack.itemDefinitionId === 'item:plant-fiber',
      );
      expect(fiberStack?.quantity).toBe(2);
      if (fiberStack === undefined) {
        throw new Error('Expected gathered Plant Fiber.');
      }

      const deathTick = composition.bundle.authorityTick;
      expect(composition.bundle.survival.applyAuthorityDamage({
        damageId: 'hosted:recovery-lethal',
        sourceType: 'hostile-attack',
        sourceEntityId: 'hosted:test-predator',
        targetPlayerId: 'player:1',
        amount: 100,
        tick: deathTick,
      })).toMatchObject({
        status: 'applied',
        healthAfter: 0,
      });
      const death = composition.bundle.death.processDeath({
        deathId: 'death:hosted:recovery',
        playerId: 'player:1',
        deathPosition: fiber.position,
        deathTick,
        inventoryContainerId: gatheredInventory.containerId,
        expectedInventoryRevision: gatheredInventory.revision,
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
        throw new Error('Expected hosted recovery Death Cache.');
      }

      const cachePublished = composition.publishSharedState().filter(
        (entry) =>
          entry.envelope.messageType === 'AGGREGATE_UPDATE'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateType: string;
              readonly aggregateId: string;
              readonly tombstone: boolean;
            }
          ).aggregateType === 'death-cache'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateId: string;
            }
          ).aggregateId === death.cacheEntityId,
      );
      expect(
        new Set(cachePublished.map((entry) => entry.transportId)),
      ).toEqual(new Set([
        'transport:a',
        'transport:b',
        'transport:c',
        'transport:d',
      ]));

      composition.bundle.getRuntime('player:2').relocatePlayer(
        fiber.position,
      );
      let recoveryOrdinal = 0;
      let recoveryStep: readonly HostedOutboundMessage[] = Object.freeze([]);
      while (
        composition.bundle.items
          .getContainerView(death.cacheContainerId).stacks.length > 0
      ) {
        const cache =
          composition.bundle.items.getContainerView(death.cacheContainerId);
        const teammateInventory =
          composition.bundle.items.getContainerView('inventory:player:2');
        const recoveredStack = cache.stacks[0];
        if (recoveredStack === undefined) {
          throw new Error('Expected recoverable Death Cache stack.');
        }
        const operationId =
          'hosted:death-cache-recover:p2:' + String(++recoveryOrdinal);

        sendCommand(composition.host, clients[1]!, {
          operationId,
          commandType: 'death-cache.recover',
          expectedRevisions: Object.freeze([
            {
              aggregateType: 'container',
              aggregateId: cache.containerId,
              revision: cache.revision,
            },
            {
              aggregateType: 'container',
              aggregateId: teammateInventory.containerId,
              revision: teammateInventory.revision,
            },
          ]),
          payload: {
            sourceContainerId: cache.containerId,
            targetContainerId: teammateInventory.containerId,
            sourceStackId: recoveredStack.stackId,
            quantity: recoveredStack.quantity,
          },
        });
        recoveryStep = await composition.step();
        expect(
          recoveryStep.find(
            (entry) =>
              entry.transportId === 'transport:b'
              && entry.envelope.messageType === 'COMMAND_RESULT',
          )?.envelope.payload,
        ).toMatchObject({
          operationId,
          status: 'committed',
        });
      }
      expect(
        composition.bundle.items
          .getContainerView('inventory:player:2').stacks,
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
        composition.bundle.world.getDeathCacheByContainer(
          death.cacheContainerId,
        ),
      ).toBeNull();

      const tombstones = recoveryStep.filter(
        (entry) =>
          entry.envelope.messageType === 'AGGREGATE_UPDATE'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateType: string;
              readonly aggregateId: string;
              readonly tombstone: boolean;
            }
          ).aggregateType === 'death-cache'
          && (
            entry.envelope.payload as unknown as {
              readonly aggregateId: string;
              readonly tombstone: boolean;
            }
          ).aggregateId === death.cacheEntityId
          && (
            entry.envelope.payload as unknown as {
              readonly tombstone: boolean;
            }
          ).tombstone,
      );
      expect(
        new Set(tombstones.map((entry) => entry.transportId)),
      ).toEqual(new Set([
        'transport:a',
        'transport:b',
        'transport:c',
        'transport:d',
      ]));
    } finally {
      await composition.destroy();
    }
  });
});


describe('hosted colony commands', () => {
  it('replicates cultivation, deduplicates retries and persists progress through reopen', async () => {
    const c = await Phase1HostedAuthorityComposition.create({ worldId: 'world:colony-host', worldSeed: 'p1-world-golden',
      maxPlayers: 2, interactionRangeWorldUnits: 2, spawnClearanceRadiusWorldUnits: 0,
      requiredAccessRadiusWorldUnits: 0, persistence: new NoopHostedPersistence() });
    try {
      const a = join(c, 'colony:a'); const b = join(c, 'colony:b');
      for (const client of [a, b]) {
        c.bundle.getRuntime(client.playerId).relocatePlayer({ x: -6, y: 4 });
        expect(c.bundle.items.commitColonyExchange({ operationId: 'seed:' + client.playerId, playerId: client.playerId,
          expectedInventoryRevision: 0, inputs: [], outputs: [
            { itemDefinitionId: 'item:timber', quantity: 3 }, { itemDefinitionId: 'item:cordage', quantity: 1 },
            { itemDefinitionId: 'item:edible-plant', quantity: 1 }, { itemDefinitionId: 'item:clean-water', quantity: 1 }] }).status).toBe('committed');
      }
      const command = (operationId: string, action: string, client: HostedClientHarness): GameplayCommandEnvelopeV1 => ({
        operationId, commandType: 'colony.sustenance', expectedRevisions: [
          { aggregateType: 'colony-sustenance', aggregateId: 'colony', revision: c.bundle.sustenance.read().revision },
          { aggregateType: 'container', aggregateId: 'inventory:' + client.playerId,
            revision: c.bundle.items.getContainerView('inventory:' + client.playerId).revision }], payload: { action } });
      sendCommand(c.host, a, command('colony:build', 'build-bed', a)); await c.step();
      expect(c.bundle.sustenance.read().bedBuilt).toBe(true);
      const plant = command('colony:plant', 'plant', a);
      const competing = command('colony:competing', 'plant', b);
      sendCommand(c.host, a, plant); sendCommand(c.host, b, competing);
      const outbound = await c.step();
      expect(c.bundle.sustenance.read().cropProgressTicks).not.toBeNull();
      expect(queryOperationStatus(c.host, b, competing.operationId)?.envelope.payload).toMatchObject({ state: 'resolved', result: { status: 'rejected', reason: 'STALE_REVISION' } });
      const inventory = c.bundle.items.exportLedgerSnapshot();
      sendCommand(c.host, a, plant); await c.step();
      expect(c.bundle.items.exportLedgerSnapshot()).toEqual(inventory);
      expect(outbound.some(entry => entry.transportId === b.transportId
        && JSON.stringify(entry.envelope).includes('colony-sustenance'))).toBe(true);
      const { composePhase1SaveV2 } = await import('../../src/integration');
      const { reconstructPhase1ReopenState, createPhase1SaveV2Compatibility, SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } = await import('../../src/persistence');
      const request = composePhase1SaveV2(c.bundle, { nowUtc: '2026-09-30T00:00:00.000Z' });
      const reopened = reconstructPhase1ReopenState({ formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2,
        recordKind: 'portable-bundle', world: request.world, players: request.players, containers: request.containers,
        chunks: request.chunks, footholds: request.footholds, structures: request.structures },
        createPhase1SaveV2Compatibility(c.bundle.catalog, [3]));
      expect(reopened.ok).toBe(true); if (!reopened.ok) throw Error(reopened.message);
      const { Phase1AuthorityBundle } = await import('../../src/integration');
      const resumed = await Phase1AuthorityBundle.create({ worldId: c.bundle.config.worldId, worldSeed: c.bundle.config.worldSeed,
        playerIds: [a.playerId, b.playerId], interactionRangeWorldUnits: 2, spawnClearanceRadiusWorldUnits: 0,
        requiredAccessRadiusWorldUnits: 0, reopen: reopened.value });
      try {
        expect(resumed.sustenance.read()).toEqual(c.bundle.sustenance.read());
        const progress = resumed.sustenance.read().cropProgressTicks!;
        await resumed.stepSolo();
        expect(resumed.sustenance.read().cropProgressTicks).toBe(progress + 1);
      } finally { await resumed.destroy(); }
    } finally { await c.destroy(); }
  });
});
