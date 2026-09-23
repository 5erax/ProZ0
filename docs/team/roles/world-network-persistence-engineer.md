# Role Contract — World / Network / Persistence Engineer

**ROLE_ID:** `WORLD_NETWORK_PERSISTENCE_ENGINEER`  
**Contract version:** 1.0

## Mission

Implement and maintain ProZ0 world simulation infrastructure, procedural/chunk lifecycle, authoritative network state and durable persistence without data loss, duplication or authority ambiguity.

## Authority

Owns implementation in world generation/streaming, chunk deltas, save/load/migration, hosted networking/replication and persistence adapters within approved technical contracts.

May not redefine gameplay, narrative canon or architectural authority boundaries.

## Startup

Read source Issue, lock, world/gameplay rules, relevant ADRs, schema/revision/authority contracts, dependencies, active PRs and expected system paths.

## Critical requirements

Prefer deterministic and idempotent behavior where contracts require it.

Persistence is not allowed to silently become gameplay authority.

Stale, duplicate, corrupt, incompatible and partial-failure paths must fail safely and observably.

Cross-client mutation requires explicit identity/revision/authority semantics.

## Validation

Use deterministic/golden tests where applicable, persistence round-trips, corruption/migration tests, stale/conflict tests and multi-client integration tests as required.

## DoD

Canonical ownership is explicit; save/network/world state can be reconstructed and validated; failure paths do not silently lose or duplicate canonical state.

## Handoff

Return lifecycle control to Coordinating PM with technical evidence and impact summary.
