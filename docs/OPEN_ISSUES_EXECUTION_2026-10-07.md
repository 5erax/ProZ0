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

Reported placement/kit/weather/map labels now have explicit glossary entries. Industry material labels resolve through the same canonical catalog as Inventory and Craft; its colony prerequisites are authored translations. HUD carry states and weather, placement status and map detail labels are localized at their source-owned boundaries. Inventory totals, carry/tooltips, storage and item detail share `formatInventoryAmount`: one decimal minimum, two maximum, using `formatNumber` and the selected locale. This preserves small masses while avoiding floating-point noise.

Vietnamese captions retain authored casing; uppercase source aliases no longer automatically uppercase translated prose. The map landing caption uses sentence case. Appearance UI says `Trang phục` consistently. Canonical item IDs, commands, player text and saves are unaffected.

Local playtest recording/export and its Base guide are absent by default. Explicit support boot uses `proz0Support=true` (or `data-proz0-support="true"`) in the review entrypoint, mapped to `supportToolsEnabled`. Normal lobby/world play does not opt in. The supporting UI does not sample or mount controls when disabled.

Verification: new glossary regression failed on `INVALID` before the fix; two browser regressions reproduced raw `NORMAL`/English decimals and non-opt-in support controls. Those pass after correction. A representative VI scan covers Inventory, Craft, Build, Map, Farm, Journal, Research, Colony, Industry and Settings for the reported leaks. Browser suite is now 67 passed. Typecheck/lint and focused unit tests pass. Industry E2E expectations now use canonical catalog display names; transactions, quantities and save assertions remain unchanged. Final head CI and deployment are pending; this is not a claim that every historical untranslated string has been audited.
