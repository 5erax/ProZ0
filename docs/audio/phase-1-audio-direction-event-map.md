# P1-AUD-001 — Phase 1 Audio Direction and Event Map

**Task:** P1-AUD-001  
**Source Issue:** #79  
**Role:** Audio Designer / Composer  
**Member:** B-AUD-01  
**Home Company:** COMPANY_B  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** COMPLETE — AUDIO HANDOFF READY  
**Artifact Path:** docs/audio/phase-1-audio-direction-event-map.md

---

## 1. Purpose and authority boundary

This artifact defines the Phase 1 sonic identity, semantic audio event map, cue readability hierarchy, looping/repetition intent, music philosophy, and integration-facing audio metadata for already-approved gameplay, world, UI, progression, co-op, and narrative states.

Audio owns:
- sonic identity;
- cue semantics;
- layering and masking intent;
- looping and repetition-control intent;
- relative loudness/readability priorities;
- semantic event naming;
- audio integration metadata.

Audio does not own and does not change:
- gameplay timing, balance, rules, or state transitions;
- narrative canon;
- product scope;
- runtime architecture;
- middleware;
- loader or codec policy;
- source-code integration;
- persistence/network implementation;
- visual/UI implementation.

This task produces documentation only. No audio asset production and no runtime integration are authorized here.

---

## 2. Authoritative sources

This map is grounded in the current approved Phase 1 sources:

- Issue #79 / P1-AUD-001.
- docs/phase-1-vertical-slice-plan.md.
- docs/design/phase-1-vertical-slice-master-gameplay.md — P1-DES-001 / #29.
- docs/design/phase-1-inventory-gathering-crafting-repair.md — P1-DES-002 / #32.
- docs/design/phase-1-survival-combat-death-recovery.md — P1-DES-003 / #33.
- docs/design/phase-1-habitat-building-power-machine.md — P1-DES-004 / #34.
- docs/design/phase-1-exploration-fog-weather-ruin.md — P1-DES-005 / #35.
- docs/design/phase-1-early-progression-profession.md — P1-DES-006 / #36.
- docs/art/phase-1-asset-ui-production-spec.md — P1-ART-002 / #37.
- docs/narrative/phase-1-ruin-mystery-hook.md — P1-NARR-001 / #65.
- docs/team/roles/audio-designer-composer.md.
- docs/team/SOURCE_OF_TRUTH.md and current shared operating protocols.

Source precedence remains governed by docs/team/SOURCE_OF_TRUTH.md. If a later approved source changes an authoritative gameplay state, this event map must be revised rather than silently redefining the state through audio.

---

## 3. Information classification

### CONFIRMED

- Phase 1 audio must support the approved 30–60 minute landing-to-expedition vertical slice.
- Critical hostile, survival, invalid-action, and recovery information must remain readable over ambience and music.
- Predator ALERT, CHASE, ATTACK WINDUP, ATTACK RELEASE, and RECOVERY must sound semantically distinct.
- The Predator ATTACK WINDUP remains the approved 0.55 s gameplay state. Audio may fit a telegraph to it but cannot extend or redefine it.
- Cold Rain provides a 60 s forecast/warning before the approved active event; active Cold Rain changes temperature exposure and readability but does not directly damage Health.
- Ruin audio must preserve the approved prior-civilization mystery and must not identify the builders, purpose, language, faction, or supernatural/decoded technology.
- Compact Power Unit and Atmospheric Water Condenser audio must reflect only approved machine states.
- UI/progression/co-op audio must not imply a reward, state change, ownership result, or personal XP result that authority did not confirm.
- Phase 1 music tone is hopeful, lonely, curious, and occasionally tense.
- Silence and restraint are valid and often preferred Phase 1 music states.

### CONSTRAINT

- No dodge, block, parry, stealth meter, threat meter, ranged-combat layer, direct-weather-damage cue, fuel system, hidden machine wear, new quest, new canon, or new gameplay state may be invented.
- No runtime bus graph, middleware object model, emitter implementation, codec, streaming policy, or audio engine architecture is specified.
- Semantic spatiality and priority labels in this document describe player-facing intent only.
- Actual audio files are produced only by a separately activated asset-production task.

### OPEN QUESTION

None blocking P1-AUD-001.

Asset-specific waveform choices, exact sample lengths outside gameplay-bounded telegraphs, final mastering values, and runtime implementation details belong to later authorized production/integration work.

### DECISION NEEDED

None.

---

## 4. Sonic identity

### 4.1 Human foothold

Human-built systems should feel practical, legible, and materially grounded.

Direction:
- compact mechanical transients;
- restrained electrical/mechanical hum where an approved active state exists;
- clear state-change signatures;
- warmer and more stable than wilderness beds;
- never futuristic to the point of implying unapproved high technology.

The landing site should gradually sound more inhabited as approved structures exist, without inventing colony population, NPC activity, automation, or machinery not present in Phase 1.

### 4.2 Wilderness

The planet should feel inhabited but not sonically crowded.

Direction:
- broad environmental air;
- sparse organic details;
- passive wildlife as intermittent world presence rather than constant chatter;
- enough negative space that distance, weather, hostile telegraphs, and discovery cues remain legible.

### 4.3 Night

Night should feel quieter, more exposed, and less certain rather than automatically more dangerous.

Direction:
- lower density;
- darker spectral balance;
- more space between wildlife details;
- preserve critical interaction and hostile readability.

Night audio must not imply mandatory raids or stronger enemy stats.

### 4.4 Cold Rain

Cold Rain should sound materially colder, denser, and more enclosing than clear conditions while preserving gameplay clarity.

Direction:
- layered rain texture;
- environmental wetness/wind character;
- strong contrast between forecast and active state;
- audible shelter contrast when the player enters Habitat.

Cold Rain audio must not imply acid, poison, radiation, or direct HP damage.

### 4.5 Prior-civilization ruin

The ruin should feel engineered, old, absent, and unresolved.

Direction:
- sparse material resonance;
- restrained non-human-feeling texture without encoded language;
- no obvious faction anthem;
- no magical sparkle language;
- no horror scream/haunting certainty;
- no active-machine implication unless an approved state later exists.

The sonic proposition is: someone built here before us, and they are not here to explain it.

---

## 5. Readability and relative mix hierarchy

These are semantic priorities, not runtime bus instructions.

### CRITICAL

Must remain immediately readable through active ambience/music:
- predator_attack_windup;
- predator_attack_release;
- severe survival warnings;
- player_hurt when damage is taken;
- ui_action_invalid when an attempted committed action fails for an important reason.

Intent:
- ambience and music yield momentarily;
- critical cue identity takes precedence over decorative detail.

### HIGH

Must remain clearly legible without dominating every moment:
- weather_cold_rain_warning;
- predator_alert;
- player_death;
- player_respawn;
- ruin_discovered_shared;
- build/machine state-change failures;
- death-cache creation/recovery state changes;
- level_up and profession unlock.

### STANDARD

Routine action feedback:
- gather/pickup/drop/transfer;
- craft/repair;
- build success;
- machine collection;
- ordinary XP gain.

### BED

Continuous or low-priority sonic context:
- world ambience;
- passive wildlife;
- machine loops;
- music.

BED material must not mask CRITICAL or HIGH cues.

---

## 6. Spatiality labels

These labels are integration intent only.

- WORLD_3D — originates from an approved world entity/location.
- AREA_AMBIENCE — broad environmental field tied to approved world/environment state.
- PLAYER_LOCAL — centered on the local player/body state.
- UI_LOCAL — non-spatial local UI feedback.
- TEAM_SHARED — non-spatial shared team notification for an approved shared event.
- MUSIC — non-spatial score layer.

A semantic event may combine a world-local source with a UI-local confirmation when the approved state requires both. Later implementation chooses the technical method.

---

## 7. Looping, variation, and repetition standards

### Continuous beds

For ambience and machine states:
- avoid short obvious looping periods;
- use seamless or naturally masked loop boundaries;
- preserve stable identity while allowing slow internal variation;
- do not create rhythmic pulses that can be mistaken for gameplay timers unless the game has an approved timer.

### Frequent one-shots

For gather, pickup, transfer, craft, repair, and UI confirmations:
- use multiple tonal/transient variations where repetition frequency is high;
- randomization must preserve semantic recognition;
- pitch/timing variation must not make success sound like failure or stale rejection.

### Critical hostile telegraphs

For predator ALERT and ATTACK WINDUP:
- recognizability is more important than variation;
- variation may alter texture, not semantic onset or perceived timing;
- no alternate may become quieter/softer enough to lose warning function.

### Progression cues

XP and routine progression should be short and lightweight.
Level-up and profession unlock may be broader, but must not be confused with ruin discovery, personal reward from shared events, or mandatory cinematic completion.

---

## 8. Semantic event naming and integration metadata

Stable semantic IDs use lower_snake_case.

The semantic ID is the canonical audio-facing name in this document. Future asset production may use the ID as a filename stem with variation suffixes, but this does not prescribe runtime loading.

Each event record includes:
- PLAYER PURPOSE;
- AUDIO INTENT;
- STATE SOURCE;
- TRIGGER SEMANTICS;
- LOOP;
- PRIORITY;
- SPATIALITY;
- LAYERING / TRANSITION;
- VARIATION / REPETITION;
- MUST NOT;
- INTEGRATION METADATA.

Integration metadata uses only semantic binding terms:
- ONE_SHOT — authoritative transition/result produces one cue.
- STATE_LOOP — cue exists while approved state remains true.
- CHANNEL_STATE — sound follows a bounded approved channel/action and stops on cancel/complete.
- STINGER — short non-looping musical or discovery accent.
- SCOPE — LOCAL_PLAYER, WORLD_ENTITY, WORLD_AREA, TEAM, or WORLD_STATE.

No technical event dispatcher, API, data schema, middleware object, or code path is defined here.

---

# 9. Event map — ambience, weather, wildlife

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| amb_exploration_day | Orient in clear daytime wilderness | Open, sparse planetary bed with room for interaction detail | DES-001; DES-005 clear day | Active while player is outdoors in clear daytime world state | YES | BED | AREA_AMBIENCE | Base wilderness layer; yields to hostile/survival/UI critical cues | Slow internal variation; no obvious short cycle | Do not imply hidden threat or biome not approved | STATE_LOOP; SCOPE WORLD_AREA |
| amb_exploration_night | Read night as lower-certainty environment | Sparser, darker version of wilderness identity | DES-005 night; DES-003 clear-night thermal state | Active outdoors during approved night state | YES | BED | AREA_AMBIENCE | Crossfade from day intent; retain warning clarity | Lower event density than day | Do not imply raid, stat multiplier, or supernatural threat | STATE_LOOP; SCOPE WORLD_AREA |
| amb_landing_module | Recognize initial human foothold | Low stable human-made mechanical presence | DES-001 landing; DES-004 Landing Module | Player is within audible vicinity of Landing Module | YES | BED | WORLD_3D | Can coexist with wilderness; warmer/stabler than world bed | Slow micro-variation only | Do not imply storage, power generation, or workstation functions Landing Module does not have | STATE_LOOP; SCOPE WORLD_ENTITY |
| amb_habitat_interior | Hear transition into shelter | Reduced weather/wilderness exterior, subtle enclosed human-space tone | DES-004 Habitat shelter; DES-003 target 50 | Player crosses into valid Habitat interior | YES | BED | AREA_AMBIENCE | Enter transition attenuates exterior bed; exit restores exterior state | Stable; minimal repetition signature | Do not imply healing, oxygen, pressure, NPCs, or extra room systems | STATE_LOOP; SCOPE LOCAL_PLAYER |
| weather_cold_rain_warning | Give 60 s preparation warning | Distinct forecast motif plus approaching weather texture, readable but not alarmist | DES-005 Cold Rain warning 60 s | Canonical Cold Rain state enters forecast/warning | CONDITIONAL | HIGH | UI_LOCAL plus AREA_AMBIENCE | May layer distant rain/wind under brief warning signature; no critical-cue masking | Warning signature consistent; ambience evolves gradually | Do not imply direct HP damage, acid/radiation, or forced retreat | ONE_SHOT plus transitional STATE_LOOP; SCOPE WORLD_STATE |
| weather_cold_rain_active | Make active event materially obvious | Dense cold rain field with readable shelter contrast | DES-005 active Cold Rain; DES-003 thermal targets | Canonical weather state becomes active and remains active | YES | BED | AREA_AMBIENCE | Replaces/overlays clear wilderness bed; ducks under critical hostile/survival cues | Long evolving rain; avoid obvious pulse | Do not imply direct Health damage or power/machine malfunction | STATE_LOOP; SCOPE WORLD_AREA |
| wildlife_passive_presence | Communicate inhabited world without threat | Sparse neutral organic calls/movement details | DES-005 passive wildlife; ART-002 readability | Passive wildlife is present and active nearby | CONDITIONAL | BED | WORLD_3D | Lives inside world bed, never dominates predator telegraphs | High variation, low recurrence | Do not reuse predator language or imply hostility | ONE_SHOT/STATE-dependent details; SCOPE WORLD_ENTITY |

---

# 10. Event map — gathering, inventory, container, and generic UI feedback

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| gather_hand_channel | Confirm active hand gather | Short tactile working texture aligned to approved 0.60 s channel | DES-002 gather channel | Hand gather channel starts; stop on cancel or completion | NO | STANDARD | WORLD_3D | Stops cleanly on cancel/complete | Several material-appropriate variations | Do not extend channel or imply result before completion | CHANNEL_STATE; SCOPE WORLD_ENTITY |
| gather_tool_channel | Confirm active hard-resource gather | Stronger tool/material working texture aligned to approved 1.00 s channel | DES-002 gather channel | Tool gather channel starts; stop on cancel or completion | NO | STANDARD | WORLD_3D | Must leave room for success/failure result | Vary by material family while retaining tool identity | Do not alter 1.00 s gameplay channel or imply yield early | CHANNEL_STATE; SCOPE WORLD_ENTITY |
| gather_success | Confirm committed fixed yield | Crisp material acquisition confirmation | DES-002 successful gather | Authoritative gather completes and approved yield is created | NO | STANDARD | WORLD_3D plus optional UI_LOCAL accent | Follows channel completion | Variation by resource class | Do not play on cancel, capacity failure, or stale result | ONE_SHOT; SCOPE LOCAL_PLAYER/WORLD_ENTITY |
| gather_cancel | Make cancellation readable without sounding like failure penalty | Soft stop/release with no reward accent | DES-002 canceled channel | Active gather channel cancels before commit | NO | LOW | WORLD_3D | Terminates channel sound | Minimal | Do not imply node depletion, tool wear, or item gain | ONE_SHOT; SCOPE LOCAL_PLAYER |
| resource_depleted | Explain unavailable depleted node | Dry exhausted material state cue | DES-002 depleted node | Interaction reads node as depleted or final committed gather depletes it | NO | STANDARD | WORLD_3D | Can follow final gather success with restrained secondary cue | Low repetition | Do not imply permanent destruction when node can regenerate | ONE_SHOT; SCOPE WORLD_ENTITY |
| pickup_success | Confirm world item entered inventory | Lightweight acquisition tick grounded to item category | DES-002 pickup | Full world stack pickup commits | NO | STANDARD | PLAYER_LOCAL | Routine feedback below XP/progression | High variation for repeated pickups | Do not play on partial/failed pickup or already-taken result | ONE_SHOT; SCOPE LOCAL_PLAYER |
| drop_success | Confirm exact quantity left inventory and became world drop | Short release/place cue | DES-002 drop | Drop commits and valid world drop exists | NO | STANDARD | WORLD_3D | Spatial source near created drop | Moderate variation | Do not imply item deletion | ONE_SHOT; SCOPE WORLD_ENTITY |
| transfer_success | Confirm exact player/container transfer | Compact inventory movement cue | DES-002 transfer | Authoritative requested transfer commits | NO | STANDARD | UI_LOCAL | May pair with source/destination UI motion | High variation but stable direction-neutral identity | Do not imply arbitrary partial transfer | ONE_SHOT; SCOPE LOCAL_PLAYER |
| container_open | Confirm access to shared Storage/Death Cache surface | Soft mechanical/access signature | DES-002 containers; DES-003 Death Cache | Valid container interaction opens | NO | STANDARD | WORLD_3D plus UI_LOCAL | Brief, not a persistent loop | Small category variants | Do not imply private ownership or contents reward | ONE_SHOT; SCOPE LOCAL_PLAYER/WORLD_ENTITY |
| container_close | Close interaction cleanly | Quiet closure signature | DES-002 containers | Container UI closes normally | NO | LOW | UI_LOCAL | No extra success connotation | Minimal | Do not imply transfer occurred | ONE_SHOT; SCOPE LOCAL_PLAYER |
| ui_action_positive | Generic confirmed UI/world action result when no domain cue is stronger | Neutral concise success tick | DES-001 interaction contract; ART-002 UI | Authoritative valid action succeeds and no dedicated cue supersedes it | NO | STANDARD | UI_LOCAL | Never stack redundantly with stronger dedicated success cue | 2–4 restrained variants | Do not sound like XP, level-up, or discovery | ONE_SHOT; SCOPE LOCAL_PLAYER |
| ui_action_invalid | Explain attempted action cannot proceed | Clear negative response, informative rather than punitive | DES-001 invalid reasons; DES-002/004 failures; ART-002 | Current authoritative attempt fails for a valid reason | NO | CRITICAL when action commitment matters, otherwise HIGH | UI_LOCAL | Momentarily takes precedence over routine bed | Stable recognition with limited variation | Do not imply success, item loss, damage, or punishment | ONE_SHOT; SCOPE LOCAL_PLAYER |
| ui_action_stale | Distinguish stale/world-changed result from generic invalid | Short interrupted/rejected signature | DES-002 co-op contention; DES-004 WORLD STATE CHANGED | Authority rejects because source/world changed since presented state | NO | HIGH | UI_LOCAL | Distinct from capacity/permission invalid | Very limited variation | Do not imply other player stole ownership beyond actual state | ONE_SHOT; SCOPE LOCAL_PLAYER |
| item_broken | Tell player condition-bearing item reached unusable state | Dry mechanical/material failure cue without destruction finality | DES-002 BROKEN state | Item condition becomes 0 or use checks BROKEN | NO | HIGH | PLAYER_LOCAL | May follow last valid use/hit/gather; should not mask hostile warning | Small category variants | Do not imply item deletion; BROKEN remains repairable | ONE_SHOT; SCOPE LOCAL_PLAYER |

---

# 11. Event map — crafting, repair, building, Workbench

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| workbench_open | Recognize functional Tier 1 craft/repair station | Practical bench access/mechanical setup cue | DES-004 Workbench | Valid Workbench interaction opens | NO | STANDARD | WORLD_3D plus UI_LOCAL | Brief; no powered-machine hum | Small variation | Do not imply power requirement or ingredient storage | ONE_SHOT; SCOPE LOCAL_PLAYER/WORLD_ENTITY |
| craft_success | Confirm authoritative recipe commit | Compact assembly/completion signature | DES-002 crafting | Valid craft commits output and inputs | NO | STANDARD | UI_LOCAL | Can vary handcraft vs Workbench texture | Variants by craft context, not every recipe required | Do not play before output commit or imply XP when none awarded | ONE_SHOT; SCOPE LOCAL_PLAYER |
| craft_invalid | Explain craft cannot commit | Domain-specific invalid tick layered with reason UI | DES-002 craft failures | Craft attempt fails current authoritative precondition | NO | HIGH | UI_LOCAL | Uses invalid family; avoid reward tail | Stable | Do not consume-sounding cue or false output confirmation | ONE_SHOT; SCOPE LOCAL_PLAYER |
| repair_success | Confirm condition increase occurred | Tight restorative mechanical/material cue | DES-002 repair | Valid repair increases condition and consumes Repair Patch | NO | STANDARD | UI_LOCAL | Can be slightly warmer than craft | Low variation | Do not imply full repair if capped below 100 from one patch | ONE_SHOT; SCOPE LOCAL_PLAYER |
| repair_invalid | Explain repair cannot occur | Restrained invalid cue | DES-002 repair failures | Repair attempt fails or would be no-op | NO | HIGH | UI_LOCAL | Shares invalid grammar | Stable | Do not imply patch consumption | ONE_SHOT; SCOPE LOCAL_PLAYER |
| build_place_success | Confirm Kit consumed and structure created | Solid placement/assembly impact with human-tech identity | DES-004 build confirm | Authoritative valid placement creates one structure | NO | HIGH | WORLD_3D | World-local with optional UI confirmation | Structure-family variants | Do not imply construction timer, NPC builder, or extra system | ONE_SHOT; SCOPE WORLD_ENTITY |
| build_place_invalid | Tell player placement was rejected | Clear preview/commit rejection signature | DES-004 invalid placement reasons | Confirm attempted while placement invalid or authority rejects | NO | HIGH | UI_LOCAL | Must not resemble valid placement impact | Stable; optional subtle category variation | Do not consume Kit or imply structure creation | ONE_SHOT; SCOPE LOCAL_PLAYER |
| dismantle_success | Confirm structure removed and matching Kit returned | Reversible disassembly/recovery signature | DES-004 dismantle | Valid dismantle commits and Kit is returned | NO | STANDARD | WORLD_3D plus UI_LOCAL | Distinct from destruction/explosion | Structure-family variants | Do not imply salvage loss; Phase 1 returns one matching Kit | ONE_SHOT; SCOPE WORLD_ENTITY |
| dismantle_invalid | Explain protected dismantle precondition failed | Restrained blocked-action cue | DES-004 dismantle failures | Dismantle attempt fails current precondition | NO | HIGH | UI_LOCAL | Uses invalid grammar | Stable | Do not imply contents ejected, Kit created, or damage | ONE_SHOT; SCOPE LOCAL_PLAYER |

---

# 12. Event map — base, power, Habitat, Atmospheric Water Condenser

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| power_unit_active | Hear Compact Power Unit as stable infrastructure | Restrained self-contained power hum | DES-004 Compact Power Unit always ON | Valid placed Power Unit exists in audible range | YES | BED | WORLD_3D | Low enough to preserve Condenser and warnings | Slow micro-variation | Do not imply fuel use, toggle state, solar/day cycle, or overload event not approved | STATE_LOOP; SCOPE WORLD_ENTITY |
| habitat_shelter_enter | Read move from exposed exterior to valid shelter | Brief enclosed transition and exterior attenuation | DES-004 shelter; DES-003 target 50 | Local player enters valid Habitat interior | NO | STANDARD | PLAYER_LOCAL | Transitions amb_habitat_interior and reduces weather bed | Stable | Do not imply instant healing/food/water restore | ONE_SHOT; SCOPE LOCAL_PLAYER |
| habitat_shelter_exit | Read return to current exterior environment | Brief opening transition restoring outdoor state | DES-004 shelter | Local player exits valid Habitat interior | NO | LOW | PLAYER_LOCAL | Restore current day/night/weather bed | Stable | Do not create hazard state not already active | ONE_SHOT; SCOPE LOCAL_PLAYER |
| condenser_disabled | Understand machine intentionally off | Quiet shutdown/state-off cue | DES-004 Condenser DISABLED | Enabled state becomes false | NO | STANDARD | WORLD_3D | Stops condenser_running | Stable | Do not imply broken machine or power failure | ONE_SHOT; SCOPE WORLD_ENTITY |
| condenser_unpowered | Understand enabled machine lacks eligible power | Failed-start / power-loss signature without damage | DES-004 UNPOWERED | Enabled Condenser cannot enter/remain RUNNING due to power | NO | HIGH | WORLD_3D plus optional UI_LOCAL | Stops running loop; preserve partial-progress semantics | Stable | Do not imply fuel empty, damage, lost progress, or weather-caused failure | ONE_SHOT; SCOPE WORLD_ENTITY |
| condenser_running | Hear approved active production | Soft periodic mechanical-air/water process texture without countdown rhythm | DES-004 RUNNING | Enabled, powered, output not full; production advances | YES | BED | WORLD_3D | Coexists with Power Unit; lower than critical cues | Long loop, avoid 90 s timer implication | Do not imply extra input, wear, or exact completion countdown | STATE_LOOP; SCOPE WORLD_ENTITY |
| condenser_output_full | Tell player production paused because buffer reached 4 | Clear full/ready state transition | DES-004 OUTPUT FULL | Output reaches 4 Clean Water | NO | HIGH | WORLD_3D plus UI_LOCAL if panel open | Stops running loop; Power demand becomes 0 by gameplay source | Stable | Do not imply fault, overflow, item loss, or maintenance | ONE_SHOT; SCOPE WORLD_ENTITY |
| condenser_water_collected | Confirm produced water transferred | Clean contained liquid collection + inventory confirmation | DES-004 machine output; DES-006 first machine-use progression | Authoritative produced-water transfer to player commits | NO | STANDARD | WORLD_3D plus UI_LOCAL | If output leaves full state and machine can run, running loop may resume | Moderate variation | Do not always imply XP; XP only when progression source confirms it | ONE_SHOT; SCOPE LOCAL_PLAYER/WORLD_ENTITY |

---

# 13. Event map — survival, damage, death, respawn, recovery

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| survival_thirsty | Notice Water crossed into THIRSTY | Light physiological/UI warning | DES-003 Water 25–49 | Local player enters THIRSTY from safer state | NO | HIGH | PLAYER_LOCAL/UI_LOCAL | Brief; should not repeat every tick | Stable, cooldown by state transition only | Do not imply Health damage; THIRSTY affects stamina regen | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_dehydrated | Notice stronger Water danger | More urgent dry/physiological warning | DES-003 Water 1–24 | Local player enters DEHYDRATED | NO | CRITICAL | PLAYER_LOCAL/UI_LOCAL | Takes precedence over beds | Stable | Do not imply critical-dehydration HP tick until Water reaches 0 | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_hungry | Notice Food crossed into HUNGRY | Light low-energy warning distinct from thirst | DES-003 Food 20–39 | Local player enters HUNGRY | NO | HIGH | PLAYER_LOCAL/UI_LOCAL | Brief state-entry cue | Stable | Do not imply Health damage | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_starving | Notice stronger Food danger | More urgent low-energy warning | DES-003 Food 1–19 | Local player enters STARVING | NO | CRITICAL | PLAYER_LOCAL/UI_LOCAL | Takes precedence over beds | Stable | Do not imply critical-starvation damage until Food reaches 0 | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_cold | Notice thermal state entered COLD | Breath/body chill + restrained UI warning | DES-003 thermal COLD | Local player enters COLD | NO | HIGH | PLAYER_LOCAL/UI_LOCAL | Coexists with weather; should remain distinct from rain itself | Stable | Do not imply direct weather damage | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_severe_cold | Warn that temperature now causes approved Health loss | Strong cold distress signature | DES-003 SEVERE COLD | Local player enters SEVERE COLD | NO | CRITICAL | PLAYER_LOCAL/UI_LOCAL | Ducks beds/music briefly | Stable | Do not imply instant death or a new frostbite system | ONE_SHOT; SCOPE LOCAL_PLAYER |
| survival_exhausted | Explain stamina-gated action cannot commit | Short breath/effort stop plus UI feedback | DES-003 insufficient stamina | Player attempts stamina-gated action below cost | NO | HIGH | PLAYER_LOCAL | Does not prevent ordinary movement sound | Moderate variation | Do not imply Health loss or forced immobility | ONE_SHOT; SCOPE LOCAL_PLAYER |
| carry_heavy | Tell player entered HEAVY carry state | Subtle gear/body-load shift | DES-002 HEAVY; DES-003 stamina modifier | Local carry state crosses into HEAVY | NO | STANDARD | PLAYER_LOCAL/UI_LOCAL | Low intensity; no repeated nagging | Stable state-entry only | Do not imply movement slowdown; HEAVY only changes stamina regen | ONE_SHOT; SCOPE LOCAL_PLAYER |
| carry_overloaded | Tell player entered OVERLOADED state | Stronger load/strain warning | DES-002 OVERLOADED; DES-003 | Local carry state crosses into OVERLOADED | NO | HIGH | PLAYER_LOCAL/UI_LOCAL | Higher than HEAVY; below predator telegraph | Stable state-entry only | Do not imply damage or hard immobilization; approved move multiplier is 0.80 | ONE_SHOT; SCOPE LOCAL_PLAYER |
| consume_complete | Confirm Food/Water/Field Dressing channel completed | Short consumption/recovery result appropriate to item class | DES-003 1.0 s consume | Approved consume channel completes and item effect applies | NO | STANDARD | PLAYER_LOCAL | Plays only on completion | Variants by consumable type | Do not play on canceled/damaged channel or imply effect beyond source | ONE_SHOT; SCOPE LOCAL_PLAYER |
| player_hurt | Confirm authoritative damage and source urgency | Immediate impact/body response distinct from predator telegraph | DES-003 approved damage sources | Local player Health is reduced by an approved source | NO | CRITICAL | PLAYER_LOCAL | Must not mask next hostile windup | Several impact/intensity variants | Do not imply bleed, injury, armor, or unapproved damage source | ONE_SHOT; SCOPE LOCAL_PLAYER |
| player_death | Make death transition unmistakable | Short loss/transition signature, restrained rather than cinematic defeat | DES-003 Health reaches 0 | Local authoritative death transition begins once | NO | HIGH | PLAYER_LOCAL/MUSIC-compatible | Stops active local action cues; music may yield or drop out | Limited variants | Do not imply world rollback, permadeath, party wipe, or campaign fail | ONE_SHOT; SCOPE LOCAL_PLAYER |
| player_respawn | Re-establish player at base after approved delay | Clear return-to-control signature with human foothold tone | DES-003 5 s respawn | Local player respawn state becomes active at base | NO | HIGH | PLAYER_LOCAL | Can hand into landing/base ambience | Stable | Do not imply restored inventory or new replacement gear | ONE_SHOT; SCOPE LOCAL_PLAYER |
| death_cache_created | Establish recovery objective after death | Distinct cache/recovery marker signature | DES-003 Death Cache creation | Non-empty Death Cache is authoritatively created/marked | NO | HIGH | UI_LOCAL | Separated from ordinary world-drop cue | Stable | Do not imply contents teleported home, expiration timer, or private-only access | ONE_SHOT; SCOPE LOCAL_PLAYER |
| death_cache_recover_item | Confirm item recovered from cache | Reassuring recovery transfer cue | DES-003 recovery; DES-002 transfer | Local player or authorized teammate successfully removes cache item; local cue only for actor | NO | STANDARD | UI_LOCAL | Routine transfer with recovery identity | Moderate variation | Do not imply cache cleared if items remain; do not duplicate item cue | ONE_SHOT; SCOPE LOCAL_PLAYER |
| death_cache_cleared | Tell actor/recovering player that last item left cache | Short completion/release cue | DES-003 empty cache clears marker | Final cache item is removed and cache becomes empty | NO | HIGH | UI_LOCAL | Stronger than single-item recovery, weaker than level-up | Stable | Do not imply all other Death Caches are cleared | ONE_SHOT; SCOPE LOCAL_PLAYER |

---

# 14. Event map — Territorial Predator state chain

Predator audio is gameplay-critical. State identities must be distinct even under Cold Rain, night ambience, music, and co-op activity.

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| predator_alert | Warn player that valid detection occurred before chase | Short sharp recognition/territorial cue with unmistakable onset | DES-003 ALERT 0.4 s | Predator enters ALERT on valid detection | NO | HIGH | WORLD_3D | Cuts through bed; transitions toward chase without extending ALERT | Very limited variation | Do not lengthen 0.4 s state or imply attack has already committed | ONE_SHOT; SCOPE WORLD_ENTITY |
| predator_chase | Communicate active pursuit state | Sustained locomotion/vocal pressure distinct from ALERT and windup | DES-003 CHASE | Predator enters/remains CHASE | CONDITIONAL | HIGH | WORLD_3D | State texture may recur but must leave space for windup | Natural variation, avoid constant scream spam | Do not imply target lock UI, threat meter, or unavoidable combat | STATE_LOOP/state-dependent one-shots; SCOPE WORLD_ENTITY |
| predator_attack_windup | Give readable movement-based attack telegraph | Compact escalating telegraph whose decisive onset fits entirely within approved 0.55 s windup | DES-003 ATTACK WINDUP = 0.55 s; ART-002 readability | Predator enters ATTACK WINDUP | NO | CRITICAL | WORLD_3D | Music/ambience yield immediately; release cue follows only if state resolves | Recognition-first; minimal texture variation | Do not extend timing, add dodge/block/parry cue, or promise damage before authoritative resolution | ONE_SHOT bounded by state; SCOPE WORLD_ENTITY |
| predator_attack_release | Tell player attack resolution moment occurred | Hard release/strike signature distinct from windup | DES-003 attack resolution | Predator attack reaches authoritative release/resolution | NO | CRITICAL | WORLD_3D | Follows windup; player_hurt only if valid victim actually takes damage | Limited variants | Do not guarantee hit; release may occur without player damage if target left range | ONE_SHOT; SCOPE WORLD_ENTITY |
| predator_recovery | Make post-attack non-windup state readable | Short decompression/reposition cue | DES-003 post-attack recovery 1.20 s | Predator enters RECOVERY after attack | CONDITIONAL | STANDARD | WORLD_3D | Lower urgency than windup/release | Natural motion/breath variants | Do not imply stun, vulnerability bonus, or exact player attack window beyond approved state | STATE/ONE_SHOT; SCOPE WORLD_ENTITY |
| predator_disengage_return | Confirm successful retreat/disengage is occurring | Tension-release territorial withdrawal cue | DES-003 RETURN/DISENGAGE | Target remains outside leash condition and predator enters RETURN | CONDITIONAL | HIGH | WORLD_3D | Reduces chase pressure; no victory fanfare required | Moderate variation | Do not imply predator permanently despawned or killed | ONE_SHOT plus state texture; SCOPE WORLD_ENTITY |
| predator_death | Confirm hostile is dead in shared world | Grounded collapse/end-state signature | DES-003 DEAD | Predator Health reaches dead state authoritatively | NO | HIGH | WORLD_3D | Ends chase/hostile state audio | Limited variants | Do not imply unique mandatory loot, boss victory, or personal XP for remote nonparticipants | ONE_SHOT; SCOPE WORLD_ENTITY |

---

# 15. Event map — ruin, investigation, Ancient Alloy Shard, shared discovery

Ruin cues must preserve P1-NARR-001 ambiguity.

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ruin_ambient_presence | Sense engineered/old/absent quality near ruin without exposition | Sparse resonant material texture with large negative space | DES-005 ruin area; NARR-001 tone/guardrails | Player is within approved audible proximity of ruin world entity | YES | BED | WORLD_3D | Sits above wilderness only subtly; yields to predator/survival | Long evolving, low-density | Do not imply active machinery, language, ghosts, magic, faction, decoded signal, or purpose | STATE_LOOP; SCOPE WORLD_ENTITY |
| ruin_located | Recognize transition UNKNOWN to LOCATED | Brief curiosity cue: constructed, unfamiliar, unresolved | DES-005 LOCATED within approved locate radius | Ruin state becomes LOCATED for team/world | NO | HIGH | WORLD_3D plus local UI accent | May briefly thin ambience; not a full discovery fanfare | Stable, one-time per actual transition | Do not imply investigation complete, Shard claimed, builder identity, or personal XP for remote teammate | ONE_SHOT; SCOPE WORLD_STATE |
| ruin_inspect | Confirm player committed approved Inspect interaction | Focused tactile/observational cue with no puzzle language | DES-005 Inspect immediate interaction | Local player successfully commits ruin Inspect | NO | HIGH | WORLD_3D/UI_LOCAL | Leads into discovery state result | Minimal variation | Do not imply decoding, hacking, scanning minigame, tool requirement, or puzzle | ONE_SHOT; SCOPE LOCAL_PLAYER/WORLD_ENTITY |
| ruin_discovered_shared | Mark authoritative INVESTIGATED shared discovery | Short unresolved discovery stinger: wonder over triumph | DES-005 INVESTIGATED; NARR-001 semantic payload | World/team ruin state first becomes INVESTIGATED | NO | HIGH | TEAM_SHARED plus local world context | Music may yield then allow short discovery stinger | One canonical identity | Do not reveal builder species/faction/purpose/fate; do not sound like campaign victory | ONE_SHOT/STINGER; SCOPE TEAM |
| ancient_alloy_shard_available | Tell investigator physical evidence is claimable | Subtle material-evidence accent distinct from reward chest language | DES-005 one Shard claimable; NARR-001 Shard boundary | First investigation makes Shard world pickup available | NO | STANDARD | WORLD_3D | Follows discovery; lower than discovery stinger | Stable | Do not imply supernatural power, decoded tech, research unlock, or guaranteed inventory transfer | ONE_SHOT; SCOPE WORLD_ENTITY |
| ancient_alloy_shard_claimed | Confirm one physical Shard was actually acquired | Dense unfamiliar material pickup confirmation | DES-002 Shard inventory; DES-005 claim state | Authoritative Shard pickup commits | NO | HIGH | PLAYER_LOCAL | Can coexist with ordinary pickup but should not duplicate it | One distinctive identity | Do not imply shared personal reward to remote players or additional Shards | ONE_SHOT; SCOPE LOCAL_PLAYER |
| coop_shared_ruin_discovery_remote | Tell teammate shared world knowledge changed while avoiding false personal progression | Restrained team-information cue derived from discovery identity but smaller than local investigation | DES-005 shared discovery; DES-006 no remote personal discovery XP; ART-002 QA-024 | Teammate receives shared ruin discovery update without personally completing required local exploration milestone | NO | HIGH | TEAM_SHARED | Must be audibly weaker/different from personal XP/level-up | Stable | Do not imply personal XP, personal Inspect completion, Shard ownership, teleport, or profession objective completion | ONE_SHOT; SCOPE TEAM |

---

# 16. Event map — progression and profession feedback

| EVENT | PLAYER PURPOSE | AUDIO INTENT | STATE SOURCE | TRIGGER SEMANTICS | LOOP | PRIORITY | SPATIALITY | LAYERING / TRANSITION | VARIATION / REPETITION | MUST NOT | INTEGRATION METADATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| xp_gain | Confirm meaningful personal XP award | Short lightweight upward tick, subordinate to action/discovery cue | DES-006 authoritative XP award | Local player receives XP greater than 0 | NO | STANDARD | UI_LOCAL | May layer after source action; avoid stacking into noise for rapid events | 2–4 variants | Do not play for failed/no-op/capped/no-XP actions or remote shared discovery | ONE_SHOT; SCOPE LOCAL_PLAYER |
| level_up | Make threshold crossing unmistakable | Broader hopeful advancement cue | DES-006 level threshold crossed | Local authoritative level increases | NO | HIGH | UI_LOCAL | Can briefly reduce music bed; stronger than xp_gain | Stable motif with restrained variants | Do not imply skill points, stat bonus, or new system not approved | ONE_SHOT; SCOPE LOCAL_PLAYER |
| skill_fieldcraft_unlocked | Confirm Fieldcraft Basics prerequisite record | Exploratory qualification motif | DES-006 Level 2 plus Expedition Band entry | Fieldcraft Basics becomes unlocked | NO | HIGH | UI_LOCAL | Related to progression family, distinct from profession unlock | Stable | Do not imply movement/fog/survival stat bonus | ONE_SHOT; SCOPE LOCAL_PLAYER |
| skill_maintenance_unlocked | Confirm Maintenance Basics prerequisite record | Practical mechanical qualification motif | DES-006 Level 2 plus successful Workbench repair | Maintenance Basics becomes unlocked | NO | HIGH | UI_LOCAL | Related to repair/base identity | Stable | Do not imply repair bonus, recipe privilege, or power privilege | ONE_SHOT; SCOPE LOCAL_PLAYER |
| profession_quest_available | Tell player Explorer or Engineer prototype quest became eligible | Brief opportunity cue, not completion fanfare | DES-006 eligibility rules | Approved profession quest changes from unavailable to available | NO | STANDARD | UI_LOCAL | Can use profession-family accent | Small Explorer/Engineer variants | Do not imply profession already unlocked or permanent class choice | ONE_SHOT; SCOPE LOCAL_PLAYER |
| profession_objective_progress | Confirm one personal quest objective committed | Short objective confirmation | DES-006 personal quest objectives | One approved personal objective advances | NO | STANDARD | UI_LOCAL | Below level/profession unlock | Small profession variants | Do not play from shared world context alone when personal objective did not advance | ONE_SHOT; SCOPE LOCAL_PLAYER |
| profession_explorer_unlocked | Mark Explorer — Prototype completion | Hopeful open-horizon motif | DES-006 Chart the Unknown completion | Explorer Prototype becomes unlocked | NO | HIGH | UI_LOCAL | Broader than quest progress, below ruin discovery meaning if simultaneous | Canonical profession identity | Do not imply exclusivity, permanent class lock, or stat bonus | ONE_SHOT; SCOPE LOCAL_PLAYER |
| profession_engineer_unlocked | Mark Engineer — Prototype completion | Warm constructive/mechanical motif | DES-006 Bring Water Online completion | Engineer Prototype becomes unlocked | NO | HIGH | UI_LOCAL | Broader than quest progress, related to foothold identity | Canonical profession identity | Do not imply machine privilege, exclusive recipes, or permanent class lock | ONE_SHOT; SCOPE LOCAL_PLAYER |
| death_xp_loss | Make approved death XP penalty readable | Short downward progression cue, informative not punitive | DES-003/DES-006 death XP formula | Local death penalty removes current-level XP progress greater than 0 | NO | HIGH | UI_LOCAL | May follow death transition; keep distinct from level-down because level cannot fall | Stable | Do not imply level loss, skill/profession loss, or shared research loss | ONE_SHOT; SCOPE LOCAL_PLAYER |

---

# 17. Co-op readability rules

Phase 1 uses the same game rules for solo and hosted co-op. Audio must preserve that authority model.

Rules:
- World entity sounds remain spatially shared when teammates are physically near the same authoritative world event.
- Personal inventory, survival, XP, profession, and invalid/stale results remain local to the affected player unless the approved design explicitly defines a shared notification.
- Shared ruin INVESTIGATED discovery may notify the team, but remote teammates must receive a cue that is audibly distinct from personal XP or personal Inspect completion.
- Co-op contention failures use ui_action_stale for the losing/stale actor; no accusation or ownership narrative is added.
- Shared machine/world state changes may be heard spatially by nearby players because the world entity changed state; no remote global notification is required unless an approved UI state already exposes it.
- Audio must not create a hidden voice-command, ping, party-role, proximity-chat, or tactical marking system.

---

# 18. Music philosophy and restraint rules

## 18.1 Core rule

Music is punctuation, not wallpaper.

The vertical slice should allow the environment, player actions, weather, machinery, danger, and ruin to carry much of the experience. Long periods without score are valid.

The Phase 1 score supports:
- hopeful;
- lonely;
- curious;
- occasionally tense.

It must not transform the slice into:
- heroic combat power fantasy;
- constant horror;
- cinematic campaign rail;
- faction exposition;
- boss encounter.

## 18.2 music_exploration_sparse

**State source:** DES-001 exploration; DES-005 world exploration.  
**Intent:** rare, airy harmonic fragments that widen the sense of unknown space.  
**Use:** optional/sparse during safe exploration; silence remains valid.  
**Must not:** hide wildlife, survival warnings, predator cues, or imply precise hidden POI direction.  
**Integration:** MUSIC; non-looping phrases or very long sparse bed; SCOPE LOCAL_PLAYER.

## 18.3 music_foothold_sparse

**State source:** DES-001 foothold; DES-004 base progression.  
**Intent:** warmer, slightly more stable human motif after visible foothold capability exists.  
**Use:** restrained near established base; not a constant settlement anthem.  
**Must not:** imply NPC colony population, research completion, or advanced automation.  
**Integration:** MUSIC; sparse; SCOPE LOCAL_PLAYER.

## 18.4 music_expedition_sparse

**State source:** DES-001 EXPEDITION ACTIVE; DES-005 expedition band.  
**Intent:** increase uncertainty with texture/density rather than loudness.  
**Use:** occasional tension support during longer travel.  
**Must not:** function as a hidden threat detector, announce predator presence before approved detection, or imply mandatory combat.  
**Integration:** MUSIC; sparse state-dependent phrases; SCOPE LOCAL_PLAYER.

## 18.5 music_ruin_discovery_stinger

**State source:** DES-005 INVESTIGATED; NARR-001 mystery hook.  
**Intent:** brief wonder-and-question stinger with unresolved harmonic ending.  
**Use:** first authoritative shared INVESTIGATED transition.  
**Must not:** sound like victory, decoded revelation, alien faction reveal, supernatural awakening, or campaign ending.  
**Integration:** STINGER; SCOPE TEAM/LOCAL presentation according to later implementation.

## 18.6 music_recovery_sparse

**State source:** DES-003 respawn/recovery loop.  
**Intent:** restrained resilience after failure, returning agency without erasing consequence.  
**Use:** optional short phrase after respawn or successful recovery when it does not conflict with other cues.  
**Must not:** trivialize death penalty or imply all lost inventory was restored.  
**Integration:** MUSIC/STINGER; SCOPE LOCAL_PLAYER.

## 18.7 Masking and ducking intent

When CRITICAL gameplay cues occur:
- music yields immediately;
- ambience yields as needed;
- no music accent may cover predator windup/release or severe survival warnings.

When HIGH narrative/progression cues occur:
- music may reduce or leave space briefly;
- the underlying game state remains sonically readable.

No runtime ducking implementation is mandated by this document.

---

# 19. Integration-facing semantic contracts

## 19.1 State changes, not guesses

Audio should bind only to authoritative or approved presented states.

Examples:
- play gather_success only when gather commits;
- play ui_action_stale only when authority reports stale/world-changed failure;
- start condenser_running only while approved RUNNING state is true;
- play xp_gain only when actual XP is awarded;
- play coop_shared_ruin_discovery_remote without xp_gain when a remote teammate only receives shared knowledge.

Audio must not infer gameplay success from animation timing alone.

## 19.2 Start/stop semantics

State loops:
- begin when the approved state becomes true;
- stop when the approved state becomes false;
- transitions may use a short one-shot but must not create a new persistent state.

Channel sounds:
- end on completion or cancellation;
- cancellation must not accidentally produce success tail.

## 19.3 No false authoritative feedback

The following are prohibited:
- success cue before commit;
- personal reward cue for remote shared event;
- damage cue from weather merely becoming active;
- machine-production cue while DISABLED/UNPOWERED/OUTPUT FULL;
- hostile-hit cue when attack release did not damage the local player;
- Shard acquisition cue when the Shard is merely available but not claimed;
- discovery-complete cue when ruin is only LOCATED;
- level-up cue from XP gain that did not cross a threshold.

## 19.4 Scope metadata

Later integration should preserve at least:
- semantic event ID;
- authoritative source state/result;
- local/world/team scope;
- source entity or world location when spatial;
- start/stop transition for loops/channels;
- reason/state category for invalid/stale feedback where a dedicated variant is used.

This is semantic metadata only and does not prescribe schema or API structure.

---

# 20. Asset-production naming guidance for downstream P1-AUD-002

This section defines naming intent only; it does not activate asset production.

Recommended filename traceability:
- event ID remains the filename stem;
- variations add a simple variation suffix;
- loops identify loop intent explicitly;
- source/master/export format decisions remain downstream production/runtime scope.

Examples of traceable names:
- predator_attack_windup__v01
- pickup_success__v02
- condenser_running__loop__v01
- music_ruin_discovery_stinger__v01

The semantic event ID must remain recoverable from the filename and asset manifest.

---

# 21. Explicit non-goals

P1-AUD-001 does not:
- create WAV/OGG or other audio assets;
- choose middleware;
- create runtime audio code;
- modify src/**;
- define an audio engine;
- define loaders, streaming, compression, codecs, memory pools, or platform audio settings;
- alter gameplay timing or state transitions;
- add dodge/block/parry/stealth/threat systems;
- add direct weather damage;
- add machine fuel, wear, maintenance, automation, or new machine modes;
- add narrative builder identity, language, faction, supernatural power, decoded technology, or ruin purpose;
- add production voice acting;
- add Phase 2 biome/faction/endgame music;
- change Company A task ownership or activate #55/#56.

---

# 22. Acceptance criteria self-check

- All required Phase 1 audio domains are mapped to approved states/events: **PASS**
- Every mapped event references an approved authoritative state/source: **PASS**
- Predator ALERT/CHASE/WINDUP/ATTACK/RECOVERY semantics are distinct: **PASS**
- Predator 0.55 s ATTACK WINDUP is preserved without timing change: **PASS**
- Cold Rain warning/active semantics are mapped without direct-HP implication: **PASS**
- Ruin/Ancient Alloy audio preserves #65 ambiguity: **PASS**
- Machine audio reflects only approved power/Condenser states: **PASS**
- UI positive/invalid/stale semantics avoid false authoritative feedback: **PASS**
- Progression audio separates personal XP from shared world knowledge: **PASS**
- Co-op shared ruin discovery has teammate-readable feedback without false personal XP: **PASS**
- Music is bounded to Phase 1 and creates no Phase 2 scope: **PASS**
- Stable semantic naming and integration-facing metadata are documented: **PASS**
- Loudness/readability hierarchy is documented without runtime architecture: **PASS**
- Looping/variation/repetition intent is documented: **PASS**
- Runtime implementation is explicitly out of scope: **PASS**
- Blocking OPEN QUESTION: **NONE**
- DECISION NEEDED: **NONE**

---

# 23. Artifact record

**Exact path:**  
docs/audio/phase-1-audio-direction-event-map.md

**Purpose:**  
Define the authoritative Phase 1 audio direction, semantic event map, cue priority/readability rules, looping/repetition intent, music restraint rules, naming, and integration-facing metadata for approved Phase 1 states.

**Responsibilities/content boundary:**  
Audio craft/content direction only. No gameplay rules, narrative canon changes, runtime architecture, middleware, source integration, or asset production.

**Dependencies:**  
P1-DES-001 through P1-DES-006; P1-ART-002; P1-NARR-001; Phase 1 execution plan; Issue #79; current AUDIO_DESIGNER contract.

**Integration/reference point:**  
Issue #79 / P1-AUD-001. P1-AUD-002 may produce assets only after PM-B acceptance/activation under its own lock. Later engineering integration must consume these semantic IDs without changing their approved gameplay/narrative meaning.

**Project Owner Action:** NONE
