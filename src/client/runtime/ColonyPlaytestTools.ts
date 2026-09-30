export interface ColonyPlaytestSample {
  tick: number;
  x: number;
  y: number;
  carrying: string;
  stacks: number;
  sites: number;
  biomes: number;
  facilities: number;
  gatherActions: number;
  toolCondition: number | null;
}
/** Voluntary ten-minute, local-only evidence. No account, world, invitation or player identifiers. */
export function createColonyPlaytestTools(
  root: HTMLElement,
  sample: () => ColonyPlaytestSample,
) {
  const document = root.ownerDocument,
    panel = root.querySelector<HTMLElement>("[data-colony-settings]");
  if (!panel) return { destroy() {} };
  const host = document.createElement("div");
  host.style.marginTop = "12px";
  panel.append(host);
  const button = (label: string, action: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", action);
    host.append(b);
    return b;
  };
  const guide = document.createElement("details");
  const title = document.createElement("summary");
  title.textContent = "Base guide";
  guide.append(title);
  for (const [icon, text, key] of [
    ["⚒", "Craft a storage kit: 4 Timber + 2 Cordage.", "KeyC"],
    [
      "⌂",
      "Place a storage crate on explored dry ground near your base.",
      "KeyB",
    ],
    [
      "▣",
      "Stand beside your crate and open Inventory to move supplies.",
      "KeyI",
    ],
    ["◇", "Explore visible landmarks; inspect them from the Journal.", "KeyJ"],
  ]) {
    const step = document.createElement("button");
    step.textContent = icon + " " + text;
    step.style.cssText = "display:block;margin:8px 0;text-align:left";
    step.addEventListener("click", () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { code: "Escape", bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent("keydown", { code: key!, bubbles: true }),
      );
    });
    guide.append(step);
  }
  host.append(guide);
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  host.append(status);
  let started: number | null = null,
    samples: (ColonyPlaytestSample & { seconds: number })[] = [];
  const record = button("Record a 10-minute playtest", () => {
    if (started !== null) {
      started = null;
      record.textContent = "Record a 10-minute playtest";
      status.textContent = "Recording stopped. Export your record below.";
      return;
    }
    samples = [];
    started = performance.now();
    record.textContent = "Stop playtest record";
    status.textContent = "Recording locally. No data is sent.";
  });
  button("Export playtest record", () => {
    if (!samples.length) {
      status.textContent = "Start recording and play for a few moments first.";
      return;
    }
    const report = {
      format: "proz0:voluntary-playtest:v1",
      durationSeconds: samples.at(-1)!.seconds,
      samples,
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json",
        }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "proz0-playtest.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const timer = setInterval(() => {
    if (started === null) return;
    const seconds = Math.floor((performance.now() - started) / 1000);
    samples.push({ ...sample(), seconds });
    if (seconds >= 600) {
      started = null;
      record.textContent = "Record a 10-minute playtest";
      status.textContent = "Ten-minute record complete. Export it when ready.";
    }
  }, 1000);
  return {
    destroy() {
      clearInterval(timer);
      host.remove();
    },
  };
}
