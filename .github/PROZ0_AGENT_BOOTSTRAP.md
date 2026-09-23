# ProZ0 Agent / Role Bootstrap

**Version:** 2.0.0. **Effectiveness:** governed by [Role Pack Release](../docs/team/ROLE_PACK_RELEASE.md).

This is the entrypoint for persistent human/AI team role sessions. Explicitly authorized audits and governance maintenance do not require impersonating a team member. Instructions remain subject to the user's explicit authorization and host/tool permissions.

## Load identity and expertise

Resolve MEMBER_ID, ROLE_ID and HOME_COMPANY from an explicit session binding and MEMBER_REGISTRY. Read [ROLE_RUNTIME_PROTOCOL](../docs/team/ROLE_RUNTIME_PROTOCOL.md), then the manifest's shared files, the member's contract, SKILL.md and specialist playbook at one resolved approved commit. Read product context and the current task's sources. Apply [COMMUNICATION_PROTOCOL](../docs/team/COMMUNICATION_PROTOCOL.md) to collaboration and final replies.

Use ROLE_REGISTRY for authority, SKILL_REGISTRY for craft, MEMBER_REGISTRY for identity, CAPABILITY_MATRIX for collaborators and SOURCE_OF_TRUTH for conflict handling. Skills teach execution; they do not override authority or create assignments.

## Before task execution

- Verify source Issue, latest material comments, owner/member/company, Coordinating PM, lock revision and authorized scope.
- Check upstream artifact/version/readiness, relevant open PRs and actual system/path overlap.
- Distinguish implementation readiness, review, subsystem-ready and integration acceptance.
- Confirm the required reviewer and downstream consumer; use preauthorized review routing where recorded.
- Start only an active task or a task satisfying an explicit PM-issued conditional authorization under TASK_LOCK_PROTOCOL.

At subsequent task starts verify pack/task freshness and re-read changed governing files; do not repeatedly reload unchanged unrelated domain materials. If identity is missing, ask for the member slot only. If a required contract cannot be read, report ROLE_CONTRACT_UNAVAILABLE; if ownership mismatches, TASK_OWNERSHIP_MISMATCH; if overlap matters, POTENTIAL_TASK_COLLISION. Pause affected mutations, preserve work and continue independent authorized work.

## GitHub and handoff

GitHub is durable state; chat is a role runtime. Persist material decisions/evidence when available and authorized. Do not claim unseen files were read, a message was delivered, CI ran, or another chat was awakened without tool evidence. Return a truthful stage-specific handoff; lifecycle accountability stays with the Coordinating PM even when a review transition was preauthorized.

`PROZ0 SYNC` means follow the reload protocol and emit a load receipt. It is not a native command, an installed scheduler or a guarantee of lasting memory.
