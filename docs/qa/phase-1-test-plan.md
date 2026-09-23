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


## 9. Mandatory specialist test suites

The specialized P1-TECH-002..009 ADRs define additional executable test strategies and quality gates. They are appended in the next artifact update and are mandatory for P1-QA-002 where the corresponding implementation exists.

## 10. Current completeness checkpoint

- Gameplay P1-DES-001..006: mapped one-to-one.
- Art/UI P1-ART-001..002: mapped one-to-one.
- P1-TECH-001 architecture self-check: mapped one-to-one.
- P1-TECH-002..009: pending append in this same branch/file before handoff.
- No QA-authored gameplay rule introduced.
- No implementation performed.
- Collision check: PASS for `docs/qa/phase-1-test-plan.md`.

PROJECT OWNER ACTION: NONE
