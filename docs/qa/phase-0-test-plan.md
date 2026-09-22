# P0-QA-001 — Phase 0 QA Test Plan / Executable Acceptance Matrix

Task: P0-QA-001
Role: QA / Playtest Lead
Milestone: Phase 0 — Foundation
Source Issue: #10
Status: READY FOR PRODUCER REVIEW

## 1. Purpose

This document converts the approved Phase 0 gameplay, visual, architecture, determinism, chunk, persistence, authority, and CI requirements into an executable QA matrix.

It does not create gameplay or technical requirements. Every expected result below comes from an approved source artifact.

Plan completion is not product acceptance. P0-QA-002 executes this plan against the integrated Phase 0 candidate after its implementation/review prerequisites are satisfied.

## 2. Source of truth used

Gameplay:
- P0-DES-001 — docs/design/phase-0-movement-camera.md

Visual:
- P0-ART-001 — docs/art/phase-0-prototype-rendering-pixel-foundation.md

Technical:
- P0-TECH-001 — docs/adr/ADR-P0-TECH-001-engine-framework-renderer.md
- P0-TECH-002 — docs/adr/ADR-P0-TECH-002-runtime-architecture-module-boundaries.md
- P0-TECH-003 — docs/adr/ADR-P0-TECH-003-determinism-simulation-strategy.md
- P0-TECH-004 — docs/adr/ADR-P0-TECH-004-chunk-coordinate-lifecycle.md
- P0-TECH-005 — docs/adr/ADR-P0-TECH-005-save-format-versioning-foundation.md
- P0-TECH-006 — docs/adr/ADR-P0-TECH-006-multiplayer-readiness-authority-boundary.md
- P0-TECH-007 — docs/adr/ADR-P0-TECH-007-development-testing-ci-strategy.md

Tracking identifiers introduced by this QA plan are only labels for traceability. They do not add requirements.

## 3. Required validation environments

### 3.1 Clean-checkout / CI baseline
- Node.js 24 LTS.
- npm with committed package-lock.json.
- Clean checkout.
- Required command sequence from P0-TECH-007:
  1. npm ci
  2. npm run typecheck
  3. npm run lint
  4. npm run test:unit
  5. npm run test:integration
  6. npm run test:determinism
  7. npm run build
  8. npm run test:browser
  9. npm run test:e2e

### 3.2 Browser baseline
- Chromium through the approved Playwright/Vitest Browser stack.
- Desktop browser.
- Focused game tab for responsiveness checks.
- Stable local Phase 0 single-player simulation.
- No artificial network latency.
- 640 × 360 internal reference raster.
- 1280 × 720 exact 2× presentation for the primary visual/readability pass.
- 1920 × 1080 exact 3× presentation for 3× crispness validation.
- DPR and viewport metadata retained with browser evidence.

### 3.3 Determinism baseline
- Fixed authoritative step: 60 Hz.
- Same initial state, version set, world seed/RNG version, ordered logical input tape, and fixed tick count must reproduce the approved equivalent authoritative result.
- Render cadence may vary without changing authoritative outcome for the same fixed ticks.

### 3.4 Persistence baseline
When P0-TECH-005 implementation is present:
- storage-neutral SaveRepository contract is tested through deterministic integration fixtures;
- browser IndexedDB adapter receives browser-level smoke/round-trip coverage;
- corruption, migration, atomicity, stale-revision, export/import, and recovery cases use isolated test worlds and never overwrite a valid fixture unintentionally.

## 4. Evidence policy

Automated PASS evidence:
- exact commit/head;
- CI run;
- test layer and test name;
- seed/input tape/fixture when deterministic;
- browser/version/viewport/DPR when browser-facing;
- raw samples and summary when a percentile or quantitative threshold is required.

Manual/visual PASS evidence:
- retained screenshots or image sequence tied to exact head;
- manifest identifying raster, display scale, case name, and artifact files;
- QA or Art review note describing the observable pass condition.

Failure evidence:
- exact build/head;
- failing AC/test ID;
- reproduction steps;
- expected vs actual;
- reproduction rate where relevant;
- retained logs/screenshots/trace/raw data.

## 5. Gameplay / input / collision / camera acceptance matrix

| Source AC | QA test ID | Layer | Required validation / evidence |
|---|---|---|---|
| AC-MOV-001 WASD held movement | QA-MOV-001 | Browser + integration | Hold W/A/S/D; continuous mapped movement while focused; no keyboard-repeat or destination stepping. |
| AC-MOV-002 Arrow-key equivalence | QA-MOV-002 | Unit + browser | Arrow states map to the same logical actions as WASD; browser-owned arrows do not scroll gameplay surface. |
| AC-MOV-003 Opposing-axis cancellation | QA-MOV-003 | Integration | Left+Right and Up+Down cancel only their axis; unaffected axis remains active. |
| AC-MOV-004 No tile lock | QA-MOV-004 | Integration + browser | Stop at multiple fractional positions inside one visual/grid region; no tile-center/node snap. |
| AC-MOV-005 No step movement | QA-MOV-005 | Browser + integration | Held movement advances continuously rather than in tile-sized/discrete hops. |
| AC-MOV-006 Cardinal consistency | QA-MOV-006 | Integration | Equal fixed-tick duration in N/S/E/W yields equivalent total distance within test tolerance. |
| AC-MOV-007 Diagonal normalization | QA-MOV-007 | Integration | Equal-duration diagonal total distance equals cardinal distance within tolerance; no sqrt(2) boost. |
| AC-MOV-008 Frame-rate independence | QA-MOV-008 | Determinism/integration | Same fixed ticks/input under supported render cadence variation differs by no more than 2%; authoritative result should be identical when fixture compares exact fixed ticks. |
| AC-MOV-009 Start responsiveness | QA-MOV-009 | Browser E2E | Keydown to post-render visible displacement <= 50 ms P95; retain raw samples, sample count, method and baseline. |
| AC-MOV-010 Stop responsiveness | QA-MOV-010 | Browser E2E | Final keyup to post-render visible locomotion stop <= 50 ms P95; no intentional glide. |
| AC-MOV-011 Direction responsiveness | QA-MOV-011 | Browser E2E | Direction input change to post-render visible direction change <= 50 ms P95; no turn-lock. |
| AC-MOV-012 Rapid tap | QA-MOV-012 | Browser E2E | Short taps create short corresponding displacement with no systematic loss and no delayed queued movement after release. |
| AC-COL-001 Solid blocking | QA-COL-001 | Integration | Normal movement cannot pass through explicit solid geometry. |
| AC-COL-002 No penetration | QA-COL-002 | Integration | Resolved player AABB never remains overlapping invalid solid interior. |
| AC-COL-003 Wall sliding | QA-COL-003 | Integration | Blocked component clamps; valid tangential component continues. |
| AC-COL-004 No wall-slide boost | QA-COL-004 | Integration | Tangential component keeps original normalized component magnitude; it is not renormalized to full base speed. |
| AC-COL-005 Direct-wall stability | QA-COL-005 | Integration + browser | Sustained input stops at valid boundary with no bounce, jitter, teleport, penetration, or pushback. |
| AC-COL-006 Narrow-gap rule | QA-COL-006 | Integration | Gap below footprint is blocked; exact-fit gap is traversable when aligned; larger gap traverses; epsilon must not widen a gap. |
| AC-COL-007 Corner stability | QA-COL-007 | Integration | Sustained corner input settles stably without oscillation, penetration, teleport, or grid snap. |
| AC-FACE-001 Facing while moving | QA-FACE-001 | Integration | Parameterized eight-direction intended input produces N/NE/E/SE/S/SW/W/NW facing. |
| AC-FACE-002 Facing while idle | QA-FACE-002 | Integration | IDLE preserves last valid facing. |
| AC-FACE-003 Facing under collision | QA-FACE-003 | Integration | Collision-constrained displacement does not replace intended facing direction. |
| AC-CAM-001 Follow target | QA-CAM-001 | Unit + browser | Camera follows resolved player world position, not raw input. |
| AC-CAM-002 Center anchor | QA-CAM-002 | Browser/visual | In unconstrained world area, player converges on viewport anchor 0.5/0.5. |
| AC-CAM-003 No dead-zone | QA-CAM-003 | Unit + browser | Resolved movement begins affecting camera immediately; no gameplay dead-zone layer. |
| AC-CAM-004 Smoothing limit | QA-CAM-004 | Unit | cameraFollow90Time accepts 0–120 ms only; default target 80 ms. |
| AC-CAM-005 Normal camera lag | QA-CAM-005 | Unit + browser | Sustained base-speed lag stays <= 0.5 player-footprint width. |
| AC-CAM-006 Blocked-input camera behavior | QA-CAM-006 | Browser/integration | Holding into a fully blocking wall does not move camera in blocked direction when resolved position is unchanged. |
| AC-CAM-007 Spawn framing | QA-CAM-007 | Unit + browser | Spawn/reset snaps camera to player before normal control; no smoothing from old/world-origin position. |
| AC-INP-001 Focus-loss safety | QA-INP-001 | Browser | Blur/hidden state clears or suspends held input; missed keyup cannot leave stuck movement. |
| AC-INP-002 Focus-regain safety | QA-INP-002 | Browser | Regain focus does not replay input accumulated while inactive. |

### 5.1 Mandatory gameplay edge-case set

These checks are derived directly from P0-DES-001 edge cases and remain required even when partially covered by the matrix above:
- Left+Right.
- Up+Down.
- W+A+D -> Up.
- All four directions -> IDLE and facing preserved.
- Diagonal-to-cardinal transition with no stop frame.
- Immediate reversal with no braking phase.
- Focus loss and focus regain.
- Diagonal collision slide.
- Direct wall sustained input.
- Corner contact.
- Different render FPS.
- Spawn/reset camera snap.
- Invalid/unavailable playable area does not become silently passable when the world layer exposes that state.
- Arrow keys do not unintentionally scroll when gameplay owns input.

## 6. P0-TECH-008 collision fixture coverage consumed by movement QA

Although P0-TECH-008 is not one of the source prerequisites of P0-QA-001, it is the approved implementation contract for the P0-DES-001 collision criteria and should be reused by P0-QA-002 where present.

Required regression fixture coverage:
- T1 non-grid/sub-pixel continuous position.
- T2 direct vertical-wall stop.
- T3 vertical-wall slide with no boost.
- T4 horizontal-wall slide.
- T5 19 px gap blocked.
- T6 exact 20 px gap traversable when aligned.
- T7 21 px gap traversable.
- T8 closed-corner stability.
- T9 solid iteration-order independence.
- T10 sprite/presentation bounds do not influence authoritative collision.
- T11 real render-cadence variation does not change authoritative result.
- Sub-epsilon-below-20 px gap remains blocked.
- Near-equal competing solids clamp to nearest physical boundary.
- Exact end-of-tick endpoint contact completes full intended delta with blocked=false; next continued-input tick clamps with blocked=true.

## 7. Visual acceptance matrix

| Source AC | QA test ID | Layer | Required validation / evidence |
|---|---|---|---|
| AC-ART-001 Visual reference scale | QA-ART-001 | Review + browser | 32×32 internal-pixel reference scale is documented/usable while entity gameplay positions remain continuous. |
| AC-ART-002 Reference raster | QA-ART-002 | Browser | 640×360 internal raster or visually equivalent stable result; retain raster metadata. |
| AC-ART-003 720p integer presentation | QA-ART-003 | Visual/browser | 1280×720 is exact 2× with crisp non-interpolated pixels. |
| AC-ART-004 1080p integer presentation | QA-ART-004 | Visual/browser | 1920×1080 is exact 3× with crisp non-interpolated pixels. |
| AC-ART-005 Filtering | QA-ART-005 | Browser + visual | Nearest-neighbor/point-equivalent sampling; no bilinear-style softening. |
| AC-ART-006 Continuous movement independence | QA-ART-006 | Integration + visual | Presentation snapping does not feed back into gameplay coordinates or create 32 px movement lock. |
| AC-ART-007 Movement responsiveness preservation | QA-ART-007 | Browser E2E | Presentation path still satisfies AC-MOV-009/010/011 <= 50 ms P95. |
| AC-ART-008 Camera contract preservation | QA-ART-008 | Unit + browser | Centered anchor, no dead-zone, resolved target, 0–120 ms smoothing, 80 ms default, spawn snap, blocked-input stability. |
| AC-ART-009 Pixel stability | QA-ART-009 | Visual | Retained moving-camera sequence shows static sprites remain crisp with no sampling shimmer. |
| AC-ART-010 Character scale | QA-ART-010 | Browser/review | Player reference frame is 32×48 px or documented visually equivalent proportion. |
| AC-ART-011 Player readability | QA-ART-011 | Visual | At primary 2× view, player clearly distinguishes on both light and dark ground. |
| AC-ART-012 Ground anchor | QA-ART-012 | Review + visual | Player and tall depth-test object expose/document center-of-feet/ground-contact depth anchor. |
| AC-ART-013 Front/behind depth | QA-ART-013 | Visual | Same tall object occludes player in behind case and renders behind player in front case according to ground-anchor Y. |
| AC-ART-014 Alpha quality | QA-ART-014 | Visual | Transparent sprite edges, when raster assets are used, have no interpolation halo/soft edge artifact. |
| AC-ART-015 Browser scaling | QA-ART-015 | Browser + visual | Supported integer scales do not soften/distort world surface; non-exact viewports prefer largest fitting integer scale rather than fractional stretch. |
| AC-ART-016 Scope control | QA-ART-016 | Review | Phase 0 validation does not require final art pack, final UI, production lighting, or production VFX. |
| AC-ART-017 Renderer evaluation readiness | QA-ART-017 | Review + composite evidence | Renderer demonstrates stable raster, nearest filtering, integer scaling, continuous-sim/pixel-stable separation, ground-anchor depth, browser crispness, and P0-DES-001 camera compatibility. |

### 7.1 Minimum retained visual artifact set

For an integrated candidate that claims the visual criteria:
- light-ground-2x screenshot;
- dark-ground-2x screenshot;
- dark-ground-3x screenshot;
- multi-frame camera-motion shimmer sequence;
- tall-object behind screenshot;
- tall-object front screenshot;
- manifest with exact head, 640×360 reference raster, output dimensions/scales, and case mapping.

## 8. Technical acceptance matrix

The technical artifacts use a mixture of issue acceptance criteria and acceptance/self-check statements. The rows below preserve those statements as source requirements; QA tracking IDs are only labels.

### 8.1 P0-TECH-001 — Engine / Framework / Renderer

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| ADR documents options, trade-offs, decision, rejected alternatives, constraints and consequences | QA-T001-01 | Explicit ADR review check. Verify selected TypeScript + Vite + PixiJS v8/WebGL direction and recorded alternatives/trade-offs/constraints/consequences. |
| Decision satisfies all confirmed Phase 0 product constraints | QA-T001-02 | Composite: browser startup, 640×360 raster, 2×/3× crispness, nearest filtering, continuous simulation position, render separation, camera responsiveness, ground-anchor depth, deterministic/headless tests, future authority boundary, chunk path, scope control. |

Required renderer/testability checks from P0-TECH-001:
- shared simulation runs without Pixi/DOM;
- deterministic tests do not depend on renderer timing;
- browser canvas/Pixi initialization succeeds;
- nearest/reference scaling is browser-valid;
- camera/raster snapping does not mutate continuous simulation position;
- focus loss clears movement input;
- depth and pixel-stability evidence is reviewable.

### 8.2 P0-TECH-002 — Runtime Architecture / Module Boundaries

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Module responsibilities and ownership are unambiguous | QA-T002-01 | ADR review plus architecture/import tests for client, simulation, world, persistence, content, foundation and future server host ownership. |
| Allowed dependency direction is documented | QA-T002-02 | CI lint/dependency tests reject forbidden imports including simulation->client/Pixi, world->client, content->simulation and persistence->client/presentation. |
| Future server-authoritative deployment path is not blocked | QA-T002-03 | Headless authority/contract review verifies domain modules are environment-neutral and local composition can later move behind host/server boundary. |

Additional contract coverage:
- public APIs tested independently of concrete adapters;
- simulation/world/content tests run headless;
- browser adapter validates focus, Pixi startup, snapshot-to-presentation mapping and camera/pixel behavior.

### 8.3 P0-TECH-003 — Determinism / Simulation Strategy

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Deterministic scope explicit | QA-T003-01 | ADR review + DET suite executes authoritative simulation at fixed 60 Hz independent of render timing/wall clock. |
| RNG ownership and seed derivation rules explicit | QA-T003-02 | DET-001 and DET-006: project-owned RNG/golden vectors; authoritative simulation/world rejects Math.random dependency. |
| Repeated-run equivalence rule explicit | QA-T003-03 | DET-002: same versions/initial state/seed/input tape/fixed ticks -> same canonical checkpoint. |
| Presentation/authoritative-state separation explicit | QA-T003-04 | DET-003 and DET-005: render cadence/interpolation does not mutate authoritative state. |
| No gameplay rule invented | QA-T003-05 | Review check: determinism implementation/test expectations remain technical only and do not alter Game Design behavior. |

Mandatory DET suite:
- DET-001 golden deterministic RNG vectors.
- DET-002 repeated initial state/input tape/fixed ticks -> same canonical checkpoint.
- DET-003 render cadence variation -> same authoritative result for same fixed ticks.
- DET-004 chunk request-order A/B vs B/A -> same generated chunks once chunk implementation exists.
- DET-005 presentation interpolation/read cadence cannot mutate authoritative simulation state.
- DET-006 authoritative code path scan/test contains no Math.random dependency and rejects non-finite authoritative values where specified.

### 8.4 P0-TECH-004 — Chunk Coordinate / Lifecycle

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Coordinate convention/identity unambiguous | QA-T004-01 | CHUNK-001/002/003. |
| Negative-coordinate behavior unambiguous | QA-T004-02 | CHUNK-001 boundary table includes negative floor semantics. |
| Chunk span/world-scale relationship explicit without gameplay grid-lock | QA-T004-03 | CHUNK-002 plus continuous movement regression across chunk boundaries. |
| Lifecycle states/transitions explicit | QA-T004-04 | CHUNK-008/009 plus lifecycle transition integration tests. |
| Deterministic generation entrypoint explicit | QA-T004-05 | CHUNK-004. |
| Request-order-independent seed derivation explicit | QA-T004-06 | CHUNK-005. |
| Mutation ownership explicit | QA-T004-07 | CHUNK-006 plus authority boundary check. |
| Persistence integration/revision behavior explicit | QA-T004-08 | CHUNK-006/007/008. |
| Production biome/resource/ecology generation excluded | QA-T004-09 | Scope review check. |

Mandatory CHUNK suite:
- CHUNK-001 coordinate boundary table including -0.001, -32.0, -32.001 and int32 validation.
- CHUNK-002 world -> chunk -> local invariant; 0 <= localX/localY < 32.
- CHUNK-003 canonical chunk key round trip.
- CHUNK-004 same world seed + coord + RNG/generation version -> same generated base.
- CHUNK-005 request-order independence A/B vs B/A.
- CHUNK-006 authoritative mutation increments revision and marks DIRTY.
- CHUNK-007 stale save completion cannot clear a newer DIRTY revision.
- CHUNK-008 save failure prevents final dirty eviction.
- CHUNK-009 materialization failure never exposes partial ACTIVE chunk.
- CHUNK-010 render/view culling does not mutate authoritative chunk state.

## 8.5 P0-TECH-005 — Save Format / Versioning

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Phase 0 persisted state explicit | QA-T005-01 | SAVE-001 + schema review. |
| World/player ownership explicit | QA-T005-02 | Repository/API review + authority integration. |
| Save format/schema explicit | QA-T005-03 | SAVE-001/002. |
| Save version identifiable | QA-T005-04 | SAVE-001/003. |
| Generation/RNG compatibility metadata explicit | QA-T005-05 | SAVE-013/016. |
| Load/validation contract explicit | QA-T005-06 | SAVE-001..007 and SAVE-011..013. |
| Migration extension point explicit | QA-T005-07 | SAVE-014/015. |
| Atomic write requirement explicit | QA-T005-08 | SAVE-008/009/010. |
| Failure/corruption behavior explicit and testable | QA-T005-09 | SAVE-008/011/012/013/015/019. |
| Backup/export/import recovery contract explicit | QA-T005-10 | SAVE-017/018/019. |
| Deterministic chunk reconstruction preserved | QA-T005-11 | SAVE-016. |
| Persistence remains non-authoritative infrastructure | QA-T005-12 | Authority/architecture review; persistence adapter cannot mutate live domain state directly. |
| Future host/server path preserved | QA-T005-13 | Authority-port integration review. |
| No future gameplay payloads invented | QA-T005-14 | Scope review against Phase 0 schema. |

Mandatory SAVE suite:
- SAVE-001 valid V1 manifest/player/chunk passes.
- SAVE-002 wrong formatId fails.
- SAVE-003 unsupported newer schema fails.
- SAVE-004 NaN/Infinity/non-finite position fails.
- SAVE-005 invalid facing fails.
- SAVE-006 non-int32 chunk coordinate fails.
- SAVE-007 mismatched worldId fails.
- SAVE-008 injected multi-record save failure leaves previous committed state unchanged.
- SAVE-009 successful transaction advances worldRevision exactly once.
- SAVE-010 stale expected revision fails without overwrite.
- SAVE-011 corrupt player/root record never partially publishes a world.
- SAVE-012 corrupt chunk fails materialization rather than silently discarding state.
- SAVE-013 unsupported generation/RNG version fails explicitly.
- SAVE-014 V1 -> future test migration executes sequentially and validates output.
- SAVE-015 failed migration preserves original record and publishes no domain state.
- SAVE-016 same manifest seed/version + same chunk record reconstructs same deterministic base.
- SAVE-017 export ordering is canonical.
- SAVE-018 export -> import -> export yields equivalent canonical domain save data.
- SAVE-019 invalid import cannot overwrite an existing valid world.

Browser persistence smoke when IndexedDB adapter exists:
- create/save/load round trip;
- refresh/reopen and reload same world;
- adapter failure surfaces approved failure category rather than partial publication.

### 8.6 P0-TECH-006 — Multiplayer Readiness / Authority Boundary

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Critical future authority explicit | QA-T006-01 | Authority ownership review + AUTH suite. |
| Client presentation vs authoritative simulation separated | QA-T006-02 | Architecture lint + AUTH-001/002. |
| Phase 0 does not require client-authoritative critical state | QA-T006-03 | AUTH-003/004/006 plus source review. |
| Multiplayer implementation not introduced | QA-T006-04 | Scope review: no lobby/socket/prediction/reconciliation requirement is added to Phase 0. |

Mandatory AUTH suite:
- AUTH-001 headless authority runtime executes without Pixi/DOM.
- AUTH-002 client presentation cannot import or directly mutate world internals.
- AUTH-003 logical command/input intent resolves through authority to resulting snapshot/state.
- AUTH-004 invalid operation leaves authoritative state unchanged; no partial mutation.
- AUTH-005 local Phase 0 authority uses the same environment-neutral simulation contract intended for future host/server composition.
- AUTH-006 persistence attaches to authority host boundary; remote/client presentation is not canonical save authority.

### 8.7 P0-TECH-007 — Development / Testing / CI

| Source criterion | QA tracking ID | Validation |
|---|---|---|
| Clean-checkout workflow explicit | QA-T007-01 | Execute documented clean-checkout sequence in CI/fresh workspace. |
| Automated test layers/CI gates explicit | QA-T007-02 | Verify required scripts and CI job steps exist and fail non-zero on failures. |
| Determinism validation included | QA-T007-03 | test:determinism is a required blocking gate and DET suite executes. |
| Real-browser validation included | QA-T007-04 | Chromium browser test and E2E smoke execute against real browser/production preview. |
| Architecture-boundary enforcement included | QA-T007-05 | lint/dependency gate rejects forbidden imports. |
| Phase 0 scope remains proportional | QA-T007-06 | Review: no unnecessary release pipeline, broad browser farm, analytics, load farm, or production monitoring is required for Phase 0. |

Mandatory CI gate checklist:
- CI-001 install from lockfile.
- CI-002 typecheck.
- CI-003 lint + architecture boundaries.
- CI-004 unit tests.
- CI-005 integration tests.
- CI-006 determinism tests.
- CI-007 production build.
- CI-008 headless browser tests.
- CI-009 E2E smoke.
All are blocking on PRs to main and pushes to main unless an explicit approved exception is recorded by the authorized roles.

## 9. Regression suites

### 9.1 Movement/camera regression
Re-run after any change touching:
- client input;
- fixed-step host timing;
- movement simulation;
- collision;
- player presentation transform;
- camera;
- render scheduling;
- world collision fixture/API.

Minimum regression:
- QA-MOV-001..012 as applicable to changed surface;
- QA-COL-001..007;
- QA-FACE-001..003;
- QA-CAM-001..007;
- QA-INP-001..002;
- TECH-008 T1..T11 plus endpoint/epsilon regressions.

### 9.2 Chunk regression
Re-run CHUNK-001..010 after changes to:
- chunk coordinate math;
- generation seed/version;
- residency/lifecycle;
- chunk mutation/revision;
- persistence callback handling;
- view/interest integration.

### 9.3 Persistence regression
Re-run SAVE-001..019 after changes to:
- schema;
- validators;
- SaveRepository adapters;
- migration;
- transaction/revision behavior;
- import/export;
- world/chunk identity/version handling.

### 9.4 Authority/architecture regression
Re-run lint/boundary and AUTH suite after changes that move responsibilities between client, simulation, world, persistence, or host composition.

### 9.5 Visual regression
Re-capture the retained visual artifact set after changes to:
- Pixi presentation;
- raster sizing/scaling;
- camera raster transform;
- player/obstacle/tall-object presentation;
- filtering;
- display scale/DPR handling.

## 10. P0-QA-002 integrated execution order

When Producer activates P0-QA-002 on an integrated candidate:

1. Verify exact integrated head/build and required upstream Technical Review state.
2. Verify clean-checkout CI and all nine required gates.
3. Execute/inspect deterministic suite.
4. Execute movement/input/collision/facing/camera suite.
5. Inspect quantitative responsiveness raw evidence and independently recompute required percentiles.
6. Execute/inspect chunk lifecycle suite.
7. Execute/inspect persistence/save/load/version/failure suite.
8. Execute/inspect authority and architecture-boundary suite.
9. Inspect retained visual evidence and perform required visual checks.
10. Run regression set relevant to all integrated Phase 0 changes.
11. Record each source acceptance criterion PASS/FAIL.
12. File every Critical/Major failure through Producer with evidence.
13. Produce final status:
   - PASS
   - PASS WITH KNOWN ISSUES
   - FAIL
14. Provide READY / NOT READY recommendation to Producer.

## 11. Release gate applied during P0-QA-002

NOT READY while any of the following remains:
- Blocker.
- Critical data loss.
- Broken save.
- Consistent major desync when multiplayer becomes applicable.
- Any core Acceptance Criterion failure.

Major non-core issues are recorded with severity/evidence and returned to Producer for milestone/product decision.

## 12. Traceability / completeness self-check

Gameplay criteria mapped:
- P0-DES-001: 31 / 31.

Visual criteria mapped:
- P0-ART-001: 17 / 17.

Technical acceptance/self-check criteria mapped:
- P0-TECH-001: 2 / 2.
- P0-TECH-002: 3 / 3.
- P0-TECH-003: 5 / 5.
- P0-TECH-004: 9 / 9.
- P0-TECH-005: 14 / 14.
- P0-TECH-006: 4 / 4.
- P0-TECH-007: 6 / 6.

Total source acceptance statements mapped:
- 91 / 91.

Required technical test-strategy cases are also expanded into executable DET, CHUNK, SAVE, AUTH, CI, browser, and visual suites.

No QA-authored gameplay rule introduced:
- PASS.

Prerequisite/source identified for every mapped criterion:
- PASS.

Every mapped criterion resolves to an automated test, browser test, retained visual check, or explicit review check:
- PASS.

Blocking open question for this Test Plan:
- NONE.

## 13. Handoff

This plan is ready for Producer DoD verification.

P0-QA-002 remains a separate lifecycle task and must not be activated by QA itself. Producer controls its activation when the integrated candidate, P0-QA-001, and required review prerequisites are ready.

PROJECT OWNER ACTION: NONE
