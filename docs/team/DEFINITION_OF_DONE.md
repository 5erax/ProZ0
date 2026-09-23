# Definition of Done and handoff

**Version:** 2.0.0. Role-specific evidence adds to these requirements.

## Separate progress stages

- IMPLEMENTATION_COMPLETE: the owner completed the authorized deliverable and self-checks.
- REVIEW_PENDING / QA_PENDING: external gates remain; this is not itself an implementation failure.
- ACCEPTED / DONE: the authorized acceptance owner verified all criteria for the Issue's declared acceptance stage and mapped remaining end-to-end criteria to their real downstream task.
- PARTIAL / BLOCKED: unfinished scope and reason are explicit.

## Common completion evidence

Identity, approved pack and task ownership were verified; relevant sources/dependencies were read; no unresolved material collision; scope and authority respected; criteria self-checked; applicable tests/reviews performed; artifacts and known limits persisted where available/authorized; consumer and required next role identified; PM-accountable lifecycle record updated. If persistence/tooling is unavailable, return PERSISTENCE_REQUIRED and copy-ready evidence, never a fake GitHub action.

Do not require a final integrated test to pass before authorizing the task that implements its dependency. Do not silently remove that test either: stage reconciliation requires an explicit source-Issue record by PM and the relevant domain owner.

## Standard handoff

```text
TASK / SOURCE_ISSUE:
MEMBER_ID / ROLE_ID / HOME_COMPANY:
PACK_VERSION / PACK_COMMIT:
COORDINATING_PM / LOCK_REVISION:
STAGE: IMPLEMENTATION_COMPLETE / REVIEW_PENDING / QA_PENDING / ACCEPTED / PARTIAL / BLOCKED
ARTIFACT_LINK / EXACT_HEAD_OR_BUILD:
PLAYER_OR_DELIVERY_RESULT:
AC_SELF_CHECK: <criterion results, not-run and reason>
VALIDATION: <actually executed checks and evidence>
REQUIRED_EXTERNAL_GATES: <reviewer, pending/verdict, version>
DEPENDENCIES_AND_COLLISION_CHECK:
LIMITS / BLOCKERS:
DOWNSTREAM_CONSUMER / INTEGRATION_OWNER:
NEXT_ACTION / NEXT_MEMBER / DISPATCH_STATE:
GITHUB_STATE: PERSISTED / PERSISTENCE_REQUIRED / NOT_APPLICABLE
PROJECT_OWNER_ACTION: NONE / REQUIRED — <specific decision>
```

For a low-risk documentation clarification use compact handoff: task/member, exact artifact, result, checks, limits and next owner. Link the existing ownership and source records instead of duplicating all fields. Changes to authority, canonical gameplay, schema, save/network behavior or release policy use the standard handoff.

The user-facing reply follows COMMUNICATION_PROTOCOL and stays concise. Full source code in comments is unnecessary when an exact PR/commit is accessible. Tests are proportional to impact and project-required gates; no “test passed” claim without execution/inspection evidence.
