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

export interface Phase1QuickUsePresentation {
  readonly inputLabel: 'V';
  readonly verb: 'CONSUME';
  readonly target: string | null;
  readonly state: 'AVAILABLE' | 'UNAVAILABLE';
}

export interface Phase1EquipmentSlotsPresentation {
  readonly weapon: Phase1EquipmentPresentation | null;
  readonly protection: Phase1EquipmentPresentation | null;
  readonly quickUse: Phase1QuickUsePresentation;
}

export interface Phase1WorldPresentation {
  readonly timeSegment?: string;
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
  readonly conditionMax?: number | null;
  readonly available?: boolean;
  readonly stateLabel: string | null;
}

export interface Phase1InventoryPanelPresentation {
  readonly kind: 'inventory';
  readonly title: string;
  readonly items: readonly Phase1InventoryItemPresentation[];
  readonly selectedItemId: string | null;
  readonly detail: string;
  readonly quantity: number;
  readonly controls: string;
  readonly feedback: string | null;
  readonly capacity?: Readonly<Phase1CarryPresentation>;
}

export interface Phase1ContainerCapacityPresentation {
  readonly weightCurrent: number;
  readonly weightMax: number;
  readonly volumeCurrent: number;
  readonly volumeMax: number;
}

export interface Phase1ContainerPanelPresentation {
  readonly kind: 'container';
  readonly title: string;
  readonly playerItems: readonly Phase1InventoryItemPresentation[];
  readonly containerItems: readonly Phase1InventoryItemPresentation[];
  readonly containerLabel: string;
  readonly selectedPlayerItemId: string | null;
  readonly selectedContainerItemId: string | null;
  readonly activePane: 'player' | 'storage';
  readonly quantity: number;
  readonly controls: string;
  readonly feedback: string | null;
  readonly playerCapacity?: Readonly<Phase1CarryPresentation>;
  readonly containerCapacity?: Readonly<Phase1ContainerCapacityPresentation> | null;
}

export interface Phase1CraftIngredientPresentation {
  readonly name: string;
  readonly have: number;
  readonly need: number;
}

export interface Phase1CraftOutputPresentation {
  readonly name: string;
  readonly quantity: number;
}

export interface Phase1CraftRowPresentation {
  readonly id: string;
  readonly name: string;
  readonly outputLabel: string;
  readonly outputs?: readonly Phase1CraftOutputPresentation[];
  readonly requirementLabel: string;
  readonly ingredients?: readonly Phase1CraftIngredientPresentation[];
  readonly stationLabel?: string | null;
  readonly state: 'AVAILABLE' | 'BLOCKED';
  readonly reason: string | null;
}

export interface Phase1CraftPanelPresentation {
  readonly kind: 'craft';
  readonly title: string;
  readonly rows: readonly Phase1CraftRowPresentation[];
}

export interface Phase1BuildCatalogEntryPresentation {
  readonly structureId: string;
  readonly name: string;
  readonly sourceKitName: string;
  readonly availableKitCount: number;
  readonly builtCount: number;
  readonly buildCap: number;
  readonly buildCapState: 'AVAILABLE' | 'CAP REACHED';
  readonly selected: boolean;
}

export interface Phase1BuildPanelPresentation {
  readonly kind: 'build';
  readonly expeditionEnabled?: boolean;
  readonly title: string;
  readonly selectedStructure: string;
  readonly sourceKitLabel: string;
  readonly placementState: 'VALID' | 'INVALID' | 'CONNECTOR';
  readonly reason: string | null;
  readonly catalogEntries?: readonly Phase1BuildCatalogEntryPresentation[];
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

export interface Phase1ProgressionRowPresentation {
  readonly id: string;
  readonly kind: 'skill' | 'profession' | 'objective';
  readonly label: string;
  readonly state: 'UNLOCKED' | 'LOCKED' | 'COMPLETE' | 'INCOMPLETE';
  readonly iconIndex: number;
  readonly groupLabel?: string;
}

export interface Phase1ProgressionPanelPresentation {
  readonly kind: 'progression';
  readonly title: string;
  readonly levelLabel: string;
  readonly xpLabel: string;
  readonly skillLabels: readonly string[];
  readonly professionLabels: readonly string[];
  readonly questLabels: readonly string[];
  readonly rows?: readonly Phase1ProgressionRowPresentation[];
}

export type Phase1MapDistanceBand = 'NEAR' | 'MID' | 'FAR';

export type Phase1MapMarkerKind =
  | 'player'
  | 'base'
  | 'ruin'
  | 'death-cache'
  | 'teammate';

export type Phase1MapFacing =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export interface Phase1MapExploredCellPresentation {
  readonly cellX: number;
  readonly cellY: number;
  readonly terrain: 'ground' | 'water';
  readonly motif: 'none' | 'flora';
}

export interface Phase1MapUnknownBoundaryCellPresentation {
  readonly cellX: number;
  readonly cellY: number;
}

export interface Phase1MapMarkerPresentation {
  readonly id: string;
  readonly kind: Phase1MapMarkerKind;
  readonly label: string;
  readonly atlasIndex: number;
  readonly worldX: number;
  readonly worldY: number;
  readonly facing: Phase1MapFacing | null;
  readonly distanceBand: Phase1MapDistanceBand | null;
  readonly selected: boolean;
  readonly identitySlot:
    | 'LOCAL'
    | 'TEAM_A'
    | 'TEAM_B'
    | 'TEAM_C'
    | 'TEAM_D' | 'TEAM_E' | 'TEAM_F' | 'TEAM_G'
    | null;
}

export interface Phase1SpatialMapPresentation {
  readonly cellSizeWorldUnits: number;
  readonly minCellX: number;
  readonly maxCellX: number;
  readonly minCellY: number;
  readonly maxCellY: number;
  readonly exploredCells: readonly Phase1MapExploredCellPresentation[];
  readonly unknownBoundaryCells:
    readonly Phase1MapUnknownBoundaryCellPresentation[];
  readonly markers: readonly Phase1MapMarkerPresentation[];
  readonly selectedDetailLabel: string | null;
  readonly selectedDistanceBand: Phase1MapDistanceBand | null;
  readonly selectableTargetCount: number;
  readonly knowledgePolicy: 'EXPLORED_ONLY';
}

export interface Phase1MapPanelPresentation {
  readonly kind: 'map';
  readonly title: string;
  readonly fogLabel: string;
  readonly ruinLabel: string;
  readonly deathCacheLabel: string | null;
  readonly sharedDiscoveryLabel: string | null;
  readonly spatial?: Readonly<Phase1SpatialMapPresentation>;
}

export interface Phase1ColonyPanelPresentation {
  readonly kind: 'colony';
  readonly title: string;
  readonly lines: readonly string[];
}

export type Phase1PanelPresentation =
  | Phase1ColonyPanelPresentation
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
  readonly presentationIdentitySlot: 'TEAM_A' | 'TEAM_B' | 'TEAM_C' | 'TEAM_D' | 'TEAM_E' | 'TEAM_F' | 'TEAM_G';
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
  readonly equipmentSlots?: Phase1EquipmentSlotsPresentation;
  readonly firstActionCue?: string | null;
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
