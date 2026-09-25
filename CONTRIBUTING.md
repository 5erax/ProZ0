# Contributing to ProZ0

ProZ0 uses a GitHub-first, contract-driven workflow. This document is the repository-facing entry point; the detailed operating rules live under `docs/team/`.

## Before starting work

For core-team work:

1. Read the source Issue and current comments.
2. Confirm the Issue's `OWNER_COMPANY`, `OWNER_ROLE`, `OWNER_MEMBER_ID`, `COORDINATING_PM`, `LOCK_STATUS`, and `LOCK_SCOPE`.
3. Read linked specs, ADRs and upstream artifacts.
4. Check relevant open PRs and collision risk.
5. Do not begin unclaimed or conflicting implementation work.

For external/community proposals, open a Proposal / Discovery Issue first. Creating an Issue does not authorize implementation.

## Branches

Use task-oriented branches. Preferred shape:

```text
task/<task-id>-<short-description>
bug/<task-id>-<short-description>
docs/<task-id>-<short-description>
```

Do not use company-prefixed branches as ownership markers. Ownership belongs in the source Issue.

## Pull requests

Every PR should:

- link the source Issue;
- identify the task/member/role/company;
- describe scope and non-goals;
- list important files/areas changed;
- state gameplay, architecture, save/network and migration impact;
- include tests/validation;
- record known limitations;
- avoid unrelated refactors.

Use the repository PR template.

## Required validation

Run the checks applicable to the change. The full local parity path is:

```bash
npm ci
npx playwright install --with-deps chromium
npm run ci
```

PRs are also validated by GitHub Actions.

## Design and architecture authority

Do not turn implementation preference into a new gameplay or architecture requirement.

- Product direction: Project Owner.
- Gameplay-system behavior: Game Designer.
- Narrative/world canon: Narrative & World Design Director.
- Software architecture/technical contracts: Technical Lead.
- Visual/UX standards: Art Director.
- QA verdict/evidence: QA / Playtest Lead.
- Task routing/locks: task's Coordinating PM.

See `docs/team/SOURCE_OF_TRUTH.md`.

## Cross-company work

Company A and Company B are peer delivery organizations in one project. Direct specialist clarification is allowed on the relevant Issue/PR. Do not silently take, unlock, reassign, or duplicate another task's protected scope.

See `docs/team/CROSS_COMPANY_PROTOCOL.md` and `docs/team/TASK_LOCK_PROTOCOL.md`.

## Security

Do not publish exploit details, credentials, tokens or sensitive deployment information in Issues or Discussions. Follow `SECURITY.md`.

## Community conduct

Follow `CODE_OF_CONDUCT.md`.
