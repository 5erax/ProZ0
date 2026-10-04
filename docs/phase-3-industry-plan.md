# Phase 3 — Industry

Owner-authorized execution: 2026-10-04. The Owner explicitly assigned Company B responsibility for complete game implementation in this chat. This candidate is integrated on main `f3208d3` (PR #265), preserving the intervening solo expedition, living world, caves, equipment, localization and world-first UI work. It adds the roadmap's industry systems to the same solo and hosted colony authority. No specialist identity, review or Owner acceptance is invented.

## Playable progression

1. Complete Field Survey and Expanded Storage in the existing colony research panel.
2. Open **Industry · O**, then research Industrial Automation using actual ore and cordage.
3. Build a solar array, material depot, fiber processor and fabricator on explored, clear ground near the player.
4. Deposit fiber, ore and processed supplies in the relevant buffers. Powered machines turn fiber into cordage, then cordage and ore into repair patches. Logistics research unlocks automated machine and power kits.
5. Connect directed, optionally filtered conveyors between nearby buffers. Each link consumes actual cordage and ore. Routes move one material unit every 30 active ticks, preserve material quantities and stop at full or unavailable destinations.
6. Extend independent power networks with relays. Finite capacity and deterministic allocation make power shortages visible. Solar supply follows the canonical day/night environment.
7. Combine colony cultivation and industry greenhouse research for protected crops; intensive cultivation adds a faster higher-yield recipe with additional inputs.
8. Research cargo mobility, build and charge a cargo rover, load material stock and issue bounded drives. The authority checks terrain, collisions, charge and cooldown before moving vehicle and operator together.
9. Maintain working equipment using real repair patches. Service-due, breakdown and repaired events are saved. Pause machines, disconnect logistics, unload buffers and dismantle to recover construction materials if the bag can accept them.

## Runtime contracts

| Concern | Owner and contract |
| --- | --- |
| Content | `src/content/phase3/IndustryContent.ts`: validated versioned facilities, recipes, research, costs, ranges and budgets |
| Canonical state | `IndustryAuthority` and `IndustryState`: one shared simulation, bounded facilities/links/buffers/events/receipts, monotonic facility identity |
| Inventory | `Phase1ItemAuthority.commitColonyExchange`: atomic real inventory costs and withdrawals; failure preserves buffers and material totals |
| Progression | Existing colony research prerequisites plus five industry research choices; no client-granted unlocks |
| Power | Independent connected components from arrays/relays, daylight supply, finite deterministic consumer grants |
| Production | Fixed-step active-time progression; inputs and capacity are checked before conversion; no offline output |
| Logistics | Snapshot-based directed transfers prevent same-step cascading and preserve materials through cycles, fan-out and full buffers |
| Mobility | Bounded cargo rover steps with canonical route/actor validation, charge, cooldown, wear and saved position; linked conveyors must be disconnected first |
| Commands | `industry.action` binds admitted identity and requires industry control and inventory revisions; duplicate successful operations replay saved receipts |
| Replication | Industry control revision changes on commands; the shared view uses `authorityTick + controlRevision` so live progress is delivered without making every remote control stale. Private receipt signatures stay on the authority/save side |
| Persistence | Optional validated `world.industry` in Save V2; old saves initialize empty state at the existing authority tick. Future/corrupt versions, invalid owners, clocks, recipes and missing colony prerequisites are rejected |
| Presentation | One accessible EN/VI panel adapter for solo and hosted state. Industry uses O, preserving Farm on F. It exposes real affordability, production, power, maintenance, transfers and vehicle controls; solo markers and conveyor routes use the canonical raster stage. Quiet world labels preserve the world-first UI |

## Acceptance map

| Roadmap scope | Implementation | Evidence |
| --- | --- | --- |
| Conveyors | Paid directed filtered links, bounded throughput, exact buffers | Industry unit conservation/fan-out/full-buffer tests; browser conveyor controls |
| Processing chains | Fiber → cordage → patches → construction kits | Real ledger fixtures, deterministic replay, paid UI production |
| Logistics | Depots, deposit/withdraw, routes and cargo stock | Capacity rollback, duplicate/stale operations, save/reopen |
| Power networks | Multiple grids, relays, finite supply, day/night interruption | Capacity, isolated-component, disable/night tests |
| Greenhouse progression | Protected and intensive crop recipes with real inputs | Research gates, input/output, deterministic cycles and actual 40-second UI harvest/save journey |
| Vehicles | Rechargeable cargo rover, bounded drive, collision and cooldown | Charge/path/replay/save tests and paid infrastructure UI cargo/drive/reload journey |
| Maintenance events | Active-use wear, service warning, breakdown, repair, safe dismantle | Wear/night/repair, no-loss/full-bag and persisted-event tests |
| Solo/co-op/save | Shared authority, admitted identity, control revisions and optional save extension | `industry-save-hosted.test.ts`; Phase 2 reconnect and legacy-save regressions |

Automated material grants and clock changes are explicitly labelled fixtures. They do not establish novice balance or a human expedition. Preserve the existing 50 FPS / frame P95 34 ms and 350 ms visible-start gates; do not lower thresholds to pass. The existing colony scene matrix, browser suite and natural gathering/storage/solo journeys remain required regressions.

## Product boundaries

This implements the first full Industry roadmap loop using existing canonical material IDs and new facility visuals. The cargo rover performs bounded authoritative drive steps, not an aircraft or continuous driving simulation. Industrial material buffers are separate from legacy structure containers and accept the declared material catalog. Factories produce only while simulation runs; elapsed offline time grants no stock, charge or crops. Solar production pauses at night; batteries, power cables for legacy condensers, terrain excavation and Phase 4 NPC/civilization systems are future scope. Industry power networks govern the new industrial facilities; the accepted Phase 1 foothold power rules remain compatible.

The branch is an engineering candidate. [Company B handoff](company-b-phase2-phase3-handoff.vi.md) records exact evidence and remaining gates. Genuine novice sessions (#199), a three-person Internet expedition and production first-movement variance (#204), and the Owner decision (#187) are recorded separately. Existing CI or a protected preview does not prove a new public production release.
