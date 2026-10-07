const shortcut = (label: string, key: string, panel: string, kind: string | null = panel, dataset?: string, value = 'true') =>
  Object.freeze({ label, key, code: 'Key' + key, action: 'open-' + panel, kind, dataset, value });

/** One presentation/input contract; none of these descriptors authorize gameplay commands. */
export const PANEL_SHORTCUTS = Object.freeze({
  inventory: shortcut('Inventory', 'I', 'inventory'),
  craft: shortcut('Craft', 'C', 'craft'),
  build: shortcut('Build base', 'B', 'build'),
  map: shortcut('Map', 'M', 'map'),
  farm: shortcut('Homestead farming and wildlife', 'F', 'farm', null, 'livingPanelOpen'),
  colony: shortcut('Colony', 'N', 'colony'),
  research: shortcut('Research', 'U', 'research', null, 'colonyDepthPanel', 'research'),
  journal: shortcut('Journal', 'J', 'journal', null, 'colonyDepthPanel', 'journal'),
  professions: shortcut('Professions', 'P', 'professions', 'progression', 'colonyDepthPanel', 'professions'),
  industry: shortcut('Industry', 'O', 'industry', null, 'industryOpen'),
  help: shortcut('Controls', 'H', 'help', null, 'productReviewHelpOpen'),
});

export type PanelShortcut = (typeof PANEL_SHORTCUTS)[keyof typeof PANEL_SHORTCUTS];
export const DOCK_SHORTCUTS = Object.freeze([
  PANEL_SHORTCUTS.inventory, PANEL_SHORTCUTS.craft, PANEL_SHORTCUTS.build,
  PANEL_SHORTCUTS.map, PANEL_SHORTCUTS.farm,
]);
export function panelShortcutForCode(code: string): PanelShortcut | undefined {
  return Object.values(PANEL_SHORTCUTS).find(shortcut => shortcut.code === code);
}
export function isPanelShortcutActive(shortcut: PanelShortcut, panelKind: string | undefined, dataset: Readonly<Record<string, string | undefined>>): boolean {
  return (shortcut.kind !== null && panelKind === shortcut.kind)
    || (shortcut.dataset !== undefined && dataset[shortcut.dataset] === shortcut.value);
}
