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

export interface PlayerCarryPolicy {
  readonly maxWeightKg: number;
  readonly hardWeightKg: number;
  readonly maxVolume: number;
}
export const LEGACY_PLAYER_CARRY: PlayerCarryPolicy = Object.freeze({maxWeightKg:20,hardWeightKg:25,maxVolume:24});
export const EXPEDITION_PLAYER_CARRY: PlayerCarryPolicy = Object.freeze({maxWeightKg:32,hardWeightKg:40,maxVolume:48});

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
  policy: PlayerCarryPolicy = LEGACY_PLAYER_CARRY,
): PlayerWeightState {
  if (totalWeightKg > policy.maxWeightKg) {
    return 'OVERLOADED';
  }
  if (totalWeightKg > policy.maxWeightKg * 0.8) {
    return 'HEAVY';
  }
  return 'NORMAL';
}

export function validateContainerAbsoluteCapacity(
  kind: ContainerKind,
  usage: ContainerUsage,
  storageMultiplier = 1,
  playerPolicy: PlayerCarryPolicy = LEGACY_PLAYER_CARRY,
): TransactionRejectionReason | null {
  if(!Number.isFinite(storageMultiplier)||storageMultiplier<1||storageMultiplier>2)throw new Error('Invalid storage capacity multiplier.');
  switch (kind) {
    case 'player-inventory':
      if (usage.totalVolume > playerPolicy.maxVolume) {
        return 'TARGET_CAPACITY_VOLUME';
      }
      if (usage.totalWeightKg > playerPolicy.hardWeightKg) {
        return 'TARGET_CAPACITY_WEIGHT';
      }
      return null;

    case 'storage-crate':
      if (usage.totalVolume > STORAGE_CRATE_MAX_VOLUME * storageMultiplier) {
        return 'TARGET_CAPACITY_VOLUME';
      }
      if (usage.totalWeightKg > STORAGE_CRATE_MAX_WEIGHT_KG * storageMultiplier) {
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
  storageMultiplier = 1,
  playerPolicy: PlayerCarryPolicy = LEGACY_PLAYER_CARRY,
): TransactionRejectionReason | null {
  const absolute = validateContainerAbsoluteCapacity(kind, projected,storageMultiplier,playerPolicy);
  if (absolute !== null) {
    return absolute;
  }

  if (kind !== 'player-inventory') {
    return null;
  }

  if (projected.totalVolume > playerPolicy.maxVolume) {
    return 'TARGET_CAPACITY_VOLUME';
  }

  if (current.totalWeightKg > playerPolicy.maxWeightKg) {
    return projected.totalWeightKg <= current.totalWeightKg
      ? null
      : 'TARGET_CAPACITY_WEIGHT';
  }

  return projected.totalWeightKg <= playerPolicy.maxWeightKg
    ? null
    : 'TARGET_CAPACITY_WEIGHT';
}
