# Phase 1 Map Visual Readability Mockups

**TASK:** P1-UXSUP-004 / #111  
**ROLE:** B-PIX-01 / PIXEL_ARTIST_ANIMATOR / COMPANY_B  
**COORDINATING PM:** B-PM-01 / PM-B  
**LOCK:** PMB-P1-UXSUP-004-R1  
**BASELINE AT ACTIVATION:** `main@4c1e6a2732d096783f8ec8c354479fdda03d5e7d`  
**STATUS:** PROPOSAL ONLY — A-ART-01 retains final visual / UX authority.

---

## 1. Authority boundary

This artifact is a bounded Phase 1 map visual-readability proposal. It is not a runtime implementation, does not replace production art, and does not decide gameplay reveal semantics.

Authorized output is limited to:

- this document at `docs/uiux/phase-1-map-visual-mockups.md`;
- optional proposal-only images under `docs/uiux/mockups/map/**` if later needed.

This artifact does **not**:

- replace or edit `assets/phase1/**`;
- edit `src/**`;
- create a minimap, GPS, waypoint, scanner, pathfinding, or new cartography system;
- change fog reveal radius, reveal ownership, shared exploration, persistence, ruin discovery, or resource gameplay rules;
- decide which resources are visible remotely;
- add Phase 2 biomes, weather, landmarks, or content;
- claim final visual / UX acceptance.

Every mockup in this document is explicitly labeled **PROPOSAL**.

---

## 2. Sources fresh-read for this proposal

### Task / routing authority

- GitHub Issue #111 / P1-UXSUP-004.
- PM-B activation comment `5846561181`.
- Lock: `PMB-P1-UXSUP-004-R1`.
- Activation baseline: `main@4c1e6a2732d096783f8ec8c354479fdda03d5e7d`.

### Accepted Phase 1 visual / UI sources

- #37 / P1-ART-002 — DONE / DESIGN READY.
- `docs/art/phase-1-asset-ui-production-spec.md`.
- `docs/art/phase-1-visual-ui-readability-foundation.md`.
- `docs/design/phase-1-exploration-fog-weather-ruin.md`.

### Current map presentation inspected at the activation baseline

- `src/client/presentation/Phase1HudOverlay.ts`.
- `src/client/runtime/Phase1PresentationBinding.ts`.
- `src/client/presentation/Phase1ProductionAssets.ts`.

### Project Owner map findings

The bounded findings recorded by #110 / #111 are:

1. the map does not clearly communicate the first region's environmental character;
2. the first region should read with grass / flora / flower identity rather than generic ground;
3. resources are not clearly represented on the map;
4. current player position is not visible enough / absent;
5. explored vs unexplored / revealed area is not readable;
6. base / landing / home position is not visible enough / absent;
7. useful distance information is absent;
8. fog-of-war should feel more natural while preserving exploration readability.

---

## 3. Accepted visual and semantic constraints carried forward

The proposals below preserve these accepted Phase 1 rules:

- internal reference raster: 640×360;
- nearest-neighbor / point-equivalent sampling;
- whole internal-pixel UI alignment;
- integer display gates at 1× / 2× / 3×;
- no anti-aliasing on pixel-raster world/UI assets;
- critical information is never color-only;
- Phase 1 uses one coherent region, not a multi-biome pack;
- terrain production already provides ground bases A–D;
- decorative `world_flora_decor` and `world_rock_decor` exist specifically as non-interactive comparison scenery;
- Fiber Plant / Food Plant must remain distinguishable from decorative flora;
- potable water must not imply every visible water patch is drinkable;
- metal ore must differ from ordinary stone by silhouette/pattern, not hue alone;
- UNEXPLORED exposes no detailed terrain / resource / ruin information;
- explored map knowledge persists under the approved gameplay rules;
- rain/night do not erase explored map knowledge;
- UNKNOWN ruins do not expose an exact normal map marker;
- map semantics already include local player, Landing/Base, located/investigated ruin, active Death Cache, and supported teammate identity markers;
- the accepted map does **not** require permanent markers for every resource, animal, unseen ruin, or remote hostile.

Any resource-map visibility or distance behavior beyond those accepted semantics remains a proposal and requires the appropriate gameplay authority.

---

# 4. PROPOSAL 1 — Current problem summary / comparison frame

**TRACE TO FINDING:** Project Owner findings 1–8.

### VISUAL INTENT

Make explicit why the current map panel does not yet satisfy the Project Owner's map-reading goal, without treating current implementation as a gameplay defect.

### CURRENT BASELINE OBSERVED

At `main@4c1e6a...`, the map panel presentation is primarily a **status / evidence panel**, not a spatial terrain map:

- panel title is currently `Map / Recovery`;
- the presentation renders a horizontal marker strip using existing map-marker atlas entries;
- current marker strip uses local player, Landing/Base, Uninvestigated Ruin, and Investigated Ruin icon slots;
- fog is represented primarily by a text label such as shared exploration revision/state;
- ruin state is represented by text;
- Death Cache and Shared Discovery may appear as text labels;
- no terrain field, vegetation pattern, player location plotted in map space, explored silhouette, natural fog edge, distance cue, or resource hierarchy is visibly composed in the current panel renderer.

### PROPOSAL DIAGNOSTIC WIREFRAME

```text
CURRENT PRESENTATION CHARACTER

+--------------------------------------------------------------+
| MAP / RECOVERY                                               |
| [PLAYER] [BASE] [RUIN ?] [RUIN ✓]                            |
| Shared exploration · revision <runtime>                      |
| Uninvestigated Ruin / Investigated Ruin                      |
| Death Cache ...                                              |
| Shared Discovery                                             |
+--------------------------------------------------------------+

Main gap:
semantic status is present,
but spatial reading / environmental identity is weak or absent.
```

### WHAT CHANGES

Nothing in runtime under this proposal. This comparison frame establishes the visual problem that later proposals address.

### WHAT DOES NOT CHANGE

- current gameplay state;
- marker semantics;
- fog authority;
- persistence;
- exploration rules;
- production assets.

### A-ART DECISION REQUIRED

Confirm that Phase 1 should move from a status-strip map presentation toward a **bounded spatial map composition** while preserving the accepted pixel UI language.

### A-GD SEMANTIC DEPENDENCY IF ANY

None for the diagnosis itself.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Any approved spatial map requires the existing authoritative presentation data to be projected into positions / explored geometry without making the client authoritative.

---

# 5. PROPOSAL 2 — First-region environmental identity

**TRACE TO FINDING:** Project Owner findings 1–2.

### VISUAL INTENT

Make the first Phase 1 region immediately read as a coherent place rather than a flat generic field, using already-compatible terrain and decorative language.

### VISUAL CONCEPT

Use three map-space layers inside already-explored territory:

1. **Ground variation layer**
   - quiet patchwork derived from the accepted ground A–D family;
   - low-contrast 2–4 px clusters at native map scale;
   - no checkerboard strong enough to look like movement tiles.

2. **Grass / flora identity layer**
   - sparse 1–3 px grass tufts;
   - small flower/flora accent clusters;
   - uneven grouping rather than uniform noise;
   - visual accents remain visibly subordinate to actual resource markers.

3. **Terrain-cluster / landmark layer**
   - rock-decor-like clusters;
   - shoreline / water shapes where already revealed;
   - existing Landing/Base landmark;
   - large known structures may contribute recognizable silhouettes if already part of the accepted map information.

### PROPOSAL MAP PATCH

```text
PROPOSAL — FIRST-REGION IDENTITY

  ·  '     ,                 ground variation
 .'  +  ·       '            + = flower/flora accent
   ,      ·  ^                ^ = decorative rock/terrain cluster
      +            ~~~        ~ = revealed water / shoreline
 ·   '      ^      ~~~
      ·  +             [HOME]

Pattern goal:
organic clusters, not a regular tile checker.
```

### WHAT CHANGES

Only the visual treatment proposed for a future approved map composition:

- explored ground gains map-scale terrain variation;
- decorative grass/flora/flowers become environmental identity cues;
- landmark clusters create memorable shape breaks.

### WHAT DOES NOT CHANGE

- no new biome;
- no new harvestable grass or flower;
- no new resource node;
- no new terrain gameplay state;
- no new collision or movement rule;
- no production asset replacement.

Grass / flowers in this mockup are **visual region identity only** unless gameplay already defines a specific element as a harvestable resource.

### A-ART DECISION REQUIRED

Approve:

- acceptable vegetation density;
- ground pattern contrast;
- flower/flora accent language;
- how strongly decorative terrain should appear relative to markers;
- whether accepted world-art motifs can be simplified into map-space motifs.

### A-GD SEMANTIC DEPENDENCY IF ANY

None for purely decorative environmental identity.

If any proposed flora icon would represent an interactable resource rather than decoration, A-GD must confirm the information/reveal semantics first.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Implementation should derive visible terrain only from map information the player is already authorized to know. Decorative map texture must not expose hidden resource or landmark data.

---

# 6. PROPOSAL 3 — Player-position marker

**TRACE TO FINDING:** Project Owner finding 4.

### VISUAL INTENT

Make the current player's position the fastest marker to identify, while keeping it distinct from Base, resource, ruin, Death Cache, and teammate markers.

### PROPOSED MARKER LANGUAGE

Use the already-accepted **local-player chevron identity**, strengthened by value structure rather than glow:

```text
PROPOSAL — LOCAL PLAYER, 12×12 CELL INTENT

....##......
...####.....
..##..##....
.....##.....
.....##.....
....####....
...######...
....####....
.....##.....
............
............
............

# = high-value player shape
. = transparent / map beneath
```

Recommended visual structure:

- directional chevron / pointer silhouette;
- 1 px dark interior separation or keyline where needed;
- center notch / cutout so it does not read as a filled resource diamond;
- no soft glow;
- optional 1 px stepped contrast plate only where terrain value would otherwise swallow the marker.

### GRAYSCALE / VALUE CHECK

Player marker must remain readable with hue removed:

- player = high-value pointer silhouette + dark cut / keyline;
- Base = framed landmark silhouette;
- resources = smaller category glyphs;
- teammate markers retain their approved identity shapes.

### WHAT CHANGES

Proposes stronger local-player hierarchy and map placement.

### WHAT DOES NOT CHANGE

- no player tracking rule change;
- no heading/rotation behavior is mandated by this mockup;
- no teammate identity change;
- no runtime authority change.

### A-ART DECISION REQUIRED

Approve the local-player marker silhouette, value contrast, optional keyline/plate, and whether orientation should visually rotate.

### A-GD SEMANTIC DEPENDENCY IF ANY

If marker rotation is intended to communicate authoritative player facing/heading, A-GD should confirm that this is useful and semantically appropriate. Otherwise keep it as a stable position marker.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Use authoritative local-player position. If marker rotation is not approved, do not infer a heading solely for visual effect.

---

# 7. PROPOSAL 4 — Base / Landing / Home marker

**TRACE TO FINDING:** Project Owner finding 6.

### VISUAL INTENT

Make the Phase 1 return point recognizable immediately, with a visual hierarchy clearly different from the local player and optional resource markers.

### PROPOSED MARKER LANGUAGE

Use the existing Landing/Base semantic slot, presented as a **framed landmark** rather than a pointer or small resource glyph.

```text
PROPOSAL — HOME / LANDING

   ########
  ##......##
 ##..####..##
 ##.######.##
 ##.##..##.##
 ##.######.##
  ##......##
   ########

Read:
large framed footprint / landing symbol,
not a directional arrow and not a gatherable node.
```

Hierarchy:

- larger visual footprint than ordinary resource markers;
- bilateral / architectural shape;
- stable high-contrast frame;
- optional short `BASE` or `HOME` legend text in the map legend, not permanently printed over terrain.

### WHAT CHANGES

Proposes stronger visual prominence for the existing Landing/Base map meaning.

### WHAT DOES NOT CHANGE

- respawn rules;
- build zone;
- ownership;
- fast travel;
- teleport;
- pathfinding;
- new home/base mechanics.

### A-ART DECISION REQUIRED

Approve exact silhouette and relative scale/priority versus player, ruin, Death Cache, and resources.

### A-GD SEMANTIC DEPENDENCY IF ANY

None if this is only the already-approved Landing/Base marker.

Any additional “home” state beyond the current base anchor would require Game Design authority and is out of scope.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Bind only to the current authoritative Landing/Base position already known to the presentation layer.

---

# 8. PROPOSAL 5 — Resource visual family, conditional on visibility authority

**TRACE TO FINDING:** Project Owner finding 3.

### VISUAL INTENT

Provide a coherent resource-marker visual family **only if A-GD authorizes the relevant resource information to appear on the map**.

This proposal does not decide whether resources are visible, when they become visible, whether depleted nodes remain visible, or whether resources can be remotely discovered.

### GENERIC HIERARCHY

Resource markers should remain below Player/Base/Ruin/Death Cache priority.

Common family rules:

- smaller than Base;
- no directional pointer silhouette;
- one shared 1 px visual footprint convention;
- category identity primarily by silhouette/pattern;
- hue may support category but never be the only distinction.

### OPTIONAL CATEGORY DISTINCTIONS

If Game Design approves category visibility, the current Phase 1 resource families could be represented with compact shape cues:

```text
PROPOSAL — OPTIONAL RESOURCE FAMILY

PLANT / FIBER    FOOD PLANT      WATER        TIMBER
    \/             <* >          (~~)          |Y|

STONE            METAL ORE
  /\              /#\
 /__\            /#__\

Shape/pattern first.
Color may reinforce but must not define identity alone.
```

A generic single-resource marker is also valid if A-GD approves resource visibility but does not approve category-level information.

### DISCOVERED / UNAVAILABLE DISTINCTION

Only use an unavailable/depleted visual state if that state is already authorized for map presentation.

Pixel-safe proposal if supported:

- available = solid glyph;
- unavailable/depleted = same glyph with deliberate 1 px cut pattern or sparse interior;
- never rely only on red/gray recolor.

### WHAT CHANGES

Visual proposal for resource hierarchy and optional category markers.

### WHAT DOES NOT CHANGE

- no resource-reveal rule;
- no scanner;
- no automatic remote resource map;
- no permanent every-resource pin requirement;
- no harvesting rule;
- no node respawn/depletion rule;
- no new resource category.

### A-ART DECISION REQUIRED

Approve:

- whether one generic resource glyph or category-specific family is visually preferable;
- marker scale and value;
- silhouette family;
- available/unavailable treatment if gameplay semantics authorize it.

### A-GD SEMANTIC DEPENDENCY IF ANY

**REQUIRED.**

A-GD must decide:

- whether resources appear on the map at all;
- when a resource becomes map-known;
- whether category identity is exposed;
- whether depleted/unavailable state is exposed;
- whether resource markers persist.

B-PIX-01 does not decide any of these.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Render only resource state/data explicitly approved by A-GD and provided by authoritative runtime/map knowledge. Do not read hidden generation data merely because it exists client-side.

---

# 9. PROPOSAL 6 — Explored vs unrevealed visual state

**TRACE TO FINDING:** Project Owner finding 5.

### VISUAL INTENT

Make known terrain and unknown territory unmistakable even in grayscale, while preserving the exact existing exploration/reveal semantics.

### PROPOSED THREE-VALUE VISUAL MODEL

This is a **visual model**, not a new gameplay-state model:

1. **Explored interior**
   - normal terrain value/pattern;
   - ground/flora/known landmarks readable.

2. **Fog boundary band**
   - belongs visually to the unknown side;
   - irregular stepped pixel edge;
   - one darker value band plus sparse breakup.

3. **Unrevealed interior**
   - opaque / near-opaque dark patterned field;
   - no terrain, resource, or ruin detail.

```text
PROPOSAL — EXPLORED / UNKNOWN

explored terrain                 unknown
. ' +  ^  . '             ################
  ·  [P]    +          ####.#.#############
.  ^      .         ####.##################
  .  [BASE]       ###.#####################
. +  .  '       ###########################

                 ^ irregular boundary sits on
                   the unknown side
```

### VALUE-ONLY DISTINCTION

Even if all hue is removed:

- explored terrain retains mid-value texture;
- boundary is a darker stepped band;
- unknown interior is the darkest flat/patterned mass.

### WHAT CHANGES

Only proposes how the existing explored/unknown distinction is drawn.

### WHAT DOES NOT CHANGE

- reveal radius;
- radial reveal behavior;
- shared team union;
- persistence;
- respawn reveal;
- join/rejoin behavior;
- UNKNOWN ruin behavior;
- resource reveal;
- authoritative explored mask.

### A-ART DECISION REQUIRED

Approve the number of visual value bands, dither density, and edge breakup amount.

### A-GD SEMANTIC DEPENDENCY IF ANY

None if the treatment maps exactly to the already-approved explored versus unknown state.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Use the authoritative explored mask as the hard semantic boundary. Decorative edge breakup must remain on the unknown side and must never expose additional map data.

---

# 10. PROPOSAL 7A — Distance presentation alternative A: selected-target readout

**TRACE TO FINDING:** Project Owner finding 7.

### VISUAL INTENT

Provide useful distance context without turning the map into GPS/pathfinding or cluttering every marker.

### PROPOSED PRESENTATION

Only the currently selected/inspected eligible marker gets a distance line:

```text
PROPOSAL — SELECTED TARGET

[BASE]  LANDING / BASE
DISTANCE: <runtime-approved value>
```

Possible approved forms, subject to A-GD:

- exact integer distance;
- rounded distance;
- approximate value.

No route line is implied.

### WHAT CHANGES

Adds a bounded information slot for selected target distance.

### WHAT DOES NOT CHANGE

- no waypoint;
- no compass route;
- no pathfinding;
- no auto-navigation;
- no reveal behavior;
- no marker eligibility rule.

### A-ART DECISION REQUIRED

Approve typography, selected-marker emphasis, and where the distance line sits relative to legend/detail text.

### A-GD SEMANTIC DEPENDENCY IF ANY

**REQUIRED.**

A-GD must decide whether Phase 1 exposes exact, rounded, or approximate distance and which marker types are eligible.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Compute/display distance only from authoritative, already-known positions and the approved distance convention. Do not reveal hidden marker positions to calculate distance.

---

# 11. PROPOSAL 7B — Distance presentation alternative B: compact distance band

**TRACE TO FINDING:** Project Owner finding 7.

### VISUAL INTENT

Provide lower-precision orientation if exact numbers are considered too GPS-like for Phase 1.

### PROPOSED PRESENTATION

Selected eligible marker receives one compact band:

```text
PROPOSAL — DISTANCE BAND

[BASE] LANDING / BASE
[ NEAR ]

or

[ MID ]

or

[ FAR ]
```

Band identity must use word + border/pattern, not color alone.

Thresholds are **not defined here**.

### WHAT CHANGES

Adds qualitative selected-target distance feedback.

### WHAT DOES NOT CHANGE

- no exact distance;
- no route/path;
- no waypoint system;
- no new navigation mechanics.

### A-ART DECISION REQUIRED

Approve chip/label treatment and whether this presentation is visually clearer than a numeric readout.

### A-GD SEMANTIC DEPENDENCY IF ANY

**REQUIRED.**

A-GD must define whether qualitative distance is acceptable and, if so, the semantic thresholds or source data. B-PIX-01 does not define `NEAR / MID / FAR` thresholds.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Use only A-GD-approved thresholds and already-known marker positions.

---

# 12. PROPOSAL 8 — Natural pixel-safe fog of war

**TRACE TO FINDING:** Project Owner finding 8.

### VISUAL INTENT

Replace a rigid/debug-like visual impression with an organic frontier while keeping the fog semantically exact and pixel-crisp.

### PIXEL-SAFE TREATMENT

Use the existing authoritative explored mask and the accepted fog-mask language as the semantic base.

On the **unknown side only**, draw:

1. **primary hard frontier**
   - stepped silhouette aligned to whole pixels;
   - no bilinear feather.

2. **secondary value band**
   - 2–4 px equivalent visual depth at the authored map scale;
   - irregular thickness from pixel clusters;
   - never crosses into explored territory to hide known information.

3. **sparse edge breakup**
   - isolated dark/medium pixels attached to the unknown side;
   - controlled, not random animated noise.

4. **optional controlled dithering**
   - only where compatible with A-ART direction;
   - every dither pixel aligns to internal raster;
   - no soft alpha blur.

### PROPOSAL FOG EDGE

```text
PROPOSAL — PIXEL-SAFE NATURAL FRONTIER

explored                         unknown
. . +  ^                   ################
 .   .                 #####*###############
   +               ####**###################
.        .      ###*########################
 [P]         ####**#########################
           ###*#############################

# = full unknown
* = secondary unknown-side band / breakup
explored side stays fully readable
```

### WHAT CHANGES

Fog edge silhouette, value layering, and breakup treatment.

### WHAT DOES NOT CHANGE

- reveal radius;
- reveal shape authority;
- persistent explored state;
- shared exploration;
- what information is hidden;
- what counts as explored;
- no extra “partially revealed” gameplay state.

### A-ART DECISION REQUIRED

Approve:

- edge irregularity;
- value band count;
- dither amount;
- whether fog uses a stable pattern or position-seeded pattern;
- contrast against first-region terrain.

### A-GD SEMANTIC DEPENDENCY IF ANY

None if all decoration stays strictly on the unknown side of the authoritative boundary and no new reveal state is implied.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Fog noise must be deterministic/stable enough not to shimmer while the camera/map is static. Keep whole-pixel sampling and nearest-neighbor output. Never let decorative noise alter authoritative explored data.

---

# 13. PROPOSAL 9 — Combined Phase 1 map composition

**TRACE TO FINDING:** Project Owner findings 1–8.

### VISUAL INTENT

Verify the full hierarchy together so terrain, exploration state, important positions, optional resources, fog, distance, and legend remain readable as one composition.

### COMBINED MOCKUP

```text
PROPOSAL — COMBINED MAP COMPOSITION

+------------------------------------------------------------------+
| MAP / DISCOVERY                                                  |
|------------------------------------------------------------------|
|  .  +   ^       .          |###############                      |
|    .        r              |*##############                      |
| .      [HOME]       ^      |**#############                      |
|       .     ·              |*##############                      |
|  +          [P>]           |###############                      |
|       r?         .         |###############                      |
| .  ^        .       ~~~    |###############                      |
|                  ~~~~~     |###############                      |
|------------------------------------------------------------------|
| SELECTED: [HOME] LANDING / BASE                                  |
| DISTANCE: <PROPOSAL — A-GD approved form only>                   |
|------------------------------------------------------------------|
| LEGEND                                                           |
| [P>] YOU   [HOME] BASE   [RUIN] RUIN   [CACHE] DEATH CACHE      |
| [r] RESOURCE — ONLY IF A-GD AUTHORIZES MAP VISIBILITY            |
+------------------------------------------------------------------+

Terrain characters:
. ' · = ground / grass variation
+     = decorative flower/flora accent
^     = terrain/rock cluster
~     = already-revealed water
#/*   = unrevealed fog treatment
```

### HIERARCHY ORDER

1. local player;
2. selected important target;
3. Landing/Base;
4. ruin / Death Cache / approved teammate markers;
5. optional A-GD-authorized resources;
6. terrain identity;
7. decorative flora.

This order mirrors the accepted Phase 1 principle that critical gameplay information must dominate decoration.

### WHAT CHANGES

Proposes one integrated spatial map layout and legend hierarchy.

### WHAT DOES NOT CHANGE

- gameplay semantics;
- fog authority;
- resource visibility rules;
- marker eligibility;
- world generation;
- navigation system;
- production assets.

### A-ART DECISION REQUIRED

Approve the integrated hierarchy:

- marker relative sizes;
- map terrain contrast;
- legend density;
- selected-target treatment;
- fog contrast;
- visual balance between environment and markers.

### A-GD SEMANTIC DEPENDENCY IF ANY

Required only for:

- resource visibility/category information;
- chosen distance behavior;
- any marker selection behavior beyond already-approved semantics.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Treat this composition as a presentation projection of authoritative known data. The client map must not become a source of gameplay truth.

---

# 14. PROPOSAL 10 — 1× / 2× / 3× readability gate

**TRACE TO FINDING:** all Project Owner findings.

### VISUAL INTENT

Keep the map readable under the same accepted integer-scale discipline as the rest of Phase 1.

## 1× — authored/native

Required pass conditions:

- 12×12 map-marker silhouettes remain distinguishable;
- local-player pointer does not merge with Base/resource/ruin markers;
- Base reads as a landmark rather than a resource;
- resource category glyphs, if approved, remain identifiable by silhouette/pattern;
- explored/unknown boundary reads without hue;
- decorative grass/flora never becomes marker-like noise;
- legend text does not obscure the spatial map field;
- fog edge uses hard whole pixels.

## 2× — exact nearest-neighbor

Required pass conditions:

- all 1× pixels replicate exactly;
- no smoothing around fog or markers;
- terrain texture remains subordinate;
- value hierarchy remains clear at normal desktop viewing distance.

## 3× — exact nearest-neighbor

Required pass conditions:

- no fractional offsets;
- no line weight unexpectedly becoming visually dominant;
- controlled dithering remains intentional rather than noisy;
- marker/terrain hierarchy is still the same as at 1×.

### VALUE / GRAYSCALE SELF-CHECK

At all three scales:

- local player must remain first-read;
- Base must remain structurally different from player;
- optional resources must remain lower-priority and distinct;
- explored/unknown must remain obvious;
- fog boundary must remain visible without any color cue.

### WHAT CHANGES

Nothing in gameplay. This is a review gate for any approved visual implementation.

### WHAT DOES NOT CHANGE

No fractional scaling, blur, soft glow, or new responsive cartography behavior is introduced.

### A-ART DECISION REQUIRED

Approve final native marker/terrain contrast and the acceptable density of flora/fog texture at all three scales.

### A-GD SEMANTIC DEPENDENCY IF ANY

Only the semantic items already called out in Proposals 5, 7A, and 7B.

### A-GE IMPLEMENTATION NOTE IF APPROVED

Reuse the accepted 640×360 internal-pixel / integer-scale presentation contract. Do not stretch the map layer fractionally to fit arbitrary desktop dimensions.

---

# 15. A-ART decision checklist

A-ART-01 retains final visual / UX authority and should explicitly approve/reject:

1. spatial map composition versus current status-strip-only presentation;
2. first-region ground variation density;
3. grass/flora/flower accent density and symbol language;
4. local-player marker silhouette/keyline;
5. Base marker hierarchy and scale;
6. optional resource visual family;
7. explored/unknown value separation;
8. fog edge irregularity / banding / dithering;
9. legend density and panel hierarchy;
10. 1× / 2× / 3× final readability.

No B-PIX-01 self-approval is implied.

---

# 16. A-GD semantic dependencies

B-PIX-01 does **not** decide:

- whether resource nodes are visible on the map;
- when they become known;
- whether resource category identity is exposed;
- whether depleted/unavailable resource state is map-visible;
- whether resource pins persist;
- whether exact/rounded/approximate distance is exposed;
- whether qualitative distance bands exist;
- distance thresholds;
- any new marker selection behavior;
- any new reveal state.

Those are explicit A-GD-01 review points if the corresponding visual proposal is selected.

Existing accepted exploration/fog/ruin semantics remain unchanged.

---

# 17. A-GE implementation boundary if proposals are approved

If Company A approves any proposal, implementation should:

- use authoritative, already-known player/world/map state;
- preserve existing shared exploration and persistence;
- keep presentation read-only / derived;
- render only map information that gameplay authority permits;
- keep unknown terrain/resource/ruin information hidden;
- use whole-pixel positions and nearest-neighbor sampling;
- avoid runtime-generated blur/glow that breaks the accepted pixel language;
- avoid any hidden client-side scan of generation data to populate the map;
- preserve current production assets unless Company A separately authorizes an asset revision.

---

# 18. Self-review

## Requested findings represented

- [x] current problem summary;
- [x] first-region environmental identity;
- [x] grass / flower / flora visual treatment;
- [x] ground variation / terrain clusters / landmarks;
- [x] player marker;
- [x] Base / Landing / Home marker;
- [x] resource visual family, explicitly conditional on A-GD visibility semantics;
- [x] explored versus unrevealed;
- [x] at least two distance alternatives;
- [x] natural pixel-safe fog-of-war;
- [x] combined composition;
- [x] legend;
- [x] 1× / 2× / 3× checks.

## Marker-confusion check

- [x] local player uses pointer/chevron hierarchy;
- [x] Base uses architectural/framed landmark hierarchy;
- [x] optional resources use smaller category glyph hierarchy;
- [x] critical distinctions do not depend on hue alone.

## Fog / exploration check

- [x] explored versus unknown survives grayscale;
- [x] fog is whole-pixel and nearest-neighbor compatible;
- [x] fog breakup is visually natural but does not create a new partial-reveal gameplay state;
- [x] unexplored interior exposes no terrain/resource/ruin detail;
- [x] no reveal rule is changed.

## Environment/content check

- [x] first-region flora treatment is visual identity only;
- [x] no new harvestable grass/flower content was invented;
- [x] existing Fiber Plant / Food Plant resource identity remains separate from decorative flora;
- [x] no Phase 2 biome expansion.

## Scope check

- [x] no `assets/phase1/**` replacement;
- [x] no `src/**` edit;
- [x] no new gameplay semantics authored by B-PIX-01;
- [x] no final UX acceptance claim;
- [x] no wholesale map/game redesign.

---

# 19. Exact artifact / handoff

**Exact artifact path:**  
`docs/uiux/phase-1-map-visual-mockups.md`

**Optional proposal images committed in this handoff:**  
None.

**Required route:**  
B-PIX-01 → B-PM-01 / PM-B verification → A-ART-01 visual/UX review.  
A-GD-01 is consulted for the explicitly identified resource/distance semantics.  
A-GE-01 remains the downstream implementation owner only if Company A approves a proposal.

**PROJECT_OWNER_ACTION:** NONE.
