# P0-BUG-001 — Movement responsiveness measurement

This QA-correction harness measures the approved Phase 0 responsiveness criteria in the production browser build.

## Baseline

- Chromium via the repository Playwright dependency.
- 1280×720 viewport.
- Device scale factor 1.
- 640×360 internal raster displayed at the approved 2× reference scale.
- Production Vite build served by the existing Playwright web server.

## Measurement boundary

Each latency sample starts immediately before a browser `KeyboardEvent` is dispatched to `window`, so it enters the same `KeyboardInputAdapter` listener used by the runtime.

The sample completes only after the production presentation path has run and the canvas exposes diagnostics written **after** `Pixi renderer.render(...)` for that frame.

Metrics:

- AC-MOV-009: keydown → post-render visible displacement.
- AC-MOV-010: final keyup → post-render `IDLE` locomotion state.
- AC-MOV-011: direction input transition → post-render facing plus displacement in the new direction.

## Sampling and P95

The test records 40 independent samples for each metric.

P95 uses nearest-rank:

`sorted[ceil(0.95 × N) - 1]`

Each metric independently fails the E2E gate when P95 exceeds 50 ms.

## Reproduce locally

```bash
npm ci
npm run build
npm run test:e2e -- movement-responsiveness.spec.ts
```

Evidence is written to:

`test-results/p0-bug-001/movement-responsiveness.json`

The JSON contains raw samples, sample count, P95/min/max summaries, browser version, viewport, tested commit identifier, and the measurement boundary.

## CI retention

The main CI workflow uploads the JSON as an artifact named:

`p0-bug-001-responsiveness-<commit-sha>`

Artifacts are retained for 30 days so QA can inspect the exact raw samples and summary from the tested commit.

This harness does not change movement speed, input semantics, camera tuning, collision, or the approved 50 ms requirement.
