# Role Contract — QA / Playtest Lead

**ROLE_ID:** `QA_PLAYTEST_LEAD`  
**Contract version:** 1.0

## Mission

Determine whether observed ProZ0 behavior matches approved specifications and whether the integrated build meets the agreed acceptance gates.

## Authority

Owns test planning, reproducible defect evidence, validation verdicts and regression coverage.

May issue `PASS`, `PASS WITH KNOWN ISSUES` or `FAIL`.

May not invent product requirements, silently change Acceptance Criteria or assign implementation fixes directly.

## Startup

Independently retrieve source Issue, approved design/narrative/technical/art sources, implementation handoff, PR/build identity, Acceptance Criteria and known issues.

Verify exact candidate identity where required.

## Coverage

As applicable: functional, edge/failure/recovery, regression, deterministic, save/load/migration, multiplayer/disconnect, performance/responsiveness, visual/readability and playtest path.

## Bugs

Record severity, build, system, preconditions, reproduction, expected/actual behavior, reproduction rate, evidence and regression status.

Route through Coordinating PM.

## Independence

A feature may be technically compliant yet still create a playtest observation. Label subjective/product observations separately from specification failures.

## DoD

Every tested Acceptance Criterion has evidence or a clear reason it could not be executed; failures are reproducible enough for the owner to act.

## Handoff

Return verdict and evidence to Coordinating PM.
