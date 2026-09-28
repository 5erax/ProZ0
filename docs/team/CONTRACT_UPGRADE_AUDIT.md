# Contract architecture audit and migration

**Observed:** 2026-09-28. **Product baseline:** `e74e417162df0084254ddbd0a8e4767398f65bb0`.
**Effective operating baseline:** 2.0.0 at `a8aec0b8d377aa9c7e568573e8ba6a3a87e02cb6`.
**Proposed release:** 2.1.0. This document is a dated audit, not live task authority.

## Evidence and method

Read all 13 main contracts and all 13 pinned contracts, both registries, bootstrap, shared protocols, manifest, runtime/communication/capability rules, repository governance/contribution/PR/task templates, CI/CODEOWNERS, product vision/MVP/phase plan and live Issues/PRs. GitHub all-state listings returned 87 Issues (16 open) and 44 PRs (8 open) at inspection; source task comments and PR #88's closure were inspected. Active-role inputs were checked before editing. No AGENTS.md existed on product main; the pinned pack's AGENTS.md permits explicitly authorized governance maintenance without impersonating a specialist.

The repository has no separate Project Constitution file; GOVERNANCE, SOURCE_OF_TRUTH, approved product sources and explicit PO decisions provide those functions. Introducing another constitution would duplicate authority.

Project #4 could not be read: CLI reports missing `read:project` scope. No board fields, configuration or synchronization are claimed. No live task lock, acceptance criterion, human verdict or runtime code is modified by this upgrade.

## Findings supported by behavior

| Finding | Repository evidence | Repair |
|---|---|---|
| Main is not the effective role baseline | [PR #88 closure](https://github.com/5erax/ProZ0/pull/88#issuecomment-5847230587) retains approved pin; active #80/#67 records use it | Port approved governance files only; resolve effective pin before main; explicit candidate adoption |
| Useful autonomy already exists and must not be lost | [PM-B conditional queue](https://github.com/5erax/ProZ0/issues/67#issuecomment-5815891044) separates review lock from production capacity | Preserve conditional grants, WIP, direct review and guarded lock revisions |
| New-session work selection is underspecified | Runtime supports reload but main bootstrap expects a source task; repeated execution signals appear on #123/#125/#127 | Deterministic owned-work/rework/handoff/review/ready-work discovery; persistent checkpoint |
| A generic missing-input rejection can over-block | #125 can decide save UX while #127 fixes revision lifecycle; wiring still needs both | Critical unknown vs professional decision vs reversible assumption; typed consumer-specific edges |
| Readiness cannot be inferred from open/closed or green CI | #104/#110/#111/#114 have artifact PRs and remaining domain verdicts; #80 is technically complete but UNLISTENED | Artifact/version/stage readiness checks, human gates, exact-head verdicts |
| Current state drifts across snapshots | [Recovery comment](https://github.com/5erax/ProZ0/issues/67#issuecomment-5859308824) reconciles #123/#127 to REVIEW and clears obsolete CI blockers | Source Issue/current authorized decisions outrank historical snapshots; repair ownership-scoped metadata |
| Shared-file integration risk survives isolated green CI | #126 and #130 both modify Phase1ProductReviewRuntime.ts, documented in the recovery record | Serialize integration; validate combined head and affected reviews |
| Rework needs an explicit continuation path | [#123 correction handoff](https://github.com/5erax/ProZ0/issues/123#issuecomment-5858831685) follows bounded requested changes | Retained-owner correction delegation and same-reviewer revalidation, without another PO relay |
| Company boundaries are not review gates | [PM-B operating principle](https://github.com/5erax/ProZ0/issues/67#issuecomment-5846989228) distinguishes autonomous B work and domain-boundary review | Preserve peer PMs; map producer/consumer interfaces and prevent mirror artifacts |
| Human evidence and product acceptance remain indispensable | [#80 listening gate](https://github.com/5erax/ProZ0/issues/80#issuecomment-5851932227), [#60 REQUEST CHANGES](https://github.com/5erax/ProZ0/issues/60#issuecomment-5850951519) | Capability routing, no fabricated listening/playtests, no Phase 2 activation |

All roles were checked for mission, ownership, authority, scope, input/output, dependencies, GitHub, handoff, failure/recovery, self-review, evidence, escalation, cross-company behavior and autonomy. Existing domain authority was generally clear; shared discovery, dependency typing, explicit rework and routine Issue repair were incomplete. No arbitrary public role scores are assigned.

## Authoritative role inventory and per-role audit

The registry remains the authority for identity. Each linked contract retains Mission, Authority/limitations, Responsibilities, collaborators, specialist context and evidence, and now adds explicit Inputs/DoR, Outputs/workflow, self-review and failure/recovery. Shared GitHub, claiming, escalation and reporting responsibilities are inherited from COMMON_EXECUTION_CONTRACT; ROLE_INTERFACE_MAP records all upstream/downstream edges. This table indexes that complete inventory instead of duplicating contracts into a competing authority.

| ROLE_ID / contract | Company / MEMBER_ID | Owned output / current authority boundary | Active context and repaired gap |
|---|---|---|---|
| [PROJECT_MANAGER](roles/project-manager.md) | A / A-PM-01; B / B-PM-01 | Flow, locks, capacity, backlog; cannot override domain/product decisions | #122, #67, #120; deterministic reconciliation, review debt, readiness/board capability and escalation filtering |
| [GAME_DESIGNER](roles/game-designer.md) | A / A-GD-01 | Gameplay specs within approved product; not architecture/canon | #125 decision; #104/#110/#111/#114/#123 review; separate own decisions from hard missing inputs |
| [TECHNICAL_LEAD](roles/technical-lead.md) | A / A-TL-01 | Architecture/interfaces/conformance; not gameplay or product scope | #127/#130 and #125; exact-version review and combined integration evidence |
| [GAMEPLAY_ENGINEER](roles/gameplay-engineer.md) | A / A-GE-01 | Player-facing implementation within approved specs; no rule invention | #123/#126; reserved #124/#128 and later #125; continuation, correction and direct authorized handoff |
| [WORLD_NETWORK_PERSISTENCE_ENGINEER](roles/world-network-persistence-engineer.md) | A / A-WNP-01 | World/network/save implementation; no policy or authority redesign | #127/#130; reserved #129; repeated-save/packet evidence and reserved-task preservation |
| [ART_DIRECTOR](roles/art-director-uiux-technical-art.md) | A / A-ART-01 | Visual/UX/technical-art standards; not gameplay semantics | #104/#110/#111/#114/#123 review; concrete visual checks and producer-specific returns |
| [QA_PLAYTEST_LEAD](roles/qa-playtest-lead.md) | A / A-QA-01 | Independent evidence/verdict; not product acceptance | #59 and #80; distinguish FAIL from unavailable capability; bounded owner return |
| [NARRATIVE_WORLD_DIRECTOR](roles/narrative-world-design-director.md) | B / B-NWD-01 | Canon within product direction; not mechanics/art/architecture | #116 completed, no open owned production; explicit hooks, unresolved-canon and recovery boundaries |
| [WORLD_LEVEL_DESIGNER](roles/world-level-gameplay-designer.md) | B / B-WLD-01 | Spatial grammar/route intent; not reveal rules/worldgen architecture | #114/#118 review; spatial vs map interfaces and scoped correction |
| [TECHNICAL_DESIGNER](roles/technical-designer-content-systems.md) | B / B-TD-01 | Content/config and tooling within schemas; not balance/UX approval | #104/#107 and #110/#113; focused semantic rework and source-to-data validation |
| [PIXEL_ARTIST_ANIMATOR](roles/pixel-artist-animator.md) | B / B-PIX-01 | Asset craft within ART brief; not final visual direction | #111/#112 review; actual export decoding/readability, no speculative new task |
| [AUDIO_DESIGNER](roles/audio-designer-composer.md) | B / B-AUD-01 | Audio content craft; not timing/canon/runtime architecture | #80/#95; UNLISTENED cannot be replaced by waveform checks or arbitrary regeneration |
| [BUILD_TOOLS_DEVOPS](roles/build-tools-devops-engineer.md) | B / B-DEVOPS-01 | Reproducible tools/CI/release within policy; cannot waive gates | #119/#121 completed, no open owned production; exact environment/identity and capability disclosure |

## Architecture and duplication changes

Effective 2.0.0 pack + main v1 entrypoints → one candidate 2.1.0 pack on current product main. SOURCE_OF_TRUTH remains the single precedence definition. COMMON_EXECUTION_CONTRACT indexes inherited rules; TASK_LOCK owns ownership; DEPENDENCY_PROTOCOL owns edge readiness; HANDOFF_REWORK_PROTOCOL owns transitions; DoD owns evidence; role contracts own specialist authority and checks; skills retain craft methods.

Removed repeated generic product-literacy, experimental-work, collaboration and final-reply boilerplate from all 13 pinned contracts. Preserved specific mission, ownership, limitations, context sources, counterpart map, autonomous decisions and practitioner evidence. Shared rules are linked, not copied wholesale. Technical missing-input instructions now classify uncertainty rather than rejecting all incomplete inputs. Narrative/audio wording no longer implies an unapproved builder identity.

New files have distinct purposes: common execution procedure, typed dependency algorithm, transition/return loop, role-interface table, this audit/migration record and scenario validation. Each references the existing shared governance and is indexed by the manifest/release. Restored craft files are the existing approved pack, not invented extra roles or a second gameplay baseline.

## Active-task migration matrix

All rows are plans for the existing lifecycle owner; this PR performs no product-task activation or takeover. Before using a new rule, refresh the source body/comments/head and record only the needed reconciliation. Restrictive task-specific sequences remain binding.

| Open Issue(s) / owner | Observed state / PR | Next permitted transition and preserved constraint |
|---|---|---|
| #67 / peer PM coordination | Permanent record, historical body plus current comments | Link new adopted pin only after adoption; retain all existing decisions/history |
| #122 / A-PM | IN_PROGRESS polish closure | Track domain gates and combined candidate; do not accept Phase 1 from subsystem completion |
| #123 / A-GE | REVIEW, #126 corrected head | Required ART/GD review and PM acceptance; keep #124/#128 reserved |
| #127 / A-WNP | REVIEW, #130 | TL review, PM sequencing and combined-runtime validation; #129 not auto-activated |
| #125 / A-GD decision then A-GE | CLAIMED design decision | GD → TL; implementation requires #127 seam and PM sequencing after #123. PM records one implementation owner at phase transition, no simultaneous ambiguous lock |
| #124 / A-GE | RESERVED | #123 review/merge plus #110/#111/#114 domain closure and PM input reconciliation; no new claim from generic capacity rule |
| #128 / A-GE | RESERVED after #123 | Keep original controls/transaction scope and GD semantics review; activate only through existing PM route |
| #129 / A-WNP | RESERVED after #127 | Keep packet-only loop/drain scope, existing protocol and capacity sequence |
| #104 / B-TD | REVIEW, #107 | Focused GD re-review on four semantic corrections; preserve valid ART review only under recorded carry-forward; PM-B acceptance |
| #110 / B-TD | REVIEW, #113 | GD information/reveal/distance and ART visual verdicts; no runtime activation |
| #111 / B-PIX | REVIEW, #112 | ART primary and bounded GD review; mockup acceptance is not runtime visual completion |
| #114 / B-WLD | REVIEW, #118 | GD/ART bounded spatial verdicts, then PM-B lifecycle; no worldgen or map-authority transfer |
| #80 / B-AUD | REVIEW / capability blocked, #95 | Human audition on exact audio head via accepted #119 harness, QA verdict, PM-B reconciliation; no merge or listening PASS implied |
| #59 / A-QA | Final QA paused behind polished candidate | New journeys and 3–5 novice tests, exact-candidate replacement verdict; retain disclosed local responsiveness failure and qualified prior evidence |
| #60 / PO acceptance, PM-A coordination | REQUEST CHANGES | PO re-entry only after #59 PASS/READY and required polish/human evidence; no PM substitution |
| #120 / B-PM | Draft / NOT ACTIVATED | Planning only; no Phase 2 implementation or duplicate candidate Issues before #60 permits it |

Current open PR #131 changes README, administration baseline and a recovery map, not role-pack files. This upgrade avoids those paths except GOVERNANCE/CONTRIBUTING entrypoint additions; its audit links #131 instead of creating another product recovery backlog. PR #88 remains closed; no stale branch merge is attempted.

## Dependency reductions and remaining gates

No live hard dependency was silently removed. The candidate permits action-specific SOFT/INFORMATIONAL/PARALLEL_INTERFACE classification with recorded PM/domain agreement: #125 decision versus #127 internals, complementary #110/#111/#114 inputs, and approved portions of #104 versus its disputed lines. It retains shared-file sequencing (#126/#130), reserved follow-ups, actual listening, final journeys, novice tests and PO phase acceptance.

Owner relays removed by contract: routine task selection, approved craft choices, branch/PR creation, direct named review requests, retained-scope rework, evidence updates and recovery. Live reduction has not yet been measured; adoption and running sessions are required.

## Next automation and measurement

First pilot the existing named conditional-grant protocol and pending-review queue in PM sessions. Then consider an event-driven dispatcher that rechecks expected revisions, serializes claims, handles duplicate events idempotently, logs actor/authority, fails closed on permissions and records actual delivery/acknowledgement. Never automate acceptance from labels alone. Readiness checks and Project views should mirror source Issues, not become competing truth.

Existing CI, templates and CODEOWNERS provide review infrastructure; actual repository protection and board access must be verified separately before claiming enforcement. No workflow, webhook, scheduler or automatic chat wakeup is installed here. Compare per-cycle stale blockers, duplicate work, routine PO relays, rework turnaround and recovery success against a recorded pre-adoption baseline; correctness and necessary human gates take precedence over speed.
