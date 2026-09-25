import type {
  JsonValue,
  RevisionRefV1,
  RevisionedAggregateViewV1,
} from '../protocol';
import type {
  ItemTransactionResult,
} from '../simulation';
import {
  Phase1HostedCommandDispatcher,
  ServerAuthorityHost,
  type HostedOutboundMessage,
  type HostedPersistencePort,
} from '../server';
import type { Phase1ReopenState } from '../persistence';
import {
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
  Phase1AuthorityBundle,
  type Phase1AuthorityBundleConfig,
} from './Phase1AuthorityBundle';

function asJson(value: unknown): JsonValue {
  return value as JsonValue;
}

function capacityPlayerIds(maxPlayers: number): readonly string[] {
  return Object.freeze(
    Array.from(
      { length: maxPlayers },
      (_, index) => 'player:' + String(index + 1),
    ),
  );
}

function aggregateViews(
  bundle: Phase1AuthorityBundle,
): readonly RevisionedAggregateViewV1[] {
  const values: RevisionedAggregateViewV1[] = [];

  for (const view of bundle.world.getActiveChunkViews()) {
    values.push(Object.freeze({
      aggregateType: 'exploration',
      aggregateId: view.delta.exploration.regionId,
      revision: view.delta.exploration.revision,
      tombstone: false,
      state: asJson({
        words: [...view.delta.exploration.words],
      }),
    }));

    for (const ruin of view.delta.ruinStates) {
      values.push(Object.freeze({
        aggregateType: 'ruin',
        aggregateId: ruin.ruinEntityId,
        revision: ruin.revision,
        tombstone: false,
        state: asJson({
          discoveryState: ruin.discoveryState,
          physicalRewardState: ruin.physicalRewardState,
        }),
      }));
    }
  }

  for (const cache of bundle.world.exportSnapshot().deathCaches.caches) {
    values.push(Object.freeze({
      aggregateType: 'death-cache',
      aggregateId: cache.entityId,
      revision: cache.revision,
      tombstone: false,
      state: asJson({
        deathId: cache.deathId,
        ownerPlayerId: cache.ownerPlayerId,
        containerId: cache.containerId,
        position: {
          x: cache.position.x,
          y: cache.position.y,
        },
      }),
    }));
  }

  return Object.freeze(
    values.sort((left, right) =>
      left.aggregateType.localeCompare(right.aggregateType)
      || left.aggregateId.localeCompare(right.aggregateId),
    ),
  );
}

function itemResultRevisions(
  result: Readonly<ItemTransactionResult>,
): readonly RevisionRefV1[] {
  if (result.status !== 'committed') return Object.freeze([]);
  return Object.freeze([
    ...result.resultingRevisions.map((entry) => Object.freeze({
      aggregateType: 'container',
      aggregateId: entry.containerId,
      revision: entry.revision,
    })),
    ...result.resultingWorldRevisions.map((entry) => Object.freeze({
      aggregateType: entry.kind,
      aggregateId: entry.kind === 'resource'
        ? entry.resourceEntityId
        : entry.worldDropId,
      revision: entry.revision,
    })),
  ]);
}

function aggregateKey(view: {
  readonly aggregateType: string;
  readonly aggregateId: string;
}): string {
  return view.aggregateType + '\u0000' + view.aggregateId;
}

function reconcileAggregateViews(
  bundle: Phase1AuthorityBundle,
  known: Map<string, RevisionedAggregateViewV1>,
): readonly RevisionedAggregateViewV1[] {
  const current = aggregateViews(bundle);
  const currentKeys = new Set<string>();
  const values: RevisionedAggregateViewV1[] = [];

  for (const view of current) {
    const key = aggregateKey(view);
    currentKeys.add(key);
    const previous = known.get(key);
    if (
      previous !== undefined
      && previous.tombstone
      && view.revision <= previous.revision
    ) {
      throw new Error(
        'Hosted aggregate cannot resurrect at or below its tombstone revision.',
      );
    }
    known.set(key, view);
    values.push(view);
  }

  for (const [key, previous] of known) {
    if (currentKeys.has(key) || previous.tombstone) continue;
    if (previous.revision >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Hosted aggregate tombstone revision exhausted.');
    }
    const tombstone = Object.freeze({
      aggregateType: previous.aggregateType,
      aggregateId: previous.aggregateId,
      revision: previous.revision + 1,
      tombstone: true,
      state: null,
    }) satisfies RevisionedAggregateViewV1;
    known.set(key, tombstone);
    values.push(tombstone);
  }

  return Object.freeze(
    values.sort((left, right) =>
      left.aggregateType.localeCompare(right.aggregateType)
      || left.aggregateId.localeCompare(right.aggregateId),
    ),
  );
}

export interface Phase1HostedAuthorityCompositionConfig
  extends Omit<
    Phase1AuthorityBundleConfig,
    'playerIds' | 'activatePlayersOnCreate'
  > {
  readonly maxPlayers: 2 | 3 | 4;
  readonly persistence: HostedPersistencePort;
  readonly sessionId?: string;
  readonly sessionEpoch?: string;
  readonly reopen?: Phase1ReopenState;
}

export class Phase1HostedAuthorityComposition {
  public readonly bundle: Phase1AuthorityBundle;
  public readonly host: ServerAuthorityHost;

  private constructor(
    bundle: Phase1AuthorityBundle,
    host: ServerAuthorityHost,
    private readonly collectSharedViews:
      () => readonly RevisionedAggregateViewV1[],
  ) {
    this.bundle = bundle;
    this.host = host;
  }

  public static async create(
    config: Phase1HostedAuthorityCompositionConfig,
  ): Promise<Phase1HostedAuthorityComposition> {
    const playerIds = capacityPlayerIds(config.maxPlayers);
    const bundle = await Phase1AuthorityBundle.create({
      worldId: config.worldId,
      worldSeed: config.worldSeed,
      playerIds,
      interactionRangeWorldUnits:
        PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
      spawnClearanceRadiusWorldUnits:
        PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
      requiredAccessRadiusWorldUnits:
        PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
      ...(config.catalog === undefined ? {} : { catalog: config.catalog }),
      ...(config.reopen === undefined ? {} : { reopen: config.reopen }),
      activatePlayersOnCreate: false,
    });

    const knownAggregates =
      new Map<string, RevisionedAggregateViewV1>();
    const collectSharedViews = (): readonly RevisionedAggregateViewV1[] =>
      reconcileAggregateViews(bundle, knownAggregates);

    const replication = Object.freeze({
      afterCommand(): readonly RevisionedAggregateViewV1[] {
        return collectSharedViews();
      },
    });

    const dispatcher = new Phase1HostedCommandDispatcher({
      items: Object.freeze({
        execute(command) {
          return bundle.executeItemCommand(command);
        },
        beginGather(request) {
          return bundle.items.beginGather(request);
        },
        getActiveGatherOperationId(playerId) {
          return bundle.items.getActiveGatherOperationId(playerId);
        },
        cancelGather(playerId) {
          return bundle.items.cancelGather(playerId);
        },
        cancelAllGathers() {
          return bundle.items.cancelAllGathers();
        },
      }),
      buildings: Object.freeze({
        place(command) {
          return bundle.placeStructure(command);
        },
        dismantle(command) {
          return bundle.buildingAuthority.dismantle(command);
        },
      }),
      machines: Object.freeze({
        setEnabled(command) {
          return bundle.setCondenserEnabled(command);
        },
      }),
      death: bundle.death,
      combat: bundle.combat,
      ruins: bundle,
      replication,
    });

    const host = new ServerAuthorityHost({
      session: {
        worldId: config.worldId,
        maxPlayers: config.maxPlayers,
        contentCompatibility: bundle.getContentCompatibility(),
        worldCompatibility: bundle.getWorldCompatibility(),
        ...(config.sessionId === undefined
          ? {}
          : { sessionId: config.sessionId }),
        ...(config.sessionEpoch === undefined
          ? {}
          : { sessionEpoch: config.sessionEpoch }),
      },
      runtimeFactory: {
        create(playerId) {
          return bundle.createPlayerRuntime(playerId);
        },
      },
      commandDispatcher: dispatcher,
      persistence: config.persistence,
      ...(config.reopen === undefined
        ? {}
        : {
            initialDurabilityCheckpoint:
              config.reopen.durabilityCheckpoint,
          }),
    });
    host.start();

    const composition = new Phase1HostedAuthorityComposition(
      bundle,
      host,
      collectSharedViews,
    );
    composition.publishSharedState();
    return composition;
  }

  public async step(): Promise<readonly HostedOutboundMessage[]> {
    const nextTick = this.host.getAuthorityTick() + 1;
    await this.bundle.prepareAuthorityTick(nextTick);
    const outbound: HostedOutboundMessage[] = [...this.host.step()];
    await this.bundle.completeAuthorityTick(nextTick);

    for (const playerId of this.bundle.getActivePlayerIds()) {
      const gather = this.bundle.getLastGatherResult(playerId);
      if (gather === null || gather.status === 'idle'
        || gather.status === 'channeling') {
        continue;
      }

      if (gather.status === 'canceled') {
        if (this.host.hasPendingDomainCommand(gather.operationId)) {
          outbound.push(...this.host.resolvePendingDomainCommand(
            gather.operationId,
            Object.freeze({
              status: 'rejected',
              reason: gather.reason,
            }),
          ));
        }
        continue;
      }

      const result = gather.result;
      if (!this.host.hasPendingDomainCommand(result.operationId)) {
        continue;
      }
      outbound.push(...this.host.resolvePendingDomainCommand(
        result.operationId,
        result.status === 'committed'
          ? Object.freeze({
              status: 'committed',
              resultingRevisions: itemResultRevisions(result),
              aggregateUpdates: this.collectSharedViews(),
            })
          : Object.freeze({
              status: 'rejected',
              reason: result.reason,
            }),
      ));
    }

    outbound.push(...this.publishSharedState());
    return Object.freeze(outbound);
  }

  public publishSharedState(): readonly HostedOutboundMessage[] {
    const outbound: HostedOutboundMessage[] = [];
    for (const view of this.collectSharedViews()) {
      outbound.push(...this.host.publishAggregate(view));
    }
    return Object.freeze(outbound);
  }

  public async destroy(): Promise<void> {
    await this.bundle.destroy();
  }
}
