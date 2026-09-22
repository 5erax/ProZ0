# P1-ART-002 — Phase 1 Asset Production and Interaction UI Specification

**Task:** P1-ART-002 / Issue #37  
**Role:** Art Director / UI-UX / Technical Art  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** READY FOR PRODUCER REVIEW  
**Implementation authorization:** NONE  
**Handoff:** Art Director → Producer / Project Manager

## Authoritative sources

- `docs/art/phase-1-visual-ui-readability-foundation.md`
- `docs/design/phase-1-vertical-slice-master-gameplay.md`
- `docs/design/phase-1-inventory-gathering-crafting-repair.md`
- `docs/design/phase-1-survival-combat-death-recovery.md`
- `docs/design/phase-1-habitat-building-power-machine.md`
- `docs/design/phase-1-exploration-fog-weather-ruin.md`
- `docs/design/phase-1-early-progression-profession.md`
- `docs/phase-1-vertical-slice-plan.md`

---

# 1. PURPOSE

Convert the approved Phase 1 visual language and gameplay contracts into a finite, implementation-ready production specification for:

- world art;
- actors;
- structures and machines;
- item icons;
- HUD;
- inventory/container/crafting/repair/building UI;
- fog/map/discovery;
- Cold Rain/night presentation;
- combat/damage/death/recovery feedback;
- Explorer/Engineer progression feedback;
- 2–4 player co-op identity;
- pixel-integrity and accessibility gates.

This task defines **what must be produced and what visual states must exist**.

It does **not** implement assets or UI, select runtime architecture, or change gameplay rules.

---

# 2. HARD VISUAL / RENDERING CONTRACT

Phase 1 carries forward the accepted Phase 0 constraints.

| Requirement | Phase 1 production rule |
|---|---|
| Internal reference raster | 640 × 360 px, 16:9 |
| Visual reference cell | 32 × 32 internal px |
| Player reference frame | 32 × 48 internal px |
| World placement | Continuous; art grid never becomes movement grid |
| Sampling | Nearest-neighbor / point equivalent |
| Display | Integer scale at 1× / 2× / 3× reference gates |
| Reference outputs | 640×360 / 1280×720 / 1920×1080 |
| World depth | Ground/contact-anchor Y ordering |
| Pixel snapping | Presentation only; never mutates simulation |
| Anti-aliasing | Not allowed on pixel-raster world/UI assets |
| UI alignment | Whole internal pixels |
| DPR | Must preserve crisp internal pixels |
| Critical information | Never color-only |

### Reference display behavior

- If viewport fits an integer multiple of 640×360, use the largest supported integer scale that fits.
- If extra horizontal/vertical space remains, center the game surface; do not fractionally stretch world/UI to fill it.
- If a desktop viewport cannot fit the 640×360 logical surface at 1×, show a readable viewport-too-small state rather than soft fractional downscaling.
- 2× and 3× captures are mandatory visual QA gates.

---

# 3. ART EXPORT / NAMING CONTRACT

The following paths are **art-production export paths**, not a mandate on runtime loader architecture. Technical Design may map them into a bundler/registry without renaming the stable art IDs.

Root:

`assets/phase1/`

Subdirectories:

- `actors/`
- `world/terrain/`
- `world/resources/`
- `world/structures/`
- `world/discovery/`
- `world/effects/`
- `items/`
- `ui/icons/`
- `ui/panels/`
- `ui/map/`
- `ui/effects/`

Rules:

- lowercase `snake_case`;
- stable semantic names;
- PNG with alpha for raster sprites/icons;
- authored at native internal-pixel size;
- no pre-scaled 2×/3× duplicates;
- no anti-aliased export edges;
- animation frames use stable canvas bounds and stable ground anchor;
- no filename such as `final.png`, `new.png`, `test2.png`.

---

# 4. SHARED PIXEL / SHAPE LANGUAGE

## 4.1 Category priority

At gameplay scale, visual priority is:

1. local player / immediate hostile;
2. current interaction target;
3. critical survival warning;
4. hazard boundary / attack telegraph;
5. resource or recovery object;
6. human structure / machine state;
7. ruin landmark;
8. environmental decoration.

## 4.2 Shape before hue

All important distinctions must survive grayscale/value inspection.

Required secondary channels include:

- outline;
- silhouette;
- fill pattern;
- icon/glyph;
- animation cadence;
- text label;
- marker shape.

## 4.3 Common semantic states

Where applicable:

- NORMAL
- HOVERED
- SELECTED
- ACTIVE
- AVAILABLE
- UNAVAILABLE
- BLOCKED
- WARNING
- CRITICAL
- DAMAGED
- BROKEN
- DEPLETED
- DISABLED
- UNPOWERED
- RUNNING
- OUTPUT FULL
- NEW
- DISCOVERED
- COMPLETE

Gameplay remains authoritative for which state applies.

---

# 5. EXACT PHASE 1 WORLD-ASSET PRODUCTION LIST

## 5.1 Terrain / water

### NEW ASSET
**ID:** `terrain_region_atlas`  
**Path:** `assets/phase1/world/terrain/terrain_region_atlas.png`  
**Purpose:** One coherent Phase 1 region; no multi-biome pack.  
**Tile cell:** 32×32 px.  
**Required frames:**
- ground base A;
- ground base B;
- ground base C;
- ground base D;
- water animation frames 0–3;
- shoreline adjacency mask/art set: 16 edge/corner combinations.

**Production count:** 24 × 32×32 cells in one atlas.  
**Animation:** water 4 frames, presentation-only cadence; gameplay not tied to animation frame.

### NEW ASSET
**ID:** `terrain_nonbuildable_marker_pattern`  
**Path:** `assets/phase1/world/terrain/nonbuildable_pattern.png`  
**Size:** 8×8 px seamless pattern.  
**Purpose:** Build-mode invalid-surface overlay, not ordinary exploration decoration.

## 5.2 Resource nodes

Each resource sheet must include NORMAL and DEPLETED where depletion exists. Partial node quantity is not required to have separate art because Game Design only requires readable depletion.

| Art ID | Export path | Frame canvas | Required states |
|---|---|---:|---|
| `resource_fiber_plant` | `world/resources/fiber_plant.png` | 32×32 | NORMAL, DEPLETED |
| `resource_food_plant` | `world/resources/food_plant.png` | 32×32 | NORMAL, DEPLETED |
| `resource_potable_water` | `world/resources/potable_water_source.png` | 32×32 | AVAILABLE |
| `resource_tree` | `world/resources/tree_timber.png` | 48×64 | NORMAL, DEPLETED/STUMP |
| `resource_stone_outcrop` | `world/resources/stone_outcrop.png` | 48×40 | NORMAL, DEPLETED |
| `resource_metal_ore` | `world/resources/metal_ore_node.png` | 48×40 | NORMAL, DEPLETED |

Requirements:

- Fiber Plant and Food Plant must not be confused with decorative flora.
- Potable Water Source must be readable as an interaction target; ordinary visible water must not imply potable interaction everywhere.
- Metal Ore Node must differ from ordinary stone by silhouette/pattern, not hue alone.
- Tree, stone and ore states must preserve their ground/depth anchor.
- Gather focus outline is supplied by shared interaction UI, not baked glow.

## 5.3 Non-interactive comparison props

### NEW ASSET
**ID:** `world_rock_decor`  
**Path:** `assets/phase1/world/terrain/rock_decor.png`  
**Canvas:** 32×24 px.  
**States:** NORMAL only.  
**Purpose:** Ensure resource-node art can be distinguished from ordinary scenery.

### NEW ASSET
**ID:** `world_flora_decor`  
**Path:** `assets/phase1/world/terrain/flora_decor.png`  
**Canvas:** 24×24 px.  
**States:** NORMAL only.

## 5.4 Fog of war

### NEW ASSET
**ID:** `fog_mask_atlas`  
**Path:** `assets/phase1/world/effects/fog_mask_atlas.png`  
**Cell:** 32×32 px.  
**Frames:** 16 adjacency masks/pattern variants.  
**States represented:**
- UNEXPLORED;
- EXPLORED boundary transition.

Rules:

- UNEXPLORED exposes no detailed terrain/resource/ruin information.
- Boundary must remain pixel-stable.
- No soft bilinear feathering.
- Dithered transition is allowed only if every dither pixel aligns to internal raster.
- Fog reveal follows continuous player position and the approved 10-footprint-width reveal radius; art does not discretize player movement.

## 5.5 Day/night / Cold Rain

### NEW ASSET
**ID:** `cold_rain_fx`  
**Path:** `assets/phase1/world/effects/cold_rain_fx.png`  
**Cell:** 16×16 px.  
**Frames:**
- rain streak 0–3;
- ground splash 0–3.

### NEW ASSET
**ID:** `weather_dither_pattern`  
**Path:** `assets/phase1/world/effects/weather_dither_pattern.png`  
**Size:** 16×16 px seamless.  
**Purpose:** Optional pixel-safe atmospheric density layer.

Rules:

- Cold Rain world effects render below HUD and interaction text.
- Rain may reduce local scene contrast but may not hide player, hostile windup, build preview, resource focus or Death Cache.
- Cold Rain has a **60 s forecast warning** before the approved event.
- No acid/radiation styling.
- Night is a palette/value treatment, not a separate terrain art pack.
- Night cannot make mandatory warnings or interactables unreadable.
- Shelter interior remains readable while outside rain/night is still visually present.

---

# 6. ACTOR ASSET PRODUCTION LIST

## 6.1 Player

### NEW ASSET
**ID:** `player_pioneer`  
**Path:** `assets/phase1/actors/player_pioneer.png`  
**Frame:** 32×48 px.  
**Ground anchor:** center of feet, fixed for every frame.

Phase 1 logical facing supports 8 directions. To bound production, author five facing sets:

- S;
- SE;
- E;
- NE;
- N;

and mirror the E/NE/SE art horizontally for W/NW/SW.

Do not place asymmetric readable text/symbols on the player sprite that would become invalid when mirrored.

### Minimum animation/state set

| State | Frames / facing | Art requirement |
|---|---:|---|
| IDLE | 2 | stable readable silhouette |
| MOVE | 6 | continuous locomotion; no grid-step implication |
| INTERACT / GATHER | 4 | generic deliberate world interaction |
| UNARMED ATTACK | 4 | readable frontal strike |
| SPEAR ATTACK | 5 | spear clearly readable; frontal action |
| CONSUME / USE | 4 | deliberate 1 s use-channel feedback |
| HURT | 2 | short damage response; does not own invulnerability |
| DEATH | 6 | readable single death transition |

Animation timing is presentation; gameplay timing remains authoritative. Attack/contact frame may be aligned by Engineering to authoritative resolution but never defines hit authority.

### NEW ASSET
**ID:** `player_thermal_wrap_overlay`  
**Path:** `assets/phase1/actors/player_thermal_wrap_overlay.png`  
**Frame:** 32×48 px.  
**Directions:** same five authored facings.  
**Purpose:** Make Thermal Wrap preparation visible without requiring a full clothing system.

### Equipment presentation rule

- Stone Field Tool is visible during gather animation.
- Basic Spear is visible during equipped spear attack and may be shown in idle/move using a small held overlay if production budget permits.
- Thermal Wrap has a world-space overlay plus HUD equipped state.
- Equipment visuals are presentation only.

## 6.2 Passive wildlife

### NEW ASSET
**ID:** `wildlife_passive_phase1`  
**Path:** `assets/phase1/actors/wildlife_passive_phase1.png`  
**Frame:** 32×32 px.  
**Required states:**
- IDLE: 2 frames;
- MOVE: 4 frames.

This is a production-light fauna asset; final species/lore naming remains deferred.

## 6.3 Territorial Predator

### NEW ASSET
**ID:** `territorial_predator`  
**Path:** `assets/phase1/actors/territorial_predator.png`  
**Frame:** 48×48 px.  
**Ground anchor:** stable across all frames.  
**Authored facings:** S, SE, E, NE, N with horizontal mirroring.

Required states:

| Gameplay state | Frames | Visual requirement |
|---|---:|---|
| IDLE / PATROL | 4 | not confused with dead/inactive |
| ALERT | 2 | strong readable 0.4 s alert cue |
| CHASE | 6 | clear aggressive locomotion |
| ATTACK WINDUP | 4 | unmistakable preparation pose across approved 0.55 s windup |
| ATTACK RELEASE | 2 | action resolution pose |
| RECOVERY | 2 | readable vulnerable/cooldown posture |
| RETURN / DISENGAGE | reuse CHASE | presentation marker/state changes, no new art required |
| HURT | 2 | short damage response |
| DEAD | 6 | clear terminal state |

Attack windup must remain readable at 2× presentation while player is moving.

No dodge/block/ranged telegraph assets are produced.

---

# 7. HUMAN STRUCTURE / MACHINE PRODUCTION LIST

All world structure sprites use documented ground anchors. Visual canvas dimensions below do not define gameplay collision footprints.

## 7.1 Landing Module

### NEW ASSET
**ID:** `structure_landing_module`  
**Path:** `assets/phase1/world/structures/landing_module.png`  
**Canvas:** 128×96 px.  
**States:**
- NORMAL;
- interaction HOVER/SELECTED via shared overlay;
- connector-visible build-mode overlay.

Requirements:

- strongest human landmark at session start;
- visibly temporary/landing-oriented;
- connector location readable;
- spawn clearance is UI/build-mode information, not baked scenery.

## 7.2 Habitat Room

### NEW ASSET
**ID:** `structure_habitat_room`  
**Path:** `assets/phase1/world/structures/habitat_room.png`  
**Canvas:** 128×96 px per orientation.  
**Orientations:** 0°, 90°, 180°, 270°.  
**States:**
- NORMAL;
- CONNECTOR TARGET;
- SHELTER ACTIVE indicator when local player is inside.

Production uses an open-ceiling / cutaway-readable presentation for Phase 1; no advanced roof-fade system is required.

The room must visually communicate a more permanent foothold than the Landing Module.

## 7.3 Storage Crate

### NEW ASSET
**ID:** `structure_storage_crate`  
**Path:** `assets/phase1/world/structures/storage_crate.png`  
**Canvas:** 32×32 px.  
**States:** NORMAL; HOVER/SELECTED via shared overlay.

No private-owner art variant is produced because the crate is team-shared.

## 7.4 Workbench

### NEW ASSET
**ID:** `structure_workbench`  
**Path:** `assets/phase1/world/structures/workbench.png`  
**Canvas:** 48×40 px.  
**States:** NORMAL; IN USE indicator via shared interaction overlay.

No power-state art is produced because Workbench does not require power in Phase 1.

## 7.5 Compact Power Unit

### NEW ASSET
**ID:** `structure_power_unit`  
**Path:** `assets/phase1/world/structures/compact_power_unit.png`  
**Canvas:** 48×48 px.  
**States:**
- OPERATING / ON: 4-frame low-amplitude indicator loop;
- SELECTED.

The Power Unit is always ON while placed in Phase 1. No player-toggle OFF animation is produced.

UI must be capable of displaying:

- 10 PU capacity;
- current active demand;
- Condenser eligibility/range result.

No cable art or fuel art is produced.

## 7.6 Atmospheric Water Condenser

### NEW ASSET
**ID:** `structure_water_condenser`  
**Path:** `assets/phase1/world/structures/atmospheric_water_condenser.png`  
**Canvas:** 64×64 px.  
**States:**

- DISABLED: static;
- UNPOWERED: static + broken-power state icon;
- RUNNING: 4-frame operating loop;
- READY / PARTIAL OUTPUT: RUNNING plus output-level indicator;
- OUTPUT FULL: static/full indicator.

### NEW ASSET
**ID:** `condenser_output_levels`  
**Path:** `assets/phase1/world/structures/condenser_output_levels.png`  
**Frame:** 12×12 px.  
**States:** output 0, 1, 2, 3, 4 Clean Water.

Gameplay values represented by UI:

- demand = 5 PU while RUNNING;
- output = 1 Clean Water / 90 s active powered time;
- output capacity = 4;
- no portable input;
- no offline production.

No wear/dust/maintenance art is produced in Phase 1.

---

# 8. BUILD-MODE VISUAL ASSETS / STATES

## 8.1 Shared preview pattern

### NEW ASSET
**ID:** `build_preview_pattern`  
**Path:** `assets/phase1/ui/effects/build_preview_pattern.png`  
**Size:** 4×4 px seamless checker/dither.

Build preview uses the actual structure silhouette with a pixel-safe dither/outline.

States:

- VALID;
- INVALID;
- CONNECTOR SNAP;
- CONFIRMED pulse.

Validity must not be communicated only by green/red hue.

## 8.2 Build list

Exactly five player-placeable Phase 1 entries:

1. Storage Crate — Storage Crate Kit
2. Workbench — Workbench Kit
3. Habitat Room — Habitat Kit
4. Compact Power Unit — Power Unit Kit
5. Atmospheric Water Condenser — Machine Kit

Landing Module appears as base context but is not a build-list entry.

## 8.3 Invalid placement reason presentation

The build prompt must show a short reason string for:

- UNEXPLORED AREA
- INVALID TERRAIN
- WATER / NON-BUILDABLE SURFACE
- OBSTRUCTED
- STRUCTURE OVERLAP
- BLOCKS SPAWN
- BLOCKS REQUIRED DOOR/CONNECTOR
- OUTSIDE BASE BUILD ZONE
- CONNECTOR REQUIRED / INVALID CONNECTOR
- BUILD LIMIT REACHED
- KIT NO LONGER AVAILABLE
- WORLD STATE CHANGED / POSITION TAKEN

Machine/power state reasons:

- OUT OF POWER RANGE
- INSUFFICIENT POWER
- MACHINE DISABLED
- OUTPUT FULL

No unique icon is required for every reason; use one invalid-state glyph plus the authoritative text reason.

---

# 9. RUIN / DISCOVERY / RECOVERY WORLD ASSETS

## 9.1 Previous-Civilization Ruin

### NEW ASSET
**ID:** `previous_civilization_ruin`  
**Path:** `assets/phase1/world/discovery/previous_civilization_ruin.png`  
**Canvas:** 128×128 px.  
**States:**
- world landmark NORMAL;
- LOCATED / UNINVESTIGATED overlay state;
- INVESTIGATED overlay state.

Requirements:

- unmistakably non-human at gameplay scale;
- materially/silhouette-distinct from terrain and Landing Module;
- no finalized alien language, species, alphabet or lore symbols;
- investigation point must be focusable without glowing at all times.

## 9.2 Ruin interaction marker

### NEW ASSET
**ID:** `ruin_inspect_marker`  
**Path:** `assets/phase1/world/discovery/ruin_inspect_marker.png`  
**Size:** 16×16 px.  
**States:** AVAILABLE, TARGETED, INVESTIGATED.

## 9.3 Death Cache

### NEW ASSET
**ID:** `death_cache`  
**Path:** `assets/phase1/world/discovery/death_cache.png`  
**Canvas:** 32×24 px.  
**States:**
- ACTIVE;
- TARGETED;
- EMPTY / RECOVERED transition before removal.

Death Cache must not resemble an ordinary world drop.

## 9.4 Ordinary world drop

### NEW ASSET
**ID:** `world_drop_base`  
**Path:** `assets/phase1/world/discovery/world_drop_base.png`  
**Canvas:** 16×12 px.  
**Purpose:** shared ground-shadow/marker under item icon.

World drop visual = item icon + world_drop_base.

---

# 10. EXACT ITEM ICON SET

### NEW ASSET
**ID:** `item_icon_atlas`  
**Path:** `assets/phase1/items/item_icon_atlas.png`  
**Cell:** 24×24 px.  
**Required icons: exactly 18 Phase 1 item identities**

1. Plant Fiber
2. Timber
3. Stone
4. Metal Ore
5. Edible Plant
6. Clean Water
7. Cordage
8. Stone Field Tool
9. Basic Spear
10. Thermal Wrap
11. Field Dressing
12. Repair Patch
13. Storage Crate Kit
14. Workbench Kit
15. Habitat Kit
16. Power Unit Kit
17. Machine Kit
18. Ancient Alloy Shard

Rules:

- each icon has unique silhouette at 24×24;
- construction kits share a family motif but remain distinguishable by structure glyph;
- Clean Water and potable-water world source must not be confused with generic environmental water;
- Ancient Alloy Shard must be visibly non-human and not resemble Metal Ore;
- condition-bearing item icons support an external condition bar; do not bake numerical condition into icon art;
- BROKEN is shown through slot overlay/state, not a separate icon for every tool.

---

# 11. HUD ICON / COMPONENT PRODUCTION LIST

## 11.1 Status icons

### NEW ASSET
**ID:** `hud_status_icons`  
**Path:** `assets/phase1/ui/icons/hud_status_icons.png`  
**Cell:** 12×12 px.

Required icons:

1. Health
2. Food
3. Water
4. Stamina
5. Temperature
6. Carry Weight
7. Volume
8. Equipment Condition
9. Cold Warning
10. Exhausted
11. Broken
12. Damage
13. Weather / Cold Rain
14. Power
15. Discovery
16. Death Cache
17. XP
18. Level

## 11.2 Interaction icons

### NEW ASSET
**ID:** `interaction_icons`  
**Path:** `assets/phase1/ui/icons/interaction_icons.png`  
**Cell:** 12×12 px.

Required verbs:

- Interact
- Gather
- Pick Up
- Drop
- Transfer
- Consume
- Craft
- Repair
- Build / Place
- Open Container
- Use Machine
- Inspect
- Attack
- Recover
- Dismantle

## 11.3 Map markers

### NEW ASSET
**ID:** `map_marker_atlas`  
**Path:** `assets/phase1/ui/map/map_marker_atlas.png`  
**Cell:** 12×12 px.

Required markers:

- local player;
- teammate identity A;
- teammate identity B;
- teammate identity C;
- Landing/Base;
- Uninvestigated Ruin;
- Investigated Ruin;
- Death Cache;
- Most Recent Death Cache accent.

The map does not require markers for every resource, animal, unseen ruin or remote hostile.

## 11.4 Profession / skill icons

### NEW ASSET
**ID:** `progression_icon_atlas`  
**Path:** `assets/phase1/ui/icons/progression_icon_atlas.png`  
**Cell:** 16×16 px.

Required:

- Fieldcraft Basics;
- Maintenance Basics;
- Explorer — Prototype;
- Engineer — Prototype;
- quest objective complete;
- quest objective incomplete;
- level-up emblem.

No icons for the five other future professions are required.

---

# 12. HUD LAYOUT — 640×360 INTERNAL REFERENCE

The HUD remains world-first and compact.

## 12.1 Top-left survival cluster

**Bounds:** x=8, y=8, w=156, h=42.

Rows:

- Health: full-width compact meter.
- Water + Food: paired compact meters.
- Stamina + Temperature: paired compact meters.

Each meter includes:

- 12×12 icon;
- amount/state bar;
- state cue when warning/critical;
- optional numeric value only when the panel/detail mode exposes it.

### Health states
- HEALTHY 61–100
- INJURED 31–60
- CRITICAL 1–30
- DEAD 0

### Water states
- HYDRATED 50–100
- THIRSTY 25–49
- DEHYDRATED 1–24
- CRITICAL DEHYDRATION 0

### Food states
- FED 40–100
- HUNGRY 20–39
- STARVING 1–19
- CRITICAL STARVATION 0

### Temperature states
- COMFORTABLE 35–65
- COLD 20–34
- SEVERE COLD 5–19
- CRITICAL COLD 0–4
- HOT 66–80
- SEVERE HEAT 81–95
- CRITICAL HEAT 96–100

Stamina is a 0–100 meter. EXHAUSTED appears when an attempted stamina-gated action cannot commit.

## 12.2 Top-right world/session cluster

**Bounds:** x=500, y=8, w=132, h=38.

Contains:

- compact time/day-night readout;
- current weather icon/state;
- Cold Rain forecast when inside the approved ~60 s warning window;
- compact teammate count/identity strip.

No hidden exact event schedule is shown unless gameplay exposes it.

## 12.3 Bottom-left equipment component

**Bounds:** x=8, y=320, w=116, h=32.

Contains:

- 24×24 active tool/weapon/equipment icon;
- condition bar for condition-bearing active item;
- BROKEN state;
- Thermal Wrap equipped badge when relevant.

## 12.4 Bottom-center interaction prompt

**Bounds:** x=180, y=318, w=280, h=34.

Primary line:

`[INPUT] VERB · TARGET`

Secondary line when needed:

- prerequisite;
- invalid reason;
- progress/channel state.

Prompt disappears when no useful target/context exists.

## 12.5 Bottom-right capacity component

**Bounds:** x=500, y=320, w=132, h=32.

Contains:

- current weight / max weight;
- current volume / max volume;
- NORMAL / HEAVY / OVERLOADED state;
- capacity-blocked transaction cue when relevant.

No normal transaction may visually imply a valid state beyond HARD LIMIT >125%.

## 12.6 Toast lane

**Bounds:** x=188, y=8, w=264, h=80.

Non-blocking stacked toasts for:

- XP gain;
- level-up;
- skill unlock;
- profession eligibility;
- quest progress;
- profession unlock;
- discovery;
- shared discovery.

Critical survival/damage alerts override progression toasts in priority.

---

# 13. PANEL SYSTEM

All primary panels use whole-pixel bounds and 4 px spacing increments.

### NEW ASSET
**ID:** `ui_panel_skin`  
**Path:** `assets/phase1/ui/panels/ui_panel_skin.png`  
**Purpose:** borders, corners, separators, selected/disabled patterns.  
**Source elements:** 8×8 / 16×16 repeatable pixel cells.

No anti-aliased rounded vectors are required.

## 13.1 Inventory panel

**Logical size:** 520×280 px, centered.

Must show:

- player item cells;
- selected item detail;
- stack quantity;
- weight;
- volume;
- condition where applicable;
- equipped state;
- current carried weight/max;
- volume/max;
- NORMAL / HEAVY / OVERLOADED state;
- Drop / Split / Merge / Equip / Consume actions where valid.

### Item cell
- 32×32 px;
- 24×24 icon;
- quantity at lower-right;
- 2 px condition strip along bottom when applicable;
- selected outline;
- disabled/unavailable overlay.

## 13.2 Container panel

**Logical size:** 584×280 px, centered.

Two-pane layout:

- left: player inventory;
- right: Storage Crate or Death Cache;
- central transfer controls/context.

Must distinguish:

- Storage Crate;
- Death Cache;
- ordinary transaction success;
- full/capacity rejection;
- stale/world-state-changed result;
- shared-container refresh.

Storage Crate displays:
- current/max weight: 100 kg;
- current/max volume: 120 u.

Death Cache pane displays:
- cache identity;
- most-recent marker if applicable;
- remaining contents;
- teammate-accessible state.

No direct living-player-to-player inventory browser UI is produced.

## 13.3 Crafting / repair panel

**Logical size:** 560×280 px.

Tabs/sections:

- Handcraft;
- Workbench Craft;
- Repair.

### Exact recipe entries

Tier 0:
1. Cordage
2. Stone Field Tool
3. Basic Spear
4. Thermal Wrap
5. Field Dressing
6. Storage Crate Kit
7. Workbench Kit

Tier 1 / Workbench:
8. Repair Patch
9. Habitat Kit
10. Power Unit Kit
11. Machine Kit

Each recipe row shows:

- output icon/name/quantity;
- input icons/quantities;
- owned vs required;
- station requirement;
- output capacity state;
- AVAILABLE or blocked reason.

Craft is transaction-immediate after confirmation; UI must not imply a production queue.

Repair detail shows:

- target item;
- current condition;
- one Repair Patch requirement;
- +25 condition result, capped at 100;
- failure reason.

## 13.4 Building catalog panel

**Logical size:** 204×252 px, docked left during build mode.

Exactly five entries:

- Storage Crate
- Workbench
- Habitat Room
- Compact Power Unit
- Atmospheric Water Condenser

Each entry shows:

- structure icon;
- source Construction Kit;
- available kit count;
- build cap state;
- selected state.

World remains visible to evaluate placement.

## 13.5 Machine panel — Atmospheric Water Condenser

**Logical size:** 360×220 px.

Shows:

- state: DISABLED / UNPOWERED / RUNNING / OUTPUT FULL;
- power demand: 5 PU when running;
- power availability;
- production progress to next 1 Clean Water;
- output count 0–4;
- Collect action;
- Enable/Disable action;
- blocked reason if unavailable.

Do not show offline accumulation because none exists.

## 13.6 Power Unit detail

**Logical size:** 280×160 px.

Shows:

- ON;
- total capacity 10 PU;
- active demand;
- Condenser within/outside eligible radius when selected through machine context.

No fuel bar, cable topology, battery charge or power-priority controls.

## 13.7 Map / recovery panel

**Logical size:** 560×300 px.

Shows:

- explored terrain/water shape;
- unexplored mask;
- local player;
- base marker;
- teammate markers when current team identity is available;
- Uninvestigated Ruin after LOCATED;
- Investigated Ruin;
- active Death Caches;
- most recent Death Cache distinction.

Does not show:

- every resource;
- every animal;
- exact remote hostile position;
- unseen ruin.

---

# 14. INTERACTION PROMPT / FAILURE FEEDBACK CONTRACT

## 14.1 Focus

A focused interactable gets:

- 1 px internal contour;
- target name/category;
- available verb.

No constant neon outline is applied to all interactables.

## 14.2 Channel progress

The prompt supports a small progress strip for:

- hand gather: 0.60 s;
- hard/tool gather: 1.00 s;
- consumable use: 1.00 s.

Canceled channel returns to normal with no false success feedback.

## 14.3 Failure feedback

Failures use:

- short state icon;
- one-line reason;
- optional affected component pulse.

Required reasons include, when supplied by authoritative gameplay:

- TOO FAR
- BLOCKED / UNREACHABLE
- MISSING / WRONG TOOL
- EXHAUSTED
- INVENTORY WEIGHT LIMIT
- INVENTORY VOLUME LIMIT
- STACK FULL
- INSUFFICIENT MATERIAL
- WORKBENCH REQUIRED
- ITEM BROKEN
- ITEM ALREADY FULL CONDITION
- INVALID REPAIR TARGET
- STALE / WORLD STATE CHANGED
- INVALID BUILD LOCATION
- INSUFFICIENT POWER
- OUTPUT FULL

UI must not silently retarget a different world object at commitment.

---

# 15. ITEM CONDITION / BROKEN READABILITY

Condition-bearing Phase 1 items:

- Stone Field Tool;
- Basic Spear;
- Thermal Wrap.

Presentation:

- 0–100 condition bar;
- exact value in item detail;
- BROKEN at 0 with broken glyph + desaturated/hatch overlay;
- no invented gameplay threshold for “worn” or “critical”; any intermediate bar coloration is purely continuous presentation and must not imply a rules threshold.

Death durability penalty feedback:

- equipped condition-bearing items: `-10 condition`;
- one concise post-death summary;
- item remains recoverable even at 0.

---

# 16. COMBAT / DAMAGE FEEDBACK

## 16.1 Player attacks

Unarmed and Basic Spear use separate attack presentation.

On authoritative resolution:

- successful hit: hostile hit response + concise hit confirmation;
- whiff: no false hit flash;
- spear whiff still visibly completes attack and stamina/cooldown consequence;
- spear condition loss feedback occurs only on successful hit.

## 16.2 Predator

ALERT:
- readable pose/marker before CHASE.

ATTACK WINDUP:
- the strongest hostile animation cue;
- must remain visible against night/Cold Rain;
- no identical pose used for idle.

DAMAGE:
- player gets short local hit cue;
- health update;
- source cue.

No screen-filling flash.

## 16.3 Death

Death sequence must communicate:

1. death occurred;
2. cause;
3. 5 s respawn countdown;
4. `-5% current-level XP progress` result;
5. equipped item durability loss;
6. carried/equipped items transferred to Death Cache;
7. recovery is possible.

On respawn, show one compact recovery card:

- active cache count;
- most recent cache marker;
- “Recover your gear” action hint;
- no claim that the cache is safe.

---

# 17. FOG / RUIN / DISCOVERY UI STATES

## 17.1 Ruin map states

- UNKNOWN: no exact normal marker.
- LOCATED: marker label `Uninvestigated Ruin`.
- INVESTIGATED: stronger discovered marker.

## 17.2 Ruin world feedback

On LOCATE:
- short landmark cue;
- do not block movement.

On Inspect:
- immediate interaction response;
- shared discovery banner;
- bounded mystery message communicating only:
  - not human landing artifact;
  - predates current colony;
  - earlier technological presence;
  - purpose/builders/fate unknown.

Ancient Alloy Shard:
- claimable item cue;
- if capacity blocks pickup, show it remains at the ruin;
- no duplicate reward feedback on repeated inspect.

## 17.3 Shared discovery

Remote teammate receives:

- compact “Shared Discovery” toast;
- updated map marker/state;
- no false personal XP toast unless that player personally satisfies the XP condition.

---

# 18. COLD RAIN / NIGHT UI

## 18.1 Cold Rain forecast

Approximately 60 s before onset:

- top-right weather icon enters FORECAST;
- compact toast: `Cold Rain approaching`;
- no full-screen modal.

## 18.2 Active Cold Rain

Show:

- ACTIVE weather icon;
- rain effect;
- temperature HUD state driven by actual player thermal value, not directly by rain label.

No direct HP-damage rain icon, because Cold Rain only affects health through temperature state.

## 18.3 Night

Show:

- time/day-night cue;
- darker world treatment;
- preserve player/hostile/build/interact readability;
- fog knowledge remains unchanged.

---

# 19. PROGRESSION / PROFESSION UI

## 19.1 XP

Meaningful XP event toast:

`+N XP · SOURCE`

Do not show XP for failed/canceled/no-op actions or ordinary inventory manipulation.

Current level must be visible in progression detail and may be compactly visible near the toast/progression area.

## 19.2 Level-up

Non-blocking banner:

`LEVEL 2`, `LEVEL 3`, or `LEVEL 4`.

Level does not visually decrease after death.

## 19.3 Skill unlock

Fieldcraft Basics:
- Level 2 + personal Expedition Band entry.

Maintenance Basics:
- Level 2 + successful Workbench repair that increases condition.

Feedback:
- 16×16 skill icon;
- name;
- “Prerequisite unlocked” language.

No stat-bonus panel is shown because these prototype skills have no Phase 1 hidden stat modifier.

## 19.4 Explorer quest

Quest:
**Chart the Unknown**

Objectives displayed in order:

1. Locate the Previous-Civilization Ruin.
2. Inspect the Ruin.
3. Return alive to Landing Module or Habitat Room.

Completion:

- `Explorer — Prototype` badge;
- +40 XP;
- profession-ready feedback.

No exclusive movement/fog/survival bonus is displayed.

## 19.5 Engineer quest

Quest:
**Bring Water Online**

Objectives:

1. Be present in shared foothold with Compact Power Unit + Atmospheric Water Condenser.
2. Personally enable the Condenser or interact with it while enabled and powered.
3. Personally collect at least 1 Clean Water produced by the Condenser.

Completion:

- `Engineer — Prototype` badge;
- +40 XP.

No exclusive machine recipe/power privilege is displayed.

## 19.6 No permanent class lock

Profession UI uses **unlocked badges**, not a mutually exclusive “choose one forever” selector.

Both Explorer and Engineer can be unlocked on one character.

---

# 20. CO-OP IDENTITY / SHARED-STATE READABILITY

Operational target: 2–4 players.

### NEW ASSET
**ID:** `coop_identity_markers`  
**Path:** `assets/phase1/ui/icons/coop_identity_markers.png`  
**Cell:** 12×12 px.

Presentation slots:

- LOCAL: chevron marker;
- TEAM A: circle;
- TEAM B: diamond;
- TEAM C: triangle.

Each slot also has a distinct accent value/color. Shape remains sufficient if hue perception is limited.

Rules:

- runtime assigns identity slot; Art/UI does not own identity authority;
- name label appears contextually, not as a permanently dominant banner;
- local player remains strongest world silhouette;
- shared Storage/Workbench/build/machine state uses team-neutral visual language;
- shared ruin discovery toast does not imply remote personal XP;
- Death Cache is team-accessible but keeps cache identity/recovery marker;
- concurrent transaction rejection uses visible stale/world-state-changed feedback rather than silently failing.

---

# 21. PLACEHOLDER ACCEPTANCE POLICY

## Production-facing mandatory assets

The normal PO-facing Phase 1 route must not use raw engineering rectangles/debug labels as the only visual for:

- player;
- terrain/water;
- six required resource-node types;
- passive wildlife;
- Territorial Predator;
- Previous-Civilization Ruin;
- Landing Module;
- Storage Crate;
- Workbench;
- Habitat Room;
- Compact Power Unit;
- Atmospheric Water Condenser;
- Death Cache;
- all 18 item icons;
- primary survival HUD;
- inventory/container/crafting/building/machine panels;
- fog/discovery;
- Cold Rain;
- co-op identity.

## Production-light acceptable

Simplified but coherent art is acceptable for:

- decorative rock/flora;
- small ambience;
- short construction confirmation effect;
- minor panel ornaments;
- secondary UI separators.

## Debug-only

Allowed only in developer/debug routes:

- raw collision boxes;
- ground/depth anchors;
- 32 px reference grid;
- state IDs;
- raw numeric AI labels;
- diagnostic renderer/camera text.

A Product Review candidate that still depends on debug primitives for core categories fails P1-ART-002 intent.

---

# 22. RESPONSIVE DESKTOP / MODAL BEHAVIOR

- Logical UI canvas remains 640×360.
- 2× and 3× are primary desktop QA scales.
- Modal panels center in logical canvas unless specified as docked.
- Panels never exceed 600×320 logical pixels.
- Interaction prompt/HUD remain visible above world unless a blocking modal intentionally owns input.
- Active modal receives input first.
- Build mode owns placement/cancel input and suppresses accidental world Interact.
- Combat action remains separate from ordinary Interact.
- Opening a panel must not visually imply simulation pause unless Game Design/Engineering explicitly provides pause state.
- Long reason text wraps within panel; no fractional text scale.

---

# 23. TECHNICAL ART METADATA REQUIRED PER WORLD ASSET

Every integration-ready world asset must provide a manifest entry containing:

- art ID;
- export path;
- frame width/height;
- frame count;
- authored facing list;
- frame/state order;
- ground/depth anchor;
- interaction anchor if distinct;
- whether horizontal mirroring is allowed;
- whether sprite is Y-depth sorted;
- collision relationship: `NONE / VISUAL_ONLY / GAMEPLAY_COLLIDER_DEFINED_ELSEWHERE`;
- allowed sampling: nearest only;
- required state names.

This metadata does not define canonical gameplay collision.

Technical Lead may choose file format/schema in #38/#31-derived work; these fields are required semantics.

---

# 24. FINITE PRODUCTION INVENTORY SUMMARY

## World / actor content

- 1 terrain/water atlas;
- 1 nonbuildable pattern;
- 6 resource-node sheets;
- 2 decorative comparison props;
- 1 fog-mask atlas;
- 1 Cold Rain FX sheet;
- 1 weather-dither pattern;
- 1 player sprite sheet;
- 1 Thermal Wrap player overlay;
- 1 passive wildlife sheet;
- 1 Territorial Predator sheet;
- 6 human structure/machine sheets;
- 1 Condenser output-level sheet;
- 1 build-preview pattern;
- 1 ruin landmark sheet;
- 1 ruin inspect marker;
- 1 Death Cache sheet;
- 1 ordinary world-drop base.

## Item/UI content

- exactly 18 item icons;
- 18 HUD/status icons;
- 15 interaction icons;
- 9 map-marker variants;
- 7 progression/profession icons;
- 4 co-op identity markers;
- 1 shared panel-skin set.

## Core panels

- survival HUD;
- equipment HUD;
- capacity HUD;
- world/session/weather HUD;
- interaction prompt;
- inventory;
- container/death-cache;
- crafting/repair;
- building catalog + world preview;
- Condenser;
- Power Unit detail;
- map/recovery;
- progression/quest.

No additional biome pack, profession tree, research UI, conveyor/logistics UI, vehicle UI, NPC UI, ranged-combat UI or advanced power-network UI belongs to Phase 1.

---

# 25. QA / READABILITY GATES

## Pixel integrity

### ART-QA-001 — 1×
Native 640×360 view has discrete authored pixels and readable primary UI.

### ART-QA-002 — 2×
1280×720 is exact integer upscale with no interpolation.

### ART-QA-003 — 3×
1920×1080 is exact integer upscale with no interpolation.

### ART-QA-004 — camera
Static world sprites do not shimmer or change apparent dimensions during camera motion.

## Category readability

### ART-QA-005
Player is readable against representative light/dark ground, Habitat scene, night and Cold Rain.

### ART-QA-006
Fiber/Food/Tree/Stone/Ore/Potable Water are distinguishable from non-interactive decoration.

### ART-QA-007
Passive wildlife, player and Predator are distinct at gameplay scale.

### ART-QA-008
Human structures and Previous-Civilization Ruin cannot be mistaken for the same origin/category.

### ART-QA-009
Landing state versus completed foothold visibly communicates progress.

## Interaction/UI

### ART-QA-010
Focused target shows identity + verb.

### ART-QA-011
Invalid interaction shows a useful reason and no false success state.

### ART-QA-012
Build preview communicates VALID/INVALID without hue alone.

### ART-QA-013
Inventory/container clearly identifies source/destination and capacity.

### ART-QA-014
Condition 0 item is unmistakably BROKEN.

### ART-QA-015
Condenser DISABLED / UNPOWERED / RUNNING / OUTPUT FULL are distinguishable without debug data.

## Survival/combat/recovery

### ART-QA-016
THIRSTY/DEHYDRATED, HUNGRY/STARVING, cold severity, EXHAUSTED and HEAVY/OVERLOADED can be read from HUD feedback.

### ART-QA-017
Predator ALERT and 0.55 s ATTACK WINDUP are visually distinguishable from idle/chase.

### ART-QA-018
Damage source and death cause are readable.

### ART-QA-019
Death Cache is distinguishable from ordinary world drops and active caches can be found through map/recovery UI.

## Exploration/progression/co-op

### ART-QA-020
UNEXPLORED / EXPLORED, Uninvestigated Ruin / Investigated Ruin are distinct.

### ART-QA-021
Cold Rain forecast/active states are readable without implying direct weather HP damage.

### ART-QA-022
Explorer and Engineer progression feedback cannot be interpreted as mutually exclusive permanent-class choice.

### ART-QA-023
2–4 player identities have both shape and accent differences.

### ART-QA-024
Remote shared ruin discovery gives shared-discovery feedback without false personal-XP feedback.

## PO-facing gate

### ART-QA-025
A reviewer can demonstrate the Phase 1 PO-facing flow without requiring collision boxes, debug labels, renderer diagnostics or source inspection.

---

# 26. OPEN QUESTIONS / CROSS-ROLE HANDOFFS

## OPEN QUESTION — Technical asset registry mapping

P1-TECH-002 / #38 will define data-driven content schema/registry.

This Art spec defines stable **art IDs and required metadata semantics**. Technical Design may map those IDs into registry/schema fields.

**Blocking P1-ART-002:** NO.  
**Blocking actual asset/runtime integration:** YES, until the relevant Technical Design gate is accepted.

## OPEN QUESTION — runtime font implementation

Art requires pixel-grid-aligned crisp text and whole-pixel placement. Bitmap/font packaging and loader details are Technical Design.

**Blocking spec:** NO.

## OPEN QUESTION — exact runtime structure collision footprints

World sprite canvas sizes in this document are visual bounds only. Gameplay/Technical Design owns collision/placement footprints.

**Blocking spec:** NO.

## DECISION NEEDED

None.

---

# 27. NON-GOALS

Do not produce or require:

- final full-game Art Bible;
- multiple production biomes;
- full alien-civilization visual language;
- complete profession art set;
- skill tree;
- colony research UI;
- advanced automation/conveyors;
- warehouse/logistics network UI;
- vehicle art;
- NPC colonists;
- ranged weapons;
- dodge/parry UI;
- downed/revive UI;
- acid/radiation/oxygen hazard art;
- production matchmaking UI;
- final endgame VFX.

---

# 28. ACCEPTANCE CRITERIA — ISSUE #37

- Every required Phase 1 gameplay entity has a visual/UI representation: **PASS**
- Production list is finite and tied to approved scope: **PASS**
- Player animation/state minimum set defined: **PASS**
- Terrain/water/resource/wildlife/hostile/ruin assets defined: **PASS**
- Habitat/storage/workbench/power/Condenser assets defined: **PASS**
- Exact 18-item icon set defined: **PASS**
- HUD component states defined: **PASS**
- Inventory/container/crafting/repair/build panel states defined: **PASS**
- Interaction prompts and invalid-action feedback defined: **PASS**
- Fog/night/Cold Rain presentation defined: **PASS**
- Death Cache/recovery feedback defined: **PASS**
- Explorer/Engineer progression feedback defined: **PASS**
- Co-op identity/shared discovery defined: **PASS**
- Responsive desktop layout/scale behavior defined: **PASS**
- Placeholder acceptance policy defined: **PASS**
- 2×/3× crispness/readability gates carried forward: **PASS**
- Artifact enables visual implementation without inventing gameplay rules: **PASS**
- Implementation performed by this task: **NO — correctly out of scope**
- Blocking open question: **NONE**
- Project Owner decision required: **NONE**

**Art Director result: READY FOR PRODUCER DoD VERIFICATION.**

---

# 29. HANDOFF

**Handoff to:** Producer / Project Manager

Recommended routing after Producer acceptance:

- use this artifact as the visual source for Phase 1 presentation/UI implementation;
- Technical Design maps stable art IDs/metadata into accepted registry/asset pipeline;
- Gameplay/Presentation implementation must not silently omit required states;
- QA derives visual acceptance cases from Section 25;
- asset creation/integration requires explicit downstream implementation/Art Production tasks; this specification alone does not authorize implementation.

**PROJECT OWNER ACTION: NONE**
