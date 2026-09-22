import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_COUNT = 40;
const THRESHOLD_MS = 50;
const PHASE_OFFSETS_MS = Object.freeze([0, 2, 4, 6, 8, 10, 12, 14]);
const EVIDENCE_PATH = resolve(
  process.cwd(),
  'test-results/p0-bug-001/movement-responsiveness.json',
);

interface Sample {
  readonly latencyMs: number;
  readonly startFrame: number;
  readonly observedFrame: number;
  readonly beforeX: number;
  readonly afterX: number;
  readonly phaseOffsetMs: number;
}

interface MetricSummary {
  readonly samplesMs: readonly number[];
  readonly sampleCount: number;
  readonly p95Ms: number;
  readonly minMs: number;
  readonly maxMs: number;
}

function nearestRankP95(samples: readonly number[]): number {
  if (samples.length === 0) {
    throw new Error('Cannot compute P95 without samples.');
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil(0.95 * sorted.length);
  return sorted[rank - 1]!;
}

function summarize(samples: readonly Sample[]): MetricSummary {
  const values = samples.map((sample) => sample.latencyMs);

  return Object.freeze({
    samplesMs: values,
    sampleCount: values.length,
    p95Ms: nearestRankP95(values),
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
  });
}

async function waitUntilIdle(page: Page): Promise<void> {
  await expect.poll(
    async () => page.locator('#proz0-canvas').getAttribute('data-player-state'),
    { timeout: 500 },
  ).toBe('IDLE');
}

async function releaseMovementKeys(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const code of ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight']) {
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code,
        bubbles: true,
        cancelable: true,
      }));
    }
  });
  await waitUntilIdle(page);
}

async function measureStart(
  page: Page,
  code: 'KeyA' | 'KeyD',
  direction: -1 | 1,
  phaseOffsetMs: number,
): Promise<Sample> {
  return page.evaluate(
    async ({ keyCode, sign, phaseOffset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#proz0-canvas');
      if (canvas === null) {
        throw new Error('Missing ProZ0 canvas.');
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, phaseOffset);
        });
      });

      const beforeX = Number(canvas.dataset.playerX);
      const startFrame = Number(canvas.dataset.presentationFrame ?? '0');
      const startedAt = performance.now();

      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: keyCode,
        bubbles: true,
        cancelable: true,
      }));

      return new Promise<{
        latencyMs: number;
        startFrame: number;
        observedFrame: number;
        beforeX: number;
        afterX: number;
        phaseOffsetMs: number;
      }>((resolve, reject) => {
        const deadline = startedAt + 250;

        const check = (): void => {
          const afterX = Number(canvas.dataset.playerX);
          const moved = sign > 0 ? afterX > beforeX : afterX < beforeX;

          if (moved) {
            resolve({
              latencyMs: performance.now() - startedAt,
              startFrame,
              observedFrame: Number(canvas.dataset.presentationFrame ?? '0'),
              beforeX,
              afterX,
              phaseOffsetMs: phaseOffset,
            });
            return;
          }

          if (performance.now() >= deadline) {
            reject(new Error('Timed out waiting for visible movement start.'));
            return;
          }

          requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
      });
    },
    { keyCode: code, sign: direction, phaseOffset: phaseOffsetMs },
  );
}

async function measureStop(
  page: Page,
  code: 'KeyA' | 'KeyD',
  phaseOffsetMs: number,
): Promise<Sample> {
  return page.evaluate(
    async ({ keyCode, phaseOffset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#proz0-canvas');
      if (canvas === null) {
        throw new Error('Missing ProZ0 canvas.');
      }

      const beforeX = Number(canvas.dataset.playerX);
      const startFrame = Number(canvas.dataset.presentationFrame ?? '0');
      const startedAt = performance.now();

      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: keyCode,
        bubbles: true,
        cancelable: true,
      }));

      return new Promise<{
        latencyMs: number;
        startFrame: number;
        observedFrame: number;
        beforeX: number;
        afterX: number;
      }>((resolve, reject) => {
        const deadline = startedAt + 250;

        const check = (): void => {
          if (canvas.dataset.playerState === 'IDLE') {
            resolve({
              latencyMs: performance.now() - startedAt,
              startFrame,
              observedFrame: Number(canvas.dataset.presentationFrame ?? '0'),
              beforeX,
              afterX: Number(canvas.dataset.playerX),
            });
            return;
          }

          if (performance.now() >= deadline) {
            reject(new Error('Timed out waiting for visible locomotion stop.'));
            return;
          }

          requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
      });
    },
    { keyCode: code, phaseOffset: phaseOffsetMs },
  );
}

async function prepareMoving(
  page: Page,
  code: 'KeyA' | 'KeyD',
  facing: 'E' | 'W',
): Promise<void> {
  await page.evaluate((keyCode) => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: keyCode,
      bubbles: true,
      cancelable: true,
    }));
  }, code);

  await expect.poll(
    async () => {
      const canvas = page.locator('#proz0-canvas');
      return {
        state: await canvas.getAttribute('data-player-state'),
        facing: await canvas.getAttribute('data-player-facing'),
      };
    },
    { timeout: 500 },
  ).toEqual({ state: 'MOVING', facing });
}

async function measureDirectionChange(
  page: Page,
  fromCode: 'KeyA' | 'KeyD',
  toCode: 'KeyA' | 'KeyD',
  expectedFacing: 'E' | 'W',
  direction: -1 | 1,
  phaseOffsetMs: number,
): Promise<Sample> {
  return page.evaluate(
    async ({ fromKey, toKey, facing, sign, phaseOffset }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#proz0-canvas');
      if (canvas === null) {
        throw new Error('Missing ProZ0 canvas.');
      }

      const beforeX = Number(canvas.dataset.playerX);
      const startFrame = Number(canvas.dataset.presentationFrame ?? '0');
      const startedAt = performance.now();

      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: fromKey,
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: toKey,
        bubbles: true,
        cancelable: true,
      }));

      return new Promise<{
        latencyMs: number;
        startFrame: number;
        observedFrame: number;
        beforeX: number;
        afterX: number;
      }>((resolve, reject) => {
        const deadline = startedAt + 250;

        const check = (): void => {
          const afterX = Number(canvas.dataset.playerX);
          const movedInNewDirection = sign > 0
            ? afterX > beforeX
            : afterX < beforeX;

          if (
            canvas.dataset.playerFacing === facing
            && movedInNewDirection
          ) {
            resolve({
              latencyMs: performance.now() - startedAt,
              startFrame,
              observedFrame: Number(canvas.dataset.presentationFrame ?? '0'),
              beforeX,
              afterX,
            });
            return;
          }

          if (performance.now() >= deadline) {
            reject(new Error('Timed out waiting for visible direction change.'));
            return;
          }

          requestAnimationFrame(check);
        };

        requestAnimationFrame(check);
      });
    },
    {
      fromKey: fromCode,
      toKey: toCode,
      facing: expectedFacing,
      sign: direction,
      phaseOffset: phaseOffsetMs,
    },
  );
}

test.use({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});

test('P0-BUG-001 retains browser/presentation P95 responsiveness evidence', async ({
  browser,
  page,
}) => {
  test.setTimeout(30_000);

  await page.goto('/');

  const root = page.locator('[data-proz0-autoboot]');
  const canvas = page.locator('#proz0-canvas');

  await expect(root).toHaveAttribute('data-runtime-status', 'ready');
  await expect(canvas).toBeVisible();
  await releaseMovementKeys(page);

  const startSamples: Sample[] = [];
  const stopSamples: Sample[] = [];
  const directionSamples: Sample[] = [];

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startsRight = index % 2 === 0;
    const primaryCode = startsRight ? 'KeyD' : 'KeyA';
    const primaryDirection = startsRight ? 1 : -1;
    const primaryFacing = startsRight ? 'E' : 'W';
    const oppositeCode = startsRight ? 'KeyA' : 'KeyD';
    const oppositeDirection = startsRight ? -1 : 1;
    const oppositeFacing = startsRight ? 'W' : 'E';
    const phaseOffsetMs = PHASE_OFFSETS_MS[index % PHASE_OFFSETS_MS.length]!;

    startSamples.push(
      await measureStart(page, primaryCode, primaryDirection, phaseOffsetMs),
    );
    stopSamples.push(await measureStop(page, primaryCode, phaseOffsetMs));

    await prepareMoving(page, primaryCode, primaryFacing);
    directionSamples.push(
      await measureDirectionChange(
        page,
        primaryCode,
        oppositeCode,
        oppositeFacing,
        oppositeDirection,
        phaseOffsetMs,
      ),
    );

    await page.evaluate((keyCode) => {
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: keyCode,
        bubbles: true,
        cancelable: true,
      }));
    }, oppositeCode);
    await waitUntilIdle(page);
  }

  const metrics = {
    movementStart: summarize(startSamples),
    movementStop: summarize(stopSamples),
    directionChange: summarize(directionSamples),
  };

  const report = {
    schemaVersion: 1,
    task: 'P0-BUG-001',
    sourceAcceptanceCriteria: [
      'AC-MOV-009',
      'AC-MOV-010',
      'AC-MOV-011',
    ],
    thresholdMs: THRESHOLD_MS,
    percentileMethod: 'nearest-rank ceil(0.95 * N)',
    sampleCountPerMetric: SAMPLE_COUNT,
    phaseOffsetsMs: PHASE_OFFSETS_MS,
    measurementBoundary:
      'browser KeyboardEvent dispatch -> post-Pixi-render canvas presentation diagnostics observed on requestAnimationFrame',
    baseline: {
      browser: 'chromium',
      browserVersion: browser.version(),
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      internalRaster: { width: 640, height: 360 },
      displayScale: 2,
    },
    testedHead: process.env.P0_TEST_HEAD_SHA ?? 'local-worktree',
    workflowCommit: process.env.GITHUB_SHA ?? 'local-worktree',
    generatedAt: new Date().toISOString(),
    metrics,
    rawSamples: {
      movementStart: startSamples,
      movementStop: stopSamples,
      directionChange: directionSamples,
    },
  };

  console.log(
    '[P0-BUG-001]',
    JSON.stringify({
      sampleCountPerMetric: SAMPLE_COUNT,
      phaseOffsetsMs: PHASE_OFFSETS_MS,
      movementStartP95Ms: metrics.movementStart.p95Ms,
      movementStopP95Ms: metrics.movementStop.p95Ms,
      directionChangeP95Ms: metrics.directionChange.p95Ms,
      thresholdMs: THRESHOLD_MS,
    }),
  );

  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(EVIDENCE_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

  expect(metrics.movementStart.sampleCount).toBe(SAMPLE_COUNT);
  expect(metrics.movementStop.sampleCount).toBe(SAMPLE_COUNT);
  expect(metrics.directionChange.sampleCount).toBe(SAMPLE_COUNT);

  expect(
    metrics.movementStart.p95Ms,
    'AC-MOV-009 keydown -> visible displacement P95',
  ).toBeLessThanOrEqual(THRESHOLD_MS);
  expect(
    metrics.movementStop.p95Ms,
    'AC-MOV-010 final keyup -> visible locomotion stop P95',
  ).toBeLessThanOrEqual(THRESHOLD_MS);
  expect(
    metrics.directionChange.p95Ms,
    'AC-MOV-011 direction input change -> visible direction change P95',
  ).toBeLessThanOrEqual(THRESHOLD_MS);
});
