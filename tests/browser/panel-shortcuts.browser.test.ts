import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createPhase1ProductReviewRuntime } from '../../src/client/runtime/Phase1ProductReviewRuntime';
import { setLocale } from '../../src/client/localization/Locale';

async function fixture(id: string) {
  const root = document.createElement('section'); root.id='app'; root.style.cssText='position:relative;width:1280px;height:720px'; document.body.append(root);
  const runtime = await createPhase1ProductReviewRuntime(root, {worldId:'world:shortcuts-'+id,worldSeed:'p1-world-golden',playerIds:['solo'],localPlayerId:'solo',singlePlayerExpeditionEnabled:true,colonyDepthEnabled:true,interactionRangeWorldUnits:1.25,spawnClearanceRadiusWorldUnits:1.25,requiredAccessRadiusWorldUnits:1.25});
  return {root,destroy:()=>{runtime.destroy();root.remove();setLocale('en');}};
}

it('shows an explicitly empty weapon slot without the silhouette of stored equipment', async () => {
  const {root,destroy}=await fixture('empty');
  try {
    const weapon=root.querySelector<HTMLElement>('[data-equipment-slot=weapon]')!;
    expect(weapon.querySelector('.p1-equipment-icon')).toBeNull();
    expect(weapon.dataset.equipmentState).toBe('EMPTY');
    expect(weapon.getAttribute('aria-label')).toContain('not equipped');
  } finally {destroy();}
});

it('keeps only the real Farm panel active through HUD ticks and maps P to the same professions panel as navigation', async () => {
  const {root,destroy}=await fixture('active');
  try {
    for (const language of ['en','vi'] as const) {
      setLocale(language);
      await userEvent.keyboard('f');
      await new Promise(resolve=>setTimeout(resolve,120));
      expect(root.querySelector('[data-review-action=open-farm]')!.getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelectorAll('.p1-action-dock [aria-pressed=true]')).toHaveLength(1);
      await userEvent.keyboard('{Escape}');
      expect(root.dataset.livingPanelOpen).toBe('false');
      await userEvent.keyboard('p');
      expect(root.dataset.colonyDepthPanel).toBe('professions');
      expect(root.querySelector('[data-colony-panel=professions]')!.getAttribute('aria-pressed')).toBe('true');
      await userEvent.keyboard('{Escape}');
      expect(root.dataset.colonyDepthPanel).toBe('');
    }
  } finally {destroy();}
});

it('mouse Build shortcuts share the construction destination and close Industry before opening it', async () => {
 const {root,destroy}=await fixture('construction');
 try {
  await userEvent.keyboard('o');expect(root.dataset.industryOpen).toBe('true');
  root.querySelector<HTMLButtonElement>('[data-review-action=open-build]')!.click();
  expect(root.dataset.industryOpen).toBe('false');expect(root.dataset.expeditionPanelOpen).toBe('true');
  expect(root.querySelector('.sp-expedition-panel [data-construction-definition="structure:storage-crate"]')).not.toBeNull();
  expect(root.querySelector('[data-panel-kind=build]')).toBeNull();
  await expect.poll(()=>root.querySelector('[data-review-action=open-build]')!.getAttribute('aria-pressed')).toBe('true');
  root.querySelector<HTMLButtonElement>('[data-review-action=open-build]')!.click();expect(root.dataset.expeditionPanelOpen).toBe('false');
 } finally {destroy();}
});
