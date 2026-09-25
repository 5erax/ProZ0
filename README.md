# ProZ0

[![CI](https://github.com/5erax/ProZ0/actions/workflows/ci.yml/badge.svg)](https://github.com/5erax/ProZ0/actions/workflows/ci.yml)
[![CodeQL](https://github.com/5erax/ProZ0/actions/workflows/codeql.yml/badge.svg)](https://github.com/5erax/ProZ0/actions/workflows/codeql.yml)

**ProZ0** is a web-first, 2D pixel-art survival/exploration sandbox about rebuilding human civilization on a newly settled planet—and discovering why traces of another civilization were already there.

> Start from zero. Prepare carefully. Build something that lasts. Keep exploring because the planet is not empty history.

## Current milestone

The active product milestone is **Phase 1 — Vertical Slice**: a 30–60 minute playable loop that proves landing, gathering, survival preparation, an expedition, death/recovery, first-base progression, shared discovery, and one prior-civilization ruin.

Operational state changes frequently, so task truth lives in GitHub rather than this README:

- [Project board — ProZ0 Project #4](https://github.com/users/5erax/projects/4/views/1)
- [Cross-company coordination baseline — Issue #67](https://github.com/5erax/ProZ0/issues/67)
- [Phase 1 integration — Issue #56](https://github.com/5erax/ProZ0/issues/56)

Phase 0 is accepted and closed. Phase 1 work is integrated through the repository's Issue/PR/QA gates.

## Game direction

### Core loop

`Explore → Gather → Prepare → Survive → Return → Craft → Build → Research → Expand`

### Core pillars

- **Exploration:** fog of war, deterministic procedural regions, resources, wildlife, hazards, ruins, and shared discoveries.
- **Balanced survival:** mistakes can ruin an expedition, so preparation matters; failure is consequential but recoverable.
- **Colony building:** modular rooms, storage, workbenches, power, machines, and later industry.
- **Persistent world:** one mutable world per host/server, with versioned save data and chunk deltas.
- **Flexible progression:** levels, skills, professions, and colony research without permanent class locks.
- **Emergent pressure:** wildlife, alien nests, extraction, pollution, noise, and territory matter more than fixed raid timers.
- **Mystery:** the player gradually discovers evidence of an earlier civilization without turning the game into a linear campaign.

### MVP / vertical-slice target

The Phase 1 slice targets:

- desktop browser delivery;
- solo plus small hosted co-op, initially 2–4 players;
- top-down / 3/4 pixel-art presentation;
- movement, fog, day/night, one weather event, resources and wildlife;
- weight-based inventory and containers;
- gathering, crafting and repair;
- survival needs, one hostile encounter, death drop and recovery;
- landing module, habitat, storage, workbench, power and first useful machine;
- early progression plus profession prototypes;
- one ruin that clearly implies a prior civilization and leaves a larger question unanswered.

See [MVP scope](docs/mvp-scope.md) and [Phase 1 vertical-slice plan](docs/phase-1-vertical-slice-plan.md).

## Technical stack

Current implementation is browser-first:

- **TypeScript**
- **Vite**
- **PixiJS**
- **Vitest**
- **Playwright**
- **Node.js 24**

The architecture is deliberately separated into presentation/client concerns, shared simulation, world/persistence, content/data, and hosted-authority seams. Determinism, versioned saves, explicit state ownership, and testable authority boundaries are project requirements rather than afterthoughts.

Key architecture sources:

- [Runtime architecture](docs/adr/ADR-P0-TECH-002-runtime-architecture-module-boundaries.md)
- [Determinism strategy](docs/adr/ADR-P0-TECH-003-determinism-simulation-strategy.md)
- [Multiplayer authority boundary](docs/adr/ADR-P0-TECH-006-multiplayer-readiness-authority-boundary.md)
- [Phase 1 architecture plan](docs/technical/phase-1-vertical-slice-architecture-plan.md)
- [Hosted co-op protocol](docs/adr/ADR-P1-TECH-007-hosted-coop-protocol.md)
- [Save schema V2](docs/adr/ADR-P1-TECH-008-save-schema-v2.md)

## Quick start

Requirements:

- Node.js **24.x**
- npm
- Chromium dependencies for browser/E2E validation

```bash
git clone https://github.com/5erax/ProZ0.git
cd ProZ0

npm ci
npx playwright install --with-deps chromium

npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Full repository verification:

```bash
npm run ci
```

Individual checks are also available:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm run test:determinism
npm run test:browser
npm run test:e2e
```

For the reproducible browser setup path, see [Phase 0 browser runtime workflow](docs/development/phase-0-runtime.md). For current CI reproducibility findings, see [Phase 1 Build & CI Reproducibility Audit](docs/technical/phase-1-build-ci-reproducibility-audit.md).

## Repository map

```text
ProZ0/
├── .github/       GitHub automation, templates, bootstrap and repository policy
├── assets/        Game/audio/visual assets used by the current slice
├── docs/          Product, design, narrative, art, ADR, QA and team contracts
├── src/           Runtime source code
├── tests/         Unit, integration, determinism, browser and E2E tests
├── README.md      Project entry point
├── CONTRIBUTING.md
├── GOVERNANCE.md
├── SECURITY.md
└── SUPPORT.md
```

## Documentation map

### Product and gameplay

- [Game vision](docs/game-vision.md)
- [Gameplay pillars and loops](docs/gameplay-pillars-and-loops.md)
- [World and procedural generation](docs/world-and-procedural-generation.md)
- [Survival and exploration](docs/survival-and-exploration.md)
- [Building, crafting and automation](docs/building-crafting-and-automation.md)
- [Progression and professions](docs/progression-and-professions.md)
- [Multiplayer and persistence](docs/multiplayer-and-persistence.md)
- [Roadmap and technical requirements](docs/roadmap-and-technical-requirements.md)

### Phase 1 specialist sources

- [Master gameplay spec](docs/design/phase-1-vertical-slice-master-gameplay.md)
- [Narrative ruin hook](docs/narrative/phase-1-ruin-mystery-hook.md)
- [World / ruin expedition brief](docs/world-design/phase-1-ruin-expedition-spatial-brief.md)
- [Visual / UI production spec](docs/art/phase-1-asset-ui-production-spec.md)
- [Audio direction and event map](docs/audio/phase-1-audio-direction-event-map.md)
- [Phase 1 QA plan](docs/qa/phase-1-test-plan.md)

### Team operating system

- [Team Operating System](docs/team/TEAM_OPERATING_SYSTEM.md)
- [Role Registry](docs/team/ROLE_REGISTRY.md)
- [Member Registry](docs/team/MEMBER_REGISTRY.md)
- [Source of Truth](docs/team/SOURCE_OF_TRUTH.md)
- [Task Lock Protocol](docs/team/TASK_LOCK_PROTOCOL.md)
- [Cross-Company Protocol](docs/team/CROSS_COMPANY_PROTOCOL.md)
- [Definition of Done](docs/team/DEFINITION_OF_DONE.md)

## Two-company operating model

ProZ0 is one project developed by two peer delivery companies under one Project Owner.

- **13 role contracts**
- **14 member slots**
- **2 Project Manager / Producer instances: PM-A and PM-B**
- **1 shared repository**
- **1 shared backlog and dependency graph**
- **1 task-lock system**
- **1 authoritative GitHub project state**

Each active task has one owner company, one owner role/member, one Coordinating PM, and one implementation lock. Company identity does not override role authority.

The permanent cross-company baseline is maintained in [Issue #67](https://github.com/5erax/ProZ0/issues/67).

See [GOVERNANCE.md](GOVERNANCE.md) for the repository-facing summary.

## Contribution workflow

Core project work is GitHub-first:

1. Start from an approved Issue or proposal.
2. Confirm task ownership, dependencies and lock state.
3. Work on a task-specific branch.
4. Open a PR linked to the source Issue.
5. Pass CI/security checks and required specialist review.
6. Resolve conversations and hand back to the Coordinating PM.
7. Route through QA/review gates where required.

Do **not** self-activate an unclaimed implementation task.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing.

## CI, security and repository automation

Repository automation includes:

- full TypeScript/build/test CI;
- dependency review for pull requests;
- CodeQL analysis;
- Dependabot update configuration;
- manual GitHub Pages deployment workflow;
- Issue and PR templates;
- CODEOWNERS for governance/automation paths.

Repository-level administrative settings that cannot be represented as files are documented in [.github/REPOSITORY_ADMIN_BASELINE.md](.github/REPOSITORY_ADMIN_BASELINE.md).

Security issues should follow [SECURITY.md](SECURITY.md), not public bug-report details.

## Deployment

`npm run build` produces the static browser build in `dist/`.

A manual GitHub Pages workflow is prepared at `.github/workflows/pages.yml`. Pages must first be enabled for this repository with **GitHub Actions** as the source. The workflow intentionally deploys manually so the production/review build remains an explicit release action rather than every push to `main`.

## Community and support

- Bugs and reproducible defects: use the Bug Report Issue form.
- Design/product ideas: use the Proposal / Discovery Issue form.
- Project work: use the ProZ0 Task template and task-lock protocol.
- Setup/support questions: see [SUPPORT.md](SUPPORT.md).
- Conduct expectations: see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

GitHub Discussions is intended for Q&A, ideas and non-task community conversation once enabled at repository level.

## Licensing

No open-source license is currently declared by this repository. Do not assume permission to reuse or redistribute project code/assets beyond rights explicitly granted by the project owners or applicable agreements.
