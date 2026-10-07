import { expect, it } from 'vitest';
import { createIndustryPanel } from '../../src/client/runtime/IndustryPanel';
import { emptyIndustryState } from '../../src/simulation/industry/IndustryState';
import { assertDictionaryParity, setLocale } from '../../src/client/localization/Locale';
import { industryMessages } from '../../src/client/localization/IndustryMessages';
import { materialHint } from '../../src/client/presentation/MaterialGuide';

it('marks only the missing Industry material and explains the actual deficit in both languages', () => {
  const root = document.createElement('div'); document.body.append(root);
  const state = { ...emptyIndustryState(), researchIds: ['automation' as const] };
  const handle = createIndustryPanel(root, {
    read: () => state,
    inventory: () => [{ itemDefinitionId: 'item:metal-ore', quantity: 3 }, { itemDefinitionId: 'item:timber', quantity: 2 }, { itemDefinitionId: 'item:cordage', quantity: 1 }],
    position: () => ({ x: 0, y: 0 }), command: () => { throw new Error('Presentation must not execute a command'); },
  });
  try {
    handle.open();
    for (const language of ['en', 'vi'] as const) {
      setLocale(language);
      const card = root.querySelector<HTMLElement>('[data-industry-facility-kind="solar-array"]')!;
      expect(card.querySelector('[data-material="item:metal-ore"]')?.getAttribute('data-sufficient')).toBe('false');
      expect(card.querySelector('[data-material="item:timber"]')?.getAttribute('data-sufficient')).toBe('true');
      expect(card.querySelector('[data-material="item:cordage"]')?.getAttribute('data-sufficient')).toBe('true');
      const action = card.querySelector<HTMLButtonElement>('[data-industry-control="build-solar-array"]')!;
      expect(action.disabled).toBe(true);
      expect(action.title).toBe(language === 'vi' ? 'Thiếu: 1 quặng kim loại' : 'Missing: 1 metal ore');
      expect(card.textContent).toContain(action.title);
    }
  } finally { setLocale('en'); handle.destroy(); root.remove(); }
});

it('makes a partial material requirement readable without relying on colour', () => {
  setLocale('vi');
  try {
    const hint = materialHint(document, 'Dây thừng', 'Làm bằng sợi', 2, 3, 'item:cordage');
    expect(hint.querySelector('summary')!.getAttribute('aria-label')).toContain('Thiếu: 1 Dây thừng');
    expect(hint.querySelector('summary')!.textContent).toContain('2/3');
    expect(hint.dataset.deficit).toBe('1');
  } finally { setLocale('en'); }
});

it('industry changes locale without changing draft placement, focus, IDs or the existing Farm shortcut', () => {
  const root = document.createElement('div'); document.body.append(root);
  let released = false;
  const release = (event: KeyboardEvent) => { if (event.code === 'KeyW') released = true; };
  document.addEventListener('keyup', release);
  const handle = createIndustryPanel(root, { read: () => emptyIndustryState(), inventory: () => [], position: () => ({ x: 0, y: 0 }), command: () => ({ status: 'rejected', reason: 'RESEARCH_REQUIRED' }) });
  try {
    assertDictionaryParity(industryMessages);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('false');
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('true');
    // Opening a modal while walking must still deliver the physical key release.
    document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    expect(released).toBe(true);
    const x = root.querySelector<HTMLInputElement>('[data-industry-control="offset-x"]') ?? root.querySelector<HTMLInputElement>('input');
    expect(x).not.toBeNull(); x!.value = '-1.5'; x!.dispatchEvent(new Event('input')); x!.focus();
    setLocale('vi');
    const translated = root.querySelector<HTMLInputElement>('[aria-label="Độ lệch X"]')!;
    expect(translated.value).toBe('-1.5'); expect(document.activeElement).toBe(translated);
    expect(root.querySelector('[data-industry-control="build-solar-array"]')?.textContent).toBe('Xây Dàn pin mặt trời');
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('false');
  } finally { document.removeEventListener('keyup', release); setLocale('en'); handle.destroy(); root.remove(); }
});

it('routes empty facilities and power tabs to construction without issuing a gameplay command',()=>{
 const root=document.createElement('div');document.body.append(root);
 const handle=createIndustryPanel(root,{read:()=>emptyIndustryState(),inventory:()=>[],position:()=>({x:0,y:0}),command:()=>{throw Error('Navigation must not mutate authority');}});
 try{handle.open();for(const [tab,action] of [['production','empty-build'],['networks','empty-power-build']]){
  root.querySelector<HTMLButtonElement>('[data-industry-control=tab-'+tab+']')!.click();root.querySelector<HTMLButtonElement>('[data-industry-control='+action+']')!.click();
  expect(root.querySelector('[data-industry-facility-kind=solar-array]')).not.toBeNull();
 }}finally{handle.destroy();root.remove();}
});
