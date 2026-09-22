# P1-DES-001 — Phase 1 Vertical Slice Master Gameplay Specification

**Task:** P1-DES-001  
**System:** Phase 1 — Vertical Slice Master Gameplay  
**Role:** Game Designer / Systems Designer  
**Status:** READY FOR PRODUCER REVIEW  
**Milestone:** Phase 1 — Vertical Slice  
**Source Issue:** #29  
**Upstream Plan:** docs/phase-1-vertical-slice-plan.md  
**Accepted Foundation:** Phase 0 accepted behavior remains valid unless this specification explicitly extends it.

---

# 1. INFORMATION CLASSIFICATION

## CONFIRMED

The Phase 1 vertical slice must:

- be a directly playable browser experience rather than an engineering-only test room;
- target a coherent 30–60 minute first-session loop;
- preserve Phase 0 continuous, responsive, non-grid locomotion;
- begin from a landing/foothold state on an unknown planet;
- include nearby exploration and gathering;
- include food, water, health, stamina, temperature exposure, equipment condition where used, and carrying capacity;
- make preparation materially affect expedition success;
- include player inventory, basic containers, item weight/capacity, and death-drop recovery;
- include enough Tier 0/Tier 1 crafting to support storage, workbench, power, repair, and one useful machine;
- include a landing module, first habitat, storage, workbench, power unit, and first useful machine;
- include fog of war, one meaningful weather event, day/night, wildlife, one hostile encounter, and one prior-civilization ruin;
- include death, respawn at base, dropped carried inventory, small XP loss, small durability loss, and a recoverable death site;
- demonstrate early progression toward approximately level 3–4 and at least one meaningful profession/specialization path;
- support solo and hosted co-op with the same gameplay rules;
- operationally target 2–4 hosted co-op players in Phase 1 while preserving the broader product direction;
- persist canonical Phase 1 world/player state used by the slice;
- end the first-session arc with a reason to continue the same persistent world rather than with a hard campaign-ending victory screen.

## CONSTRAINT

- The game remains a survival sandbox: the first-session flow may guide but must not permanently hard-lock players into one exact task order.
- Combat supports exploration/survival and is not the primary identity.
- Failure must be consequential but recoverable.
- No permanent class lock.
- No mandatory calendar raid.
- The master spec defines cross-system gameplay contracts; detailed subsystem rules and balance belong to P1-DES-002 through P1-DES-006.
- Technical architecture, authority implementation, networking protocol, save format, renderer, and algorithms are outside this specification.
- Final art/UI implementation is outside this specification, but information and readability requirements are gameplay requirements.

## DECISION NEEDED

None blocking P1-DES-001.

No unresolved product choice prevents the subsystem design tasks from proceeding.

---

# 2. GAME DESIGN SPEC

## SYSTEM

Phase 1 — 30–60 Minute Playable Vertical Slice

## STATUS

READY

## PRODUCT INTENT

Phase 1 must prove that ProZ0 works as a coherent game loop, not merely as a collection of systems.

The intended fantasy is:

> A pioneer lands on an unknown world, turns a fragile landing site into a first functional foothold, learns what the environment demands, prepares for a risky expedition, pushes beyond known territory, survives or suffers a recoverable failure, discovers unmistakable evidence of an earlier civilization, and returns to a persistent world that now contains both visible progress and a stronger unanswered question.

The slice must demonstrate both major long-term directions of ProZ0:

1. **Rebuild human capability** — visible through the transformation from landing module to first useful habitat.
2. **Investigate the planet's previous civilization** — visible through one meaningful ruin/discovery beat.

The systems must reinforce one another rather than exist as isolated menus.

---

# 3. PLAYER GOAL

During the first Phase 1 session, the player should understand and pursue four connected goals:

1. **Stay operational.**  
   Learn movement, needs, carrying limits, tools, and immediate environmental risks.

2. **Create a foothold.**  
   Gather enough resources to establish storage, crafting/repair capability, power, and one useful machine around the landing site.

3. **Prepare and push outward.**  
   Choose what to carry, what to leave behind, what tool/supplies are needed, and whether conditions are safe enough to attempt a longer expedition.

4. **Discover and return.**  
   Reach the Phase 1 ruin/discovery, survive the return or experience the death/recovery loop, and continue in the same world with a clear next motivation.

The player may perform some tasks in a different order where dependencies allow it. The master flow is a design target, not a forced quest rail.

---

# 4. PLAYER EXPERIENCE

The first session should move through this emotional curve:

**Arrival / uncertainty → orientation → small competence → visible ownership → preparation → tension → discovery → consequence → recovery/return → curiosity**

The player should be able to explain after the session:

- where the landing site/base is;
- what basic resources matter and why;
- what their needs/carry capacity mean;
- what they built and how it improved their options;
- what preparation changed about the expedition;
- what danger stopped or threatened them;
- what the ruin proves;
- what was lost if they died;
- how that loss can be recovered;
- what they want to do next in the same world.

The slice fails its player-experience goal if the player completes systems mechanically but cannot connect them into this cause-and-effect story.

---

# 5. SESSION STRUCTURE

## 5.1 First-session pacing target

The full integrated path targets **30–60 minutes** for a new player who engages with the intended loop.

The following windows are pacing targets, not hard timers or mandatory locks:

- **0–5 min:** landing, movement, orientation, first resource interaction.
- **5–15 min:** nearby gather/return, first need/capacity pressure, basic tool/item understanding.
- **10–25 min:** storage/workbench/repair and first habitat progression.
- **20–40 min:** power/first machine and expedition preparation.
- **30–50 min:** expedition into fog, environmental pressure, hostile/hazard beat, ruin discovery.
- **40–60 min:** return, death/recovery if triggered, persistence/continuation payoff.

Overlap is intentional. Skilled players may move faster; cautious players may spend longer gathering/building.

Subsystem balance must be tuned so ordinary first-time play can plausibly complete the intended slice without grind.

## 5.2 Progress states

These are player-facing progression states, not required software state-machine names.

### LANDING
The player has entered a new world at the landing module and has not yet established basic local competence.

### LOCAL SURVIVAL
The player understands nearby gathering, basic needs, capacity, and return-to-base behavior.

### FOOTHOLD
The landing site has been expanded with the minimum functional base elements required by the slice.

### EXPEDITION PREPARED
The player has deliberately selected supplies/tools and has enough operational margin to attempt the long-range Phase 1 expedition.

### EXPEDITION ACTIVE
The player has left the local safe/known area, is revealing new territory, and is exposed to meaningful distance/environment/hostile risk.

### DISCOVERY REACHED
The ruin has been found and the prior-civilization discovery has been recognized/recorded.

### RETURN / RECOVERY
The player is returning with gains or has died and is attempting to recover the death drop.

### CONTINUATION
The world remains playable with the base, discovery, progression, and unresolved mystery intact.

These states may overlap and do not prevent sandbox behavior.

---

# 6. START / LANDING STATE

## 6.1 Spawn context

A new world begins at or immediately beside the landing module.

The landing module is the player's first known landmark and Phase 1 base anchor.

At initial spawn:

- the local player has valid Phase 0 movement/camera control;
- the player is not inside a lethal or immediately unavoidable hostile situation;
- the area immediately around physical spawn is revealed because the player is physically present there;
- the player can identify the landing module visually;
- the player can identify at least one reachable nearby resource opportunity;
- the player has enough initial operational margin to learn the first local gather/return loop before ordinary needs create a forced death.

Exact starting inventory, need values, safe radius, and resource placement belong to subsystem/content specs.

## 6.2 Landing module gameplay role

For Phase 1 the landing module serves as:

- first-world landmark;
- base/respawn anchor;
- onboarding reference point;
- starting point for early construction;
- safe return destination for the local loop.

It must not replace every later base function. The player still has a reason to build storage, workbench, habitat, power, and the first machine.

## 6.3 First-session onboarding philosophy

Onboarding is **contextual guidance**, not a long modal tutorial and not a permanent quest rail.

The first-session guidance should reveal one immediate useful action at a time:

1. move/orient;
2. identify the landing module and basic HUD;
3. gather a nearby useful resource;
4. understand that carried items/needs have limits;
5. return/use resources at the foothold;
6. expose the next useful capability only when it becomes relevant.

The player may dismiss or ignore guidance and continue sandbox play.

Guidance must explain cause and effect rather than only input bindings.

Example concept:

- not only “Press Interact”;
- but “Gather this material — it is needed for your first storage/workbench.”

Exact copy and presentation belong to Art/UI.

---

# 7. CORE PLAYER ACTION VOCABULARY

Phase 1 must support these player-facing verbs where relevant:

- Move.
- Focus/target an interactable world object.
- Interact.
- Gather/harvest.
- Pick up.
- Drop.
- Transfer.
- Split/merge stacks where supported by the inventory spec.
- Equip/use a tool.
- Consume a survival item.
- Craft.
- Repair.
- Enter/exit build placement mode.
- Place/build.
- Open/use a container.
- Use/operate a workstation or machine.
- Inspect map/discovery information.
- Attack/defend in the approved hostile encounter.
- Recover a death drop.

Detailed controls/bindings beyond accepted movement behavior may be refined by subsystem/UI specifications, but action semantics must remain consistent.

---

# 8. INTERACTION PRIORITY CONTRACT

The game must never make an important player action ambiguous when several systems are available.

Player-facing priority is:

1. **Active modal/UI context** receives commands intended for that UI.
2. **Build-placement mode** uses its explicit placement/cancel actions and does not silently trigger world gathering/interact.
3. **Explicit combat action** remains separate from ordinary interact so the player does not accidentally attack merely because an interactable is nearby.
4. **World Interact** applies only to the currently readable/focused eligible target.
5. If no valid target/action exists, the game gives no false success; it communicates why the attempted action cannot occur when that reason is useful to the player.

A world interaction must not silently switch to a different nearby target at the moment of commitment if the player was shown a specific focused target.

The focus/prompt presentation must communicate:

- target identity/category;
- available verb;
- relevant prerequisite when unavailable;
- why an invalid action cannot proceed.

Examples of invalid reasons include:

- too far;
- blocked/unreachable;
- wrong/missing tool;
- inventory/capacity limit;
- insufficient ingredient/material;
- invalid build location;
- insufficient power;
- unusable/broken condition.

Exact targeting geometry and input implementation belong to follow-up design/technical work.

---

# 9. NEARBY GATHER / RETURN LOOP

The first repeatable loop is:

**Leave landing module → identify nearby resource → gather → capacity/needs change → decide whether to continue → return → store/use/craft**

Purpose:

- teach that the world contains usable resources;
- teach that carrying capacity matters;
- teach that the landing site is a meaningful return point;
- create resources for the first base improvements;
- expose needs without making the tutorial a death race.

The local area must provide the approved resource categories needed to begin the slice without requiring a long dangerous expedition.

The loop should create at least one meaningful choice before the player has a full habitat:

- carry one more resource vs return;
- use a consumable now vs save it;
- bring a tool vs preserve capacity;
- collect construction material vs survival supply.

Exact resources, tools, yields, stack/capacity values, and recipes are defined in P1-DES-002.

---

# 10. RELATIONSHIP BETWEEN NEEDS, CAPACITY, TOOLS, HAZARDS, AND DISTANCE

These systems must form one expedition decision model.

## 10.1 Needs

Health, food, water, stamina, and temperature each communicate a different type of operational pressure.

Master rule:

**Needs create preparation and timing decisions; they must not become unrelated bars that drain only for maintenance busywork.**

P1-DES-003 defines exact states/rates/recovery.

## 10.2 Carrying capacity

Carrying capacity creates a trade-off between:

- survival supplies;
- tools/equipment;
- empty capacity for recovered resources;
- loot/lore/recovery items;
- return safety margin.

The player should not be able to take every useful option at no cost.

## 10.3 Tools

Tools must create practical capability or efficiency.

A tool carried on expedition costs capacity/condition but enables or improves approved actions.

The Phase 1 critical path must not depend on an obscure tool that a first-time player could not reasonably know or obtain from the slice.

## 10.4 Hazards

Hazards test preparation and player response.

They must communicate:

- the danger;
- what is being affected;
- at least one practical mitigation/recovery path available within Phase 1.

## 10.5 Distance

Distance itself does not apply an invisible arbitrary damage multiplier.

Distance increases risk naturally because it increases:

- travel time;
- need exposure;
- carrying commitment;
- time spent away from base services/storage;
- difficulty of recovering a death drop;
- exposure to changing day/night/weather conditions.

## 10.6 Combined expedition choice

Before a longer expedition, the player should be able to ask:

- Do I have enough water/food/operational margin?
- Is my tool/equipment condition acceptable?
- What tool do I need?
- How much capacity should I reserve for what I find?
- Is the current environment/time/weather making this a poor moment to go?
- If I die this far away, can I reasonably recover the drop?

A build where these questions have no observable consequence fails the preparation pillar.

---

# 11. BASE PROGRESSION — LANDING MODULE TO FIRST USEFUL HABITAT

Phase 1 must visually and functionally transform the landing site.

## 11.1 Required functional set

The completed Phase 1 foothold includes the approved minimum set:

- landing module;
- first habitat room;
- corridor or equivalent connection where required by the modular language;
- storage;
- workbench;
- power unit;
- one first useful machine.

The exact finite placeable list and costs are defined in P1-DES-004.

## 11.2 Gameplay role of each category

### Landing module
Anchor, respawn reference, initial foothold.

### Storage
Lets the player convert personal carry pressure into base logistics and prepare loadouts.

### Workbench
Turns gathered resources into intentional progression through crafting/repair.

### Habitat room
Visibly establishes permanence and provides the first real colony-space grammar.

### Corridor / connector
Demonstrates that future modules form a connected settlement rather than unrelated props, where required by the selected Phase 1 placement grammar.

### Power unit
Introduces that useful infrastructure has an operational dependency, not just a build cost.

### First useful machine
Must solve or improve a real problem encountered in the 30–60 minute loop.

The machine cannot be decorative-only.

Its exact function is chosen in P1-DES-004, but it must have a clear before/after player benefit that supports survival, preparation, processing, repair, or expedition capability.

## 11.3 Base progression principle

Building is not a separate creative-mode break from survival.

The intended relationship is:

**Gather → store → craft/repair → build → gain practical capability → prepare farther expedition**

The foothold must visibly communicate progress even to a player who has not read a tech tree.

---

# 12. CRAFTING AND REPAIR ROLE IN THE MASTER LOOP

Crafting exists to convert gathered material into:

- survival readiness;
- tools;
- storage/base capability;
- expedition capability.

Repair exists because equipment condition must create a reason to maintain useful gear rather than simply discard it without thought.

Master requirements:

- at least one tool/equipment case in the slice must make repair understandable and useful;
- the player must receive a readable reason when crafting/repair cannot proceed;
- crafting must not require excessive repetition that pushes the first-session loop outside its target pacing;
- recipes and exact material counts are P1-DES-002 responsibilities.

---

# 13. EXPEDITION PREPARATION LOOP

The expedition begins conceptually when the player chooses to move beyond the nearby/local gather area with an objective that justifies additional risk.

Preparation loop:

**Review condition/needs → select supplies → choose tool/equipment → free carrying capacity → consider time/weather → depart**

The game does not require a mandatory “Ready” button.

Readiness is expressed through player state and equipment choices.

## Preparation quality rule

A prepared player must have a materially better chance or more operational margin than an unprepared player.

Examples of acceptable consequences, to be specified numerically later:

- more water/food extends viable distance;
- suitable protection slows harmful temperature exposure;
- repaired equipment reduces failure risk;
- appropriate tool enables a resource/ruin interaction;
- reserved carrying capacity allows valuable recovery;
- leaving before/after adverse weather changes expedition cost.

Preparation must not guarantee success; it changes options and margin.

---

# 14. EXPLORATION, FOG, AND DISTANCE

The world beyond the landing area begins unknown.

Physical exploration reveals territory according to P1-DES-005.

Master rules:

- unexplored space is not fully exposed on the map;
- the player earns knowledge by physically travelling;
- discovery persists;
- hosted co-op shares approved map discovery;
- new territory must contain readable reasons to continue outward;
- the ruin lies beyond the immediate landing/local-gather experience so reaching it feels like an expedition rather than a spawn-room interaction.

The integrated slice needs only one coherent generated region with expandable boundaries, not full planetary scale.

---

# 15. DAY / NIGHT AND WEATHER ROLE

Day/night and the one Phase 1 weather event must affect decisions, not just visuals.

At least one of the following expedition dimensions must change observably when conditions change:

- visibility/readability;
- temperature exposure;
- travel safety;
- hostile/wildlife risk;
- equipment/power reliability where approved;
- preparation requirements.

The player must receive enough feedback to connect the condition with the gameplay consequence.

Exact event type, timing, modifiers, and thresholds are defined in P1-DES-003/P1-DES-005.

There is no mandatory periodic raid schedule.

---

# 16. HOSTILE ENCOUNTER ROLE

Phase 1 contains one approved hostile encounter.

Its purpose is to:

- make expedition preparation matter;
- introduce danger that cannot be solved only through inventory menus;
- support the “occasionally tense” tone without turning the game into a combat-first experience;
- test damage/death/recovery.

The encounter must have:

- a readable threat;
- a clear hostile state;
- an approved player response vocabulary;
- a resolution state;
- a way to avoid, retreat, or disengage where encounter geometry permits.

Exact enemy behavior, damage values, combat controls, equipment, and deterministic resolution rules belong to P1-DES-003.

The ruin must not require the player to grind repeated combat encounters.

---

# 17. RUIN / DISCOVERY MILESTONE

The Phase 1 ruin is the narrative payoff for the expedition.

It must be recognizably different from normal human-built habitat/resource props and clearly communicate:

**someone or something was here before humanity arrived.**

## Discovery sequence

The intended beat is:

1. Player reveals enough new territory to locate or recognize the ruin.
2. Player approaches through the expedition risk space.
3. Ruin identity becomes readable before or at entry/interaction.
4. Player performs the approved inspect/recover/discovery interaction.
5. A persistent discovery result is recorded.
6. The player receives a clear reason to return to base and/or continue investigating in later play.

The ruin may award a physical item, discovery record, lore/research token, or bounded combination, as determined by P1-DES-005.

Master requirement:

**The payoff must be more meaningful than “you found another resource node.”**

It must advance the planet-mystery premise.

## Discovery persistence

Once legitimately discovered, the core discovery record is not erased by ordinary player death.

Carried physical rewards may follow death-drop rules if the subsystem spec classifies them as carried inventory.

---

# 18. RETURN LOOP

A successful expedition creates a return decision.

Return purpose:

- convert carried gains into stored/progression value;
- repair/resupply;
- see the contrast between unknown frontier and increasingly useful base;
- prepare the next trip.

The game should not require players to empty every inventory slot manually into base storage to count the expedition as successful; exact storage/transfer quality-of-life belongs to P1-DES-002.

The world remains active after the ruin discovery.

There is no campaign-ending reset.

---

# 19. FAILURE CONDITIONS

Phase 1 recognizes three levels of failure.

## 19.1 Action failure

An individual action cannot complete.

Examples:

- inventory full;
- missing tool;
- invalid placement;
- missing material;
- broken/unusable equipment;
- no power.

Required response:

- no silent partial success unless explicitly defined;
- clear player-facing reason;
- no loss unrelated to the stated action rule.

## 19.2 Expedition failure / retreat

The player chooses or is forced to abandon the current objective without dying.

Examples:

- insufficient supplies;
- hazard too severe;
- inventory full;
- equipment condition too low;
- hostile pressure;
- adverse time/weather.

This is valid gameplay, not a hard game-over.

The player can return, re-prepare, and try again.

## 19.3 Death

Death is the major Phase 1 failure state.

Confirmed consequences:

- player respawns at base;
- carried inventory remains at death site;
- small XP loss;
- small durability loss;
- world/base/discovery progress is not globally reset;
- recovery expedition is possible;
- co-op teammate can assist recovery.

Exact penalty values and death-drop details belong to P1-DES-003/P1-DES-006.

---

# 20. RECOVERY

Recovery turns death into another expedition instead of a save reload.

Player-facing recovery loop:

**Respawn at base → understand what was dropped and where → equip available replacement/basic supplies → travel back → survive the location → recover drop → return**

Requirements:

- death location/drop is readable on the relevant map/world feedback;
- player knows that carried inventory can be recovered;
- recovery is possible without requiring the exact equipment that was lost if that would create a progression dead-end;
- multiple deaths must not silently erase previous recoverable drops unless a future approved rule explicitly changes this;
- co-op may recover or transport dropped items according to P1-DES-002/P1-DES-003;
- recovery failure does not reset the world.

If all active co-op players die, the world does not roll back solely because of the party wipe. Players respawn according to the approved death rules and drops remain governed by recovery rules.

---

# 21. SUCCESS / SLICE COMPLETION STATE

Phase 1 is a persistent sandbox slice, so “success” is not a final victory screen.

For player-facing demo completion, the integrated session should be able to demonstrate:

1. the player has a recognizable foothold beyond the untouched landing state;
2. the player has used gathering/logistics/crafting/building systems;
3. preparation has affected a real expedition decision;
4. new territory has been revealed;
5. the approved danger/hostile beat has been faced, avoided, or survived under valid rules;
6. the prior-civilization ruin has been discovered and its discovery recorded;
7. the player can return or recover after death;
8. the world can continue and later reopen with progress intact.

The end-state message/presentation should communicate continuation, not “game completed.”

---

# 22. PROGRESSION ROLE

Early progression supports the vertical-slice story but must not dominate it.

Phase 1 progression should reward meaningful varied activity:

- gathering;
- crafting;
- building;
- discovery;
- repair;
- combat;
- other approved meaningful actions.

Simple repetition must not be the strongest path.

Target:

- a new player plausibly approaches level 3–4 during the slice;
- at least one meaningful specialization/profession path becomes demonstrable;
- one or two profession-quest prototypes may be used;
- no permanent class lock.

Detailed XP weighting, level thresholds, skills, quest rules, and death-XP interaction belong to P1-DES-006.

Colony/world progression and personal progression remain conceptually distinct.

---

# 23. SOLO GAMEPLAY SEMANTICS

Solo uses the same gameplay rules as hosted co-op.

In solo:

- one player performs all roles;
- no system may require another profession/player merely to complete the Phase 1 critical path;
- shared-world objects remain world state even though only one player is present;
- recovery must remain possible for a solo player after death.

Solo is not a separate simplified ruleset.

---

# 24. HOSTED CO-OP PLAYER-FACING SEMANTICS

Operational Phase 1 target: **2–4 players**.

Architecture for larger product targets is Technical Design, not this gameplay spec.

## 24.1 Same rules

Hosted co-op uses the same:

- movement fundamentals;
- survival rules;
- item/resource rules;
- crafting/building rules;
- hostile/damage/death rules;
- world/discovery rules.

Co-op does not receive hidden reduced survival penalties merely because multiple players are present.

## 24.2 Shared world state

Players participate in one shared persistent world.

The following are shared where applicable:

- generated world state;
- discovered map/fog state;
- buildings;
- world containers/storage;
- power/machine state;
- world mutations;
- ruin discovery;
- colony-level progression/research if present in the Phase 1 prototype.

## 24.3 Personal state

The following remain player-specific unless a subsystem spec explicitly says otherwise:

- health;
- food/water/stamina/temperature;
- carried inventory;
- equipment;
- character XP/level;
- skills/profession progress;
- death/respawn state.

## 24.4 Role division

Players may divide work:

- scout;
- gather;
- transport;
- craft/repair;
- build;
- fight/protect;
- recover a teammate's death drop.

No role is a mandatory permanent class dependency.

## 24.5 Shared discovery

When one player legitimately reveals/discovers approved map information, it becomes available according to the shared-discovery rules in P1-DES-005.

The system must make it clear to teammates that new shared information was discovered.

## 24.6 Death/recovery assistance

A surviving player can assist by:

- securing the death location;
- carrying supplies;
- retrieving approved dropped inventory;
- escorting the returning player.

Exact item-contention/transaction rules belong to P1-DES-002/P1-DES-003.

## 24.7 Joining and session end

A joining player must enter the current persistent world state rather than a private reset copy.

The exact host/session/rejoin protocol belongs to Technical Design.

Player-facing requirement:

- disconnect/session end must not silently imply successful state changes that were not preserved;
- explicit connection/session failure feedback is required;
- production matchmaking, host migration, and dedicated-server fleet behavior are not Phase 1 gameplay scope.

---

# 25. HUD / PLAYER INFORMATION REQUIREMENTS

Art/UI decides layout and visual language. Game Design defines required information.

## 25.1 Always or immediately glanceable during ordinary play

The player must be able to understand:

- health;
- food state;
- water state;
- stamina;
- temperature state/exposure warning;
- carrying load/capacity state;
- currently relevant equipped tool/equipment condition where condition affects the current loop;
- current focused world interaction and its verb.

The HUD does not need to expose every numeric backend value at all times if readable states convey the rule accurately.

## 25.2 Contextual information

When relevant, the player must be able to identify:

- inventory/container contents and transfer result;
- item weight/capacity impact;
- crafting prerequisites and result;
- repair prerequisite/result;
- build cost and placement validity;
- power unavailable/available state for relevant equipment/machine;
- machine operational/non-operational reason;
- threat/damage feedback;
- fog/discovery/map state;
- day/night/weather warning;
- death cause;
- respawn outcome;
- death-drop location/recovery status;
- XP/level/profession progress when it changes meaningfully;
- co-op teammate identity and shared-discovery/recovery-relevant feedback.

## 25.3 Readability rule

A player should not have to inspect debug data or source code to understand why a gameplay action succeeded or failed.

---

# 26. SYSTEM INTERACTION CONTRACTS

## 26.1 Inventory ↔ survival

Survival supplies occupy capacity.

Using supplies changes need state.

Death transfers applicable carried inventory into recovery-state/drop handling.

## 26.2 Inventory ↔ gathering

Gathering creates items/resources that consume inventory capacity.

Capacity pressure creates return decisions.

## 26.3 Inventory ↔ crafting/building

Crafting/building consume approved resources.

Storage converts personal capacity into base logistics.

## 26.4 Tools ↔ gathering/repair/expedition

Tools provide capability/efficiency but consume carry capacity and may lose condition.

Repair restores approved usable condition/capability.

## 26.5 Survival ↔ exploration

Longer travel increases exposure to needs/time/weather.

Preparation extends operational range.

## 26.6 Base ↔ exploration

The base provides storage, crafting/repair, power/machine capability, respawn, and preparation value.

Exploration returns resources/discovery that justify expanding the base.

## 26.7 Weather/day-night ↔ survival/exploration

Conditions change the cost/readability/risk of travel in an observable way.

## 26.8 Hostile encounter ↔ death/recovery

Combat/hazard creates real failure risk.

Death transforms the next objective into recovery rather than world reset.

## 26.9 Ruin/discovery ↔ progression/continuation

The ruin provides persistent mystery progress and must create a next-question/reason to continue.

## 26.10 Progression ↔ varied play

XP/profession progress rewards the integrated loop without turning one trivial repeated action into the optimal experience.

## 26.11 Co-op ↔ every shared system

Co-op lets players divide labor and assist recovery but does not change the core rules or introduce permanent role locks.

---

# 27. MEANINGFUL CHOICES REQUIRED BY THE SLICE

The integrated slice must create choices with visible trade-offs.

At minimum:

### Choice A — Continue gathering vs return
More resources now vs greater need/capacity/time exposure.

### Choice B — What to carry
Tools/supplies vs free loot capacity.

### Choice C — Build priority
Storage/crafting/power/machine progression competes for gathered resources within the bounded placeable set.

### Choice D — Expedition timing
Depart now vs improve readiness / avoid adverse conditions.

### Choice E — Push farther vs retreat
Potential discovery/reward vs increasing recovery cost.

### Choice F — Recovery priority after death
Recover immediately, re-equip first, or use teammate assistance.

These choices must not all collapse into one obviously dominant option because costs are meaningless.

Exact balance is subsystem tuning.

---

# 28. SUBSYSTEM BOUNDARIES / FOLLOW-UP DESIGN TASKS

P1-DES-001 intentionally defines the master contract and does not replace the approved follow-up issues.

## P1-DES-002 / #32 — Inventory, Gathering, Crafting, Repair

Must define:

- exact item categories used in Phase 1;
- weight/volume/stack/condition semantics;
- capacity/over-capacity rules;
- pickup/drop/transfer/split/merge;
- containers;
- gather interaction/tool requirements/yields;
- Tier 0 + bounded Tier 1 recipe set;
- workbench crafting;
- repair rules;
- dropped item semantics;
- co-op transaction/contention behavior at gameplay level.

Must preserve from master:

- capacity creates expedition trade-offs;
- storage supports return/preparation;
- no advanced logistics;
- action failure is readable;
- death-drop/recovery integrates with item rules.

## P1-DES-003 / #33 — Survival, Hazard, Combat, Death, Recovery

Must define:

- health/food/water/stamina/temperature states and rates;
- survival recovery methods;
- preparation effects;
- environmental hazard behavior;
- hostile/combat vocabulary;
- damage/death trigger;
- respawn;
- death-drop rules;
- XP/durability loss semantics;
- recovery and co-op assistance;
- day/night danger relationship where relevant.

Must preserve from master:

- preparation is meaningful;
- failure is recoverable;
- combat is supporting, not dominant;
- distance increases risk through exposure/recovery cost;
- no global world rollback on ordinary death.

## P1-DES-004 / #34 — Habitat, Building, Power, First Machine

Must define:

- landing module function details;
- bounded placeable set;
- placement/connectivity;
- costs;
- storage/workbench/habitat/power roles;
- first machine function;
- machine inputs/outputs/maintenance if used;
- dismantle/recovery if required;
- co-op build/use semantics.

Must preserve from master:

- base visibly transforms;
- first machine solves a real slice problem;
- no conveyors/advanced automation;
- building supports preparation, not separate sandbox busywork.

## P1-DES-005 / #35 — Exploration, Fog, Weather, Ruin

Must define:

- fog states/reveal rules/persistence;
- shared discovery;
- world exploration roles;
- distance/risk/reward specifics;
- day/night effect;
- one weather event;
- ruin sequence;
- ruin reward/discovery record;
- hazard/hostile positioning;
- map feedback.

Must preserve from master:

- physical exploration earns knowledge;
- ruin is beyond immediate spawn/local loop;
- ruin clearly signals prior civilization;
- discovery persists through ordinary player death;
- weather/day-night affects decisions;
- one region/ruin/weather event is enough.

## P1-DES-006 / #36 — Early Progression / Profession Prototype

Must define:

- XP sources/weights;
- level pacing;
- anti-grind logic;
- skill-point behavior if used;
- profession prototype(s);
- prerequisites/quest(s);
- death XP interaction;
- player-vs-colony progression boundary.

Must preserve from master:

- target progression toward level 3–4;
- varied meaningful play;
- no permanent class lock;
- no full profession/research tree.

## Co-op master contract

No separate Game Design issue is required for ordinary player-facing co-op semantics already defined here unless Producer later identifies a missing gameplay decision.

Technical hosted-co-op protocol must consume this master contract plus subsystem rules rather than inventing different gameplay rules.

---

# 29. PHASE 1 SCOPE

Included in this master vertical slice:

- accepted Phase 0 movement/camera;
- landing/first-session onboarding;
- one readable deterministic region;
- nearby gather/return loop;
- player inventory and base storage;
- weight/capacity;
- basic tool use;
- Tier 0 / bounded Tier 1 crafting;
- repair use case;
- health/food/water/stamina/temperature;
- meaningful preparation;
- day/night;
- one weather event;
- one hostile encounter;
- first habitat;
- workbench;
- power unit;
- one useful machine;
- fog/reveal;
- one ruin/prior-civilization discovery;
- death/respawn/drop/recovery;
- early level/profession prototype;
- persistence of relevant canonical slice state;
- solo;
- hosted 2–4 player approved path;
- shared discovery and recovery assistance;
- player-readable browser presentation.

---

# 30. DEFERRED

Deferred beyond this master Phase 1 slice unless separately authorized:

- full procedural-planet content breadth;
- many production biomes;
- advanced ecology simulation;
- oxygen/radiation/complex illness;
- advanced food/nutrition simulation;
- advanced logistics;
- nested warehouse networks;
- conveyors;
- advanced automation;
- vehicle gameplay;
- aircraft;
- advanced farming genetics;
- full profession trees;
- full skill trees;
- full colony research tree;
- NPC colonists;
- complex alien factions;
- PvP;
- multi-planet travel;
- endgame civilization simulation;
- production matchmaking;
- dedicated-server fleet;
- account/cloud progression platform;
- production-grade 10-player certification;
- host migration unless separately approved;
- final-art completeness.

---

# 31. NON-GOALS

P1-DES-001 does not:

- select engine/framework/renderer;
- define network transport;
- define prediction/reconciliation;
- define save schemas;
- define transaction IDs/revisions;
- choose physics/collision algorithms;
- create final UI layout;
- create final art;
- specify every recipe/resource numeric value;
- specify every survival decay number;
- specify final enemy damage/AI values;
- define the full game progression/endgame;
- turn the first session into a fixed campaign mission;
- authorize implementation.

---

# 32. BALANCE / TUNING VARIABLES OWNED BY FOLLOW-UP SPECS

The master flow requires the following categories to be data/tuning values rather than hidden hardcoded assumptions:

- local resource density/yields;
- starting supplies;
- initial need state;
- need decay/recovery rates;
- stamina costs/recovery;
- temperature pressure/protection;
- carrying capacity;
- item weights/volumes/stacks;
- tool durability/effectiveness;
- recipe/build costs;
- repair costs/results;
- hostile stats/damage;
- weather timing/effects;
- ruin distance/reward;
- death XP loss;
- death durability loss;
- XP rewards/level thresholds;
- profession prerequisites;
- machine inputs/outputs/rates;
- first-session onboarding hint timing.

The 30–60 minute session target is the balancing context for these values.

No subsystem may treat a temporary placeholder as final balance without documenting rationale and playtest status.

---

# 33. EDGE CASES — MASTER BEHAVIOR

## 33.1 Player ignores onboarding
Allowed. Core systems remain usable and contextual hints do not permanently block progress.

## 33.2 Player explores before building
Allowed where survival/capability permits. Lack of preparation may increase risk; the game does not invisibly teleport/block them solely because the “quest order” was skipped.

## 33.3 Player builds before satisfying every local survival hint
Allowed if resources/rules permit.

## 33.4 Player returns early from expedition
Valid retreat. Resources/discovery already legitimately earned remain valid.

## 33.5 Player reaches ruin unusually early
Discovery still works if all actual gameplay prerequisites are satisfied. The game does not reject success solely because expected pacing was skipped.

## 33.6 Player dies before first habitat
Respawn uses the approved active base/landing anchor. Recovery rules still apply and must not create a hard progression dead-end.

## 33.7 Player dies after ruin discovery but before returning
Persistent discovery remains recorded. Carried physical rewards follow approved death-drop rules.

## 33.8 Player dies repeatedly
World/base progress is not reset. Existing recoverable drops follow the explicit subsystem rules and must not disappear merely because another death occurred unless an approved rule says so.

## 33.9 Player has full inventory at an important discovery
The game must not silently delete the reward. P1-DES-002/P1-DES-005 must define whether the reward is persistent knowledge, remains interactable, becomes a world drop, or requires capacity.

## 33.10 Co-op players interact with same resource/container
Gameplay result must be authoritative and readable; duplication is not a valid outcome. Exact contention rules belong to subsystem/Technical Design.

## 33.11 One player discovers ruin while teammate is elsewhere
Shared-discovery rule applies; teammate receives readable shared discovery information without being teleported.

## 33.12 One player dies and another recovers the drop
Allowed according to recovery/item rules; original player must be able to understand what happened to recoverable items.

## 33.13 All co-op players die
No world rollback solely due to party wipe. Respawn/recovery continues.

## 33.14 Host/session ends
No silent state corruption. Player receives explicit session/end/save outcome according to Technical Design.

## 33.15 World reopened
Player returns to the same canonical Phase 1 state that is defined as persistent: relevant base, inventory/progression, discoveries, world mutations, drops, and machine state according to their subsystem rules.

---

# 34. PO-FACING DEMO CONTRACT

A Phase 1 Product Review candidate is not sufficient if the Project Owner must know debug controls or inspect hidden state to understand it.

The browser build must allow the reviewer to visibly demonstrate:

1. New-world landing.
2. Responsive continuous movement.
3. Identification of landing module/base.
4. Nearby resource gathering.
5. Inventory/carry pressure.
6. Readable survival status.
7. Return/storage.
8. Crafting or repair.
9. Habitat/base construction.
10. Workbench/power/first machine usefulness.
11. Expedition preparation choice.
12. Fog reveal/new territory.
13. Day/night or weather affecting a decision.
14. Hostile/hazard risk.
15. Prior-civilization ruin discovery.
16. Return or death.
17. Respawn/death-drop recovery.
18. Early progression feedback.
19. Save/reopen same world.
20. Hosted co-op shared discovery/recovery assistance.

The build must read as a game slice rather than a collection of developer fixtures.

---

# 35. ACCEPTANCE CRITERIA

## SESSION FLOW

### AC-MASTER-001 — Coherent first-session arc
A new player can move from landing through local gathering, foothold progression, preparation, expedition, ruin discovery, and return/recovery within the intended vertical-slice structure without debug-only actions.

### AC-MASTER-002 — 30–60 minute tuning target
Using approved content/balance on a normal first-time path, the complete intended arc is plausibly achievable in approximately 30–60 minutes without mandatory grind.

This is a playtest target, not an automatic failure for every individual player outside the range.

### AC-MASTER-003 — Sandbox ordering
The player can perform valid actions out of the expected tutorial order when actual prerequisites are met; the master flow does not impose an invisible campaign lock.

### AC-MASTER-004 — Same-world continuation
Completing the ruin/discovery beat does not end/reset the world. The player can continue from the same persistent state.

## LANDING / ONBOARDING

### AC-MASTER-005 — Immediate orientation
A new player can visually identify their character and landing module and has a clear first useful action without source-code/debug knowledge.

### AC-MASTER-006 — No immediate unavoidable survival death
Initial state/local conditions give an ordinary new player enough operational margin to learn and complete the first nearby gather/return loop before ordinary need depletion alone causes unavoidable death.

Exact margin is set by P1-DES-003.

### AC-MASTER-007 — Optional contextual guidance
Ignoring/dismissing onboarding guidance does not permanently prevent valid sandbox play.

## INTERACTION VOCABULARY

### AC-MASTER-008 — Readable focused action
When a world interaction is available, the player can identify the target and intended verb before committing the action.

### AC-MASTER-009 — No accidental combat substitution
Ordinary interact does not silently become an attack solely because a hostile/attackable target is near an interactable.

### AC-MASTER-010 — Invalid action reason
For master-critical actions, a failed attempt communicates a useful reason such as missing tool/material/capacity/power or invalid placement rather than appearing unresponsive.

## LOCAL LOOP

### AC-MASTER-011 — Local gather/return
The landing region supports at least one complete nearby gather → carry decision → return → use/store/craft loop.

### AC-MASTER-012 — Capacity matters
The player encounters a meaningful reason to decide what to carry/return with before the long expedition.

## SYSTEM RELATIONSHIP / PREPARATION

### AC-MASTER-013 — Survival signals have purpose
Each approved need used in Phase 1 has a player-facing gameplay purpose defined by P1-DES-003 and is not present only as decorative HUD.

### AC-MASTER-014 — Preparation changes capability
At least two valid preparation choices materially change expedition margin/capability in observable ways.

Examples may include supplies, protection, tool condition, or reserved capacity.

### AC-MASTER-015 — Distance creates natural risk
Farther travel increases expedition commitment through approved exposure/recovery/logistics factors rather than an unexplained hidden distance damage multiplier.

### AC-MASTER-016 — Retreat is valid
A player can abandon an expedition and return to re-prepare without losing unrelated persistent world progress.

## BASE / BUILDING

### AC-MASTER-017 — Visible foothold growth
The integrated Phase 1 path can transform the landing site into a visually and functionally recognizable first habitat.

### AC-MASTER-018 — Required base functions
The approved Phase 1 path demonstrates storage, workbench/crafting-repair capability, habitat, power, and one useful machine.

### AC-MASTER-019 — First machine is useful
The first machine produces an observable benefit relevant to the vertical-slice loop; it is not merely decorative.

## EXPLORATION / WEATHER / HOSTILE

### AC-MASTER-020 — Fog makes exploration meaningful
Unexplored territory begins hidden according to the approved fog rules; physical exploration reveals/persists information.

### AC-MASTER-021 — Environmental condition affects decisions
Day/night plus the approved weather event causes at least one observable decision-relevant gameplay change.

### AC-MASTER-022 — Hostile encounter supports exploration
The hostile encounter is readable, resolvable under approved rules, and does not require repetitive combat grinding to reach the ruin.

### AC-MASTER-023 — Retreat/disengage path
Where encounter geometry/state allows, the player is not forced to treat every hostile contact as a mandatory kill objective.

## RUIN / DISCOVERY

### AC-MASTER-024 — Prior-civilization readability
A new player can recognize the Phase 1 ruin/discovery as evidence of a previous civilization, not as ordinary human base/resource scenery.

### AC-MASTER-025 — Persistent discovery
Legitimate ruin discovery creates a persistent discovery result that survives ordinary player death.

### AC-MASTER-026 — Continuing mystery
The discovery provides a clear reason/question that supports continuing the same world.

## FAILURE / DEATH / RECOVERY

### AC-MASTER-027 — Failure is recoverable
Ordinary expedition failure/death does not globally reset the world/base.

### AC-MASTER-028 — Death consequence
Death respawns the player at base and applies the approved inventory-drop, small XP-loss, and durability-loss rules.

### AC-MASTER-029 — Recovery information
After death, the player can determine that a recoverable drop exists and where/how to attempt recovery.

### AC-MASTER-030 — Recovery avoids hard dead-end
The approved recovery rules provide a viable path to attempt retrieval without requiring an impossible dependency on the exact lost inventory.

### AC-MASTER-031 — Repeated death does not silently erase world progress
Multiple deaths do not erase base/discovery/world progress and follow explicit death-drop rules.

## PROGRESSION

### AC-MASTER-032 — Varied activity progression
Progression rewards multiple meaningful approved activities; trivial repetition is not intended to dominate.

### AC-MASTER-033 — Early specialization visible
The Phase 1 path can visibly demonstrate progress toward approximately level 3–4 and at least one profession/specialization path without permanent lock-in.

## SOLO / CO-OP

### AC-MASTER-034 — Same core rules
Solo and hosted co-op use the same core gameplay rules for survival, items, world, building, damage, death, and discovery.

### AC-MASTER-035 — Solo critical path
No Phase 1 critical-path objective requires a second human player or permanently specialized class.

### AC-MASTER-036 — 2–4 player cooperation
The approved hosted path allows 2–4 players to divide useful work without changing the underlying core rules.

### AC-MASTER-037 — Shared discovery
A legitimate co-op discovery is reflected according to the approved shared map/discovery semantics.

### AC-MASTER-038 — Recovery assistance
A second player can materially assist a teammate's death-drop recovery.

### AC-MASTER-039 — Shared mutations readable
Shared build/container/machine/world outcomes do not appear as private contradictory copies from the player perspective.

Exact authority resolution is Technical Design.

### AC-MASTER-040 — Session failure feedback
Disconnect/session failure does not silently present unsaved/unconfirmed actions as safely persisted.

## HUD / READABILITY

### AC-MASTER-041 — Survival/logistics readability
The player can read health, food, water, stamina, temperature, carrying state, and relevant equipment condition without debug tooling.

### AC-MASTER-042 — Interaction readability
The player can identify focused target, available action, and important invalid-action reason.

### AC-MASTER-043 — Death/recovery readability
Death cause/outcome and recovery objective are understandable from normal player-facing presentation.

### AC-MASTER-044 — Base capability readability
The player can tell whether a relevant workstation/machine is usable and why it is unavailable when blocked by an approved gameplay requirement.

## PERSISTENCE / CONTINUATION

### AC-MASTER-045 — Reopen continuity
Reopening the same world preserves the canonical Phase 1 progress defined by subsystem/persistence specs without silent loss.

### AC-MASTER-046 — Drop/discovery consistency after reopen
Persisted death-recovery/discovery state used by the slice remains consistent after an approved save/reopen flow.

## PO-FACING QUALITY

### AC-MASTER-047 — No debug knowledge required
The Project Owner can exercise the approved vertical-slice path without reading source code or using hidden developer controls.

### AC-MASTER-048 — Product-visible progression
The base, frontier/discovery state, risk, and recovery consequences are visible enough to evaluate the game experience rather than only backend correctness.

---

# 36. OPEN QUESTIONS

No blocking open question remains at master-spec level.

The following are deliberately delegated design decisions, not unresolved master ambiguity:

1. Exact Phase 1 resource/item/recipe list → P1-DES-002.
2. Exact survival thresholds/rates and hostile/combat rules → P1-DES-003.
3. Exact placeable costs, connectivity details, first machine function → P1-DES-004.
4. Exact weather event, fog reveal geometry, ruin reward/content → P1-DES-005.
5. Exact XP curve/profession prototype(s) → P1-DES-006.
6. Exact UI composition/visual hierarchy implementation → P1-ART-001 / P1-ART-002.
7. Exact authority/persistence/network implementation → P1-TECH series.

If a follow-up role discovers that one of these choices changes Phase 1 product scope rather than merely defining an in-scope rule, it must return a scope/decision request through Producer.

---

# 37. ASSUMPTIONS

No unapproved product assumption is promoted to confirmed product scope.

The time windows in this document are **pacing targets** derived from the approved 30–60 minute vertical-slice objective and may be tuned through playtest.

The master document intentionally avoids setting final numeric survival, recipe, combat, XP, machine, or world-generation balance because those are owned by the approved subsystem design tasks.

---

# 38. DEFINITION OF DONE SELF-CHECK

- Complete start-to-end session flow documented: PASS
- Landing/onboarding behavior defined: PASS
- 30–60 minute target flow defined: PASS
- Core interaction vocabulary/priority defined: PASS
- Nearby gather/return loop defined: PASS
- Preparation/failure/recovery loop defined: PASS
- Needs/capacity/tools/hazards/distance relationship defined: PASS
- Base progression master contract defined: PASS
- Ruin/discovery beat defined: PASS
- Success/failure/recovery states defined: PASS
- Solo/co-op player-facing semantics defined: PASS
- HUD information requirements defined: PASS
- System dependencies explicit: PASS
- Follow-up subsystem boundaries explicit: PASS
- Exact Phase 1 non-goals explicit: PASS
- PO-facing demo expectations preserved: PASS
- No technical architecture selected: PASS
- No out-of-scope product system invented: PASS
- No placeholder numeric balance promoted to final: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
