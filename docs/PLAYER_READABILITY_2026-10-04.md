# Player readability feedback — 2026-10-04

Owner feedback is tracked in #258 (viewport/scroll), #259 (living presentation) and #260 (exploration/content). The source implementation in this delivery fixes UI scaling, pagination, material discovery, fog clipping, and wildlife render starvation. It also adds initial care/seed/soil cues and ruin traces. This document does not certify the complete game-quality ambitions as finished.

## References applied

| Primary reference | Applied principle | ProZ0 implementation |
| --- | --- | --- |
| [Minecraft crafting guide](https://www.minecraft.net/en-us/article/how-craft) | Recipes explain accessible inputs and their use | Expand an ingredient to see its localized production/gathering source; quantities derive from shipped recipes |
| [Minecraft trail ruins](https://www.minecraft.net/en-us/article/trail-ruins) | A visible fragment invites local investigation of a larger remnant | Broken paving, conduit and wall traces surround authored sites; each trace requires its own explored cell |
| [Don't Starve Together](https://www.klei.com/games/dont-starve-together/) | Distinct world silhouettes and readable farming/building presentation | Existing native species art is prioritized before abundant forage; crop seeds show inventory counts, plots/owned animals show care cues, pens receive rails |
| [Klei caves and ruins](https://support.klei.com/hc/en-us/articles/360029557132-Does-Don-t-Starve-Together-have-caves-or-ruins-content) | Layered exploration changes the environment and activity | Preserve the existing separate cave/mountain/river mechanics and add observed-site connections in the journal |

These are design interpretations, not copied art or a claim of parity with either reference game. The current traces are scenery without collision/loot; the observed network is a hypothesis, not a new civilization simulation. Terrain generation and persisted identities are unchanged.

## Delivered behavior

- HUD windows use physical pixels while terrain retains its native raster scale. Three viewport sizes and EN/VI remain within document bounds.
- Root/nested scroll, focused actions and expanded source details survive live refresh. Inventory help is collapsed; crafting uses arrows and numbered page buttons with accessible keyboard labels.
- Brick is Gạch nung. Its hint derives the actual kiln recipe (clay and timber). Research dependencies show translated research names instead of canonical IDs. Shared co-op research/crafting receives localized material hints.
- Frontier fog uses bounded 64×32 masks below known silhouettes. Unexplored entities remain excluded. The player no longer carries a bright four-direction outline.
- Animals receive render slots before plots/forage. Owned animals communicate low water/feed; crop plots communicate dryness/readiness. Available seed choices carry canonical inventory counts and disable unavailable seeds. Soil shows its existing profile, water percentage and actual compost level, without inventing fertility simulation.
- Each authored ruin gains a short approach and surrounding remains. Journal connections appear only after inspecting at least two authored sites, and retain unresolved interpretation.

## Verification and outstanding evidence

Automated checks verify concrete behavior and canonical save/determinism. They do not prove that animals are recognizable to new players, that travel is enjoyable, or that balance is good.

Continue #259 for richer harvest feedback, broader contextual tutorials, and complete shared living-world presentation. Continue #260 for full geographic routes/complexes, traversal content and a richer civilization mystery. Hardware acceptance still needs representative machine measurements; bounded sprite caches and removing actor/world filtering are implementation changes, not a measured FPS guarantee.

The current hosted co-op protocol does not expose the full solo living-world state. This delivery improves already shared UI, without claiming farming/breeding parity. #204 remains for network latency evidence; #199 and #187 remain for human journeys/Owner acceptance. Human multiplayer sessions remain deferred by Owner.

After Owner reported failed CI, targeted automated journeys were used to diagnose the failures. Follow-up fixes preserve the weather icon, retained panel metadata, compact pagination accessibility and native material icons; keep construction controls beside the world; and route cave E actions through the existing exit/gather authority. Quick Space taps resolve the first eligible attack while maintaining manual-input, menu, range and cooldown guards. Fresh exploration automation now plans against canonical collision and executes keyboard movement around cliffs. Full CI remains required, including frame pacing and repeated shared-interface checks; collecting all smoke failures does not skip any assertion or change pass thresholds. A release is CI-verified only when its exact revision has completed successful checks.
