import { createPhase1ContentCatalog } from '../../content';
import type {
  Phase1PanelPresentation,
  Phase1PresentationState,
} from '../presentation/Phase1PresentationModel';
import { projectPhase1RuntimePresentation } from '../runtime/Phase1PresentationBinding';

export type Phase1PresentationQaMode =
  | 'overview'
  | 'inventory'
  | 'container'
  | 'craft'
  | 'build'
  | 'machine'
  | 'death'
  | 'progression'
  | 'map'
  | 'coop'
  | 'runtime';

export interface Phase1PresentationQaFixture {
  readonly mode: Phase1PresentationQaMode;
  readonly state: Phase1PresentationState;
}

function panelForMode(
  mode: Phase1PresentationQaMode,
): Phase1PanelPresentation | null {
  switch (mode) {
    case 'overview':
    case 'coop':
    case 'runtime':
      return null;

    case 'inventory':
      return Object.freeze({
        kind: 'inventory',
        title: 'INVENTORY',
        items: Object.freeze([
          Object.freeze({
            id: 'fiber',
            name: 'Plant Fiber',
            quantity: 8,
            condition: null,
            stateLabel: null,
          }),
          Object.freeze({
            id: 'tool',
            name: 'Stone Field Tool',
            quantity: 1,
            condition: 64,
            stateLabel: 'USABLE',
          }),
          Object.freeze({
            id: 'wrap',
            name: 'Thermal Wrap',
            quantity: 1,
            condition: 82,
            stateLabel: 'EQUIPPED',
          }),
        ]),
        selectedItemId: 'tool',
        detail: 'Stone Field Tool · 64/100 condition · 2.0 kg',
      });

    case 'container':
      return Object.freeze({
        kind: 'container',
        title: 'STORAGE TRANSFER',
        playerItems: Object.freeze([
          Object.freeze({
            id: 'timber',
            name: 'Timber',
            quantity: 6,
            condition: null,
            stateLabel: null,
          }),
        ]),
        containerItems: Object.freeze([
          Object.freeze({
            id: 'stone',
            name: 'Stone',
            quantity: 12,
            condition: null,
            stateLabel: null,
          }),
        ]),
        containerLabel: 'STORAGE CRATE · 100 kg / 120 u',
        feedback: 'STALE / WORLD STATE CHANGED',
      });

    case 'craft':
      return Object.freeze({
        kind: 'craft',
        title: 'CRAFT / REPAIR',
        rows: Object.freeze([
          Object.freeze({
            id: 'cordage',
            name: 'Cordage',
            outputLabel: '×1',
            requirementLabel: 'Plant Fiber 2/2',
            state: 'AVAILABLE',
            reason: null,
          }),
          Object.freeze({
            id: 'habitat',
            name: 'Habitat Kit',
            outputLabel: '×1',
            requirementLabel: 'Workbench + materials',
            state: 'BLOCKED',
            reason: 'WORKBENCH REQUIRED',
          }),
        ]),
      });

    case 'build':
      return Object.freeze({
        kind: 'build',
        title: 'BUILD',
        selectedStructure: 'Atmospheric Water Condenser',
        sourceKitLabel: 'Machine Kit ×1',
        placementState: 'INVALID',
        reason: 'OUT OF POWER RANGE',
      });

    case 'machine':
      return Object.freeze({
        kind: 'machine',
        title: 'ATMOSPHERIC WATER CONDENSER',
        stateLabel: 'UNPOWERED',
        powerLabel: 'Demand 5 PU · Available 0 PU',
        outputLabel: 'Clean Water 2 / 4',
        reason: 'INSUFFICIENT POWER',
      });

    case 'death':
      return Object.freeze({
        kind: 'recovery',
        title: 'RECOVERY',
        deathCause: 'CAUSE · HOSTILE ATTACK',
        respawnLabel: 'RESPAWN · 5 s · LANDING MODULE',
        consequenceLabel: 'XP -5% current-level progress · equipped durability -10',
        cacheLabel: 'DEATH CACHE ACTIVE · RECOVER YOUR GEAR',
      });

    case 'progression':
      return Object.freeze({
        kind: 'progression',
        title: 'PROGRESSION',
        levelLabel: 'LEVEL 3',
        xpLabel: '270 / 400 XP',
        skillLabels: Object.freeze([
          'Fieldcraft Basics',
          'Maintenance Basics',
        ]),
        professionLabels: Object.freeze([
          'Explorer — Prototype',
          'Engineer — Prototype',
        ]),
        questLabels: Object.freeze([
          'Chart the Unknown · COMPLETE',
          'Bring Water Online · IN PROGRESS',
        ]),
      });

    case 'map':
      return Object.freeze({
        kind: 'map',
        title: 'MAP / DISCOVERY',
        fogLabel: 'EXPLORED frontier with hard UNEXPLORED boundary',
        ruinLabel: 'Uninvestigated Ruin · LOCATED',
        deathCacheLabel: 'Most Recent Death Cache',
        sharedDiscoveryLabel: 'Shared Discovery · teammate located ruin',
      });
  }
}

function runtimeBindingFixtureState(): Phase1PresentationState {
  const catalog = createPhase1ContentCatalog();
  const inventory = Object.freeze({
    containerId: 'inventory:local-player',
    kind: 'player-inventory' as const,
    ownerPlayerId: 'local-player',
    revision: 7,
    stacks: Object.freeze([
      Object.freeze({
        stackId: 'runtime-spear',
        itemDefinitionId: 'item:basic-spear',
        quantity: 1,
        condition: 73,
      }),
    ]),
    totalWeightKg: 1.8,
    totalVolume: 2.5,
    playerWeightState: 'NORMAL' as const,
  });
  const crate = Object.freeze({
    containerId: 'container:runtime-crate',
    kind: 'storage-crate' as const,
    ownerPlayerId: null,
    revision: 12,
    stacks: Object.freeze([
      Object.freeze({
        stackId: 'runtime-stone',
        itemDefinitionId: 'item:stone',
        quantity: 4,
        condition: null,
      }),
    ]),
    totalWeightKg: 3,
    totalVolume: 3,
    playerWeightState: null,
  });

  return projectPhase1RuntimePresentation({
    catalog,
    survival: Object.freeze({
      playerId: 'local-player',
      revision: 11,
      tick: 3600,
      health: 72,
      food: 34,
      water: 21,
      stamina: 58,
      temperature: 27,
      lifeState: Object.freeze({ type: 'alive' as const }),
      staminaRegenPenaltyPercent: 30,
    }),
    inventory,
    equippedStackId: 'runtime-spear',
    environment: Object.freeze({
      state: Object.freeze({
        activeTick: 3600,
        cycleStartLocalMinute: 480,
        weatherEvents: Object.freeze([]),
      }),
      localMinuteOfDay: 1120,
      dayPeriod: 'night' as const,
      coldRainStatus: 'warning' as const,
    }),
    progression: Object.freeze({
      playerId: 'local-player',
      revision: 4,
      totalXp: 270,
      level: 3,
      milestoneRuleIds: Object.freeze([]),
      repeatCounts: Object.freeze({ gather: 0, craft: 0, repair: 0 }),
      skillIds: Object.freeze(['skill:fieldcraft-basics' as const]),
      quests: Object.freeze([
        Object.freeze({
          questId: 'profession-quest:chart-the-unknown' as const,
          status: 'in-progress' as const,
          completedObjectives: 2,
          totalObjectives: 3,
        }),
        Object.freeze({
          questId: 'profession-quest:bring-water-online' as const,
          status: 'locked' as const,
          completedObjectives: 0,
          totalObjectives: 3,
        }),
      ]),
      professionIds: Object.freeze([]),
    }),
    playerMotions: Object.freeze([
      Object.freeze({
        playerId: 'local-player',
        presentationIdentitySlot: 'LOCAL',
        authorityTick: 60,
        lastProcessedInputSeq: 10,
        position: Object.freeze({ x: 10, y: 10 }),
        facing: 'east',
        locomotionState: 'idle',
      }),
      Object.freeze({
        playerId: 'player:remote',
        presentationIdentitySlot: 'TEAM_A',
        authorityTick: 60,
        lastProcessedInputSeq: 8,
        position: Object.freeze({ x: 14, y: 12 }),
        facing: 'west',
        locomotionState: 'moving',
      }),
    ]),
    commandFeedback: Object.freeze({
      inputLabel: 'E',
      verb: 'TRANSFER',
      target: 'Shared Storage',
      result: Object.freeze({
        operationId: 'runtime:stale-transfer',
        status: 'rejected' as const,
        acceptedAuthorityTick: 60,
        authorityIngressOrdinal: 3,
        reason: 'STALE_REVISION',
      }),
    }),
    panel: Object.freeze({
      kind: 'container' as const,
      container: crate,
    }),
  });
}

function fixtureState(mode: Phase1PresentationQaMode): Phase1PresentationState {
  if (mode === 'runtime') return runtimeBindingFixtureState();
  const coOp = mode === 'coop';
  return Object.freeze({
    health: Object.freeze({
      label: 'HEALTH',
      value: 72,
      max: 100,
      stateLabel: 'HEALTHY',
      severity: 'normal',
    }),
    food: Object.freeze({
      label: 'FOOD',
      value: 34,
      max: 100,
      stateLabel: 'HUNGRY',
      severity: 'warning',
    }),
    water: Object.freeze({
      label: 'WATER',
      value: 21,
      max: 100,
      stateLabel: 'DEHYDRATED',
      severity: 'critical',
    }),
    stamina: Object.freeze({
      label: 'STAMINA',
      value: 58,
      max: 100,
      stateLabel: 'READY',
      severity: 'normal',
    }),
    temperature: Object.freeze({
      label: 'TEMP',
      value: 27,
      max: 100,
      stateLabel: 'COLD',
      severity: 'warning',
    }),
    carry: Object.freeze({
      weightCurrent: 18.5,
      weightMax: 20,
      volumeCurrent: 19,
      volumeMax: 24,
      stateLabel: 'HEAVY',
    }),
    equipment: Object.freeze({
      name: 'Stone Field Tool',
      condition: 64,
      conditionMax: 100,
      stateLabel: 'USABLE',
    }),
    world: Object.freeze({
      timeLabel: '18:40',
      dayPeriod: 'NIGHT',
      weatherLabel: 'COLD RAIN · FORECAST',
      weatherState: 'FORECAST',
      teammateCount: coOp ? 4 : 1,
    }),
    interaction: Object.freeze({
      inputLabel: 'E',
      verb: 'GATHER',
      target: 'Metal Ore Node',
      state: 'BLOCKED',
      reason: 'MISSING / WRONG TOOL',
      progress: null,
    }),
    toasts: Object.freeze([
      Object.freeze({
        id: 'rain',
        kind: 'warning',
        title: 'Cold Rain approaching',
        detail: 'Prepare thermal protection',
      }),
      Object.freeze({
        id: 'discovery',
        kind: 'discovery',
        title: 'Shared Discovery',
        detail: 'Uninvestigated Ruin located',
      }),
    ]),
    panel: panelForMode(mode),
    teammates: coOp
      ? Object.freeze([
          Object.freeze({
            playerId: 'teammate-a',
            label: 'Ari',
            markerShape: 'circle',
            stateLabel: 'BASE',
          }),
          Object.freeze({
            playerId: 'teammate-b',
            label: 'Bo',
            markerShape: 'diamond',
            stateLabel: 'EXPEDITION',
          }),
          Object.freeze({
            playerId: 'teammate-c',
            label: 'Cy',
            markerShape: 'triangle',
            stateLabel: 'RECOVERY',
          }),
        ])
      : Object.freeze([]),
  });
}

function parseMode(value: string | null): Phase1PresentationQaMode | null {
  switch (value) {
    case 'overview':
    case 'inventory':
    case 'container':
    case 'craft':
    case 'build':
    case 'machine':
    case 'death':
    case 'progression':
    case 'map':
    case 'coop':
    case 'runtime':
      return value;
    default:
      return null;
  }
}

export function resolvePhase1PresentationQaFixture(
  search: string,
): Phase1PresentationQaFixture | null {
  const params = new URLSearchParams(search);
  const mode = parseMode(params.get('qaPhase1'));

  if (mode === null) {
    return null;
  }

  return Object.freeze({
    mode,
    state: fixtureState(mode),
  });
}
