import type { CommandResultV1 } from '../../protocol';
import type {
  Phase1AuthorityBundle,
} from '../../integration/Phase1AuthorityBundle';
import {
  fromWorldPosition,
} from '../../world';
import type {
  Phase1InteractionPresentation,
  Phase1PresentationState,
} from '../presentation/Phase1PresentationModel';
import {
  projectPhase1RuntimePresentation,
  type Phase1AuthoritativeCommandFeedback,
  type Phase1PresentationPanelRequest,
  type Phase1PresentationSource,
} from './Phase1PresentationBinding';

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

export class Phase1ProductReviewPresentationSource
  implements Phase1PresentationSource {
  private readonly listeners =
    new Set<(state: Readonly<Phase1PresentationState>) => void>();
  private panel: Phase1ProductReviewPanel = null;
  private interactionOverride: Phase1InteractionPresentation | null = null;
  private commandFeedback: Phase1AuthoritativeCommandFeedback | null = null;
  private current: Readonly<Phase1PresentationState>;

  public constructor(
    private readonly bundle: Phase1AuthorityBundle,
    private readonly playerId: string,
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
    this.panel = panel;
    this.refresh();
  }

  public togglePanel(panel: Exclude<Phase1ProductReviewPanel, null>): void {
    this.panel = this.panel === panel ? null : panel;
    this.refresh();
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
      inputLabel: 'E',
      verb: input.verb,
      target: input.target,
      ...(input.panelTargetId === undefined
        ? {}
        : { panelTargetId: input.panelTargetId }),
    });
    this.interactionOverride = null;
    this.refresh();
  }

  public clearCommandFeedback(): void {
    this.commandFeedback = null;
    this.refresh();
  }

  public refresh(): void {
    this.current = this.project();
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }

  private project(): Readonly<Phase1PresentationState> {
    const inventory = this.bundle.items.getContainerView(
      'inventory:' + this.playerId,
    );
    const position = this.bundle.getPlayerPosition(this.playerId);
    const active = this.bundle.worldStore.query(
      fromWorldPosition(position),
    );
    const ruinEntity =
      this.bundle.world.findGeneratedEntityByDefinition(
        'ruin:previous-civilization-ruin',
      );
    const ruin = ruinEntity === null
      ? null
      : this.bundle.worldStore.getRuinState(ruinEntity.entityId) ?? null;
    const deathCaches =
      this.bundle.world.exportSnapshot().deathCaches.caches;
    const deathCache = deathCaches.length === 0
      ? null
      : deathCaches[deathCaches.length - 1] ?? null;

    let panel: Phase1PresentationPanelRequest | null = null;
    switch (this.panel) {
      case 'inventory':
        panel = Object.freeze({
          kind: 'inventory',
          selectedStackId: null,
        });
        break;
      case 'progression':
        panel = Object.freeze({ kind: 'progression' });
        break;
      case 'map':
        panel = Object.freeze({
          kind: 'map',
          exploration: active?.delta.exploration ?? null,
          ruin,
          deathCache,
          sharedDiscoveryConfirmed: false,
        });
        break;
      case null:
        break;
    }

    const equipment = this.bundle.equipment.reconcile(this.playerId);
    const equippedStackId =
      equipment.equippedWeaponStackId
      ?? equipment.equippedThermalWrapStackId;

    const projected = projectPhase1RuntimePresentation({
      catalog: this.bundle.catalog,
      survival: this.bundle.survival.getPlayerView(this.playerId),
      inventory,
      equippedStackId,
      environment: this.bundle.worldStore.getEnvironmentView(),
      progression: this.bundle.progression.getPlayerView(this.playerId),
      commandFeedback: this.commandFeedback,
      deathResult: this.bundle.getLastDeathResult(this.playerId),
      panel,
    });

    if (this.interactionOverride === null) {
      return projected;
    }

    return Object.freeze({
      ...projected,
      interaction: this.interactionOverride,
    });
  }
}
