import type {
  SaveResult,
} from '../../persistence/repository/SaveRepositoryV2';
import type {
  WorldManifestV2,
} from '../../persistence/schema/v2/WorldManifestV2';

export interface Phase1ProductReviewSaveControl {
  destroy(): void;
}

type SaveWorld = () => Promise<SaveResult<WorldManifestV2>>;

const SAVE_SUCCESS_VISIBLE_MS = 1800;
const SAVE_FAILURE_VISIBLE_MS = 4200;

function styleElement(document: Document): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = [
    '.p1-product-save{position:absolute;left:50%;top:50%;width:640px;height:360px;transform-origin:center center;pointer-events:none;z-index:41;font-family:monospace;font-size:8px;line-height:1.25;color:#f4f6ef;text-shadow:1px 1px 0 #10141b;}',
    '.p1-product-save-box{position:absolute;left:8px;top:110px;max-width:260px;padding:3px 5px;background:rgba(10,14,22,.9);border:1px solid #778094;}',
    '.p1-product-save[data-save-state="pending"] .p1-product-save-box{border-style:solid;}',
    '.p1-product-save[data-save-state="failure"] .p1-product-save-box{border-style:double;}',
    '[data-product-review-panel-open="true"] .p1-product-save[data-save-state="idle"], [data-product-review-help-open="true"] .p1-product-save[data-save-state="idle"]{display:none!important;}',
    '.p1-product-save:not([data-save-state="idle"]) .p1-product-save-box{left:50%;top:4px;transform:translateX(-50%);max-width:600px;width:max-content;box-sizing:border-box;}',
  ].join('');
  return style;
}

export function createPhase1ProductReviewSaveControl(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  saveWorld: SaveWorld,
): Phase1ProductReviewSaveControl {
  const document = root.ownerDocument;
  const targetWindow = document.defaultView ?? window;
  const layer = document.createElement('div');
  layer.className = 'p1-product-save';
  layer.dataset.productReviewSave = 'local-authority';
  layer.dataset.saveState = 'idle';
  layer.append(styleElement(document));

  const box = document.createElement('div');
  box.className = 'p1-product-save-box';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  box.textContent = 'L · SAVE WORLD';
  layer.append(box);
  root.append(layer);

  const helpPanel = root.querySelector<HTMLElement>(
    '.p1-product-controls-panel',
  );
  const helpRow = document.createElement('div');
  helpRow.className = 'p1-product-controls-row';
  helpRow.dataset.productReviewSaveHelp = 'true';
  helpRow.textContent = 'L · SAVE WORLD';
  helpPanel?.append(helpRow);

  let destroyed = false;
  let pending = false;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  const applyScale = (): void => {
    const raw = Number(canvas.dataset.displayScale ?? '1');
    const scale = Number.isFinite(raw) && raw >= 1 ? raw : 1;
    layer.style.transform =
      'translate(-50%, -50%) scale(' + String(scale) + ')';
    layer.dataset.displayScale = String(scale);
  };
  targetWindow.addEventListener('resize', applyScale);
  applyScale();

  const clearScheduledState = (): void => {
    if (clearTimer !== null) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
  };

  const setState = (
    state: 'idle' | 'pending' | 'success' | 'failure',
    text: string,
  ): void => {
    layer.dataset.saveState = state;
    box.textContent = text;
  };

  const scheduleIdle = (delayMs: number): void => {
    clearScheduledState();
    clearTimer = setTimeout(() => {
      clearTimer = null;
      if (destroyed || pending) return;
      setState('idle', 'L · SAVE WORLD');
    }, delayMs);
  };

  const triggerSave = async (): Promise<void> => {
    if (destroyed || pending) return;
    pending = true;
    clearScheduledState();
    setState('pending', 'Saving…');

    try {
      const result = await saveWorld();
      if (destroyed) return;
      pending = false;
      if (result.ok) {
        setState('success', root.dataset.savedReviewBookmark === 'unavailable'
          ? 'World saved — bookmark this page to return; Continue is unavailable.'
          : 'World saved');
        scheduleIdle(SAVE_SUCCESS_VISIBLE_MS);
        return;
      }

      setState(
        'failure',
        'Save failed — progress since your last successful save is not durable. Retry Save.',
      );
      scheduleIdle(SAVE_FAILURE_VISIBLE_MS);
    } catch {
      if (destroyed) return;
      pending = false;
      setState(
        'failure',
        'Save failed — progress since your last successful save is not durable. Retry Save.',
      );
      scheduleIdle(SAVE_FAILURE_VISIBLE_MS);
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.code !== 'KeyL') return;
    event.preventDefault();
    void triggerSave();
  };
  document.addEventListener('keydown', onKeyDown);
  const settingsPanel=root.querySelector('[data-colony-settings]');
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.textContent='Save world [L]';
  if(settingsPanel!==null){settingsPanel.append(saveButton,box);saveButton.addEventListener('click',()=>{void triggerSave();});}
  const leaveButton = document.createElement('button');
  leaveButton.type = 'button';
  leaveButton.textContent = 'Lưu và về sảnh';
  leaveButton.addEventListener('click', () => {
    if (pending) return;
    leaveButton.disabled = true;
    void triggerSave().then(() => {
      if (layer.dataset.saveState === 'success' && root.dataset.savedReviewBookmark !== 'unavailable')
        targetWindow.location.assign(targetWindow.location.pathname);
      else if (layer.dataset.saveState === 'success') box.textContent = 'World saved — bookmark this page before leaving.';
    }).finally(() => { leaveButton.disabled = false; });
  });
  settingsPanel?.append(leaveButton);

  return Object.freeze({
    destroy(): void {
      destroyed = true;
      pending = false;
      clearScheduledState();
      document.removeEventListener('keydown', onKeyDown);
      targetWindow.removeEventListener('resize', applyScale);
      helpRow.remove();
      saveButton.remove();
      leaveButton.remove();
      if(settingsPanel!==null)box.remove();
      layer.remove();
    },
  });
}
