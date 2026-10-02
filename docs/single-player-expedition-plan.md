# Single Player expedition branch — execution and staffing contract

Owner request: 2026-10-02, executed directly in this chat. Baseline: main `638d51d690dc52c3944e04dc3b3c5beb618e6f0f` / PR #208. Branch: `product/single-player-expedition`. This is a focused product branch; Phase 2 Owner acceptance and the co-op performance/novice gates remain separate. No specialist identity, retrospective approval or human playtest result is invented.

## Product outcome

A solo player starts a distinct seeded world, leaves the landing laboratory with useful supplies, gathers without fighting misleading inventory limits, plans and funds a temporary base wherever explored terrain permits, sleeps safely, prepares expedition supplies, encounters moving wildlife, and returns to a world whose ecology has developed during active play. Save/reopen preserves paid materials, buildings, discoveries and world evolution. Each feature must be reachable from the player UI; APIs or decorative icons alone do not constitute delivery.

The critical path is SP-01 → SP-02 → SP-03/SP-04 → SP-05 → SP-06/SP-07 → SP-08/SP-09 → SP-10. Each coherent verified increment receives its own commit. Task IDs, interfaces and evidence make later assignment possible without rediscovering the chat. A task can be assigned to a discipline after interface readiness; names below indicate capabilities, not an appointment of an actual employee.

## Audit and interpretation of all feedback

| Owner feedback | Observed implementation at baseline | Professional requirement | Acceptance owner/task |
|---|---|---|---|
| 1. Sleep | No sleep/rest command. Sustenance `bedBuilt` means a cultivation bed, not a sleeping bed | Interruptible, safe sleep interaction at the lab or a constructed camp bed; clear recovery and cancellation | Gameplay + QA, SP-05 |
| 2. Weight/space/slots | 20 kg soft/inbound limit, 25 kg hard limit, 24 volume; volume is not a count of inventory slots. Multiple stacks and durable items can look like unused space | Distinguish physical weight, occupied volume and stack count. Provide a larger expedition pack, readable remaining capacity, meaningful feedback and nearby storage | Inventory + UI, SP-02 |
| 3. Bases away from landing | `Phase1BuildingWorld` radius 7.5, caps 1 for most facilities, Habitat tied to landing connectors; workbench access uses base | Solo outposts on explored buildable ground; range measured from actor, not origin. Cheap early storage/workbench; remote facilities have real functions | Building + World, SP-03/SP-04 |
| 4. Sparse craft/build | Five player-placeable canonical structure types and small recipe catalog | Add distinct expedition facilities and supply recipes with concrete use/cost, not copies with new names | Gameplay + Content, SP-04/SP-05 |
| 5. Fresh generated worlds | New-world launcher already uses crypto UUID for seed. Chunk generation is deterministic, but starting anchors/region pattern partly repeat | Show/edit/copy seed, generate a fresh default per New World, preserve seed on Continue; generated routes/resources vary while a safe spawn remains | World + UI, SP-06 |
| 6. Renewal too slow | Fiber 600 s, food 900 s, timber/stone 1800 s, ore 5400 s; pressure multiplies delay | Expedition rates visible to player; plants/timber renew much sooner, mineral renewal explicitly slower. Depletion cannot be reset by reload or chunk streaming | Ecology + QA, SP-07 |
| 7. Unexpected development | Ecology currently recovers pressure but does not create evolving opportunities | Bounded deterministic emergent events from seed, time, harvest pressure, weather and exploration; effects and history saved. No wall-clock reroll, infinite yield or unsupported claim that developers cannot know possible rules | Systems + World, SP-08 |
| 8. Static screen rain | Inspect presentation tick/projection before changing it | Time-based falling streaks, drift, depth, world-relative splashes and restrained contrast; no stationary opaque screen pattern or allocation-heavy per-frame rebuilding | Rendering + QA, SP-09 |
| 9. Blueprint first/materials later | Kit must exist before canonical placement | Plan → relocate/rotate → partial deposits → complete → real facility. Cancel returns precisely deposited materials; no consumption on failed placement, no duplicate rewards after retries/reload | Transactions + UI, SP-03/SP-04 |
| 10. Useless landing lab | Landing is spawn/base anchor; no dedicated interaction panel | Nearby lab interaction: help, rest, finite initial supply recovery, research access and clear facility purpose. Supplies cannot be claimed twice after save/reopen | Gameplay + UI, SP-05 |
| 11. Stationary monster | Combat transitions idle/alert/chase/attack/return, but chase does not update position | Patrol/chase/return move through collision-safe world positions; telegraphed attack, leash and death remain canonical; position persists | Combat + World, SP-09 |
| 12. Additional proposals | Existing novice gates remain open | Add seed display, capacity explanation, construction progress/refund, event journal, meaningful contextual prompts and explicit save compatibility; measure the natural expedition | Product + QA, SP-10 |

## Chosen gameplay rules and initial tuning

These are testable initial tuning values, not claims that novice balance is solved. Record later adjustments beside their evidence.

### Carry and supplies

- Solo expedition pack: 32 kg useful carry, 40 kg hard ceiling, 48 volume. Heavy starts above 80% of useful carry. Volume is labelled `volume`, never `slots`; occupied stack count is shown separately and is not a fictitious slot limit.
- Only the solo branch opts into these capacities. Existing Phase 1 and multiplayer limits stay compatible. Imported overloaded inventory remains removable/exportable; inbound operations still respect actual capacity.
- Capacity checks apply to gather, craft, pickup, deposit refunds and transfers, not only HUD text. Reductions in stack quantity release weight and volume accurately. Fractional display rounds only presentation, never authority accounting.
- Compact storage/workbench need few local materials. Supply crafting adds useful food/water/dressing/wrap/tool replenishment through canonical item exchange. Recipe output must fit; insufficient ingredients or capacity consume nothing.

### Construction and outposts

- Solo free-placement facilities can be built in any explored, active, dry/buildable region within 4 world units of the actor. Bounds still reject water/channel, obstruction, overlap, spawn/access blockage and unknown terrain.
- Preserve old canonical kit placement for compatibility. New construction UI accepts a planned footprint before ingredients exist. Ghosts reserve other ghost footprints but do not grant collision, shelter, power or storage.
- Plan limit: 32 unfinished plans. Completed expedition facility limit: 64. Limits prevent an unbounded save/render workload and are explained rather than silently discarding state.
- A plan records stable ID, owner, definition, anchor/orientation, exact required and paid material quantities, revision and status. Deposit takes only outstanding materials available in the player's bag. No automatic taking from distant crates.
- Rotation/move validates the new footprint before altering the plan. A funded but incomplete plan keeps its materials when moved. Changing facility type is not allowed; cancel/refund and create a new plan instead.
- Construction completion validates the world again. Failed validation keeps the funded plan and paid materials intact. A completed canonical facility uses the existing building/container machinery, not a decorative stand-in.
- Cancel refunds paid quantities once. If the refund cannot fit, keep the plan and explain the needed capacity; do not destroy materials. Canonical dismantling follows existing empty-container/access rules.
- New functional field facilities: camp bed (rest), campfire/cook station (ration preparation), rain collector (bounded wet-weather water output), field laboratory (remote research access), trail beacon (discovered map marker), supply cache (storage through canonical crate), workbench (remote canonical crafting). The exact content mapping is documented in SP-04; aliases must not claim new powers they do not implement.
- Habitat connector expansion remains a canonical landing feature; standalone shelter is supplied by the camp bed/shelter facility rather than pretending free-standing Habitat connectors exist.

### Sleep and landing laboratory

- Sleep is an 8-second active-time channel at a lab or completed camp bed within interaction range. It restores bounded health/stamina after the full channel; food/water costs and normal time/environment continue. It is a short rest, not an unimplemented instant night skip or offline simulation.
- Require alive, sufficient food/water and no nearby live hostile. Movement, damage, leaving range, closing/interrupting the action or death cancels. Cancellation gives no completion reward. A cooldown prevents repeated free healing.
- Starting lab panel explains its roles and offers rest/research/one-time emergency supplies. The finite supply receipt belongs to world/player save state. Nearby action prompts must name the lab so it is discoverable without a help wall.

### Seed, renewable ecology and events

- A default seed is freshly generated each New World; a user-entered seed reproduces initial generation. Continue never rolls a new seed. World ID and seed are distinct identifiers.
- Preserve old generation versions and fingerprints. Any change in base generation uses a new generation version; do not silently regenerate existing explored chunks. Existing saves can receive the expedition extension without changing their terrain generation.
- Proposed expedition renewal: fiber 120 s, food 180 s, timber 360 s, stone 600 s, ore 900 s before biome/pressure modifiers. Water remains reusable as currently defined. Feedback distinguishes a stump/depleted seam from a broken interaction and shows remaining renewal time.
- Renewal runs on saved authority ticks and catches up when a chunk is activated. Pausing/exiting does not simulate offline days or create loot. Sleep still advances normal active-time systems.
- Emergence means a deterministic system whose combinations vary, not arbitrary chaos: seasonal plant flush, dry spell, mineral exposure, wildlife activity and recovery windows. A seeded event schedule interacts with harvest pressure/weather and observed regions; bounded modifiers change renewal, supply/encounter opportunities or survival costs.
- Event history and schedule cursor are saved. Repeat loading cannot reroll an event, duplicate a reward, erase a paid structure or overwrite unexplored seed generation. Events do not destroy bases or reveal hidden locations. Rare beneficial and adverse outcomes retain visible causes/clues and recovery options.
- At most one regional event transition per authority interval and a bounded 32-entry history; simulation must not scan the entire infinite map every tick. Player journal shows what was observed, not hidden developer state.

### Weather and encounters

- Rain uses presentation time for smooth streak motion and authority weather for whether rain exists. Camera-relative rendering must not pin splash locations to the glass of the screen. Reduce density on small viewports and under reduced-motion preferences; keep essential prompts unobscured.
- Predator movement uses bounded speed per fixed tick, collision sweep, terrain access and a leash. Patrol is visible without immediate aggression. Chase cannot teleport or cross solid facilities/water illegally. Attack windup/recovery stay readable; dead enemies remain dead after reload.

## Work breakdown and task interfaces

Every task handoff records input baseline, edited paths, exported API/state, semantic rules, tests, commit, migration impact and known limitations. Status values: PLANNED → IMPLEMENTING → VERIFIED → COMMITTED; BLOCKED means a concrete missing prerequisite, not lack of invented specialist approval.

| ID | Capability / priority | Inputs and implementation scope | Output / dependent tasks | Verification |
|---|---|---|---|---|
| SP-01 | Product/architecture, P0 | Audit actual functions and contracts; define solo opt-in, tuning, save version boundaries | This plan plus execution ledger; enables all tasks | Source links/path review; no prose-only mirror tests |
| SP-02 | Items/UI, P0 | Authority capacity policy and readable HUD/inventory; solo opt-in propagated through bundle | One capacity contract consumed by all transactions and UI | Gather/craft/pickup/refund/transfer limits; legacy/co-op unchanged; no dupes |
| SP-03 | Building/transactions, P0 | Remote spatial placement and caps; stable blueprints, partial deposits, cancellation and move/rotate | Saved plan API; real canonical building completion | Unknown/wet/collision/range rejection; stale/duplicate/deposit/refund; funded plans survive restart |
| SP-04 | Content/crafting, P0 | Data-driven costs, definitions and functional expedition facility/recipe catalog | Facility capabilities, remote stations and construction cards; consumes SP-02/03 | Recipe conservation/output capacity, actual field storage/workbench and remote placement |
| SP-05 | Survival/UI, P0 | Sleep channel; lab panel; finite supply receipt and functional field facilities | Rest/lab contextual actions, bounded production/cooking and feedback | Rest completion/cancel/hostile/food/cooldown; supply replay; functional benefit after save |
| SP-06 | Generation/lobby, P1 | Seed input/copy/display; fresh default; versioned diversity improvements | Seed UX and deterministic new-world behavior | Same seed same initial world; different seeds differ; Continue identical; old saves preserve chunks |
| SP-07 | Ecology, P1 | Solo renewal policy and inactive/active catch-up, visual remaining time | Resource lifecycle reusable by events | Deplete → leave chunk → return/reopen; correct due time and ecology multiplier; no reload reset |
| SP-08 | Systems/ecology, P1 | Seeded, saved event schedule/cursor/history; bounded contextual effects | Living-world journal and event rules; consumes SP-06/07 | Deterministic replay, save/reopen, no reroll, bounded costs and no free inventory grants |
| SP-09 | Rendering/combat, P1 | Animated rain and world splashes; collision-safe moving predator; persistent location | Readable dynamic weather and encounter | Fixed-tick distance/collision/leash/attack/death; save position; screenshots at two times; frame budgets |
| SP-10 | Integration/QA, P0 release gate | Natural solo expedition through actual controls, old-save/new-world checks; source and release evidence | Commit-by-commit ledger, PR description and clear handoff | Real gather → remote plan/deposit/storage → rest/craft → save/reopen; all required checks; exact public identity only if released |

### Path and interface ownership

- Shared runtime integration: `src/integration/Phase1AuthorityBundle.ts`, `Phase1SaveV2Composer.ts`, `src/client/runtime/Phase1ProductReviewRuntime.ts`. Edit sequentially; later personnel must inspect the ledger and merge dependencies before touching these paths.
- Inventory: `src/simulation/items/ItemCapacity.ts`, `ItemLedger.ts`, `ItemTransactionAuthority.ts`; policy injection avoids silently changing co-op.
- Building: `src/world/building/Phase1BuildingWorld.ts`, `src/simulation/building/BuildingAuthority.ts`, world adapters; transaction completion must remain synchronous/atomic at the chosen authority boundary.
- Expedition additions: `src/content/singleplayer/`, `src/simulation/expedition/`, `src/client/presentation/SinglePlayerExpeditionOverlay.ts`. Keep state/UI separate; DOM controls call authority commands.
- Save: optional versioned expedition extension in Save V2 world manifest with explicit validation and composer support. Missing extension means legacy state; corrupt/unsupported state is rejected, not silently reset. Seed, paid materials and event schedule must survive portable export/reopen.
- World: `src/world/phase1/Phase1ChunkGenerator.ts`, `Phase1WorldStore.ts`, `src/world/phase2/ColonyRegions.ts`; generation fingerprint contract is immutable per version.
- Encounters: `src/simulation/combat/CombatAuthority.ts`, predator world snapshot and Save V2 records. Runtime movement and persisted position cannot diverge.
- Visuals: existing diorama renderer/presentation overlay. Avoid replacing the renderer or adding a large engine dependency to solve a rain bug.

## Transaction and persistence invariants

1. No UI-granted materials, fabricated container contents or pre-granted research in normal play.
2. One operation ID returns one result; conflicting payload rejected. Stale revisions consume nothing. Deposit/refund/completion receipts are bounded and persisted where replay can duplicate value.
3. Paid materials are either in inventory, held by a saved unfinished plan, or embodied in exactly one completed facility. They cannot be in two places.
4. Save validation checks identities, limits, finite positions, orientation, material bounds, event ticks/cursor and structure/container owners. Do not bypass existing checks to make a new field load.
5. Capacity presentation and authority share the same policy. Rounding for labels cannot change whether an operation is allowed.
6. Solo feature flags/configuration are explicit. A one-player co-op room is still co-op and does not automatically gain solo powers.
7. Save restores unfinished construction and simulation state before presenting actions. No time travel backward, seed reselection or generation overwrite on Continue.
8. Only explicit world start rerolls seed. Old save migration has a written boundary and targeted test.

## QA, performance and release definition

- Domain tests cover transaction conservation, rest cancellation, events/renewal and movement. Integration tests prove save/reopen plus real canonical item/building behavior. Avoid tests that merely assert the plan's wording.
- Natural browser journey must use ordinary movement, gathering and material deposits; separate fixtures may accelerate rare events/hostile positioning but are labelled and do not substitute for balance evidence.
- Quiet HUD, construction cards and contextual facility interactions at 640×360, 1280×720 and 1920×1080. Keyboard/UI actions must agree; panels cannot leak input to movement or accidentally swallow the placement click.
- Existing frame budget remains FPS ≥50 / P95 ≤34 ms under isolated full-scene measurement. Capture rain at different timestamps and actual moving predator positions rather than a static screenshot labelled animation.
- Existing required typecheck, lint/architecture boundaries, unit, integration, determinism, browser and E2E checks run before release. Run targeted tests per commit; run broad CI once integrated, repeat only after a new failure/change.
- A verified commit is not automatically a production release. Branch commits and PR identify readiness; deployment must pin exact commit/assets and preserve existing production worlds. Existing authorization covers delivery, but a half-verified branch is not published as accepted Phase 2.
- Human novice balance and Owner acceptance remain distinct. Do not fabricate testers, infer acceptance from CI or close unrelated co-op gates because solo improved.

## Suggested next additions after this cut

Prioritize split-stack/quick-transfer storage, discovered outpost map naming, lightweight local difficulty options and measured ecology tuning from actual solo sessions. Defer conveyors, vehicles, NPC settlers, industry, uncontrolled destructive mutations, unbounded terrain excavation and paid hosting changes. These require their own scope and staffing contracts rather than being hidden in this single-player delivery.

## Execution ledger

| Task | Status | Commit/evidence | Handoff |
|---|---|---|---|
| SP-01 | VERIFIED; documentation commit next | Source audit at baseline above | Plan is authoritative for this branch; implementation adjustments must be recorded |
| SP-02–SP-10 | PLANNED | No implementation claimed | Execute dependency order; update ledger in each meaningful commit |
