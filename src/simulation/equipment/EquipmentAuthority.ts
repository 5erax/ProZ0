import type { PlayerId } from '../../foundation';
import type {
  ItemStackId,
  Phase1ItemAuthority,
} from '../items';

export interface Phase1EquipmentView {
  readonly playerId: PlayerId;
  readonly equippedWeaponStackId: ItemStackId | null;
  readonly equippedThermalWrapStackId: ItemStackId | null;
}

export interface Phase1EquipmentSeed {
  readonly playerId: PlayerId;
  readonly equippedWeaponStackId: ItemStackId | null;
  readonly equippedThermalWrapStackId: ItemStackId | null;
}

export type Phase1EquipmentRejectionReason =
  | 'SOURCE_MISSING'
  | 'INVALID_EQUIPMENT'
  | 'NOT_PLAYER_INVENTORY';

export type Phase1EquipmentResult =
  | {
      readonly status: 'committed';
      readonly view: Readonly<Phase1EquipmentView>;
    }
  | {
      readonly status: 'rejected';
      readonly reason: Phase1EquipmentRejectionReason;
    };

interface MutableEquipmentState {
  equippedWeaponStackId: ItemStackId | null;
  equippedThermalWrapStackId: ItemStackId | null;
}

function freezeView(
  playerId: PlayerId,
  state: MutableEquipmentState,
): Phase1EquipmentView {
  return Object.freeze({
    playerId,
    equippedWeaponStackId: state.equippedWeaponStackId,
    equippedThermalWrapStackId: state.equippedThermalWrapStackId,
  });
}

/**
 * Canonical Phase 1 equipment-reference authority.
 *
 * Item condition/ownership remains ledger-owned. This authority owns only
 * which approved portable stack references are actively equipped by a player.
 * It reconciles against the item ledger so moved/dropped/death-cached stacks
 * cannot remain active equipment.
 */
export class Phase1EquipmentAuthority {
  private readonly players = new Map<PlayerId, MutableEquipmentState>();

  public constructor(
    private readonly items: Phase1ItemAuthority,
    seeds: readonly Phase1EquipmentSeed[] = [],
  ) {
    for (const seed of seeds) {
      if (this.players.has(seed.playerId)) {
        throw new Error('Duplicate Phase 1 equipment seed player.');
      }
      this.players.set(seed.playerId, {
        equippedWeaponStackId: seed.equippedWeaponStackId,
        equippedThermalWrapStackId: seed.equippedThermalWrapStackId,
      });
      this.validateSeed(seed.playerId);
    }
  }

  public registerPlayer(playerId: PlayerId): void {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        equippedWeaponStackId: null,
        equippedThermalWrapStackId: null,
      });
    }
  }

  public getView(playerId: PlayerId): Readonly<Phase1EquipmentView> {
    const state = this.requirePlayer(playerId);
    return freezeView(playerId, state);
  }

  public equipWeapon(
    playerId: PlayerId,
    stackId: ItemStackId | null,
  ): Phase1EquipmentResult {
    this.registerPlayer(playerId);
    if (stackId !== null) {
      const validation = this.validateStack(
        playerId,
        stackId,
        'item:basic-spear',
      );
      if (validation !== null) {
        return Object.freeze({
          status: 'rejected',
          reason: validation,
        });
      }
    }

    const state = this.requirePlayer(playerId);
    state.equippedWeaponStackId = stackId;
    return Object.freeze({
      status: 'committed',
      view: freezeView(playerId, state),
    });
  }

  public equipThermalWrap(
    playerId: PlayerId,
    stackId: ItemStackId | null,
  ): Phase1EquipmentResult {
    this.registerPlayer(playerId);
    if (stackId !== null) {
      const validation = this.validateStack(
        playerId,
        stackId,
        'item:thermal-wrap',
      );
      if (validation !== null) {
        return Object.freeze({
          status: 'rejected',
          reason: validation,
        });
      }
    }

    const state = this.requirePlayer(playerId);
    state.equippedThermalWrapStackId = stackId;
    return Object.freeze({
      status: 'committed',
      view: freezeView(playerId, state),
    });
  }

  public reconcile(playerId: PlayerId): Readonly<Phase1EquipmentView> {
    const state = this.requirePlayer(playerId);

    if (
      state.equippedWeaponStackId !== null
      && this.validateStack(
        playerId,
        state.equippedWeaponStackId,
        'item:basic-spear',
      ) !== null
    ) {
      state.equippedWeaponStackId = null;
    }

    if (
      state.equippedThermalWrapStackId !== null
      && this.validateStack(
        playerId,
        state.equippedThermalWrapStackId,
        'item:thermal-wrap',
      ) !== null
    ) {
      state.equippedThermalWrapStackId = null;
    }

    return freezeView(playerId, state);
  }

  public equippedStackIds(
    playerId: PlayerId,
  ): readonly ItemStackId[] {
    const view = this.reconcile(playerId);
    return Object.freeze([
      view.equippedWeaponStackId,
      view.equippedThermalWrapStackId,
    ].filter((value): value is ItemStackId => value !== null));
  }

  public isThermalWrapActive(playerId: PlayerId): boolean {
    const view = this.reconcile(playerId);
    if (view.equippedThermalWrapStackId === null) return false;

    const inventory = this.items.getContainerView('inventory:' + playerId);
    const stack = inventory.stacks.find(
      (entry) => entry.stackId === view.equippedThermalWrapStackId,
    );
    return stack !== undefined
      && stack.itemDefinitionId === 'item:thermal-wrap'
      && stack.condition !== null
      && stack.condition > 0;
  }

  public clear(playerId: PlayerId): Readonly<Phase1EquipmentView> {
    const state = this.requirePlayer(playerId);
    state.equippedWeaponStackId = null;
    state.equippedThermalWrapStackId = null;
    return freezeView(playerId, state);
  }

  private validateSeed(playerId: PlayerId): void {
    const state = this.requirePlayer(playerId);
    for (const [stackId, expectedDefinition] of [
      [state.equippedWeaponStackId, 'item:basic-spear'],
      [state.equippedThermalWrapStackId, 'item:thermal-wrap'],
    ] as const) {
      if (
        stackId !== null
        && this.validateStack(
          playerId,
          stackId,
          expectedDefinition,
        ) !== null
      ) {
        throw new Error(
          'Persisted Phase 1 equipment reference is invalid.',
        );
      }
    }
  }

  private validateStack(
    playerId: PlayerId,
    stackId: ItemStackId,
    expectedDefinitionId: string,
  ): Phase1EquipmentRejectionReason | null {
    const inventory = this.items.getContainerView('inventory:' + playerId);
    if (
      inventory.kind !== 'player-inventory'
      || inventory.ownerPlayerId !== playerId
    ) {
      return 'NOT_PLAYER_INVENTORY';
    }
    const stack = inventory.stacks.find(
      (entry) => entry.stackId === stackId,
    );
    if (stack === undefined) return 'SOURCE_MISSING';
    if (stack.itemDefinitionId !== expectedDefinitionId) {
      return 'INVALID_EQUIPMENT';
    }
    return null;
  }

  private requirePlayer(playerId: PlayerId): MutableEquipmentState {
    const state = this.players.get(playerId);
    if (state === undefined) {
      throw new Error('Unknown Phase 1 equipment player.');
    }
    return state;
  }
}
