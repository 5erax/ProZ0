# Phase 2 — Colony depth execution plan

Status: OWNER AUTHORIZED FOR EXECUTION, 2026-09-30. Source: Owner request to create all Phase 2 issues and complete them, followed by the preference **exploration, visuals and co-op first**. Phase 1 was accepted in #60 at `029a82784b03c72fd141fcc50bd0b25b7f75e6b0`.

Execution stays in the current recovery chat. Task records use direct execution, not invented specialist identities or dispatches to PM/GE chats. Independent review and final Owner acceptance are never assumed.

## Product outcome

Develop a sustainable colony worth revisiting: discover visually distinct outer regions, prepare for their weather, bring resources home, invest them in shared research and useful specialization, improve storage and production, and continue the same world alone or in an account-bound private room of **2–3 players**. The Owner reduced the public concurrency target after the initial eight-client authority baseline; eight-client tests remain subsystem evidence, not the public capacity promise.

This is the roadmap's Colony depth phase. Industry, conveyors, vehicles, NPC survivors and civilization/endgame choices remain later phases. Evidence observations must preserve the accepted mystery canon; a journal records discoveries without a quest rail or truth inference.

## Execution order and task map

| Wave | Task / issue | Required outcome |
| --- | --- | --- |
| Contract | P2-PLAN-001 #168 | Scope, acceptance map and dependency order |
| Contract | P2-CONTENT-001 #169 | Stable validated biome/weather/profession/research definitions |
| Explore first | P2-WORLD-001 #170 | Marsh and arid outer regions, memorable discovered sites |
| Explore first | P2-ART-001 #179 | Distinct pixel palettes, silhouettes and facility states |
| Explore first | P2-WEATHER-001 #172 | Recurring regional weather with real exposure consequences |
| Explore first | P2-NARR-001 #178 | Discovered-only observations and unresolved journal |
| Co-op first | P2-NET-001 #182 | Hosted-8, authoritative progression and reconnect safety |
| Colony | P2-ECO-001 #171 | Renewable recovery and bounded overharvest pressure |
| Colony | P2-PROF-001 #173 | Earned Explorer/Engineer/Cultivator specialization and real bonuses |
| Colony | P2-RESEARCH-001 #174 | Shared research with atomic material costs and prerequisites |
| Colony | P2-STORAGE-001 #175 | Improved containers and lossless icon transfer controls |
| Colony | P2-COLONY-001 #176 | Production affected by research/profession/weather/ecology |
| Presentation | P2-UX-001 #177 | Usable mouse/keyboard colony, research and exploration flows |
| Presentation | P2-AUDIO-001 #180 | Regional ambience and colony cues after user gesture |
| Cross-cutting | P2-SAVE-001 #181 | Accepted-save continuation and coherent new state |
| Cross-cutting | P2-PERF-001 #183 | Whole-scene frame and hosted tick evidence |
| Isolated maintenance | P2-MAINT-001 #184 | Compatible tooling updates or explicit defer |
| Delivery | P2-RELEASE-001 #185 | Integrated exact-main browser candidate and Pages identity |
| Delivery | P2-QA-001 #186 | Complete player journeys and failure regressions |
| Decision | P2-PROD-001 #187 | Actual Owner ACCEPT / REQUEST CHANGES |

Each issue follows `.github/ISSUE_TEMPLATE/proz0-task.md`, with ownership, activation, sources, dependencies, acceptance and handoff. Shared runtime paths are edited sequentially. Priority may reorder independent work; it does not waive hard interface dependencies. The first hosted-8 baseline can be tested before research and reconciled when research/save contracts are integrated.

## Compatibility and authority

Phase 1 generation-v3 geography, content fingerprint and deltas remain intact for accepted saves. Phase 2 adds a separately versioned colony-depth extension; absent extension initializes safe defaults and future/malformed state is rejected clearly. Region classification is deterministic from seed and world position, independent from discovery order. Any new generated base/entity identity requires an explicit generation migration, never silently rewriting stored fingerprints. Generation-v2 migration remains a disclosed separate limit.

Research, specialization, ecology and observations are authority-owned. Commands validate identity, expected revisions, alive/range/prerequisite eligibility and real inventory costs. Duplicate operations cannot multiply costs or rewards. All active time uses fixed simulation ticks; no offline yield is added. Save/checkpoint must capture new state coherently with inventory and world deltas. Shared discovery still does not reveal hidden terrain or undiscovered sites.

## Acceptance journeys

1. Start or continue an accepted world; understand available exploration/colony actions through visual controls.
2. Prepare and walk into both new outer regions; distinguish region and weather, discover/inspect sites and record only observed evidence; return using known map/base information.
3. Gather, invest actual materials in research, earn/select a profession, demonstrate its effect and improved storage/production, then save and reopen with the same state.
4. Admit three public players through the real lobby; execute shared actions, duplicate/stale requests and concurrent transfers, disconnect/rejoin and checkpoint/reopen; all clients converge without item loss/duplication. Preserve the existing eight-client authority regression independently.
5. Observe full-scene idle/moving clear/rain/night performance, with actual authority advancement and recorded browser/viewport/SHA. Preserve the existing `>=50 FPS`, frame P95 `<=34 ms` and input response gates; no scene-free proxy or threshold reduction.

Subsystem checkboxes require evidence. A plan, fixture-only assertion or icon without working mechanics cannot close a gameplay issue. Release requires exact-main CI/security, Pages run/job/artifact/digest and public fresh-world plus accepted-save flows. Automated tests are labeled as such; #187 closes only on a real Owner decision after the integrated build is available.
