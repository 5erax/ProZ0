import { expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { playArrivalCutscene } from '../../src/client/runtime/ArrivalCutscene';
import { setLocale } from '../../src/client/localization/Locale';

it('shows three distinct arrival events, the selected player in the final scene, and never replays a seen world', async () => {
  const root=document.createElement('section');document.body.append(root);
  const world='arrival-test-'+crypto.randomUUID(),query=new URLSearchParams({proz0Intro:'1',proz0WorldId:world});
  const finished=playArrivalCutscene(root,query);
  try {
    const art=root.querySelector<HTMLElement>('.arrival-art')!;
    const first=art.innerHTML;
    expect(art.querySelector('[data-scene-role=distant-fragments]')).not.toBeNull();
    expect(root.querySelector('.arrival-progress')!.textContent).toBe('01 / 03');
    expect(document.activeElement).toBe(root.querySelector('.arrival-next'));
    await userEvent.keyboard('{Enter}');
    expect(art.dataset.shot).toBe('1');expect(art.innerHTML).not.toBe(first);
    expect(art.querySelector('[data-scene-role=descent-thruster]')).not.toBeNull();
    const second=art.innerHTML;
    document.dispatchEvent(new KeyboardEvent('keydown',{code:'Enter',repeat:true,bubbles:true,cancelable:true}));
    expect(art.dataset.shot).toBe('1');
    setLocale('vi');await userEvent.keyboard('{Enter}');
    expect(art.dataset.shot).toBe('2');expect(art.innerHTML).not.toBe(second);
    expect(art.querySelector('[data-scene-role=player]')).not.toBeNull();
    expect(root.querySelector('.arrival-progress')!.textContent).toBe('03 / 03');
    expect(root.querySelector('.arrival-next')!.textContent).toContain('Bắt đầu');
    await userEvent.keyboard('{Enter}');await finished;
    expect(root.querySelector('.proz0-arrival')).toBeNull();
    await playArrivalCutscene(root,query);expect(root.children.length).toBe(0);
  } finally {
    root.querySelector<HTMLButtonElement>('.arrival-actions button:last-child')?.click();await finished;
    localStorage.removeItem('proz0:arrival:'+world);root.remove();setLocale('en');
  }
});
