import { panelShell } from './PanelShell';
import { DOCK_SHORTCUTS, isPanelShortcutActive } from '../input/PanelShortcuts';
import { actionGlyph } from './UiActionIcon';
import './WorldFirstUi.css';
import { materialHint } from './MaterialGuide';
import { costLabel } from './CostRequirements';
import { gameUiText } from '../localization/GameUiMessages';
import { capturePanelUi } from './PanelUiState';
import { presentationText } from '../localization/PresentationMessages';
import { mountMapViewport, type MapViewportState } from './MapViewport';
import { uiText, uiMessageKey } from '../localization/UiMessages';
import { onLocaleChange, bindLocalized, formatNumber, formatInventoryAmount } from '../localization/Locale';
import { bindUiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import { WEARABLE_SLOTS, type WearableSlot } from '../../content/livingworld/WearableContent';
import {
  validatePhase1PresentationState,
  type Phase1InventoryItemPresentation,
  type Phase1EquipmentSlotsPresentation,
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
  playerActorSprite,
  thermalWrapActorSprite,
  mapMarkerSprite,
  panelSkinCornerSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
  progressionSprite,
  teammateIdentitySprite,
  type Phase1ProductionSprite,
} from './Phase1ProductionAssets';
import type { CharacterInspection } from './CharacterInspection';
import { RARITY_STYLE } from '../../content/livingworld/EquipmentContent';
import { heldSpearSprite, wearableSprite } from './EquipmentArt';
import { selectedPlayerSkin, playerSkinFilter } from '../runtime/PlayerProfile';

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    bindUiText(element,"textContent",text);
  }
  return element;
}

function percent(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

function actionButton(document: Document, label: string, action: string): HTMLButtonElement {
  const button = createElement(document, 'button', 'p1-action', label);
  button.type = 'button';
  button.dataset.reviewAction = action;
  return button;
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
  identity: 'health' | 'stamina' | 'food' | 'water' | 'temperature',
): HTMLElement {
  const row = createElement(document, 'div', 'p1-meter');
  row.dataset.meter = identity;
  row.dataset.severity = presentation.severity;
  row.dataset.stateLabel = presentation.stateLabel;
  row.dataset.value = String(presentation.value);
  row.dataset.max = String(presentation.max);
  row.setAttribute('role','meter');
  row.setAttribute('aria-valuemin','0'); row.setAttribute('aria-valuemax',String(presentation.max)); row.setAttribute('aria-valuenow',String(presentation.value));
  const caption=()=>uiText(uiMessageKey(presentation.stateLabel))||uiPhrase(presentation.stateLabel);
  bindLocalized(row,'title',()=>uiPhrase(presentation.label)+' · '+caption());
  if(identity==='temperature')bindLocalized(row,'title',()=>uiPhrase('Body temperature index')+' · '+formatNumber(presentation.value,{maximumFractionDigits:0})+'/'+formatNumber(presentation.max)+' · '+caption());
  bindLocalized(row,'aria-label',()=>uiPhrase(presentation.label)+' · '+formatNumber(presentation.value,{maximumFractionDigits:0})+'/'+formatNumber(presentation.max)+' · '+caption());

  const label = createElement(document, 'div', 'p1-meter-label');
  const icon = assetSprite(
    document,
    'p1-asset-icon p1-meter-icon',
    hudStatusSprite(presentation.label),
    1.5,
  );
  if (icon !== null) {
    label.append(icon);
  }
  label.append(createElement(document, 'span', 'p1-meter-label-copy', presentation.label));

  const track = createElement(document, 'div', 'p1-meter-track');
  const fill = createElement(document, 'div', 'p1-meter-fill');
  fill.style.width = String(percent(presentation.value, presentation.max)) + '%';
  track.append(fill);

  const value = createElement(
    document,
    'span',
    'p1-meter-value',
    String(Math.round(presentation.value)),
  );
  const alert = createElement(
    document,
    'span',
    'p1-meter-alert',
    presentation.severity === 'critical'
      ? '!!'
      : presentation.severity === 'warning'
        ? '!'
        : '',
  );
  const semanticState = createElement(
    document,
    'span',
    'p1-meter-state p1-visually-hidden',
    presentation.stateLabel,
  );
  bindLocalized(semanticState,'textContent',caption);

  row.append(label, track, value, alert, semanticState);
  return row;
}

function itemRow(
  document: Document,
  item: Phase1InventoryItemPresentation,
  selected: boolean,
  compact = false,
): HTMLElement {
  const row = createElement(document, 'button', 'p1-item-row');
  row.type = 'button';
  bindUiText(row,"aria-label",uiPhrase(item.name));
  row.dataset.reviewItem = item.id;
  row.dataset.itemId = item.id;
  row.dataset.selected = String(selected);
  row.dataset.available = String(item.available ?? item.condition !== 0);
  row.draggable = item.inspection?.canEquip === true;
  if (item.inspection?.canEquip) { row.dataset.rarity = item.rarity ?? 'common'; row.style.borderColor = RARITY_STYLE[item.rarity ?? 'common'].colour; bindUiText(row,"title",uiPhrase(RARITY_STYLE[item.rarity ?? 'common'].label) + ' · ' + uiPhrase(item.name)); }

  const icon = assetSprite(
    document,
    'p1-asset-icon p1-item-icon',
    itemIconSprite(uiPhrase(item.name)),
  );
  const identity = createElement(
    document,
    'span',
    'p1-item-name',
    compact
      ? '×' + String(item.quantity)
      : uiPhrase(item.name) + ' ×' + String(item.quantity),
  );
  const state = createElement(
    document,
    'span',
    'p1-item-state',
    item.condition === null
      ? uiPhrase(item.stateLabel)
      : uiText("ui.44a26ee7") + String(item.condition) + (item.stateLabel === null ? '' : ' · ' + uiPhrase(item.stateLabel)),
  );

  if (icon !== null) {
    row.append(icon);
  }
  if (item.inspection?.canEquip) { identity.style.color = RARITY_STYLE[item.rarity ?? 'common'].colour; identity.append(createElement(document, 'small', 'p1-rarity-label', uiPhrase(RARITY_STYLE[item.rarity ?? 'common'].label))); }
  row.append(identity, state);
  if (
    item.condition !== null
    && (item.conditionMax ?? 100) > 0
  ) {
    const conditionTrack = createElement(
      document,
      'span',
      'p1-item-condition-track',
    );
    conditionTrack.dataset.conditionCurrent = String(item.condition);
    conditionTrack.dataset.conditionMax = String(item.conditionMax ?? 100);
    const conditionFill = createElement(
      document,
      'span',
      'p1-item-condition-fill',
    );
    conditionFill.style.width = String(percent(
      item.condition,
      item.conditionMax ?? 100,
    )) + '%';
    conditionTrack.append(conditionFill);
    row.append(conditionTrack);
  }
  if (compact) {
    row.append(createElement(
      document,
      'span',
      'p1-visually-hidden',
      uiPhrase(item.name),
    ));
  }
  return row;
}

function equipmentPreview(document: Document, equipment: Omit<Phase1EquipmentSlotsPresentation, 'quickUse'> | undefined): HTMLElement {
  const wardrobe = createElement(document, 'section', 'p1-wardrobe');
  if (!equipment) return wardrobe;
  bindUiText(wardrobe,"aria-label",uiText("ui.6f92739"));
  const avatar = createElement(document, 'div', 'p1-avatar');
  avatar.setAttribute('role', 'img'); bindUiText(avatar,"aria-label",uiText("ui.d51b54d9"));
  avatar.dataset.skin = selectedPlayerSkin();
  const body = createElement(document, 'span', 'p1-avatar-layer');
  applyProductionSprite(body, playerActorSprite('S', 'IDLE', 0).sprite, 2);
  body.style.filter = playerSkinFilter(avatar.dataset.skin);
  avatar.append(body);
  if (equipment.protection) { const protection = createElement(document, 'span', 'p1-avatar-layer'); applyProductionSprite(protection, thermalWrapActorSprite('S', 'IDLE', 0).sprite, 2); protection.dataset.avatarEquipment = 'protection'; avatar.append(protection); }
  if (equipment.weapon) { const weapon = createElement(document, 'span', 'p1-avatar-layer'); applyProductionSprite(weapon, heldSpearSprite('S', equipment.weapon.rarity).sprite, 2); weapon.dataset.avatarEquipment = 'weapon'; weapon.dataset.rarity = equipment.weapon.rarity ?? 'common'; avatar.append(weapon); }
  for (const kind of WEARABLE_SLOTS) if (equipment[kind]) {
    const layer = createElement(document, 'span', 'p1-avatar-layer');
    applyProductionSprite(layer, wearableSprite(kind, 'S').sprite, 2);
    layer.dataset.avatarEquipment = kind; avatar.append(layer);
  }
  const slot = (kind: 'weapon' | 'protection' | WearableSlot) => {
    const equipped = equipment[kind], label = {weapon:uiText("ui.b7c10361"),protection:uiText("ui.37914e64"),head:uiText("ui.b2972ae3"),legs:uiText("ui.9979822c"),feet:uiText("ui.3b61cb75"),accessory:uiText("ui.f7f5c579")}[kind];
    const cell = createElement(document, 'div', 'p1-wardrobe-slot'); cell.dataset.equipmentDropSlot = kind;
    const slotAction=(label:string,action:string,symbol:string)=>{const button=actionButton(document,symbol,action);bindUiText(button,'aria-label',label);bindUiText(button,'title',label);return button;};
    cell.append(createElement(document, 'strong', '', label));
    if (equipped) {
      cell.dataset.rarity = equipped.rarity ?? 'common'; cell.style.borderColor = RARITY_STYLE[equipped.rarity ?? 'common'].colour;
      const badge = createElement(document, 'small', 'p1-rarity-label', RARITY_STYLE[equipped.rarity ?? 'common'].label); badge.style.color = RARITY_STYLE[equipped.rarity ?? 'common'].colour; cell.append(badge);
      const icon = assetSprite(document, 'p1-asset-icon', itemIconSprite(uiPhrase(equipped.name))); if (icon) cell.append(icon);
      cell.append(createElement(document, 'span', '', uiPhrase(equipped.name)), createElement(document, 'small', '', equipped.condition === null ? uiText("ui.7e98c350") : uiText("ui.345bed12") + equipped.condition + '/' + equipped.conditionMax), slotAction(uiText("ui.566c1a0e") + label.toLowerCase(), 'unequip-slot:' + kind,'−'));
      cell.dataset.equippedStack = equipped.stackId ?? '';
      const name = cell.querySelector('span:not(.p1-asset-icon)'); if (name instanceof HTMLElement) name.style.color = RARITY_STYLE[equipped.rarity ?? 'common'].colour;
    } else cell.append(createElement(document, 'span', '', uiText("ui.d1571f8e")), slotAction(uiText("ui.caead158") + label.toLowerCase(), 'equip-slot:' + kind,'+'));
    bindUiText(cell,"title",uiText("ui.49f03461"));
    return cell;
  };
  const left = createElement(document, 'div', 'p1-wardrobe-column'); left.append(slot('head'), slot('protection'), slot('legs'));
  const right = createElement(document, 'div', 'p1-wardrobe-column'); right.append(slot('weapon'), slot('feet'), slot('accessory'));
  wardrobe.append(left, avatar, right);
  if (equipment.effects) {const effects=createElement(document,'details','p1-wardrobe-help');effects.dataset.inspectionKey='equipment-effects';effects.append(createElement(document,'summary','','Equipment effects'),createElement(document,'small','',uiText('ui.c6110440')+equipment.effects.join(' · ')));wardrobe.append(effects);}
  const help = createElement(document, 'details', 'p1-wardrobe-help'); help.append(createElement(document, 'summary', '', uiText("ui.be1025ea")), createElement(document, 'small', '', uiText("ui.ef4da8ed"))); wardrobe.append(help);
  return wardrobe;
}

function arrangeWardrobe(document: Document, root: HTMLElement): void {
  const wardrobe = root.querySelector<HTMLElement>('.p1-wardrobe');
  if (!wardrobe) return;
  const layout = createElement(document, 'div', 'p1-inventory-layout');
  const bag = createElement(document, 'div', 'p1-inventory-bag');
  const character=createElement(document,'section','p1-inventory-character');
  const inspection=root.querySelector<HTMLElement>('.p1-item-inspection');
  const status=root.querySelector<HTMLElement>('.p1-character-inspection');
  character.append(wardrobe);if(status)character.append(status);
  for (const child of Array.from(root.children)) if (!child.matches('.p1-panel-title,.p1-panel-skin-corner,.p1-panel-close,.p1-item-inspection')) bag.append(child);
  const description=bag.querySelector<HTMLElement>('.p1-panel-detail');
  if(description)description.classList.add('p1-visually-hidden');
  const storageTip=bag.querySelector<HTMLElement>('.p1-storage-tip');
  if(storageTip){const more=createElement(document,'details','p1-storage-guide');more.dataset.inspectionKey='storage-guide';more.append(createElement(document,'summary','','Storage'));storageTip.replaceWith(more);more.append(storageTip);}
  const utilities=createElement(document,'section','p1-inventory-utilities');utilities.setAttribute('role','group');bindUiText(utilities,'aria-label','Inventory actions');utilities.append(createElement(document,'h3','','Inventory actions'));
  for(const button of Array.from(bag.children).filter(e=>e instanceof HTMLButtonElement))utilities.append(button);
  bag.append(utilities);
  layout.append(character,bag);if(inspection)layout.append(inspection);root.append(layout);
}

function itemInspectionCard(document: Document, item: Phase1InventoryItemPresentation | undefined): HTMLElement {
  const card = createElement(document, 'section', 'p1-item-inspection');
  if (!item?.inspection) return card;
  bindUiText(card,"aria-label",uiText("ui.9538e211"));
  card.dataset.inspectedStack = item.id;
  if (item.inspection.canEquip) { card.dataset.rarity = item.rarity ?? 'common'; card.style.borderColor = RARITY_STYLE[item.rarity ?? 'common'].colour; card.style.setProperty('--rarity-colour', RARITY_STYLE[item.rarity ?? 'common'].colour); }
  card.append(createElement(document, 'h3', '', uiPhrase(item.name)), createElement(document, 'p', '', uiPhrase(item.inspection.purpose)), createElement(document, 'p', '', uiText("ui.345f446e") + item.quantity + uiText("ui.5dbd0754") + formatInventoryAmount(item.stackWeightKg ?? 0) + ' kg · ' + formatInventoryAmount(item.stackBulk ?? 0) + uiText("ui.c273f254")));
  const details = createElement(document, 'details', 'p1-inspection-more');
  details.dataset.inspectionKey = 'item:' + item.id;
  details.append(createElement(document, 'summary', '', uiText("ui.aebde165")));
  for (const fact of item.inspection.facts) details.append(createElement(document, 'p', '', fact));
  if (item.condition !== null) details.append(createElement(document, 'p', '', uiText("ui.9c20d098") + item.condition + '/' + (item.conditionMax ?? 100) + (item.condition === 0 ? ' · Broken; repair before using.' : '')));
  if (item.inspection.sources.length) details.append(createElement(document, 'p', '', uiText("ui.7ae25703") + item.inspection.sources.join(' · ')));
  if (item.inspection.recipes.length) details.append(createElement(document, 'p', '', uiText("ui.ae7b111b") + item.inspection.recipes.join(' · ')));
  card.append(details);
  if(item.condition!==null&&item.condition<(item.conditionMax??100))card.append(actionButton(document,uiPhrase('Repair selected item [R]'),'inventory-repair'));
  if (item.inspection.canConsume) card.append(actionButton(document, uiText("ui.2495d920"), 'inventory-use'));
  if (item.inspection.canEquip) { const equip = actionButton(document, uiText("ui.6007b81"), 'equip'); equip.disabled = item.condition === 0; if (equip.disabled) bindUiText(equip,"title",uiText("ui.6a653b3e")); card.append(equip); }
  if(item.quantity>1)card.append(actionButton(document,'Split selected quantity','inventory-split'));
  card.append(actionButton(document, uiText("ui.a023707b"), 'inventory-drop'));
  return card;
}

function characterInspectionCard(document: Document, character: CharacterInspection | undefined): HTMLElement {
  const details = createElement(document, 'details', 'p1-character-inspection');
  if (!character) return details;
  details.dataset.inspectionKey = 'character';
  details.append(createElement(document, 'summary', '', uiText("ui.6668c5e9") + (character.effects.length ? character.effects.length + uiText("ui.f328f6c1") : uiText("ui.86300d7a"))));
  const values = createElement(document, 'div', 'p1-character-values');
  for (const stat of character.values) values.append(createElement(document, 'span', '', uiPhrase(stat.name) + ': ' + stat.value + '/100'));
  details.append(values, createElement(document, 'p', '', uiText("ui.49818d5") + character.staminaRegenPenaltyPercent + uiPhrase('% (combined authority result, capped at 100%). Conditions change when the underlying stat recovers; no expiry timer is invented.')));
  for (const effect of character.effects) {
    const entry = createElement(document, 'article', 'p1-character-effect');
    entry.dataset.effect = effect.id; entry.dataset.severity = effect.severity;
    entry.append(createElement(document, 'strong', '', uiPhrase(effect.name) + ' · ' + uiPhrase(effect.severity)), createElement(document, 'p', '', effect.consequence), createElement(document, 'p', '', uiText("ui.3c4004d9") + effect.remedy));
    details.append(entry);
  }
  return details;
}

function teammate(
  document: Document,
  entry: Phase1TeammatePresentation,
): HTMLElement {
  const row = createElement(document, 'div', 'p1-teammate');
  row.dataset.playerId = entry.playerId;
  row.dataset.presentationIdentitySlot = entry.presentationIdentitySlot;
  row.dataset.markerShape = entry.markerShape;

  const marker = createElement(document, 'span', 'p1-teammate-marker');
  marker.dataset.shape = entry.markerShape;
  applyProductionSprite(marker, teammateIdentitySprite(entry.markerShape));
  const label = createElement(document,'span','p1-teammate-label');
  label.append(document.createTextNode(entry.label + ' · '),createElement(document,'span','',entry.stateLabel));

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
  const title=panelTitle(document,panel.kind==='craft'?'Crafting':panel.title);
  bindUiText(title,'title',panel.title);root.append(title);
  const close=actionButton(document,'×','close-panel');close.classList.add('p1-panel-close');
  bindUiText(close,'aria-label','Close');bindUiText(close,'title','Close [Esc]');root.append(close);

  switch (panel.kind) {
    case 'colony': {
      const actions = [
        ['Build cultivation bed · 3 Timber + 1 Cordage', 'build-bed'],
        ['Plant + water · 1 Edible Plant + 1 Clean Water', 'plant'],
        ['Harvest · 3 Edible Plant', 'harvest'],
        ['Build grazer pen · 4 Timber + 2 Cordage', 'build-pen'],
        ['Feed + water · 1 Edible Plant + 1 Clean Water', 'care'],
        ['Fertilize crop · 1 Fertilizer', 'fertilize'],
      ];
      for (const line of panel.lines) root.append(createElement(document, 'div', 'p1-colony-status', line));
      const controls = createElement(document, 'div', 'p1-colony-actions');
      for (const [label, action] of actions) controls.append(actionButton(document, label!, 'colony:' + action!));
      root.append(controls);
      return root;
    }
    case 'inventory': {
      root.append(equipmentPreview(document, panel.equipment));
      root.append(characterInspectionCard(document, panel.character));
      root.append(actionButton(document, 'Equip / Unequip [X]', 'equip'),actionButton(document,'Stack matching items','inventory-stack'));
      root.append(actionButton(document,'Build storage crate','build-storage'));
      if(panel.capacity?.weightMax===32)root.append(actionButton(document,'Plan expedition storage','open-expedition'));
      root.append(createElement(document,'div','p1-storage-tip',panel.capacity?.weightMax===32?'Supply Cache blueprint: 2 Timber + 2 Plant Fiber. Open Inventory [I] nearby to store supplies. Volume measures item bulk, not empty slots.':'Store supplies near a crate: open Inventory [I] beside it. Build a crate with 4 Timber + 2 Cordage.'));
      root.dataset.inventoryActivePane = 'player';
      root.dataset.inventoryQuantity = String(panel.quantity);
      const list = createElement(document, 'div', 'p1-item-list');
      for (const item of [...panel.items].sort((a,b)=>uiPhrase(a.name).localeCompare(uiPhrase(b.name))||a.id.localeCompare(b.id))) {
        list.append(itemRow(
          document,
          item,
          item.id === panel.selectedItemId,
          true,
        ));
      }
      const capacity = panel.capacity;
      root.append(
        list,
        createElement(document, 'div', 'p1-panel-detail', panel.detail),
        ...(capacity === undefined
          ? []
          : [createElement(
              document,
              'div',
              'p1-panel-capacity',
              presentationText('carry', {weight:formatInventoryAmount(capacity.weightCurrent),maxWeight:formatInventoryAmount(capacity.weightMax),bulk:formatInventoryAmount(capacity.volumeCurrent),maxBulk:formatInventoryAmount(capacity.volumeMax),state:uiPhrase(capacity.stateLabel)}),
            )]),
        createElement(
          document,
          'div',
          'p1-inventory-controls',
          panel.controls,
        ),
      );
      if (panel.feedback !== null) {
        root.append(
          createElement(
            document,
            'div',
            'p1-feedback',
            panel.feedback,
          ),
        );
      }
      root.append(itemInspectionCard(document, panel.items.find(i => i.id === panel.selectedItemId)));
      arrangeWardrobe(document, root);
      return root;
    }

    case 'container': {
      root.append(equipmentPreview(document, panel.equipment));
      root.append(characterInspectionCard(document, panel.character));
      root.append(actionButton(document, 'Equip / Unequip [X]', 'equip'));
      root.append(actionButton(document,'Move one','inventory-transfer-one'),actionButton(document,'Move stack','inventory-transfer-stack'));
      root.dataset.inventoryActivePane = panel.activePane;
      root.dataset.inventoryQuantity = String(panel.quantity);
      const panes = createElement(document, 'div', 'p1-container-panes');
      const left = createElement(
        document,
        'div',
        'p1-container-pane',
      );
      left.dataset.inventoryPane = 'player';
      left.dataset.active = String(panel.activePane === 'player');
      left.append(createElement(document, 'div', 'p1-subtitle', 'PLAYER'));
      for (const item of [...panel.playerItems].sort((a,b)=>uiPhrase(a.name).localeCompare(uiPhrase(b.name))||a.id.localeCompare(b.id))) {
        const selected = item.id === panel.selectedPlayerItemId;
        const row = itemRow(document, item, selected);
        left.append(row);
      }

      const right = createElement(
        document,
        'div',
        'p1-container-pane',
      );
      right.dataset.inventoryPane = 'storage';
      right.dataset.active = String(panel.activePane === 'storage');
      right.append(createElement(document, 'div', 'p1-subtitle', panel.containerLabel));
      for (const item of [...panel.containerItems].sort((a,b)=>uiPhrase(a.name).localeCompare(uiPhrase(b.name))||a.id.localeCompare(b.id))) {
        const selected = item.id === panel.selectedContainerItemId;
        const row = itemRow(document, item, selected);
        right.append(row);
      }

      panes.append(left, right);
      const capacityContext = createElement(
        document,
        'div',
        'p1-container-capacity-context',
      );
      if (panel.playerCapacity !== undefined) {
        capacityContext.append(createElement(
          document,
          'div',
          'p1-panel-capacity',
          uiPhrase('Player') + ' · '
            + formatInventoryAmount(panel.playerCapacity.weightCurrent)
            + '/'
            + formatInventoryAmount(panel.playerCapacity.weightMax)
            + ' kg · '
            + formatInventoryAmount(panel.playerCapacity.volumeCurrent)
            + '/'
            + formatInventoryAmount(panel.playerCapacity.volumeMax)
            + ' u · '
            + uiPhrase(panel.playerCapacity.stateLabel),
        ));
      }
      if (panel.containerCapacity !== undefined
        && panel.containerCapacity !== null) {
        capacityContext.append(createElement(
          document,
          'div',
          'p1-panel-capacity',
          uiPhrase('Storage') + ' · '
            + formatInventoryAmount(panel.containerCapacity.weightCurrent)
            + '/'
            + formatInventoryAmount(panel.containerCapacity.weightMax)
            + ' kg · '
            + formatInventoryAmount(panel.containerCapacity.volumeCurrent)
            + '/'
            + formatInventoryAmount(panel.containerCapacity.volumeMax)
            + ' u',
        ));
      }
      root.append(itemInspectionCard(document, (panel.activePane === 'player' ? panel.playerItems : panel.containerItems).find(i => i.id === (panel.activePane === 'player' ? panel.selectedPlayerItemId : panel.selectedContainerItemId))));
      root.append(
        panes,
        capacityContext,
        createElement(
          document,
          'div',
          'p1-inventory-controls',
          panel.controls,
        ),
      );
      if (panel.feedback !== null) {
        const feedback = createElement(document, 'div', 'p1-feedback', panel.feedback);
        feedback.dataset.feedback = panel.feedback;
        root.append(feedback);
      }
      return root;
    }

    case 'craft': {
      const navigation = createElement(document, 'div', 'p1-craft-navigation');
      const previous=actionButton(document, '‹', 'craft-previous');
      const next=actionButton(document, '›', 'craft-next');
      previous.textContent='‹';next.textContent='›';
      bindUiText(previous,'aria-label','Previous page [PgUp]');
      bindUiText(previous,'title','Previous page [PgUp]');
      bindUiText(next,'aria-label','Next page [PgDn]');
      bindUiText(next,'title','Next page [PgDn]');
      previous.disabled=(panel.page??0)===0;next.disabled=(panel.page??0)>=(panel.pageCount??1)-1;
      navigation.append(previous);
      for(let index=0;index<(panel.pageCount??1);index++){const button=actionButton(document,String(index+1),'craft-page');button.dataset.page=String(index);button.setAttribute('aria-current',index===(panel.page??0)?'page':'false');navigation.append(button);}
      navigation.append(next);
      root.append(navigation);
      const list = createElement(document, 'div', 'p1-craft-list');
      for (const rowState of panel.rows) {
        const row = createElement(document, 'div', 'p1-craft-row');
        row.dataset.state = rowState.state;

        const heading = createElement(document, 'div', 'p1-craft-heading');
        const output = createElement(
          document,
          'span',
          'p1-craft-output',
        );
        for (const outputState of rowState.outputs ?? []) {
          const outputToken = createElement(
            document,
            'span',
            'p1-craft-output-token',
          );
          outputToken.dataset.outputName = uiPhrase(outputState.name);
          outputToken.dataset.outputQuantity = String(outputState.quantity);
          const outputIcon = assetSprite(
            document,
            'p1-asset-icon p1-craft-output-icon',
            itemIconSprite(uiPhrase(outputState.name)),
            0.5,
          );
          if (outputIcon !== null) outputToken.append(outputIcon);
          bindUiText(outputToken,"title",uiPhrase(outputState.name));
          outputToken.append(String(outputState.quantity) + '× ',
            createElement(document, 'span', 'p1-visually-hidden', uiPhrase(outputState.name)));
          output.append(outputToken);
        }
        if ((rowState.outputs?.length ?? 0) === 0) {
          output.append('→ ' + rowState.outputLabel);
        }
        output.prepend(costLabel('outputs') + ' ');
        heading.append(
          createElement(document, 'span', 'p1-craft-name', uiPhrase(rowState.name)),
          output,
        );
        row.append(heading);

        const ingredients = createElement(
          document,
          'div',
          'p1-craft-ingredients',
        );
        ingredients.append(costLabel('costs') + ' ');
        if ((rowState.ingredients?.length ?? 0) > 0) {
          for (const ingredient of rowState.ingredients ?? []) {
            if(ingredient.source){const hint=materialHint(document,ingredient.name,ingredient.source,ingredient.have,ingredient.need,ingredient.itemId);hint.classList.add('p1-craft-ingredient');hint.querySelector('.p2-material-name')?.classList.add('p1-visually-hidden');hint.querySelector('summary > span')?.classList.add('p1-asset-icon','p1-craft-ingredient-icon');ingredients.append(hint);continue;}
            const token = createElement(
              document,
              'span',
              'p1-craft-ingredient',
            );
            const iconDefinition = itemIconSprite(uiPhrase(ingredient.name));
            if (iconDefinition !== null) {
              const icon = createElement(
                document,
                'div',
                'p1-asset-icon p1-craft-ingredient-icon',
              );
              applyProductionSprite(icon, iconDefinition);
              icon.setAttribute('aria-hidden', 'true');
              token.append(icon);
            }
            bindUiText(token,"title",uiPhrase(ingredient.name));
            token.append(createElement(document, 'span', 'p1-visually-hidden', uiPhrase(ingredient.name) + ' '));
            token.append(
              ' '
              + String(ingredient.have)
              + '/'
              + String(ingredient.need),
            );
            token.dataset.sufficient = String(
              ingredient.have >= ingredient.need,
            );
            ingredients.append(token);
          }
        } else {
          ingredients.append(rowState.requirementLabel);
        }
        row.append(ingredients);

        const footer = createElement(document, 'div', 'p1-craft-footer');
        if (rowState.stationLabel !== undefined
          && rowState.stationLabel !== null) {
          footer.append(createElement(
            document,
            'span',
            'p1-craft-station',
            rowState.stationLabel,
          ));
        }
        const availability=createElement(
          document,
          'span',
          'p1-craft-state',
          rowState.reason ?? rowState.state,
        );
        const stateGlyph=createElement(document,'span','p1-craft-state-icon',rowState.state==='AVAILABLE'?'✓':'!');
        stateGlyph.setAttribute('aria-hidden','true');availability.prepend(stateGlyph);footer.append(availability);
        const craft = actionButton(document, 'Craft', 'craft-recipe:' + rowState.id);
        bindUiText(craft,"aria-label",'Craft ' + rowState.outputLabel);
        craft.disabled = rowState.state !== 'AVAILABLE';
        if (rowState.reason) {
          availability.id = 'craft-reason-' + rowState.id.replaceAll(':', '-');
          craft.setAttribute('aria-describedby', availability.id);
          craft.title = rowState.reason;
        }
        footer.append(craft);
        row.append(footer);
        list.append(row);
      }
      root.append(list);
      return root;
    }

    case 'build': {
      if(panel.expeditionEnabled){
        const blueprints=actionButton(document,'Blueprint','open-expedition');
        bindUiText(blueprints,'aria-label','Expedition blueprints · materials later');
        bindUiText(blueprints,'title','Expedition blueprints · materials later');
        root.append(blueprints);
      }
      const catalog = createElement(
        document,
        'div',
        'p1-build-catalog',
      );
      for (const entry of panel.catalogEntries ?? []) {
        const row = createElement(
          document,
          'button',
          'p1-build-catalog-entry',
        );
        row.setAttribute('type', 'button');
        bindUiText(row,"aria-label",'Select ' + uiPhrase(entry.name));
        row.dataset.reviewAction = 'build-select:' + entry.structureId;
        row.dataset.structureId = entry.structureId;
        row.dataset.selected = String(entry.selected);
        row.dataset.buildCapState = entry.buildCapState;
        row.dataset.availableKitCount = String(entry.availableKitCount);
        row.dataset.builtCount = String(entry.builtCount);
        row.dataset.buildCap = String(entry.buildCap);
        const category=entry.structureId.includes('storage')?'Storage':entry.structureId.includes('workbench')?'Crafting':entry.structureId.includes('habitat')?'Shelter':'Utilities';
        row.dataset.buildCategory=category;
        const iconSource = (() => {
          switch (entry.structureId) {
            case 'structure:storage-crate':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate, 1] as const;
            case 'structure:workbench':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.workbench, 0.5] as const;
            case 'structure:habitat-room':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.habitat, 0.25] as const;
            case 'structure:compact-power-unit':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit, 0.5] as const;
            case 'structure:atmospheric-water-condenser':
              return [PHASE1_PRODUCTION_WORLD_SPRITES.condenser, 0.5] as const;
            default:
              return null;
          }
        })();
        if (iconSource !== null) {
          const icon = assetSprite(
            document,
            'p1-build-catalog-icon',
            iconSource[0],
            iconSource[1],
          );
          if (icon !== null) row.append(icon);
        }
        const copy = createElement(
          document,
          'div',
          'p1-build-catalog-copy',
        );
        copy.append(
          createElement(document,'small','p1-build-category',category),
          createElement(
            document,
            'div',
            'p1-build-catalog-name',
            uiPhrase(entry.name),
          ),
          createElement(
            document,
            'div',
            'p1-build-catalog-kit',
            entry.sourceKitName
              + ' ×'
              + String(entry.availableKitCount)
              + ' · '
              + String(entry.builtCount)
              + '/'
              + String(entry.buildCap)
              + (entry.buildCapState === 'CAP REACHED' ? ' · FULL' : ''),
          ),
        );
        row.append(copy);
        catalog.append(row);
      }

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
        uiPhrase(panel.placementState),
      ));
      const kitLabel=createElement(document,'div','p1-build-kit',panel.sourceKitLabel.split(' · ')[0]);
      bindUiText(kitLabel,'title',panel.sourceKitLabel);
      root.append(
        catalog,
        createElement(document, 'div', 'p1-build-name', panel.selectedStructure),
        kitLabel,
        preview,
      );
      if (panel.reason !== null) {
        root.append(createElement(document, 'div', 'p1-feedback', panel.reason));
      }
      const actions = createElement(document, 'div', 'p1-build-actions');
      const compactAction=(name:string,symbol:string,action:string)=>{
        const button=actionButton(document,symbol,action);
        bindUiText(button,'aria-label',name);bindUiText(button,'title',name);return button;
      };
      const place = compactAction('Place [Enter]', '✓', 'build-place');
      place.disabled = panel.placementState === 'INVALID';
      actions.append(compactAction('Prepare kit','Kit','build-prepare'),
        compactAction('Rotate [R]','↻','build-rotate'),
        compactAction('← Connector','‹','build-connector-previous'),
        compactAction('Connector →','›','build-connector-next'), place);
      root.append(actions);
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
      const levelLine = createElement(
        document,
        'div',
        'p1-progress-level',
      );
      levelLine.dataset.progressionIconIndex = '6';
      const levelIcon = assetSprite(
        document,
        'p1-progression-icon',
        progressionSprite(6),
      );
      if (levelIcon !== null) levelLine.append(levelIcon);
      levelLine.append(panel.levelLabel);
      root.append(
        levelLine,
        createElement(document, 'div', 'p1-progress-xp', panel.xpLabel),
      );
      if (panel.rows !== undefined) {
        const sections = [
          ['SKILLS', 'skill'],
          ['PROFESSIONS', 'profession'],
          ['OBJECTIVES', 'objective'],
        ] as const;
        for (const [sectionLabel, kind] of sections) {
          root.append(createElement(
            document,
            'div',
            'p1-subtitle',
            sectionLabel,
          ));
          const rows = createElement(
            document,
            'div',
            'p1-progression-rows',
          );
          rows.dataset.progressionSection = kind;
          for (const rowState of panel.rows.filter(
            (entry) => entry.kind === kind,
          )) {
            const row = createElement(
              document,
              'div',
              'p1-progression-row',
            );
            row.dataset.progressionKind = rowState.kind;
            row.dataset.progressionState = rowState.state;
            row.dataset.progressionId = rowState.id;
            row.dataset.progressionIconIndex = String(rowState.iconIndex);
            const icon = assetSprite(
              document,
              'p1-progression-icon',
              progressionSprite(rowState.iconIndex),
            );
            if (icon !== null) row.append(icon);
            const status=createElement(document,'span','p1-progression-status',rowState.state==='COMPLETE'||rowState.state==='UNLOCKED'?'✓':rowState.state==='LOCKED'?'◇':'○');
            status.setAttribute('role','img');bindUiText(status,'aria-label',rowState.state);row.append(createElement(document,'span','p1-progression-label',rowState.label),status);
            bindUiText(row,'title',(rowState.groupLabel?rowState.groupLabel+' · ':'')+rowState.label+' · '+rowState.state);
            rows.append(row);
          }
          root.append(rows);
        }
      } else {
        root.append(
          createElement(document, 'div', 'p1-subtitle', 'SKILLS'),
          createElement(document, 'div', 'p1-progress-list', panel.skillLabels.join(' · ')),
          createElement(document, 'div', 'p1-subtitle', 'PROFESSIONS'),
          createElement(document, 'div', 'p1-progress-list', panel.professionLabels.join(' · ')),
          createElement(document, 'div', 'p1-subtitle', 'QUESTS'),
          createElement(document, 'div', 'p1-progress-list', panel.questLabels.join(' · ')),
        );
      }
      return root;
    }

    case 'map': {
      if (panel.spatial !== undefined) {
        const projected = panel.spatial;
        // Fit observed local ground, not the empty fixed window. Remote known
        // markers still clamp to the edge; no hidden terrain is requested.
        const cells=[...projected.exploredCells,...projected.unknownBoundaryCells].filter(cell=>
          cell.cellX>=projected.minCellX&&cell.cellX<=projected.maxCellX&&cell.cellY>=projected.minCellY&&cell.cellY<=projected.maxCellY);
        const spatial=cells.length?{...projected,
          minCellX:Math.max(projected.minCellX,Math.min(...cells.map(cell=>cell.cellX))-1),
          maxCellX:Math.min(projected.maxCellX,Math.max(...cells.map(cell=>cell.cellX))+1),
          minCellY:Math.max(projected.minCellY,Math.min(...cells.map(cell=>cell.cellY))-1),
          maxCellY:Math.min(projected.maxCellY,Math.max(...cells.map(cell=>cell.cellY))+1),
        }:projected;
        const widthCells =
          spatial.maxCellX - spatial.minCellX + 1;
        const heightCells =
          spatial.maxCellY - spatial.minCellY + 1;
        const cellScale = Math.max(
          1,
          Math.min(
            4,
            Math.floor(Math.min(
              500 / Math.max(1, widthCells),
              190 / Math.max(1, heightCells),
            )),
          ),
        );
        const field = createElement(
          document,
          'div',
          'p1-spatial-map',
        );
        field.dataset.mapSpatial = 'true';
        field.dataset.mapKnowledge =
          spatial.knowledgePolicy.toLowerCase().replace('_', '-');
        field.dataset.mapCellScale = String(cellScale);
        field.dataset.mapWorldUnitsPerCell = String(spatial.cellSizeWorldUnits);
        field.dataset.exploredCellCount =
          String(spatial.exploredCells.length);
        field.dataset.unknownBoundaryCount =
          String(spatial.unknownBoundaryCells.length);
        field.style.width = String(widthCells * cellScale) + 'px';
        field.style.height = String(heightCells * cellScale) + 'px';

        const withinMapBounds = (
          cellX: number,
          cellY: number,
        ): boolean =>
          cellX >= spatial.minCellX
          && cellX <= spatial.maxCellX
          && cellY >= spatial.minCellY
          && cellY <= spatial.maxCellY;

        const clampPixel = (
          value: number,
          minimum: number,
          maximum: number,
        ): number => Math.max(minimum, Math.min(maximum, value));

        const setCellPosition = (
          element: HTMLElement,
          cellX: number,
          cellY: number,
        ): void => {
          element.style.left =
            String((cellX - spatial.minCellX) * cellScale) + 'px';
          element.style.top =
            String((cellY - spatial.minCellY) * cellScale) + 'px';
          element.style.width = String(cellScale) + 'px';
          element.style.height = String(cellScale) + 'px';
        };

        let visibleExploredCellCount = 0;
        for (const cell of spatial.exploredCells) {
          if (!withinMapBounds(cell.cellX, cell.cellY)) continue;
          visibleExploredCellCount += 1;
          const element = createElement(
            document,
            'div',
            'p1-map-cell p1-map-cell-' + cell.terrain,
          );
          element.dataset.mapCellState = 'EXPLORED';
          element.dataset.terrainState = cell.terrain;
          element.dataset.mapMotif = cell.motif;
          setCellPosition(element, cell.cellX, cell.cellY);
          field.append(element);
        }

        let visibleUnknownBoundaryCount = 0;
        for (const cell of spatial.unknownBoundaryCells) {
          if (!withinMapBounds(cell.cellX, cell.cellY)) continue;
          visibleUnknownBoundaryCount += 1;
          const element = createElement(
            document,
            'div',
            'p1-map-unknown-boundary',
          );
          element.dataset.mapCellState = 'UNKNOWN_BOUNDARY';
          element.dataset.hiddenDetail = 'opaque';
          setCellPosition(element, cell.cellX, cell.cellY);
          field.append(element);
        }

        for (const markerState of spatial.markers) {
          const marker = createElement(
            document,
            markerState.distanceBand!==null?'button':'div',
            'p1-map-marker-position',
          );
          if(marker instanceof HTMLButtonElement){marker.type='button';marker.dataset.reviewAction='map-select-marker';marker.dataset.mapMarkerId=markerState.id;bindUiText(marker,'aria-label',markerState.label);bindUiText(marker,'title',markerState.label);}
          marker.dataset.mapMarkerKind = markerState.kind;
          marker.dataset.mapMarkerLabel = markerState.label;
          marker.dataset.mapMarkerIndex =
            String(markerState.atlasIndex);
          marker.dataset.selected = String(markerState.selected);
          marker.dataset.facing = markerState.facing ?? '';
          if (markerState.identitySlot !== null) {
            marker.dataset.presentationIdentitySlot =
              markerState.identitySlot;
          }
          if (markerState.distanceBand !== null) {
            marker.dataset.distanceBand =
              markerState.distanceBand;
          }

          const markerX =
            markerState.worldX / spatial.cellSizeWorldUnits
            - spatial.minCellX;
          const markerY =
            markerState.worldY / spatial.cellSizeWorldUnits
            - spatial.minCellY;
          const rawMarkerLeft = Math.round(markerX * cellScale);
          const rawMarkerTop = Math.round(markerY * cellScale);
          const markerInset = 7;
          const markerLeft = clampPixel(
            rawMarkerLeft,
            markerInset,
            widthCells * cellScale - markerInset,
          );
          const markerTop = clampPixel(
            rawMarkerTop,
            markerInset,
            heightCells * cellScale - markerInset,
          );
          const markerClamped =
            markerLeft !== rawMarkerLeft
            || markerTop !== rawMarkerTop;
          marker.dataset.mapMarkerClamped = String(markerClamped);
          marker.style.left = String(markerLeft) + 'px';
          marker.style.top = String(markerTop) + 'px';

          const icon = assetSprite(
            document,
            'p1-map-marker',
            mapMarkerSprite(markerState.atlasIndex),
          );
          if (markerState.kind==='resource') {
            marker.append(createElement(document,'span','p1-map-resource-glyph','◆'));
          } else if (icon !== null) {
            marker.append(icon);
          }

          if (
            markerState.kind === 'player'
            && markerState.facing !== null
          ) {
            marker.append(
              createElement(
                document,
                'span',
                'p1-map-facing-peg',
              ),
            );
          }

          field.append(marker);
          if (markerState.selected) {
            const selectionLabel = createElement(
              document,
              'span',
              'p1-map-selection-label',
              uiPhrase(markerState.label),
            );
            selectionLabel.dataset.mapSelectionLabel =
              markerState.label;
            selectionLabel.dataset.mapSelectionKind =
              markerState.kind;
            selectionLabel.style.left = String(markerLeft) + 'px';
            selectionLabel.style.top = String(markerTop) + 'px';
            field.append(selectionLabel);
          }
        }

        field.dataset.visibleExploredCellCount =
          String(visibleExploredCellCount);
        field.dataset.visibleUnknownBoundaryCount =
          String(visibleUnknownBoundaryCount);

        const legend = createElement(
          document,
          'div',
          'p1-map-legend',
        );
        const seenLegend = new Set<string>();
        for (const markerState of spatial.markers) {
          const key =
            markerState.kind + ':' + (markerState.kind==='resource'?markerState.id:markerState.label);
          if (seenLegend.has(key)) continue;
          seenLegend.add(key);
          const entry = createElement(
            document,
            'span',
            'p1-map-legend-entry',
          );
          const icon = assetSprite(
            document,
            'p1-map-legend-marker',
            mapMarkerSprite(markerState.atlasIndex),
          );
          if (icon !== null) entry.append(icon);
          entry.append(
            createElement(
              document,
              'span',
              'p1-map-legend-label',
              uiPhrase(markerState.label),
            ),
          );
          if(markerState.kind==='resource'){
            const remove=actionButton(document,uiPhrase('Remove resource marker'),'remove-resource-marker');remove.dataset.resourceMarker=markerState.id;entry.append(remove);
          }
          legend.append(entry);
        }

        root.append(
          field,
          legend,
          createElement(
            document,
            'div',
            'p1-map-fog',
            panel.fogLabel,
          ),
        );
        if (
          spatial.selectedDetailLabel !== null
          && spatial.selectedDistanceBand !== null
        ) {
          const detail = createElement(
            document,
            'div',
            'p1-map-detail',
            uiPhrase('DETAIL') + ' · '
              + uiPhrase(spatial.selectedDetailLabel)
              + ' · '
              + uiPhrase(spatial.selectedDistanceBand),
          );
          detail.dataset.distanceBand =
            spatial.selectedDistanceBand;
          detail.dataset.selectionMode =
            'read-only-marker-detail';
          root.append(detail);
        }
        if (spatial.selectableTargetCount > 1) {
          root.append(
            createElement(
              document,
              'div',
              'p1-map-cycle-hint',
              'TAB · MARKER DETAIL',
            ),
          );
        }
        return root;
      }

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
    '.p1-ui[data-panel-open="true"] .p1-context-hud{display:none!important;}',
    '[data-product-review-help-open="true"] .p1-ui .p1-context-hud{display:none!important;}',
    '.p1-asset-icon,.p1-progression-icon,.p1-map-marker,.p1-panel-skin-corner,.p1-build-preview-pattern{display:inline-block;image-rendering:pixelated;flex:0 0 auto;}',
    '.p1-ui *{box-sizing:border-box;}',
    '.p1-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;}',
    '.p1-box,.p1-panel{background:rgba(10,14,22,.90);border:1px solid #d6dccd;box-shadow:0 0 0 1px #111722 inset;}',
    '.p1-survival{position:absolute;left:8px;top:8px;width:156px;min-height:76px;padding:3px;display:grid;grid-template-columns:1fr;gap:1px;}',
    '.p1-meter{min-width:0;display:grid;grid-template-columns:72px 1fr 20px 14px;align-items:center;gap:2px;min-height:12px;}',
    '.p1-meter-label{white-space:nowrap;display:flex;align-items:center;gap:2px;font-weight:700;}',
    '.p1-meter-icon{width:10px!important;height:10px!important;}',
    '.p1-meter-value{text-align:right;font-variant-numeric:tabular-nums;}',
    '.p1-meter-alert{text-align:center;font-weight:700;}',
    '.p1-meter-track{height:4px;background:#263040;border:1px solid #0a0d12;}',
    '.p1-meter-fill{height:100%;background:#e8edf2;}',
    '.p1-meter[data-severity="warning"]{border-right:1px dashed #fff;}',
    '.p1-meter[data-severity="critical"]{outline:1px solid #fff;}',
    '.p1-meter[data-severity="warning"] .p1-meter-track{outline:1px dashed #f1d67d;}',
    '.p1-meter[data-severity="critical"] .p1-meter-track{outline:1px double #fff;}',
    '.p1-world{position:absolute;right:8px;top:8px;width:132px;min-height:38px;padding:4px;}',
    '.p1-world-line{display:flex;justify-content:space-between;gap:4px;}',
    '.p1-equipment{position:absolute;left:8px;bottom:8px;width:164px;min-height:48px;padding:4px;display:grid;gap:2px;}',
    '.p1-equipment-slot,.p1-quick-use{display:flex;align-items:center;gap:3px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.p1-equipment-slot-label{width:20px;color:#c5ccbd;flex:0 0 auto;font-weight:700;}',
    '.p1-interaction{position:absolute;left:180px;bottom:8px;width:280px;min-height:34px;padding:4px;text-align:center;}',
    '.p1-first-action{position:absolute;left:180px;bottom:48px;width:280px;padding:3px 5px;text-align:center;background:rgba(10,14,22,.86);border:1px dashed #d6dccd;z-index:2;}',
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
    '.p1-panel{position:absolute;left:50%;top:50%;width:520px;max-height:300px;transform:translate(-50%,-50%);padding:8px;overflow:auto;pointer-events:auto;}',
    '.p1-action,.p1-item-row{font:inherit;color:inherit;text-shadow:inherit;text-align:left;background:#161e2a;cursor:pointer;}',
    '.p1-action{border:1px solid #778094;padding:4px 6px;}',
    '.p1-craft-navigation{display:flex;justify-content:space-between;margin-bottom:4px;}',
    '.p1-action:focus-visible,.p1-item-row:focus-visible{outline:2px solid white;}',
    '.p1-colony-status{padding:3px 0;}',
    '.p1-colony-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;}',
    '.p1-panel[data-panel-kind="craft"]{width:560px;max-height:300px;padding:6px;}',
    '.p1-panel[data-panel-kind="colony"]{left:8px;top:50px;width:250px;max-height:300px;transform:none;padding:6px;}',
    '.p1-panel[data-panel-kind="craft"] .p1-panel-title{margin-bottom:3px;}',
    '.p1-panel[data-panel-kind="craft"] .p1-craft-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;}',
    '.p1-panel[data-panel-kind="build"]{left:8px;top:54px;width:204px;max-height:288px;transform:none;padding:6px;}',
    '.p1-build-actions{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px;}',
    '.p1-panel[data-panel-kind="build"]{display:flex;flex-direction:column;}',
    '.p1-panel[data-panel-kind="build"] .p1-build-catalog{max-height:148px;overflow:auto;flex:1 1 auto;min-height:0;}',
    '.p1-panel[data-panel-kind="build"] .p1-build-name{display:none;}',
    '.p1-panel[data-panel-kind="build"] .p1-build-preview{width:48px;height:16px;margin:2px auto;flex-shrink:0;}',
    '.p1-build-actions .p1-action{padding:2px;min-height:16px;}',
    '.p1-build-actions .p1-action:last-child{grid-column:1/-1;}',
    '.p1-build-catalog-entry{font:inherit;color:inherit;background:#111a22;text-align:left;cursor:pointer;}',
    '.p1-action:disabled{opacity:.45;cursor:default;}',
    '.p1-action-dock{position:absolute;right:8px;bottom:64px;display:flex;gap:3px;pointer-events:auto;}',
    '.p1-ui[data-panel-open="true"] .p1-action-dock{bottom:4px;z-index:2;}',
    '.p1-action-dock button{display:grid;place-items:center;width:28px;height:32px;padding:2px;background:#111a22;color:#d8e8db;border:1px solid #7d939b;cursor:pointer;font:7px monospace;}',
    '.p1-survival .p1-meter-label-copy{display:inline;font-weight:400;}',
    '.p1-survival{width:150px!important;}',
    '.p1-survival .p1-meter{grid-template-columns:76px 42px 18px 8px;}.p1-survival .p1-meter:nth-child(-n+2){min-height:15px;}.p1-survival .p1-meter:nth-child(-n+2) .p1-meter-label-copy{font-weight:700;}.p1-survival .p1-meter[data-severity=normal] .p1-meter-fill{background:#8db5ac;}.p1-survival .p1-meter[data-severity=warning] .p1-meter-fill{background:#efca83;}.p1-survival .p1-meter[data-severity=critical] .p1-meter-fill{background:#ef9292;}',
    '.p1-panel-skin-corner{position:absolute;left:0;top:0;width:16px!important;height:16px!important;}',
    '.p1-panel-title{font-size:11px;font-weight:700;border-bottom:1px solid #778094;padding:2px 0 4px 14px;margin-bottom:5px;}',
    '.p1-item-inspection,.p1-character-inspection{border:1px solid #51636d;padding:6px;margin:6px 0;line-height:1.5}.p1-item-inspection h3{font-size:11px;margin:0 0 4px}.p1-item-inspection p,.p1-character-inspection p{margin:4px 0}.p1-inspection-more summary,.p1-character-inspection summary{cursor:pointer;font-weight:bold}.p1-character-values{display:flex;flex-wrap:wrap;gap:4px 12px;padding:6px 0}.p1-character-effect{border-left:2px solid #d6c78d;padding:4px 8px;margin:6px 0}.p1-character-effect[data-severity="critical"]{border-color:#e8a088}.p1-item-inspection button{margin:4px 4px 0 0;}',
    '.p1-wardrobe{display:grid;grid-template-columns:1fr 80px 1fr;gap:8px;align-items:center;padding:8px;border:1px solid #65747b;margin-bottom:6px}.p1-wardrobe-column{display:flex;flex-direction:column;gap:6px;min-width:0}.p1-wardrobe-slot{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:70px;border:1px dashed #708a92;padding:8px}.p1-wardrobe-slot[data-equipped-stack]{border-style:solid}.p1-avatar{position:relative;width:80px;height:104px;background:radial-gradient(ellipse at 50% 80%,#6b8b8b44,transparent 70%)}.p1-avatar-layer{position:absolute!important;left:8px;bottom:4px;image-rendering:pixelated}.p1-wardrobe-help{grid-column:1/4;line-height:1.5}.p1-item-row[draggable=true]{cursor:grab;}',
    '[data-product-review-panel-open=true] .sp-blueprint,[data-product-review-panel-open=true] .lw-menu,[data-product-review-panel-open=true] .lw-season,[data-product-review-panel-open=true] .p2-colony-controls,[data-product-review-help-open=true] .sp-blueprint{visibility:hidden;pointer-events:none;}',
    '.p1-panel[data-panel-kind="inventory"]{width:600px;max-height:310px}.p1-inventory-layout{display:grid;grid-template-columns:264px 1fr;gap:8px}.p1-inventory-bag{max-height:268px;overflow:auto;min-width:0}.p1-inventory-layout .p1-wardrobe{align-self:start;margin:0;grid-template-columns:1fr 64px 1fr;gap:4px;padding:4px}.p1-inventory-layout .p1-wardrobe-slot{padding:4px;gap:2px;font-size:8px;min-height:65px}.p1-inventory-layout .p1-wardrobe-slot .p1-action{font-size:8px;padding:2px;line-height:1.2}.p1-inventory-layout .p1-avatar{width:64px}.p1-inventory-layout .p1-avatar-layer{left:0}.p1-inventory-layout .p1-wardrobe-help{font-size:8px}.p1-panel[data-panel-kind="inventory"] .p1-inventory-bag .p1-item-list{grid-template-columns:repeat(2,1fr);}',
    '.p1-inventory-layout .p1-wardrobe-slot{display:grid;grid-template-columns:24px minmax(0,1fr);align-content:center;text-align:center}.p1-inventory-layout .p1-wardrobe-slot>strong,.p1-inventory-layout .p1-wardrobe-slot>.p1-action,.p1-inventory-layout .p1-wardrobe-slot>small:not(.p1-rarity-label){grid-column:1/-1}.p1-inventory-layout .p1-wardrobe-slot>.p1-rarity-label{grid-column:2;font-size:8px}.p1-inventory-layout .p1-wardrobe-slot>.p1-asset-icon{grid-column:1;grid-row:2/4}.p1-inventory-layout .p1-wardrobe-slot>span:not(.p1-asset-icon){grid-column:2;min-width:0;overflow-wrap:anywhere}.p1-inventory-layout .p1-wardrobe-slot:not([data-equipped-stack])>span{grid-column:1/-1}',
    '.p1-subtitle{margin-top:4px;color:#c5ccbd;}',
    '.p1-item-list,.p1-craft-list{display:grid;gap:2px;}',
    '.p1-rarity-label{display:block;font-size:9px;line-height:1.4}.p1-item-inspection[data-rarity] h3{color:var(--rarity-colour)}',
    '.p1-item-row,.p1-craft-row{display:grid;gap:4px;padding:3px;border:1px solid #3b465a;}',
    '.p1-item-row{grid-template-columns:24px 2fr 1fr;align-items:center;min-height:30px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-list{grid-template-columns:repeat(4,1fr);gap:4px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-row{grid-template-columns:24px 1fr;grid-template-rows:24px auto;min-height:48px;}',
    '.p1-panel[data-panel-kind="inventory"] .p1-item-state{grid-column:1/3;font-size:7px;}',
    '.p1-item-icon{width:24px!important;height:24px!important;}',
    '.p1-item-condition-track{grid-column:1/-1;height:2px;background:#263040;display:block;align-self:end;}',
    '.p1-item-condition-fill{height:2px;background:#f4f6ef;display:block;}',
    '.p1-item-row[data-selected="true"]{outline:1px solid #fff;background:#253044;}',
    '.p1-item-row[data-available="false"]{opacity:.55;border-style:dashed;background:#1b2029;}',
    '.p1-container-panes{display:grid;grid-template-columns:1fr 1fr;gap:8px;}',
    '.p1-container-pane{border:1px solid #455066;padding:5px;min-height:120px;max-height:190px;overflow-y:auto;}',
    '.p1-craft-row{display:grid;grid-template-columns:1fr;gap:1px;padding:2px 3px;line-height:1.05;}',
    '.p1-craft-heading,.p1-craft-footer{display:flex;justify-content:space-between;gap:6px;align-items:center;min-height:9px;}',
    '.p1-craft-ingredients{display:flex;flex-wrap:wrap;gap:1px 4px;min-height:9px;}',
    '.p1-craft-ingredient{display:inline-flex;align-items:center;gap:2px;border:1px solid #455066;padding:0 2px;}',
    '.p1-craft-ingredient[data-sufficient="false"]{border-style:dashed;font-weight:700;}',
    '.p1-craft-ingredient-icon{display:inline-block!important;width:24px!important;height:24px!important;min-width:24px;min-height:24px;flex:0 0 24px;}',
    '.p1-craft-output{display:inline-flex;gap:3px;align-items:center;}',
    '.p1-craft-output-token{display:inline-flex;gap:2px;align-items:center;}',
    '.p1-craft-output-icon{width:12px!important;height:12px!important;min-width:12px;min-height:12px;}',
    '.p1-craft-output-token{white-space:nowrap;font-size:7px;}',
    '.p1-craft-station{border:1px solid #778094;padding:0 3px;}',
    '.p1-craft-row[data-state="BLOCKED"]{border-style:dashed;}',
    '.p1-feedback{margin-top:5px;padding:4px;border:1px dashed #fff;}',
    '.p1-build-catalog{display:grid;gap:2px;}',
    '.p1-build-catalog-entry{display:grid;grid-template-columns:22px 1fr;gap:4px;align-items:center;min-height:26px;padding:2px;border:1px solid #455066;}',
    '.p1-build-catalog-entry[data-selected="true"]{outline:1px solid #fff;background:#253044;}',
    '.p1-build-catalog-entry[data-build-cap-state="CAP REACHED"]{border-style:double;}',
    '.p1-build-catalog-icon{display:inline-block;image-rendering:pixelated;align-self:center;justify-self:center;}',
    '.p1-build-catalog-name{font-weight:700;}',
    '.p1-build-catalog-kit{font-size:7px;color:#c5ccbd;}',
    '.p1-build-preview{width:72px;height:36px;margin:3px auto;border:2px dashed #fff;display:grid;place-items:center;position:relative;background:rgba(10,14,22,.62);}',
    '.p1-build-preview-pattern{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);}',
    '.p1-build-preview-label{position:relative;z-index:1;padding:2px 4px;background:rgba(10,14,22,.78);}',
    '.p1-build-preview[data-placement-state="VALID"]{border-style:solid;}',
    '.p1-build-preview[data-placement-state="CONNECTOR"]{outline:2px dotted #fff;}',
    '.p1-panel-detail,.p1-progress-list{margin-top:5px;padding:4px;background:#161e2a;}',
    '.p1-progress-icons,.p1-map-markers{display:flex;align-items:center;gap:4px;margin:3px 0;}',
    '.p1-panel[data-panel-kind="progression"]{width:520px;max-height:280px;padding:6px;}',
    '.p1-panel[data-panel-kind="progression"] .p1-panel-title{margin-bottom:2px;}',
    '.p1-panel[data-panel-kind="progression"] .p1-subtitle{margin-top:2px;}',
    '.p1-progression-rows{display:grid;gap:1px;margin-top:1px;}',
    '.p1-progression-rows[data-progression-section="skill"],.p1-progression-rows[data-progression-section="profession"]{grid-template-columns:1fr 1fr;gap:2px 4px;}',
    '.p1-progression-row{display:flex;align-items:center;gap:3px;padding:1px 2px;min-height:14px;border:1px solid #455066;}',
    '.p1-progression-row[data-progression-state="LOCKED"],.p1-progression-row[data-progression-state="INCOMPLETE"]{border-style:dashed;opacity:.72;}',
    '.p1-progression-icon{width:12px!important;height:12px!important;}',
    '.p1-panel-capacity{margin-top:3px;padding:3px 4px;border:1px solid #778094;background:#161e2a;font-variant-numeric:tabular-nums;}',
    '.p1-container-capacity-context{display:grid;grid-template-columns:1fr 1fr;gap:4px;}',
    '.p1-equipment-slot{flex-wrap:wrap;}',
    '.p1-equipment-condition-track{height:2px;background:#263040;display:block;flex:1 0 56px;min-width:40px;}',
    '.p1-equipment-condition-fill{height:2px;background:#f4f6ef;display:block;}',
    '.p1-equipment-slot[data-equipment-state="BROKEN"]{outline:1px dashed #fff;}',
    '.p1-equipment-broken{font-weight:700;}',
    '.p1-panel[data-panel-kind="map"]{width:568px;max-height:318px;padding:6px;}',
    '.p1-panel[data-panel-kind="map"] .p1-panel-title{margin-bottom:3px;}',
    '.p1-spatial-map{position:relative;margin:0 auto 4px;overflow:visible;background:#090d14;border:1px solid #778094;image-rendering:pixelated;}',
    '.p1-map-cell,.p1-map-unknown-boundary{position:absolute;}',
    '.p1-map-cell-ground{background:#53634d;}',
    '.p1-map-cell-ground[data-map-motif="flora"]{box-shadow:inset 0 0 0 1px #7b8769;}',
    '.p1-map-cell-water{background:#354b62;box-shadow:inset 0 0 0 1px #91a7aa;}',
    '.p1-map-unknown-boundary{background:#161c26;box-shadow:inset 0 0 0 1px #2d3544;}',
    '.p1-map-marker-position{position:absolute;width:12px;height:12px;transform:translate(-6px,-6px);z-index:4;}',
    '.p1-map-marker-position[data-map-marker-kind="player"]{z-index:7;outline:2px double #fff;}',
    '.p1-map-marker-position[data-map-marker-kind="base"]{z-index:6;outline:1px solid #fff;}',
    '.p1-map-marker-position[data-selected="true"]{box-shadow:0 0 0 2px #0a0e16,0 0 0 3px #fff;}',
    '.p1-map-marker-position[data-map-marker-clamped="true"]{outline:1px dashed #c5ccbd;}',
    '.p1-map-selection-label{position:absolute;z-index:9;transform:translate(8px,-13px);padding:1px 3px;background:#0a0e16;border:1px solid #fff;font-weight:700;white-space:nowrap;text-shadow:none;}',
    '.p1-map-facing-peg{position:absolute;width:2px;height:2px;background:#fff;left:5px;top:-3px;}',
    '.p1-map-marker-position[data-facing="NE"] .p1-map-facing-peg{left:10px;top:-1px;}',
    '.p1-map-marker-position[data-facing="E"] .p1-map-facing-peg{left:13px;top:5px;}',
    '.p1-map-marker-position[data-facing="SE"] .p1-map-facing-peg{left:10px;top:10px;}',
    '.p1-map-marker-position[data-facing="S"] .p1-map-facing-peg{left:5px;top:13px;}',
    '.p1-map-marker-position[data-facing="SW"] .p1-map-facing-peg{left:0;top:10px;}',
    '.p1-map-marker-position[data-facing="W"] .p1-map-facing-peg{left:-3px;top:5px;}',
    '.p1-map-marker-position[data-facing="NW"] .p1-map-facing-peg{left:0;top:-1px;}',
    '.p1-map-legend{display:flex;flex-wrap:wrap;gap:2px 7px;align-items:center;margin:2px 0;}',
    '.p1-map-legend-entry{display:inline-flex;align-items:center;gap:2px;white-space:nowrap;}',
    '.p1-map-legend-marker{width:12px!important;height:12px!important;}',
    '.p1-map-detail{margin-top:3px;padding:3px 5px;border:1px solid #d6dccd;background:#161e2a;font-weight:700;}',
    '.p1-map-detail[data-distance-band="MID"]{border-style:dashed;}',
    '.p1-map-detail[data-distance-band="FAR"]{border-style:double;}',
    '.p1-map-cycle-hint{margin-top:2px;color:#c5ccbd;}',
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
  private panelSignature = '';
  private readonly mapViewport:MapViewportState={zoom:1,x:0,y:0};
  private readonly stopLocale: () => void;
  private displaySignature = '';
  private actionDock: HTMLElement | null = null;
  private equipmentDragActive = false;
  private readonly startEquipmentDrag = (event: Event) => { if (event.target instanceof Element && event.target.closest('[data-review-item][draggable=true]')) this.equipmentDragActive = true; };
  private readonly endEquipmentDrag = () => { this.equipmentDragActive = false; queueMicrotask(() => { if (this.layer.isConnected) this.render(); }); };

  public constructor(
    private readonly root: HTMLElement,
    canvas: HTMLCanvasElement,
    initialState: Phase1PresentationState,
  ) {
    validatePhase1PresentationState(initialState);
    this.document = root.ownerDocument;
    this.canvas = canvas;
    this.currentState = initialState;
    this.stopLocale = onLocaleChange(() => { this.displaySignature = ''; this.panelSignature = ''; this.render(); });
    this.layer = createElement(this.document, 'div', 'p1-ui');
    this.layer.id = 'proz0-phase1-ui';
    this.layer.dataset.presentationAuthority = 'derived-read-only';
    this.layer.dataset.productionAssetFoundation = 'p1-75-78';
    this.layer.append(styles(this.document));
    this.root.append(this.layer);
    this.root.addEventListener('dragstart', this.startEquipmentDrag, true);
    this.root.addEventListener('dragend', this.endEquipmentDrag);
    this.root.addEventListener('drop', this.endEquipmentDrag);
    this.document.defaultView?.addEventListener('blur', this.endEquipmentDrag);
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
    this.stopLocale();
    this.root.ownerDocument.defaultView?.removeEventListener('resize', this.applyScale);
    this.root.removeEventListener('dragstart', this.startEquipmentDrag, true);
    this.root.removeEventListener('dragend', this.endEquipmentDrag);
    this.root.removeEventListener('drop', this.endEquipmentDrag);
    this.document.defaultView?.removeEventListener('blur', this.endEquipmentDrag);
    delete this.root.dataset.productReviewPanelOpen;
    this.layer.remove();
  }

  private readonly applyScale = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    this.layer.style.width = bounds.width + 'px';
    this.layer.style.height = bounds.height + 'px';
    this.layer.style.transform = 'translate(-50%, -50%)';
    this.layer.dataset.displayScale = '1';
  };

  private render(): void {
    const state = this.currentState;
    if (this.equipmentDragActive && state.panel?.kind === 'inventory') return;
    this.equipmentDragActive = false;
    // Meter text and bars are whole-unit pixels. Keep the exact diagnostic
    // values current without rebuilding the HUD for subpixel survival changes.
    const meters = [state.health, state.stamina, state.food, state.water, state.temperature];
    this.layer.querySelectorAll<HTMLElement>('.p1-survival .p1-meter').forEach((element, index) => {
      const value = String(meters[index]!.value);
      if (element.dataset.value !== value) { element.dataset.value = value; element.setAttribute('aria-valuenow',value); }
    });
    const roundedMeter = (value: Phase1MeterPresentation) => ({ ...value, value: Math.round(value.value) });
    const displaySignature = JSON.stringify({
      ...state,
      activePanels: DOCK_SHORTCUTS.map(shortcut=>isPanelShortcutActive(shortcut,state.panel?.kind,this.root.dataset)),
      health: roundedMeter(state.health), water: roundedMeter(state.water),
      food: roundedMeter(state.food), stamina: roundedMeter(state.stamina),
      temperature: roundedMeter(state.temperature),
      interaction: state.interaction === null ? null : { ...state.interaction,
        progress: state.interaction.progress === null ? null : Math.round(state.interaction.progress * 100) / 100 },
    });
    if (displaySignature === this.displaySignature) return;
    this.displaySignature = displaySignature;
    const panelOpen = state.panel !== null;
    this.layer.dataset.panelOpen = String(panelOpen);
    this.root.dataset.productReviewPanelOpen = String(panelOpen);
    const style = this.layer.querySelector('style');
    const previousPanel = this.layer.querySelector<HTMLElement>('.p1-panel');
    const expanded = new Set(Array.from(previousPanel?.querySelectorAll<HTMLElement>('details[data-inspection-key][open]') ?? [], e => e.dataset.inspectionKey));
    const restorePanel = previousPanel ? capturePanelUi(previousPanel) : null;
    const previousScroll = previousPanel?.scrollTop ?? 0;
    const active = this.document.activeElement instanceof HTMLElement && previousPanel?.contains(this.document.activeElement) ? this.document.activeElement : null;
    const activeInspection = active?.closest<HTMLElement>('details[data-inspection-key]')?.dataset.inspectionKey;
    const activeAction = active?.dataset.reviewAction, activeItem = active?.dataset.reviewItem;
    const activeLabel = active?.textContent;
    const signature = state.panel?.kind === 'colony' ? 'colony' : JSON.stringify(state.panel);
    if (state.panel?.kind === 'colony') {
      const lines = state.panel.lines;
      this.layer.querySelectorAll('.p1-colony-status').forEach((element, index) => {
        bindUiText(element,"textContent",lines[index] ?? '');
      });
    }
    for (const child of Array.from(this.layer.children)) {
      if (child !== style && child !== this.actionDock && !(child.matches('.p1-panel') && signature === this.panelSignature)) {
        child.remove();
      }
    }

    if (this.root.dataset.phase1QaMode !== 'none') {
      this.layer.append(createProductionWorldPreview(this.document));
    }

    const survival = createElement(this.document, 'section', 'p1-survival p1-box p1-context-hud');
    survival.dataset.region = 'survival';
    survival.append(
      meter(this.document, state.health, 'health'),
      meter(this.document, state.stamina, 'stamina'),
      meter(this.document, state.food, 'food'),
      meter(this.document, state.water, 'water'),
      meter(this.document, state.temperature, 'temperature'),
    );

    const world = createElement(this.document, 'section', 'p1-world p1-box p1-context-hud');
    world.dataset.region = 'world';
    world.dataset.weatherState = state.world.weatherState;
    world.dataset.dayPeriod = state.world.dayPeriod;
    const worldLine = createElement(this.document, 'div', 'p1-world-line');
    worldLine.append(
      createElement(this.document, 'span', '', state.world.timeLabel),
      createElement(this.document, 'span', '', state.world.timeSegment ?? state.world.dayPeriod),
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
    const weatherLabel=createElement(this.document,'span','p1-weather-label',uiPhrase(state.world.weatherLabel));weatherIdentity.append(weatherLabel);
    weatherLine.append(
      weatherIdentity,
      createElement(this.document, 'span', '', String(state.world.teammateCount)+' '+uiPhrase('players')),
    );
    world.append(worldLine, weatherLine);
    const cycle=createElement(this.document,'div','p1-world-cycle',this.root.dataset.worldCycleLabel??'');
    cycle.hidden=!this.root.dataset.worldCycleLabel;world.append(cycle);

    const equipment = createElement(this.document, 'section', 'p1-equipment p1-box p1-context-hud');
    equipment.dataset.region = 'equipment';

    const equipmentSlots = state.equipmentSlots;
    equipment.dataset.empty = String(equipmentSlots!==undefined ? equipmentSlots.weapon===null && equipmentSlots.protection===null && equipmentSlots.quickUse.target===null : state.equipment===null);
    if (equipmentSlots === undefined) {
      if (state.equipment === null) {
        bindUiText(equipment,"textContent",uiText("ui.fc9c7250"));
      } else {
        const equipmentIcon = assetSprite(
          this.document,
          'p1-asset-icon p1-equipment-icon',
          itemIconSprite(uiPhrase(state.equipment.name)),
        );
        if (equipmentIcon !== null) {
          equipment.append(equipmentIcon);
        }
        equipment.append(
          uiPhrase(state.equipment.name)
          + (state.equipment.condition === null
            ? ' · ' + state.equipment.stateLabel
            : ' · ' + String(state.equipment.condition) + '/' + String(state.equipment.conditionMax)
              + ' · ' + state.equipment.stateLabel),
        );
      }
    } else {
      const appendSlot = (
        inputLabel: string,
        emptyLabel: string,
        slot: typeof equipmentSlots.weapon,
        key: string,
      ): void => {
        const row = createElement(
          this.document,
          'div',
          'p1-equipment-slot',
        );
        row.dataset.equipmentSlot = key;
        row.append(createElement(
          this.document,
          'span',
          'p1-equipment-slot-label',
          '[' + inputLabel + ']',
        ));
        if (slot === null) {
          row.dataset.equipmentState = 'EMPTY';
          const caption = emptyLabel + ' · ' + uiPhrase('not equipped');
          bindUiText(row,"title",caption);row.setAttribute('aria-label',caption);
          row.append(createElement(this.document, 'span', 'p1-visually-hidden', emptyLabel), uiPhrase('Empty'));
        } else {
          const icon = assetSprite(
            this.document,
            'p1-asset-icon p1-equipment-icon',
            itemIconSprite(uiPhrase(slot.name)),
          );
          if (icon !== null) row.append(icon);
          const conditionLabel =
            slot.condition === null
            || slot.conditionMax === null
            || slot.conditionMax <= 0
              ? ''
              : ' C' + String(slot.condition);
          bindUiText(row,"title",uiPhrase(slot.name)
            + (slot.condition === null || slot.conditionMax === null
              ? ''
              : uiText("ui.903fa637")
                + String(slot.condition)
                + '/'
                + String(slot.conditionMax)));
          row.dataset.equipmentState = slot.stateLabel;
          row.append(createElement(this.document, 'span', 'p1-visually-hidden', uiPhrase(slot.name)), conditionLabel);
          if (
            slot.condition !== null
            && slot.conditionMax !== null
            && slot.conditionMax > 0
          ) {
            const conditionTrack = createElement(
              this.document,
              'span',
              'p1-equipment-condition-track',
            );
            conditionTrack.dataset.conditionCurrent = String(slot.condition);
            conditionTrack.dataset.conditionMax = String(slot.conditionMax);
            const conditionFill = createElement(
              this.document,
              'span',
              'p1-equipment-condition-fill',
            );
            conditionFill.style.width = String(percent(
              slot.condition,
              slot.conditionMax,
            )) + '%';
            conditionTrack.append(conditionFill);
            row.append(conditionTrack);
          }
          if (slot.stateLabel === 'BROKEN') {
            row.append(createElement(
              this.document,
              'span',
              'p1-equipment-broken',
              'BROKEN',
            ));
          }
        }
        equipment.append(row);
      };
      appendSlot('Q', 'WEAPON', equipmentSlots.weapon, 'weapon');
      appendSlot('T', 'WRAP', equipmentSlots.protection, 'protection');

      const quickUse = createElement(
        this.document,
        'div',
        'p1-quick-use',
      );
      quickUse.dataset.quickUseState = equipmentSlots.quickUse.state;
      const quickLabel=uiPhrase('Consume available food or water')+' · '+(equipmentSlots.quickUse.target??uiPhrase('Empty'));
      quickUse.dataset.action='consume';
      bindUiText(quickUse,'title',quickLabel);bindUiText(quickUse,'aria-label',quickLabel);
      const quickIcon=equipmentSlots.quickUse.target===null?null:assetSprite(this.document,'p1-asset-icon p1-equipment-icon',itemIconSprite(equipmentSlots.quickUse.target));
      quickUse.append(createElement(this.document,'span','p1-equipment-slot-label','[V] '+uiPhrase('Consume')));
      if(quickIcon)quickUse.append(quickIcon);
      quickUse.append(createElement(this.document,'span','p1-quick-use-label',equipmentSlots.quickUse.target??'—'));
      equipment.append(quickUse);
    }

    const carry = createElement(this.document, 'section', 'p1-carry p1-box p1-context-hud');
    carry.dataset.region = 'carry';
    carry.dataset.carryState = state.carry.stateLabel;
    bindUiText(carry,"title",uiText("ui.ba72f17b")+formatInventoryAmount(state.carry.weightCurrent)+'/'+formatInventoryAmount(state.carry.weightMax)+uiText("ui.c164b263")+formatInventoryAmount(state.carry.volumeCurrent)+'/'+formatInventoryAmount(state.carry.volumeMax)+uiText("ui.15a006f6"));
    bindUiText(carry,"aria-label",carry.title);
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
      ' ' + formatInventoryAmount(state.carry.weightCurrent) + '/' + formatInventoryAmount(state.carry.weightMax) + ' kg ',
    );
    if (volumeIcon !== null) {
      carry.append(volumeIcon);
    }
    carry.append(
      ' ' + formatInventoryAmount(state.carry.volumeCurrent) + '/' + formatInventoryAmount(state.carry.volumeMax)
      + ' · ' + uiPhrase(state.carry.stateLabel),
    );

    const toasts = createElement(this.document, 'section', 'p1-toasts p1-context-hud');
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
      entry.dataset.routineCooldown=String((toast.title+' '+(toast.detail??'')).includes('COOLDOWN'));
      entry.dataset.toastId = toast.id;
      toasts.append(entry);
    }

    const team = createElement(this.document, 'section', 'p1-team p1-context-hud');
    for (const entry of state.teammates) {
      team.append(teammate(this.document, entry));
    }

    world.append(team);
    this.layer.append(survival, world, equipment, carry, toasts);
    if (this.actionDock === null) {
      const dock = createElement(this.document, 'nav', 'p1-action-dock');
      this.actionDock = dock;
      bindUiText(dock,"aria-label",uiText("ui.57bffba4"));
      for (const shortcut of DOCK_SHORTCUTS) {
        const {key,action}=shortcut;
        const button = actionButton(this.document, '', action);
        bindLocalized(button,"aria-label",()=>uiPhrase(shortcut.label) + ' [' + key + ']'); bindLocalized(button,"title",()=>uiPhrase(shortcut.label) + ' [' + key + ']');
        button.append(actionGlyph(this.document,action));
        button.append(createElement(this.document, 'span', '', key)); dock.append(button);
      }
      this.layer.append(dock);
    }
    for(const button of this.actionDock!.querySelectorAll<HTMLButtonElement>('button')){
      const shortcut=DOCK_SHORTCUTS.find(shortcut=>shortcut.action===button.dataset.reviewAction);
      const active=shortcut!==undefined&&isPanelShortcutActive(shortcut,state.panel?.kind,this.root.dataset);
      button.setAttribute('aria-pressed',String(active));
    }

    if (state.firstActionCue !== undefined && state.firstActionCue !== null) {
      const firstAction = createElement(
        this.document,
        'div',
        'p1-first-action p1-context-hud',
      );
      bindUiText(firstAction,"title",state.firstActionCue);
      firstAction.append(createElement(this.document, 'span', 'p1-visually-hidden', state.firstActionCue));
      const cueIcon = assetSprite(this.document, 'p1-asset-icon', interactionSprite(uiText("ui.94c2b2ca")));
      if (cueIcon !== null) firstAction.append(cueIcon);
      firstAction.append(state.interaction?.verb === uiText("ui.94c2b2ca") && state.interaction.state === uiText("ui.ef7a53b8")
        ? uiText("ui.ce4334ea") : uiText("ui.9db710ea"));
      firstAction.dataset.firstActionCue = 'visible';
      this.layer.append(firstAction);
    }

    if (state.interaction !== null) {
      const interaction = createElement(this.document, 'section', 'p1-interaction p1-box p1-context-hud');
      interaction.dataset.region = 'interaction';
      interaction.dataset.state = state.interaction.state;
      interaction.dataset.reason = state.interaction.reason ?? '';
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
        + uiPhrase(state.interaction.verb) + ' · ' + uiPhrase(state.interaction.target),
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

    if (state.panel !== null && signature !== this.panelSignature) {
      const fresh = renderPanel(this.document, state.panel);
    for(const controls of fresh.querySelectorAll<HTMLElement>('.p1-inventory-controls')){if(controls.closest('details'))continue;const details=this.document.createElement('details'),summary=this.document.createElement('summary');details.className='p1-ui-controls';bindUiText(summary,'textContent',gameUiText('controls'));controls.replaceWith(details);details.append(summary,controls);}
      const sameKind = previousPanel?.dataset.panelKind === state.panel.kind;
      const panel = sameKind ? previousPanel! : fresh;
      if (sameKind) {
        for(const attribute of Array.from(panel.attributes))if(!fresh.hasAttribute(attribute.name))panel.removeAttribute(attribute.name);
        for(const attribute of Array.from(fresh.attributes))panel.setAttribute(attribute.name,attribute.value);
        panel.replaceChildren(...Array.from(fresh.childNodes));
      }
      this.layer.append(panel);
      const field=panel.querySelector<HTMLElement>('[data-map-spatial]');
      if(field){const next=field.nextSibling;const view=mountMapViewport(field,this.mapViewport);panel.insertBefore(view,next);}
      panelShell(panel,panel.querySelector<HTMLElement>('.p1-panel-title')!,panel.querySelector<HTMLButtonElement>('.p1-panel-close')!);
      if (previousPanel?.dataset.panelKind === state.panel.kind) {
        panel.querySelectorAll<HTMLDetailsElement>('details[data-inspection-key]').forEach(e => { e.open = expanded.has(e.dataset.inspectionKey); });
        panel.scrollTop = previousScroll;
        const focus = active?.tagName === 'SUMMARY'
          ? Array.from(panel.querySelectorAll<HTMLElement>('details[data-inspection-key]')).find(e => e.dataset.inspectionKey === activeInspection)?.querySelector<HTMLElement>('summary')
          : Array.from(panel.querySelectorAll<HTMLElement>('button')).find(e => e.textContent === activeLabel && (activeAction ? e.dataset.reviewAction === activeAction : activeItem ? e.dataset.reviewItem === activeItem : false));
        const mapFocus = active?.classList.contains('p1-map-viewport') ? panel.querySelector<HTMLElement>('.p1-map-viewport') : null;
        (focus ?? mapFocus)?.focus({ preventScroll: true });
        restorePanel?.();
      } else if (state.panel.kind === 'map') {
        panel.querySelector<HTMLElement>('.p1-map-viewport')?.focus({ preventScroll: true });
      }
    }
    this.panelSignature = signature;
  }
}

export function createPhase1HudOverlay(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  initialState: Phase1PresentationState,
): Phase1HudOverlay {
  return new Phase1HudOverlayImpl(root, canvas, initialState);
}
