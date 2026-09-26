import {
  validatePhase1PresentationState,
  type Phase1InventoryItemPresentation,
  type Phase1MeterPresentation,
  type Phase1PanelPresentation,
  type Phase1PresentationState,
  type Phase1TeammatePresentation,
} from './Phase1PresentationModel';
import {
  applyProductionSprite,
  buildPreviewPatternSprite,
  hudStatusSprite,
  interactionSprite,
  itemIconSprite,
  mapMarkerSprite,
  panelSkinCornerSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
  progressionSprite,
  teammateIdentitySprite,
  type Phase1ProductionSprite,
} from './Phase1ProductionAssets';

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function percent(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

function assetSprite(
  document: Document,
  className: string,
  spriteDefinition: Phase1ProductionSprite | null,
  scale = 1,
): HTMLSpanElement | null {
  if (spriteDefinition === null) {
    return null;
  }

  const element = createElement(document, 'span', className);
  applyProductionSprite(element, spriteDefinition, scale);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function createProductionWorldPreview(document: Document): HTMLElement {
  const preview = createElement(
    document,
    'div',
    'p1-production-world-preview',
  );
  preview.dataset.productionWorldPreview = 'accepted-raster';

  for (let row = 0; row < 12; row += 1) {
    for (let column = 0; column < 20; column += 1) {
      const tile = assetSprite(
        document,
        'p1-production-world-tile',
        PHASE1_PRODUCTION_WORLD_SPRITES.ground,
      );
      if (tile !== null) {
        tile.style.left = String(column * 32) + 'px';
        tile.style.top = String(row * 32) + 'px';
        preview.append(tile);
      }
    }
  }

  const placements = [
    ['ruin', PHASE1_PRODUCTION_WORLD_SPRITES.ruin, 22, 138, 160],
    ['metal-ore', PHASE1_PRODUCTION_WORLD_SPRITES.metalOre, 190, 238, 278],
    ['potable-water', PHASE1_PRODUCTION_WORLD_SPRITES.potableWater, 252, 244, 276],
    ['player', PHASE1_PRODUCTION_WORLD_SPRITES.player, 300, 182, 230],
    ['predator', PHASE1_PRODUCTION_WORLD_SPRITES.predator, 372, 174, 222],
    ['habitat', PHASE1_PRODUCTION_WORLD_SPRITES.habitat, 478, 158, 254],
    ['death-cache', PHASE1_PRODUCTION_WORLD_SPRITES.deathCache, 344, 276, 300],
    ['condenser', PHASE1_PRODUCTION_WORLD_SPRITES.condenser, 518, 272, 336],
  ] as const;

  for (const [id, definition, left, top, zIndex] of placements) {
    const visual = assetSprite(
      document,
      'p1-production-world-sprite',
      definition,
    );
    if (visual === null) {
      continue;
    }
    visual.dataset.productionWorldAsset = id;
    visual.style.left = String(left) + 'px';
    visual.style.top = String(top) + 'px';
    visual.style.zIndex = String(zIndex);
    preview.append(visual);
  }

  return preview;
}

function meter(
  document: Document,
  presentation: Phase1MeterPresentation,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-meter');
  row.dataset.severity = presentation.severity;
  row.dataset.stateLabel = presentation.stateLabel;
  row.dataset.value = String(presentation.value);
  row.dataset.max = String(presentation.max);

  const label = createElement(document, 'div', 'p1-meter-label');
  const icon = assetSprite(
    document,
    'p1-asset-icon p1-meter-icon',
    hudStatusSprite(presentation.label),
  );
  if (icon !== null) {
    label.append(icon);
  }
  label.append(presentation.label + ' · ' + presentation.stateLabel);
  const track = createElement(document, 'div', 'p1-meter-track');
  const fill = createElement(document, 'div', 'p1-meter-fill');
  fill.style.width = String(percent(presentation.value, presentation.max)) + '%';
  track.append(fill);
  row.append(label, track);
  return row;
}

function itemRow(
  document: Document,
  item: Phase1InventoryItemPresentation,
  selected: boolean,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-item-row');
  row.dataset.itemId = item.id;
  row.dataset.selected = String(selected);

  const icon = assetSprite(
    document,
    'p1-asset-icon p1-item-icon',
    itemIconSprite(item.name),
  );
  const identity = createElement(
    document,
    'span',
    'p1-item-name',
    item.name + ' ×' + String(item.quantity),
  );
  const state = createElement(
    document,
    'span',
    'p1-item-state',
    item.condition === null
      ? (item.stateLabel ?? '')
      : 'COND ' + String(item.condition) + (item.stateLabel === null ? '' : ' · ' + item.stateLabel),
  );

  if (icon !== null) {
    row.append(icon);
  }
  row.append(identity, state);
  return row;
}

function teammate(
  document: Document,
  entry: Phase1TeammatePresentation,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-teammate');
  row.dataset.playerId = entry.playerId;
  row.dataset.markerShape = entry.markerShape;

  const marker = createElement(document, 'span', 'p1-teammate-marker');
  marker.dataset.shape = entry.markerShape;
  applyProductionSprite(marker, teammateIdentitySprite(entry.markerShape));
  const label = createElement(
    document,
    'span',
    'p1-teammate-label',
    entry.label + ' · ' + entry.stateLabel,
  );

  row.append(marker, label);
  return row;
}

function panelTitle(document: Document, title: string): HTMLElement {
  return createElement(document, 'div', 'p1-panel-title', title);
}

function renderPanel(
  document: Document,
  panel: Phase1PanelPresentation,
): HTMLElement {
  const root = createElement(document, 'section', 'p1-panel');
  root.dataset.panelKind = panel.kind;
  const skinCorner = assetSprite(
    document,
    'p1-panel-skin-corner',
    panelSkinCornerSprite(),
  );
  if (skinCorner !== null) {
    root.append(skinCorner);
  }
  root.append(panelTitle(document, panel.title));

  switch (panel.kind) {
    case 'inventory': {
      const list = createElement(document, 'div', 'p1-item-list');
      for (const item of panel.items) {
        list.append(itemRow(document, item, item.id === panel.selectedItemId));
      }
      root.append(list, createElement(document, 'div', 'p1-panel-detail', panel.detail));
      return root;
    }

    case 'container': {
      const panes = createElement(document, 'div', 'p1-container-panes');
      const left = createElement(document, 'div', 'p1-container-pane');
      left.append(createElement(document, 'div', 'p1-subtitle', 'PLAYER'));
      for (const item of panel.playerItems) {
        left.append(itemRow(document, item, false));
      }

      const right = createElement(document, 'div', 'p1-container-pane');
      right.append(createElement(document, 'div', 'p1-subtitle', panel.containerLabel));
      for (const item of panel.containerItems) {
        right.append(itemRow(document, item, false));
      }

      panes.append(left, right);
      root.append(panes);
      if (panel.feedback !== null) {
        const feedback = createElement(document, 'div', 'p1-feedback', panel.feedback);
        feedback.dataset.feedback = panel.feedback;
        root.append(feedback);
      }
      return root;
    }

    case 'craft': {
      const list = createElement(document, 'div', 'p1-craft-list');
      for (const rowState of panel.rows) {
        const row = createElement(document, 'div', 'p1-craft-row');
        row.dataset.state = rowState.state;
        row.append(
          createElement(document, 'span', 'p1-craft-name', rowState.name),
          createElement(document, 'span', 'p1-craft-output', rowState.outputLabel),
          createElement(document, 'span', 'p1-craft-requirement', rowState.requirementLabel),
          createElement(
            document,
            'span',
            'p1-craft-state',
            rowState.reason ?? rowState.state,
          ),
        );
        list.append(row);
      }
      root.append(list);
      return root;
    }

    case 'build': {
      const preview = createElement(document, 'div', 'p1-build-preview');
      preview.dataset.placementState = panel.placementState;
      const pattern = assetSprite(
        document,
        'p1-build-preview-pattern',
        buildPreviewPatternSprite(panel.placementState),
        6,
      );
      if (pattern !== null) {
        pattern.dataset.productionPatternState = panel.placementState;
        preview.append(pattern);
      }
      preview.append(createElement(
        document,
        'span',
        'p1-build-preview-label',
        panel.placementState,
      ));
      root.append(
        createElement(document, 'div', 'p1-build-name', panel.selectedStructure),
        createElement(document, 'div', 'p1-build-kit', panel.sourceKitLabel),
        preview,
      );
      if (panel.reason !== null) {
        root.append(createElement(document, 'div', 'p1-feedback', panel.reason));
      }
      return root;
    }

    case 'machine': {
      root.dataset.machineState = panel.stateLabel;
      root.append(
        createElement(document, 'div', 'p1-machine-state', panel.stateLabel),
        createElement(document, 'div', 'p1-machine-power', panel.powerLabel),
        createElement(document, 'div', 'p1-machine-output', panel.outputLabel),
      );
      if (panel.reason !== null) {
        root.append(createElement(document, 'div', 'p1-feedback', panel.reason));
      }
      return root;
    }

    case 'recovery': {
      root.append(
        createElement(document, 'div', 'p1-recovery-cause', panel.deathCause),
        createElement(document, 'div', 'p1-recovery-respawn', panel.respawnLabel),
        createElement(document, 'div', 'p1-recovery-consequence', panel.consequenceLabel),
        createElement(document, 'div', 'p1-recovery-cache', panel.cacheLabel),
      );
      return root;
    }

    case 'progression': {
      const iconRow = createElement(document, 'div', 'p1-progress-icons');
      for (const index of [0, 1, 2, 3]) {
        const icon = assetSprite(
          document,
          'p1-progression-icon',
          progressionSprite(index),
        );
        if (icon !== null) {
          iconRow.append(icon);
        }
      }
      root.append(
        iconRow,
        createElement(document, 'div', 'p1-progress-level', panel.levelLabel),
        createElement(document, 'div', 'p1-progress-xp', panel.xpLabel),
        createElement(document, 'div', 'p1-subtitle', 'SKILLS'),
        createElement(document, 'div', 'p1-progress-list', panel.skillLabels.join(' · ')),
        createElement(document, 'div', 'p1-subtitle', 'PROFESSIONS'),
        createElement(document, 'div', 'p1-progress-list', panel.professionLabels.join(' · ')),
        createElement(document, 'div', 'p1-subtitle', 'QUESTS'),
        createElement(document, 'div', 'p1-progress-list', panel.questLabels.join(' · ')),
      );
      return root;
    }

    case 'map': {
      const mapMarkers = createElement(document, 'div', 'p1-map-markers');
      for (const index of [0, 4, 5, 6]) {
        const icon = assetSprite(
          document,
          'p1-map-marker',
          mapMarkerSprite(index),
        );
        if (icon !== null) {
          mapMarkers.append(icon);
        }
      }
      root.append(
        mapMarkers,
        createElement(document, 'div', 'p1-map-fog', panel.fogLabel),
        createElement(document, 'div', 'p1-map-ruin', panel.ruinLabel),
      );
      if (panel.deathCacheLabel !== null) {
        root.append(createElement(document, 'div', 'p1-map-cache', panel.deathCacheLabel));
      }
      if (panel.sharedDiscoveryLabel !== null) {
        root.append(createElement(document, 'div', 'p1-map-shared', panel.sharedDiscoveryLabel));
      }
      return root;
    }
  }
}

function styles(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-ui{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center center;pointer-events:none;font-family:monospace;font-size:8px;line-height:1.15;color:#f4f6ef;text-shadow:1px 1px 0 #10141b;z-index:20;overflow:hidden;}',
    '.p1-production-world-preview{position:absolute;inset:0;overflow:hidden;z-index:0;background:#172033;}',
    '.p1-production-world-tile,.p1-production-world-sprite{position:absolute;display:block;image-rendering:pixelated;}',
    '.p1-survival,.p1-world,.p1-equipment,.p1-interaction,.p1-carry,.p1-toasts,.p1-team,.p1-panel{z-index:2;}',
    '.p1-asset-icon,.p1-progression-icon,.p1-map-marker,.p1-panel-skin-corner,.p1-build-preview-pattern{display:inline-block;image-rendering:pixelated;flex:0 0 auto;}',
    '.p1-ui *{box-sizing:border-box;}',
    '.p1-box,.p1-panel{background:rgba(10,14,22,.90);border:1px solid #d6dccd;box-shadow:0 0 0 1px #111722 inset;}',
    '.p1-survival{position:absolute;left:8px;top:8px;width:156px;height:42px;padding:3px;display:grid;grid-template-columns:1fr 1fr;gap:2px;}',
    '.p1-meter:first-child{grid-column:1/3;}',
    '.p1-meter{min-width:0;}',
    '.p1-meter-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:2px;}',
    '.p1-meter-icon{width:12px!important;height:12px!important;}',
    '.p1-meter-track{height:3px;background:#263040;border:1px solid #0a0d12;}',
    '.p1-meter-fill{height:100%;background:#e8edf2;}',
    '.p1-meter[data-severity="warning"] .p1-meter-track{outline:1px dashed #f1d67d;}',
    '.p1-meter[data-severity="critical"] .p1-meter-track{outline:1px solid #fff;}',
    '.p1-world{position:absolute;right:8px;top:8px;width:132px;min-height:38px;padding:4px;}',
    '.p1-world-line{display:flex;justify-content:space-between;gap:4px;}',
    '.p1-equipment{position:absolute;left:8px;bottom:8px;width:116px;height:32px;padding:4px;}',
    '.p1-interaction{position:absolute;left:180px;bottom:8px;width:280px;min-height:34px;padding:4px;text-align:center;}',
    '.p1-interaction-main{font-size:9px;font-weight:700;}',
    '.p1-interaction[data-state="BLOCKED"],.p1-interaction[data-state="UNAVAILABLE"]{border-style:dashed;}',
    '.p1-progress-track{height:3px;margin-top:2px;background:#273041;}',
    '.p1-progress-fill{height:100%;background:#f4f6ef;}',
    '.p1-carry{position:absolute;right:8px;bottom:8px;width:132px;height:32px;padding:4px;}',
    '.p1-toasts{position:absolute;left:188px;top:8px;width:264px;display:grid;gap:2px;}',
    '.p1-toast{padding:3px 5px;background:rgba(10,14,22,.92);border-left:3px double #f4f6ef;}',
    '.p1-team{position:absolute;right:8px;top:50px;width:132px;display:grid;gap:2px;}',
    '.p1-teammate{display:flex;gap:4px;align-items:center;background:rgba(10,14,22,.84);padding:2px 4px;}',
    '.p1-teammate-marker{width:12px!important;height:12px!important;display:inline-block;image-rendering:pixelated;}',
    '.p1-panel{position:absolute;left:50%;top:50%;width:520px;max-height:300px;transform:translate(-50%,-50%);padding:8px;overflow:hidden;}',
    '.p1-panel[data-panel-kind="build"]{left:8px;top:60px;width:252px;max-height:250px;transform:none;}',
    '.p1-panel-skin-corner{position:absolute;left:0;top:0;width:16px!important;height:16px!important;}',
    '.p1-panel-title{font-size:11px;font-weight:700;border-bottom:1px solid #778094;padding:2px 0 4px 14px;margin-bottom:5px;}',
    '.p1-subtitle{margin-top:4px;color:#c5ccbd;}',
    '.p1-item-list,.p1-craft-list{display:grid;gap:2px;}',
    '.p1-item-row,.p1-craft-row{display:grid;gap:4px;padding:3px;border:1px solid #3b465a;}',
    '.p1-item-row{grid-template-columns:24px 2fr 1fr;align-items:center;min-height:30px;}',
    '.p1-item-icon{width:24px!important;height:24px!important;}',
    '.p1-item-row[data-selected="true"]{outline:1px solid #fff;background:#253044;}',
    '.p1-container-panes{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.p1-container-pane{border:1px solid #455066;padding:5px;min-height:120px;}',
    '.p1-craft-row{grid-template-columns:1.2fr 1fr 1.3fr 1fr;}',
    '.p1-craft-row[data-state="BLOCKED"]{border-style:dashed;}',
    '.p1-feedback{margin-top:5px;padding:4px;border:1px dashed #fff;}',
    '.p1-build-preview{width:96px;height:64px;margin:8px auto;border:2px dashed #fff;display:grid;place-items:center;position:relative;background:rgba(10,14,22,.62);}',
    '.p1-build-preview-pattern{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);}',
    '.p1-build-preview-label{position:relative;z-index:1;padding:2px 4px;background:rgba(10,14,22,.78);}',
    '.p1-build-preview[data-placement-state="VALID"]{border-style:solid;}',
    '.p1-build-preview[data-placement-state="CONNECTOR"]{outline:2px dotted #fff;}',
    '.p1-panel-detail,.p1-progress-list{margin-top:5px;padding:4px;background:#161e2a;}',
    '.p1-progress-icons,.p1-map-markers{display:flex;align-items:center;gap:4px;margin:3px 0;}',
    '.p1-hidden{display:none!important;}',
  ].join('');
  return style;
}

export interface Phase1HudOverlay {
  update(state: Phase1PresentationState): void;
  destroy(): void;
}

class Phase1HudOverlayImpl implements Phase1HudOverlay {
  private readonly document: Document;
  private readonly layer: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private currentState: Phase1PresentationState;

  public constructor(
    private readonly root: HTMLElement,
    canvas: HTMLCanvasElement,
    initialState: Phase1PresentationState,
  ) {
    validatePhase1PresentationState(initialState);
    this.document = root.ownerDocument;
    this.canvas = canvas;
    this.currentState = initialState;
    this.layer = createElement(this.document, 'div', 'p1-ui');
    this.layer.id = 'proz0-phase1-ui';
    this.layer.dataset.presentationAuthority = 'derived-read-only';
    this.layer.dataset.productionAssetFoundation = 'p1-75-78';
    this.layer.append(styles(this.document));
    this.root.append(this.layer);
    this.root.ownerDocument.defaultView?.addEventListener('resize', this.applyScale);
    this.applyScale();
    this.render();
  }

  public update(state: Phase1PresentationState): void {
    validatePhase1PresentationState(state);
    this.currentState = state;
    this.render();
  }

  public destroy(): void {
    this.root.ownerDocument.defaultView?.removeEventListener('resize', this.applyScale);
    this.layer.remove();
  }

  private readonly applyScale = (): void => {
    const scale = Number(this.canvas.dataset.displayScale ?? '1');
    this.layer.style.transform =
      'translate(-50%, -50%) scale(' + String(Number.isFinite(scale) ? scale : 1) + ')';
    this.layer.dataset.displayScale = String(Number.isFinite(scale) ? scale : 1);
  };

  private render(): void {
    const state = this.currentState;
    const style = this.layer.querySelector('style');
    this.layer.replaceChildren();
    if (style !== null) {
      this.layer.append(style);
    }

    if (this.root.dataset.phase1QaMode !== 'none') {
      this.layer.append(createProductionWorldPreview(this.document));
    }

    const survival = createElement(this.document, 'section', 'p1-survival p1-box');
    survival.dataset.region = 'survival';
    survival.append(
      meter(this.document, state.health),
      meter(this.document, state.water),
      meter(this.document, state.food),
      meter(this.document, state.stamina),
      meter(this.document, state.temperature),
    );

    const world = createElement(this.document, 'section', 'p1-world p1-box');
    world.dataset.weatherState = state.world.weatherState;
    world.dataset.dayPeriod = state.world.dayPeriod;
    const worldLine = createElement(this.document, 'div', 'p1-world-line');
    worldLine.append(
      createElement(this.document, 'span', '', state.world.timeLabel),
      createElement(this.document, 'span', '', state.world.dayPeriod),
    );
    const weatherLine = createElement(this.document, 'div', 'p1-world-line');
    const weatherIdentity = createElement(this.document, 'span', 'p1-world-weather');
    const weatherIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('WEATHER'),
    );
    if (weatherIcon !== null) {
      weatherIdentity.append(weatherIcon);
    }
    weatherIdentity.append(state.world.weatherLabel);
    weatherLine.append(
      weatherIdentity,
      createElement(this.document, 'span', '', String(state.world.teammateCount) + ' TEAM'),
    );
    world.append(worldLine, weatherLine);

    const equipment = createElement(this.document, 'section', 'p1-equipment p1-box');
    equipment.dataset.region = 'equipment';
    if (state.equipment === null) {
      equipment.textContent = 'NO ACTIVE EQUIPMENT';
    } else {
      const equipmentIcon = assetSprite(
        this.document,
        'p1-asset-icon p1-equipment-icon',
        itemIconSprite(state.equipment.name),
      );
      if (equipmentIcon !== null) {
        equipment.append(equipmentIcon);
      }
      equipment.append(
        state.equipment.name
        + (state.equipment.condition === null
          ? ' · ' + state.equipment.stateLabel
          : ' · ' + String(state.equipment.condition) + '/' + String(state.equipment.conditionMax)
            + ' · ' + state.equipment.stateLabel),
      );
    }

    const carry = createElement(this.document, 'section', 'p1-carry p1-box');
    carry.dataset.region = 'carry';
    carry.dataset.carryState = state.carry.stateLabel;
    const weightIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('WEIGHT'),
    );
    const volumeIcon = assetSprite(
      this.document,
      'p1-asset-icon',
      hudStatusSprite('VOLUME'),
    );
    if (weightIcon !== null) {
      carry.append(weightIcon);
    }
    carry.append(
      ' ' + String(state.carry.weightCurrent) + '/' + String(state.carry.weightMax) + ' kg ',
    );
    if (volumeIcon !== null) {
      carry.append(volumeIcon);
    }
    carry.append(
      ' ' + String(state.carry.volumeCurrent) + '/' + String(state.carry.volumeMax)
      + ' · ' + state.carry.stateLabel,
    );

    const toasts = createElement(this.document, 'section', 'p1-toasts');
    for (const toast of state.toasts) {
      const entry = createElement(this.document, 'div', 'p1-toast');
      const toastIcon = assetSprite(
        this.document,
        'p1-asset-icon',
        hudStatusSprite(
          toast.kind === 'progression'
            ? 'XP'
            : toast.kind === 'discovery'
              ? 'DISCOVERY'
              : toast.kind === 'warning'
                ? 'COLD'
                : 'LEVEL',
        ),
      );
      if (toastIcon !== null) {
        entry.append(toastIcon);
      }
      entry.append(
        toast.title + (toast.detail === null ? '' : ' · ' + toast.detail),
      );
      entry.dataset.toastKind = toast.kind;
      entry.dataset.toastId = toast.id;
      toasts.append(entry);
    }

    const team = createElement(this.document, 'section', 'p1-team');
    for (const entry of state.teammates) {
      team.append(teammate(this.document, entry));
    }

    this.layer.append(survival, world, equipment, carry, toasts, team);

    if (state.interaction !== null) {
      const interaction = createElement(this.document, 'section', 'p1-interaction p1-box');
      interaction.dataset.region = 'interaction';
      interaction.dataset.state = state.interaction.state;
      const interactionMain = createElement(
        this.document,
        'div',
        'p1-interaction-main',
      );
      const interactionIcon = assetSprite(
        this.document,
        'p1-asset-icon',
        interactionSprite(state.interaction.verb),
      );
      if (interactionIcon !== null) {
        interactionMain.append(interactionIcon);
      }
      interactionMain.append(
        '[' + state.interaction.inputLabel + '] '
        + state.interaction.verb + ' · ' + state.interaction.target,
      );
      interaction.append(interactionMain);

      if (state.interaction.reason !== null) {
        interaction.append(createElement(
          this.document,
          'div',
          'p1-interaction-reason',
          state.interaction.reason,
        ));
      }

      if (state.interaction.progress !== null) {
        const track = createElement(this.document, 'div', 'p1-progress-track');
        const fill = createElement(this.document, 'div', 'p1-progress-fill');
        fill.style.width = String(Math.round(state.interaction.progress * 100)) + '%';
        track.append(fill);
        interaction.append(track);
      }

      this.layer.append(interaction);
    }

    if (state.panel !== null) {
      this.layer.append(renderPanel(this.document, state.panel));
    }
  }
}

export function createPhase1HudOverlay(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  initialState: Phase1PresentationState,
): Phase1HudOverlay {
  return new Phase1HudOverlayImpl(root, canvas, initialState);
}
