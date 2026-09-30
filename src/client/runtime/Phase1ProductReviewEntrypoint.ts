import { lastSavedReviewUrl } from './Phase1SavedReview';
import {mountColonyCoopLauncher} from './ColonyCoopLauncher';

export interface Phase1ProductReviewEntrypointHandle {
  destroy(): void;
}

const REVIEW_PLAYER_ID = 'review-player';
const REVIEW_WORLD_SEED = 'phase1-product-review';

function launchUrl(
  targetWindow: Window,
  reviewId: string,
  mode = 'phase1-product-review',
): string {
  const url = new URL(targetWindow.location.href);
  url.search = new URLSearchParams({
    proz0Mode: mode,
    proz0WorldId: 'review-world-' + reviewId,
    proz0WorldSeed: REVIEW_WORLD_SEED,
    proz0Players: REVIEW_PLAYER_ID,
    proz0Player: REVIEW_PLAYER_ID,
    proz0SaveDb: 'proz0-review-' + reviewId,
  }).toString();
  return url.toString();
}

function localDemoUrl(
  targetWindow: Window,
): string {
  const url = new URL(targetWindow.location.href);
  url.search = new URLSearchParams({
    proz0Mode: 'local-demo',
  }).toString();
  return url.toString();
}

export function hasExplicitProZ0Mode(
  root: HTMLElement,
  search = window.location.search,
): boolean {
  const query = new URLSearchParams(search);
  return (
    (root.dataset.proz0Mode?.trim().length ?? 0) > 0
    || (query.get('proz0Mode')?.trim().length ?? 0) > 0
  );
}

export function shouldShowPhase1ProductReviewEntrypoint(
  root: HTMLElement,
  search = window.location.search,
): boolean {
  if (hasExplicitProZ0Mode(root, search)) return false;

  // The PO-facing launcher owns only the truly bare published route.
  // Existing QA fixture/reproduction queries intentionally retain the
  // historical local-demo autoboot behavior unless they select a mode.
  return new URLSearchParams(search).toString().length === 0;
}

export function createPhase1ProductReviewEntrypoint(
  root: HTMLElement,
): Phase1ProductReviewEntrypointHandle {
  const document = root.ownerDocument;
  const targetWindow = document.defaultView ?? window;

  root.replaceChildren();
  root.dataset.runtimeMode = 'phase1-review-entrypoint';
  root.dataset.runtimeStatus = 'entrypoint';
  root.dataset.phase1QaMode = 'none';
  root.dataset.visualQaMode = 'none';

  document.title = 'ProZ0 — Colony depth';

  const style = document.createElement('style');
  style.textContent = [
    '.p1-review-entrypoint{width:min(720px,calc(100vw - 32px));box-sizing:border-box;max-height:92vh;overflow:auto;padding:28px;font-family:monospace;color:#f4f6ef;background:#0a0e16;border:1px solid #d6dccd;box-shadow:0 16px 48px rgba(0,0,0,.45);}',
    '.p1-review-entrypoint h1{margin:0 0 10px;font-size:28px;line-height:1.1;}',
    '.p1-review-entrypoint p{margin:8px 0;line-height:1.5;color:#c8cfbf;}',
    '.p1-review-entrypoint .p1-review-primary{display:block;width:fit-content;margin-top:18px;padding:12px 18px;font:700 16px monospace;cursor:pointer;}',
    '.p1-review-entrypoint .p1-review-meta{margin-top:18px;padding-top:14px;border-top:1px solid #778094;font-size:12px;}',
    '.p1-review-entrypoint a{color:#f4f6ef;}',
  ].join('');

  const panel = document.createElement('main');
  panel.className = 'p1-review-entrypoint';
  panel.dataset.phase1ReviewEntrypoint = 'ready';

  const title = document.createElement('h1');
  title.textContent = 'PROZ0 · COLONY DEPTH';

  const intro = document.createElement('p');
  intro.textContent =
    'Explore the mist marsh and ochre badlands. Survey relics, research colony improvements, and specialize your colonist.';

  const persistence = document.createElement('p');
  persistence.textContent =
    'Press L in the world to save. Continue restores your latest saved progress in this browser. Starting a new world keeps previous saves separate.';

  const savedUrl = lastSavedReviewUrl(targetWindow);
  const continueWorld = document.createElement('a');
  continueWorld.dataset.continuePhase1Review = 'true';
  continueWorld.className = 'p1-review-primary';
  continueWorld.textContent = 'CONTINUE SAVED WORLD';
  if (savedUrl !== null) continueWorld.href = savedUrl;

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'p1-review-primary';
  start.dataset.startPhase1Review = 'true';
  start.textContent = 'START PHASE 1 REVIEW';
  const startColony = document.createElement('button');
  startColony.type = 'button';
  startColony.className = 'p1-review-primary';
  startColony.dataset.startPhase2Review = 'true';
  startColony.textContent = 'START COLONY WORLD';
  const onStartColony = (): void => {
    startColony.disabled = true;
    targetWindow.location.assign(launchUrl(targetWindow, targetWindow.crypto.randomUUID(), 'phase2-colony-review'));
  };
  startColony.addEventListener('click', onStartColony);
  const upgrade = document.createElement('a');
  upgrade.className = 'p1-review-primary';
  upgrade.dataset.upgradeColonyReview = 'true';
  upgrade.textContent = 'CONTINUE WITH COLONY DEPTH';
  if (savedUrl !== null) {
    const upgradeUrl = new URL(savedUrl);
    upgradeUrl.searchParams.set('proz0Mode', 'phase2-colony-review');
    upgrade.href = upgradeUrl.toString();
  }

  const meta = document.createElement('div');
  meta.className = 'p1-review-meta';
  meta.textContent =
    'QA can still launch exact deterministic review worlds with the documented proz0Mode/proz0WorldId/proz0WorldSeed/proz0Players/proz0Player/proz0SaveDb query parameters. ';

  const localDemo = document.createElement('a');
  localDemo.href = localDemoUrl(targetWindow);
  localDemo.dataset.startLocalDemo = 'true';
  localDemo.textContent = 'Developer local movement demo';
  meta.append(localDemo);

  const onStart = (): void => {
    start.disabled = true;
    root.dataset.runtimeStatus = 'launching';
    const reviewId = targetWindow.crypto.randomUUID();
    targetWindow.location.assign(launchUrl(targetWindow, reviewId));
  };
  start.addEventListener('click', onStart);

  panel.append(title, intro, persistence);
  if (savedUrl !== null) panel.append(continueWorld, upgrade);
  panel.append(startColony, start);const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Advanced review tools';advanced.append(summary,meta);panel.append(advanced);
  const destroyCoop=mountColonyCoopLauncher(panel);
  root.append(style, panel);

  return Object.freeze({
    destroy(): void {
      destroyCoop();
      start.removeEventListener('click', onStart);
      startColony.removeEventListener('click', onStartColony);
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  });
}
