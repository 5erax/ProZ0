# Blueprint coverage and escrow handoff

Checkpoint F1; source of scope: #240 / Owner item 26. This extends the existing expedition authority, not a second building ledger.

## Coverage matrix

| Group | Blueprint IDs | Completion authority |
| --- | --- | --- |
| Storage and work | supply-cache, field-workbench | canonical crate/container and workbench |
| Field living | camp-bed, campfire, rain-collector, field-lab, trail-beacon | expedition facility state |
| Husbandry and farming | livestock-pen, poultry-coop, greenhouse, irrigation-tank, compost-bin | living authority consumes the completed expedition facility |
| Processing and home | clay-kiln, smoking-rack, grain-mill, tannery, field-cabin | living/expedition station and rest contracts |
| Colony utilities | colony-power, colony-condenser | existing power allocation and condenser machine-output container |
| Attached shelter | attached-habitat | existing landing connector graph; R chooses lab side |

All 20 can be planned with an empty bag. The fixed landing lab is a landmark, not a player blueprint. The original fixed cultivation/pen review sites remain legacy review systems; open-world farming and pens use plots/livestock-pen, not duplicate fixed-site construction. Remote housing uses Field Cabin; the canonical attached habitat intentionally remains a lab connector module.

B → Expedition blueprints · materials later → Plan → click nearby explored ground. R rotates; for attached habitat R chooses its landing connector. A blueprint consumes nothing. Contribute transfers only carried outstanding inputs into escrow; Complete creates the real facility once. Water condenser creates machine-output rather than a crate-shaped ledger. Utilities retain existing one-per-world caps and power radius, rather than inventing a second power network.

## Change type / conservation

At a placed blueprint, E or click → Change blueprint type → choose a facility → Change & refund surplus. The same plan ID, owner and orientation remain. Shared materials carry forward up to the new bill; excess returns atomically to inventory. Missing materials are not charged automatically. The candidate footprint/ground/range is assessed before refund. Full bag, invalid ground, stale inventory/state or foreign ownership retain the original blueprint and escrow. Same operation replay returns its receipt and does not refund twice. Move/rotate uses the same position intent as its ghost. Changing into an attached habitat snaps to the selected lab connector; changing back retains the current world position.

**Capacity tuning decision:** no invisible refund deletion or forced bag overflow. If surplus does not fit, store/drop items and retry; the intact escrow remains recoverable through the plan. A dedicated overflow recovery crate is not implemented in F1. All bills use current field costs or original utility kit ingredient quantities. Original kits remain valid in the core build flow; no item catalog or generation fingerprint changes in F1.

## Interfaces

- ExpeditionContent: 20 data definitions; canonical utilities appended, old atlas ordering unchanged.
- ExpeditionCommand: additive action `replace`, optional `replacementDefinition`; no persisted plan field/version change.
- ExpeditionAuthority: planPosition/planIntent normalize habitat connector coordinates; spatial query, owner/range/alive/revision, candidate validation before refund; existing receipts cap 96.
- ItemTransactionAuthority.commitPrepaidConstruction: recognizes crate and machine-output kinds only; output container starts empty.
- ExpeditionAssets: canonical utility artwork reused; old 7+10 atlas indexing unchanged.
- ExpeditionOverlay: replacement chooser, explicit capacity feedback, actual bill after replacement; text/select keyboard editing does not route into rotation/movement.

## Validation and outstanding release gates

20-definition domain matrix plans with no payment, rejects early completion, supplies/deposits once, completes and reconstructs canonical buildings. Three canonical utility Save V2 integration cases verify structures, power, machine-output and habitat connection endpoints/occupancy. Save V2 historically normalizes connection IDs from endpoints, so the test compares persistent graph semantics rather than requiring the transient reservation connection ID.

Replacement tests cover shared escrow/refund, collision rejection, replay, stale revision, receipt reconstruction and full-bag rollback. Browser UI fixture covers funded cache → workbench change → missing-material feedback → save/reopen retaining one plan and the fiber refund. This fixture explicitly grants materials; it is not novice acceptance or a natural gathering journey.

Natural expedition E2E, final full regression/required CI and Owner visual review still gate integration. Issue #240 stays OPEN at this checkpoint. Co-op does not accept expedition commands yet: this remains the requested solo completion path; no fabricated co-op parity claim.
