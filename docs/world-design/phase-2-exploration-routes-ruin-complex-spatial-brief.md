# P2-WLD-001 — Exploration routes and ruin-complex spatial brief

Task [#267](https://github.com/5erax/ProZ0/issues/267), supporting #260. Evidence baseline: `main@f3208d36e22bac46a816a32bd4915de4ace2e070`, inspected 2026-10-05. Delivery: documentation prepared under the user's direct Company-B authorization; specialist identity, PM acceptance and runtime completion are not claimed. PR #266 remains independent and unmerged.

## Sources and current geography

Narrative constraints come from [the accepted Phase-1 hook](../narrative/phase-1-ruin-mystery-hook.md), [World Bible](../narrative/proz0-world-bible-foundation.md) confirmed/PO-decision sections only, [spatial grammar](proz0-nonlinear-mystery-spatial-grammar.md), [first-region readability](phase-1-first-region-spatial-readability.md), and [field guide](../narrative/proz0-environmental-storytelling-field-guide.md). The companion [evidence support](../narrative/phase-2-ruin-civilization-evidence-support.md) defines safe observations. These documents permit spatial translation, not new canon or gameplay.

| Anchor | Current evidence | Implemented meaning and limits |
|---|---|---|
| Base/resource ring | `src/world/phase2/ColonyRegions.ts`, `colonySurveySites` | Grove (-36,-10), spring (32,-18), seam (48,26) are existing fixed anchors. Their resource roles offer different outward choices. These are not new coordinates to apply to saved worlds. |
| Regional branches | `colonyBiomeAt`, `colonyRegionPosition` | Inside radius 96: landing grassland; outside: marsh/badlands along seed-rotated axis. Never promise north always means marsh. |
| Earlier engineered sites | `site:marsh-relay`, `site:badlands-array` | Prototypes (48,-120), (-48,120) rotate with seed. Existing observations describe grooves/plates, not identity or fate. |
| Repair/recovery sites | `src/world/phase2/ColonyExplorationSites.ts` | Lab, mining camp, shelter use bounded seeded dry-layout selection; five shipped survey IDs/positions remain unchanged. An abandoned field facility is not automatically attributed to the unknown builders. |
| River | `src/world/phase2/ColonyHydrology.ts` | Generation-v5 global-coordinate seeded river/tributaries, finite course and crossing samples. Crossing parameter positions -128/64/256 are in rotated river coordinates; depth is not proof of dry traversability. |
| Cave/mountain | `SoloCaveRegistry.ts`, `SoloMountain.ts` | Optional solo cave worldspaces and dry portal approaches; ridge/mesa/ramp profiles near portals. No evidence of hosted parity or a route to every ruin. |
| Current hints | `src/client/presentation/ColonyDepthOverlay.ts` | Discovered journal rows, inspected observations, traces guidance and comparison text exist. Restored relay also exposes lab coordinates: see RF-001. |

## Route hierarchy — proposed presentation, not a mandatory journey

Use a graph with optional edges: **base ↔ resource pocket ↔ visible trace ↔ local site ↔ extended complex**, plus independent **base ↔ river edge/cave approach**. Any node may be encountered first. The graph is a design checklist, not pathfinding data, a quest state machine or a claim that a complete complex already exists.

At base, preserve three materially different choices: sheltering grove, water edge and exposed stone. A player should read a difference from terrain/resource silhouettes before opening Journal. At a trace, show only remains actually in discovered space. Broken paving suggests attention along a local approach; it cannot promise an unseen destination. At a site, retain a legible entry and alternate retreat. At a complex, **PROPOSED** escalation uses at least two readable subspaces with different observable condition (open approach, partly covered interior/edge), a repeated construction relation and a return-facing silhouette. These are composition requirements for review, not new ruin IDs, loot, puzzles or rewards.

Complex design should deepen comparison: a repeated groove beside an interrupted plate arrangement can raise questions about connection. It must not declare a transport system, laboratory, temple or civilization fate. A player may turn back at any stage; no mandatory enemy, combat gate or fixed site order is added.

## Landmark spacing, visibility and return

1. **Major anchors** retain distinct silhouette and terrain context; **secondary cues** are smaller local remnants/resources. Do not give every remnant a POI card.
2. **Approach window:** at each proposed branch, a player should be able to see the branch's local terrain choice in explored space. Never extend visibility through fog to satisfy readability.
3. **Spacing:** current extra-site generator rejects proximity below 8 world units and radius below 16; these are existing generator safeguards, not authored route pacing. No universal metres/seconds interval is approved. Proposed tuning must be measured over actual seed routes and existing movement speed before acceptance.
4. **Empty traversal:** when an approach has no visible decision or resource/terrain memory cue, record the segment and seed. Prefer composition at existing anchors before adding more POIs.
5. **Clutter:** show one dominant local orientation cue per approach view; smaller cues must not compete with the actor or a harvest target. This is a proposed visual hierarchy, not a render-budget increase.
6. **Return:** reuse asymmetric silhouettes, water-edge side and the last visible branch. Looking back should preserve the same facts; Journal may retain observed names but should not draw an undiscovered route.
7. **Recovery:** each reviewed route needs a ground retreat that remains usable without hunting, a filled bag being discarded, or a new traversal mechanic. A route that fails this is a reported implementation gap, not silently fixed by moving a saved landmark.

## River, cave and mountain use

River bends/confluences are orientation opportunities only after exploration. Use existing water/ground authority for every candidate approach; do not infer a crossing from low displayed depth alone. A tributary can provide a meaningful choice between following the bank and turning toward higher ground. Preserve collision, wet/slow movement and placement limits.

A cave entrance/mesa is a memorable optional branch, not the required passage to a ruin. Portal entry/exit must return to the correct surface anchor. Test height/depth occlusion at the ramp and entrance without changing gameplay height to improve the picture. Existing portal centers are seed-jittered implementation facts, not map labels to reveal before discovery.

## Implementation handoff

| REQUIREMENT | CURRENT EVIDENCE | STATUS | EXPECTED IMPLEMENTATION CONSUMER | PATH/SYSTEM RISK | REQUIRED DOMAIN REVIEW | QA SCENARIO |
|---|---|---|---|---|---|---|
| Resource branches lead outward | Existing grove/spring/seam | IMPLEMENTED anchors; readability requires playtest | PM-A-selected world/presentation owner | Region seed rotation, fog | World/art; gameplay if pacing changes | Choose two different routes from base without a map reveal |
| Trace is local and observed | Journal trace hint and rendered site approach | IMPLEMENTED partial | World presentation | Visibility/culling/click overlap | Art/QA | Discover trace with destination still hidden |
| Complex spatial escalation | Existing individual templates only | PROPOSED / PRESENTATION GAP | PM-A-selected world implementation owner | Saved IDs, terrain, approach clearance | Gameplay/world/art | Compare two subspaces; leave by a safe alternate approach |
| Relay respects discovery | Lab coordinates in restored-relay Journal | IMPLEMENTED mismatch RF-001 | UI/world knowledge owner | Hidden-location leak; preserve reward semantics | Gameplay + narrative + QA | Restore relay before lab discovery: no unsupported coordinates |
| River provides route choice | Seeded river/crossing samples | IMPLEMENTED geography; route coverage UNVERIFIED | World presentation/QA | Water authority, versions 3/4/5 | World/QA | Same seed, both approach directions and return |
| Cave is optional/reversible | Solo portal registry | IMPLEMENTED solo only | Solo worldspace owner | Portal/save identity | World/QA | Enter/exit/save; base route remains usable |
| Revisit adds context | Inspected observations/comparison hint | IMPLEMENTED partial | Journal/content owner | Overstated inference | Narrative/QA | Reverse discovery order, original observation unchanged |

## Acceptance scenarios and review findings

For each scenario record exact commit, generation version, seed, locale, viewport, starting save, natural vs seeded fixture, screenshots, observed result and failure. Human orientation/understanding stays under #199; this brief cannot certify it.

| Scenario | Expected result |
|---|---|
| SP-01 outward choice | Player sees distinct local resource/terrain choices; no GPS or forced objective |
| SP-02 trace first | Trace can be observed before a destination becomes known; no hidden POI revealed |
| SP-03 branch/retreat | Terrain choice is meaningful and reversible without mandatory combat |
| SP-04 escalation | Proposed complex has distinguishable spaces and engineered continuity, with purpose unresolved |
| SP-05 return | Previously observed landmarks remain consistent on return and after save/reopen |
| SP-06 reverse order | Site→trace and trace→site preserve truthful observations; no unlock order is invented |
| SP-07 knowledge | Fog, Journal and relay do not publish unsupported hidden positions |
| SP-08 compatibility | Old generation/save identities remain intact; optional solo cave content is labelled |

RF-001: restored relay displays the lab name, distance, direction and exact coordinates without a discovered-lab guard (`ColonyDepthOverlay.ts`, `relaySignal`). Desired #267 boundary is observed-only. Consumer: PM-A-selected gameplay/UI owner must reconcile existing relay gameplay meaning before implementation.

RF-002: three extra sites are bounded individual templates; no complete authored ruin-complex route graph was found. Consumer: world implementation after this brief and narrative support review. Do not mark #260 complete from site count.

RF-003: Journal comparison uses a supply-network interpretation once two templates are inspected; it does not verify matching conduit geometry for every pair. Consumer: content/narrative review, then bounded presentation task.

RF-004: cave/mountain evidence is explicitly solo. Consumer: PM-A decides any hosted follow-up; the brief does not assume parity.

No new protected canon is required for these requirements. New builder identity, final-purpose labels or specific civilization events are `NARRATIVE_INPUT_REQUIRED` and excluded. PM-B reviews the artifact, then PM-A assigns downstream work. #260, #242 and Owner acceptance remain separate.
