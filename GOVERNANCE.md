# ProZ0 Governance

This file summarizes repository governance for contributors. Detailed operating contracts remain authoritative under `docs/team/`.

## Project authority

ProZ0 has one Project Owner and two peer Project Manager / Producer instances:

- PM-A — Company A
- PM-B — Company B

Both companies work in the same repository, backlog and dependency graph. Neither company is organizationally subordinate to the other inside the project delivery model.

## Domain authority

Authority follows role contract, approved source of truth and task lock—not company identity.

The canonical role list is `docs/team/ROLE_REGISTRY.md`; member-instance bindings are in `docs/team/MEMBER_REGISTRY.md`.

## Task ownership

An active implementation task must identify:

```text
OWNER_COMPANY
OWNER_ROLE
OWNER_MEMBER_ID
COORDINATING_PM
LOCK_STATUS
LOCK_SCOPE
```

Creating an Issue is not the same as activating it. Activation requires the task preflight defined in `docs/team/TASK_LOCK_PROTOCOL.md`.

## Source of truth

Product and operational precedence is defined in `docs/team/SOURCE_OF_TRUTH.md`.

Repository code represents current behavior but does not automatically override approved product/design/technical decisions.

## Cross-company coordination

The permanent coordination record is:

https://github.com/5erax/ProZ0/issues/67

The shared baseline marker is `CROSS-COMPANY BASELINE ESTABLISHED`.

## Governance changes

Changes to role authority, PM authority, task-lock rules, source-of-truth precedence, or Project Owner escalation boundaries require explicit Project Owner approval before becoming effective.

Normal task routing and delivery decisions do not require Project Owner involvement unless they cross those authority boundaries.

## Versioned operating contracts

Resolve the effective approved pack through [release/adoption](docs/team/ROLE_PACK_RELEASE.md), including an explicitly retained pin; a newer branch or stale main copy does not supersede that decision. The [common execution contract](docs/team/COMMON_EXECUTION_CONTRACT.md) indexes task discovery, dependency checks, handoff/rework and recovery for every role. The [audit and migration](docs/team/CONTRACT_UPGRADE_AUDIT.md) records the 2.1.0 candidate and preserves existing live-task gates. Candidate files are not effective merely because they exist in a PR.
