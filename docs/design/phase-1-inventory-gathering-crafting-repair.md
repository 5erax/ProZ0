# P1-DES-002 — Inventory, Gathering, Crafting, and Repair Gameplay Specification

**Task:** P1-DES-002 / Issue #32  
**Role:** Game Designer / Systems Designer  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** READY FOR PRODUCER REVIEW  
**Depends on:** P1-DES-001 / #29 — DONE / DESIGN READY  
**Implementation authorization:** NONE

---

# INFORMATION CLASSIFICATION

## CONFIRMED
- Phase 1 uses a weight-and-container inventory model.
- Items used by the slice have weight, volume, stack rules, category, and condition where applicable.
- Carrying capacity must create meaningful expedition choices.
- Phase 1 requires player inventory, basic storage, gathering, Tier 0 essentials, bounded Tier 1 crafting, repair, dropped items, and co-op item/container interaction.
- Inventory transactions are gameplay-authoritative; UI is presentation only.
- Advanced logistics, warehouses, vehicles, conveyors, and nested logistics networks are out of Phase 1 scope.
- Death-drop behavior is defined jointly with P1-DES-003; this document defines item/container semantics it consumes.

## CONSTRAINT
- Player locomotion remains continuous/non-grid.
- Resource/crafting rules must fit the 30–60 minute master session without mandatory grind.
- The Phase 1 critical path cannot depend on an obscure resource/tool the player cannot reasonably discover.
- Technical transaction IDs, revisions, data schemas, save records, and atomicity implementation are Technical Design scope.

## DECISION NEEDED
None blocking.

---

# GAME DESIGN SPEC

## SYSTEM
Inventory, Gathering, Crafting, and Repair

## STATUS
READY

## PRODUCT INTENT
Turn world resources into constrained choices.

The player should repeatedly decide:
- what to pick up;
- what to leave;
- when to return;
- which tool/supply deserves carry capacity;
- whether to use resources now or invest them in base capability;
- whether damaged equipment should be repaired before an expedition.

Inventory is not merely storage UI. It is the logistics pressure connecting gathering, preparation, building, exploration, death, and recovery.

## PLAYER GOAL
- Gather useful resources.
- Carry a deliberate loadout.
- Store excess at base.
- Craft the small set of essentials needed for the vertical slice.
- Maintain condition-bearing tools/equipment.
- Recover from capacity, tool, or material shortages without hidden loss.

## PLAYER EXPERIENCE
Target:
**Readable → constrained → reversible → trustworthy**

The player must be able to predict:
- whether an item fits;
- what a gather action will produce;
- whether a recipe can craft;
- what repair will restore;
- why a transaction failed.

A failed transaction must not silently consume, duplicate, or destroy unrelated items.

---

# 1. ITEM MODEL

Every Phase 1 item type defines:

- stable player-facing name;
- category;
- unit weight;
- unit volume;
- maximum stack size;
- whether it has condition;
- condition maximum if applicable;
- whether it is consumable/equippable/usable;
- whether it is valid in ordinary storage;
- gameplay effect or recipe role.

## 1.1 Item categories

Phase 1 uses these player-facing categories:

1. **RAW RESOURCE** — gathered material used by recipes/building.
2. **FOOD / WATER** — survival consumables.
3. **COMPONENT** — crafted intermediate material.
4. **TOOL** — enables/improves gathering or other approved actions.
5. **WEAPON** — used by the Phase 1 hostile encounter.
6. **EQUIPMENT** — worn/carried preparation item with persistent effect.
7. **MEDICAL** — health recovery consumable.
8. **CONSTRUCTION KIT** — crafted item consumed by approved building placement.
9. **DISCOVERY ITEM** — physical mystery reward; separate from persistent discovery knowledge.

Categories aid UI/rules but do not create hidden ownership or inventory partitions.

## 1.2 Phase 1 content set

Numeric values are Game Design tuning defaults for the vertical slice.

| Item | Category | Weight | Volume | Stack | Condition |
|---|---|---:|---:|---:|---|
| Plant Fiber | Raw Resource | 0.05 kg | 0.10 u | 50 | none |
| Timber | Raw Resource | 1.00 kg | 2.00 u | 10 | none |
| Stone | Raw Resource | 0.75 kg | 0.75 u | 20 | none |
| Metal Ore | Raw Resource | 1.00 kg | 0.75 u | 20 | none |
| Edible Plant | Food | 0.20 kg | 0.25 u | 10 | none |
| Clean Water | Water | 0.50 kg | 0.50 u | 10 | none |
| Cordage | Component | 0.10 kg | 0.20 u | 20 | none |
| Stone Field Tool | Tool | 1.50 kg | 2.00 u | 1 | 0–100 |
| Basic Spear | Weapon | 1.80 kg | 2.50 u | 1 | 0–100 |
| Thermal Wrap | Equipment | 1.00 kg | 2.00 u | 1 | 0–100 |
| Field Dressing | Medical | 0.20 kg | 0.20 u | 10 | none |
| Repair Patch | Component | 0.25 kg | 0.30 u | 10 | none |
| Storage Crate Kit | Construction Kit | 5.00 kg | 6.00 u | 1 | none |
| Workbench Kit | Construction Kit | 8.00 kg | 8.00 u | 1 | none |
| Habitat Kit | Construction Kit | 12.00 kg | 12.00 u | 1 | none |
| Power Unit Kit | Construction Kit | 10.00 kg | 8.00 u | 1 | none |
| Machine Kit | Construction Kit | 10.00 kg | 10.00 u | 1 | none |
| Ancient Alloy Shard | Discovery Item | 2.00 kg | 2.00 u | 1 | none |

Rationale:
- resource weights make Timber/Ore meaningful logistics choices;
- survival supplies and tools cost enough capacity to compete with expedition loot;
- building kits are intentionally heavy so construction encourages return/base logistics rather than carrying the whole colony;
- discovery item is noticeable but recoverable if death occurs.

P1-DES-004 may consume the construction kits but may not silently change their inventory semantics. If build-cost tuning requires kit recipe adjustment, Game Design must update the relevant approved source.

---

# 2. PLAYER INVENTORY / CAPACITY

## 2.1 Base capacity

Phase 1 player carry defaults:

- `playerMaxWeight = 20.0 kg`
- `playerMaxVolume = 24.0 volume units`

These are tuning values intended to force loadout choices without requiring a dedicated backpack progression system in Phase 1.

## 2.2 Weight states

Weight state is calculated from current carried weight / max weight.

### NORMAL
`0%–80%`

- no capacity penalty.

### HEAVY
`>80%–100%`

- inventory remains fully usable;
- P1-DES-003 applies the approved stamina-recovery consequence;
- player receives visible HEAVY feedback.

### OVERLOADED
`>100%–125%`

- can occur only when an already-valid inventory becomes heavier because of a transaction specifically allowed to cross the nominal threshold or an approved state change;
- movement speed is reduced by **20%**;
- P1-DES-003 applies stronger stamina consequence;
- player may drop, transfer, consume, or otherwise reduce load;
- new pickup/transfer/craft-output operations into the player inventory may not increase weight further.

### HARD LIMIT
`>125%`

A normal player-facing transaction may never commit a result above this limit.

## 2.3 Volume

Volume is a hard capacity constraint.

- An item/stack may enter a container only if resulting used volume <= max volume.
- Phase 1 has no soft over-volume state.
- A transaction that would exceed volume fails before source items are consumed/moved.

## 2.4 Which limit wins

A transaction must satisfy all relevant capacity rules.

For ordinary pickup/transfer/craft output:
- resulting volume must fit;
- resulting weight must not exceed the allowed target state.

UI must show whether failure is caused by weight, volume, stack limit, or category restriction.

## 2.5 No automatic item destruction

Crossing a threshold or changing state never automatically deletes/drops items.

If an inventory is valid but constrained:
- player remains able to inspect it;
- player can always drop/transfer/consume valid items to recover.

---

# 3. BASIC STORAGE CONTAINER

Phase 1 base storage uses one general-purpose **Storage Crate** gameplay type.

Default capacity:
- `crateMaxWeight = 100 kg`
- `crateMaxVolume = 120 u`

Rules:
- accepts every Phase 1 portable item category;
- no private slots;
- no nested containers;
- no automatic sorting;
- no warehouse/network linking;
- no capacity-based movement because structure is stationary.

Multiple crates may exist if P1-DES-004 allows building more than one, but each is independent.

---

# 4. STACK RULES

## 4.1 Stack compatibility

Items merge only when:
- same item type;
- both types are stackable;
- adding quantity does not exceed max stack.

Condition-bearing items are stack size 1 in Phase 1.

## 4.2 Merge

Merge moves as much as possible up to target stack maximum.

If source remains:
- remainder stays in source location.

## 4.3 Split

Player may choose any integer quantity:
- minimum 1;
- maximum source quantity - 1.

A split requires a destination capable of receiving the new stack.

## 4.4 Partial transfer

For direct player-controlled transfers, if the full requested quantity cannot fit:
- do not silently choose an arbitrary partial quantity;
- UI may offer the maximum valid quantity;
- the committed transaction uses the player-confirmed quantity.

For quick-pickup of a world stack:
- pickup succeeds only for the full presented world stack in Phase 1;
- otherwise it fails with the capacity reason.

This avoids hidden partial world pickups.

---

# 5. TRANSACTION BEHAVIOR

Gameplay preconditions/results/failures are defined below. Technical atomicity implementation is deferred.

## 5.1 PICK UP

Preconditions:
- target is an available portable world drop;
- player is within valid interaction range;
- target has not already been taken;
- player capacity can accept the full presented stack under pickup rules.

Success:
- world drop no longer remains available;
- full stack enters player inventory.

Failure reasons:
- too far/unavailable;
- already taken;
- weight limit;
- volume limit.

No item is duplicated or partially lost.

## 5.2 DROP

Preconditions:
- selected quantity exists in player inventory;
- there is valid nearby world space for a drop.

Success:
- quantity leaves inventory;
- a readable world drop appears at/near player in a valid reachable position.

Failure:
- invalid world placement;
- stale/missing inventory quantity.

On failure inventory is unchanged.

## 5.3 TRANSFER

Applies player ↔ shared container.

Preconditions:
- source contains requested item/quantity;
- target container allows item;
- target capacity can accept requested quantity.

Success:
- exact requested quantity moves once.

Failure:
- source changed/missing;
- target full by weight/volume;
- target unavailable.

No silent partial transfer.

## 5.4 MERGE / SPLIT

Use rules in Section 4.

Failure leaves source/target unchanged.

## 5.5 CONSUME / USE

Item-specific gameplay effect is defined by owning subsystem (for Food/Water/Medical, P1-DES-003).

Generic inventory rule:
- item is removed/decremented only when the use completes successfully;
- canceled/invalid use does not consume it.

## 5.6 CRAFT OUTPUT

Before craft commitment, all inputs and output capacity are validated.

If output is intended for player inventory and cannot fit:
- craft does not consume inputs;
- player receives capacity failure.

No overflow bag is created automatically by crafting.

## 5.7 REPAIR

Repair follows Section 10.

Inputs are consumed only when a valid condition increase is committed.

---

# 6. CO-OP OWNERSHIP / CONTENTION SEMANTICS

## 6.1 Player inventory

While a player is alive:
- another player cannot directly browse/remove items from that player's personal inventory in Phase 1.

Voluntary exchange is performed through:
- world drop; or
- shared Storage Crate.

Direct player-to-player trade UI is deferred.

## 6.2 Shared containers

Storage Crates are team-shared.

There is no per-player ownership lock.

If two players attempt conflicting transactions:
- one authoritative valid result commits first;
- the other receives an explicit stale/unavailable/full result and refreshed state;
- duplication is never a valid player-facing outcome.

## 6.3 Ground drops

Ordinary ground drops are team-accessible.

First successful pickup wins.

The second player receives "Already taken / unavailable" style feedback.

## 6.4 Death drops

Death-drop contents are team-accessible to enable recovery assistance.

Exact creation/lifetime/marker rules are P1-DES-003.

## 6.5 No reserved loot

Phase 1 has:
- no loot ownership timer;
- no personal instanced loot;
- no trading economy.

---

# 7. GATHERING MODEL

## 7.1 Interaction

Gathering is a deliberate world interaction with a focused resource node.

Player must:
- be within interaction range;
- meet tool requirement if any;
- have enough stamina if the action has a stamina cost from P1-DES-003;
- have capacity for the full fixed yield.

## 7.2 Gather channel

Each gather completion uses a short channel.

Defaults:
- soft/hand resource: **0.60 s**
- hard/tool resource: **1.00 s**

Movement outside valid interaction range or losing the target cancels the current channel.

Canceled channel:
- produces no item;
- does not reduce node amount;
- does not reduce tool condition.

## 7.3 Capacity precheck

If the fixed yield cannot fit:
- gather does not start/complete;
- node is unchanged;
- tool condition is unchanged;
- prompt identifies capacity reason.

## 7.4 Fixed Phase 1 yields

Phase 1 uses fixed yields rather than random rolls for the critical content set.

This improves readability/testability and prevents random resource starvation in the first-session slice.

| Resource node | Tool | Yield per completed gather | Node actions | Regen |
|---|---|---|---:|---|
| Fiber Plant | hand | 2 Plant Fiber | 4 | 10 min |
| Food Plant | hand | 1 Edible Plant | 3 | 15 min |
| Potable Water Source | hand/interact | 1 Clean Water | unlimited | n/a |
| Tree / Timber Source | Stone Field Tool | 1 Timber | 5 | 30 min |
| Stone Outcrop | Stone Field Tool | 2 Stone | 4 | 30 min |
| Metal Ore Node | Stone Field Tool | 1 Metal Ore | 6 | 90 min |

Regen time is active canonical world time after depletion.

Rationale:
- organics renew inside a normal play session;
- heavy materials encourage multiple local trips;
- ore replenishes slowly enough to behave as a strategic local deposit during the vertical slice while retaining a renewable-hook direction.

Exact content placement density is P1-DES-005/content tuning.

## 7.5 Tool condition cost

Stone Field Tool:
- hard-resource gather completion costs **2 condition points**.
- at 0 condition it is BROKEN and cannot gather tool-required nodes.
- hand-gatherable resources remain available.

No condition cost is applied on failed/canceled gather.

## 7.6 Depleted state

A depleted node:
- is visibly depleted;
- cannot be gathered;
- communicates whether it can regrow/recover when player-facing UI exposes that information.

No instant invisible respawn.

---

# 8. PHASE 1 RECIPE SET

Phase 1 intentionally has a small finite recipe set.

## 8.1 Tier 0 — handcraftable

### Cordage
- 3 Plant Fiber → 1 Cordage

Purpose:
- common primitive component.

### Stone Field Tool
- 1 Timber + 2 Stone + 1 Cordage → 1 Stone Field Tool (100 condition)

Purpose:
- unlocks Timber/Stone/Ore gathering.

### Basic Spear
- 2 Timber + 1 Stone + 1 Cordage → 1 Basic Spear (100 condition)

Purpose:
- approved Phase 1 basic defensive weapon.

### Thermal Wrap
- 5 Plant Fiber + 2 Cordage → 1 Thermal Wrap (100 condition)

Purpose:
- preparation option against cold exposure defined by P1-DES-003.

### Field Dressing
- 4 Plant Fiber → 1 Field Dressing

Purpose:
- basic recoverable health item defined by P1-DES-003.

### Storage Crate Kit
- 4 Timber + 2 Cordage → 1 Storage Crate Kit

Purpose:
- enables first shared storage placement under P1-DES-004.

### Workbench Kit
- 4 Timber + 4 Stone + 2 Cordage → 1 Workbench Kit

Purpose:
- enables Tier 1 recipes/repair under P1-DES-004.

## 8.2 Tier 1 — requires functional Workbench

### Repair Patch
- 2 Plant Fiber + 1 Metal Ore → 1 Repair Patch

Purpose:
- restores condition to approved repairable items.

### Habitat Kit
- 6 Timber + 6 Stone + 3 Cordage → 1 Habitat Kit

### Power Unit Kit
- 4 Timber + 5 Metal Ore + 2 Cordage → 1 Power Unit Kit

### Machine Kit
- 4 Timber + 6 Metal Ore + 3 Cordage → 1 Machine Kit

Purpose:
- bounded construction inputs consumed by P1-DES-004.

P1-DES-004 owns placement/connectivity/function; this spec owns these as portable crafted inventory items.

## 8.3 Clean Water / Edible Plant

They are gathered survival consumables and do not require a recipe in Phase 1.

## 8.4 Ancient Alloy Shard

Not craftable.

It is obtained only from the approved ruin/discovery interaction under P1-DES-005.

---

# 9. CRAFTING BEHAVIOR

## 9.1 Recipe visibility

A known Phase 1 recipe displays:
- inputs;
- quantities;
- output;
- station requirement;
- reason it cannot currently craft.

The critical Phase 1 recipes are not hidden behind random discovery.

## 9.2 Handcraft

Tier 0 recipes can be crafted from player inventory without a station.

Craft resolves as one committed action; Phase 1 has no crafting queue.

## 9.3 Workbench

Tier 1 recipes and repair require access to a functional Workbench.

Workbench does not contain a hidden private ingredient inventory in Phase 1.

Inputs are taken from the crafting player's inventory.

Future "craft from nearby storage" behavior is deferred.

## 9.4 Craft timing

Phase 1 craft actions are transaction-immediate after confirmation.

Presentation may animate/acknowledge completion, but gameplay does not require a multi-minute production timer for hand/workbench crafting.

First useful machine operation is P1-DES-004 and may have its own runtime behavior.

---

# 10. CONDITION / REPAIR

## 10.1 Condition semantics

Condition-bearing item range:
`0–100`

States:
- 51–100: SERVICEABLE
- 1–50: WORN
- 0: BROKEN

WORN does not change tool/weapon stats in Phase 1.

Purpose:
- warn the player before failure;
- make repair timing a preparation decision;
- avoid extra balance complexity in the vertical slice.

BROKEN:
- item remains in inventory;
- item cannot perform its condition-dependent action;
- item is repairable;
- item is not automatically destroyed.

## 10.2 Condition loss sources

- Stone Field Tool: 2 per successful hard-resource gather.
- Basic Spear: 1 condition point per successful hit on a valid hostile target. A whiff/miss does not reduce condition.
- Thermal Wrap: no passive use decay in Phase 1; it may receive approved death durability penalty from P1-DES-003.
- Death durability penalty is defined in P1-DES-003.

## 10.3 Repair rule

Repair requires:
- functional Workbench;
- repairable item below 100 condition;
- 1 Repair Patch per repair action.

One Repair Patch restores:
**25 condition points**

Result is capped at 100.

Repair is transaction-immediate.

Failure reasons:
- no Workbench;
- no Repair Patch;
- item already full;
- item not repairable;
- target item unavailable/stale.

Failure consumes nothing.

---

# 11. ORDINARY DROPPED ITEM HANDLING

Outside death:

- player chooses item/quantity and DROP;
- world drop appears at nearest valid reachable position close to player;
- drop retains exact item type, quantity, and condition;
- drop is team-accessible;
- drop persists across ordinary chunk unload/reload and save/reopen while it remains part of canonical Phase 1 world state;
- no Phase 1 despawn timer.

A world drop does not merge itself invisibly with nearby drops.

Automatic cleanup/despawn systems are deferred.

---

# 12. INPUTS

Gameplay inputs:
- focused resource/item/container/workbench;
- interact/pickup/drop/transfer/split/merge/craft/repair intent;
- player inventory/container state;
- resource-node state;
- item/recipe definitions;
- player stamina eligibility from P1-DES-003;
- world validity for dropped item placement;
- Workbench availability.

# 13. OUTPUTS

- inventory/container membership change;
- stack quantity change;
- item creation/destruction through approved recipe/gather/use rules;
- item condition change;
- resource-node depletion/regeneration state;
- world drop creation/removal;
- explicit success/failure result for UI;
- crafting/repair completion result.

---

# 14. PLAYER FEEDBACK REQUIREMENTS

The player must be able to read:

- current carried weight / max;
- current volume / max;
- NORMAL / HEAVY / OVERLOADED state;
- focused item/resource identity;
- required tool if missing;
- fixed or clearly represented expected gather output where useful;
- resource depleted state;
- item condition;
- BROKEN state;
- recipe inputs/output/station;
- insufficient material;
- insufficient weight capacity;
- insufficient volume;
- stack full;
- Workbench required;
- repair amount/result;
- shared container update/stale result;
- world drop/death drop distinction.

Art/UI owns exact layout/visual treatment.

---

# 15. SYSTEM INTERACTIONS

## With P1-DES-003
- Edible Plant, Clean Water, Field Dressing provide need/health recovery.
- HEAVY/OVERLOADED states affect stamina/movement according to P1-DES-003.
- Thermal Wrap modifies cold exposure.
- Basic Spear is the approved basic weapon.
- Death drop uses exact portable item state from this system.
- death durability penalty modifies condition-bearing equipment.

## With P1-DES-004
- Storage Crate Kit, Workbench Kit, Habitat Kit, Power Unit Kit, Machine Kit are consumed by approved build rules.
- placed Storage Crate exposes the shared container defined here.
- Workbench enables Tier 1 craft/repair.

## With P1-DES-005
- world content places resource nodes;
- exploration discovers resource opportunities;
- Ancient Alloy Shard is the physical ruin reward;
- weather/day-night may change preparation demand but do not change inventory semantics.

## With P1-DES-006
- successful meaningful gather/craft/repair may award XP under approved anti-grind rules;
- repeated trivial transaction spam must not create uncapped XP.

---

# 16. EDGE CASES

1. **Inventory full during gather:** action produces nothing; node/tool unchanged.
2. **Inventory fills while UI open:** next transaction validates current state and may fail; UI refreshes.
3. **Two players pick same drop:** one succeeds; one receives unavailable result.
4. **Two players move same container stack:** one result commits; other receives stale/unavailable result.
5. **Split destination no longer fits:** split fails; original stack remains.
6. **Craft input changes before commit:** craft fails; no partial consumption/output.
7. **Craft output cannot fit:** craft fails before input consumption.
8. **Broken tool:** cannot satisfy tool-required gather; item remains repairable.
9. **Repair exactly near max:** condition caps at 100; one patch is consumed only if condition increases.
10. **Drop placement blocked:** inventory remains unchanged unless valid nearby drop position is found.
11. **Chunk unload with world drop:** canonical drop persists and returns on load.
12. **Save/reopen with Storage Crate:** contents persist exactly according to persistence contract.
13. **Player is overloaded:** may always drop/transfer/consume to reduce load; may not add more weight.
14. **Volume full but weight free:** transaction fails by volume.
15. **Weight limit reached but volume free:** transaction fails/enters only approved weight state according to rule.
16. **Death while container UI open:** death system closes interaction; personal carried state is processed once by P1-DES-003.
17. **Ancient Alloy Shard inventory full at ruin:** P1-DES-005 keeps reward claimable/world-present; it is never silently deleted.
18. **Resource regeneration while no player nearby:** it follows canonical active-world time, not render visibility.
19. **Disconnected co-op client:** does not reserve items/containers indefinitely; exact protocol is Technical Design.

---

# 17. BALANCE / TUNING VARIABLES

- playerMaxWeight = 20 kg
- playerMaxVolume = 24 u
- heavyThreshold = 80%
- overloadedThreshold = 100%
- hardWeightLimit = 125%
- overloadedMoveMultiplier = 0.80
- crateMaxWeight = 100 kg
- crateMaxVolume = 120 u
- item unit weight/volume
- maxStack
- gatherChannelHand = 0.60 s
- gatherChannelTool = 1.00 s
- node action counts
- node regen durations
- gather yields
- toolConditionCost = 2/gather
- weaponConditionCost = 1/successful attack
- repairRestore = 25 condition
- recipe quantities

These are Game Design tuning values for the Phase 1 pacing target and may be adjusted through playtest without changing the system contract.

---

# 18. PHASE 1 SCOPE

Included:
- one player inventory model;
- one general shared storage container type;
- finite item set above;
- weight + volume;
- stacks;
- condition;
- basic pickup/drop/transfer/split/merge;
- hand/tool gathering;
- six resource-source types;
- bounded Tier 0/Tier 1 recipes;
- Workbench craft access;
- repair;
- ordinary persistent world drops;
- co-op contention semantics.

# 19. DEFERRED

- nested containers;
- backpacks/vehicle cargo progression;
- warehouses;
- conveyors/logistics networks;
- auto-sort;
- craft-from-nearby-storage;
- crafting queues;
- advanced processing chains;
- quality tiers;
- item rarity;
- randomized stats;
- loot ownership timers;
- direct trade UI;
- equipment mod sockets;
- advanced repair economics;
- resource ecology beyond the Phase 1 node rules.

# 20. NON-GOALS

- building placement/connectivity/power rules;
- full survival/combat rules;
- full progression/XP rules;
- technical transaction/revision implementation;
- persistence schema;
- network protocol;
- final UI/art.

---

# 21. ACCEPTANCE CRITERIA

### AC-INV-001 Item identity
Every Phase 1 portable item belongs to a defined category and has weight, volume, stack and condition semantics.

### AC-INV-002 Capacity visibility
Player can determine current/max weight and volume and current carry state.

### AC-INV-003 Volume hard limit
A transaction cannot commit an item result beyond container volume.

### AC-INV-004 Weight consequence
Weight crosses NORMAL → HEAVY → OVERLOADED at the approved thresholds and prevents further weight-increasing transactions while overloaded.

### AC-INV-005 No threshold item loss
Capacity-state changes never automatically destroy/drop inventory.

### AC-INV-006 Pickup
Pickup either transfers the complete presented world stack once or fails with no item/world loss.

### AC-INV-007 Drop
Drop removes exact confirmed quantity only when a valid world drop can be created.

### AC-INV-008 Transfer
Player/container transfer moves exact confirmed quantity once or fails without partial hidden transfer.

### AC-INV-009 Split/merge
Split/merge obey integer quantity and max-stack rules without duplication/loss.

### AC-INV-010 Co-op contention
Two players cannot both successfully acquire the same unique item quantity from one source state.

### AC-INV-011 Shared storage
Storage Crate contents are shared team state, not per-client private copies.

### AC-GATH-001 Tool requirements
Hand resources and tool-required resources behave exactly according to the table.

### AC-GATH-002 Fixed yield
A successful Phase 1 gather produces the defined fixed yield.

### AC-GATH-003 Canceled gather
Canceled gather changes neither node amount, inventory, nor tool condition.

### AC-GATH-004 Capacity precheck
Gather that cannot fit its full yield does not deplete the node or tool.

### AC-GATH-005 Depletion
A node becomes unavailable after its defined action count.

### AC-GATH-006 Regeneration
Renewable node availability returns after its configured canonical active-world time; no instant invisible respawn occurs.

### AC-GATH-007 Tool wear
Each successful hard-resource gather reduces Stone Field Tool condition by exactly 2.

### AC-CRAFT-001 Recipe completeness
All Phase 1 Tier 0/Tier 1 recipes listed in this document show exact inputs/output/station requirement.

### AC-CRAFT-002 Tier gate
Tier 0 is handcraftable; Tier 1 requires functional Workbench.

### AC-CRAFT-003 Atomic player-facing result
If any required input/output precondition fails, recipe inputs are not partially consumed.

### AC-CRAFT-004 No craft overflow
Insufficient output capacity prevents craft instead of creating/deleting hidden overflow.

### AC-REP-001 Broken state
Condition-bearing item at 0 remains present but cannot perform its condition-dependent action.

### AC-REP-002 Repair
One Repair Patch restores 25 condition at a functional Workbench, capped at 100.

### AC-REP-003 Failed repair
Invalid repair consumes no Repair Patch.

### AC-DROP-001 Ordinary persistence
Ordinary world drops used by Phase 1 survive chunk unload/reload and approved save/reopen until picked up.

### AC-COOP-001 Personal inventory boundary
Another living player cannot directly remove from a player's personal inventory.

### AC-COOP-002 Death recovery exception
Team access to death-drop contents is allowed under P1-DES-003.

### AC-SCOPE-001 No advanced logistics
No nested container, warehouse, conveyor, vehicle cargo, automation, or direct-trade subsystem is required by this spec.

---

# 22. OPEN QUESTIONS

None blocking.

P1-DES-004 owns exact placement/build consumption and first-machine function.
P1-DES-003 owns survival effects, stamina and death.
P1-DES-005 owns resource placement and ruin reward availability.
P1-DES-006 owns XP rewards.

# 23. ASSUMPTIONS

All numbers in item/capacity/yield/recipe/condition tables are explicit Phase 1 tuning defaults selected to make logistics observable in the 30–60 minute slice. They are not Project Owner product pillars and remain playtest-tunable.

---

# 24. DEFINITION OF DONE SELF-CHECK

- Item categories/player identity defined: PASS
- Weight/volume/stack/condition defined: PASS
- Player inventory/basic container defined: PASS
- Capacity/over-capacity defined: PASS
- Pickup/drop/transfer/split/merge defined: PASS
- Gathering/tool/yield/depletion/regeneration defined: PASS
- Tier 0/Tier 1 recipes finite and exact: PASS
- Workbench behavior defined: PASS
- Repair defined: PASS
- Ordinary dropped items defined: PASS
- Feedback/error states defined: PASS
- Co-op contention defined: PASS
- Advanced logistics excluded: PASS
- Technical Design can proceed without gameplay invention: PASS
- QA can derive PASS/FAIL tests: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
