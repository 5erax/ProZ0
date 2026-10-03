# Phase 2 A+B+C — as-built gameplay contract

Current single-player update: [2026-10-03 release handoff](../phase2-solo-release-handoff-2026-10-03.vi.md). Owner defers multiplayer work and delegates final E2E to another tester. Solo now includes resource size/yield, roots/transplanting, six equipment slots/rarities, field blueprints, soil/moisture-dependent active-tick growth, two mountain profiles and three playable cave layouts. EN/VI preference is local to presentation; remaining composite copy and final visual coverage are listed in the handoff. The 2026-10-04 correction below removes permanent profession locking; #199/#187 human evidence remains pending.

Direct Owner-authorized reconciliation, 2026-10-01. Records delivered behavior, not retroactive A-GD approval of earlier proposals. The Owner prioritizes exploration, visuals and co-op, with public private rooms of 2–3 people. Use the [co-op corrections traceability](../technical/phase-2-coop-corrections-traceability.md) for source/evidence and open acceptance gates. The broader current-main baseline is delivered separately by PR #207 / #165.

## Player loop and rules

Explore visually distinct Landing Grassland, Mist Marsh and Ochre Badlands. Discover useful windfall/spring/seam pockets and observed survey sites. Gather through real finite resource nodes, bring supplies to the base, craft tools/kits, construct facilities and shared storage, research colony capabilities, care for plants/animals, then save and continue the same world.

Research spends inventory materials atomically and respects prerequisites. `field-survey` precedes water/storage research; water stewardship precedes cultivation. Research is shared. A character can earn Explorer, Engineer or Cultivator via research and visited-region eligibility. The 2026-10-04 implementation permits changing the single active profession at an accessible lab/base when research, explored-region and alive/revision prerequisites are met. No respec cost is added. Previous bonuses cease when the new profession becomes active; bonuses do not stack. Integration verification exercises Cultivator → Engineer → Cultivator.

Expanded Storage raises base crate capacity by 1.5×; a colony Engineer raises it to 2×. Explorer broadens local survey; Cultivator doubles active crop advancement before environmental modifiers. Personal carry remains 20 kg / 24 volume. Shared containers still require access range, capacity, stack conditions and expected revisions. The same item cannot be multiplied by duplicate or concurrent commands.

Harvest pressure slows local renewal and nearby crop growth, and recovers during active play. Marsh vegetation and badlands minerals have distinct renewal advantages. Weather/exposure affects survival; shallow channels slow movement to 70% and prohibit new construction there. Rates and recipes come from content/authority source, not this document. Bed/pen placement is fixed; crops and care advance only during active ticks. No offline yield, breeding or greenhouse is implied.

## Shared colony and feedback

Single Player needs no account. Multiplayer needs a username/password account and a room name/password. Each room retains three persistent character seats. Players can set a separate display name. Shared discovery, research, structures, machine output and crates are authoritative; inventory and equipment are private to their characters. Owner-only save/export/management preserve room identity and progress.

Co-op exposes visual crafting costs, five survival meters, carry/equipment, explored active-region map, professions and contextual object actions. E/click interacts; Space attacks. Failed tool/range/capacity/stale requests explain what to do. UI panels never bypass survival/authority eligibility. Machine on/off, connector placement, ruin investigate/reward and death-cache recovery use existing server commands.

Chat is ephemeral and limited to the admitted room. Voice is explicit opt-in, can mute/leave, and stops on disconnect; no background microphone request occurs. Audio is best-effort direct WebRTC without a TURN relay. A reconnect restores character/world state but requires explicit voice rejoin.

## Acceptance and deferred work

Validate source state, coherent save/reopen, stale/duplicate/concurrent transactions, reconnect, real player-facing journeys, full-scene timing and exact public release independently. Scene/material fixtures accelerate specific subsystem verification; they do not demonstrate novice balance. A twenty-minute automated soak must state whether it actually explored/built/survived or merely exercised transport. #199 owns genuine 3–5 novice observations; #187 owns the actual Owner decision.

Phase 3/4 industry, conveyors, transport vehicles, NPC colonies and civilization are excluded. Mystery observations remain observations, without hidden-truth claims or quest/GPS coordinates. Independent specialist/design review is pending unless separately evidenced.

Current corrections: [2026-10-04 engineering handoff](../phase2-issue-completion-2026-10-04.vi.md). Solo holding Space acquires a nearby explored target, supplies collision-checked movement and facing, and requests canonical attacks. Right click owns detailed object information. Map pins are explicit solo-private observations, not automatic resource discovery.
