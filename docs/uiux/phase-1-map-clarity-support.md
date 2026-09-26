# P1-UXSUP-003 — Phase 1 Map Clarity Support Specification

**Task:** P1-UXSUP-003 / Issue #110  
**Owner:** B-TD-01 / TECHNICAL_DESIGNER / COMPANY_B  
**Coordinating PM:** B-PM-01 / PM-B  
**Lock:** PMB-P1-UXSUP-003-R1  
**Activation baseline:** `main@4c1e6a2732d096783f8ec8c354479fdda03d5e7d`  
**Authorized artifact:** `docs/uiux/phase-1-map-clarity-support.md`  
**Status:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING  
**Authority boundary:** documentation/proposal only; no runtime/world-authority changes, no gameplay-semantics approval, no final UX approval.

---

# 1. Purpose

This document translates the Project Owner's Phase 1 map-readability findings into a bounded implementation-facing support specification.

It does **not** create a new navigation system. It only defines what the existing Phase 1 map/recovery surface needs to communicate more clearly using already-authoritative world, exploration, player, landmark, and discovery state where possible.

Every new behavior, copy treatment, marker treatment, map layout behavior, fog treatment, resource-map rule, environmental map styling direction, and distance display described below is explicitly marked **PROPOSAL** until reviewed through the #110 route.

Review route:

`B-TD-01 → PM-B → A-GD-01 + A-ART-01 → PM-A routes approved implementation`

---

# 2. Authoritative sources and baseline evidence

## 2.1 Task / activation

- #110 / P1-UXSUP-003.
- PM-B activation comment `5846560814`.
- Activation/current baseline: `4c1e6a2732d096783f8ec8c354479fdda03d5e7d`.

## 2.2 Accepted Phase 1 design / art sources

- `docs/design/phase-1-exploration-fog-weather-ruin.md`
- `docs/design/phase-1-vertical-slice-master-gameplay.md`
- `docs/art/phase-1-asset-ui-production-spec.md`
- `docs/art/phase-1-visual-ui-readability-foundation.md`
- `docs/phase-1-vertical-slice-plan.md`

Relevant accepted semantics:

- Phase 1 has one coherent generated region, not a multi-biome Phase 2 map.
- Exploration knowledge is team-shared in hosted co-op.
- UNEXPLORED territory must not reveal detailed terrain/resource/ruin knowledge.
- EXPLORED terrain remains known and persistent.
- The map must communicate player position, landing/base marker, explored/unexplored state, broad terrain/water shape, ruin discovery states, and active Death Cache markers.
- Generic resource nodes do **not** become permanent global POI markers by default.
- The map does not need every resource, animal, remote hostile, or unseen ruin.
- Player movement remains continuous/non-grid.
- Fog authority remains gameplay/world authority; UI only visualizes authoritative discovery.
- Art already defines map markers for local player, teammates A/B/C, Landing/Base, Uninvestigated Ruin, Investigated Ruin, Death Cache, and Most Recent Death Cache accent.
- Art already defines a pixel-stable fog mask atlas and one-region terrain/water asset family.
- Decorative flora already exists as a visual category separate from gatherable resource flora.

## 2.3 Current baseline runtime / presentation evidence

Read at the activation baseline:

- `src/client/runtime/Phase1PresentationBinding.ts`
- `src/client/presentation/Phase1PresentationModel.ts`
- `src/client/presentation/Phase1HudOverlay.ts`
- `src/client/runtime/Phase1ProductReviewPresentationSource.ts`
- `src/client/runtime/HostedPhase1PresentationSource.ts`
- `src/client/presentation/Phase1ProductionAssets.ts`
- `src/world/phase1/Phase1WorldTypes.ts`
- `src/world/phase1/ExplorationGrid.ts`
- `src/world/phase1/Phase1WorldStore.ts`

Current evidence relevant to #110:

1. `Phase1MapPanelPresentation` currently contains only:
   - `fogLabel`;
   - `ruinLabel`;
   - `deathCacheLabel`;
   - `sharedDiscoveryLabel`.

2. The Product Review map projection currently supplies:
   - the exploration fragment for the player's current active chunk;
   - ruin runtime state;
   - the latest Death Cache;
   - no map-space local-player position;
   - no landing/base map position;
   - no terrain geometry;
   - no resource-map projection;
   - no distance presentation.

3. The HUD map panel currently renders a fixed row of map marker sprite samples plus textual labels. It does not spatially place the player/base/ruin/cache markers.

4. Current exploration authority already stores a per-chunk shared exploration bitset:
   - 16 × 16 exploration cells per chunk;
   - revisioned `Phase1ExplorationFragment`;
   - continuous player movement remains authoritative;
   - current reveal is radial and written to the shared exploration state.

5. Current world types already expose:
   - authoritative player/world positions through existing runtime/player motion data;
   - `Phase1WorldLandmarks.landingPosition`;
   - generated resource entity positions;
   - resource runtime state;
   - terrain grid `ground | water`;
   - ruin positions/state;
   - Death Cache positions.

6. The current map-marker atlas has no generic resource-marker family.

The source files above are evidence only. This task does not authorize edits to `src/**`.

---

# 3. Project Owner findings → proposal coverage

| Project Owner finding | Covered by |
|---|---|
| 1. First-region environmental character unclear | Section 9 — First-region environmental identity |
| 2. Region should read grass/flora/flower rather than generic ground | Section 9 — first-region map-surface proposal |
| 3. Resource locations/readability insufficient | Section 7 — Resource marker/readability policy |
| 4. Player position unclear/absent | Section 4 — Current-player marker |
| 5. Explored/revealed vs unexplored/unknown unclear | Section 6 — Exploration state + Section 11 — Fog |
| 6. Base/landing/home unclear/absent | Section 5 — Landing/Base marker |
| 7. Useful distance information missing | Section 10 — Distance alternatives |
| 8. Fog needs a more natural readable presentation | Section 11 — Fog expectations |

---

# 4. Current-player marker

Accepted Art already includes a local-player map marker. Current player position already exists in authority/read-model state. The current map panel does not project it spatially.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Know “where am I?” immediately when opening the map. | Current map panel has no spatial player position. | **PROPOSAL —** spatially place the existing local-player marker on the map using the current authoritative local-player position. Do not add a minimap, compass arrow, route line, or GPS path. | Local player world position; map world→panel transform; displayed map bounds. | **PROPOSAL —** local-player marker is always visible while the map panel is open, including over explored terrain. It does not reveal surrounding unknown terrain beyond authority. | **PROPOSAL —** legend: `YOU`. No coordinate readout is required. | YES — confirm no extra navigation semantics are implied. | YES — marker scale, contrast, outline, layering. | Presentation model must expose local-player map position; map renderer needs world→map transform. No authority change. |
| Keep player marker legible over grass/water/fog boundaries. | Fixed icon sample row does not prove in-map contrast. | **PROPOSAL —** player marker remains top information priority and uses shape + outline/contrast, not hue alone. | Existing local-player marker asset; map background state. | **PROPOSAL —** marker may draw above explored terrain and fog boundary, but not expose hidden features below unknown fog. | **PROPOSAL —** `YOU` in legend only; avoid persistent nameplate unless A-ART requires it. | NO if presentation-only; YES if marker visibility becomes a gameplay rule. | YES. | Renderer z-order and marker styling only. |

---

# 5. Base / Landing / Home marker

Accepted design identifies the Landing Module as the initial base anchor and the map must show Landing/Base. A `landingPosition` already exists in world landmark data.

This support spec does **not** redefine “home” to mean the Habitat Room, nearest structure, respawn point, or user-selected location.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Reliably identify the return anchor. | Landing/Base marker asset exists, but current map panel does not spatially place it. | **PROPOSAL —** spatially place the existing Landing/Base marker at the authoritative Landing Module / landing landmark position. | `landingPosition` or authoritative Landing Module structure position; world→map transform. | **PROPOSAL —** base marker remains visible once the normal Phase 1 landing/base state is known. It does not reveal unrelated unknown terrain around it. | **PROPOSAL —** legend: `LANDING / BASE`. | YES — confirm Landing Module remains the map's canonical Phase 1 home anchor. | YES — icon, label density, priority. | Projection of existing landing position into map presentation. No new home/waypoint state. |
| Distinguish base from ruin/resource/recovery markers. | Fixed marker samples are not spatially contextualized. | **PROPOSAL —** Base uses a unique silhouette/shape already provided by the marker atlas and sits above terrain but below the local-player marker if overlapping. | Existing marker atlas. | **PROPOSAL —** no blink/pulse except a transient map-open emphasis if A-ART approves. | **PROPOSAL —** `BASE` or `LANDING`; final term needs A-GD/A-ART consistency review. | YES — terminology. | YES — treatment. | Presentation-only. |

---

# 6. Explored / revealed / unknown state

Accepted gameplay semantics are already clear:

- UNEXPLORED = not physically revealed by the team;
- EXPLORED = physically revealed by a team member and persisted;
- meaningful DISCOVERED POIs are separate from generic explored terrain.

This task does not add “seen,” “mapped,” “surveyed,” or other exploration states.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Read the known/unknown world boundary at a glance. | Current map panel exposes only `Shared exploration · revision N`, not map-space explored geometry. | **PROPOSAL —** render the existing shared exploration bitset as a spatial explored mask over the map panel. | Exploration fragments for every map region currently displayed; chunk coordinates; bitset decode; map transform. | Existing authority remains unchanged: only cells already EXPLORED by authority may display detailed terrain/map information. | **PROPOSAL —** legend: `EXPLORED` and `UNKNOWN`. | YES — confirm only the existing two-state Phase 1 semantics are shown. | YES — value/pattern contrast and boundary treatment. | Presentation source must expose all needed displayed-region exploration fragments, not only a revision label/current fragment. |
| Understand revealed terrain after walking away. | Current panel does not visualize persisted known terrain. | **PROPOSAL —** explored terrain remains legible even when not in current camera view. | Existing persisted/shared exploration state + terrain data for explored cells. | Existing rule: weather/night/current camera visibility do not erase explored knowledge. | **PROPOSAL —** no “currently visible” legend state in Phase 1. | YES. | YES. | Map renderer must separate map knowledge from current camera visibility. |
| Avoid false knowledge in unknown areas. | A generic panel background can visually read as known terrain. | **PROPOSAL —** UNKNOWN region uses an opaque/patterned mask that prevents reading terrain/resource/ruin detail underneath. | Existing exploration state. | Existing authoritative rule: no detailed terrain/resource/ruin information in UNEXPLORED territory. | **PROPOSAL —** `UNKNOWN`. | YES. | YES. | Fog mask compositing. No change to fog authority. |

---

# 7. Resource marker / readability policy

## 7.1 Required semantic separation

#110 specifically requires the implementation estimate to keep these concepts separate:

1. **World resource existence**  
   A generated resource entity exists in authoritative world data.

2. **Resource discovered by player/team**  
   Current accepted Phase 1 has shared explored terrain, but no dedicated persistent “resource discovered” record.

3. **Resource eligible to appear on map**  
   This is **not currently fully determined** for generic resources. Accepted design explicitly says generic gathered resource nodes do not become permanent global POI markers by default.

4. **Visual marker treatment**  
   Current map marker atlas does not include a generic resource-marker set.

Therefore resource map visibility is an unresolved gameplay/presentation choice and must not be inferred from raw generation data.

## 7.2 Resource policy matrix

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Remember where useful resource opportunities were encountered without turning the map into a live scanner. | Current map provides no resource information; accepted design also says not every resource is a permanent POI. | **PROPOSAL — NEEDS A-GD DECISION:** permit a bounded map representation only for resource entities whose location is inside already-EXPLORED territory and whose category A-GD explicitly makes map-eligible. Do not auto-show resources in unknown terrain. | Generated resource position; exploration state for its map cell; resource definition/category. Optional runtime availability only if A-GD approves showing it. | **PROPOSAL —** map eligibility must be derived from an A-GD-approved reveal rule; existence alone is insufficient. | **PROPOSAL —** category-level legend only if approved: e.g. `PLANT`, `TIMBER`, `STONE`, `ORE`, `WATER SOURCE`. Exact labels need A-GD/A-ART. | **YES — REQUIRED.** | **YES — REQUIRED.** | New map projection/marker representation would be required. Existing world resource state can be read; no new world authority is required if eligibility is derived from existing explored state. |
| Avoid implying live quantity/availability from old map knowledge. | Resource runtime can change/regenerate after an area was explored. | **PROPOSAL —** if resource markers are approved, default marker means “known resource location/opportunity,” not “currently available quantity,” unless A-GD separately approves live-state semantics. | Resource identity + position; optionally depleted state if explicitly approved. | **PROPOSAL —** explored knowledge may persist while live availability changes. | **PROPOSAL —** legend note: `Known source — availability may change` only if resource markers are approved and the note is needed. | **YES — REQUIRED.** | YES. | Avoid coupling marker existence to current resource quantity unless approved. |
| Distinguish environmental flora from gatherable plant resources. | Project Owner wants grass/flora/flower identity while resource readability is also weak. | **PROPOSAL —** decorative grass/flora/flower map texture must never use the same marker/icon language as gatherable Fiber/Food resources. | Region visual layer; resource eligibility state if approved. | **PROPOSAL —** decorative environmental texture may appear only in EXPLORED terrain; resource symbol remains a separate layer. | **PROPOSAL —** decorative flora has no legend entry unless A-ART needs an environmental key. | YES — ensure decoration has no gatherable implication. | **YES — REQUIRED.** | Visual composition/asset use only; no new gatherable/world-generation state. |

### Resource options requiring A-GD decision

No option below is selected by B-TD-01.

| Option | Description | Scope / risk |
|---|---|---|
| **PROPOSAL R1 — No generic resource markers** | Preserve accepted baseline: terrain/environment gets clearer, but generic resources stay world-space only. | Lowest implementation/gameplay risk; may not fully satisfy PO resource-location finding. |
| **PROPOSAL R2 — Explored-known category markers** | Show approved resource categories only when their existing world position lies in EXPLORED territory. Marker means known opportunity, not guaranteed current quantity. | Bounded and compatible with shared exploration, but introduces a resource-map reveal semantic requiring A-GD. |
| **PROPOSAL R3 — Live explored resource markers** | Show approved resources in EXPLORED terrain and reflect current available/depleted state. | Strongest information; highest risk of changing exploration/resource gameplay and replication expectations. Requires explicit A-GD approval. |

**NEEDS A-GD DECISION:** choose whether R1, R2, or another bounded policy is valid for Phase 1. R3 must not be assumed from #110.

---

# 8. Existing ruin / Death Cache markers

These are not new #110 gameplay systems. They are already accepted map/recovery information.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Locate a previously located/investigated ruin on the map. | Current map shows textual ruin state and fixed icon samples rather than a spatial marker. | **PROPOSAL —** spatially place existing Uninvestigated/Investigated Ruin marker when current accepted ruin discovery state permits it. | Ruin position + current `unknown/located/investigated` state. | Existing rule: UNKNOWN must not receive a normal exact marker; LOCATED/INVESTIGATED may. | **PROPOSAL —** `UNINVESTIGATED RUIN` / `INVESTIGATED RUIN`. | YES — confirm wording/state mapping only. | YES. | Existing ruin state + position projected into map. |
| Recover a Death Cache. | Current panel exposes cache label but not spatial placement. | **PROPOSAL —** spatially place active Death Cache marker(s); preserve existing most-recent distinction when data is available. | Active Death Cache positions/identity; latest/most recent determination. | Existing recovery semantics; marker does not reveal unrelated terrain. | **PROPOSAL —** `DEATH CACHE`; optional `MOST RECENT`. | YES — confirm marker visibility semantics. | YES. | Map presentation needs cache position list, not only one text label. |

---

# 9. First-region environmental identity

## 9.1 Current boundary

Accepted Phase 1 gameplay requires one coherent region. Current terrain authority exposes `ground | water`, and current Art Production defines:

- ground variants;
- water/shoreline;
- decorative flora;
- distinct gatherable resource plants.

The Project Owner now requires the first region to read visually as **grass / flora / flower terrain rather than generic ground**.

This support task treats that as a **presentation identity direction**, not a new biome mechanic.

## 9.2 Feature matrix

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Understand what kind of natural place the first region is when reading the map. | Current map has no actual terrain surface; current terrain semantics are only generic ground/water. | **PROPOSAL —** render EXPLORED ground using a grass-dominant region map treatment with restrained non-interactive flora/flower motifs so the first region reads as a living field/vegetated landscape rather than blank generic ground. | Existing `ground | water` terrain cells + explored mask. No new biome authority is required for the single Phase 1 region. | **PROPOSAL —** environmental texture appears only in EXPLORED terrain. UNKNOWN remains masked and must not reveal ground character. | **PROPOSAL —** no new biome name is required. If a region label is desired, it is a separate A-GD/A-ART decision. | YES — confirm the visual language does not create biome/resource gameplay semantics. | **YES — REQUIRED.** | Map renderer/terrain presentation. Existing terrain data can be reused; no world-generation change. |
| Distinguish decorative vegetation from gatherable resources. | Grass/flora/flower presentation could look like resource icons. | **PROPOSAL —** grass/flora/flower motifs remain low-priority terrain texture; approved resource markers, if any, use a distinct icon/shape layer. | Visual layers; optional approved resource marker data. | **PROPOSAL —** decorative flora never independently reveals a gatherable resource. | **PROPOSAL —** no legend entry for generic decorative flora. | YES. | **YES — REQUIRED.** | Presentation layering only. |
| Keep water readable against a greener ground identity. | Current map does not show broad terrain/water shape. | **PROPOSAL —** water remains a strong second terrain family with edge/shore contrast distinct from grass-dominant ground. | Existing terrain grid. | **PROPOSAL —** water shape only renders where terrain has been explored. | **PROPOSAL —** optional legend `WATER` only if A-ART determines needed. | NO if presentation-only. | YES. | Terrain map projection. |

### Explicit non-goal

The grass/flora/flower direction does **not** authorize:

- new gatherables;
- new resource yields;
- biome bonuses/penalties;
- soil systems;
- flower harvesting;
- procedural-generation rule changes;
- Phase 2 biome expansion.

---

# 10. Distance presentation — unresolved alternatives

Accepted Phase 1 design says distance matters through travel time, needs, recovery cost, weather exposure, and separation from base support. It does **not** currently define a player-facing map distance model.

B-TD-01 therefore does not select one.

## 10.1 Comparison matrix

| DISTANCE OPTION | PROPOSAL | PLAYER BENEFIT | REQUIRED DATA | GAMEPLAY / UX RISK | A-GD DECISION | A-ART DECISION | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|
| Exact numeric distance | **PROPOSAL D1 —** show straight-line numeric distance from player to an eligible existing map marker. | Precise return/expedition planning. | Player position + target position + agreed display unit/rounding. | Can make travel feel instrumented/GPS-like; display unit has no accepted player-facing definition yet. | **NEEDS A-GD DECISION.** | Unit formatting/layout. | Presentation-side distance calculation; no pathfinding. |
| Approximate distance bands | **PROPOSAL D2 —** label eligible target as `NEAR / MID / FAR` or equivalent approved bands. | Gives useful commitment information without false precision. | Player position + target position + A-GD-approved thresholds. | Thresholds become gameplay information and need tuning authority. | **NEEDS A-GD DECISION.** | Band labels/visual encoding. | Presentation-side distance calculation. |
| Grid/cell distance | **PROPOSAL D3 —** display number of map/exploration cells between positions. | Simple with existing grid representation. | Exploration/map cell coordinates. | Risks implying player movement/world is grid-based even though movement is continuous/non-grid; exposes a technical storage abstraction. | **NEEDS A-GD DECISION; not implied by existing design.** | If approved, representation. | Map cell transform. |
| Distance only for important existing markers | **PROPOSAL D4 —** calculate distance only for player↔Base, located Ruin, and active Death Cache entries; no generic cursor/waypoint distance tool. | Bounded utility without a new target-selection/navigation system. | Player position + positions of accepted important markers. | Still needs a selected display model (numeric or band); must not become waypoint/GPS behavior. | **NEEDS A-GD DECISION.** | Information hierarchy. | Presentation calculation only. |
| No distance value | **PROPOSAL D0 —** rely on spatial scale/relative map placement only. | Lowest scope. | Map transform only. | Does not directly address PO finding #7. | A-GD may reject/accept. | A-ART scale readability. | None beyond spatial map. |

## 10.2 Decision boundary

**NEEDS A-GD DECISION:** choose whether Phase 1 exposes exact distance, approximate bands, another bounded distance abstraction, or no explicit distance.

**PROPOSAL implementation constraint:** whichever option is approved, it must use straight-line informational distance only unless a separately approved system says otherwise.

This task does **not** authorize:

- route distance;
- pathfinding;
- travel-time ETA;
- navigation arrows;
- waypoints;
- GPS routes;
- automatic destination selection.

---

# 11. Fog-of-war presentation expectations

The world/fog authority is already implemented and must not change under #110.

Current authority:

- reveal follows actual player movement;
- shared team exploration persists;
- exploration is represented in revisioned per-chunk bitsets;
- no terrain/resource knowledge is authorized in UNEXPLORED cells.

The “more natural” request is therefore a presentation problem.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Read explored boundary without it feeling like a raw debug grid. | Current map does not render fog geometry; exploration is exposed only as a revision label. | **PROPOSAL —** compose a pixel-stable boundary from existing explored cells using the accepted fog-mask adjacency/dither assets so cell storage does not read as a hard debug checkerboard. | Exploration cell bitset across displayed map regions; adjacency sampling; fog mask atlas. | Existing authority only. Presentation cannot mark an unknown cell explored or infer reveal from nearby decoration. | **PROPOSAL —** legend: `EXPLORED` / `UNKNOWN`. | YES — ensure no semantic interpolation beyond authority. | **YES — REQUIRED.** | Decode existing exploration fragments + boundary-mask composition. |
| Keep unknown territory genuinely unknown. | A generic map background risks implying unseen terrain shape. | **PROPOSAL —** UNKNOWN mask is visually opaque enough that terrain type, resource positions, ruin, and environment texture cannot be inferred through it. | Existing exploration state. | Existing rule: no detailed information in unknown area. | **PROPOSAL —** `UNKNOWN`. | YES. | YES. | Fog compositing only. |
| Keep explored terrain useful after reveal. | Heavy fog treatment could obscure the terrain that exploration earned. | **PROPOSAL —** EXPLORED region renders at full map-information readability; fog boundary is subordinate to player/base/recovery markers. | Explored state + map terrain layer. | Existing explored knowledge persists. | **PROPOSAL —** no “fogged explored” third state. | YES. | YES. | Renderer layering. |
| Make reveal feel continuous despite technical cell storage. | Storage is discrete 16×16 cells per chunk. | **PROPOSAL —** use adjacency-aware edge masks/controlled raster dither to soften the *shape impression* without bilinear blur or revealing neighboring unknown cells. | Neighbor-cell known/unknown state. | No visual pixel may expose information outside authoritative explored coverage. | No additional copy. | YES. | **YES — REQUIRED.** | Adjacency mask calculation. No change to reveal radius or bitset. |

### Fog acceptance expectations

**PROPOSAL presentation acceptance:**

- unexplored and explored are distinguishable without relying on hue alone;
- unknown terrain details are not readable through the mask;
- explored terrain remains legible;
- player/base/ruin/Death Cache markers remain readable where they are legitimately eligible;
- fog edges remain crisp at approved integer pixel scales;
- no soft bilinear feathering;
- no new line-of-sight fog;
- no change to reveal radius;
- no change to shared exploration authority.

---

# 12. Map legend and visual-information hierarchy

## 12.1 Proposed hierarchy

**PROPOSAL —** map information should be layered in this order from highest player-action relevance to lowest:

1. **Local Player**
2. **Recovery / critical return information**
   - Most Recent Death Cache;
   - other active Death Cache(s);
3. **Landing/Base**
4. **Known discovery landmark**
   - Uninvestigated Ruin;
   - Investigated Ruin;
5. **Teammates**, where accepted co-op marker semantics apply
6. **Approved resource markers**, only if A-GD approves a resource policy
7. **Explored terrain / water shape**
8. **Environmental texture identity**
   - grass/flora/flower ground treatment
9. **Unknown fog mask**

This hierarchy is a presentation proposal, not a gameplay priority change.

## 12.2 Legend policy

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| Understand map symbols without trial-and-error. | Current map shows fixed icon samples without a labeled semantic legend. | **PROPOSAL —** include a compact legend containing only symbol classes currently present/eligible on the opened map. | Marker class list currently rendered. | **PROPOSAL —** do not show legend entries that imply hidden map content. | **PROPOSAL —** `YOU`, `BASE`, `UNINVESTIGATED RUIN`, `INVESTIGATED RUIN`, `DEATH CACHE`; teammate/resource entries conditional on approved visibility. | YES — semantics/terminology. | **YES — REQUIRED.** | Legend generated from same presentation model as marker layers. |
| Avoid marker overload. | Adding all possible markers could overwhelm the map. | **PROPOSAL —** marker legend and marker rendering stay finite to accepted Phase 1 categories; no generic animal/hostile marker. | Existing marker categories. | Existing visibility rules plus approved resource policy. | **PROPOSAL —** no `HOSTILE` or generic `WILDLIFE` legend. | YES. | YES. | Presentation filtering. |
| Preserve readability without color dependence. | Current spatial map has not yet demonstrated shape/contrast hierarchy. | **PROPOSAL —** markers use distinct silhouette/shape + contrast; color is supplemental. | Existing marker assets + A-ART treatment. | Same eligibility rules as marker state. | Legend pairs icon + text. | NO if presentation-only. | **YES — REQUIRED.** | Renderer/style only. |

---

# 13. Existing co-op / shared-discovery implications

Current accepted semantics:

- explored knowledge is a team union;
- join/rejoin receives current team explored/discovered state;
- current camera visibility remains local;
- ruin discovery becomes shared world knowledge;
- co-op player identities already have marker shapes A/B/C in accepted Art;
- shared discovery does not automatically grant remote personal XP.

#110 does not create private per-player fog or a second discovery authority.

| PLAYER NEED | CURRENT GAP | PROPOSED MINIMUM PHASE-1 SOLUTION | REQUIRED STATE / DATA | REVEAL / VISIBILITY RULE | PLAYER-FACING COPY / LEGEND | A-GD REVIEW? | A-ART REVIEW? | ENGINEERING DEPENDENCY |
|---|---|---|---|---|---|---|---|---|
| See the same explored map knowledge as teammates. | Current panel does not spatially render the shared exploration union. | **PROPOSAL —** render the existing shared authoritative exploration state; do not create local-private fog for Phase 1. | Hosted replicated exploration fragments / local authoritative equivalent. | Existing team-union reveal semantics. | **PROPOSAL —** optional small `SHARED MAP` label only if A-ART finds useful; not required. | YES — confirm terminology only. | YES. | Map source consumes existing replicated exploration aggregates. |
| Distinguish teammate markers where current team identity is available. | Accepted Art has markers, but current map panel does not position them. | **PROPOSAL —** spatially place existing teammate identity markers if Company A's approved presentation read model provides current teammate position for map use. | Player motion positions + presentation identity slots. | **PROPOSAL — NEEDS A-GD CONFIRMATION:** exact remote teammate tracking on map must match accepted co-op semantics; do not infer it merely from shared fog. | **PROPOSAL —** `TEAM A / TEAM B / TEAM C` or final approved teammate labels. | **YES — REQUIRED for map tracking semantics.** | YES. | Hosted player-motion projection into map presentation. |
| Understand shared ruin discovery. | Current panel can show `Shared Discovery` text, but no spatial state transition. | **PROPOSAL —** when authoritative ruin state becomes LOCATED/INVESTIGATED, update the eligible ruin marker state on the shared map without implying personal XP. | Existing replicated ruin state + ruin position. | Existing ruin discovery rules. | **PROPOSAL —** existing `Shared Discovery` toast + updated ruin marker; no personal-XP message unless separately earned. | YES. | YES. | Existing ruin replication + map projection. |

---

# 14. Implementation-facing data dependency summary

This section is not an API/schema design. It identifies what Company A needs available to estimate implementation.

| Map feature | Existing state/data evidence | Missing presentation projection / decision |
|---|---|---|
| Local player marker | Authoritative/local player position already exists | Map presentation field + world→map transform |
| Landing/Base marker | `landingPosition` / Landing Module exists | Map projection |
| Explored/unknown terrain | Shared `Phase1ExplorationFragment.words` per region | Multi-region map projection + bitset decode + boundary rendering |
| Broad terrain/water | Per-chunk `Phase1TerrainGrid` `ground | water` | Project explored terrain into map geometry |
| First-region grass/flora/flower identity | One-region terrain + decorative flora visual category | A-ART-approved map surface treatment; no worldgen change |
| Ruin marker | Ruin position/state exists | Spatial projection |
| Death Cache marker | Cache position/state exists | Spatial list projection; most-recent treatment |
| Teammates | Player motions + identity slots exist | A-GD confirmation of map tracking semantics + projection |
| Resources | Generated resource positions + runtime state exist | **A-GD reveal eligibility decision** + map marker asset/presentation if approved |
| Distance | Positions exist for player and important targets | **A-GD distance model decision** + presentation calculation |
| Legend | Marker classes known after decisions | A-ART layout and generated legend |
| Natural fog edge | Exploration bitset + existing fog-mask atlas | Map-boundary adjacency/mask renderer |

### Engineering constraint

**PROPOSAL implementation rule:** presentation may derive visual/map coordinates and approved informational distance from authoritative read-only state, but must not create a second canonical map/discovery/resource authority.

---

# 15. Minimum Phase 1 map surface — proposal composition

If A-GD/A-ART approve the relevant parts, the minimum map/recovery panel can remain the existing full-screen/panel map rather than adding a minimap.

**PROPOSAL composition:**

- one spatial map canvas inside the existing Map / Recovery panel;
- explored grass/flora/flower-region ground treatment;
- explored water shape;
- opaque UNKNOWN mask with pixel-stable naturalized boundary;
- local-player marker;
- Landing/Base marker;
- eligible ruin marker;
- active Death Cache marker(s);
- teammate markers only if A-GD confirms remote map-position semantics;
- resource markers only if A-GD approves a bounded resource reveal policy;
- distance text only under an A-GD-approved distance model;
- compact legend.

Not included:

- minimap;
- compass navigation;
- route line;
- waypoint placement;
- destination pinning;
- GPS;
- pathfinding;
- ETA;
- automatic quest navigation.

---

# 16. A-GD decisions required

A-GD-01 must explicitly review/decide:

1. **Resource visibility semantics**
   - whether generic resources appear at all;
   - what qualifies a resource as “known”;
   - whether explored territory alone is enough;
   - whether markers represent known location only or live availability;
   - which resource categories, if any, are eligible.

2. **Distance semantics**
   - exact numeric vs approximate bands vs another bounded model vs none;
   - which existing markers may show distance;
   - player-facing unit/threshold meaning.

3. **Landing/Base terminology**
   - confirm the Landing Module is the canonical Phase 1 map home anchor.

4. **Remote teammate position**
   - confirm whether exact teammate positions are intended on the map when player-motion state is available.

5. **Environmental identity semantics**
   - confirm grass/flora/flower is presentation identity only and does not create a new biome/gatherable mechanic.

6. **Map legend wording**
   - ensure labels do not create unsupported gameplay state.

B-TD-01 does not make these approvals.

---

# 17. A-ART decisions required

A-ART-01 must review/decide:

- grass/flora/flower map texture language for the first region;
- water-vs-ground contrast;
- fog boundary mask/dither appearance;
- unknown-mask opacity/value;
- player/base/ruin/cache/teammate marker scale and priority;
- any approved resource marker family;
- legend layout and icon/text density;
- distance label placement if A-GD approves distance;
- pixel readability at accepted internal/desktop scales;
- shape/contrast redundancy so map state does not depend on hue alone.

B-TD-01 does not declare final visual/UX acceptance.

---

# 18. Strict non-goals

This task does not authorize or propose:

- a minimap;
- waypoint placement;
- GPS navigation;
- pathfinding;
- route lines;
- navigation arrows;
- travel-time ETA;
- quest compass;
- player-created map pins;
- scan/radar system;
- automatic remote resource discovery;
- permanent markers for every resource;
- markers for every animal;
- exact remote hostile markers;
- new fog authority;
- line-of-sight fog;
- fog reveal-radius changes;
- new world-generation rules;
- new gatherables;
- biome gameplay rules;
- Phase 2 biome expansion;
- new persistence authority;
- `src/**` edits;
- gameplay approval by B-TD-01;
- UX/visual approval by B-TD-01.

---

# 19. Company A estimation slices after approval

This is an implementation-estimation aid only, not an activation.

## Slice A — spatial map projection

Potential bounded work:

- extend map presentation read model;
- define map bounds/world→map transform;
- project player + Landing/Base + accepted POI/recovery markers;
- render broad explored terrain/water.

No authority change required if read-only existing state is used.

## Slice B — explored/unknown rendering

Potential bounded work:

- gather exploration fragments for displayed map bounds;
- decode existing bitset;
- render explored terrain;
- render UNKNOWN mask;
- compute adjacency masks for pixel-stable fog boundary.

No fog simulation change.

## Slice C — first-region environmental map skin

Potential bounded work:

- apply A-ART-approved grass/flora/flower surface language to explored ground;
- retain distinct water;
- keep decorative vegetation visually separate from resource symbols.

No worldgen or gatherable change.

## Slice D — resource map layer

Only after A-GD decision.

Potential bounded work:

- derive approved eligibility from authoritative resource + exploration state;
- add approved resource marker presentation/asset;
- do not create a second resource discovery authority unless separately designed and authorized.

## Slice E — distance

Only after A-GD decision.

Potential bounded work:

- calculate approved straight-line informational distance from existing positions;
- format only for approved marker classes.

No pathfinding.

## Slice F — co-op map positions

Only after A-GD confirms teammate tracking semantics.

Potential bounded work:

- project replicated player-motion positions;
- use existing team marker shapes;
- preserve shared exploration union.

---

# 20. Self-review against #110

| Check | Result |
|---|---|
| Project Owner finding 1 — environmental identity | **PASS** — Section 9 |
| Project Owner finding 2 — grass/flora/flower first-region identity | **PASS** — presentation-only proposal; no new gatherables/biome mechanic |
| Project Owner finding 3 — resource locations/readability | **PASS** — Section 7 separates existence/discovery/eligibility/visual treatment |
| Project Owner finding 4 — current player position | **PASS** — Section 4 |
| Project Owner finding 5 — explored/revealed vs unknown | **PASS** — Sections 6 and 11 |
| Project Owner finding 6 — base/landing/home | **PASS** — Section 5 |
| Project Owner finding 7 — useful distance | **PASS** — Section 10 compares options; no final model selected |
| Project Owner finding 8 — more natural fog | **PASS** — presentation-only adjacency/dither expectations; authority unchanged |
| Current-player marker | **PASS** |
| Base/Landing marker | **PASS** |
| Explored/revealed/unknown state | **PASS** |
| Resource marker/readability policy | **PASS** |
| First-region environmental identity | **PASS** |
| Distance alternatives | **PASS** |
| Fog-of-war expectations | **PASS** |
| Legend / hierarchy | **PASS** |
| Existing co-op/shared discovery implications | **PASS** |
| Every new behavior explicitly marked PROPOSAL | **PASS** |
| Resource reveal semantics self-decided | **NO — correctly routed to A-GD** |
| Final distance model selected | **NO — correctly unresolved** |
| Gameplay decisions separated from presentation decisions | **PASS** |
| Engineering data dependencies explicit | **PASS** |
| A-GD decision points explicit | **PASS** |
| A-ART decision points explicit | **PASS** |
| New navigation system introduced | **NO** |
| New gameplay system silently introduced | **NO** |
| World/fog authority changed | **NO** |
| World-generation changes proposed | **NO** |
| Phase 2 scope introduced | **NO** |
| `src/**` modified by this task | **NO** |
| Actionable for Company A estimation | **PASS** |

**B-TD-01 result:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING.  
**Next lifecycle owner:** B-PM-01 / PM-B.  
**Required reviews:** A-GD-01 gameplay semantics + A-ART-01 visual/UX.  
**PROJECT_OWNER_ACTION:** NONE.
