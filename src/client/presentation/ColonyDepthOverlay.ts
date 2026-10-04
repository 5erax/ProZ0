import { gameUiText } from '../localization/GameUiMessages';
import { materialHint,materialSource } from './MaterialGuide';
import { capturePanelUi } from './PanelUiState';
import { contentDisplayName } from '../localization/ContentText';
import { locale } from '../localization/Locale';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
import { uiPhrase } from '../localization/UiMessages';
import { EXPLORATION_TEMPLATES } from '../../content/phase2/ExplorationContent';
import { explorationSiteSprite } from './ExplorationArt';
import type { Phase1AuthorityBundle } from "../../integration";
import {
  COLONY_BIOMES,
  COLONY_PROFESSIONS,
  COLONY_RESEARCH,
} from "../../content/phase2/ColonyDepthContent";
import {
  colonyWeatherAt,
} from "../../world/phase2/ColonyRegions";
import {
  applyProductionSprite,
} from "./Phase1ProductionAssets";
import type { ColonyDepthCommand } from "../../simulation/colony/ColonyDepthAuthority";
import { createColonyAudio } from "./ColonyAudio";
import {fromWorldPosition,toChunkLocalPosition} from '../../world/chunks/ChunkCoord';
import {isExplorationCellKnown,PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS} from '../../world/phase1/ExplorationGrid';

export function createColonyDepthOverlay(
  root: HTMLElement,
  bundle: Phase1AuthorityBundle,
  playerId: string,
  onOpen: () => void = () => {},
): { render(): void; close(): void; openSite(id: string): void; destroy(): void } {
  const document = root.ownerDocument;
  const reasonText: Record<string,string> = {
    TARGET_CAPACITY_WEIGHT:uiPhrase('Your bag is too heavy. Store items and return; these supplies will remain here.'),
    TARGET_CAPACITY_VOLUME:uiPhrase('Your bag has no space. Store items and return; these supplies will remain here.'),
    OUT_OF_RANGE:uiText("ui.cdc49fb2"), SITE_BLOCKED_OR_UNEXPLORED:uiText("ui.7d13ce8c"),
    INSPECT_SITE_FIRST:uiText("ui.9d04e6f8"), RESTORE_SITE_FIRST:uiText("ui.ba746f06"), FIELD_TOOL_REQUIRED:uiText("ui.3bb63e9c"),
    ALREADY_RESTORED:uiText("ui.ab7e0ce2"), SUPPLIES_ALREADY_RECOVERED:uiText("ui.1ee94d7b"),
    STALE_REVISION:uiText("ui.d9603e1"), STALE_INVENTORY_REVISION:uiText("ui.a5b15f39"), PLAYER_DEAD:uiText("ui.e19cac8d"),
    RETURN_TO_BASE:uiText("ui.5dfab66"),
  };
  const explain = (reason: string): string => {const missing=/^NEED (item:[a-z-]+) ×(\d+)$/.exec(reason);return missing && bundle.catalog.has(missing[1]!) ? uiText("ui.d9f64ed7")+missing[2]+' '+contentDisplayName(bundle.catalog.get(missing[1]!))+'.' : reasonText[reason] ?? reason.replaceAll('_',' ');};
  const container = document.createElement("section");
  container.className = "p2-colony-controls";
  bindUiText(container,"aria-label",uiText("ui.3fb2fcdd"));
  const style = document.createElement("style");
  style.textContent =
    ".p2-colony-controls{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:1000000;font:12px monospace;color:#eef4e6;pointer-events:auto;max-width:60vw}.p2-colony-controls button{font:inherit;color:inherit;background:#152733;border:1px solid #809799;padding:8px;cursor:pointer}.p2-colony-controls button:disabled{opacity:.45;cursor:default}.p2-colony-controls nav{display:flex;gap:4px;justify-content:center}.p2-colony-panel{margin-top:8px;background:#0b1721f5;border:2px solid #809799;padding:12px;width:min(620px,80vw);max-height:60vh;overflow:auto;box-sizing:border-box}.p2-colony-panel article{border-bottom:1px solid #405655;padding:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.p2-colony-panel p{margin:4px 0;line-height:1.4}.p2-cost{display:inline-flex;align-items:center;gap:4px}.p2-region{padding:4px;text-align:center;background:#0b1721e6}.p2-colony-panel h2{font-size:16px;margin:0 0 8px}.p2-colony-panel [role=status]{color:#dfc38d}";
  const nav = document.createElement("nav");
  style.textContent += '@media(max-width:850px){.p2-colony-controls{top:108px;max-width:85vw;font-size:10px}.p2-region{font-size:9px;padding:2px}.p2-colony-controls nav button{font-size:0;padding:4px 8px}.p2-colony-controls nav button::before{font-size:10px}.p2-colony-controls [data-colony-panel="research"]::before{content:"⚗ U"}.p2-colony-controls [data-colony-panel="journal"]::before{content:"◇ J"}.p2-colony-controls [data-colony-panel="professions"]::before{content:"⌁"}.p2-colony-panel{max-height:44vh}.p2-audio-controls{text-align:center}.p2-audio-controls button{padding:4px}}';
  let panel: "research" | "journal" | "professions" | null = null;
  let feedback = "";
  let ordinal = 0;
  let signature = "";
  for (const [kind, label] of [
    ["research", uiText("ui.14e87838")],
    ["journal", uiText("ui.c33f9ed")],
    ["professions", uiText("ui.4383fda7")],
  ] as const) {
    const button = document.createElement("button");
    bindUiText(button,"textContent",label);
    bindUiText(button,"aria-label",label);bindUiText(button,"title",label);
    button.dataset.colonyPanel = kind;
    button.addEventListener("click", () => {
      panel = panel === kind ? null : kind;
      if (panel !== null) onOpen();
      signature = "";
      render();
    });
    nav.append(button);
  }
  const region = document.createElement("div");
  region.className = "p2-region";
  const content = document.createElement("div");
  content.className = "p2-colony-panel";
  content.hidden = true;
  container.append(style, region, nav, content);
  root.append(container);
  const audio = createColonyAudio(root.querySelector<HTMLElement>('[data-colony-settings]') ?? container);
  const run = (
    action: ColonyDepthCommand["action"],
    targetId: string,
  ): void => {
    const result = bundle.colonyDepth.execute({
      operationId:
        "colony-depth:ui:" +
        String(bundle.authorityTick) +
        ":" +
        String(++ordinal),
      playerId,
      expectedRevision: bundle.colonyDepth.read().revision,
      expectedInventoryRevision: bundle.items.getContainerView(
        "inventory:" + playerId,
      ).revision,
      action,
      targetId,
    });
    feedback =
      result.status === "committed"
        ? "✓ " + (uiPhrase(bundle.colonyDepth.sites().find(s=>s.id===targetId)?.name) ?? targetId.replaceAll("-", " "))
        : explain(result.reason);
    signature = "";
    render();
  };
  const addButton = (
    parent: HTMLElement,
    label: string,
    action: ColonyDepthCommand["action"],
    targetId: string,
    disabled = false,
  ): void => {
    const button = document.createElement("button");
    bindUiText(button,"textContent",label);
    button.disabled = disabled;
    if(disabled)bindUiText(button,"title",uiText("ui.174bf540"));
    button.dataset.colonyAction = action + ":" + targetId;
    button.addEventListener("click", () => run(action, targetId));
    parent.append(button);
  };
  const sites = bundle.colonyDepth.sites();
  function render(): void {
    if(root.dataset.colonySettingsOpen === 'true') panel=null;
    root.dataset.colonyDepthPanelOpen=String(panel!==null);
    const state = bundle.colonyDepth.read();
    const position = bundle.getPlayerPosition(playerId);
    const weather = colonyWeatherAt(
      bundle.config.worldSeed,
      position,
      bundle.authorityTick,
    );
    audio.weather(bundle.playerWorldspace() === 'surface' ? weather.weather : 'clear');
    const key =
      String(Math.floor(position.x / 64)) +
      ":" +
      String(Math.floor(position.y / 64));
    const pressure =
      state.pressure.find((entry) => entry.regionKey === key)?.harvests ?? 0;
    const text =
      uiPhrase(COLONY_BIOMES[weather.biomeId].name) +
      " · " +
      (weather.warning
        ? uiText("ui.6a744f8b")
        : weather.weather.replaceAll("-", " ").toUpperCase()) +
      uiText("ui.9a8cb74c") +
      String(8 - pressure) +
      "/8";
    if (region.textContent !== text) bindUiText(region,"textContent",text);
    bindUiText(container,"title",text);
    container.dataset.biome = weather.biomeId;
    container.dataset.colonyRevision = String(state.revision);
    const inventory = bundle.items.getContainerView("inventory:" + playerId);
    const nearSite = sites.find(
      (site) =>
        Math.hypot(
          position.x - site.position.x,
          position.y - site.position.y,
        ) <= 1.25,
    );
    const lab=bundle.colonyDepth.restoredSite('laboratory');
    const labNearby=!!lab && Math.hypot(position.x-lab.position.x,position.y-lab.position.y)<=7.5 || (bundle.expedition?.hasRemoteLab(playerId) ?? false);
    const discovered=panel==='journal'?sites.filter(site=>{if(state.inspectedSites.includes(site.id))return true;const coord=fromWorldPosition(site.position),view=bundle.worldStore.query(coord);if(!view)return false;const local=toChunkLocalPosition(site.position,coord);return isExplorationCellKnown(coord,view.delta.exploration,Math.floor(local.x/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS),Math.floor(local.y/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS));}):[];
    const current = JSON.stringify([locale(),
      panel,
      state.revision,
      inventory.revision,
      discovered.map(site=>site.id),
      nearSite?.id,
      labNearby,
      sites.map(s=>Math.hypot(position.x-s.position.x,position.y-s.position.y)<=4),
      Math.hypot(position.x, position.y) <= 7.5,
      feedback,
      Math.ceil((bundle.expedition?.restStatus(playerId)?.remainingTicks ?? 0)/60),
      bundle.expedition?.read().restCooldown[playerId],
    ]);
    if (current === signature) return;
    signature = current;
    content.hidden = panel === null;
    const restoreUi=capturePanelUi(content);
    content.replaceChildren();
    if (panel === null) return;
    const heading = document.createElement("h2");
    bindUiText(heading,"textContent",panel.toUpperCase());
    content.append(heading);
    const close = document.createElement("button");
    bindUiText(close,"textContent",uiText("ui.cd86acc3"));
    close.addEventListener("click", () => {
      panel = null;
      signature = "";
      render();
    });
    content.append(close);
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    bindUiText(status,"textContent",feedback);
    content.append(status);
    if (panel === "research")
      for (const def of COLONY_RESEARCH) {
        const row = document.createElement("article");
        const name = document.createElement("strong");
        bindUiText(name,"textContent",uiPhrase(def.name));
        row.append(name);
        let affordable = true;
        for (const cost of def.costs) {
          const have = inventory.stacks
            .filter((s) => s.itemDefinitionId === cost.itemDefinitionId)
            .reduce((sum, s) => sum + s.quantity, 0);
          if (have < cost.quantity) affordable = false;
          const costNode=materialHint(document,contentDisplayName(bundle.catalog.get(cost.itemDefinitionId)),materialSource(bundle.catalog,cost.itemDefinitionId),have,cost.quantity,cost.itemDefinitionId);
          row.append(costNode);
        }
        const complete = state.researchIds.includes(def.id);
        const eligible = def.prerequisites.every((id) =>
          state.researchIds.includes(id),
        );
        row.dataset.unlockState=complete?'complete':eligible&&affordable?'ready':'locked';
        const indicator=document.createElement('span');indicator.className='p2-unlock-state';indicator.textContent=complete?'✓':eligible&&affordable?'○':'◇';
        bindUiText(indicator,'aria-label',complete?'Complete':eligible&&affordable?'Available':'Locked');row.prepend(indicator);
        addButton(
          row,
          complete
            ? uiText("ui.8d997cbb")
            : !eligible
              ? uiText("ui.753d67cf") + def.prerequisites.map(id=>uiPhrase(COLONY_RESEARCH.find(r=>r.id===id)?.name??id)).join(", ")
              : uiText("ui.5caeb9ec"),
          "research",
          def.id,
          complete ||
            !eligible ||
            !affordable ||
            Math.hypot(position.x, position.y) > 7.5 && !labNearby,
        );
        content.append(row);
      }
    if (panel === "professions")
      for (const [id, def] of Object.entries(COLONY_PROFESSIONS)) {
        const row = document.createElement("article");
        const name=document.createElement('strong');bindUiText(name,'textContent',def.name);
        const desc = document.createElement("p");
        bindUiText(desc,"textContent",def.description);
        row.append(name,desc);
        const eligible =
          state.researchIds.includes(def.requiredResearch) &&
          state.discoveredBiomes.length >= def.requiredRegions;
        row.dataset.unlockState=state.professions[playerId]===id?'complete':eligible?'ready':'locked';
        const requirement = document.createElement("small");
        bindUiText(requirement,"textContent",uiText("ui.753d67cf") +
          uiPhrase(COLONY_RESEARCH.find(research=>research.id===def.requiredResearch)?.name??def.requiredResearch.replaceAll("-", " ")) +
          " · " +
          String(def.requiredRegions) +
          uiText("ui.a49ab1ed"));
        row.append(requirement);
        addButton(
          row,
          state.professions[playerId] === id ? uiText("ui.c1c66a1f") : uiText("ui.338fc202"),
          "specialize",
          id,
          !eligible ||
            state.professions[playerId] === id ||
            Math.hypot(position.x, position.y) > 7.5 && !labNearby,
        );
        content.append(row);
      }
    if (panel === "journal") {
      const observedSites=sites.filter(site=>site.template&&state.inspectedSites.includes(site.id));
      const guidance=document.createElement('p');guidance.dataset.explorationGuidance='true';bindUiText(guidance,'textContent',gameUiText('traceHint'));content.append(guidance);
      if(observedSites.length>=2){const network=document.createElement('p');network.dataset.observedNetwork='true';bindUiText(network,'textContent',gameUiText('networkHint',{names:observedSites.map(site=>uiPhrase(site.name)).join(' · ')}));content.append(network);}

      for(const site of discovered){
        const row=document.createElement('article'),distance=Math.round(Math.hypot(position.x-site.position.x,position.y-site.position.y));
        row.dataset.discoveredLandmark=site.id;row.append(uiPhrase(site.name)+' · '+distance+' m');
        if(!state.inspectedSites.includes(site.id))addButton(row,uiText("ui.3d427db7"),'inspect-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>1.25);
        const template=EXPLORATION_TEMPLATES.find(t=>t.siteId===site.id),stage=bundle.colonyDepth.siteStage(site.id);
        if(template && site.template){
          const art=document.createElement('span');applyProductionSprite(art,explorationSiteSprite(site.template,stage),.75);row.prepend(art);
          row.dataset.poiTemplate=site.template;row.dataset.poiStage=stage;
          const objective=document.createElement('p');bindUiText(objective,"textContent",template.objective);row.append(objective);
          if(state.inspectedSites.includes(site.id)){
            const effect=document.createElement('p');bindUiText(effect,"textContent",stage==='unrestored'?uiText("ui.30c1e0ab")+template.effect:template.effect);row.append(effect);
            if(stage==='unrestored'){
              const costs=document.createElement('p');bindUiText(costs,"textContent",uiText("ui.fa543300")+template.costs.map(([id,q])=>contentDisplayName(bundle.catalog.get(id))+' '+inventory.stacks.filter(s=>s.itemDefinitionId===id).reduce((sum,s)=>sum+s.quantity,0)+'/'+q).join(' · ')+(template.tool?uiText("ui.1f6e7a10")+contentDisplayName(bundle.catalog.get(template.tool)):''));row.append(costs);
              addButton(row,template.restoreLabel,'restore-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>4);
            }else if(stage==='restored'){
              const reward=document.createElement('p');bindUiText(reward,"textContent",uiText("ui.cfad6717")+template.reward.map(([id,q])=>q+' '+contentDisplayName(bundle.catalog.get(id))).join(' · '));row.append(reward);addButton(row,uiText("ui.76ba403a"),'recover-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>4);
            }else { const exhausted=document.createElement('p');bindUiText(exhausted,"textContent",uiText("ui.92398819"));row.append(exhausted); }
            if(site.template==='shelter' && stage!=='unrestored'){
              const sleep=document.createElement('button');bindUiText(sleep,"textContent",uiText("ui.8845b2e5"));sleep.disabled=Math.hypot(position.x-site.position.x,position.y-site.position.y)>4;sleep.addEventListener('click',()=>{const result=bundle.expedition!.interact({id:'poi:rest:'+bundle.authorityTick+':'+ ++ordinal,playerId,target:site.id,action:'rest',expectedRevision:bundle.expedition!.read().revision,expectedInventoryRevision:inventory.revision});feedback=result.status==='committed'?uiText("ui.6aed6a79"):explain(result.message);signature='';render();});row.append(sleep);
              const rest=document.createElement('p');rest.dataset.poiRest='status';const remaining=bundle.expedition?.restStatus(playerId)?.remainingTicks;
              bindUiText(rest,"textContent",remaining!==undefined?uiText("ui.1c1724c4")+Math.ceil(remaining/60)+uiText("ui.3a49b846"):(bundle.expedition!.read().restCooldown[playerId]??0)>bundle.authorityTick?uiText("ui.6f9cb83"):uiText("ui.ded11927"));row.append(rest);
            }
            if(site.template==='relay' && stage!=='unrestored'){
              const target=sites.find(s=>s.template==='laboratory')!,dx=target.position.x-position.x,dy=target.position.y-position.y;const signal=document.createElement('p');signal.dataset.relaySignal=target.id;bindUiText(signal,"textContent",uiText("ui.c51c9aba")+uiPhrase(target.name)+' · '+Math.round(Math.hypot(dx,dy))+' m · '+(dy<0?'N':'S')+(dx<0?'W':'E')+' · '+target.position.x+', '+target.position.y);row.append(signal);
            }
          }
        }
        content.append(row);
      }
      const regions = document.createElement("p");
      bindUiText(regions,"textContent",uiText("ui.dc34e2cf") +
        state.discoveredBiomes.map((id) => uiPhrase(COLONY_BIOMES[id].name)).join(" · "));
      content.append(regions);
      for (const site of sites.filter((s) =>
        state.inspectedSites.includes(s.id),
      )) {
        const row = document.createElement("article");
        const observed = document.createElement("p");
        bindUiText(observed,"textContent",uiPhrase(site.name) + uiText("ui.8b9dae7a") + site.observation);
        const unresolved = document.createElement("p");
        bindUiText(unresolved,"textContent",uiText("ui.662d2bd0") + site.unresolved);
        row.append(observed, unresolved);
        content.append(row);
      }
      if (state.inspectedSites.length === 0) {
        const empty = document.createElement("p");
        bindUiText(empty,"textContent","No inspected sites yet. Explore outward; inspect visible landmarks nearby.");
        content.append(empty);
      }
    }
    restoreUi();
  }
  const onKey = (event: KeyboardEvent): void => {
    if (
      event.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
    )
      return;
    if (
      event.code === "Escape" ||
      ["KeyI", "KeyC", "KeyB", "KeyM", "KeyN", "KeyH", "KeyP"].includes(event.code)
    ) {
      panel = null;
      signature = "";
      render();
    }
    if (event.code === "KeyU" || event.code === "KeyJ") {
      panel =
        panel === (event.code === "KeyU" ? "research" : "journal")
          ? null
          : event.code === "KeyU"
            ? "research"
          : "journal";
      if (panel !== null) onOpen();
      signature = "";
      render();
    }
  };
  document.addEventListener("keydown", onKey);
  render();
  return {
    render,
    openSite(id: string) {
      if(!sites.some(site=>site.id===id && bundle.world.isExploredPosition(site.position)))return;
      panel='journal';feedback='';onOpen();signature='';render();
      const row=Array.from(content.querySelectorAll<HTMLElement>('[data-discovered-landmark]')).find(e=>e.dataset.discoveredLandmark===id);
      row?.scrollIntoView({block:'nearest'});row?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
    },
    close() { panel = null; signature = ''; render(); },
    destroy() {
      document.removeEventListener("keydown", onKey);
      audio.destroy();
      delete root.dataset.colonyDepthPanelOpen;
      container.remove();
    },
  };
}
