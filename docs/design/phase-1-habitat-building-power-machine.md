# P1-DES-004 — Habitat, Building, Power, and First Machine Gameplay Specification

**Task:** P1-DES-004 / Issue #34  
**Role:** Game Designer / Systems Designer  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** READY FOR PRODUCER REVIEW  
**Depends on:** P1-DES-001 / #29 and P1-DES-002 / #32 — DONE / DESIGN READY  
**Implementation authorization:** NONE

---

# INFORMATION CLASSIFICATION

## CONFIRMED
- Phase 1 must visibly transform the landing site into a first useful human foothold.
- Required functions are landing module, first habitat, storage, workbench, power unit, and one first useful machine.
- Building must support the master loop: gather → store → craft/repair → build → gain capability → prepare farther expedition.
- Phase 1 uses the approved Construction Kit items from P1-DES-002.
- The first useful machine must solve a real problem in the 30–60 minute slice.
- Advanced automation, conveyors, warehouses, vehicles, production chains, and Phase 2+ infrastructure are out of scope.
- Machines do not produce while the host/world authority is offline.
- Shelter must provide the comfortable thermal environment expected by P1-DES-003.

## CONSTRAINT
- Player locomotion remains continuous/non-grid.
- A modular visual/building language does not require player movement or all structure placement to use a gameplay tile grid.
- This spec defines gameplay placement/connectivity/power rules; collision/graph/transaction implementation is Technical Design scope.
- P1-DES-002 owns portable kit inventory semantics and shared Storage Crate contents.
- P1-DES-003 owns survival effects once the player is inside valid shelter.
- Art/UI owns final silhouettes, footprint art, preview style, and connector rendering.

## DECISION NEEDED
None blocking.

---

# GAME DESIGN SPEC

## SYSTEM
Habitat, Building, Power, and First Machine

## STATUS
READY

## PRODUCT INTENT
Building in Phase 1 must make the player's progress visible and useful.

The landing site should change from:
**temporary arrival point**
into:
**a small functional foothold capable of storage, crafting/repair, shelter, power, and limited automated water production.**

The player should understand that building is not cosmetic-only: every approved placeable provides a clear capability that improves survival or expedition preparation.

---

# PLAYER GOAL
- Turn crafted Construction Kits into useful structures.
- Place structures without hidden grid rules.
- Understand why placement succeeds or fails.
- Create a sheltered habitat connected to the landing module.
- Store supplies and use a Workbench.
- Establish power.
- Operate one useful first machine.
- Reposition/dismantle mistakes without permanent progression loss.

---

# PLAYER EXPERIENCE
Target:
**Visible growth → understandable placement → practical capability → safer preparation**

The player should be able to look at the landing site and recognize:
- where the colony began;
- what was added;
- which structure stores items;
- which enables crafting/repair;
- which provides shelter;
- which provides power;
- which machine is running or blocked.

The system fails its Phase 1 goal if the base is only a set of decorative props with no gameplay consequence.

---

# 1. FINITE PHASE 1 PLACEABLE SET

Phase 1 supports exactly these building categories:

| Structure | Source item | Phase 1 role |
|---|---|---|
| Landing Module | pre-existing; not craft/placeable | spawn/respawn/base anchor |
| Storage Crate | Storage Crate Kit | shared storage |
| Workbench | Workbench Kit | Tier 1 craft + repair access |
| Habitat Room | Habitat Kit | first permanent shelter / base growth |
| Compact Power Unit | Power Unit Kit | supplies Phase 1 power capacity |
| Atmospheric Water Condenser | Machine Kit | first useful powered machine; produces Clean Water |

No standalone Corridor Segment is required in Phase 1.

For the slice, the approved "corridor or equivalent connected module language" is satisfied by a **direct modular connector link** between the Landing Module and Habitat Room. A full corridor-placeable system is deferred.

This avoids inventing an additional Corridor Kit outside the approved P1-DES-002 item set while still proving modular connection grammar.

---

# 2. BUILD PROGRESSION

Intended capability order:

1. Landing Module exists at world start.
2. Player gathers/crafts enough for Storage Crate and Workbench.
3. Storage Crate reduces personal carry pressure.
4. Workbench enables Tier 1 construction kits and repair.
5. Habitat Room connects to the Landing Module and creates comfortable shelter.
6. Compact Power Unit establishes powered infrastructure.
7. Atmospheric Water Condenser uses power to produce Clean Water over active game time.
8. Player can use stored/crafted water and repaired equipment to prepare the longer expedition.

This is an intended dependency/capability flow, not a forced quest rail.

If the player legally obtains kits in another order, placement is allowed whenever actual preconditions are satisfied.

---

# 3. BUILD MODE / INTERACTION FLOW

## 3.1 Enter build mode

Player selects a valid Construction Kit from inventory and chooses BUILD/PLACE.

Result:
- corresponding placement preview appears;
- ordinary world Interact does not accidentally gather/use another target while placement mode is active;
- player can move the preview according to input/UI rules defined by Art/UI/Engineering.

## 3.2 Preview states

Preview must communicate:
- VALID;
- INVALID.

If invalid, it must expose the primary blocking reason.

## 3.3 Confirm

On confirm:
- all placement rules are validated against current authoritative world state;
- if valid, exactly one matching Kit is consumed and one structure is created;
- if invalid, Kit remains in inventory and no structure is partially created.

## 3.4 Cancel

Cancel exits placement mode:
- Kit remains unchanged;
- no world mutation occurs.

## 3.5 Build duration

Phase 1 placement is immediate after a valid confirmed transaction.

No multi-minute construction timer or worker assignment exists.

Presentation may show a short construction effect, but gameplay capability becomes active when authoritative placement succeeds.

---

# 4. COMMON PLACEMENT RULES

Unless a structure has a stricter rule, placement requires all of the following.

## 4.1 Explored space

The entire structure footprint must be in EXPLORED territory from P1-DES-005.

The player cannot build blindly into unexplored fog.

## 4.2 Valid ground

Footprint must be on approved stable ground.

Invalid:
- water;
- non-buildable hazard surface;
- blocked/impassable terrain;
- area outside loaded/valid playable world.

## 4.3 No blocking overlap

Footprint may not overlap:
- solid terrain/prop geometry;
- another structure footprint;
- ruin protected footprint;
- active Death Cache footprint if overlap would make the cache inaccessible.

Decorative non-solid art does not automatically block placement.

## 4.4 Player safety

Placement may not:
- trap the placing player inside solid geometry;
- block the Landing Module spawn/respawn clearance area;
- block the only approved door/connector access of Landing Module or Habitat Room.

## 4.5 Base build zone

Phase 1 structures must be part of the first foothold.

Default build zone:
- structure anchor must be within **12 player collision-footprint widths** of either the Landing Module or the connected Habitat Room.

Rationale:
- keeps the Phase 1 base readable as one foothold;
- avoids designing remote outposts before the vertical slice proves the core loop.

This is a tuning value, not a world-grid constraint.

## 4.6 Placement granularity

Free-standing structures use continuous world-space placement.

They are not required to snap to terrain tiles.

Orientation:
- 0°, 90°, 180°, 270° logical rotations are supported where structure orientation matters.

Habitat connector placement is the exception described below.

---

# 5. LANDING MODULE

The Landing Module is pre-existing.

Phase 1 roles:
- initial world landmark;
- initial base anchor;
- respawn anchor;
- first modular connection anchor;
- center/reference for first build zone until Habitat Room exists.

It is:
- not dismantlable;
- not movable;
- not crafted;
- not a general storage container in Phase 1;
- not a replacement for Workbench, Storage, Habitat, Power, or Machine.

It provides a protected respawn clearance footprint that player building may not obstruct.

---

# 6. HABITAT ROOM / CONNECTION

## 6.1 Habitat Room placement

The first Habitat Room must connect to one available Landing Module connector.

Placement behavior:
- Habitat Room preview snaps its designated connector to a valid Landing Module connector;
- player may choose among valid connector orientations if more than one is available;
- the Habitat Room itself does not snap the player to a grid;
- only the modular structure connection uses connector snapping.

## 6.2 Connection validity

Valid Habitat placement requires:
- matching connector pair;
- no footprint collision;
- connector approach/door space remains traversable;
- resulting room is on buildable ground.

## 6.3 Phase 1 connection graph

For Phase 1:
- Landing Module ↔ Habitat Room is the only required module-to-module connection.
- No branching corridor graph, pressure simulation, room-sealing puzzle, or multiple habitat network is required.

The connector contract must remain extensible for later corridor/module systems but Phase 1 gameplay does not expose those systems.

## 6.4 Shelter

When a living player is inside the valid Habitat Room interior:
- the environment supplied to P1-DES-003 uses comfortable thermal target **50**;
- Cold Rain/night still render outside but do not lower the room's Phase 1 shelter thermal target.

The room does not instantly restore Health/Food/Water.

It provides shelter, not free healing.

---

# 7. STORAGE CRATE

Uses the shared Storage Crate inventory/container rules from P1-DES-002.

Building-specific behavior:
- free-standing placement within build zone;
- no power required;
- usable immediately after placement;
- team-shared in co-op.

Dismantle requires:
- crate is empty.

Reason:
- dismantling may not silently eject or destroy stored items.

---

# 8. WORKBENCH

## 8.1 Role

The Workbench enables:
- Tier 1 recipes from P1-DES-002;
- Repair Patch use for condition repair.

## 8.2 Placement

- free-standing within build zone;
- no Habitat connector requirement;
- no power required in Phase 1.

Rationale:
- player must be able to craft Habitat/Power/Machine Kits before the Power Unit exists.

## 8.3 Use

A player within valid Workbench interaction range may:
- open Tier 1 crafting;
- select valid repair target;
- execute the P1-DES-002 crafting/repair transaction.

The Workbench has no internal ingredient storage in Phase 1.

## 8.4 Co-op

Multiple players may access the Workbench presentation, but authoritative craft/repair uses each player's own inventory.

There is no Workbench queue.

Concurrent actions are independently valid if their own source inventories remain valid.

---

# 9. COMPACT POWER UNIT

## 9.1 Role

The Compact Power Unit introduces the concept:
**useful infrastructure may require an operating power source.**

It intentionally avoids a fuel economy in Phase 1.

## 9.2 Output

Default:
- `powerCapacity = 10 Power Units (PU)`

While placed:
- the Power Unit is always ON in Phase 1;
- it supplies 10 PU to eligible Phase 1 consumers.

There is no player toggle for the Power Unit in Phase 1.

No portable fuel item is consumed.

The Phase 1 unit is treated as a compact self-contained power source appropriate for the prototype.

Fuel/logistics progression is deferred.

## 9.3 Power radius

A consumer is eligible for the Phase 1 base power network when:
- consumer anchor is within **8 player-footprint widths** of the Compact Power Unit;
- both are in the same Phase 1 foothold/build zone.

No cable-placement system is required.

## 9.4 Capacity

Only active consumer demand counts.

If total enabled demand exceeds capacity:
- no hidden random allocation occurs.

Phase 1 contains only one powered-machine category and the first-slice build cap permits one Atmospheric Water Condenser, so normal approved content does not require a power-priority UI.

If future/debug content exceeds capacity:
- newly enabled consumer fails to enter RUNNING and reports INSUFFICIENT POWER;
- already-running valid consumer remains powered until its state changes.

Technical Design may implement deterministic ordering but may not silently overdraw capacity.

## 9.5 Offline behavior

Power state does not simulate productive machine time while authority is offline.

On reopen:
- a placed Power Unit resumes its normal always-ON Phase 1 behavior;
- machine progress is the persisted progress from last valid active-world state, subject to persistence rules.

---

# 10. ATMOSPHERIC WATER CONDENSER — FIRST USEFUL MACHINE

## 10.1 Purpose

The first machine solves an actual vertical-slice problem:
**repeated Clean Water preparation.**

Before the machine:
- player gathers Clean Water from the approved potable source and carries it back.

After the machine:
- the foothold can slowly generate Clean Water during active gameplay, reducing return trips and visibly increasing expedition readiness.

This demonstrates why building/power/machines matter without adding a new resource type.

## 10.2 Placement

Requires:
- one Machine Kit;
- valid free-standing placement within the base build zone;
- must be within 8 footprint widths of a Compact Power Unit to become powered.

Placement outside power radius is allowed if otherwise valid, but machine state is UNPOWERED until power is available.

## 10.3 Power demand

When enabled and not blocked:
- `condenserPowerDemand = 5 PU`

## 10.4 Input

Portable item input:
- **none**.

The machine represents atmospheric moisture capture.

This is a deliberate Phase 1 simplification.

## 10.5 Output

Produces:
- **1 Clean Water**
every:
- **90 seconds of active powered production**

Internal output capacity:
- **4 Clean Water**

The output buffer is player-accessible as a machine output inventory surface.

## 10.6 Machine states

### DISABLED
Player has manually turned machine off.

- demand = 0 PU;
- production paused.

### UNPOWERED
Enabled but insufficient/no eligible power.

- demand request exists;
- production paused.

### RUNNING
Enabled, powered, output not full.

- consumes 5 PU;
- production timer advances.

### OUTPUT FULL
Output contains 4 Clean Water.

- production paused;
- power demand becomes 0 PU in Phase 1.

### READY / PARTIAL OUTPUT
If output contains 1–3 Clean Water, machine may still RUN and continue producing until full.

## 10.7 Production progress

Production progress:
- advances only while RUNNING;
- pauses while DISABLED, UNPOWERED, or OUTPUT FULL;
- resumes from persisted partial progress when valid conditions return.

Collecting water does not reset unfinished current-cycle progress.

## 10.8 Offline production

There is **no offline water production**.

Elapsed real-world time while the host/authority is offline does not create Clean Water.

## 10.9 Maintenance

Phase 1 introduces no periodic machine wear/repair resource.

Maintenance semantics for this machine are explicitly limited to:
- keep it powered;
- keep output space available;
- collect produced water.

Machine-condition degradation, dust, component replacement, and maintenance events are deferred.

This is intentional; Engineer must not invent a hidden durability timer.

---

# 11. PHASE 1 BUILD CAPS

To keep the slice finite, normal player-facing Phase 1 content supports:

- Landing Module: 1 pre-existing
- Habitat Room: max 1
- Workbench: max 1
- Compact Power Unit: max 1
- Atmospheric Water Condenser: max 1
- Storage Crates: max 4

Attempting placement above the cap:
- fails before Kit consumption;
- communicates PHASE 1 BUILD LIMIT / ALREADY BUILT as appropriate.

These caps are prototype scope constraints, not long-term colony limits.

---

# 12. DISMANTLE / REPOSITION

Phase 1 supports dismantle for player-placed structures to make placement mistakes recoverable.

Landing Module cannot be dismantled.

## 12.1 Dismantle result

Successful dismantle:
- removes the structure;
- returns exactly **one original matching Construction Kit** to the dismantling player's inventory.

This is 100% kit recovery in Phase 1.

Rationale:
- the vertical slice should encourage learning the building grammar rather than permanently punishing placement experimentation.

## 12.2 Preconditions

Common:
- player is within interaction range;
- matching Kit output can fit in player inventory.

Storage Crate:
- must be empty.

Atmospheric Water Condenser:
- output buffer must be empty.

Workbench:
- no active craft/repair transaction.

Habitat:
- no player may be inside its interior at commit.

Power Unit:
- may be dismantled even if doing so makes Condenser UNPOWERED.

## 12.3 Failure

If preconditions fail:
- no structure is removed;
- no Kit is created;
- player receives explicit reason.

No partial dismantle state exists.

---

# 13. INVALID PLACEMENT REASONS

UI/player feedback must distinguish at least:

- UNEXPLORED AREA;
- INVALID TERRAIN;
- WATER / NON-BUILDABLE SURFACE;
- OBSTRUCTED;
- STRUCTURE OVERLAP;
- BLOCKS SPAWN;
- BLOCKS REQUIRED DOOR/CONNECTOR;
- OUTSIDE BASE BUILD ZONE;
- CONNECTOR REQUIRED / INVALID CONNECTOR;
- BUILD LIMIT REACHED;
- KIT NO LONGER AVAILABLE;
- WORLD STATE CHANGED / POSITION TAKEN.

For Power/Machine operation, separate state reasons include:
- OUT OF POWER RANGE;
- INSUFFICIENT POWER;
- MACHINE DISABLED;
- OUTPUT FULL.

---

# 14. CO-OP BUILD / USE BEHAVIOR

## 14.1 Shared structures

All Phase 1 structures are team/world structures.

No per-player private copy.

## 14.2 Placement

Any active player with the required Kit may place a valid structure.

The Kit comes from that player's inventory.

## 14.3 Concurrent placement

If two players confirm overlapping/competing placements:
- one valid authoritative result may commit;
- the other fails with WORLD STATE CHANGED / POSITION TAKEN;
- losing player's Kit remains.

No duplicate structure or double consumption is valid.

## 14.4 Use

Any teammate may:
- use shared Storage Crate;
- use Workbench with own inventory;
- collect Condenser output;
- enable/disable Condenser;
- dismantle if preconditions pass.

Phase 1 has no build permissions/ownership ranks.

## 14.5 Shared machine output

Clean Water in Condenser output is shared team state.

First successful transfer wins according to P1-DES-002 contention semantics.

---

# 15. PERSISTENCE — PLAYER-FACING EXPECTATIONS

Save/reopen must preserve:
- structure type;
- world position;
- orientation;
- Habitat ↔ Landing connector state;
- Power Unit placement/state needed to restore its always-ON supply;
- machine enabled state;
- machine production partial progress;
- machine output contents;
- power/machine state necessary to reconstruct the same canonical result;
- Storage Crate contents through P1-DES-002 container persistence.

Reopen must not:
- duplicate Kits;
- duplicate structures;
- reset Condenser output to full/empty arbitrarily;
- award offline production;
- forget already-consumed placement Kits;
- silently move structures.

---

# 16. PLAYER FEEDBACK REQUIREMENTS

Building:
- selected Kit / structure name;
- placement footprint/preview;
- VALID / INVALID;
- invalid reason;
- connector availability for Habitat;
- successful placement;
- build-cap reason.

Structures:
- Storage identity;
- Workbench usability;
- Habitat shelter state/readability;
- Power Unit enabled/available capacity;
- Condenser state: DISABLED / UNPOWERED / RUNNING / OUTPUT FULL;
- current output count;
- partial production progress may be shown as progress, but exact display is Art/UI scope.

Dismantle:
- what Kit will be returned;
- why dismantle is blocked.

No player should need debug data to understand why a machine is not producing.

---

# 17. INPUTS

- selected Construction Kit;
- player build/place/cancel/dismantle intent;
- explored state;
- world terrain/collision/structure state;
- base anchor/connector state;
- player inventory;
- shared container state;
- power source/consumer state;
- machine enabled/output/progress state;
- player location/interior state.

# 18. OUTPUTS

- structure created/removed;
- Kit consumed/returned;
- connector state;
- shelter availability;
- power capacity/demand result;
- machine state transition;
- Clean Water output creation;
- explicit success/failure reason;
- persistent world/base mutation.

---

# 19. SYSTEM INTERACTIONS

## P1-DES-002
- consumes approved Construction Kits;
- Storage Crate uses shared container rules;
- Workbench enables Tier 1 recipes/repair;
- Condenser creates existing Clean Water items.

## P1-DES-003
- Habitat interior supplies thermal target 50;
- Landing Module/base remains respawn anchor;
- machine water improves expedition preparation;
- no free Health/Food reset is provided by buildings.

## P1-DES-005
- building requires EXPLORED ground;
- base remains exploration/return anchor;
- placement must not overlap protected ruin content;
- weather does not modify Compact Power Unit/Condenser operation in Phase 1.

## P1-DES-006
- first successful build types and first machine operation may award progression XP;
- Engineer profession prototype may consume these milestones but does not own building rules.

---

# 20. EDGE CASES

1. **Kit disappears/changes before confirm:** placement fails; no structure.
2. **Two players place same location:** one commits; other retains Kit.
3. **Player stands in preview:** placement invalid if final solid footprint would trap/overlap player.
4. **Habitat connector becomes occupied before confirm:** placement fails.
5. **Dismantle Storage with items:** blocked; items remain.
6. **Dismantle Condenser with water output:** blocked; water remains.
7. **Dismantle Power while Condenser runs:** Power is removed; Condenser becomes UNPOWERED and preserves partial production.
8. **Power restored later:** Condenser resumes partial progress.
9. **Output reaches four:** machine enters OUTPUT FULL and stops consuming power.
10. **Player removes one water from full output:** if enabled/powered, machine resumes production from current partial-cycle state.
11. **Save while machine halfway:** reopen restores half-progress; no offline production.
12. **Save while machine output full:** reopen stays full.
13. **Habitat dismantle while player inside:** blocked.
14. **Build at fog edge:** footprint must be fully explored; partial unexplored overlap invalid.
15. **Build limit reached:** Kit is not consumed.
16. **Attempt remote outpost:** outside Phase 1 build zone fails.
17. **Respawn clearance threatened:** placement invalid.
18. **Cold Rain while inside Habitat:** shelter target remains 50.
19. **Co-op teammate collects water:** shared output updates; no duplicate water.
20. **World reopened with stale client preview:** fresh authority validation determines placement; preview does not reserve world space.

---

# 21. BALANCE / TUNING VARIABLES

- baseBuildRadius = 12 footprint widths
- powerRadius = 8 footprint widths
- powerCapacity = 10 PU
- condenserDemand = 5 PU
- condenserCycle = 90 active seconds
- condenserOutputCapacity = 4 Clean Water
- Phase 1 build caps by structure
- structure footprints/connector offsets (Art/Technical integration)
- interaction ranges
- protected spawn clearance
- short presentation timing

These are Phase 1 tuning values; the system contracts above remain invariant.

---

# 22. PHASE 1 SCOPE

Included:
- pre-existing Landing Module;
- up to four Storage Crates;
- one Workbench;
- one Habitat Room directly connected to Landing Module;
- one Compact Power Unit;
- one Atmospheric Water Condenser;
- continuous-world placement;
- connector snap only for Habitat module connection;
- clear invalid reasons;
- reversible dismantle with full Kit return;
- simple radius/capacity power;
- machine active-time output;
- shelter;
- co-op shared build/use;
- persistence expectations.

---

# 23. DEFERRED

- standalone corridors;
- multiple habitat rooms;
- module branching networks;
- structural support;
- air pressure/oxygen;
- doors/locks;
- build permissions;
- private ownership;
- cables/pipes;
- batteries;
- fuel economy;
- solar/daylight power curves;
- advanced generators;
- multiple power priorities;
- conveyors;
- processing chains;
- machine recipes/input chains;
- machine wear/maintenance events;
- warehouses;
- vehicles/garages;
- greenhouses/labs;
- NPC builders;
- construction timers;
- remote outposts;
- upgrade tiers.

---

# 24. NON-GOALS

- Technical graph/transaction architecture.
- Save/network schema.
- Final collision footprint math.
- Final art/animation.
- Full colony simulation.
- Advanced automation.
- Profession/research design.

---

# 25. ACCEPTANCE CRITERIA

### AC-BUILD-001 Finite set
The Phase 1 build UI/content exposes only the finite structure set defined in this spec.

### AC-BUILD-002 Kit consumption
A valid placement consumes exactly one matching Kit and creates exactly one structure.

### AC-BUILD-003 Invalid placement safety
An invalid placement consumes no Kit and creates no partial structure.

### AC-BUILD-004 Continuous placement
Free-standing structures use continuous world-space placement and do not force player/tile grid-lock.

### AC-BUILD-005 Explored requirement
Structure footprint cannot be committed in unexplored territory.

### AC-BUILD-006 Collision/clearance
Structure cannot overlap invalid terrain, structures, spawn clearance, or required access.

### AC-BUILD-007 Build zone
Normal Phase 1 structure placement remains within the 12-width foothold build zone.

### AC-HAB-001 Connector
Habitat Room requires a valid direct Landing Module connector and readable connection state.

### AC-HAB-002 Shelter
A player inside valid Habitat receives the P1-DES-003 comfortable thermal target 50.

### AC-HAB-003 No hidden healing
Habitat shelter does not automatically restore Health/Food/Water.

### AC-STOR-001 Shared storage
Placed Storage Crate exposes the shared P1-DES-002 container state.

### AC-WB-001 Workbench gate
Tier 1 craft/repair is available at a placed functional Workbench without power.

### AC-PWR-001 Capacity
Placed Compact Power Unit supplies 10 PU to eligible consumers in 8-width range.

### AC-PWR-002 No fuel system
Phase 1 Power Unit requires no portable fuel item and engineers do not invent one.

### AC-MACH-001 Useful output
Enabled/powered Condenser produces 1 Clean Water per 90 active powered seconds.

### AC-MACH-002 Output cap
Condenser stores at most 4 Clean Water and stops production at full output.

### AC-MACH-003 Power state
Unpowered/disabled machine produces nothing and preserves partial production progress.

### AC-MACH-004 No offline production
Offline elapsed time does not create Clean Water.

### AC-MACH-005 No hidden wear
Phase 1 Condenser has no unapproved condition/maintenance timer.

### AC-DISM-001 Reversible learning
Valid dismantle returns exactly one original matching Kit.

### AC-DISM-002 Protected contents
Container/machine cannot be dismantled while required contents remain.

### AC-COOP-001 Shared build state
All teammates observe/use the same placed structure state.

### AC-COOP-002 Concurrent placement
Competing placement cannot duplicate structure or consume losing player's Kit.

### AC-PERSIST-001 Reopen continuity
Save/reopen reconstructs placed structures, connection, machine state/output/progress without duplication or offline production.

### AC-SCOPE-001 No advanced automation
No corridor network, fuel chain, cable, conveyor, warehouse, advanced machine chain, or remote-outpost system is implied.

---

# 26. OPEN QUESTIONS

None blocking.

Exact footprint pixels, connector coordinates, presentation preview, and internal power graph implementation belong to Art/Technical Design.

The Atmospheric Water Condenser is the approved Phase 1 first-machine gameplay choice for this specification; changing its core function later would require Game Design source revision rather than an Engineering assumption.

---

# 27. ASSUMPTIONS

The power/build radii, output timing, output capacity, and build caps are explicit Phase 1 tuning defaults selected to fit the 30–60 minute slice.

Full Kit recovery on dismantle is a Phase 1 usability choice intended to keep first-session building experimentation recoverable.

---

# 28. DEFINITION OF DONE SELF-CHECK

- Landing Module role explicit: PASS
- Finite placeable set enumerated: PASS
- Placement vocabulary/rules/reasons explicit: PASS
- Habitat/connector behavior explicit: PASS
- Storage/Workbench roles explicit: PASS
- Build costs traced to approved Kits: PASS
- Dismantle/recovery explicit: PASS
- Power availability/consumption explicit: PASS
- First machine input/output/operation/maintenance explicit: PASS
- First machine has meaningful 30–60 minute utility: PASS
- Persistence expectations explicit: PASS
- Co-op build/use/contention explicit: PASS
- No advanced automation introduced: PASS
- Technical Design can proceed without gameplay invention: PASS
- QA can derive PASS/FAIL tests: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
