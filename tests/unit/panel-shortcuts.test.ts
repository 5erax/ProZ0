import { expect, it } from 'vitest';
import { PANEL_SHORTCUTS, isPanelShortcutActive, panelShortcutForCode } from '../../src/client/input/PanelShortcuts';

it('assigns every panel one unique shortcut/action and leaves movement/equipment keys unassigned', () => {
  const shortcuts=Object.values(PANEL_SHORTCUTS);
  expect(new Set(shortcuts.map(shortcut=>shortcut.code)).size).toBe(shortcuts.length);
  expect(new Set(shortcuts.map(shortcut=>shortcut.action)).size).toBe(shortcuts.length);
  expect(panelShortcutForCode('KeyF')?.action).toBe('open-farm');
  expect(panelShortcutForCode('KeyN')?.action).toBe('open-colony');
  for(const code of ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyT','KeyV','Space'])expect(panelShortcutForCode(code)).toBeUndefined();
});

it('does not project legacy Colony as Farm, and reads the actual external panel state', () => {
  expect(isPanelShortcutActive(PANEL_SHORTCUTS.farm,'colony',{})).toBe(false);
  expect(isPanelShortcutActive(PANEL_SHORTCUTS.colony,'colony',{})).toBe(true);
  expect(isPanelShortcutActive(PANEL_SHORTCUTS.farm,undefined,{livingPanelOpen:'true'})).toBe(true);
  expect(isPanelShortcutActive(PANEL_SHORTCUTS.professions,undefined,{colonyDepthPanel:'journal'})).toBe(false);
  expect(isPanelShortcutActive(PANEL_SHORTCUTS.journal,undefined,{colonyDepthPanel:'journal'})).toBe(true);
});
