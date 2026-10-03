import { emptyWearables, validWearableReferences, wearableSlotFor, WEARABLE_SLOTS, type WearableReferencesV1, type WearableSlot } from '../../content/livingworld/WearableContent';
import { isKnownMeleeEquipment } from '../../content/livingworld/EquipmentContent';
import type { PlayerId } from '../../foundation';
import type {
  ItemStackId,
  Phase1ItemAuthority,
} from '../items';

export interface Phase1EquipmentView {
  readonly playerId: PlayerId;
  readonly wearables: WearableReferencesV1;
  readonly equippedWeaponStackId: ItemStackId | null;
  readonly equippedThermalWrapStackId: ItemStackId | null;
}

export interface Phase1EquipmentSeed {
  readonly playerId: PlayerId;
  readonly wearables?: WearableReferencesV1;
  readonly equippedWeaponStackId: ItemStackId | null;
  readonly equippedThermalWrapStackId: ItemStackId | null;
}

export type Phase1EquipmentRejectionReason =
  | 'SOURCE_MISSING'
  | 'INVALID_EQUIPMENT'
  | 'NOT_PLAYER_INVENTORY'
  | 'NOT_ALIVE';

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
  wearables: WearableReferencesV1;
  equippedWeaponStackId: ItemStackId | null;
  equippedThermalWrapStackId: ItemStackId | null;
}

function freezeView(
  playerId: PlayerId,
  state: MutableEquipmentState,
): Phase1EquipmentView {
  return Object.freeze({
    playerId,
    wearables: state.wearables,
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
    private readonly canEquip: (playerId: PlayerId) => boolean = () => true,
  ) {
    for (const seed of seeds) {
      if (this.players.has(seed.playerId)) {
        throw new Error('Duplicate Phase 1 equipment seed player.');
      }
      if (seed.wearables !== undefined && !validWearableReferences(seed.wearables)) throw new Error('Invalid wearable seed.');
      this.players.set(seed.playerId, {
        wearables: Object.freeze({...(seed.wearables ?? emptyWearables())}),
        equippedWeaponStackId: seed.equippedWeaponStackId,
        equippedThermalWrapStackId: seed.equippedThermalWrapStackId,
      });
      this.validateSeed(seed.playerId);
    }
  }

  public registerPlayer(playerId: PlayerId): void {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        wearables: emptyWearables(),
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
    if (!this.canEquip(playerId)) return Object.freeze({status:'rejected',reason:'NOT_ALIVE'});
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
    if (!this.canEquip(playerId)) return Object.freeze({status:'rejected',reason:'NOT_ALIVE'});
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

  public equipWearable(playerId: PlayerId, slot: WearableSlot, stackId: ItemStackId | null): Phase1EquipmentResult {
    this.registerPlayer(playerId);
    if (!this.canEquip(playerId)) return Object.freeze({status:'rejected',reason:'NOT_ALIVE'});
    if (!WEARABLE_SLOTS.includes(slot)) return Object.freeze({status: 'rejected', reason: 'INVALID_EQUIPMENT'});
    if (stackId !== null) {
      const invalid = this.validateWearable(playerId, slot, stackId);
      if (invalid !== null) return Object.freeze({status: 'rejected', reason: invalid});
    }
    const state = this.requirePlayer(playerId);
    state.wearables = Object.freeze({...state.wearables, [slot]: stackId});
    return Object.freeze({status: 'committed', view: freezeView(playerId, state)});
  }

  /** Only owned and unbroken stacks affect authoritative survival. No client modifiers. */
  public survivalModifiers(playerId: PlayerId) {
    const view = this.reconcile(playerId);
    const inventory = this.items.getContainerView('inventory:' + playerId);
    const active = (slot: WearableSlot) => inventory.stacks.some(s => s.stackId === view.wearables[slot] && s.condition !== null && s.condition > 0);
    return Object.freeze({heatProtection: active('head') ? 8 : 0, coldProtection: active('legs') ? 8 : 0,
      sprintStaminaPercent: active('feet') ? 80 as const : 100 as const, waterDrainPercent: active('accessory') ? 80 as const : 100 as const});
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

    for (const slot of WEARABLE_SLOTS) {
      const stackId = state.wearables[slot];
      if (stackId !== null && this.validateWearable(playerId, slot, stackId, true) !== null) {
        state.wearables = Object.freeze({...state.wearables, [slot]: null});
      }
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
      ...WEARABLE_SLOTS.map(slot => view.wearables[slot]),
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
      && ((stack.itemDefinitionId === 'item:thermal-wrap' && stack.condition !== null && stack.condition > 0) || stack.itemDefinitionId === 'item:warm-cloak');
  }

  public clear(playerId: PlayerId): Readonly<Phase1EquipmentView> {
    const state = this.requirePlayer(playerId);
    state.equippedWeaponStackId = null;
    state.equippedThermalWrapStackId = null;
    state.wearables = emptyWearables();
    return freezeView(playerId, state);
  }

  private validateSeed(playerId: PlayerId): void {
    const state = this.requirePlayer(playerId);
    for (const slot of WEARABLE_SLOTS) {
      const stackId = state.wearables[slot];
      if (stackId !== null && this.validateWearable(playerId, slot, stackId, true) !== null) throw new Error('Invalid persisted wearable ownership or slot.');
    }
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

  private validateWearable(playerId: PlayerId, slot: WearableSlot, stackId: string, allowBroken = false): Phase1EquipmentRejectionReason | null {
    const inventory = this.items.getContainerView('inventory:' + playerId);
    if (inventory.kind !== 'player-inventory' || inventory.ownerPlayerId !== playerId) return 'NOT_PLAYER_INVENTORY';
    const stack = inventory.stacks.find(s => s.stackId === stackId);
    if (!stack) return 'SOURCE_MISSING';
    if (wearableSlotFor(stack.itemDefinitionId) !== slot || !allowBroken && (stack.condition === null || stack.condition <= 0)) return 'INVALID_EQUIPMENT';
    return null;
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
    if (stack.itemDefinitionId !== expectedDefinitionId && !(expectedDefinitionId === 'item:basic-spear' && isKnownMeleeEquipment(stack.itemDefinitionId)) && !(expectedDefinitionId==='item:thermal-wrap'&&stack.itemDefinitionId==='item:warm-cloak')) {
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
