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
  menu.textContent = '☘ Homestead [F]';
  menu.className = 'lw-menu';
  menu.setAttribute('aria-label', 'Homestead farming and wildlife');
  season.className = 'lw-season';
  panel.className = 'lw-panel';
  panel.setAttribute('aria-label', 'Homestead');
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
  reelButton.textContent = 'Reel [Space]'; reelButton.type = 'button'; cancelFishButton.textContent = 'Cancel [Esc]'; cancelFishButton.type = 'button';
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
    n.textContent = value;
    return n;
  };
  const button = (label: string, callback: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = (e) => {
      e.stopPropagation();
      callback();
    };
    return b;
  };
  const statusText = (v: string) =>
    ({
      OUT_OF_RANGE: 'Walk closer (4 m).',
      BUILD_NEARBY_PEN: 'Build a pen within 6 m of this animal.',
      EQUIP_WEAPON_FIRST: 'Equip a spear in inventory before hunting.',
      FIELD_HOE_REQUIRED: 'Craft a Field Hoe first.',
      WATERING_CAN_REQUIRED: 'Craft a Watering Can first.',
      CAPACITY_EXCEEDED:
        'Bag full. Store some items; harvest and loot are preserved.',
      NEARBY_STATION_REQUIRED: 'Build and stand near the required station.',
      RENEWING: 'This patch is regenerating.',
      NOT_READY: 'Still growing or producing.',
      SOIL_TILLED: 'Plot ready: choose a seed.',
      PLANTED: 'Seeds planted.',
      WATERED: 'Soil watered.',
      OUT_OF_WEAPON_RANGE: 'Move within striking distance of this animal.',
      EXHAUSTED: 'Not enough stamina. Recover before striking again.',
      BROKEN_WEAPON: 'Your equipped weapon is broken. Repair or replace it.',
      FORAGED: 'Materials gathered.',
      HUNTED: 'Animal down: collect the meat.',
      TAMED: 'Animal moved into your pen.',
      FED: 'Animal fed. Adults with a fed partner can breed.',
      FIRE_LIT: 'Fire burning: stay within 4 m for warmth.',
      TANK_FILLED: 'Irrigation reservoir filled.',
      MISSING_INPUT: 'Bring the required materials.',
      FISHING_ROD_REQUIRED: 'Craft a Field Fishing Rod first.',
      FISHING_BAIT_REQUIRED: 'Craft or carry Plant Fishing Bait before casting.',
      FISHING_WATER_REQUIRED: 'Choose explored water within 4 m.',
      FISHING_LINE_BLOCKED: 'The line is blocked. Try a clear bank.',
      FISHING_STAND_ON_BANK: 'Stand on dry bank ground before casting.',
      FISHING_CAST: 'Bait cast. Stay still and watch for the bite.',
      FISHING_WAIT_FOR_BITE: 'Wait for the bite before reeling.',
      FISHING_STOCK_RECOVERING: 'Fish population depleted or reserved; let this area recover.',
      FISHING_INTERRUPTED_MOVE: 'Fishing cancelled because you moved. The cast bait is spent.',
      FISHING_INTERRUPTED_DAMAGE: 'Fishing cancelled because you took damage.',
      FISHING_MISSED_BITE: 'The fish escaped. Reel within four seconds of the bite.',
      FISHING_CANCELLED: 'Fishing cancelled. The cast bait is spent.',
      TARGET_CAPACITY_WEIGHT: 'Too heavy to land the fish. Free bag space before the bite window closes.',
      TARGET_CAPACITY_VOLUME: 'No room to land the fish. Free bag space before the bite window closes.',
    })[v] ?? v.replaceAll('_', ' ').toLowerCase();
  const fishingAction = (action: FishingCommand['action'], extra: Partial<FishingCommand> = {}) => {
    const result = authority.fishing.execute({ id: 'fish:' + crypto.randomUUID(), playerId: player, expectedRevision: authority.fishing.revision(), expectedInventoryRevision: bundle.items.getContainerView('inventory:' + player).revision, action, ...extra });
    feedback = result.message.startsWith('FISHING_CAUGHT:') ? 'Caught ' + bundle.catalog.get(result.message.slice('FISHING_CAUGHT:'.length)).displayName : result.message.startsWith('NEED item:fishing-bait') ? 'Craft or carry Plant Fishing Bait before casting.' : statusText(result.message);
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
    hint.textContent = 'Click explored dry ground within 4 m · Escape cancel';
  };
  const startFishing = () => { close(); placing = true; placingFishing = true; hint.hidden = false; hint.textContent = 'Click explored water within 4 m · 1 bait per cast · Escape / right-click cancel'; };
  const growthText = (v: ReturnType<typeof forageGrowthView>) => v.stage === 'mature'
    ? 'Maximum growth reached · best yield ' + v.maximumYield + ' · ' + (v.condition === 'normal' ? 'Normal' : 'Needs water')
    : (v.stage === 'early' ? 'Early growth' : 'Growing') + ' · ' + (v.nextStageSeconds === null ? 'Growth paused: water needed' : 'Next stage ≈ ' + v.nextStageSeconds + 's') + ' · ' + (v.condition === 'needs-water' ? 'Needs water' : 'Normal') + ' · yield ' + v.harvestYield + '/' + v.maximumYield;
  const interact = (id: string) => {
    if (placing || opened || root.dataset.colonySettingsOpen === 'true' || root.dataset.productReviewPanelOpen === 'true') return;
    const f = authority.presentationSnapshot().forage.find(f => f.id === id && !f.cleared);
    if (f) {
      execute('forage', id); hint.textContent = feedback; hint.hidden = false; interactionFlashUntil = performance.now() + 3500;
    } else open(id);
  };
  const render = () => {
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
      const label = (biting ? 'BITE! Reel within ' + Math.max(0, Math.ceil((fish.endTick - bundle.authorityTick) / 60)) + 's' : 'Waiting for a bite · stay still') + (fishingError ? ' · ' + fishingError : '');
      if (fishingLabel.textContent !== label) fishingLabel.textContent = label;
      reelButton.disabled = !biting;
      const at = projectPhase1Isometric(fish, rasterOrigin);
      bobber.style.left = 320 + at.x - 12 + 'px'; bobber.style.top = 180 + at.y - 8 + (biting ? Math.floor(bundle.authorityTick / 8) % 2 * 2 : 0) + 'px'; bobber.style.zIndex = worldDepthOrder(fish, 2);
    } else if (message) fishingLabel.textContent = message.startsWith('FISHING_CAUGHT:') ? 'Caught ' + bundle.catalog.get(message.slice('FISHING_CAUGHT:'.length)).displayName : statusText(message);
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
      s.name +
      ' · Year ' +
      s.year +
      ' · ' +
      Math.ceil(s.remainingTicks / 3600) +
      ' min';
    if (season.textContent !== seasonText) season.textContent = seasonText;
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
          const label = role === 'plot' ? 'Farm plot' : role === 'animal' ? speciesDefinition(kind)!.name : forageDefinition(kind)!.name;
          const facts: string[] = [];
          if (role === 'animal') {
            const animal = snapshot.animals.find(v => v.id === e.id)!, def = speciesDefinition(animal.species)!;
            facts.push('Health: '+animal.health+'/'+def.health, 'Feed: '+Math.round(animal.energy/100)+'% · Water: '+Math.round(animal.thirst/100)+'%', animal.health === 0 ? 'Carcass' : animal.age >= def.matureSeconds*60 ? 'Adult' : 'Young', animal.pen ? 'Domestic' : 'Wild');
          } else {
            const growth = role === 'plot' ? authority.plotStatus(e.id) : authority.forageStatus(e.id);
            if (growth) facts.push(growthText(growth));
            if (role === 'plot') { const plot = snapshot.plots.find(v => v.id === e.id)!; facts.push('Moisture: '+Math.round(plot.moisture/100)+'%', plot.dead ? 'Withered' : plot.crop ? cropDefinition(plot.crop)!.name : 'Empty soil'); }
          }
          facts.push('Soil: '+soilAt(bundle.config.worldSeed,current).name, 'Left click / E: interact · F: manage');
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
      b.dataset.dead = String(dead);
      b.dataset.livingRole = role;
      b.dataset.livingKind = kind;
      b.dataset.livingArtVariant = String(variant);
      b.dataset.livingYoung = String(young);
      b.style.zIndex = worldDepthOrder(displayed);
      b.setAttribute(
        'aria-label',
        role === 'plot'
          ? 'Farm plot · ' + kind
          : role === 'animal'
            ? speciesDefinition(kind)!.name
            : forageDefinition(kind)!.name,
      );
      b.removeAttribute('title');
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
      b.style.top = raster.y + 180 - definition.height * 50 / 64 - (hitHeight - definition.height) + 'px';
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
        hint.textContent = (reason ? statusText(reason) : 'Cast here · 1 bait') + (population ? ' · Fish ' + population.stock + '/' + population.capacity + (population.recoverySeconds === null ? '' : ' · next fish ≈ ' + population.recoverySeconds + 's') : '') + ' · Escape cancel';
      }
    }
    if (!opened) return;
    if (focus && focus !== 'craft' && !objects.some(v => v.e.id === focus) && !bundle.world.getActiveGeneratedEntities().some(e => e.entityId === focus && e.type === 'resource' && bundle.worldStore.getResourceState(e.entityId)?.depleted && bundle.worldStore.getResourceState(e.entityId)?.uprootedVersion !== 1)) { close(); return; }
    const targeted = focus !== '' && focus !== 'craft';
    panel.dataset.targeted = String(targeted);
    const next = JSON.stringify([
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
    const scrollTop = panel.scrollTop,
      craftOpen =
        panel.querySelector<HTMLDetailsElement>('details')?.open ??
        focus === 'craft';
    panel.replaceChildren(
      text('h2', targeted ? 'Interact' : 'HOMESTEAD · ' + s.name),
      button('Close', close),
      ...(!targeted ? [button('Till a new plot', startPlot)] : []),
    );
    const status = text('p', feedback);
    status.setAttribute('role', 'status');
    panel.append(status);
    if (!targeted) panel.append(
      text(
        'p',
        'Spring +35% growth · Summer: water regularly · Autumn +25% harvest · Winter: fire and shelter. Each season lasts 12 active minutes.',
      ),
    );
    const roots = LIVING_ROOT_ITEMS.filter(i => inventory.stacks.some(s => s.itemDefinitionId === i.id));
    if (!targeted) panel.append(button('Fish nearby water', startFishing));
    const fishFeedback = authority.fishing.message(player);
    if (fishFeedback && !fish) panel.append(text('p', fishFeedback.startsWith('FISHING_CAUGHT:') ? 'Caught ' + bundle.catalog.get(fishFeedback.slice('FISHING_CAUGHT:'.length)).displayName : statusText(fishFeedback)));
    for (const rootItem of targeted ? [] : roots) panel.append(button('Replant ' + rootItem.displayName, () => {
      close(); placing = true; placementRoot = rootItem.id; hint.hidden = false;
      hint.textContent = 'Replant on explored ground within 4 m · Escape / right-click cancel';
    }));
    const soil = soilAt(bundle.config.worldSeed, p);
    if (!targeted) panel.append(
      text(
        'p',
        'Local soil: ' +
          soil.name +
          ' · growth ' +
          Math.round(soil.growthMilli / 10) +
          '% · water retention ' +
          Math.round(soil.retentionMilli / 10) +
          '%',
      ),
    );
    const row = (id: string, title: string) => {
      const a = document.createElement('article');
      a.dataset.livingRow = id;
      a.append(text('h3', title));
      panel.append(a);
      return a;
    };
    for (const plot of state.plots.filter(
      (e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8,
    )) {
      const crop = cropDefinition(plot.crop ?? ''),
        a = row(
          plot.id,
          (crop ? crop.name : 'Empty plot') + ' · ' + soilAt(bundle.config.worldSeed, plot).name,
        );
      if (!targeted) a.append(
        text(
          'p',
          plot.dead
            ? 'Withered: clear and replant.'
            : (crop
                ? crop.name +
                  ' ' +
                  Math.floor((plot.progress / crop.cycleTicks) * 100) +
                  '%'
                : 'Empty soil') +
                ' · Moisture ' +
                Math.round(plot.moisture / 100) +
                '%',
        ),
      );
      const growth = authority.plotStatus(plot.id);
      if (growth && !plot.dead && !targeted) a.append(text('p', growthText(growth)));
      if (!plot.crop)
        for (const c of CROPS)
          a.append(
            button('Plant ' + c.name, () =>
              execute('plant', plot.id, { crop: c.id }),
            ),
          );
      a.append(
        button('Water · 1 clean water', () => execute('water', plot.id)),
        button('Fertilize · 1 compost', () => execute('fertilize', plot.id)),
        button('Harvest', () => execute('harvest', plot.id)),
        button('Clear crop', () => execute('clear', plot.id)),
      );
    }
    for (const animal of state.animals.filter(
      (e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8,
    )) {
      const d = speciesDefinition(animal.species)!,
        a = row(
          animal.id,
          d.name +
            ' · ' +
            (animal.health === 0
              ? 'Carcass'
              : animal.age >= d.matureSeconds * 60
                ? 'Adult'
                : 'Young'),
        );
      if (!targeted) a.append(
        text(
          'p',
          'Health ' +
            animal.health +
            '/' +
            d.health +
            ' · Feed ' +
            Math.round(animal.energy / 100) +
            '% · Water ' +
            Math.round(animal.thirst / 100) +
            '% · ' +
            (animal.pen ? 'Domestic' : 'Wild') +
            ' · ' +
            (animal.sex ? 'Male' : 'Female'),
        ),
      );
      if (!animal.health)
        a.append(
          button('Collect meat, hide & bone', () => execute('loot', animal.id)),
        );
      else {
        a.append(button('Hunt', () => execute('hunt', animal.id)));
        if (!animal.pen && d.tame)
          a.append(button('Tame · 1 feed', () => execute('tame', animal.id)));
        if (animal.owner === player) {
          a.append(
            button('Feed & water · 1 each', () => execute('feed', animal.id)),
            button('Release', () => execute('release', animal.id)),
          );
          if (d.product)
            a.append(
              button(
                'Collect ' +
                  bundle.catalog.get(d.product).displayName +
                  ' · ' +
                  animal.product,
                () => execute('produce', animal.id),
              ),
            );
          if (animal.species === 'goat')
            a.append(button('Shear wool', () => execute('shear', animal.id)));
        }
      }
    }
    for (const entity of bundle.world.getActiveGeneratedEntities().filter(e => !targeted || e.entityId === focus)) {
      if (entity.type !== 'resource' || !worldPositionKnown(bundle,entity.position) || Math.hypot(entity.position.x-p.x,entity.position.y-p.y)>4) continue;
      const resource = bundle.worldStore.getResourceState(entity.entityId);
      if (!resource?.depleted || resource.uprootedVersion === 1 || !['resource:timber-source','resource:fiber-plant','resource:food-plant'].includes(entity.definitionId)) continue;
      const a = row(entity.entityId,bundle.catalog.getAs(entity.definitionId,'resource').displayName+' · cut roots');
      a.append(button('Uproot · Field Hoe',()=>execute('uproot-canonical',entity.entityId,{resourceRevision:resource.revision})));
    }
    for (const f of state.forage
      .filter((f) => !f.cleared)
      .filter((e) => targeted ? e.id === focus : Math.hypot(e.x - p.x, e.y - p.y) <= 8)) {
      const a = row(f.id, forageDefinition(f.kind)!.name);
      const growth = authority.forageStatus(f.id)!;
      if (renewablePlant(f.kind) && !targeted) a.append(text('p', growthText(growth)));
      a.append(
        button(
          (f.growth ? growth.harvestYield === 0 : f.readyTick > bundle.authorityTick)
            ? f.growth ? growth.nextStageSeconds === null ? 'Water needed · growth paused' : 'Early growth · ≈ ' + growth.nextStageSeconds + 's' : 'Regrowing · ' +
                Math.ceil((f.readyTick - bundle.authorityTick) / 60) +
                's'
            : 'Gather',
          () => execute('forage', f.id),
        ),
      );
      if (f.growth) {
        a.append(button('Water roots · 1 clean water', () => execute('water-forage', f.id)));
        if (f.growth.cut) a.append(text('p', 'Uprooting removes this patch permanently; replant the root elsewhere.'), button('Uproot · Field Hoe', () => execute('uproot', f.id)));
      }
    }
    for (const f of bundle
      .expedition!.read()
      .facilities.filter((e) => !targeted && Math.hypot(e.x - p.x, e.y - p.y) <= 8)) {
      if (f.definitionId !== 'campfire' && f.definitionId !== 'irrigation-tank')
        continue;
      const a = row(
          f.id,
          f.definitionId === 'campfire' ? 'Campfire' : 'Irrigation Tank',
        ),
        sprite = document.createElement('span');
      applyProductionSprite(sprite, expeditionSprite(f.definitionId), 0.5);
      a.append(sprite);
      const st = state.stations.find((s) => s.id === f.id);
      a.append(
        text(
          'p',
          f.definitionId === 'campfire'
            ? 'Burning: ' +
                Math.max(
                  0,
                  Math.ceil(((st?.fireUntil ?? 0) - bundle.authorityTick) / 60),
                ) +
                's'
            : 'Reservoir ' + (st?.water ?? 0) + '/24',
        ),
        button(
          f.definitionId === 'campfire'
            ? 'Add timber · 5 min'
            : 'Fill · 1 water → 4 irrigation',
          () => execute(f.definitionId === 'campfire' ? 'fuel' : 'fill', f.id),
        ),
      );
    }
    const craft = document.createElement('details');
    craft.open = craftOpen;
    craft.append(
      text(
        'summary',
        'Farm & survival crafting · ' + (LIVING_RECIPES.length + LIVING_ROOT_RECIPES.length + FISHING_RECIPES.length + GEAR_RECIPES.length) + ' recipes',
      ),
    );
    if (!targeted) panel.append(craft);
    for (const r of targeted ? [] : [...LIVING_RECIPES, ...LIVING_ROOT_RECIPES, ...FISHING_RECIPES, ...GEAR_RECIPES]) {
      const a = row('recipe:' + r.id, r.name);
      const definition = bundle.catalog.getAs(r.output, 'item');
      if (definition.rarity) { a.dataset.rarity = definition.rarity; a.style.borderColor = RARITY_STYLE[definition.rarity].colour; const badge = text('small', RARITY_STYLE[definition.rarity].label); badge.style.color = RARITY_STYLE[definition.rarity].colour; a.append(badge); a.querySelector('h3')?.setAttribute('style', 'color:' + RARITY_STYLE[definition.rarity].colour); }
      craft.append(a);
      const icon = document.createElement('span'),
        sprite = itemIconSprite(r.output);
      if (sprite) {
        applyProductionSprite(icon, sprite, 1.2);
        a.prepend(icon);
      }
      a.append(
        text(
          'p',
          r.costs
            .map(
              ([id, q]) =>
                bundle.catalog.get(id).displayName +
                ' ' +
                inventory.stacks
                  .filter((s) => s.itemDefinitionId === id)
                  .reduce((sum, s) => sum + s.quantity, 0) +
                '/' +
                q,
            )
            .join(' · ') +
            (r.station ? ' · Station: ' + r.station.replaceAll('-', ' ') : ''),
        ),
        button('Craft ' + r.name, () => execute('craft', r.id)),
      );
    }
    panel.scrollTop = scrollTop;
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
      else hint.textContent = feedback + ' · choose another position';
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
    } else hint.textContent = feedback + ' · choose another position';
  };
  const key = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)
    )
      return;
    if (authority.fishing.session(player) && (e.code === 'Escape' || (e.code === 'Space' && !opened && root.dataset.productReviewPanelOpen !== 'true' && root.dataset.colonySettingsOpen !== 'true'))) {
      e.preventDefault(); e.stopImmediatePropagation(); fishingAction(e.code === 'Escape' ? 'cancel' : 'reel'); return;
    }
    if (
      e.code === 'KeyF' &&
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
        ['KeyI', 'KeyC', 'KeyB', 'KeyM', 'KeyN', 'KeyU', 'KeyJ'].includes(
          e.code,
        )
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
