# Phase 2 — Owner feedback rework and upgrade proposal

Source: Owner's seven requests and three screenshots, 2026-10-01. This is REQUEST CHANGES on #187. Earlier technical completion does not constitute product acceptance.

## Implemented in this rework

| Feedback | Concrete change | Verification |
| --- | --- | --- |
| Settings scattered across HUD | Gear contains sound/volume, display size, fullscreen, controls and real Save world action | Settings browser journey; save/reopen; movement suppressed while adjusting settings |
| Persistent WASD prompt | Hidden in Colony mode; controls remain available from settings/H | Quiet default HUD screenshot and browser assertion |
| Too much repeated text | Colony actions become small titled icons; region/ecology details available by hovering their group; empty equipment and routine cooldown echoes hidden; contextual interaction sits above dock | Contextual HUD and 1x/2x/3x screenshots; original authority errors remain enforced |
| Marsh appears broken | Hard repeated tile outlines removed; puddles/reeds vary; biome tree canopies and depleted stumps distinguish actual timber nodes | Clear/rain/night regional screenshots and full-scene timing |
| Sparse supplies | Generation-v4 deterministic groves add up to twelve resource nodes per 32-unit chunk, including areas between the landing and expedition band and beyond the former 430-unit band | Determinism/density tests, real gather/depletion, streamed-world tests |
| Full bags; storage difficult to find | Inventory links directly to Storage Crate selection and explains its 4 Timber + 2 Cordage recipe and nearby transfer | Natural material gathering → craft → crate placement → real transfer → save/reopen |
| Existing progress must survive | Explicit additive v3→v4 reconstruction preserves legacy terrain/entity identities, depletion, exploration, inventory, actors and structures. Only new nodes get fresh resource state. First successful world save commits the upgraded version | Migration validation, repeated upgrade idempotence, saved/reopened state comparisons |
| Interact with landscape | Nearby discovered resource trees, plants, rocks and water support click/Enter as well as E; the same authority checks enforce range, tool, capacity and depletion | Actual gather transactions and browser interaction |

Display size presets scale the existing 640×360 pixel scene to fit the window or cap it at 1×/2×/3×. They are not a new camera zoom or a hardware quality setting. Sound remains gesture-enabled; browser autoplay is not bypassed. Opening settings suppresses player movement while the world keeps running. V3 saves in Phase 1 mode retain their original generation; entering Colony Depth applies the explicit upgrade. Generation-v2 migration remains separate.

Trees and rocks are harvestable resource nodes. Decorative ground puddles/reeds communicate the biome; they are not new navigable waterways. Digging, terraforming, animal breeding, arbitrary bed placement and offline production are not claimed by this patch. Resource clusters remain bounded and subject to existing renewal/ecology rather than infinite loot.

## Recommended next improvements for Phase 2

Historical proposals from PR #193. The Owner subsequently chose 2–3 players and Vercel; see [the implemented priority upgrades and current limitations](phase-2-priority-upgrades.md) for the current status.

1. **A real co-op pilot before more progression systems.** Provide a small private hosted service with host/join UI, reconnect feedback and shared save ownership. Verify four real players first, then eight. Existing WebSocket checks prove authority/transport behavior but Pages is still solo. Deployment needs a selected hosting environment and budget; do not imply it exists today.
2. **Exploration with reasons to travel.** Add several authored landmark families, regional routes and visible resource-rich pockets. Each site should offer a distinct observation or useful choice. Measure whether a ten-minute expedition finds at least three different interactions, rather than only more repeated nodes.
3. **A consistent authored pixel atlas.** Replace remaining mismatched small icons/terrain decoration with a coherent tree/rock/shore/facility atlas, grounded silhouettes and biome accents. Preserve the 3/4 camera and evaluate screenshots at 1× and 3×, clear/rain/night. Avoid adding continuous filters or large particle layers before timing the complete scene.
4. **Deeper landscape interactions.** Introduce physically meaningful marsh channels, shallow-water traversal, exposed mineral seams and explicit regrowth stages. Version new terrain/collision rules and migrate saves with retained world deltas. Test reachability of sites and base placement, not just visual variety.
5. **Base logistics that teach themselves.** Add an obvious storage indicator near crates, capacity gauges per container, sort/stack and tooltips explaining transfer range. Add a short optional build progression with icons and actual material checks; keep tutorials dismissible.
6. **A measured survival/ecology balance pass.** Play ten-minute fresh-world sessions with three to five new players and track walking/gathering/building time, bag pressure, tool wear and useful discoveries. Tune supplies and renewal from those results, retaining scarcity decisions without requiring constant empty travel.

These are proposals, not implemented claims or automatic Owner approval. Conveyor/vehicles/NPC and deep industry remain later-phase work. Close #187 only after the Owner plays the published rework and records an actual decision.
