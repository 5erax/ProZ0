# P1-DES-003 — Survival, Hazard, Combat, Death, and Recovery Gameplay Specification

**Task:** P1-DES-003 / Issue #33  
**Role:** Game Designer / Systems Designer  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** READY FOR PRODUCER REVIEW  
**Depends on:** P1-DES-001 / #29 — DONE / DESIGN READY  
**Implementation authorization:** NONE

---

# INFORMATION CLASSIFICATION

## CONFIRMED
- Phase 1 requires health, food, water, stamina, temperature exposure, equipment condition where used, and carrying capacity.
- Preparation must materially affect expedition capability.
- Combat supports exploration/survival and is not the primary identity.
- One hostile encounter is required.
- Death respawns the player at base.
- Carried inventory remains at the death site.
- Death causes a small XP loss and small durability loss.
- Failure must be recoverable; world/base/discovery progress is not reset by ordinary death.
- Co-op teammates can assist death-drop recovery.

## CONSTRAINT
- Phase 1 uses the item/capacity/tool semantics defined in P1-DES-002.
- Day/night/weather state comes from P1-DES-005; this spec defines how those conditions affect player survival.
- No downed/revive system, advanced injury model, ranged combat suite, dodge, armor tree, or complex illness system is required.
- Numeric tuning must support a 30–60 minute first-session loop without making the first 10 minutes a survival death race.

## DECISION NEEDED
None blocking.

---

# GAME DESIGN SPEC

## SYSTEM
Survival, Hazard, Combat, Death, and Recovery

## STATUS
READY

## PRODUCT INTENT
Make expedition preparation matter without turning ProZ0 into constant meter maintenance or combat grinding.

The player should understand:
- what is threatening them;
- what preparation could reduce that threat;
- when retreat is sensible;
- what death costs;
- how recovery works.

The survival model exists to create meaningful expedition decisions and recoverable stories.

## PLAYER GOAL
- Maintain enough health/needs/stamina to operate.
- Read environmental danger early enough to respond.
- Prepare for cold, distance, and hostile risk.
- Fight or disengage from the one Phase 1 hostile encounter.
- Recover from death without losing the world.

---

# 1. CORE SURVIVAL STATES

All percentage-style values use 0–100.

## 1.1 Health

Default:
- maxHealth = 100
- new-session health = 100

States:
- 61–100: HEALTHY
- 31–60: INJURED
- 1–30: CRITICAL
- 0: DEAD

Health has no passive wilderness regeneration in Phase 1.

Recovery:
- Field Dressing restores 30 Health on successful use.
- Respawn restores Health to 100.

Health cannot exceed 100.

## 1.2 Water

Default new-session Water:
- 80

Base drain:
- 1.0 point / active gameplay minute

States:
- 50–100: HYDRATED
- 25–49: THIRSTY
- 1–24: DEHYDRATED
- 0: CRITICAL DEHYDRATION

Effects:
- THIRSTY: stamina regeneration -10%.
- DEHYDRATED: stamina regeneration -30%.
- CRITICAL DEHYDRATION: stamina regeneration = 0 and Health loses 1 every 5 seconds.

Clean Water restores:
- +25 Water

Use cannot exceed 100.

Rationale:
Water becomes relevant around the first expedition window without forcing immediate tutorial consumption.

## 1.3 Food

Default new-session Food:
- 70

Base drain:
- 0.6 point / active gameplay minute

States:
- 40–100: FED
- 20–39: HUNGRY
- 1–19: STARVING
- 0: CRITICAL STARVATION

Effects:
- HUNGRY: stamina regeneration -10%.
- STARVING: stamina regeneration -25%.
- CRITICAL STARVATION: stamina regeneration -40% and Health loses 1 every 10 seconds.

Edible Plant restores:
- +20 Food

Use cannot exceed 100.

Rationale:
Food is slower pressure than Water so both needs have distinct roles.

## 1.4 Stamina

Default:
- maxStamina = 100
- new-session Stamina = 100

Stamina represents short-term physical effort, not a long-term hunger meter.

Regeneration:
- begins 1.0 second after the last stamina-spending action;
- base regeneration = 15 / second;
- all percentage penalties from current Water/Food/Temperature/Carry state are additive;
- final regeneration cannot be below 0.

Actions:
- hand gather completion: 2 Stamina
- tool gather completion: 5 Stamina
- unarmed strike: 10 Stamina
- Basic Spear attack: 15 Stamina

If current stamina is below the cost:
- action cannot commit;
- player receives EXHAUSTED feedback.

Basic movement does not spend stamina in Phase 1.

## 1.5 Carry-state survival interaction

P1-DES-002 owns weight thresholds.

This spec consumes them:

### NORMAL
- no stamina modifier.

### HEAVY
- stamina regeneration -20%.

### OVERLOADED
- stamina regeneration -50%.
- movement multiplier is the P1-DES-002 value (0.80).

No additional hidden damage occurs from carrying weight.

---

# 2. TEMPERATURE

## 2.1 Thermal state

Player thermal value:
- 0–100
- 50 = neutral/comfortable

States:
- 35–65: COMFORTABLE
- 20–34: COLD
- 5–19: SEVERE COLD
- 0–4: CRITICAL COLD
- 66–80: HOT
- 81–95: SEVERE HEAT
- 96–100: CRITICAL HEAT

Phase 1 vertical-slice content is expected to exercise the cold side; hot-state rules remain defined for data symmetry but no hot biome is required.

## 2.2 Environmental target model

P1-DES-005 supplies current environment condition.

Default Phase 1 targets:
- clear day target = 50
- clear night target = 35
- cold rain day target = 30
- cold rain night target = 20

Base thermal change:
- 6 points / minute toward current environmental target.

Thermal Wrap:
- while equipped and condition > 0, harmful movement away from COMFORTABLE range occurs at 50% base rate.
- it does not make the player immune.
- it has no passive condition loss during normal wear in Phase 1.

## 2.3 Temperature effects

COLD:
- stamina regeneration -10%.

SEVERE COLD:
- stamina regeneration -40%;
- Health loses 1 every 10 seconds.

CRITICAL COLD:
- stamina regeneration = 0;
- Health loses 1 every 3 seconds.

HOT:
- stamina regeneration -10%.

SEVERE HEAT:
- stamina regeneration -40%;
- Health loses 1 every 10 seconds.

CRITICAL HEAT:
- stamina regeneration = 0;
- Health loses 1 every 3 seconds.

## 2.4 Recovery

When environmental target returns toward safe range, thermal value naturally moves back toward that target.

Returning to the landing module/functional habitat does not magically reset temperature, but Phase 1 base interior/shelter is treated as comfortable environment target 50 when the player is inside an approved sheltered area defined by P1-DES-004.

---

# 3. CONSUMABLE USE

Edible Plant, Clean Water, and Field Dressing use the same deliberate consume flow.

Use time:
- 1.0 second channel.

Rules:
- item is consumed only at completion;
- moving out of the use state/canceling use produces no effect and consumes nothing;
- taking hostile damage cancels the channel;
- cannot consume if effect would produce no meaningful change only for Field Dressing at full Health; Food/Water may still be consumed below 100.

This prevents instant combat-healing spam.

---

# 4. ENVIRONMENTAL HAZARD CONTRACT

The required Phase 1 environmental survival hazard is **cold exposure**, driven by night and the approved Cold Rain weather event.

Player-facing rules:
- warning appears when entering COLD;
- stronger warning at SEVERE COLD;
- player can mitigate by equipping Thermal Wrap, returning to shelter, waiting for conditions to improve, or shortening the expedition;
- no invisible instant lethal transition;
- no hazard requires a specialist profession.

Other future hazards (radiation, oxygen, illness, acid damage systems) are deferred.

---

# 5. PREPARATION CHOICES

At least these choices materially affect expedition capability:

1. **Water supply**
   - more Clean Water extends viable travel time but consumes carry capacity.

2. **Thermal protection**
   - Thermal Wrap halves harmful thermal movement, extending safe exposure in night/rain.

3. **Equipment condition**
   - repaired tool/weapon avoids becoming BROKEN mid-expedition.

4. **Weapon**
   - Basic Spear improves hostile-encounter safety over unarmed strike but consumes weight/volume.

5. **Free capacity**
   - leaving space makes ruin/resource recovery possible and reduces chance of entering HEAVY/OVERLOADED states.

The game does not compute a hidden "readiness score."

Readiness is the direct consequence of state/loadout.

---

# 6. COMBAT VOCABULARY

Phase 1 combat is intentionally minimal.

Player combat actions:
- face/move;
- basic unarmed strike;
- Basic Spear attack when equipped;
- retreat/reposition.

Not included:
- dodge;
- block/parry;
- ranged weapons;
- combo system;
- charged attacks;
- status-effect build system;
- lock-on requirement.

Combat input must be distinct from ordinary world Interact, consistent with P1-DES-001.

---

# 7. PLAYER ATTACK RULES

## 7.1 Unarmed strike

Always available while alive and not in a blocking modal state.

Defaults:
- range = 0.8 player-footprint widths
- frontal arc = 90 degrees
- stamina cost = 10
- damage = 5
- cooldown = 0.80 s

Purpose:
- emergency defense;
- not an efficient primary kill method.

## 7.2 Basic Spear

Requires:
- Basic Spear equipped;
- condition > 0;
- stamina >= 15.

Defaults:
- range = 1.5 player-footprint widths
- frontal arc = 90 degrees
- stamina cost = 15
- damage = 25
- cooldown = 0.65 s

Commit rule:
- if weapon/stamina/cooldown preconditions are valid, pressing Attack commits the attack and immediately spends 15 Stamina and starts cooldown;
- at attack resolution, the nearest valid hostile target inside arc/range takes 25 damage;
- only a successful hit reduces Spear condition by 1;
- a whiff/miss spends Stamina and cooldown but causes no damage and no condition loss;
- one attack does not cleave multiple targets.

This is the complete player-facing rule; Technical Design owns command/tick implementation but may not reinterpret hit/miss resource costs.

For player readability, implementation must avoid a state where the UI shows a confirmed hit but authority reports no valid target without feedback.

---

# 8. PHASE 1 HOSTILE ENCOUNTER

## 8.1 Content identity

Gameplay placeholder:
**Territorial Predator**

This is a functional design label, not final species/lore/art naming.

The Phase 1 world requires one hostile wildlife encounter using this contract.

## 8.2 Hostile states

- IDLE / PATROL
- ALERT
- CHASE
- ATTACK WINDUP
- RECOVERY
- RETURN / DISENGAGE
- DEAD

## 8.3 Detection / aggression

Default tuning:
- aggression radius = 5 player-footprint widths
- damage/attack by player immediately makes the predator hostile
- predator does not spawn inside the initial landing safe/local onboarding space

On valid detection:
- enters ALERT briefly (0.4 s readable cue), then CHASE.

## 8.4 Chase / leash

- home/leash radius = 12 player-footprint widths from encounter anchor.
- predator may chase players inside leash space.
- if target leaves leash and remains outside for 2.0 s, predator disengages and RETURNs.
- once returned to encounter area, it can become hostile again on later entry.

This preserves retreat as a valid response.

## 8.5 Predator combat values

Defaults:
- Health = 75
- attack range = 1.1 footprint widths
- attack windup = 0.55 s
- attack damage = 20
- post-attack recovery/cooldown = 1.20 s

Attack rule:
- damage is applied only if target remains a valid victim at attack resolution.
- player can avoid damage by moving out of valid attack range during the readable windup; no dodge action is required.

## 8.6 Co-op target choice

Predator targets one active player at a time.

Gameplay preference:
- nearest valid threatening player inside encounter/chase space.

It may retarget after attack/recovery or when current target becomes invalid.

Exact deterministic tie-break is Technical Design.

## 8.7 Encounter resolution

Resolution can be:
- player defeats predator;
- player retreats beyond disengage conditions;
- player dies.

The ruin path must not require farming repeated predators.

Defeating the predator does not drop a unique item required for progression.

XP reward, if any, is P1-DES-006.

---

# 9. DAMAGE

## 9.1 Sources

Phase 1 damage sources:
- Territorial Predator attack;
- severe/critical temperature;
- critical dehydration;
- critical starvation.

No fall damage, radiation, poison, bleeding, or PvP damage is required.

## 9.2 Damage result

Damage reduces Health.

At Health > 0:
- player remains alive;
- feedback communicates source/severity.

At Health <= 0:
- Health clamps to 0;
- death transition occurs exactly once.

No incapacitated/downed state in Phase 1.

---

# 10. DEATH

## 10.1 Trigger

Death occurs when authoritative Health reaches 0.

Death transition:
1. player locomotion/actions stop;
2. death cause is recorded for player feedback;
3. condition-bearing equipped items receive death durability penalty;
4. carried/equipped portable inventory is moved into one Death Cache at/near death position;
5. XP penalty is applied;
6. player enters respawn delay;
7. player respawns at current Phase 1 base anchor;
8. death-cache marker becomes available.

The exact technical all-or-nothing implementation belongs to Technical Design.

## 10.2 Death durability penalty

Equipped condition-bearing items lose:
- **10 condition points**

Applied once per death before they enter the Death Cache.

Condition never goes below 0.

At 0:
- item remains BROKEN and recoverable;
- it is not deleted.

Non-equipped condition-bearing items do not take this death penalty in Phase 1.

## 10.3 XP penalty

Death removes:
- **5% of current-level XP progress**

Rules:
- cannot reduce character level;
- cannot remove unlocked profession/skill;
- cannot reduce colony/world research/discovery.

Example:
- current level progress = 400 XP;
- death loss = 20 XP.

Exact XP curve is P1-DES-006.

## 10.4 Carried inventory drop

Death Cache receives:
- player inventory contents;
- equipped portable items.

Persistent discovery knowledge is not inventory and is not dropped.

World/base storage is unaffected.

## 10.5 No world rollback

Death does not reset:
- world generation;
- base;
- containers;
- machine state;
- fog/discovery;
- other players;
- prior legitimate world mutations.

---

# 11. DEATH CACHE

## 11.1 Placement

Primary location:
- death position.

If invalid/unreachable world placement:
- nearest valid reachable location is used.

Gameplay placement search target:
- within 3 player-footprint widths where possible.

Exact search algorithm is Technical Design.

## 11.2 Persistence

Phase 1 Death Cache:
- does not expire by timer;
- persists across chunk unload/reload;
- persists across approved save/reopen;
- is removed only after all contents have been recovered/removed.

## 11.3 Multiple deaths

Each death creates its own Death Cache.

A later death does not delete older non-empty caches.

Each cache has its own map/recovery marker.

## 11.4 Access

- dead player after respawn can open/recover it;
- teammates can open/recover it;
- exact item transfer follows P1-DES-002.

## 11.5 Empty cache

When last item leaves:
- marker clears;
- world cache may be removed.

---

# 12. RESPAWN

Respawn delay:
- 5 seconds

Respawn anchor:
- Phase 1 landing/base respawn point.

Respawn state:
- Health = 100
- Water = 50
- Food = 50
- Stamina = 100
- Temperature = 50

Inventory:
- empty except anything explicitly stored at base remains in base storage.

No new replacement weapon/tool is magically granted.

Recovery remains viable because:
- local hand-gatherable Fiber/Food/Water remain available;
- Stone/Timber placement/content must leave a recoverable path to re-create a basic tool/weapon from local/base resources;
- stored items are unaffected.

P1-DES-005 content placement and P1-DES-002 recipes must preserve this recovery path.

---

# 13. RECOVERY LOOP

Required player-facing flow:

Respawn → review map/cache → resupply/recraft from base/local resources → return to site → handle hazard/hostile state → recover items → return.

## 13.1 Recovery readability

After respawn, player can determine:
- number of active Death Caches;
- approximate/map location of each;
- whether it still contains items;
- which is most recent.

## 13.2 Recovery risk

Death location remains subject to normal world risks.

The game does not:
- teleport items home;
- remove hostiles merely because a death occurred;
- make cache permanently inaccessible.

If the specific environment temporarily makes recovery dangerous (night/rain/hostile), player may wait or prepare.

## 13.3 Co-op assistance

A teammate may:
- travel first;
- secure/avoid the hostile;
- open cache;
- carry/drop/store recovered items;
- escort the respawned player.

There is no separate resurrection mechanic.

---

# 14. DAY / NIGHT / WEATHER SURVIVAL EFFECTS

P1-DES-005 owns timing, fog, visibility and weather event sequencing.

This spec owns player survival response:

### Clear day
- environmental thermal target = 50.

### Clear night
- thermal target = 35.

### Cold Rain during day
- thermal target = 30.

### Cold Rain during night
- thermal target = 20.

Cold Rain does not directly deal arbitrary weather damage.

Damage occurs only if the player's thermal state reaches severe/critical thresholds.

This ensures:
weather → exposure → warning → mitigation/retreat → damage,
rather than weather → unexplained instant HP loss.

---

# 15. MULTIPLAYER BEHAVIOR

## 15.1 Individual needs

Health, Food, Water, Stamina, Temperature are per-player.

No shared hunger/water bar.

## 15.2 Hostile encounter

Predator exists in shared world state.

All players observe the same authoritative alive/dead/hostile outcome.

No per-client duplicate predator.

## 15.3 Damage

Each player's damage/death is individual.

One death does not fail/end the party session.

## 15.4 Death cache

Cache is shared world state and team-accessible.

Two players cannot recover the same item quantity twice.

## 15.5 Party wipe

If all active players die:
- each follows ordinary respawn rule;
- world does not rollback;
- existing Death Caches remain.

## 15.6 Recovery roles

Co-op reduces recovery difficulty through player action, not hidden reduced penalties.

---

# 16. PLAYER FEEDBACK REQUIREMENTS

Always/readably communicate:
- Health state;
- Food state;
- Water state;
- Stamina;
- Temperature state;
- HEAVY/OVERLOADED carry state from P1-DES-002.

Warnings:
- THIRSTY;
- DEHYDRATED;
- HUNGRY;
- STARVING;
- COLD/HOT;
- SEVERE temperature;
- EXHAUSTED;
- weapon/tool BROKEN;
- hostile ALERT/attack telegraph;
- incoming damage source;
- death cause;
- XP loss;
- durability loss;
- death-cache marker/recovery state.

The predator attack windup must be visually readable enough that moving away can be an intentional response.

Exact visual implementation is Art/UI scope.

---

# 17. SYSTEM INTERACTIONS

## P1-DES-002
Consumes:
- Clean Water;
- Edible Plant;
- Field Dressing;
- Thermal Wrap;
- Basic Spear;
- carry states;
- condition;
- Death Cache item transfers.

## P1-DES-005
Consumes:
- day/night condition;
- Cold Rain event;
- hostile encounter placement;
- expedition distance/environment.

## P1-DES-006
Provides:
- death XP-loss rule;
- meaningful hostile/gather actions for XP weighting.

## P1-DES-004
Base/habitat supplies:
- comfortable shelter target 50;
- respawn anchor;
- Workbench repair capability.

---

# 18. EDGE CASES

1. Water/Food reaches 0 while consuming item: completed use applies recovery; damage ticks stop according to resulting state.
2. Multiple stamina penalties: additive; regen floors at 0.
3. Stamina 0: player can still walk/retreat/interact with non-stamina actions.
4. Thermal Wrap becomes BROKEN: its protection stops once condition = 0.
5. Player starts attack then target leaves range: no damage; technical commitment semantics must match readable result.
6. Player dies during consume channel: item is not consumed unless use completed first.
7. Player dies while container UI open: death processing occurs once; UI cannot preserve a private stale inventory.
8. Player dies during hostile attack resolution: death happens once even if multiple sources arrive same tick.
9. Death at invalid terrain: cache relocates to nearest valid reachable point.
10. Empty inventory death: Death Cache may be omitted if no portable items exist, but death marker/feedback still communicates location/cause as needed.
11. Multiple Death Caches: all non-empty caches remain separately recoverable.
12. Teammate empties cache before owner arrives: owner receives readable update rather than seeing phantom contents.
13. Player dies recovering older cache: recovered items currently carried move into new Death Cache; older remaining items stay in older cache.
14. Hostile killed then player dies: predator remains dead according to world persistence rules; death does not respawn it automatically.
15. Hostile disengaged: returns to encounter area and can later re-engage.
16. Session save with active Death Cache: cache persists.
17. Reopen during weather/night: canonical environment resumes according to P1-DES-005/Technical persistence, not silently reset merely to aid recovery.
18. No stored recovery gear: local content must still allow hand-gather → basic tool/spear path.
19. Discovery already recorded before death: knowledge persists regardless of physical Ancient Alloy Shard drop.
20. All players dead: no party game-over/world rollback.

---

# 19. BALANCE / TUNING VARIABLES

Survival:
- maxHealth = 100
- initialWater = 80
- waterDrain = 1.0/min
- water thresholds = 50/25/0
- waterRestore = 25
- initialFood = 70
- foodDrain = 0.6/min
- food thresholds = 40/20/0
- foodRestore = 20
- maxStamina = 100
- staminaRegen = 15/s
- staminaRegenDelay = 1.0 s
- stamina action costs
- FieldDressingHeal = 30
- consumeChannel = 1.0 s

Temperature:
- initialThermal = 50
- comfortable range = 35–65
- cold/severe/critical thresholds
- environment thermal targets
- thermalMoveRate = 6/min
- ThermalWrap harmful-rate multiplier = 0.5
- temperature damage rates

Combat:
- unarmed range/damage/cost/cooldown
- spear range/damage/cost/cooldown
- predator health = 75
- aggro radius = 5 widths
- leash radius = 12 widths
- alert = 0.4 s
- windup = 0.55 s
- damage = 20
- recovery = 1.20 s

Death:
- respawnDelay = 5 s
- deathDurabilityLoss = 10 condition points
- deathXpLoss = 5% current-level progress
- cachePlacementSearch = 3 widths
- respawn Food/Water = 50/50

All remain Phase 1 playtest-tunable while preserving the documented state semantics.

---

# 20. PHASE 1 SCOPE

Included:
- health/food/water/stamina;
- cold-focused temperature exposure;
- consumable recovery;
- carry-state stamina interaction;
- one Thermal Wrap preparation item;
- one basic melee weapon;
- one unarmed emergency attack;
- one Territorial Predator encounter;
- readable attack windup/retreat;
- damage/death;
- respawn;
- death cache;
- small XP/durability loss;
- solo/co-op recovery.

# 21. DEFERRED

- injuries/bleeding;
- illness;
- oxygen;
- radiation;
- acid-specific body status;
- armor tiers;
- ranged weapons;
- ammo;
- dodge/block/parry;
- downed/revive;
- stealth system;
- boss fights;
- complex AI packs/nests;
- PvP;
- permanent death;
- corpse timers;
- insurance;
- multiple spawn facilities;
- full biome temperature catalog.

# 22. NON-GOALS

- world/fog/weather timing rules;
- inventory transaction implementation;
- XP curve/profession design;
- building/power architecture;
- networking/persistence architecture;
- final animation/audio/VFX.

---

# 23. ACCEPTANCE CRITERIA

### AC-SURV-001 Health
Health follows 0–100 states and death triggers exactly at 0.

### AC-SURV-002 Water
Water drains at configured rate, enters defined states, applies documented stamina/health consequences, and Clean Water restores 25.

### AC-SURV-003 Food
Food drains at configured rate, enters defined states, applies documented consequences, and Edible Plant restores 20.

### AC-SURV-004 Stamina
Stamina costs/regen follow defined values and insufficient stamina prevents stamina-gated action without preventing ordinary walking.

### AC-SURV-005 Carry interaction
HEAVY/OVERLOADED states produce exact documented stamina/movement consequences.

### AC-TEMP-001 Environment response
Player thermal value moves toward the current approved environment target at configured rate.

### AC-TEMP-002 Thermal Wrap
Equipped functional Thermal Wrap halves harmful thermal movement.

### AC-TEMP-003 Temperature warning before lethal
Cold/severe/critical feedback occurs before/with the documented damage states; no instant unexplained weather damage.

### AC-CONS-001 Consume channel
Canceled/damaged consume does not consume item or apply result; successful completion does.

### AC-PREP-001 Observable preparation
Water supply, Thermal Wrap, equipment condition, weapon choice and free capacity each have observable expedition consequences.

### AC-COMB-001 Combat vocabulary
Phase 1 supports only unarmed strike, Basic Spear attack, movement/reposition/retreat as defined; no downstream engineer must invent block/dodge/ranged rules.

### AC-COMB-002 Spear attack
Valid Spear attack uses documented range/arc/stamina/damage/cooldown and single-target rule.

### AC-COMB-003 Predator readability
Predator transitions ALERT before CHASE/attack and attack has 0.55 s readable windup.

### AC-COMB-004 Retreat
Leaving leash conditions permits predator disengage/return rather than forcing a kill.

### AC-COMB-005 Predator resolution
Predator death/retreat/player death are valid encounter outcomes; no unique mandatory progression loot is required.

### AC-DMG-001 Damage sources
Only approved Phase 1 sources reduce Health under this spec.

### AC-DEATH-001 Single death transition
Health reaching 0 triggers one death transition.

### AC-DEATH-002 Inventory drop
All carried/equipped portable inventory transfers to one Death Cache once.

### AC-DEATH-003 Durability loss
Equipped condition-bearing items lose exactly 10 condition once per death and are never deleted by the penalty.

### AC-DEATH-004 XP loss
Death removes 5% current-level XP progress without reducing level/unlocks/world research.

### AC-DEATH-005 Respawn
After 5 s player respawns at base with 100 Health, 50 Water, 50 Food, 100 Stamina, thermal 50.

### AC-REC-001 Cache persistence
Non-empty Death Cache has no Phase 1 timer and survives chunk unload/save-reopen.

### AC-REC-002 Multiple caches
Later deaths do not silently delete older non-empty caches.

### AC-REC-003 Co-op recovery
Teammates can transfer Death Cache items under P1-DES-002 rules.

### AC-REC-004 No world rollback
Death/party wipe does not reset base/discovery/world progress.

### AC-REC-005 Recovery viability
After losing all carried gear, approved local/base resources still permit a viable attempt to recreate basic recovery capability.

### AC-NIGHT-001 Condition coupling
Day/night/Cold Rain conditions supplied by P1-DES-005 map to exact thermal targets defined here.

### AC-HUD-001 Cause readability
Player can identify relevant survival warning, damage source, death cause and recovery objective without debug tooling.

### AC-SCOPE-001 Minimal combat
No dodge/block/ranged/downed/advanced-injury system is required by this spec.

---

# 24. OPEN QUESTIONS

None blocking.

P1-DES-005 owns exact day/night/weather timing and encounter placement.
P1-DES-006 owns total XP curve/reward values except the death-loss formula.
P1-DES-004 owns shelter footprint/inside-state gameplay and active base anchor details.

# 25. ASSUMPTIONS

The numeric rates are explicit Phase 1 tuning defaults chosen so:
- needs become relevant during expedition timing rather than immediately;
- preparation provides measurable margin;
- a player can survive several predator mistakes but cannot ignore attacks;
- death penalty is noticeable but recoverable.

They remain playtest-tunable, not immutable Product Owner requirements.

---

# 26. DEFINITION OF DONE SELF-CHECK

- Each need purpose/state/threshold/recovery defined: PASS
- Update/decay/recovery defined: PASS
- Preparation consequences defined: PASS
- Environmental hazard interaction defined: PASS
- Hostile/combat vocabulary complete: PASS
- Damage/death trigger defined: PASS
- Respawn defined: PASS
- Inventory death drop defined: PASS
- XP/durability loss defined: PASS
- Recovery/co-op defined: PASS
- Day/night survival relation defined: PASS
- Failure/recovery edge cases defined: PASS
- Balance values rationalized/tunable: PASS
- Technical Design can proceed without gameplay invention: PASS
- QA can derive PASS/FAIL tests: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
