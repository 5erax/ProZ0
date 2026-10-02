import type { Phase1AuthorityBundle } from "../../integration";
import {
  COLONY_BIOMES,
  COLONY_PROFESSIONS,
  COLONY_RESEARCH,
} from "../../content/phase2/ColonyDepthContent";
import {
  colonySurveySites,
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
): { render(): void; close(): void; destroy(): void } {
  const document = root.ownerDocument;
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
        ? "✓ " + targetId.replaceAll("-", " ")
        : result.reason.replaceAll("_", " ");
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
    button.dataset.colonyAction = action + ":" + targetId;
    button.addEventListener("click", () => run(action, targetId));
    parent.append(button);
  };
  const sites = colonySurveySites(bundle.config.worldSeed);
  function render(): void {
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
    const current = JSON.stringify([
      panel,
      state.revision,
      inventory.revision,
      nearSite?.id,
      Math.hypot(position.x, position.y) <= 7.5,
      feedback,
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
            Math.hypot(position.x, position.y) > 7.5,
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
          " visited regions · return to base. Choice is permanent.";
        row.append(requirement);
        addButton(
          row,
          state.professions[playerId] === id ? "✓ Selected" : "Specialize",
          "specialize",
          id,
          !eligible ||
            state.professions[playerId] !== undefined ||
            Math.hypot(position.x, position.y) > 7.5,
        );
        content.append(row);
      }
    if (panel === "journal") {
      const discovered=sites.filter(site=>{const coord=fromWorldPosition(site.position),view=bundle.worldStore.query(coord);if(!view)return false;const local=toChunkLocalPosition(site.position,coord);return isExplorationCellKnown(coord,view.delta.exploration,Math.floor(local.x/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS),Math.floor(local.y/PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS));});
      for(const site of discovered){
        const row=document.createElement('article'),distance=Math.round(Math.hypot(position.x-site.position.x,position.y-site.position.y));
        row.dataset.discoveredLandmark=site.id;row.append(site.name+' · '+distance+' m');
        if(!state.inspectedSites.includes(site.id))addButton(row,'Inspect','inspect-site',site.id,Math.hypot(position.x-site.position.x,position.y-site.position.y)>1.25);
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
    close() { panel = null; signature = ''; render(); },
    destroy() {
      document.removeEventListener("keydown", onKey);
      audio.destroy();
      container.remove();
    },
  };
}
