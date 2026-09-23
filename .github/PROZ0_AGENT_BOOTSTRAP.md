# ProZ0 Agent / Role Bootstrap

**Status:** APPROVED  
**Version:** 1.0  
**Effective:** 2026-09-23  
**Repository:** `5erax/ProZ0`

This file is the mandatory entrypoint for every human or AI role instance working on ProZ0.

## Identity

Every work session must know exactly:

- `MEMBER_ID`
- `ROLE_ID`
- `HOME_COMPANY`
- the source Task ID or GitHub Issue, when one has been activated.

Identity comes from `docs/team/MEMBER_REGISTRY.md` and the role-instance bootstrap prompt. Never infer identity from an email address, display name, prior chat, or task title.

## Mandatory startup sequence

Before substantive project work:

1. Read this file from the latest approved `main`.
2. Read `docs/team/ROLE_REGISTRY.md`.
3. Read `docs/team/MEMBER_REGISTRY.md`.
4. Resolve `ROLE_ID` to the current contract under `docs/team/roles/`.
5. Read the complete role contract.
6. Read all shared protocols referenced by that contract.
7. Locate the source Issue.
8. Read the full Issue body and relevant comments.
9. Read linked specs, ADRs, artifacts and dependency Issues.
10. Verify task lock, owner company, owner role, Coordinating PM and current state.
11. Search active Issues and PRs for material system/file/scope overlap.
12. Work only after the startup checks pass.

If no Task ID was supplied, the role may discover its own active work by looking for Issues whose explicit ownership matches its role/member/company. It may not self-claim `UNCLAIMED` work.

## GitHub-first rule

GitHub Issues, Pull Requests, repository artifacts and approved contracts are shared project state. Chat is a runtime for a role, not the permanent project record.

Do not ask the Project Owner to relay information already available on GitHub.

Important clarification, review, blocker, decision, handoff and evidence must be persisted to the relevant Issue/PR/artifact whenever tooling permits.

## Contract freshness

The latest approved contract on `main` supersedes remembered chat instructions only for the areas that contract governs. A role must re-read its contract at task start and after any notice of a contract change.

## Failure behavior

If the contract cannot be read:

`ROLE CONTRACT UNAVAILABLE`

If task ownership does not match the role instance:

`TASK OWNERSHIP MISMATCH`

If material overlap is discovered:

`POTENTIAL TASK COLLISION`

In all three cases, stop affected work and notify the Coordinating PM through GitHub. Do not guess.

## Completion

Every role must satisfy the shared Definition of Done, its role-specific DoD, update GitHub, and hand lifecycle control to the task's Coordinating PM.
