export interface Phase1ProductReviewControls {
  toggle(): void;
  close(): void;
  destroy(): void;
}

function styleElement(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-product-controls{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center center;pointer-events:none;z-index:40;font-family:monospace;font-size:8px;line-height:1.25;color:#f4f6ef;text-shadow:1px 1px 0 #10141b;}',
    '.p1-product-controls-hint{position:absolute;left:8px;top:54px;padding:3px 5px;background:rgba(10,14,22,.90);border:1px solid #d6dccd;}',
    '.p1-product-controls-panel{position:absolute;left:50%;top:50%;width:390px;transform:translate(-50%,-50%);padding:8px;background:rgba(10,14,22,.96);border:1px solid #d6dccd;box-shadow:0 0 0 1px #111722 inset;}',
    '.p1-product-controls-panel[hidden]{display:none;}',
    '.p1-product-controls-title{font-size:11px;font-weight:700;border-bottom:1px solid #778094;padding-bottom:4px;margin-bottom:5px;}',
    '.p1-product-controls-row{padding:2px 0;}',
  ].join('');
  return style;
}

export function createPhase1ProductReviewControls(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
): Phase1ProductReviewControls {
  const document = root.ownerDocument;
  const targetWindow = document.defaultView ?? window;
  const layer = document.createElement('div');
  layer.className = 'p1-product-controls';
  layer.dataset.productReviewControls = 'closed';
  layer.dataset.presentationAuthority = 'derived-help-only';
  layer.append(styleElement(document));

  const hint = document.createElement('div');
  hint.className = 'p1-product-controls-hint';
  hint.textContent = 'H · CONTROLS';
  layer.append(hint);

  const panel = document.createElement('section');
  panel.className = 'p1-product-controls-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Product Review controls');

  const title = document.createElement('div');
  title.className = 'p1-product-controls-title';
  title.textContent = 'PRODUCT REVIEW CONTROLS · H TO CLOSE';
  panel.append(title);

  const rows = Object.freeze([
    'MOVE · WASD / ARROWS',
    'E · CONTEXT INTERACT / GATHER / RECOVER / MACHINE / WORKBENCH',
    'V · CONSUME / CANCEL CONSUME',
    'Q · EQUIP / UNEQUIP BASIC SPEAR',
    'T · EQUIP / UNEQUIP THERMAL WRAP',
    'SPACE · ATTACK',
    'C · CRAFT · 1–6 SELECT · [ / ] PAGE',
    'B · BUILD · TAB STRUCTURE · R ROTATE · ENTER PLACE',
    'I · INVENTORY · M · MAP · P · PROGRESSION',
    'ESC · CLOSE ACTIVE PANEL',
  ]);
  for (const text of rows) {
    const row = document.createElement('div');
    row.className = 'p1-product-controls-row';
    row.textContent = text;
    panel.append(row);
  }
  layer.append(panel);
  root.append(layer);

  const applyScale = (): void => {
    const raw = Number(canvas.dataset.displayScale ?? '1');
    const scale = Number.isFinite(raw) && raw >= 1 ? raw : 1;
    layer.style.transform =
      'translate(-50%, -50%) scale(' + String(scale) + ')';
    layer.dataset.displayScale = String(scale);
  };
  targetWindow.addEventListener('resize', applyScale);
  applyScale();

  const setOpen = (open: boolean): void => {
    panel.hidden = !open;
    hint.hidden = open;
    layer.dataset.productReviewControls = open ? 'open' : 'closed';
  };

  return Object.freeze({
    toggle(): void {
      setOpen(layer.dataset.productReviewControls !== 'open');
    },
    close(): void {
      setOpen(false);
    },
    destroy(): void {
      targetWindow.removeEventListener('resize', applyScale);
      layer.remove();
    },
  });
}
