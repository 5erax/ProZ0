// A navigation bookmark only. Save V2 remains the authority for durable state.
const SAVED_REVIEW_KEY = 'proz0:last-saved-review:v1';
const PARAMETERS = [
  'proz0Mode', 'proz0WorldId', 'proz0WorldSeed',
  'proz0Players', 'proz0Player', 'proz0SaveDb',
] as const;

function validatedReviewUrl(target: Window, value: string): string | null {
  try {
    const current = new URL(target.location.href);
    const url = new URL(value, current);
    if (url.origin !== current.origin || url.pathname !== current.pathname
      || url.hash !== ''
      || url.searchParams.get('proz0Mode') !== 'phase1-product-review'
      || [...url.searchParams.keys()].some((key) =>
        !PARAMETERS.some((allowed) => allowed === key))) return null;
    if (PARAMETERS.some((key) =>
      url.searchParams.getAll(key).length !== 1
      || !url.searchParams.get(key)?.trim())) return null;
    const players = url.searchParams.get('proz0Players')!.split(',');
    if (!players.includes(url.searchParams.get('proz0Player')!)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function lastSavedReviewUrl(target: Window): string | null {
  try {
    const value = target.localStorage.getItem(SAVED_REVIEW_KEY);
    return value === null ? null : validatedReviewUrl(target, value);
  } catch {
    return null;
  }
}

export function rememberSavedReview(target: Window, worldId: string): boolean {
  const url = validatedReviewUrl(target, target.location.href);
  if (url === null || new URL(url).searchParams.get('proz0WorldId') !== worldId) {
    return false;
  }
  try {
    target.localStorage.setItem(SAVED_REVIEW_KEY, url);
    return true;
  } catch {
    return false;
  }
}
