# Phase 1 recovery and integration snapshot

Observed 2026-09-28. Source coordination: #122 and #67. This is a dated evidence map, not a replacement for current issue comments or specialist acceptance.

## Current phase and authority

Phase 1 — Vertical Slice remains in experience-polish closure. Product Review #60 is REQUEST CHANGES; Phase 2 is inactive. Preserve the integrated simulation, Save V2, hosted-authority protocol, one-region/one-ruin scope, and the approved long-term 2–10-player identity (Phase 1 validation targets 2–4).

Recovery work uses the Project Owner's temporary PROJECT_RECOVERY_INTEGRATION_LEAD mandate. It does not claim an existing member identity, replace permanent specialty owners, or count as their approvals.

Baseline: `e74e417162df0084254ddbd0a8e4767398f65bb0`. Read issue bodies **and subsequent comments**: #123 and #127 had completed handoffs while their bodies still described implementation. Their bodies were reconciled to REVIEW; owners, protected scopes and review requirements remain intact.

## Completeness and artifact graph

| Deliverable / classification | Issue / owner | Input dependency | Artifact / implementation | QA / consumer / remaining gate |
|---|---|---|---|---|
| Integrated foundation / delivered, not milestone acceptance | #56, Company A | Accepted design, ADRs and subsystem deliveries | Merged PR #100; `src/integration/`, `src/client/runtime/` | Existing technical evidence; polish and replacement #59 still required |
| Player readability / IN_PROGRESS at review | #123, A-GE-01, PM-A | #37, merged #105 support, bounded #104 inputs | PR #126 at `cf508075515c815987b870731ad28431c7fc66b2`; HUD, controls, rendering and E2E geometry | Exact-head CI success; PM-A verification, A-ART/A-GD review remain |
| Repeated checkpoint lifecycle / IN_PROGRESS at review | #127, A-WNP-01, PM-A | Existing Save V2 contracts | PR #130 at `85a69799ed3a1639f75d4adb5701adeb9c8b6900`; coordinator + runtime wiring + regressions | Exact-head CI success; focused A-TL review; then #125 and #129 |
| Save/continue policy / VALID_ACTIVE decision | #125, A-GD-01 then A-GE-01, PM-A | A-GD decision, A-TL verification, #127, #123 closure | Existing internal checkpoint seam; player affordance not delivered | Journey C must prove two saves and latest committed reopen; do not invent save policy |
| Selected inventory/storage / VALID_BLOCKED | #128, A-GE-01, PM-A | #123 closure, bounded A-GD semantics | Existing item authority to reuse; player controls missing | Actual player selection/partial transfer journey; no staged mutation substitute |
| Map clarity support / IN_PROGRESS at review | #110, B-TD-01, PM-B | Approved exploration semantics + domain decisions | PR #113, `docs/uiux/phase-1-map-clarity-support.md` | A-GD/A-ART decisions → PM-B reconciliation → #124 |
| Map visual support / IN_PROGRESS at review | #111, B-PIX-01, PM-B | Same knowledge semantics | PR #112, `docs/uiux/phase-1-map-visual-mockups.md` | A-ART/A-GD review → #124; proposal is not implementation |
| First-region spatial support / IN_PROGRESS at review | #114, B-WLD-01, PM-B | Existing #68 expedition brief | PR #118, `docs/world-design/phase-1-first-region-spatial-readability.md` | A-GD/A-ART review → #124; no worldgen change authorized |
| Actionable map/world readability / VALID_BLOCKED | #124, A-GE-01, PM-A | #123 closure + accepted #110/#111/#114 inputs | Runtime work reserved | Known-state projection, 1×/2×/3× evidence and novice return/navigation comprehension |
| Hosted client-state and drain/save / VALID_BLOCKED | #129, A-WNP-01, PM-A | #127 closure / capacity; accepted hosted protocol | Existing host/composition to correct; no replacement implementation | Packet-only client loop, contention/rejoin and coherent drain-save-reopen |
| Player-facing wording / IN_PROGRESS at review | #104, B-TD-01, PM-B | Four bounded A-GD corrections | PR #107 at `1abbd4fbf34bf22f37f612c2ee785fee8ca8533a` | Corrected artifact awaits focused A-GD re-review; prior CHANGES_REQUESTED not automatically dismissed |
| Core audio / VALID_BLOCKED | #80, B-AUD-01, PM-B | Accepted event map #79 | PR #95 at `fc9e838589b43d103e26e772dea7bb4dc59f2b89`; audition harness delivered by #119/#121 | UNLISTENED; human Gate A–F verdict required, then integration disposition; no merge based on waveform checks |
| Closure coordination / VALID_ACTIVE | #122, A-PM-01 | Child corrections and acceptance evidence | Existing closure issue + this map | Parent tracking record, not a substitute for deliverable acceptance |
| Final QA / VALID_BLOCKED | #59, A-QA-01, PM-A | Accepted corrections + exact final deployed candidate | Existing QA plan, replacement verdict pending | Journeys A/B/C, 30–60-minute solo, hosted 2–4, 3–5 novices, acceptance traceability |
| Product acceptance / VALID_BLOCKED | #60, Project Owner | #59 PASS/READY + pinned playable build | Existing review gate | Explicit ACCEPT required; no automatic Phase 2 activation |
| Coordination / VALID_ACTIVE standing record | #67, PM-A/PM-B | All active locks and handoffs | Shared cross-company decisions | Keep open as coordination record; not a stale implementation task |
| Phase 2 candidates / deferred, not active implementation | #120, PM-B | Phase 1 acceptance and surviving evidence | Draft candidate backlog | Keep draft; do not move unfinished Phase 1 defects here |

No duplicate deliverable was established among these open issues. UI map guidance (#110/#111), world-space guidance (#114), and runtime work (#124) have different artifacts and consumers. Their pending decisions are real dependencies, not grounds for closing useful tasks.

## Safe execution order and collisions

1. Review corrected #126 and checkpoint #130 at their current heads. Both touch `Phase1ProductReviewRuntime.ts`; after the first merge, reconcile the second and rerun affected tests against the new base. Green isolated PRs do not prove combined integration.
2. Close bounded #104 wording review and #110/#111/#114 domain decisions. Resolve #125 save policy through its named decision owners.
3. After #123 closes, sequence #128, #125 implementation and #124 under PM-A because they share runtime/presentation paths. After #127 closes, activate #129 under its existing owner.
4. Obtain actual human audio listening evidence using the exact-input harness. Record an integration disposition; presence of an asset ZIP does not prove runtime audio delivery.
5. Merge accepted changes, verify integrated main, redeploy explicitly, pin commit/build identity, and run replacement #59. #122 is an umbrella; do not interpret parent closure as an extra prerequisite that forms a cycle with its own acceptance evidence.
6. Route PASS/READY to #60. Only explicit Product Owner acceptance closes the phase.

## Verified operational repairs

Four dependency-review failures reported that the repository did not support Dependency Graph. Rerunning the same workflow on the same commits now succeeds; the old repository-configuration blocker is obsolete, but specialty reviews remain required.

| PR | Exact head | Successful run, attempt 2 |
|---|---|---|
| #107 | `1abbd4fbf34bf22f37f612c2ee785fee8ca8533a` | [36253058977](https://github.com/5erax/ProZ0/actions/runs/36253058977) |
| #112 | `5ba7d3e0279a40a3f97bbe6da82710ae98dceb05` | [36245087839](https://github.com/5erax/ProZ0/actions/runs/36245087839) |
| #113 | `40f851f1508751a74e7a47f54ade1c512a3ecbeb` | [36245163339](https://github.com/5erax/ProZ0/actions/runs/36245163339) |
| #118 | `6eea2d7510b55d99e4c43c794e3e92717cc12f0f` | [36255065501](https://github.com/5erax/ProZ0/actions/runs/36255065501) |

PR #126 CI [36342701156](https://github.com/5erax/ProZ0/actions/runs/36342701156) and PR #130 CI [36342938711](https://github.com/5erax/ProZ0/actions/runs/36342938711) were independently checked to match the heads above and report success. This records CI, not specialist sign-off.

## Governance and verification limits

Local baseline verification on Windows / Node 24.19.0: typecheck, lint, 103 unit, 148 integration, 11 determinism, production build and 26 browser tests passed. E2E returned **12 passed / 1 failed**. `movement-responsiveness.spec.ts` timed out waiting for MOVING/facing during the suite; a one-worker isolated rerun also failed, waiting for IDLE. Both are 500 ms setup/state waits; neither completed the P95 evidence gate. Root cause is unresolved, and full local CI is **not PASS**. Installing the pinned Chromium resolved the initial missing-browser setup error. Track this reproduction under existing final QA #59 rather than create a duplicate movement task or relax the approved 50 ms criterion.

- Pages is enabled with workflow deployment and HTTPS at https://5erax.github.io/ProZ0/. The older administration snapshot and README pre-enablement language were stale.
- No repository rulesets exist; `main` protection returns `Branch not protected`. A review-capable identity arrangement must be reconciled before applying the proposed one-approval/CODEOWNER policy: current Company A PR reviews note the same-account self-review restriction. Do not manufacture independent approvals.
- Project #4 access is blocked by the current CLI credential missing `read:project`; board contents and status synchronization are **not verified**. Authenticated repository writes work. Board mutation would additionally need appropriate project write scope.
- No milestones or releases were returned by their repository endpoints. Textual Phase 1 milestone fields are therefore not proof of a configured GitHub milestone.
- Existing branches are retained; age alone does not establish abandonment or authorize deletion of evidence.
- Human listening, visual/game-feel acceptance and novice playtests remain distinct from automated verification. No phase completion is claimed.
