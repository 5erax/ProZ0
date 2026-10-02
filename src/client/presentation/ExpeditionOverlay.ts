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
    '.sp-expedition{position:absolute;inset:0;pointer-events:none;z-index:1000010;font:12px monospace;color:#e8efdf}.sp-expedition-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(700px,92%);max-height:80%;overflow:auto;box-sizing:border-box;background:#0b1721f5;border:2px solid #8faaa2;padding:16px;pointer-events:auto}.sp-expedition-header{position:sticky;top:-16px;z-index:1;background:#0b1721;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0}.sp-expedition-header h2{margin:0}.sp-ghost{position:absolute;pointer-events:none;transform:translate(-50%,-50%);width:64px;height:64px;z-index:1}.sp-ghost svg{position:absolute;inset:0}.sp-ghost .sp-facility-art{position:absolute;left:16px;bottom:20px;opacity:.65}.sp-expedition button{font:inherit;background:#20343c;border:1px solid #839b94;color:inherit;padding:8px;cursor:pointer}.sp-expedition button:disabled{opacity:.4}.sp-expedition h2{margin:0 0 12px;font-size:17px}.sp-expedition article{border-bottom:1px solid #405655;padding:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sp-expedition small{color:#adc0af}.sp-expedition [role=status]{margin:8px;color:#efcb91}.sp-blueprint{position:absolute;pointer-events:auto;transform:translate(-50%,-100%);border:1px dashed #9ee4e4;background:#173b4590;color:#c9ffff;padding:4px;white-space:nowrap;font:11px monospace}.sp-outpost{border-style:solid;background:#182c2de0}.sp-placement-hint{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);background:#11252ded;border:1px solid #a6d8cc;padding:10px}.sp-cost{display:inline-flex;align-items:center;gap:4px}.sp-expedition-panel p{line-height:1.5}';
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
    panel.hidden = true;
    ghost.hidden = true;
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
      FACILITY_RELOCATED:
        'Building moved. Stored items and production are preserved.',
      STALE_BUILD_REVISION: 'Buildings changed. Choose the position again.',
      NOT_STRUCTURE_OWNER: 'Only the builder can move this building.',
      LANDMARK_IMMOVABLE: 'The landing lab is a fixed world landmark.',
      PLAYER_INSIDE: 'Leave this building before moving it.',
      CONNECTOR_REQUIRED:
        'Attached habitat: use R to choose a landing connector.',
      FACILITY_DISMANTLED:
        'Facility removed. Building materials returned to your bag.',
      COLLECT_WATER_FIRST:
        'Collect the stored water before dismantling this collector.',
      USE_CANONICAL_DISMANTLE:
        'Use the existing building dismantle action; empty storage first.',
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
      expectedBuildRevision: bundle.buildings.getBuildRevision(),
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
          bundle.catalog.get(id).displayName +
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
    hint.textContent =
      'Click nearby explored ground · R rotate · Escape cancel';
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
    hint.textContent =
      info.shape === 'structure:habitat-room'
        ? 'Attached habitat · R selects connector · click to confirm'
        : 'Move building · choose nearby ground · R rotate · Escape cancel';
  };
  const open = (focus?: string) => {
    onOpen();
    opened = true;
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
          row.append(art(def.id), text('p', def.name));
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
          row.append(art(def.id));
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
        lab.dataset.expeditionLab = 'true';
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
          row.dataset.expeditionFacility = facility.id;
          row.append(
            art(facility.definitionId),
            button('Move / rotate', () =>
              selectRelocation(facility.id, facility.definitionId),
            ),
          );
          row.append(
            text('p', expeditionFacility(facility.definitionId)!.name),
          );
          if (
            facility.definitionId === 'camp-bed' ||
            facility.definitionId === 'field-cabin'
          )
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
          if (facility.canonicalStructureId === null)
            row.append(
              button('Dismantle & refund', () => run('dismantle', facility.id)),
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
        for (const structure of bundle.buildings.exportSnapshot().foothold
          .structures) {
          if (
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
            text('p', bundle.catalog.get(structure.definitionId).displayName),
            button('Move / rotate', () =>
              selectRelocation(structure.structureId, structure.definitionId),
            ),
          );
          if (structure.definitionId === 'structure:habitat-room')
            row.append(
              text(
                'small',
                'Attached module: R selects another lab connector. Field cabins can be built independently.',
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
      delete markers.dataset.buildRevision;
      const labMarker = button('Landing Lab · interact', () => {
        open();
        panel
          .querySelector('[data-expedition-lab]')
          ?.scrollIntoView({ block: 'center' });
      });
      labMarker.className = 'sp-blueprint sp-outpost';
      labMarker.dataset.x = '0';
      labMarker.dataset.y = '0';
      markers.append(labMarker);
      for (const plan of state.plans) {
        const marker = button(
          expeditionFacility(plan.definitionId)!.name + ' · blueprint',
          () => open(plan.id),
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
          () => open(facility.id),
        );
        marker.className = 'sp-blueprint sp-outpost';
        const sprite = art(facility.definitionId);
        marker.prepend(sprite);
        marker.dataset.x = String(facility.x);
        marker.dataset.y = String(facility.y);
        markers.append(marker);
      }
    }
    // Management markers stay contextual rather than covering distant structures.
    if (
      markers.dataset.buildRevision !==
      String(bundle.buildings.getBuildRevision())
    ) {
      markers.querySelectorAll('[data-managed]').forEach((e) => e.remove());
      for (const structure of bundle.buildings.exportSnapshot().foothold
        .structures) {
        if (structure.placedByPlayerId !== playerId) continue;
        const facility = state.facilities.find(
          (f) => f.canonicalStructureId === structure.structureId,
        );
        const manage = button(
          bundle.catalog.get(structure.definitionId).displayName + ' · manage',
          () => open(facility?.id ?? structure.structureId),
        );
        manage.className = 'sp-blueprint';
        manage.dataset.managed = 'true';
        manage.dataset.x = String(structure.position.x);
        manage.dataset.y = String(structure.position.y);
        markers.append(manage);
      }
      markers.dataset.buildRevision = String(
        bundle.buildings.getBuildRevision(),
      );
    }
    const canvasRect = canvas.getBoundingClientRect(),
      rootRect = root.getBoundingClientRect(),
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
    const rect = canvas.getBoundingClientRect(),
      base = root.getBoundingClientRect();
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
        : { x: Math.round(point.x * 4) / 4, y: Math.round(point.y * 4) / 4 },
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
    outline.setAttribute('d', 'M' + points.join('L') + 'Z');
    outline.setAttribute('stroke', reason ? '#eb9277' : '#ace5ce');
    outline.setAttribute('fill', reason ? '#eb927744' : '#ace5ce44');
    hint.textContent =
      (reason ? describeFeedback(reason) : 'Valid ground') +
      ' · R rotate · Escape cancel';
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
        '.p1-ui,.p2-colony-controls,.sp-expedition-panel,[data-colony-settings]',
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
      ghost.hidden = true;
    } else if (event.code === 'KeyR' && placement) {
      placement.orientation = ((placement.orientation + 1) % 4) as
        0 | 1 | 2 | 3;
      hint.textContent =
        'Orientation ' +
        String(placement.orientation * 90) +
        '° · click ground';
      renderPreview();
    }
  };
  root.addEventListener('pointermove', pointer);
  root.addEventListener('click', click, true);
  document.addEventListener('keydown', key, true);
  return {
    open,
    close,
    render,
    destroy() {
      root.removeEventListener('pointermove', pointer);
      root.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      layer.remove();
      delete root.dataset.expeditionPanelOpen;
    },
  };
}
