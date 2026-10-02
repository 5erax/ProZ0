import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { createColonyAudio } from '../../src/client/presentation/ColonyAudio';
import { colonyWeatherAt } from '../../src/world/phase2/ColonyRegions';

let controller: ReturnType<typeof createColonyAudio> | null = null;
let root: HTMLElement;
function setup() {
  root = document.createElement('section');
  document.body.append(root);
  controller = createColonyAudio(root);
  return {
    control: controller,
    audio: root.querySelector<HTMLAudioElement>('audio')!,
    button: root.querySelector<HTMLButtonElement>('button')!,
    volume: root.querySelector<HTMLInputElement>('input')!,
  };
}
afterEach(() => {
  controller?.destroy();
  controller = null;
  root?.remove();
  vi.restoreAllMocks();
});

describe('Owner-approved rain-only audio', () => {
  it('loads nothing by default, primes clear weather silently and only plays audible rain', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause');
    const { control, audio, button, volume } = setup();
    expect(audio.hasAttribute('src')).toBe(false);
    control.weather('mist-rain');
    expect(play).not.toHaveBeenCalled();
    control.weather('clear');
    button.click();
    await Promise.resolve();
    expect(audio.src).toMatch(/owner-rain-loop.*\.ogg/);
    expect(audio.volume).toBe(0);
    expect(pause).toHaveBeenCalled();
    control.weather('mist-rain');
    expect(play).toHaveBeenCalledTimes(2);
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0.35);
    control.weather('mist-rain');
    expect(play).toHaveBeenCalledTimes(2);
    volume.value = '0.7';
    volume.dispatchEvent(new Event('input'));
    expect(audio.volume).toBe(0.7);
    control.weather('dry-wind');
    expect(audio.volume).toBe(0);
    control.weather('mist-rain');
    button.click();
    expect(audio.volume).toBe(0);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    control.weather('clear');
    control.weather('mist-rain');
    expect(play).toHaveBeenCalledTimes(3);
    expect(root.querySelectorAll('audio')).toHaveLength(1);
  });

  it('ignores a stale rejected play when a newer enable attempt succeeds', async () => {
    let rejectFirst!: (reason: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectFirst = reject;
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockReturnValueOnce(pending)
      .mockResolvedValue();
    const { control, audio, button } = setup();
    control.weather('mist-rain');
    button.click();
    button.click();
    button.click();
    rejectFirst(new Error('stale abort'));
    await Promise.resolve();
    await Promise.resolve();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(audio.volume).toBe(0.35);
    expect(root.querySelector('[role=status]')?.textContent).toBe('');
  });

  it('reports failed playback, permits retry and releases pending playback on destroy', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new Error('autoplay rejected'))
      .mockResolvedValue();
    const { control, audio, button } = setup();
    control.weather('mist-rain');
    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Enable sound'));
    expect(audio.volume).toBe(0);
    expect(root.querySelector('[role=status]')?.textContent).toContain('retry');
    button.click();
    expect(button.textContent).toBe('Mute sound');
    control.destroy();
    await Promise.resolve();
    control.weather('mist-rain');
    button.click();
    expect(play).toHaveBeenCalledTimes(2);
    expect(audio.hasAttribute('src')).toBe(false);
    expect(root.children).toHaveLength(0);
    control.destroy();
  });

  it('decodes and plays the supplied OGG on an actual gesture and resumes when rain arrives later', async () => {
    const { control, audio } = setup();
    await page
      .getByRole('button', { name: 'Enable sound', exact: true })
      .click();
    await vi.waitFor(() => expect(audio.readyState).toBeGreaterThanOrEqual(2), {
      timeout: 10000,
    });
    await vi.waitFor(() => expect(audio.paused).toBe(true));
    expect(audio.duration).toBeGreaterThan(1);
    expect(audio.error).toBeNull();
    // Boundary fixture uses the real authority weather query, not a visual-only flag.
    control.weather(
      colonyWeatherAt('p1-world-golden', { x: 0, y: 0 }, 9000).weather,
    );
    await vi.waitFor(() => expect(audio.currentTime).toBeGreaterThan(0.1));
    expect(audio.paused).toBe(false);
    expect(audio.volume).toBe(0.35);
    expect(audio.loop).toBe(true);
    audio.currentTime = audio.duration - 0.05;
    await vi.waitFor(() => expect(audio.currentTime).toBeLessThan(1));
    expect(audio.ended).toBe(false);
    control.weather(
      colonyWeatherAt('p1-world-golden', { x: 0, y: 0 }, 12000).weather,
    );
    expect(audio.paused).toBe(true);
    expect(audio.volume).toBe(0);
    control.weather('mist-rain');
    await vi.waitFor(() => expect(audio.currentTime).toBeGreaterThan(0.1));
    await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
    expect(audio.paused).toBe(true);
    expect(audio.volume).toBe(0);
  });
});
