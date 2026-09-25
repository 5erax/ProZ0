import type {
  ContentCatalogV1,
  ContentId,
} from '../../content';
import type {
  CommandResultV1,
  PlayerMotionViewV1,
} from '../../protocol';
import {
  PLAYER_MAX_VOLUME,
  PLAYER_MAX_WEIGHT_KG,
  type CondenserView,
  type ContainerView,
  type DeathTransitionResult,
  type PlayerProgressionView,
  type PlayerSurvivalView,
} from '../../simulation';
import type {
  DeathCacheWorldView,
  PowerNetworkState,
} from '../../world';
import type {
  Phase1EnvironmentView,
  Phase1ExplorationFragment,
  Phase1RuinRuntimeState,
} from '../../world/phase1/Phase1WorldTypes';
import type {
  Phase1ContainerPanelPresentation,
  Phase1EquipmentPresentation,
  Phase1InteractionPresentation,
  Phase1InventoryItemPresentation,
  Phase1InventoryPanelPresentation,
  Phase1MachinePanelPresentation,
  Phase1MapPanelPresentation,
  Phase1MeterPresentation,
  Phase1PanelPresentation,
  Phase1PresentationState,
  Phase1ProgressionPanelPresentation,
  Phase1RecoveryPanelPresentation,
  Phase1SemanticSeverity,
  Phase1TeammatePresentation,
  Phase1ToastPresentation,
} from '../presentation/Phase1PresentationModel';

export interface Phase1AuthoritativeCommandFeedback {
  readonly result: Readonly<CommandResultV1>;
  readonly inputLabel: string;
  readonly verb: string;
  readonly target: string;
  readonly panelTargetId?: string | null;
}

export type Phase1PresentationPanelRequest =
  | {
      readonly kind: 'inventory';
      readonly selectedStackId?: string | null;
    }
  | {
      readonly kind: 'container';
      readonly container: Readonly<ContainerView>;
    }
  | {
      readonly kind: 'machine';
      readonly machine: Readonly<CondenserView>;
      readonly power: Readonly<PowerNetworkState>;
      readonly powerDemandPu: number;
    }
  | {
      readonly kind: 'recovery';
      readonly deathCache: Readonly<DeathCacheWorldView> | null;
    }
  | { readonly kind: 'progression' }
  | {
      readonly kind: 'map';
      readonly exploration: Readonly<Phase1ExplorationFragment> | null;
      readonly ruin: Readonly<Phase1RuinRuntimeState> | null;
      readonly deathCache: Readonly<DeathCacheWorldView> | null;
      readonly sharedDiscoveryConfirmed?: boolean;
    };

export interface Phase1PresentationSource {
  read(): Readonly<Phase1PresentationState>;
  subscribe(
    listener: (state: Readonly<Phase1PresentationState>) => void,
  ): () => void;
}

export interface Phase1RuntimePresentationInput {
  readonly catalog: ContentCatalogV1;
  readonly survival: Readonly<PlayerSurvivalView>;
  readonly inventory: Readonly<ContainerView>;
  readonly equippedStackId?: string | null;
  readonly environment: Readonly<Phase1EnvironmentView>;
  readonly progression: Readonly<PlayerProgressionView>;
  readonly playerMotions?: readonly Readonly<PlayerMotionViewV1>[];
  readonly commandFeedback?: Phase1AuthoritativeCommandFeedback | null;
  readonly deathResult?: Readonly<DeathTransitionResult> | null;
  readonly panel?: Phase1PresentationPanelRequest | null;
  readonly presentationPanel?: Readonly<Phase1PanelPresentation> | null;
}

function meter(
  label: string,
  value: number,
  stateLabel: string,
  severity: Phase1SemanticSeverity,
): Phase1MeterPresentation {
  return Object.freeze({
    label,
    value,
    max: 100,
    stateLabel,
    severity,
  });
}

function healthMeter(value: number): Phase1MeterPresentation {
  if (value <= 0) return meter('Health', value, 'DEAD', 'critical');
  if (value <= 30) return meter('Health', value, 'CRITICAL', 'critical');
  if (value <= 60) return meter('Health', value, 'INJURED', 'warning');
  return meter('Health', value, 'HEALTHY', 'normal');
}

function foodMeter(value: number): Phase1MeterPresentation {
  if (value <= 0) {
    return meter('Food', value, 'CRITICAL STARVATION', 'critical');
  }
  if (value <= 19) return meter('Food', value, 'STARVING', 'critical');
  if (value <= 39) return meter('Food', value, 'HUNGRY', 'warning');
  return meter('Food', value, 'FED', 'normal');
}

function waterMeter(value: number): Phase1MeterPresentation {
  if (value <= 0) {
    return meter('Water', value, 'CRITICAL DEHYDRATION', 'critical');
  }
  if (value <= 24) {
    return meter('Water', value, 'DEHYDRATED', 'critical');
  }
  if (value <= 49) return meter('Water', value, 'THIRSTY', 'warning');
  return meter('Water', value, 'HYDRATED', 'normal');
}

function temperatureMeter(value: number): Phase1MeterPresentation {
  if (value <= 4) {
    return meter('Temperature', value, 'CRITICAL COLD', 'critical');
  }
  if (value <= 19) {
    return meter('Temperature', value, 'SEVERE COLD', 'critical');
  }
  if (value <= 34) {
    return meter('Temperature', value, 'COLD', 'warning');
  }
  if (value <= 65) {
    return meter('Temperature', value, 'COMFORTABLE', 'normal');
  }
  if (value <= 80) return meter('Temperature', value, 'HOT', 'warning');
  if (value <= 95) {
    return meter('Temperature', value, 'SEVERE HEAT', 'critical');
  }
  return meter('Temperature', value, 'CRITICAL HEAT', 'critical');
}

function itemName(catalog: ContentCatalogV1, id: ContentId): string {
  return catalog.get(id).displayName;
}

function inventoryItems(
  catalog: ContentCatalogV1,
  container: Readonly<ContainerView>,
): readonly Phase1InventoryItemPresentation[] {
  return Object.freeze(container.stacks.map((stack) => {
    const definition = catalog.getAs(stack.itemDefinitionId, 'item');
    return Object.freeze({
      id: stack.stackId,
      name: definition.displayName,
      quantity: stack.quantity,
      condition: stack.condition,
      stateLabel: stack.condition === 0 ? 'BROKEN' : null,
    });
  }));
}

function equipment(
  catalog: ContentCatalogV1,
  inventory: Readonly<ContainerView>,
  equippedStackId: string | null | undefined,
): Phase1EquipmentPresentation | null {
  if (equippedStackId === null || equippedStackId === undefined) return null;
  const stack = inventory.stacks.find(
    (candidate) => candidate.stackId === equippedStackId,
  );
  if (stack === undefined) return null;
  const definition = catalog.getAs(stack.itemDefinitionId, 'item');
  return Object.freeze({
    name: definition.displayName,
    condition: stack.condition,
    conditionMax: definition.conditionMax,
    stateLabel: stack.condition === 0
      ? 'BROKEN'
      : stack.condition === null
        ? 'EQUIPPED'
        : 'EQUIPPED',
  });
}

const FAILURE_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze({
  STALE_REVISION: 'STALE / WORLD STATE CHANGED',
  WORLD_STATE_CHANGED: 'STALE / WORLD STATE CHANGED',
  POSITION_TAKEN: 'WORLD STATE CHANGED / POSITION TAKEN',
  TARGET_ALREADY_TAKEN: 'WORLD STATE CHANGED / TARGET TAKEN',
  TARGET_CAPACITY_WEIGHT: 'INVENTORY WEIGHT LIMIT',
  TARGET_CAPACITY_VOLUME: 'INVENTORY VOLUME LIMIT',
  STACK_LIMIT: 'STACK FULL',
  QUANTITY_UNAVAILABLE: 'INSUFFICIENT MATERIAL',
  STATION_REQUIRED: 'WORKBENCH REQUIRED',
  TOOL_REQUIRED: 'MISSING / WRONG TOOL',
  TOOL_BROKEN: 'ITEM BROKEN',
  INSUFFICIENT_STAMINA: 'EXHAUSTED',
  EXHAUSTED: 'EXHAUSTED',
  OUT_OF_RANGE: 'TOO FAR',
  INVALID_REPAIR_TARGET: 'INVALID REPAIR TARGET',
  ITEM_FULL_CONDITION: 'ITEM ALREADY FULL CONDITION',
  UNEXPLORED_AREA: 'UNEXPLORED AREA',
  INVALID_TERRAIN: 'INVALID TERRAIN',
  NON_BUILDABLE_SURFACE: 'WATER / NON-BUILDABLE SURFACE',
  OBSTRUCTED: 'OBSTRUCTED',
  STRUCTURE_OVERLAP: 'STRUCTURE OVERLAP',
  BLOCKS_SPAWN: 'BLOCKS SPAWN',
  BLOCKS_REQUIRED_ACCESS: 'BLOCKS REQUIRED DOOR / CONNECTOR',
  OUTSIDE_BASE_BUILD_ZONE: 'OUTSIDE BASE BUILD ZONE',
  CONNECTOR_REQUIRED: 'CONNECTOR REQUIRED',
  INVALID_CONNECTOR: 'INVALID CONNECTOR',
  BUILD_LIMIT_REACHED: 'BUILD LIMIT REACHED',
  SOURCE_MISSING: 'SOURCE MISSING',
  OPERATION_ID_CONFLICT: 'WORLD STATE CHANGED',
  OUTPUT_FULL: 'OUTPUT FULL',
  INSUFFICIENT_POWER: 'INSUFFICIENT POWER',
  INVALID_WORLD_PLACEMENT: 'INVALID BUILD LOCATION',
  RESOURCE_DEPLETED: 'RESOURCE DEPLETED',
});

export function phase1FailureReasonLabel(reason: string): string {
  return FAILURE_REASON_LABELS[reason] ?? reason.replaceAll('_', ' ');
}

function commandInteraction(
  feedback: Phase1AuthoritativeCommandFeedback | null | undefined,
): Phase1InteractionPresentation | null {
  if (feedback === null || feedback === undefined) return null;
  const result = feedback.result;
  return Object.freeze({
    inputLabel: feedback.inputLabel,
    verb: feedback.verb,
    target: feedback.target,
    state: result.status === 'committed' ? 'AVAILABLE' : 'BLOCKED',
    reason: result.status === 'rejected'
      ? phase1FailureReasonLabel(result.reason ?? 'COMMAND REJECTED')
      : null,
    progress: null,
  });
}

function commandToasts(
  feedback: Phase1AuthoritativeCommandFeedback | null | undefined,
): readonly Phase1ToastPresentation[] {
  if (feedback === null || feedback === undefined) return Object.freeze([]);
  const result = feedback.result;
  if (result.status === 'rejected') {
    return Object.freeze([Object.freeze({
      id: `command:${result.operationId}`,
      kind: 'warning' as const,
      title: phase1FailureReasonLabel(result.reason ?? 'COMMAND REJECTED'),
      detail: feedback.target,
    })]);
  }
  return Object.freeze([]);
}

function worldTimeLabel(environment: Readonly<Phase1EnvironmentView>): string {
  const minute = Math.max(0, Math.floor(environment.localMinuteOfDay)) % 1440;
  const hours = Math.floor(minute / 60).toString().padStart(2, '0');
  const minutes = (minute % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

const TEAM_IDENTITY_PRESENTATION = Object.freeze({
  TEAM_A: Object.freeze({
    order: 0,
    label: 'TEAM A',
    markerShape: 'circle' as const,
  }),
  TEAM_B: Object.freeze({
    order: 1,
    label: 'TEAM B',
    markerShape: 'diamond' as const,
  }),
  TEAM_C: Object.freeze({
    order: 2,
    label: 'TEAM C',
    markerShape: 'triangle' as const,
  }),
});

function teamIdentityPresentation(
  slot: PlayerMotionViewV1['presentationIdentitySlot'],
) {
  switch (slot) {
    case 'TEAM_A':
      return TEAM_IDENTITY_PRESENTATION.TEAM_A;
    case 'TEAM_B':
      return TEAM_IDENTITY_PRESENTATION.TEAM_B;
    case 'TEAM_C':
      return TEAM_IDENTITY_PRESENTATION.TEAM_C;
    case 'LOCAL':
    case 'UNASSIGNED':
      return null;
  }
}

function teammates(
  localPlayerId: string,
  motions: readonly Readonly<PlayerMotionViewV1>[],
): readonly Phase1TeammatePresentation[] {
  const projected = motions.flatMap((motion) => {
    if (motion.playerId === localPlayerId) return [];
    const identity = teamIdentityPresentation(
      motion.presentationIdentitySlot,
    );
    if (identity === null) return [];
    return [Object.freeze({
      order: identity.order,
      presentation: Object.freeze({
        playerId: motion.playerId,
        label: identity.label,
        markerShape: identity.markerShape,
        stateLabel: motion.locomotionState.toUpperCase(),
      }),
    })];
  });
  return Object.freeze(
    projected
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.presentation),
  );
}

function inventoryPanel(
  input: Phase1RuntimePresentationInput,
  selectedStackId: string | null,
): Phase1InventoryPanelPresentation {
  const selected = input.inventory.stacks.find(
    (entry) => entry.stackId === selectedStackId,
  );
  const selectedDefinition = selected === undefined
    ? null
    : input.catalog.getAs(selected.itemDefinitionId, 'item');
  return Object.freeze({
    kind: 'inventory',
    title: 'Inventory',
    items: inventoryItems(input.catalog, input.inventory),
    selectedItemId: selected?.stackId ?? null,
    detail: selected === undefined || selectedDefinition === null
      ? `Weight ${input.inventory.totalWeightKg.toFixed(1)} / ${PLAYER_MAX_WEIGHT_KG} kg · Volume ${input.inventory.totalVolume.toFixed(1)} / ${PLAYER_MAX_VOLUME}`
      : `${selectedDefinition.displayName} · qty ${selected.quantity}${selected.condition === null ? '' : ` · condition ${selected.condition}/${selectedDefinition.conditionMax ?? 100}`}`,
  });
}

function containerPanel(
  input: Phase1RuntimePresentationInput,
  container: Readonly<ContainerView>,
): Phase1ContainerPanelPresentation {
  const result = input.commandFeedback?.result;
  return Object.freeze({
    kind: 'container',
    title: container.kind === 'death-cache' ? 'Death Cache' : 'Container',
    playerItems: inventoryItems(input.catalog, input.inventory),
    containerItems: inventoryItems(input.catalog, container),
    containerLabel: container.kind === 'storage-crate'
      ? `${container.totalWeightKg.toFixed(1)} kg · ${container.totalVolume.toFixed(1)} u`
      : container.kind.replaceAll('-', ' ').toUpperCase(),
    feedback: result?.status === 'rejected'
      ? phase1FailureReasonLabel(result.reason ?? 'COMMAND REJECTED')
      : null,
  });
}

function machinePanel(
  request: Extract<Phase1PresentationPanelRequest, { readonly kind: 'machine' }>,
  feedback: Phase1AuthoritativeCommandFeedback | null | undefined,
): Phase1MachinePanelPresentation {
  const reason = feedback?.result.status === 'rejected'
    ? phase1FailureReasonLabel(
        feedback.result.reason ?? 'COMMAND REJECTED',
      )
    : null;
  return Object.freeze({
    kind: 'machine',
    title: 'Atmospheric Water Condenser',
    stateLabel: request.machine.derivedState === 'OUTPUT_FULL'
      ? 'OUTPUT FULL'
      : request.machine.derivedState,
    powerLabel: `${request.powerDemandPu} PU demand · ${request.power.capacityPu} PU capacity`,
    outputLabel: `${request.machine.outputCount}/4 Clean Water`,
    reason,
  });
}

function recoveryPanel(
  input: Phase1RuntimePresentationInput,
  deathCache: Readonly<DeathCacheWorldView> | null,
): Phase1RecoveryPanelPresentation {
  const life = input.survival.lifeState;
  const dead = life.type === 'dead-pending-respawn';
  const committedDeath = input.deathResult?.status === 'committed'
    ? input.deathResult
    : null;
  return Object.freeze({
    kind: 'recovery',
    title: 'Recovery',
    deathCause: dead
      ? life.deathCause.replaceAll('-', ' ').toUpperCase()
      : 'ALIVE',
    respawnLabel: dead
      ? `Respawn at authority tick ${life.respawnAtTick}`
      : 'Respawn complete',
    consequenceLabel: committedDeath === null
      ? 'Authoritative death consequence pending'
      : `-${committedDeath.xpLoss} XP current-level progress`,
    cacheLabel: deathCache === null
      ? 'No active Death Cache'
      : `Death Cache · ${deathCache.containerId}`,
  });
}

function progressionPanel(
  catalog: ContentCatalogV1,
  progression: Readonly<PlayerProgressionView>,
): Phase1ProgressionPanelPresentation {
  const definition = catalog.getAs(
    'progression:phase1-early-progression',
    'progression',
  );
  const next = definition.levelThresholds.find(
    (threshold) => threshold.level === progression.level + 1,
  );
  return Object.freeze({
    kind: 'progression',
    title: 'Progression',
    levelLabel: `Level ${progression.level}`,
    xpLabel: next === undefined
      ? `${progression.totalXp} XP`
      : `${progression.totalXp} / ${next.totalXpRequired} XP`,
    skillLabels: Object.freeze(
      progression.skillIds.map((id) => itemName(catalog, id)),
    ),
    professionLabels: Object.freeze(
      progression.professionIds.map((id) => itemName(catalog, id)),
    ),
    questLabels: Object.freeze(
      progression.quests.map((quest) => {
        const name = itemName(catalog, quest.questId);
        return `${name} · ${quest.completedObjectives}/${quest.totalObjectives} · ${quest.status.toUpperCase()}`;
      }),
    ),
  });
}

function mapPanel(
  request: Extract<Phase1PresentationPanelRequest, { readonly kind: 'map' }>,
): Phase1MapPanelPresentation {
  const ruinLabel = request.ruin === null
    ? 'Ruin unknown'
    : request.ruin.discoveryState === 'unknown'
      ? 'Ruin unknown'
      : request.ruin.discoveryState === 'located'
        ? 'Uninvestigated Ruin'
        : 'Investigated Ruin';
  return Object.freeze({
    kind: 'map',
    title: 'Map / Recovery',
    fogLabel: request.exploration === null
      ? 'Shared exploration unavailable'
      : `Shared exploration · revision ${request.exploration.revision}`,
    ruinLabel,
    deathCacheLabel: request.deathCache === null
      ? null
      : `Death Cache · ${request.deathCache.containerId}`,
    sharedDiscoveryLabel: request.sharedDiscoveryConfirmed === true
      ? 'Shared Discovery'
      : null,
  });
}

export function applyPhase1AuthoritativeCommandFeedback(
  basePanel: Readonly<Phase1PanelPresentation> | null,
  feedback: Phase1AuthoritativeCommandFeedback | null | undefined,
): Phase1PanelPresentation | null {
  if (
    basePanel === null
    || feedback === null
    || feedback === undefined
    || feedback.result.status !== 'rejected'
  ) {
    return basePanel;
  }

  const reason = phase1FailureReasonLabel(
    feedback.result.reason ?? 'COMMAND REJECTED',
  );
  switch (basePanel.kind) {
    case 'container':
      return Object.freeze({ ...basePanel, feedback: reason });
    case 'craft':
      return Object.freeze({
        ...basePanel,
        rows: Object.freeze(basePanel.rows.map((row) =>
          feedback.panelTargetId !== null
          && feedback.panelTargetId !== undefined
          && row.id === feedback.panelTargetId
            ? Object.freeze({
                ...row,
                state: 'BLOCKED' as const,
                reason,
              })
            : row,
        )),
      });
    case 'build':
      return Object.freeze({
        ...basePanel,
        placementState: 'INVALID' as const,
        reason,
      });
    case 'machine':
      return Object.freeze({ ...basePanel, reason });
    case 'inventory':
    case 'recovery':
    case 'progression':
    case 'map':
      return basePanel;
  }
}

function panel(
  input: Phase1RuntimePresentationInput,
): Phase1PanelPresentation | null {
  if (input.presentationPanel !== undefined) {
    return applyPhase1AuthoritativeCommandFeedback(
      input.presentationPanel,
      input.commandFeedback,
    );
  }

  const request = input.panel;
  if (request === null || request === undefined) return null;
  let projected: Phase1PanelPresentation;
  switch (request.kind) {
    case 'inventory':
      projected = inventoryPanel(input, request.selectedStackId ?? null);
      break;
    case 'container':
      projected = containerPanel(input, request.container);
      break;
    case 'machine':
      projected = machinePanel(request, input.commandFeedback);
      break;
    case 'recovery':
      projected = recoveryPanel(input, request.deathCache);
      break;
    case 'progression':
      projected = progressionPanel(input.catalog, input.progression);
      break;
    case 'map':
      projected = mapPanel(request);
      break;
  }
  return applyPhase1AuthoritativeCommandFeedback(
    projected,
    input.commandFeedback,
  );
}

export function projectPhase1RuntimePresentation(
  input: Phase1RuntimePresentationInput,
): Readonly<Phase1PresentationState> {
  const environment = input.environment;
  const coldRain = environment.coldRainStatus;
  const teammateViews = teammates(
    input.survival.playerId,
    input.playerMotions ?? [],
  );
  const carryState = input.inventory.playerWeightState ?? 'NORMAL';

  return Object.freeze({
    health: healthMeter(input.survival.health),
    food: foodMeter(input.survival.food),
    water: waterMeter(input.survival.water),
    stamina: meter(
      'Stamina',
      input.survival.stamina,
      'CURRENT',
      'normal',
    ),
    temperature: temperatureMeter(input.survival.temperature),
    carry: Object.freeze({
      weightCurrent: input.inventory.totalWeightKg,
      weightMax: PLAYER_MAX_WEIGHT_KG,
      volumeCurrent: input.inventory.totalVolume,
      volumeMax: PLAYER_MAX_VOLUME,
      stateLabel: carryState,
    }),
    equipment: equipment(
      input.catalog,
      input.inventory,
      input.equippedStackId,
    ),
    world: Object.freeze({
      timeLabel: worldTimeLabel(environment),
      dayPeriod: environment.dayPeriod.toUpperCase() as 'DAY' | 'NIGHT',
      weatherLabel: coldRain === 'active'
        ? 'COLD RAIN'
        : coldRain === 'warning'
          ? 'COLD RAIN · FORECAST'
          : 'CLEAR',
      weatherState: coldRain === 'active'
        ? 'ACTIVE'
        : coldRain === 'warning'
          ? 'FORECAST'
          : 'CLEAR',
      teammateCount: 1 + teammateViews.length,
    }),
    interaction: commandInteraction(input.commandFeedback),
    toasts: commandToasts(input.commandFeedback),
    panel: panel(input),
    teammates: teammateViews,
  });
}
