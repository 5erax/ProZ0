# Phase 1 Owner extension — cultivation, husbandry and isometric presentation

Authority: Owner instructions in the recovery conversation on 2026-09-30, recorded on #122, #157, #158 and #160. Recovery executes these lanes directly in the current chat; it does not impersonate the original PM/GE/specialist roles. Original implementation and review history remain attributable.

## Gameplay contract

One shared cultivation bed at (-6,4), one shared grazer pen at (6,4), both near Landing. Known bed/pen sites retain visible planning markers. Open N, or press E near a site, for explicit actions, costs and remaining active-world growth time. The panel docks beside the world rather than obscuring the work site. Build/plant/harvest/care/fertilize require a living actor within 1.25 WU of the relevant site.

| Action | Cost | Result |
| --- | --- | --- |
| Build bed | 3 Timber + 1 Cordage | One persistent bed |
| Plant and water | 1 Edible Plant + 1 Clean Water | One crop; 120 active seconds |
| Harvest ready crop | None | 3 Edible Plant, subject to inventory capacity |
| Build pen | 4 Timber + 2 Cordage | One persistent pen |
| Capture nearby passive grazer with E | 1 Cordage | Existing generated animal moves into the empty pen |
| Feed and water | 1 Edible Plant + 1 Clean Water | After 180 active seconds, 1 Fertilizer |
| Fertilize an unfinished crop | 1 Fertilizer | One 25% cycle reduction |

Fertilizer is a shared production counter capped at four. No offline growth, breeding, animal slaughter or arbitrary placement is promised by this bounded first loop. All transactions draft inventory changes before publication: insufficient materials/capacity, dead/out-of-range actors, stale revisions and repeated/competing commands cannot produce partial payment or duplicate harvests. Care and growth progress persist in the optional WorldManifestV2.sustenance field; older compatible generation-v3 records without the field start empty.

Hosted commands use colony.sustenance with colony-sustenance and player inventory revision references. Authenticated player identity comes from the session, never from the payload. Shared production control and growth views have independent revisions, so ordinary growth does not invalidate commands every tick.

## Presentation supersession

The Owner extension supersedes the camera-preservation restriction in the earlier #156 bounded art decision. Product Review now projects world axes onto a 2:1 isometric diamond; WASD/arrows remain aligned with screen directions. Simulation positions, ranges, collision, map coordinates and authoritative knowledge retain world coordinates. Actor facing is rotated only for presentation. Phase 0/local-demo retains its prior projection/input behavior.

Code-native pixel SVG terrain uses a restricted green/blue palette, clustered variants, grain/tufts and raised known shore edges. Existing modular sci-fi structure/actor assets remain integrated. New bed/pen geometry has top and side faces. Night modules receive a restrained soft glow. Unknown exploration is opaque layered pixel cloud, independently animated from Cold Rain streaks and ground splashes. Fog is a knowledge boundary, not evidence of a literal world edge or a new floating-island biome.

Decorative flora is deterministic in known cells. Walking towards grass does not change its existence. Static gameplay/constructed anchors retain readability clearances; construction may legitimately alter nearby decoration. Viewport culling and save/reopen must restore the same known flora identities. No hidden resource/ruin/wildlife information is displayed through unknown fog.

## Resource identity and save compatibility

The recovery branch preserves all four #159 implementation commits by cherry-pick. Generation v3 adds the accepted three local anchors and denser 96..430 WU expedition resources. Existing costs/yields/carry rules are unchanged. Generation-v2 saves fail closed with UNSUPPORTED_GENERATION_VERSION, remain in durable storage and are not silently reinterpreted, deleted or migrated. This is a material compatibility limitation to disclose at release.

## Required verification and acceptance

Unit authority tests cover full grow/care/fertilizer cycles, replay, stale competing harvest, dead/range guards and material rollback. Hosted integration verifies authenticated command execution, replication, retry deduplication and Save V2 reconstruction/resume. Browser regression checks grass approach/cull/return/reopen. End-to-end tests drive actual bed/plant/save/reopen/harvest/care buttons and screen-relative movement. Matured test saves are explicitly fixtures, not human playtest evidence.

Technical checks, rendered evidence and deployment verification do not replace genuine novice Journey A/B/C playtesting, listening evidence or Owner product acceptance. #59/#60 remain honest about those gates until genuine evidence or an explicit Owner acceptance decision is recorded. No Phase 2 promotion is claimed by this implementation document.
