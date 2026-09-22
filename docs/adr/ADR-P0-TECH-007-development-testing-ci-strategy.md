# ADR-P0-TECH-007 — Development, Testing & CI Strategy

**Task:** P0-TECH-007  
**Source Issue:** #9  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22

## Information classification

### CONFIRMED
- Toolchain: TypeScript + Vite + PixiJS v8/WebGL.
- Domain modules must be testable without Pixi/DOM.
- Phase 0 needs deterministic checks, browser/render validation, architecture-boundary enforcement, and repeatable clean-checkout workflow.
- Current repository has no approved runtime bootstrap yet.

### DECISION
Use Node.js **24 LTS** for Phase 0 development/CI, npm with committed `package-lock.json`, TypeScript, ESLint, Vitest, Vitest Browser Mode with Playwright/Chromium, and GitHub Actions CI.

Node 24 is the current LTS line as of this decision date. Dependency majors are pinned through the lockfile; upgrades require green CI.

### CONSTRAINT
Automated Chromium gating does not by itself define the final supported-browser product matrix.

# ADR

## ADR ID
ADR-P0-TECH-007

## CONTEXT
P0-ENG-001 must eventually produce a runtime that a developer and CI can install, test, build, and browser-smoke from a clean checkout with no undocumented setup.

## DECISION

### Standard clean-checkout workflow
Required sequence:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:determinism
npm run build
npm run test:browser
npm run test:e2e
```

Local development:
```bash
npm ci
npm run dev
```

Production verification:
```bash
npm run build
npm run preview
```

### Required test layers

1. **Unit / Node**
   - pure foundation/content/domain utilities;
   - RNG/golden vectors;
   - movement math/domain rules where implemented;
   - no DOM/Pixi.

2. **Integration / Node**
   - simulation + world public boundaries;
   - local authority runtime;
   - persistence contracts later;
   - no renderer requirement.

3. **Determinism**
   - repeated initial state + input tape + fixed ticks;
   - deterministic RNG golden vectors;
   - render cadence independence;
   - later chunk request-order invariance.
   - Concrete expected equivalence follows the approved P0-TECH-003 artifact.

4. **Browser component/integration**
   - Vitest Browser Mode;
   - Playwright provider;
   - Chromium headless in CI;
   - browser focus/input adapter;
   - Pixi/WebGL initialization;
   - DPR/reference raster/pixel presentation checks practical for automation.

5. **E2E smoke**
   - launch production Vite preview/build;
   - open game;
   - assert runtime boots with no fatal console errors;
   - basic movement/camera smoke once implemented;
   - keep suite small and high-value in Phase 0.

6. **Manual/visual QA**
   - crisp 2× 1280×720 and 3× 1920×1080;
   - nearest filtering/no blur;
   - static scene shimmer check;
   - ground-anchor front/behind test;
   - responsiveness measurements/observations defined by QA plan.

### Architecture boundary enforcement
CI must fail forbidden imports.

Implementation may use ESLint flat config with `no-restricted-imports`/patterns or an equivalent checked rule, enforcing:
- only `src/client/presentation/**` imports `pixi.js`;
- simulation/world/content cannot import client/Pixi/DOM;
- simulation cannot import concrete persistence;
- cross-module code cannot import another module's `internal/**`.

### CI gates
For every PR to `main` and push to `main`:

Required blocking gates:
1. install from lockfile;
2. typecheck;
3. lint + architecture boundaries;
4. unit tests;
5. integration tests;
6. determinism tests;
7. production build;
8. headless browser tests;
9. E2E smoke.

No merge should be considered technically ready while a required gate fails, unless Producer/Technical Lead records an explicit approved exception in the Issue/PR.

### CI environment
- Node 24 LTS;
- npm cache keyed from `package-lock.json`;
- Chromium installed through Playwright for browser jobs;
- no secret or external backend required for Phase 0 baseline;
- CI runs from clean checkout.

## ALTERNATIVES

### Ad-hoc local-only testing
Rejected: not repeatable and cannot protect architecture/determinism.

### Heavy multi-browser matrix in Phase 0
Rejected for CI baseline: unnecessary cost before final browser-support policy. Additional browsers may be QA/manual or added later.

### Full end-to-end suite for every behavior
Rejected: slow/brittle. Domain rules belong in fast Node tests; browser E2E stays thin.

## TRADE-OFFS
- Browser tests add CI runtime and Playwright dependency.
- Architecture lint rules require maintenance as modules evolve.
- Single Chromium CI gate gives fast reliable coverage but is not a final compatibility guarantee.

## CONSEQUENCES
- P0-ENG-001 bootstrap must include scripts/config needed by this workflow.
- P0-QA-001 can map Phase 0 ACs to these layers.
- Determinism regressions become blocking CI failures.
- Browser/render behavior is validated in a real browser rather than jsdom-only tests.

# TECHNICAL DESIGN SPEC

## SYSTEM
Development / Testing / CI

## ARCHITECTURE OVERVIEW
Fast pure-domain tests run first; environment-specific browser/E2E validation runs after type/lint/unit/integration/determinism/build gates.

## COMPONENTS
- Node/npm toolchain.
- TypeScript typecheck.
- ESLint architecture/lint rules.
- Vitest Node suites.
- Vitest Browser Mode + Playwright provider.
- production Vite build/preview.
- GitHub Actions workflow.

## RESPONSIBILITIES
Developers reproduce the same scripts locally. CI is the authoritative automated gate. QA owns product acceptance evidence, not CI configuration.

## DATA MODEL
Test fixtures must be explicit/versioned enough to reproduce failures: seeds, input tapes, expected snapshots/golden hashes, viewport/DPR fixtures where applicable.

## DATA OWNERSHIP
Tests own fixtures only. Tests may not become sources of gameplay requirements; expected behavior comes from approved specs/ADRs.

## CLIENT RESPONSIBILITY
Expose browser/runtime hooks needed for black-box/browser validation without leaking test-only authority into production domain logic.

## SERVER RESPONSIBILITY
No server CI required in Phase 0. Headless domain tests preserve future server compatibility.

## PERSISTENCE
When P0-TECH-005 is implemented, add round-trip/corruption/migration tests to integration/determinism gates as appropriate.

## NETWORKING
No live network CI required yet. Authority-boundary tests remain headless.

## PUBLIC INTERFACES
Required package scripts:
- `dev`
- `build`
- `preview`
- `typecheck`
- `lint`
- `test:unit`
- `test:integration`
- `test:determinism`
- `test:browser`
- `test:e2e`
- optional aggregate `ci`

## FAILURE HANDLING
Any command exits non-zero on failure. Browser failures preserve traces/screenshots where practical. CI artifacts/logs must identify the failed layer and seed/fixture for deterministic failures.

## PERFORMANCE
Keep unit/integration suites fast and headless. Browser/E2E suite is intentionally narrow. Performance thresholds beyond responsiveness/tick diagnostics require representative implementation before becoming hard gates.

## SECURITY / VALIDATION
CI uses least required permissions, no production secrets, lockfile installs, and does not execute untrusted external runtime services for Phase 0.

## OBSERVABILITY
CI output identifies test layer, seed/input fixture, browser, build commit, and failed architecture rule. Browser failures should retain screenshot/trace when useful.

## TEST STRATEGY
The six layers above are mandatory categories; exact test cases are mapped by P0-QA-001 from approved ACs.

## MIGRATION
When final browser matrix, server package, persistence backend, or network transport arrives, add jobs without replacing the fast domain gates.

## KNOWN LIMITATIONS
No release/deploy pipeline, store publishing, analytics, broad browser matrix, load-test farm, or production monitoring pipeline is defined here.

## FUTURE EXTENSION
Multi-browser CI, server-host integration tests, persistence fixtures, network simulation, performance budgets, deployment/release gates.

# FILE PLAN

## CREATE
`.nvmrc`
- Purpose: pin Phase 0 Node major to 24.

`package.json`
- Purpose: canonical scripts/dependency manifest.
- API: scripts listed above.

`package-lock.json`
- Purpose: reproducible dependency graph.

`tsconfig.json`
- Purpose: strict TypeScript project configuration.

`vite.config.ts`
- Purpose: dev/build configuration.

`vitest.config.ts`
- Purpose: Node unit/integration/determinism test configuration.

`vitest.browser.config.ts`
- Purpose: real-browser Vitest configuration with Playwright Chromium.

`playwright.config.ts`
- Purpose: production-build E2E smoke configuration.

`eslint.config.js`
- Purpose: lint and import-boundary enforcement.

`.github/workflows/ci.yml`
- Purpose: required PR/push CI gates.

`tests/unit/`
`tests/integration/`
`tests/determinism/`
`tests/browser/`
`tests/e2e/`
- Purpose: test-layer ownership and discoverability.

## MODIFY
None currently; repository runtime bootstrap does not yet exist.

# ACCEPTANCE CRITERIA SELF-CHECK
- Clean-checkout workflow explicit: PASS.
- Automated test layers/CI gates explicit: PASS.
- Determinism validation included: PASS.
- Real-browser validation included: PASS.
- Architecture-boundary enforcement included: PASS.
- Phase 0 scope remains proportional: PASS.

# EXTERNAL TECHNICAL VERIFICATION
Checked against current official documentation on 2026-09-22:
- Node.js releases: Node 24 is LTS.
- Vitest Browser Mode is stable and supports Playwright provider/headless real-browser execution.
- Vite remains the approved build tool from P0-TECH-001.

# HANDOFF
Return to Producer for DoD verification. P0-QA-001 may consume this strategy only after the applicable technical artifacts are Producer-accepted.

**PROJECT OWNER ACTION: NONE**
