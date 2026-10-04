import { expect, it } from 'vitest';
import { createIndustryPanel } from '../../src/client/runtime/IndustryPanel';
import { emptyIndustryState } from '../../src/simulation/industry/IndustryState';
import { assertDictionaryParity, setLocale } from '../../src/client/localization/Locale';
import { industryMessages } from '../../src/client/localization/IndustryMessages';

it('industry changes locale without changing draft placement, focus, IDs or the existing Farm shortcut', () => {
  const root = document.createElement('div'); document.body.append(root);
  const handle = createIndustryPanel(root, { read: () => emptyIndustryState(), inventory: () => [], position: () => ({ x: 0, y: 0 }), command: () => ({ status: 'rejected', reason: 'RESEARCH_REQUIRED' }) });
  try {
    assertDictionaryParity(industryMessages);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('false');
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('true');
    const x = root.querySelector<HTMLInputElement>('[data-industry-control="offset-x"]') ?? root.querySelector<HTMLInputElement>('input');
    expect(x).not.toBeNull(); x!.value = '-1.5'; x!.dispatchEvent(new Event('input')); x!.focus();
    setLocale('vi');
    const translated = root.querySelector<HTMLInputElement>('[aria-label="Độ lệch X"]')!;
    expect(translated.value).toBe('-1.5'); expect(document.activeElement).toBe(translated);
    expect(root.querySelector('[data-industry-control="build-solar-array"]')?.textContent).toBe('Xây Dàn pin mặt trời');
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    expect(root.dataset.industryOpen).toBe('false');
  } finally { setLocale('en'); handle.destroy(); root.remove(); }
});
