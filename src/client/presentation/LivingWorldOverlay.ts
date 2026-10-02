import type { Phase1AuthorityBundle } from '../../integration';
import {
  CROPS,
  LIVING_RECIPES,
  cropDefinition,
  speciesDefinition,
  forageDefinition,
  soilAt,
} from '../../content/livingworld/LivingWorldContent';
import { livingArt } from './LivingWorldArt';
import { LivingMotion } from './LivingMotion';
import { worldDepthOrder } from './WorldDepth';
import { forageGrowthView, renewablePlant, moistureState } from '../../simulation/livingworld/PlantGrowth';
import { LIVING_ROOT_ITEMS, LIVING_ROOT_RECIPES } from '../../content/livingworld/LivingRootContent';
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
  const worldStage = root.querySelector<HTMLElement>('.p1-product-world-stage');
  if (!worldStage) throw new Error('Living presentation requires the canonical world stage.');
  const rasterOrigin = { x: Number(worldStage.dataset.rasterOriginX), y: Number(worldStage.dataset.rasterOriginY) };
  markers.style.display = 'contents';
  worldStage.append(markers);
  const motion = new LivingMotion();
  layer.append(style, season, panel, ghost, hint);
  root.append(layer, menu);
  let opened = false,
    placing = false,
    feedback = '',
    focus = '',
    signature = '',
    placementRoot: string | null = null,
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
      FORAGED: 'Materials gathered.',
      HUNTED: 'Animal down: collect the meat.',
      TAMED: 'Animal moved into your pen.',
      FED: 'Animal fed. Adults with a fed partner can breed.',
      FIRE_LIT: 'Fire burning: stay within 4 m for warmth.',
      TANK_FILLED: 'Irrigation reservoir filled.',
      MISSING_INPUT: 'Bring the required materials.',
    })[v] ?? v.replaceAll('_', ' ').toLowerCase();
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
  const growthText = (v: ReturnType<typeof forageGrowthView>) => v.stage === 'mature'
    ? 'Maximum growth reached · best yield ' + v.maximumYield + ' · ' + (v.condition === 'normal' ? 'Normal' : 'Needs water')
    : (v.stage === 'early' ? 'Early growth' : 'Growing') + ' · ' + (v.nextStageSeconds === null ? 'Growth paused: water needed' : 'Next stage ≈ ' + v.nextStageSeconds + 's') + ' · ' + (v.condition === 'needs-water' ? 'Needs water' : 'Normal') + ' · yield ' + v.harvestYield + '/' + v.maximumYield;
  const render = () => {
    const now = performance.now();
    if (root.dataset.colonySettingsOpen === 'true') {
      close();
      placing = false;
      ghost.hidden = true;
      hint.hidden = true;
    }
    const state = authority.presentationSnapshot(),
      p = bundle.getPlayerPosition(player),
      s = authority.season(),
      inventory = bundle.items.getContainerView('inventory:' + player),
      rect = canvas.getBoundingClientRect(),
      base = root.getBoundingClientRect();
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
          open(e.id);
        };
        objectNodes.set(e.id, b);
        markers.append(b);
      }
      const key = [role, kind, progress >= 1 ? 2 : progress >= .5 ? 1 : 0, young, dead].join(':');
      const definition = livingArt(role, kind, progress, young, dead);
      if (b.dataset.art !== key) {
        b.innerHTML = definition.markup;
        b.dataset.art = key;
        const svg = b.querySelector('svg')!;
        svg.style.cssText = `position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:${definition.width}px;height:${definition.height}px`;
      }
      b.dataset.dead = String(dead);
      b.dataset.livingRole = role;
      b.dataset.livingKind = kind;
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
      if (Math.hypot(e.x - p.x, e.y - p.y) <= 4 && role === 'forage' && renewablePlant(kind)) {
        const growth = authority.forageStatus(e.id)!;
        const label = (b.getAttribute('aria-label') ?? '') + ' · ' + growthText(growth);
        if (b.title !== label) b.title = label;
      } else b.title = b.getAttribute('aria-label') ?? '';
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
      const point = unprojectPhase1Isometric(
          {
            x: ((cursor.x - rect.left) * 640) / rect.width - 320,
            y: ((cursor.y - rect.top) * 360) / rect.height - 180,
          },
          p,
        ),
        x = Math.round(point.x * 4) / 4,
        y = Math.round(point.y * 4) / 4;
      ghost.hidden = false;
      ghost.style.left = cursor.x - base.left + 'px';
      ghost.style.top = cursor.y - base.top + 'px';
      ghost.dataset.x = String(x);
      ghost.dataset.y = String(y);
    }
    if (!opened) return;
    const next = JSON.stringify([
      Math.floor(state.lastTick / 60),
      inventory.revision,
      Math.floor(p.x),
      Math.floor(p.y),
      feedback,
      focus,
    ]);
    if (next === signature) return;
    signature = next;
    const scrollTop = panel.scrollTop,
      craftOpen =
        panel.querySelector<HTMLDetailsElement>('details')?.open ??
        focus === 'craft';
    panel.replaceChildren(
      text('h2', 'HOMESTEAD · ' + s.name),
      button('Close', close),
      button('Till a new plot', startPlot),
    );
    const status = text('p', feedback);
    status.setAttribute('role', 'status');
    panel.append(
      status,
      text(
        'p',
        'Spring +35% growth · Summer: water regularly · Autumn +25% harvest · Winter: fire and shelter. Each season lasts 12 active minutes.',
      ),
    );
    const roots = LIVING_ROOT_ITEMS.filter(i => inventory.stacks.some(s => s.itemDefinitionId === i.id));
    for (const rootItem of roots) panel.append(button('Replant ' + rootItem.displayName, () => {
      close(); placing = true; placementRoot = rootItem.id; hint.hidden = false;
      hint.textContent = 'Replant on explored ground within 4 m · Escape / right-click cancel';
    }));
    const soil = soilAt(bundle.config.worldSeed, p);
    panel.append(
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
      (e) => Math.hypot(e.x - p.x, e.y - p.y) <= 8 || e.id === focus,
    )) {
      const crop = cropDefinition(plot.crop ?? ''),
        a = row(
          plot.id,
          'Plot · ' + soilAt(bundle.config.worldSeed, plot).name,
        );
      a.append(
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
      if (growth && !plot.dead) a.append(text('p', growthText(growth)));
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
      (e) => Math.hypot(e.x - p.x, e.y - p.y) <= 8 || e.id === focus,
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
      a.append(
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
    for (const f of state.forage
      .filter((f) => !f.cleared)
      .filter((e) => Math.hypot(e.x - p.x, e.y - p.y) <= 8 || e.id === focus)) {
      const a = row(f.id, forageDefinition(f.kind)!.name);
      const growth = authority.forageStatus(f.id)!;
      if (renewablePlant(f.kind)) a.append(text('p', growthText(growth)));
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
      .facilities.filter((e) => Math.hypot(e.x - p.x, e.y - p.y) <= 8)) {
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
        'Farm & survival crafting · ' + (LIVING_RECIPES.length + LIVING_ROOT_RECIPES.length) + ' recipes',
      ),
    );
    panel.append(craft);
    for (const r of [...LIVING_RECIPES, ...LIVING_ROOT_RECIPES]) {
      const a = row('recipe:' + r.id, r.name);
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
        '.lw-panel,.lw-menu,.p1-ui,.p2-settings,.p2-colony-controls,.sp-expedition-panel,[data-colony-settings]',
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
      e.target instanceof HTMLTextAreaElement
    )
      return;
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
          open(near.id);
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
    cancelPlacement: () => { if (placing) close(); },
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
