import { uiText } from '../localization/UiMessages';
import type {
  CommandResultV1,
  PlayerMotionViewV1,
} from '../../protocol';
import {colonyWeatherAt} from '../../world/phase2/ColonyRegions';
import type {
  Phase1AuthorityBundle,
} from '../../integration/Phase1AuthorityBundle';
import type {
  ContainerView,
  ItemStackState,
} from '../../simulation';
import type {
  Phase1InteractionPresentation,
  Phase1PanelPresentation,
  Phase1PresentationState,
} from '../presentation/Phase1PresentationModel';
import {
  projectPhase1RuntimePresentation,
  resolvePhase1QuickUseStackId,
  type Phase1AuthoritativeCommandFeedback,
  type Phase1PresentationPanelRequest,
  type Phase1PresentationSource,
} from './Phase1PresentationBinding';
import {
  projectPhase1ProductReviewMapPanel,
} from './Phase1ProductReviewMapProjection';

export type Phase1ProductReviewPanel =
  | 'inventory'
  | 'progression'
  | 'map'
  | null;

function localCommandResult(
  bundle: Phase1AuthorityBundle,
  operationId: string,
  status: 'committed' | 'rejected',
  reason?: string,
): Readonly<CommandResultV1> {
  return Object.freeze({
    operationId,
    status,
    acceptedAuthorityTick: bundle.authorityTick,
    ...(status === 'committed'
      ? { committedAuthorityTick: bundle.authorityTick }
      : {}),
    authorityIngressOrdinal: 0,
    ...(reason === undefined ? {} : { reason }),
  });
}

const PRODUCT_REVIEW_COMMAND_FEEDBACK_LIFETIME_AUTHORITY_TICKS = 180;
const PRODUCT_REVIEW_INVENTORY_FEEDBACK_LIFETIME_AUTHORITY_TICKS = 180;

export class Phase1ProductReviewPresentationSource
  implements Phase1PresentationSource {
  private readonly listeners =
    new Set<(state: Readonly<Phase1PresentationState>) => void>();
  private panel: Phase1ProductReviewPanel = null;
  private presentationPanelOverride: Readonly<Phase1PanelPresentation> | null =
    null;
  private interactionOverride: Phase1InteractionPresentation | null = null;
  private commandFeedback: Phase1AuthoritativeCommandFeedback | null = null;
  private commandFeedbackExpiresAfterAuthorityTick: number | null = null;
  private mapDetailOrdinal = 0;
  private inventorySelectedStackId: string | null = null;
  private storageSelectedStackId: string | null = null;
  private preferredStorageId: string | null = null;
  private inventoryActivePane: 'player' | 'storage' = 'player';
  private inventoryQuantity = 1;
  private current: Readonly<Phase1PresentationState>;
  private presentationBatchActive = false;

  public beginPresentationBatch(): void { this.presentationBatchActive = true; }
  public endPresentationBatch(): void {
    this.presentationBatchActive = false;
    this.refresh();
  }

  public constructor(
    private readonly bundle: Phase1AuthorityBundle,
    private readonly playerId: string,
    private readonly getPlayerMotions:
      () => readonly Readonly<PlayerMotionViewV1>[],
  ) {
    this.current = this.project();
  }

  public read(): Readonly<Phase1PresentationState> {
    return this.current;
  }

  public subscribe(
    listener: (state: Readonly<Phase1PresentationState>) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setPanel(panel: Phase1ProductReviewPanel): void {
    this.presentationPanelOverride = null;
    this.panel = panel;
    this.refresh();
  }

  public setPresentationPanel(
    panel: Readonly<Phase1PanelPresentation> | null,
  ): void {
    this.panel = null;
    this.presentationPanelOverride = panel;
    this.refresh();
  }

  public togglePanel(panel: Exclude<Phase1ProductReviewPanel, null>): void {
    this.presentationPanelOverride = null;
    const previousPanel = this.panel;
    const opening = this.panel !== panel;
    this.panel = opening ? panel : null;
    if (
      previousPanel === 'inventory'
      || (opening && panel === 'inventory')
    ) {
      this.commandFeedback = null;
      this.commandFeedbackExpiresAfterAuthorityTick = null;
    }
    if (opening && panel === 'map') {
      this.mapDetailOrdinal = 0;
    }
    if (opening && panel === 'inventory') {
      this.preferredStorageId = null;
      this.inventoryActivePane = 'player';
      this.inventoryQuantity = 1;
    }
    this.refresh();
  }

  /** Explicit crate selection never falls back to another nearby container. */
  public openStorage(structureId: string): void {
    this.preferredStorageId = structureId;
    this.inventoryActivePane = 'player';
    this.inventoryQuantity = 1;
    this.inventorySelectedStackId = null;
    this.storageSelectedStackId = null;
    this.clearCommandFeedback();
    this.setPanel('inventory');
  }

  public isInventoryOpen(): boolean {
    return this.panel === 'inventory';
  }

  public selectInventoryItem(stackId: string): void {
    if (!this.isInventoryOpen()) return;
    const state = this.resolveInventoryState();
    if (state.inventory.stacks.some((stack) => stack.stackId === stackId)) {
      this.inventoryActivePane = 'player';
      this.inventorySelectedStackId = stackId;
    } else if (state.storage?.stacks.some((stack) => stack.stackId === stackId)) {
      this.inventoryActivePane = 'storage';
      this.storageSelectedStackId = stackId;
    } else return;
    this.inventoryQuantity = 1;
    this.clearCommandFeedback();
    this.refresh();
  }

  public cycleInventorySelection(step: number): boolean {
    if (this.panel !== 'inventory') return false;
    const state = this.resolveInventoryState();
    const source = this.inventoryActivePane === 'storage'
      ? state.storage
      : state.inventory;
    if (source === null || source.stacks.length === 0) return false;

    const selectedId = this.inventoryActivePane === 'storage'
      ? this.storageSelectedStackId
      : this.inventorySelectedStackId;
    const currentIndex = Math.max(
      0,
      source.stacks.findIndex((stack) => stack.stackId === selectedId),
    );
    const nextIndex =
      ((currentIndex + step) % source.stacks.length
        + source.stacks.length)
      % source.stacks.length;
    const nextId = source.stacks[nextIndex]?.stackId ?? null;
    if (this.inventoryActivePane === 'storage') {
      this.storageSelectedStackId = nextId;
    } else {
      this.inventorySelectedStackId = nextId;
    }
    this.inventoryQuantity = 1;
    this.commandFeedback = null;
    this.commandFeedbackExpiresAfterAuthorityTick = null;
    this.refresh();
    return true;
  }

  public cycleInventoryPane(): boolean {
    if (this.panel !== 'inventory') return false;
    const state = this.resolveInventoryState();
    if (state.storage === null) return false;
    this.inventoryActivePane =
      this.inventoryActivePane === 'player' ? 'storage' : 'player';
    this.inventoryQuantity = 1;
    this.commandFeedback = null;
    this.commandFeedbackExpiresAfterAuthorityTick = null;
    this.refresh();
    return true;
  }

  public adjustInventoryQuantity(step: number): boolean {
    if (this.panel !== 'inventory') return false;
    const selection = this.getInventoryActionSelection();
    if (selection.normalizedDuringLookup) {
      this.refresh();
      return false;
    }
    if (selection.stack === null) return false;
    this.inventoryQuantity = Math.max(
      1,
      Math.min(
        selection.stack.quantity,
        this.inventoryQuantity + step,
      ),
    );
    this.commandFeedback = null;
    this.commandFeedbackExpiresAfterAuthorityTick = null;
    this.refresh();
    return true;
  }

  public getInventoryActionSelection(): Readonly<{
    pane: 'player' | 'storage';
    inventory: Readonly<ContainerView>;
    storage: Readonly<ContainerView> | null;
    source: Readonly<ContainerView>;
    target: Readonly<ContainerView> | null;
    stack: Readonly<ItemStackState> | null;
    quantity: number;
    normalizedDuringLookup: boolean;
  }> {
    const state = this.resolveInventoryState();
    const pane = this.inventoryActivePane;
    const normalizedDuringLookup =
      state.paneNormalized
      || (pane === 'storage'
        ? state.storageSelectionNormalized
        : state.inventorySelectionNormalized);
    const sourceContainer =
      pane === 'storage' && state.storage !== null
        ? state.storage
        : state.inventory;
    const targetContainer =
      pane === 'storage'
        ? state.inventory
        : state.storage;
    const selectedId = pane === 'storage'
      ? this.storageSelectedStackId
      : this.inventorySelectedStackId;
    const resolvedStack = sourceContainer.stacks.find(
      (candidate) => candidate.stackId === selectedId,
    ) ?? null;
    const stack = normalizedDuringLookup ? null : resolvedStack;
    const quantity = stack === null
      ? 1
      : Math.max(1, Math.min(this.inventoryQuantity, stack.quantity));
    return Object.freeze({
      pane,
      inventory: state.inventory,
      storage: state.storage,
      source: sourceContainer,
      target: targetContainer,
      stack,
      quantity,
      normalizedDuringLookup,
    });
  }

  public cycleMapDetail(step: number): boolean {
    if (this.panel !== 'map') return false;
    this.mapDetailOrdinal += step;
    this.refresh();
    return true;
  }
  public selectMapDetail(id:string):boolean {
    if(this.panel!=='map')return false;
    const view=projectPhase1ProductReviewMapPanel(this.bundle,this.playerId,this.getPlayerMotions(),this.mapDetailOrdinal);
    const targets=view.spatial?.markers.filter(marker=>marker.distanceBand!==null)??[];
    const index=targets.findIndex(marker=>marker.id===id);
    if(index<0)return false;
    this.mapDetailOrdinal=index;this.refresh();return true;
  }

  public setInteraction(
    interaction: Phase1InteractionPresentation | null,
  ): void {
    this.interactionOverride = interaction;
    this.refresh();
  }

  public setLocalCommandFeedback(input: {
    readonly operationId: string;
    readonly status: 'committed' | 'rejected';
    readonly reason?: string;
    readonly inputLabel?: string;
    readonly verb: string;
    readonly target: string;
    readonly panelTargetId?: string | null;
  }): void {
    this.commandFeedback = Object.freeze({
      result: localCommandResult(
        this.bundle,
        input.operationId,
        input.status,
        input.reason,
      ),
      inputLabel: input.inputLabel ?? 'E',
      verb: input.verb,
      target: input.target,
      ...(input.panelTargetId === undefined
        ? {}
        : { panelTargetId: input.panelTargetId }),
    });
    this.commandFeedbackExpiresAfterAuthorityTick =
      this.bundle.authorityTick
      + (
        this.panel === 'inventory'
          ? PRODUCT_REVIEW_INVENTORY_FEEDBACK_LIFETIME_AUTHORITY_TICKS
          : PRODUCT_REVIEW_COMMAND_FEEDBACK_LIFETIME_AUTHORITY_TICKS
      );
    this.interactionOverride = null;
    this.refresh();
  }

  public clearCommandFeedback(): void {
    this.commandFeedback = null;
    this.commandFeedbackExpiresAfterAuthorityTick = null;
    this.refresh();
  }

  public resolveQuickUseStackId(): string | null {
    const inventory = this.bundle.items.getContainerView(
      'inventory:' + this.playerId,
    );
    return resolvePhase1QuickUseStackId(
      this.bundle.catalog,
      inventory,
    );
  }

  public refresh(): void {
    if (this.presentationBatchActive) return;
    if (
      this.commandFeedback !== null
      && this.commandFeedbackExpiresAfterAuthorityTick !== null
      && this.bundle.authorityTick
        > this.commandFeedbackExpiresAfterAuthorityTick
    ) {
      this.commandFeedback = null;
      this.commandFeedbackExpiresAfterAuthorityTick = null;
    }
    this.current = this.project();
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }

  private accessibleStorage(): Readonly<ContainerView> | null {
    const structure = this.bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .filter((candidate) =>
        (this.preferredStorageId === null || candidate.structureId === this.preferredStorageId)
        && candidate.definitionId === 'structure:storage-crate'
        && candidate.containerId !== null
        && this.bundle.buildings.isStructureAccessible(
          this.playerId,
          candidate.structureId,
        ),
      )
      .sort((left, right) =>
        left.structureId.localeCompare(right.structureId),
      )[0];
    if (structure?.containerId === null || structure === undefined) {
      return null;
    }
    return this.bundle.items.getContainerView(structure.containerId);
  }

  private resolveInventoryState(): Readonly<{
    inventory: Readonly<ContainerView>;
    storage: Readonly<ContainerView> | null;
    inventorySelectionNormalized: boolean;
    storageSelectionNormalized: boolean;
    paneNormalized: boolean;
  }> {
    const inventory = this.bundle.items.getContainerView(
      'inventory:' + this.playerId,
    );
    const storage = this.accessibleStorage();

    const previousInventorySelection =
      this.inventorySelectedStackId;
    if (
      this.inventorySelectedStackId === null
      || !inventory.stacks.some(
        (stack) => stack.stackId === this.inventorySelectedStackId,
      )
    ) {
      this.inventorySelectedStackId =
        inventory.stacks[0]?.stackId ?? null;
    }
    const inventorySelectionNormalized =
      previousInventorySelection !== this.inventorySelectedStackId;

    const previousStorageSelection =
      this.storageSelectedStackId;
    if (
      storage === null
      || this.storageSelectedStackId === null
      || !storage.stacks.some(
        (stack) => stack.stackId === this.storageSelectedStackId,
      )
    ) {
      this.storageSelectedStackId =
        storage?.stacks[0]?.stackId ?? null;
    }
    const storageSelectionNormalized =
      previousStorageSelection !== this.storageSelectedStackId;

    const previousPane = this.inventoryActivePane;
    if (storage === null && this.inventoryActivePane === 'storage') {
      this.inventoryActivePane = 'player';
    }
    const paneNormalized = previousPane !== this.inventoryActivePane;

    const active = this.inventoryActivePane === 'storage'
      ? storage
      : inventory;
    const selectedId = this.inventoryActivePane === 'storage'
      ? this.storageSelectedStackId
      : this.inventorySelectedStackId;
    const selected = active?.stacks.find(
      (stack) => stack.stackId === selectedId,
    );
    this.inventoryQuantity = selected === undefined
      ? 1
      : Math.max(
          1,
          Math.min(this.inventoryQuantity, selected.quantity),
        );

    return Object.freeze({
      inventory,
      storage,
      inventorySelectionNormalized,
      storageSelectionNormalized,
      paneNormalized,
    });
  }

  private project(): Readonly<Phase1PresentationState> {
    const inventory = this.bundle.items.getContainerView(
      'inventory:' + this.playerId,
    );

    let panel: Phase1PresentationPanelRequest | null = null;
    let spatialMapPanel: Readonly<Phase1PanelPresentation> | null = null;
    switch (this.panel) {
      case 'inventory': {
        const inventoryState = this.resolveInventoryState();
        if (inventoryState.storage === null) {
          panel = Object.freeze({
            kind: 'inventory',
            selectedStackId: this.inventorySelectedStackId,
            quantity: this.inventoryQuantity,
          });
        } else {
          panel = Object.freeze({
            kind: 'container',
            container: inventoryState.storage,
            selectedPlayerStackId: this.inventorySelectedStackId,
            selectedContainerStackId: this.storageSelectedStackId,
            activePane: this.inventoryActivePane,
            quantity: this.inventoryQuantity,
          });
        }
        break;
      }
      case 'progression':
        panel = Object.freeze({ kind: 'progression' });
        break;
      case 'map':
        spatialMapPanel = projectPhase1ProductReviewMapPanel(
          this.bundle,
          this.playerId,
          this.getPlayerMotions(),
          this.mapDetailOrdinal,
        );
        break;
      case null:
        break;
    }

    const equipment = this.bundle.equipment.reconcile(this.playerId);
    const equippedStackId =
      equipment.equippedWeaponStackId
      ?? equipment.equippedThermalWrapStackId;
    const quickUseStackId = resolvePhase1QuickUseStackId(
      this.bundle.catalog,
      inventory,
    );

    const regionalWeather=this.bundle.config.colonyDepthEnabled===true?colonyWeatherAt(this.bundle.config.worldSeed,this.bundle.getPlayerPosition(this.playerId),this.bundle.authorityTick):null;
    const projected = projectPhase1RuntimePresentation({
      catalog: this.bundle.catalog,
      survival: this.bundle.survival.getPlayerView(this.playerId, inventory.playerWeightState ?? 'NORMAL'),
      inventory,
      equippedStackId,
      wearables: equipment.wearables,
      equippedWeaponStackId: equipment.equippedWeaponStackId,
      equippedThermalWrapStackId:
        equipment.equippedThermalWrapStackId,
      quickUseStackId,
      environment: this.bundle.worldStore.getEnvironmentView(),
      ...(regionalWeather===null?{}:{weatherOverride:{label:regionalWeather.warning?uiText("ui.2d5538af"):regionalWeather.weather.replaceAll('-',' ').toUpperCase(),state:regionalWeather.warning?'FORECAST' as const:regionalWeather.weather==='clear'?'CLEAR' as const:'ACTIVE' as const}}),
      progression: this.bundle.progression.getPlayerView(this.playerId),
      playerMotions: this.getPlayerMotions(),
      commandFeedback: this.commandFeedback,
      deathResult: this.bundle.getLastDeathResult(this.playerId),
      panel,
      ...(this.presentationPanelOverride !== null
        ? { presentationPanel: this.presentationPanelOverride }
        : spatialMapPanel === null
          ? {}
          : { presentationPanel: spatialMapPanel }),
    });

    if (this.interactionOverride === null) {
      return projected;
    }

    const firstActionCue =
      projected.firstActionCue === null
      || projected.firstActionCue === undefined
        ? projected.firstActionCue
        : this.interactionOverride.state === uiText("ui.ef7a53b8")
          && this.interactionOverride.verb === uiText("ui.94c2b2ca")
          ? uiText("ui.38b0f809")
            + this.interactionOverride.target
          : projected.firstActionCue;

    return Object.freeze({
      ...projected,
      ...(firstActionCue === undefined ? {} : { firstActionCue }),
      interaction: this.interactionOverride,
    });
  }
}
