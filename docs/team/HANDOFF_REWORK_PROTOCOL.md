# Handoff and rework loop

**Version:** 2.1.0. Use the canonical manifest in [DEFINITION_OF_DONE](DEFINITION_OF_DONE.md), not a parallel report format.

## Transition ownership

| Event | Actor and action | Persisted result / guard |
|---|---|---|
| Deliverable self-check complete | Producer posts manifest with exact artifact/head, each criterion, limits, named reviewer/consumer and next action. Directly requests review if the route is authorized. | REVIEW with lock retained, or request to PM to set it if stage mutation was not delegated. Never DONE from self-check alone. |
| Review input is usable | Named reviewer discovers request in source/PR queue, acknowledges when actually starting, validates exact version. | Review evidence and APPROVE / REQUEST CHANGES / BLOCK under domain authority. Missing capability is BLOCK, not artifact FAIL. |
| QA is ready | Authorized PM or conditional recipient checks candidate, dependencies and existing QA assignment. | Existing QA task transitions only under its grant. Merging one PR alone never activates final #59. |
| Review / QA fails | Reviewer records exact artifact/build, failed criterion, expected/actual, repro, severity, evidence and bounded correction; addresses original owner directly, keeps PM visible. | `REWORK_STATUS: CHANGES_REQUESTED`; existing lock retained. No new duplicate bug Issue for the same correction. |
| Owner next runs | Fresh-read finding/head/lock. Within retained scope and recorded correction delegation, acknowledge and resume correction without PO dispatch. Otherwise PM reconciles scope/lock first. | IN_PROGRESS by authorized writer; preserve failed evidence and original criterion. New scope or released/DONE lock needs new authorization. |
| Correction complete | Original owner fixes, reruns affected tests plus required checks, posts new exact head and criterion-to-fix evidence, requests same required reviewer. | REVIEW / QA_PENDING; old approval cannot stand for changed behavior. |
| Reviewer passes | Reviewer states criteria and version actually covered; unresolved criteria remain visible. | PM verifies remaining gates, freshness and merge permission before acceptance/merge/closure. QA PASS is not PO product acceptance. |
| Accepted / dependency stage ready | Producer and PM inspect downstream edges and update readiness under their delegation. | Conditional guarded activation or a concrete PM activation request; record next member/action and actual dispatch state. |

`CHANGES_REQUESTED` is a review/rework finding, not a new lock enum. `READY_FOR_REVIEW` and `READY_FOR_QA` from historical messages map to REVIEW and QA readiness respectively; they never imply acceptance. A PM records rework delegation at activation so routine in-scope fixes do not need a new dispatch. Legacy tasks without delegation keep their existing correction route until PM reconciles it.

## Acceptance and evidence freshness

Separate implementation completion, domain review, technical checks, integration QA, release identity, human evidence and PO acceptance. A finding may invalidate only some of these, but that scope must be justified by the responsible verifier. Accepted subsystem or document tasks may finish while their explicitly mapped integrated criteria remain open downstream.

Before merge, the authorized merger checks the expected head, current required verdicts/checks, unresolved discussions and overlap with recently merged work. Revalidate after integrating shared-path changes. Do not enable auto-merge or merge merely because repository credentials permit it. Evidence-only PRs may remain unmerged if the accepted evidence workflow requires an unchanged candidate; preserve the durable evidence link.

## Failed delivery, missing reviewer and interruption

Producer checks whether the handoff was merely POSTED, actually delivered or acknowledged. On the recorded next check/deadline, PM follows the available authorized endpoint or named backup; no fixed wall-clock timeout invents reviewer availability. No acknowledgement means pending, not approval. Preserve the lock and continue compatible authorized work with correction capacity.

If source evidence expires or an artifact is inaccessible, record the gap and regenerate/retain it through the authorized owner before using it for a gate. If tools cannot write, prepare the exact handoff and report PERSISTENCE_REQUIRED; no downstream activation is claimed. Before ending a session, update the checkpoint described in COMMON_EXECUTION_CONTRACT.
