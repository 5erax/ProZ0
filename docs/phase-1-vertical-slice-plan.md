# Phase 1 — Vertical Slice Execution Plan

## Status

**Milestone:** Phase 1 — Vertical Slice  
**Planning status:** APPROVED FOR EXECUTION PLANNING  
**Accepted foundation:** `main @ 64df08f1cab7eaa913fb84f68de888d82ad63675`  
**Source planning issue:** P1-PLAN-001 / #28

## Product outcome

Phase 1 must deliver the first **30–60 minute playable ProZ0 vertical slice** that proves the approved MVP fantasy:

> land on an unknown planet, gather enough to survive, prepare for risk, establish a first habitat, make a dangerous expedition, encounter a threat, discover evidence of an earlier civilization, and return with a clear reason to continue the same world.

The slice is not accepted merely because individual backend systems exist. It must be understandable and directly playable by the Project Owner from a browser build.

## Confirmed Phase 1 scope

Derived directly from the approved roadmap and MVP/product documents.

### Player/session loop

The integrated slice must support:

`Land → Explore nearby → Gather → Manage needs/capacity → Return → Craft/repair → Build first habitat → Prepare expedition → Reveal new territory → Face hazard/hostile encounter → Reach one ruin/discovery → Return or die → Recover dropped inventory → Continue same persistent world`

### World and exploration

Required:
- one deterministic generated region with expandable chunk boundaries;
- basic readable terrain;
- water;
- trees/plants;
- ore;
- food source;
- wildlife;
- one hostile encounter;
- one discoverable ruin tied to the planet-mystery premise;
- fog of war;
- shared discovery semantics for hosted co-op;
- day/night;
- one meaningful weather event;
- persistent chunk/world mutations required by the slice.

### Player survival

Required:
- health;
- food;
- water;
- stamina;
- temperature exposure;
- equipment condition where needed by the slice;
- carrying capacity;
- preparation must materially affect expedition success;
- failure must be recoverable rather than world-ending.

### Inventory and logistics

Required:
- player inventory;
- weight-based capacity;
- item volume/category/stack/condition contracts where used by Phase 1;
- basic containers/storage;
- inventory transactions must be authoritative;
- dropped inventory at death site;
- recovery of dropped inventory.

Nested advanced logistics/warehouses/vehicles remain deferred unless required by an approved Phase 1 interaction.

### Gathering / crafting / repair

Required:
- gather basic renewable/static resources needed by the slice;
- basic hand/tool interaction;
- Tier 0 essentials;
- enough Tier 1 crafting to create a workbench, power unit, repair capability and first useful machine;
- recipe/content definitions must be data-driven;
- repair must have a clear gameplay reason within the slice.

### Building / habitat / machine

Required:
- landing module as starting anchor;
- first habitat room;
- corridor or equivalent connected module language where needed to prove the building grammar;
- storage;
- workbench;
- power unit;
- one first useful machine;
- placement and world mutation must be authoritative and persisted;
- the resulting base must visibly communicate player progress.

### Death and recovery

Required approved rule:
- death;
- respawn at base;
- carried inventory remains at death site;
- small XP loss;
- small durability loss;
- recovery expedition is possible;
- in co-op another player can help recover dropped inventory.

Exact balance values are Game Design outputs, not Producer assumptions.

### Progression prototype

Required by MVP:
- first character levels toward approximately level 3–4;
- meaningful XP from approved activities;
- demonstrate first specialization/profession path;
- one or two profession-quest prototypes;
- no permanent class lock.

Exact XP curves, rewards and profession quest rules require approved Game Design.

### Hosted co-op

Required:
- solo and hosted co-op use the same game rules;
- Phase 1 operational target: 2–4 players;
- architecture remains suitable for 10;
- host/server authority owns critical state;
- players can share map discovery;
- players can participate in world/building/logistics state;
- another player can assist with death-drop recovery.

Phase 1 does **not** require production matchmaking, dedicated-server fleet, prediction/reconciliation stack or 10-player production load certification unless later explicitly authorized.

### Persistence

The accepted Phase 0 save foundation must be extended only as needed for the Phase 1 slice:
- player inventory/equipment/progression/respawn data used by the slice;
- discovered fog/map state;
- terrain/world deltas used by the slice;
- buildings;
- containers;
- first machine state;
- research/progression state if introduced;
- ecological/event state only to the degree actually used;
- explicit save-schema version/migration compatibility;
- no silent data loss.

### PO-facing presentation requirement

Every Phase 1 integrated milestone candidate must be a **playable browser build**, not only test evidence.

By final Product Review the Project Owner must be able to:
- identify the player and world visually;
- understand movement and interaction without reading source code;
- see inventory/needs status;
- gather something;
- craft something;
- place/build something;
- identify the base;
- understand expedition risk;
- discover/reveal new territory;
- identify a ruin/discovery;
- experience or observe death/recovery;
- save/reopen the same world;
- play hosted co-op for the approved Phase 1 path.

## Explicit non-goals

Do not expand Phase 1 into:
- many production biomes;
- full procedural planet scale;
- advanced ecology simulation;
- advanced automation/conveyors/logistics;
- NPC colonists;
- aircraft;
- PvP;
- multi-planet travel;
- complete profession trees;
- complete research tree;
- complete alien factions;
- endgame civilization simulation;
- production cloud accounts;
- production matchmaking/service fleet;
- final-art completeness;
- Phase 2+ systems.

## Required specification gates before implementation

No engineer may invent missing gameplay or architecture rules.

### Game Design must define

Before relevant implementation:
- vertical-slice session flow and onboarding;
- interaction vocabulary;
- item/inventory/container rules;
- gathering/tool/resource rules;
- needs and survival-rate semantics;
- damage/death/respawn/recovery rules;
- crafting/repair recipe rules;
- building placement/connectivity/power/machine gameplay rules;
- fog/discovery/ruin interaction rules;
- hostile encounter/combat rules used by the slice;
- day/night/weather gameplay effects;
- XP/level/profession-prototype rules;
- solo/co-op gameplay behavior differences, if any.

### Art/UI must define

Before visual implementation:
- Phase 1 world visual language;
- player/world/resource/habitat silhouettes and scale;
- terrain/biome readability;
- HUD hierarchy;
- needs/inventory/crafting/building interaction presentation;
- fog of war rendering;
- interaction/selection feedback;
- hostile/hazard/ruin readability;
- placeholder-vs-final asset policy;
- integer pixel scaling and crispness continuity from Phase 0.

### Technical Design must define

Before subsystem implementation:
- authoritative item/inventory/container transaction model;
- data-driven content schemas;
- world-content generation and persistent delta model;
- fog/discovery persistence/replication;
- building placement/world mutation/power/first-machine state ownership;
- survival/combat/death/drop authority model;
- Phase 1 save schema extension/migration strategy;
- hosted co-op authority/transport/session protocol for 2–4 players;
- replication identities/revisions and conflict handling;
- observability for save failures, desyncs, tick cost, chunk generation and latency;
- performance budgets for browser vertical slice;
- testing strategy and deterministic boundaries for every authoritative system.

## Acceptance model

A Phase 1 task is not DONE because code exists.

Required lifecycle:
`DESIGN → TECH DESIGN → IMPLEMENTATION → TECH REVIEW → QA → INTEGRATION → ARCHITECTURE CONFORMANCE → FINAL QA → PRODUCT REVIEW`

All implementation PRs:
- link their source Issue;
- identify exact source Design/ADR;
- state authority/persistence/network impact;
- include automated tests;
- pass full required CI;
- hand off to Producer;
- are not merged merely because CI is green.

## Milestone-level acceptance criteria

Phase 1 is eligible for Product Review only when all of the following are recorded:

1. Browser build launches from clean checkout.
2. A new player can enter the vertical-slice world and understand the first action.
3. Player movement remains continuous/non-grid and Phase 0 responsiveness does not regress.
4. Basic world terrain/resources/water/wildlife are readable and interactable.
5. Fog hides unexplored territory and exploration reveals/persists discovery.
6. Player can gather approved resource types.
7. Inventory obeys approved weight/capacity/stack/condition rules.
8. Player can store items in at least one approved container.
9. Food/water/health/stamina/temperature behavior matches approved design.
10. Preparation changes expedition capability in an observable way.
11. Player can craft the approved Phase 1 essentials.
12. Repair flow works for at least one approved equipment/tool use case.
13. Player can establish the approved first habitat.
14. Storage/workbench/power/first machine are placeable and persist.
15. Base visibly communicates progression from landing state.
16. Day/night works and one approved weather event changes decisions.
17. One approved hostile encounter can occur and resolve deterministically/authoritatively.
18. One alien/previous-civilization ruin can be discovered and recognized as a meaningful mystery hook.
19. Death respawns at base.
20. Death drops carried inventory at the death site.
21. Approved XP/durability loss occurs.
22. Dropped inventory is recoverable.
23. Same-world save/reopen preserves all Phase 1 canonical state.
24. Corrupt/incompatible Phase 1 save state follows explicit failure behavior.
25. Character progression reaches the approved early-level prototype.
26. At least the approved profession-prototype path is demonstrable.
27. Solo uses the same authoritative game rules as hosted co-op.
28. Hosted co-op supports the approved 2–4 player vertical-slice path.
29. Shared discovery works for hosted co-op.
30. Shared world/build/container/machine state is authoritative and consistent.
31. A second player can assist recovery of a death drop.
32. Network failures cannot silently corrupt canonical world/save state.
33. No client-authoritative critical item/building/damage/world mutation is accepted.
34. Deterministic/golden contracts cover new deterministic authoritative systems where required.
35. Architecture-boundary lint/tests remain green.
36. Exact integrated-main CI passes all required gates.
37. Approved Phase 1 QA matrix has a recorded result for every source acceptance criterion.
38. No unresolved Critical/Major blocker remains.
39. Product Owner can play the integrated slice directly in a browser build.
40. Product Owner explicitly accepts Phase 1 in Product Review.

## Dependency strategy

### Wave A — specification
Can run in parallel where source requirements are already confirmed:
- master vertical-slice Game Design;
- Phase 1 visual/UI foundation;
- vertical-slice technical architecture plan.

### Wave B — subsystem designs
After master flow is stable:
- inventory/gathering/crafting;
- survival/death/combat;
- building/power/machine;
- exploration/fog/ruin/weather;
- progression/profession prototype;
- hosted co-op;
- persistence V2 extension;
- QA test plan.

### Wave C — foundation implementation
Data/content schemas and shared authoritative contracts first.

### Wave D — subsystem implementation
Implement dependency-isolated systems in parallel only after their design+tech gates pass.

### Wave E — vertical-slice integration
Connect world, player, UI, persistence and co-op into one browser experience.

### Wave F — conformance + final QA + Product Review
No Phase 2 activation before Product Owner acceptance.

## Quality bar

Phase 1 must improve both **system depth** and **what the Project Owner can visibly evaluate**.

A build that technically contains systems but still presents primarily as an engineering test room is not sufficient for final Product Review.
