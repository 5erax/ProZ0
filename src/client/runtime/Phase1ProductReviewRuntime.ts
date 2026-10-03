import { isKnownMeleeEquipment } from '../../content/livingworld/EquipmentContent';
import {createLivingWorldOverlay} from '../presentation/LivingWorldOverlay';
import { RESOURCE_SIZE_PROFILES, resourceHarvestDefinition } from '../../content/livingworld/ResourceSizeProfiles';
import { installGameContextMenu } from '../input/GameContextMenu';
import { ColonyAutosaveCrossings, COLONY_AUTOSAVE_EVENT } from './ColonyAutosave';
import {createExpeditionOverlay} from '../presentation/ExpeditionOverlay';
import {createColonyPlaytestTools} from './ColonyPlaytestTools';
import type { PlayerId, WorldPosition } from '../../foundation';
import { phase1IsometricInput, unprojectPhase1Isometric } from './Phase1IsometricProjection';
import { CULTIVATION_POSITION, PEN_POSITION, GRAZER_CARE_TICKS, type ColonySustenanceAction }
  from '../../simulation/sustenance/ColonySustenanceAuthority';
import type {
  PlayerMotionViewV1,
  PresentationIdentitySlotV1,
} from '../../protocol';
import {
  PHASE1_STRUCTURE_PLACEMENT_PROFILES,
  type Phase1StructureDefinitionId,
} from '../../world';
import {
  Phase1AuthorityBundle,
  type Phase1AuthorityBundleConfig,
} from '../../integration/Phase1AuthorityBundle';
import type {
  ConsumeStartResult,
  ConsumeTickResult,
  FacingDirection,
  GatherStartResult,
  GatherTickResult,
} from '../../simulation';
import {
  Phase1SaveV2CheckpointCoordinator,
} from '../../integration/Phase1SaveV2Composer';
import type {
  SaveRepositoryV2,
  SaveResult,
} from '../../persistence/repository/SaveRepositoryV2';
import type {
  WorldManifestV2,
} from '../../persistence/schema/v2/WorldManifestV2';
import { KeyboardInputAdapter } from '../input/KeyboardInputAdapter';
import {
  isMovementInputCode,
  mapMovementInput,
} from '../input/MovementInputMapper';
import {
  createPhase1ProductReviewControls,
} from './Phase1ProductReviewControls';
import {
  createPhase1ProductReviewWorldRenderer,
  type Phase1ProductReviewBuildPreview,
  type Phase1ProductReviewRecoveredDeathCache,
  type Phase1ProductReviewWorldPresentationContext,
} from './Phase1ProductReviewWorldRenderer';
import {
  Phase1ProductReviewPresentationSource,
} from './Phase1ProductReviewPresentationSource';
import type {
  Phase1BuildPanelPresentation,
  Phase1CraftPanelPresentation,
  Phase1MachinePanelPresentation,
} from '../presentation/Phase1PresentationModel';
import {
  mountPhase1Presentation,
} from './Phase1PresentationMount';
import { FixedStepHost } from './FixedStepHost';
import { createColonyDepthOverlay } from '../presentation/ColonyDepthOverlay';

export interface Phase1ProductReviewRuntimeConfig
  extends Phase1AuthorityBundleConfig {
  readonly localPlayerId: PlayerId;
}

export interface Phase1ProductReviewRuntime {
  save(
    repository: SaveRepositoryV2,
    nowUtc: string,
  ): Promise<SaveResult<WorldManifestV2>>;
  getAuthorityTick(): number;
  destroy(): void;
}

interface GatherInteractionState {
  readonly operationId: string;
  readonly targetName: string;
  readonly requiredTicks: number;
  readonly startedTick: number;
}

interface ConsumeInteractionState {
  readonly operationId: string;
  readonly targetName: string;
  readonly inputLabel: string;
  readonly requiredTicks: number;
  readonly startedTick: number;
}

interface AttackPresentationState {
  readonly action: 'UNARMED_ATTACK' | 'SPEAR_ATTACK';
  readonly startedTick: number;
  readonly untilTick: number;
}

const CRAFT_PAGE_SIZE = 6;

const PHASE1_BUILD_CATALOG_ORDER = Object.freeze([
  'structure:storage-crate',
  'structure:workbench',
  'structure:habitat-room',
  'structure:compact-power-unit',
  'structure:atmospheric-water-condenser',
] as const);

type PlaceableStructureDefinitionId = Exclude<
  Phase1StructureDefinitionId,
  'structure:landing-module'
>;

function placeableStructureDefinitionId(
  id: string,
): PlaceableStructureDefinitionId {
  switch (id) {
    case 'structure:storage-crate':
    case 'structure:workbench':
    case 'structure:habitat-room':
    case 'structure:compact-power-unit':
    case 'structure:atmospheric-water-condenser':
      return id;
    default:
      throw new Error('Unsupported player-placeable structure: ' + id);
  }
}

function squaredDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function facingVector(
  facing: FacingDirection | null,
): { readonly x: number; readonly y: number } | null {
  switch (facing) {
    case 'N': return Object.freeze({ x: 0, y: -1 });
    case 'NE': return Object.freeze({ x: 1, y: -1 });
    case 'E': return Object.freeze({ x: 1, y: 0 });
    case 'SE': return Object.freeze({ x: 1, y: 1 });
    case 'S': return Object.freeze({ x: 0, y: 1 });
    case 'SW': return Object.freeze({ x: -1, y: 1 });
    case 'W': return Object.freeze({ x: -1, y: 0 });
    case 'NW': return Object.freeze({ x: -1, y: -1 });
    case null: return null;
  }
}

function connectorVector(
  key: string,
): { readonly x: number; readonly y: number } {
  switch (key) {
    case 'east': return Object.freeze({ x: 1, y: 0 });
    case 'south': return Object.freeze({ x: 0, y: 1 });
    case 'west': return Object.freeze({ x: -1, y: 0 });
    default: return Object.freeze({ x: 0, y: -1 });
  }
}

function connectorQuarterTurn(
  key: string,
): 0 | 1 | 2 | 3 {
  switch (key) {
    case 'east': return 0;
    case 'south': return 1;
    case 'west': return 2;
    default: return 3;
  }
}

function validateProductReviewConfig(
  config: Phase1ProductReviewRuntimeConfig,
): void {
  if (!config.playerIds.includes(config.localPlayerId)) {
    throw new Error('Product Review local player must belong to session players.');
  }
  if (
    !Number.isFinite(config.interactionRangeWorldUnits)
    || config.interactionRangeWorldUnits <= 0
  ) {
    throw new Error(
      'Product Review requires an approved positive ordinary interaction range.',
    );
  }
  if (
    !Number.isFinite(config.spawnClearanceRadiusWorldUnits)
    || config.spawnClearanceRadiusWorldUnits < 0
    || !Number.isFinite(config.requiredAccessRadiusWorldUnits)
    || config.requiredAccessRadiusWorldUnits < 0
  ) {
    throw new Error(
      'Product Review requires approved non-negative placement-clearance tuning.',
    );
  }
}

export async function createPhase1ProductReviewRuntime(
  root: HTMLElement,
  config: Phase1ProductReviewRuntimeConfig,
): Promise<Phase1ProductReviewRuntime> {
  validateProductReviewConfig(config);

  root.dataset.runtimeMode = 'phase1-product-review';
  root.dataset.phase1QaMode = 'none';
  root.dataset.visualQaMode = 'none';
  root.dataset.runtimeStatus = 'booting';

  const bundle = await Phase1AuthorityBundle.create({...config,...(config.colonyDepthEnabled===true && config.playerIds.length===1 ? {resourceProfileVersion:1 as const} : {}),singlePlayerExpeditionEnabled:config.colonyDepthEnabled===true && config.playerIds.length===1});
  const checkpointCoordinator =
    new Phase1SaveV2CheckpointCoordinator(bundle);
  const input = new KeyboardInputAdapter(
    mapMovementInput,
    isMovementInputCode,
  );

  // Product Review owns a stable presentation-session identity map.
  // Presentation consumers receive these explicit tokens and must never
  // reconstruct TEAM identity from PlayerId sorting or render order.
  const presentationIdentitySlots =
    new Map<PlayerId, PresentationIdentitySlotV1>();
  presentationIdentitySlots.set(config.localPlayerId, 'LOCAL');
  const teamSlots = Object.freeze([
    'TEAM_A',
    'TEAM_B',
    'TEAM_C',
    'TEAM_D', 'TEAM_E', 'TEAM_F', 'TEAM_G',
  ] as const);
  let teamSlotIndex = 0;
  for (const configuredPlayerId of config.playerIds) {
    if (configuredPlayerId === config.localPlayerId) continue;
    presentationIdentitySlots.set(
      configuredPlayerId,
      teamSlots[teamSlotIndex] ?? 'UNASSIGNED',
    );
    teamSlotIndex += 1;
  }

  const playerMotionViews = (): readonly Readonly<PlayerMotionViewV1>[] =>
    Object.freeze(bundle.getActivePlayerIds().map((id) => {
      const snapshot = bundle.getRuntime(id).getSnapshot().player;
      return Object.freeze({
        playerId: id,
        presentationIdentitySlot:
          presentationIdentitySlots.get(id) ?? 'UNASSIGNED',
        authorityTick: bundle.authorityTick,
        lastProcessedInputSeq: -1,
        position: Object.freeze({
          x: snapshot.position.x,
          y: snapshot.position.y,
        }),
        facing: snapshot.facing,
        locomotionState: snapshot.locomotionState,
      });
    }));

  let operationOrdinal = 0;
  let activeGather: GatherInteractionState | null = null;
  let activeConsume: ConsumeInteractionState | null = null;
  let attackPresentation: AttackPresentationState | null = null;
  let recoveredDeathCache:
    Phase1ProductReviewRecoveredDeathCache | null = null;
  let actionPanel: 'craft' | 'build' | 'machine' | 'colony' | null = null;
  let colonyFeedback = '';
  let machineStructureId: string | null = null;
  let craftPage = 0;
  let buildIndex = 0;
  let buildConnectorIndex = 0;
  let buildOrientation: 0 | 1 | 2 | 3 = 0;
  let buildAnchor: WorldPosition | null = null;
  let destroyed = false;
  let stepQueue = Promise.resolve();
  let worldPresentationContext:
    Readonly<Phase1ProductReviewWorldPresentationContext> =
      Object.freeze({
        localAction: null,
        localActionStartedTick: null,
        targetedDeathCacheId: null,
        recoveredDeathCache: null,
        buildPreview: null,
        focusedWorldTargetId: null,
      });

  const worldRenderer = createPhase1ProductReviewWorldRenderer(
    root,
    bundle,
    config.localPlayerId,
    () => worldPresentationContext,
    playerMotionViews,
  );
  const source = new Phase1ProductReviewPresentationSource(
    bundle,
    config.localPlayerId,
    playerMotionViews,
  );
  const presentation = mountPhase1Presentation(
    root,
    worldRenderer.canvas,
    source,
  );
  const controls = createPhase1ProductReviewControls(
    root,
    worldRenderer.canvas,
    config.colonyDepthEnabled === true,
  );

  let gatheredActions=0;
  const playtestTools=config.colonyDepthEnabled===true?createColonyPlaytestTools(root,()=>{const p=bundle.getPlayerPosition(config.localPlayerId),c=bundle.items.getContainerView('inventory:'+config.localPlayerId),d=bundle.colonyDepth.read();return {tick:bundle.authorityTick,x:p.x,y:p.y,carrying:c.playerWeightState??'NORMAL',stacks:c.stacks.length,sites:d.inspectedSites.length,biomes:d.discoveredBiomes.length,facilities:bundle.buildings.exportSnapshot().foothold.structures.length,gatherActions:gatheredActions,toolCondition:c.stacks.find(stack=>stack.itemDefinitionId==='item:stone-field-tool')?.condition??null};}):null;

  const nextOperationId = (kind: string): string =>
    'product-review:' + kind + ':' + String(++operationOrdinal);
  const colonyDepthOverlay=config.colonyDepthEnabled===true?createColonyDepthOverlay(root,bundle,config.localPlayerId,()=>{
    livingOverlay?.close();expeditionOverlay?.close();actionPanel=null;machineStructureId=null;controls.close();source.setPresentationPanel(null);source.setPanel(null);
  }):null;

  const livingOverlay=bundle.livingWorld?createLivingWorldOverlay(root,worldRenderer.canvas,bundle,config.localPlayerId,()=>{expeditionOverlay?.close();colonyDepthOverlay?.close();actionPanel=null;source.setPresentationPanel(null);source.setPanel(null);controls.close();}):null;
  const expeditionOverlay=bundle.expedition?createExpeditionOverlay(root,worldRenderer.canvas,bundle,config.localPlayerId,()=>{livingOverlay?.close();colonyDepthOverlay?.close();actionPanel=null;source.setPresentationPanel(null);source.setPanel(null);controls.close();}):null;
  const refreshColonyPanel = (): void => {
    if (actionPanel !== 'colony') return;
    const state = bundle.sustenance.read();
    source.setPresentationPanel(Object.freeze({ kind: 'colony', title: 'COLONY · CULTIVATION / HUSBANDRY · N TO CLOSE',
      lines: Object.freeze([
        'BED · ' + (!state.bedBuilt ? 'BUILD NEAR THE BED SITE WEST OF LANDING' : state.cropProgressTicks === null ? 'EMPTY · PLANT AN EDIBLE CUTTING + WATER'
          : state.cropProgressTicks >= state.cropCycleTicks ? 'READY TO HARVEST' : 'GROWING · ' + String(Math.ceil((state.cropCycleTicks - state.cropProgressTicks) / 60)) + 's'),
        'PEN · ' + (!state.penBuilt ? 'BUILD NEAR THE PEN SITE EAST OF LANDING' : state.animalEntityId === null ? 'EMPTY · FIND A PASSIVE GRAZER AND PRESS E TO CAPTURE (1 CORDAGE)'
          : state.careProgressTicks === null ? 'GRAZER · FEED + WATER FOR FERTILIZER' : 'CARED FOR · ' + String(Math.ceil((GRAZER_CARE_TICKS - state.careProgressTicks) / 60)) + 's'),
        'FERTILIZER · ' + String(state.fertilizer) + '/4 · reduces current crop time by 25%',
        'Growth runs only while this world is active. Build and care within reach of the site.',
        colonyFeedback,
      ]) }));
  };

  const colonyCommand = (action: ColonySustenanceAction, animalEntityId?: string): void => {
    const inventory = bundle.items.getContainerView('inventory:' + config.localPlayerId);
    const result = bundle.sustenance.execute({ operationId: nextOperationId('colony'), playerId: config.localPlayerId,
      expectedRevision: bundle.sustenance.read().revision, expectedInventoryRevision: inventory.revision,
      action, ...(animalEntityId === undefined ? {} : { animalEntityId }) });
    colonyFeedback = result.status === 'committed' ? action.toUpperCase() + ' · DONE' : result.reason.replaceAll('_', ' ');
    source.setLocalCommandFeedback({ inputLabel: 'N', operationId: result.operationId,
      status: result.status, ...(result.status === 'rejected' ? { reason: result.reason } : {}),
      verb: 'COLONY', target: action.toUpperCase() });
    refreshColonyPanel();
  };

  const playerPosition = () =>
    bundle.getPlayerPosition(config.localPlayerId);

  const interactionRangeSquared =
    config.interactionRangeWorldUnits
    * config.interactionRangeWorldUnits;

  const distanceFromPlayerSquared = (
    x: number,
    y: number,
  ): number => {
    const player = playerPosition();
    return squaredDistance(player.x, player.y, x, y);
  };

  const resourceTarget = () => {
    return bundle.world.getActiveGeneratedEntities()
      .filter((entity) => entity.type === 'resource')
      .map((entity) => ({
        entity,
        distance: distanceFromPlayerSquared(
          entity.position.x,
          entity.position.y,
        ),
      }))
      .filter((candidate) =>
        candidate.distance <= interactionRangeSquared,
      )
      .sort((left, right) =>
        left.distance - right.distance
        || left.entity.entityId.localeCompare(right.entity.entityId),
      )[0]?.entity ?? null;
  };

  const deathCacheTarget = () => {
    return bundle.world.exportSnapshot().deathCaches.caches
      .map((cache) => ({
        cache,
        distance: distanceFromPlayerSquared(
          cache.position.x,
          cache.position.y,
        ),
      }))
      .filter((candidate) =>
        candidate.distance <= interactionRangeSquared,
      )
      .sort((left, right) =>
        left.distance - right.distance
        || left.cache.entityId.localeCompare(right.cache.entityId),
      )
      .find((candidate) =>
        bundle.items.getContainerView(
          candidate.cache.containerId,
        ).stacks.length > 0,
      )?.cache ?? null;
  };

  const colonySiteTarget = (): 'Cultivation bed' | 'Grazer pen' | null => {
    if (distanceFromPlayerSquared(CULTIVATION_POSITION.x, CULTIVATION_POSITION.y) <= 1.25 ** 2) return 'Cultivation bed';
    if (distanceFromPlayerSquared(PEN_POSITION.x, PEN_POSITION.y) <= 1.25 ** 2) return 'Grazer pen';
    return null;
  };

  const worldDropTarget = () => bundle.world.exportSnapshot().drops
    .filter((drop) => drop.available
      && bundle.items.getContainerView(drop.containerId).stacks.length > 0
      && bundle.world.isWorldDropInInteractionRange(config.localPlayerId, drop.worldDropId))
    .sort((a, b) => distanceFromPlayerSquared(a.position.x, a.position.y)
      - distanceFromPlayerSquared(b.position.x, b.position.y)
      || a.worldDropId.localeCompare(b.worldDropId))[0] ?? null;

  const pickupWorldDrop = (): boolean => {
    const drop = worldDropTarget();
    if (drop === null) return false;
    const inventory = bundle.items.getContainerView('inventory:' + config.localPlayerId);
    const container = bundle.items.getContainerView(drop.containerId);
    const result = bundle.executeItemCommand({
      type: 'pickup', operationId: nextOperationId('pickup'),
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      worldDropId: drop.worldDropId,
      expectedWorldDropRevision: drop.revision,
      expectedDropContainerRevision: container.revision,
    });
    source.setLocalCommandFeedback({
      inputLabel: 'E', operationId: result.operationId, status: result.status,
      ...(result.status === 'rejected' ? { reason: result.reason } : {}),
      verb: 'PICK UP', target: 'Dropped items',
    });
    return true;
  };

  const ruinTarget = () => {
    const entity = bundle.world.findGeneratedEntityByDefinition(
      'ruin:previous-civilization-ruin',
    );
    if (
      entity === null
      || entity.type !== 'ruin'
      || !bundle.world.isGeneratedEntityInInteractionRange(
        config.localPlayerId,
        entity.entityId,
      )
    ) {
      return null;
    }
    const state = bundle.worldStore.getRuinState(entity.entityId);
    if (
      state === undefined
      || state.discoveryState === 'unknown'
      || (
        state.discoveryState === 'investigated'
        && state.physicalRewardState === 'claimed'
      )
    ) {
      return null;
    }
    return Object.freeze({ entity, state });
  };

  const machineTarget = () => {
    return bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .filter(
        (structure) =>
          structure.definitionId
            === 'structure:atmospheric-water-condenser'
          && bundle.world.isPlayerInInteractionRange(
            config.localPlayerId,
            structure.structureId,
          ),
      )
      .sort((left, right) =>
        left.structureId.localeCompare(right.structureId),
      )[0] ?? null;
  };

  const machinePanel = (
    structureId: string,
  ): Phase1MachinePanelPresentation => {
    const view = bundle.machines.getView(structureId);
    const power = bundle.buildings.getPowerNetwork();
    const machine = bundle.catalog.getAs(
      'machine:atmospheric-water-condenser',
      'machine',
    );
    return Object.freeze({
      kind: 'machine',
      title: 'Atmospheric Water Condenser · [E] INTERACT',
      stateLabel: view.derivedState === 'OUTPUT_FULL'
        ? 'OUTPUT FULL'
        : view.derivedState,
      powerLabel:
        String(machine.powerDemandPu)
        + ' PU demand · '
        + String(power.capacityPu)
        + ' PU capacity',
      outputLabel:
        String(view.outputCount)
        + '/'
        + String(machine.outputBufferCapacity)
        + ' Clean Water',
      reason: null,
    });
  };

  const refreshMachinePanel = (): void => {
    if (actionPanel !== 'machine' || machineStructureId === null) return;
    source.setPresentationPanel(machinePanel(machineStructureId));
  };

  const craftRecipes = () =>
    Object.freeze(
      [...bundle.catalog.list('recipe')].sort(
        (left, right) => left.id.localeCompare(right.id),
      ),
    );

  const accessibleWorkbench = () => {
    const workbench = bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .find(
        (structure) =>
          structure.definitionId === 'structure:workbench'
          && bundle.world.isWorkbenchAccessible(
            config.localPlayerId,
            structure.structureId,
          ),
      );
    return workbench ?? null;
  };

  const itemQuantity = (itemDefinitionId: string): number =>
    bundle.items
      .getContainerView('inventory:' + config.localPlayerId)
      .stacks
      .filter((stack) => stack.itemDefinitionId === itemDefinitionId)
      .reduce((sum, stack) => sum + stack.quantity, 0);

  const craftPanel = (): Phase1CraftPanelPresentation => {
    const recipes = craftRecipes();
    const pageCount = Math.max(
      1,
      Math.ceil(recipes.length / CRAFT_PAGE_SIZE),
    );
    craftPage = Math.min(Math.max(0, craftPage), pageCount - 1);
    const workbench = accessibleWorkbench();
    const page = recipes.slice(
      craftPage * CRAFT_PAGE_SIZE,
      (craftPage + 1) * CRAFT_PAGE_SIZE,
    );

    return Object.freeze({
      kind: 'craft',
      title:
        'CRAFT · PAGE '
        + String(craftPage + 1)
        + '/'
        + String(pageCount)
        + ' · [1-6] CRAFT · [ / ] PAGE',
      rows: Object.freeze(page.map((recipe, index) => {
        const missing = recipe.inputs.find(
          (input) => itemQuantity(input.itemId) < input.quantity,
        );
        const stationBlocked =
          recipe.requiredStationStructureId !== null
          && workbench === null;
        const reason = missing !== undefined
          ? 'NEED '
            + String(missing.quantity)
            + ' '
            + bundle.catalog.get(missing.itemId).displayName
          : stationBlocked
            ? 'WORKBENCH REQUIRED'
            : null;

        return Object.freeze({
          id: recipe.id,
          name: '[' + String(index + 1) + '] ' + recipe.displayName,
          outputLabel: recipe.outputs
            .map((output) =>
              String(output.quantity)
              + '× '
              + bundle.catalog.get(output.itemId).displayName,
            )
            .join(' + '),
          outputs: Object.freeze(recipe.outputs.map((output) =>
            Object.freeze({
              name: bundle.catalog.get(output.itemId).displayName,
              quantity: output.quantity,
            }),
          )),
          requirementLabel: recipe.inputs
            .map((input) =>
              String(input.quantity)
              + '× '
              + bundle.catalog.get(input.itemId).displayName,
            )
            .join(' + '),
          ingredients: Object.freeze(recipe.inputs.map((input) =>
            Object.freeze({
              name: bundle.catalog.get(input.itemId).displayName,
              have: itemQuantity(input.itemId),
              need: input.quantity,
            }),
          )),
          stationLabel: recipe.requiredStationStructureId === null
            ? null
            : workbench === null
              ? 'WORKBENCH · REQUIRED'
              : 'WORKBENCH · READY',
          state: reason === null ? 'AVAILABLE' : 'BLOCKED',
          reason,
        });
      })),
    });
  };

  const refreshCraftPanel = (): void => {
    if (actionPanel !== 'craft') return;
    source.setPresentationPanel(craftPanel());
  };

  const toggleCraftPanel = (): void => {
    if (actionPanel === 'craft') {
      actionPanel = null;
      source.setPresentationPanel(null);
      return;
    }
    actionPanel = 'craft';
    craftPage = 0;
    source.clearCommandFeedback();
    source.setPresentationPanel(craftPanel());
  };

  const changeCraftPage = (delta: number): void => {
    if (actionPanel !== 'craft') return;
    const pageCount = Math.max(
      1,
      Math.ceil(craftRecipes().length / CRAFT_PAGE_SIZE),
    );
    craftPage =
      (craftPage + delta + pageCount) % pageCount;
    source.clearCommandFeedback();
    source.setPresentationPanel(craftPanel());
  };

  const craftRecipeAtSlot = (slot: number): void => {
    if (actionPanel !== 'craft') return;
    const recipe = craftRecipes()[
      craftPage * CRAFT_PAGE_SIZE + slot
    ];
    if (recipe === undefined) return;

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const workbench = accessibleWorkbench();
    const result = bundle.executeItemCommand({
      type: 'craft',
      operationId: nextOperationId('craft'),
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      recipeId: recipe.id,
      ...(recipe.requiredStationStructureId === null
        || workbench === null
        ? {}
        : {
            workbench: {
              structureInstanceId: workbench.structureId,
              expectedRevision: workbench.revision,
            },
          }),
    });

    source.setPresentationPanel(craftPanel());
    source.setLocalCommandFeedback({
      inputLabel: String(slot + 1),
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'CRAFT',
      target: recipe.displayName,
      panelTargetId: recipe.id,
    });
  };

  const buildDefinitions = () =>
    Object.freeze(
      bundle.catalog
        .list('structure')
        .filter((definition) => definition.placeableByPlayer)
        .sort((left, right) => PHASE1_BUILD_CATALOG_ORDER.indexOf(placeableStructureDefinitionId(left.id))
          - PHASE1_BUILD_CATALOG_ORDER.indexOf(placeableStructureDefinitionId(right.id))),
    );

  const buildCatalogDefinitions = () => {
    const placeable = new Map(
      buildDefinitions().map(
        (definition) => [definition.id, definition] as const,
      ),
    );
    return Object.freeze(PHASE1_BUILD_CATALOG_ORDER.map((id) => {
      const definition = placeable.get(id);
      if (definition === undefined) {
        throw new Error(
          'Approved Phase 1 building catalog is missing ' + id + '.',
        );
      }
      return definition;
    }));
  };

  const landingConnectors = () =>
    bundle.buildings
      .exportSnapshot()
      .foothold.connectors
      .filter(
        (connector) =>
          connector.structureId === 'structure-instance:landing-module',
      );

  const selectedBuildDefinition = () => {
    const definitions = buildDefinitions();
    if (definitions.length === 0) {
      throw new Error('Phase 1 content has no player-placeable structure.');
    }
    buildIndex =
      (buildIndex % definitions.length + definitions.length)
      % definitions.length;
    return definitions[buildIndex]!;
  };

  const freeBuildPosition = (): WorldPosition => {
    if (buildAnchor !== null) return buildAnchor;
    const position = playerPosition();
    return { x: position.x + 2, y: position.y };
  };

  const placementIntent = () => selectedBuildDefinition().id === 'structure:habitat-room'
    ? { mode: 'connector' as const, targetConnectorId: landingConnectors()[buildConnectorIndex]?.connectorId
      ?? 'connector:landing:east', requestedOrientationQuarterTurns: buildOrientation }
    : { mode: 'free' as const, anchor: freeBuildPosition(), orientationQuarterTurns: buildOrientation };

  const buildPanel = (): Phase1BuildPanelPresentation => {
    const definition = selectedBuildDefinition();
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const kitId = definition.sourceKitItemId;
    if (kitId === null) {
      throw new Error('Player-placeable structure is missing its source Kit.');
    }
    const kit = inventory.stacks.find(
      (stack) => stack.itemDefinitionId === kitId,
    );
    const connectors = landingConnectors();
    if (connectors.length > 0) {
      buildConnectorIndex =
        (buildConnectorIndex % connectors.length + connectors.length)
        % connectors.length;
    }
    const connector = connectors[buildConnectorIndex];
    const connectorRequired =
      definition.id === 'structure:habitat-room';
    const spatial = bundle.buildings.assessPlacement(placeableStructureDefinitionId(definition.id), placementIntent());
    const reason = kit === undefined
      ? 'KIT UNAVAILABLE'
      : connectorRequired && connector === undefined
        ? 'NO LANDING CONNECTOR'
        : typeof spatial === 'string' ? spatial : null;

    const structures =
      bundle.buildings.exportSnapshot().foothold.structures;
    return Object.freeze({
      kind: 'build',
      expeditionEnabled:bundle.expedition!==null,
      title:
        'BUILD BASE',
      selectedStructure: definition.displayName,
      sourceKitLabel:
        bundle.catalog.get(kitId).displayName
        + ' ×'
        + String(kit?.quantity ?? 0)
        + (connectorRequired
          ? ' · '
            + (connector?.localConnectorKey.toUpperCase() ?? 'NO CONNECTOR')
          : ' · PLACE IN WORLD · '
            + String(buildOrientation * 90)
            + '°'),
      placementState: reason !== null
        ? 'INVALID'
        : connectorRequired
          ? 'CONNECTOR'
          : 'VALID',
      reason,
      catalogEntries: Object.freeze(buildCatalogDefinitions().map((entry) => {
        const entryKitId = entry.sourceKitItemId;
        if (entryKitId === null) {
          throw new Error(
            'Approved player-placeable structure is missing source kit.',
          );
        }
        const availableKitCount = inventory.stacks
          .filter((stack) => stack.itemDefinitionId === entryKitId)
          .reduce((sum, stack) => sum + stack.quantity, 0);
        const builtCount = structures.filter(
          (structure) => structure.definitionId === entry.id,
        ).length;
        return Object.freeze({
          structureId: entry.id,
          name: entry.displayName,
          sourceKitName: bundle.catalog.get(entryKitId).displayName,
          availableKitCount,
          builtCount,
          buildCap: bundle.buildings.structureCap(placeableStructureDefinitionId(entry.id)),
          buildCapState: builtCount >= bundle.buildings.structureCap(placeableStructureDefinitionId(entry.id))
            ? 'CAP REACHED' as const
            : 'AVAILABLE' as const,
          selected: entry.id === definition.id,
        });
      })),
    });
  };

  const refreshBuildPanel = (): void => {
    if (actionPanel !== 'build') return;
    source.setPresentationPanel(buildPanel());
  };

  const toggleBuildPanel = (): void => {
    if (actionPanel === 'build') {
      actionPanel = null;
      source.setPresentationPanel(null);
      return;
    }
    actionPanel = 'build';
    const inventory = bundle.items.getContainerView('inventory:' + config.localPlayerId);
    const ownedIndex = buildDefinitions().findIndex(definition => inventory.stacks.some(stack => stack.itemDefinitionId === definition.sourceKitItemId));
    buildIndex = Math.max(0, ownedIndex);
    buildAnchor = null;
    buildConnectorIndex = 0;
    buildOrientation = 0;
    source.clearCommandFeedback();
    source.setPresentationPanel(buildPanel());
  };

  const cycleBuildDefinition = (delta: number): void => {
    if (actionPanel !== 'build') return;
    const definitions = buildDefinitions();
    if (definitions.length === 0) return;
    buildIndex =
      (buildIndex + delta + definitions.length) % definitions.length;
    source.clearCommandFeedback();
    source.setPresentationPanel(buildPanel());
  };

  const cycleBuildConnector = (delta: number): void => {
    if (actionPanel !== 'build') return;
    const connectors = landingConnectors();
    if (connectors.length === 0) return;
    buildConnectorIndex =
      (buildConnectorIndex + delta + connectors.length) % connectors.length;
    source.clearCommandFeedback();
    source.setPresentationPanel(buildPanel());
  };

  const rotateBuild = (): void => {
    if (actionPanel !== 'build') return;
    buildOrientation = ((buildOrientation + 1) % 4) as 0 | 1 | 2 | 3;
    source.clearCommandFeedback();
    source.setPresentationPanel(buildPanel());
  };

  const placeSelectedStructure = (): void => {
    if (actionPanel !== 'build') return;
    const definition = selectedBuildDefinition();
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const kitId = definition.sourceKitItemId;
    if (kitId === null) return;
    const kit = inventory.stacks.find(
      (stack) => stack.itemDefinitionId === kitId,
    );
    const operationId = nextOperationId('build');
    const result = bundle.placeStructure({
      operationId,
      actorPlayerId: config.localPlayerId,
      structureDefinitionId:
        placeableStructureDefinitionId(definition.id),
      sourceKitStackId:
        kit?.stackId ?? 'missing-kit:' + definition.id,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      expectedBuildRevision: bundle.buildings.getBuildRevision(),
      placement: placementIntent(),
    });

    source.setPresentationPanel(buildPanel());
    source.setLocalCommandFeedback({
      inputLabel: 'ENTER',
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'BUILD',
      target: definition.displayName,
    });
  };

  const resolveGatherTool = (
    resourceDefinitionId: string,
  ): string | undefined => {
    const definition = bundle.catalog.getAs(
      resourceDefinitionId,
      'resource',
    );
    if (definition.requiredToolItemId === null) return undefined;
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    return inventory.stacks.find(
      (stack) =>
        stack.itemDefinitionId === definition.requiredToolItemId
        && (stack.condition === null || stack.condition > 0),
    )?.stackId;
  };

  const presentGatherStart = (
    start: Readonly<GatherStartResult>,
    targetName: string,
  ): void => {
    if (start.status === 'started') {
      activeGather = Object.freeze({
        operationId: start.operationId,
        targetName,
        requiredTicks: start.requiredTicks,
        startedTick: bundle.authorityTick,
      });
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'GATHER',
        target: targetName,
        state: 'CHANNELING',
        reason: null,
        progress: 0,
      }));
      return;
    }

    if (start.status === 'resolved') {
      source.setLocalCommandFeedback({
        operationId: start.result.operationId,
        status: start.result.status,
        ...(start.result.status === 'rejected'
          ? { reason: start.result.reason }
          : {}),
        verb: 'GATHER',
        target: targetName,
      });
      return;
    }

    source.setLocalCommandFeedback({
      operationId: start.operationId,
      status: 'rejected',
      reason: start.reason,
      verb: 'GATHER',
      target: targetName,
    });
  };

  const beginGather = (clickedId?: string): void => {
    bundle.expedition?.cancelRest(config.localPlayerId);
    if (activeGather !== null) {
      bundle.items.cancelGather(config.localPlayerId);
      activeGather = null;
      source.setInteraction(null);
      return;
    }

    const entity = clickedId===undefined ? resourceTarget() : bundle.world.getActiveGeneratedEntities().find(candidate=>candidate.entityId===clickedId) ?? null;
    if (entity === null || entity.type !== 'resource') {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'INTERACT',
        target: 'WORLD',
        state: 'UNAVAILABLE',
        reason: 'NO TARGET IN RANGE',
        progress: null,
      }));
      return;
    }

    const resource = bundle.worldStore.getResourceState(
      entity.entityId,
    );
    if (resource === undefined) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'GATHER',
        target: entity.definitionId,
        state: 'BLOCKED',
        reason: 'SOURCE MISSING',
        progress: null,
      }));
      return;
    }

    if(resource.depleted){refreshWorldPresentationContext();return;}

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const definition = bundle.catalog.getAs(
      entity.definitionId,
      'resource',
    );
    const operationId = nextOperationId('gather');
    const toolStackId = resolveGatherTool(entity.definitionId);
    const start = bundle.items.beginGather({
      operationId,
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      resourceEntityId: entity.entityId,
      expectedResourceRevision: resource.revision,
      ...(toolStackId === undefined ? {} : { toolStackId }),
    });
    presentGatherStart(start, definition.displayName);
  };

  const recoverDeathCache = (): boolean => {
    const cache = deathCacheTarget();
    if (cache === null) return false;

    const sourceContainer =
      bundle.items.getContainerView(cache.containerId);
    const stack = sourceContainer.stacks[0];
    if (stack === undefined) return false;
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const result = bundle.death.recoverFromDeathCache({
      type: 'transfer',
      operationId: nextOperationId('death-cache-recover'),
      playerId: config.localPlayerId,
      sourceContainerId: sourceContainer.containerId,
      sourceExpectedRevision: sourceContainer.revision,
      targetContainerId: inventory.containerId,
      targetExpectedRevision: inventory.revision,
      sourceStackId: stack.stackId,
      quantity: stack.quantity,
    });
    if (
      result.status === 'committed'
      && bundle.world.getDeathCacheByContainer(cache.containerId) === null
    ) {
      recoveredDeathCache = Object.freeze({
        entityId: cache.entityId,
        position: Object.freeze({ ...cache.position }),
        untilAuthorityTick: bundle.authorityTick + 45,
      });
    }
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'RECOVER',
      target: 'Death Cache',
    });
    return true;
  };

  const interactWithMachine = (): boolean => {
    const structure = machineTarget();
    if (structure === null) return false;

    const view = bundle.machines.getView(structure.structureId);
    const output = bundle.items.getContainerView(view.outputContainerId);
    const outputStack = output.stacks[0];
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );

    if (outputStack !== undefined) {
      const result = bundle.executeItemCommand({
        type: 'transfer',
        operationId: nextOperationId('machine-output'),
        playerId: config.localPlayerId,
        sourceContainerId: output.containerId,
        sourceExpectedRevision: output.revision,
        targetContainerId: inventory.containerId,
        targetExpectedRevision: inventory.revision,
        sourceStackId: outputStack.stackId,
        quantity: outputStack.quantity,
      });

      actionPanel = 'machine';
      machineStructureId = structure.structureId;
      source.setPresentationPanel(machinePanel(structure.structureId));
      source.setLocalCommandFeedback({
        operationId: result.operationId,
        status: result.status,
        ...(result.status === 'rejected'
          ? { reason: result.reason }
          : {}),
        verb: 'COLLECT',
        target: 'Clean Water',
      });
      return true;
    }

    const result = bundle.setCondenserEnabled({
      operationId: nextOperationId('machine-toggle'),
      actorPlayerId: config.localPlayerId,
      structureId: structure.structureId,
      expectedRevision: view.revision,
      enabled: !view.enabled,
    });

    actionPanel = 'machine';
    machineStructureId = structure.structureId;
    source.setPresentationPanel(machinePanel(structure.structureId));
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: result.status === 'committed' && result.enabled
        ? 'ENABLE'
        : 'DISABLE',
      target: 'Atmospheric Water Condenser',
    });
    return true;
  };

  const interactWithWorkbench = (): boolean => {
    const workbench = accessibleWorkbench();
    if (workbench === null) return false;

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const repairTarget = inventory.stacks.find((stack) => {
      if (stack.condition === null) return false;
      const definition = bundle.catalog.getAs(
        stack.itemDefinitionId,
        'item',
      );
      return definition.conditionMax !== null
        && stack.condition < definition.conditionMax;
    });

    if (repairTarget === undefined) {
      actionPanel = 'craft';
      craftPage = 0;
      source.clearCommandFeedback();
      source.setPresentationPanel(craftPanel());
      return true;
    }

    const result = bundle.executeItemCommand({
      type: 'repair',
      operationId: nextOperationId('repair'),
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      targetStackId: repairTarget.stackId,
      workbench: {
        structureInstanceId: workbench.structureId,
        expectedRevision: workbench.revision,
      },
    });
    const definition = bundle.catalog.getAs(
      repairTarget.itemDefinitionId,
      'item',
    );
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'REPAIR',
      target: definition.displayName,
    });
    return true;
  };

  const presentConsumeStart = (
    start: Readonly<ConsumeStartResult>,
    targetName: string,
    inputLabel: string,
  ): void => {
    if (start.status === 'started') {
      activeConsume = Object.freeze({
        operationId: start.operationId,
        targetName,
        inputLabel,
        requiredTicks: start.requiredTicks,
        startedTick: bundle.authorityTick,
      });
      source.setInteraction(Object.freeze({
        inputLabel,
        verb: 'CONSUME',
        target: targetName,
        state: 'CHANNELING',
        reason: null,
        progress: 0,
      }));
      return;
    }

    source.setLocalCommandFeedback({
      inputLabel,
      operationId: start.operationId,
      status: 'rejected',
      reason: start.reason,
      verb: 'CONSUME',
      target: targetName,
    });
    queueMicrotask(() => {
      if (!destroyed) refreshContextInteraction();
    });
  };

  const beginConsumeStack = (
    stackId: string | null,
    inputLabel: string,
    missingTargetLabel: string,
  ): void => {
    if (activeConsume !== null) {
      bundle.survival.cancelConsume(config.localPlayerId);
      return;
    }

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const stack = stackId === null
      ? undefined
      : inventory.stacks.find(
          (candidate) => candidate.stackId === stackId,
        );
    const operationId = nextOperationId('consume');
    const targetName = stack === undefined
      ? missingTargetLabel
      : bundle.catalog.get(stack.itemDefinitionId).displayName;
    const start = bundle.survival.beginConsume({
      operationId,
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      sourceStackId: stack?.stackId ?? 'missing-selected-stack',
    });
    presentConsumeStart(start, targetName, inputLabel);
  };

  const beginConsume = (): void => {
    bundle.expedition?.cancelRest(config.localPlayerId);
    beginConsumeStack(
      source.resolveQuickUseStackId(),
      'V',
      'Consumable',
    );
  };

  const updateConsume = (
    result: Readonly<ConsumeTickResult> | null,
  ): void => {
    if (activeConsume === null || result === null) return;

    switch (result.status) {
      case 'idle':
        return;
      case 'channeling':
        if (result.operationId !== activeConsume.operationId) return;
        source.setInteraction(Object.freeze({
          inputLabel: activeConsume.inputLabel,
          verb: 'CONSUME',
          target: activeConsume.targetName,
          state: 'CHANNELING',
          reason: null,
          progress: result.requiredTicks <= 0
            ? 1
            : result.elapsedTicks / result.requiredTicks,
        }));
        return;
      case 'canceled': {
        const targetName = activeConsume.targetName;
        const inputLabel = activeConsume.inputLabel;
        activeConsume = null;
        source.setLocalCommandFeedback({
          inputLabel,
          operationId: result.operationId,
          status: 'rejected',
          reason: result.reason,
          verb: 'CONSUME',
          target: targetName,
        });
        return;
      }
      case 'resolved': {
        const targetName = activeConsume.targetName;
        const inputLabel = activeConsume.inputLabel;
        activeConsume = null;
        source.setLocalCommandFeedback({
          inputLabel,
          operationId: result.operationId,
          status: result.committed ? 'committed' : 'rejected',
          ...(result.committed ? {} : { reason: 'SOURCE_MISSING' }),
          verb: 'CONSUME',
          target: targetName,
        });
      }
    }
  };

  const interactWithRuin = (): boolean => {
    const target = ruinTarget();
    if (target === null) return false;

    if (
      target.state.discoveryState === 'investigated'
      && target.state.physicalRewardState === 'claimable'
    ) {
      const inventory = bundle.items.getContainerView(
        'inventory:' + config.localPlayerId,
      );
      const result = bundle.claimRuinReward({
        operationId: nextOperationId('ruin-reward-claim'),
        playerId: config.localPlayerId,
        ruinEntityId: target.entity.entityId,
        expectedRuinRevision: target.state.revision,
        inventoryContainerId: inventory.containerId,
        expectedInventoryRevision: inventory.revision,
      });
      source.setLocalCommandFeedback({
        operationId: result.operationId,
        status: result.status,
        ...(result.status === 'rejected'
          ? { reason: result.reason }
          : {}),
        verb: 'CLAIM',
        target: 'Ancient Alloy Shard',
      });
      return true;
    }

    const result = bundle.inspectRuin({
      operationId: nextOperationId('ruin-inspect'),
      playerId: config.localPlayerId,
      ruinEntityId: target.entity.entityId,
      expectedRevision: target.state.revision,
    });
    source.setLocalCommandFeedback({
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'INSPECT',
      target: 'Previous-Civilization Ruin',
    });
    return true;
  };

  const refreshContextInteraction = (): void => {
    if (activeGather !== null || activeConsume !== null) return;

    const drop = worldDropTarget();
    if (drop !== null) {
      const stack = bundle.items.getContainerView(drop.containerId).stacks[0];
      source.setInteraction(Object.freeze({
        inputLabel: 'E', verb: 'PICK UP',
        target: stack === undefined ? 'Dropped items'
          : bundle.catalog.get(stack.itemDefinitionId).displayName + ' ×' + String(stack.quantity),
        state: 'AVAILABLE', reason: null, progress: null,
      }));
      return;
    }

    const nearbyAnimal = bundle.sustenance.read().penBuilt && bundle.sustenance.read().animalEntityId === null
      ? bundle.world.getActiveGeneratedEntities().find((entity) => entity.type === 'passive-wildlife'
        && distanceFromPlayerSquared(entity.position.x, entity.position.y) <= 1.25 ** 2) : undefined;
    if (nearbyAnimal !== undefined) {
      source.setInteraction(Object.freeze({ inputLabel: 'E', verb: 'CAPTURE', target: 'Grazer · 1 Cordage',
        state: 'AVAILABLE', reason: null, progress: null }));
      return;
    }
    const cache = deathCacheTarget();
    if (cache !== null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'RECOVER',
        target: 'Death Cache',
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    const ruin = ruinTarget();
    if (ruin !== null) {
      const claiming =
        ruin.state.discoveryState === 'investigated'
        && ruin.state.physicalRewardState === 'claimable';
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: claiming ? 'CLAIM' : 'INSPECT',
        target: claiming
          ? 'Ancient Alloy Shard'
          : 'Previous-Civilization Ruin',
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    const machine = machineTarget();
    if (machine !== null) {
      const view = bundle.machines.getView(machine.structureId);
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: view.outputCount > 0
          ? 'COLLECT'
          : view.enabled
            ? 'DISABLE'
            : 'ENABLE',
        target: 'Atmospheric Water Condenser',
        state: 'AVAILABLE',
        reason: view.derivedState,
        progress: null,
      }));
      return;
    }

    const workbench = accessibleWorkbench();
    if (workbench !== null) {
      const inventory = bundle.items.getContainerView(
        'inventory:' + config.localPlayerId,
      );
      const repairTarget = inventory.stacks.find((stack) => {
        if (stack.condition === null) return false;
        const definition = bundle.catalog.getAs(
          stack.itemDefinitionId,
          'item',
        );
        return definition.conditionMax !== null
          && stack.condition < definition.conditionMax;
      });
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: repairTarget === undefined ? 'CRAFT' : 'REPAIR',
        target: repairTarget === undefined
          ? 'Workbench'
          : bundle.catalog.get(
              repairTarget.itemDefinitionId,
            ).displayName,
        state: 'AVAILABLE',
        reason: null,
        progress: null,
      }));
      return;
    }

    const resource = resourceTarget();
    if (resource !== null && resource.type === 'resource') {
      const definition = bundle.catalog.getAs(
        resource.definitionId,
        'resource',
      );
      const resourceState = bundle.worldStore.getResourceState(resource.entityId);
      const renewing = resourceState?.depleted === true;
      const readyTick = resourceState?.regenerationReadyTick;
      const size = bundle.worldStore.getResourceSize(resource.entityId, resource.definitionId);
      const harvest = resourceHarvestDefinition(definition, size);
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: renewing ? 'RENEWING' : 'GATHER',
        target: definition.displayName,
        state: renewing ? 'BLOCKED' : 'AVAILABLE',
        reason: !renewing ? size ? RESOURCE_SIZE_PROFILES[size].label + ' · ' + harvest.output.quantity + ' ' + bundle.catalog.getAs(harvest.output.itemId, 'item').displayName + ' · ' + harvest.gatherChannelSeconds + 's' : null : readyTick == null ? 'Resource depleted' :
          'Regrows in ' + String(Math.max(0, Math.ceil((readyTick - bundle.authorityTick) / 60))) + 's of world time',
        progress: null,
      }));
      return;
    }

    const site = colonySiteTarget();
    if (site !== null) {
      source.setInteraction(Object.freeze({ inputLabel: 'E', verb: 'COLONY', target: site,
        state: 'AVAILABLE', reason: null, progress: null }));
      return;
    }
    source.setInteraction(null);
  };

  const beginContextInteraction = (): void => {
    if (activeGather !== null) {
      bundle.items.cancelGather(config.localPlayerId);
      activeGather = null;
      refreshContextInteraction();
      return;
    }
    if (pickupWorldDrop()) return;
    if (bundle.sustenance.read().penBuilt && bundle.sustenance.read().animalEntityId === null) {
      const animal = bundle.world.getActiveGeneratedEntities().find((entity) =>
        entity.type === 'passive-wildlife'
        && distanceFromPlayerSquared(entity.position.x, entity.position.y) <= 1.25 ** 2);
      if (animal !== undefined) { colonyCommand('capture', animal.entityId); return; }
    }
    if (recoverDeathCache()) return;
    if (interactWithRuin()) return;
    if (interactWithMachine()) return;
    if (interactWithWorkbench()) return;
    if (colonySiteTarget() !== null) { actionPanel = 'colony'; refreshColonyPanel(); return; }
    beginGather();
  };

  const updateGather = (
    result: Readonly<GatherTickResult> | null,
  ): void => {
    if (activeGather === null || result === null) return;

    switch (result.status) {
      case 'idle':
        return;
      case 'channeling':
        if (result.operationId !== activeGather.operationId) return;
        source.setInteraction(Object.freeze({
          inputLabel: 'E',
          verb: 'GATHER',
          target: activeGather.targetName,
          state: 'CHANNELING',
          reason: null,
          progress: result.requiredTicks <= 0
            ? 1
            : result.elapsedTicks / result.requiredTicks,
        }));
        return;
      case 'resolved': {
        if(result.result.status==='committed')gatheredActions++;
        const targetName = activeGather.targetName;
        activeGather = null;
        source.setLocalCommandFeedback({
          operationId: result.result.operationId,
          status: result.result.status,
          ...(result.result.status === 'rejected'
            ? { reason: result.result.reason }
            : {}),
          verb: 'GATHER',
          target: targetName,
        });
      }
    }
  };

  const toggleWeapon = (): void => {
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const current = bundle.equipment.reconcile(config.localPlayerId);
    const spear = inventory.stacks.find(
      (stack) =>
        isKnownMeleeEquipment(stack.itemDefinitionId)
        && stack.condition !== null
        && stack.condition > 0,
    );
    const next = current.equippedWeaponStackId === null
      ? spear?.stackId ?? null
      : null;
    const targetWeapon = inventory.stacks.find(stack => stack.stackId === current.equippedWeaponStackId) ?? spear;
    const result = bundle.equipWeapon(config.localPlayerId, next);
    source.setLocalCommandFeedback({
      inputLabel: 'Q',
      operationId: nextOperationId('equip-weapon'),
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: next === null ? 'UNEQUIP' : 'EQUIP',
      target: targetWeapon ? bundle.catalog.get(targetWeapon.itemDefinitionId).displayName : 'Weapon',
    });
    queueMicrotask(() => {
      if (!destroyed) refreshContextInteraction();
    });
  };

  const toggleThermalWrap = (): void => {
    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const current = bundle.equipment.reconcile(config.localPlayerId);
    const wrap = inventory.stacks.find(
      (stack) =>
        ((stack.itemDefinitionId === 'item:thermal-wrap'&&stack.condition !== null&&stack.condition>0)||stack.itemDefinitionId==='item:warm-cloak'),
    );
    const next = current.equippedThermalWrapStackId === null
      ? wrap?.stackId ?? null
      : null;
    const result = bundle.equipThermalWrap(config.localPlayerId, next);
    source.setLocalCommandFeedback({
      inputLabel: 'T',
      operationId: nextOperationId('equip-thermal-wrap'),
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: next === null ? 'UNEQUIP' : 'EQUIP',
      target: 'Thermal Wrap',
    });
    queueMicrotask(() => {
      if (!destroyed) refreshContextInteraction();
    });
  };

  const presentInventoryGuard = (
    inputLabel: string,
    verb: string,
    reason: string,
  ): void => {
    source.setLocalCommandFeedback({
      inputLabel,
      operationId: nextOperationId('inventory-guard'),
      status: 'rejected',
      reason,
      verb,
      target: 'Selected item',
    });
  };

  const selectedInventoryAction = (
    inputLabel: string,
    verb: string,
  ) => {
    const selection = source.getInventoryActionSelection();
    if (selection.normalizedDuringLookup) {
      presentInventoryGuard(
        inputLabel,
        verb,
        'SOURCE_MISSING',
      );
      return null;
    }
    return selection;
  };

  const beginSelectedConsume = (): void => {
    const selection = selectedInventoryAction('V', 'CONSUME');
    if (selection === null) return;
    if (selection.pane !== 'player') {
      presentInventoryGuard('V', 'CONSUME', 'TARGET_UNAVAILABLE');
      return;
    }
    beginConsumeStack(
      selection.stack?.stackId ?? null,
      'V',
      'Selected item',
    );
  };

  const toggleSelectedEquipment = (inputLabel: string): void => {
    const selection = selectedInventoryAction(inputLabel, 'EQUIP');
    if (selection === null) return;
    if (selection.pane !== 'player' || selection.stack === null) {
      presentInventoryGuard(inputLabel, 'EQUIP', 'SOURCE_MISSING');
      return;
    }
    const stack = selection.stack;
    const definition = bundle.catalog.getAs(
      stack.itemDefinitionId,
      'item',
    );
    const current = bundle.equipment.reconcile(config.localPlayerId);
    let verb: 'EQUIP' | 'UNEQUIP';
    let result:
      | ReturnType<typeof bundle.equipWeapon>
      | ReturnType<typeof bundle.equipThermalWrap>;

    if ((stack.itemDefinitionId === 'item:thermal-wrap'||stack.itemDefinitionId === 'item:warm-cloak')) {
      const next = current.equippedThermalWrapStackId === stack.stackId
        ? null
        : stack.stackId;
      verb = next === null ? 'UNEQUIP' : 'EQUIP';
      result = bundle.equipThermalWrap(config.localPlayerId, next);
    } else {
      const next = current.equippedWeaponStackId === stack.stackId
        ? null
        : stack.stackId;
      verb = next === null ? 'UNEQUIP' : 'EQUIP';
      result = bundle.equipWeapon(config.localPlayerId, next);
    }

    source.setLocalCommandFeedback({
      inputLabel,
      operationId: nextOperationId('inventory-equipment'),
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb,
      target: definition.displayName,
    });
  };

  const reconcileEquipmentAfterItemMove = (): void => {
    const current = bundle.equipment.reconcile(config.localPlayerId);
    bundle.equipWeapon(
      config.localPlayerId,
      current.equippedWeaponStackId,
    );
    bundle.equipThermalWrap(
      config.localPlayerId,
      current.equippedThermalWrapStackId,
    );
  };

  const dropSelectedInventoryQuantity = (): void => {
    const selection = selectedInventoryAction('G', 'DROP');
    if (selection === null) return;
    if (selection.pane !== 'player' || selection.stack === null) {
      presentInventoryGuard('G', 'DROP', 'SOURCE_MISSING');
      return;
    }
    const definition = bundle.catalog.getAs(
      selection.stack.itemDefinitionId,
      'item',
    );
    const result = bundle.executeItemCommand({
      type: 'drop',
      operationId: nextOperationId('inventory-drop'),
      playerId: config.localPlayerId,
      inventoryContainerId: selection.inventory.containerId,
      expectedInventoryRevision: selection.inventory.revision,
      sourceStackId: selection.stack.stackId,
      quantity: selection.quantity,
    });
    if (result.status === 'committed') {
      reconcileEquipmentAfterItemMove();
    }
    source.setLocalCommandFeedback({
      inputLabel: 'G',
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'DROP',
      target:
        definition.displayName + ' ×' + String(selection.quantity),
    });
  };

  const transferSelectedInventoryQuantity = (): void => {
    const selection = selectedInventoryAction('ENTER', 'TRANSFER');
    if (selection === null) return;
    if (
      selection.storage === null
      || selection.target === null
      || selection.stack === null
    ) {
      presentInventoryGuard('ENTER', 'TRANSFER', 'TARGET_UNAVAILABLE');
      return;
    }
    const definition = bundle.catalog.getAs(
      selection.stack.itemDefinitionId,
      'item',
    );
    const result = bundle.executeItemCommand({
      type: 'transfer',
      operationId: nextOperationId('inventory-transfer'),
      playerId: config.localPlayerId,
      sourceContainerId: selection.source.containerId,
      sourceExpectedRevision: selection.source.revision,
      targetContainerId: selection.target.containerId,
      targetExpectedRevision: selection.target.revision,
      sourceStackId: selection.stack.stackId,
      quantity: selection.quantity,
    });
    if (result.status === 'committed') {
      reconcileEquipmentAfterItemMove();
    }
    source.setLocalCommandFeedback({
      inputLabel: 'ENTER',
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'TRANSFER',
      target:
        definition.displayName
        + ' ×'
        + String(selection.quantity)
        + (selection.pane === 'player'
          ? ' · PLAYER → STORAGE'
          : ' · STORAGE → PLAYER'),
    });
  };

  const attackPredator = (): void => {
    bundle.expedition?.cancelRest(config.localPlayerId);
    const predator = bundle.world.findGeneratedEntityByDefinition(
      'hostile:territorial-predator',
    );
    if (predator === null || predator.type !== 'hostile') {
      source.setInteraction(Object.freeze({
        inputLabel: 'SPACE',
        verb: 'ATTACK',
        target: 'Territorial Predator',
        state: 'UNAVAILABLE',
        reason: 'NO HOSTILE TARGET',
        progress: null,
      }));
      return;
    }

    const runtime = bundle.getRuntime(config.localPlayerId);
    const facing = facingVector(runtime.getSnapshot().player.facing);
    if (facing === null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'SPACE',
        verb: 'ATTACK',
        target: 'Territorial Predator',
        state: 'BLOCKED',
        reason: 'MOVE TO SET FACING',
        progress: null,
      }));
      return;
    }

    const inventory = bundle.items.getContainerView(
      'inventory:' + config.localPlayerId,
    );
    const equipped =
      bundle.equipment.getView(config.localPlayerId)
        .equippedWeaponStackId !== null;
    const result = bundle.combat.submitAttack({
      attackId: nextOperationId('attack'),
      playerId: config.localPlayerId,
      inventoryContainerId: inventory.containerId,
      expectedInventoryRevision: inventory.revision,
      facingX: facing.x,
      facingY: facing.y,
    }, predator.entityId);
    if (result.status !== 'rejected') {
      attackPresentation = Object.freeze({
        action: equipped ? 'SPEAR_ATTACK' : 'UNARMED_ATTACK',
        startedTick: bundle.authorityTick,
        untilTick: bundle.authorityTick + (equipped ? 20 : 16),
      });
    }

    source.setLocalCommandFeedback({
      inputLabel: 'SPACE',
      operationId: result.attackId,
      status: result.status === 'rejected' ? 'rejected' : 'committed',
      ...(result.status === 'rejected' && result.reason !== undefined
        ? { reason: result.reason }
        : {}),
      verb: 'ATTACK',
      target:
        'Territorial Predator · '
        + result.status.toUpperCase(),
    });
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if(root.dataset.colonySettingsOpen==='true'||root.dataset.expeditionPanelOpen==='true'||root.dataset.livingPanelOpen==='true')return;
    if(event.code==='Enter' && event.target instanceof Element && actionPanel===null){const resource=event.target.closest<HTMLElement>('[data-world-role="resource"]');if(resource!==null){event.preventDefault();beginGather(resource.dataset.worldId);return;}}

    if (source.isInventoryOpen()) {
      if ((event.code === 'Enter' || event.code === 'Space') && event.target instanceof HTMLButtonElement) return;
      switch (event.code) {
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          source.cycleInventorySelection(-1);
          return;
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          source.cycleInventorySelection(1);
          return;
        case 'Tab':
          event.preventDefault();
          source.cycleInventoryPane();
          return;
        case 'BracketLeft':
          event.preventDefault();
          source.adjustInventoryQuantity(-1);
          return;
        case 'BracketRight':
          event.preventDefault();
          source.adjustInventoryQuantity(1);
          return;
        case 'Enter':
          event.preventDefault();
          transferSelectedInventoryQuantity();
          return;
        case 'KeyV':
          event.preventDefault();
          beginSelectedConsume();
          return;
        case 'KeyX':
        case 'KeyQ':
        case 'KeyT':
          event.preventDefault();
          toggleSelectedEquipment(event.code.slice(-1));
          return;
        case 'KeyG':
          event.preventDefault();
          dropSelectedInventoryQuantity();
          return;
      }
    }

    switch (event.code) {
      case 'KeyN':
        event.preventDefault();
        if (actionPanel === 'colony') { actionPanel = null; source.setPresentationPanel(null); }
        else { actionPanel = 'colony'; refreshColonyPanel(); }
        break;
      case 'KeyH':
        event.preventDefault();
        controls.toggle();
        break;
      case 'KeyE':
        event.preventDefault();
        beginContextInteraction();
        break;
      case 'KeyQ':
        event.preventDefault();
        toggleWeapon();
        break;
      case 'KeyT':
        event.preventDefault();
        toggleThermalWrap();
        break;
      case 'KeyV':
        event.preventDefault();
        beginConsume();
        break;
      case 'Space':
        event.preventDefault();
        attackPredator();
        break;
      case 'KeyC':
        event.preventDefault();
        toggleCraftPanel();
        break;
      case 'KeyB':
        event.preventDefault();
        toggleBuildPanel();
        break;
      case 'Tab':
        if (actionPanel === 'build') {
          event.preventDefault();
          cycleBuildDefinition(event.shiftKey ? -1 : 1);
        } else if (source.cycleMapDetail(event.shiftKey ? -1 : 1)) {
          event.preventDefault();
        }
        break;
      case 'KeyR':
        if (actionPanel === 'build') {
          event.preventDefault();
          rotateBuild();
        }
        break;
      case 'Enter':
        if (actionPanel === 'build') {
          event.preventDefault();
          placeSelectedStructure();
        }
        break;
      case 'PageUp':
      case 'BracketLeft':
        event.preventDefault();
        if (actionPanel === 'build') {
          cycleBuildConnector(-1);
        } else {
          changeCraftPage(-1);
        }
        break;
      case 'PageDown':
      case 'BracketRight':
        event.preventDefault();
        if (actionPanel === 'build') {
          cycleBuildConnector(1);
        } else {
          changeCraftPage(1);
        }
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
        if (actionPanel === 'craft') {
          event.preventDefault();
          craftRecipeAtSlot(Number(event.code.slice(-1)) - 1);
        }
        break;
      case 'Escape':
        event.preventDefault();
        controls.close();
        actionPanel = null;
        machineStructureId = null;
        source.setPresentationPanel(null);
        source.setPanel(null);
        break;
      case 'KeyI':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('inventory');
        break;
      case 'KeyM':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('map');
        break;
      case 'KeyP':
        event.preventDefault();
        actionPanel = null;
        source.togglePanel('progression');
        break;
    }
  };

  const buildPreview = (): Phase1ProductReviewBuildPreview | null => {
    if (actionPanel !== 'build') return null;
    const definition = selectedBuildDefinition();
    const panel = buildPanel();
    const connectorRequired =
      definition.id === 'structure:habitat-room';
    const connectors = landingConnectors();
    const connector = connectors[buildConnectorIndex];

    let position = freeBuildPosition();
    let orientation = buildOrientation;
    if (connectorRequired && connector !== undefined) {
      const landing = bundle.buildings.getStructure(
        'structure-instance:landing-module',
      );
      if (landing !== null) {
        const vector = connectorVector(connector.localConnectorKey);
        const landingOffset =
          PHASE1_STRUCTURE_PLACEMENT_PROFILES[
            'structure:landing-module'
          ].connectorOffsetWorldUnits ?? 0;
        const habitatOffset =
          PHASE1_STRUCTURE_PLACEMENT_PROFILES[
            'structure:habitat-room'
          ].connectorOffsetWorldUnits ?? 0;
        position = Object.freeze({
          x: landing.position.x
            + vector.x * (landingOffset + habitatOffset),
          y: landing.position.y
            + vector.y * (landingOffset + habitatOffset),
        });
        orientation = connectorQuarterTurn(
          connector.localConnectorKey,
        );
      }
    }

    return Object.freeze({
      definitionId: placeableStructureDefinitionId(definition.id),
      position: Object.freeze({ ...position }),
      orientationQuarterTurns: orientation,
      state: panel.placementState,
      reason: panel.reason,
    });
  };

  const focusedWorldTargetId = (): string | null => {
    const cache = deathCacheTarget();
    if (cache !== null) return cache.entityId;

    const ruin = ruinTarget();
    if (ruin !== null) return ruin.entity.entityId;

    const machine = machineTarget();
    if (machine !== null) return machine.structureId;

    const workbench = accessibleWorkbench();
    if (workbench !== null) return workbench.structureId;

    const resource = resourceTarget();
    return resource?.entityId ?? null;
  };

  const refreshWorldPresentationContext = (): void => {
    if (
      attackPresentation !== null
      && attackPresentation.untilTick < bundle.authorityTick
    ) {
      attackPresentation = null;
    }
    if (
      recoveredDeathCache !== null
      && recoveredDeathCache.untilAuthorityTick < bundle.authorityTick
    ) {
      recoveredDeathCache = null;
    }

    const localAction = activeGather !== null
      ? 'GATHER' as const
      : activeConsume !== null
        ? 'CONSUME' as const
        : attackPresentation?.action ?? null;
    const localActionStartedTick = activeGather?.startedTick
      ?? activeConsume?.startedTick
      ?? attackPresentation?.startedTick
      ?? null;
    worldPresentationContext = Object.freeze({
      localAction,
      localActionStartedTick,
      targetedDeathCacheId: deathCacheTarget()?.entityId ?? null,
      recoveredDeathCache,
      buildPreview: buildPreview(),
      focusedWorldTargetId: focusedWorldTargetId(),
    });
  };

  const dawnOrdinal = () => {
    const view = bundle.worldStore.getEnvironmentView();
    // Legacy saves retain their 48-minute clock and 06:00 dawn.
    return view.nightOrdinal ?? Math.floor((view.state.cycleStartLocalMinute + bundle.authorityTick / 120 - 360) / 1440);
  };
  const autosaveCrossings = new ColonyAutosaveCrossings(dawnOrdinal(), bundle.expedition?.read().restCooldown[config.localPlayerId] ?? 0);
  const host = new FixedStepHost({
    onStep: () => {
      const sampled = (root.dataset.colonySettingsOpen==='true'||root.dataset.expeditionPanelOpen==='true'||root.dataset.livingPanelOpen==='true'||root.dataset.productReviewPanelOpen==='true'||root.dataset.productReviewHelpOpen==='true') ? {moveUp:false,moveDown:false,moveLeft:false,moveRight:false} : input.sample();
      stepQueue = stepQueue.then(async () => {
        if (destroyed) return;
        bundle.submitInput(config.localPlayerId, phase1IsometricInput(sampled));
        await bundle.stepSolo();
        if (config.colonyDepthEnabled === true) {
          const intent = autosaveCrossings.advance(config.worldId, config.localPlayerId, bundle.authorityTick, dawnOrdinal(), bundle.expedition?.read().restCooldown[config.localPlayerId] ?? 0, bundle.survival.getPlayerState(config.localPlayerId).lifeState.type === 'alive');
          if (intent) root.dispatchEvent(new CustomEvent(COLONY_AUTOSAVE_EVENT, { detail: intent }));
        }
        colonyDepthOverlay?.render();
        updateGather(
          bundle.getLastGatherResult(config.localPlayerId),
        );
        updateConsume(
          bundle.getLastConsumeResult(config.localPlayerId),
        );
        source.beginPresentationBatch();
        try {
          refreshCraftPanel();
          refreshBuildPanel();
          refreshMachinePanel();
          refreshColonyPanel();
          refreshContextInteraction();
          refreshWorldPresentationContext();
        } finally { source.endPresentationBatch(); }
      }).catch((error: unknown) => {
        root.dataset.runtimeStatus = 'failed';
        console.error('Phase 1 Product Review authority step failed.', error);
      });
    },
    onRender: () => {
      // Present only the most recent completed authority state once per frame.
      if (!destroyed) {worldRenderer.render();expeditionOverlay?.render();livingOverlay?.render();}
    },
  });

  const updateBuildPointer = (event: MouseEvent): boolean => {
    if (actionPanel !== 'build' || !(event.target instanceof Element)
      || event.target.closest('.p1-ui') !== null) return false;
    const rect = worldRenderer.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * 640 / rect.width;
    const y = (event.clientY - rect.top) * 360 / rect.height;
    if (x < 0 || x > 640 || y < 0 || y > 360) return false;
    if (selectedBuildDefinition().id !== 'structure:habitat-room') {
      const position = unprojectPhase1Isometric({ x: x - 320, y: y - 180 }, playerPosition());
      const anchor = { x: Math.round(position.x * 4) / 4, y: Math.round(position.y * 4) / 4 };
      if (buildAnchor?.x !== anchor.x || buildAnchor.y !== anchor.y) {
        buildAnchor = anchor;
        source.setPresentationPanel(buildPanel());
        refreshWorldPresentationContext();
      }
    }
    return true;
  };

  const onPanelClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    if(config.colonyDepthEnabled===true && actionPanel===null && root.dataset.colonySettingsOpen!=='true' && root.dataset.livingPanelOpen!=='true'){
      const resource=event.target.closest<HTMLElement>('[data-world-role="resource"]');if(resource!==null){beginGather(resource.dataset.worldId);return;}
    }
    const item = event.target.closest<HTMLElement>('[data-review-item]');
    if (item !== null) {
      source.selectInventoryItem(item.dataset.reviewItem ?? '');
      return;
    }
    const action = event.target.closest<HTMLElement>('[data-review-action]')?.dataset.reviewAction;
    if(action==='open-expedition'){expeditionOverlay?.open();return;}
    if(action?.startsWith('open-')){livingOverlay?.close();colonyDepthOverlay?.close();expeditionOverlay?.close();}
    if(action==='inventory-stack'){
      const selection=source.getInventoryActionSelection(),containerId=selection.source.containerId;
      const view=bundle.items.getContainerView(containerId);let pair:null|[typeof view.stacks[number],typeof view.stacks[number]]=null;
      for(const target of view.stacks)for(const from of view.stacks)if(from.stackId!==target.stackId&&from.itemDefinitionId===target.itemDefinitionId&&from.condition===target.condition&&from.quantity+target.quantity<=bundle.catalog.getAs(target.itemDefinitionId,'item').maxStack)pair??=[from,target];
      if(!pair){presentInventoryGuard('STACK','STACK','NO_MATCHING_STACKS');return;}
      const operationId=nextOperationId('stack');const result=bundle.executeItemCommand({type:'merge',operationId,playerId:config.localPlayerId,containerId,expectedRevision:view.revision,sourceStackId:pair[0].stackId,targetStackId:pair[1].stackId});
      source.setLocalCommandFeedback({inputLabel:'STACK',operationId,status:result.status,reason:result.status==='rejected'?result.reason:'STACKS_COMBINED',verb:'STACK',target:'Matching items'});return;
    }
    if(action==='inventory-transfer-one'||action==='inventory-transfer-stack'){
      const selection=source.getInventoryActionSelection();
      if(selection.stack!==null){source.adjustInventoryQuantity((action==='inventory-transfer-one'?1:selection.stack.quantity)-selection.quantity);transferSelectedInventoryQuantity();}
      return;
    }
    if (action === 'open-inventory' || action === 'open-map') {
      actionPanel = null; source.setPresentationPanel(null);
      source.togglePanel(action === 'open-map' ? 'map' : 'inventory'); return;
    }
    if (action === 'open-craft') { source.setPanel(null); toggleCraftPanel(); return; }
    if (action === 'build-storage') {
      colonyDepthOverlay?.close();source.setPanel(null);actionPanel=null;toggleBuildPanel();
      buildIndex=Math.max(0,buildDefinitions().findIndex(definition=>definition.id==='structure:storage-crate'));
      source.setPresentationPanel(buildPanel());return;
    }
    if (action === 'open-build') { source.setPanel(null); toggleBuildPanel(); return; }
    if (action === 'open-colony') {
      source.setPanel(null);
      if (actionPanel === 'colony') { actionPanel = null; source.setPresentationPanel(null); }
      else { actionPanel = 'colony'; refreshColonyPanel(); }
      return;
    }
    if (action?.startsWith('craft-recipe:') && actionPanel === 'craft') {
      const index = craftRecipes().findIndex(recipe => recipe.id === action.slice(13));
      if (index >= 0 && Math.floor(index / CRAFT_PAGE_SIZE) === craftPage) craftRecipeAtSlot(index % CRAFT_PAGE_SIZE);
      return;
    }
    if (action?.startsWith('build-') && actionPanel === 'build') {
      if (action.startsWith('build-select:')) {
        const index = buildDefinitions().findIndex(definition => definition.id === action.slice(13));
        if (index >= 0) { buildIndex = index; buildAnchor = null; source.clearCommandFeedback(); refreshBuildPanel(); }
      } else if (action === 'build-place') placeSelectedStructure();
      else if (action === 'build-rotate') rotateBuild();
      else if (action === 'build-connector-previous') cycleBuildConnector(-1);
      else if (action === 'build-connector-next') cycleBuildConnector(1);
      else if (action === 'build-prepare') {
        const kitId = selectedBuildDefinition().sourceKitItemId;
        const index = craftRecipes().findIndex(recipe => recipe.outputs.some(output => output.itemId === kitId));
        if (index >= 0) { actionPanel = 'craft'; craftPage = Math.floor(index / CRAFT_PAGE_SIZE); source.clearCommandFeedback(); refreshCraftPanel(); }
      }
      return;
    }
    if (action === 'craft-previous') changeCraftPage(-1);
    if (action === 'craft-next') changeCraftPage(1);
    if (action?.startsWith('equip-slot:') && source.isInventoryOpen()) equipInventorySlot(action.slice('equip-slot:'.length));
    if (action?.startsWith('unequip-slot:') && source.isInventoryOpen()) {
      const slot = action.slice('unequip-slot:'.length), equipped = bundle.equipment.getView(config.localPlayerId);
      const stackId = slot === 'weapon' ? equipped.equippedWeaponStackId : slot === 'protection' ? equipped.equippedThermalWrapStackId : null;
      if (stackId) { source.selectInventoryItem(stackId); toggleSelectedEquipment('X'); }
    }
    if (action === 'equip' && source.isInventoryOpen()) toggleSelectedEquipment('X');
    if (action === 'inventory-use' && source.isInventoryOpen()) beginSelectedConsume();
    if (action === 'inventory-drop' && source.isInventoryOpen()) dropSelectedInventoryQuantity();
    if (action?.startsWith('colony:') && actionPanel === 'colony') {
      colonyCommand(action.slice(7) as ColonySustenanceAction);
      return;
    }
    if (updateBuildPointer(event)) placeSelectedStructure();
  };

  input.start();
  const equipInventorySlot = (slot: string, stackId?: string) => {
    if (!source.isInventoryOpen() || !['weapon', 'protection'].includes(slot)) return;
    if (stackId) {
      if (!bundle.items.getContainerView('inventory:' + config.localPlayerId).stacks.some(s => s.stackId === stackId)) { presentInventoryGuard('DRAG', 'EQUIP', 'SOURCE_MISSING'); return; }
      source.selectInventoryItem(stackId);
    }
    const selection = source.getInventoryActionSelection();
    const id = selection.stack?.itemDefinitionId;
    if (selection.pane !== 'player' || (slot === 'weapon' ? !isKnownMeleeEquipment(id ?? '') : id !== 'item:thermal-wrap' && id !== 'item:warm-cloak')) { presentInventoryGuard('EQUIP', 'EQUIP', 'INVALID_EQUIPMENT'); return; }
    const current = bundle.equipment.reconcile(config.localPlayerId);
    if ((slot === 'weapon' ? current.equippedWeaponStackId : current.equippedThermalWrapStackId) === selection.stack?.stackId) return;
    toggleSelectedEquipment('X');
  };
  const onGearDragStart = (event: DragEvent) => {
    if (!(event.target instanceof Element) || !source.isInventoryOpen()) return;
    const item = event.target.closest<HTMLElement>('[data-review-item][draggable=true]');
    if (!item || !bundle.items.getContainerView('inventory:' + config.localPlayerId).stacks.some(s => s.stackId === item.dataset.reviewItem)) { event.preventDefault(); return; }
    event.dataTransfer?.setData('application/x-proz0-inventory-stack', item.dataset.reviewItem!);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  };
  const onGearDragOver = (event: DragEvent) => { if (event.target instanceof Element && event.target.closest('[data-equipment-drop-slot]') && source.isInventoryOpen()) event.preventDefault(); };
  const onGearDrop = (event: DragEvent) => {
    const slot = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-equipment-drop-slot]')?.dataset.equipmentDropSlot : null;
    if (!slot || !source.isInventoryOpen()) return;
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer?.getData('application/x-proz0-inventory-stack');
    if (id && id.length < 512) equipInventorySlot(slot, id);
  };
  const removeContextMenu = installGameContextMenu(root, () => {
    livingOverlay?.cancelPlacement();
    expeditionOverlay?.cancelPlacement();
    if (actionPanel === 'build') {
      actionPanel = null;
      buildAnchor = null;
      source.setPresentationPanel(null);
      refreshWorldPresentationContext();
      worldRenderer.render();
    }
  });
  root.addEventListener('click', onPanelClick);
  root.addEventListener('dragstart', onGearDragStart);
  root.addEventListener('dragover', onGearDragOver);
  root.addEventListener('drop', onGearDrop);
  root.addEventListener('pointermove', updateBuildPointer);
  root.ownerDocument.addEventListener('keydown', onKeyDown);
  host.start();
  root.dataset.runtimeStatus = 'ready';
  root.dataset.productReviewAuthority = 'canonical';

  refreshContextInteraction();
  refreshWorldPresentationContext();
  worldRenderer.render();

  return Object.freeze({
    async save(
      repository: SaveRepositoryV2,
      nowUtc: string,
    ): Promise<SaveResult<WorldManifestV2>> {
      await stepQueue;
      if (destroyed) {
        throw new Error(
          'Cannot save a destroyed Phase 1 Product Review runtime.',
        );
      }
      return checkpointCoordinator.checkpoint(
        repository,
        { nowUtc },
      );
    },
    getAuthorityTick(): number {
      return bundle.authorityTick;
    },
    destroy(): void {
      destroyed = true;
      host.stop();
      input.stop();
      removeContextMenu();
      root.removeEventListener('click', onPanelClick);
      root.removeEventListener('dragstart', onGearDragStart);
      root.removeEventListener('dragover', onGearDragOver);
      root.removeEventListener('drop', onGearDrop);
      root.removeEventListener('pointermove', updateBuildPointer);
      root.ownerDocument.removeEventListener('keydown', onKeyDown);
      playtestTools?.destroy();
      controls.destroy();
      colonyDepthOverlay?.destroy();
      expeditionOverlay?.destroy();
      livingOverlay?.destroy();
      presentation.destroy();
      worldRenderer.destroy();
      void bundle.destroy();
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  });
}
