# ProZ0 Team Operating System

**Status:** APPROVED  
**Version:** 1.0  
**Effective:** 2026-09-23

ProZ0 is developed by two delivery organizations under one shared Project Owner and one shared GitHub project state.

Neither company is operationally subordinate to the other. Authority follows approved project role, source-of-truth ownership and task lock, not company membership.

## Operating model

- One Project Owner.
- Two Project Manager / Producer instances: PM-A and PM-B.
- Thirteen unique role contracts.
- Fourteen member slots because the Project Manager contract has two active instances.
- One shared backlog, one repository, one task state, one issue history.
- One Issue has one implementation owner and one Coordinating PM at a time.

## Shared protocols

All members must read:

- `.github/PROZ0_AGENT_BOOTSTRAP.md`
- `docs/team/ROLE_REGISTRY.md`
- `docs/team/MEMBER_REGISTRY.md`
- `docs/team/SOURCE_OF_TRUTH.md`
- `docs/team/TASK_LOCK_PROTOCOL.md`
- `docs/team/CROSS_COMPANY_PROTOCOL.md`
- `docs/team/ARTIFACT_PROTOCOL.md`
- `docs/team/DEFINITION_OF_DONE.md`
- their role contract.

## Core principles

1. **One task, one lock.**
2. **One role, one accountable person per member slot.**
3. **Two PMs, one shared project.**
4. **Discussion is open; implementation is locked.**
5. **Authority follows role and approved contract, not company.**
6. **Cross-company collaboration happens directly on Issues.**
7. **PMs coordinate ownership and dependencies; they do not act as document couriers.**
8. **Project Owner is not a message router.**
9. **No hidden decisions.**
10. **No unrecorded scope change.**

## Legacy tasks

Existing Issues and their task IDs, scope, dependencies and approved artifacts remain valid.

The Team Operating System does not rewrite old tasks merely because the operating model changed.

Open legacy Issues without the new lock header are treated as `LEGACY-ACTIVE`: current work may continue with its existing owner, but the second company must not begin overlapping implementation until a PM records an explicit lock and collision check.

New tasks must use the current task-lock fields.
