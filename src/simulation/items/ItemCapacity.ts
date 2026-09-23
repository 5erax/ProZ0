import type {
  ContentCatalogV1,
  ItemDefinitionV1,
} from '../../content';
import type {
  ContainerKind,
  ItemStackState,
  PlayerWeightState,
} from './ItemTypes';
import type { TransactionRejectionReason } from './ItemTransactionResults';

export const PLAYER_MAX_WEIGHT_KG = 20;
export const PLAYER_HARD_WEIGHT_KG = 25;
export const PLAYER_MAX_VOLUME = 24;
export const STORAGE_CRATE_MAX_WEIGHT_KG = 100;
export const STORAGE_CRATE_MAX_VOLUME = 120;

export interface ContainerUsage {
  readonly totalWeightKg: number;
  readonly totalVolume: number;
}

function getItem(
  catalog: ContentCatalogV1,
  stack: ItemStackState,
): Readonly<ItemDefinitionV1> {
  return catalog.getAs(stack.itemDefinitionId, 'item');
}

export function computeContainerUsage(
  catalog: ContentCatalogV1,
  stacks: readonly ItemStackState[],
): ContainerUsage {
  let totalWeightKg = 0;
  let totalVolume = 0;

  for (const stack of stacks) {
    const item = getItem(catalog, stack);
    totalWeightKg += item.unitWeightKg * stack.quantity;
    totalVolume += item.unitVolume * stack.quantity;
  }

  return Object.freeze({
    totalWeightKg,
    totalVolume,
  });
}

export function getPlayerWeightState(
  totalWeightKg: number,
): PlayerWeightState {
  if (totalWeightKg > PLAYER_MAX_WEIGHT_KG) {
    return 'OVERLOADED';
  }
  if (totalWeightKg > PLAYER_MAX_WEIGHT_KG * 0.8) {
    return 'HEAVY';
  }
  return 'NORMAL';
}

export function validateContainerAbsoluteCapacity(
  kind: ContainerKind,
  usage: ContainerUsage,
): TransactionRejectionReason | null {
  switch (kind) {
    case 'player-inventory':
      if (usage.totalVolume > PLAYER_MAX_VOLUME) {
        return 'TARGET_CAPACITY_VOLUME';
      }
      if (usage.totalWeightKg > PLAYER_HARD_WEIGHT_KG) {
        return 'TARGET_CAPACITY_WEIGHT';
      }
      return null;

    case 'storage-crate':
      if (usage.totalVolume > STORAGE_CRATE_MAX_VOLUME) {
        return 'TARGET_CAPACITY_VOLUME';
      }
      if (usage.totalWeightKg > STORAGE_CRATE_MAX_WEIGHT_KG) {
        return 'TARGET_CAPACITY_WEIGHT';
      }
      return null;

    case 'machine-output':
    case 'death-cache':
    case 'world-drop':
      return null;
  }
}

export function validateInboundCapacityTransition(
  kind: ContainerKind,
  current: ContainerUsage,
  projected: ContainerUsage,
): TransactionRejectionReason | null {
  const absolute = validateContainerAbsoluteCapacity(kind, projected);
  if (absolute !== null) {
    return absolute;
  }

  if (kind !== 'player-inventory') {
    return null;
  }

  if (projected.totalVolume > PLAYER_MAX_VOLUME) {
    return 'TARGET_CAPACITY_VOLUME';
  }

  if (current.totalWeightKg > PLAYER_MAX_WEIGHT_KG) {
    return projected.totalWeightKg <= current.totalWeightKg
      ? null
      : 'TARGET_CAPACITY_WEIGHT';
  }

  return projected.totalWeightKg <= PLAYER_MAX_WEIGHT_KG
    ? null
    : 'TARGET_CAPACITY_WEIGHT';
}
