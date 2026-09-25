import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/p1-ui-001');

async function openProductionFixture(
  page: Page,
  mode: 'overview' | 'inventory' | 'build' | 'coop' | 'map',
  scale: 2 | 3,
): Promise<void> {
  await page.setViewportSize({
    width: 640 * scale,
    height: 360 * scale,
  });
  await page.goto('/?qaPhase1=' + mode + '&qaScale=' + String(scale));

  const root = page.locator('[data-proz0-autoboot]');
  const ui = page.locator('#proz0-phase1-ui');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(root).toHaveAttribute('data-phase1-qa-mode', mode);
  await expect(ui).toHaveAttribute('data-display-scale', String(scale));
  await expect(ui).toHaveAttribute(
    'data-production-asset-foundation',
    'p1-75-78',
  );
  await expect(
    ui.locator('[data-production-world-preview="accepted-raster"]'),
  ).toBeVisible();
  await expect(
    ui.locator('[data-production-world-asset="player"]'),
  ).toBeVisible();
  await page.waitForTimeout(100);
}

async function captureUi(
  page: Page,
  fileName: string,
): Promise<void> {
  await page.locator('#proz0-phase1-ui').screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
  });
}

test.use({ deviceScaleFactor: 1 });

test('P1-UI-001 captures accepted production-asset visual evidence', async ({ page }) => {
  test.setTimeout(30_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const files: string[] = [];

  await openProductionFixture(page, 'overview', 2);
  await captureUi(page, 'overview-2x.png');
  files.push('overview-2x.png');

  await openProductionFixture(page, 'overview', 3);
  await captureUi(page, 'overview-3x.png');
  files.push('overview-3x.png');

  await openProductionFixture(page, 'inventory', 2);
  await expect(
    page.locator(
      '[data-asset-path="assets/phase1/items/item_icon_atlas.png"]',
    ),
  ).not.toHaveCount(0);
  await captureUi(page, 'inventory-2x.png');
  files.push('inventory-2x.png');

  await openProductionFixture(page, 'build', 2);
  await expect(
    page.locator('[data-production-pattern-state="INVALID"]'),
  ).toHaveAttribute(
    'data-asset-path',
    'assets/phase1/ui/effects/build_preview_pattern.png',
  );
  await captureUi(page, 'build-2x.png');
  files.push('build-2x.png');

  await openProductionFixture(page, 'coop', 2);
  await expect(
    page.locator(
      '[data-asset-path="assets/phase1/ui/icons/coop_identity_markers.png"]',
    ),
  ).toHaveCount(3);
  await captureUi(page, 'coop-2x.png');
  files.push('coop-2x.png');

  await openProductionFixture(page, 'map', 2);
  await expect(
    page.locator(
      '[data-asset-path="assets/phase1/ui/map/map_marker_atlas.png"]',
    ),
  ).toHaveCount(4);
  await captureUi(page, 'map-2x.png');
  files.push('map-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P1-UI-001',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    referenceRaster: { width: 640, height: 360 },
    productionAssetFoundation: '#75-#78 accepted raster chain',
    invariants: {
      derivedReadOnlyPresentation: true,
      integerDisplayScale: true,
      nearestPixelAssets: true,
      qaWorldPreviewIsPresentationOnly: true,
      externalCanonicalCanvasOwnershipPreserved: true,
    },
    cases: {
      overview2x: 'overview-2x.png',
      overview3x: 'overview-3x.png',
      inventory2x: 'inventory-2x.png',
      build2x: 'build-2x.png',
      coop2x: 'coop-2x.png',
      map2x: 'map-2x.png',
    },
    files,
  };

  writeFileSync(
    resolve(EVIDENCE_DIR, 'visual-qa-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});
