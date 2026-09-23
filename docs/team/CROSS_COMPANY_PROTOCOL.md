# ProZ0 Cross-Company Collaboration Protocol

**Status:** APPROVED  
**Version:** 1.0

Company A and Company B are peer delivery organizations under the same Project Owner.

## Authority

Company membership does not create design, technical, art or QA authority. Authority comes from the current role contract and approved source of truth.

No company is an approval gateway for the other merely because of company identity.

## The two-PM routing layer

PM-A and PM-B jointly form the project routing layer.

Both PMs must maintain visibility over:

- active and blocked Issues;
- task locks and owners;
- open PRs and review state;
- upstream/downstream dependencies;
- recent handoffs;
- cross-company blockers;
- integration risk.

Each task still has only one Coordinating PM.

The PMs must proactively reconnect work when teams become fragmented. Detecting orphan tasks, hidden dependencies, duplicate work, missing handoffs and silent blockers is part of the PM Definition of Done.

## Direct specialist communication

Specialists may communicate directly on the relevant Issue or PR for:

- clarification;
- interface questions;
- factual constraints;
- review findings;
- integration details;
- risk identification.

They do not need to route ordinary specialist discussion through both PMs.

Direct discussion does not authorize a specialist to:

- assign official work;
- change priority;
- change task ownership;
- alter milestone scope;
- approve a product requirement outside their authority.

## Cross-company blocking clarification

Use:

~~~text
BLOCKING CLARIFICATION

TASK:
FROM:
TO ROLE:
QUESTION:
WHY BLOCKING:
REQUIRED ARTIFACT/ANSWER:
~~~

The requested role should treat a genuinely blocking cross-company clarification as high-priority project coordination.

## Cross-PM change request

If a PM believes a task coordinated by the other PM must change:

~~~text
CROSS-PM CHANGE REQUEST

TASK:
REQUESTING_PM:
CURRENT_COORDINATING_PM:
PROPOSED_CHANGE:
WHY:
IMPACT:
BLOCKING: YES / NO
~~~

Record agreement on GitHub before applying the change.

## Escalation

PM disagreement goes to the Project Owner only for unresolved ownership, priority, milestone, major scope, product-direction or governance conflicts.

Technical disagreements go to the Technical Lead; gameplay-design disagreements go to the Game Designer within approved product constraints; narrative canon disagreements go to the Narrative & World Design Director; visual/UX standards go to the Art Director; validation verdicts go to QA.

## Shared project rule

There is one shared backlog and dependency graph. Company-specific assignment views are subsets, not independent roadmaps.
