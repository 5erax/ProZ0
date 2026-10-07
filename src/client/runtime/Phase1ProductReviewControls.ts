import { panelShell } from '../presentation/PanelShell';
import { gameUiText } from '../localization/GameUiMessages';
import { PANEL_SHORTCUTS } from '../input/PanelShortcuts';
import { bindLocalized } from '../localization/Locale';
import { uiPhrase, uiText, bindUiText } from '../localization/UiMessages';
import { createColonySettings } from './ColonySettings';
export interface Phase1ProductReviewControls {
  toggle(): void;
  close(): void;
  destroy(): void;
}

function styleElement(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-product-controls{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center center;pointer-events:none;z-index:40;font-family:monospace;font-size:8px;line-height:1.25;color:#f4f6ef;text-shadow:1px 1px 0 #10141b;}',
    '.p1-product-controls-hint{position:absolute;left:8px;top:92px;padding:3px 5px;background:rgba(10,14,22,.86);border:1px dashed #778094;}',
    '[data-product-review-panel-open="true"] .p1-product-controls-hint{display:none!important;}',
    '[data-product-review-panel-open="true"] .p1-fullscreen,[data-product-review-help-open="true"] .p1-fullscreen{display:none;}',
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
  colonyDepth = false,
): Phase1ProductReviewControls {
  const document = root.ownerDocument;
  const targetWindow = document.defaultView ?? window;
  const settings=colonyDepth?createColonySettings(root):null;
  const layer = document.createElement('div');
  layer.className = 'p1-product-controls';
  layer.dataset.productReviewControls = 'closed';
  layer.dataset.presentationAuthority = 'derived-help-only';
  layer.append(styleElement(document));

  const hint = document.createElement('div');
  hint.className = 'p1-product-controls-hint';
  bindUiText(hint,"textContent",uiText("ui.5939517c"));
  layer.append(hint);

  const fullscreen = document.createElement('button');
  fullscreen.type = 'button';
  fullscreen.className = 'p1-fullscreen';
  bindUiText(fullscreen,"textContent",'FULLSCREEN');
  bindUiText(fullscreen,"aria-label",uiText("ui.7d698ce6"));
  fullscreen.style.cssText = 'position:absolute;right:8px;top:76px;pointer-events:auto;font:inherit;color:inherit;background:#0a0e16;border:1px solid #778094;padding:4px;cursor:pointer';
  const toggleFullscreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement !== null) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      bindUiText(fullscreen,"textContent",uiText("ui.56970fc8"));
    }
  };
  const updateFullscreen = (): void => {
    bindUiText(fullscreen,"textContent",document.fullscreenElement === null ? 'FULLSCREEN' : uiText("ui.acfe0046"));
  };
  fullscreen.addEventListener('click', () => { void toggleFullscreen(); });
  document.addEventListener('fullscreenchange', updateFullscreen);
  (root.querySelector('[data-colony-settings] .ui-panel-body') ?? layer).append(fullscreen);

  const panel = document.createElement('section');
  panel.className = 'p1-product-controls-panel';
  panel.hidden = true;
  bindUiText(panel,"aria-label",uiText("ui.9ae0296a"));

  const title = document.createElement('div');
  title.className = 'p1-product-controls-title';
  bindUiText(title,"textContent",uiText("ui.ca993b84"));
  panel.append(title);

  const rows = Object.freeze([
    uiText("ui.899850d"),
    ...(colonyDepth ? [uiText("ui.80757c8f"), uiText("ui.6be35005")] : []),
    uiText("ui.d6c46050"),
    uiText("ui.30f6de19"),
    uiText("ui.3a381566"),
    uiText("ui.76860a07"),
    uiText("ui.efe9f674"),
    uiText("ui.ca74032a"),
    uiText("ui.ba9ddea0"),
    uiText("ui.e4d901e2"),
    uiText("ui.3bcb9901"),
  ]);
  for (const text of rows) {
    const row = document.createElement('div');
    row.className = 'p1-product-controls-row';
    bindUiText(row,"textContent",text);
    panel.append(row);
  }
  const shortcuts=Object.values(PANEL_SHORTCUTS).filter(shortcut=>colonyDepth||!['F','N','U','J','O'].includes(shortcut.key));
  const summary=document.createElement('div');summary.className='p1-product-controls-row';
  bindLocalized(summary,'textContent',()=>shortcuts.map(shortcut=>shortcut.key+' · '+uiPhrase(shortcut.label)).join(' / '));panel.append(summary);
  for(const [message,shortcut] of [['craftControls',PANEL_SHORTCUTS.craft],['buildControls',PANEL_SHORTCUTS.build]] as const){
    const row=document.createElement('div');row.className='p1-product-controls-row';
    bindLocalized(row,'textContent',()=>gameUiText(message,{key:shortcut.key}));panel.append(row);
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
    root.dataset.productReviewHelpOpen = String(open);
  };

  const close=document.createElement('button');close.addEventListener('click',()=>setOpen(false));
  panelShell(panel,title,close);
  return Object.freeze({
    toggle(): void {
      setOpen(layer.dataset.productReviewControls !== 'open');
    },
    close(): void {
      setOpen(false);
    },
    destroy(): void {
      settings?.destroy();
      document.removeEventListener('fullscreenchange', updateFullscreen);
      targetWindow.removeEventListener('resize', applyScale);
      delete root.dataset.productReviewHelpOpen;
      layer.remove();
    },
  });
}
