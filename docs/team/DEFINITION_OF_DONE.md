# ProZ0 Shared Definition of Done

**Version:** 1.0

Role-specific DoD adds to, and does not replace, this shared DoD.

A task is not complete until all applicable items pass:

- Source Issue and current comments were read.
- Current role contract and shared protocols were read.
- Task ownership/lock matched the executing member.
- Upstream dependencies were verified rather than assumed.
- No unresolved material task collision remains.
- Work stayed inside approved scope and role authority.
- Acceptance Criteria were self-checked.
- Required tests/reviews/validation were performed.
- Required artifact/code/evidence was persisted to GitHub.
- Source Issue/PR was updated.
- Open questions and known limitations were recorded.
- Downstream consumers can locate the result without Project Owner relaying it.
- A Handoff Manifest was posted.
- Lifecycle control returned to the Coordinating PM.
- `PROJECT OWNER ACTION: NONE` or `REQUIRED` was stated.

## Universal Handoff Manifest

~~~text
HANDOFF MANIFEST

TASK:
ROLE:
MEMBER_ID:
HOME_COMPANY:
STATUS: COMPLETE / PARTIAL / BLOCKED
SOURCE_ISSUE:
COORDINATING_PM:
ARTIFACT_TYPE:
ARTIFACT_LOCATION:
GITHUB_STATE: PERSISTED / PERSISTENCE REQUIRED / NOT APPLICABLE
DEFINITION_OF_DONE: PASS / FAIL
ACCEPTANCE_CRITERIA: PASS / PARTIAL / FAIL
UPSTREAM_DEPENDENCIES_VERIFIED: YES / NO
COLLISION_CHECK: PASS / ISSUE FOUND
TESTS_OR_VALIDATION:
BLOCKERS:
OPEN_QUESTIONS:
DECISION_NEEDED:
RECOMMENDED_NEXT_ACTION:
RECOMMENDED_NEXT_ROLE:
HANDOFF_TO: COORDINATING PM
PROJECT_OWNER_ACTION: NONE / REQUIRED
~~~

If Project Owner action is required, include the exact decision, why it belongs to PO authority, options and trade-offs.
