import { expect, test } from '@playwright/test';

test.use({ deviceScaleFactor: 1 });

test('Phase 1 presentation shell preserves logical layout and semantic states', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?qaPhase1=overview&qaScale=2');

  const root = page.locator('[data-proz0-autoboot]');
  const ui = page.locator('#proz0-phase1-ui');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(root).toHaveAttribute('data-phase1-qa-mode', 'overview');
  await expect(ui).toBeVisible();
  await expect(ui).toHaveAttribute('data-presentation-authority', 'derived-read-only');
  await expect(ui).toHaveAttribute('data-production-asset-foundation', 'p1-75-78');
  await expect(ui).toHaveAttribute('data-display-scale', '2');
  await expect(
    ui.locator('[data-production-world-preview="accepted-raster"]'),
  ).toBeVisible();
  await expect(
    ui.locator('[data-production-world-asset="player"]'),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/actors/player_pioneer.png',
  );
  await expect(
    ui.locator('[data-production-world-asset="habitat"]'),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/world/structures/habitat_room.png',
  );
  await expect(
    ui.locator('[data-asset-path="assets/phase1/ui/icons/hud_status_icons.png"]'),
  ).toHaveCount(8);

  await expect(ui.locator('[data-region="survival"]')).toContainText('DEHYDRATED');
  await expect(ui.locator('[data-region="carry"]')).toHaveAttribute('data-carry-state', 'HEAVY');
  await expect(ui.locator('[data-region="interaction"]')).toHaveAttribute('data-state', 'BLOCKED');
  await expect(ui.locator('[data-region="interaction"]')).toContainText('MISSING / WRONG TOOL');
});

test('Phase 1 panels expose non-color failure and progression semantics', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('/?qaPhase1=build&qaScale=2');
  const buildPanel = page.locator('[data-panel-kind="build"]');
  await expect(buildPanel).toBeVisible();
  await expect(buildPanel.locator('[data-placement-state="INVALID"]')).toContainText('INVALID');
  await expect(
    buildPanel.locator('[data-production-pattern-state="INVALID"]'),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/ui/effects/build_preview_pattern.png',
  );
  await expect(buildPanel.locator('.p1-panel-skin-corner')).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/ui/panels/ui_panel_skin.png',
  );
  await expect(buildPanel).toContainText('OUT OF POWER RANGE');

  await page.goto('/?qaPhase1=progression&qaScale=2');
  const progression = page.locator('[data-panel-kind="progression"]');
  await expect(progression).toContainText('Explorer — Prototype');
  await expect(progression).toContainText('Engineer — Prototype');

  await page.goto('/?qaPhase1=coop&qaScale=2');
  await expect(page.locator('[data-marker-shape="circle"]')).toHaveCount(1);
  await expect(page.locator('[data-marker-shape="diamond"]')).toHaveCount(1);
  await expect(page.locator('[data-marker-shape="triangle"]')).toHaveCount(1);
  await expect(
    page.locator(
      '[data-asset-path="assets/phase1/ui/icons/coop_identity_markers.png"]',
    ),
  ).toHaveCount(3);
});



test('runtime binding route renders authoritative derived state and stale rejection feedback', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?qaPhase1=runtime&qaScale=2');

  const root = page.locator('[data-proz0-autoboot]');
  const ui = page.locator('#proz0-phase1-ui');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(root).toHaveAttribute('data-phase1-qa-mode', 'runtime');
  await expect(ui).toHaveAttribute(
    'data-presentation-authority',
    'derived-read-only',
  );
  await expect(ui.locator('[data-region="survival"]')).toContainText(
    'DEHYDRATED',
  );
  await expect(ui.locator('[data-region="survival"]')).toContainText('COLD');
  await expect(ui.locator('[data-region="interaction"]')).toHaveAttribute(
    'data-state',
    'BLOCKED',
  );
  await expect(ui.locator('[data-region="interaction"]')).toContainText(
    'STALE / WORLD STATE CHANGED',
  );
  await expect(ui.locator('[data-panel-kind="container"]')).toContainText(
    'STALE / WORLD STATE CHANGED',
  );
  await expect(
    ui.locator('[data-asset-path="assets/phase1/items/item_icon_atlas.png"]'),
  ).toHaveCount(4);
  await expect(ui.locator('[data-marker-shape="circle"]')).toHaveCount(1);
});

test('viewport below 640x360 shows explicit no-fractional-scale guard', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 340 });
  await page.goto('/?qaPhase1=overview');

  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');
  const warning = page.locator('#proz0-viewport-warning');

  await expect(root).toHaveAttribute('data-viewport-too-small', 'true');
  await expect(canvas).toHaveCSS('visibility', 'hidden');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('640×360');
});
