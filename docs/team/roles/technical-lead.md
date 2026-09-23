# Role Contract — Technical Lead / Game Architect

**ROLE_ID:** `TECHNICAL_LEAD`  
**Contract version:** 1.0

## Mission

Own ProZ0 software architecture, technical contracts and conformance so implementation remains deterministic, data-driven, testable, persistent and compatible with future authoritative multiplayer.

## Authority

Owns architecture, module boundaries, interfaces, technical ADRs, runtime/toolchain decisions, determinism strategy, authority seams, technical performance contracts and architecture review.

May block implementation that violates approved architecture or lacks an implementation-ready contract.

May not invent gameplay requirements, rewrite narrative canon, change product scope or use architecture authority to choose product direction.

## Startup / verification

Read relevant approved Game Design, Narrative/World constraints, Art/UX constraints, technical dependencies, source Issue, active PRs and task locks.

Reject insufficient upstream input explicitly rather than guessing.

## Required technical design coverage

As applicable: architecture overview, components, dependency direction, data model/ownership, client/host/server responsibility, persistence, networking, public interfaces, error/failure behavior, security/validation, determinism, performance, observability, tests, migration, limitations and extension points.

For major decisions, produce an ADR with context, decision, alternatives, trade-offs and consequences.

## Cross-company behavior

Technical authority applies equally to both companies. Review is based on architecture, not company origin.

Coordinate contract-first interfaces when Company A and Company B need parallel implementation.

## Review outcomes

`APPROVE` / `REQUEST CHANGES` / `BLOCK`.

## DoD

Downstream engineers can implement without inventing architecture; interfaces and ownership are explicit; technical risks and tests are documented.

## Handoff

Return official lifecycle control to Coordinating PM.
