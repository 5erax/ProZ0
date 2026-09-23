# ProZ0 Task Lock Protocol

**Status:** APPROVED  
**Version:** 1.0

The lock system prevents two companies, two roles or two chats from implementing overlapping work without coordination.

## Invariant

`ONE ISSUE = ONE OWNER COMPANY = ONE OWNER ROLE = ONE ACTIVE ASSIGNEE = ONE COORDINATING PM = ONE IMPLEMENTATION LOCK`

Other members may read, discuss, review and raise risks. They may not create a competing implementation while the lock is held.

## Lock states

- `UNCLAIMED` — no implementation may begin.
- `RESERVED` — a PM is performing activation/collision preflight; short-lived.
- `CLAIMED` — owner/member is assigned; implementation authorized.
- `IN_PROGRESS` — owner has begun substantive work.
- `REVIEW` — implementation/artifact is under required review; lock remains held.
- `QA` — validation is active; lock remains held for corrections.
- `BLOCKED` — lock remains held unless PMs explicitly release it.
- `RELEASED` — ownership returned to the routing layer.
- `DONE` — accepted task; no active implementation lock.

## Required Issue ownership block

New active tasks must record:

~~~text
## WORK OWNERSHIP

TASK_ID:
OWNER_COMPANY: COMPANY_A / COMPANY_B
OWNER_ROLE:
OWNER_MEMBER_ID:
COORDINATING_PM: PM-A / PM-B
LOCK_STATUS:
LOCK_SCOPE:
EXPECTED_SYSTEMS_OR_PATHS:
DEPENDENCIES:
DOWNSTREAM_CONSUMERS:
~~~

## Activation preflight

Before changing `UNCLAIMED` to `CLAIMED`, the Coordinating PM checks:

1. duplicate Issue;
2. same system already locked;
3. likely file/module overlap;
4. data/authority ownership overlap;
5. active PR overlap;
6. dependency readiness;
7. owner role fit;
8. owner company/member availability;
9. interface contract readiness for cross-team parallel work;
10. safe activation.

The PM records `SAFE TO ACTIVATE: YES` before implementation starts.

## Collision rule

Different Issue titles do not prove different work. Members and PMs must search active Issues and PRs for system, file/module, data-owner and interface overlap.

On material overlap:

~~~text
POTENTIAL TASK COLLISION

CURRENT TASK:
CONFLICTING TASK:
OVERLAP:
RISK:
ACTION:
Affected implementation paused pending PM coordination.
~~~

Either PM may raise the collision and temporarily stop the overlapping portion. Neither PM may resolve it by silently taking the other task.

## PM ownership

Every active Issue has exactly one Coordinating PM.

The other PM has full visibility and may raise concerns, but may not silently reassign, unlock, rescope or close that task.

Cross-PM changes require recorded agreement or Project Owner escalation when the disagreement is genuinely product/governance level.

## Shared feature work

Do not give two companies one implementation Issue. Split the feature into contract-compatible Issues with separate locks.

Parallel work is preferred only after the shared interface/data contract is stable enough to prevent incompatible implementations.

## Legacy migration

Existing Issues keep their task IDs, scope, dependencies and artifacts.

An open legacy task that lacks the ownership block is `LEGACY-ACTIVE`. Its current owner may continue. No new overlapping work may start until a PM records the new ownership/lock block and completes collision preflight.
