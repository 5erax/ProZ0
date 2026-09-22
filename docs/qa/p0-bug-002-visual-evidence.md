# P0-BUG-002 — Phase 0 visual QA evidence

This QA-correction fixture provides reviewable Phase 0 evidence without introducing final art or changing authoritative movement/collision rules.

## Fixture query

The browser runtime accepts presentation-only QA parameters:

- `?qaVisual=light&qaScale=2`
- `?qaVisual=dark&qaScale=2`
- `?qaVisual=dark&qaScale=3`
- `?qaVisual=shimmer&qaScale=2`
- `?qaVisual=depth&qaScale=2`

The `depth` fixture adds a presentation-only 32×64 px tall pillar with a ground/depth anchor. It is intentionally absent from authoritative world collision so QA can traverse both behind and in front of it.

## Evidence cases

The Playwright evidence generator retains:

- `light-ground-2x.png` — player readability on light test ground.
- `dark-ground-2x.png` — player readability on dark test ground and 2× integer presentation.
- `dark-ground-3x.png` — 3× integer presentation.
- `camera-motion-shimmer-00.png` through `05.png` — static-world sequence while the camera follows movement.
- `depth-behind-2x.png` — player behind the tall depth-test object.
- `depth-front-2x.png` — player in front of the same object after traversal.
- `visual-qa-manifest.json` — exact commit, sizing data, case/file mapping, and fixture invariants.

The test also verifies:

- 640×360 internal raster;
- 1280×720 at 2×;
- 1920×1080 at 3×;
- CSS nearest-neighbor/pixelated presentation;
- integer camera raster diagnostics during the shimmer sequence;
- behind/front depth relation around the same ground-anchor object.

## Reproduce locally

```bash
npm ci
npm run build
npm run test:e2e -- visual-qa-evidence.spec.ts
```

Evidence is written to:

`test-results/p0-bug-002/`

## CI retention

The CI workflow uploads the evidence directory as:

`p0-bug-002-visual-evidence-<commit-sha>`

with 30-day retention.

Visual PASS/FAIL for readability, shimmer, and depth ordering remains an Art Director / QA judgment against P0-ART-001. The Gameplay Engineer fixture only makes those cases executable, repeatable, and reviewable.
