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
  const style = doc.createElement("style");
  style.textContent =
    `.proz0-arrival{position:fixed;inset:0;z-index:2000000;background:#081520;color:#e9edde;display:grid;place-items:center;font:16px monospace}.arrival-frame{width:min(880px,94vw);text-align:center}.arrival-art{height:min(48vh,360px);position:relative;overflow:hidden;background:radial-gradient(ellipse at 65% 70%,#6e8c6c 0,#203c42 35%,#071422 70%);border:1px solid #60817b}.arrival-art svg{height:100%;max-width:100%;image-rendering:pixelated;transition:transform 1s ease}.arrival-art[data-shot="0"] svg{transform:scale(.72) translateY(20px)}.arrival-art[data-shot="2"] svg{transform:scale(1.1)}.arrival-art[data-shot="1"] .arrival-pod{animation:arrival-land 1.4s ease-out both}@keyframes arrival-land{from{transform:translateY(-120px);opacity:.3}to{transform:translateY(0);opacity:1}}.arrival-frame p{line-height:1.7;min-height:4em;padding:0 12px}.arrival-actions{display:flex;justify-content:center;gap:12px}.arrival-actions button{background:#243c40;border:1px solid #99ac91;color:#eef1df;font:inherit;padding:12px 20px;cursor:pointer}.arrival-star{animation:arrival-drift 10s linear infinite}@keyframes arrival-drift{to{transform:translateY(12px)}}@media(prefers-reduced-motion:reduce){.arrival-star,.arrival-pod{animation:none!important}.arrival-art svg{transition:none}}`;
  const frame = doc.createElement("div");
  frame.className = "arrival-frame";
  const art = doc.createElement("div");
  art.className = "arrival-art";
  // Authored vector shot; text and untrusted user values never enter this markup.
  art.innerHTML =
    '<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#96b4af" class="arrival-star"><path d="M50 24h3v3h-3M120 50h2v2h-2M200 18h3v3h-3M540 34h3v3h-3M480 76h2v2h-2M400 30h2v2h-2"/></g><path d="M80 220L320 110 560 220 320 290Z" fill="#537568"/><path d="M80 220v18l240 62v-10Z" fill="#294a49"/><path d="M320 290v10l240-62v-18Z" fill="#203c41"/><path d="M208 160l112-54 112 54-112 53Z" fill="#799085"/><g class="arrival-pod"><path d="M276 131l44-22 44 22-44 21Z" fill="#c4cebb"/><path d="M276 131v55l44 22v-56Z" fill="#719ba0"/><path d="M320 152v56l44-22v-55Z" fill="#416b7c"/><path d="M284 145v16l24 12v-16Z" fill="#142b3c"/><path d="M328 157v15l28-14v-15Z" fill="#6bc1c0"/><path d="M288 186l32 16 32-16" fill="none" stroke="#d8a666" stroke-width="5"/></g><path d="M150 215v-22m-12 10 12-10 12 10M472 211v-25m-14 10 14-10 14 10" stroke="#92af7a" stroke-width="5" fill="none"/><path d="M217 231l15-8 17 8-17 8Z" fill="#8e9a8b"/></svg>';
  const heading = doc.createElement("h1"),
    caption = doc.createElement("p"),
    actions = doc.createElement("div");
  actions.className = "arrival-actions";
  const next = doc.createElement("button"),
    skip = doc.createElement("button");
  bindUiText(next,"textContent",uiText("ui.ab43d664"));
  bindUiText(skip,"textContent",uiText("ui.c197c7e2"));
  actions.append(next, skip);
  frame.append(art, heading, caption, actions);
  overlay.append(style, frame);
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
      art.style.filter =
        index === 0
          ? "brightness(.75)"
          : index === 1
            ? "brightness(.9)"
            : "none";
      bindUiText(next,"textContent",index === shots.length - 1 ? uiText("ui.d07f2e12") : uiText("ui.ab43d664"));
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      doc.removeEventListener("keydown", keyboard);
      try { localStorage.setItem(key, "seen"); } catch { /* Never prevent entering the world. */ }
      clean();
      overlay.remove();
      resolve();
    };
    const advance = () => {
      if (finished) return;
      if (++index >= shots.length) finish();
      else show();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.code === "Enter") {
        event.preventDefault();
        advance();
      }
    };
    next.addEventListener("click", advance);
    skip.addEventListener("click", finish);
    doc.addEventListener("keydown", keyboard);
    show();
    skip.focus();
  });
}
