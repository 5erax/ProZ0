import { PANEL_SHORTCUTS, panelShortcutForCode } from '../input/PanelShortcuts';
import { costList } from './CostList';
import { costRequirements, missingCostText, costLabel } from './CostRequirements';
import { EXPEDITION_FACILITIES } from '../../content/singleplayer/ExpeditionContent';
import { gameUiText } from '../localization/GameUiMessages';
import { materialSource } from './MaterialGuide';
import { capturePanelUi } from './PanelUiState';
import { contentDisplayName } from '../localization/ContentText';
import { locale } from '../localization/Locale';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import { WEARABLE_RECIPES } from '../../content/livingworld/WearableContent';
import type { Phase1AuthorityBundle } from '../../integration';
import {
  CROPS,
  LIVING_RECIPES,
  cropDefinition,
  speciesDefinition,
  forageDefinition,
  soilAt,
} from '../../content/livingworld/LivingWorldContent';
import { livingArt, livingArtVariant } from './LivingWorldArt';
import { LivingMotion } from './LivingMotion';
import { worldDepthOrder } from './WorldDepth';
import { mountainAt } from '../../world/phase2/SoloMountain';
import { bindEntityInspection } from './EntityInspection';
import { forageGrowthView, renewablePlant, moistureState } from '../../simulation/livingworld/PlantGrowth';
import { LIVING_ROOT_ITEMS, LIVING_ROOT_RECIPES } from '../../content/livingworld/LivingRootContent';
import { GEAR_RECIPES, RARITY_STYLE }  from '../../content/livingworld/EquipmentContent';
import { FISHING_RECIPES } from '../../content/livingworld/FishingContent';
import type { FishingCommand } from '../../simulation/livingworld/FishingAuthority';
import { worldPositionKnown } from '../runtime/Phase1ProductReviewWorldRenderer';
import type { LivingCommand } from '../../simulation/livingworld/LivingWorldAuthority';
import {
  projectPhase1Isometric,
  unprojectPhase1Isometric,
} from '../runtime/Phase1IsometricProjection';
import {
  applyProductionSprite,
  itemIconSprite,
} from './Phase1ProductionAssets';
import { expeditionSprite } from './ExpeditionAssets';
export function createLivingWorldOverlay(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  bundle: Phase1AuthorityBundle,
  player: string,
  onOpen: () => void,
) {
  const authority = bundle.livingWorld!;
  const layer = document.createElement('section'),
    style = document.createElement('style'),
    menu = document.createElement('button'),
    season = document.createElement('div'),
    panel = document.createElement('section'),
    markers = document.createElement('div'),
    ghost = document.createElement('div'),
    hint = document.createElement('div');
  layer.className = 'lw-world';
  bindUiText(menu,"textContent",uiText("ui.3e926c65"));
  menu.className = 'lw-menu';
  bindUiText(menu,"aria-label",uiText("ui.d74d21d2"));
  season.className = 'lw-season';
  panel.className = 'lw-panel';
  bindUiText(panel,"aria-label",uiText("ui.e0b523e1"));
  panel.hidden = true;
  markers.className = 'lw-markers';
  ghost.className = 'lw-ghost';
  ghost.hidden = true;
  hint.className = 'lw-hint';
  hint.hidden = true;
  style.textContent =
    '.lw-world{position:absolute;inset:0;pointer-events:none;z-index:15;font:12px monospace;color:#e2e8d6}.lw-menu,.lw-season,.lw-hint{position:absolute;background:#10252ee8;border:1px solid #718b8e;padding:8px}.lw-menu{font:12px monospace;z-index:950001;right:12px;top:110px;pointer-events:auto;color:#e2e8d6}.lw-season{left:50%;top:115px;transform:translateX(-50%);font-size:11px}.lw-panel{z-index:20;position:absolute;inset:6% 12%;overflow:auto;background:#102029f7;border:1px solid #92ada9;padding:20px;pointer-events:auto}.lw-panel[hidden],.lw-ghost[hidden],.lw-hint[hidden]{display:none}.lw-panel article{border-bottom:1px solid #496167;padding:8px 0}.lw-panel button{background:#223a43;border:1px solid #8da5a2;color:#e2e8d6;padding:7px;margin:4px;cursor:pointer}.lw-panel p{line-height:1.5}.lw-object{position:absolute;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer;width:36px;height:36px;color:#dfe7ce;font:10px monospace;image-rendering:pixelated}[data-product-review-panel-open=true] .lw-object,[data-product-review-help-open=true] .lw-object,[data-colony-settings-open=true] .lw-object,[data-expedition-panel-open=true] .lw-object{pointer-events:none}.lw-object svg{width:100%;height:100%;display:block}.lw-object:focus-visible{outline:1px solid #dae8bf;outline-offset:2px}.lw-object:hover svg{filter:brightness(1.12)}.lw-object[data-dead=true]{filter:grayscale(1);opacity:.65}.lw-ghost{position:absolute;transform:translate(-50%,-50%);height:24px;width:42px;border:2px dashed #a8e1b3;background:#a8e1b330;pointer-events:none}.lw-hint{bottom:105px;left:50%;transform:translateX(-50%)}.lw-season[data-season=winter]{color:#bce2ef}.lw-season[data-season=autumn]{color:#e4ba76}.lw-season[data-season=summer]{color:#e7d39a}@media(max-width:700px){.lw-panel{inset:8% 3%}.lw-menu{font-size:10px;top:110px}.lw-season{top:95px}}';
  style.textContent += '.lw-panel[data-targeted=true]{inset:auto 12px auto auto;top:112px;width:min(320px,calc(100% - 24px));max-height:45vh;padding:12px;box-sizing:border-box}.lw-panel[data-targeted=true] h2{font-size:14px}.lw-panel[data-targeted=true] article{padding:4px 0;border:0}.lw-panel[data-targeted=true] h3{margin:4px 0;font-size:13px}@media(max-height:450px){.lw-panel[data-targeted=true]{top:84px;width:min(280px,44%)}}';
  const worldStage = root.querySelector<HTMLElement>('.p1-product-world-stage');
  if (!worldStage) throw new Error('Living presentation requires the canonical world stage.');
  const rasterOrigin = { x: Number(worldStage.dataset.rasterOriginX), y: Number(worldStage.dataset.rasterOriginY) };
  markers.style.display = 'contents';
  worldStage.append(markers);
  const motion = new LivingMotion();
  const fishingStatus = document.createElement('div'), fishingLabel = document.createElement('span'), reelButton = document.createElement('button'), cancelFishButton = document.createElement('button'), bobber = document.createElement('span');
  fishingStatus.className = 'lw-fishing-status'; fishingStatus.hidden = true;
  fishingStatus.style.cssText = 'position:absolute;bottom:150px;left:50%;transform:translateX(-50%);background:#102029ef;border:1px solid #90c1c5;padding:8px;pointer-events:auto;z-index:950000;max-width:85%;display:flex;gap:8px;align-items:center';
  // Keep the DOM stable during the reaction window, including keyboard focus.
  bindUiText(reelButton,"textContent",uiText("ui.7e19a591")); reelButton.type = 'button'; bindUiText(cancelFishButton,"textContent",uiText("ui.a4eae766")); cancelFishButton.type = 'button';
  reelButton.onclick = () => fishingAction('reel'); cancelFishButton.onclick = () => fishingAction('cancel');
  fishingStatus.append(fishingLabel, reelButton, cancelFishButton); layer.append(fishingStatus);
  bobber.dataset.fishingBobber = 'true'; bobber.style.cssText = 'position:absolute;width:24px;height:16px;pointer-events:none';
  bobber.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" shape-rendering="crispEdges"><path fill="none" stroke="#a9d9ce" d="m2 10 10-4 10 4-10 4z"/><path fill="#df875e" d="M10 4h4v4h-4z"/><path fill="#f0e2b8" d="M10 8h4v3h-4z"/></svg>';
  bobber.hidden = true; markers.append(bobber);
  style.textContent += '.lw-fishing-status[hidden]{display:none!important}.lw-fishing-status button{font:12px monospace;background:#263e47;border:1px solid #acc8c5;color:#e9eee0;padding:7px}.lw-fishing-status[data-phase=bite]{border-color:#d9d98c}.lw-fishing-status[data-phase=bite] span{font-weight:bold;color:#fff1ad}';
  layer.append(style, season, panel, ghost, hint);
  root.append(layer, menu);
  let opened = false,
    placing = false,
    feedback = '',
    focus = '',
    signature = '',
    placementRoot: string | null = null,
    placingFishing = false,
    fishFlashUntil = 0,
    lastFishMessage = '',
    fishingError = '',
    interactionFlashUntil = 0,
    cursor: { x: number; y: number } | null = null;
  const particles = Array.from({ length: 10 }, () => {
    const e = document.createElement('span');
    e.style.cssText =
      'position:absolute;width:3px;height:3px;pointer-events:none;opacity:.5';
    e.hidden = true;
    markers.append(e);
    return e;
  });
  const objectNodes = new Map<string, HTMLButtonElement>();
  const close = () => {
    opened = false;
    layer.style.zIndex = '15';
    placing = false;
    placingFishing = false;
    ghost.hidden = true;
    hint.hidden = true;
    panel.hidden = true;
    root.dataset.livingPanelOpen = 'false';
  };
  const text = (tag: string, value: string) => {
    const n = document.createElement(tag);
    bindUiText(n,"textContent",value);
    return n;
  };
  const button = (label: string, callback: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    bindUiText(b,"textContent",label);
    bindUiText(b,'aria-label',label);
    b.onclick = (e) => {
      e.stopPropagation();
      callback();
    };
    return b;
  };
  const statusText = (v: string) =>
    ({
      OUT_OF_RANGE: uiText("ui.e546246a"),
      BUILD_NEARBY_PEN: uiText("ui.97eddf1a"),
      EQUIP_WEAPON_FIRST: uiText("ui.810c2cfe"),
      FIELD_HOE_REQUIRED: uiText("ui.9955227e"),
      WATERING_CAN_REQUIRED: uiText("ui.24234a53"),
      CAPACITY_EXCEEDED:
        uiPhrase('Bag full. Store some items; harvest and loot are preserved.'),
      NEARBY_STATION_REQUIRED: uiText("ui.c7b54aa"),
      RENEWING: uiText("ui.171329ec"),
      NOT_READY: uiText("ui.c04bf2c"),
      SOIL_TILLED: uiText("ui.274a8454"),
      PLANTED: uiText("ui.c207a849"),
      WATERED: uiText("ui.e0bf78c2"),
      OUT_OF_WEAPON_RANGE: uiText("ui.a73556ae"),
      EXHAUSTED: uiText("ui.5a20d503"),
      BROKEN_WEAPON: uiText("ui.78fc6005"),
      FORAGED: uiText("ui.7d573115"),
      HUNTED: uiText("ui.a14f5745"),
      TAMED: uiText("ui.5cefbaaa"),
      FED: uiText("ui.85f1e8f5"),
      FIRE_LIT: uiText("ui.acc0dd85"),
      TANK_FILLED: uiText("ui.a25b5da"),
      MISSING_INPUT: uiText("ui.3ae4397"),
      FISHING_ROD_REQUIRED: uiText("ui.afdb44bb"),
      FISHING_BAIT_REQUIRED: uiText("ui.70aa376e"),
      FISHING_WATER_REQUIRED: uiText("ui.725b104"),
      FISHING_LINE_BLOCKED: uiText("ui.2490b2f"),
      FISHING_STAND_ON_BANK: uiText("ui.9b67aaf8"),
      FISHING_CAST: uiText("ui.bba12d3f"),
      FISHING_WAIT_FOR_BITE: uiText("ui.e1c478ad"),
      FISHING_STOCK_RECOVERING: uiPhrase('Fish population depleted or reserved; let this area recover.'),
      FISHING_INTERRUPTED_MOVE: uiText("ui.72ce500c"),
      FISHING_INTERRUPTED_DAMAGE: uiText("ui.4baa12a1"),
      FISHING_MISSED_BITE: uiText("ui.b16a4ce5"),
      FISHING_CANCELLED: uiText("ui.90da89a4"),
      TARGET_CAPACITY_WEIGHT: uiText("ui.37ea48da"),
      TARGET_CAPACITY_VOLUME: uiText("ui.8fb5d85"),
    })[v] ?? v.replaceAll('_', ' ').toLowerCase();
  const fishingAction = (action: FishingCommand['action'], extra: Partial<FishingCommand> = {}) => {
    const result = authority.fishing.execute({ id: 'fish:' + crypto.randomUUID(), playerId: player, expectedRevision: authority.fishing.revision(), expectedInventoryRevision: bundle.items.getContainerView('inventory:' + player).revision, action, ...extra });
    feedback = result.message.startsWith('FISHING_CAUGHT:') ? uiText("ui.f8dbcaff") + contentDisplayName(bundle.catalog.get(result.message.slice('FISHING_CAUGHT:'.length))) : result.message.startsWith(uiText("ui.b9d440a7")) ? uiText("ui.70aa376e") : statusText(result.message);
    fishingError = result.status === 'rejected' ? feedback : '';
    signature = ''; render(); return result.status === 'committed';
  };
  const execute = (
    action: LivingCommand['action'],
    target: string,
    extra: Partial<LivingCommand> = {},
  ) => {
    const result = authority.execute({
      id: 'living:' + crypto.randomUUID(),
      playerId: player,
      expectedRevision: authority.read().revision,
      expectedInventoryRevision: bundle.items.getContainerView(
        'inventory:' + player,
      ).revision,
      action,
      target,
      ...extra,
    });
    feedback = statusText(result.message);
    signature = '';
    render();
    return result.status === 'committed';
  };
  const open = (id = '') => {
    onOpen();
    placing = false;
    ghost.hidden = true;
    hint.hidden = true;
    opened = true;
    layer.style.zIndex = '1000020';
    focus = id;
    panel.hidden = false;
    root.dataset.livingPanelOpen = 'true';
    signature = '';
    render();
    if (id)
      panel
        .querySelector<HTMLElement>(
          '[data-living-row="' + CSS.escape(id) + '"]',
        )
        ?.scrollIntoView({ block: 'center' });
  };
  menu.onclick = () => open();
  const startPlot = () => {
    close();
    placementRoot = null;
    placing = true;
    hint.hidden = false;
    bindUiText(hint,"textContent",uiText("ui.2b0f2d8a"));
  };
  const startFishing = () => { close(); placing = true; placingFishing = true; hint.hidden = false; bindUiText(hint,"textContent",uiText("ui.32280935")); };
  const growthText = (v: ReturnType<typeof forageGrowthView>) => v.stage === 'mature'
    ? uiText("ui.9e549982") + v.maximumYield + ' · ' + (v.condition === 'normal' ? uiText("ui.58de2772") : uiText("ui.34473019"))
    : (v.stage === 'early' ? uiText("ui.94d612b3") : uiText("ui.5eb1c946")) + ' · ' + (v.nextStageSeconds === null ? uiText("ui.e685acf2") : uiText("ui.2794b86a") + v.nextStageSeconds + 's') + ' · ' + (v.condition === 'needs-water' ? uiText("ui.34473019") : uiText("ui.58de2772")) + uiText("ui.6ddf03ab") + v.harvestYield + '/' + v.maximumYield;
  const interact = (id: string) => {
    if (placing || opened || root.dataset.colonySettingsOpen === 'true' || root.dataset.productReviewPanelOpen === 'true') return;
    const f = authority.presentationSnapshot().forage.find(f => f.id === id && !f.cleared);
    if (f) {
      execute('forage', id); bindUiText(hint,"textContent",feedback); hint.hidden = false; interactionFlashUntil = performance.now() + 3500;
    } else open(id);
  };
  const render = () => {
    const interior = bundle.playerWorldspace() !== 'surface';
    layer.hidden = interior; menu.hidden = interior;markers.style.display = interior ? 'none' : 'contents';
    if (interior) { close();for(const b of objectNodes.values())b.hidden=true;motion.clear();return; }
    for(const b of objectNodes.values())b.hidden=false;
    const now = performance.now();
    if (!placing && !opened && interactionFlashUntil && now >= interactionFlashUntil) { hint.hidden = true; interactionFlashUntil = 0; }
    if (root.dataset.colonySettingsOpen === 'true') {
      close();
      placing = false;
      ghost.hidden = true;
      hint.hidden = true;
    }
    const state = authority.presentationSnapshot(),
      p = bundle.getPlayerPosition(player),
      s = authority.season(),
      inventory = bundle.items.getContainerView('inventory:' + player);
    const fish = authority.fishing.session(player);
    const message = authority.fishing.message(player);
    if (message !== lastFishMessage) { lastFishMessage = message; fishFlashUntil = now + 4000; fishingError = ''; }
    fishingStatus.hidden = !fish && now >= fishFlashUntil; bobber.hidden = !fish;
    reelButton.hidden = !fish; cancelFishButton.hidden = !fish;
    if (fish) {
      const biting = bundle.authorityTick >= fish.biteTick;
      fishingStatus.dataset.phase = biting ? 'bite' : 'waiting';
      const label = (biting ? uiText("ui.41ff433f") + Math.max(0, Math.ceil((fish.endTick - bundle.authorityTick) / 60)) + 's' : uiText("ui.41ab452a")) + (fishingError ? ' · ' + fishingError : '');
      if (fishingLabel.textContent !== label) bindUiText(fishingLabel,"textContent",label);
      reelButton.disabled = !biting;
      const at = projectPhase1Isometric(fish, rasterOrigin);
      bobber.style.left = 320 + at.x - 12 + 'px'; bobber.style.top = 180 + at.y - 8 + (biting ? Math.floor(bundle.authorityTick / 8) % 2 * 2 : 0) + 'px'; bobber.style.zIndex = worldDepthOrder(fish, 2);
    } else if (message) bindUiText(fishingLabel,"textContent",message.startsWith('FISHING_CAUGHT:') ? uiText("ui.f8dbcaff") + contentDisplayName(bundle.catalog.get(message.slice('FISHING_CAUGHT:'.length))) : statusText(message) ?? "");
    season.dataset.season = s.id;
    if (root.dataset.livingSeason !== s.id) root.dataset.livingSeason = s.id;
    for (let i = 0; i < particles.length; i++) {
      const e = particles[i]!;
      e.hidden = s.id !== 'winter' && s.id !== 'autumn';
      if (e.hidden) continue;
      const t = bundle.authorityTick / 60,
        wx = Math.floor(p.x / 16) * 16 + ((i * 7 + t * 0.35) % 24) - 4,
        wy = Math.floor(p.y / 16) * 16 + ((i * 11 + t * 0.55) % 24) - 4,
        at = projectPhase1Isometric({ x: wx, y: wy }, rasterOrigin);
      e.style.left = at.x + 320 + 'px';
      e.style.top = at.y + 165 + 'px';
      e.style.zIndex = '780000';
      e.style.background = s.id === 'winter' ? '#c2dbdf' : '#caa578';
      e.dataset.motionPhase = String(Math.floor(t * 10));
    }

    const seasonText =
      uiPhrase(s.name) +
      uiText("ui.2f794433") +
      s.year +
      ' · ' +
      Math.ceil(s.remainingTicks / 3600) +
      uiText("ui.34aaa379");
    if (season.textContent !== seasonText) bindUiText(season,"textContent",seasonText);
    root.dataset.worldCycleLabel=seasonText;
    const worldCycle=root.querySelector<HTMLElement>('.p1-world-cycle');
    if(worldCycle){worldCycle.hidden=false;if(worldCycle.textContent!==seasonText)bindUiText(worldCycle,'textContent',seasonText);}
    const farmDock=root.querySelector<HTMLElement>('[data-review-action="open-farm"]');
    farmDock?.setAttribute('aria-pressed',String(opened));
    const visible = new Set<string>();
    const objects = [
      ...state.plots.map((e) => ({
        e,
        role: 'plot',
        kind: e.dead ? 'dead' : (e.crop ?? 'empty'),
        progress: e.crop ? e.progress / cropDefinition(e.crop)!.cycleTicks : 0,
        dead: e.dead,
        young: false, anchor: '',
      })),
      ...state.forage
        .filter((f) => !f.cleared)
        .map((e) => ({
          e,
          role: 'forage',
          kind: e.kind,
          progress: renewablePlant(e.kind) ? forageGrowthView(e, bundle.authorityTick, 1).fraction : 1,
          dead: !renewablePlant(e.kind) && e.readyTick > bundle.authorityTick,
          young: false, anchor: '',
        })),
      ...state.animals.map((e) => ({
        e,
        role: 'animal',
        kind: e.species,
        progress: 0,
        dead: !e.health,
        young: e.age < speciesDefinition(e.species)!.matureSeconds * 60,
        anchor: e.pen ?? `${e.anchorX}:${e.anchorY}`, 
      })),
    ];
    // Reserve visible budget for animals before abundant forage; never expose hidden nodes.
    objects.sort((a,b)=>(a.role==='animal'?0:a.role==='plot'?1:2)-(b.role==='animal'?0:b.role==='plot'?1:2)||Math.hypot(a.e.x-p.x,a.e.y-p.y)-Math.hypot(b.e.x-p.x,b.e.y-p.y)||(a.e.id<b.e.id?-1:a.e.id>b.e.id?1:0));
    for (const { e, role, kind, progress, dead, young, anchor } of objects) {
      if (Math.hypot(e.x - p.x, e.y - p.y) > 16 || visible.size >= 64) continue;
      if (!worldPositionKnown(bundle, e)) continue;
      const displayed = motion.position(e.id, e, state.lastTick, now, anchor, role === 'animal' && !dead);
      const at = projectPhase1Isometric(displayed, p);
      if (
        at.x + 320 < -48 ||
        at.x + 320 > 688 ||
        at.y + 180 < -48 ||
        at.y + 180 > 408
      )
        continue;
      visible.add(e.id);
      let b = objectNodes.get(e.id);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'lw-object';
        b.dataset.livingId = e.id;
        b.onclick = (event) => {
          event.stopPropagation();
          interact(e.id);
        };
        objectNodes.set(e.id, b);
        markers.append(b);
        bindEntityInspection(b, () => {
          const snapshot = authority.presentationSnapshot();
          const current = role === 'plot' ? snapshot.plots.find(v => v.id === e.id) : role === 'animal' ? snapshot.animals.find(v => v.id === e.id) : snapshot.forage.find(v => v.id === e.id && !v.cleared);
          if (!current || !worldPositionKnown(bundle, current)) return null;
          const label = role === 'plot' ? uiText("ui.ebf4e624") : role === 'animal' ? uiPhrase(speciesDefinition(kind)!.name) : uiPhrase(forageDefinition(kind)!.name);
          const facts: string[] = [];
          if (role === 'animal') {
            const animal = snapshot.animals.find(v => v.id === e.id)!, def = speciesDefinition(animal.species)!;
            facts.push(uiText("ui.a438be7d")+animal.health+'/'+def.health, uiText("ui.792089b7")+Math.round(animal.energy/100)+uiText("ui.4b316084")+Math.round(animal.thirst/100)+'%', animal.health === 0 ? uiText("ui.715a6a83") : animal.age >= def.matureSeconds*60 ? uiText("ui.5c0e81af") : uiText("ui.2a407de3"), animal.pen ? uiText("ui.8431affd") : uiText("ui.883cad15"));
          } else {
            const growth = role === 'plot' ? authority.plotStatus(e.id) : authority.forageStatus(e.id);
            if (growth) facts.push(growthText(growth));
            if (role === 'plot') { const plot = snapshot.plots.find(v => v.id === e.id)!; facts.push(uiText("ui.df5b90dd")+Math.round(plot.moisture/100)+'%', plot.dead ? uiText("ui.93ac2193") : plot.crop ? uiPhrase(cropDefinition(plot.crop)!.name) : uiText("ui.b421ceb9")); }
          }
          facts.push(uiText("ui.524f0b38")+uiPhrase(soilAt(bundle.config.worldSeed,current).name), uiText("ui.d18a0a8"));
          return {id:e.id,name:label,kind:role,facts};
        });
      }
      const variant = kind === 'wild-grass' ? livingArtVariant(e.id) : 0;
      const key = [role, kind, progress >= 1 ? 2 : progress >= .5 ? 1 : 0, young, dead, variant].join(':');
      const definition = livingArt(role, kind, progress, young, dead, variant);
      if (b.dataset.art !== key) {
        b.innerHTML = definition.markup;
        b.dataset.art = key;
        const svg = b.querySelector('svg')!;
        svg.style.cssText = `position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:${definition.width}px;height:${definition.height}px`;
      }
      let cue = b.querySelector<HTMLElement>('.lw-state-cue');
      if (!cue) { cue=document.createElement('span');cue.className='lw-state-cue';b.append(cue); }
      let cueLabel='', cueIcon='';
      if(role==='animal') { const animal=state.animals.find(v=>v.id===e.id)!;
        if(animal.owner===player && animal.health>0) { if(animal.thirst<2500){cueLabel=gameUiText('thirsty');cueIcon='◒';}else if(animal.energy<2500){cueLabel=gameUiText('hungry');cueIcon='♧';} }
      } else if(role==='plot') {const plot=state.plots.find(v=>v.id===e.id)!;
        if(!plot.dead&&plot.crop){ if(plot.moisture<2500){cueLabel=gameUiText('thirsty');cueIcon='◒';}else if(progress>=1){cueLabel=gameUiText('ready');cueIcon='✓';} }
      }
      cue.hidden=!cueLabel;cue.textContent=cueIcon;cue.setAttribute('aria-hidden','true');b.dataset.careState=cueLabel;
      b.dataset.dead = String(dead);
      b.dataset.livingRole = role;
      b.dataset.livingKind = kind;
      b.dataset.livingArtVariant = String(variant);
      b.dataset.livingYoung = String(young);
      b.style.zIndex = worldDepthOrder(displayed);
      bindUiText(b,"aria-label",role === 'plot'
          ? uiText("ui.d8ddaa93") + kind
          : role === 'animal'
            ? uiPhrase(speciesDefinition(kind)!.name)
            : uiPhrase(forageDefinition(kind)!.name) ?? "");
      if(cueLabel){b.setAttribute('aria-label',(b.getAttribute('aria-label')??'')+' · '+cueLabel);b.title=cueLabel;}else b.removeAttribute('title');
      if (role === 'plot') {
        const plot = state.plots.find(plot => plot.id === e.id)!;
        b.dataset.moisture = moistureState(plot.moisture);
        const soilColor = plot.moisture < 2500 ? '#998466' : plot.moisture >= 7000 ? '#4b4837' : '#736348';
        b.style.setProperty('--plot-soil-color', soilColor);
      }
      const raster = projectPhase1Isometric(displayed, rasterOrigin);
      // Foot pivot at 50/64 of the authored canvas, shared with terrain's raster origin.
      const hitWidth = Math.max(24, definition.width), hitHeight = Math.max(24, definition.height);
      b.style.left = raster.x + 320 - hitWidth / 2 + 'px';
      b.style.top = raster.y + 180 - definition.height * 50 / 64 - (hitHeight - definition.height) - (bundle.caves?mountainAt(displayed,bundle.caves.portals).height*4:0) + 'px';
      b.style.width = hitWidth + 'px';
      b.style.height = hitHeight + 'px';
    }
    for (const [id, b] of objectNodes)
      if (!visible.has(id)) {
        b.remove();
        objectNodes.delete(id);
      }
    motion.retain(visible);
    if (placing && cursor) {
      const rect = canvas.getBoundingClientRect(), base = root.getBoundingClientRect();
      const point = unprojectPhase1Isometric(
          {
            x: ((cursor.x - rect.left) * 640) / rect.width - 320,
            y: ((cursor.y - rect.top) * 360) / rect.height - 180,
          },
          p,
        ),
        x = placingFishing ? Math.floor(point.x / 2) * 2 + 1 : Math.round(point.x * 4) / 4,
        y = placingFishing ? Math.floor(point.y / 2) * 2 + 1 : Math.round(point.y * 4) / 4;
      ghost.hidden = false;
      ghost.style.left = cursor.x - base.left + 'px';
      ghost.style.top = cursor.y - base.top + 'px';
      ghost.dataset.x = String(x);
      ghost.dataset.y = String(y);
      if (placingFishing) {
        const reason = authority.fishing.assessCast(player,x,y), valid = reason === null;
        ghost.dataset.valid = String(valid); ghost.style.borderColor = valid ? '#a8e1b3' : '#e89c83';
        const population = authority.fishing.water(x,y) ? authority.fishing.population(x,y) : null;
        bindUiText(hint,"textContent",(reason ? statusText(reason) : uiText("ui.ffc553f6")) + (population ? uiText("ui.17c03126") + population.stock + '/' + population.capacity + (population.recoverySeconds === null ? '' : uiText("ui.e211f15b") + population.recoverySeconds + 's') : '') + uiText("ui.71353c8f"));
      }
    }
    if (!opened) return;
    if (focus && focus !== 'craft' && !objects.some(v => v.e.id === focus) && !bundle.world.getActiveGeneratedEntities().some(e => e.entityId === focus && e.type === 'resource' && bundle.worldStore.getResourceState(e.entityId)?.depleted && bundle.worldStore.getResourceState(e.entityId)?.uprootedVersion !== 1)) { close(); return; }
    const targeted = focus !== '' && focus !== 'craft';
    panel.dataset.targeted = String(targeted);
    const next = JSON.stringify([locale(),
      Math.floor(state.lastTick / 60),
      inventory.revision,
      Math.floor(p.x),
      Math.floor(p.y),
      feedback,
      focus,
      state.revision,
      authority.fishing.message(player),
    ]);
    if (next === signature) return;
    signature = next;
    const restoreUi=capturePanelUi(panel);
    const scrollTop = panel.scrollTop,
      craftOpen =
        panel.querySelector<HTMLDetailsElement>('[data-living-craft]')?.open ??
        focus === 'craft';
    panel.replaceChildren(
      text('h2', targeted ? uiText("ui.1e2eb9ef") : uiText("ui.d9324124") + uiPhrase(s.name)),
      button(uiText("ui.cd86acc3"), close),
      ...(!targeted ? [button(uiText("ui.e048e22e"), startPlot)] : []),
    );
    const status = text('p', feedback);
    status.setAttribute('role', 'status');
    panel.append(status);
    if (!targeted) panel.append(
      text(
        'p',
        uiText("ui.2e675ac5"),
      ),
    );
    const roots = LIVING_ROOT_ITEMS.filter(i => inventory.stacks.some(s => s.itemDefinitionId === i.id));
    if (!targeted) panel.append(button(uiText("ui.5f9c6795"), startFishing));
    const fishFeedback = authority.fishing.message(player);
    if (fishFeedback && !fish) panel.append(text('p', fishFeedback.startsWith('FISHING_CAUGHT:') ? uiText("ui.f8dbcaff") + contentDisplayName(bundle.catalog.get(fishFeedback.slice('FISHING_CAUGHT:'.length))) : statusText(fishFeedback)));
    for (const rootItem of targeted ? [] : roots) panel.append(button(uiText("ui.73de41ef") + contentDisplayName(rootItem), () => {
      close(); placing = true; placementRoot = rootItem.id; hint.hidden = false;
      bindUiText(hint,"textContent",uiText("ui.cacbd0a2"));
    }));
    const soil = soilAt(bundle.config.worldSeed, p);
    if (!targeted) panel.append(
      text(
        'p',
        uiText("ui.b8d548cd") +
          uiPhrase(soil.name) +
          uiText("ui.df8490d5") +
          Math.round(soil.growthMilli / 10) +
          uiText("ui.6bd825e0") +
          Math.round(soil.retentionMilli / 10) +
          '%',
      ),
    );
    const groups=new Map<string,HTMLElement>();
    const row = (id: string, title: string,kind='Nearby resources') => {
      const a = document.createElement('article');
      a.dataset.livingRow = id;
      a.append(text('h3', title));
      if(targeted||id.startsWith('recipe:'))panel.append(a);
      else {
        let group=groups.get(kind);
        if(!group){group=document.createElement('section');group.className='lw-management-group';group.dataset.livingGroup=kind;group.append(text('h3',kind));groups.set(kind,group);panel.append(group);}
        group.append(a);
      }
      return a;
    };
    const condition=(parent:HTMLElement,label:string,value:number,severity='normal')=>{
      const indicator=document.createElement('div');indicator.className='lw-condition';indicator.dataset.severity=severity;
      const caption=text('span',label),track=document.createElement('span'),fill=document.createElement('span'),number=text('span',Math.round(value)+'%');
      track.className='lw-condition-track';fill.style.width=Math.max(0,Math.min(100,value))+'%';track.append(fill);
      indicator.setAttribute('role','meter');bindUiText(indicator,'aria-label',label);indicator.setAttribute('aria-valuemin','0');indicator.setAttribute('aria-valuemax','100');indicator.setAttribute('aria-valuenow',String(Math.round(value)));
      indicator.append(caption,track,number);parent.append(indicator);
    };
    for (const plot of state.plots.filter(
      (e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8,
    )) {
      const crop = cropDefinition(plot.crop ?? ''),
        a = row(
          plot.id,
          (crop ? uiPhrase(crop.name) : uiText("ui.2cd74f4d")) + ' · ' + uiPhrase(soilAt(bundle.config.worldSeed, plot).name),'Plots',
        );
      a.dataset.careState=plot.dead?'dead':crop&&plot.progress>=crop.cycleTicks?'ready':moistureState(plot.moisture)==='dry'?'needs-water':'growing';
      const cropIcon=document.createElement('span');cropIcon.className='lw-card-icon';cropIcon.innerHTML=livingArt('plot',plot.crop??'',crop?plot.progress/crop.cycleTicks:0,false,plot.dead).markup;a.prepend(cropIcon);
      condition(a,'Growth',crop?plot.progress/crop.cycleTicks*100:0,a.dataset.careState==='ready'?'ready':'normal');
      condition(a,'Moisture',plot.moisture/100,moistureState(plot.moisture)==='dry'?'warning':'normal');
      if (!targeted) a.append(
        text(
          'p',
          plot.dead
            ? uiText("ui.aeb1104d")
            : (crop
                ? uiPhrase(crop.name) +
                  ' ' +
                  Math.floor((plot.progress / crop.cycleTicks) * 100) +
                  '%'
                : uiText("ui.b421ceb9")) +
                uiText("ui.75b42b56") +
                Math.round(plot.moisture / 100) +
                '%',
        ),
      );
      const growth = authority.plotStatus(plot.id);
      if (growth && !plot.dead && !targeted) a.append(text('p', growthText(growth)));
      const soil = text('p',gameUiText('soil',{name:uiPhrase(soilAt(bundle.config.worldSeed,plot).name),moisture:Math.round(plot.moisture/100),fertility:plot.fertility}));a.append(soil);
      if (!plot.crop) {
        const choices=document.createElement('div');choices.className='lw-seed-choices';
        for(const c of CROPS) {const count=inventory.stacks.filter(v=>v.itemDefinitionId===c.seed).reduce((n,v)=>n+v.quantity,0);
          const choice=button(gameUiText('seed',{name:uiPhrase(c.name),count}),()=>execute('plant',plot.id,{crop:c.id}));choice.disabled=count===0;choice.dataset.crop=c.id;bindUiText(choice,'aria-label',uiText('ui.3fc2d456')+uiPhrase(c.name));
          const icon=document.createElement('span'),sprite=itemIconSprite(c.seed);if(sprite){applyProductionSprite(icon,sprite,1);choice.prepend(icon);}choices.append(choice);
        } a.append(choices);
      }
      a.append(
        button(uiText("ui.71d2725c"), () => execute('water', plot.id)),
        button(uiText("ui.ebb18eea"), () => execute('fertilize', plot.id)),
        button(uiText("ui.f4d07cb2"), () => execute('harvest', plot.id)),
        button(uiText("ui.1a323be8"), () => execute('clear', plot.id)),
      );
    }
    for (const animal of state.animals.filter(
      (e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8,
    )) {
      const d = speciesDefinition(animal.species)!,
        a = row(
          animal.id,
          uiPhrase(d.name) +
            ' · ' +
            (animal.health === 0
              ? uiText("ui.715a6a83")
              : animal.age >= d.matureSeconds * 60
                ? uiText("ui.5c0e81af")
                : uiText("ui.2a407de3")),'Livestock',
        );
      a.dataset.careState=animal.health===0?'dead':animal.energy<2500||animal.thirst<2500?'needs-care':'normal';
      const animalIcon=document.createElement('span');animalIcon.className='lw-card-icon';animalIcon.innerHTML=livingArt('animal',animal.species,1,animal.age<d.matureSeconds*60,animal.health===0).markup;a.prepend(animalIcon);
      condition(a,'Food',animal.energy/100,animal.energy<2500?'warning':'normal');
      condition(a,'Water',animal.thirst/100,animal.thirst<2500?'warning':'normal');
      if (!targeted) a.append(
        text(
          'p',
          uiText("ui.7020801d") +
            animal.health +
            '/' +
            d.health +
            uiText("ui.d0a0b68c") +
            Math.round(animal.energy / 100) +
            uiText("ui.e2f8a8ba") +
            Math.round(animal.thirst / 100) +
            '% · ' +
            (animal.pen ? uiText("ui.8431affd") : uiText("ui.883cad15")) +
            ' · ' +
            (animal.sex ? uiText("ui.487d36f0") : uiText("ui.d8a26cb9")),
        ),
      );
      if (!animal.health)
        a.append(
          button(uiText("ui.c6fa5794"), () => execute('loot', animal.id)),
        );
      else {
        const hunt=button(uiText("ui.e2cc34c4"), () => execute('hunt', animal.id));
        hunt.disabled=bundle.combat.getCooldownUntil(player)>bundle.authorityTick;
        if(hunt.disabled)bindUiText(hunt,'title',uiPhrase('COOLDOWN'));
        a.append(hunt);
        if (!animal.pen && d.tame)
          a.append(button(uiText("ui.e78748a2"), () => execute('tame', animal.id)));
        if (animal.owner === player) {
          a.append(
            button(uiText("ui.fa3fc007"), () => execute('feed', animal.id)),
            button(uiText("ui.6d1e9b1e"), () => execute('release', animal.id)),
          );
          if (d.product)
            a.append(
              button(
                uiText("ui.33547463") +
                  contentDisplayName(bundle.catalog.get(d.product)) +
                  ' · ' +
                  animal.product,
                () => execute('produce', animal.id),
              ),
            );
          if (animal.species === 'goat')
            a.append(button(uiText("ui.de7e5f43"), () => execute('shear', animal.id)));
        }
      }
    }
    for (const entity of bundle.world.getActiveGeneratedEntities().filter(e => !targeted || e.entityId === focus)) {
      if (entity.type !== 'resource' || !worldPositionKnown(bundle,entity.position) || Math.hypot(entity.position.x-p.x,entity.position.y-p.y)>4) continue;
      const resource = bundle.worldStore.getResourceState(entity.entityId);
      if (!resource || resource.uprootedVersion === 1 || !['resource:timber-source','resource:fiber-plant','resource:food-plant'].includes(entity.definitionId) || (!resource.depleted&&resource.lifecycle?.kind==='plant'&&resource.lifecycle.stage==='mature')) continue;
      const a = row(entity.entityId,contentDisplayName(bundle.catalog.getAs(entity.definitionId,'resource'))+(resource.depleted?uiText("ui.75290c99"):uiText("ui.736391b0")));
      if(resource.depleted)a.append(button(uiText("ui.6a845a05"),()=>execute('uproot-canonical',entity.entityId,{resourceRevision:resource.revision})));
      a.append(button(uiText("ui.2c919f1d"),()=>execute('water-canonical',entity.entityId,{resourceRevision:resource.revision})));
    }
    for (const f of state.forage
      .filter((f) => !f.cleared)
      .filter((e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8)) {
      const a = row(f.id, uiPhrase(forageDefinition(f.kind)!.name));
      const growth = authority.forageStatus(f.id)!;
      if (renewablePlant(f.kind) && !targeted) a.append(text('p', growthText(growth)));
      a.append(
        button(
          (f.growth ? growth.harvestYield === 0 : f.readyTick > bundle.authorityTick)
            ? f.growth ? growth.nextStageSeconds === null ? uiText("ui.842f31fb") : uiText("ui.fbb0ffb6") + growth.nextStageSeconds + 's' : uiText("ui.2a04ed00") +
                Math.ceil((f.readyTick - bundle.authorityTick) / 60) +
                's'
            : uiText("ui.2614cfaa"),
          () => execute('forage', f.id),
        ),
      );
      if (f.growth) {
        a.append(button(uiText("ui.cee5b11d"), () => execute('water-forage', f.id)));
        if (f.growth.cut) a.append(text('p', uiPhrase('Uprooting removes this patch permanently; replant the root elsewhere.')), button(uiText("ui.6a845a05"), () => execute('uproot', f.id)));
      }
    }
    for (const f of bundle
      .expedition!.read()
      .facilities.filter((e) => !targeted && Math.hypot(e.x - p.x, e.y - p.y) <= 8)) {
      if (f.definitionId !== 'campfire' && f.definitionId !== 'irrigation-tank')
        continue;
      const a = row(
          f.id,
          f.definitionId === 'campfire' ? uiText("ui.acb06d38") : uiText("ui.d3b0ecf7"),
        ),
        sprite = document.createElement('span');
      applyProductionSprite(sprite, expeditionSprite(f.definitionId), 0.5);
      a.append(sprite);
      const st = state.stations.find((s) => s.id === f.id);
      a.append(
        text(
          'p',
          f.definitionId === 'campfire'
            ? uiText("ui.e5a8d75a") +
                Math.max(
                  0,
                  Math.ceil(((st?.fireUntil ?? 0) - bundle.authorityTick) / 60),
                ) +
                's'
            : uiText("ui.29cf0cb2") + (st?.water ?? 0) + '/24',
        ),
        button(
          f.definitionId === 'campfire'
            ? uiText("ui.89cd97c1")
            : uiText("ui.430e88c1"),
          () => execute(f.definitionId === 'campfire' ? 'fuel' : 'fill', f.id),
        ),
      );
    }
    const craft = document.createElement('details');
    craft.dataset.livingCraft='true';
    craft.open = craftOpen;
    craft.append(
      text(
        'summary',
        uiText("ui.e9eb9b92") + (LIVING_RECIPES.length + LIVING_ROOT_RECIPES.length + FISHING_RECIPES.length + GEAR_RECIPES.length + WEARABLE_RECIPES.length) + uiText("ui.c8c1b8be"),
      ),
    );
    if (!targeted) panel.append(craft);
    for (const r of targeted ? [] : [...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES, ...WEARABLE_RECIPES]) {
      const a = row('recipe:' + r.id, uiPhrase(r.name));
      const definition = bundle.catalog.getAs(r.output, 'item');
      if (definition.rarity) { a.dataset.rarity = definition.rarity; a.style.borderColor = RARITY_STYLE[definition.rarity].colour; const badge = text('small', RARITY_STYLE[definition.rarity].label); badge.style.color = RARITY_STYLE[definition.rarity].colour; a.append(badge); a.querySelector('h3')?.setAttribute('style', 'color:' + RARITY_STYLE[definition.rarity].colour); }
      craft.append(a);
      const icon = document.createElement('span'),
        sprite = itemIconSprite(r.output);
      if (sprite) {
        applyProductionSprite(icon, sprite, 1.2);
        a.prepend(icon);
      }
      const requirements=costRequirements(r.costs.map(([itemId,quantity])=>({itemId,quantity})),
        id=>inventory.stacks.filter(stack=>stack.itemDefinitionId===id).reduce((n,stack)=>n+stack.quantity,0),id=>contentDisplayName(bundle.catalog.get(id)));
      a.append(costList(document,requirements,id=>materialSource(bundle.catalog,id)));
      a.append(text('p',costLabel('outputs')+' '+r.quantity+' × '+contentDisplayName(definition)));
      const stationBlocked=r.station&&!bundle.expedition!.read().facilities.some(f=>f.definitionId===r.station&&Math.hypot(f.x-p.x,f.y-p.y)<=4);
      const reason=[missingCostText(requirements),stationBlocked?gameUiText('prerequisite',{name:uiPhrase(EXPEDITION_FACILITIES.find(f=>f.id===r.station)?.name??r.station!)}):''].filter(Boolean).join(' · ');
      const action=button(uiText("ui.93077f53")+uiPhrase(r.name),()=>execute('craft',r.id));
      if(reason){action.disabled=true;action.title=reason;action.setAttribute('aria-description',reason);if(stationBlocked)a.append(text('p',reason));}
      a.append(action);
    }
    panel.scrollTop = scrollTop;restoreUi();
  };
  const pointer = (e: PointerEvent) => {
    cursor = { x: e.clientX, y: e.clientY };
    if (placing) {
      signature = '';
      render();
    }
  };
  const click = (e: MouseEvent) => {
    if (
      !placing ||
      !(e.target instanceof Element) ||
      e.target.closest(
        '.lw-panel,.lw-menu,.lw-fishing-status,.p1-ui,.p2-settings,.p2-colony-controls,.sp-expedition-panel,[data-colony-settings]',
      )
    )
      return;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return;
    e.preventDefault();
    e.stopImmediatePropagation();
    cursor = { x: e.clientX, y: e.clientY };
    signature = '';
    render();
    if (placingFishing) {
      if (fishingAction('cast', { x: Number(ghost.dataset.x), y: Number(ghost.dataset.y) })) close();
      else bindUiText(hint,"textContent",feedback + uiText("ui.bd3d8869"));
      return;
    }
    if (
      execute(placementRoot ? 'replant' : 'till', placementRoot ?? 'ground', {
        x: Number(ghost.dataset.x),
        y: Number(ghost.dataset.y),
      })
    ) {
      placing = false;
      open();
    } else bindUiText(hint,"textContent",feedback + uiText("ui.bd3d8869"));
  };
  const key = (e: KeyboardEvent) => {
    if (bundle.playerWorldspace() !== 'surface') return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)
    )
      return;
    if (authority.fishing.session(player) && (e.code === 'Escape' || (e.code === 'Space' && !opened && root.dataset.productReviewPanelOpen !== 'true' && root.dataset.colonySettingsOpen !== 'true'))) {
      e.preventDefault(); e.stopImmediatePropagation(); fishingAction(e.code === 'Escape' ? 'cancel' : 'reel'); return;
    }
    if (
      e.code === PANEL_SHORTCUTS.farm.code && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey &&
      !root.dataset.colonySettingsOpen?.includes('true')
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (opened) close();
      else open();
    } else if (
      e.code === 'KeyE' &&
      !opened &&
      !placing &&
      root.dataset.expeditionPanelOpen !== 'true' &&
      root.dataset.colonySettingsOpen !== 'true' &&
      root.dataset.productReviewPanelOpen !== 'true' &&
      root.dataset.productReviewHelpOpen !== 'true' &&
      !root.querySelector('.p2-colony-panel:not([hidden])')
    ) {
      const p = bundle.getPlayerPosition(player),
        state = authority.presentationSnapshot(),
        near = [
          ...state.plots,
          ...state.animals,
          ...state.forage.filter((f) => !f.cleared),
        ]
          .filter((a) => Math.hypot(a.x - p.x, a.y - p.y) <= 2)
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
      if (near) {
        const distance = Math.hypot(near.x - p.x, near.y - p.y),
          canonical = [
            ...bundle.world
              .getActiveGeneratedEntities()
              .filter((e) => e.type !== 'passive-wildlife'),
            ...bundle.buildings.exportSnapshot().foothold.structures,
          ].some(
            (a) =>
              a.position &&
              Math.hypot(a.position.x - p.x, a.position.y - p.y) < distance,
          );
        if (!canonical) {
          e.preventDefault();
          e.stopImmediatePropagation();
          interact(near.id);
        }
      }
    } else if (e.code === 'Escape' && (opened || placing)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
      placing = false;
      ghost.hidden = true;
      hint.hidden = true;
    } else if (opened) {
      if (
        panelShortcutForCode(e.code)!==undefined
      ) {
        close();
        return;
      }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
  };
  root.addEventListener('pointermove', pointer);
  root.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  return {
    open,
    close,
    cancelPlacement: () => { const active = placing || Boolean(authority.fishing.session(player)); if (placing) close(); if (authority.fishing.session(player)) fishingAction('cancel'); return active; },
    render,
    destroy: () => {
      root.removeEventListener('pointermove', pointer);
      root.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      markers.remove();
      motion.clear();
      layer.remove();
      menu.remove();
    },
  };
}
