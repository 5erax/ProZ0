export interface EntityInspectionView {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly facts: readonly string[];
}
type Reader = () => EntityInspectionView | null;
const readers = new WeakMap<Element, Reader>();

/** Ephemeral presentation binding; never stores or changes simulation state. */
export function bindEntityInspection(element: HTMLElement, read: Reader): void {
  if (readers.has(element)) return;
  readers.set(element, read);
  element.dataset.entityInspectable = 'true';
  if(element.tabIndex<0)element.tabIndex=0;
  element.removeAttribute('title');
}

export function createEntityInspection(root: HTMLElement, blocked: () => boolean) {
  const document = root.ownerDocument;
  const style = document.createElement('style');
  style.textContent = '.p2-entity-inspection{position:absolute;right:12px;top:112px;width:min(320px,calc(100% - 24px));max-height:min(280px,45vh);overflow:auto;box-sizing:border-box;z-index:1000030;background:#102029f2;border:1px solid #92ada9;padding:12px;color:#e2e8d6;font:12px monospace;pointer-events:auto;line-height:1.45}.p2-entity-inspection[hidden]{display:none}.p2-entity-inspection h2{font-size:14px;margin:0 30px 8px 0}.p2-entity-inspection p{margin:5px 0}.p2-entity-inspection button{position:absolute;right:6px;top:6px;background:#223a43;color:#e2e8d6;border:1px solid #8da5a2;cursor:pointer;padding:3px 7px}@media(max-height:450px){.p2-entity-inspection{top:84px;width:min(280px,44%);max-height:45vh;font-size:11px;padding:8px}}';
  const card = document.createElement('section');
  card.className = 'p2-entity-inspection'; card.dataset.entityInspection = 'true';
  card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'Entity statistics'); card.hidden = true;
  const heading = document.createElement('h2'), kind = document.createElement('p'), facts = document.createElement('div'), closeButton = document.createElement('button');
  closeButton.textContent = '×'; closeButton.type = 'button'; closeButton.setAttribute('aria-label', 'Close entity statistics');
  card.append(heading, kind, facts, closeButton); root.append(style, card);
  let selected: HTMLElement | null = null, signature = '', lastRefresh = 0;
  const close = () => { selected = null; signature = ''; card.hidden = true; delete card.dataset.entityId; };
  closeButton.onclick = close;
  const render = () => {
    if (!selected) return;
    if (!selected.isConnected && card.dataset.entityId) {
      const id=card.dataset.entityId;
      selected=Array.from(root.querySelectorAll<HTMLElement>('[data-entity-inspectable]')).slice(0,512).find(e=>readers.get(e)?.()?.id===id)??null;
    }
    if (!selected || selected.hidden || !root.contains(selected) || blocked()) { close(); return; }
    const now = performance.now(); if (now - lastRefresh < 250) return; lastRefresh = now;
    const view = readers.get(selected)?.(); if (!view) { close(); return; }
    const next = JSON.stringify(view); if (next === signature) return; signature = next;
    heading.textContent = view.name; kind.textContent = view.kind;
    facts.replaceChildren(...view.facts.slice(0, 12).map(value => { const p = document.createElement('p'); p.textContent = value; return p; }));
    card.dataset.entityId = view.id; card.hidden = false;
  };
  const inspect = (event: MouseEvent | KeyboardEvent): void => {
    if (blocked()) { close(); return; }
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-entity-inspectable]') : null;
    if (!target || !root.contains(target) || !readers.has(target)) { close(); return; }
    if (selected === target) { close(); return; }
    selected = target; lastRefresh = -Infinity; signature = ''; render();
  };
  const key = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    if (event.code === 'ContextMenu' || (event.code === 'F10' && event.shiftKey)) {
      if (event.target instanceof Element && root.contains(event.target) && event.target.closest('[data-entity-inspectable]')) { event.preventDefault(); event.stopImmediatePropagation(); inspect(event); }
    } else if (['Escape','KeyI','KeyC','KeyB','KeyM','KeyN','KeyF','KeyU','KeyJ'].includes(event.code)) close();
  };
  const pointer = (event: MouseEvent) => { if (event.target instanceof Element && !event.target.closest('[data-entity-inspection]')) close(); };
  document.addEventListener('keydown', key, true); root.addEventListener('click', pointer, true);
  return { inspect, render, close, destroy() { document.removeEventListener('keydown', key, true); root.removeEventListener('click', pointer, true); close(); card.remove(); style.remove(); } };
}
