import { materialSource } from '../presentation/MaterialGuide';
import { CombatAssist, type AssistTarget } from '../input/CombatAssist';
import { traversableSegment } from '../../world/collision/TraversableSegment';
import { PLAYER_COLLISION_FOOTPRINT } from '../../simulation/player/PlayerCollisionFootprint';
import { uiText } from '../localization/UiMessages';
import { contentDisplayName } from '../localization/ContentText';
import { onLocaleChange } from '../localization/Locale';
import { uiPhrase } from '../localization/UiMessages';
import { wearableSlotFor, WEARABLE_SLOTS, type WearableSlot } from '../../content/livingworld/WearableContent';
import { isKnownMeleeEquipment } from '../../content/livingworld/EquipmentContent';
import {createLivingWorldOverlay} from '../presentation/LivingWorldOverlay';
import { installGameContextMenu } from '../input/GameContextMenu';
import { createEntityInspection } from '../presentation/EntityInspection';
import { ColonyAutosaveCrossings, COLONY_AUTOSAVE_EVENT } from './ColonyAutosave';
import {createExpeditionOverlay} from '../presentation/ExpeditionOverlay';
import { createIndustryPanel } from './IndustryPanel';
import {createColonyPlaytestTools} from './ColonyPlaytestTools';
import type { PlayerId, WorldPosition } from '../../foundation';
import { phase1IsometricInput, projectPhase1Isometric, unprojectPhase1Isometric } from './Phase1IsometricProjection';
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

  const solo = config.colonyDepthEnabled===true && config.playerIds.length===1;
  const bundle = await Phase1AuthorityBundle.create({...config,...(solo ? {resourceProfileVersion:1 as const,resourceLifecycleVersion:1 as const} : {}),singlePlayerExpeditionEnabled:solo,soloCavesEnabled:solo && (!config.reopen || !!config.reopen.bundle.world.soloCaves)});
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

  // Intent identity belongs to the client session; it is not world RNG.
  const operationSession = crypto.randomUUID();
  const nextOperationId = (kind: string): string =>
    'product-review:' + operationSession + ':' + kind + ':' + String(++operationOrdinal);
  const colonyDepthOverlay=config.colonyDepthEnabled===true?createColonyDepthOverlay(root,bundle,config.localPlayerId,()=>{
    livingOverlay?.close();expeditionOverlay?.close();actionPanel=null;machineStructureId=null;controls.close();source.setPresentationPanel(null);source.setPanel(null);
  }):null;

  const livingOverlay=bundle.livingWorld?createLivingWorldOverlay(root,worldRenderer.canvas,bundle,config.localPlayerId,()=>{expeditionOverlay?.close();colonyDepthOverlay?.close();actionPanel=null;source.setPresentationPanel(null);source.setPanel(null);controls.close();}):null;
  const expeditionOverlay=bundle.expedition?createExpeditionOverlay(root,worldRenderer.canvas,bundle,config.localPlayerId,()=>{livingOverlay?.close();colonyDepthOverlay?.close();actionPanel=null;source.setPresentationPanel(null);source.setPanel(null);controls.close();}):null;
  const entityInspection = createEntityInspection(root, () => ['industryOpen','colonySettingsOpen','livingPanelOpen','expeditionPanelOpen','colonyDepthPanelOpen','productReviewPanelOpen','productReviewHelpOpen'].some(key => root.dataset[key] === 'true'), view=>{
    const authority=bundle.resourceMarkers;if(!authority)return [];
    const spaceId=bundle.caves?.activeLayout()?.spaceId??'surface';
    const marked=authority.read().markers.some(m=>m.resourceId===view.id&&m.spaceId===spaceId);
    const known=bundle.caves?.activeLayout()?!!bundle.caves.getResource(view.id):bundle.world.getActiveGeneratedEntities().some(e=>e.entityId===view.id&&e.type==='resource'&&bundle.world.isExploredPosition(e.position));
    if(!known&&!marked)return [];
    return [{label:uiPhrase(marked?'Remove resource marker':'Mark resource on map'),run:()=>{const result=authority.set(config.localPlayerId,authority.read().revision,view.id,spaceId,!marked);source.setLocalCommandFeedback({operationId:nextOperationId('resource-marker'),verb:'MARK',target:view.name,status:result==='COMPLETE'?'committed':'rejected',...(result==='COMPLETE'?{}:{reason:result})});}}];
  });
  const industryPanel = bundle.industry ? createIndustryPanel(root, {
    markerHost: root.querySelector<HTMLElement>('.p1-product-world-stage') ?? undefined,
    read: () => bundle.industry!.read(),
    inventory: () => bundle.items.getContainerView('inventory:' + config.localPlayerId).stacks,
    colonyResearchIds: () => bundle.colonyDepth.read().researchIds,
    position: () => bundle.getPlayerPosition(config.localPlayerId),
    command: intent => bundle.industry!.execute({ ...intent, operationId: 'industry:' + crypto.randomUUID(), playerId: config.localPlayerId,
      expectedRevision: bundle.industry!.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + config.localPlayerId).revision }),
    project: position => {
      const stage = root.querySelector<HTMLElement>('.p1-product-world-stage');
      if (!stage || bundle.playerWorldspace() !== 'surface' || !bundle.world.isExploredPosition(position)) return null;
      const origin = { x: Number(stage.dataset.rasterOriginX), y: Number(stage.dataset.rasterOriginY) };
      const point = projectPhase1Isometric(position, origin);
      const visible = projectPhase1Isometric(position, bundle.getPlayerPosition(config.localPlayerId));
      return { x: 320 + point.x, y: 180 + point.y, visible: Math.abs(visible.x) < 350 && Math.abs(visible.y) < 200 };
    },
    onOpen: () => { livingOverlay?.close(); entityInspection.close(); colonyDepthOverlay?.close(); expeditionOverlay?.close(); actionPanel = null; source.setPresentationPanel(null); source.setPanel(null); controls.close(); },
  }) : null;
  const refreshColonyPanel = (): void => {
    if (actionPanel !== 'colony') return;
    const state = bundle.sustenance.read();
    source.setPresentationPanel(Object.freeze({ kind: 'colony', title: uiText("ui.72df119f"),
      lines: Object.freeze([
        uiText("ui.d95c84cb") + (!state.bedBuilt ? uiText("ui.a4b08895") : state.cropProgressTicks === null ? uiText("ui.db3227fc")
          : state.cropProgressTicks >= state.cropCycleTicks ? uiText("ui.7216f2bc") : uiText("ui.ae8998d") + String(Math.ceil((state.cropCycleTicks - state.cropProgressTicks) / 60)) + 's'),
        uiText("ui.303d5d9f") + (!state.penBuilt ? uiText("ui.ed2faa53") : state.animalEntityId === null ? uiText("ui.1bed2f0c")
          : state.careProgressTicks === null ? uiText("ui.e999e198") : uiText("ui.6361e952") + String(Math.ceil((GRAZER_CARE_TICKS - state.careProgressTicks) / 60)) + 's'),
        uiText("ui.1e56d5d2") + String(state.fertilizer) + uiText("ui.73ccb0cf"),
        uiText("ui.b5636e66"),
        colonyFeedback,
      ]) }));
  };

  const colonyCommand = (action: ColonySustenanceAction, animalEntityId?: string): void => {
    const inventory = bundle.items.getContainerView('inventory:' + config.localPlayerId);
    const result = bundle.sustenance.execute({ operationId: nextOperationId('colony'), playerId: config.localPlayerId,
      expectedRevision: bundle.sustenance.read().revision, expectedInventoryRevision: inventory.revision,
      action, ...(animalEntityId === undefined ? {} : { animalEntityId }) });
    colonyFeedback = result.status === 'committed' ? action.toUpperCase() + uiText("ui.1d09c118") : result.reason.replaceAll('_', ' ');
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

  const resourceEntities = () => bundle.caves?.activeLayout()?.nodes.map(n=>({type:'resource' as const,entityId:n.id,definitionId:n.resourceDefinitionId,position:n.position})) ?? bundle.world.getActiveGeneratedEntities();
  const resourceTarget = () => {
    return resourceEntities()
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
      .filter(({entity}) => bundle.interactionWorld.getResource(entity.entityId) !== null && bundle.interactionWorld.isResourceInInteractionRange(config.localPlayerId,entity.entityId))
      .sort((left, right) =>
        left.distance - right.distance
        || left.entity.entityId.localeCompare(right.entity.entityId),
      )[0]?.entity ?? null;
  };

  const deathCacheTarget = (entityId?: string) => {
    return (bundle.caves?.activeLayout() ? bundle.caves.read().spaces.find(s=>s.progress.spaceId===bundle.playerWorldspace())!.deathCaches : bundle.world.exportSnapshot().deathCaches.caches)
      .filter(cache=>entityId===undefined||cache.entityId===entityId)
      .filter(cache=>bundle.interactionWorld.isContainerAccessible(config.localPlayerId,cache.containerId))
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

  const colonySiteTarget = (): string | null => {
    if (bundle.playerWorldspace() !== 'surface') return null;
    if (distanceFromPlayerSquared(CULTIVATION_POSITION.x, CULTIVATION_POSITION.y) <= 1.25 ** 2) return uiText("ui.d0d61e4");
    if (distanceFromPlayerSquared(PEN_POSITION.x, PEN_POSITION.y) <= 1.25 ** 2) return uiText("ui.bb1bcdf");
    return null;
  };

  const worldDropTarget = (entityId?: string) => (bundle.caves?.activeLayout() ? bundle.caves.read().spaces.find(s=>s.progress.spaceId===bundle.playerWorldspace())!.drops : bundle.world.exportSnapshot().drops)
    .filter((drop) => (entityId===undefined||drop.worldDropId===entityId) && (!('available' in drop)||drop.available)
      && bundle.items.getContainerView(drop.containerId).stacks.length > 0
      && bundle.interactionWorld.isWorldDropInInteractionRange(config.localPlayerId, drop.worldDropId))
    .sort((a, b) => distanceFromPlayerSquared(a.position.x, a.position.y)
      - distanceFromPlayerSquared(b.position.x, b.position.y)
      || a.worldDropId.localeCompare(b.worldDropId))[0] ?? null;

  const pickupWorldDrop = (entityId?: string): boolean => {
    const drop = worldDropTarget(entityId);
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
      verb: uiText("ui.27956395"), target: uiText("ui.1eab2711"),
    });
    return true;
  };

  const ruinTarget = (entityId?: string) => {
    const entity = bundle.world.findGeneratedEntityByDefinition(
      'ruin:previous-civilization-ruin',
    );
    if (
      entity === null
      || (entityId!==undefined && entity.entityId!==entityId)
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

  const machineTarget = (structureId?: string) => {
    return bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .filter(
        (structure) =>
          (structureId === undefined || structure.structureId === structureId)
          && structure.definitionId
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
      title: uiText("ui.1a5f93ce"),
      stateLabel: view.derivedState === 'OUTPUT_FULL'
        ? 'OUTPUT FULL'
        : view.derivedState,
      powerLabel:
        String(machine.powerDemandPu)
        + uiText("ui.46f25466")
        + String(power.capacityPu)
        + uiText("ui.bf68680c"),
      outputLabel:
        String(view.outputCount)
        + '/'
        + String(machine.outputBufferCapacity)
        + uiText("ui.38644c6b"),
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

  const accessibleWorkbench = (structureId?: string) => {
    const workbench = bundle.buildings
      .exportSnapshot()
      .foothold.structures
      .find(
        (structure) =>
          (structureId === undefined || structure.structureId === structureId)
          && structure.definitionId === 'structure:workbench'
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
      page:craftPage,pageCount,
      title:
        uiText("ui.c2d411cd")
        + String(craftPage + 1)
        + '/'
        + String(pageCount)
        + uiText("ui.48cc7bed"),
      rows: Object.freeze(page.map((recipe, index) => {
        const missing = recipe.inputs.find(
          (input) => itemQuantity(input.itemId) < input.quantity,
        );
        const stationBlocked =
          recipe.requiredStationStructureId !== null
          && workbench === null;
        const reason = missing !== undefined
          ? uiText("ui.77e6ebb7")
            + String(missing.quantity)
            + ' '
            + contentDisplayName(bundle.catalog.get(missing.itemId))
          : stationBlocked
            ? uiText("ui.225d6b63")
            : null;

        return Object.freeze({
          id: recipe.id,
          name: '[' + String(index + 1) + '] ' + contentDisplayName(recipe),
          outputLabel: recipe.outputs
            .map((output) =>
              String(output.quantity)
              + '× '
              + contentDisplayName(bundle.catalog.get(output.itemId)),
            )
            .join(' + '),
          outputs: Object.freeze(recipe.outputs.map((output) =>
            Object.freeze({
              name: contentDisplayName(bundle.catalog.get(output.itemId)),
              quantity: output.quantity,
            }),
          )),
          requirementLabel: recipe.inputs
            .map((input) =>
              String(input.quantity)
              + '× '
              + contentDisplayName(bundle.catalog.get(input.itemId)),
            )
            .join(' + '),
          ingredients: Object.freeze(recipe.inputs.map((input) =>
            Object.freeze({
              name: contentDisplayName(bundle.catalog.get(input.itemId)),
              itemId:input.itemId,source:materialSource(bundle.catalog,input.itemId),
              have: itemQuantity(input.itemId),
              need: input.quantity,
            }),
          )),
          stationLabel: recipe.requiredStationStructureId === null
            ? null
            : workbench === null
              ? uiText("ui.981e9e70")
              : uiText("ui.168b3704"),
          state: reason === null ? "AVAILABLE" : "BLOCKED",
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
      target: contentDisplayName(recipe),
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
      ? uiText("ui.363e5599")
      : connectorRequired && connector === undefined
        ? uiText("ui.e67b1066")
        : typeof spatial === 'string' ? spatial : null;

    const structures =
      bundle.buildings.exportSnapshot().foothold.structures;
    return Object.freeze({
      kind: 'build',
      expeditionEnabled:bundle.expedition!==null,
      title:
        uiText("ui.b6847044"),
      selectedStructure: contentDisplayName(definition),
      sourceKitLabel:
        contentDisplayName(bundle.catalog.get(kitId))
        + ' ×'
        + String(kit?.quantity ?? 0)
        + (connectorRequired
          ? ' · '
            + (connector?.localConnectorKey.toUpperCase() ?? uiText("ui.849e34a1"))
          : uiText("ui.58a12351")
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
          name: contentDisplayName(entry),
          sourceKitName: contentDisplayName(bundle.catalog.get(entryKitId)),
          availableKitCount,
          builtCount,
          buildCap: bundle.buildings.structureCap(placeableStructureDefinitionId(entry.id)),
          buildCapState: builtCount >= bundle.buildings.structureCap(placeableStructureDefinitionId(entry.id))
            ? 'CAP REACHED' as const
            : "AVAILABLE" as const,
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
      inputLabel: uiText("ui.b57994ad"),
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'BUILD',
      target: contentDisplayName(definition),
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
        verb: "GATHER",
        target: targetName,
        state: "CHANNELING",
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
        verb: "GATHER",
        target: targetName,
      });
      return;
    }

    source.setLocalCommandFeedback({
      operationId: start.operationId,
      status: 'rejected',
      reason: start.reason,
      verb: "GATHER",
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

    const entity = clickedId===undefined ? resourceTarget() : resourceEntities().find(candidate=>candidate.entityId===clickedId) ?? null;
    if (entity === null || entity.type !== 'resource') {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: 'INTERACT',
        target: 'WORLD',
        state: 'UNAVAILABLE',
        reason: uiText("ui.35c6a49f"),
        progress: null,
      }));
      return;
    }

    const resource = bundle.interactionWorld.getResource(entity.entityId);
    if (resource == null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: "GATHER",
        target: entity.definitionId,
        state: "BLOCKED",
        reason: uiText("ui.7114c138"),
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
    presentGatherStart(start, contentDisplayName(definition));
  };

  const recoverDeathCache = (entityId?: string): boolean => {
    const cache = deathCacheTarget(entityId);
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
      && bundle.interactionWorld.getDeathCacheByContainer(cache.containerId) === null
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
      verb: uiText("ui.664322fb"),
      target: uiText("ui.77f67d4b"),
    });
    return true;
  };

  const interactWithMachine = (structureId?: string): boolean => {
    const structure = machineTarget(structureId);
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
        target: uiText("ui.c24d3555"),
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
      target: uiText("ui.b1048dd6"),
    });
    return true;
  };

  const interactWithWorkbench = (): boolean => {
    if (accessibleWorkbench() === null) return false;
    actionPanel='craft';craftPage=0;source.clearCommandFeedback();source.setPresentationPanel(craftPanel());return true;
  };
  const repairSelectedItem = (): void => {
    const selection=selectedInventoryAction('R','REPAIR'),workbench=accessibleWorkbench();
    if(!selection)return;
    if(!workbench){presentInventoryGuard('R','REPAIR','STATION_REQUIRED');return;}
    if(selection.pane!=='player'||!selection.stack){presentInventoryGuard('R','REPAIR','SOURCE_MISSING');return;}
    const result=bundle.executeItemCommand({type:'repair',operationId:nextOperationId('repair'),playerId:config.localPlayerId,inventoryContainerId:selection.inventory.containerId,expectedInventoryRevision:selection.inventory.revision,targetStackId:selection.stack.stackId,workbench:{structureInstanceId:workbench.structureId,expectedRevision:workbench.revision}});
    source.setLocalCommandFeedback({inputLabel:'R',operationId:result.operationId,status:result.status,...(result.status==='rejected'?{reason:result.reason}:{}),verb:'REPAIR',target:contentDisplayName(bundle.catalog.get(selection.stack.itemDefinitionId))});
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
        verb: "CONSUME",
        target: targetName,
        state: "CHANNELING",
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
      verb: "CONSUME",
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
      : contentDisplayName(bundle.catalog.get(stack.itemDefinitionId));
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
      uiText("ui.93d79fb2"),
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

  const interactWithRuin = (entityId?: string): boolean => {
    const target = ruinTarget(entityId);
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
        target: uiText("ui.61d11f88"),
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
      target: uiText("ui.4be1499c"),
    });
    return true;
  };

  const explorationSiteTarget = () => bundle.colonyDepth.sites().find(site=>site.template && bundle.world.isExploredPosition(site.position) && distanceFromPlayerSquared(site.position.x,site.position.y)<=1.25**2);
  const cavePortalTarget = () => {
    const cave=bundle.caves;if(!cave)return null;
    if(!cave.isSurface()){const l=cave.activeLayout()!;return distanceFromPlayerSquared(l.exit.x,l.exit.y)<=1.25**2?'exit:'+l.portalId:null;}
    return cave.portals.find(p=>bundle.world.isExploredPosition(p.position)&&distanceFromPlayerSquared(p.position.x,p.position.y)<=1.25**2)?.id??null;
  };
  const transitionCave = (id:string) => {
    const cave=bundle.caves;if(!cave)return;
    const result=cave.transition({id:nextOperationId('cave-transition'),action:id.startsWith('exit:')?'exit':'enter',portalId:id.replace(/^exit:/,''),expectedRevision:cave.read().revision});
    root.dataset.caveTransitionResult=result.message;
    source.setLocalCommandFeedback({operationId:nextOperationId('cave-feedback'),verb:uiText("ui.b63710f9"),target:uiText("ui.175e4a78"),status:result.status,...(result.status==='rejected'?{reason:result.message}:{})});
    if(result.status==='committed'){activeGather=null;activeConsume=null;actionPanel=null;source.setPanel(null);source.setPresentationPanel(null);livingOverlay?.close();expeditionOverlay?.close();colonyDepthOverlay?.close();entityInspection.close();controls.close();}
  };
  const refreshContextInteraction = (): void => {
    if(root.dataset.colonyDepthPanelOpen==='true'){source.setInteraction(null);return;}
    if (activeGather !== null || activeConsume !== null) return;
    const portal=cavePortalTarget();
    if(portal){source.setInteraction({inputLabel:'E',verb:portal.startsWith('exit:')?uiText("ui.79836105"):uiText("ui.b57994ad"),target:uiText("ui.d82f1717"),state:"AVAILABLE",reason:null,progress:null});return;}

    const drop = worldDropTarget();
    if (drop !== null) {
      const stack = bundle.items.getContainerView(drop.containerId).stacks[0];
      source.setInteraction(Object.freeze({
        inputLabel: 'E', verb: uiText("ui.27956395"),
        target: stack === undefined ? uiText("ui.1eab2711")
          : contentDisplayName(bundle.catalog.get(stack.itemDefinitionId)) + ' ×' + String(stack.quantity),
        state: "AVAILABLE", reason: null, progress: null,
      }));
      return;
    }

    const nearbyAnimal = bundle.playerWorldspace()==='surface' && bundle.sustenance.read().penBuilt && bundle.sustenance.read().animalEntityId === null
      ? bundle.world.getActiveGeneratedEntities().find((entity) => entity.type === 'passive-wildlife'
        && distanceFromPlayerSquared(entity.position.x, entity.position.y) <= 1.25 ** 2) : undefined;
    if (nearbyAnimal !== undefined) {
      source.setInteraction(Object.freeze({ inputLabel: 'E', verb: 'CAPTURE', target: uiText("ui.2c4a0a5"),
        state: "AVAILABLE", reason: null, progress: null }));
      return;
    }
    const cache = deathCacheTarget();
    if (cache !== null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: uiText("ui.664322fb"),
        target: uiText("ui.77f67d4b"),
        state: "AVAILABLE",
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
          ? uiText("ui.61d11f88")
          : uiText("ui.4be1499c"),
        state: "AVAILABLE",
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
        target: uiText("ui.b1048dd6"),
        state: "AVAILABLE",
        reason: view.derivedState,
        progress: null,
      }));
      return;
    }

    const workbench = accessibleWorkbench();
    if(workbench){source.setInteraction({inputLabel:'E',verb:'CRAFT',target:uiText("ui.f4823b5e"),state:'AVAILABLE',reason:null,progress:null});return;}

    const resource = resourceTarget();
    if (resource !== null && resource.type === 'resource') {
      const definition = bundle.catalog.getAs(
        resource.definitionId,
        'resource',
      );
      const resourceState = bundle.worldStore.getResourceState(resource.entityId);
      const renewing = resourceState?.depleted === true;
      const readyTick = resourceState?.regenerationReadyTick;
      source.setInteraction(Object.freeze({
        inputLabel: 'E',
        verb: renewing ? uiText("ui.e53c4b62") : "GATHER",
        target: contentDisplayName(definition),
        state: renewing ? "BLOCKED" : "AVAILABLE",
        reason: !renewing ? null : readyTick == null ? resourceState?.lifecycle?.kind === 'mineral' ? uiText("ui.a05a3297") : uiText("ui.53113f40") :
          uiText("ui.a2c2c475") + String(Math.max(0, Math.ceil((readyTick - bundle.authorityTick) / 60))) + uiText("ui.3ed94090"),
        progress: null,
      }));
      return;
    }

    const exploration=explorationSiteTarget();
    if(exploration){source.setInteraction(Object.freeze({inputLabel:'E',verb:'EXPLORE',target:uiPhrase(exploration.name),state:"AVAILABLE",reason:null,progress:null}));return;}
    const site = colonySiteTarget();
    if (site !== null) {
      source.setInteraction(Object.freeze({ inputLabel: 'E', verb: 'COLONY', target: site,
        state: "AVAILABLE", reason: null, progress: null }));
      return;
    }
    source.setInteraction(null);
  };

  /** Route an explicit building identity; never act on a different nearby building. */
  const interactWithStructure = (structureId: string): boolean => {
    const structure = bundle.buildings.exportSnapshot().foothold.structures.find(value => value.structureId === structureId);
    if (!structure) return false;
    if (!bundle.buildings.isStructureAccessible(config.localPlayerId, structureId)) {
      source.setLocalCommandFeedback({operationId:'view:'+structureId,verb:'INTERACT',target:contentDisplayName(bundle.catalog.get(structure.definitionId)),status:'rejected',reason:'OUT_OF_RANGE'});
      return true;
    }
    if (structureId === 'structure-instance:landing-module') { expeditionOverlay?.open('landing-lab'); return true; }
    if (structure.definitionId === 'structure:storage-crate') { source.openStorage(structureId); return true; }
    if (structure.definitionId === 'structure:workbench') { actionPanel='craft';craftPage=0;source.clearCommandFeedback();source.setPresentationPanel(craftPanel());return true; }
    if (structure.definitionId === 'structure:atmospheric-water-condenser') return interactWithMachine(structureId);
    expeditionOverlay?.open(structureId);return true;
  };

  const beginContextInteraction = (): void => {
    if (activeGather !== null) {
      bundle.items.cancelGather(config.localPlayerId);
      activeGather = null;
      refreshContextInteraction();
      return;
    }

    const portal=cavePortalTarget();if(portal){transitionCave(portal);return;}
    if(bundle.playerWorldspace()!=='surface'){if(pickupWorldDrop()||recoverDeathCache())return;beginGather();return;}
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
    if (config.colonyDepthEnabled === true && resourceTarget() === null) {
      const structure=bundle.buildings.exportSnapshot().foothold.structures.filter(value => bundle.buildings.isStructureAccessible(config.localPlayerId,value.structureId)).sort((a,b)=>distanceFromPlayerSquared(a.position.x,a.position.y)-distanceFromPlayerSquared(b.position.x,b.position.y)||a.structureId.localeCompare(b.structureId))[0];
      if (structure && interactWithStructure(structure.structureId)) return;
    }
    if(resourceTarget()===null){const site=explorationSiteTarget();if(site){colonyDepthOverlay?.openSite(site.id);return;}}
    if (colonySiteTarget() !== null) { actionPanel = 'colony'; refreshColonyPanel(); return; }
    const resource=resourceTarget();
    if(resource && bundle.worldStore.getResourceState(resource.entityId)?.depleted && ['resource:timber-source','resource:fiber-plant','resource:food-plant'].includes(resource.definitionId)){livingOverlay?.open(resource.entityId);return;}
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
      target: targetWeapon ? contentDisplayName(bundle.catalog.get(targetWeapon.itemDefinitionId)) : uiText("ui.b7c10361"),
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
      target: uiText("ui.cd44c054"),
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
      target: uiText("ui.a3cfc913"),
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
    const selection = selectedInventoryAction('V', "CONSUME");
    if (selection === null) return;
    if (selection.pane !== 'player') {
      presentInventoryGuard('V', "CONSUME", 'TARGET_UNAVAILABLE');
      return;
    }
    beginConsumeStack(
      selection.stack?.stackId ?? null,
      'V',
      uiText("ui.a3cfc913"),
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

    const wearableSlot = wearableSlotFor(stack.itemDefinitionId);
    if (wearableSlot !== null) {
      const next = current.wearables[wearableSlot] === stack.stackId ? null : stack.stackId;
      verb = next === null ? 'UNEQUIP' : 'EQUIP';
      result = bundle.equipment.equipWearable(config.localPlayerId, wearableSlot, next);
    } else if ((stack.itemDefinitionId === 'item:thermal-wrap'||stack.itemDefinitionId === 'item:warm-cloak')) {
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
      target: contentDisplayName(definition),
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
        contentDisplayName(definition) + ' ×' + String(selection.quantity),
    });
  };

  const transferSelectedInventoryQuantity = (): void => {
    const selection = selectedInventoryAction(uiText("ui.b57994ad"), 'TRANSFER');
    if (selection === null) return;
    if (
      selection.storage === null
      || selection.target === null
      || selection.stack === null
    ) {
      presentInventoryGuard(uiText("ui.b57994ad"), 'TRANSFER', 'TARGET_UNAVAILABLE');
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
      inputLabel: uiText("ui.b57994ad"),
      operationId: result.operationId,
      status: result.status,
      ...(result.status === 'rejected'
        ? { reason: result.reason }
        : {}),
      verb: 'TRANSFER',
      target:
        contentDisplayName(definition)
        + ' ×'
        + String(selection.quantity)
        + (selection.pane === 'player'
          ? uiText("ui.b52b3c3e")
          : uiText("ui.a048a7ec")),
    });
  };

  const attackPredator = (entityId?: string, aim?:WorldPosition): void => {
    bundle.expedition?.cancelRest(config.localPlayerId);
    const predator = entityId===undefined ? bundle.world.findGeneratedEntityByDefinition('hostile:territorial-predator') : bundle.world.getActiveGeneratedEntities().find(e=>e.entityId===entityId)??null;
    if (predator === null || predator.type !== 'hostile') {
      source.setInteraction(Object.freeze({
        inputLabel: 'SPACE',
        verb: 'ATTACK',
        target: uiText("ui.38671cb3"),
        state: 'UNAVAILABLE',
        reason: uiText("ui.dbd6bd81"),
        progress: null,
      }));
      return;
    }

    const runtime = bundle.getRuntime(config.localPlayerId);
    const facing = aim??facingVector(runtime.getSnapshot().player.facing);
    if (facing === null) {
      source.setInteraction(Object.freeze({
        inputLabel: 'SPACE',
        verb: 'ATTACK',
        target: uiText("ui.38671cb3"),
        state: "BLOCKED",
        reason: uiText("ui.92c09cf1"),
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
        uiText("ui.2463e7ae")
        + result.status.toUpperCase(),
    });
  };

  const combatAssist=new CombatAssist({
    tick:()=>bundle.authorityTick,actor:()=>playerPosition(),clearPath:(from,to)=>traversableSegment(bundle.interactionWorld,from,to,PLAYER_COLLISION_FOOTPRINT),
    aim:facing=>bundle.getRuntime(config.localPlayerId).aimFacing(facing),
    targets:()=>{
      if(bundle.playerWorldspace()!=='surface'||bundle.survival.getPlayerState(config.localPlayerId).lifeState.type!=='alive')return [];
      const inventory=bundle.items.getContainerView('inventory:'+config.localPlayerId),equipped=bundle.equipment.getView(config.localPlayerId).equippedWeaponStackId;
      const stack=inventory.stacks.find(s=>s.stackId===equipped),profile=stack&&stack.condition!==0?bundle.catalog.getAs(stack.itemDefinitionId,'item').useProfile:null;
      const range=profile?.type==='melee-weapon'?profile.rangeFootprints*PLAYER_COLLISION_FOOTPRINT.width:.8*PLAYER_COLLISION_FOOTPRINT.width;
      const ready=bundle.combat.getCooldownUntil(config.localPlayerId)<=bundle.authorityTick&&bundle.survival.getPlayerView(config.localPlayerId).stamina>=(profile?.type==='melee-weapon'?profile.staminaCost:10);
      const targets:AssistTarget[]=bundle.world.getActiveGeneratedEntities().filter(e=>e.type==='hostile').flatMap(e=>{const v=bundle.interactionWorld.getPredator(e.entityId);return v&&v.health>0&&distanceFromPlayerSquared(v.position.x,v.position.y)<=64&&bundle.world.isExploredPosition(v.position)?[{id:e.entityId,position:v.position,range,ready}]:[];});
      if(profile?.type==='melee-weapon')for(const a of bundle.livingWorld?.read().animals??[])if(a.health>0&&!a.pen&&!a.owner&&distanceFromPlayerSquared(a.x,a.y)<=64&&bundle.world.isExploredPosition(a))targets.push({id:a.id,position:{x:a.x,y:a.y},range:Math.min(config.interactionRangeWorldUnits??1.25,range+.35),ready});
      return targets;
    },
    attack:target=>{
      const animal=bundle.livingWorld?.read().animals.find(a=>a.id===target.id);
      if(animal){const result=bundle.livingWorld!.execute({id:nextOperationId('auto-hunt'),playerId:config.localPlayerId,expectedRevision:bundle.livingWorld!.read().revision,expectedInventoryRevision:bundle.items.getContainerView('inventory:'+config.localPlayerId).revision,action:'hunt',target:animal.id});
        if(result.status==='committed')attackPresentation=Object.freeze({action:'SPEAR_ATTACK',startedTick:bundle.authorityTick,untilTick:bundle.authorityTick+20});
        source.setLocalCommandFeedback({inputLabel:'Space',operationId:nextOperationId('auto-hunt-feedback'),verb:'ATTACK',target:uiPhrase('Animal'),status:result.status,...(result.status==='rejected'?{reason:result.message}:{})});
      }else{const p=playerPosition();attackPredator(target.id,{x:target.position.x-p.x,y:target.position.y-p.y});}
    },
  });
  const releaseCombat=()=>combatAssist.release();
  const onCombatKeyUp=(event:KeyboardEvent)=>{if(event.code==='Space')releaseCombat();};

  const interactWorldEntity = (element: HTMLElement): void => {
    const id=element.dataset.worldId,role=element.dataset.worldRole;if(!id)return;
    if(role==='cave-portal'){transitionCave(id);return;}
    if(role==='facility'){expeditionOverlay?.open(id);return;}
    if(role==='structure'){interactWithStructure(id);return;}
    if(role==='survey-site'){colonyDepthOverlay?.openSite(element.dataset.siteId??id);return;}
    if(role==='hostile'){attackPredator(id);return;}
    if(role==='resource'){
      const state=bundle.worldStore.getResourceState(id),entity=bundle.world.getActiveGeneratedEntities().find(e=>e.entityId===id);
      if(state?.depleted&&entity&&['resource:timber-source','resource:fiber-plant','resource:food-plant'].includes(entity.definitionId))livingOverlay?.open(id);
      else beginGather(id);
      return;
    }
    const handled=role==='world-drop'?pickupWorldDrop(id):role==='death-cache'?recoverDeathCache(id):role==='ruin'?interactWithRuin(id):false;
    if(!handled)source.setLocalCommandFeedback({operationId:'view:'+id,status:'rejected',verb:'INTERACT',target:role??uiText("ui.f963b26"),reason:'OUT_OF_RANGE_OR_UNAVAILABLE'});
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if(root.dataset.industryOpen==='true'||root.dataset.colonySettingsOpen==='true'||root.dataset.expeditionPanelOpen==='true'||root.dataset.livingPanelOpen==='true'||root.dataset.colonyDepthPanelOpen==='true')return;
    if((event.code==='Enter'||event.code==='Space') && event.target instanceof Element && actionPanel===null){const site=event.target.closest<HTMLElement>('[data-world-role="survey-site"][data-poi-template]');if(site?.dataset.poiTemplate){event.preventDefault();colonyDepthOverlay?.openSite(site.dataset.siteId!);return;}}
    if(event.code==='Enter' && event.target instanceof Element && actionPanel===null){const entity=event.target.closest<HTMLElement>('[data-world-role][data-world-id][data-entity-inspectable]');if(entity){event.preventDefault();interactWorldEntity(entity);return;}}

    if (source.isInventoryOpen()) {
      if ((event.code === 'Enter' || event.code === 'Space') && event.target instanceof HTMLButtonElement && !(event.code==='Enter'&&event.target.closest('[data-review-item]'))) return;
      switch (event.code) {
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          source.cycleInventorySelection(-1);root.querySelector<HTMLElement>('.p1-panel [data-active=true] .p1-item-row[data-selected=true],.p1-panel[data-panel-kind=inventory] .p1-item-row[data-selected=true]')?.scrollIntoView({block:'nearest'});
          return;
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          source.cycleInventorySelection(1);root.querySelector<HTMLElement>('.p1-panel [data-active=true] .p1-item-row[data-selected=true],.p1-panel[data-panel-kind=inventory] .p1-item-row[data-selected=true]')?.scrollIntoView({block:'nearest'});
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
        case 'KeyR':
          event.preventDefault();
          repairSelectedItem();
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
        if(event.target instanceof Element && event.target.closest('button,summary,input,textarea,select,[contenteditable=true]')) return;
        if(root.dataset.productReviewPanelOpen==='true'||root.dataset.productReviewHelpOpen==='true')return;
        event.preventDefault();
        if(!event.repeat){
          combatAssist.hold();
          // A quick tap can be released before the next fixed step. Resolve the
          // first eligible attack now, with the same range/cooldown/manual guards.
          combatAssist.sample(phase1IsometricInput(input.sample()));
        }
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
    if(combatAssist.target())return combatAssist.target();
    if(bundle.playerWorldspace()!=='surface')return cavePortalTarget()??worldDropTarget()?.worldDropId??deathCacheTarget()?.entityId??resourceTarget()?.entityId??null;
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
      ? "GATHER" as const
      : activeConsume !== null
        ? "CONSUME" as const
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
  let pendingSoloSteps = 0;
  root.dataset.soloPendingSteps = '0';
  const host = new FixedStepHost({
    onStep: () => {
      // Async chunk work must not build an unbounded backlog of stale movement.
      // Excess wall-clock catch-up is dropped; authority time still advances one tick per committed step.
      if (pendingSoloSteps >= 4) return;
      pendingSoloSteps++;
      root.dataset.soloPendingSteps = String(pendingSoloSteps);
      stepQueue = stepQueue.then(async () => {
        if (destroyed) return;
        // Sample at execution, so queued steps cannot replay movement after release or a menu opens.
        const sampled = (root.dataset.industryOpen==='true'||root.dataset.colonySettingsOpen==='true'||root.dataset.expeditionPanelOpen==='true'||root.dataset.livingPanelOpen==='true'||root.dataset.colonyDepthPanelOpen==='true'||root.dataset.productReviewPanelOpen==='true'||root.dataset.productReviewHelpOpen==='true') ? {moveUp:false,moveDown:false,moveLeft:false,moveRight:false} : input.sample();
        const blocked=root.dataset.industryOpen==='true'||root.dataset.colonySettingsOpen==='true'||root.dataset.expeditionPanelOpen==='true'||root.dataset.livingPanelOpen==='true'||root.dataset.colonyDepthPanelOpen==='true'||root.dataset.productReviewPanelOpen==='true'||root.dataset.productReviewHelpOpen==='true';
        if(blocked)combatAssist.release();
        bundle.submitInput(config.localPlayerId,combatAssist.sample(phase1IsometricInput(sampled)));
        root.dataset.autoCombatTarget=combatAssist.target()??'';
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
      }).finally(() => {pendingSoloSteps--;if(!destroyed)root.dataset.soloPendingSteps=String(pendingSoloSteps);});
    },
    onRender: () => {
      // Present only the most recent completed authority state once per frame.
      if (!destroyed) {worldRenderer.render();expeditionOverlay?.render();livingOverlay?.render();entityInspection.render();industryPanel?.update();}
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
    if(config.colonyDepthEnabled===true && actionPanel===null && root.dataset.colonySettingsOpen!=='true' && root.dataset.livingPanelOpen!=='true' && root.dataset.expeditionPanelOpen!=='true' && root.dataset.colonyDepthPanelOpen!=='true' && root.dataset.productReviewPanelOpen!=='true' && root.dataset.productReviewHelpOpen!=='true'){
      const site=event.target.closest<HTMLElement>('[data-world-role="survey-site"][data-poi-template]');if(site?.dataset.poiTemplate){colonyDepthOverlay?.openSite(site.dataset.siteId!);return;}
      const entity=event.target.closest<HTMLElement>('[data-world-role][data-world-id][data-entity-inspectable]');if(entity){interactWorldEntity(entity);return;}
    }
    const item = event.target.closest<HTMLElement>('[data-review-item]');
    if (item !== null) {
      source.selectInventoryItem(item.dataset.reviewItem ?? '');
      return;
    }
    const action = event.target.closest<HTMLElement>('[data-review-action]')?.dataset.reviewAction;
    if(action==='map-select-marker'){const id=event.target.closest<HTMLElement>('[data-map-marker-id]')?.dataset.mapMarkerId;if(id)source.selectMapDetail(id);return;}
    if(action==='close-panel'){
      actionPanel=null;machineStructureId=null;source.setPresentationPanel(null);source.setPanel(null);return;
    }
    if(action==='open-farm'){
      if(livingOverlay){livingOverlay.open();return;}
      source.setPanel(null);actionPanel=actionPanel==='colony'?null:'colony';
      if(actionPanel)refreshColonyPanel();else source.setPresentationPanel(null);return;
    }
    if(action==='open-expedition'){expeditionOverlay?.open();return;}
    if(action?.startsWith('open-')){livingOverlay?.close();colonyDepthOverlay?.close();expeditionOverlay?.close();}
    if(action==='inventory-repair'){repairSelectedItem();return;}
    if(action==='inventory-split'&&source.isInventoryOpen()){
      const selection=selectedInventoryAction('SPLIT','SPLIT');if(!selection||!selection.stack)return;
      const operationId=nextOperationId('split');
      const result=bundle.executeItemCommand({type:'split',operationId,playerId:config.localPlayerId,containerId:selection.source.containerId,expectedRevision:selection.source.revision,sourceStackId:selection.stack.stackId,quantity:selection.quantity});
      source.setLocalCommandFeedback({inputLabel:'SPLIT',operationId,status:result.status,...(result.status==='rejected'?{reason:result.reason}:{}),verb:'SPLIT',target:contentDisplayName(bundle.catalog.get(selection.stack.itemDefinitionId))});return;
    }
    if(action==='remove-resource-marker'){
      const id=event.target.closest<HTMLElement>('[data-review-action]')?.dataset.resourceMarker,authority=bundle.resourceMarkers,spaceId=bundle.caves?.activeLayout()?.spaceId??'surface';
      if(id&&authority){authority.set(config.localPlayerId,authority.read().revision,id,spaceId,false);source.refresh();}return;
    }
    if(action==='inventory-stack'){
      const selection=source.getInventoryActionSelection(),containerId=selection.source.containerId;
      const view=bundle.items.getContainerView(containerId);let pair:null|[typeof view.stacks[number],typeof view.stacks[number]]=null;
      for(const target of view.stacks)for(const from of view.stacks)if(from.stackId!==target.stackId&&from.itemDefinitionId===target.itemDefinitionId&&from.condition===target.condition&&from.quantity+target.quantity<=bundle.catalog.getAs(target.itemDefinitionId,'item').maxStack)pair??=[from,target];
      if(!pair){presentInventoryGuard('STACK','STACK','NO_MATCHING_STACKS');return;}
      const operationId=nextOperationId('stack');const result=bundle.executeItemCommand({type:'merge',operationId,playerId:config.localPlayerId,containerId,expectedRevision:view.revision,sourceStackId:pair[0].stackId,targetStackId:pair[1].stackId});
      source.setLocalCommandFeedback({inputLabel:'STACK',operationId,status:result.status,reason:result.status==='rejected'?result.reason:'STACKS_COMBINED',verb:'STACK',target:uiText("ui.baeaa87a")});return;
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
    if (action === 'craft-page') { const page=Number(event.target.closest<HTMLElement>('[data-page]')?.dataset.page);if(Number.isInteger(page)&&page>=0&&page<Math.ceil(craftRecipes().length/CRAFT_PAGE_SIZE)){craftPage=page;refreshCraftPanel();}return; }
    if (action === 'craft-previous') changeCraftPage(-1);
    if (action === 'craft-next') changeCraftPage(1);
    if (action?.startsWith('equip-slot:') && source.isInventoryOpen()) equipInventorySlot(action.slice('equip-slot:'.length));
    if (action?.startsWith('unequip-slot:') && source.isInventoryOpen()) {
      const slot = action.slice('unequip-slot:'.length), equipped = bundle.equipment.getView(config.localPlayerId);
      const stackId = slot === 'weapon' ? equipped.equippedWeaponStackId : slot === 'protection' ? equipped.equippedThermalWrapStackId : equipped.wearables[slot as WearableSlot] ?? null;
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
    if (!source.isInventoryOpen() || !['weapon', 'protection', ...WEARABLE_SLOTS].includes(slot)) return;
    if (stackId) {
      if (!bundle.items.getContainerView('inventory:' + config.localPlayerId).stacks.some(s => s.stackId === stackId)) { presentInventoryGuard('DRAG', 'EQUIP', 'SOURCE_MISSING'); return; }
      source.selectInventoryItem(stackId);
    }
    const selection = source.getInventoryActionSelection();
    const id = selection.stack?.itemDefinitionId;
    if (selection.pane !== 'player' || (slot === 'weapon' ? !isKnownMeleeEquipment(id ?? '') : slot === 'protection' ? id !== 'item:thermal-wrap' && id !== 'item:warm-cloak' : wearableSlotFor(id ?? '') !== slot)) { presentInventoryGuard('EQUIP', 'EQUIP', 'INVALID_EQUIPMENT'); return; }
    const current = bundle.equipment.reconcile(config.localPlayerId);
    if ((slot === 'weapon' ? current.equippedWeaponStackId : slot === 'protection' ? current.equippedThermalWrapStackId : current.wearables[slot as WearableSlot]) === selection.stack?.stackId) return;
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
  const removeContextMenu = installGameContextMenu(root, (event) => {
    const livingCancelled = livingOverlay?.cancelPlacement() ?? false;
    const expeditionCancelled = expeditionOverlay?.cancelPlacement() ?? false;
    if (livingCancelled || expeditionCancelled) { entityInspection.close(); return; }
    if (actionPanel === 'build') {
      actionPanel = null;
      buildAnchor = null;
      source.setPresentationPanel(null);
      refreshWorldPresentationContext();
      worldRenderer.render();
      entityInspection.close();
      return;
    }
    entityInspection.inspect(event);
  });
  root.addEventListener('click', onPanelClick);
  root.addEventListener('dragstart', onGearDragStart);
  root.addEventListener('dragover', onGearDragOver);
  root.addEventListener('drop', onGearDrop);
  root.addEventListener('pointermove', updateBuildPointer);
  root.ownerDocument.addEventListener('keydown', onKeyDown);
  const stopLocale = onLocaleChange(() => {
    if (actionPanel === 'craft') source.setPresentationPanel(craftPanel());
    else if (actionPanel === 'build') source.setPresentationPanel(buildPanel());
    else if (actionPanel === 'colony') refreshColonyPanel();
    else if (machineStructureId) source.setPresentationPanel(machinePanel(machineStructureId));
    refreshContextInteraction(); refreshWorldPresentationContext();
  });
  root.ownerDocument.addEventListener('keyup',onCombatKeyUp);
  root.ownerDocument.defaultView?.addEventListener('blur',releaseCombat);
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
        stopLocale();
      destroyed = true;
      host.stop();combatAssist.release();
      root.ownerDocument.removeEventListener('keyup',onCombatKeyUp);
      root.ownerDocument.defaultView?.removeEventListener('blur',releaseCombat);
      input.stop();
      removeContextMenu();
      entityInspection.destroy();
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
      industryPanel?.destroy();
      presentation.destroy();
      worldRenderer.destroy();
      void bundle.destroy();
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  });
}
