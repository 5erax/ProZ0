import './ArrivalCutscene.css';
import { bindLocalized } from '../localization/Locale';
import { applyProductionSprite, playerActorSprite, PHASE1_PRODUCTION_WORLD_SPRITES } from '../presentation/Phase1ProductionAssets';
import { selectedPlayerSkin, playerSkinFilter } from './PlayerProfile';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
export async function playArrivalCutscene(
  root: HTMLElement,
  query: URLSearchParams,
): Promise<void> {
  if (query.get("proz0Intro") !== "1") return;
  const world =
      query.get("proz0WorldId") ?? query.get("proz0Room") ?? "arrival",
    key = "proz0:arrival:" + world;
  const clean = () => {
    const url = new URL(location.href);
    url.searchParams.delete("proz0Intro");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  };
  let seen = false;
  try { seen = !!localStorage.getItem(key); } catch { /* The intro also works with storage disabled. */ }
  if (seen) {
    clean();
    return;
  }
  root.dataset.runtimeStatus = "cinematic";
  const doc = root.ownerDocument,
    overlay = doc.createElement("section");
  overlay.className = "proz0-arrival";
  overlay.setAttribute("role", "dialog");
  bindUiText(overlay,"aria-label",uiText("ui.fffaa29b"));
  overlay.setAttribute("aria-modal", "true");
  const frame = doc.createElement("div");
  frame.className = "arrival-frame";
  const art = doc.createElement("div");
  art.className = "arrival-art";
  // Authored scenery only; player/world text never enters SVG markup.
  const module=PHASE1_PRODUCTION_WORLD_SPRITES.landingModule;
  const pod='<g class="arrival-pod"><image href="'+module.url+'" x="250" y="91" width="140" height="'+140*module.cellHeight/module.cellWidth+'"/></g>';
  const land='<path d="M50 224L320 94 590 224 320 352Z" fill="#5c7762"/><path d="M50 224v22l270 130v-24Z" fill="#294a49"/><path d="M320 352v24l270-130v-22Z" fill="#203c41"/><path d="M50 224l270-130 270 130" fill="none" stroke="#93a77a" stroke-width="4"/>';
  const stars='<g class="arrival-star" fill="#96b4af"><path d="M50 24h3v3h-3M120 50h2v2h-2M200 18h3v3h-3M540 34h3v3h-3M480 76h2v2h-2M400 30h2v2h-2"/></g>';
  const scenery=[
    '<g data-scene-role="distant-fragments" opacity=".65"><path d="M18 168l90-44 92 44-92 45Z" fill="#385b59"/><path d="M400 240l115-54 110 54-110 55Z" fill="#44635f"/><path d="M120 280l65-30 70 30-70 32Z" fill="#29494e"/></g><g transform="translate(115 110) scale(.6)">'+land+'</g><g transform="translate(300 -30) scale(.48)">'+pod+'</g><path class="arrival-signal" d="M320 176h18v6h-18m6-6v-10h6v10" fill="#b8dac6"/>',
    land+'<g data-scene-role="descent-thruster" class="arrival-descending">'+pod+'<path class="arrival-thruster" d="M288 187v18h8v-13h8v18h8v-10h8v15h8v-15h8v10h8v-18h8v13h8v-18Z" fill="#d9b87e"/></g><g class="arrival-dust" fill="#adc39c"><path d="M238 220h18v5h-18m110 6h22v5h-22m-74 13h18v5h-18"/></g>',
    land+'<path d="M78 228l90-44 74 34-92 44Z" fill="#448490"/><path d="M82 232l54 18 72-33" stroke="#7eb9b8" stroke-width="4" fill="none"/>'+pod+'<g data-scene-role="resource-silhouettes"><path d="M152 204v-38h10v38" fill="#4c4c38"/><path d="M116 160l40-28 42 28-14 24h-55Z" fill="#94aa76"/><path d="M438 234v-44h10v44" fill="#4c4c38"/><path d="M402 184l41-30 40 30-12 24h-57Z" fill="#7e9c65"/><path d="M252 287l18-23 27 6 9 23-37 7Z" fill="#8b9c99"/><path d="M376 279v-18m-9 9 9-9 9 9" fill="none" stroke="#a4bf79" stroke-width="5"/></g>',
  ];
  const player=doc.createElement('span');player.dataset.sceneRole='player';player.className='arrival-player';
  const skin=selectedPlayerSkin();player.dataset.skin=skin;player.style.filter=playerSkinFilter(skin);
  applyProductionSprite(player,playerActorSprite('S','IDLE',0).sprite,3);
  const progress=doc.createElement('div');progress.className='arrival-progress';progress.setAttribute('aria-live','polite');
  const heading = doc.createElement("h1"),
    caption = doc.createElement("p"),
    actions = doc.createElement("div");
  actions.className = "arrival-actions";
  const next = doc.createElement("button"),
    skip = doc.createElement("button");
  bindUiText(next,"textContent",uiText("ui.ab43d664"));
  bindUiText(skip,"textContent",uiText("ui.c197c7e2"));
  next.className="arrival-next";skip.className="arrival-skip";
  actions.append(next, skip);
  frame.append(art,progress,heading,caption,actions);
  overlay.append(frame);
  root.append(overlay);
  const shots = [
    [
      uiText("ui.c9ebed7b"),
      uiText("ui.4d1f858c"),
    ],
    [
      uiText("ui.8db6a0bc"),
      uiText("ui.2fbaecea"),
    ],
    [
      uiText("ui.667480b"),
      uiText("ui.2da7b534"),
    ],
  ];
  await new Promise<void>((resolve) => {
    let index = 0, finished = false;
    const show = () => {
      bindUiText(heading,"textContent",shots[index]![0]!);
      bindUiText(caption,"textContent",shots[index]![1]!);
      art.dataset.shot = String(index);
      art.innerHTML='<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'+stars+scenery[index]+'</svg>';
      if(index===2)art.append(player);
      progress.textContent=String(index+1).padStart(2,'0')+' / 03';
      art.style.filter =
        index === 0
          ? "brightness(.75)"
          : index === 1
            ? "brightness(.9)"
            : "none";
      bindLocalized(next,"textContent",()=> (index === shots.length - 1 ? uiText("ui.d07f2e12") : uiText("ui.ab43d664"))+" →");
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      doc.removeEventListener("keydown", keyboard);
      try { localStorage.setItem(key, "seen"); } catch { /* Never prevent entering the world. */ }
      clean();
      overlay.dataset.leaving="true";next.disabled=true;skip.disabled=true;
      setTimeout(()=>{overlay.remove();resolve();},doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450);
    };
    const advance = () => {
      if (finished) return;
      if (++index >= shots.length) finish();
      else show();
    };
    const keyboard = (event: KeyboardEvent) => {
      if(event.repeat){if(event.code==="Enter")event.preventDefault();return;}
      if (event.code === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.code === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        advance();
      }
    };
    next.addEventListener("click", advance);
    skip.addEventListener("click", finish);
    doc.addEventListener("keydown", keyboard);
    show();
    next.focus();
  });
}
