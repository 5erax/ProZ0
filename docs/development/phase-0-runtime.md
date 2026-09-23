# Phase 0 browser runtime workflow

Task: P0-ENG-001  
Source Issue: #11  
Developer-setup remediation: P1-DEVOPS-002 / Issue #74

## Toolchain

- Node.js 24 LTS
- npm with committed package-lock.json
- TypeScript
- Vite
- PixiJS v8 using WebGL/WebGL2 for Phase 0
- ESLint
- Vitest
- Vitest Browser Mode + Playwright/Chromium
- Playwright E2E

## Proven CI-parity boundary

The repository-proven clean-checkout path is the GitHub Actions Ubuntu path used by `.github/workflows/ci.yml`. It installs the locked npm dependency graph, provisions Playwright Chromium plus its Ubuntu system dependencies, and then runs every current verification layer.

Non-Ubuntu workstation provisioning is not fully defined by the repository. The commands below document current repository behavior; they do not create a Windows/macOS/Linux support matrix beyond the proven Ubuntu/GitHub-Actions path.

For detailed evidence, traceability, and known reproducibility limitations, see [Phase 1 Build & CI Reproducibility Audit](../technical/phase-1-build-ci-reproducibility-audit.md).

## Clean checkout / CI-parity verification

Use Node 24 as required by `package.json` and recorded by `.nvmrc`.

### 1. Install repository dependencies

```bash
npm ci
```

### 2. Provision Chromium and Ubuntu browser/system dependencies

```bash
npx playwright install --with-deps chromium
```

This provisioning step is required by the current GitHub Actions path before browser and E2E verification.

### 3. Run the current verification layers

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:determinism
npm run build
npm run test:browser
npm run test:e2e
```

The same verification sequence is exposed by:

```bash
npm run ci
```

`npm run ci` is aggregate verification only. It does **not** run `npm ci` and does **not** install Chromium or its system dependencies. A clean machine must complete dependency and browser/system provisioning first.

## Local development

For normal development:

```bash
npm ci
npm run dev
```

If the workstation will run browser or E2E verification and does not already have the matching Playwright Chromium installation, provision it first:

```bash
npx playwright install --with-deps chromium
```

The `--with-deps` command above is the repository-proven Ubuntu CI-parity command. Host-specific non-Ubuntu system setup is not fully defined by this document.

## Production build and preview

```bash
npm run build
npm run preview
```

This verifies the current local production build/preview path only. Deployment, release promotion, retained build-artifact policy, and release acceptance remain outside this document.

## Architecture boundaries

Runtime source is separated into:

- `src/foundation` — platform-neutral primitives.
- `src/content` — validated read-only definitions.
- `src/world` — authoritative world boundary.
- `src/simulation` — renderer-independent authoritative simulation boundary.
- `src/persistence` — durable storage adapter boundary.
- `src/client` — browser composition, input, timing, and Pixi presentation.

Only `src/client/presentation/**` may import `pixi.js`.

The bootstrap intentionally does not implement player movement, collision resolution, chunk generation, save/load storage, or multiplayer transport. Those remain downstream authorized tasks.
