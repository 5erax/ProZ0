# Contract upgrade validation

**Version:** 2.1.0. **Date:** 2026-09-28. These are desk walkthroughs against observed repository cases, not fabricated agent executions, product tests or live migration.

| Scenario / evidence | Expected contract behavior | Desk result |
|---|---|---|
| A: #127 implementation complete, PR #130 | A-WNP posts exact head/criteria/tests, requests recorded TL review, keeps REVIEW lock; PM handles merge and #129 readiness | PASS: role execution + HANDOFF_REWORK transition distinguish self-check from acceptance |
| B: #123 narrow panel correction | Reviewer identifies exact failed criterion/head; A-GE resumes bounded correction under retained delegation, posts fresh tests/head, requests original gates; #128 remains reserved | PASS: no duplicate Issue or PO relay; legacy delegation must be reconciled if absent |
| C: #125 missing save policy while #127 fixes internals | GD decides bounded semantics; WNP corrects technical lifecycle independently; GE does not invent policy or wire before both inputs and activation | PASS: critical input vs professional choice; parallel approved interfaces, preserved hard integration gates |
| D: A/B overlapping feature/path | Compare scope/data ownership and open PRs across companies; stop overlapping mutations; PMs agree split/serialization, preserve unrelated work | PASS: lock revision and cross-PM agreement, no silent takeover |
| E: Fresh A-GE session without Task ID | Verify A-GE identity and effective pin; search member fields, owned source/review/PR state; resume #123 or its pending steps, do not claim #124 by title | PASS: common queue order and runtime checkpoint supply next action |
| F: #104 accepted portion / later focused approval | Check exact lines/head/verdict; producer identifies consumers; PM recomputes all edges; only named current conditional grant permits transition | PASS: upstream Issue need not close for explicitly approved consumption; approval is not fabricated |
| G: Obsolete dependency-review failure on #107/#112/#113/#118 | Verify successful rerun evidence, repair stale blocker under lifecycle authority; retain still-pending domain reviews | PASS: factual recovery does not convert CI to domain approval |
| H: #80 has files/technical PASS but no listener | Mark UNLISTENED/capability blocked; use actual human harness evidence then QA verdict; keep lock and no merge | PASS: waveform/spectral evidence cannot replace listening |
| I: #126 and #130 independently green, shared runtime path | Integrate in coordinated order, refresh second head and verify combined result/affected review | PASS: per-PR CI is not integrated candidate acceptance |
| J: Closed PR #88, main v1, effective pinned 2.0.0 | Follow retained adoption pin; load 2.1.0 only after explicit adoption; do not merge stale product snapshot | PASS: release/runtime resolve pin before main and preserve rollback |
| K: Expired grant or simultaneous claim | Re-read revision and expiry, fail closed on mismatch, preserve artifacts, PM/backup reconciles; no assumed atomicity | PASS: TASK_LOCK requires before/after verification and scoped pause |
| L: #60 REQUEST CHANGES, #120 draft | Preserve Phase 1 journey/human/PO gates; do not invent Phase 2 implementation Issues or treat QA as PO | PASS: common follow-up filter + migration constraints |
| M: Merged code, missing criterion evidence | Compare actual artifact to AC; finish validation/handoff rather than reimplement; missing evidence stays pending | PASS: recovery table preserves criterion and acceptance authority |
| N: Contract or Project access unavailable | Report exact unavailable surface; no APPLIED/board-sync claim; preserve usable checkpoint and continue independent authorized work | PASS: capability limits distinct from empty queue or successful persistence |

## Verification boundary

Run the pack validator after edits for local references, 13 role identities, 14 member bindings, release markers, skill frontmatter and content hashes. Inspect diff against both current product main and the effective 2.0.0 pin. Runtime source/tests/assets/package files must be unchanged. Scenario PASS above means the prose gives a determinate safe action; it does not prove live members performed it.

Session recovery: PASS at desk review; live adoption PARTIAL/pending receipts.
Cross-company integration: PASS at contract review; live dispatch not exercised.
Active-task migration: PASS for preservation in this documentation change; policy adoption/delegation reconciliation pending PM cycles.

The known local runtime responsiveness failure recorded on #59 remains outside this governance change. No full local game CI PASS, listening verdict, novice playtest or phase acceptance is claimed here.

## Executed pack checks

- Pack validator: PASS for 13 roles, 14 members and 80 indexed source files; identity, release markers, skill frontmatter, local references and normalized hashes checked.
- Eight isolated validator behavior checks: valid pack accepted; edited contract, missing skill, wrong company, duplicate member, outside required path and broken local link rejected; CRLF checkout accepted. Fixtures stayed outside the repository deliverable.
- `git diff --cached --check`: PASS.
- Scope inspection: no runtime source, tests, assets, package files or Actions workflows changed. Restored specialist skill/playbook content differs from the approved pin only in its release marker.
- Product main freshness: re-read before publication; still `e74e417162df0084254ddbd0a8e4767398f65bb0`.

Remote required checks run on the published PR; inspect their current results before merge. This record does not predeclare those checks successful.
