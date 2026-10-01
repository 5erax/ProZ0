import { createGameLobby } from "./GameLobby";
export interface Phase1ProductReviewEntrypointHandle {
  destroy(): void;
}
export function hasExplicitProZ0Mode(
  root: HTMLElement,
  search = window.location.search,
): boolean {
  const query = new URLSearchParams(search);
  return (
    (root.dataset.proz0Mode?.trim().length ?? 0) > 0 ||
    (query.get("proz0Mode")?.trim().length ?? 0) > 0
  );
}
export function shouldShowPhase1ProductReviewEntrypoint(
  root: HTMLElement,
  search = window.location.search,
): boolean {
  if (hasExplicitProZ0Mode(root, search)) return false;
  const query = new URLSearchParams(search);
  return (
    query.toString().length === 0 ||
    [...query.keys()].every((key) => ["proz0Lobby", "room"].includes(key))
  );
}
export function createPhase1ProductReviewEntrypoint(
  root: HTMLElement,
): Phase1ProductReviewEntrypointHandle {
  return createGameLobby(root);
}
