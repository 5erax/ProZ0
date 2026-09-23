# P1-QA-001 — Phase 1 Executable QA Test Plan

**Task:** P1-QA-001 / Issue #46  
**Role:** QA / Playtest Lead  
**Member:** A-QA-01  
**Home company:** COMPANY_A  
**Coordinating PM:** PM-A / A-PM-01  
**Source snapshot:** `main@e40b5828385dc854e90c3a0cd9a32c102cb68bb3`  
**Artifact status:** IN PROGRESS — source traceability construction  
**Artifact path:** `docs/qa/phase-1-test-plan.md`

## 1. Purpose and authority boundary

This document translates the approved Phase 1 gameplay, art/UI and technical contracts into executable QA coverage for the vertical slice.

It does **not** create gameplay, balance, art, architecture, network, persistence or performance requirements. QA tracking IDs below are traceability labels only. Expected behavior always comes from the cited approved source.

P1-QA-002 will execute this plan only after its separate Producer activation and exact integrated/deployed candidate prerequisites are satisfied.

## 2. Approved source set

Gameplay:
- P1-DES-001 / #29 — `docs/design/phase-1-vertical-slice-master-gameplay.md`
- P1-DES-002 / #32 — `docs/design/phase-1-inventory-gathering-crafting-repair.md`
- P1-DES-003 / #33 — `docs/design/phase-1-survival-combat-death-recovery.md`
- P1-DES-004 / #34 — `docs/design/phase-1-habitat-building-power-machine.md`
- P1-DES-005 / #35 — `docs/design/phase-1-exploration-fog-weather-ruin.md`
- P1-DES-006 / #36 — `docs/design/phase-1-early-progression-profession.md`

Art/UI:
- P1-ART-001 / #30 — `docs/art/phase-1-visual-ui-readability-foundation.md`
- P1-ART-002 / #37 — `docs/art/phase-1-asset-ui-production-spec.md`

Technical:
- P1-TECH-001 / #31 — `docs/technical/phase-1-vertical-slice-architecture-plan.md`
- P1-TECH-002..009 / #38..#45 — specialized ADRs appended below.

All listed source tasks were Producer-accepted DESIGN READY / TECH READY before #46 activation.

## 3. Evidence classes

| Evidence class | Use |
|---|---|
| UNIT | Pure validation, numeric/state transition, schema and helper contracts. |
| INTEGRATION | Cross-owner authoritative transaction/state behavior. |
| DETERMINISM | Same seed/version/ordered command tape/ticks => canonical equivalent result; golden fixtures where compatibility-sensitive. |
| BROWSER | Real Chromium production-build behavior, IndexedDB, input/presentation/UI. |
| HOSTED-2 | Real-browser two-client PR smoke for hosted/network changes. |
| HOSTED-4 | Exact integrated-main four-client hosted acceptance. |
| VISUAL | Retained screenshot/sequence/manifest tied to exact tested head. |
| PERF | Retained raw samples + percentile method + thresholds + fixture/environment identity. |
| MANUAL/PLAYTEST | Human-observable usability/readability/session-flow evidence with exact candidate identity. |
| REVIEW | Static architecture/scope/authority/source conformance where runtime execution is not the applicable proof. |

Automated success alone does not substitute for required visual/playtest evidence; subjective playtest observations must be labeled separately from specification failures.

## 4. Exact-candidate evidence identity

For milestone acceptance, use exact integrated-main push evidence only when the source contract requires exact-main evidence:

- `testedHead === workflowCommit === candidate main SHA`;
- candidate SHA is the exact reviewed main;
- no newer main commit silently replaces the candidate during handoff;
- evidence manifest identifies environment, fixture IDs, measurements and thresholds;
- required artifacts are downloadable at handoff;
- production `dist/` plus SHA-256 digest evidence is retained where P1-TECH-009 requires it;
- PR merge-ref/source-head evidence is useful for pre-merge gates but cannot replace final exact-main acceptance evidence.

A fresh main commit invalidates exact-main acceptance identity and requires a fresh integrated gate run.

## 5. Baseline execution environments

### 5.1 CI / clean checkout
- approved Node/npm/runner environment recorded in evidence;
- lockfile install;
- typecheck;
- lint + architecture boundaries;
- unit;
- integration;
- determinism;
- production build;
- real Chromium browser tests;
- Playwright E2E;
- specialized Phase 1 performance/persistence/multi-client/evidence gates when applicable.

### 5.2 Real browser
- production browser build;
- Chromium baseline for automated acceptance;
- viewport/DPR recorded for visual evidence;
- 1×/2×/3× crispness cases where required;
- no local reused-server run may substitute for acceptance evidence when source contracts require CI parity.

### 5.3 Hosted co-op
- hosted/network PR: two-client real-browser smoke;
- exact integrated-main milestone candidate: four-client real-browser hosted E2E;
- production 10-player certification is out of Phase 1 scope, while the architecture must not impose a hard four-player schema ceiling.

### 5.4 Playtest baseline
- one fresh-world solo path;
- one reopen/continuation path;
- one hosted 2–4 player path;
- 30–60 minute target is evaluated as the approved tuning target, not as an automatic failure for every individual playtester outside the range.

## 6. Player-facing executable scenarios

### P1QA-FLOW-001 — Fresh solo vertical slice
Execute:
landing -> nearby gather -> carry/capacity decision -> return/store -> craft/repair -> foothold/storage/workbench/habitat -> power + first machine -> prepare expedition -> fog reveal -> day/night/Cold Rain risk -> hostile encounter/retreat or resolution -> locate/inspect ruin -> return or die -> respawn/drop recovery -> continue same world.

Evidence:
- exact build/head;
- elapsed active play time;
- key milestone timestamps;
- screenshots/trace at landing, foothold, expedition, ruin, death/recovery and continuation;
- no debug console/source knowledge needed for critical path.

### P1QA-FLOW-002 — Sandbox ordering
Attempt valid actions outside expected onboarding order while prerequisites are actually met. Confirm no invisible campaign lock and no permanent soft-lock from dismissed guidance.

### P1QA-FLOW-003 — Failure/recovery path
Force ordinary expedition death; verify one death transition, one Death Cache, approved XP/durability consequence, base respawn, recovery marker, viable re-preparation and same-world/base/discovery continuity.

### P1QA-FLOW-004 — Reopen continuity
Save/reopen after meaningful Phase 1 progress; verify canonical player/world/fog/ruin/structure/container/machine/death/progression state according to source contracts with no reroll/duplication/offline machine production.

### P1QA-FLOW-005 — Hosted co-op slice
With 2–4 players, divide useful work, share fog/discovery/build/container/machine state, exercise contention, assist Death Cache recovery, disconnect/rejoin and verify same canonical core rules as solo.

## 7. Critical risk matrix

These are explicit test obligations because failure risks duplication, data loss, authority corruption or desync.

| Risk | Mandatory evidence |
|---|---|
| Item duplication | same world drop/container quantity race; duplicate OperationId; stale revision; reconnect retry; exact item-total invariant |
| Partial craft/gather/repair | injected output/capacity/validation failure leaves inputs/resource/tool/patch unchanged |
| Death duplication | simultaneous lethal events -> one DeathId; inventory exists in player or Death Cache, never both; reconnect cannot recreate cache |
| Recovery contention | owner/teammate same-quantity race -> one commit; stale revision rejects |
| Building duplication | competing placement -> one structure; losing Kit preserved; duplicate operation idempotent |
| Machine duplication | 5,400th running tick exact output; duplicate cycle processing no duplicate; concurrent collection preserves total |
| Save data loss | multi-record failure preserves prior revision; stale write writes nothing; invalid import cannot overwrite valid world |
| Migration corruption | V1 source unchanged on failed V2 migration; canonical Cold Rain must validate before V2 publication |
| World mutation loss | persisted delta corruption fails materialization rather than clean regeneration over canonical mutations |
| Fog/desync | reveal union idempotent; rejoin gets current shared state; stale aggregate cannot overwrite newer state |
| Network replay | duplicate/stale/out-of-order commands handled explicitly; same OperationId/different payload rejects |
| Removed entity resurrection | tombstone prevents stale replication from recreating removed canonical entity |
| Slow-client authority stall | backpressure/resync policy must not stall authority for other clients |

## 8. Source acceptance traceability — Gameplay, Art/UI, Architecture

Every row below maps one approved source acceptance statement to a QA tracking ID. The source remains authoritative for exact expected behavior.

**Mapped in this section: 245 source statements.**

### P1-DES-001 — Issue #29

Source: `docs/design/phase-1-vertical-slice-master-gameplay.md`  
Mapped statements: **48**  
Default evidence layer: **Integrated E2E + manual/playtest**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-MASTER-001` | `P1QA-DES001-001` | Integrated E2E + manual/playtest | Coherent first-session arc |
| `AC-MASTER-002` | `P1QA-DES001-002` | Integrated E2E + manual/playtest | 30–60 minute tuning target |
| `AC-MASTER-003` | `P1QA-DES001-003` | Integrated E2E + manual/playtest | Sandbox ordering |
| `AC-MASTER-004` | `P1QA-DES001-004` | Integrated E2E + manual/playtest | Same-world continuation |
| `AC-MASTER-005` | `P1QA-DES001-005` | Integrated E2E + manual/playtest | Immediate orientation |
| `AC-MASTER-006` | `P1QA-DES001-006` | Integrated E2E + manual/playtest | No immediate unavoidable survival death |
| `AC-MASTER-007` | `P1QA-DES001-007` | Integrated E2E + manual/playtest | Optional contextual guidance |
| `AC-MASTER-008` | `P1QA-DES001-008` | Integrated E2E + manual/playtest | Readable focused action |
| `AC-MASTER-009` | `P1QA-DES001-009` | Integrated E2E + manual/playtest | No accidental combat substitution |
| `AC-MASTER-010` | `P1QA-DES001-010` | Integrated E2E + manual/playtest | Invalid action reason |
| `AC-MASTER-011` | `P1QA-DES001-011` | Integrated E2E + manual/playtest | Local gather/return |
| `AC-MASTER-012` | `P1QA-DES001-012` | Integrated E2E + manual/playtest | Capacity matters |
| `AC-MASTER-013` | `P1QA-DES001-013` | Integrated E2E + manual/playtest | Survival signals have purpose |
| `AC-MASTER-014` | `P1QA-DES001-014` | Integrated E2E + manual/playtest | Preparation changes capability |
| `AC-MASTER-015` | `P1QA-DES001-015` | Integrated E2E + manual/playtest | Distance creates natural risk |
| `AC-MASTER-016` | `P1QA-DES001-016` | Integrated E2E + manual/playtest | Retreat is valid |
| `AC-MASTER-017` | `P1QA-DES001-017` | Integrated E2E + manual/playtest | Visible foothold growth |
| `AC-MASTER-018` | `P1QA-DES001-018` | Integrated E2E + manual/playtest | Required base functions |
| `AC-MASTER-019` | `P1QA-DES001-019` | Integrated E2E + manual/playtest | First machine is useful |
| `AC-MASTER-020` | `P1QA-DES001-020` | Integrated E2E + manual/playtest | Fog makes exploration meaningful |
| `AC-MASTER-021` | `P1QA-DES001-021` | Integrated E2E + manual/playtest | Environmental condition affects decisions |
| `AC-MASTER-022` | `P1QA-DES001-022` | Integrated E2E + manual/playtest | Hostile encounter supports exploration |
| `AC-MASTER-023` | `P1QA-DES001-023` | Integrated E2E + manual/playtest | Retreat/disengage path |
| `AC-MASTER-024` | `P1QA-DES001-024` | Integrated E2E + manual/playtest | Prior-civilization readability |
| `AC-MASTER-025` | `P1QA-DES001-025` | Integrated E2E + manual/playtest | Persistent discovery |
| `AC-MASTER-026` | `P1QA-DES001-026` | Integrated E2E + manual/playtest | Continuing mystery |
| `AC-MASTER-027` | `P1QA-DES001-027` | Integrated E2E + manual/playtest | Failure is recoverable |
| `AC-MASTER-028` | `P1QA-DES001-028` | Integrated E2E + manual/playtest | Death consequence |
| `AC-MASTER-029` | `P1QA-DES001-029` | Integrated E2E + manual/playtest | Recovery information |
| `AC-MASTER-030` | `P1QA-DES001-030` | Integrated E2E + manual/playtest | Recovery avoids hard dead-end |
| `AC-MASTER-031` | `P1QA-DES001-031` | Integrated E2E + manual/playtest | Repeated death does not silently erase world progress |
| `AC-MASTER-032` | `P1QA-DES001-032` | Integrated E2E + manual/playtest | Varied activity progression |
| `AC-MASTER-033` | `P1QA-DES001-033` | Integrated E2E + manual/playtest | Early specialization visible |
| `AC-MASTER-034` | `P1QA-DES001-034` | Integrated E2E + manual/playtest | Same core rules |
| `AC-MASTER-035` | `P1QA-DES001-035` | Integrated E2E + manual/playtest | Solo critical path |
| `AC-MASTER-036` | `P1QA-DES001-036` | Integrated E2E + manual/playtest | 2–4 player cooperation |
| `AC-MASTER-037` | `P1QA-DES001-037` | Integrated E2E + manual/playtest | Shared discovery |
| `AC-MASTER-038` | `P1QA-DES001-038` | Integrated E2E + manual/playtest | Recovery assistance |
| `AC-MASTER-039` | `P1QA-DES001-039` | Integrated E2E + manual/playtest | Shared mutations readable |
| `AC-MASTER-040` | `P1QA-DES001-040` | Integrated E2E + manual/playtest | Session failure feedback |
| `AC-MASTER-041` | `P1QA-DES001-041` | Integrated E2E + manual/playtest | Survival/logistics readability |
| `AC-MASTER-042` | `P1QA-DES001-042` | Integrated E2E + manual/playtest | Interaction readability |
| `AC-MASTER-043` | `P1QA-DES001-043` | Integrated E2E + manual/playtest | Death/recovery readability |
| `AC-MASTER-044` | `P1QA-DES001-044` | Integrated E2E + manual/playtest | Base capability readability |
| `AC-MASTER-045` | `P1QA-DES001-045` | Integrated E2E + manual/playtest | Reopen continuity |
| `AC-MASTER-046` | `P1QA-DES001-046` | Integrated E2E + manual/playtest | Drop/discovery consistency after reopen |
| `AC-MASTER-047` | `P1QA-DES001-047` | Integrated E2E + manual/playtest | No debug knowledge required |
| `AC-MASTER-048` | `P1QA-DES001-048` | Integrated E2E + manual/playtest | Product-visible progression |

### P1-DES-002 — Issue #32

Source: `docs/design/phase-1-inventory-gathering-crafting-repair.md`  
Mapped statements: **29**  
Default evidence layer: **Unit + integration + hosted contention + browser UI where player-facing**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-INV-001` | `P1QA-DES002-001` | Unit + integration + hosted contention + browser UI where player-facing | Item identity |
| `AC-INV-002` | `P1QA-DES002-002` | Unit + integration + hosted contention + browser UI where player-facing | Capacity visibility |
| `AC-INV-003` | `P1QA-DES002-003` | Unit + integration + hosted contention + browser UI where player-facing | Volume hard limit |
| `AC-INV-004` | `P1QA-DES002-004` | Unit + integration + hosted contention + browser UI where player-facing | Weight consequence |
| `AC-INV-005` | `P1QA-DES002-005` | Unit + integration + hosted contention + browser UI where player-facing | No threshold item loss |
| `AC-INV-006` | `P1QA-DES002-006` | Unit + integration + hosted contention + browser UI where player-facing | Pickup |
| `AC-INV-007` | `P1QA-DES002-007` | Unit + integration + hosted contention + browser UI where player-facing | Drop |
| `AC-INV-008` | `P1QA-DES002-008` | Unit + integration + hosted contention + browser UI where player-facing | Transfer |
| `AC-INV-009` | `P1QA-DES002-009` | Unit + integration + hosted contention + browser UI where player-facing | Split/merge |
| `AC-INV-010` | `P1QA-DES002-010` | Unit + integration + hosted contention + browser UI where player-facing | Co-op contention |
| `AC-INV-011` | `P1QA-DES002-011` | Unit + integration + hosted contention + browser UI where player-facing | Shared storage |
| `AC-GATH-001` | `P1QA-DES002-012` | Unit + integration + hosted contention + browser UI where player-facing | Tool requirements |
| `AC-GATH-002` | `P1QA-DES002-013` | Unit + integration + hosted contention + browser UI where player-facing | Fixed yield |
| `AC-GATH-003` | `P1QA-DES002-014` | Unit + integration + hosted contention + browser UI where player-facing | Canceled gather |
| `AC-GATH-004` | `P1QA-DES002-015` | Unit + integration + hosted contention + browser UI where player-facing | Capacity precheck |
| `AC-GATH-005` | `P1QA-DES002-016` | Unit + integration + hosted contention + browser UI where player-facing | Depletion |
| `AC-GATH-006` | `P1QA-DES002-017` | Unit + integration + hosted contention + browser UI where player-facing | Regeneration |
| `AC-GATH-007` | `P1QA-DES002-018` | Unit + integration + hosted contention + browser UI where player-facing | Tool wear |
| `AC-CRAFT-001` | `P1QA-DES002-019` | Unit + integration + hosted contention + browser UI where player-facing | Recipe completeness |
| `AC-CRAFT-002` | `P1QA-DES002-020` | Unit + integration + hosted contention + browser UI where player-facing | Tier gate |
| `AC-CRAFT-003` | `P1QA-DES002-021` | Unit + integration + hosted contention + browser UI where player-facing | Atomic player-facing result |
| `AC-CRAFT-004` | `P1QA-DES002-022` | Unit + integration + hosted contention + browser UI where player-facing | No craft overflow |
| `AC-REP-001` | `P1QA-DES002-023` | Unit + integration + hosted contention + browser UI where player-facing | Broken state |
| `AC-REP-002` | `P1QA-DES002-024` | Unit + integration + hosted contention + browser UI where player-facing | Repair |
| `AC-REP-003` | `P1QA-DES002-025` | Unit + integration + hosted contention + browser UI where player-facing | Failed repair |
| `AC-DROP-001` | `P1QA-DES002-026` | Unit + integration + hosted contention + browser UI where player-facing | Ordinary persistence |
| `AC-COOP-001` | `P1QA-DES002-027` | Unit + integration + hosted contention + browser UI where player-facing | Personal inventory boundary |
| `AC-COOP-002` | `P1QA-DES002-028` | Unit + integration + hosted contention + browser UI where player-facing | Death recovery exception |
| `AC-SCOPE-001` | `P1QA-DES002-029` | Unit + integration + hosted contention + browser UI where player-facing | No advanced logistics |

### P1-DES-003 — Issue #33

Source: `docs/design/phase-1-survival-combat-death-recovery.md`  
Mapped statements: **29**  
Default evidence layer: **Fixed-step integration + determinism + browser readability + hosted recovery**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-SURV-001` | `P1QA-DES003-001` | Fixed-step integration + determinism + browser readability + hosted recovery | Health |
| `AC-SURV-002` | `P1QA-DES003-002` | Fixed-step integration + determinism + browser readability + hosted recovery | Water |
| `AC-SURV-003` | `P1QA-DES003-003` | Fixed-step integration + determinism + browser readability + hosted recovery | Food |
| `AC-SURV-004` | `P1QA-DES003-004` | Fixed-step integration + determinism + browser readability + hosted recovery | Stamina |
| `AC-SURV-005` | `P1QA-DES003-005` | Fixed-step integration + determinism + browser readability + hosted recovery | Carry interaction |
| `AC-TEMP-001` | `P1QA-DES003-006` | Fixed-step integration + determinism + browser readability + hosted recovery | Environment response |
| `AC-TEMP-002` | `P1QA-DES003-007` | Fixed-step integration + determinism + browser readability + hosted recovery | Thermal Wrap |
| `AC-TEMP-003` | `P1QA-DES003-008` | Fixed-step integration + determinism + browser readability + hosted recovery | Temperature warning before lethal |
| `AC-CONS-001` | `P1QA-DES003-009` | Fixed-step integration + determinism + browser readability + hosted recovery | Consume channel |
| `AC-PREP-001` | `P1QA-DES003-010` | Fixed-step integration + determinism + browser readability + hosted recovery | Observable preparation |
| `AC-COMB-001` | `P1QA-DES003-011` | Fixed-step integration + determinism + browser readability + hosted recovery | Combat vocabulary |
| `AC-COMB-002` | `P1QA-DES003-012` | Fixed-step integration + determinism + browser readability + hosted recovery | Spear attack |
| `AC-COMB-003` | `P1QA-DES003-013` | Fixed-step integration + determinism + browser readability + hosted recovery | Predator readability |
| `AC-COMB-004` | `P1QA-DES003-014` | Fixed-step integration + determinism + browser readability + hosted recovery | Retreat |
| `AC-COMB-005` | `P1QA-DES003-015` | Fixed-step integration + determinism + browser readability + hosted recovery | Predator resolution |
| `AC-DMG-001` | `P1QA-DES003-016` | Fixed-step integration + determinism + browser readability + hosted recovery | Damage sources |
| `AC-DEATH-001` | `P1QA-DES003-017` | Fixed-step integration + determinism + browser readability + hosted recovery | Single death transition |
| `AC-DEATH-002` | `P1QA-DES003-018` | Fixed-step integration + determinism + browser readability + hosted recovery | Inventory drop |
| `AC-DEATH-003` | `P1QA-DES003-019` | Fixed-step integration + determinism + browser readability + hosted recovery | Durability loss |
| `AC-DEATH-004` | `P1QA-DES003-020` | Fixed-step integration + determinism + browser readability + hosted recovery | XP loss |
| `AC-DEATH-005` | `P1QA-DES003-021` | Fixed-step integration + determinism + browser readability + hosted recovery | Respawn |
| `AC-REC-001` | `P1QA-DES003-022` | Fixed-step integration + determinism + browser readability + hosted recovery | Cache persistence |
| `AC-REC-002` | `P1QA-DES003-023` | Fixed-step integration + determinism + browser readability + hosted recovery | Multiple caches |
| `AC-REC-003` | `P1QA-DES003-024` | Fixed-step integration + determinism + browser readability + hosted recovery | Co-op recovery |
| `AC-REC-004` | `P1QA-DES003-025` | Fixed-step integration + determinism + browser readability + hosted recovery | No world rollback |
| `AC-REC-005` | `P1QA-DES003-026` | Fixed-step integration + determinism + browser readability + hosted recovery | Recovery viability |
| `AC-NIGHT-001` | `P1QA-DES003-027` | Fixed-step integration + determinism + browser readability + hosted recovery | Condition coupling |
| `AC-HUD-001` | `P1QA-DES003-028` | Fixed-step integration + determinism + browser readability + hosted recovery | Cause readability |
| `AC-SCOPE-001` | `P1QA-DES003-029` | Fixed-step integration + determinism + browser readability + hosted recovery | Minimal combat |

### P1-DES-004 — Issue #34

Source: `docs/design/phase-1-habitat-building-power-machine.md`  
Mapped statements: **25**  
Default evidence layer: **Integration + deterministic tick + concurrency + persistence + browser build-mode**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-BUILD-001` | `P1QA-DES004-001` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Finite set |
| `AC-BUILD-002` | `P1QA-DES004-002` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Kit consumption |
| `AC-BUILD-003` | `P1QA-DES004-003` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Invalid placement safety |
| `AC-BUILD-004` | `P1QA-DES004-004` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Continuous placement |
| `AC-BUILD-005` | `P1QA-DES004-005` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Explored requirement |
| `AC-BUILD-006` | `P1QA-DES004-006` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Collision/clearance |
| `AC-BUILD-007` | `P1QA-DES004-007` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Build zone |
| `AC-HAB-001` | `P1QA-DES004-008` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Connector |
| `AC-HAB-002` | `P1QA-DES004-009` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Shelter |
| `AC-HAB-003` | `P1QA-DES004-010` | Integration + deterministic tick + concurrency + persistence + browser build-mode | No hidden healing |
| `AC-STOR-001` | `P1QA-DES004-011` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Shared storage |
| `AC-WB-001` | `P1QA-DES004-012` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Workbench gate |
| `AC-PWR-001` | `P1QA-DES004-013` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Capacity |
| `AC-PWR-002` | `P1QA-DES004-014` | Integration + deterministic tick + concurrency + persistence + browser build-mode | No fuel system |
| `AC-MACH-001` | `P1QA-DES004-015` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Useful output |
| `AC-MACH-002` | `P1QA-DES004-016` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Output cap |
| `AC-MACH-003` | `P1QA-DES004-017` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Power state |
| `AC-MACH-004` | `P1QA-DES004-018` | Integration + deterministic tick + concurrency + persistence + browser build-mode | No offline production |
| `AC-MACH-005` | `P1QA-DES004-019` | Integration + deterministic tick + concurrency + persistence + browser build-mode | No hidden wear |
| `AC-DISM-001` | `P1QA-DES004-020` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Reversible learning |
| `AC-DISM-002` | `P1QA-DES004-021` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Protected contents |
| `AC-COOP-001` | `P1QA-DES004-022` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Shared build state |
| `AC-COOP-002` | `P1QA-DES004-023` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Concurrent placement |
| `AC-PERSIST-001` | `P1QA-DES004-024` | Integration + deterministic tick + concurrency + persistence + browser build-mode | Reopen continuity |
| `AC-SCOPE-001` | `P1QA-DES004-025` | Integration + deterministic tick + concurrency + persistence + browser build-mode | No advanced automation |

### P1-DES-005 — Issue #35

Source: `docs/design/phase-1-exploration-fog-weather-ruin.md`  
Mapped statements: **30**  
Default evidence layer: **Determinism + world integration + hosted shared state + browser/map visual**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-EXP-001` | `P1QA-DES005-001` | Determinism + world integration + hosted shared state + browser/map visual | Unexplored |
| `AC-EXP-002` | `P1QA-DES005-002` | Determinism + world integration + hosted shared state + browser/map visual | Physical reveal |
| `AC-EXP-003` | `P1QA-DES005-003` | Determinism + world integration + hosted shared state + browser/map visual | Persistent explored state |
| `AC-EXP-004` | `P1QA-DES005-004` | Determinism + world integration + hosted shared state + browser/map visual | Shared union |
| `AC-EXP-005` | `P1QA-DES005-005` | Determinism + world integration + hosted shared state + browser/map visual | Join/rejoin |
| `AC-EXP-006` | `P1QA-DES005-006` | Determinism + world integration + hosted shared state + browser/map visual | No grid-lock |
| `AC-EXP-007` | `P1QA-DES005-007` | Determinism + world integration + hosted shared state + browser/map visual | No obstacle LOS requirement |
| `AC-WORLD-001` | `P1QA-DES005-008` | Determinism + world integration + hosted shared state + browser/map visual | Local resource band |
| `AC-WORLD-002` | `P1QA-DES005-009` | Determinism + world integration + hosted shared state + browser/map visual | No landing hostile gate |
| `AC-WORLD-003` | `P1QA-DES005-010` | Determinism + world integration + hosted shared state + browser/map visual | Ruin expedition distance |
| `AC-RISK-001` | `P1QA-DES005-011` | Determinism + world integration + hosted shared state + browser/map visual | No hidden distance damage |
| `AC-RUIN-001` | `P1QA-DES005-012` | Determinism + world integration + hosted shared state + browser/map visual | Unknown |
| `AC-RUIN-002` | `P1QA-DES005-013` | Determinism + world integration + hosted shared state + browser/map visual | Located |
| `AC-RUIN-003` | `P1QA-DES005-014` | Determinism + world integration + hosted shared state + browser/map visual | Inspect |
| `AC-RUIN-004` | `P1QA-DES005-015` | Determinism + world integration + hosted shared state + browser/map visual | Shared discovery |
| `AC-RUIN-005` | `P1QA-DES005-016` | Determinism + world integration + hosted shared state + browser/map visual | One-time reward |
| `AC-RUIN-006` | `P1QA-DES005-017` | Determinism + world integration + hosted shared state + browser/map visual | Full inventory |
| `AC-RUIN-007` | `P1QA-DES005-018` | Determinism + world integration + hosted shared state + browser/map visual | Death persistence |
| `AC-RUIN-008` | `P1QA-DES005-019` | Determinism + world integration + hosted shared state + browser/map visual | Mystery readability |
| `AC-DAY-001` | `P1QA-DES005-020` | Determinism + world integration + hosted shared state + browser/map visual | Cycle |
| `AC-DAY-002` | `P1QA-DES005-021` | Determinism + world integration + hosted shared state + browser/map visual | Night decision effect |
| `AC-WEATHER-001` | `P1QA-DES005-022` | Determinism + world integration + hosted shared state + browser/map visual | Cold Rain occurrence |
| `AC-WEATHER-002` | `P1QA-DES005-023` | Determinism + world integration + hosted shared state + browser/map visual | Forecast |
| `AC-WEATHER-003` | `P1QA-DES005-024` | Determinism + world integration + hosted shared state + browser/map visual | Survival coupling |
| `AC-WEATHER-004` | `P1QA-DES005-025` | Determinism + world integration + hosted shared state + browser/map visual | Map memory |
| `AC-HOST-001` | `P1QA-DES005-026` | Determinism + world integration + hosted shared state + browser/map visual | Encounter positioning |
| `AC-HOST-002` | `P1QA-DES005-027` | Determinism + world integration + hosted shared state + browser/map visual | No mandatory kill |
| `AC-MAP-001` | `P1QA-DES005-028` | Determinism + world integration + hosted shared state + browser/map visual | Required markers |
| `AC-PERSIST-001` | `P1QA-DES005-029` | Determinism + world integration + hosted shared state + browser/map visual | Ruin claim persistence |
| `AC-SCOPE-001` | `P1QA-DES005-030` | Determinism + world integration + hosted shared state + browser/map visual | Bounded slice |

### P1-DES-006 — Issue #36

Source: `docs/design/phase-1-early-progression-profession.md`  
Mapped statements: **25**  
Default evidence layer: **Unit + integration + persistence + hosted participation + playtest pacing**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-XP-001` | `P1QA-DES006-001` | Unit + integration + persistence + hosted participation + playtest pacing | Level thresholds |
| `AC-XP-002` | `P1QA-DES006-002` | Unit + integration + persistence + hosted participation + playtest pacing | Meaningful event only |
| `AC-XP-003` | `P1QA-DES006-003` | Unit + integration + persistence + hosted participation + playtest pacing | First gather |
| `AC-XP-004` | `P1QA-DES006-004` | Unit + integration + persistence + hosted participation + playtest pacing | Unique craft |
| `AC-XP-005` | `P1QA-DES006-005` | Unit + integration + persistence + hosted participation + playtest pacing | Repair |
| `AC-XP-006` | `P1QA-DES006-006` | Unit + integration + persistence + hosted participation + playtest pacing | Building anti-loop |
| `AC-XP-007` | `P1QA-DES006-007` | Unit + integration + persistence + hosted participation + playtest pacing | Repeat caps |
| `AC-XP-008` | `P1QA-DES006-008` | Unit + integration + persistence + hosted participation + playtest pacing | No inventory grind |
| `AC-XP-009` | `P1QA-DES006-009` | Unit + integration + persistence + hosted participation + playtest pacing | No fog-step grind |
| `AC-PACE-001` | `P1QA-DES006-010` | Unit + integration + persistence + hosted participation + playtest pacing | Level 3–4 plausibility |
| `AC-SKILL-001` | `P1QA-DES006-011` | Unit + integration + persistence + hosted participation + playtest pacing | Fieldcraft Basics |
| `AC-SKILL-002` | `P1QA-DES006-012` | Unit + integration + persistence + hosted participation + playtest pacing | Maintenance Basics |
| `AC-SKILL-003` | `P1QA-DES006-013` | Unit + integration + persistence + hosted participation + playtest pacing | No hidden stat changes |
| `AC-PROF-001` | `P1QA-DES006-014` | Unit + integration + persistence + hosted participation + playtest pacing | Explorer eligibility |
| `AC-PROF-002` | `P1QA-DES006-015` | Unit + integration + persistence + hosted participation + playtest pacing | Explorer objectives |
| `AC-PROF-003` | `P1QA-DES006-016` | Unit + integration + persistence + hosted participation + playtest pacing | Engineer eligibility |
| `AC-PROF-004` | `P1QA-DES006-017` | Unit + integration + persistence + hosted participation + playtest pacing | Engineer objectives |
| `AC-PROF-005` | `P1QA-DES006-018` | Unit + integration + persistence + hosted participation + playtest pacing | No permanent lock |
| `AC-COOP-001` | `P1QA-DES006-019` | Unit + integration + persistence + hosted participation + playtest pacing | No XP splitting |
| `AC-COOP-002` | `P1QA-DES006-020` | Unit + integration + persistence + hosted participation + playtest pacing | No remote personal discovery XP |
| `AC-COOP-003` | `P1QA-DES006-021` | Unit + integration + persistence + hosted participation + playtest pacing | Catch-up ruin interaction |
| `AC-DEATH-001` | `P1QA-DES006-022` | Unit + integration + persistence + hosted participation + playtest pacing | Formula |
| `AC-DEATH-002` | `P1QA-DES006-023` | Unit + integration + persistence + hosted participation + playtest pacing | No level loss |
| `AC-BOUND-001` | `P1QA-DES006-024` | Unit + integration + persistence + hosted participation + playtest pacing | Personal/world boundary |
| `AC-SCOPE-001` | `P1QA-DES006-025` | Unit + integration + persistence + hosted participation + playtest pacing | No full progression tree |

### P1-ART-001 — Issue #30

Source: `docs/art/phase-1-visual-ui-readability-foundation.md`  
Mapped statements: **24**  
Default evidence layer: **Real Chromium visual evidence + manual readability/conformance**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `AC-P1-ART-001` | `P1QA-ART001-001` | Real Chromium visual evidence + manual readability/conformance | Category distinction |
| `AC-P1-ART-002` | `P1QA-ART001-002` | Real Chromium visual evidence + manual readability/conformance | Player priority |
| `AC-P1-ART-003` | `P1QA-ART001-003` | Real Chromium visual evidence + manual readability/conformance | Resource readability |
| `AC-P1-ART-004` | `P1QA-ART001-004` | Real Chromium visual evidence + manual readability/conformance | Hazard readability |
| `AC-P1-ART-005` | `P1QA-ART001-005` | Real Chromium visual evidence + manual readability/conformance | Human versus ruin distinction |
| `AC-P1-ART-006` | `P1QA-ART001-006` | Real Chromium visual evidence + manual readability/conformance | Base progression |
| `AC-P1-ART-007` | `P1QA-ART001-007` | Real Chromium visual evidence + manual readability/conformance | Survival HUD completeness |
| `AC-P1-ART-008` | `P1QA-ART001-008` | Real Chromium visual evidence + manual readability/conformance | Logistics HUD |
| `AC-P1-ART-009` | `P1QA-ART001-009` | Real Chromium visual evidence + manual readability/conformance | Interaction vocabulary |
| `AC-P1-ART-010` | `P1QA-ART001-010` | Real Chromium visual evidence + manual readability/conformance | Inventory/container pattern |
| `AC-P1-ART-011` | `P1QA-ART001-011` | Real Chromium visual evidence + manual readability/conformance | Craft/repair pattern |
| `AC-P1-ART-012` | `P1QA-ART001-012` | Real Chromium visual evidence + manual readability/conformance | Building pattern |
| `AC-P1-ART-013` | `P1QA-ART001-013` | Real Chromium visual evidence + manual readability/conformance | Machine/power readability |
| `AC-P1-ART-014` | `P1QA-ART001-014` | Real Chromium visual evidence + manual readability/conformance | Fog/discovery |
| `AC-P1-ART-015` | `P1QA-ART001-015` | Real Chromium visual evidence + manual readability/conformance | Co-op identity |
| `AC-P1-ART-016` | `P1QA-ART001-016` | Real Chromium visual evidence + manual readability/conformance | Damage/death/recovery |
| `AC-P1-ART-017` | `P1QA-ART001-017` | Real Chromium visual evidence + manual readability/conformance | Day/night readability |
| `AC-P1-ART-018` | `P1QA-ART001-018` | Real Chromium visual evidence + manual readability/conformance | Weather readability |
| `AC-P1-ART-019` | `P1QA-ART001-019` | Real Chromium visual evidence + manual readability/conformance | Pixel integrity |
| `AC-P1-ART-020` | `P1QA-ART001-020` | Real Chromium visual evidence + manual readability/conformance | Accessibility |
| `AC-P1-ART-021` | `P1QA-ART001-021` | Real Chromium visual evidence + manual readability/conformance | PO-facing quality |
| `AC-P1-ART-022` | `P1QA-ART001-022` | Real Chromium visual evidence + manual readability/conformance | Vertical-slice scope |
| `AC-P1-ART-023` | `P1QA-ART001-023` | Real Chromium visual evidence + manual readability/conformance | Authority separation |
| `AC-P1-ART-024` | `P1QA-ART001-024` | Real Chromium visual evidence + manual readability/conformance | Downstream readiness |

### P1-ART-002 — Issue #37

Source: `docs/art/phase-1-asset-ui-production-spec.md`  
Mapped statements: **17**  
Default evidence layer: **Real Chromium visual/E2E + retained screenshots/video/manifest**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `ART2-001` | `P1QA-ART002-001` | Real Chromium visual/E2E + retained screenshots/video/manifest | Every required Phase 1 gameplay entity has a visual/UI representation |
| `ART2-002` | `P1QA-ART002-002` | Real Chromium visual/E2E + retained screenshots/video/manifest | Production list is finite and tied to approved scope |
| `ART2-003` | `P1QA-ART002-003` | Real Chromium visual/E2E + retained screenshots/video/manifest | Player animation/state minimum set defined |
| `ART2-004` | `P1QA-ART002-004` | Real Chromium visual/E2E + retained screenshots/video/manifest | Terrain/water/resource/wildlife/hostile/ruin assets defined |
| `ART2-005` | `P1QA-ART002-005` | Real Chromium visual/E2E + retained screenshots/video/manifest | Habitat/storage/workbench/power/Condenser assets defined |
| `ART2-006` | `P1QA-ART002-006` | Real Chromium visual/E2E + retained screenshots/video/manifest | Exact 18-item icon set defined |
| `ART2-007` | `P1QA-ART002-007` | Real Chromium visual/E2E + retained screenshots/video/manifest | HUD component states defined |
| `ART2-008` | `P1QA-ART002-008` | Real Chromium visual/E2E + retained screenshots/video/manifest | Inventory/container/crafting/repair/build panel states defined |
| `ART2-009` | `P1QA-ART002-009` | Real Chromium visual/E2E + retained screenshots/video/manifest | Interaction prompts and invalid-action feedback defined |
| `ART2-010` | `P1QA-ART002-010` | Real Chromium visual/E2E + retained screenshots/video/manifest | Fog/night/Cold Rain presentation defined |
| `ART2-011` | `P1QA-ART002-011` | Real Chromium visual/E2E + retained screenshots/video/manifest | Death Cache/recovery feedback defined |
| `ART2-012` | `P1QA-ART002-012` | Real Chromium visual/E2E + retained screenshots/video/manifest | Explorer/Engineer progression feedback defined |
| `ART2-013` | `P1QA-ART002-013` | Real Chromium visual/E2E + retained screenshots/video/manifest | Co-op identity/shared discovery defined |
| `ART2-014` | `P1QA-ART002-014` | Real Chromium visual/E2E + retained screenshots/video/manifest | Responsive desktop layout/scale behavior defined |
| `ART2-015` | `P1QA-ART002-015` | Real Chromium visual/E2E + retained screenshots/video/manifest | Placeholder acceptance policy defined |
| `ART2-016` | `P1QA-ART002-016` | Real Chromium visual/E2E + retained screenshots/video/manifest | 2×/3× crispness/readability gates carried forward |
| `ART2-017` | `P1QA-ART002-017` | Real Chromium visual/E2E + retained screenshots/video/manifest | Artifact enables visual implementation without inventing gameplay rules |

### P1-TECH-001 — Issue #31

Source: `docs/technical/phase-1-vertical-slice-architecture-plan.md`  
Mapped statements: **18**  
Default evidence layer: **Architecture/static boundary + integration/review**

| Source criterion | QA tracking ID | Evidence layer | Source summary |
|---|---|---|---|
| `TECH1-001` | `P1QA-TECH001-001` | Architecture/static boundary + integration/review | Every Phase 1 authoritative state category has exactly one owner |
| `TECH1-002` | `P1QA-TECH001-002` | Architecture/static boundary + integration/review | Presentation cannot become canonical authority |
| `TECH1-003` | `P1QA-TECH001-003` | Architecture/static boundary + integration/review | Persistence remains non-authoritative |
| `TECH1-004` | `P1QA-TECH001-004` | Architecture/static boundary + integration/review | Future server-host path remains viable |
| `TECH1-005` | `P1QA-TECH001-005` | Architecture/static boundary + integration/review | Deterministic/non-deterministic boundaries explicit |
| `TECH1-006` | `P1QA-TECH001-006` | Architecture/static boundary + integration/review | Data-driven content contracts identified |
| `TECH1-007` | `P1QA-TECH001-007` | Architecture/static boundary + integration/review | Stable identity/revision/idempotency rules identified at architecture level |
| `TECH1-008` | `P1QA-TECH001-008` | Architecture/static boundary + integration/review | Cross-owner transaction rule explicit |
| `TECH1-009` | `P1QA-TECH001-009` | Architecture/static boundary + integration/review | Persistence-extension seam explicit |
| `TECH1-010` | `P1QA-TECH001-010` | Architecture/static boundary + integration/review | Hosted-co-op seam explicit without production infrastructure |
| `TECH1-011` | `P1QA-TECH001-011` | Architecture/static boundary + integration/review | Command/event/query separation explicit |
| `TECH1-012` | `P1QA-TECH001-012` | Architecture/static boundary + integration/review | Integration order/dependency graph defined |
| `TECH1-013` | `P1QA-TECH001-013` | Architecture/static boundary + integration/review | Browser performance risk areas identified |
| `TECH1-014` | `P1QA-TECH001-014` | Architecture/static boundary + integration/review | Save/desync/chunk/tick/latency observability requirements identified |
| `TECH1-015` | `P1QA-TECH001-015` | Architecture/static boundary + integration/review | Specialized ADRs and dependencies enumerated |
| `TECH1-016` | `P1QA-TECH001-016` | Architecture/static boundary + integration/review | Phase 0 architecture preserved |
| `TECH1-017` | `P1QA-TECH001-017` | Architecture/static boundary + integration/review | Gameplay values/rules not invented |
| `TECH1-018` | `P1QA-TECH001-018` | Architecture/static boundary + integration/review | No implementation authorized by this artifact |



## 9. Source acceptance traceability — Specialized Technical ADRs

Every technical acceptance/self-check statement below is mapped. Statements such as “implementation authorization: NO” and “blocking open question: NONE” are treated as **REVIEW/scope checks**, not runtime behavior.

**Mapped in this section: 129 source statements.**

### P1-TECH-002 — Issue #38

Source: `docs/adr/ADR-P1-TECH-002-content-schema-registry.md`  
Mapped statements: **17**  
Default evidence layer: **Unit/schema + determinism/golden + compatibility**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Content definitions read-only/data-driven and separate from runtime state | `P1QA-TECH002-001` | Unit/schema + determinism/golden + compatibility |
| Stable IDs defined | `P1QA-TECH002-002` | Unit/schema + determinism/golden + compatibility |
| Pack/schema version identity defined | `P1QA-TECH002-003` | Unit/schema + determinism/golden + compatibility |
| Canonical fingerprint defined | `P1QA-TECH002-004` | Unit/schema + determinism/golden + compatibility |
| Validation/failure behavior defined | `P1QA-TECH002-005` | Unit/schema + determinism/golden + compatibility |
| Cross-reference integrity enforceable | `P1QA-TECH002-006` | Unit/schema + determinism/golden + compatibility |
| Deterministic/load-order-independent registry behavior defined | `P1QA-TECH002-007` | Unit/schema + determinism/golden + compatibility |
| Renderer-specific data excluded from domain authority | `P1QA-TECH002-008` | Unit/schema + determinism/golden + compatibility |
| Exact Phase 1 item/recipe/resource/structure/machine/hazard/weather/hostile/ruin/progression contracts identified | `P1QA-TECH002-009` | Unit/schema + determinism/golden + compatibility |
| Atmospheric Water Condenser approved values preserved | `P1QA-TECH002-010` | Unit/schema + determinism/golden + compatibility |
| Explorer/Engineer prototype content preserved with no class lock | `P1QA-TECH002-011` | Unit/schema + determinism/golden + compatibility |
| Schema bounded to Phase 1 | `P1QA-TECH002-012` | Unit/schema + determinism/golden + compatibility |
| Save/network compatibility seams identified | `P1QA-TECH002-013` | Unit/schema + determinism/golden + compatibility |
| Specialized ADR responsibilities not collapsed into content layer | `P1QA-TECH002-014` | Unit/schema + determinism/golden + compatibility |
| No gameplay values invented/rebalanced | `P1QA-TECH002-015` | Unit/schema + determinism/golden + compatibility |
| No implementation authorized | `P1QA-TECH002-016` | Unit/schema + determinism/golden + compatibility |
| Blocking open question | `P1QA-TECH002-017` | Unit/schema + determinism/golden + compatibility |

### P1-TECH-003 — Issue #39

Source: `docs/adr/ADR-P1-TECH-003-item-container-transaction-authority.md`  
Mapped statements: **14**  
Default evidence layer: **Integration + concurrency + determinism + persistence/network seam**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| No client can authoritatively create/duplicate items | `P1QA-TECH003-001` | Integration + concurrency + determinism + persistence/network seam |
| Canonical item/stack/container identity defined | `P1QA-TECH003-002` | Integration + concurrency + determinism + persistence/network seam |
| Atomic pickup/drop/transfer/split/merge defined | `P1QA-TECH003-003` | Integration + concurrency + determinism + persistence/network seam |
| Gather cross-owner transaction defined | `P1QA-TECH003-004` | Integration + concurrency + determinism + persistence/network seam |
| Craft/repair transaction defined | `P1QA-TECH003-005` | Integration + concurrency + determinism + persistence/network seam |
| Condition mutation defined | `P1QA-TECH003-006` | Integration + concurrency + determinism + persistence/network seam |
| Revisions/idempotency/stale conflict behavior explicit | `P1QA-TECH003-007` | Integration + concurrency + determinism + persistence/network seam |
| Persistence seam explicit/non-authoritative | `P1QA-TECH003-008` | Integration + concurrency + determinism + persistence/network seam |
| Replication seam explicit | `P1QA-TECH003-009` | Integration + concurrency + determinism + persistence/network seam |
| Anti-duplication invariants explicit | `P1QA-TECH003-010` | Integration + concurrency + determinism + persistence/network seam |
| Deterministic selection/order explicit | `P1QA-TECH003-011` | Integration + concurrency + determinism + persistence/network seam |
| Gameplay values preserved from approved Design/Content ADR | `P1QA-TECH003-012` | Integration + concurrency + determinism + persistence/network seam |
| Implementation authorization | `P1QA-TECH003-013` | Integration + concurrency + determinism + persistence/network seam |
| Blocking open question | `P1QA-TECH003-014` | Integration + concurrency + determinism + persistence/network seam |

### P1-TECH-004 — Issue #40

Source: `docs/adr/ADR-P1-TECH-004-world-content-fog-delta.md`  
Mapped statements: **13**  
Default evidence layer: **Determinism/golden + world lifecycle + hosted fog + persistence**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Generated base vs mutable delta ownership explicit | `P1QA-TECH004-001` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Fog/discovery canonical identity/persistence/replication explicit | `P1QA-TECH004-002` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Deterministic/order-independent placement explicit | `P1QA-TECH004-003` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Corrupt delta cannot silently regenerate over mutations | `P1QA-TECH004-004` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Chunk streaming remains world-owned | `P1QA-TECH004-005` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Resource depletion/regeneration authority explicit | `P1QA-TECH004-006` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Ruin/one-time reward authority explicit | `P1QA-TECH004-007` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Day/night/weather active-time authority explicit | `P1QA-TECH004-008` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Revision/dirty/save semantics preserve Phase 0 contract | `P1QA-TECH004-009` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Client/presentation cannot mutate canonical world knowledge | `P1QA-TECH004-010` | Determinism/golden + world lifecycle + hosted fog + persistence |
| No gameplay values redefined | `P1QA-TECH004-011` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Implementation authorized | `P1QA-TECH004-012` | Determinism/golden + world lifecycle + hosted fog + persistence |
| Blocking open question | `P1QA-TECH004-013` | Determinism/golden + world lifecycle + hosted fog + persistence |

### P1-TECH-005 — Issue #41

Source: `docs/adr/ADR-P1-TECH-005-survival-combat-death-authority.md`  
Mapped statements: **15**  
Default evidence layer: **Fixed-step integration + idempotency/concurrency + persistence/reconnect**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Client cannot authoritatively decide damage/death/drop/recovery | `P1QA-TECH005-001` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Health/Food/Water/Stamina/Temperature owner explicit | `P1QA-TECH005-002` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Fixed-step/rate determinism explicit | `P1QA-TECH005-003` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Damage/event contract explicit | `P1QA-TECH005-004` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Death transition idempotent | `P1QA-TECH005-005` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Death Cache item duplication prevented | `P1QA-TECH005-006` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Respawn transition explicit | `P1QA-TECH005-007` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| XP/durability loss transaction explicit | `P1QA-TECH005-008` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Recovery/co-op contention explicit | `P1QA-TECH005-009` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Persistence/reconnect seams explicit | `P1QA-TECH005-010` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Revision/idempotency identities explicit | `P1QA-TECH005-011` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Replay/golden requirements explicit | `P1QA-TECH005-012` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Approved gameplay values preserved | `P1QA-TECH005-013` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Implementation authorization | `P1QA-TECH005-014` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |
| Blocking open question | `P1QA-TECH005-015` | Fixed-step integration + idempotency/concurrency + persistence/reconnect |

### P1-TECH-006 — Issue #42

Source: `docs/adr/ADR-P1-TECH-006-building-power-machine-authority.md`  
Mapped statements: **19**  
Default evidence layer: **Integration + deterministic tick + concurrency + persistence/rejoin**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Stable structure/machine identities | `P1QA-TECH006-001` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Host-authoritative deterministic placement | `P1QA-TECH006-002` | Integration + deterministic tick + concurrency + persistence/rejoin |
| World/collision validation explicit | `P1QA-TECH006-003` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Kit consumption + placement atomic | `P1QA-TECH006-004` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Co-op competing placement behavior explicit | `P1QA-TECH006-005` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Habitat connector/connectivity bounded | `P1QA-TECH006-006` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Shelter thermal target 50 / no free healing preserved | `P1QA-TECH006-007` | Integration + deterministic tick + concurrency + persistence/rejoin |
| 10 PU Power Unit contract preserved | `P1QA-TECH006-008` | Integration + deterministic tick + concurrency + persistence/rejoin |
| 5 PU Condenser contract preserved | `P1QA-TECH006-009` | Integration + deterministic tick + concurrency + persistence/rejoin |
| 1 Clean Water / 90 active powered seconds preserved | `P1QA-TECH006-010` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Buffer 4 / no offline production / no hidden wear preserved | `P1QA-TECH006-011` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Machine output item authority uses #39 seam | `P1QA-TECH006-012` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Power/machine persistence/rejoin contract explicit | `P1QA-TECH006-013` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Dismantle exact one-Kit recovery atomic | `P1QA-TECH006-014` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Structure/machine state revisions explicit | `P1QA-TECH006-015` | Integration + deterministic tick + concurrency + persistence/rejoin |
| No client-authoritative structure/power/output state | `P1QA-TECH006-016` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Phase 1 scope bounded | `P1QA-TECH006-017` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Implementation authorization | `P1QA-TECH006-018` | Integration + deterministic tick + concurrency + persistence/rejoin |
| Blocking open question | `P1QA-TECH006-019` | Integration + deterministic tick + concurrency + persistence/rejoin |

### P1-TECH-007 — Issue #43

Source: `docs/adr/ADR-P1-TECH-007-hosted-coop-protocol.md`  
Mapped statements: **22**  
Default evidence layer: **Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Critical game state remains host/server authoritative | `P1QA-TECH007-001` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Solo and hosted use same domain runtime/rules | `P1QA-TECH007-002` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Host/session lifecycle explicit | `P1QA-TECH007-003` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Join/leave/rejoin explicit | `P1QA-TECH007-004` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Durable PlayerId vs ephemeral ConnectionId explicit | `P1QA-TECH007-005` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Compatibility/version handshake explicit | `P1QA-TECH007-006` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Content canonical fingerprint used | `P1QA-TECH007-007` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Continuous movement input authority explicit | `P1QA-TECH007-008` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Snapshot/event/revision model explicit | `P1QA-TECH007-009` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Duplicate/out-of-order/stale behavior explicit | `P1QA-TECH007-010` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Item/container/world/fog/building/machine/death revisions consumed | `P1QA-TECH007-011` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Shared discovery replication explicit | `P1QA-TECH007-012` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Concurrent shared mutation behavior explicit | `P1QA-TECH007-013` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Disconnect during item/build/death/save defined | `P1QA-TECH007-014` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Live commit vs durable save distinction explicit | `P1QA-TECH007-015` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Session-end failure feedback explicit | `P1QA-TECH007-016` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Transport separated from authority logic | `P1QA-TECH007-017` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| 2–4 operational path implementable | `P1QA-TECH007-018` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| No structural four-player ceiling / future 10 path preserved | `P1QA-TECH007-019` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Production matchmaking/fleet/host migration excluded | `P1QA-TECH007-020` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Implementation authorization | `P1QA-TECH007-021` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |
| Blocking open question | `P1QA-TECH007-022` | Hosted-2/Hosted-4 + protocol + contention + disconnect/rejoin + desync |

### P1-TECH-008 — Issue #44

Source: `docs/adr/ADR-P1-TECH-008-save-schema-v2.md`  
Mapped statements: **14**  
Default evidence layer: **Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| Every new persisted field has authoritative owner/reconstruction purpose | `P1QA-TECH008-001` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Inventory/equipment/progression/respawn state explicit | `P1QA-TECH008-002` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Fog/shared discovery and world delta explicit | `P1QA-TECH008-003` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Structures/containers/machine/power explicit | `P1QA-TECH008-004` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Death Cache/drop state explicit | `P1QA-TECH008-005` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Canonical environment/weather state explicit | `P1QA-TECH008-006` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Save schema V2 and V1->V2 migration explicit | `P1QA-TECH008-007` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Migration does not silently perform generation upgrade | `P1QA-TECH008-008` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Corruption cannot silently destroy/regenerate canonical Phase 1 mutation | `P1QA-TECH008-009` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Export/import validated and atomic | `P1QA-TECH008-010` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Hosted persistence ownership/checkpoint coordination explicit | `P1QA-TECH008-011` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Stale-write/revision behavior explicit | `P1QA-TECH008-012` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| Presentation/transient network state excluded | `P1QA-TECH008-013` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |
| ADR persisted | `P1QA-TECH008-014` | Schema/migration + real Chromium IndexedDB + atomicity/corruption + hosted durability |

### P1-TECH-009 — Issue #45

Source: `docs/adr/ADR-P1-TECH-009-performance-observability-ci.md`  
Mapped statements: **15**  
Default evidence layer: **PERF + CI/evidence + exact-main + architecture review**

| Source statement | QA tracking ID | Evidence layer |
|---|---|---|
| quantitative gates measurable and tied to player-facing risk | `P1QA-TECH009-001` | PERF + CI/evidence + exact-main + architecture review |
| CI can detect architecture/determinism/save/network regressions | `P1QA-TECH009-002` | PERF + CI/evidence + exact-main + architecture review |
| evidence reproducible on exact candidate head | `P1QA-TECH009-003` | PERF + CI/evidence + exact-main + architecture review |
| no production analytics infrastructure required | `P1QA-TECH009-004` | PERF + CI/evidence + exact-main + architecture review |
| ADR + handoff persisted | `P1QA-TECH009-005` | PERF + CI/evidence + exact-main + architecture review |
| architecture/ownership explicit | `P1QA-TECH009-006` | PERF + CI/evidence + exact-main + architecture review |
| instrumentation cannot become authority | `P1QA-TECH009-007` | PERF + CI/evidence + exact-main + architecture review |
| browser/runtime/network/save budgets explicit | `P1QA-TECH009-008` | PERF + CI/evidence + exact-main + architecture review |
| failure/observability behavior explicit | `P1QA-TECH009-009` | PERF + CI/evidence + exact-main + architecture review |
| downstream QA use explicit | `P1QA-TECH009-010` | PERF + CI/evidence + exact-main + architecture review |
| exact-main policy explicit | `P1QA-TECH009-011` | PERF + CI/evidence + exact-main + architecture review |
| future 10-player path not unnecessarily blocked | `P1QA-TECH009-012` | PERF + CI/evidence + exact-main + architecture review |
| Phase 1 scope proportional | `P1QA-TECH009-013` | PERF + CI/evidence + exact-main + architecture review |
| implementation authorized | `P1QA-TECH009-014` | PERF + CI/evidence + exact-main + architecture review |
| blocking open question | `P1QA-TECH009-015` | PERF + CI/evidence + exact-main + architecture review |


## 10. Mandatory content-registry evidence — P1-TECH-002

Use source-controlled exact Phase 1 content pack fixtures.

### P1QA-CREG schema / identity / validation
1. valid Phase 1 pack validates;
2. wrong format rejects;
3. newer schema rejects;
4. invalid pack version rejects;
5. malformed ContentId rejects;
6. kind-prefix mismatch rejects;
7. non-finite numeric value rejects;
8. unknown field/type violation rejects;
9. duplicate ContentId rejects;
10. missing reference rejects;
11. wrong-kind reference rejects;
12. construction-kit/structure mismatch rejects;
13. invalid recipe reference rejects;
14. invalid profession/skill/quest reference rejects.

### P1QA-CREG immutability / determinism
15. finalized definitions cannot mutate through public catalog;
16. source-object mutation after validation cannot mutate catalog;
17. no mutable Map/array authority is exposed;
18. shuffled source definition order produces same canonical catalog/fingerprint;
19. shuffled unordered recipe/reference lists produce same canonical representation;
20. quest objective order remains significant;
21. stable ID-sorted listing is identical across runs.

### P1QA-CREG exact approved content / compatibility
22. exact approved 18-item set and numeric values;
23. exact 11 recipes;
24. exact six resource definitions;
25. exact structure caps/source kits;
26. Compact Power Unit = 10 PU / 8-footprint static contract;
27. Atmospheric Water Condenser = 5 PU / 1 Clean Water per 90 active powered seconds / buffer 4 / no offline production;
28. canonical Cold Rain static schedule/effect values;
29. Territorial Predator static profile;
30. ruin reward exactly one Ancient Alloy Shard;
31. progression thresholds/rewards/caps;
32. Fieldcraft/Maintenance prerequisites;
33. Explorer/Engineer quest references and non-exclusive profession flags;
34. any canonical pack-content change changes canonical fingerprint;
35. exact pack identity fixture retained;
36. save/network compatibility DTO round-trip is renderer-free and serializable.

## 9. Mandatory item/container transaction evidence — P1-TECH-003

### Identity/invariants
- unique stack/container identities;
- duplicate persisted identity fails explicitly;
- condition-bearing stack quantity >1 fails where prohibited.

### Atomicity/failure
- target failure during transfer leaves source/target unchanged;
- failed world-drop placement leaves inventory unchanged;
- pickup capacity failure leaves world drop unchanged;
- craft output overflow leaves inputs unchanged;
- invalid/full-condition repair leaves Repair Patch unchanged.

### Concurrency/idempotency
- two players race same drop -> exactly one successful acquisition;
- two players race same shared-container quantity -> one valid commit;
- stale expected revision rejects;
- repeated identical OperationId returns/replays one logical outcome without double apply;
- same OperationId with different payload rejects.

### Gathering/crafting/repair
- canceled gather mutates no resource/output/tool condition;
- fixed yields exact;
- capacity precheck exact;
- successful hard gather applies exact tool wear once;
- craft consumes inputs iff output commits;
- repair consumes Repair Patch iff condition increases.

### Determinism/persistence/network
- same initial ledger + ordered commands -> exact canonical final state;
- merge/selection order independent of insertion order where source defines unordered data;
- export/import round-trip;
- invalid content reference fails;
- reconnect retry cannot duplicate committed item.

## 10. Mandatory world/fog/delta evidence — P1-TECH-004

1. same seed/generation/content identity/chunk -> same GeneratedBase;
2. chunk A->B generation equals B->A;
3. exact golden chunk fixture includes resource/ruin/hostile placement;
4. source content order does not alter generation;
5. generated entity IDs stable;
6. resource mutation survives unload/reload via PersistedDelta;
7. corrupt delta fails instead of clean regeneration;
8. same resolved movement tape -> identical explored fog state;
9. overlapping multiplayer reveal union is idempotent;
10. concurrent ruin Inspect creates one discovery and one Shard authority event;
11. Cold Rain schedule golden fixture stable;
12. reopen does not reroll weather;
13. active-world timers do not advance through offline wall-clock gaps;
14. canonical predator-dead mutation survives unload/reload when persistence scope requires it.

Additional QA:
- no fog-induced locomotion grid lock;
- stale world aggregate cannot overwrite newer revision;
- shared fog/discovery state received correctly on join/rejoin;
- renderer/map culling never becomes chunk/fog authority.

## 9. Mandatory survival/combat/death/recovery evidence — P1-TECH-005

### Survival/fixed-step
- exact Water/Food drain after source-defined fixed ticks;
- render-FPS variation -> same authoritative states;
- offline wall-clock gap -> no survival progression;
- HEAVY/OVERLOADED stamina/movement consequences exact;
- stamina regen delay exact;
- Thermal Wrap broken/non-broken rate exact;
- shelter/night/Cold Rain thermal targets exact.

### Combat/damage
- Spear commit spends approved stamina/cooldown on whiff;
- Spear condition decreases only on successful hit;
- nearest-target deterministic tie-break;
- predator 0.55 s windup can be escaped according to approved geometry/rules;
- duplicate AttackId/DamageId does not double hit;
- leash/disengage exact authoritative behavior.

### Death
- simultaneous lethal sources -> one DeathId;
- death penalty applies exactly once;
- equipped condition -10 exactly once;
- portable items exist either on player or in Death Cache, never both;
- empty inventory follows approved cache rule;
- invalid death position uses deterministic fallback;
- later deaths preserve older non-empty caches.

### Recovery/concurrency/reconnect
- owner/teammate race same quantity -> one successful transfer;
- stale revision rejects;
- empty-cache removal and marker cleanup coherent;
- save/reopen preserves survival/cache/condition/XP result;
- corrupt persisted canonical state fails explicitly;
- reconnect during dead state cannot recreate cache;
- repeated recovery OperationId cannot duplicate item;
- same input/environment tape -> same canonical checkpoint.

## 10. Mandatory building/power/machine evidence — P1-TECH-006

### Placement
- valid placement consumes exactly one correct Kit and creates exactly one structure;
- invalid terrain/overlap/fog/build-zone/cap consumes no Kit;
- competing placements -> one commit and one stale/conflict loser;
- duplicate OperationId cannot duplicate placement;
- sprite/visual size cannot change collision footprint;
- free placement remains continuous world-space, not terrain-tile snapped;
- four logical rotations deterministic.

### Habitat/connector
- valid Landing Module connector snap exact/replayable;
- occupied/invalid connector fails;
- required door/access clearance enforced;
- shelter thermal query = 50;
- shelter does not mutate Health/Food/Water.

### Power
- Compact Power Unit = 10 PU;
- radius = approved 8 footprint widths / current 5 WU contract;
- Condenser demand = 5 PU;
- no overdraw;
- power removal -> UNPOWERED with partial progress preserved;
- existing valid grants retained before new requests as defined by ADR.

### Condenser
- 5,399 RUNNING ticks -> no output;
- 5,400th RUNNING tick -> exactly one Clean Water;
- duplicate cycle processing -> no duplicate;
- output count 4 pauses;
- collection resumes from preserved partial progress;
- disabled/unpowered/full ticks do not advance;
- offline wall clock does not advance;
- save/load preserves exact progress/cycle/output.

### Dismantle/persistence
- success returns exactly one matching Kit;
- non-empty crate/full machine output/player-in-Habitat blocks where source contract requires;
- failed dismantle returns no Kit;
- interaction/dismantle contention remains coherent;
- Power Unit dismantle pauses machine without deleting canonical machine state;
- exact persistence round-trip;
- corrupt references fail;
- reconnect/retry is idempotent.

## 9. Mandatory hosted co-op protocol suite — P1-TECH-007

### Handshake/session
NET-001 compatible two-player join succeeds.  
NET-002 four-player session succeeds.  
NET-003 fifth player rejected when maxPlayers=4.  
NET-004 protocol mismatch rejects.  
NET-005 content fingerprint mismatch rejects.  
NET-006 generation/RNG mismatch rejects.  
NET-007 resumed connection reclaims same PlayerId.  
NET-008 invalid ResumeCredential rejects.  
NET-009 schema has no hard-coded four-slot ceiling; configured maxPlayers=10 is structurally valid.

### Movement
NET-010 client position payload cannot authoritatively move player.  
NET-011 stale/duplicate movement inputSeq ignored.  
NET-012 input lease expiry neutralizes movement.  
NET-013 disconnect neutralizes movement.  
NET-014 same movement tape remains authority-equivalent to solo rules.

### Shared commands/contention
NET-015 duplicate OperationId applies once.  
NET-016 same OperationId/different payload rejects.  
NET-017 stale container revision rejects.  
NET-018 same drop race -> one commit.  
NET-019 same container quantity race -> one commit.  
NET-020 placement race -> one commit; loser keeps Kit.  
NET-021 concurrent Condenser collection preserves exact item total.

### World/fog replication
NET-022 one-player reveal appears to teammate.  
NET-023 ruin discovery replicates without teleporting teammate.  
NET-024 resource/world revision survives rejoin baseline.  
NET-025 stale aggregate update cannot overwrite newer client read model.  
NET-026 tombstone prevents stale removed-entity resurrection.

### Disconnect/rejoin
NET-027 accepted command with lost response resolves to one final outcome.  
NET-028 reconnect does not replay item/build mutation.  
NET-029 disconnect during death does not duplicate Death Cache.  
NET-030 reconnect receives current dead/respawn/cache state.  
NET-031 disconnect during recovery does not duplicate transferred item.

### Durability/session end
NET-032 COMMITTED is distinguishable from durable checkpoint.  
NET-033 graceful shutdown reports save success only after persistence success.  
NET-034 save failure remains explicit.  
NET-035 new SessionEpoch forces baseline resync and prevents old command auto-replay.

### Desync/backpressure
NET-036 server sequence gap triggers resync.  
NET-037 duplicate aggregate revision is harmless.  
NET-038 stale aggregate revision ignored.  
NET-039 slow-client backpressure cannot stall authority simulation.  
NET-040 RTT/desync diagnostics cannot alter gameplay result.

## 10. Mandatory Save V2 / migration / recovery suite — P1-TECH-008

QA IDs below are intentionally unique because the source ADR contains repeated numeric labels in different subsections.

### Schema/validation
SAVEV2-001 valid V2 bundle round-trip.  
SAVEV2-002 newer schema rejects.  
SAVEV2-003 wrong content fingerprint rejects.  
SAVEV2-004 invalid ContentId kind/reference rejects.  
SAVEV2-005 duplicate stable IDs reject.  
SAVEV2-006 invalid numeric/revision/tick state rejects.

### V1 -> V2 migration
SAVEV2-007 V1 player position/facing preserved.  
SAVEV2-008 new Phase 1 fields use exact approved defaults.  
SAVEV2-009 deterministic empty player inventory/container identity produced once.  
SAVEV2-010 migrated environment contains exactly canonical deterministic Cold Rain.  
SAVEV2-011 reopen reconstructs same Cold Rain identity/ticks without reroll.  
SAVEV2-012 invalid/unconstructable canonical Cold Rain fails migration before V2 authority publication and leaves V1 source unchanged.  
SAVEV2-013 generation incompatibility after schema migration fails explicitly rather than regenerating.

### Derived-state / cross-reference
SAVEV2-014 durable player level is absent and reconstructs from totalXp + compatible progression thresholds.  
SAVEV2-015 durable power capacity is absent and reconstructs from compatible producer definition.  
SAVEV2-016 Condenser output container has one canonical ownership reference through StructureRecordV2.outputContainerId.  
SAVEV2-017 missing/wrong-kind/wrong-owner output container rejects load before authority publication.

### Atomicity/data loss
SAVEV2-018 multi-record save failure preserves previous complete durable revision.  
SAVEV2-019 death snapshot cannot publish duplicated player/cache inventory.  
SAVEV2-020 stale expected worldRevision writes nothing.  
SAVEV2-021 successful save advances worldRevision exactly once.

### World delta
SAVEV2-022 explored fog survives reopen.  
SAVEV2-023 depleted/regenerating resource preserves exact revision/ready tick.  
SAVEV2-024 ruin INVESTIGATED/reward state survives without duplicate Shard.  
SAVEV2-025 predator dead state survives.  
SAVEV2-026 corrupt persisted delta fails materialization, not clean regeneration.

### Player canonical state
SAVEV2-027 survival rate remainder/ticks round-trip.  
SAVEV2-028 active dead-pending-respawn round-trips by canonical tick, not wall clock.  
SAVEV2-029 equipment references round-trip and validate ownership.  
SAVEV2-030 progression milestones/repeat counts/quest objectives/professions round-trip.  
SAVEV2-031 death XP result does not reapply on reopen.

### Building/machine
SAVEV2-032 foothold/connectors/structure caps reconstruct.  
SAVEV2-033 power grants validate/reconstruct.  
SAVEV2-034 Condenser enabled/progress/cycle ordinal/output container round-trip.  
SAVEV2-035 offline wall-clock does not advance Condenser.

### Export/import + hosted durability
SAVEV2-036 canonical export ordering.  
SAVEV2-037 export -> import -> export equivalence.  
SAVEV2-038 invalid import cannot overwrite valid world.  
SAVEV2-039 checkpoint revision/tick matches committed world manifest.  
SAVEV2-040 command result before checkpoint is not represented as durable.  
SAVEV2-041 graceful shutdown SAVE_FAILED never reports persistence success.

Real Chromium IndexedDB is required for browser-persistence behavior; pure memory adapters cannot be the only evidence.

## 9. Performance, responsiveness, observability and exact-main gates — P1-TECH-009

All blocking performance evidence must retain raw samples, percentile method, fixture identity and environment.

### Authority tick
Representative four-player authority fixture:
- >=300 warmup ticks;
- >=10,000 measured ticks;
- P95 <= 8 ms;
- P99 <= 12 ms;
- max <= 33.34 ms;
- no three consecutive ticks each >16.67 ms.

### Browser application frame work
After warmup, >=30 seconds steady fixture:
- P95 <=12 ms;
- P99 <=20 ms;
- no application-controlled frame-work sample >50 ms.

Inherited movement responsiveness remains blocking:
- movement start P95 <=50 ms;
- movement stop P95 <=50 ms;
- direction-change P95 <=50 ms.

rAF/frame interval distribution is retained as diagnostic unless a later approved supported-hardware/browser contract promotes it to a product gate.

### Chunk/fog
GeneratedBase over >=200 stable fixtures:
- P95 <=20 ms/chunk;
- P99 <=40 ms/chunk;
- max <=100 ms/chunk.

PersistedDelta validation/materialization:
- P95 <=30 ms/chunk;
- P99 <=50 ms/chunk;
- max <=100 ms/chunk.

Standard four-player fog mutation:
- P95 <=2 ms/authority tick;
- P99 <=4 ms/authority tick.

No synchronous chunk work may hide cost by skipping authoritative ticks.

### Save/load/import representative V2 fixture
Fixture includes:
- four players;
- >=64 chunks;
- fog/resources/ruin/predator mutations;
- foothold/buildings/power/Condenser;
- Storage Crates;
- machine output;
- >=2 Death Caches;
- canonical Cold Rain.

Hard gates:
- authority snapshot capture P95 <=16 ms / max <=33.34 ms;
- IndexedDB durable save P95 <=750 ms / max <=2 s;
- load+validate+reconstruct P95 <=1.5 s / max <=4 s;
- export P95 <=1.5 s / max <=4 s;
- import P95 <=2.5 s / max <=6 s.

### Hosted latency/desync
PR/network change:
- real-browser Hosted-2 smoke.

Exact integrated-main:
- real-browser Hosted-4 E2E.

Controlled loopback:
- two-client command P95 <=100 ms;
- two-client motion age P95 <=100 ms;
- four-client command/motion P95 <=150 ms.

Synthetic 100 ms RTT:
- command P95 <=350 ms;
- motion age P95 <=300 ms.

Desync:
- AuthorityCheckpoint interval <=120 ticks / 2 seconds;
- diagnostic digest uses approved canonical SHA-256 contract;
- mismatch starts resync <=250 ms after detection on loopback;
- coherent READY restored <=2 seconds for representative snapshot.

Backpressure:
- soft threshold >256 KiB or >64 messages for >1 s -> SLOW_CLIENT/resync-coalescing;
- hard threshold >1 MiB, >256 messages, or oldest update >5 s -> RESYNC_REQUIRED/disconnect allowed;
- authority continues for unaffected clients.

Instrumentation is read-only/non-authoritative and must not change command ordering, deterministic state or gameplay behavior.

## 10. Browser visual/readability evidence set

Minimum PO-facing retained evidence should cover, on the exact candidate:
- player on representative light and dark terrain;
- terrain/water/resource/hazard/human structure/machine/ruin/actor category distinction;
- gatherable versus decoration readability;
- human foothold versus previous-civilization ruin distinction;
- landing state versus connected first-habitat progression;
- survival/logistics HUD;
- inventory/container transfer;
- craft/repair requirements and failure feedback;
- build VALID/INVALID + blocking reason;
- machine ACTIVE/INACTIVE/UNPOWERED and reason;
- unexplored/explored fog + ruin UNKNOWN/LOCATED/INVESTIGATED;
- day/night readability;
- Cold Rain warning/active readability without obscuring critical state;
- damage/death/Death Cache/recovery presentation;
- Explorer/Engineer progression feedback;
- 2–4 player identity using non-hue cues;
- 1×/2×/3× integer crispness;
- camera movement sequence proving no static-object resampling shimmer;
- normal PO-facing route uses coherent production-light art/UI rather than raw engineering rectangles/debug labels for core categories.

Critical state distinctions must not rely on color alone.

## 9. 30–60 minute PO-facing playtest protocol

Record exact candidate/deployment identity and use a fresh world.

Observe without coaching beyond approved in-product guidance:
1. Can player identify avatar, landing module and first useful action?
2. Can player complete nearby gather/carry/return/use loop?
3. Does capacity affect choices?
4. Can player understand survival/logistics state without debug tooling?
5. Can player craft/repair and build the first useful foothold?
6. Can player understand invalid build/craft/use reasons?
7. Does preparation observably change expedition capability?
8. Does fog make exploration meaningful without grid-lock?
9. Do night/Cold Rain affect decisions readably?
10. Is hostile contact readable with a valid retreat/disengage path?
11. Is the ruin visibly previous-civilization content?
12. Does Inspect persist discovery and preserve one-time reward semantics?
13. If death occurs, are consequence, respawn and recovery objective understandable?
14. Can basic recovery capability be recreated if carried gear was lost?
15. Does reopen continue the same world rather than resetting progress?
16. Is early Level 3–4/profession progress visible under varied activity?
17. Does the build look like a product-facing slice rather than an engineering test room?

Record:
- total active time;
- milestone times;
- confusion points;
- observed facts separately from interpretations/recommendations;
- any spec failure as a bug with reproduction evidence.

The 30–60 minute value is the approved tuning target, not an automatic failure for every individual player outside the range.

## 10. Hosted 2–4 player playtest protocol

Required player-facing scenarios:
- join compatible session;
- divide gather/build/exploration work;
- shared Storage/structure/machine outcomes;
- one player reveals fog and teammates receive shared knowledge;
- ruin discovery shared correctly;
- same-drop/container/build contention;
- teammate Death Cache recovery assistance;
- disconnect/rejoin during ordinary play;
- disconnect after command acceptance/before response;
- disconnect during dead/recovery state;
- slow-client/backpressure fixture;
- save/session-end success and failure feedback.

Record authority/client diagnostics without exposing secrets or ResumeCredential.

## 9. Regression triggers

Re-run affected suites after changes to:

**Items/content:** content definitions/fingerprint, item ledger, container revisions, gather/craft/repair, death/build/machine item adapters.  
**Survival/combat:** need rates, stamina, thermal/weather coupling, attack/damage IDs, predator state, death transition.  
**World:** seed derivation, chunk generation, entity IDs, fog, ruin, resource deltas, environment schedule.  
**Building/machine:** placement validation, collision footprint, connectors, power grants, machine progress/output, dismantle.  
**Persistence:** schema, migration, validators, world/player/item/build/environment records, export/import, IndexedDB transaction logic.  
**Network:** protocol/version/content handshake, ingress ordering, replication revisions, reconnect/resume, checkpoint/digest, backpressure.  
**Presentation/UI:** Pixi mapping, HUD/panels, fog/weather overlays, co-op identity, scale/DPR/camera sampling.  
**Architecture:** module ownership/import boundaries, public authority seams, persistence non-authority, renderer/network/browser leakage.

## 10. Failure severity / release gate

NOT READY for Product Review while any of these remain:
- BLOCKER;
- Critical data loss;
- item/kit/reward/death-cache duplication;
- broken or destructive save/migration/import;
- authoritative desync that cannot recover under approved protocol;
- core vertical-slice criterion failure;
- exact-main evidence identity mismatch;
- required Hosted-4 acceptance missing when networking is part of candidate.

Major non-core defects are returned to Producer with evidence for milestone/product decision; QA does not silently waive them.

## 9. Evidence package for P1-QA-002

Permanent GitHub QA summary records:
- exact candidate main SHA;
- deployed build URL/identity when release task supplies it;
- exact push CI run;
- artifact IDs/digests;
- source acceptance status;
- bugs/known issues;
- final PASS / PASS WITH KNOWN ISSUES / FAIL;
- READY / NOT READY.

Retained evidence bundle should include as applicable:
- Phase1QualityEvidenceManifestV1;
- production `dist/` and SHA-256 digest manifest;
- raw performance samples;
- deterministic/golden fixtures/results;
- persistence/browser results;
- Hosted-4 results and logs;
- visual screenshots/sequences;
- Playwright trace/screenshot/console/page-error/server excerpts on failure.

## 10. Traceability completeness self-check

Mapped source acceptance statements:
- gameplay + art/UI + P1-TECH-001: **245**
- P1-TECH-002..009: **129**
- total: **374 / 374**

Expected activated-task target: **374 / 374**.

Mandatory specialized ADR test-strategy coverage is separately expanded in Sections 10–17 and does not disappear into the source-acceptance count.

Critical authority/data-loss/desync risks have explicit tests:
**PASS**

Automation vs manual/playtest evidence identified:
**PASS**

No QA-authored gameplay rules introduced:
**PASS**

Artifact is under `docs/qa/`:
**PASS**

Blocking source ambiguity:
**NONE FOUND**

## 9. P1-QA-001 acceptance self-check

1. 100% approved source acceptance statements mapped: **PASS — 374/374**
2. Critical authority/data-loss/desync risks have explicit tests: **PASS**
3. No QA-authored gameplay rules introduced: **PASS**
4. Automation vs manual/playtest evidence identified: **PASS**
5. Artifact under `docs/qa/`: **PASS**
6. Handoff manifest: **PENDING GitHub PR/CI verification and final Issue handoff comment**

## 10. Handoff state

Artifact content is complete for QA self-review. Lifecycle remains with A-QA-01 until branch/PR scope, CI and final persisted handoff are verified.

PROJECT OWNER ACTION: NONE
