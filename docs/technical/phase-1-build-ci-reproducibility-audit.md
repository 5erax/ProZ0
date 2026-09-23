# Phase 1 Build & CI Reproducibility Audit

**Task:** P1-DEVOPS-001 / Issue #71  
**Role:** Build / Tools / DevOps Engineer  
**Member:** B-DEVOPS-01  
**Home company:** COMPANY_B  
**Coordinating PM:** PM-B  
**Status:** COMPLETE — CURRENT-STATE AUDIT  
**Audit date:** 2026-09-23  
**Audited main:** `0bdb303706eb6f179e836002bf9240d6282c1992`  
**Exact-main CI evidence:** GitHub Actions run `35814488629` — SUCCESS  
**Implementation authorization:** NONE — documentation/audit only

---

## 1. Purpose and content boundary

This artifact records the current cross-company clean-checkout, build, test, CI, and evidence-traceability path required by #71.

It is a current-state audit. It does **not**:

- change `.github/workflows/**`;
- change package/build/test scripts;
- deploy or promote a release;
- define Phase 1 performance budgets or QA acceptance gates;
- redefine Technical Lead authority held by #45 / P1-TECH-009;
- redefine PM-A release ownership/scope held by #57 / P1-REL-001.

### Artifact protocol record

**Exact path:** `docs/technical/phase-1-build-ci-reproducibility-audit.md`  
**Purpose:** make current build/test/CI reproduction and evidence discovery usable by either company without chat history.  
**Responsibilities/content boundary:** current toolchain, commands, workflow mapping, evidence identity, local-machine assumptions, gaps, severity, and recommended owner/next action only.  
**Dependencies:** current `main`; Phase 1 plan; P0 development/testing CI ADR; #45; #57; source Issue #71.  
**Integration/reference point:** #45 may consume current-state CI/evidence findings without transferring its quality-gate authority; #57 may consume build/release-evidence findings without transferring its release ownership.

---

## 2. Sources and audit baseline

### CONFIRMED sources

- `docs/phase-1-vertical-slice-plan.md`
- `docs/adr/ADR-P0-TECH-007-development-testing-ci-strategy.md`
- `docs/development/phase-0-runtime.md`
- `package.json`
- `package-lock.json`
- `.nvmrc`
- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `vitest.config.ts`
- `vitest.browser.config.ts`
- `vite.config.ts`
- `tsconfig.json`
- `.gitignore`
- current GitHub branch/ruleset/workflow-run state
- #45 P1-TECH-009
- #57 P1-REL-001
- #71 P1-DEVOPS-001

The audit began on `main @ e11b65459d588c27f5546ad9ce85ab4df8a147b7`. During the audit, `main` advanced by one commit to `0bdb303706eb6f179e836002bf9240d6282c1992`. The only changed path between those SHAs was:

`docs/world-design/phase-1-ruin-expedition-spatial-brief.md`

No build, package, test, CI, or toolchain path changed. The newer exact-main CI run `35814488629` completed successfully, so this report uses `0bdb303...` as its final audit baseline.

### Validation method

The executable clean-checkout evidence used for this audit is the GitHub-hosted exact-main CI run. It performs a clean checkout, lockfile install, Chromium provisioning, every current test layer, and the production build on the exact audited commit.

This role runtime did not claim a second independent developer-workstation execution. Therefore host-specific behavior outside the observed Ubuntu CI environment is documented as a gap where the repository does not define it.

---

## 3. Current toolchain

| Component | Current repository contract / observed CI |
|---|---|
| Node | `package.json engines: >=24 <25`; `.nvmrc: 24`; CI requests Node 24 |
| npm | package manager implied by `package-lock.json` and `npm ci`; npm patch version is not pinned |
| Lockfile | committed `package-lock.json`, lockfileVersion 3 |
| TypeScript | 6.0.3 |
| Vite | 8.3.0 |
| PixiJS | 8.21.0 |
| ESLint | 10.11.0 |
| Vitest | 5.0.1 |
| Playwright | 1.63.0 |
| CI | GitHub Actions, one workflow: `.github/workflows/ci.yml` |
| CI browser | Chromium provisioned by Playwright |
| Current CI runner | GitHub-hosted Ubuntu; exact image is recorded in each run log |

Dependency versions in `package.json` are exact and the dependency graph is locked by `package-lock.json`.

No `.npmrc`, `.env*`, Dockerfile/devcontainer, alternate package-manager lockfile, `.tool-versions`, or other host provisioning manifest was found in the audited repository tree.

---

## 4. Reproducible clean-checkout path — current repository

### 4.1 Repository-proven CI-parity path

For an Ubuntu environment intended to reproduce the current GitHub Actions path:

```bash
git clone https://github.com/5erax/ProZ0.git
cd ProZ0

# Select a Node version satisfying >=24 <25.
# .nvmrc records major 24 when nvm is available.
node --version
npm --version

npm ci
npx playwright install --with-deps chromium

npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:determinism
npm run build
npm run test:browser
npm run test:e2e
```

To reproduce a specific candidate rather than moving `main`, checkout its exact SHA before `npm ci`:

```bash
git checkout <exact-commit-sha>
```

For this audit baseline:

```bash
git checkout 0bdb303706eb6f179e836002bf9240d6282c1992
```

### 4.2 Local development

Current scripts expose:

```bash
npm ci
npm run dev
```

Browser-dependent tests still require Chromium to exist. The repository's proven provisioning command is the CI command:

```bash
npx playwright install --with-deps chromium
```

The repository does not currently define a complete non-Ubuntu OS dependency/provisioning path.

### 4.3 Production build/preview

```bash
npm run build
npm run preview
```

The production output is generated under `dist/`. Playwright E2E starts preview on:

`http://127.0.0.1:4173`

### 4.4 Aggregate `npm run ci`

`package.json` defines:

```text
typecheck
→ lint
→ test:unit
→ test:integration
→ test:determinism
→ build
→ test:browser
→ test:e2e
```

Important: `npm run ci` does **not** install dependencies and does **not** install Chromium. It is an aggregate verification command only after machine/dependency provisioning has succeeded.

---

## 5. Existing GitHub Actions mapping

There is one workflow:

`.github/workflows/ci.yml`

Triggers:

- pull request targeting `main`;
- push to `main`.

Workflow-level permission is:

`contents: read`

There is one job: `quality`.

| CI step | Current action/command | Purpose |
|---|---|---|
| Checkout | `actions/checkout@v4` | clean repository checkout |
| Node setup | `actions/setup-node@v4`, Node 24, npm cache | runtime + package cache |
| Install dependencies | `npm ci` | install exact lockfile graph |
| Install Chromium | `npx playwright install --with-deps chromium` | browser + Linux browser dependencies |
| Typecheck | `npm run typecheck` | TypeScript no-emit check |
| Lint/boundaries | `npm run lint` | lint + architecture import boundaries |
| Unit | `npm run test:unit` | Node unit tests |
| Integration | `npm run test:integration` | Node integration tests |
| Determinism | `npm run test:determinism` | deterministic/golden checks |
| Build | `npm run build` | Vite production build |
| Browser | `npm run test:browser` | Vitest Browser Mode / Chromium |
| E2E | `npm run test:e2e` | Playwright against production preview |
| Responsiveness evidence | `actions/upload-artifact@v4` | P0-BUG-001 JSON, 30-day retention |
| Visual evidence | `actions/upload-artifact@v4` | P0-BUG-002 files, 30-day retention |

The workflow invokes the verification commands individually rather than calling `npm run ci`. This is useful because failures are separately visible by layer.

---

## 6. Exact-main execution evidence

For audited main:

- commit: `0bdb303706eb6f179e836002bf9240d6282c1992`
- workflow run: `35814488629`
- job: `quality`, job ID `107032985651`
- event: `push`
- result: **SUCCESS**

The runner clean-checked out the exact commit, and `git log -1 --format=%H` returned the same SHA.

Observed environment:

- Ubuntu GitHub-hosted runner;
- Node `v24.21.0`;
- npm `11.19.0`;
- `npm ci`: 162 packages added, 0 vulnerabilities reported by that run.

All current layers passed:

- dependency install;
- Chromium install;
- typecheck;
- lint / architecture boundaries;
- 64 unit tests;
- 29 integration tests;
- 6 determinism tests;
- production build;
- 9 browser tests;
- 3 E2E tests.

This proves the current audited `main` can complete the repository's full automated clean-checkout path in the CI environment.

---

## 7. Commit → CI → evidence traceability today

### 7.1 Main/push flow

For a main commit:

1. locate the exact commit SHA;
2. find GitHub Actions workflow `ci` whose `head_sha` equals that commit;
3. inspect the `quality` job and per-step conclusions;
4. inspect job logs for exact checkout SHA, runtime versions, command output, and failures;
5. inspect run artifacts for retained evidence.

For `0bdb303...`, the exact-main run is `35814488629`.

### 7.2 Retained evidence on the audited run

Two artifacts currently exist:

1. `p0-bug-001-responsiveness-0bdb303706eb6f179e836002bf9240d6282c1992`
   - artifact ID: `10730629755`
   - SHA-256 digest: `65de7336cfee3d270f0b9cf2ca5211ea85c4b86a14730692f54159adcf9d5621`
   - retention: 30 days
   - expiry: 2026-10-23

2. `p0-bug-002-visual-evidence-0bdb303706eb6f179e836002bf9240d6282c1992`
   - artifact ID: `10730754582`
   - SHA-256 digest: `3e3367450af959c47704de5cdd162c1909a32f48dc79bac48ec353c5af78d79e`
   - retention: 30 days
   - expiry: 2026-10-23

The production `dist/` generated by `npm run build` is **not** uploaded as a retained artifact by the current workflow.

### 7.3 Pull-request identity behavior

GitHub's pull-request workflow tests the synthetic pull-request merge ref by default.

Observed example, PR #72:

- source branch head: `c314312a89313c84ed134c77af51958281d79e04`;
- base main at the run: `e11b65459d588c27f5546ad9ce85ab4df8a147b7`;
- actual checked-out test commit: synthetic merge `02d1692163377cc2ebbc2366e1c990a43e82cbfd`;
- workflow run: `35812484193`, SUCCESS.

The E2E evidence path sets `P0_TEST_HEAD_SHA` to the PR source head while `GITHUB_SHA` identifies the checked-out workflow commit. The evidence-generation tests record both `testedHead` and `workflowCommit`. Therefore the repository can distinguish source-head identity from merge-test identity when inspecting retained evidence.

This distinction should be preserved in future evidence policy rather than treating a PR branch head and tested merge ref as interchangeable.

---

## 8. Secret/private credential audit

### Result: PASS for normal current local build/test

No project-specific private credential is required by the current normal build/test path.

Evidence:

- workflow declares only `contents: read`;
- current workflow does not reference `secrets.*`;
- no repository `.npmrc` or environment file was found;
- audited application/build paths did not reveal a required external backend credential;
- the lockfile uses normal package-registry dependencies;
- P0-TECH-007 explicitly states that the baseline requires no secret or external backend.

GitHub Actions internally supplies an ephemeral/masked GitHub token to standard Actions such as checkout/setup. That platform token is not a developer-supplied ProZ0 credential and is not required for a normal public-repository local build/test.

Normal setup **does** require outbound network access to retrieve npm packages and Playwright/OS browser dependencies unless those assets are already cached.

---

## 9. Hidden assumptions and findings

Severity here describes current delivery/reproducibility risk. It does not redefine #45's future quality-gate policy.

### F-01 — HIGH — CI runs are not repository-enforced merge gates

**CONFIRMED**

Current GitHub branch state reports:

- `main protected: false`;
- branch required-status-check enforcement: off;
- repository rulesets: `[]`.

The CI workflow runs automatically for PRs to `main` and pushes to `main`, but current repository configuration does not make the `quality` job a server-enforced prerequisite to changing `main`.

This is weaker than the approved P0 technical rule that a merge should not be considered technically ready while a required gate fails except by recorded exception.

**Risk:** a direct push or merge path can change main without GitHub enforcing a successful quality job first. A failed post-push CI run detects the problem after main has already changed.

**Recommended owner / next action:** #45 / Technical Lead owns the Phase 1 quality-gate policy decision. PM coordination should route a separate authorized Build/Tools/DevOps implementation task if repository enforcement is approved. This audit does not alter protection/rulesets.

---

### F-02 — MEDIUM — documented clean-checkout sequence omits browser provisioning

**CONFIRMED**

Both P0-TECH-007's standard clean-checkout sequence and `docs/development/phase-0-runtime.md` list `npm ci` followed by test/build commands, but they do not include the Chromium provisioning command.

The actual CI requires:

`npx playwright install --with-deps chromium`

before browser/E2E tests.

**Risk:** on a genuinely new machine with no compatible Playwright browser already installed, following the older documented sequence can fail even though application dependencies installed correctly.

**Current mitigation:** this audit records the repository-proven CI-parity command explicitly.

**Recommended owner / next action:** future Build/Tools/DevOps documentation/setup work should make browser provisioning explicit and define supported host-OS setup. If the setup becomes architecture/security policy rather than documentation, Technical Lead review is required.

---

### F-03 — MEDIUM — execution environment is only partially pinned

**CONFIRMED**

Pinned:

- dependency graph via `package-lock.json`;
- project dependency versions;
- Node major range 24.

Not exact-pinned:

- Node patch version;
- npm version;
- GitHub runner image through `ubuntu-latest`;
- standard GitHub Actions through major tags such as `actions/checkout@v4`.

Observed drift occurred during this audit without any build/toolchain source change:

- run `35811620748`: Node `v24.20.0`, older Ubuntu runner image;
- run `35814488629`: Node `v24.21.0`, newer runner image;
- npm remained `11.19.0`.

Both runs passed, but this demonstrates that future execution is not byte-for-byte environment-identical merely from repository checkout.

**Risk:** a tool/runtime/runner patch can alter behavior independently of ProZ0 source.

**Recommended owner / next action:** Build/Tools/DevOps should propose the required degree of environment pinning only after the Technical Lead/#45 decides what exact-main reproducibility/evidence guarantees Phase 1 requires.

---

### F-04 — MEDIUM — successful production build bits are not retained

**CONFIRMED**

`npm run build` generates `dist/` and CI records success, but the workflow uploads only P0 responsiveness and visual-QA evidence.

There is no retained production-build artifact for the exact main run.

**Risk:** today, the repository can prove that a commit successfully built, but cannot retrieve the exact CI-produced browser build bits after the job workspace is gone. A later rebuild may run under a different Node/runner/action patch environment.

**Recommended owner / next action:**

- #45 / Technical Lead owns any future retained-build/evidence policy;
- #57 / PM-A release scope owns how a stable PO review deployment consumes and records an exact candidate;
- if an artifact-publishing change is approved, PMs should route implementation to Build/Tools/DevOps without transferring #57 ownership.

---

### F-05 — MEDIUM — local E2E may reuse unrelated/stale server state

**CONFIRMED**

`playwright.config.ts` configures:

`reuseExistingServer: !process.env.CI`

For local runs, if something is already serving the expected URL on port 4173, Playwright is allowed to reuse it instead of starting the current checkout's preview server.

CI sets `CI`, so exact-main CI does not have this risk.

**Risk:** a developer can run local E2E against an already-running/stale server and believe the current checkout was tested.

**Recommended owner / next action:** Build/Tools/DevOps should address local-server identity/isolation in a future authorized tooling task. If changing test semantics affects acceptance policy, coordinate with Technical Lead/QA first.

---

### F-06 — LOW — cross-platform workstation provisioning is not defined

**CONFIRMED**

The repository defines Node/npm and CI's Ubuntu provisioning, but has no container/devcontainer or equivalent host bootstrap. The `--with-deps` Chromium setup is proven in Ubuntu CI; repository documentation does not define equivalent supported Windows/macOS/Linux workstation prerequisites.

**Risk:** both companies can use the shared command model, but workstation-specific browser/system dependencies can still depend on local knowledge.

**Recommended owner / next action:** Build/Tools/DevOps documentation/setup automation, within Technical Lead architecture/security constraints.

---

### F-07 — LOW — development workflow is weakly discoverable from the root README

**CONFIRMED**

The root README links product/design documentation but does not expose the clean-checkout/build/test development path. The working sequence existed in the P0 technical ADR and Phase 0 development document rather than at an obvious top-level developer entry point.

**Current mitigation:** #71 and this artifact provide a direct discoverable technical path.

**Recommended owner / next action:** future documentation maintenance may link the canonical developer setup/audit from a top-level contributor/development entry point. No workflow/script change is required.

---

### F-08 — INFO / PASS — no hidden project credential for current build/test

No project secret/private credential requirement was found for normal current local build/test. This is a positive finding, not an authorization to expose or inspect production secrets.

---

## 10. Current behavior vs #45 and #57 authority

### #45 — P1-TECH-009

#45 remains the Technical Lead-owned source for future Phase 1:

- measurable performance/observability gates;
- CI suite extensions;
- deterministic/save/network regression policy;
- multi-client real-browser E2E strategy;
- retained evidence policy;
- exact-main acceptance evidence policy.

This audit supplies current-state evidence only. Findings F-01, F-03, and F-04 are inputs to that decision space, not decisions made on behalf of #45.

### #57 — P1-REL-001

#57 remains PM-A legacy release scope for:

- production deployment;
- stable browser URL;
- exact deployed commit/build identity;
- HTTPS;
- deployment/recovery instructions;
- deployment smoke checks;
- persisted release evidence.

Current CI has no deployment step and retains no production `dist/` artifact. This audit records that fact but does not design or implement #57's release path.

---

## 11. Reproducibility/evidence status summary

| Area | Current status |
|---|---|
| Lockfile dependency install | PASS |
| Node major contract | PASS |
| Clean checkout in CI | PASS |
| Typecheck/lint/unit/integration/determinism | PASS |
| Production build from exact main | PASS |
| Real Chromium browser tests | PASS |
| Production-preview E2E | PASS |
| No project secret needed for normal build/test | PASS |
| Commit → workflow run trace | PASS |
| Per-layer failure visibility | PASS |
| P0 evidence artifact trace | PASS, 30-day retention |
| Exact CI-produced `dist/` retention | GAP |
| Developer browser provisioning in older setup docs | GAP |
| Cross-platform host provisioning | GAP |
| Exact runtime/runner pinning | PARTIAL |
| Server-enforced CI before main changes | GAP |
| Local E2E isolation from stale server | GAP |

---

## 12. Acceptance Criteria self-check

- **A qualified member from either company can follow the documented current clean-checkout build/test path:** PASS — this artifact records the full repository-proven Ubuntu/CI-parity path including the previously omitted Chromium provisioning step, with non-Ubuntu limitations explicitly called out.
- **Existing CI commands/workflows are mapped accurately:** PASS.
- **Evidence traceability from commit → CI/build result is documented:** PASS.
- **Hidden machine assumptions and reproducibility gaps are explicitly recorded:** PASS.
- **Findings do not silently modify Technical Lead quality-gate authority or PM-A release ownership:** PASS.
- **No CI/deployment/tooling code is changed:** PASS — only this audit document is created.
- **Universal Handoff Manifest posted:** to be posted on source Issue #71 after this artifact is persisted.

---

## 13. Recommended routing

No downstream work is self-activated by this audit.

Recommended routing through the existing PM layer:

1. PM-B accepts/records the #71 handoff.
2. PM-B may surface relevant current-state findings to PM-A/#45/#57 through normal cross-company coordination.
3. #45 Technical Lead decides Phase 1 gate/evidence policy within its existing authority.
4. #57 remains PM-A release scope.
5. Any implementation change to branch enforcement, environment pinning, artifact retention, local E2E isolation, or setup automation requires a separately authorized task/lock.

**PROJECT OWNER ACTION: NONE**
