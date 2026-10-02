/** Restrict browser-menu suppression to the game; preserve editing menus. */
export function installGameContextMenu(root: HTMLElement, cancel?: () => void): () => void {
  const context = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('input,textarea,select,[contenteditable="true"],[data-native-context-menu]')) return;
    event.preventDefault();
    event.stopPropagation();
    cancel?.();
  };
  const drag = (event: DragEvent) => { if (event.target instanceof HTMLImageElement) event.preventDefault(); };
  root.addEventListener('contextmenu', context);
  root.addEventListener('dragstart', drag);
  return () => { root.removeEventListener('contextmenu', context); root.removeEventListener('dragstart', drag); };
}
