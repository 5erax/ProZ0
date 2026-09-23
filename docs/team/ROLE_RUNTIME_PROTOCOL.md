# Role identity, context and reload protocol

**Version:** 2.0.0.

## Identity is explicit and persistent

A role session knows PROJECT, repository, MEMBER_ID, ROLE_ID, HOME_COMPANY, pack version, resolved Git commit, source task and Coordinating PM. MEMBER_ID comes from an explicit initial binding or verified existing session identity, checked against MEMBER_REGISTRY. Do not infer it from task title, account name or which work looks interesting. PM-A and PM-B share a contract but never an identity.

If identity is absent, ask only for the member slot. Read-only product/pack orientation may continue. If a supplied role/company contradicts the member map, report IDENTITY_CONFLICT before taking role-owned action. An auditor or pack maintainer explicitly authorized to edit governance is not required to impersonate one of the game team slots.

## Consistent version loading

1. Resolve the requested ref once to an immutable commit. Default to latest approved main, not an unapproved feature branch. Candidate adoption requires the explicit PO decision described in ROLE_PACK_RELEASE.
2. At that commit read bootstrap, release, manifest, registries, source-of-truth, operating/lock/cross-company/artifact/DoD protocols, this runtime protocol, COMMUNICATION_PROTOCOL, CAPABILITY_MATRIX and GAME_DEVELOPMENT_FOUNDATION.
3. Read the member's complete role contract, mapped SKILL.md and its full specialist playbook on first adoption or role-pack change. Do not load all thirteen skills into every member. Read the four shared product documents listed in the manifest, then the role's context index; fetch detailed product/domain references relevant to the current task.
4. For a live task, freshly read the source Issue, relevant comments, exact owner/lock, dependencies, design/ADR/asset sources, target code/build and overlapping work. Approved task sources may be newer than the pinned pack: record their own exact version; do not silently upgrade the pack.
5. Reuse unchanged materials within the session. At task start check approved pack version/hash and changed task state. Re-read changed governing files and affected references; after compaction rebuild the concise context card from verified records. A summary is not a new source of authority.
6. Emit a load receipt. Missing required files, partial retrieval, mismatched identities or inconsistent revisions produce PARTIAL/NOT_LOADED, not APPLIED.

## Context card

Maintain this concise working record; refresh when facts change rather than pasting it into every reply:

```text
MEMBER_ID / ROLE_ID / HOME_COMPANY:
PACK_VERSION / RESOLVED_COMMIT / ADOPTION_BASIS:
MISSION / DECISION_AUTHORITY / LIMITS:
CURRENT_MILESTONE / PLAYER_OUTCOME:
SOURCE_ISSUE / LOCK_REVISION / COORDINATING_PM:
UPSTREAM_SOURCES / REQUIRED_REVIEWERS / DOWNSTREAM_CONSUMERS:
ACTIVE_WORK / WAITING_REVIEW / NEXT_ALLOWED_ACTION:
KNOWN_ASSUMPTIONS / BLOCKERS / TOOL_LIMITATIONS:
```

## Reload through chat

`PROZ0 SYNC` is a documented instruction phrase, not a built-in slash command or background service.

When told to sync: preserve verified identity, retrieve the new approved pack at one commit, compare responsibilities and ongoing-task compatibility, load applicable files, report material changes and resume authorized work. Do not claim permanent memory or automatic propagation to other chats. Re-supply MEMBER_ID when starting a new unbound chat.

If the new pack changes an active lock, acceptance stage or ownership, record the discrepancy and have the Coordinating PM reconcile that Issue; continue unaffected authorized work. Never drop existing work merely because the pack changed.

## Load receipt

```text
ROLE PACK: APPLIED / PARTIAL / NOT_LOADED
MEMBER: <id> | ROLE: <id> | COMPANY: <id>
VERSION: <version> | COMMIT: <resolved SHA>
ADOPTION_BASIS: approved main / explicit PO adoption reference
READ: <contract, skill, playbook, shared files; concise path list or manifest reference>
MY RESPONSIBILITY: <specific outcome>
MY COLLABORATORS: <key role IDs and what each decides>
TASK: <Issue, lock, next allowed action> / NO_ACTIVE_TASK
GAPS: <missing access/files or unresolved task-policy conflict> / NONE
```

For NO_ACTIVE_TASK, report readiness and discover assigned or conditionally preauthorized work. Do not invent an assignment, occupy a different slot or ask PO to relay information that is accessible on GitHub.

## Tool and permission reality

Repository instructions do not grant external messaging, credential, deployment or merge permission beyond the user's/tool environment's authorization. Where GitHub updates are authorized and available, persist evidence there. If unavailable, produce a copy-ready handoff and state PERSISTENCE_REQUIRED; do not pretend the record was posted. A GitHub comment is not a guaranteed notification or execution signal.

Native skill discovery depends on the host. Repository skills live under `.agents/skills/`; a plain chat may instead fetch SKILL.md and the linked playbook directly. Reading instructions is not installation, model training or proof of skill. Verify actual behavior against ROLE_PACK_EVALUATION before claiming validated competence.
