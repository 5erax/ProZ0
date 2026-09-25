import { describe, expect, it, vi } from 'vitest';
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

function join(
  composition: Phase1HostedAuthorityComposition,
  transportId: string,
): HostedClientHarness {
  const host = composition.host;
  const joined = host.receiveText(transportId, JSON.stringify({
    protocolVersion: HOSTED_PROTOCOL_VERSION,
    messageType: 'CLIENT_HELLO',
    clientMessageSeq: 0,
    payload: helloPayload(composition),
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
