# P1-DES-006 — Early Progression and Profession Prototype Gameplay Specification

**Task:** P1-DES-006 / Issue #36  
**Role:** Game Designer / Systems Designer  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** READY FOR PRODUCER REVIEW  
**Depends on:** P1-DES-001 / #29, P1-DES-002 / #32, P1-DES-003 / #33, P1-DES-005 / #35 — DONE / DESIGN READY  
**Cross-reference:** P1-DES-004 / #34 for the first-machine/base milestones used by the Engineer prototype  
**Implementation authorization:** NONE

---

# INFORMATION CLASSIFICATION

## CONFIRMED
- Character progression is personal player state.
- Colony/world research and shared discoveries are conceptually separate from personal skills/professions.
- Meaningful activities may grant XP: gathering, crafting, building, discovery, researching, repairing, combat.
- Simple repetition must not dominate progression.
- The first prototype should take a new player toward approximately level 3–4.
- Profession unlock requires a level, prerequisite skill, and profession quest.
- A player may unlock every profession over time; there is no permanent class lock.
- Phase 1 needs one or two profession-quest prototypes, not the complete profession/research tree.
- Death XP loss is 5% of current-level progress and cannot reduce the player's current level.

## CONSTRAINT
- Phase 1 progression must reinforce the integrated 30–60 minute slice instead of creating a separate grind loop.
- No activity that can be spammed without meaningful world/resource change may become the best XP source.
- Shared co-op world progress does not automatically become personal character XP for remote/non-participating players.
- This spec does not add exclusive profession-only requirements to the Phase 1 critical path.
- Full spendable skill-point tree is deferred; the Phase 1 prototype may use bounded prerequisite skill records to demonstrate specialization eligibility.

## DECISION NEEDED
None blocking.

---

# GAME DESIGN SPEC

## SYSTEM
Early Character Progression and Profession Prototype

## STATUS
READY

## PRODUCT INTENT
Progression should make the player feel that varied useful play is turning an inexperienced pioneer into a more established specialist.

Phase 1 must prove:
- useful actions can advance a personal character;
- exploration, building, maintenance, and danger all matter;
- repeated trivial actions do not dominate;
- specialization emerges from what the player actually does;
- choosing/unlocking one profession does not permanently close another.

Progression supports the vertical slice; it must not replace the survival/build/exploration loop with XP farming.

---

# PLAYER GOAL
- Gain XP through meaningful varied actions.
- Reach approximately level 3–4 through the normal vertical-slice path.
- Understand what caused XP/level progress.
- Demonstrate at least one specialization path.
- Qualify for and complete Explorer and/or Engineer prototype profession quests.
- Retain unlocked profession state through death and persistence.

---

# PLAYER EXPERIENCE
Target:
**Useful action → readable progress → level milestone → specialization opportunity**

The player should not feel compelled to:
- split/merge inventory repeatedly;
- dismantle/rebuild the same object;
- spam one easy recipe;
- walk back and forth across fog boundaries;
- repeatedly hit harmless/non-hostile targets;
- die/recover intentionally for XP.

Profession progression should reflect behavior:
- exploration-oriented play naturally exposes Explorer prerequisites;
- maintenance/base-oriented play naturally exposes Engineer prerequisites.

---

# 1. CHARACTER XP / LEVEL MODEL

## 1.1 XP ownership

XP is personal to each player.

Shared world state does not imply shared character XP.

An XP award occurs only from an authoritative confirmed gameplay event defined by this spec.

## 1.2 Cumulative level thresholds

| Level | Total XP required |
|---|---:|
| 1 | 0 |
| 2 | 100 |
| 3 | 225 |
| 4 | 400 |
| 5 | 650 |

Phase 1 target is Level 3–4.

Level 5 threshold exists only so XP/death math remains well-defined if an unusually completionist player exceeds the expected target. Phase 1 introduces no Level 5-specific profession/tree content.

## 1.3 Level-up

When total XP crosses a threshold:
- character level increases immediately;
- player receives readable level-up feedback;
- level does not reduce through ordinary death.

No manual "claim level" action is required.

---

# 2. XP EVENT CLASSES

XP sources are divided into:

1. **Milestone XP** — one-time per player for meaningful first accomplishments.
2. **Bounded repeat contribution XP** — small XP from a limited number of repeated useful actions.
3. **Profession quest XP** — one-time quest completion reward.

This structure prevents infinite trivial repetition from becoming optimal.

---

# 3. MILESTONE XP TABLE

All milestone flags are personal and persistent per player in the world/session save context.

## 3.1 Gathering firsts

First successful gather of each Phase 1 source category:

- Fiber Plant: 8 XP
- Food Plant: 8 XP
- Potable Water Source: 8 XP
- Timber Source: 8 XP
- Stone Outcrop: 8 XP
- Metal Ore Node: 8 XP

Maximum first-gather milestone:
**48 XP**

The action must successfully produce its approved item result.

Failed/canceled gather gives 0 XP.

## 3.2 First unique crafts

First successful craft of each unique Phase 1 recipe from P1-DES-002:
- 8 XP per recipe.

The current approved Phase 1 set contains 11 craftable recipes:
- Cordage
- Stone Field Tool
- Basic Spear
- Thermal Wrap
- Field Dressing
- Storage Crate Kit
- Workbench Kit
- Repair Patch
- Habitat Kit
- Power Unit Kit
- Machine Kit

Maximum unique-craft milestone:
**88 XP**

Crafting the same recipe again does not repeat this first-time milestone.

## 3.3 Repair

First successful condition-increasing repair:
- **12 XP**

Repair at full condition, failed repair, or no-op repair gives 0 XP.

## 3.4 First building-type milestones

First successful placement by that player of each type:

- Storage Crate: 15 XP
- Workbench: 20 XP
- Habitat Room: 30 XP
- Compact Power Unit: 25 XP
- Atmospheric Water Condenser: 35 XP

Maximum:
**125 XP**

Dismantling and re-placing the same type never resets this milestone.

If a co-op teammate places the structure, other players do not automatically receive this personal placement XP.

## 3.5 First useful-machine operation

First time a player successfully removes/collects Clean Water produced by the Atmospheric Water Condenser:
- **20 XP**

This allows a player who did not place the shared machine to demonstrate/use the machine and receive personal progression once.

Collecting player-crafted/gathered Clean Water does not qualify.

## 3.6 Exploration milestones

Personal first entry into the Phase 1 Expedition Band:
- **20 XP**

Personal first LOCATE of the Previous-Civilization Ruin:
- **30 XP**

Personal first successful ruin investigation/acknowledgment:
- **100 XP**

If the ruin was already globally INVESTIGATED by a teammate:
- a player who later physically reaches the ruin and uses Inspect once still earns their personal 100 XP discovery milestone;
- no second Ancient Alloy Shard/world discovery record is created.

This preserves shared world knowledge while keeping personal exploration progression attainable.

## 3.7 Hostile encounter milestone

Each player has one Phase 1 predator-resolution milestone worth up to **30 XP**.

If the player's first eligible encounter resolution is safe disengage/retreat:
- award 20 XP.

If that player later participates in the first predator kill:
- award a 10 XP top-up, reaching the 30 XP maximum.

If kill is first:
- award 30 XP and milestone is complete.

A player is an eligible encounter participant when, during that encounter, they:
- dealt valid damage to the predator; or
- were an active predator target.

Remote players receive no personal combat XP merely because the world predator died.

## 3.8 Death-cache recovery milestone

First time a player successfully removes at least one of their own previously dropped items from one of their Death Caches:
- **15 XP**

Purpose:
- recognize recovery as meaningful play without making intentional death profitable.

This reward occurs once per player total.

Death itself gives 0 XP.

---

# 4. BOUNDED REPEAT CONTRIBUTION XP

These rewards are deliberately small and have persistent Phase 1 lifetime caps.

Counters do not reset on:
- death;
- reconnect;
- day/night;
- dismantle;
- save/reopen.

## 4.1 Repeat gathering

After first-source milestones, successful gather completions may award:
- 2 XP each
- maximum **20 rewarded repeat gathers** per player.

Maximum:
**40 XP**

After the cap:
- gathering still works normally;
- gives 0 repeat XP.

## 4.2 Repeat crafting

Successful repeat craft of an already-first-crafted recipe:
- 2 XP
- maximum **5 rewarded repeat crafts** total.

Maximum:
**10 XP**

## 4.3 Repeat repair

After first repair:
- 4 XP per additional successful condition-increasing repair
- maximum **3 rewarded repeat repairs**.

Maximum:
**12 XP**

## 4.4 No generic repeat build XP

Additional Storage Crates or re-placement of dismantled structures:
- 0 XP after first personal type milestone.

## 4.5 No generic inventory XP

The following grant 0 XP:
- pickup;
- drop;
- transfer;
- split;
- merge;
- opening inventory/container;
- consuming supplies.

---

# 5. EXPECTED VERTICAL-SLICE XP BUDGET

A normal varied first-session path is expected to gain roughly:

- first gathers: 32–48 XP;
- useful unique crafts: 56–88 XP;
- first repair: 0–12 XP;
- first base structures: 90–125 XP;
- first machine use: 20 XP;
- enter expedition band: 20 XP;
- ruin locate + personal inspect: 130 XP;
- hostile encounter resolution: 20–30 XP;
- bounded repeat contribution during natural play: approximately 10–30 XP.

Typical range:
**378–503 XP**

Result:
- Level 3 is expected before or during foothold/expedition preparation;
- Level 4 is plausible around the ruin/return end of a complete session;
- Level 5 is not expected without unusual extra completion/grind.

This fulfills the approved level 3–4 prototype target without requiring every optional action.

---

# 6. ANTI-GRIND RULES

## 6.1 XP requires a meaningful committed result

No XP for:
- canceled action;
- failed transaction;
- invalid placement;
- no-op repair;
- fake/duplicate network retry;
- stale command rejection.

## 6.2 First-time flags persist

Reloading/rejoining cannot replay first-time XP milestones.

## 6.3 Dismantle loops do not reward XP

Build milestone is keyed by first successful placement of type per player, not current structure existence.

## 6.4 Inventory manipulation gives no XP

Split/merge/transfer cannot be farmed.

## 6.5 Exploration movement itself gives no per-step XP

No XP is awarded simply for moving in/out of already explored fog cells.

Only explicit personal exploration milestones above award XP.

## 6.6 Shared event does not automatically grant remote personal XP

Co-op players receive personal XP only when their own defined participation condition is satisfied.

## 6.7 Death gives no XP

Recovery has one bounded first-time reward; intentional death loops cannot produce repeat XP.

---

# 7. PROTOTYPE PREREQUISITE SKILLS

The approved long-term design includes a personal skill tree and skill points.

Phase 1 does **not** implement the full spendable skill tree.

Instead it implements two persistent prototype prerequisite skill records used only to demonstrate profession qualification.

They provide no stat modifier in Phase 1.

## 7.1 Fieldcraft Basics

Unlock requirements:
- character Level >= 2; and
- player personally enters the Expedition Band for the first time.

Result:
- personal skill record `Fieldcraft Basics` becomes unlocked;
- readable qualification feedback appears.

Gameplay purpose:
- prerequisite for Explorer prototype quest.

## 7.2 Maintenance Basics

Unlock requirements:
- character Level >= 2; and
- player completes one successful Workbench repair that increases item condition.

Result:
- personal skill record `Maintenance Basics` becomes unlocked.

Gameplay purpose:
- prerequisite for Engineer prototype quest.

## 7.3 No skill-point currency in Phase 1

Phase 1 grants no spendable skill points and has no skill-tree allocation UI.

This does not replace the approved long-term system.

Full:
- skill points;
- stat modifiers;
- branching skill nodes;
are deferred.

---

# 8. PROFESSION PROTOTYPE — EXPLORER

## 8.1 Eligibility

Explorer quest becomes available when:
- Level >= 3;
- Fieldcraft Basics unlocked.

Profession does not require other players or a prior permanent class choice.

## 8.2 Quest name

**Chart the Unknown**

## 8.3 Objectives

All are personal:

1. Personally LOCATE the Previous-Civilization Ruin.
2. Personally use Inspect on the ruin.
   - if it was already globally investigated, this acknowledges the shared discovery and grants the player's personal discovery milestone if not already earned.
3. Return alive to the Landing Module or Habitat Room after personal ruin inspection.

Order:
- Locate → Inspect → Return.

If player dies after Inspect:
- Inspect remains completed;
- Return objective resumes after respawn and requires reaching base alive, which normally occurs immediately via respawn.
- Death does not reset quest.

## 8.4 Completion

Rewards:
- unlock personal **Explorer — Prototype** profession state;
- 40 XP;
- profession-ready feedback/title marker.

No exclusive movement, fog, survival, or item bonus is granted in Phase 1.

Purpose:
- demonstrate profession qualification and persistent specialization identity without destabilizing already approved subsystem tuning.

---

# 9. PROFESSION PROTOTYPE — ENGINEER

## 9.1 Eligibility

Engineer quest becomes available when:
- Level >= 3;
- Maintenance Basics unlocked.

## 9.2 Quest name

**Bring Water Online**

## 9.3 Objectives

1. Be present in the shared foothold while a Compact Power Unit and Atmospheric Water Condenser both exist.
2. Personally enable the Condenser or interact with it while it is enabled and powered.
3. Personally collect at least 1 Clean Water produced by that Condenser.

The player does not need to have personally placed the structures.

This allows co-op specialization even if another teammate built the shared infrastructure.

If structures do not yet exist, quest remains available and points the player toward the necessary shared capability.

## 9.4 Completion

Rewards:
- unlock personal **Engineer — Prototype** profession state;
- 40 XP;
- profession-ready feedback/title marker.

No exclusive machine recipe or power privilege is granted in Phase 1.

---

# 10. NO PERMANENT CLASS LOCK

Rules:
- Explorer and Engineer are independent unlocks.
- Unlocking one does not disable the other.
- A player who later satisfies the other prerequisites may complete the other quest.
- Profession state does not prevent use of any Phase 1 tool, machine, building, weapon, or recipe.
- Co-op critical path never requires a particular profession.

The prototype demonstrates specialization direction, not irreversible class choice.

---

# 11. PLAYER VS COLONY/WORLD PROGRESSION

## Personal state

Persist per player:
- total XP;
- level;
- first-time XP milestone flags;
- bounded repeat-XP counters;
- Fieldcraft Basics;
- Maintenance Basics;
- profession quest states;
- Explorer/Engineer prototype unlocks.

## Shared world/colony state

Not personal XP:
- explored map/fog;
- ruin global INVESTIGATED state;
- one-time Ancient Alloy Shard world claim state;
- buildings;
- Storage contents;
- Power/Machine state;
- world resource mutations.

## Colony research

Phase 1 does **not** implement a full colony research tree.

The ruin discovery is shared world knowledge and may become a future research input, but no engineer may invent a Phase 1 research currency/tree from this spec.

This preserves the approved long-term distinction:
- personal skill/profession belongs to player;
- research belongs to world/colony.

---

# 12. DEATH XP LOSS INTERACTION

P1-DES-003 defines:
- death loses 5% of current-level XP progress;
- level cannot decrease.

Exact formula:

1. Determine current level floor XP from the threshold table.
2. `currentLevelProgress = totalXP - currentLevelFloorXP`
3. If progress = 0:
   - XP loss = 0.
4. If progress > 0:
   - `xpLoss = max(1, floor(currentLevelProgress * 0.05))`
5. New total XP:
   - `max(currentLevelFloorXP, totalXP - xpLoss)`

Death does not remove:
- level;
- prerequisite skills;
- milestone flags;
- profession quest completed objectives;
- unlocked profession;
- shared discovery/world state.

XP cannot become negative.

---

# 13. CO-OP PROGRESSION SEMANTICS

## 13.1 No XP splitting

When multiple players individually satisfy the same eligible event:
- each receives their full personal reward;
- reward is not divided by party size.

## 13.2 Personal milestone participation

Examples:
- first gather/craft/build: actor only;
- first machine use: player who collects produced water;
- expedition-band entry: each player when personally entering;
- ruin locate/inspect: each player on personal physical interaction milestones;
- predator resolution: eligible encounter participants only.

## 13.3 Shared discovery is not remote XP

A teammate may receive the shared ruin marker/discovery knowledge while far away.

They do not receive personal ruin XP until physically visiting/interacting according to Section 3.6.

## 13.4 Profession quests are personal

Shared structures may satisfy world-context prerequisites, but each player completes personal quest actions.

---

# 14. PROGRESSION FEEDBACK REQUIREMENTS

The player must receive readable feedback for:

- XP gained;
- source/category of meaningful XP;
- level-up;
- current level;
- profession eligibility;
- prerequisite skill unlock;
- quest available;
- quest objective progress;
- profession unlocked;
- death XP loss.

The UI does not need to display every hidden anti-grind counter at all times.

When a repeated action stops granting XP because its bounded contribution cap is exhausted:
- gameplay still functions;
- the player should not receive false XP feedback.

Exact UI layout is Art/UI scope.

---

# 15. INPUTS

- successful authoritative gameplay events from gathering/crafting/repair/building/machine/exploration/combat/recovery;
- player identity;
- world/player milestone state;
- level/XP state;
- profession prerequisite skill state;
- profession quest state;
- death event.

# 16. OUTPUTS

- XP award/no-award;
- total XP;
- level-up;
- milestone flag;
- bounded repeat counter;
- prerequisite skill unlock;
- profession quest availability/objective progress;
- profession unlock;
- death XP loss;
- player-facing progression event.

---

# 17. SYSTEM INTERACTIONS

## P1-DES-002
Progression consumes:
- successful gather;
- unique/repeat craft;
- successful repair.

It does not alter:
- item yields;
- recipe inputs;
- repair amount;
- capacity.

## P1-DES-003
Progression consumes:
- hostile encounter participant/resolution;
- own Death Cache recovery;
- death XP penalty.

Profession unlocks do not modify combat/survival stats in Phase 1.

## P1-DES-004
Progression consumes:
- first structure placement by player;
- first produced-water collection;
- Workbench repair prerequisite;
- shared Power/Condenser existence for Engineer quest.

## P1-DES-005
Progression consumes:
- personal Expedition Band entry;
- ruin LOCATE;
- personal ruin Inspect/acknowledgment.

Shared map state remains separate from personal XP.

---

# 18. EDGE CASES

1. **Player crosses multiple XP thresholds in one reward:** apply all crossed level-ups in order.
2. **Duplicate/retried command:** same authoritative event cannot award XP twice.
3. **Save/reopen:** first-time flags/counters/quest state persist.
4. **Dismantle/rebuild:** first building-type XP does not reset.
5. **Craft item, drop it, craft again:** only first craft gets unique milestone; repeat rules apply.
6. **Resource regenerates:** first-source milestone does not reset; bounded repeat counter continues.
7. **Player dies immediately after XP award:** award commits first if event completed; death penalty then uses resulting progress according to authoritative event order.
8. **Death at exact level floor:** XP loss = 0; level remains.
9. **Death with 1–19 current-level XP:** loss = 1 XP, clamped above level floor.
10. **Player reaches Level 3 before skill prerequisite:** profession quest remains unavailable until skill record unlocks.
11. **Skill prerequisite completed before Level 3:** skill remains unlocked; profession quest appears when level condition becomes true.
12. **Teammate globally investigates ruin first:** player later physically Inspecting it gets personal discovery XP/quest credit but no duplicate Shard.
13. **Player completes Explorer then Engineer:** both remain unlocked.
14. **Engineer aspirant did not place machine:** can still complete quest by interacting/collecting from shared powered machine.
15. **Machine dismantled mid-quest:** completed personal objectives stay completed; remaining objective waits for valid machine state.
16. **Player disconnects after quest objective:** committed objective persists.
17. **Remote teammate kills predator:** nonparticipant gets 0 personal combat XP.
18. **Retreat rewarded 20 then later kill:** eligible player receives only 10 top-up, never more than 30 for predator resolution milestone.
19. **Intentional repeated death:** death gives no XP and recovery reward exists once only.
20. **Inventory spam:** pickup/drop/transfer/split/merge gives 0 XP.
21. **Level reaches 5 through unusual play:** Level 5 number is valid, but no new Phase 1 skill/profession content is implied.

---

# 19. BALANCE / TUNING VARIABLES

- level thresholds: 100 / 225 / 400 / 650 cumulative
- first gather XP = 8 per source type
- first unique craft XP = 8
- first repair XP = 12
- building-type XP = 15/20/30/25/35
- first machine output-use XP = 20
- expedition entry XP = 20
- ruin locate XP = 30
- ruin inspect XP = 100
- predator milestone = 20 retreat / 30 kill maximum
- death-cache first recovery XP = 15
- repeat gather XP/cap = 2 × 20
- repeat craft XP/cap = 2 × 5
- repeat repair XP/cap = 4 × 3
- profession quest completion XP = 40 each
- death XP loss = 5% current-level progress, min 1 if progress > 0

Values are Phase 1 pacing defaults and remain playtest-tunable while preserving the anti-grind categories and no-level-loss rule.

---

# 20. PHASE 1 SCOPE

Included:
- personal XP;
- Levels 1–4 target, Level 5 threshold only for curve continuity;
- one-time meaningful milestone rewards;
- bounded repeat contribution XP;
- anti-grind persistent flags/counters;
- two prototype prerequisite skills;
- Explorer prototype quest/unlock;
- Engineer prototype quest/unlock;
- no permanent class lock;
- death XP interaction;
- player-vs-world progression separation;
- co-op personal participation semantics.

---

# 21. DEFERRED

- full skill-point currency;
- full personal skill tree;
- stat-bonus skill nodes;
- all seven complete profession trees;
- advanced profession quests;
- profession-exclusive recipes/tools;
- respec system;
- colony research tree;
- research currency;
- technology unlock graph;
- endgame levels;
- prestige;
- account-wide progression;
- seasonal progression;
- achievements unrelated to gameplay progression.

---

# 22. NON-GOALS

- Rebalance inventory/survival/building/exploration base values.
- Add profession-exclusive critical-path requirements.
- Implement colony research.
- Define technical event IDs/persistence schemas.
- Define final progression UI/art.
- Introduce permanent class choice.

---

# 23. ACCEPTANCE CRITERIA

### AC-XP-001 Level thresholds
Character level follows the cumulative XP thresholds in this spec.

### AC-XP-002 Meaningful event only
Failed/canceled/no-op/stale/duplicate actions award 0 additional XP.

### AC-XP-003 First gather
Each approved resource source grants its 8 XP first-gather milestone once per player.

### AC-XP-004 Unique craft
Each approved recipe grants 8 XP for first successful craft once per player.

### AC-XP-005 Repair
First condition-increasing repair grants 12 XP; no-op repair does not.

### AC-XP-006 Building anti-loop
Each building-type milestone grants once per player and cannot be reset by dismantle/rebuild.

### AC-XP-007 Repeat caps
Gather/craft/repair repeat XP stops exactly at documented persistent caps.

### AC-XP-008 No inventory grind
Pickup/drop/transfer/split/merge/consume gives no XP.

### AC-XP-009 No fog-step grind
Ordinary movement/fog-cell transitions do not award repeat XP outside explicit exploration milestones.

### AC-PACE-001 Level 3–4 plausibility
A normal varied vertical-slice path has an expected XP budget sufficient to plausibly reach Level 3–4 without mandatory grind.

### AC-SKILL-001 Fieldcraft Basics
Level 2 + personal Expedition Band entry unlocks Fieldcraft Basics.

### AC-SKILL-002 Maintenance Basics
Level 2 + first successful Workbench condition repair unlocks Maintenance Basics.

### AC-SKILL-003 No hidden stat changes
Prototype prerequisite skills provide no unapproved stat modifier in Phase 1.

### AC-PROF-001 Explorer eligibility
Explorer quest requires Level 3 + Fieldcraft Basics.

### AC-PROF-002 Explorer objectives
Locate Ruin → personal Inspect → return to base unlocks Explorer Prototype and awards 40 XP.

### AC-PROF-003 Engineer eligibility
Engineer quest requires Level 3 + Maintenance Basics.

### AC-PROF-004 Engineer objectives
Interact with valid powered Condenser context and personally collect produced Clean Water to unlock Engineer Prototype and award 40 XP.

### AC-PROF-005 No permanent lock
Unlocking either profession never prevents the other or blocks general Phase 1 systems.

### AC-COOP-001 No XP splitting
Each eligible participant receives full personal reward; party size does not divide it.

### AC-COOP-002 No remote personal discovery XP
Shared ruin knowledge alone does not grant a remote player's personal ruin XP.

### AC-COOP-003 Catch-up ruin interaction
A player may later physically Inspect an already globally investigated ruin for personal XP/quest credit without creating another world reward.

### AC-DEATH-001 Formula
Death removes 5% of current-level XP progress using the documented formula, minimum 1 if progress > 0.

### AC-DEATH-002 No level loss
Death never reduces current character level or removes skills/professions/quest completion.

### AC-BOUND-001 Personal/world boundary
Personal XP/skills/professions persist separately from shared fog/ruin/building/machine world state.

### AC-SCOPE-001 No full progression tree
Phase 1 does not require spendable skill points, complete profession trees, or colony research.

---

# 24. OPEN QUESTIONS

None blocking.

Full profession bonuses, skill-point/stat progression, colony research, and post-Level-4 pacing remain explicitly deferred.

The two prototype professions intentionally unlock persistent specialization identity without exclusive mechanical bonuses so no already approved Phase 1 subsystem requires rebalancing.

---

# 25. ASSUMPTIONS

XP values are Phase 1 tuning defaults selected from the approved 30–60 minute pacing target.

The expected XP budget is not a promise that every player reaches Level 4 at an exact minute; it is the balancing target that QA/playtest can validate.

---

# 26. DEFINITION OF DONE SELF-CHECK

- XP sources/weights defined: PASS
- Anti-grind rules exact: PASS
- Level 1→3–4 pacing quantified: PASS
- Level thresholds explicit: PASS
- Skill/progression feedback requirement explicit: PASS
- Two profession quest prototypes defined: PASS
- Profession prerequisites explicit: PASS
- No permanent class lock: PASS
- Player vs colony/world progression boundary explicit: PASS
- Death XP interaction exact: PASS
- Co-op personal participation semantics explicit: PASS
- Full profession/research tree deferred: PASS
- Technical Design can proceed without gameplay invention: PASS
- QA can derive PASS/FAIL tests: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
