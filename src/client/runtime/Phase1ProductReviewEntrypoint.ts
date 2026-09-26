export interface Phase1ProductReviewEntrypointHandle {
  destroy(): void;
}

const REVIEW_PLAYER_ID = 'review-player';
const REVIEW_WORLD_SEED = 'phase1-product-review';

function launchUrl(
  targetWindow: Window,
  reviewId: string,
): string {
  const url = new URL(targetWindow.location.href);
  url.search = new URLSearchParams({
    proz0Mode: 'phase1-product-review',
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

  document.title = 'ProZ0 — Phase 1 Product Review';

  const style = document.createElement('style');
  style.textContent = [
    '.p1-review-entrypoint{width:min(720px,calc(100vw - 32px));box-sizing:border-box;padding:28px;font-family:monospace;color:#f4f6ef;background:#0a0e16;border:1px solid #d6dccd;box-shadow:0 16px 48px rgba(0,0,0,.45);}',
    '.p1-review-entrypoint h1{margin:0 0 10px;font-size:28px;line-height:1.1;}',
    '.p1-review-entrypoint p{margin:8px 0;line-height:1.5;color:#c8cfbf;}',
    '.p1-review-entrypoint .p1-review-primary{margin-top:18px;padding:12px 18px;font:700 16px monospace;cursor:pointer;}',
    '.p1-review-entrypoint .p1-review-meta{margin-top:18px;padding-top:14px;border-top:1px solid #778094;font-size:12px;}',
    '.p1-review-entrypoint a{color:#f4f6ef;}',
  ].join('');

  const panel = document.createElement('main');
  panel.className = 'p1-review-entrypoint';
  panel.dataset.phase1ReviewEntrypoint = 'ready';

  const title = document.createElement('h1');
  title.textContent = 'PROZ0 · PHASE 1 PRODUCT REVIEW';

  const intro = document.createElement('p');
  intro.textContent =
    'Start a fresh Phase 1 review world. No developer console or query-string setup is required.';

  const persistence = document.createElement('p');
  persistence.textContent =
    'This review uses the canonical Phase 1 runtime and a fresh browser-local review namespace.';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'p1-review-primary';
  start.dataset.startPhase1Review = 'true';
  start.textContent = 'START PHASE 1 REVIEW';

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

  panel.append(title, intro, persistence, start, meta);
  root.append(style, panel);

  return Object.freeze({
    destroy(): void {
      start.removeEventListener('click', onStart);
      root.replaceChildren();
      root.dataset.runtimeStatus = 'stopped';
    },
  });
}
