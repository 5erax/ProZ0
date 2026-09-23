# ProZ0 Task Lock Protocol

**Version:** 2.0.0. One accountable member and one Coordinating PM per implementation scope.

## State and capacity are different

UNCLAIMED: no execution authorization. RESERVED: activation preflight, no implementation. CLAIMED: authorized owner. IN_PROGRESS: implementation. REVIEW: artifact ready, reviewer pending. QA: designated validation. BLOCKED: affected work paused with reason and review date. RELEASED: returned to routing. DONE: accepted at the Issue's declared acceptance stage with downstream criteria mapped.

An artifact remains locked through REVIEW/QA/corrections. This does not automatically lock all of its author's time. Default per-member capacity: one IN_PROGRESS/CLAIMED implementation plus one REVIEW/QA item, provided the latter has a complete handoff, named recipient and capacity for corrections. No new task begins without explicit or conditional PM authorization. PM records exceptions and serializes shared-file edits; distinct titles or branches alone do not prove independence.

## Current ownership block

```text
TASK_ID / OWNER_COMPANY / OWNER_ROLE / OWNER_MEMBER_ID:
COORDINATING_PM:
LOCK_STATUS / LOCK_SCOPE / EXPECTED_SYSTEMS_OR_PATHS:
LOCK_REVISION / ACTIVATION_ID / AUTHORIZED_BY / AUTHORIZED_AT:
DEPENDENCIES: <artifact and required readiness stage>
DOWNSTREAM_CONSUMERS / INTEGRATION_OWNER:
ACCEPTANCE_STAGE: SUBSYSTEM_READY / INTEGRATION_ACCEPTED / ARTIFACT_ACCEPTED
REQUIRED_REVIEWERS / REVIEW_ROUTE:
DISPATCH_ENDPOINT / DISPATCH_STATE: NOT_SENT / POSTED / DELIVERED / ACKNOWLEDGED
NEXT_CHECK_AT / RESPONSE_DUE_AT / BACKUP_COORDINATOR:
```

Use explicit timezone timestamps and verified endpoints. Fields absent on legacy tasks are reconciled before new lifecycle actions that need them; do not invent usernames, chat IDs or acknowledgements. Keep the current ownership block in the Issue body as the operational snapshot, with comments as history. If a newer authorized decision contradicts a stale body, PM reconciles it before a contested mutation; do not let a stale body erase the decision.

## Activation preflight

Check duplicate scope, system lock, paths/modules, canonical data ownership, open PRs, dependency stage/version, role fit, member/correction capacity, interface readiness and dispatch availability. Record SAFE_TO_ACTIVATE with the evidence relevant to risk. Reuse unchanged findings but freshly verify volatile locks/PRs/member state.

The designated Coordinating PM owns reservation and activation for the task. Cross-PM changes require recorded agreement/coverage. Before writing re-read the current revision; after writing verify the stored owner/revision. If another update raced or disagrees, pause overlapping work and reconcile. This manual protocol is not an atomic distributed lock; a future dispatcher must use serialized/conditional state updates rather than claim this checklist prevents all races.

## Conditional authorization

A PM may record a PREAUTHORIZED activation for a named member, exact scope, dependency/CI/review conditions, expected lock revision, expiry, capacity limit and required preflight. It grants no generic right to self-claim. The named member or authorized dispatcher may execute that preauthorized transition only if all conditions and no conflicting changes are verified, then persist the updated revision before edits. If no tool/dispatcher exists, report the readiness; do not claim an automatic action occurred.

## Review routing

At activation name the reviewer, criteria and route. The implementer may directly request that preauthorized review and update stage/evidence within the recorded delegation; PM remains lifecycle-accountable. Reviewer verdict and acceptance/merge permissions stay distinct. The author cannot approve their own independent-review gate. Do not invent a new QA activation when none is authorized.

## Waiting, expiry and backup

At activation define actual availability windows and response deadline. Default coordination expectation is acknowledgement by the next declared working/agent execution window; it is not a promise of 24/7 response. RESERVED expires at its recorded time if no activation occurred; reclaim requires a fresh overlap/state check and recorded release. Missing expiry must be corrected before granting a new reservation.

BLOCKED/REVIEW/QA locks are reviewed at NEXT_CHECK_AT, not silently abandoned. On a missed deadline notify the named backup/PM through an available authorized channel and record the outcome. Expiry does not mean approval, safe deletion or permission to overwrite work. Preserve branch/artifact evidence before any reassignment. A backup with previously recorded coverage may perform only the delegated lifecycle actions; otherwise use cross-PM agreement or unresolved-governance escalation.

## Collisions and contributors

On material overlap identify tasks, paths/authority, risk and proposed split; pause only overlapping mutations. A contributor receives a bounded child task or explicitly non-overlapping patch assignment; the primary owner integrates. Supporting expertise does not silently transfer ownership or approve another domain's changes.

## Acceptance dependencies

SUBSYSTEM_READY proves the approved internal behavior/interfaces; INTEGRATION_ACCEPTED proves the actual assembled experience; ARTIFACT_ACCEPTED is the applicable discipline's accepted document/asset/tool. Preserve every end-to-end criterion with a named downstream test owner. PM and relevant domain owner must record stage/criterion reconciliation on existing Issues before relaxing a DONE dependency. Never convert a missing test into PASS to break a cycle.
