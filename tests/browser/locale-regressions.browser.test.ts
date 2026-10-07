import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createPhase1ProductReviewRuntime } from '../../src/client/runtime/Phase1ProductReviewRuntime';
import { createColonyPlaytestTools } from '../../src/client/runtime/ColonyPlaytestTools';
import { createColonySettings } from '../../src/client/runtime/ColonySettings';
import { setLocale } from '../../src/client/localization/Locale';

it('renders Vietnamese carry and map labels without raw codes or English decimal separators', async () => {
  setLocale('vi');
  const root = document.createElement('section'); root.id = 'app'; root.style.cssText = 'position:relative;width:1280px;height:720px'; document.body.append(root);
  const runtime = await createPhase1ProductReviewRuntime(root, {worldId:'world:locale-regressions',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  try {
    const carry = root.querySelector<HTMLElement>('[data-region=carry]')!;
    expect(carry.textContent).toContain('Bình thường');
    expect(carry.textContent).not.toMatch(/\d+\.\d/);
    expect(carry.getAttribute('aria-label')).not.toMatch(/\d+\.\d/);
    await userEvent.keyboard('m');
    root.querySelector<HTMLButtonElement>('[data-review-action=map-select-marker]')!.click();
    expect(root.querySelector('.p1-map-detail')!.textContent).not.toMatch(/\b(BASE|DETAIL|FAR|NEAR)\b/);
  } finally {runtime.destroy();root.remove();setLocale('en');}
});

it('keeps local playtest/export controls out of normal Settings', () => {
  const root = document.createElement('section'); root.innerHTML = '<section data-colony-settings></section>'; document.body.append(root);
  const tools = createColonyPlaytestTools(root, () => { throw new Error('Support sampling must be opt-in'); });
  try {expect(root.querySelector('[data-colony-settings]')!.children).toHaveLength(0);} finally {tools.destroy();root.remove();}
});

it('scans representative Vietnamese panels for the reported internal codes and glossary leaks', async () => {
  setLocale('vi');
  const root = document.createElement('section'); root.id = 'app'; root.style.cssText = 'position:relative;width:1280px;height:720px'; document.body.append(root);
  const settings = createColonySettings(root);
  const runtime = await createPhase1ProductReviewRuntime(root, {worldId:'world:locale-panel-scan',worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  try {
    for (const key of ['i','c','b','m','f','j','u','n','o']) {
      await userEvent.keyboard('{Escape}'); await userEvent.keyboard(key);
      for (const panel of root.querySelectorAll<HTMLElement>('.p1-panel,.lw-panel,.p2-colony-panel,.industry-dialog')) {
        if (panel.hidden || panel.getBoundingClientRect().height === 0) continue;
        expect(panel.textContent, 'panel ' + key).not.toMatch(/\b(INVALID|MIST RAIN|BASE|DETAIL|FAR|NORMAL|expanded storage|cultivation|Kit)\b/);
      }
    }
    await userEvent.keyboard('{Escape}'); root.querySelector<HTMLButtonElement>('.p2-settings>button')!.click();
    expect(root.querySelector('[data-colony-settings]')!.textContent).not.toMatch(/Base guide|Record a 10-minute playtest|Export|\bSkin\b/);
  } finally {runtime.destroy();settings.destroy();root.remove();setLocale('en');}
});
