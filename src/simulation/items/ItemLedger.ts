import type {
  ContentCatalogV1,
  ItemDefinitionV1,
} from '../../content';
import {
  computeContainerUsage,
  getPlayerWeightState,
  validateContainerAbsoluteCapacity,
  validateInboundCapacityTransition,
} from './ItemCapacity';
import type {
  ContainerId,
  ContainerState,
  ContainerView,
  ItemLedgerSnapshot,
  ItemStackId,
  ItemStackState,
  OperationId,
} from './ItemTypes';
import type { TransactionRejectionReason } from './ItemTransactionResults';

interface MutableItemStackState {
  stackId: ItemStackId;
  itemDefinitionId: string;
  quantity: number;
  condition: number | null;
}

interface MutableContainerState {
  containerId: ContainerId;
  kind: ContainerState['kind'];
  revision: number;
  stacks: MutableItemStackState[];
}

export interface LedgerMutationResult {
  readonly createdStackIds: readonly ItemStackId[];
  readonly removedStackIds: readonly ItemStackId[];
}

export interface InsertRequest {
  readonly containerId: ContainerId;
  readonly itemDefinitionId: string;
  readonly quantity: number;
  readonly condition: number | null;
  readonly operationId: OperationId;
  readonly generatedOrdinal: number;
  readonly preserveStackId?: ItemStackId;
  readonly validateInboundFrom?: Readonly<ContainerState>;
}

export interface InsertResult extends LedgerMutationResult {
  readonly nextGeneratedOrdinal: number;
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

function freezeStack(stack: MutableItemStackState): Readonly<ItemStackState> {
  return Object.freeze({
    stackId: stack.stackId,
    itemDefinitionId: stack.itemDefinitionId,
    quantity: stack.quantity,
    condition: stack.condition,
  });
}

function freezeContainer(
  container: MutableContainerState,
): Readonly<ContainerState> {
  return Object.freeze({
    containerId: container.containerId,
    kind: container.kind,
    revision: container.revision,
    stacks: Object.freeze(
      [...container.stacks]
        .sort((left, right) => compareStrings(left.stackId, right.stackId))
        .map(freezeStack),
    ),
  });
}

function cloneContainer(
  container: Readonly<ContainerState>,
): MutableContainerState {
  return {
    containerId: container.containerId,
    kind: container.kind,
    revision: container.revision,
    stacks: container.stacks.map((stack) => ({ ...stack })),
  };
}

function generatedStackId(
  operationId: OperationId,
  ordinal: number,
): ItemStackId {
  return `generated-stack:${operationId}:${ordinal}`;
}

export class ItemLedgerDraft {
  private readonly containers: Map<ContainerId, MutableContainerState>;

  public constructor(
    private readonly catalog: ContentCatalogV1,
    snapshot: ItemLedgerSnapshot,
  ) {
    this.containers = new Map(
      snapshot.containers.map((container) => [
        container.containerId,
        cloneContainer(container),
      ]),
    );
  }

  public getContainer(
    containerId: ContainerId,
  ): MutableContainerState | null {
    return this.containers.get(containerId) ?? null;
  }

  public requireStack(
    containerId: ContainerId,
    stackId: ItemStackId,
  ): MutableItemStackState | null {
    const container = this.getContainer(containerId);
    if (container === null) {
      return null;
    }
    return container.stacks.find((stack) => stack.stackId === stackId) ?? null;
  }

  public getStackIds(): ReadonlySet<ItemStackId> {
    const ids = new Set<ItemStackId>();
    for (const container of this.containers.values()) {
      for (const stack of container.stacks) {
        ids.add(stack.stackId);
      }
    }
    return ids;
  }

  public removeQuantity(
    containerId: ContainerId,
    stackId: ItemStackId,
    quantity: number,
  ): LedgerMutationResult | TransactionRejectionReason {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return 'INVALID_QUANTITY';
    }

    const container = this.getContainer(containerId);
    if (container === null) {
      return 'SOURCE_MISSING';
    }

    const stackIndex = container.stacks.findIndex(
      (stack) => stack.stackId === stackId,
    );
    if (stackIndex < 0) {
      return 'SOURCE_MISSING';
    }

    const stack = container.stacks[stackIndex];
    if (stack === undefined || stack.quantity < quantity) {
      return 'QUANTITY_UNAVAILABLE';
    }

    if (stack.quantity === quantity) {
      container.stacks.splice(stackIndex, 1);
      return Object.freeze({
        createdStackIds: Object.freeze([]),
        removedStackIds: Object.freeze([stackId]),
      });
    }

    stack.quantity -= quantity;
    return Object.freeze({
      createdStackIds: Object.freeze([]),
      removedStackIds: Object.freeze([]),
    });
  }

  public insert(request: InsertRequest): InsertResult | TransactionRejectionReason {
    if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
      return 'INVALID_QUANTITY';
    }

    const container = this.getContainer(request.containerId);
    if (container === null) {
      return 'TARGET_UNAVAILABLE';
    }

    const item = this.catalog.getAs(request.itemDefinitionId, 'item');
    if (request.quantity > item.maxStack) {
      return 'STACK_LIMIT';
    }

    if (item.conditionMax !== null) {
      if (
        request.quantity !== 1
        || request.condition === null
        || request.condition < 0
        || request.condition > item.conditionMax
      ) {
        return 'STACK_INCOMPATIBLE';
      }
    } else if (request.condition !== null) {
      return 'STACK_INCOMPATIBLE';
    }

    const currentUsage = computeContainerUsage(
      this.catalog,
      request.validateInboundFrom?.stacks ?? freezeContainer(container).stacks,
    );

    const projectedStacks = container.stacks.map((stack) => ({ ...stack }));
    let remaining = request.quantity;

    if (item.conditionMax === null && item.maxStack > 1) {
      const mergeTargets = projectedStacks
        .filter(
          (stack) =>
            stack.itemDefinitionId === request.itemDefinitionId
            && stack.condition === null
            && stack.quantity < item.maxStack,
        )
        .sort((left, right) => compareStrings(left.stackId, right.stackId));

      for (const target of mergeTargets) {
        if (remaining === 0) {
          break;
        }
        const capacity = item.maxStack - target.quantity;
        const moved = Math.min(capacity, remaining);
        target.quantity += moved;
        remaining -= moved;
      }
    }

    const createdStackIds: ItemStackId[] = [];
    let nextGeneratedOrdinal = request.generatedOrdinal;

    if (remaining > 0) {
      let stackId = request.preserveStackId;
      if (stackId === undefined) {
        stackId = generatedStackId(request.operationId, nextGeneratedOrdinal);
        nextGeneratedOrdinal += 1;
      }

      const allIds = this.getStackIds();
      if (
        allIds.has(stackId)
        && !container.stacks.some((stack) => stack.stackId === stackId)
      ) {
        return 'OPERATION_ID_CONFLICT';
      }
      if (projectedStacks.some((stack) => stack.stackId === stackId)) {
        return 'OPERATION_ID_CONFLICT';
      }

      projectedStacks.push({
        stackId,
        itemDefinitionId: request.itemDefinitionId,
        quantity: remaining,
        condition: request.condition,
      });
      createdStackIds.push(stackId);
    }

    const projectedUsage = computeContainerUsage(
      this.catalog,
      projectedStacks,
    );
    const capacityFailure = request.validateInboundFrom === undefined
      ? validateContainerAbsoluteCapacity(container.kind, projectedUsage)
      : validateInboundCapacityTransition(
          container.kind,
          currentUsage,
          projectedUsage,
        );

    if (capacityFailure !== null) {
      return capacityFailure;
    }

    container.stacks = projectedStacks;
    return Object.freeze({
      createdStackIds: Object.freeze(createdStackIds),
      removedStackIds: Object.freeze([]),
      nextGeneratedOrdinal,
    });
  }

  public setCondition(
    containerId: ContainerId,
    stackId: ItemStackId,
    condition: number,
  ): TransactionRejectionReason | null {
    const stack = this.requireStack(containerId, stackId);
    if (stack === null) {
      return 'SOURCE_MISSING';
    }

    const item = this.catalog.getAs(stack.itemDefinitionId, 'item');
    if (
      item.conditionMax === null
      || !Number.isSafeInteger(condition)
      || condition < 0
      || condition > item.conditionMax
    ) {
      return 'INVALID_REPAIR_TARGET';
    }

    stack.condition = condition;
    return null;
  }

  public incrementRevision(containerId: ContainerId): number {
    const container = this.containers.get(containerId);
    if (container === undefined) {
      throw new Error(`Unknown container: ${containerId}`);
    }
    container.revision += 1;
    return container.revision;
  }

  public createContainer(container: ContainerState): TransactionRejectionReason | null {
    if (this.containers.has(container.containerId)) {
      return 'OPERATION_ID_CONFLICT';
    }

    const candidate = cloneContainer(container);
    const usage = computeContainerUsage(this.catalog, candidate.stacks);
    const capacityFailure = validateContainerAbsoluteCapacity(
      candidate.kind,
      usage,
    );
    if (capacityFailure !== null) {
      return capacityFailure;
    }

    this.containers.set(container.containerId, candidate);
    return null;
  }

  public removeContainer(containerId: ContainerId): boolean {
    return this.containers.delete(containerId);
  }

  public snapshot(): ItemLedgerSnapshot {
    return Object.freeze({
      containers: Object.freeze(
        [...this.containers.values()]
          .sort((left, right) =>
            compareStrings(left.containerId, right.containerId),
          )
          .map(freezeContainer),
      ),
    });
  }
}

function validateStack(
  catalog: ContentCatalogV1,
  stack: Readonly<ItemStackState>,
): void {
  if (stack.stackId.length === 0) {
    throw new Error('ItemStackId cannot be empty.');
  }
  if (!Number.isSafeInteger(stack.quantity) || stack.quantity <= 0) {
    throw new Error(`Invalid quantity for stack ${stack.stackId}.`);
  }

  const item = catalog.getAs(stack.itemDefinitionId, 'item');
  if (stack.quantity > item.maxStack) {
    throw new Error(`Stack ${stack.stackId} exceeds maxStack.`);
  }

  if (item.conditionMax === null) {
    if (stack.condition !== null) {
      throw new Error(
        `Non-condition item stack ${stack.stackId} cannot have condition.`,
      );
    }
  } else {
    if (
      stack.quantity !== 1
      || stack.condition === null
      || !Number.isSafeInteger(stack.condition)
      || stack.condition < 0
      || stack.condition > item.conditionMax
    ) {
      throw new Error(
        `Condition-bearing stack ${stack.stackId} is invalid.`,
      );
    }
  }
}

function validateInitialSnapshot(
  catalog: ContentCatalogV1,
  snapshot: ItemLedgerSnapshot,
): void {
  const containerIds = new Set<ContainerId>();
  const stackIds = new Set<ItemStackId>();

  for (const container of snapshot.containers) {
    if (container.containerId.length === 0 || containerIds.has(container.containerId)) {
      throw new Error(
        `Duplicate or empty ContainerId: ${container.containerId}`,
      );
    }
    containerIds.add(container.containerId);

    if (!Number.isSafeInteger(container.revision) || container.revision < 0) {
      throw new Error(
        `Invalid revision for container ${container.containerId}.`,
      );
    }

    for (const stack of container.stacks) {
      validateStack(catalog, stack);
      if (stackIds.has(stack.stackId)) {
        throw new Error(`Duplicate ItemStackId: ${stack.stackId}`);
      }
      stackIds.add(stack.stackId);
    }

    const usage = computeContainerUsage(catalog, container.stacks);
    const capacityFailure = validateContainerAbsoluteCapacity(
      container.kind,
      usage,
    );
    if (capacityFailure !== null) {
      throw new Error(
        `Container ${container.containerId} violates capacity: ${capacityFailure}`,
      );
    }
  }
}

export class ItemLedger {
  private snapshotState: ItemLedgerSnapshot;

  public constructor(
    private readonly catalog: ContentCatalogV1,
    snapshot: ItemLedgerSnapshot,
  ) {
    validateInitialSnapshot(catalog, snapshot);
    this.snapshotState = new ItemLedgerDraft(catalog, snapshot).snapshot();
  }

  public createDraft(): ItemLedgerDraft {
    return new ItemLedgerDraft(this.catalog, this.snapshotState);
  }

  public publish(draft: ItemLedgerDraft): void {
    this.snapshotState = draft.snapshot();
  }

  public exportSnapshot(): ItemLedgerSnapshot {
    return this.snapshotState;
  }

  public getContainerView(containerId: ContainerId): Readonly<ContainerView> {
    const container = this.snapshotState.containers.find(
      (candidate) => candidate.containerId === containerId,
    );
    if (container === undefined) {
      throw new Error(`Unknown container: ${containerId}`);
    }

    const usage = computeContainerUsage(this.catalog, container.stacks);
    return Object.freeze({
      ...container,
      totalWeightKg: usage.totalWeightKg,
      totalVolume: usage.totalVolume,
      playerWeightState:
        container.kind === 'player-inventory'
          ? getPlayerWeightState(usage.totalWeightKg)
          : null,
    });
  }

  public getItemDefinition(
    itemDefinitionId: string,
  ): Readonly<ItemDefinitionV1> {
    return this.catalog.getAs(itemDefinitionId, 'item');
  }
}
