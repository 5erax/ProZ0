import { SIMULATION_HZ, type PlayerId } from '../../foundation';
import {
  ContentLookupError,
  type ContentCatalogV1,
  type ItemDefinitionV1,
  type RecipeDefinitionV1,
  type ResourceNodeDefinitionV1,
} from '../../content';
import type { ItemInteractionWorldPort } from '../../world';
import {
  NOOP_GATHER_COST_PORT,
  type GatherCostPort,
  type GatherCostReservation,
  type GatherCostReservationResult,
} from './GatherCostPort';
import {
  NOOP_ITEM_AUTHORITY_EVENT_SINK,
  type ItemAuthorityEvent,
  type ItemAuthorityEventSink,
} from './ItemAuthorityEvents';
import {
  ItemLedger,
  type LedgerMutationResult,
} from './ItemLedger';
import type {
  BeginGatherRequest,
  ConsumeItemCommand,
  CraftItemCommand,
  DropItemCommand,
  ItemCommand,
  MergeStacksCommand,
  PickupItemCommand,
  RepairItemCommand,
  SplitStackCommand,
  TransferItemCommand,
  WorkbenchAccessRef,
} from './ItemCommands';
import type {
  CommitDeathCacheItemsRequest,
  DeathCacheItemCommitResult,
} from './DeathItemTransaction';
import type {
  GatherStartResult,
  GatherTickResult,
  ItemTransactionResult,
  ResultingContainerRevision,
  ResultingWorldRevision,
  TransactionRejectionReason,
} from './ItemTransactionResults';
import type {
  ContainerId,
  ContainerState,
  ItemLedgerSnapshot,
  ItemStackId,
  ItemStackState,
  OperationId,
} from './ItemTypes';

interface CachedOperation {
  readonly signature: string;
  readonly result: ItemTransactionResult;
}

interface ActiveGatherChannel {
  readonly request: BeginGatherRequest;
  readonly signature: string;
  readonly resourceDefinition: Readonly<ResourceNodeDefinitionV1>;
  readonly requiredTicks: number;
  elapsedTicks: number;
}

export interface Phase1ItemAuthorityOptions {
  readonly catalog: ContentCatalogV1;
  readonly world: ItemInteractionWorldPort;
  readonly initialLedger: ItemLedgerSnapshot;
  readonly gatherCost?: GatherCostPort;
  readonly events?: ItemAuthorityEventSink;
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function operationIdValid(operationId: OperationId): boolean {
  return operationId.length > 0;
}

function itemCommandSignature(command: ItemCommand): string {
  switch (command.type) {
    case 'transfer':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.sourceContainerId,
        command.sourceExpectedRevision,
        command.targetContainerId,
        command.targetExpectedRevision,
        command.sourceStackId,
        command.quantity,
      ]);

    case 'split':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.containerId,
        command.expectedRevision,
        command.sourceStackId,
        command.quantity,
      ]);

    case 'merge':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.containerId,
        command.expectedRevision,
        command.sourceStackId,
        command.targetStackId,
      ]);

    case 'drop':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.inventoryContainerId,
        command.expectedInventoryRevision,
        command.sourceStackId,
        command.quantity,
      ]);

    case 'pickup':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.inventoryContainerId,
        command.expectedInventoryRevision,
        command.worldDropId,
        command.expectedWorldDropRevision,
        command.expectedDropContainerRevision,
      ]);

    case 'consume':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.inventoryContainerId,
        command.expectedInventoryRevision,
        command.sourceStackId,
      ]);

    case 'craft':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.inventoryContainerId,
        command.expectedInventoryRevision,
        command.recipeId,
        command.workbench === undefined
          ? null
          : [
              command.workbench.structureInstanceId,
              command.workbench.expectedRevision,
            ],
      ]);

    case 'repair':
      return JSON.stringify([
        command.type,
        command.operationId,
        command.playerId,
        command.inventoryContainerId,
        command.expectedInventoryRevision,
        command.targetStackId,
        [
          command.workbench.structureInstanceId,
          command.workbench.expectedRevision,
        ],
      ]);
  }
}

function gatherSignature(request: BeginGatherRequest): string {
  return JSON.stringify([
    'gather',
    request.operationId,
    request.playerId,
    request.inventoryContainerId,
    request.expectedInventoryRevision,
    request.resourceEntityId,
    request.expectedResourceRevision,
    request.toolStackId ?? null,
  ]);
}

function rejected(
  operationId: OperationId,
  reason: TransactionRejectionReason,
): ItemTransactionResult {
  return Object.freeze({
    status: 'rejected',
    operationId,
    reason,
  });
}

function committed(
  operationId: OperationId,
  resultingRevisions: readonly ResultingContainerRevision[],
  resultingWorldRevisions: readonly ResultingWorldRevision[],
  createdStackIds: readonly ItemStackId[],
  removedStackIds: readonly ItemStackId[],
): ItemTransactionResult {
  return Object.freeze({
    status: 'committed',
    operationId,
    resultingRevisions: Object.freeze(
      [...resultingRevisions].sort((left, right) =>
        compareStrings(left.containerId, right.containerId),
      ),
    ),
    resultingWorldRevisions: Object.freeze([...resultingWorldRevisions]),
    createdStackIds: Object.freeze([...createdStackIds].sort(compareStrings)),
    removedStackIds: Object.freeze([...removedStackIds].sort(compareStrings)),
  });
}

function createdContainerId(operationId: OperationId): ContainerId {
  return `generated-container:${operationId}:drop`;
}

function createdWorldDropId(operationId: OperationId): string {
  return `generated-drop:${operationId}`;
}

function createdStackId(
  operationId: OperationId,
  ordinal: number,
): ItemStackId {
  return `generated-stack:${operationId}:${ordinal}`;
}

function getItemDefinition(
  catalog: ContentCatalogV1,
  itemDefinitionId: string,
): Readonly<ItemDefinitionV1> | null {
  try {
    return catalog.getAs(itemDefinitionId, 'item');
  } catch (error) {
    if (error instanceof ContentLookupError) {
      return null;
    }
    throw error;
  }
}

function getRecipeDefinition(
  catalog: ContentCatalogV1,
  recipeId: string,
): Readonly<RecipeDefinitionV1> | null {
  try {
    return catalog.getAs(recipeId, 'recipe');
  } catch (error) {
    if (error instanceof ContentLookupError) {
      return null;
    }
    throw error;
  }
}

function getResourceDefinition(
  catalog: ContentCatalogV1,
  resourceDefinitionId: string,
): Readonly<ResourceNodeDefinitionV1> | null {
  try {
    return catalog.getAs(resourceDefinitionId, 'resource');
  } catch (error) {
    if (error instanceof ContentLookupError) {
      return null;
    }
    throw error;
  }
}

function removedIdsStillAbsent(
  draftStackIds: ReadonlySet<ItemStackId>,
  mutationResults: readonly LedgerMutationResult[],
): readonly ItemStackId[] {
  const removed = new Set<ItemStackId>();
  for (const result of mutationResults) {
    for (const stackId of result.removedStackIds) {
      if (!draftStackIds.has(stackId)) {
        removed.add(stackId);
      }
    }
  }
  return [...removed].sort(compareStrings);
}

function createdIds(
  mutationResults: readonly LedgerMutationResult[],
): readonly ItemStackId[] {
  const created = new Set<ItemStackId>();
  for (const result of mutationResults) {
    for (const stackId of result.createdStackIds) {
      created.add(stackId);
    }
  }
  return [...created].sort(compareStrings);
}

export class Phase1ItemAuthority {
  private readonly ledger: ItemLedger;
  private readonly gatherCost: GatherCostPort;
  private readonly events: ItemAuthorityEventSink;
  private readonly processedOperations = new Map<OperationId, CachedOperation>();
  private readonly processedDeathMoves =
    new Map<string, {
      readonly signature: string;
      readonly result: DeathCacheItemCommitResult;
    }>();
  private readonly pendingAuthorityEvents: ItemAuthorityEvent[] = [];
  private readonly activeGathersByPlayer = new Map<PlayerId, ActiveGatherChannel>();
  private readonly activeGatherOperationSignatures = new Map<OperationId, string>();

  public constructor(private readonly options: Phase1ItemAuthorityOptions) {
    this.ledger = new ItemLedger(options.catalog, options.initialLedger);
    this.gatherCost = options.gatherCost ?? NOOP_GATHER_COST_PORT;
    this.events = options.events ?? NOOP_ITEM_AUTHORITY_EVENT_SINK;
  }

  public getContainerView(containerId: ContainerId) {
    return this.ledger.getContainerView(containerId);
  }

  public exportLedgerSnapshot(): ItemLedgerSnapshot {
    return this.ledger.exportSnapshot();
  }

  public getPendingAuthorityEvents(): readonly Readonly<ItemAuthorityEvent>[] {
    return Object.freeze([...this.pendingAuthorityEvents]);
  }

  public flushPendingAuthorityEvents(): number {
    let delivered = 0;

    while (this.pendingAuthorityEvents.length > 0) {
      const event = this.pendingAuthorityEvents[0];
      if (event === undefined) {
        break;
      }

      try {
        this.events.emit(event);
      } catch {
        break;
      }

      this.pendingAuthorityEvents.shift();
      delivered += 1;
    }

    return delivered;
  }

  public commitDeathCacheItems(
    request: CommitDeathCacheItemsRequest,
  ): DeathCacheItemCommitResult {
    const signature = JSON.stringify([
      request.deathId,
      request.operationId,
      request.playerId,
      request.inventoryContainerId,
      request.expectedInventoryRevision,
      [...request.equippedStackIds].sort(compareStrings),
    ]);
    const cached = this.processedDeathMoves.get(request.deathId);
    if (cached !== undefined) {
      if (cached.signature === signature) {
        return cached.result;
      }
      return Object.freeze({
        status: 'rejected',
        deathId: request.deathId,
        operationId: request.operationId,
        reason: 'OPERATION_ID_CONFLICT',
      });
    }

    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(request.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== request.playerId
    ) {
      const result: DeathCacheItemCommitResult = Object.freeze({
        status: 'rejected',
        deathId: request.deathId,
        operationId: request.operationId,
        reason: 'SOURCE_MISSING',
      });
      this.processedDeathMoves.set(request.deathId, { signature, result });
      return result;
    }
    if (inventory.revision !== request.expectedInventoryRevision) {
      const result: DeathCacheItemCommitResult = Object.freeze({
        status: 'rejected',
        deathId: request.deathId,
        operationId: request.operationId,
        reason: 'STALE_REVISION',
      });
      this.processedDeathMoves.set(request.deathId, { signature, result });
      return result;
    }

    const equipped = new Set(request.equippedStackIds);
    const moved = inventory.stacks
      .map((stack) => ({ ...stack }))
      .sort((left, right) => compareStrings(left.stackId, right.stackId));
    const penalized: ItemStackId[] = [];

    for (const stack of moved) {
      if (!equipped.has(stack.stackId) || stack.condition === null) {
        continue;
      }
      const definition = getItemDefinition(
        this.options.catalog,
        stack.itemDefinitionId,
      );
      if (definition?.conditionMax === null || definition === null) {
        continue;
      }
      stack.condition = Math.max(0, stack.condition - 10);
      penalized.push(stack.stackId);
    }

    const cacheContainerId =
      moved.length === 0 ? null : `death-cache:${request.deathId}`;

    if (cacheContainerId !== null) {
      const createFailure = draft.createContainer({
        containerId: cacheContainerId,
        kind: 'death-cache',
        ownerPlayerId: null,
        revision: 0,
        stacks: [],
      });
      if (createFailure !== null) {
        const result: DeathCacheItemCommitResult = Object.freeze({
          status: 'rejected',
          deathId: request.deathId,
          operationId: request.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
        this.processedDeathMoves.set(request.deathId, { signature, result });
        return result;
      }
    }

    for (const stack of moved) {
      const removal = draft.removeQuantity(
        request.inventoryContainerId,
        stack.stackId,
        stack.quantity,
      );
      if (typeof removal === 'string') {
        throw new Error('Validated death inventory removal failed.');
      }
      if (cacheContainerId !== null) {
        const insertion = draft.insert({
          containerId: cacheContainerId,
          itemDefinitionId: stack.itemDefinitionId,
          quantity: stack.quantity,
          condition: stack.condition,
          operationId: request.operationId,
          generatedOrdinal: 0,
          preserveStackId: stack.stackId,
        });
        if (typeof insertion === 'string') {
          throw new Error('Validated death cache insertion failed.');
        }
      }
    }

    const inventoryRevision =
      moved.length === 0
        ? inventory.revision
        : draft.incrementRevision(request.inventoryContainerId);
    this.ledger.publish(draft);

    const result: DeathCacheItemCommitResult = Object.freeze({
      status: 'committed',
      deathId: request.deathId,
      operationId: request.operationId,
      inventoryRevision,
      cacheContainerId,
      cacheRevision: cacheContainerId === null ? null : 0,
      movedStackIds: Object.freeze(moved.map((stack) => stack.stackId)),
      penalizedStackIds: Object.freeze([...penalized].sort(compareStrings)),
    });
    this.processedDeathMoves.set(request.deathId, { signature, result });
    return result;
  }

  public execute(command: ItemCommand): ItemTransactionResult {
    const signature = itemCommandSignature(command);
    const cached = this.resolveCachedOperation(command.operationId, signature);
    if (cached !== null) {
      this.flushPendingAuthorityEvents();
      return cached;
    }

    if (
      !operationIdValid(command.operationId)
      || this.activeGatherOperationSignatures.has(command.operationId)
    ) {
      return rejected(command.operationId, 'OPERATION_ID_CONFLICT');
    }

    const result = this.executeUncached(command);
    this.processedOperations.set(command.operationId, {
      signature,
      result,
    });
    this.flushPendingAuthorityEvents();
    return result;
  }

  public beginGather(request: BeginGatherRequest): GatherStartResult {
    const signature = gatherSignature(request);
    const cached = this.processedOperations.get(request.operationId);

    if (cached !== undefined) {
      if (cached.signature === signature) {
        this.flushPendingAuthorityEvents();
        return Object.freeze({
          status: 'resolved',
          result: cached.result,
        });
      }
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'OPERATION_ID_CONFLICT',
      });
    }

    const activeSignature = this.activeGatherOperationSignatures.get(
      request.operationId,
    );
    if (activeSignature !== undefined) {
      if (activeSignature !== signature) {
        return Object.freeze({
          status: 'rejected',
          operationId: request.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }

      const active = this.activeGathersByPlayer.get(request.playerId);
      if (
        active === undefined
        || active.request.operationId !== request.operationId
      ) {
        return Object.freeze({
          status: 'rejected',
          operationId: request.operationId,
          reason: 'OPERATION_ID_CONFLICT',
        });
      }

      return Object.freeze({
        status: 'started',
        operationId: request.operationId,
        requiredTicks: active.requiredTicks,
      });
    }

    if (
      !operationIdValid(request.operationId)
      || this.activeGathersByPlayer.has(request.playerId)
    ) {
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: 'OPERATION_ID_CONFLICT',
      });
    }

    const validation = this.validateGatherStart(request);
    if (typeof validation === 'string') {
      const result = rejected(request.operationId, validation);
      this.processedOperations.set(request.operationId, {
        signature,
        result,
      });
      return Object.freeze({
        status: 'rejected',
        operationId: request.operationId,
        reason: validation,
      });
    }

    const requiredTicks = Math.round(
      validation.gatherChannelSeconds * SIMULATION_HZ,
    );
    const channel: ActiveGatherChannel = {
      request,
      signature,
      resourceDefinition: validation,
      requiredTicks,
      elapsedTicks: 0,
    };

    this.activeGathersByPlayer.set(request.playerId, channel);
    this.activeGatherOperationSignatures.set(request.operationId, signature);

    return Object.freeze({
      status: 'started',
      operationId: request.operationId,
      requiredTicks,
    });
  }

  public tickGather(playerId: PlayerId): GatherTickResult {
    const channel = this.activeGathersByPlayer.get(playerId);
    if (channel === undefined) {
      return Object.freeze({ status: 'idle' });
    }

    const resource = this.options.world.getResource(
      channel.request.resourceEntityId,
    );

    if (
      resource === null
      || resource.resourceDefinitionId
        !== channel.resourceDefinition.id
    ) {
      return this.cancelGatherInternal(channel, 'SOURCE_MISSING');
    }

    if (resource.depleted) {
      return this.cancelGatherInternal(channel, 'RESOURCE_DEPLETED');
    }

    if (
      !this.options.world.isResourceInInteractionRange(
        playerId,
        channel.request.resourceEntityId,
      )
    ) {
      return this.cancelGatherInternal(channel, 'OUT_OF_RANGE');
    }

    channel.elapsedTicks += 1;
    if (channel.elapsedTicks < channel.requiredTicks) {
      return Object.freeze({
        status: 'channeling',
        operationId: channel.request.operationId,
        elapsedTicks: channel.elapsedTicks,
        requiredTicks: channel.requiredTicks,
      });
    }

    const result = this.completeGather(channel);
    this.clearGather(channel);
    this.flushPendingAuthorityEvents();
    return Object.freeze({
      status: 'resolved',
      result,
    });
  }

  public cancelGather(playerId: PlayerId): boolean {
    const channel = this.activeGathersByPlayer.get(playerId);
    if (channel === undefined) {
      return false;
    }
    this.clearGather(channel);
    return true;
  }

  private executeUncached(command: ItemCommand): ItemTransactionResult {
    switch (command.type) {
      case 'transfer':
        return this.executeTransfer(command);
      case 'split':
        return this.executeSplit(command);
      case 'merge':
        return this.executeMerge(command);
      case 'drop':
        return this.executeDrop(command);
      case 'pickup':
        return this.executePickup(command);
      case 'consume':
        return this.executeConsume(command);
      case 'craft':
        return this.executeCraft(command);
      case 'repair':
        return this.executeRepair(command);
    }
  }

  private resolveCachedOperation(
    operationId: OperationId,
    signature: string,
  ): ItemTransactionResult | null {
    const cached = this.processedOperations.get(operationId);
    if (cached === undefined) {
      return null;
    }

    if (cached.signature !== signature) {
      return rejected(operationId, 'OPERATION_ID_CONFLICT');
    }

    return cached.result;
  }

  private canPlayerAccessContainer(
    playerId: PlayerId,
    container: Readonly<ContainerState>,
  ): boolean {
    if (container.kind === 'player-inventory') {
      return container.ownerPlayerId === playerId;
    }

    return this.options.world.isContainerAccessible(
      playerId,
      container.containerId,
    );
  }

  private executeTransfer(
    command: TransferItemCommand,
  ): ItemTransactionResult {
    if (
      !Number.isSafeInteger(command.quantity)
      || command.quantity <= 0
      || command.sourceContainerId === command.targetContainerId
    ) {
      return rejected(command.operationId, 'INVALID_QUANTITY');
    }

    const draft = this.ledger.createDraft();
    const source = draft.getContainer(command.sourceContainerId);
    const target = draft.getContainer(command.targetContainerId);
    if (source === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (target === null) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }

    if (
      source.revision !== command.sourceExpectedRevision
      || target.revision !== command.targetExpectedRevision
    ) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const pairValid = (
      source.kind === 'player-inventory'
      && target.kind === 'storage-crate'
    ) || (
      source.kind === 'storage-crate'
      && target.kind === 'player-inventory'
    ) || (
      source.kind === 'death-cache'
      && target.kind === 'player-inventory'
    );
    if (!pairValid) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }

    if (
      !this.canPlayerAccessContainer(command.playerId, source)
      || !this.canPlayerAccessContainer(command.playerId, target)
    ) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }

    const sourceStack = draft.requireStack(
      command.sourceContainerId,
      command.sourceStackId,
    );
    if (sourceStack === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (sourceStack.quantity < command.quantity) {
      return rejected(command.operationId, 'QUANTITY_UNAVAILABLE');
    }

    const sourceCopy: ItemStackState = {
      stackId: sourceStack.stackId,
      itemDefinitionId: sourceStack.itemDefinitionId,
      quantity: sourceStack.quantity,
      condition: sourceStack.condition,
    };

    const fullMove = command.quantity === sourceCopy.quantity;
    const mutations: LedgerMutationResult[] = [];

    const removal = draft.removeQuantity(
      command.sourceContainerId,
      command.sourceStackId,
      command.quantity,
    );
    if (typeof removal === 'string') {
      return rejected(command.operationId, removal);
    }
    mutations.push(removal);

    const insertion = draft.insert({
      containerId: command.targetContainerId,
      itemDefinitionId: sourceCopy.itemDefinitionId,
      quantity: command.quantity,
      condition: sourceCopy.condition,
      operationId: command.operationId,
      generatedOrdinal: 0,
      ...(fullMove ? { preserveStackId: sourceCopy.stackId } : {}),
    });
    if (typeof insertion === 'string') {
      return rejected(command.operationId, insertion);
    }
    mutations.push(insertion);

    const sourceRevision = draft.incrementRevision(command.sourceContainerId);
    const targetRevision = draft.incrementRevision(command.targetContainerId);
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [
        {
          containerId: command.sourceContainerId,
          revision: sourceRevision,
        },
        {
          containerId: command.targetContainerId,
          revision: targetRevision,
        },
      ],
      [],
      createdIds(mutations),
      removedIdsStillAbsent(draft.getStackIds(), mutations),
    );
  }

  private executeSplit(
    command: SplitStackCommand,
  ): ItemTransactionResult {
    if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      return rejected(command.operationId, 'INVALID_QUANTITY');
    }

    const draft = this.ledger.createDraft();
    const container = draft.getContainer(command.containerId);
    if (container === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (container.revision !== command.expectedRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }
    if (!this.canPlayerAccessContainer(command.playerId, container)) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }

    const source = draft.requireStack(
      command.containerId,
      command.sourceStackId,
    );
    if (source === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (command.quantity >= source.quantity) {
      return rejected(command.operationId, 'INVALID_QUANTITY');
    }

    const item = getItemDefinition(
      this.options.catalog,
      source.itemDefinitionId,
    );
    if (
      item === null
      || item.conditionMax !== null
      || item.maxStack <= 1
    ) {
      return rejected(command.operationId, 'STACK_INCOMPATIBLE');
    }

    const newStackId = createdStackId(command.operationId, 0);
    if (draft.getStackIds().has(newStackId)) {
      return rejected(command.operationId, 'OPERATION_ID_CONFLICT');
    }

    source.quantity -= command.quantity;
    container.stacks.push({
      stackId: newStackId,
      itemDefinitionId: source.itemDefinitionId,
      quantity: command.quantity,
      condition: null,
    });

    const revision = draft.incrementRevision(command.containerId);
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [{ containerId: command.containerId, revision }],
      [],
      [newStackId],
      [],
    );
  }

  private executeMerge(
    command: MergeStacksCommand,
  ): ItemTransactionResult {
    if (command.sourceStackId === command.targetStackId) {
      return rejected(command.operationId, 'STACK_INCOMPATIBLE');
    }

    const draft = this.ledger.createDraft();
    const container = draft.getContainer(command.containerId);
    if (container === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (container.revision !== command.expectedRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }
    if (!this.canPlayerAccessContainer(command.playerId, container)) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }

    const source = draft.requireStack(
      command.containerId,
      command.sourceStackId,
    );
    const target = draft.requireStack(
      command.containerId,
      command.targetStackId,
    );
    if (source === null || target === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }

    const item = getItemDefinition(
      this.options.catalog,
      source.itemDefinitionId,
    );
    if (
      item === null
      || source.itemDefinitionId !== target.itemDefinitionId
      || source.condition !== null
      || target.condition !== null
      || item.maxStack <= 1
    ) {
      return rejected(command.operationId, 'STACK_INCOMPATIBLE');
    }

    const available = item.maxStack - target.quantity;
    if (available <= 0) {
      return rejected(command.operationId, 'STACK_LIMIT');
    }

    const moved = Math.min(available, source.quantity);
    target.quantity += moved;
    source.quantity -= moved;

    const removed: ItemStackId[] = [];
    if (source.quantity === 0) {
      const index = container.stacks.findIndex(
        (stack) => stack.stackId === source.stackId,
      );
      if (index >= 0) {
        container.stacks.splice(index, 1);
        removed.push(source.stackId);
      }
    }

    const revision = draft.incrementRevision(command.containerId);
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [{ containerId: command.containerId, revision }],
      [],
      [],
      removed,
    );
  }

  private executeDrop(command: DropItemCommand): ItemTransactionResult {
    if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      return rejected(command.operationId, 'INVALID_QUANTITY');
    }

    const placement = this.options.world.resolveDropPlacement(command.playerId);
    if (placement === null) {
      return rejected(command.operationId, 'INVALID_WORLD_PLACEMENT');
    }

    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(command.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== command.playerId
    ) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (inventory.revision !== command.expectedInventoryRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const source = draft.requireStack(
      command.inventoryContainerId,
      command.sourceStackId,
    );
    if (source === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (source.quantity < command.quantity) {
      return rejected(command.operationId, 'QUANTITY_UNAVAILABLE');
    }

    const sourceCopy = { ...source };
    const fullMove = source.quantity === command.quantity;
    const dropContainerId = createdContainerId(command.operationId);
    const worldDropId = createdWorldDropId(command.operationId);

    const createContainerFailure = draft.createContainer({
      containerId: dropContainerId,
      kind: 'world-drop',
      ownerPlayerId: null,
      revision: 0,
      stacks: [],
    });
    if (createContainerFailure !== null) {
      return rejected(command.operationId, createContainerFailure);
    }

    const removal = draft.removeQuantity(
      command.inventoryContainerId,
      command.sourceStackId,
      command.quantity,
    );
    if (typeof removal === 'string') {
      return rejected(command.operationId, removal);
    }

    const insertion = draft.insert({
      containerId: dropContainerId,
      itemDefinitionId: sourceCopy.itemDefinitionId,
      quantity: command.quantity,
      condition: sourceCopy.condition,
      operationId: command.operationId,
      generatedOrdinal: 0,
      ...(fullMove ? { preserveStackId: sourceCopy.stackId } : {}),
    });
    if (typeof insertion === 'string') {
      return rejected(command.operationId, insertion);
    }

    const worldDrop = this.options.world.commitCreateWorldDrop({
      worldDropId,
      containerId: dropContainerId,
      placement,
    });
    if (worldDrop === null) {
      return rejected(command.operationId, 'INVALID_WORLD_PLACEMENT');
    }

    const inventoryRevision = draft.incrementRevision(
      command.inventoryContainerId,
    );
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [
        {
          containerId: command.inventoryContainerId,
          revision: inventoryRevision,
        },
        {
          containerId: dropContainerId,
          revision: 0,
        },
      ],
      [
        {
          kind: 'world-drop',
          worldDropId,
          revision: worldDrop.revision,
        },
      ],
      createdIds([removal, insertion]),
      removedIdsStillAbsent(draft.getStackIds(), [removal, insertion]),
    );
  }

  private executePickup(
    command: PickupItemCommand,
  ): ItemTransactionResult {
    const drop = this.options.world.getWorldDrop(command.worldDropId);
    if (drop === null || !drop.available) {
      return rejected(command.operationId, 'TARGET_ALREADY_TAKEN');
    }
    if (drop.revision !== command.expectedWorldDropRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }
    if (
      !this.options.world.isWorldDropInInteractionRange(
        command.playerId,
        command.worldDropId,
      )
    ) {
      return rejected(command.operationId, 'OUT_OF_RANGE');
    }

    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(command.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== command.playerId
    ) {
      return rejected(command.operationId, 'TARGET_UNAVAILABLE');
    }
    if (inventory.revision !== command.expectedInventoryRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const dropContainer = draft.getContainer(drop.containerId);
    if (dropContainer === null || dropContainer.kind !== 'world-drop') {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (dropContainer.revision !== command.expectedDropContainerRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const mutations: LedgerMutationResult[] = [];
    let ordinal = 0;

    const sourceStacks = [...dropContainer.stacks].sort((left, right) =>
      compareStrings(left.stackId, right.stackId),
    );

    for (const stack of sourceStacks) {
      const removal = draft.removeQuantity(
        drop.containerId,
        stack.stackId,
        stack.quantity,
      );
      if (typeof removal === 'string') {
        return rejected(command.operationId, removal);
      }
      mutations.push(removal);

      const insertion = draft.insert({
        containerId: command.inventoryContainerId,
        itemDefinitionId: stack.itemDefinitionId,
        quantity: stack.quantity,
        condition: stack.condition,
        operationId: command.operationId,
        generatedOrdinal: ordinal,
        preserveStackId: stack.stackId,
      });
      if (typeof insertion === 'string') {
        return rejected(command.operationId, insertion);
      }
      ordinal = insertion.nextGeneratedOrdinal;
      mutations.push(insertion);
    }

    const worldResult = this.options.world.commitTakeWorldDrop(
      command.worldDropId,
      command.expectedWorldDropRevision,
    );
    if (worldResult === null) {
      return rejected(command.operationId, 'TARGET_ALREADY_TAKEN');
    }

    draft.removeContainer(drop.containerId);
    const inventoryRevision = draft.incrementRevision(
      command.inventoryContainerId,
    );
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [
        {
          containerId: command.inventoryContainerId,
          revision: inventoryRevision,
        },
      ],
      [
        {
          kind: 'world-drop',
          worldDropId: command.worldDropId,
          revision: worldResult.revision,
        },
      ],
      createdIds(mutations),
      removedIdsStillAbsent(draft.getStackIds(), mutations),
    );
  }

  private executeConsume(command: ConsumeItemCommand): ItemTransactionResult {
    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(command.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== command.playerId
    ) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (inventory.revision !== command.expectedInventoryRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const source = draft.requireStack(
      command.inventoryContainerId,
      command.sourceStackId,
    );
    if (source === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }

    const definition = getItemDefinition(
      this.options.catalog,
      source.itemDefinitionId,
    );
    if (
      definition === null
      || !definition.capabilities.includes('consumable')
    ) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }

    const removal = draft.removeQuantity(
      command.inventoryContainerId,
      command.sourceStackId,
      1,
    );
    if (typeof removal === 'string') {
      return rejected(command.operationId, removal);
    }

    const revision = draft.incrementRevision(command.inventoryContainerId);
    this.ledger.publish(draft);

    return committed(
      command.operationId,
      [{ containerId: command.inventoryContainerId, revision }],
      [],
      createdIds([removal]),
      removedIdsStillAbsent(draft.getStackIds(), [removal]),
    );
  }

  private executeCraft(command: CraftItemCommand): ItemTransactionResult {
    const recipe = getRecipeDefinition(this.options.catalog, command.recipeId);
    if (recipe === null) {
      return rejected(command.operationId, 'INVALID_RECIPE');
    }

    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(command.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== command.playerId
    ) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (inventory.revision !== command.expectedInventoryRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const stationFailure = this.validateWorkbench(
      command.playerId,
      recipe,
      command.workbench,
    );
    if (stationFailure !== null) {
      return rejected(command.operationId, stationFailure);
    }

    const mutations: LedgerMutationResult[] = [];
    for (const input of recipe.inputs) {
      const consumed = this.consumeDefinitionQuantity(
        draft,
        command.inventoryContainerId,
        input.itemId,
        input.quantity,
      );
      if (typeof consumed === 'string') {
        return rejected(command.operationId, consumed);
      }
      mutations.push(...consumed);
    }

    let ordinal = 0;
    for (const output of recipe.outputs) {
      const item = getItemDefinition(this.options.catalog, output.itemId);
      if (item === null) {
        return rejected(command.operationId, 'INVALID_RECIPE');
      }

      const insertion = draft.insert({
        containerId: command.inventoryContainerId,
        itemDefinitionId: output.itemId,
        quantity: output.quantity,
        condition:
          item.conditionMax === null
            ? null
            : output.initialCondition ?? item.conditionMax,
        operationId: command.operationId,
        generatedOrdinal: ordinal,
      });
      if (typeof insertion === 'string') {
        return rejected(command.operationId, insertion);
      }
      ordinal = insertion.nextGeneratedOrdinal;
      mutations.push(insertion);
    }

    const revision = draft.incrementRevision(command.inventoryContainerId);
    this.ledger.publish(draft);

    const result = committed(
      command.operationId,
      [{ containerId: command.inventoryContainerId, revision }],
      [],
      createdIds(mutations),
      removedIdsStillAbsent(draft.getStackIds(), mutations),
    );

    this.recordAuthorityEvent(Object.freeze({
      type: 'craft-completed',
      operationId: command.operationId,
      playerId: command.playerId,
      recipeId: recipe.id,
    }));

    return result;
  }

  private executeRepair(command: RepairItemCommand): ItemTransactionResult {
    const workbenchFailure = this.validateWorkbenchAccess(
      command.playerId,
      command.workbench,
    );
    if (workbenchFailure !== null) {
      return rejected(command.operationId, workbenchFailure);
    }

    const draft = this.ledger.createDraft();
    const inventory = draft.getContainer(command.inventoryContainerId);
    if (
      inventory === null
      || inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== command.playerId
    ) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }
    if (inventory.revision !== command.expectedInventoryRevision) {
      return rejected(command.operationId, 'STALE_REVISION');
    }

    const target = draft.requireStack(
      command.inventoryContainerId,
      command.targetStackId,
    );
    if (target === null) {
      return rejected(command.operationId, 'SOURCE_MISSING');
    }

    const item = getItemDefinition(
      this.options.catalog,
      target.itemDefinitionId,
    );
    if (item === null || item.conditionMax === null || target.condition === null) {
      return rejected(command.operationId, 'INVALID_REPAIR_TARGET');
    }
    if (target.condition >= item.conditionMax) {
      return rejected(command.operationId, 'ITEM_FULL_CONDITION');
    }

    const conditionBefore = target.condition;
    const consumed = this.consumeDefinitionQuantity(
      draft,
      command.inventoryContainerId,
      'item:repair-patch',
      1,
    );
    if (typeof consumed === 'string') {
      return rejected(command.operationId, consumed);
    }

    const conditionAfter = Math.min(
      item.conditionMax,
      conditionBefore + 25,
    );
    const conditionFailure = draft.setCondition(
      command.inventoryContainerId,
      command.targetStackId,
      conditionAfter,
    );
    if (conditionFailure !== null) {
      return rejected(command.operationId, conditionFailure);
    }

    const revision = draft.incrementRevision(command.inventoryContainerId);
    this.ledger.publish(draft);

    const result = committed(
      command.operationId,
      [{ containerId: command.inventoryContainerId, revision }],
      [],
      createdIds(consumed),
      removedIdsStillAbsent(draft.getStackIds(), consumed),
    );

    this.recordAuthorityEvent(Object.freeze({
      type: 'repair-completed',
      operationId: command.operationId,
      playerId: command.playerId,
      targetStackId: command.targetStackId,
      conditionBefore,
      conditionAfter,
    }));

    return result;
  }

  private validateWorkbench(
    playerId: PlayerId,
    recipe: Readonly<RecipeDefinitionV1>,
    workbench: WorkbenchAccessRef | undefined,
  ): TransactionRejectionReason | null {
    if (recipe.tier === 'hand') {
      return null;
    }
    if (workbench === undefined) {
      return 'STATION_REQUIRED';
    }
    return this.validateWorkbenchAccess(playerId, workbench);
  }

  private validateWorkbenchAccess(
    playerId: PlayerId,
    workbenchRef: WorkbenchAccessRef,
  ): TransactionRejectionReason | null {
    const workbench = this.options.world.getWorkbench(
      workbenchRef.structureInstanceId,
    );
    if (
      workbench === null
      || !workbench.functional
      || !this.options.world.isWorkbenchAccessible(
        playerId,
        workbenchRef.structureInstanceId,
      )
    ) {
      return 'STATION_REQUIRED';
    }
    if (workbench.revision !== workbenchRef.expectedRevision) {
      return 'STALE_REVISION';
    }
    return null;
  }

  private consumeDefinitionQuantity(
    draft: ReturnType<ItemLedger['createDraft']>,
    containerId: ContainerId,
    itemDefinitionId: string,
    quantity: number,
  ): readonly LedgerMutationResult[] | TransactionRejectionReason {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return 'INVALID_QUANTITY';
    }

    const container = draft.getContainer(containerId);
    if (container === null) {
      return 'SOURCE_MISSING';
    }

    const candidates = container.stacks
      .filter((stack) => stack.itemDefinitionId === itemDefinitionId)
      .sort((left, right) => compareStrings(left.stackId, right.stackId));

    const available = candidates.reduce(
      (sum, stack) => sum + stack.quantity,
      0,
    );
    if (available < quantity) {
      return 'QUANTITY_UNAVAILABLE';
    }

    let remaining = quantity;
    const mutations: LedgerMutationResult[] = [];
    for (const stack of candidates) {
      if (remaining === 0) {
        break;
      }
      const consumed = Math.min(stack.quantity, remaining);
      const mutation = draft.removeQuantity(
        containerId,
        stack.stackId,
        consumed,
      );
      if (typeof mutation === 'string') {
        return mutation;
      }
      mutations.push(mutation);
      remaining -= consumed;
    }

    return Object.freeze(mutations);
  }

  private validateGatherStart(
    request: BeginGatherRequest,
  ): Readonly<ResourceNodeDefinitionV1> | TransactionRejectionReason {
    const inventory = this.ledger.getContainerView(
      request.inventoryContainerId,
    );
    if (
      inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== request.playerId
    ) {
      return 'SOURCE_MISSING';
    }
    if (inventory.revision !== request.expectedInventoryRevision) {
      return 'STALE_REVISION';
    }

    const resource = this.options.world.getResource(request.resourceEntityId);
    if (resource === null) {
      return 'SOURCE_MISSING';
    }
    if (resource.revision !== request.expectedResourceRevision) {
      return 'STALE_REVISION';
    }
    if (resource.depleted) {
      return 'RESOURCE_DEPLETED';
    }
    if (
      !this.options.world.isResourceInInteractionRange(
        request.playerId,
        request.resourceEntityId,
      )
    ) {
      return 'OUT_OF_RANGE';
    }

    const definition = getResourceDefinition(
      this.options.catalog,
      resource.resourceDefinitionId,
    );
    if (definition === null) {
      return 'SOURCE_MISSING';
    }

    const toolFailure = this.validateGatherTool(
      inventory.stacks,
      definition,
      request.toolStackId,
    );
    if (toolFailure !== null) {
      return toolFailure;
    }

    if (
      !this.gatherCost.canStartGather(
        request.playerId,
        definition.id,
      )
    ) {
      return 'INSUFFICIENT_STAMINA';
    }

    const draft = this.ledger.createDraft();
    const outputItem = getItemDefinition(
      this.options.catalog,
      definition.output.itemId,
    );
    if (outputItem === null) {
      return 'SOURCE_MISSING';
    }

    const insertion = draft.insert({
      containerId: request.inventoryContainerId,
      itemDefinitionId: definition.output.itemId,
      quantity: definition.output.quantity,
      condition:
        outputItem.conditionMax === null
          ? null
          : definition.output.initialCondition ?? outputItem.conditionMax,
      operationId: request.operationId,
      generatedOrdinal: 0,
    });
    if (typeof insertion === 'string') {
      return insertion;
    }

    return definition;
  }

  private validateGatherTool(
    stacks: readonly ItemStackState[],
    definition: Readonly<ResourceNodeDefinitionV1>,
    toolStackId: ItemStackId | undefined,
  ): TransactionRejectionReason | null {
    if (definition.requiredToolItemId === null) {
      return null;
    }
    if (toolStackId === undefined) {
      return 'TOOL_REQUIRED';
    }

    const tool = stacks.find((stack) => stack.stackId === toolStackId);
    if (
      tool === undefined
      || tool.itemDefinitionId !== definition.requiredToolItemId
    ) {
      return 'TOOL_REQUIRED';
    }

    if (tool.condition === null || tool.condition <= 0) {
      return 'TOOL_BROKEN';
    }

    return null;
  }

  private completeGather(
    channel: ActiveGatherChannel,
  ): ItemTransactionResult {
    const request = channel.request;
    const cached = this.processedOperations.get(request.operationId);
    if (cached !== undefined) {
      if (cached.signature === channel.signature) {
        return cached.result;
      }
      return rejected(request.operationId, 'OPERATION_ID_CONFLICT');
    }

    const resource = this.options.world.getResource(request.resourceEntityId);
    if (resource === null) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'SOURCE_MISSING'),
      );
    }
    if (resource.revision !== request.expectedResourceRevision) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'STALE_REVISION'),
      );
    }
    if (resource.depleted) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'RESOURCE_DEPLETED'),
      );
    }
    if (
      !this.options.world.isResourceInInteractionRange(
        request.playerId,
        request.resourceEntityId,
      )
    ) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'OUT_OF_RANGE'),
      );
    }

    const inventory = this.ledger.getContainerView(
      request.inventoryContainerId,
    );
    if (
      inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== request.playerId
    ) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'SOURCE_MISSING'),
      );
    }
    if (inventory.revision !== request.expectedInventoryRevision) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'STALE_REVISION'),
      );
    }

    const toolFailure = this.validateGatherTool(
      inventory.stacks,
      channel.resourceDefinition,
      request.toolStackId,
    );
    if (toolFailure !== null) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, toolFailure),
      );
    }

    const draft = this.ledger.createDraft();
    const outputItem = getItemDefinition(
      this.options.catalog,
      channel.resourceDefinition.output.itemId,
    );
    if (outputItem === null) {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'SOURCE_MISSING'),
      );
    }

    const insertion = draft.insert({
      containerId: request.inventoryContainerId,
      itemDefinitionId: channel.resourceDefinition.output.itemId,
      quantity: channel.resourceDefinition.output.quantity,
      condition:
        outputItem.conditionMax === null
          ? null
          : channel.resourceDefinition.output.initialCondition
            ?? outputItem.conditionMax,
      operationId: request.operationId,
      generatedOrdinal: 0,
    });
    if (typeof insertion === 'string') {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, insertion),
      );
    }

    if (
      channel.resourceDefinition.toolConditionCostPerSuccessfulGather > 0
      && request.toolStackId !== undefined
    ) {
      const tool = draft.requireStack(
        request.inventoryContainerId,
        request.toolStackId,
      );
      if (tool === null || tool.condition === null) {
        return this.cacheGatherResult(
          channel,
          rejected(request.operationId, 'TOOL_REQUIRED'),
        );
      }
      const conditionAfter = Math.max(
        0,
        tool.condition
          - channel.resourceDefinition.toolConditionCostPerSuccessfulGather,
      );
      const conditionFailure = draft.setCondition(
        request.inventoryContainerId,
        request.toolStackId,
        conditionAfter,
      );
      if (conditionFailure !== null) {
        return this.cacheGatherResult(
          channel,
          rejected(request.operationId, conditionFailure),
        );
      }
    }

    const costReservation = this.reserveGatherCost(channel);
    if (typeof costReservation === 'string') {
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, costReservation),
      );
    }

    const worldResult = this.options.world.commitGather(
      request.resourceEntityId,
      request.expectedResourceRevision,
    );
    if (worldResult === null) {
      this.gatherCost.releaseGatherCostReservation(costReservation);
      return this.cacheGatherResult(
        channel,
        rejected(request.operationId, 'STALE_REVISION'),
      );
    }

    this.gatherCost.commitReservedGatherCost(costReservation);

    const revision = draft.incrementRevision(request.inventoryContainerId);
    this.ledger.publish(draft);

    const result = committed(
      request.operationId,
      [{ containerId: request.inventoryContainerId, revision }],
      [
        {
          kind: 'resource',
          resourceEntityId: request.resourceEntityId,
          revision: worldResult.revision,
        },
      ],
      insertion.createdStackIds,
      [],
    );

    this.cacheGatherResult(channel, result);
    this.recordAuthorityEvent(Object.freeze({
      type: 'gather-completed',
      operationId: request.operationId,
      playerId: request.playerId,
      resourceEntityId: request.resourceEntityId,
      resourceDefinitionId: channel.resourceDefinition.id,
    }));

    return result;
  }

  private recordAuthorityEvent(event: Readonly<ItemAuthorityEvent>): void {
    this.pendingAuthorityEvents.push(event);
  }

  private reserveGatherCost(
    channel: ActiveGatherChannel,
  ): Readonly<GatherCostReservation> | TransactionRejectionReason {
    let reservationResult: GatherCostReservationResult;

    try {
      reservationResult = this.gatherCost.reserveGatherCost({
        operationId: channel.request.operationId,
        playerId: channel.request.playerId,
        resourceDefinitionId: channel.resourceDefinition.id,
      });
    } catch {
      return 'GATHER_COST_RESERVATION_FAILED';
    }

    if (reservationResult.status === 'rejected') {
      return reservationResult.reason;
    }

    return reservationResult.reservation;
  }

  private cacheGatherResult(
    channel: ActiveGatherChannel,
    result: ItemTransactionResult,
  ): ItemTransactionResult {
    this.processedOperations.set(channel.request.operationId, {
      signature: channel.signature,
      result,
    });
    return result;
  }

  private cancelGatherInternal(
    channel: ActiveGatherChannel,
    reason: TransactionRejectionReason,
  ): GatherTickResult {
    this.clearGather(channel);
    return Object.freeze({
      status: 'canceled',
      operationId: channel.request.operationId,
      reason,
    });
  }

  private clearGather(channel: ActiveGatherChannel): void {
    this.activeGathersByPlayer.delete(channel.request.playerId);
    this.activeGatherOperationSignatures.delete(channel.request.operationId);
  }
}
