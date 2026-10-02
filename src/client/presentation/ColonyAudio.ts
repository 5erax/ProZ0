import type { ColonyWeather } from '../../world/phase2/ColonyRegions';

// Owner policy: silence except this explicitly supplied rain loop.
// Do not restore biome/UI/action cues without a new sound-design request.
const rainUrl = new URL(
  '../../../assets/phase2/audio/owner-rain-loop.ogg',
  import.meta.url,
).href;
export function createColonyAudio(parent: HTMLElement): {
  weather(weather: ColonyWeather): void;
  destroy(): void;
} {
  const document = parent.ownerDocument;
  const rain = new document.defaultView!.Audio();
  rain.loop = true;
  rain.preload = 'none';
  rain.dataset.colonyRainAudio = '';
  let enabled = false;
  let raining = false;
  let volume = 0.35;
  let destroyed = false;
  let generation = 0;
  const controls = document.createElement('div');
  controls.className = 'p2-audio-controls';
  const button = document.createElement('button');
  button.type = 'button';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '.05';
  slider.value = String(volume);
  slider.setAttribute('aria-label', 'Sound volume');
  slider.style.width = '80px';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.dataset.rainAudioStatus = '';
  const update = (): void => {
    rain.volume = enabled && raining ? volume : 0;
    button.textContent = enabled ? 'Mute sound' : 'Enable sound';
    button.setAttribute('aria-pressed', String(enabled));
    controls.dataset.rainActive = String(enabled && raining);
  };
  const stop = (): void => {
    generation++;
    rain.pause();
    rain.currentTime = 0;
  };
  const unavailable = (request: number): void => {
    if (destroyed || request !== generation) return;
    enabled = false;
    stop();
    update();
    status.textContent = 'Rain audio unavailable. Enable sound to retry.';
  };
  const play = (): void => {
    const request = ++generation;
    // Prime inside Enable's gesture, silently if clear; weather resumes later.
    void rain
      .play()
      .then(() => {
        if (destroyed || request !== generation) return;
        if (!enabled || !raining) {
          rain.pause();
          rain.currentTime = 0;
        }
      })
      .catch(() => unavailable(request));
  };
  const toggle = (): void => {
    if (destroyed) return;
    enabled = !enabled;
    status.textContent = '';
    update();
    if (enabled) {
      if (!rain.hasAttribute('src')) rain.src = rainUrl;
      play();
    } else stop();
  };
  const changeVolume = (): void => {
    volume = Math.min(1, Math.max(0, Number(slider.value)));
    update();
  };
  const error = (): void => unavailable(generation);
  button.addEventListener('click', toggle);
  slider.addEventListener('input', changeVolume);
  rain.addEventListener('error', error);
  controls.append(button, slider, status, rain);
  parent.append(controls);
  update();
  return {
    weather(weather) {
      if (destroyed || raining === (weather === 'mist-rain')) return;
      raining = weather === 'mist-rain';
      update();
      if (enabled && raining) play();
      else stop();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      enabled = false;
      stop();
      rain.removeEventListener('error', error);
      button.removeEventListener('click', toggle);
      slider.removeEventListener('input', changeVolume);
      rain.removeAttribute('src');
      rain.load();
      controls.remove();
    },
  };
}
