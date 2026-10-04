import { industryText } from '../localization/IndustryMessages';
import { locale, onLocaleChange } from '../localization/Locale';
import { worldDepthOrder } from '../presentation/WorldDepth';
import {
  INDUSTRY_FACILITIES,
  INDUSTRY_ITEM_IDS,
  INDUSTRY_RECIPES,
  INDUSTRY_RESEARCH,
  INDUSTRY_BUILD_RANGE,
  INDUSTRY_INTERACTION_RANGE,
  INDUSTRY_RESEARCH_RANGE,
  INDUSTRY_CONVEYOR_RANGE,
  INDUSTRY_CONVEYOR_COSTS,
  INDUSTRY_REPAIR_COSTS,
  INDUSTRY_ROVER_DRIVE_RANGE,
  type IndustryCost,
  type IndustryFacilityKind,
} from '../../content/phase3/IndustryContent';
import type { IndustryCommand } from '../../simulation/industry/IndustryAuthority';
import type { IndustryState } from '../../simulation/industry/IndustryState';

export type IndustryIntent = Omit<
  IndustryCommand,
  'operationId' | 'playerId' | 'expectedRevision' | 'expectedInventoryRevision'
>;

export type IndustryPanelResult =
  | { readonly status: 'committed'; readonly entityId?: string }
  | { readonly status: 'rejected'; readonly reason: string };

export interface IndustryPanelAdapter {
  read(): IndustryState | null;
  inventory(): readonly IndustryCost[];
  position(): { readonly x: number; readonly y: number } | null;
  command(intent: IndustryIntent): IndustryPanelResult | Promise<IndustryPanelResult>;
  ready?(): boolean;
  /** Canonical raster stage for world markers; management UI stays in physical pixels. */
  markerHost?: HTMLElement | undefined;
  colonyResearchIds?(): readonly string[];
  onOpen?(): void;
  /** Root-relative CSS pixels. Return null for unexplored or offscreen ground. */
  project?(position: { readonly x: number; readonly y: number }): {
    readonly x: number;
    readonly y: number;
    readonly visible?: boolean;
  } | null;
}

export interface IndustryPanelHandle {
  open(facilityId?: string): void;
  close(): void;
  update(): void;
  destroy(): void;
}

type Tab = 'build' | 'production' | 'networks' | 'research';
type Facility = IndustryState['facilities'][number];

const REASONS: Readonly<Record<string, string>> = {
  OUT_OF_RANGE: 'Move closer to this facility. Management range is 2.5 units.',
  INSUFFICIENT_ITEMS: 'Gather the missing materials first.',
  QUANTITY_UNAVAILABLE: 'Your bag no longer contains this quantity.',
  STALE_REVISION: 'The colony changed. Try the action again.',
  STALE_INVENTORY_REVISION: 'Your bag changed. Try the action again.',
  RESEARCH_REQUIRED: 'Complete the required research first.',
  PREREQUISITE_REQUIRED: 'Complete the prerequisite research first.',
  COLONY_RESEARCH_REQUIRED: 'Complete the required colony research first.',
  CAPACITY_EXCEEDED: 'The destination is full. Unload some items first.',
  BUFFER_FULL: 'The facility buffer is full. Unload some items first.',
  FACILITY_MISSING: 'This facility no longer exists.',
  INVALID_PLACEMENT: 'Choose explored, dry, unobstructed ground nearby.',
  PLACEMENT_BLOCKED: 'Choose ground clear of other structures.',
  LINK_TOO_LONG: 'Conveyor endpoints must be within 8 world units.',
  ROVER_BLOCKED: 'The rover route is obstructed. Choose another destination.',
  ENERGY_REQUIRED: 'Charge the rover inside a powered network first.',
  ENERGY_LOW: 'Charge the rover inside a powered network first.',
  PATH_BLOCKED: 'This route is obstructed. Choose another destination.',
  DRIVE_RANGE: 'Choose a different destination within 8 world units.',
  DISCONNECT_CONVEYORS: 'Disconnect this rover’s conveyors before driving.',
  RETURN_TO_BASE: 'Return near the Landing Lab to research industry.',
  RESEARCH_PREREQUISITE: 'Complete the required industry and colony research first.',
  INSUFFICIENT_STOCK: 'The facility no longer holds this quantity.',
  ITEM_NOT_SUPPORTED: 'This item cannot be stored in an industrial buffer.',
  UNLOAD_FIRST: 'Unload this facility’s material buffer before dismantling.',
  EMPTY_BUFFER_FIRST: 'Unload this facility’s material buffer before dismantling.',
  DISCONNECT_FIRST: 'Disconnect this facility’s conveyors before dismantling.',
  TARGET_CAPACITY_WEIGHT: 'Your bag is too heavy. Store some supplies first.',
  TARGET_CAPACITY_VOLUME: 'Your bag is full. Store some supplies first.',
};

function itemName(id: string): string {
  return id.replace(/^item:/, '').replaceAll('-', ' ');
}

function readableReason(reason: string): string {
  return REASONS[reason] ?? reason.replaceAll('_', ' ').toLowerCase();
}

// Each silhouette is code-native pixel geometry; no decorative bitmap or game authority.
function silhouette(kind: IndustryFacilityKind): string {
  const base = '<path fill="#172b32" d="M3 26h26v5H3z"/><path fill="#8caaa4" d="M6 24h20v3H6z"/>';
  const shapes: Readonly<Record<IndustryFacilityKind, string>> = {
    'solar-array': '<path fill="#89c9d5" d="M4 7h24v14H4z"/><path fill="#315e77" d="M6 9h8v4H6zm10 0h10v4H16zM6 15h8v4H6zm10 0h10v4H16z"/><path fill="#dce6c1" d="M14 21h4v4h-4z"/>',
    'power-relay': '<path fill="#c3cda3" d="M13 7h6v18h-6zM8 10h16v4H8z"/><path fill="#e8c579" d="M10 4h12v4H10z"/>',
    depot: '<path fill="#ae926a" d="M5 11h22v14H5z"/><path fill="#dac79c" d="M5 11h22v4H5zM14 15h4v10h-4z"/><path fill="#52675a" d="M7 7h18v4H7z"/>',
    'fiber-processor': '<path fill="#a7b89d" d="M6 10h20v15H6z"/><path fill="#405d66" d="M9 14h7v8H9z"/><path fill="#d0be86" d="M18 12h5v4h-5zM2 18h5v4H2zM26 18h5v4h-5z"/>',
    fabricator: '<path fill="#879c9d" d="M5 12h23v13H5z"/><path fill="#bbcbcb" d="M8 7h4v5H8zM20 3h5v9h-5z"/><path fill="#d0af6e" d="M9 16h9v6H9z"/><path fill="#3b5963" d="M21 15h4v8h-4z"/>',
    greenhouse: '<path fill="#80b0b0" d="M4 12h24v13H4zM8 8h16v4H8zM12 5h8v3h-8z"/><path fill="#37595c" d="M7 14h18v9H7z"/><path fill="#a6c382" d="M10 16h4v6h-4zM18 17h4v5h-4z"/><path fill="#d4e7dc" d="M15 8h2v17h-2z"/>',
    rover: '<path fill="#a9bba5" d="M4 15h24v9H4zM15 8h10v7H15z"/><path fill="#527c87" d="M17 10h6v5h-6z"/><path fill="#d2be89" d="M6 11h7v4H6z"/><path fill="#17252d" d="M6 23h6v6H6zM21 23h6v6h-6z"/>',
  };
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">' + base + shapes[kind] + '</svg>';
}

/** Read-only projection with a command adapter shared by solo and hosted play. */
export function createIndustryPanel(
  root: HTMLElement,
  adapter: IndustryPanelAdapter,
): IndustryPanelHandle {
  const document = root.ownerDocument;
  const style = document.createElement('style');
  style.textContent = `
    .industry-layer{position:absolute;inset:0;pointer-events:none;z-index:1000011;font:12px monospace;color:#edf3de}
    .industry-launch{position:absolute;right:12px;top:108px;pointer-events:auto}
    .industry-layer button,.industry-layer input,.industry-layer select{font:inherit;box-sizing:border-box;background:#193039;color:#edf3de;border:1px solid #91a89b;padding:8px;min-height:34px}
    .industry-layer button{cursor:pointer}.industry-layer button:disabled{opacity:.5;cursor:default}.industry-layer :focus-visible{outline:2px solid #edcd83;outline-offset:2px}
    .industry-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;z-index:10;width:min(860px,94vw);max-height:86vh;overflow:auto;box-sizing:border-box;background:#0c1b24fa;border:2px solid #a8bcac;padding:16px;box-shadow:0 8px 30px #0008}
    .industry-dialog[hidden],.industry-marker[hidden]{display:none}.industry-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.industry-header h2{font-size:18px;margin:0}
    .industry-tabs{display:flex;gap:5px;flex-wrap:wrap;margin:12px 0}.industry-tabs [aria-selected=true]{background:#435f59;border-color:#d1ddba}
    .industry-summary{color:#bbcfbf;line-height:1.5;margin:8px 0}.industry-content{display:grid;gap:10px}.industry-card{border:1px solid #486459;padding:12px;min-width:0}.industry-card h3{font-size:14px;margin:0 0 8px}.industry-card p{line-height:1.5;margin:6px 0}
    .industry-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr));gap:10px}.industry-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}.industry-row label{display:flex;align-items:center;gap:6px}.industry-row input[type=number]{width:84px}.industry-row select{max-width:100%}
    .industry-cost{display:block;font-size:11px;color:#c5d4c3}.industry-cost[data-affordable=false]{color:#e5b785}.industry-status{padding:9px;border-left:3px solid #d9bd79;color:#efd8aa;line-height:1.5;min-height:18px}.industry-status:empty{padding:0;min-height:0;border:0}
    .industry-buffer{width:100%;border-collapse:collapse}.industry-buffer th,.industry-buffer td{text-align:left;padding:6px;border-bottom:1px solid #38574f}.industry-buffer button{padding:5px;min-height:30px}.industry-progress{width:100%;accent-color:#afc789}.industry-small{font-size:11px;color:#b6cbbb}
    .industry-marker{font:10px monospace;color:#edf3de;position:absolute;transform:translate(-50%,-100%);pointer-events:auto;padding:0!important;border:0!important;min-height:0!important;background:transparent!important;filter:drop-shadow(0 3px 0 #101b27a0);z-index:2}.industry-marker svg{display:block;width:44px;height:44px;shape-rendering:crispEdges;image-rendering:pixelated}.industry-marker[data-powered=true] svg{filter:drop-shadow(0 0 2px #9bcbaf)}.industry-marker[data-worn=true]::after{content:'!';position:absolute;right:0;top:0;background:#a25e40;color:#fff;padding:1px 4px}.industry-marker[data-selected=true]{outline:1px dashed #e5d09a}
    .industry-marker-state{display:none;background:#10242ade;border:1px solid #637e70;white-space:nowrap;padding:2px 4px;font-size:9px}.industry-marker:focus-visible .industry-marker-state{display:block}.industry-marker[data-kind=rover] svg{width:40px;height:40px}
    @media(max-width:700px){.industry-launch{top:112px;right:6px;font-size:10px}.industry-dialog{padding:10px;max-height:88vh;font-size:11px}.industry-header h2{font-size:15px}.industry-card{padding:9px}.industry-tabs button{padding:6px}.industry-marker svg{width:34px;height:34px}.industry-marker-state{font-size:8px}}
  `;
  const layer = document.createElement('section');
  layer.className = 'industry-layer';
  layer.setAttribute('aria-label', industryText('INDUSTRY'));
  const markers = document.createElement('div');
  markers.dataset.industryMarkers = '';
  const routes = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  routes.dataset.industryRoutes = '';
  routes.setAttribute('aria-hidden', 'true');
  routes.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:calc(80000 - var(--world-camera-depth,0))';
  markers.append(routes);
  const routeNodes = new Map<string, SVGLineElement>();
  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'industry-launch';
  launcher.textContent = industryText('Industry · O');
  launcher.setAttribute('aria-controls', 'proz0-industry-dialog');
  launcher.setAttribute('aria-expanded', 'false');
  const dialog = document.createElement('section');
  dialog.id = 'proz0-industry-dialog';
  dialog.className = 'industry-dialog';
  dialog.dataset.industryPanel = '';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', industryText('Industry management'));
  dialog.hidden = true;
  layer.append(style, launcher, dialog);
  if (adapter.markerHost) { markers.style.display = 'contents'; adapter.markerHost.append(markers); }
  else layer.append(markers);
  root.append(layer);
  let opened = false;
  let destroyed = false;
  let busy = false;
  let pointerHeld = false;
  let tab: Tab = 'build';
  let selectedFacility = '';
  let feedback = '';
  let signature = '';
  let restoreFocus: HTMLElement | null = null;
  const draft = { x: '2', y: '0', source: '', destination: '', filter: '', driveX: '', driveY: '' };
  const markerNodes = new Map<string, HTMLButtonElement>();
  const text = (tag: 'p' | 'h2' | 'h3' | 'span', value: string, className = '') => {
    const node = document.createElement(tag);
    node.textContent = industryText(value);
    if (className) node.className = className;
    return node;
  };
  const ready = () => !busy && adapter.ready?.() !== false;
  const playerDistance = (facility: Facility) => {
    const player = adapter.position();
    return player ? Math.hypot(player.x - facility.position.x, player.y - facility.position.y) : Infinity;
  };
  const available = (id: string) => adapter.inventory().filter((i) => i.itemDefinitionId === id).reduce((total, i) => total + i.quantity, 0);
  const afford = (costs: readonly IndustryCost[]) => costs.every((cost) => available(cost.itemDefinitionId) >= cost.quantity);
  const costLabel = (costs: readonly IndustryCost[]) => costs.map((cost) => itemName(cost.itemDefinitionId) + ' ' + String(available(cost.itemDefinitionId)) + '/' + String(cost.quantity)).join(' · ');
  const button = (label: string, id: string, run: () => void, enabled = true) => {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = industryText(label);
    node.dataset.industryControl = id;
    node.disabled = !enabled || !ready();
    node.addEventListener('click', run);
    return node;
  };
  const card = (title: string) => {
    const node = document.createElement('article');
    node.className = 'industry-card';
    node.append(text('h3', title));
    return node;
  };
  const costs = (parent: HTMLElement, values: readonly IndustryCost[]) => {
    const node = text('p', costLabel(values), 'industry-cost');
    node.dataset.affordable = String(afford(values));
    parent.append(node);
  };
  const row = () => {
    const node = document.createElement('div');
    node.className = 'industry-row';
    return node;
  };
  const select = (label: string, id: string, entries: readonly { value: string; name: string }[], value: string, change: (value: string) => void) => {
    const wrapper = document.createElement('label');
    wrapper.append(document.createTextNode(industryText(label) + ' '));
    const node = document.createElement('select');
    node.dataset.industryControl = id;
    node.setAttribute('aria-label', industryText(label));
    for (const entry of entries) {
      const option = document.createElement('option');
      option.value = entry.value;
      option.textContent = industryText(entry.name);
      node.append(option);
    }
    node.value = value;
    node.disabled = !ready();
    node.addEventListener('change', () => { change(node.value); signature = ''; render(true); });
    wrapper.append(node);
    return wrapper;
  };
  const coordinate = (label: string, id: string, value: string, change: (value: string) => void) => {
    const wrapper = document.createElement('label');
    wrapper.append(document.createTextNode(industryText(label) + ' '));
    const node = document.createElement('input');
    node.type = 'number';
    node.step = '0.5';
    node.value = value;
    node.setAttribute('aria-label', industryText(label));
    node.dataset.industryControl = id;
    node.disabled = !ready();
    node.addEventListener('input', () => change(node.value));
    wrapper.append(node);
    return wrapper;
  };
  const run = async (intent: IndustryIntent, success: string) => {
    if (!ready()) return;
    busy = true;
    feedback = 'Submitting…';
    signature = '';
    render(true);
    try {
      const result = await adapter.command(intent);
      if (destroyed) return;
      feedback = result.status === 'committed' ? success : readableReason(result.reason);
      if (result.status === 'committed' && result.entityId && intent.action === 'build') {
        selectedFacility = result.entityId;
        tab = 'production';
      }
    } catch {
      if (destroyed) return;
      feedback = 'The command could not reach the colony. Reconnect and try again.';
    } finally {
      busy = false;
      if (!destroyed) { signature = ''; render(true); }
    }
  };

  const close = () => {
    opened = false;
    dialog.hidden = true;
    launcher.hidden = false;
    markers.inert = false;
    root.dataset.industryOpen = 'false';
    launcher.setAttribute('aria-expanded', 'false');
    if (restoreFocus?.isConnected) restoreFocus.focus();
    else launcher.focus();
  };
  const open = (facilityId?: string) => {
    adapter.onOpen?.();
    if (!opened) restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (facilityId) { selectedFacility = facilityId; tab = 'production'; }
    opened = true;
    dialog.hidden = false;
    launcher.hidden = true;
    markers.inert = true;
    root.dataset.industryOpen = 'true';
    launcher.setAttribute('aria-expanded', 'true');
    signature = '';
    render(true);
    dialog.querySelector<HTMLElement>('h2')?.focus();
  };

  const renderBuild = (content: HTMLElement, state: IndustryState) => {
    const player = adapter.position();
    content.append(text('p', 'Research automation, then build a solar array and processor. Load raw materials, choose a recipe and keep the machine powered. Construction uses materials in your bag.', 'industry-summary'));
    if (!state.researchIds.includes('automation')) content.append(button('Open industry research', 'start-research', () => { tab = 'research'; signature = ''; render(true); }));
    const placement = card('Placement near your colonist');
    const coordinates = row();
    coordinates.append(
      coordinate('Offset X', 'build-x', draft.x, (value) => { draft.x = value; }),
      coordinate('Offset Y', 'build-y', draft.y, (value) => { draft.y = value; }),
    );
    placement.append(coordinates, text('p', 'Offsets are world units from your current position. Build within ' + String(INDUSTRY_BUILD_RANGE) + ' units, on explored dry ground clear of obstacles.', 'industry-small'));
    if (player) placement.append(text('p', 'Your position: ' + player.x.toFixed(1) + ', ' + player.y.toFixed(1), 'industry-small'));
    content.append(placement);
    const grid = document.createElement('div');
    grid.className = 'industry-grid';
    for (const definition of Object.values(INDUSTRY_FACILITIES)) {
      const node = card(definition.name);
      node.dataset.industryFacilityKind = definition.id;
      node.append(text('p', definition.description));
      costs(node, definition.costs);
      const researched = !definition.requiredResearch || state.researchIds.includes(definition.requiredResearch);
      if (!researched) node.append(text('p', 'Requires: ' + (INDUSTRY_RESEARCH.find((r) => r.id === definition.requiredResearch)?.name ?? definition.requiredResearch), 'industry-small'));
      node.append(button('Build ' + definition.name, 'build-' + definition.id, () => {
        const current = adapter.position();
        const x = Number(draft.x), y = Number(draft.y);
        if (!current || !draft.x.trim() || !draft.y.trim() || !Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > INDUSTRY_BUILD_RANGE) {
          feedback = 'Enter valid offsets within ' + String(INDUSTRY_BUILD_RANGE) + ' world units.'; signature = ''; render(true); return;
        }
        void run({ action: 'build', facilityKind: definition.id, position: { x: current.x + x, y: current.y + y } }, definition.name + ' built.');
      }, researched && afford(definition.costs) && player !== null));
      grid.append(node);
    }
    content.append(grid);
  };

  const facilityName = (facility: Facility) => INDUSTRY_FACILITIES[facility.kind].name + ' · ' + facility.id.slice(-6);
  const renderProduction = (content: HTMLElement, state: IndustryState) => {
    if (!state.facilities.length) {
      content.append(text('p', 'Build your first facility in Construction.'));
      return;
    }
    if (!state.facilities.some((facility) => facility.id === selectedFacility)) selectedFacility = state.facilities[0]!.id;
    const facility = state.facilities.find((f) => f.id === selectedFacility)!;
    const nearby = playerDistance(facility) <= INDUSTRY_INTERACTION_RANGE;
    const chooser = row();
    chooser.append(select('Facility', 'facility', state.facilities.map((f) => ({ value: f.id, name: facilityName(f) })), facility.id, (value) => { selectedFacility = value; draft.driveX = ''; draft.driveY = ''; }));
    content.append(chooser);
    const machine = card(INDUSTRY_FACILITIES[facility.kind].name);
    machine.dataset.industrySelectedFacility = facility.id;
    const powerStatus = facility.powered ? 'powered' : facility.networkId === null ? 'no power' : facility.status === 'UNPOWERED' ? 'network capacity unavailable' : 'network connected · idle';
    machine.append(text('p', 'Position ' + facility.position.x.toFixed(1) + ', ' + facility.position.y.toFixed(1) + ' · ' + facility.status.replaceAll('_', ' ').toLowerCase() + ' · ' + powerStatus + ' · condition ' + String(Math.round(facility.condition / 10)) + '%'));
    if (!nearby) machine.append(text('p', 'Move within ' + String(INDUSTRY_INTERACTION_RANGE) + ' world units to manage this facility. You are ' + (Number.isFinite(playerDistance(facility)) ? playerDistance(facility).toFixed(1) : '—') + ' units away.', 'industry-small'));
    const controls = row();
    controls.append(button(facility.enabled ? 'Pause' : 'Resume', 'enabled', () => { void run({ action: 'set-enabled', targetId: facility.id, enabled: !facility.enabled }, facility.enabled ? 'Facility paused.' : 'Facility enabled.'); }, nearby));
    controls.append(button('Repair · ' + INDUSTRY_REPAIR_COSTS.map(cost => String(cost.quantity) + ' ' + itemName(cost.itemDefinitionId)).join(' + '), 'repair', () => { void run({ action: 'repair', targetId: facility.id }, 'Facility repaired.'); }, nearby && facility.condition < 1000 && afford(INDUSTRY_REPAIR_COSTS)));
    const linked = state.links.some(link => link.sourceId === facility.id || link.destinationId === facility.id);
    const dismantle = button('Dismantle · refund materials', 'dismantle', () => { void run({ action: 'dismantle', targetId: facility.id }, 'Facility dismantled. Build materials returned to your bag.'); }, nearby && facility.buffer.length === 0 && !linked);
    dismantle.title = 'Unload the buffer and disconnect conveyors first. Build materials return only if your bag can hold the refund.';
    controls.append(dismantle);
    machine.append(controls);
    if (facility.buffer.length || linked) machine.append(text('p', 'To dismantle, unload the buffer and disconnect attached conveyors. Construction materials are refunded if your bag has space.', 'industry-small'));
    const recipes = INDUSTRY_RECIPES.filter((recipe) => recipe.facilityKind === facility.kind);
    if (recipes.length) {
      const selectedRecipe = INDUSTRY_RECIPES.find((recipe) => recipe.id === facility.recipeId);
      const choices = row();
      choices.append(select('Recipe', 'recipe', [{ value: '', name: 'Choose recipe' }, ...recipes.map((recipe) => ({ value: recipe.id, name: recipe.name + (recipe.requiredResearch && !state.researchIds.includes(recipe.requiredResearch) ? ' (research required)' : '') }))], facility.recipeId ?? '', (value) => {
        if (value) void run({ action: 'set-recipe', targetId: facility.id, recipeId: value }, 'Recipe selected.');
      }));
      choices.querySelector('select')!.disabled = !nearby || !ready();
      machine.append(choices);
      if (selectedRecipe) {
        machine.append(text('p', 'Input: ' + selectedRecipe.inputs.map((entry) => String(entry.quantity) + ' ' + itemName(entry.itemDefinitionId)).join(' + ') + ' → ' + selectedRecipe.outputs.map((entry) => String(entry.quantity) + ' ' + itemName(entry.itemDefinitionId)).join(' + ')));
        const progress = document.createElement('progress');
        progress.className = 'industry-progress';
        progress.max = selectedRecipe.cycleTicks;
        progress.value = facility.progressTicks;
        progress.setAttribute('aria-label', industryText('Production cycle progress'));
        machine.append(progress, text('p', String(Math.floor(facility.progressTicks / 60)) + '/' + String(Math.ceil(selectedRecipe.cycleTicks / 60)) + ' s · completed cycles ' + String(facility.cycleOrdinal), 'industry-small'));
        for (const input of selectedRecipe.inputs) {
          const held = facility.buffer.find((entry) => entry.itemDefinitionId === input.itemDefinitionId)?.quantity ?? 0;
          const needed = Math.max(0, input.quantity - held);
          const inputRow = row();
          inputRow.append(text('span', itemName(input.itemDefinitionId) + ' · buffer ' + String(held) + ' · bag ' + String(available(input.itemDefinitionId))));
          inputRow.append(button('Load ' + String(needed || input.quantity), 'input-' + input.itemDefinitionId, () => { void run({ action: 'deposit', targetId: facility.id, itemDefinitionId: input.itemDefinitionId, quantity: needed || input.quantity }, 'Input loaded.'); }, nearby && available(input.itemDefinitionId) >= (needed || input.quantity)));
          machine.append(inputRow);
        }
      }
    }
    if (facility.kind === 'rover' || facility.kind === 'depot') {
      const cargo = card(facility.kind === 'rover' ? 'Rover cargo' : 'Depot stock');
      const inventory = new Map<string, number>();
      for (const stack of adapter.inventory()) if (INDUSTRY_ITEM_IDS.includes(stack.itemDefinitionId)) inventory.set(stack.itemDefinitionId, (inventory.get(stack.itemDefinitionId) ?? 0) + stack.quantity);
      for (const [id, quantity] of inventory) {
        const entry = row();
        entry.append(text('span', itemName(id) + ' · bag ' + String(quantity)), button('Load 1', 'cargo-' + id, () => { void run({ action: 'deposit', targetId: facility.id, itemDefinitionId: id, quantity: 1 }, 'Cargo loaded.'); }, nearby));
        cargo.append(entry);
      }
      if (!inventory.size) cargo.append(text('p', 'Your bag is empty.'));
      content.append(cargo);
    }
    const buffer = document.createElement('table');
    buffer.className = 'industry-buffer';
    buffer.setAttribute('aria-label', industryText('Facility buffer'));
    const header = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const name of ['Item', 'Stock', 'Collect']) {
      const heading = document.createElement('th'); heading.scope = 'col'; heading.textContent = industryText(name); headerRow.append(heading);
    }
    header.append(headerRow); buffer.append(header);
    const body = document.createElement('tbody');
    for (const entry of facility.buffer) {
      const line = document.createElement('tr');
      for (const value of [itemName(entry.itemDefinitionId), String(entry.quantity)]) {
        const cell = document.createElement('td'); cell.textContent = industryText(value); line.append(cell);
      }
      const actions = document.createElement('td');
      actions.append(button('Take 1', 'take-' + entry.itemDefinitionId, () => { void run({ action: 'withdraw', targetId: facility.id, itemDefinitionId: entry.itemDefinitionId, quantity: 1 }, 'Item collected.'); }, nearby));
      actions.append(button('Take all', 'take-all-' + entry.itemDefinitionId, () => { void run({ action: 'withdraw', targetId: facility.id, itemDefinitionId: entry.itemDefinitionId, quantity: entry.quantity }, 'Stock collected.'); }, nearby));
      line.append(actions); body.append(line);
    }
    buffer.append(body); machine.append(buffer);
    if (!facility.buffer.length) machine.append(text('p', 'Buffer empty.', 'industry-small'));
    if (facility.kind === 'rover') {
      machine.append(text('p', 'Battery ' + String(Math.floor(facility.energy / 10)) + '% · charges near powered infrastructure. Driving uses battery and adds wear.', 'industry-small'));
      const drive = row();
      drive.append(coordinate('Destination X', 'drive-x', draft.driveX || String(facility.position.x), (value) => { draft.driveX = value; }), coordinate('Destination Y', 'drive-y', draft.driveY || String(facility.position.y), (value) => { draft.driveY = value; }));
      drive.append(button('Drive rover', 'drive', () => {
        const x = Number(draft.driveX || facility.position.x), y = Number(draft.driveY || facility.position.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) { feedback = 'Enter a valid destination.'; signature = ''; render(true); return; }
        void run({ action: 'drive', targetId: facility.id, position: { x, y } }, 'Rover arrived. Cargo retained.');
      }, nearby));
      machine.append(drive, text('p', 'Choose an explored destination within ' + String(INDUSTRY_ROVER_DRIVE_RANGE) + ' units of the rover. Routes are checked for ground and obstacles.', 'industry-small'));
    }
    content.prepend(machine);
    content.prepend(chooser);
  };

  const renderNetworks = (content: HTMLElement, state: IndustryState) => {
    const power = card('Power networks');
    power.append(text('p', 'Solar arrays and relays connect nearby infrastructure automatically. Machines share finite network capacity; build relays to extend coverage and arrays for extra capacity.', 'industry-small'));
    for (const network of state.powerNetworks) {
      power.append(text('p', network.id + ' · ' + String(network.usedCapacity) + '/' + String(network.capacity) + ' power · ' + String(network.consumerIds.length) + ' consumers · ' + String(network.relayIds.length) + ' relays'));
    }
    if (!state.powerNetworks.length) power.append(text('p', 'No network yet. Build a solar array.'));
    content.append(power);
    const logistics = card('Conveyor logistics');
    logistics.append(text('p', 'Links move actual buffer stock between facilities during active simulation. Endpoints must be within ' + String(INDUSTRY_CONVEYOR_RANGE) + ' units. Pause or repair damaged facilities to control the chain.', 'industry-small'));
    costs(logistics, INDUSTRY_CONVEYOR_COSTS);
    const bufferFacilities = state.facilities.filter((facility) => INDUSTRY_FACILITIES[facility.kind].bufferCapacity > 0);
    if (bufferFacilities.length >= 2) {
      if (!bufferFacilities.some((f) => f.id === draft.source)) draft.source = bufferFacilities[0]!.id;
      if (!bufferFacilities.some((f) => f.id === draft.destination)) draft.destination = bufferFacilities.find((f) => f.id !== draft.source)?.id ?? draft.source;
      const entries = bufferFacilities.map((facility) => ({ value: facility.id, name: facilityName(facility) }));
      const selectors = row();
      selectors.append(select('From', 'link-source', entries, draft.source, (value) => { draft.source = value; }), select('To', 'link-destination', entries, draft.destination, (value) => { draft.destination = value; }));
      const items = [...new Set(INDUSTRY_RECIPES.flatMap((recipe) => [...recipe.inputs, ...recipe.outputs]).map((entry) => entry.itemDefinitionId))];
      selectors.append(select('Item filter', 'link-filter', [{ value: '', name: 'All items' }, ...items.map((id) => ({ value: id, name: itemName(id) }))], draft.filter, (value) => { draft.filter = value; }));
      const source = state.facilities.find((facility) => facility.id === draft.source)!;
      selectors.append(button('Connect conveyor', 'connect', () => { void run({ action: 'connect', targetId: draft.source, destinationId: draft.destination, ...(draft.filter ? { itemDefinitionId: draft.filter } : {}) }, 'Conveyor connected.'); }, state.researchIds.includes('logistics') && draft.source !== draft.destination && playerDistance(source) <= INDUSTRY_INTERACTION_RANGE && afford(INDUSTRY_CONVEYOR_COSTS)));
      logistics.append(selectors);
    } else logistics.append(text('p', 'Build at least two facilities with material buffers to connect a conveyor.'));
    if (!state.researchIds.includes('logistics')) logistics.append(text('p', 'Requires Logistics research.', 'industry-small'));
    for (const link of state.links) {
      const source = state.facilities.find((facility) => facility.id === link.sourceId);
      const destination = state.facilities.find((facility) => facility.id === link.destinationId);
      const entry = row();
      entry.append(text('span', (source ? facilityName(source) : link.sourceId) + ' → ' + (destination ? facilityName(destination) : link.destinationId) + ' · ' + (link.itemDefinitionId ? itemName(link.itemDefinitionId) : 'all items')));
      entry.append(button('Disconnect', 'disconnect-' + link.id, () => { void run({ action: 'disconnect', targetId: link.id }, 'Conveyor disconnected.'); }, source !== undefined && playerDistance(source) <= INDUSTRY_INTERACTION_RANGE));
      logistics.append(entry);
    }
    content.append(logistics);
    const maintenance = card('Maintenance events');
    for (const event of state.events.slice(-8).reverse()) {
      const facility = state.facilities.find((entry) => entry.id === event.facilityId);
      maintenance.append(text('p', (facility ? facilityName(facility) : event.facilityId) + ' · ' + event.type.replaceAll('_', ' ').toLowerCase() + ' · active time ' + String(Math.floor(event.tick / 60)) + ' s', 'industry-small'));
    }
    if (!state.events.length) maintenance.append(text('p', 'No maintenance events yet. Working facilities accumulate wear during active play.', 'industry-small'));
    content.append(maintenance);
  };

  const renderResearch = (content: HTMLElement, state: IndustryState) => {
    const player = adapter.position();
    const nearBase = player !== null && Math.hypot(player.x, player.y) <= INDUSTRY_RESEARCH_RANGE;
    content.append(text('p', 'Research belongs to this colony and is shared with other colonists. Costs come from your bag. Research within ' + String(INDUSTRY_RESEARCH_RANGE) + ' world units of the Landing Lab.', 'industry-summary'));
    if (!nearBase) content.append(text('p', 'Return near the Landing Lab to research industry.', 'industry-small'));
    const grid = document.createElement('div'); grid.className = 'industry-grid';
    for (const research of INDUSTRY_RESEARCH) {
      const node = card(research.name);
      node.dataset.industryResearch = research.id;
      node.append(text('p', research.description));
      const complete = state.researchIds.includes(research.id);
      const missing = research.prerequisites.filter((id) => !state.researchIds.includes(id));
      const colonyIds = adapter.colonyResearchIds?.();
      const colonyMissing = research.colonyPrerequisite && colonyIds !== undefined && !colonyIds.includes(research.colonyPrerequisite);
      if (complete) node.append(text('p', 'Researched', 'industry-small'));
      else {
        costs(node, research.costs);
        if (missing.length) node.append(text('p', 'Requires: ' + missing.map((id) => INDUSTRY_RESEARCH.find((r) => r.id === id)?.name ?? id).join(', '), 'industry-small'));
        if (research.colonyPrerequisite) node.append(text('p', 'Colony prerequisite: ' + research.colonyPrerequisite.replaceAll('-', ' '), 'industry-small'));
        node.append(button('Research ' + research.name, 'research-' + research.id, () => { void run({ action: 'research', targetId: research.id }, research.name + ' researched.'); }, nearBase && missing.length === 0 && !colonyMissing && afford(research.costs)));
      }
      grid.append(node);
    }
    content.append(grid);
  };

  const updateMarkers = (state: IndustryState | null) => {
    const linked = new Set<string>();
    if (adapter.project && state) for (const link of state.links) {
      const source = state.facilities.find(f => f.id === link.sourceId);
      const destination = state.facilities.find(f => f.id === link.destinationId);
      if (!source || !destination) continue;
      linked.add(link.id);
      let line = routeNodes.get(link.id);
      if (!line) {
        line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#ceb37b'); line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4 3'); routes.append(line); routeNodes.set(link.id, line);
      }
      const from = adapter.project(source.position), to = adapter.project(destination.position);
      line.style.display = opened || !from || !to || from.visible === false || to.visible === false ? 'none' : '';
      if (from && to) {
        line.setAttribute('x1', String(from.x)); line.setAttribute('y1', String(from.y));
        line.setAttribute('x2', String(to.x)); line.setAttribute('y2', String(to.y));
      }
    }
    for (const [id, line] of routeNodes) if (!linked.has(id)) { line.remove(); routeNodes.delete(id); }
    const live = new Set<string>();
    if (adapter.project && state) for (const facility of state.facilities) {
      live.add(facility.id);
      let node = markerNodes.get(facility.id);
      if (!node) {
        node = document.createElement('button');
        node.type = 'button';
        node.className = 'industry-marker';
        node.dataset.industryFacility = facility.id;
        node.dataset.kind = facility.kind;
        node.innerHTML = silhouette(facility.kind);
        const label = document.createElement('span'); label.className = 'industry-marker-state'; node.append(label);
        node.addEventListener('click', () => open(facility.id));
        markers.append(node); markerNodes.set(facility.id, node);
      }
      const projected = adapter.project(facility.position);
      node.hidden = projected === null || projected.visible === false || opened || ['colonySettingsOpen','livingPanelOpen','expeditionPanelOpen','colonyDepthPanelOpen','productReviewPanelOpen','productReviewHelpOpen'].some(key => root.dataset[key] === 'true');
      if (adapter.markerHost) node.style.zIndex = worldDepthOrder(facility.position);
      if (projected) { node.style.left = String(projected.x) + 'px'; node.style.top = String(projected.y) + 'px'; }
      node.dataset.powered = String(facility.powered);
      node.dataset.worn = String(facility.condition <= 300);
      node.dataset.selected = String(opened && selectedFacility === facility.id);
      const progress = String(Math.floor(facility.progressTicks / 60));
      if (node.dataset.industryProgressSeconds !== progress) node.dataset.industryProgressSeconds = progress;
      node.setAttribute('aria-label', industryText(INDUSTRY_FACILITIES[facility.kind].name) + ' · ' + industryText(facility.status.replaceAll('_', ' ').toLowerCase()));
      node.title = industryText(INDUSTRY_FACILITIES[facility.kind].name + ' · condition ' + String(Math.round(facility.condition / 10)) + '%');
      const label = node.lastElementChild!;
      const status = industryText(facility.status.replaceAll('_', ' ').toLowerCase());
      if (label.textContent !== status) label.textContent = status;
    }
    for (const [id, node] of markerNodes) if (!live.has(id)) { node.remove(); markerNodes.delete(id); }
  };

  function render(force = false): void {
    if (destroyed) return;
    const state = adapter.read();
    updateMarkers(state);
    launcher.disabled = state === null;
    if (!opened) return;
    if (['colonySettingsOpen','livingPanelOpen','expeditionPanelOpen','colonyDepthPanelOpen','productReviewPanelOpen','productReviewHelpOpen'].some(key => root.dataset[key] === 'true')) { close(); return; }
    const active = document.activeElement;
    // Active edits retain their DOM and caret while replicated/ticked values change.
    if (!force && (pointerHeld || (active instanceof HTMLElement && dialog.contains(active) && active.tagName === 'INPUT'))) return;
    const next = JSON.stringify([locale(), tab, selectedFacility, feedback, busy, adapter.ready?.(), adapter.inventory(), adapter.colonyResearchIds?.(), adapter.position() && { x: Math.round(adapter.position()!.x * 2), y: Math.round(adapter.position()!.y * 2) }, state && { researchIds: state.researchIds, facilities: state.facilities.map((facility) => ({ ...facility, progressTicks: Math.floor(facility.progressTicks / 60) * 60, condition: Math.round(facility.condition / 10) * 10, energy: Math.floor(facility.energy / 10) * 10, wearTicks: 0 })), links: state.links, powerNetworks: state.powerNetworks, events: state.events }]);
    if (!force && signature === next) return;
    signature = next;
    const focusedId = active instanceof HTMLElement && dialog.contains(active) ? active.dataset.industryControl : undefined;
    const scroll = dialog.scrollTop;
    dialog.replaceChildren();
    const header = document.createElement('header'); header.className = 'industry-header';
    const heading = text('h2', 'INDUSTRY'); heading.tabIndex = -1;
    header.append(heading, button('Close', 'close', close));
    // Closing remains available while an authoritative command is pending.
    header.querySelector('button')!.disabled = false;
    const tabs = document.createElement('nav'); tabs.className = 'industry-tabs'; tabs.setAttribute('aria-label', industryText('Industry sections'));
    for (const [value, label] of [['build', 'Construction'], ['production', 'Facilities'], ['networks', 'Power & logistics'], ['research', 'Research']] as const) {
      const control = button(label, 'tab-' + value, () => { tab = value; signature = ''; render(true); });
      control.setAttribute('aria-selected', String(tab === value));
      control.disabled = false;
      tabs.append(control);
    }
    const status = text('p', feedback, 'industry-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const content = document.createElement('div'); content.className = 'industry-content';
    dialog.append(header, tabs, status, content);
    if (!state) content.append(text('p', 'Waiting for the colony state…'));
    else if (tab === 'build') renderBuild(content, state);
    else if (tab === 'production') renderProduction(content, state);
    else if (tab === 'networks') renderNetworks(content, state);
    else renderResearch(content, state);
    dialog.scrollTop = scroll;
    if (focusedId) [...dialog.querySelectorAll<HTMLElement>('[data-industry-control]')].find((node) => node.dataset.industryControl === focusedId)?.focus({ preventScroll: true });
  }

  const toggle = () => { if (opened) close(); else open(); };
  launcher.addEventListener('click', toggle);
  const onKey = (event: KeyboardEvent) => {
    if (opened) {
      if (event.code === 'Escape') { event.preventDefault(); close(); }
      else if (event.code === 'Tab') {
        const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
      event.stopImmediatePropagation();
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))) return;
    if (event.code === 'KeyO' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); event.stopImmediatePropagation(); open();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => { if (opened) event.stopImmediatePropagation(); };
  const onPointerDown = () => { pointerHeld = true; };
  const onPointerUp = () => { pointerHeld = false; };
  const stopPointer = (event: Event) => event.stopPropagation();
  for (const event of ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup']) layer.addEventListener(event, stopPointer);
  dialog.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('keyup', onKeyUp, true);
  root.dataset.industryOpen = 'false';
  const unsubscribeLocale = onLocaleChange(() => {
    launcher.textContent = industryText('Industry · O');
    dialog.setAttribute('aria-label', industryText('Industry management'));
    signature = ''; render(true);
  });
  render();
  return {
    open,
    close,
    update: () => render(),
    destroy: () => {
      unsubscribeLocale();
      destroyed = true;
      root.dataset.industryOpen = 'false';
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      markers.remove();
      layer.remove();
    },
  };
}
