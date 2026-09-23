# ProZ0 — Universal GitHub-First Autonomous Collaboration Protocol

**Status:** APPROVED — VERSION 2 COMPATIBILITY ENTRYPOINT  
**Effective:** 2026-09-23

This path is retained because existing ProZ0 Issues already reference it.

The original single-Producer routing model is superseded by the Team Operating System v1.

## Mandatory current sources

Every role must now begin with:

1. `.github/PROZ0_AGENT_BOOTSTRAP.md`
2. `docs/team/TEAM_OPERATING_SYSTEM.md`
3. `docs/team/ROLE_REGISTRY.md`
4. `docs/team/MEMBER_REGISTRY.md`
5. its role contract under `docs/team/roles/`
6. `docs/team/SOURCE_OF_TRUTH.md`
7. `docs/team/TASK_LOCK_PROTOCOL.md`
8. `docs/team/CROSS_COMPANY_PROTOCOL.md`
9. `docs/team/ARTIFACT_PROTOCOL.md`
10. `docs/team/DEFINITION_OF_DONE.md`

## Compatibility interpretation for existing Issues

Existing task IDs, scope, dependencies, approved artifacts and acceptance criteria remain unchanged.

Where an existing Issue says `Producer`, interpret it as **the task's Coordinating PM** under the current dual-PM model.

Where an existing Issue says `Role → Producer → Next Role`, interpret it as:

`Role → Coordinating PM → activated next role`.

The Project Owner remains outside routine message routing.

## Current universal rules

- GitHub is the shared project state.
- Every role self-discovers task context and dependencies from GitHub.
- Important discussion is persisted on Issues/PRs.
- Specialists may communicate directly for clarification.
- Specialists do not self-activate official downstream work.
- Every active Issue has one owner/lock and one Coordinating PM.
- Both PMs maintain whole-project visibility and prevent cross-company collision.
- Neither PM silently changes a task coordinated by the other PM.
- Existing open tasks are preserved and migrate to lock metadata without rewriting their scope.
- Every role self-checks Acceptance Criteria and role DoD before handoff.
- Every task ending records a Handoff Manifest and `PROJECT OWNER ACTION: NONE / REQUIRED`.

For detailed behavior, the current shared protocols and role contract are authoritative.
