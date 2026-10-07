import { expect, it, vi } from 'vitest';
import { createGameLobby } from '../../src/client/runtime/GameLobby';
import { setLocale } from '../../src/client/localization/Locale';

it('separates appearance from modes, groups account/language, and preserves a drafted seed when the primary CTA opens solo', () => {
  const root=document.createElement('section');root.id='app';document.body.append(root);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({account:null}),{status:200,headers:{'Content-Type':'application/json'}})));
  const lobby=createGameLobby(root);
  try {
    expect(root.querySelector('.lobby-tabs [data-lobby-view=skins]')).toBeNull();
    expect(root.querySelector('.lobby-account-actions [data-lobby-view=skins]')).not.toBeNull();
    expect(root.querySelector('.lobby-account-actions [data-locale-choice]')).not.toBeNull();
    const seed=root.querySelector<HTMLInputElement>('[data-single-player-seed]')!;seed.value='keep-draft';
    root.querySelector<HTMLButtonElement>('[data-primary-journey]')!.click();
    expect(root.querySelector<HTMLInputElement>('[data-single-player-seed]')!.value).toBe('keep-draft');
    root.querySelector<HTMLButtonElement>('[data-locale-choice] [data-language=vi]')!.click();
    expect(root.querySelector('[data-language=vi]')!.getAttribute('aria-pressed')).toBe('true');
    root.querySelector<HTMLButtonElement>('[data-lobby-view=skins]')!.click();
    expect(root.querySelector('.lobby-skins [aria-pressed=true] [data-selected-appearance]')!.textContent).toContain('Đã chọn');
  } finally {lobby.destroy();root.remove();setLocale('en');vi.unstubAllGlobals();}
});
