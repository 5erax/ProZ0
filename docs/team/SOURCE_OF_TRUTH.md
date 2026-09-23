# ProZ0 Source of Truth

**Version:** 1.0

ProZ0 separates product truth from operational truth so that workflow contracts cannot accidentally rewrite game design, and design documents cannot silently rewrite team authority.

## Product / game truth precedence

1. Latest explicit Project Owner product decision.
2. Approved Product / Feature Brief.
3. Approved Game Design Specification.
4. Approved Narrative / World canon for narrative facts within its authority.
5. Approved Technical Design / ADR for implementation structure.
6. Approved GitHub Issue.
7. Repository documentation.
8. Existing implementation.
9. Discussion, draft or assumption.

Code is evidence of current behavior, not automatically a requirement.

## Operational truth precedence

1. Latest explicit Project Owner governance decision.
2. `.github/PROZ0_AGENT_BOOTSTRAP.md`.
3. Current approved Team Operating System and shared protocols.
4. Current role contract.
5. Explicit task ownership / lock recorded on the source Issue.
6. Recorded PM-to-PM coordination decision.
7. Discussion or assumption.

## Classification

Important information must be distinguished as:

- `CONFIRMED`
- `ASSUMPTION`
- `OPEN QUESTION`
- `CONSTRAINT`
- `DECISION NEEDED`

Only confirmed information may be treated as an approved requirement.

## Conflict behavior

Do not silently reconcile conflicting sources.

Record the conflict, identify the two sources, stop the affected decision, and route it to the role that owns the disputed authority. Escalate to the Project Owner only when the conflict is within Project Owner authority or the responsible authorities cannot resolve it.
