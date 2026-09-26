export type Phase1SemanticSeverity =
  | 'normal'
  | 'warning'
  | 'critical'
  | 'disabled';

export interface Phase1MeterPresentation {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly stateLabel: string;
  readonly severity: Phase1SemanticSeverity;
}

export interface Phase1CarryPresentation {
  readonly weightCurrent: number;
  readonly weightMax: number;
  readonly volumeCurrent: number;
  readonly volumeMax: number;
  readonly stateLabel: 'NORMAL' | 'HEAVY' | 'OVERLOADED';
}

export interface Phase1EquipmentPresentation {
  readonly name: string;
  readonly condition: number | null;
  readonly conditionMax: number | null;
  readonly stateLabel: string;
}

export interface Phase1WorldPresentation {
  readonly timeLabel: string;
  readonly dayPeriod: 'DAY' | 'NIGHT';
  readonly weatherLabel: string;
  readonly weatherState: 'CLEAR' | 'FORECAST' | 'ACTIVE';
  readonly teammateCount: number;
}

export interface Phase1InteractionPresentation {
  readonly inputLabel: string;
  readonly verb: string;
  readonly target: string;
  readonly state: 'AVAILABLE' | 'UNAVAILABLE' | 'BLOCKED' | 'CHANNELING';
  readonly reason: string | null;
  readonly progress: number | null;
}

export interface Phase1ToastPresentation {
  readonly id: string;
  readonly kind: 'info' | 'progression' | 'discovery' | 'warning';
  readonly title: string;
  readonly detail: string | null;
}

export interface Phase1InventoryItemPresentation {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly condition: number | null;
  readonly stateLabel: string | null;
}

export interface Phase1InventoryPanelPresentation {
  readonly kind: 'inventory';
  readonly title: string;
  readonly items: readonly Phase1InventoryItemPresentation[];
  readonly selectedItemId: string | null;
  readonly detail: string;
}

export interface Phase1ContainerPanelPresentation {
  readonly kind: 'container';
  readonly title: string;
  readonly playerItems: readonly Phase1InventoryItemPresentation[];
  readonly containerItems: readonly Phase1InventoryItemPresentation[];
  readonly containerLabel: string;
  readonly feedback: string | null;
}

export interface Phase1CraftRowPresentation {
  readonly id: string;
  readonly name: string;
  readonly outputLabel: string;
  readonly requirementLabel: string;
  readonly state: 'AVAILABLE' | 'BLOCKED';
  readonly reason: string | null;
}

export interface Phase1CraftPanelPresentation {
  readonly kind: 'craft';
  readonly title: string;
  readonly rows: readonly Phase1CraftRowPresentation[];
}

export interface Phase1BuildPanelPresentation {
  readonly kind: 'build';
  readonly title: string;
  readonly selectedStructure: string;
  readonly sourceKitLabel: string;
  readonly placementState: 'VALID' | 'INVALID' | 'CONNECTOR';
  readonly reason: string | null;
}

export interface Phase1MachinePanelPresentation {
  readonly kind: 'machine';
  readonly title: string;
  readonly stateLabel: 'DISABLED' | 'UNPOWERED' | 'RUNNING' | 'OUTPUT FULL';
  readonly powerLabel: string;
  readonly outputLabel: string;
  readonly reason: string | null;
}

export interface Phase1RecoveryPanelPresentation {
  readonly kind: 'recovery';
  readonly title: string;
  readonly deathCause: string;
  readonly respawnLabel: string;
  readonly consequenceLabel: string;
  readonly cacheLabel: string;
}

export interface Phase1ProgressionPanelPresentation {
  readonly kind: 'progression';
  readonly title: string;
  readonly levelLabel: string;
  readonly xpLabel: string;
  readonly skillLabels: readonly string[];
  readonly professionLabels: readonly string[];
  readonly questLabels: readonly string[];
}

export interface Phase1MapPanelPresentation {
  readonly kind: 'map';
  readonly title: string;
  readonly fogLabel: string;
  readonly ruinLabel: string;
  readonly deathCacheLabel: string | null;
  readonly sharedDiscoveryLabel: string | null;
}

export type Phase1PanelPresentation =
  | Phase1InventoryPanelPresentation
  | Phase1ContainerPanelPresentation
  | Phase1CraftPanelPresentation
  | Phase1BuildPanelPresentation
  | Phase1MachinePanelPresentation
  | Phase1RecoveryPanelPresentation
  | Phase1ProgressionPanelPresentation
  | Phase1MapPanelPresentation;

export interface Phase1TeammatePresentation {
  readonly playerId: string;
  readonly presentationIdentitySlot: 'TEAM_A' | 'TEAM_B' | 'TEAM_C';
  readonly label: string;
  readonly markerShape: 'circle' | 'diamond' | 'triangle';
  readonly stateLabel: string;
}

export interface Phase1PresentationState {
  readonly health: Phase1MeterPresentation;
  readonly food: Phase1MeterPresentation;
  readonly water: Phase1MeterPresentation;
  readonly stamina: Phase1MeterPresentation;
  readonly temperature: Phase1MeterPresentation;
  readonly carry: Phase1CarryPresentation;
  readonly equipment: Phase1EquipmentPresentation | null;
  readonly world: Phase1WorldPresentation;
  readonly interaction: Phase1InteractionPresentation | null;
  readonly toasts: readonly Phase1ToastPresentation[];
  readonly panel: Phase1PanelPresentation | null;
  readonly teammates: readonly Phase1TeammatePresentation[];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function validateMeter(
  meter: Phase1MeterPresentation,
  label: string,
): void {
  assertFinite(meter.value, `${label} value`);
  assertFinite(meter.max, `${label} max`);

  if (meter.max <= 0 || meter.value < 0 || meter.value > meter.max) {
    throw new Error(`${label} must remain within 0..max.`);
  }
}

export function validatePhase1PresentationState(
  state: Phase1PresentationState,
): void {
  validateMeter(state.health, 'Health');
  validateMeter(state.food, 'Food');
  validateMeter(state.water, 'Water');
  validateMeter(state.stamina, 'Stamina');
  validateMeter(state.temperature, 'Temperature');

  assertFinite(state.carry.weightCurrent, 'Carry current weight');
  assertFinite(state.carry.weightMax, 'Carry max weight');
  assertFinite(state.carry.volumeCurrent, 'Carry current volume');
  assertFinite(state.carry.volumeMax, 'Carry max volume');

  if (
    state.carry.weightCurrent < 0
    || state.carry.weightMax <= 0
    || state.carry.volumeCurrent < 0
    || state.carry.volumeMax <= 0
  ) {
    throw new Error('Carry presentation values must be non-negative with positive maxima.');
  }

  if (state.interaction?.progress !== null && state.interaction !== null) {
    const progress = state.interaction.progress;
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
      throw new Error('Interaction progress must remain within 0..1.');
    }
  }
}
