# Phase 1 Presentation Gap & Visual Reference Traceability Review

**Task / Source Issue:** #138 / P1-UXSUP-005  
**Authoring member:** B-TD-01 / TECHNICAL_DESIGNER / COMPANY_B  
**Coordinating PM / lock:** B-PM-01 / PM-B / `PMB-P1-UXSUP-005-R1`  
**Status:** IMPLEMENTATION_COMPLETE / REVIEW_PENDING  
**Review baseline:** `main@0fc62cfeccfa1e1d62843db610ad262fa25f0b6d`  
**Scope:** documentation-only presentation/content traceability. No `src/**`, `assets/**`, gameplay, schema, runtime, save/network, or lifecycle mutation.

## 1. Purpose and authority boundary

The PO-provided UI image is a **Visual Direction Reference**, not a feature specification. This review maps only reference elements that can be traced to already-approved Phase 1 gameplay/art requirements and current Product Review behavior.

A reference element does **not** become Phase 1 scope merely because it appears visually desirable. New gameplay, hidden information, additional equipment/building/resource scope, production matchmaking, navigation aids, or progression expansion require their own authoritative source.

The raw PO image itself is not stored in #138, the repository, or the Project file sources retrievable during this review. Therefore this artifact does **not** claim pixel-for-pixel or aesthetic inspection of the source image. It traces the explicit reference-element inventory recorded by the PO instruction and PM-B on #138 against authoritative Phase 1 sources and current main.

## 2. Fresh baseline and source set

Fresh-read before authoring:

- #138 / P1-UXSUP-005 — claimed by B-TD-01; docs-only lock `PMB-P1-UXSUP-005-R1`.
- #122 / P1-POLISH-000 — implementation closure complete; exact-main quality gate passed; deployment/final-QA re-entry is the remaining lifecycle path.
- #37 / P1-ART-002 — DONE / DESIGN READY; authoritative Phase 1 asset/UI production specification.
- #124 / P1-POLISH-002 — DONE/CLOSED; accepted map/spatial implementation. It is an input and is not reopened here.
- #128 / P1-POLISH-005 — DONE/CLOSED; accepted inventory/logistics implementation merged to main. It is an input and is not reopened here.
- current `main` is exactly `0fc62cfeccfa1e1d62843db610ad262fa25f0b6d`.
- `docs/art/phase-1-asset-ui-production-spec.md` at blob `6604a631e5b5f803132f51c48f1c3550d8e273fb`.
- `docs/art/phase-1-visual-ui-readability-foundation.md` at blob `8d671a71577388eac4780a13f02f5f965f8a07ca`.
- current Product Review presentation/runtime source, including:
  - `src/client/presentation/Phase1HudOverlay.ts`;
  - `src/client/presentation/Phase1PresentationModel.ts`;
  - `src/client/presentation/Phase1ProductionAssets.ts`;
  - `src/client/runtime/Phase1PresentationBinding.ts`;
  - `src/client/runtime/Phase1ProductReviewPresentationSource.ts`;
  - `src/client/runtime/Phase1ProductReviewRuntime.ts`;
  - `src/client/runtime/Phase1ProductReviewControls.ts`;
  - `src/client/runtime/Phase1ProductReviewMapProjection.ts`;
  - `src/client/runtime/Phase1ProductReviewWorldRenderer.ts`;
  - current visual-catalog and Product Review E2E evidence tests.

### Gap codes used for every `P1 REQUIRED` row

- **A** — approved asset is truly missing on current main.
- **B** — required asset/state exists, but presentation/wiring is incomplete or weaker than the approved contract.
- **C** — runtime/interaction gap is already owned by Company A.
- **D** — no current Phase 1 gap found.
- **E** — visual-reference-only feature is not authorized for Phase 1.

## 3. Presentation traceability matrix

| REFERENCE ELEMENT | AUTHORITATIVE SOURCE / GAMEPLAY STATE | CURRENT PRODUCT REVIEW STATE | CLASSIFICATION | GAP | REQUIRED ICON / STATE / PRESENTATION | OWNER / REVIEWER | COLLISION / DEPENDENCY | RECOMMENDED ACTION |
|---|---|---|---|---|---|---|---|---|
| 1. Survival HUD / urgent status | #122 P0 normal-play target; #37 §§11–12; visual foundation HUD layers; canonical Health/Food/Water/Stamina/Temperature states | Current HUD projects authoritative meters, semantic severity, status icons, critical non-hue treatment, world/session context and bounded result toasts. #123 is accepted/merged. | P1 REQUIRED | **D — no gap.** No missing status asset or required survival state was proven. | Health, Food, Water, Stamina, Temperature icons + meter/state cue; urgent state by shape/value/treatment, not hue alone. | Company A presentation consumer; A-ART visual review, A-GD semantics when meaning changes | Do not reopen #123. Audio #79/#80 already DONE. | **NO TASK.** Preserve current accepted presentation and validate in Final QA. |
| 2a. Interaction prompt | #37 §12.4 and §14; master interaction vocabulary; #122 first-action/current-target target | Current HUD resolves production interaction icon and renders `[INPUT] VERB · TARGET`, authoritative reason, progress/context and target-consistent feedback. | P1 REQUIRED | **D — no gap.** | Interaction verb icon; exact target; available/blocked/unavailable state; short authoritative reason/progress. | Company A consumer; A-GD semantics, A-ART presentation | Must remain bound to resolved authoritative target; no silent retarget. | **NO TASK.** |
| 2b. Reference-style hotbar / larger quick-slot strip | No Phase 1 source requires a fixed multi-slot hotbar. #37 requires equipment/quick-use context, not a new slot mechanic. | Product Review exposes independent Weapon/Protection plus quick-use context and real inventory selection/actions from accepted #128. | PRESENTATION ONLY | Reference shell is not an approved P1 requirement. | Existing equipment/quick-use information may be restyled only without creating slot semantics. | A-ART / Company A consumer if later approved | New slots or hotbar inventory authority would collide with accepted #128 semantics. | **NO TASK.** Do not infer a new hotbar/slot system from the reference. |
| 3. Inventory | #37 §13.1; #122 inventory target; P1-DES-002; accepted #128 semantics | Current main has real selected-stack state; selected consume/equip/unequip/drop; chosen quantity; Storage transfer; selected outline; item icon/qty; authoritative feedback. | P1 REQUIRED | **B — presentation/wiring.** Item cells show condition as text but not the specified 2 px condition strip/unavailable overlay treatment. No asset is missing. | Item icon + quantity + selected/focus + condition strip/state where applicable + truthful action availability. | Company A presentation consumer; A-ART review; A-GD only if semantics/copy changes | #128 is DONE/CLOSED and must not be replaced or semantically redesigned. Existing item/status assets must be reused. | Record as **COMPANY-A CONSUMER ONLY** presentation delta; PM-A owns any implementation lifecycle. |
| 4. Equipment | #37 §6.1 and §12.3; #122 requires weapon/tool and Thermal Wrap independently; accepted #128 equip semantics | Weapon and Protection render independently with production item icons; Thermal Wrap world overlay exists; current slot shows numeric condition text/title and quick-use context. | P1 REQUIRED | **B — presentation/wiring.** #37 calls for an equipment condition bar/BROKEN presentation; current equipment row uses text condition rather than the specified visual bar treatment. Asset family already exists. | Independent weapon + protection; 24×24 icon; condition bar for condition-bearing active item; BROKEN state; Thermal Wrap badge/overlay. | Company A presentation consumer; A-ART review; A-GD semantics unchanged | Do not add equipment slots or change Q/T/V/equip semantics accepted in #128. | **COMPANY-A CONSUMER ONLY.** Reuse current item/HUD assets; no B-PIX work. |
| 5. Item detail / tooltip | #37 §13.1 and §15; #122 “detail on demand” | Selected item detail is present and follows real selection. It shows name, quantity and exact condition where applicable. A hover-card/large tooltip style is not required by source. | P1 REQUIRED | **D — no required item-detail gap.** Condition-strip issue belongs to Inventory row above, not a new tooltip system. | Selected/focused item detail on demand; exact condition where applicable; no persistent paragraph wall. | Company A consumer; A-ART/A-GD only for changed meaning | Must continue to consume #128 selection, not create a competing selector. | **NO TASK** for reference-style tooltip shell. |
| 6. Crafting | #37 §13.3; #122 product → ingredients → Have/Need with station distinct | Current Product Review shows recipe/output text, ingredient production icons at native 24×24, Have/Need, Workbench separation and blocked reason. #123 correction for ingredient readability is merged. | P1 REQUIRED | **B — presentation/wiring.** #37 requires an output icon/name/quantity; current craft heading renders output text while production icons are wired for ingredients. The item icon atlas already exists. | Output icon/name/qty; input icons/qty; Have/Need; station separately; AVAILABLE/blocked reason; no production queue implication. | Company A presentation consumer; A-ART review | Do not alter recipes, station rules or craft authority. Reuse `item_icon_atlas`. | **COMPANY-A CONSUMER ONLY** to bind existing output icon; no new asset. |
| 7. Weight / capacity | P1-DES-002; master gameplay; #37 §12.5 and §13.1–13.2 | Normal HUD shows authoritative current/max Weight and Volume plus carry state. Inventory selection works. While a primary panel is open, context HUD is hidden. Selected-item detail replaces the inventory-wide load summary; Storage label shows current kg/u but not its specified max values. | P1 REQUIRED | **B — presentation/wiring.** Capacity exists and is authoritative, but required current/max visibility is incomplete in open Inventory/Storage presentation. | Player weight/max + volume/max + carry state; container capacity/current-max where applicable; authoritative rejection cue. | Company A presentation consumer; A-ART/A-GD if wording changes | #128 logistics transactions are accepted; do not change thresholds, transfer semantics or capacity authority. | **COMPANY-A CONSUMER ONLY** presentation correction; no new capacity system or asset. |
| 8. Building cost / placement state | P1-DES-004; #37 §13.4 and build-preview rules; #122 bounded building clarity | Current Build panel cycles selected structure, shows source kit + available count, connector/rotation, VALID/INVALID/CONNECTOR preview and reason. World build preview consumes accepted production pattern/sprites. | P1 REQUIRED | **B — presentation/wiring.** #37 specifies a five-entry building catalog with structure icon, source kit, available count, build-cap state and selected state. Current panel exposes one selected entry at a time and does not render that full catalog/icon/build-cap presentation. No missing asset is proven. | Exactly five approved Phase 1 entries; icon/visual identity; kit/count; selected; placement validity/reason; world remains visible. | Company A presentation consumer; A-ART review; A-GD only for semantics | No new building family. Reuse existing structure/world/item/build-preview assets. | **COMPANY-A CONSUMER ONLY** if PM-A chooses to close the presentation delta. |
| 9. Map player/base/explored/unknown | #122 map target; #37 §13.7; accepted #124; accepted map-support sources | Current map renders explored cells, opaque unknown boundary, local player, facing where supported, Landing/Base, known ruin/cache/teammates, read-only marker detail and accepted distance bands. | P1 REQUIRED | **D — no gap.** | Accepted player/Base/explored/unknown/known-marker semantics only. | #124 accepted Company A implementation; A-GD/A-ART/A-WNP prior gates | **Hard boundary:** #124 DONE. No GPS/path line/radar/hidden reveal. | **NO TASK. Do not reopen #124.** |
| 10. Icon families | #37 exact asset production list | Current `Phase1ProductionAssets.ts` registers item, HUD-status, interaction, map-marker, progression, co-op identity, panel-skin and build-preview families. Current HUD/runtime consumes them; exact-main CI/build/evidence is green. | P1 REQUIRED | **D — no approved missing family proven.** Binary PNG decode through the connector is not used as absence evidence. | Existing approved families only; strong silhouette and pixel-safe scaling. | A-ART final visual authority; Company A consumption | B-PIX requires exact missing asset proof; none exists here. | **NO TASK / B-PIX ELIGIBLE: NONE.** |
| 11. Reusable UI pixel components | #37 panel-skin contract; visual-foundation panel/icon/grid rules | `ui_panel_skin` and `build_preview_pattern` are registered; Product Review applies panel skin corner, pixel borders, selected/disabled patterns and integer/pixelated treatment. | PRESENTATION ONLY | Reference styling alone does not prove a missing production asset. | Reuse existing pixel panel primitives/skin; whole-pixel layout; no anti-aliased vector dependency. | A-ART; Company A presentation consumer | Do not create a parallel UI kit because the reference looks richer. | **NO TASK.** Revisit only if a concrete required component is proven absent. |
| 12. Progression presentation | P1-DES-006; #37 §19; master early Level 3–4/prototype-profession requirement | Progression panel shows level, XP, skills, professions and quest summary. Progression atlas is registered. | P1 REQUIRED | **B — presentation/wiring.** The panel currently appends a generic subset of progression icons rather than binding icons/states to the actual unlocked skill/profession/objective rows. This is not an expanded progression requirement. | Level/XP; sourced Fieldcraft/Maintenance; Explorer/Engineer prototype badges; state-linked icons/toasts only for authoritative progression. | Company A presentation consumer; A-GD semantics; A-ART presentation | No five-future-profession set, research tree or permanent class selector. | **COMPANY-A CONSUMER ONLY** state-to-icon binding; no new progression gameplay. |
| 13. Pause / settings | Phase 1 sources only require usable controls/presentation; visual foundation explicitly defers a full accessibility settings menu and says panels must not pretend simulation is paused without Game Design authority. | H opens Product Review Controls; ESC closes active panel. No approved Pause/Settings gameplay contract was found. | P2+ | **E — reference-only for Phase 1.** | None required for Phase 1 beyond current usable controls. | Future PO/A-GD/A-ART/TL scope if selected | A pause state would create gameplay/runtime semantics if it affects simulation or hosted play. | **P2 CANDIDATE** only as future product/settings scope; no Phase 1 task. |
| 14a. Multiplayer / co-op identity | Master hosted 2–4 target; #37 §20 | Runtime/presentation supports teammate identity and map markers; `coop_identity_markers` is registered. Hosted gameplay uses shared approved rules/state. | P1 REQUIRED | **D — no co-op identity asset gap proven.** | Local + three teammate identity slots; shape plus accent; contextual labels/markers. | Company A hosted/runtime consumer; A-ART/A-GD as applicable | Do not duplicate hosted/network authority. | **NO TASK** from the visual reference. |
| 14b. Lobby / multi-planet / server browser | Master explicitly excludes production matchmaking/server-fleet behavior from Phase 1; PO direction excludes multi-planet/server browser operationalization | No production lobby/server-browser surface is required for the vertical slice. | P2+ | **E — not Phase 1-authorized.** | None for Phase 1. | Future PO/PM-A/TL if selected after Phase 1 acceptance | Would expand product/network/session scope. | **P2 CANDIDATE** only; do not create/activate work now. |
| 15a. Objective / quest-like presentation for the two approved prototypes | P1-DES-006; #37 §19.4–19.5 | Product Review shows quest name, completed/total count and status. Progression atlas includes objective complete/incomplete cells. | P1 REQUIRED | **B — presentation/wiring.** Current panel does not show the approved ordered objectives with per-objective complete/incomplete state/icon. Existing progression asset family already contains the required objective cells. | Only Chart the Unknown and Bring Water Online; ordered approved objectives; complete/incomplete state; non-blocking feedback. | Company A presentation consumer; A-GD semantic reviewer; A-ART presentation | Must not turn objectives into a forced navigation/quest rail. | **COMPANY-A CONSUMER ONLY** to bind existing objective state/icon presentation. |
| 15b. Persistent mission/quest rail from reference | #122 and master explicitly reject a forced/permanent quest rail | Current first-action cue is bounded contextual guidance; objectives live in Progression rather than a permanent directive rail. | NEW GAMEPLAY | **E — explicitly not authorized.** | None. | None unless new PO/A-GD scope | Would change onboarding/progression behavior. | **NO TASK.** |

## 4. Explicit non-operationalization from the visual reference

These concepts are not promoted into Phase 1 work by this review.

| REFERENCE CONCEPT | AUTHORITATIVE RESULT | CLASSIFICATION | ACTION |
|---|---|---|---|
| O2 / oxygen system | No approved Phase 1 gameplay source. | NEW GAMEPLAY | NO TASK |
| Currency | No approved Phase 1 economy requirement. | NEW GAMEPLAY | NO TASK |
| Firearms | Not in the bounded Phase 1 combat/equipment set. | NEW GAMEPLAY | NO TASK |
| New stations | Phase 1 building/station set is already bounded. | NEW GAMEPLAY | NO TASK |
| New resources | Phase 1 resource/content set is already bounded. | NEW GAMEPLAY | NO TASK |
| Enemy radar | Conflicts with #122/#124 no-radar boundary. | NEW GAMEPLAY | NO TASK |
| Resource radar / hidden-resource reveal | Conflicts with approved knowledge/discovery semantics. | NEW GAMEPLAY | NO TASK |
| Hidden-world reveal | Conflicts with EXPLORED/UNKNOWN authority. | NEW GAMEPLAY | NO TASK |
| Exact GPS coordinates / path guidance | Not part of accepted #124 spatial semantics. | NEW GAMEPLAY | NO TASK |
| New equipment slots | Would alter accepted inventory/equipment semantics. | NEW GAMEPLAY | NO TASK |
| New building families | Outside the five-entry Phase 1 building catalog. | NEW GAMEPLAY | NO TASK |
| Expanded progression / future professions | #37 explicitly excludes the five other future profession icons; full tree is deferred. | P2+ | P2 CANDIDATE only after PO Phase 2 selection |
| Multi-planet / production lobby / server browser | Production session-discovery/network product scope is not Phase 1. | P2+ | P2 CANDIDATE only after PO Phase 2 selection |

Audio is not reopened: #79/#80 are DONE/accepted and this reference does not prove a new audio defect.

## 5. Asset-gap rule result

### Asset existence / consumption evidence

Current main registers and consumes the Phase 1 presentation families relevant to this review:

- `item_icon_atlas`;
- `hud_status_icons`;
- `interaction_icons`;
- `map_marker_atlas`;
- `progression_icon_atlas`;
- `coop_identity_markers`;
- `ui_panel_skin`;
- `build_preview_pattern`;
- existing player/equipment/world structure/resource/ruin/recovery/fog/weather production-light sprites.

The remaining P1 discrepancies identified above are presentation/state binding or layout/content visibility issues. None requires a new pixel asset to exist before it can be corrected.

A connector inability to UTF-8 decode binary PNG bytes is not evidence that an asset is absent. Asset existence was therefore assessed through the current production registry, runtime consumption, visual-catalog/evidence source, and exact-main green quality gates rather than through a text-decoding attempt on PNG data.

## 6. Final routing

### 1. B-PIX ELIGIBLE

**B-PIX ELIGIBLE: NONE**

No approved missing asset satisfies all four gates: explicit source requirement, proven absence on current main, non-wiring/non-layout nature, and no duplicate Company-A deliverable.

### 2. COMPANY-A CONSUMER ONLY

These are bounded **presentation consumption/wiring** findings, not new gameplay and not B-PIX work:

1. Inventory item condition strip/unavailable visual state is weaker than #37 while item/status assets already exist.
2. Equipment condition needs the specified visual condition-bar/BROKEN treatment; current slot is primarily text condition.
3. Inventory/Storage open-panel capacity presentation does not consistently retain required current/max Weight and Volume information; Storage label omits specified maxima.
4. Craft output should consume the existing item icon atlas for output icon/name/qty parity; current ingredients already do.
5. Build UI does not currently expose the full five-entry catalog presentation with per-entry structure visual, kit/count, build-cap and selected state required by #37; existing structure/item/build-preview assets cover the visual source material.
6. Progression/objective UI should bind existing progression/objective icon states to the actual approved skill/profession/objective rows rather than generic unbound icons/summary-only objective state.

These findings require PM-A lifecycle ownership if PM-B accepts them as downstream Phase 1 closure deltas. This task does **not** activate or mutate Company-A work.

### 3. NO TASK

No new task is recommended for:

- Survival HUD core/urgent-state asset coverage;
- interaction prompt;
- reference-style fixed hotbar/slot system;
- selected item detail/tooltip shell;
- accepted inventory interaction semantics (#128);
- accepted map/spatial implementation (#124);
- Phase 1 icon-family production;
- reusable pixel panel/component family;
- co-op identity;
- Audio (#79/#80);
- O2, currency, firearms, new stations, new resources;
- enemy/resource radar, hidden-world reveal, exact GPS/path guidance;
- new equipment slots, new building families;
- permanent quest rail.

### 4. P2 CANDIDATE

Record only; do not activate from this artifact:

- full Pause/Settings/accessibility surface if selected by future product scope;
- production lobby/server browser/multi-planet session flow;
- expanded progression/future professions beyond the two Phase 1 prototypes.

These are candidates, not requirements. Exact scope must come from PO/phase activation and the appropriate domain owners.

## 7. Validation

### Source traceability check — PASS

Every `P1 REQUIRED` row is tied to #122, #37, approved Phase 1 design sources, and/or accepted #124/#128 behavior. Visual-reference-only ideas remain separated.

### Current-main verification — PASS

Fresh GitHub compare showed `main` identical to:

`0fc62cfeccfa1e1d62843db610ad262fa25f0b6d`

Current production registry, Product Review presentation/runtime paths, accepted #124/#128 result and exact-main quality state were reviewed at that baseline.

### Duplicate / collision check — PASS

Before persistence:

- no open PR matching P1-UXSUP-005;
- no existing task branch matching P1-UXSUP-005;
- #124 DONE/CLOSED;
- #128 DONE/CLOSED;
- #79/#80 DONE;
- no B-PIX task activated.

### Authority check — PASS

Changes are limited to this documentation artifact. No source/runtime/asset/schema/gameplay, Company-A lifecycle, map, inventory semantics, audio, or downstream task state is changed.

### No invented gameplay check — PASS

No value, mechanic, item, resource, station, equipment slot, building family, navigation rule, matchmaking feature, progression branch, or quest rail is introduced.

## 8. Handoff

**Downstream consumer:** B-PM-01 / PM-B for source/traceability verification.  
**External gate:** PM-B verifies this exact artifact/PR. A-ART is only required if a later, separately preflighted pixel-asset candidate exists; this review found none.  
**Company-A implication:** the six consumer-only findings above may be routed to PM-A by PM-B after verification; this artifact does not activate them.  
**Project Owner action:** NONE.
