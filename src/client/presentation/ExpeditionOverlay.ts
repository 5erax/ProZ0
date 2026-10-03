import { contentDisplayName } from '../localization/ContentText';
import { locale } from '../localization/Locale';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import type { Phase1AuthorityBundle } from '../../integration';
import {
  EXPEDITION_FACILITIES,
  EXPEDITION_RECIPES,
  expeditionFacility,
} from '../../content/singleplayer/ExpeditionContent';
import type { ExpeditionCommand } from '../../simulation/expedition/ExpeditionAuthority';
import {
  projectPhase1Isometric,
  unprojectPhase1Isometric,
} from '../runtime/Phase1IsometricProjection';
import {
  applyProductionSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
  itemIconSprite,
} from './Phase1ProductionAssets';

import { expeditionSprite } from './ExpeditionAssets';
import { createCanvasBounds } from './CanvasBounds';
import { bindEntityInspection } from './EntityInspection';

/** Presentation only: every material change runs through the solo authority. */
export function createExpeditionOverlay(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  bundle: Phase1AuthorityBundle,
  playerId: string,
  onOpen: () => void,
) {
  const document = root.ownerDocument,
    authority = bundle.expedition!;
  const bounds = createCanvasBounds(root, canvas);
  const style = document.createElement('style');
  style.textContent =
    '.sp-expedition{position:absolute;inset:0;pointer-events:none;z-index:1000010;font:12px monospace;color:#e8efdf}.sp-expedition-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(700px,92%);max-height:80%;overflow:auto;box-sizing:border-box;background:#0b1721f5;border:2px solid #8faaa2;padding:16px;pointer-events:auto}.sp-expedition-panel[data-target-entity]:not([data-target-entity=""]){left:auto;right:12px;top:110px;transform:none;width:min(360px,48%);max-height:60%}.sp-expedition-header{position:sticky;top:-16px;z-index:1;background:#0b1721;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0}.sp-expedition-header h2{margin:0}.sp-ghost{position:absolute;pointer-events:none;transform:translate(-50%,-50%);width:64px;height:64px;z-index:1}.sp-ghost svg{position:absolute;inset:0}.sp-ghost .sp-facility-art{position:absolute;left:16px;bottom:20px;opacity:.65}.sp-expedition button{font:inherit;background:#20343c;border:1px solid #839b94;color:inherit;padding:8px;cursor:pointer}.sp-expedition button:disabled{opacity:.4}.sp-expedition h2{margin:0 0 12px;font-size:17px}.sp-expedition article{border-bottom:1px solid #405655;padding:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sp-expedition small{color:#adc0af}.sp-expedition [role=status]{margin:8px;color:#efcb91}.sp-blueprint{position:absolute;pointer-events:auto;transform:translate(-50%,-100%);border:1px dashed #9ee4e4;background:#173b4590;color:#c9ffff;padding:4px;white-space:nowrap;font:11px monospace}.sp-outpost{border-style:solid;background:#182c2de0}.sp-placement-hint{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);background:#11252ded;border:1px solid #a6d8cc;padding:10px}.sp-cost{display:inline-flex;align-items:center;gap:4px}.sp-expedition-panel p{line-height:1.5}';
  const layer = document.createElement('section');
  layer.className = 'sp-expedition';
  bindUiText(layer,"aria-label",uiText("ui.89cd6303"));
  const markers = document.createElement('div'),
    panel = document.createElement('section'),
    hint = document.createElement('div');
  panel.className = 'sp-expedition-panel';
  hint.className = 'sp-placement-hint';
  panel.hidden = true;
  hint.hidden = true;
  const ghost = document.createElement('div');
  ghost.className = 'sp-ghost';
  ghost.hidden = true;
  const footprint = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  footprint.setAttribute('viewBox', '0 0 64 64');
  const outline = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  );
  outline.setAttribute('stroke-width', '2');
  outline.setAttribute('stroke-dasharray', '4 2');
  footprint.append(outline);
  ghost.append(footprint);
  layer.append(style, markers, ghost, panel, hint);
  root.append(layer);
  let opened = false,
    focusedEntity: string | null = null,
    feedback = '',
    signature = '',
    placement: {
      definition: string;
      planId?: string;
      relocationId?: string;
      orientation: 0 | 1 | 2 | 3;
    } | null = null;
  let cursor: { x: number; y: number } | null = null,
    previewSignature = '';
  const art = (id: string) => {
    const sprite = document.createElement('span');
    sprite.className = 'sp-facility-art';
    const canonical = {
      'structure:storage-crate': PHASE1_PRODUCTION_WORLD_SPRITES.storageCrate,
      'structure:workbench': PHASE1_PRODUCTION_WORLD_SPRITES.workbench,
      'structure:habitat-room': PHASE1_PRODUCTION_WORLD_SPRITES.habitat,
      'structure:compact-power-unit': PHASE1_PRODUCTION_WORLD_SPRITES.powerUnit,
      'structure:atmospheric-water-condenser':
        PHASE1_PRODUCTION_WORLD_SPRITES.condenser,
    };
    const definition = expeditionFacility(id)
      ? expeditionSprite(id)
      : canonical[id as keyof typeof canonical];
    if (definition) applyProductionSprite(sprite, definition, 0.5);
    return sprite;
  };
  const close = () => {
    authority.cancelRest(playerId);
    placement = null;
    hint.hidden = true;
    opened = false;
    focusedEntity = null;
    panel.hidden = true;
    ghost.hidden = true;
    root.dataset.expeditionPanelOpen = 'false';
  };
  const button = (label: string, run: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    bindUiText(b,"textContent",label);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      run();
    });
    return b;
  };
  const text = (tag: 'p' | 'h2' | 'small', value: string) => {
    const e = document.createElement(tag);
    bindUiText(e,"textContent",value);
    return e;
  };
  const describeFeedback = (message: string): string => {
    if (message.startsWith('plan:'))
      return uiText("ui.ffa9a301");
    const messages: Readonly<Record<string, string>> = {
      MATERIALS_DEPOSITED: uiText("ui.10086537"),
      PLAN_MOVED: uiText("ui.b49c9bac"),
      PLAN_REPLACED_TO_STORAGE: uiPhrase('Blueprint changed. Your bag was full; surplus materials were returned to an accessible nearby storage crate.'),
      PLAN_REFUNDED_TO_STORAGE: uiPhrase('Blueprint cancelled. Your bag was full; materials were returned to an accessible nearby storage crate.'),
      FACILITY_DISMANTLED_TO_STORAGE: uiPhrase('Building dismantled. Your bag was full; materials were returned to an accessible nearby storage crate.'),
      PLAN_REPLACED: uiPhrase('Blueprint type changed. Shared materials are kept; surplus materials returned to your bag.'),
      SAME_BLUEPRINT_TYPE: uiText("ui.c8a1d2b7"),
      PLAN_REFUNDED:
        uiText("ui.11febead"),
      FACILITY_COMPLETED: uiText("ui.3f3ccc3"),
      FACILITY_RELOCATED:
        uiText("ui.35d60eef"),
      STALE_BUILD_REVISION: uiText("ui.7e221f85"),
      NOT_STRUCTURE_OWNER: uiText("ui.42b43050"),
      LANDMARK_IMMOVABLE: uiText("ui.40f311cb"),
      PLAYER_INSIDE: uiText("ui.858762d2"),
      CONNECTOR_REQUIRED:
        uiText("ui.3f1bd2c6"),
      FACILITY_DISMANTLED:
        uiText("ui.bd14eec9"),
      COLLECT_WATER_FIRST:
        uiText("ui.f9290652"),
      USE_CANONICAL_DISMANTLE:
        uiPhrase('Use the existing building dismantle action; empty storage first.'),
      MATERIALS_MISSING:
        uiText("ui.fcc8b03f"),
      NO_OUTSTANDING_MATERIALS_AVAILABLE:
        uiText("ui.6ff04bd0"),
      OUT_OF_RANGE: uiText("ui.fa6dd432"),
      PLAN_OVERLAP:
        uiText("ui.a502d86e"),
      REST_STARTED: uiPhrase('Rest started. Stay still and safe; closing this panel wakes you up.'),
      REST_COOLDOWN: uiText("ui.23f56f49"),
      FOOD_AND_WATER_REQUIRED:
        uiText("ui.c6fd098d"),
      HOSTILE_NEARBY: uiText("ui.9352ec60"),
      SUPPLIES_ALREADY_CLAIMED:
        uiText("ui.938c5f91"),
      FACILITY_ACTION_COMPLETED:
        uiText("ui.a0acc6f4"),
      NO_COLLECTED_WATER:
        uiText("ui.3bcfbe5f"),
      FOOD_FULL: uiText("ui.6ba08449"),
      CRAFTED: uiText("ui.a0a94d06"),
      NEARBY_FIELD_WORKBENCH_REQUIRED:
        uiText("ui.82fb67fc"),
      SEED_COPIED: uiText("ui.4475a6e6"),
      STALE_REVISION: uiText("ui.ed753a11"),
      STALE_INVENTORY_REVISION:
        uiText("ui.d271f1b"),
      PLAN_LIMIT:
        uiText("ui.68cb7131"),
      FACILITY_LIMIT: uiText("ui.cf16d957"),
      INSUFFICIENT_ITEMS: uiText("ui.c4ea889d"),
      TARGET_CAPACITY_WEIGHT:
        uiText("ui.18657a42"),
      TARGET_CAPACITY_VOLUME:
        uiText("ui.361f5507"),
      QUANTITY_UNAVAILABLE: uiText("ui.c4ea889d"),
      CAPACITY_EXCEEDED: uiText("ui.1458ec7a"),
    };
    return messages[message] ?? message.replaceAll('_', ' ').toLowerCase();
  };
  const run = (
    action: ExpeditionCommand['action'],
    target: string,
    extra: Partial<ExpeditionCommand> = {},
  ) => {
    const result = authority.execute({
      id: 'sp:' + crypto.randomUUID(),
      playerId,
      expectedRevision: authority.read().revision,
      expectedBuildRevision: bundle.buildings.getBuildRevision(),
      expectedInventoryRevision: bundle.items.getContainerView(
        'inventory:' + playerId,
      ).revision,
      action,
      target,
      ...extra,
    });
    feedback = result.message;
    if (result.status === 'committed' && action === 'complete' && focusedEntity === target)
      focusedEntity = 'facility:' + target;
    signature = '';
    render();
    panel.querySelector('[role=status]')?.scrollIntoView({block:'nearest'});
    return result.status === 'committed';
  };
  const costs = (
    row: HTMLElement,
    entries: readonly (readonly [string, number])[],
    paid?: Readonly<Record<string, number>>,
  ) => {
    for (const [id, count] of entries) {
      const cost = document.createElement('span');
      cost.className = 'sp-cost';
      const icon = document.createElement('span');
      const sprite = itemIconSprite(id);
      if (sprite) applyProductionSprite(icon, sprite, 0.75);
      cost.append(
        icon,
        document.createTextNode(
          contentDisplayName(bundle.catalog.get(id)) +
            ' ' +
            String(
              paid
                ? (paid[id] ?? 0)
                : bundle.items
                    .getContainerView('inventory:' + playerId)
                    .stacks.filter((s) => s.itemDefinitionId === id)
                    .reduce((n, s) => n + s.quantity, 0),
            ) +
            '/' +
            String(count),
        ),
      );
      row.append(cost);
    }
  };
  const selectPlacement = (definition: string, planId?: string) => {
    close();
    placement = { definition, ...(planId ? { planId } : {}), orientation: 0 };
    ghost.querySelector('.sp-facility-art')?.remove();
    ghost.append(art(definition));
    previewSignature = '';
    hint.hidden = false;
    bindUiText(hint,"textContent",uiText("ui.27694c56"));
  };
  const selectRelocation = (target: string, definition: string) => {
    const info = authority.relocationInfo(target);
    if (!info) return;
    close();
    placement = {
      definition,
      relocationId: target,
      orientation: info.orientation,
    };
    ghost.querySelector('.sp-facility-art')?.remove();
    ghost.append(art(definition));
    previewSignature = '';
    hint.hidden = false;
    bindUiText(hint,"textContent",info.shape === 'structure:habitat-room'
        ? uiText("ui.41b8168f")
        : uiText("ui.e73a2238"));
  };
  const open = (focus?: string) => {
    onOpen();
    opened = true;
    if (focus && focus !== focusedEntity) feedback = '';
    focusedEntity = focus ?? null;
    placement = null;
    hint.hidden = true;
    root.dataset.expeditionPanelOpen = 'true';
    signature = '';
    render();
    if (focus) {
      const row = Array.from(
        panel.querySelectorAll<HTMLElement>(
          '[data-expedition-facility],[data-expedition-plan]',
        ),
      ).find(
        (e) =>
          e.dataset.expeditionFacility === focus ||
          e.dataset.expeditionPlan === focus,
      );
      row?.scrollIntoView({ block: 'center' });
    }
  };
  const render = () => {
    const interior = bundle.playerWorldspace() !== 'surface';layer.hidden = interior;
    if(interior){close();return;}
    if (root.dataset.colonySettingsOpen === 'true' && (opened || placement)) {
      close();
      placement = null;
      hint.hidden = true;
    }
    const state = authority.read(),
      inventory = bundle.items.getContainerView('inventory:' + playerId);
    const rest = authority.restStatus(playerId);
    const next = JSON.stringify([locale(),
      opened,
      focusedEntity,
      state.plans,
      state.facilities.map((f) => ({ ...f, progress: 0 })),
      state.supplyClaimed,
      state.events,
      inventory.revision,
      bundle.buildings.getBuildRevision(),
      rest ? Math.ceil(rest.remainingTicks / 60) : null,
      feedback,
    ]);
    if (next !== signature) {
      signature = next;
      panel.hidden = !opened;
      panel.replaceChildren();
      if (opened) {
        const header = document.createElement('header');
        header.className = 'sp-expedition-header';
        header.append(
          text('h2', focusedEntity ? uiText("ui.9256cb9e") : uiText("ui.cc393a1d")),
          button(uiText("ui.cd86acc3"), close),
        );
        panel.append(header);
        if (!focusedEntity) {
          panel.append(
            text('small', uiText("ui.33a75142") + bundle.config.worldSeed),
            button(uiText("ui.2054dc99"), () => {
              if (!navigator.clipboard) {
                feedback = uiText("ui.8fd94a21");
                signature = '';
                render();
                return;
              }
              void navigator.clipboard
                .writeText(bundle.config.worldSeed)
                .then(() => {
                  feedback = 'SEED_COPIED';
                  signature = '';
                  render();
                })
                .catch(() => {
                  feedback = uiText("ui.8fd94a21");
                  signature = '';
                  render();
                });
            }),
            text(
              'p',
              uiPhrase('Place a blueprint first. Bring supplies later, contribute what you carry, then complete it. Moving keeps contributed materials; cancel refunds them when your bag has room.'),
            ),
          );
          const event = authority.currentEvent(
            bundle.getPlayerPosition(playerId),
          );
          if (event)
            panel.append(
              text('small', uiText("ui.d11798de") + event.replaceAll('-', ' ')),
            );
          if (state.events.length) {
            const history = document.createElement('details'),
              summary = document.createElement('summary');
            bindUiText(summary,"textContent",uiText("ui.ba092ae9"));
            history.append(summary);
            for (const e of state.events.slice(-8).toReversed())
              history.append(
                text(
                  'p',
                  e.kind.replaceAll('-', ' ') +
                    uiText("ui.b9e28c94") +
                    e.region +
                    uiText("ui.e0034c96") +
                    String(Math.floor(e.tick / 3600)),
                ),
              );
            panel.append(history);
          }
        }
        panel.dataset.targetEntity = focusedEntity ?? '';
        const status = text('p', describeFeedback(feedback));
        status.dataset.result = feedback;
        status.setAttribute('role', 'status');
        panel.append(status);
        for (const def of focusedEntity ? [] : EXPEDITION_FACILITIES) {
          const row = document.createElement('article');
          row.append(art(def.id), text('p', uiPhrase(def.name)));
          costs(row, def.costs);
          row.append(
            button(uiText("ui.1eab5e32"), () => selectPlacement(def.id)),
            text('small', uiPhrase(def.purpose)),
          );
          panel.append(row);
        }
        for (const plan of state.plans.filter(plan => !focusedEntity || plan.id === focusedEntity)) {
          const def = expeditionFacility(plan.definitionId)!;
          const row = document.createElement('article');
          row.dataset.expeditionPlan = plan.id;
          row.append(art(def.id));
          row.append(
            text(
              'p',
              uiPhrase(def.name) + ' · ' + String(plan.x) + ', ' + String(plan.y),
            ),
          );
          costs(row, def.costs, plan.paid);
          row.append(
            button(uiText("ui.3664efba"), () => run('deposit', plan.id)),
            button(uiText("ui.628ea1a2"), () => run('complete', plan.id)),
            button(uiText("ui.7f2c2a34"), () => selectPlacement(def.id, plan.id)),
            button(uiText("ui.798fe085"), () => run('cancel', plan.id)),
          );
          const change = document.createElement('details'), summary = document.createElement('summary'), choice = document.createElement('select');
          bindUiText(summary,"textContent",uiText("ui.b8ad80d6"));
          bindUiText(choice,"aria-label",uiText("ui.a6c4cf10") + uiPhrase(def.name));
          for (const replacement of EXPEDITION_FACILITIES.filter(d => d.id !== def.id)) {
            const option = document.createElement('option');
            option.value = replacement.id; bindUiText(option,"textContent",uiPhrase(replacement.name));
            choice.append(option);
          }
          change.append(summary, choice, button(uiText("ui.c0b56c31"), () => run('replace', plan.id, { replacementDefinition: choice.value })), text('small', uiText("ui.8ada1323")));
          row.append(change);
          panel.append(row);
        }
        if (!focusedEntity) panel.append(text('h2', uiText("ui.f3e5c56")));
        const interact = (
          target: string,
          action: 'rest' | 'supplies' | 'cook' | 'water',
        ) => {
          const result = authority.interact({
            id: 'sp-facility:' + crypto.randomUUID(),
            playerId,
            target,
            action,
            expectedRevision: authority.read().revision,
            expectedInventoryRevision: bundle.items.getContainerView(
              'inventory:' + playerId,
            ).revision,
          });
          feedback = result.message;
          signature = '';
          render();
        };
        const lab = document.createElement('article');
        lab.dataset.expeditionLab = 'true';
        lab.append(
          text('p', uiText("ui.e50e65dd")),
          button(uiText("ui.8845b2e5"), () => interact('landing-lab', 'rest')),
          button(uiText("ui.c664b2ed"), () =>
            interact('landing-lab', 'supplies'),
          ),
          button(uiText("ui.a0e267af"), () => {
            close();
            document.dispatchEvent(
              new KeyboardEvent('keydown', { code: 'KeyU', bubbles: true }),
            );
          }),
          text(
            'small',
            uiText("ui.1aa3993e"),
          ),
        );
        if (!focusedEntity || focusedEntity === 'landing-lab') panel.append(lab);
        if (rest)
          panel.append(
            text(
              'p',
              uiText("ui.1c1724c4") +
                String(Math.ceil(rest.remainingTicks / 60)) +
                uiText("ui.3a49b846"),
            ),
            button(uiText("ui.c4b9a762"), () => {
              authority.cancelRest(playerId);
              signature = '';
              render();
            }),
          );
        for (const facility of state.facilities.filter(facility => !focusedEntity || facility.id === focusedEntity || facility.canonicalStructureId === focusedEntity)) {
          const row = document.createElement('article');
          row.dataset.expeditionFacility = facility.id;
          row.append(
            art(facility.definitionId),
            button(uiText("ui.2521c188"), () =>
              selectRelocation(facility.id, facility.definitionId),
            ),
          );
          row.append(
            text('p', uiPhrase(expeditionFacility(facility.definitionId)!.name)),
          );
          if (
            facility.definitionId === 'camp-bed' ||
            facility.definitionId === 'field-cabin'
          )
            row.append(
              button(uiText("ui.95c92d21"), () => interact(facility.id, 'rest')),
            );
          if (facility.definitionId === 'campfire')
            row.append(
              button(uiText("ui.f084a2ba"), () =>
                interact(facility.id, 'cook'),
              ),
            );
          if (facility.definitionId === 'rain-collector')
            row.append(
              button(uiText("ui.9f599419") + String(facility.water) + '/4', () =>
                interact(facility.id, 'water'),
              ),
            );
          if (facility.definitionId === 'field-lab')
            row.append(
              button(uiText("ui.a0e267af"), () => {
                close();
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { code: 'KeyU', bubbles: true }),
                );
              }),
              text('small', uiText("ui.fd27b058")),
            );
          if (facility.canonicalStructureId === null)
            row.append(
              button(uiText("ui.6459f038"), () => run('dismantle', facility.id)),
            );
          if (facility.canonicalStructureId)
            row.append(
              text(
                'small',
                facility.definitionId === 'supply-cache'
                  ? uiText("ui.67407e00")
                  : uiText("ui.450ff9be"),
              ),
            );
          panel.append(row);
        }
        for (const structure of bundle.buildings.exportSnapshot().foothold
          .structures) {
          if (
            (focusedEntity !== null && structure.structureId !== focusedEntity) ||
            structure.placedByPlayerId !== playerId ||
            state.facilities.some(
              (f) => f.canonicalStructureId === structure.structureId,
            )
          )
            continue;
          const row = document.createElement('article');
          row.dataset.expeditionFacility = structure.structureId;
          row.append(
            art(structure.definitionId),
            text('p', contentDisplayName(bundle.catalog.get(structure.definitionId))),
            button(uiText("ui.2521c188"), () =>
              selectRelocation(structure.structureId, structure.definitionId),
            ),
          );
          if (structure.definitionId === 'structure:habitat-room')
            row.append(
              text(
                'small',
                uiText("ui.62fe7013"),
              ),
            );
          panel.append(row);
        }
        if (!focusedEntity) panel.append(text('h2', uiText("ui.c10303c1")));
        for (const recipe of focusedEntity ? [] : EXPEDITION_RECIPES) {
          const row = document.createElement('article');
          row.append(text('p', uiPhrase(recipe.name)));
          costs(row, recipe.costs);
          if (recipe.station)
            row.append(text('small', uiText("ui.186c6b64")));
          row.append(
            button(uiText("ui.c8f02361"), () => {
              const result = authority.craft({
                id: 'sp-craft:' + crypto.randomUUID(),
                playerId,
                recipeId: recipe.id,
                expectedRevision: authority.read().revision,
                expectedInventoryRevision: bundle.items.getContainerView(
                  'inventory:' + playerId,
                ).revision,
              });
              feedback = result.message;
              signature = '';
              render();
            }),
          );
          panel.append(row);
        }
      }
      markers.replaceChildren();
      delete markers.dataset.buildRevision;
      const labMarker = button(uiText("ui.4ad23c58"), () => {
        open('landing-lab');
      });
      labMarker.className = 'sp-blueprint sp-outpost';
      labMarker.dataset.x = '0';
      labMarker.dataset.y = '0';
      markers.append(labMarker);
      bindEntityInspection(labMarker, () => ({id:'landing-lab',name:uiText("ui.ac637c4b"),kind:uiText("ui.8a87bf95"),facts:[uiText("ui.20c543db"),uiText("ui.f321724a")]}));
      for (const plan of state.plans) {
        const marker = button(
          uiPhrase(expeditionFacility(plan.definitionId)!.name) + uiText("ui.1b8e4e03"),
          () => open(plan.id),
        );
        marker.className = 'sp-blueprint';
        marker.dataset.planId = plan.id;
        marker.dataset.x = String(plan.x);
        marker.dataset.y = String(plan.y);
        markers.append(marker);
        bindEntityInspection(marker, () => {
          const current = authority.read().plans.find(v => v.id === plan.id); if (!current) return null;
          const definition = expeditionFacility(current.definitionId)!;
          return {id:plan.id,name:uiPhrase(definition.name),kind:uiText("ui.a1680200"),facts:definition.costs.map(([id,q]) => contentDisplayName(bundle.catalog.get(id))+': '+(current.paid[id]??0)+'/'+q)};
        });
      }
    }
    const viewport = bounds.read(), canvasRect = viewport.canvas,
      rootRect = viewport.root,
      camera = bundle.getPlayerPosition(playerId);
    renderPreview();
    for (const marker of Array.from(markers.children) as HTMLElement[]) {
      const point = projectPhase1Isometric(
        { x: Number(marker.dataset.x), y: Number(marker.dataset.y) },
        camera,
      );
      marker.hidden =
        Math.abs(point.x) > 340 ||
        Math.abs(point.y) > 210 ||
        (marker.dataset.managed === 'true' &&
          Math.hypot(
            Number(marker.dataset.x) - camera.x,
            Number(marker.dataset.y) - camera.y,
          ) > 4);
      marker.style.left =
        String(
          canvasRect.left -
            rootRect.left +
            ((point.x + 320) * canvasRect.width) / 640,
        ) + 'px';
      marker.style.top =
        String(
          canvasRect.top -
            rootRect.top +
            ((point.y + 180) * canvasRect.height) / 360,
        ) + 'px';
    }
  };
  const renderPreview = () => {
    if (!placement || !cursor) {
      ghost.hidden = true;
      return;
    }
    const viewport = bounds.read(), rect = viewport.canvas,
      base = viewport.root;
    const sx = ((cursor.x - rect.left) * 640) / rect.width,
      sy = ((cursor.y - rect.top) * 360) / rect.height;
    if (sx < 0 || sx > 640 || sy < 0 || sy > 360) {
      ghost.hidden = true;
      return;
    }
    const camera = bundle.getPlayerPosition(playerId),
      point = unprojectPhase1Isometric({ x: sx - 320, y: sy - 180 }, camera),
      position = placement.relocationId
        ? authority.relocationPosition(
            placement.relocationId,
            Math.round(point.x * 4) / 4,
            Math.round(point.y * 4) / 4,
            placement.orientation,
          )
        : authority.planPosition(placement.definition, Math.round(point.x * 4) / 4, Math.round(point.y * 4) / 4, placement.orientation),
      x = position.x,
      y = position.y;
    const key = JSON.stringify([
      placement,
      x,
      y,
      camera,
      rect.width,
      rect.height,
      Math.floor(bundle.authorityTick / 15),
    ]);
    if (key === previewSignature) {
      ghost.hidden = false;
      return;
    }
    previewSignature = key;
    const reason = placement.relocationId
        ? authority.assessRelocationPreview(
            playerId,
            placement.relocationId,
            x,
            y,
            placement.orientation,
          )
        : authority.assessPreview(
            playerId,
            placement.definition,
            x,
            y,
            placement.orientation,
            placement.planId,
          ),
      size = authority.previewFootprint(
        placement.definition,
        placement.orientation,
        placement.relocationId ?? placement.planId,
      )!;
    ghost.hidden = false;
    ghost.dataset.valid = String(reason === null);
    ghost.dataset.orientation = String(placement.orientation);
    ghost.dataset.x = String(x);
    ghost.dataset.y = String(y);
    ghost.dataset.reason = reason ?? '';
    const center = projectPhase1Isometric({ x, y }, camera);
    ghost.style.left =
      String(rect.left - base.left + ((center.x + 320) * rect.width) / 640) +
      'px';
    ghost.style.top =
      String(rect.top - base.top + ((center.y + 180) * rect.height) / 360) +
      'px';
    ghost.style.width = String((64 * rect.width) / 640) + 'px';
    ghost.style.height = String((64 * rect.height) / 360) + 'px';
    const points = [
      [-size.width / 2, -size.depth / 2],
      [size.width / 2, -size.depth / 2],
      [size.width / 2, size.depth / 2],
      [-size.width / 2, size.depth / 2],
    ].map(
      ([dx, dy]) =>
        String(32 + (dx! - dy!) * 16) + ',' + String(32 + (dx! + dy!) * 8),
    );
    outline.ownerSVGElement!.style.overflow = 'visible';
    ghost.dataset.footprintWidth=String(size.width);
    ghost.dataset.footprintDepth=String(size.depth);
    outline.setAttribute('d', 'M' + points.join('L') + 'Z');
    outline.setAttribute('stroke', reason ? '#eb9277' : '#ace5ce');
    outline.setAttribute('fill', reason ? '#eb927744' : '#ace5ce44');
    bindUiText(hint,"textContent",(reason ? describeFeedback(reason) : uiText("ui.dfacc6ec")) +
      (placement.definition === 'attached-habitat' ? uiText("ui.1971545d") : uiText("ui.c6669b3")));
  };
  const pointer = (event: PointerEvent) => {
    cursor = { x: event.clientX, y: event.clientY };
    renderPreview();
  };
  const click = (event: MouseEvent) => {
    if (
      !placement ||
      !(event.target instanceof Element) ||
      event.target.closest(
        '.p1-ui,.p2-settings,.p2-colony-controls,.lw-menu,.sp-expedition-panel,[data-colony-settings]',
      )
    )
      return;
    const rect = bounds.read().canvas;
    const x = ((event.clientX - rect.left) * 640) / rect.width,
      y = ((event.clientY - rect.top) * 360) / rect.height;
    if (x < 0 || x > 640 || y < 0 || y > 360) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const position = unprojectPhase1Isometric(
      { x: x - 320, y: y - 180 },
      bundle.getPlayerPosition(playerId),
    );
    if (
      run(
        placement.relocationId
          ? 'relocate'
          : placement.planId
            ? 'move'
            : 'plan',
        placement.relocationId ?? placement.planId ?? placement.definition,
        {
          x: Math.round(position.x * 4) / 4,
          y: Math.round(position.y * 4) / 4,
          orientation: placement.orientation,
        },
      )
    ) {
      placement = null;
      hint.hidden = true;
      ghost.hidden = true;
      open();
    } else
      bindUiText(hint,"textContent",describeFeedback(feedback) + uiText("ui.847bf822"));
  };
  const key = (event: KeyboardEvent) => {
    if (!opened && !placement) return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape') {
      close();
      placement = null;
      hint.hidden = true;
      ghost.hidden = true;
    } else if (event.code === 'KeyR' && placement) {
      placement.orientation = ((placement.orientation + 1) % 4) as
        0 | 1 | 2 | 3;
      bindUiText(hint,"textContent",uiText("ui.80d9fd33") +
        String(placement.orientation * 90) +
        uiText("ui.4ad001e1"));
      renderPreview();
    }
  };
  root.addEventListener('pointermove', pointer);
  root.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  return {
    open,
    close,
    cancelPlacement: () => { const active = placement !== null; if (placement) close(); return active; },
    render,
    destroy() {
      bounds.destroy();
      root.removeEventListener('pointermove', pointer);
      root.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      layer.remove();
      delete root.dataset.expeditionPanelOpen;
    },
  };
}
