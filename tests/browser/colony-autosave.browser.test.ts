import { expect, it } from 'vitest';
import { createPhase1ProductReviewSaveControl } from '../../src/client/runtime/Phase1ProductReviewSaveControl';
import { COLONY_AUTOSAVE_EVENT } from '../../src/client/runtime/ColonyAutosave';
import type { SaveResult } from '../../src/persistence/repository/SaveRepositoryV2';
import type { WorldManifestV2 } from '../../src/persistence/schema/v2/WorldManifestV2';
import { KeyboardInputAdapter } from '../../src/client/input/KeyboardInputAdapter';
import { mapMovementInput, isMovementInputCode } from '../../src/client/input/MovementInputMapper';

it('serializes autosaves behind an in-flight manual save, coalesces dawn/rest, displays failures outside settings and tears down', async () => {
  const root = document.createElement('section'), canvas = document.createElement('canvas'), settings = document.createElement('section');
  settings.dataset.colonySettings = ''; settings.hidden = true;
  root.append(canvas, settings); document.body.append(root);
  let calls = 0;
  const resolvers: ((result: SaveResult<WorldManifestV2>) => void)[] = [];
  const control = createPhase1ProductReviewSaveControl(root, canvas, () => { calls++; return new Promise(resolve => resolvers.push(resolve)); });
  const event = (id: string, reason: 'dawn' | 'rest') => root.dispatchEvent(new CustomEvent(COLONY_AUTOSAVE_EVENT, { detail: { id, reason, tick: 600 } }));
  try {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', bubbles: true }));
    expect(calls).toBe(1);
    event('dawn:1', 'dawn'); event('rest:1', 'rest'); event('rest:1', 'rest');
    expect(calls).toBe(1);
    resolvers[0]!({ ok: false, code: 'CORRUPT_RECORD', message: 'fixture failure' });
    await Promise.resolve(); await Promise.resolve();
    expect(calls).toBe(2);
    expect(root.querySelector<HTMLElement>('[data-product-review-save]')!.dataset.autosaveReason).toBe('rest');
    resolvers[1]!({ ok: false, code: 'CORRUPT_RECORD', message: 'fixture failure' });
    await Promise.resolve(); await Promise.resolve();
    const toast = root.querySelector<HTMLElement>('[data-autosave-feedback]')!;
    expect(toast.hidden).toBe(false); expect(toast.textContent).toContain('Save failed');
    expect(toast.closest('[data-colony-settings]')).toBeNull();
    event('rest:1', 'rest'); expect(calls).toBe(2);
    control.destroy(); event('dawn:2', 'dawn'); expect(calls).toBe(2);
  } finally { control.destroy(); root.remove(); }
});
it('does not capture Shift/WASD while typing, and clears held sprint after blur', () => {
  const input = document.createElement('input'); document.body.append(input);
  const adapter = new KeyboardInputAdapter(mapMovementInput, isMovementInputCode); adapter.start();
  try {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    expect(adapter.sample()).toMatchObject({ sprint: true, moveUp: true });
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    expect(adapter.sample().moveUp).toBe(false); expect(adapter.sample().sprint).toBeUndefined();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', bubbles: true }));
    window.dispatchEvent(new Event('blur')); expect(adapter.sample().sprint).toBeUndefined();
  } finally { adapter.stop(); input.remove(); }
});
