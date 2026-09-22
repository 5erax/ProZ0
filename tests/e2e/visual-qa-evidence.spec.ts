import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EVIDENCE_DIR = resolve(process.cwd(), 'test-results/p0-bug-002');

interface CanvasSizing {
  readonly internalWidth: number;
  readonly internalHeight: number;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly displayScale: string | undefined;
  readonly imageRendering: string;
}

async function openFixture(
  page: Page,
  mode: 'light' | 'dark' | 'shimmer' | 'depth',
  scale: 2 | 3,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto(`/?qaVisual=${mode}&qaScale=${scale}`);

  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(root).toHaveAttribute('data-visual-qa-mode', mode);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-display-scale', String(scale));
  await expect(canvas).toHaveAttribute('data-internal-raster', '640x360');
  await expect(canvas).toHaveCSS('image-rendering', 'pixelated');
}

async function canvasSizing(page: Page): Promise<CanvasSizing> {
  return page.locator('#proz0-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;

    return {
      internalWidth: canvas.width,
      internalHeight: canvas.height,
    cssWidth: Number.parseInt(canvas.style.width, 10),
    cssHeight: Number.parseInt(canvas.style.height, 10),
    displayScale: canvas.dataset.displayScale,
      imageRendering: canvas.style.imageRendering,
    };
  });
}

async function captureCanvas(page: Page, fileName: string): Promise<void> {
  await page.locator('#proz0-canvas').screenshot({
    path: resolve(EVIDENCE_DIR, fileName),
  });
}

test.use({
  deviceScaleFactor: 1,
});

test('P0-BUG-002 retains Phase 0 visual QA evidence', async ({ page }) => {
  test.setTimeout(30_000);
  mkdirSync(EVIDENCE_DIR, { recursive: true });

  const files: string[] = [];

  await openFixture(
    page,
    'light',
    2,
    { width: 1280, height: 720 },
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-ground-tone',
    'light',
  );
  const light2xSizing = await canvasSizing(page);
  expect(light2xSizing).toMatchObject({
    internalWidth: 640,
    internalHeight: 360,
    cssWidth: 1280,
    cssHeight: 720,
    displayScale: '2',
    imageRendering: 'pixelated',
  });
  await captureCanvas(page, 'light-ground-2x.png');
  files.push('light-ground-2x.png');

  await openFixture(
    page,
    'dark',
    2,
    { width: 1280, height: 720 },
  );
  await expect(page.locator('#proz0-canvas')).toHaveAttribute(
    'data-ground-tone',
    'dark',
  );
  const dark2xSizing = await canvasSizing(page);
  expect(dark2xSizing).toMatchObject({
    internalWidth: 640,
    internalHeight: 360,
    cssWidth: 1280,
    cssHeight: 720,
    displayScale: '2',
    imageRendering: 'pixelated',
  });
  await captureCanvas(page, 'dark-ground-2x.png');
  files.push('dark-ground-2x.png');

  await openFixture(
    page,
    'dark',
    3,
    { width: 1920, height: 1080 },
  );
  const dark3xSizing = await canvasSizing(page);
  expect(dark3xSizing).toMatchObject({
    internalWidth: 640,
    internalHeight: 360,
    cssWidth: 1920,
    cssHeight: 1080,
    displayScale: '3',
    imageRendering: 'pixelated',
  });
  await captureCanvas(page, 'dark-ground-3x.png');
  files.push('dark-ground-3x.png');

  await openFixture(
    page,
    'shimmer',
    2,
    { width: 1280, height: 720 },
  );

  await page.keyboard.down('d');
  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(50);

    const raster = await page.locator('#proz0-canvas').evaluate((canvas) => ({
      cameraX: canvas.dataset.cameraRasterX,
      cameraY: canvas.dataset.cameraRasterY,
    }));

    expect(Number.isInteger(Number(raster.cameraX))).toBe(true);
    expect(Number.isInteger(Number(raster.cameraY))).toBe(true);

    const fileName = `camera-motion-shimmer-${String(index).padStart(2, '0')}.png`;
    await captureCanvas(page, fileName);
    files.push(fileName);
  }
  await page.keyboard.up('d');

  await openFixture(
    page,
    'depth',
    2,
    { width: 1280, height: 720 },
  );

  const canvas = page.locator('#proz0-canvas');
  await expect(canvas).toHaveAttribute('data-depth-object', 'qa-depth-pillar');
  await expect(canvas).toHaveAttribute('data-depth-relation', 'behind');
  await captureCanvas(page, 'depth-behind-2x.png');
  files.push('depth-behind-2x.png');

  await page.keyboard.down('s');
  await expect.poll(
    async () => canvas.getAttribute('data-depth-relation'),
    { timeout: 1000 },
  ).toBe('front');
  await page.keyboard.up('s');
  await page.waitForTimeout(50);

  await expect(canvas).toHaveAttribute('data-depth-relation', 'front');
  await captureCanvas(page, 'depth-front-2x.png');
  files.push('depth-front-2x.png');

  const manifest = {
    schemaVersion: 1,
    task: 'P0-BUG-002',
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    referenceRaster: { width: 640, height: 360 },
    deviceScaleFactor: 1,
    cases: {
      lightGroundReadability: 'light-ground-2x.png',
      darkGroundReadability: 'dark-ground-2x.png',
      crisp2x: {
        file: 'dark-ground-2x.png',
        sizing: dark2xSizing,
      },
      crisp3x: {
        file: 'dark-ground-3x.png',
        sizing: dark3xSizing,
      },
      cameraMotionShimmer: files.filter((file) =>
        file.startsWith('camera-motion-shimmer-')
      ),
      depthOrdering: {
        behind: 'depth-behind-2x.png',
        front: 'depth-front-2x.png',
        object: 'qa-depth-pillar',
      },
    },
    invariants: {
      nearestNeighborCss: true,
      integerDisplayScale: true,
      depthFixturePresentationOnly: true,
      authoritativeCollisionUsesPresentationBounds: false,
    },
    files,
  };

  writeFileSync(
    resolve(EVIDENCE_DIR, 'visual-qa-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
});
