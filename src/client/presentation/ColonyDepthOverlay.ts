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
  itemIconSprite,
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
    TARGET_CAPACITY_WEIGHT:'Your bag is too heavy. Store items and return; these supplies will remain here.',
    TARGET_CAPACITY_VOLUME:'Your bag has no space. Store items and return; these supplies will remain here.',
    OUT_OF_RANGE:'Move closer to this site.', SITE_BLOCKED_OR_UNEXPLORED:'Explore this site and clear buildings from its approach first.',
    INSPECT_SITE_FIRST:'Inspect this site first.', RESTORE_SITE_FIRST:'Restore this site first.', FIELD_TOOL_REQUIRED:'Carry a usable Stone Field Tool.',
    ALREADY_RESTORED:'This site has already been restored.', SUPPLIES_ALREADY_RECOVERED:'These finite supplies have already been recovered.',
    STALE_REVISION:'The world changed. Please try again.', STALE_INVENTORY_REVISION:'Your bag changed. Please try again.', PLAYER_DEAD:'You cannot do this while incapacitated.',
    RETURN_TO_BASE:'Use the landing lab or a restored field laboratory.',
  };
  const explain = (reason: string): string => {const missing=/^NEED (item:[a-z-]+) ×(\d+)$/.exec(reason);return missing && bundle.catalog.has(missing[1]!) ? 'Need '+missing[2]+' '+bundle.catalog.get(missing[1]!).displayName+'.' : reasonText[reason] ?? reason.replaceAll('_',' ');};
  const container = document.createElement("section");
  container.className = "p2-colony-controls";
  container.setAttribute("aria-label", "Colony depth actions");
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
    ["research", "⚗ Research [U]"],
    ["journal", "◇ Journal [J]"],
    ["professions", "⌁ Professions"],
  ] as const) {
    const button = document.createElement("button");
    button.textContent = label;
    button.setAttribute('aria-label',label);button.title=label;
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
        ? "✓ " + (bundle.colonyDepth.sites().find(s=>s.id===targetId)?.name ?? targetId.replaceAll("-", " "))
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
    button.textContent = label;
    button.disabled = disabled;
    if(disabled)button.title='Move within interaction range and meet the displayed requirements.';
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
    audio.weather(weather.weather);
    const key =
      String(Math.floor(position.x / 64)) +
      ":" +
      String(Math.floor(position.y / 64));
    const pressure =
      state.pressure.find((entry) => entry.regionKey === key)?.harvests ?? 0;
    const text =
      COLONY_BIOMES[weather.biomeId].name +
      " · " +
      (weather.warning
        ? "WEATHER APPROACHING"
        : weather.weather.replaceAll("-", " ").toUpperCase()) +
      " · Ecology " +
      String(8 - pressure) +
      "/8";
    if (region.textContent !== text) region.textContent = text;
    container.title = text;
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
    const current = JSON.stringify([
      panel,
      state.revision,
      inventory.revision,
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
    content.replaceChildren();
    if (panel === null) return;
    const heading = document.createElement("h2");
    heading.textContent = panel.toUpperCase();
    content.append(heading);
    const close = document.createElement("button");
    close.textContent = "Close";
    close.addEventListener("click", () => {
      panel = null;
      signature = "";
      render();
    });
    content.append(close);
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.textContent = feedback;
    content.append(status);
    if (panel === "research")
      for (const def of COLONY_RESEARCH) {
        const row = document.createElement("article");
        const name = document.createElement("strong");
        name.textContent = def.name;
        row.append(name);
        let affordable = true;
        for (const cost of def.costs) {
          const have = inventory.stacks
            .filter((s) => s.itemDefinitionId === cost.itemDefinitionId)
            .reduce((sum, s) => sum + s.quantity, 0);
          if (have < cost.quantity) affordable = false;
          const costNode = document.createElement("span");
          costNode.className = "p2-cost";
          costNode.title = cost.itemDefinitionId;
          const icon = document.createElement("span");
          const sprite = itemIconSprite(cost.itemDefinitionId);
          if (sprite !== null) applyProductionSprite(icon, sprite, 1);
          costNode.append(
            icon,
            document.createTextNode(String(have) + "/" + String(cost.quantity)),
          );
          row.append(costNode);
        }
        const complete = state.researchIds.includes(def.id);
        const eligible = def.prerequisites.every((id) =>
          state.researchIds.includes(id),
        );
        addButton(
          row,
          complete
            ? "✓ Completed"
            : !eligible
              ? "Requires " + def.prerequisites.join(", ")
              : "Research",
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
        const desc = document.createElement("p");
        desc.textContent = def.name + " · " + def.description;
        row.append(desc);
        const eligible =
          state.researchIds.includes(def.requiredResearch) &&
          state.discoveredBiomes.length >= def.requiredRegions;
        const requirement = document.createElement("small");
        requirement.textContent =
          "Requires " +
          def.requiredResearch.replaceAll("-", " ") +
          " · " +
          String(def.requiredRegions) +
          " visited regions · use a laboratory. Choice is permanent.";
        row.append(requirement);
        addButton(
          row,
          state.professions[playerId] === id ? "✓ Selected" : "Specialize",
          "specialize",
          id,
          !eligible ||
            state.professions[playerId] !== undefined ||
            Math.hypot(position.x, position.y) > 7.5 && !labNearby,
        );
        content.append(row);
      }
    if (panel === "journal") {
      const discovered=sites.filter(site=>{const coord=fromWorldPosition(site.position),view=bundle.worldStore.query(coord);if(!view)return false;const local=toChunkLocalPosition(site.position,coord);return isExplorationCellKnown(coord,view.delta.exploration,Math.floor(local.x/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS),Math.floor(local.y/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS));});
      for(const site of discovered){
        const row=document.createElement('article'),distance=Math.round(Math.hypot(position.x-site.position.x,position.y-site.position.y));
        row.dataset.discoveredLandmark=site.id;row.append(site.name+' · '+distance+' m');
        if(!state.inspectedSites.includes(site.id))addButton(row,'Inspect','inspect-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>1.25);
        const template=EXPLORATION_TEMPLATES.find(t=>t.siteId===site.id),stage=bundle.colonyDepth.siteStage(site.id);
        if(template && site.template){
          const art=document.createElement('span');applyProductionSprite(art,explorationSiteSprite(site.template,stage),.75);row.prepend(art);
          row.dataset.poiTemplate=site.template;row.dataset.poiStage=stage;
          const objective=document.createElement('p');objective.textContent=template.objective;row.append(objective);
          if(state.inspectedSites.includes(site.id)){
            const effect=document.createElement('p');effect.textContent=stage==='unrestored'?'After restoration: '+template.effect:template.effect;row.append(effect);
            if(stage==='unrestored'){
              const costs=document.createElement('p');costs.textContent='Needs: '+template.costs.map(([id,q])=>bundle.catalog.get(id).displayName+' '+inventory.stacks.filter(s=>s.itemDefinitionId===id).reduce((sum,s)=>sum+s.quantity,0)+'/'+q).join(' · ')+(template.tool?' · Carry a usable '+bundle.catalog.get(template.tool).displayName:'');row.append(costs);
              addButton(row,template.restoreLabel,'restore-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>4);
            }else if(stage==='restored'){
              const reward=document.createElement('p');reward.textContent='Finite supplies: '+template.reward.map(([id,q])=>q+' '+bundle.catalog.get(id).displayName).join(' · ');row.append(reward);addButton(row,'Recover supplies','recover-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>4);
            }else { const exhausted=document.createElement('p');exhausted.textContent='Supplies recovered · this site does not refill.';row.append(exhausted); }
            if(site.template==='shelter' && stage!=='unrestored'){
              const sleep=document.createElement('button');sleep.textContent='Sleep / rest · 8s';sleep.disabled=Math.hypot(position.x-site.position.x,position.y-site.position.y)>4;sleep.addEventListener('click',()=>{const result=bundle.expedition!.interact({id:'poi:rest:'+bundle.authorityTick+':'+ ++ordinal,playerId,target:site.id,action:'rest',expectedRevision:bundle.expedition!.read().revision,expectedInventoryRevision:inventory.revision});feedback=result.status==='committed'?'Rest started · moving or danger cancels it.':explain(result.message);signature='';render();});row.append(sleep);
              const rest=document.createElement('p');rest.dataset.poiRest='status';const remaining=bundle.expedition?.restStatus(playerId)?.remainingTicks;
              rest.textContent=remaining!==undefined?'Resting · '+Math.ceil(remaining/60)+'s remaining':(bundle.expedition!.read().restCooldown[playerId]??0)>bundle.authorityTick?'Rest complete · recovery cooldown active.':'Rest available when safe and fed.';row.append(rest);
            }
            if(site.template==='relay' && stage!=='unrestored'){
              const target=sites.find(s=>s.template==='laboratory')!,dx=target.position.x-position.x,dy=target.position.y-position.y;const signal=document.createElement('p');signal.dataset.relaySignal=target.id;signal.textContent='Recovered coordinate: '+target.name+' · '+Math.round(Math.hypot(dx,dy))+' m · '+(dy<0?'N':'S')+(dx<0?'W':'E')+' · '+target.position.x+', '+target.position.y;row.append(signal);
            }
          }
        }
        content.append(row);
      }
      const regions = document.createElement("p");
      regions.textContent =
        "Visited: " +
        state.discoveredBiomes.map((id) => COLONY_BIOMES[id].name).join(" · ");
      content.append(regions);
      for (const site of sites.filter((s) =>
        state.inspectedSites.includes(s.id),
      )) {
        const row = document.createElement("article");
        const observed = document.createElement("p");
        observed.textContent = site.name + " · OBSERVED: " + site.observation;
        const unresolved = document.createElement("p");
        unresolved.textContent = "UNRESOLVED: " + site.unresolved;
        row.append(observed, unresolved);
        content.append(row);
      }
      if (state.inspectedSites.length === 0) {
        const empty = document.createElement("p");
        empty.textContent =
          "No inspected sites yet. Explore outward; inspect visible landmarks nearby.";
        content.append(empty);
      }
    }
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
