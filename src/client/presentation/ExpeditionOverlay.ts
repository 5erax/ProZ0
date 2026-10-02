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
  itemIconSprite,
  PHASE1_PRODUCTION_WORLD_SPRITES,
} from './Phase1ProductionAssets';

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
  const style = document.createElement('style');
  style.textContent =
    '.sp-expedition{position:absolute;inset:0;pointer-events:none;z-index:1000010;font:12px monospace;color:#e8efdf}.sp-expedition-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(700px,92%);max-height:80%;overflow:auto;box-sizing:border-box;background:#0b1721f5;border:2px solid #8faaa2;padding:16px;pointer-events:auto}.sp-expedition-header{position:sticky;top:-16px;z-index:1;background:#0b1721;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0}.sp-expedition-header h2{margin:0}.sp-expedition button{font:inherit;background:#20343c;border:1px solid #839b94;color:inherit;padding:8px;cursor:pointer}.sp-expedition button:disabled{opacity:.4}.sp-expedition h2{margin:0 0 12px;font-size:17px}.sp-expedition article{border-bottom:1px solid #405655;padding:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sp-expedition small{color:#adc0af}.sp-expedition [role=status]{margin:8px;color:#efcb91}.sp-blueprint{position:absolute;pointer-events:auto;transform:translate(-50%,-100%);border:1px dashed #9ee4e4;background:#173b4590;color:#c9ffff;padding:4px;white-space:nowrap;font:11px monospace}.sp-outpost{border-style:solid;background:#182c2de0}.sp-placement-hint{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);background:#11252ded;border:1px solid #a6d8cc;padding:10px}.sp-cost{display:inline-flex;align-items:center;gap:4px}.sp-expedition-panel p{line-height:1.5}';
  const layer = document.createElement('section');
  layer.className = 'sp-expedition';
  layer.setAttribute('aria-label', 'Expedition construction');
  const markers = document.createElement('div'),
    panel = document.createElement('section'),
    hint = document.createElement('div');
  panel.className = 'sp-expedition-panel';
  hint.className = 'sp-placement-hint';
  panel.hidden = true;
  hint.hidden = true;
  layer.append(style, markers, panel, hint);
  root.append(layer);
  let opened = false,
    feedback = '',
    signature = '',
    placement: {
      definition: string;
      planId?: string;
      orientation: 0 | 1 | 2 | 3;
    } | null = null;
  const close = () => {
    authority.cancelRest(playerId);
    opened = false;
    panel.hidden = true;
    root.dataset.expeditionPanelOpen = 'false';
  };
  const button = (label: string, run: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      run();
    });
    return b;
  };
  const text = (tag: 'p' | 'h2' | 'small', value: string) => {
    const e = document.createElement(tag);
    e.textContent = value;
    return e;
  };
  const describeFeedback = (message: string): string => {
    if (message.startsWith('plan:'))
      return 'Blueprint placed. Bring materials and contribute what you carry.';
    const messages: Readonly<Record<string, string>> = {
      MATERIALS_DEPOSITED: 'Materials contributed. You can add more later.',
      PLAN_MOVED: 'Blueprint moved. Contributed materials are kept.',
      PLAN_REFUNDED:
        'Blueprint cancelled. Contributed materials returned to your bag.',
      FACILITY_COMPLETED: 'Outpost facility completed.',
      MATERIALS_MISSING:
        'Contribute the remaining materials before completing this facility.',
      NO_OUTSTANDING_MATERIALS_AVAILABLE:
        'Your bag has no remaining materials needed by this blueprint.',
      OUT_OF_RANGE: 'Move closer to this blueprint or facility.',
      PLAN_OVERLAP:
        'Choose a position clear of other blueprints and facilities.',
      REST_STARTED: 'Rest started. Stay still and safe to recover.',
      REST_COOLDOWN: 'You have rested recently. Wait before resting again.',
      FOOD_AND_WATER_REQUIRED:
        'You need at least 15 food and 15 water to rest safely.',
      HOSTILE_NEARBY: 'A hostile is nearby. Reach a safe place before resting.',
      SUPPLIES_ALREADY_CLAIMED:
        'You have already collected this world’s emergency supplies.',
      FACILITY_ACTION_COMPLETED:
        'Supplies collected or facility action completed.',
      NO_COLLECTED_WATER:
        'No water collected yet. This collector fills during local rain.',
      FOOD_FULL: 'You are already well fed.',
      CRAFTED: 'Item crafted and added to your bag.',
      NEARBY_FIELD_WORKBENCH_REQUIRED:
        'Use a nearby Field Workbench for this recipe.',
      SEED_COPIED: 'World seed copied.',
      STALE_REVISION: 'The world changed. Try this action again.',
      STALE_INVENTORY_REVISION:
        'Your inventory changed. Try this action again.',
      PLAN_LIMIT:
        'Too many unfinished blueprints. Complete or cancel one first.',
      FACILITY_LIMIT: 'This world has reached the expedition facility limit.',
      INSUFFICIENT_ITEMS: 'Gather the missing materials first.',
      TARGET_CAPACITY_WEIGHT:
        'Your bag is too heavy. Store or drop some items first.',
      TARGET_CAPACITY_VOLUME:
        'Your bag has no room. Store or drop some items first.',
      QUANTITY_UNAVAILABLE: 'Gather the missing materials first.',
      CAPACITY_EXCEEDED: 'Your bag is full. Store or drop some items first.',
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
      expectedInventoryRevision: bundle.items.getContainerView(
        'inventory:' + playerId,
      ).revision,
      action,
      target,
      ...extra,
    });
    feedback = result.message;
    signature = '';
    render();
    return result.status === 'committed';
  };
  const costs = (
    row: HTMLElement,
    entries: readonly (readonly [string, number])[],
    paid: Readonly<Record<string, number>> = {},
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
          bundle.catalog.get(id).displayName +
            ' ' +
            String(paid[id] ?? 0) +
            '/' +
            String(count),
        ),
      );
      row.append(cost);
    }
  };
  const selectPlacement = (definition: string, planId?: string) => {
    placement = { definition, ...(planId ? { planId } : {}), orientation: 0 };
    close();
    hint.hidden = false;
    hint.textContent =
      'Click nearby explored ground · R rotate · Escape cancel';
  };
  const open = () => {
    onOpen();
    opened = true;
    placement = null;
    hint.hidden = true;
    root.dataset.expeditionPanelOpen = 'true';
    signature = '';
    render();
  };
  const render = () => {
    if (root.dataset.colonySettingsOpen === 'true' && (opened || placement)) {
      close();
      placement = null;
      hint.hidden = true;
    }
    const state = authority.read(),
      inventory = bundle.items.getContainerView('inventory:' + playerId);
    const rest = authority.restStatus(playerId);
    const next = JSON.stringify([
      opened,
      state.plans,
      state.facilities.map((f) => ({ ...f, progress: 0 })),
      state.supplyClaimed,
      state.events,
      inventory.revision,
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
          text('h2', 'EXPEDITION · BLUEPRINTS & FIELD CRAFT'),
          button('Close', close),
        );
        panel.append(
          header,
          text('small', 'World seed: ' + bundle.config.worldSeed),
          button('Copy seed', () => {
            if (!navigator.clipboard) {
              feedback = 'Select the displayed seed to copy it.';
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
                feedback = 'Select the displayed seed to copy it.';
                signature = '';
                render();
              });
          }),
          text(
            'p',
            'Place a blueprint first. Bring supplies later, contribute what you carry, then complete it. Moving keeps contributed materials; cancel refunds them when your bag has room.',
          ),
        );
        const event = authority.currentEvent(
          bundle.getPlayerPosition(playerId),
        );
        if (event)
          panel.append(
            text('small', 'Local ecology: ' + event.replaceAll('-', ' ')),
          );
        if (state.events.length) {
          const history = document.createElement('details'),
            summary = document.createElement('summary');
          summary.textContent = 'Observed ecology history';
          history.append(summary);
          for (const e of state.events.slice(-8).toReversed())
            history.append(
              text(
                'p',
                e.kind.replaceAll('-', ' ') +
                  ' · region ' +
                  e.region +
                  ' · active minute ' +
                  String(Math.floor(e.tick / 3600)),
              ),
            );
          panel.append(history);
        }
        const status = text('p', describeFeedback(feedback));
        status.dataset.result = feedback;
        status.setAttribute('role', 'status');
        panel.append(status);
        for (const def of EXPEDITION_FACILITIES) {
          const row = document.createElement('article');
          row.append(text('p', def.name));
          costs(row, def.costs);
          row.append(
            button('Plan', () => selectPlacement(def.id)),
            text('small', def.purpose),
          );
          panel.append(row);
        }
        for (const plan of state.plans) {
          const def = expeditionFacility(plan.definitionId)!;
          const row = document.createElement('article');
          row.dataset.expeditionPlan = plan.id;
          row.append(
            text(
              'p',
              def.name + ' · ' + String(plan.x) + ', ' + String(plan.y),
            ),
          );
          costs(row, def.costs, plan.paid);
          row.append(
            button('Contribute', () => run('deposit', plan.id)),
            button('Complete', () => run('complete', plan.id)),
            button('Move', () => selectPlacement(def.id, plan.id)),
            button('Cancel & refund', () => run('cancel', plan.id)),
          );
          panel.append(row);
        }
        panel.append(text('h2', 'FACILITIES & LANDING LAB'));
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
        lab.append(
          text('p', 'Landing Laboratory'),
          button('Sleep / rest · 8s', () => interact('landing-lab', 'rest')),
          button('Emergency supplies · once', () =>
            interact('landing-lab', 'supplies'),
          ),
          button('Research [U]', () => {
            close();
            document.dispatchEvent(
              new KeyboardEvent('keydown', { code: 'KeyU', bubbles: true }),
            );
          }),
          text(
            'small',
            'Recover +15 health / +40 stamina for 5 food + 5 water. Moving, damage or danger cancels rest.',
          ),
        );
        panel.append(lab);
        if (rest)
          panel.append(
            text(
              'p',
              'Resting · ' +
                String(Math.ceil(rest.remainingTicks / 60)) +
                's remaining',
            ),
            button('Wake up', () => {
              authority.cancelRest(playerId);
              signature = '';
              render();
            }),
          );
        for (const facility of state.facilities) {
          const row = document.createElement('article');
          row.append(
            text('p', expeditionFacility(facility.definitionId)!.name),
          );
          if (facility.definitionId === 'camp-bed')
            row.append(
              button('Sleep / rest', () => interact(facility.id, 'rest')),
            );
          if (facility.definitionId === 'campfire')
            row.append(
              button('Cook meal · 1 plant + 1 water', () =>
                interact(facility.id, 'cook'),
              ),
            );
          if (facility.definitionId === 'rain-collector')
            row.append(
              button('Collect water · ' + String(facility.water) + '/4', () =>
                interact(facility.id, 'water'),
              ),
            );
          if (facility.definitionId === 'field-lab')
            row.append(
              button('Research [U]', () => {
                close();
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { code: 'KeyU', bubbles: true }),
                );
              }),
              text('small', 'Research within 4 m'),
            );
          if (facility.canonicalStructureId)
            row.append(
              text(
                'small',
                facility.definitionId === 'supply-cache'
                  ? 'Open inventory [I] nearby to store stacks'
                  : 'Use Craft [C] nearby for station recipes',
              ),
            );
          panel.append(row);
        }
        panel.append(text('h2', 'FIELD CRAFT'));
        for (const recipe of EXPEDITION_RECIPES) {
          const row = document.createElement('article');
          row.append(text('p', recipe.name));
          costs(row, recipe.costs);
          if (recipe.station)
            row.append(text('small', 'Field Workbench within 2 m'));
          row.append(
            button('Craft', () => {
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
      const labMarker = button('Landing Lab · interact', open);
      labMarker.className = 'sp-blueprint sp-outpost';
      labMarker.dataset.x = '0';
      labMarker.dataset.y = '0';
      markers.append(labMarker);
      for (const plan of state.plans) {
        const marker = button(
          expeditionFacility(plan.definitionId)!.name + ' · blueprint',
          open,
        );
        marker.className = 'sp-blueprint';
        marker.dataset.planId = plan.id;
        marker.dataset.x = String(plan.x);
        marker.dataset.y = String(plan.y);
        markers.append(marker);
      }
      for (const facility of state.facilities.filter(
        (f) => f.canonicalStructureId === null,
      )) {
        const marker = button(
          expeditionFacility(facility.definitionId)!.name,
          open,
        );
        marker.className = 'sp-blueprint sp-outpost';
        const sprite = document.createElement('span');
        applyProductionSprite(
          sprite,
          PHASE1_PRODUCTION_WORLD_SPRITES.workbench,
          0.5,
        );
        marker.prepend(sprite);
        marker.dataset.x = String(facility.x);
        marker.dataset.y = String(facility.y);
        markers.append(marker);
      }
    }
    const canvasRect = canvas.getBoundingClientRect(),
      rootRect = root.getBoundingClientRect(),
      camera = bundle.getPlayerPosition(playerId);
    for (const marker of Array.from(markers.children) as HTMLElement[]) {
      const point = projectPhase1Isometric(
        { x: Number(marker.dataset.x), y: Number(marker.dataset.y) },
        camera,
      );
      marker.hidden = Math.abs(point.x) > 340 || Math.abs(point.y) > 210;
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
  const click = (event: MouseEvent) => {
    if (
      !placement ||
      !(event.target instanceof Element) ||
      event.target.closest(
        '.p1-ui,.p2-colony-controls,.sp-expedition-panel,.sp-blueprint,[data-colony-settings]',
      )
    )
      return;
    const rect = canvas.getBoundingClientRect();
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
        placement.planId ? 'move' : 'plan',
        placement.planId ?? placement.definition,
        {
          x: Math.round(position.x * 4) / 4,
          y: Math.round(position.y * 4) / 4,
          orientation: placement.orientation,
        },
      )
    ) {
      placement = null;
      hint.hidden = true;
      open();
    } else
      hint.textContent =
        describeFeedback(feedback) + ' · choose a different position';
  };
  const key = (event: KeyboardEvent) => {
    if (!opened && !placement) return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.code === 'Escape') {
      close();
      placement = null;
      hint.hidden = true;
    } else if (event.code === 'KeyR' && placement) {
      placement.orientation = ((placement.orientation + 1) % 4) as
        | 0
        | 1
        | 2
        | 3;
      hint.textContent =
        'Orientation ' +
        String(placement.orientation * 90) +
        '° · click ground';
    }
  };
  root.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  return {
    open,
    close,
    render,
    destroy() {
      root.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      layer.remove();
      delete root.dataset.expeditionPanelOpen;
    },
  };
}
