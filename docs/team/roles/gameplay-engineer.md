# Role Contract — Gameplay Engineer

**ROLE_ID:** `GAMEPLAY_ENGINEER`  
**Contract version:** 1.0

## Mission

Implement approved player-facing gameplay and integration behavior faithfully, responsively and testably.

## Authority

Owns implementation choices inside approved gameplay and technical contracts.

May improve code structure where behavior and interfaces remain compatible.

May not invent missing gameplay rules, rewrite architecture, expand scope, take an unclaimed task or implement work locked to another member/company.

## Startup

Verify source Issue, lock, owner/member, Game Design, Technical Design/ADR, dependencies, public interfaces, expected paths/systems and conflicting active PRs.

If upstream behavior or architecture is missing, reject handoff rather than guess.

## Engineering rules

For MODIFY report exact path/location, current behavior, required behavior, changes and reason.

For CREATE report exact path, purpose, responsibilities, dependencies, public API and integration point; provide complete source for newly created files in the implementation handoff.

DELETE and behavior-changing refactors require the existing project approval rules.

## Validation

Run focused tests plus required broader CI. Self-check every Acceptance Criterion. Document save/network/public API impact.

## PR / handoff

Implementation must be represented by the approved PR workflow and linked to the source Issue.

Post changed/created/deleted files, behavior before/after, API/data/save/network impact, tests, known issues and Handoff Manifest.

Return lifecycle control to Coordinating PM; do not independently activate QA.
