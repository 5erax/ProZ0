# Remaining issue execution — 2026-10-07

Owner resumed implementation in the existing chat, with single player as the priority. Baseline: `de3e9d0567fff0adb0329df45d22d6b97fa1184f`. Work branch: `fix/phase2-open-issues-2026-10-07`. This is authorized maintenance; it does not claim a team identity or certify specialist/human acceptance.

## Order and boundaries

| Issue | Work / completion boundary |
| --- | --- |
| #278 | Correct complete material deficits, individual sufficiency, accessible blocked reasons, cost/output semantics. First independently verifiable slice. |
| #281 | Authored EN/VI labels, canonical glossary and consistent numeric formatting; support/debug UI only in explicit support mode. |
| #279 | Equipped HUD state, one shortcut/panel mapping, tooltips and keyboard/focus state. |
| #280 | Shared panel containment, fixed header/close, scrolling, safe-area and viewport verification. |
| #282 | Construction/farming action hierarchy and consistent material-first/material-later paths. |
| #268, #269 | Player-facing lobby/skin selection and opening narrative presentation. |
| #283 | World/map readability, pixel density, fog/rain and marker layering. |
| #244 | Verify the integrated explicit-inspection implementation and remaining input/lifecycle evidence before closure. |
| #275, #260 | #277 already implements the knowledge-boundary work. Inspect its final outcome and dependencies; avoid duplicate/conflicting edits. |
| #242 | Art/UI parent: reconcile completed children; Owner visual acceptance remains distinct. |
| #204 | Solo frame pacing can be verified here; real Internet co-op latency evidence is a separate acceptance condition. |
| #199, #187 | Real novice/Owner acceptance cannot be inferred from automated tests. |
| #67 | Permanent coordination tracker; not a finite implementation task to close automatically. |

Issue bodies remain the authoritative acceptance detail. Each implementation slice gets a scoped commit and evidence. Do not close an issue because its code is committed: review, required CI, integration and relevant deployed verification must support its completion.

## #278 — complete cost presentation

### Problem and resulting behavior

Crafting previously reported the first missing ingredient's full recipe cost. For a recipe requiring three cordage with two owned, it could say three were needed. Industry coloured an entire cost row as missing, including sufficient ingredients. Living-world recipes did not clearly distinguish inputs from outputs or explain material/station blocking before clicking.

The UI now computes each read-only requirement as `{ itemId, name, have, required, deficit, status }`, where `deficit = max(required - have, 0)`. The full missing set is localized, for example `Thiếu: 1 Dây thừng · 6 Quặng kim loại`. Sufficient ingredients retain their individual state. Material summaries expose the deficit and status in accessible labels, with names/glyphs visible independently of colour. Cost and output labels are distinct (`Cần` / `Nhận`, `Requires` / `Produces`).

`CostRequirements.ts` owns the presentation projection/localized summary. `CostList.ts` composes existing material-source disclosures. Main crafting combines all deficits with a missing workbench; its disabled button references the visible reason. Industry construction/research/conveyor/repair buttons expose missing material and relevant prerequisite/range reasons. Colony research and living-world recipes reuse the same requirement projection and list. Living recipes check the existing four-unit station rule for presentation only.

### Authority and save boundary

No recipe cost, item catalog, authority exchange, inventory mutation, network message or save schema changed. UI sufficiency never authorizes spending; existing authority validation remains final. Deficits are not persisted. Locale changes rebuild the source-owned presentation.

### Verification

- Two new Chromium regression tests failed on the previous UI: individual Industry material state and partial-requirement accessible deficit. Both pass after the fix in EN/VI.
- Five focused tests cover zero/one/two/three missing materials, surplus, true deficits, Vietnamese output and no inventory mutation.
- Domain suite: 568 passed, 3 pre-existing skipped. Browser suite: 64 passed. Typecheck and lint passed.
- Client/server production build passed. Existing Vite native-config and large-chunk warnings remain; this slice does not claim a warning-free baseline.
- Final E2E/CI/integration/deployment evidence will be appended before closure. Human visual and multiplayer acceptance are not implied by automated checks.

### E2E review corrections

The first production E2E run exposed two presentation regressions: complete deficits made six craft cards exceed the panel, and appending the blocked reason to an Industry button's accessible name broke its stable action identity. Material names remain in source disclosures/accessibility and the full deficit footer; compact craft chips avoid duplicate names. Card spacing is reduced without reducing type size, and action labels cannot shrink into split words. Block reasons are exposed as descriptions/title while action names stay stable. Production Industry paid-build/logistics/repair/reopen and greenhouse/rover journeys passed after correction. The six-card direct Product Review visual journey also passed; final head CI still required.

## #281 — authored localization and inventory number formatting

Reported placement/kit/weather/map labels now have explicit glossary entries. Industry material labels resolve through the same canonical catalog as Inventory and Craft; its colony prerequisites are authored translations. HUD carry states and weather, placement status and map detail labels are localized at their source-owned boundaries. Inventory totals, carry/tooltips, storage and item detail share `formatInventoryAmount`: one decimal minimum, three maximum, using `formatNumber` and the selected locale. This preserves small masses while avoiding floating-point noise.

Vietnamese captions retain authored casing; uppercase source aliases no longer automatically uppercase translated prose. The map landing caption uses sentence case. Appearance UI says `Trang phục` consistently. Canonical item IDs, commands, player text and saves are unaffected.

Local playtest recording/export and its Base guide are absent by default. Explicit support boot uses `proz0Support=true` (or `data-proz0-support="true"`) in the review entrypoint, mapped to `supportToolsEnabled`. Normal lobby/world play does not opt in. The supporting UI does not sample or mount controls when disabled.

Verification: new glossary regression failed on `INVALID` before the fix; two browser regressions reproduced raw `NORMAL`/English decimals and non-opt-in support controls. Those pass after correction. A representative VI scan covers Inventory, Craft, Build, Map, Farm, Journal, Research, Colony, Industry and Settings for the reported leaks. Browser suite is now 67 passed. Typecheck/lint and focused unit tests pass. Industry E2E expectations now use canonical catalog display names; transactions, quantities and save assertions remain unchanged. Final head CI and deployment are pending; this is not a claim that every historical untranslated string has been audited.

Final verification follow-up: CI exposed the old fixed-two-decimal item-fact assertion. The updated test reads both displayed quantities and compares them with every canonical item definition, rather than forcing trailing zeros. This also exposed 0.025-unit items, so shared precision retains three decimals maximum. Explicit EN/VI tests cover 0.025, 0.05, 1.8, 32 and floating-point noise. Final focused production checks on `8a013e5`: three passed (EN/VI preference, game save/reopen localization and six-card Product Review visual containment). The intentional cost-status mutation was killed by four of five deficit tests and then restored. Required final CI remains the merge gate.

At the precision follow-up: 570 domain tests passed, 3 existing skipped; 67 Chromium browser tests passed; typecheck/lint passed. All canonical item masses and volumes are compared numerically with the displayed facts. No expected value was rounded down to accommodate a failing test.

## #279 — equipment truth and panel shortcut identity

The HUD no longer renders fallback spear/wrap/water art in empty slots. Weapon and protection use canonical equipped projections; an empty slot explicitly says not equipped. V is labeled as the existing consume action, not an assignable equipment quickslot. No equipment ownership, authority, save or consumption selection changed.

A shared shortcut table now supplies panel keys, dock labels and active-state identity. F represents Farm, N Colony, and P the same Professions panel opened by its navigation button (the legacy progression panel remains the fallback without Colony Depth). Research/Journal/Professions expose their actual panel identity and nav pressed state. Headings no longer contain a competing close instruction. Repeat/modifier events do not toggle Colony panels. Journal knowledge content is untouched.

Verification: regressions first reproduced the empty spear icon and missing P panel identity. Domain 572 passed, 3 existing skipped; browser 69 passed. The small-viewport P check now verifies the actual Professions panel and that its last card is reachable by internal scrolling; viewport/outer-scroll guards remain. Production equipment ownership/drag/keyboard/save/reopen and EN/VI journeys: 3 passed. Typecheck, lint and build passed. Required CI, merge and deployment verification remain pending; no issue is closed by this document.

## #280 — fixed headers, body scrolling and modal safe areas

PanelShell reuses each panel's existing DOM and command handlers, with one fixed header/close pattern and a body-only scroll region. It is consumed by Inventory/Craft/Build/Map/Colony, Farm, Research/Journal/Professions, Expedition, Settings, Industry and Controls. Industry tabs are part of the fixed header; changing sections resets body scroll. Main modal anchors remain fixed when accordions expand. Scrollbars are visible on the content body, focus is explicit, and close stays available during pending Industry commands. Settings sound/fullscreen/save attach inside its body.

The viewport controls no longer inherit world/canvas scale. HUD context and world action hints hide while a shell is open; panel-switch controls remain available in the reserved lower strip. Settings remains accessible in the reserved upper strip; Industry close is anchored below it so the controls do not intercept one another. World card minimum height and no-wrap weather prevent unstable phrase wrapping. Layers and safe inset are explicit CSS tokens. Gameplay authority, commands, inventories, saves and world simulation are untouched.

Verification: the new browser check first failed before shell implementation. It covers EN/VI at 1366x768, 1920x1080, 2560x1080 and 640x360, all primary panels, expanded accordions, body scroll, close bounds, Industry tab stability and Settings language/audio/lower controls. Browser suite: 70 passed. Typecheck/lint/build passed. Initial focused production run: 15 passed, 5 regressions; fixes retain navigation switching, prevent Settings interception, separate help from survival HUD and update authored carry/Colony captions. All five failed journeys passed on the rebuilt source. Final exact-head CI/deployment and actual visual acceptance remain pending.

## #269 — three distinct arrival scenes

The intro now shows distant fragments and a survey signal, an animated descending landing module with thrust/dust, then a landed foothold with visible selected player, water/resource silhouettes and an outward frontier. The existing production landing-module and player art are reused. Each frame has different scene content rather than only a camera scale change. Progress is 01/03 through 03/03; Continue/Start is primary, Skip tertiary. Copy has a readable measure; focus uses the game palette. Motion uses CSS, with reduced-motion support. The final handoff fades for 450 ms (instant when reduced motion is requested).

Seen-world/replay, world/room IDs, skin selection, saves, login and gameplay authority are unchanged. Keyboard repeat cannot skip scenes; focused buttons retain native keyboard activation, so Enter on Skip skips rather than advances. No external dependency or sound was added.

Verification: a browser regression first reproduced missing distinct-scene identities; after the change it covers three unique scenes, progress, selected player, repeat handling, keyboard completion and no replay. Typecheck/lint/build passed. Eight production E2E journeys passed, including solo start/skip, saves/continue, selected skin, keyboard handoff, small/wide lobby and explicit review entrypoint. Scene evidence covers EN/VI at 1280x720, 1920x1080 and 640x360; descent transforms are measured before/after, and reduced-motion disables animation. This source has local screenshot/motion evidence; final exact-head CI and visual acceptance remain pending.

## #268 — lobby action hierarchy and appearance preview

The landing page now has one prominent journey action that opens/focuses the existing solo world choice without discarding drafted seeds or bypassing saves. Account, native EN/VI toggle buttons and Appearance are grouped in the header; Appearance is no longer a competing game mode. Headline measure, body typography, island size and selected appearance preview have been adjusted. The selected outfit has an explicit badge. Login, room flows, skin identifiers, save identity and world authority are unchanged.

Verification: the browser regression checks grouping, draft preservation, language state and selected appearance. All 72 browser checks passed; typecheck/lint/build passed. Eleven production E2E journeys passed across lobby, localization, arrival and entrypoints, including EN/VI at 1920x1080, 1280x720 and 640x360, keyboard focus, outfit persistence and horizontal overflow. Screenshots are captured by the runnable lobby-hierarchy E2E. Actual user time-to-recognize the primary action and final visual approval remain human acceptance criteria, not assertions inferred from automation.
Final CI follow-up: 80 E2E cases passed; one container carry-caption assertion still expected raw uppercase codes. Inventory also had a hashed-message lookup bypassing the shared status glossary. Inventory now uses the same authored status labels as carry/container; E2E checks the authored Normal/Heavy load/Overloaded labels while retaining exact capacity/authority checks. Isolated production P1-POLISH-007 passed with CI server reuse disabled. The full required CI is rerun on the repair commit.

## Integrated production verification — #275 / #278 / #281

PR #277 merged at bef382f and PR #284 at 180861683e7b7cdb2b257098b7e305cedc00fc7e. Required exact-head CI 37549204282 and 37581406349 passed respectively, including production E2E and frame pacing. Vercel deployment dpl_CA5DvdccZZL6Qr47LcuWtH6mjTdv is READY/production, and its gitSource and GitHub commit metadata match main 180861683e7b7cdb2b257098b7e305cedc00fc7e.

Checks against https://proz0-colony.vercel.app/: game EN/VI selected item, save/reopen and narrow layout passed; relay withheld/known-first disclosure, laboratory restoration/research and finite reward/save flows passed (three exploration E2E). A production Craft check verified 14 material requirements: deficit=max(required-have,0), independent sufficient state and accessible quantities. These close the bounded technical reports #275/#278/#281; human visual, multiplayer latency and Phase 2 acceptance remain separate.

## #283 — known-state world/map readability correction

Removed the repeating fog texture and per-cell radial gradient; unknown space is one opaque mass with only the explored-frontier edge treatment. Terrain/resource/landmark visibility remains gated by canonical exploration. Soil highlights and variation are quieter. Rain now uses contiguous diagonal streaks aligned with its travel vector, with restrained opacity, near/far depth and reduced-motion support. Existing bounded 640x360/30 Hz weather rasters and production assets remain; no dependency or authority change.

The map fits observed cells and their opaque frontier within the existing local knowledge window, rather than fitting a mostly empty fixed window. Already-known remote markers remain clamped to the edge. Marker and selection-label size stays readable while zooming; orientation and meters-per-cell use existing world axes/cell size. Legend is 13 px, map markers 16 px, meter values 12 px; temperature title explicitly calls it the body-temperature index. Modal surfaces are opaque to prevent rain/world noise through text. Native world sprite dimensions and nearest-neighbor raster scaling remain unchanged; final unified art-density approval stays with #242/#283 visual review.

Verification: 76 browser checks passed before the final map crop; focused map, fog and rain checks pass. Production environment clear/day-rain/night-rain at 1x/2x/3x and grayscale passed, as did canonical explored-only map regression. The final map crop re-ran its canonical regression and EN/VI desktop screenshots at 1280x720 and 1920x1080: two E2E passed. Screenshot review caught an initially misleading fit check (outer map fit while actual explored cells stayed tiny); code now crops to known local cells and the E2E also measures their occupied region. Production before-images at main 1808616 are under work/outputs/world-map-before; after-images are generated by tests/e2e/world-map-readability.spec.ts. Typecheck/lint/build pass. Final CI/deployment and human art review remain pending; #283 is not yet closed.

## Main integration check timing repair

Main CI 37582361348 and 37582859151 failed at the existing synchronous season-caption assertion immediately after locale change (opposite-language frames in each run). Locale-dependent world projection refreshes on the next game frame. The assertion now polls that actual caption and the seasonal counterpart while retaining the exact EN/VI requirement. No runtime translation, expected wording or CI quality threshold is bypassed.

## #282 — first action-hierarchy slice (placement still outstanding)

Inventory utilities are a visible action group rather than a closed help accordion; selected-item equip/drop/repair behavior and authority remain unchanged. Journal separates guidance, discovered locations and observed facts without expanding knowledge/certainty. Farm defaults to crops/livestock, with explicit nearby-resource/fishing and recipe tabs. Wild animals are classified as wildlife rather than livestock; direct selected-object interactions still use the compact targeted card. Tabs only change presentation and preserve selected scope across live rebuilds. Empty Industry facility/power views route to Construction without executing a command.

Verification: typecheck/lint/build; 15 focused browser cases including read-only Farm navigation and localization; 11 production E2E for actual fishing/cooking/cancel/save, equipment crafting/rarity, storage and POI restoration/knowledge flows; four Industry browser cases including actionable empty-state navigation. Natural farming E2E now uses the explicit recipe/farming destinations and still needs its final run. No cost, ownership, save or world simulation change. Canonical placement across Industry, kit builds and expedition blueprints remains the outstanding #282 seam; do not close this issue from this slice.


## Integrated checkpoints and #282 construction follow-up

Closed with deployed evidence in this Owner-authorized chat: #275, #278, #281, #279 and #280. PR #285 merged at `f775a91dd44dcb32a1036c4185320d3e7a35e971`; exact-head quality run 37583591624 passed. Production verified 54 EN/VI modal cases at three desktop sizes, the owned-equipment/save journey, and four lobby/arrival/localization journeys. PR #286 is merged through the integration; #287 was closed as superseded, not discarded.

PR #288 merged at `31bd1180ffec768ac9da44d02003b2f443046ddc` after exact-head quality run 37585394595 passed. Vercel production deployment `dpl_eWTAR6EUb4GxP71E5Qu6jQDD5jeF` is READY and resolves to that SHA. #283 still retains its explicit art-density/visual-review gate; automated fog/map assertions are not a named A-ART approval.

#282 now routes solo B and Inventory storage shortcuts into the existing Expedition construction catalog. Owned kits have explicit Prepare kit / Place owned kit actions beside the material-later blueprint choice. Blueprint, ready kit and Industry share one pointer ghost, click/Enter confirmation, Escape/right-click cancellation and rotation when the authoritative model supports orientation. Industry is fixed-orientation in its existing save model; the UI states that explicitly. Numeric Industry offsets remain only in the deferred hosted/legacy adapter, not normal solo play.

The ghost never spends supplies. Industry `assessBuild` shares the existing spatial/research/life/worldspace guards with execution; confirmation still uses current authority and inventory revisions and the existing material exchange. Kit placement still calls `bundle.placeStructure` with the actual kit stack, build revision and connector/free placement intent. Habitat snaps to the pointed landing connector; field blueprints keep their independent canonical shape/cost rules. Save V2, network messages, receipts and content prices are unchanged.

Farm separates Crops and livestock, Nearby resources and Crafting; wild resource/fishing actions belong to Nearby resources. Journal separates guidance, discovered locations and observed facts. Inventory utilities no longer require expanding a help accordion. Empty Industry facility/power views offer a Construction shortcut. The shared dock derives active Build from the canonical construction panel, and opening a different destination closes Industry rather than stacking dialogs.

Local checks at this follow-up: 573 domain passed, 3 existing skip; 79 browser passed before the final panel-switch guard, followed by all three shortcut checks including the new Industry-to-B mouse journey. Typecheck/lint/client/server build passed. Natural gathering, kit placement, remote farming, blueprint escrow and Industry paid-build/save journeys are still running on rebuilt production assets; exact final-head CI and deployment are required before #282 closure. The earlier broad local run was stopped after identifying stale navigation expectations; it is not counted as passing evidence.

Remaining acceptance is explicit: #268 new-player CTA recognition and named visual review; #269 named art/QA review; #283 pixel-density review; #260 bounded QA/narrative reconciliation; #244 final input/lifecycle acceptance; #242 art parent; #204 Internet co-op/hardware evidence; #199 actual novice records; #187 Owner acceptance. #67 is permanent coordination. No role-pack member is impersonated and no human result is inferred.
