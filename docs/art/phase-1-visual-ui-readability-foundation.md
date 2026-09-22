# P1-ART-001 — Phase 1 Visual Language, HUD, and Interaction Readability Foundation

**Task:** P1-ART-001  
**Feature:** Phase 1 Visual Language, HUD, and Interaction Readability Foundation  
**Role:** Art Director / UI-UX / Technical Art  
**Status:** READY FOR PRODUCER REVIEW  
**Milestone:** Phase 1 — Vertical Slice  
**Source Issue:** #30  
**Source Plan:** `docs/phase-1-vertical-slice-plan.md`

---

# Information classification

## CONFIRMED

- ProZ0 is a 2D pixel-art, top-down/3/4 survival sandbox for desktop browser.
- Phase 1 must deliver a 30–60 minute playable vertical slice that is understandable directly from the browser build.
- The Phase 1 player-facing loop is:
  `Land → Explore nearby → Gather → Manage needs/capacity → Return → Craft/repair → Build first habitat → Prepare expedition → Reveal new territory → Face hazard/hostile encounter → Reach one ruin/discovery → Return or die → Recover dropped inventory → Continue same persistent world`.
- Phase 1 requires basic terrain, water, trees/plants, ore, food source, wildlife, one hostile encounter, one ruin, fog of war, day/night, one weather event, survival needs, inventory, basic containers, crafting/repair, first habitat, workbench, power unit, first useful machine, death/drop/recovery, early progression and hosted co-op.
- Visual readability is more important than decorative complexity.
- Phase 0 pixel-art rendering constraints remain the baseline:
  - 32 × 32 internal-pixel visual reference cell;
  - 640 × 360 reference internal world raster;
  - 16:9 presentation;
  - integer presentation scaling;
  - nearest-neighbor / point-equivalent sampling;
  - pixel-stable presentation;
  - continuous simulation independent from art grid;
  - ground-anchor Y-depth ordering.
- Phase 1 does not require final-art completeness.

## CONSTRAINTS

- Visuals must not invent gameplay rules.
- UI must visualize gameplay state supplied by Game Design/runtime; it must not derive or become canonical authority for survival, inventory, building, damage, fog, machine or world state.
- Pixel presentation must preserve Phase 0 movement/camera responsiveness and crispness.
- A PO-facing Phase 1 build must no longer read primarily as an engineering test room.
- The art scope must remain proportional to one vertical slice.

## OPEN QUESTIONS — NON-BLOCKING FOR THIS FOUNDATION

1. Exact numeric thresholds for survival warning/critical states are owned by Game Design.
2. Exact interaction priority rules and interaction vocabulary are owned by P1-DES-001 / follow-up Game Design.
3. Exact craft/build recipe contents, machine state model, profession quest content and weather gameplay effects are downstream Game Design outputs.
4. Exact asset pipeline paths, atlas budgets, texture-memory budgets, bitmap-font pipeline and browser rendering budgets are owned by Technical Lead / specialized ADRs.
5. Exact authored player direction count (for example 4-direction versus 8-direction art) remains downstream animation/content scope; logical facing may remain richer than authored animation direction.
6. Exact co-op identity mapping for more than the Phase 1 operational 2–4 players is deferred, but the visual system must remain extensible.

## DECISION NEEDED

None blocking P1-ART-001.

---

# VISUAL SPEC

## FEATURE

Phase 1 Visual Language, HUD, and Interaction Readability Foundation

## PURPOSE

Define the minimum production-facing visual and UI language required for the Phase 1 vertical slice so that:

- a new player can identify what they are, where they are, what matters, what can be interacted with and what is dangerous;
- the Project Owner can evaluate the vertical slice directly in a browser without reading debug labels or source code;
- terrain, resources, hazards, structures, machines, ruins and actors remain visually distinct;
- survival/logistics information is readable without overwhelming exploration;
- inventory/crafting/building interaction patterns are consistent;
- fog/discovery and co-op identity communicate shared exploration;
- the slice feels like an intentionally art-directed game while remaining well below final-art production scope;
- all pixel-art rendering constraints validated in Phase 0 remain intact.

---

# PLAYER INFORMATION TO COMMUNICATE

At any ordinary gameplay moment, the presentation must enable the player to understand the following categories without relying on debug overlays:

1. **Self**
   - player position;
   - facing/intent when relevant;
   - current interaction target;
   - whether the player is healthy, threatened, exhausted, thirsty, hungry, temperature-stressed or overloaded when the runtime reports those states.

2. **World**
   - walkable terrain versus obvious blocking geometry;
   - water versus ground;
   - traversable space versus dangerous/environmental hazard;
   - explored versus unexplored territory.

3. **Resources**
   - gatherable plant/organic resource;
   - wood/tree resource;
   - ore/mineral resource;
   - food source;
   - dropped item/death-drop recovery object.

4. **Actors**
   - local player;
   - co-op teammate;
   - neutral/passive wildlife;
   - hostile actor/threat.

5. **Human structures**
   - landing module;
   - habitat room;
   - corridor/connection;
   - storage;
   - workbench;
   - power unit;
   - first useful machine.

6. **Mystery/discovery**
   - previous-civilization ruin must read as categorically different from human-built habitat and natural terrain;
   - discovery must feel significant enough to act as the vertical-slice mystery hook.

7. **Actionability**
   - what is hoverable/selectable;
   - what can be gathered/stored/crafted/built/used/recovered;
   - whether an action is currently valid, blocked, unavailable or completed;
   - why an unavailable action is unavailable when the runtime can provide the reason.

---

# VISUAL DIRECTION

## Phase 1 art-language target

The target is **readable frontier pixel art**:

- grounded survival readability;
- compact, functional human technology;
- natural terrain with restrained texture noise;
- strong silhouettes at gameplay scale;
- clear separation between natural, human-built, hazardous and mysterious/alien categories;
- hopeful pioneering tone with moments of loneliness and tension;
- visible progression from wreckage/landing survival toward the first coherent habitat.

The slice should feel authored and intentional without pretending to be the final full-game art set.

## Visual priority order

When visual priorities compete:

1. player and immediate threat;
2. interaction target;
3. survival-critical warning;
4. terrain/hazard boundary;
5. resource/readable object category;
6. structure/machine state;
7. ambience and decoration.

Decoration may never reduce the readability of higher-priority information.

## Shape before color

Category identity must be established first by:

- silhouette;
- footprint;
- contour;
- value grouping;
- motion/pose;
- icon or pattern where needed.

Color is a reinforcing channel, not the only channel.

---

# TARGET VISUAL SCALE

Phase 1 **inherits the Phase 0 visual reference scale**.

- visual reference cell: **32 × 32 internal pixels**;
- reference player frame: **32 × 48 internal pixels** unless a later approved Art Production Spec changes it with explicit integration review;
- ground/depth anchor remains at the player's feet/contact point;
- world assets may occupy fractions or multiples of the 32 px reference cell;
- gameplay movement remains continuous and must never be quantized to the art reference grid.

## Scale hierarchy

Recommended Phase 1 visual families:

- micro detail / pickup indicator: 4–12 px;
- small resource/pickup: 8–24 px;
- medium prop/container/workbench component: 24–40 px;
- player/wildlife actor: approximately 32 × 48 reference frame class;
- tall vegetation/ruin prop: 48–96 px visible height where needed;
- structure module: authored in 32 px reference increments while preserving continuous world placement semantics defined by gameplay.

These ranges define visual proportion, not collision bounds.

---

# TARGET RESOLUTION / PIXEL INTEGRITY

## Reference raster

**640 × 360 internal pixels, 16:9**

Reference displays:

- 640 × 360 → 1×;
- 1280 × 720 → 2×;
- 1920 × 1080 → 3×;
- 2560 × 1440 → 4×.

## Hard rules

- nearest-neighbor / point-equivalent world sampling;
- no bilinear softening;
- no runtime sprite downsampling for ordinary world assets;
- no fractional world-surface scaling in reference presentation;
- no pixel shimmer from fractional camera/sprite sampling;
- authored pixels remain discrete at 1×/2×/3×;
- presentation snapping never mutates simulation coordinates;
- device-pixel-ratio handling must preserve crisp authored pixels.

## UI pixel policy

HUD and in-world UI must align to the internal-pixel grid.

Text/icon rendering must not become soft at 2× and 3× presentation.

If the final font pipeline uses a bitmap font or pixel font, glyph placement must use integer internal-pixel alignment.

Exact font technology is Technical Design scope.

---

# VISUAL STATES

The visual system uses a shared semantic state vocabulary. Gameplay decides when a state applies; Art defines how the state is communicated.

## Universal semantic states

For interactable/UI/world state where applicable:

- **NORMAL**
- **HOVERED**
- **SELECTED / TARGETED**
- **ACTIVE / IN USE**
- **AVAILABLE**
- **UNAVAILABLE**
- **BLOCKED**
- **WARNING**
- **CRITICAL**
- **DAMAGED**
- **DEPLETED**
- **DISABLED / UNPOWERED**
- **COMPLETE**
- **NEW / DISCOVERED**
- **REMOTE / TEAMMATE-OWNED OR TEAM-RELATED** where gameplay requires distinction.

No critical state may rely on hue alone.

Use combinations of:

- contour/outline;
- icon;
- fill pattern;
- value change;
- animation cadence;
- state text;
- shape marker.

---

# WORLD VISUAL LANGUAGE

## Terrain

Terrain is the visual baseline and must remain lower priority than actors/interactables.

Requirements:

- low-to-medium local contrast;
- restrained high-frequency 1 px noise;
- readable walkable ground plane;
- edges/transitions strong enough to identify material change;
- world variation must not create false interactable cues.

Phase 1 needs only the terrain families required by the one vertical-slice region.

No multi-biome production library is required.

## Water

Water must be categorically readable from walkable ground through at least two cues:

- distinct value/material treatment;
- coherent edge/bank treatment;
- restrained repeating motion or highlight pattern if animation is used.

Animation must not create shimmer that resembles rendering instability.

Exact gameplay traversability is Game Design/Technical state, not inferred from color alone.

## Trees / plants / food-source vegetation

Plant categories must distinguish:

- decorative/background flora;
- gatherable resource flora;
- food-source flora where relevant.

Gatherability may be reinforced by interaction highlight; world art should not require every gatherable to glow continuously.

Tall vegetation uses a documented ground anchor for Y-depth sorting.

## Ore / mineral resources

Ore/mineral nodes must differ from ordinary rocks by:

- silhouette or embedded cluster pattern;
- material/value accent;
- interaction state when targeted.

Do not use color-only ore differentiation for critical categories.

## Wildlife

Wildlife needs:

- silhouette distinguishable from player;
- readable ground contact;
- locomotion/idle pose or minimal movement state sufficient to read as an actor;
- passive/neutral versus hostile semantic distinction through behavior/silhouette/state cue, not only color.

Final species art and complete animation sets are deferred.

## Hazards

Hazards must communicate:

1. source;
2. affected space/boundary where gameplay exposes one;
3. severity state when runtime exposes severity;
4. whether danger is persistent, intermittent or currently active when that distinction exists.

Possible channels:

- boundary pattern;
- animated world cue;
- icon/marker;
- environmental VFX;
- HUD warning.

Do not use full-screen tint as the only hazard cue.

Exact hazard rules and thresholds are Game Design scope.

## Previous-civilization ruin

The ruin is the Phase 1 mystery landmark and must be immediately distinguishable from:

- natural rocks/terrain;
- human landing wreckage;
- human habitat modules.

Required visual principles:

- clearly non-human silhouette/material language;
- stronger compositional landmark value than ordinary resource props;
- controlled accent or pattern that creates curiosity without requiring final lore-specific art;
- interaction/discovery cue that becomes available only according to gameplay state.

This spec intentionally does **not** decide the final alien aesthetic, culture, symbol system or narrative explanation.

---

# HUMAN HABITAT / BUILDING / MACHINE VISUAL GRAMMAR

The Phase 1 human-building language must communicate functional growth:

**landing/wreckage → shelter/habitat → connected utility base**

## Shared human-construction cues

- modular geometry;
- visible connection logic;
- repeated structural motifs;
- practical/repairable frontier construction;
- readable entrances and interaction faces;
- status areas for power/condition where needed.

## Landing module

Must read as:

- starting anchor;
- human-made;
- more temporary/landing-oriented than later habitat;
- the place associated with respawn/base origin when gameplay uses it.

## Habitat room

Must read as:

- enclosed/safe human space;
- first meaningful step beyond survival wreckage;
- visibly more permanent than the landing state.

## Corridor / connection

Must make module connectivity visually understandable.

The art must support connection points/seams without deciding the gameplay adjacency rules.

## Storage

Must read as logistics/storage before interaction.

Use container geometry, access face, label/iconography or stacking language.

## Workbench

Must read as hands-on fabrication/repair workspace, visually distinct from storage and automated machine.

## Power unit

Must have a clear visual state surface for at least:

- powered/operating;
- unpowered/offline;
- warning/fault if gameplay provides that state.

Do not rely only on green/red status color.

## First useful machine

Must visually communicate:

- machine category;
- operational versus inactive/unpowered state;
- input/output or work area if the gameplay exposes those concepts;
- stronger progression value than the workbench.

Exact machine type and behavior are Game Design scope.

## Base progression readability

At a gameplay-scale screenshot, the player/PO should be able to tell that a scene containing a connected habitat, storage, workbench, power and machine represents meaningful progression over the initial landing state.

---

# FOG OF WAR / DISCOVERY

## Core semantics

Phase 1 must visually distinguish at minimum:

- **UNEXPLORED**
- **REVEALED / DISCOVERED**

If Game Design introduces additional states such as seen/mapped/surveyed, those require follow-up UI specification and must not be invented here.

## World presentation

Unexplored territory must not expose actionable world information.

The fog boundary should:

- be visually clear;
- remain subordinate to the player and immediate hazards;
- avoid soft filtering that breaks pixel integrity;
- transition at a pixel-stable boundary or controlled dither/mask pattern.

## Discovery feedback

When new territory or a significant POI is revealed, feedback should include at least two channels where appropriate:

- world reveal transition;
- short HUD/map notification;
- landmark/POI marker state;
- co-op shared-discovery feedback.

The exact reward or gameplay trigger is not defined by Art.

## Shared discovery

For hosted co-op, a discovery that becomes shared must have visual semantics distinguishable from a purely local transient effect.

The runtime is responsible for authoritative discovery state; UI only visualizes it.

---

# CO-OP PLAYER IDENTITY

Phase 1 operational target: 2–4 players.

## Required identity channels

Each player must be distinguishable through a combination of:

- accent color;
- name/short label when needed;
- small shape/glyph/marker identity;
- optional outline/chevron in visually dense scenes.

Do not rely only on color.

## Local versus teammate

The local player must retain the strongest immediate readability.

Teammates may use:

- lighter identity marker;
- nameplate shown contextually or at useful range;
- map marker if map UI is present.

Persistent nameplates should not dominate the world at close range.

## Shared actions

Shared discovery, death-drop assistance and shared base activity should use team-readable confirmation, but must not create large VFX that obscure hazards or interaction targets.

Exact ownership/permission semantics remain Game Design/Technical Design scope.

---

# HUD INFORMATION HIERARCHY

The HUD should remain quiet during ordinary exploration and become more explicit as risk rises.

## Layer 1 — persistent survival status

The persistent survival cluster must support:

- health;
- food;
- water;
- temperature exposure state;
- carrying capacity/load.

Stamina may be persistent or context-sensitive depending on P1-DES-001, but its visual component must be defined and available.

## Layer 2 — contextual action state

Shown near the interaction focus / lower central safe area:

- current target;
- action prompt;
- action progress if gameplay uses hold/progress;
- blocked/unavailable reason if runtime supplies one;
- gather/use/store/recover verb or equivalent approved interaction language.

## Layer 3 — tool/equipment state

Near quick-access/equipment region:

- active tool/item;
- condition/durability when relevant;
- unusable/broken/warning state.

## Layer 4 — situational alerts

Temporary but high-priority:

- damage;
- critical survival state;
- hazard exposure;
- overload/capacity problem;
- weather warning;
- death;
- new discovery.

Alerts must not permanently occupy large screen area.

## Layer 5 — progression/discovery notifications

Low-frequency:

- XP/level event;
- profession/quest progress where Phase 1 requires it;
- ruin/discovery record;
- shared discovery update.

These are lower priority than immediate survival/damage alerts.

---

# HUD LAYOUT

Reference layout is defined at the 640 × 360 internal canvas and must remain readable at 2× and 3×.

## Safe zones

### Top-left
**Survival status cluster**
- health;
- food;
- water;
- temperature;
- optional compact status icons.

### Top-right
**Session/world/context cluster**
- day/night/time cue if exposed;
- weather cue;
- compact co-op/team indicators;
- discovery/map notification anchor.

### Bottom-left
**Equipment / active tool / quick-use context**
- active item;
- condition/durability;
- optional compact item count.

### Bottom-center
**Interaction prompt**
- focused target name/category;
- primary action;
- short reason when unavailable.

### Bottom-right
**Carrying / logistics summary**
- current load versus capacity;
- inventory-open affordance;
- overflow/overload state.

This is the Phase 1 foundation layout; downstream UI production may make modest spacing adjustments without changing information priority.

## Screen-coverage rule

Normal exploration HUD should preserve the majority of the world view.

Large modal panels are reserved for:

- inventory/container;
- crafting/repair;
- building selection;
- progression/quest;
- map/discovery if implemented as a panel.

No large modal should pretend the game simulation has paused unless Game Design explicitly defines pause behavior.

---

# UI COMPONENT RULES

## Status bars / meters

A survival meter must have:

- icon or text label;
- fill/amount representation where continuous quantity exists;
- semantic warning state;
- critical state;
- empty/depleted state if valid.

Warning/critical thresholds come from gameplay data.

Do not hard-code visual thresholds separately from gameplay state.

## Icons

Recommended Phase 1 icon authoring classes:

- compact status icon: **12 × 12 or 16 × 16 internal px**;
- item/category icon: **16 × 16 or 24 × 24 internal px**;
- larger recipe/build preview: **32 × 32 internal px** or multiples.

Rules:

- strong silhouette;
- minimal internal noise;
- 1 px authored details used intentionally;
- no anti-aliasing;
- state overlays must not destroy the base icon.

## Panels

Panel language:

- opaque or near-opaque enough for text readability;
- 1 px internal border/separator system;
- compact spacing based on 4 px internal increments;
- selected row/slot must be readable without color alone;
- disabled entries remain legible but clearly inactive.

Exact skin/palette is Phase 1 production-art scope, not required to be final here.

---

# INVENTORY / CONTAINER PRESENTATION

## Inventory

Must communicate:

- item identity;
- stack quantity where applicable;
- condition where applicable;
- category/type where needed;
- player current load versus capacity;
- selection/focus;
- action availability.

## Recommended pattern

Use a **slot/list hybrid** suitable for mouse + keyboard:

- item cell with icon;
- stack count;
- condition strip/icon if applicable;
- detail pane for selected item;
- global load/capacity meter.

The final input behavior is Game Design/Engineering scope.

## Container interaction

When a container is open, the player must understand:

- which side/state represents player inventory;
- which represents container;
- capacity/load for each where applicable;
- selected item;
- valid transfer direction/action;
- failure reason when transaction is rejected.

Two-panel comparison is the preferred Phase 1 pattern because it makes logistics readable.

This is presentation only; transaction authority remains outside UI.

## Death drop

A death-site inventory must visually read as a **recoverable inventory object**, not ordinary loose decoration.

Required states:

- unrecovered;
- targeted/selected;
- recoverable/available;
- empty/recovered or removed according to gameplay state.

Do not decide ownership lock or lifetime rules here.

---

# CRAFTING / REPAIR PRESENTATION

## Crafting panel

Must communicate:

- recipe list;
- selected recipe;
- output;
- required ingredients;
- owned versus missing amounts;
- required station if applicable;
- craft availability;
- reason unavailable;
- action confirmation/progress if gameplay uses it.

## Repair

Repair UI must communicate:

- target equipment/tool;
- current condition;
- required resource/cost;
- result or restored state;
- unavailable reason.

No separate visual system should be invented for repair if the crafting/detail-panel pattern can be reused.

---

# BUILDING PRESENTATION

Building mode must use an explicit world-space preview/ghost state.

## Minimum placement states

- **VALID**
- **INVALID / BLOCKED**
- **CONNECTABLE / SNAP-RELEVANT** if gameplay exposes connection state
- **INSUFFICIENT REQUIREMENTS** if gameplay exposes resource/power/precondition failure
- **PLACED / CONFIRMED**

## Visual channels

Placement validity may combine:

- outline;
- fill/dither pattern;
- icon;
- footprint/boundary;
- short text reason.

Never communicate valid/invalid solely by green versus red.

## Building selection panel

Must show:

- buildable identity;
- category;
- compact preview;
- required resources;
- availability;
- connection/power prerequisite where gameplay defines one.

This spec does not define construction cost or placement rules.

---

# MACHINE / POWER UI

Machine interaction must have a common status header supporting:

- active/operating;
- inactive;
- unpowered;
- blocked/faulted;
- damaged if relevant;
- input/output status if the machine gameplay uses those concepts.

Power presentation must make it possible to tell why a machine is not working when runtime supplies the reason.

Use at least:

- icon/state label;
- non-color state shape/pattern;
- local machine visual feedback.

Avoid requiring a full production power-network overlay in Phase 1 unless later authorized.

---

# INTERACTION FEEDBACK

## Hover / focus

An actionable world object may receive:

- 1 px internal outline or contour treatment;
- small contextual marker;
- cursor/focus response;
- target name/action prompt.

Do not apply strong pulsing/glowing outlines to every interactable at rest.

## Selection

Selected/targeted state must be stronger than hover and stable enough for a player to track while moving nearby.

## Gather

Feedback should include:

- target response;
- progress if gameplay uses time;
- resource gain confirmation;
- depleted/changed state where applicable.

## Store / transfer

Feedback should include:

- source/destination clarity;
- transaction success;
- transaction failure reason when provided;
- capacity change.

## Craft

Feedback should include:

- recipe availability;
- craft action;
- output confirmation;
- missing requirement feedback.

## Build

Feedback should include:

- world-space ghost;
- footprint;
- validity;
- confirmation/placement response;
- resulting persistent structure state.

## Use / machine

Feedback should include:

- interactable focus;
- current machine state;
- use/action confirmation.

## Recover

Death-drop recovery must have:

- identifiable recoverable object;
- target state;
- transfer/recovery confirmation;
- clear empty/completed state.

---

# DAMAGE / DEATH / RECOVERY FEEDBACK

## Damage

Minimum Phase 1 damage feedback can combine:

- short actor flash/hit pose;
- compact directional or local hit cue if gameplay exposes source;
- health change;
- short screen-edge or HUD response.

Avoid long full-screen flashes.

## Critical condition

When player survival reaches a gameplay-defined critical state:

- persistent HUD cue;
- readable icon/state label;
- controlled pulse allowed;
- no dependence on hue alone.

## Death

Death presentation must communicate:

1. the player has died;
2. carried inventory remains at the death site;
3. respawn occurs at base;
4. recovery is possible.

The exact timing/respawn control flow is Game Design scope.

## Death-drop marker

After respawn, the prior death location must be identifiable through the approved map/world UI when gameplay makes it known to the player.

Art defines a readable marker; Game Design defines what information the player is allowed to know.

---

# DAY / NIGHT / WEATHER READABILITY

## Day/night

Lighting/color grading may change atmosphere but must preserve:

- player silhouette;
- obstacle boundary;
- interactable readability;
- hazard cue;
- HUD legibility.

Night should feel darker and riskier without becoming visually unusable.

Do not solve night solely by reducing global brightness until important objects disappear.

## Weather

The one approved Phase 1 weather event must use:

- world VFX;
- ambient treatment;
- HUD/status warning if gameplay impact warrants one.

Weather VFX must not:

- obscure the player;
- hide interaction prompts;
- introduce pixel-resampling shimmer;
- cover critical hazard boundaries;
- reduce UI readability.

Exact weather type and gameplay effect are downstream design decisions.

---

# PLAYER / ACTOR FEEDBACK

## Player silhouette

The player remains the highest-priority ordinary world silhouette.

Required:

- readable against light/dark/common terrain;
- readable against human structures;
- distinct from wildlife/hostile actors;
- stable ground anchor;
- optional team identity accents that do not replace silhouette.

## Locomotion states

Art pipeline must support at minimum:

- idle;
- moving.

Future/conditional Phase 1 states may include:

- interaction/gather;
- tool use;
- damage;
- death;
- carry/overloaded cue;
- combat.

The exact gameplay state list and animation authoring count must be finalized in the follow-up production spec after P1-DES-001 subsystem rules are available.

## Hostile actor

The one Phase 1 hostile encounter must be readable as a threat before or during engagement through at least two of:

- silhouette;
- posture/motion;
- proximity/alert state;
- hostile marker when gameplay permits;
- attack telegraph when gameplay defines one.

Art does not define combat timing or attack rules.

---

# ANIMATION STATES

P1-ART-001 defines categories, not final frame counts.

## Player minimum

- idle;
- movement;
- interact/tool-use placeholder or production-light state if required by the final Phase 1 interaction vocabulary;
- damage;
- death.

## Wildlife minimum

- idle;
- movement.

## Hostile minimum

- idle/roam;
- alert/engaged if gameplay exposes it;
- attack telegraph/action if required by combat design;
- damage/death if required by the slice.

## World minimum

- water motion if used;
- machine active state;
- machine inactive/unpowered state;
- discovery/fog reveal transition;
- weather motion.

Animation timing must not own gameplay authority.

No animation may delay movement/interactions unless Game Design explicitly defines that behavior.

---

# ACCESSIBILITY / READABILITY REQUIREMENTS

## Color independence

Critical distinctions require a second channel beyond hue.

Examples:

- valid build = shape/pattern/icon + color;
- critical survival = icon/pulse/text + color;
- co-op identity = marker/glyph/name + accent color;
- hostile = silhouette/behavior + accent;
- discovered/unexplored = mask/state treatment + value.

## Contrast

UI text and icons should target high practical contrast at 2× presentation.

Where applicable to normal text on UI panels, target approximately WCAG 4.5:1 contrast or better.

Large/iconic UI may use lower ratios only when shape/value separation remains clearly readable.

## Motion

- no essential information communicated only through animation;
- avoid high-frequency flashing;
- repeated warning pulses should remain controlled and readable;
- do not use rapid full-screen flashes.

## Text

- avoid long text blocks during active survival/exploration;
- interaction prompts should be concise;
- warnings should name the problem, not only show an icon;
- important reasons for unavailable actions should be readable in plain language when runtime provides them.

## Dense-scene rule

In a visually dense base or resource cluster, the player and selected interaction target must remain readable without disabling all decoration.

---

# PLACEHOLDER VS PRODUCTION ASSET POLICY

Phase 1 is not final-art production, but the PO-facing build cannot remain an engineering fixture.

## Tier A — must be production-facing for the vertical slice

The default playable build should have intentional, coherent art for:

- player;
- core ground/water treatment;
- trees/plants/ore/food-source category;
- wildlife;
- hostile encounter;
- ruin landmark;
- landing module;
- habitat room/corridor;
- storage;
- workbench;
- power unit;
- first machine;
- death-drop object/marker;
- primary HUD shell;
- survival icons;
- inventory/container/crafting/building core UI;
- interaction highlight/prompts;
- fog/discovery mask.

These assets may be “vertical-slice quality” rather than final full-game quality.

## Tier B — acceptable simplified production-light treatment

May use restrained simplified assets if coherent:

- secondary decorative props;
- minor terrain variants;
- small ambience effects;
- secondary item icons not central to the demo;
- non-critical UI decoration.

## Tier C — debug placeholder only

Allowed in developer/debug modes, not the normal PO-facing route:

- collision boxes;
- raw rectangles replacing core game categories;
- debug text as the only explanation of interaction;
- reference-grid overlays;
- raw engineering labels;
- diagnostic anchors.

## Rule

A core Phase 1 category must not be visually represented only by an engineering primitive in the Product Review candidate.

---

# ASSETS REQUIRED

## World / environment

- primary ground terrain set for one region;
- water surface/edge treatment;
- tree resource;
- gatherable plant;
- food-source plant/object;
- ore/mineral node;
- non-interactive rock/debris for comparison;
- hazard visual family required by approved slice;
- one weather VFX family;
- fog/unexplored mask;
- discovery reveal effect;
- one ruin landmark set.

## Actors

- player base sprite/silhouette;
- co-op identity overlays/markers;
- one wildlife actor;
- one hostile actor;
- damage/death feedback assets as required;
- death-drop/recovery object.

## Human structures

- landing module;
- habitat room;
- corridor/connector;
- storage;
- workbench;
- power unit;
- first useful machine;
- placement ghost/outline states;
- powered/unpowered/state indicators.

## UI

- survival status icon set:
  - health;
  - food;
  - water;
  - stamina;
  - temperature;
  - carrying capacity;
- active tool/equipment condition component;
- interaction prompt component;
- inventory panel;
- container panel;
- crafting/repair panel;
- building selection/placement UI;
- machine/power status panel;
- discovery notification;
- co-op player marker set;
- death/recovery messaging;
- weather/day-night indicator if gameplay exposes these as UI state.

---

# NEW ASSETS

P1-ART-001 itself does **not** authorize asset production.

The following asset families are required downstream and should be converted into CREATE/MODIFY manifests by P1-ART-002 / Issue #37 or implementation-specific work:

- Phase 1 player production-light sprite set;
- one-region terrain/resource set;
- wildlife + hostile set;
- ruin landmark set;
- first-habitat structure set;
- first-machine/power status set;
- Phase 1 HUD/UI icon/component set;
- fog/discovery presentation assets;
- weather visual set;
- co-op identity markers.

---

# MODIFIED ASSETS

Existing Phase 0 engineering primitives are not automatically production assets.

P1-ART-002 should explicitly identify whether any Phase 0 placeholder:

- is retained as debug-only;
- is replaced;
- is promoted into a production-light asset with documented changes.

No implicit promotion of test fixtures to final Phase 1 art.

---

# UI STATES

## Survival component

- normal;
- warning;
- critical;
- empty/depleted where applicable;
- disabled/not-applicable where legitimate.

## Item slot

- default;
- hover;
- selected;
- unavailable/locked;
- condition warning;
- stack count;
- new/recent if later required.

## Recipe/build entry

- available;
- selected;
- missing requirements;
- unavailable/locked;
- active/progress if gameplay uses it;
- complete/confirmed.

## Interaction prompt

- no target;
- target available;
- target unavailable;
- target blocked;
- hold/progress if gameplay uses it;
- success confirmation.

## Machine

- active;
- inactive;
- unpowered;
- blocked/faulted;
- damaged if gameplay requires;
- selected/interacting.

## Fog/discovery

- unexplored;
- discovered;
- new-discovery feedback.

## Co-op

- local;
- teammate;
- teammate warning/down/dead only if gameplay later defines those states;
- shared discovery notification.

---

# TECHNICAL FORMAT

## Raster assets

Preferred baseline:

- PNG with alpha;
- authored at native internal-pixel resolution;
- no anti-aliased edges;
- no runtime downsample requirement;
- clean transparent pixels;
- nearest/point sampling.

## UI

UI may use:

- pixel-raster icons;
- bitmap/pixel font;
- runtime panel primitives that obey the pixel grid.

The exact implementation technology is Technical Design scope.

## Asset metadata

Any world sprite requiring depth sorting must expose/document:

- visual bounds;
- ground/depth anchor;
- optional interaction anchor;
- optional attachment points only when downstream integration requires them.

Any animated sprite must expose:

- stable frame bounds;
- stable ground anchor;
- state/frame mapping.

## Naming

Production asset naming convention must be finalized with Technical Lead before mass export.

Until then, downstream asset work must use descriptive stable names and avoid temporary names such as `final2.png`, `new.png`, or `test.png`.

---

# INTEGRATION

Presentation consumes authoritative/runtime state and renders it.

Required separation:

`authoritative/runtime state → presentation model → UI/world visual state`

Presentation must never become canonical authority.

Examples:

- inventory panel displays transaction result; it does not decide canonical inventory contents;
- building ghost displays placement validity; it does not decide placement validity;
- machine UI displays power state; it does not decide power simulation;
- fog renderer displays discovery state; it does not decide canonical discovered territory;
- survival HUD displays need states; it does not own need values;
- co-op markers display player identity; they do not decide player authority.

## Required runtime data contracts for future integration

Art/UI expects downstream systems to provide semantic presentation state rather than forcing UI to reverse-engineer rules.

Examples:

- `healthCurrent / healthMax / healthState`;
- `foodState`, `waterState`, `staminaState`, `temperatureState`;
- `loadCurrent / loadCapacity / loadState`;
- `interactionTarget / interactionAction / availability / blockedReason`;
- `itemConditionState`;
- `placementState / placementReason`;
- `machineOperationalState`;
- `fogDiscoveryState`;
- `playerIdentity / teamMarker`;
- `discoveryEvent`.

Exact schemas/names are Technical Design scope; these are required presentation concepts, not mandated APIs.

---

# PHASE 1 SCOPE

P1-ART-001 includes:

- world category visual grammar;
- player/actor readability;
- human habitat/machine grammar;
- ruin/discovery readability principles;
- fog/discovery visual semantics;
- co-op identity semantics;
- HUD information hierarchy;
- inventory/container/crafting/building presentation patterns;
- interaction state language;
- damage/death/recovery feedback;
- day/night/weather readability;
- placeholder-versus-production policy;
- pixel integrity;
- accessibility/readability constraints;
- downstream asset-family scope.

---

# DEFERRED

Deferred from this foundation:

- complete final palette;
- complete biome library;
- complete player customization;
- final alien civilization style bible;
- full animation library;
- full combat VFX language;
- full sound/audio UI language;
- advanced logistics UI;
- warehouse/vehicle UI;
- advanced automation overlays;
- production research tree UI;
- complete profession UI;
- full accessibility settings menu;
- final localization layout;
- controller/touch UI;
- complete map survey-state taxonomy;
- final asset atlas/export pipeline;
- final multi-resolution UI policy beyond the Phase 0/1 reference raster.

---

# NON-GOALS

P1-ART-001 does not:

- define gameplay thresholds;
- define recipe costs;
- define interaction priority;
- define damage/combat rules;
- define machine simulation;
- define building placement rules;
- define fog reveal gameplay radius;
- define progression balance;
- define co-op authority;
- select renderer architecture;
- produce the final full-game art catalog;
- implement UI or assets.

---

# ACCEPTANCE CRITERIA

## AC-P1-ART-001 — Category distinction

A Phase 1 screenshot/test scene can visually distinguish:

- terrain;
- water;
- resource;
- hazard;
- human structure;
- machine;
- ruin;
- actor.

**PASS:** each category uses silhouette/value/material/state cues sufficient to avoid category ambiguity.

## AC-P1-ART-002 — Player priority

Player remains identifiable against representative light/dark terrain and base scenes at 2× reference presentation.

## AC-P1-ART-003 — Resource readability

Gatherable resources are visually distinguishable from non-interactive decoration without requiring constant glow.

## AC-P1-ART-004 — Hazard readability

Hazard source/boundary/state uses at least two communication channels where gameplay exposes them.

## AC-P1-ART-005 — Human versus ruin distinction

Human habitat and previous-civilization ruin are unmistakably different categories at gameplay scale.

## AC-P1-ART-006 — Base progression

Landing state and connected first-habitat state visibly communicate progression in a side-by-side or before/after review.

## AC-P1-ART-007 — Survival HUD completeness

HUD specification includes visual components for:

- health;
- food;
- water;
- stamina;
- temperature;
- carrying capacity.

## AC-P1-ART-008 — Logistics HUD

Carrying/load state and equipment condition have defined presentation.

## AC-P1-ART-009 — Interaction vocabulary

Visual states exist for gather/store/craft/build/use/recover and available/unavailable/blocked feedback.

## AC-P1-ART-010 — Inventory/container pattern

A consistent presentation pattern is defined for player inventory and container transfer, including capacity and transaction feedback.

## AC-P1-ART-011 — Craft/repair pattern

Crafting/repair UI exposes output, requirements, owned/missing state and availability.

## AC-P1-ART-012 — Building pattern

Building presentation defines world ghost/preview, valid/invalid state, requirement feedback and confirmation.

## AC-P1-ART-013 — Machine/power readability

Machine visual/UI states include at least active, inactive and unpowered, plus reason/state channel when available.

## AC-P1-ART-014 — Fog/discovery

Unexplored and discovered territory have explicit visual semantics, and significant discovery feedback is defined.

## AC-P1-ART-015 — Co-op identity

2–4 players can be visually distinguished through more than hue alone, and shared-discovery feedback is defined.

## AC-P1-ART-016 — Damage/death/recovery

Visual specification communicates damage, death, inventory drop and recoverability without inventing gameplay timing.

## AC-P1-ART-017 — Day/night readability

Player, interactables, hazards and UI remain readable under both day and night presentation.

## AC-P1-ART-018 — Weather readability

Weather presentation cannot obscure player, hazards or interaction UI.

## AC-P1-ART-019 — Pixel integrity

Phase 0 crispness remains a hard requirement at 1×/2×/3×:

- nearest/point equivalent;
- integer reference scaling;
- no resampling blur;
- no static-object shimmer from camera sampling.

## AC-P1-ART-020 — Accessibility

Critical state distinctions are not color-only; interaction/warning states have non-hue cues.

## AC-P1-ART-021 — PO-facing quality

Core gameplay categories in the normal Phase 1 PO-facing build are represented by coherent production-light art/UI rather than raw engineering rectangles/debug labels.

## AC-P1-ART-022 — Vertical-slice scope

Asset scope is limited to the content needed for one Phase 1 region, one hostile encounter, one ruin, first habitat, first machine and core UI.

## AC-P1-ART-023 — Authority separation

UI/presentation specifications consume state and do not define canonical gameplay authority.

## AC-P1-ART-024 — Downstream readiness

P1-ART-002 and implementation tasks can derive asset/UI work from this foundation without inventing visual hierarchy or category semantics.

---

# DOWNSTREAM DEPENDENCIES / HANDOFF NOTES

## For Game Designer / P1-DES-001

No blocking request is required to complete this Art foundation.

Downstream Art Production Spec should consume:

- final Phase 1 interaction vocabulary;
- survival state semantics/threshold states;
- exact hostile combat state set;
- weather selection/effects;
- exact build/machine interaction states;
- death/recovery player-facing information;
- progression/profession UI needs.

## For Technical Lead / P1-TECH-001

No blocking request is required to complete this Art foundation.

Downstream Technical Design must preserve:

- 640 × 360 reference raster or explicitly approved equivalent;
- integer 1×/2×/3× crispness;
- nearest/point sampling;
- pixel-stable camera/world rendering;
- separation of presentation from canonical state;
- semantic presentation state delivery;
- ground/depth anchors;
- browser DPR crispness.

Technical Lead should later define:

- asset paths/loading;
- atlas policy;
- font pipeline;
- batching/texture budgets;
- UI implementation framework;
- performance budgets.

## For P1-ART-002 / Issue #37

P1-ART-002 should convert this foundation plus approved P1-DES subsystem specs into:

- concrete asset inventory;
- file paths;
- sprite dimensions;
- direction/state counts;
- animation frame budgets;
- UI component measurements;
- final Phase 1 palette/material guidance;
- export naming;
- integration manifests;
- explicit CREATE/MODIFY asset instructions.

---

# SELF-CHECK AGAINST ISSUE #30

- target Phase 1 pixel-art language and reference scale: PASS
- player silhouette/readability and state feedback: PASS
- terrain/water/resource/wildlife/hazard/ruin readability: PASS
- habitat/building/power/machine visual grammar: PASS
- fog-of-war visual behavior: PASS
- selection/hover/interaction feedback: PASS
- HUD hierarchy for health/food/water/stamina/temperature/carrying capacity: PASS
- inventory/container/crafting/building patterns: PASS
- damage/death/drop/recovery feedback: PASS
- day/night/weather readability: PASS
- co-op player distinction/shared-discovery feedback: PASS
- placeholder-vs-production asset policy: PASS
- 1×/2×/3× pixel integrity and DPR rules: PASS
- accessibility/readability constraints: PASS
- no gameplay rule invention: PASS
- implementation not performed: PASS
- artifact suitable for downstream visual-production specification: PASS
- blocking open question: NONE
- PO decision required: NONE

**Art Director result: READY FOR PRODUCER DoD VERIFICATION.**

---

# HANDOFF

**Handoff to:** Producer / Project Manager

**Recommended downstream use:**

- Producer verifies P1-ART-001 DoD.
- P1-ART-001 becomes a source artifact for Technical architecture constraints, subsystem design reviews and P1-ART-002.
- P1-ART-002 should not begin final asset enumeration until required gameplay state sets from Wave B are sufficiently approved.

**PROJECT OWNER ACTION: NONE**
