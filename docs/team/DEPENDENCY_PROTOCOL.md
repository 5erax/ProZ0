# Dependency readiness protocol

**Version:** 2.1.0. Inherits source precedence and task-lock authority.

An Issue relationship is not automatically a blocker. Readiness describes a specific consumer action; it is separate from lock state and final acceptance.

## Edge record

On the consumer Issue record `UPSTREAM_ISSUE | ARTIFACT@VERSION | TYPE | REQUIRED_STAGE | CONSUMER_ACTION | VERIFIER | EVIDENCE | RECHECK_TRIGGER`. Use HARD, SOFT, INFORMATIONAL or PARALLEL_INTERFACE. For SOFT record baseline, assumption and reconciliation deadline/trigger; for PARALLEL_INTERFACE record stable API/data ownership, excluded shared paths and integration owner.

| Type | Meaning |
|---|---|
| HARD | This action cannot safely execute without the input/approval. |
| SOFT | Independent work can use the established baseline; final affected integration still needs reconciliation. |
| INFORMATIONAL | Context or visibility only; no blocking edge. |
| PARALLEL_INTERFACE | Separate authorized locks may proceed against an agreed versioned interface with integration checks. |

Existing hard dependencies remain hard until Coordinating PM and relevant domain owner record why the required action can safely proceed. A role may propose reclassification, not silently downgrade a gate. Phase, human, data integrity and independent-review requirements are never removed to break a cycle.

## Evaluate evidence, not the Issue checkbox

| Input state | Consumer behavior |
|---|---|
| OPEN / unavailable | Block the hard-dependent portion; use only documented soft baseline elsewhere. |
| COMPLETED | Check the actual deliverable, acceptance stage and current relevance; DONE is an index, not proof. |
| ARTIFACT_READY | Open upstream may be consumable if required stage is approved and source Issue authorizes consumption; preserve pending final acceptance. |
| INVALID | Missing, corrupt, rejected or wrong-stage evidence cannot satisfy the edge; return to source owner. |
| STALE | Compare the changed head/spec/build; seek renewed verdict for affected criteria. |
| REPLACED | Follow an explicit supersession record, compare interfaces/requirements and update consumer reference with authority. |

Read the exact file/build, source criterion, approval/verdict author and revision. Do not equate CI success with gameplay/design/visual/listening acceptance. An unmerged proposal is not an approved specification just because it is readable. Record READY, PARTIAL or BLOCKED for the consumer action, including the unsatisfied edge and next resolver. These are readiness values, not additional LOCK_STATUS values.

## On upstream change

The producer searches source backlinks, downstream fields and relevant open Issues/PRs across both companies. Post one handoff/update per affected scope with exact version and changed readiness. Each consuming lifecycle owner re-evaluates all its hard edges, lock, capacity and phase; update only under authority. If conditions of a named unexpired conditional grant pass, its authorized recipient executes the guarded transition. Otherwise PM activates or records why not. Readiness is not dispatch acknowledgement.

Design/spec changes enumerate affected implementation, content, assets and QA cases; preserve valid unaffected evidence only with a recorded diff-based justification by the relevant reviewer/PM. If two PRs touch the same seam, independently green CI does not prove the combined candidate: serialize integration and validate the resulting head.

## Current repository examples (refresh live before action)

- #125 design can proceed while #127 corrects persistence: policy decision and lifecycle internals are distinct; UI wiring still needs both and #123 closure.
- #104 may supply explicitly approved portions to #123 while four disputed semantic lines await focused A-GD review. Do not infer approval of those lines from the rest.
- #110/#111/#114 are complementary inputs, not a serial company chain. Named A-GD/A-ART reviews may proceed in parallel where criteria are independent. #124 remains reserved until its explicit activation conditions pass.
- #128 after #123 and #129 after #127 retain their recorded sequencing. General WIP allowance cannot override the more restrictive live task.
- #80 remains gated on real listening even though files and technical checks exist; #59/#60 require their integrated/human/product gates. No artifact-stage label substitutes for them.
