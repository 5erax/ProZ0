import { uiPhrase } from '../localization/UiMessages';
import { uiText } from '../localization/UiMessages';
import { bindUiText } from '../localization/UiMessages';
import type {
  SaveResult,
} from '../../persistence/repository/SaveRepositoryV2';
import type {
  WorldManifestV2,
} from '../../persistence/schema/v2/WorldManifestV2';
import { COLONY_AUTOSAVE_EVENT, type ColonyAutosaveIntent } from './ColonyAutosave';

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
  bindUiText(box,"textContent",uiText("ui.29c8b36f"));
  layer.append(box);
  root.append(layer);
  const toast = document.createElement('div');
  toast.className = 'p1-product-save-toast';
  toast.style.cssText = 'position:absolute;left:50%;top:4px;transform:translateX(-50%);padding:4px 8px;background:#10252ef0;border:1px solid #8da99b;width:max-content;max-width:90%;box-sizing:border-box';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  toast.dataset.autosaveFeedback = '';
  layer.append(toast);

  const helpPanel = root.querySelector<HTMLElement>(
    '.p1-product-controls-panel',
  );
  const helpRow = document.createElement('div');
  helpRow.className = 'p1-product-controls-row';
  helpRow.dataset.productReviewSaveHelp = 'true';
  bindUiText(helpRow,"textContent",uiText("ui.29c8b36f"));
  helpPanel?.append(helpRow);

  let destroyed = false;
  let pending = false;
  let queuedAutosave: ColonyAutosaveIntent | null = null;
  const seenAutosaves = new Set<string>();
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
    bindUiText(box,"textContent",text);
    toast.hidden = state === 'idle';
    bindUiText(toast,"textContent",text);
  };

  const scheduleIdle = (delayMs: number): void => {
    clearScheduledState();
    clearTimer = setTimeout(() => {
      clearTimer = null;
      if (destroyed || pending) return;
      setState('idle', uiText("ui.29c8b36f"));
    }, delayMs);
  };

  const triggerSave = async (auto?: ColonyAutosaveIntent): Promise<void> => {
    if (destroyed || pending) return;
    pending = true;
    clearScheduledState();
    setState('pending', auto ? 'Autosaving…' : 'Saving…');
    if (auto) { layer.dataset.autosaveReason = auto.reason; layer.dataset.autosaveId = auto.id; }

    try {
      const result = await saveWorld();
      if (destroyed) return;
      pending = false;
      if (result.ok) {
        setState('success', root.dataset.savedReviewBookmark === 'unavailable'
          ? uiPhrase('World saved — bookmark this page to return; Continue is unavailable.')
          : auto ? uiText("ui.d0eed671") : uiText("ui.acabeb48"));
        scheduleIdle(SAVE_SUCCESS_VISIBLE_MS);
        return;
      }

      setState(
        'failure',
        uiText("ui.e96d3967"),
      );
      scheduleIdle(SAVE_FAILURE_VISIBLE_MS);
    } catch {
      if (destroyed) return;
      pending = false;
      setState(
        'failure',
        uiText("ui.e96d3967"),
      );
      scheduleIdle(SAVE_FAILURE_VISIBLE_MS);
    } finally {
      pending = false;
      const next = queuedAutosave;
      queuedAutosave = null;
      if (next && !destroyed) void triggerSave(next);
    }
  };
  const onAutosave = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const intent = event.detail as ColonyAutosaveIntent;
    if (!intent || typeof intent.id !== 'string' || !['rest', 'dawn'].includes(intent.reason) || !Number.isSafeInteger(intent.tick) || intent.tick < 0 || seenAutosaves.has(intent.id)) return;
    seenAutosaves.add(intent.id);
    if (seenAutosaves.size > 64) seenAutosaves.delete(seenAutosaves.values().next().value!);
    if (pending) queuedAutosave = intent;
    else void triggerSave(intent);
  };
  root.addEventListener(COLONY_AUTOSAVE_EVENT, onAutosave);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.code !== 'KeyL') return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    event.preventDefault();
    void triggerSave();
  };
  document.addEventListener('keydown', onKeyDown);
  const settingsPanel=root.querySelector('[data-colony-settings]');
  const saveButton=document.createElement('button');saveButton.type='button';bindUiText(saveButton,"textContent",uiText("ui.27817d2a"));
  if(settingsPanel!==null){settingsPanel.append(saveButton,box);saveButton.addEventListener('click',()=>{void triggerSave();});}
  const leaveButton = document.createElement('button');
  leaveButton.type = 'button';
  bindUiText(leaveButton,"textContent",uiText("ui.f06abc6a"));
  leaveButton.addEventListener('click', () => {
    if (pending) return;
    leaveButton.disabled = true;
    void triggerSave().then(() => {
      if (layer.dataset.saveState === 'success' && root.dataset.savedReviewBookmark !== 'unavailable')
        targetWindow.location.assign(targetWindow.location.pathname);
      else if (layer.dataset.saveState === 'success') bindUiText(box,"textContent",uiText("ui.86a19d30"));
    }).finally(() => { leaveButton.disabled = false; });
  });
  settingsPanel?.append(leaveButton);

  return Object.freeze({
    destroy(): void {
      destroyed = true;
      pending = false;
      queuedAutosave = null;
      root.removeEventListener(COLONY_AUTOSAVE_EVENT, onAutosave);
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
