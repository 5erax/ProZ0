import type { ColonyBiomeId } from "../../content/phase2/ColonyDepthContent";
const urls = Object.freeze({
  "landing-grassland": new URL(
    "../../../assets/phase2/audio/landing.wav",
    import.meta.url,
  ).href,
  "mist-marsh": new URL(
    "../../../assets/phase2/audio/marsh.wav",
    import.meta.url,
  ).href,
  "ochre-badlands": new URL(
    "../../../assets/phase2/audio/badlands.wav",
    import.meta.url,
  ).href,
  research: new URL(
    "../../../assets/phase2/audio/research.wav",
    import.meta.url,
  ).href,
  inspect: new URL("../../../assets/phase2/audio/inspect.wav", import.meta.url)
    .href,
});
export function createColonyAudio(parent: HTMLElement): {
  region(biome: ColonyBiomeId): void;
  cue(kind: "research" | "inspect"): void;
  destroy(): void;
} {
  const document = parent.ownerDocument;
  const target = document.defaultView!;
  const ambience = new target.Audio(),
    cue = new target.Audio();
  ambience.loop = true;
  ambience.preload = "none";
  cue.preload = "none";
  let enabled = false,
    volume = 0.35,
    current: ColonyBiomeId = "landing-grassland",
    destroyed = false;
  const controls = document.createElement("div");
  controls.className = "p2-audio-controls";
  const button = document.createElement("button");
  button.textContent = "Enable sound";
  button.setAttribute("aria-pressed", "false");
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = ".05";
  slider.value = String(volume);
  slider.setAttribute("aria-label", "Sound volume");
  slider.style.width = "80px";
  const update = (): void => {
    ambience.volume = enabled ? volume * 0.45 : 0;
    cue.volume = enabled ? volume : 0;
    button.textContent = enabled ? "Mute sound" : "Enable sound";
    button.setAttribute("aria-pressed", String(enabled));
  };
  const play = (): void => {
    if (destroyed || !enabled) return;
    void ambience.play().catch(() => {
      if (!destroyed) {
        enabled = false;
        update();
      }
    });
  };
  button.addEventListener("click", () => {
    enabled = !enabled;
    if (enabled && ambience.src === "") ambience.src = urls[current];
    update();
    if (enabled) play();
    else {
      ambience.pause();
      cue.pause();
    }
  });
  slider.addEventListener("input", () => {
    volume = Number(slider.value);
    update();
  });
  controls.append(button, slider);
  parent.append(controls);
  update();
  return {
    region(biome) {
      if (biome === current) return;
      current = biome;
      if (enabled) {
        ambience.src = urls[current];
        play();
      }
    },
    cue(kind) {
      if (!enabled || destroyed) return;
      cue.pause();
      cue.src = urls[kind];
      cue.currentTime = 0;
      void cue.play().catch(() => {});
    },
    destroy() {
      destroyed = true;
      ambience.pause();
      cue.pause();
      ambience.removeAttribute("src");
      cue.removeAttribute("src");
      ambience.load();
      cue.load();
      controls.remove();
    },
  };
}
