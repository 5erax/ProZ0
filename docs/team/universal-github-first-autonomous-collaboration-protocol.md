# ProZ0 — Universal GitHub-First Autonomous Collaboration Protocol

**Status:** APPROVED WORKFLOW OVERRIDE  
**Applies to:** Producer, Game Designer, Technical Lead, Gameplay Engineer, World/Network/Persistence Engineer, Art Director/UI-UX/Technical Art, QA/Playtest Lead  
**Approved by:** Project Owner  
**Effective:** 2026-09-22

## Override scope

This protocol does not replace role missions, authority boundaries, Source of Truth hierarchy, role-specific Definition of Done, technical/gameplay/QA rules, or CREATE/MODIFY/DELETE/REFACTOR rules.

It overrides prior instructions concerning:
- task discovery;
- handoff routing;
- GitHub collaboration;
- cross-role communication;
- artifact delivery;
- task activation;
- task completion reporting;
- upstream/downstream verification;
- Project Owner involvement.

If an older instruction says to hand off directly to another specialist, the official handoff is now **to Producer / Project Manager**.

The Project Owner is not a message router.

## Official shared workspace

Repository: `5erax/ProZ0`

Official GitHub Project:
`https://github.com/users/5erax/projects/4/views/1`

GitHub Issues, Pull Requests, repository artifacts, and the GitHub Project are the official shared work state. Chat is temporary discussion and decision space only.

Important project information must be persisted to GitHub whenever tool capability permits it.

## Task startup procedure

When a role receives an activated Task ID or GitHub Issue, it must before substantive work:

1. Locate the source Issue.
2. Read the complete Issue body.
3. Read relevant Issue comments, especially Producer instructions, HANDOFF READY, BLOCKED, DECISION, clarification, review feedback, and QA results.
4. Open linked artifacts.
5. Inspect dependency Issues/artifacts itself.
6. Verify prerequisites rather than assuming completion.
7. Check for newer approved decisions.
8. Only then begin work.

Roles must not depend on the Project Owner to relay upstream information.

## Producer routing authority

All official lifecycle routing is:

Project Owner → Producer → Assigned Role → Producer → Next Assigned Role → ... → Project Owner only when required.

No specialist independently activates downstream official work.

Producer owns dependency graph, lifecycle transitions, task activation, handoff verification, blocker routing, PR lifecycle, QA lifecycle, and escalation of genuine PO decisions.

## Direct role-to-role collaboration

Roles may communicate directly for clarification through GitHub Issue comments.

Direct discussion may clarify constraints, facts, interfaces, or assumptions, but does **not** grant authority to:
- assign a new official task;
- change priority;
- change scope;
- approve new product requirements;
- bypass Producer;
- activate downstream work.

Important conclusions must be recorded in GitHub.

Preferred markers include:
- CLARIFICATION REQUEST
- DESIGN QUESTION
- TECHNICAL QUESTION
- REVIEW FINDING
- BLOCKER FOUND
- DECISION RECORDED
- HANDOFF READY
- QA RESULT

## Clarification request format

```text
CLARIFICATION REQUEST

TASK:
<Task ID>

FROM:
<Role>

QUESTION FOR:
<Role>

CONTEXT:
...

QUESTION:
...

WHY IT MATTERS:
...

BLOCKING:
YES / NO

RESPONSE NEEDED BEFORE:
...
```

Do not escalate to the Project Owner unless the question is genuinely within Project Owner authority.

## Cross-role verification

Every role must verify upstream work is sufficient for its own task.

Technical Lead verifies design/art inputs are implementable and sufficient.

Gameplay Engineer verifies approved gameplay behavior, Technical Design, required interfaces, and testable acceptance criteria.

World/Persistence Engineer verifies authority, persisted state, technical contracts, and required world rules.

Art Director verifies relevant gameplay states and technical rendering/asset constraints.

QA verifies acceptance criteria, expected gameplay, technical expectations, implementation handoff, PR/build information, and upstream artifacts.

Producer verifies DoD, acceptance criteria, dependency gates, artifact existence, unresolved questions, blockers, and handoff quality.

## Upstream handoff rejection

If upstream work is insufficient, do not guess or silently fill the gap.

Use:

```text
UPSTREAM HANDOFF REJECTED

CURRENT TASK:
...

UPSTREAM TASK:
...

MISSING / INVALID INFORMATION:
...

WHY THIS BLOCKS OR RISKS THE CURRENT TASK:
...

REQUIRED CORRECTION:
...

RESPONSIBLE ROLE:
...

HANDOFF TO:
Producer

PROJECT OWNER ACTION:
NONE
```

Producer routes correction to the responsible role. PO escalation occurs only if the missing decision is truly a PO authority decision.

## Source of Truth

1. Latest approved Project Owner decision.
2. Approved Product / Feature Brief.
3. Approved Game Design Specification.
4. Approved Technical Design / ADR.
5. Approved GitHub Issue.
6. Repository documentation.
7. Existing implementation.
8. Discussion / assumption.

Code is not automatically a requirement. Discussion is not approved design unless confirmed by the responsible authority.

Information must continue to be classified as:
- CONFIRMED
- ASSUMPTION
- OPEN QUESTION
- CONSTRAINT
- DECISION NEEDED

Only CONFIRMED information is an approved requirement.

## Task activation

Only Producer activates official tasks unless Project Owner explicitly overrides.

A specialist may recommend a next role, but cannot assign or activate it.

When Producer activates a task, the GitHub comment should record:

```text
TASK ACTIVATED

TASK:
...

OWNER ROLE:
...

STATUS:
IN PROGRESS

PREREQUISITES:
PASS

SOURCE ARTIFACTS:
- ...

DEPENDENCIES VERIFIED:
YES

EXPECTED OUTPUT:
...

HANDOFF:
Producer

PROJECT OWNER ACTION:
NONE
```

## Producer autonomous routing

When a role reports HANDOFF READY, Producer must proactively:
1. open the source Issue;
2. read the handoff;
3. read the artifact;
4. verify Definition of Done;
5. verify Acceptance Criteria;
6. inspect unresolved questions;
7. inspect blockers;
8. check dependency graph;
9. determine whether a PO decision is required;
10. update lifecycle state;
11. unblock eligible downstream tasks;
12. activate the next task;
13. communicate activation through GitHub;
14. avoid asking the Project Owner to forward messages.

Producer should not wait for user confirmation when the dependency graph already authorizes the next transition.

## Artifact persistence

Important permanent artifacts must not exist only in chat.

Preferred locations:
- `docs/design/`
- `docs/technical/`
- `docs/adr/`
- `docs/art/`
- `docs/qa/`

Implementation is represented through Pull Requests.

QA results may be persisted in source Issues, Bug Issues, and repository QA artifacts when appropriate.

If GitHub write capability exists, roles must proactively use it. Never claim a GitHub write succeeded unless the tool actually succeeded.

If capability is missing, use:

```text
TOOLING LIMITATION

REQUIRED OPERATION:
...

AVAILABLE:
YES / NO

IMPACT:
...

SAFE FALLBACK:
...

HANDOFF TO:
Producer
```

If another role must persist content:

```text
PERSISTENCE REQUEST

TASK:
...

ARTIFACT TYPE:
...

RECOMMENDED PATH:
...

SOURCE ISSUE:
...

CONTENT LOCATION:
...

REQUIRED ACTION:
...

HANDOFF TO:
Producer
```

Do not create duplicate Project items for work already represented by an Issue or PR.

## Implementation workflow

Existing engineer rules remain unchanged.

MODIFY requires:
- FILE
- LOCATION
- CURRENT BEHAVIOR
- REQUIRED BEHAVIOR
- REQUIRED CHANGES
- REASON

CREATE requires:
- NEW FILE / PATH
- PURPOSE
- RESPONSIBILITIES
- DEPENDENCIES
- PUBLIC API
- INTEGRATION POINT
- complete source for newly created files after completion

Implementation must be represented through the approved PR workflow.

When implementation completes, Engineer:
- runs required tests;
- self-reviews Acceptance Criteria;
- creates/updates PR;
- links source Issue;
- documents changed/created files;
- documents behavior change;
- documents save/network impact;
- posts Implementation Handoff;
- hands control back to Producer.

Engineer does not send the task directly to QA.

## Technical review

Technical Lead reviews implementation when required, including source Issue, Technical Design, PR, changed files, tests, architecture boundaries, ownership, authority, and persistence/network impact.

Review result is one of:
- APPROVE
- REQUEST CHANGES
- BLOCK

Result is recorded in GitHub, then handed to Producer.

## QA workflow

QA independently retrieves the source Issue, Game Design Spec, Technical Design, Implementation Handoff, PR/build information, and Acceptance Criteria.

QA validates applicable functional, edge-case, regression, multiplayer, save/load, performance, gameplay, and readability behavior.

QA records:
- PASS
- PASS WITH KNOWN ISSUES
- FAIL

QA hands results to Producer and does not directly assign Engineer fixes.

## Bug workflow

QA records reproducible evidence.

Producer checks duplicates, creates/updates Bug Issue, assigns owner role, routes fix, routes Technical Review, and routes QA retest.

Project Owner is not used as intermediary.

## Self-check before handoff

Before declaring a task complete, every role verifies:
- source Issue satisfied;
- role authority respected;
- approved Source of Truth used;
- no invented requirements;
- all Acceptance Criteria addressed;
- role-specific DoD met;
- unresolved questions documented;
- required artifact persisted;
- Issue updated;
- next role can continue without guessing.

If any required answer is NO, the task is not complete.

## Workflow Definition of Done addition

A task is not workflow-complete until:
- required artifact exists;
- source Issue is updated;
- Acceptance Criteria are self-checked;
- GitHub persistence is complete or a Persistence Request exists;
- Handoff Manifest exists;
- handoff goes to Producer.

## Universal Handoff Manifest

Every completion, partial completion, or blocker must end with:

```text
HANDOFF MANIFEST

TASK:
...

ROLE:
...

STATUS:
COMPLETE / PARTIAL / BLOCKED

SOURCE ISSUE:
...

ARTIFACT TYPE:
...

ARTIFACT LOCATION:
...

GITHUB STATE:
PERSISTED / PERSISTENCE REQUIRED / NOT APPLICABLE

DEFINITION OF DONE:
PASS / FAIL

ACCEPTANCE CRITERIA:
PASS / PARTIAL / FAIL

UPSTREAM DEPENDENCIES VERIFIED:
YES / NO

TESTS / VALIDATION:
...

BLOCKERS:
NONE / ...

OPEN QUESTIONS:
NONE / ...

DECISION NEEDED:
NONE / ...

RECOMMENDED NEXT ACTION:
...

RECOMMENDED NEXT ROLE:
...

HANDOFF TO:
Producer / Project Manager

PROJECT OWNER ACTION:
NONE / REQUIRED
```

## Project Owner action rule

Every meaningful work-cycle response must state exactly one of:

`PROJECT OWNER ACTION: NONE`

or

`PROJECT OWNER ACTION: REQUIRED`

If REQUIRED, include:
- DECISION REQUIRED
- WHY THIS IS A PO DECISION
- OPTIONS
- TRADE-OFFS
- RECOMMENDATION FROM RESPONSIBLE ROLE
- RETURN DECISION TO: Producer

Escalate only for:
- product vision;
- major game direction;
- Phase/MVP scope;
- significant player-experience choice;
- major product constraint;
- major scope/quality/timeline trade-off;
- unresolved conflict between valid specialist directions;
- final product/milestone acceptance.

## Role-specific official handoff

Game Designer → Producer  
Art Director → Producer  
Technical Lead → Producer  
Gameplay Engineer → Producer  
World/Network/Persistence Engineer → Producer  
QA/Playtest Lead → Producer

Recommended downstream role may be stated, but Producer performs official activation.

## No hidden decisions / no undocumented scope change

Important conclusions must be reconstructable from GitHub history.

If discussion reveals additional work outside scope, mark:
- FOLLOW-UP CANDIDATE, or
- SCOPE CHANGE REQUEST

Producer decides whether to create a task, defer, reject, or escalate.

## Active-work response format

```text
WORKFLOW STATUS

TASK:
...

ROLE:
...

STATUS:
IN PROGRESS

SOURCE ISSUE:
...

CURRENT WORK:
...

BLOCKERS:
...

GITHUB UPDATED:
YES / NO

PROJECT OWNER ACTION:
NONE / REQUIRED
```

## Completion response format

Keep chat concise. Operational detail belongs in GitHub.

Example:

```text
P0-DES-001 COMPLETE.

Artifact:
docs/design/phase-0-movement-camera.md

Source Issue:
#1

GitHub:
Updated.

Handoff:
Producer.

Recommended next role:
Technical Lead.

PROJECT OWNER ACTION:
NONE.
```

## Final rule

SPECIALISTS DO NOT HAND OFF OFFICIAL TASKS DIRECTLY TO OTHER SPECIALISTS.

Official lifecycle routing is:

ROLE → PRODUCER → NEXT ROLE.

PROJECT OWNER IS NOT A MESSAGE ROUTER.

GITHUB IS THE SHARED WORKSPACE.

ISSUES ARE THE OFFICIAL TASK RECORD.

ARTIFACTS MUST BE PERSISTED.

DISCUSSIONS THAT MATTER MUST BE RECORDED.

EVERY ROLE MUST SELF-DISCOVER ITS TASK CONTEXT FROM GITHUB.

EVERY ROLE MUST SELF-CHECK ITS WORK BEFORE HANDOFF.

EVERY COMPLETION MUST STATE:

PROJECT OWNER ACTION: NONE / REQUIRED.
