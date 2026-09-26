# P1-WLD-002 — Phase 1 First-Region Spatial Readability & Landmark Support Brief

**Task:** P1-WLD-002 / Issue #114  
**Role:** WORLD_LEVEL_DESIGNER  
**Member:** B-WLD-01  
**Home Company:** COMPANY_B  
**Coordinating PM:** B-PM-01 / PM-B  
**Lock:** PMB-P1-WLD-002-R1  
**Activation baseline:** `main@4c1e6a2732d096783f8ec8c354479fdda03d5e7d`  
**Authorized artifact:** `docs/world-design/phase-1-first-region-spatial-readability.md`  
**Status:** IMPLEMENTATION_COMPLETE — REVIEW_PENDING

---

# 0. PURPOSE, AUTHORITY, AND SOURCE SNAPSHOT

This brief translates the Project Owner's current Phase 1 first-region readability concerns into bounded **world-space composition and spatial-readability guidance** for the existing one-region vertical slice.

It exists to help the first region communicate:

- where the player landed;
- where nearby gathering opportunities live relative to the landing/base;
- how the player can read outward exploration choices;
- how the local foothold hands off into expedition-scale space;
- how grass/flora/flower character can make the region feel authored without creating new gameplay content;
- how resource opportunities remain readable inside environmental texture;
- how the player can recover orientation through world landmarks and memory rather than a new navigation system;
- how world composition can support existing fog/exploration semantics instead of fighting them.

This document does **not** authorize runtime or world-generation changes.

## 0.1 Fresh-read task authority

**CONFIRMED**

- Source Issue: #114 / P1-WLD-002.
- Activation comment: #114 comment `5846888757`.
- Owner: B-WLD-01 / WORLD_LEVEL_DESIGNER / COMPANY_B.
- Coordinating PM: B-PM-01 / PM-B.
- Lock: `PMB-P1-WLD-002-R1`.
- Authorized output: this document only.
- Company A retains implementation/world-generation/runtime authority.
- Review route: B-WLD-01 → PM-B → A-GD-01 + A-ART-01 → PM-A routes implementation only if approved.

## 0.2 Relevant source versions inspected

**CONFIRMED**

Task activation baseline sources:

- `docs/design/phase-1-exploration-fog-weather-ruin.md`
  - blob: `4734e92e73043ad9a344ab2f04c69a424e2ccd69`
- `docs/art/phase-1-asset-ui-production-spec.md`
  - blob: `6604a631e5b5f803132f51c48f1c3550d8e273fb`
- `docs/art/phase-1-visual-ui-readability-foundation.md`
  - blob: `8d671a71577388eac4780a13f02f5f965f8a07ca`
- `docs/world-design/phase-1-ruin-expedition-spatial-brief.md`
  - blob: `b8a43402c14cfa4c40ca032089b309c9f392b56b`

Adjacent proposal work inspected only to preserve scope separation:

- #110 / P1-UXSUP-003 — map information/clarity semantics proposal.
- PR #113 head `40f851f1508751a74e7a47f54ade1c512a3ecbeb`
  - `docs/uiux/phase-1-map-clarity-support.md`
- #111 / P1-UXSUP-004 — map visual-readability mockups.
- PR #112 head `5ba7d3e0279a40a3f97bbe6da82710ae98dceb05`
  - `docs/uiux/phase-1-map-visual-mockups.md`

Live `main` advanced after activation baseline only through unrelated documentation; no changed file between the activation baseline and live main overlapped the sources or target path for #114.

## 0.3 Classification used here

- **CONFIRMED** — already supported by approved Phase 1 sources or explicit Project Owner findings in #114.
- **PROPOSAL** — World / Level Design spatial guidance inside this role's authority. It requires downstream review/implementation before becoming production behavior.
- **CONSTRAINT** — a boundary this artifact must preserve.
- **REVIEW DEPENDENCY** — a proposal whose production realization requires A-GD, A-ART, or Company A implementation authority.

---

# 1. STRICT SCOPE SEPARATION

## 1.1 Distinct from #68 / P1-WLD-001

**CONSTRAINT**

#68 owns the **ruin-expedition spatial translation**: local/expedition/ruin travel bands, Predator avoidance/retreat, ruin approach/arrival, UNKNOWN → LOCATED → INVESTIGATED spatial meaning, and ruin discovery conformance.

This #114 artifact stops at the **first-region foothold and readable transition toward expedition space**.

It does not:

- redesign the ruin approach;
- move or reframe the Territorial Predator;
- alter ruin visibility/locate/inspect semantics;
- change ruin or Predator coordinates;
- replace #68 acceptance scenarios.

Where this brief refers to the expedition transition, it means only the player-facing handoff from "near-base/local support" toward "greater commitment." #68 remains authoritative for the ruin expedition beyond that handoff.

## 1.2 Distinct from #110 / P1-UXSUP-003

**CONSTRAINT**

#110 owns **map information/clarity support proposals**, including possible player/base markers, resource visibility policy, distance alternatives, legend, and map-data dependencies.

This #114 artifact does not decide:

- what resource information appears on the map;
- whether distance is displayed;
- marker eligibility or persistence;
- map legend semantics;
- map coordinate projection;
- remote teammate tracking.

This artifact only addresses what the **physical world-space composition** should communicate before or without those map proposals.

## 1.3 Distinct from #111 / P1-UXSUP-004

**CONSTRAINT**

#111 owns **map visual-readability mockups**: map terrain treatment, player/base marker appearance, resource-marker visual proposals, explored/unknown visual treatment, pixel-safe map fog, and map-panel composition.

This #114 artifact does not prescribe:

- map icon art;
- map pixel treatment;
- map fog edge style;
- final palette/value hierarchy;
- map legend layout;
- final visual acceptance.

A-ART-01 retains final visual/readability authority for both world and map presentation.

---

# 2. APPROVED PHASE 1 CONSTRAINTS TO PRESERVE

## 2.1 One coherent first region

**CONFIRMED**

Phase 1 uses one coherent generated region rather than a multi-biome production set.

**CONSTRAINT**

Grass/flora/flower identity in this brief is presentation/spatial identity **inside the existing first region**. It does not create a new biome, sub-biome gameplay type, or Phase 2 environment.

## 2.2 Landing/local band

**CONFIRMED**

Approved exploration design defines a local band where important first resources are generally reachable within approximately **5–25 seconds one-way** from landing at accepted base movement speed.

The existing local opportunity set includes:

- Fiber;
- Food;
- Water;
- Timber;
- Stone;
- early Metal Ore access;
- first local wildlife readability.

**CONSTRAINT**

This brief does not change those travel targets, spawn locations, resource counts, weights, or coordinates.

## 2.3 Expedition handoff

**CONFIRMED**

The existing design uses a broader expedition band at approximately **60–150 seconds** along a plausible route, with stronger travel/exposure/recovery commitment.

**CONSTRAINT**

This document may describe how the local region should **read as transitioning toward** greater commitment, but it does not tune expedition distances or redesign #68's ruin/Predator space.

## 2.4 Landing/Base landmark authority

**CONFIRMED**

Approved Art/WLD sources describe the Landing Module as:

- the strongest human landmark at session start;
- a starting anchor;
- temporary/landing-oriented compared with later habitat;
- the base/respawn origin where gameplay uses it.

**PROPOSAL**

World composition should reinforce that already-approved role through surrounding spatial hierarchy rather than relying on a new waypoint.

## 2.5 Resource/decor separation

**CONFIRMED**

Approved Art sources require:

- decorative/background flora to differ from gatherable resource flora;
- Fiber Plant and Food Plant to remain distinguishable from decorative flora;
- Metal Ore to differ from ordinary stone by silhouette/pattern, not hue alone;
- Potable Water Source to remain readable as an interaction target without implying every visible water patch is potable;
- interaction/focus outline to support gatherability rather than continuous baked glow.

## 2.6 Fog/discovery authority

**CONFIRMED**

Phase 1 exploration:

- requires physical presence;
- begins under fog of war;
- uses radial reveal around resolved player position;
- preserves explored map knowledge;
- shares explored/discovered state with the hosted team;
- does not reveal detailed terrain/resource/ruin information in UNEXPLORED territory;
- does not require tactical line-of-sight fog;
- does not force player locomotion onto a grid.

**CONSTRAINT**

This brief does not change reveal radius, reveal shape, persistence, shared authority, map states, or discovery semantics.

---

# 3. FIRST-REGION SPATIAL HIERARCHY

The first region should read as a sequence of spatial confidence:

**Landing/Base anchor → immediate gathering/readability space → outward choice → transition toward expedition commitment.**

This is a composition hierarchy, not a new progression gate.

## 3.1 Layer A — Landing/Base as primary spatial anchor

**PROPOSAL**

The Landing/Base should remain the clearest current-human spatial reference in the first-region foothold.

World-space support should come from a combination of:

- the accepted human-built silhouette/scale of the Landing Module;
- a readable ground relationship around it;
- enough negative space that the structure does not disappear inside decorative clutter;
- a local composition that makes "return to the human foothold" visually different from "continue into natural space";
- later approved human structures reinforcing the same anchor as the base grows.

The world should not need:

- a floating beacon;
- a GPS line;
- a compass arrow;
- an artificial glowing trail;
- a new marker mechanic

to communicate that the Landing/Base is the player's home-side anchor.

### Orientation intent

A player who has moved around the immediate local region should be able to use the **human-built footprint plus local composition** to recognize "base-side" space when it comes back into view.

This does not require the Landing Module to remain visible at all distances.

### Negative-space rule

**PROPOSAL**

Keep the immediate visual field around the Landing/Base quieter than dense environmental texture where practical.

Purpose:

- protect the strongest session-start landmark;
- prevent grass/flora/flower clutter from competing with the base silhouette;
- keep nearby interactables legible;
- allow later habitat growth to visibly change the foothold.

**REVIEW DEPENDENCY — A-ART**
Final density, value, contrast, sprite overlap, and silhouette treatment.

**REVIEW DEPENDENCY — Company A**
Any production change to terrain/decor placement.

---

## 3.2 Layer B — Immediate gathering/readability ring

**CONFIRMED**

The approved local band supports the first short gather/orientation loop.

**PROPOSAL**

Treat the local band as a **readability ring**, not as a literal circular spawn rule.

The player experience should support:

- short movement away from Landing/Base;
- more than one plausible local direction where current terrain permits;
- visible environmental variety without turning the area into noise;
- resource opportunities that read as opportunities rather than decorations;
- frequent chances to re-acquire the Landing/Base or another already-seen local cue.

### Local opportunity pockets

Resource opportunities should read as **small spatial pockets** inside the local field rather than as one undifferentiated carpet of resource sprites and decoration.

A readable pocket has:

1. an identifiable opportunity;
2. enough breathing room around individual nodes to parse silhouettes;
3. decorative texture that frames rather than masks the opportunity;
4. an approach space where focus/interaction feedback can work cleanly;
5. a visible relationship back toward known local space.

This does not define a node count, radius, spawn weight, or procedural rule.

### No mandatory local corridor

**CONSTRAINT**

The first gather/orientation loop must not be spatially authored as one forced corridor merely for readability.

The current survival sandbox should still feel like a place where the player chooses which nearby opportunity to approach.

---

## 3.3 Layer C — Outward exploration direction cues

**PROPOSAL**

Outward exploration should be encouraged by **world composition**, not a new navigation overlay.

Useful world-space cues can include already-supported environmental relationships such as:

- a break in local vegetation density;
- a memorable water/shoreline edge;
- a visible change in terrain massing;
- a distinct existing resource/rock/tree grouping;
- a gap between larger environmental masses;
- an existing landmark silhouette that becomes readable only after legitimate exploration reveals it.

These cues should function as "there is space worth checking in this direction," not "follow this exact route."

### Direction cue rule

A valid outward cue:

- invites movement;
- remains consistent with fog authority;
- does not expose hidden POIs through unexplored space;
- does not act like an arrow;
- does not guarantee a reward;
- does not imply a new quest objective.

### Multiple outward readings

Where existing terrain provides multiple plausible exits from the local foothold, composition should preserve distinct visual identities for them rather than flattening every edge into the same grass/noise texture.

This does not require a fixed number of routes and does not authorize new terrain generation.

---

## 3.4 Layer D — Transition toward expedition space

**CONFIRMED**

Leaving the local band should feel like increasing commitment, not crossing an invisible difficulty wall.

**PROPOSAL**

The world-space transition can become readable through gradual changes in composition, for example:

- Landing/Base ceases to dominate the immediate frame;
- known human-built elements become less frequent;
- local gathering pockets give way to larger stretches of traversal space;
- environmental clusters become stronger memory landmarks rather than constant background noise;
- return orientation depends more on remembered spatial relationships and less on the base remaining visually present.

This transition is a **readability handoff**, not a new game state.

### Handoff boundary to #68

Once the player is meaningfully in expedition-scale space, use #68 for:

- ruin/Predator spatial relationships;
- expedition route/retreat requirements;
- ruin approach/arrival;
- ruin discovery spatial conformance.

This brief makes no additional ruin-expedition claim.

---

# 4. FIRST-REGION GRASS / FLORA / FLOWER IDENTITY

## 4.1 Identity goal

**CONFIRMED**

The Project Owner finding is that the first region currently reads too generically and should communicate grass/flora/flower character more clearly.

**PROPOSAL**

The first region should read as a coherent living ground field through **clustered environmental texture plus deliberate quiet space**, not uniform scatter.

The goal is:

> "This is a specific first-region environment with vegetation character"

not:

> "Every green/flower object is a resource."

## 4.2 Spatial texture grammar

### Quiet ground

Use visually quieter areas to preserve:

- Landing/Base silhouette;
- interaction spaces;
- resource-node separation;
- route decision points;
- readable water/ground edges.

Quiet ground is not "empty content." It is negative space that lets important objects read.

### Grass/flora patches

Decorative grass/flora should form irregular patches rather than a perfectly even distribution.

Spatial value:

- gives the region a memorable surface rhythm;
- creates edges the player can remember;
- prevents the entire ground plane from reading as one repeated tile;
- lets local routes pass beside/through texture without becoming painted arrows.

### Flower accents

**PROPOSAL**

Flower-like accents may serve as small decorative punctuation inside the accepted first-region visual language.

**CONSTRAINT**

They are **decorative presentation only** unless an already-approved resource asset/gameplay rule explicitly defines a gatherable object.

This task creates:

- no new flower resource;
- no herb resource;
- no new gatherable plant;
- no new crafting input;
- no new interaction prompt.

### Cluster rhythm

Prefer a rhythm of:

**quiet space → environmental cluster → quiet/readable gap → another cluster**

over constant high-frequency decoration.

This supports both exploration memory and resource readability.

## 4.3 What this does not prescribe

**CONSTRAINT**

B-WLD-01 does not choose:

- final plant species;
- flower color;
- sprite shape;
- material treatment;
- palette;
- animation;
- asset count;
- exact density;
- exact distribution algorithm;
- exact cluster spacing.

Those belong to A-ART and Company A implementation/tuning after approval.

---

# 5. DECORATIVE FLORA VS GATHERABLE RESOURCE READABILITY

The world must not teach the player that every visually interesting plant is interactable.

## 5.1 Functional separation

| Spatial/readability concern | Decorative flora | Gatherable resource |
|---|---|---|
| Primary purpose | Region identity / background texture | Player action / logistics opportunity |
| Spatial priority | Subordinate | Higher action priority |
| Silhouette requirement | Can merge into patch texture | Must remain individually parseable |
| Negative space | May overlap other decoration where readable | Needs enough breathing room for focus/interaction |
| Clustering | May form irregular texture masses | Cluster may indicate opportunity, but nodes remain distinguishable |
| Interaction cue | None | Existing focus/interaction feedback when eligible |
| Persistence meaning | No gameplay state implied | Uses approved resource state only |
| Map meaning | None from this artifact | Governed by #110/A-GD if ever shown |

## 5.2 Decorative-flora composition rules

**PROPOSAL**

Decorative flora should:

- reinforce the region's environmental texture;
- avoid creating repeated silhouettes that closely mimic known Fiber/Food plant opportunities;
- avoid wrapping tightly around a gatherable node until both become one unreadable mass;
- remain lower priority than player, hazards, resource targets, human structures, and ruin landmarks;
- provide visual continuity between resource pockets rather than pretend to be resource pockets.

## 5.3 Gatherable-resource composition rules

**PROPOSAL**

Gatherable resources should:

- preserve their accepted resource silhouette;
- have enough immediate visual separation for the player to distinguish one node from adjacent decoration;
- leave a usable approach/focus side where current collision and interaction rules allow;
- avoid being consistently hidden behind taller decorative forms;
- read as a deliberate opportunity without requiring permanent glow.

**REVIEW DEPENDENCY — A-ART**
Silhouette contrast, values, final sprite overlap, and interaction highlight treatment.

**REVIEW DEPENDENCY — A-GD**
Any proposal that changes actual resource availability, density, gameplay clustering, travel balance, or interaction eligibility.

**REVIEW DEPENDENCY — Company A**
Any runtime/world-content placement implementation.

---

# 6. RESOURCE CLUSTER / SPACING / SILHOUETTE READABILITY

This section defines **readability intent**, not spawn tuning.

## 6.1 Cluster as opportunity, not visual pile

**PROPOSAL**

A resource cluster should read in two passes:

1. **From farther away:** "there is a useful opportunity here."
2. **On approach:** "these are individual resource nodes I can understand and interact with."

A cluster fails if it only reads as one noisy patch of sprites.

## 6.2 Breathing edge

Where resource nodes appear together, preserve a readable **cluster edge** between the opportunity and surrounding decorative texture.

The edge does not need to be a literal empty ring.

It can be created through:

- lower decorative density;
- silhouette contrast;
- different massing;
- a clearer ground patch;
- a natural terrain boundary already present.

Exact visual solution remains A-ART authority.

## 6.3 Individual-node separability

**PROPOSAL**

Within a cluster:

- avoid full silhouette stacking where possible;
- preserve enough gap/offset that nodes can be counted as separate targets on approach;
- avoid repeated tangencies that make Fiber/Food/decor silhouettes merge;
- avoid placing critical interaction targets behind tall decoration from the normal gameplay camera;
- let the focus outline strengthen an already-readable target rather than rescue an unreadable one.

No exact pixel/world-unit spacing is authored here.

## 6.4 Resource-specific readability carried forward

### Fiber Plant vs Food Plant vs decorative flora

**CONFIRMED**

These categories must remain distinguishable.

**PROPOSAL**

Spatial composition should support the art distinction by avoiding mixed decorative clusters that visually erase the gap between them.

### Stone vs Metal Ore

**CONFIRMED**

Metal Ore must differ from ordinary stone by silhouette/pattern, not hue alone.

**PROPOSAL**

Do not surround Metal Ore with a visually identical decorative-rock mass that cancels that distinction.

### Potable Water vs visible water

**CONFIRMED**

Not every visible water patch implies potable interaction.

**PROPOSAL**

The potable interaction target should occupy a readable local composition relationship to water/ground without making the entire shoreline appear interactable.

### Timber/tree resources

**PROPOSAL**

Tree opportunities should remain legible as interactable resource objects without turning every environmental vertical mass into a false timber cue.

Final tree/decor distinction remains Art/Game Design dependent.

## 6.5 No balance change through this brief

**CONSTRAINT**

This artifact does not authorize:

- changing resource spawn counts;
- moving a resource node;
- changing resource scarcity;
- increasing/decreasing cluster density;
- changing resource regeneration;
- changing local-band travel time;
- changing Metal Ore access;
- changing gathering yield;
- introducing new resource families.

Any such change requires the appropriate Game Design + Company A task authority.

---

# 7. RETURN-ROUTE AND LANDMARK READABILITY WITHOUT GPS

The player should be able to leave the foothold, make a short local exploration decision, and recover orientation through the world itself.

## 7.1 Landmark hierarchy

**PROPOSAL**

Use a three-level orientation hierarchy:

### Primary anchor — Landing/Base

The strongest current-human reference.

### Secondary local memory cues

Existing environmental compositions that make nearby space distinguishable, such as:

- a recognizable water edge;
- a distinctive existing rock/tree mass;
- a vegetation gap;
- a terrain-shape break;
- a human structure cluster as the base grows.

### Tertiary frontier cues

Memorable revealed edges near the outward exploration front that help the player understand where they came from and where the region continues.

These are world-space memory aids, not map markers.

## 7.2 Reciprocal readability

**PROPOSAL**

An outward route should be evaluated in both directions.

A composition that is readable only while walking away from base but becomes featureless on the return trip is weak orientation design.

Future implementation/playtest should inspect:

- outbound view;
- reverse/return view;
- nearby side approach.

The player should not need a GPS line to understand "this relationship takes me back toward known local space."

## 7.3 Decision-point fingerprints

**PROPOSAL**

Where existing terrain creates a meaningful branch or change of direction, support memory with a **composition fingerprint** using existing content.

Examples of fingerprints:

- water edge plus sparse vegetation;
- rock mass beside a grass gap;
- two differently shaped environmental clusters flanking a traversal opening;
- transition from quiet ground to denser flora;
- human-built silhouette reappearing beyond natural foreground.

A fingerprint is not a new landmark type. It is a memorable arrangement of already-approved world categories.

## 7.4 No breadcrumb highway

**CONSTRAINT**

Do not solve return orientation with:

- repeated arrow-shaped flora;
- glowing breadcrumbs;
- evenly spaced markers;
- a painted road that exists only to point home;
- a route line;
- compass pips;
- waypoint beams;
- GPS/pathfinding.

Natural readability should remain compatible with the survival sandbox.

## 7.5 Base growth should improve orientation naturally

**CONFIRMED**

Phase 1 base progression should visibly grow from landing state toward a more coherent habitat.

**PROPOSAL**

As existing approved structures are built, their combined human footprint can naturally strengthen the return anchor.

This does not require:

- a new "base visibility" mechanic;
- a beacon;
- a new structure;
- increased draw distance.

It simply treats approved base growth as part of spatial memory.

---

# 8. WORLD COMPOSITION SUPPORT FOR FOG / EXPLORATION READABILITY

## 8.1 Fog remains authoritative

**CONSTRAINT**

World composition never reveals information the team's fog state says is unknown.

No distant tree, flower patch, resource cluster, ruin hint, or terrain detail may be intentionally exposed through this brief to bypass approved UNEXPLORED semantics.

## 8.2 Composition should create memorable explored territory

**PROPOSAL**

Once territory is legitimately explored, the revealed world should contain enough compositional variation that it can be remembered.

Useful memory structures include:

- edge relationships;
- distinct cluster shapes;
- ground-to-water transitions;
- quiet-to-dense vegetation transitions;
- existing landmarks;
- human/natural contrast.

The goal is to make "where I have been" readable in the world without changing the map's authoritative explored state.

## 8.3 Exploration fronts

**PROPOSAL**

At the player's current explored frontier, recently revealed space should not immediately collapse into uniform visual noise.

A readable exploration front benefits from:

- one or more identifiable revealed shapes;
- enough negative space to see the next traversable opening;
- existing terrain/vegetation relationships that make the new area feel different from the space just left.

**CONSTRAINT**

Do not align world content to the fog reveal radius or technical fog cells merely to create a visible border.

The fog boundary remains a gameplay/presentation layer; environmental composition should feel like a world, not a visualization of its storage grid.

## 8.4 Avoid world-space noise that fights fog

**PROPOSAL**

Uniform high-density micro-decoration can make explored/unexplored transitions harder to parse and can bury interactables near the frontier.

Prefer:

- clustered texture;
- readable gaps;
- hierarchy around interactables;
- broad terrain/water shapes;
- distinct local masses

over equal-detail noise everywhere.

A-ART owns the final density/contrast solution.

## 8.5 Map handoff

**CONSTRAINT**

Map explored/unknown styling, player/base markers, resource visibility, distance presentation, and natural pixel-fog treatment remain #110/#111 review scope.

This brief only requires that the **world being mapped** contains coherent, memorable composition once legitimately explored.

---

# 9. FIRST-REGION COMPOSITION MODEL

This is an implementation-neutral reading model for the first region.

```text
[ HUMAN FOOTHOLD ]
Landing/Base is strongest anchor.
Quiet/readable ground protects structure and first interactions.

        ↓ short local choices

[ LOCAL READABILITY FIELD ]
Existing resource opportunities appear as readable pockets.
Grass/flora/flower identity forms clustered environmental texture.
Decor frames interactables instead of masquerading as them.
Existing water/terrain relationships create local memory cues.

        ↓ outward choice, no arrow/GPS

[ OUTWARD EXPLORATION FRONT ]
World composition presents distinguishable openings/edges.
Base may no longer remain constantly visible.
Revealed environmental clusters become orientation memory.

        ↓ increasing travel commitment

[ EXPEDITION HANDOFF ]
Use existing approved expedition semantics.
#68 owns ruin/Predator/ruin-arrival spatial design beyond this point.
```

**CONSTRAINT**

The model is descriptive. It does not prescribe concentric generation zones, new worldgen code, exact radii, or spawn-coordinate changes.

---

# 10. FAILURE MODES TO AVOID

## 10.1 Base lost inside decoration

Failure:
Landing Module and nearby human footprint have similar visual weight to decorative flora/rocks.

Effect:
The player's primary return anchor becomes weak.

Minimum correction:
Create clearer world-space hierarchy/negative space; final visual change requires A-ART and implementation authority.

## 10.2 Everything looks gatherable

Failure:
Decorative flora uses the same local massing/silhouette prominence as Fiber/Food Plant opportunities.

Effect:
False interaction attempts and weak environmental trust.

Minimum correction:
Separate decorative texture from action targets through composition plus approved Art distinction; do not create new resource semantics.

## 10.3 Resources form unreadable sprite piles

Failure:
Several resource nodes plus decoration merge into one high-detail mass.

Effect:
Opportunity exists technically but cannot be parsed.

Minimum correction:
Protect cluster edge, individual-node separability, and interaction approach readability; actual spawn-spacing change requires Game Design/Company A authority.

## 10.4 Uniform green/noise field

Failure:
Grass/flora/flower detail is distributed evenly with no cluster rhythm or quiet space.

Effect:
First region still feels generic despite having more sprites.

Minimum correction:
Use clustered identity plus negative space, subject to A-ART approval.

## 10.5 One mandatory visual corridor

Failure:
Readability is achieved by making one obviously correct path out of the base.

Effect:
Sandbox choice collapses into a guided corridor.

Minimum correction:
Preserve multiple plausible local readings where existing terrain supports them; no new pathfinding/navigation system.

## 10.6 One-way landmarking

Failure:
Outgoing space has cues, but the same composition cannot be read in reverse.

Effect:
Player becomes disoriented on return even in local space.

Minimum correction:
Review reciprocal readability and decision-point fingerprints.

## 10.7 Fog bypass through composition

Failure:
World placement intentionally exposes hidden resource/POI information beyond legitimate reveal.

Effect:
World art becomes a second discovery authority.

Minimum correction:
Preserve fog authority; no hidden-content hint that contradicts approved semantics.

## 10.8 This brief becomes #68 or #110/#111 again

Failure:
Document begins specifying ruin routes, map markers, resource map visibility, distance UI, or fog rendering.

Effect:
Role/task collision and duplicated authority.

Minimum correction:
Return to world-space local-region composition only.

---

# 11. QA / PLAYTEST ACCEPTANCE SCENARIOS

These scenarios are designed for future QA/integration/playtest use. They do not claim a build has already passed.

## WLD-FR-01 — Landing/Base is the strongest local anchor

**Given:** a fresh Phase 1 session at the existing landing start.  
**When:** the player observes and moves around the immediate local space.  
**Then:** the Landing/Base reads as the strongest current-human world-space anchor without relying on a GPS line, compass, or new waypoint.

**Fail if:**
- ordinary decoration overwhelms the Landing Module;
- nearby scenery has equal or stronger landmark prominence without gameplay reason;
- player orientation depends on debug/UI text rather than world composition.

---

## WLD-FR-02 — Immediate gathering field is understandable

**Given:** a fresh player leaves the Landing/Base for nearby approved gathering opportunities.  
**Then:**
- resource opportunities read as discrete local pockets/opportunities;
- player is not forced through one corridor;
- the base/local foothold remains recoverable as known support.

**Fail if:**
- local resources and decoration form one unreadable mass;
- one mandatory visual corridor is the only understandable route;
- local gathering feels spatially detached from the landing foothold.

---

## WLD-FR-03 — First-region environmental identity reads as intentional

**Given:** a gameplay-scale first-region view.  
**Then:** grass/flora/flower character reads as clustered environmental identity rather than flat generic ground or uniformly scattered noise.

**Fail if:**
- environmental texture is so sparse that the region still reads as empty/generic;
- environmental texture is so uniform that no memorable local composition exists;
- flower/flora presentation implies unsupported gatherable content.

Final visual verdict belongs to A-ART.

---

## WLD-FR-04 — Decorative flora does not masquerade as a gatherable resource

**Given:** decorative flora near existing Fiber/Food opportunities.  
**When:** a fresh player scans the scene for actions.  
**Then:** decorative texture and gatherable plants remain distinguishable through spatial hierarchy plus approved visual treatment.

**Fail if:**
- decor repeatedly produces false resource silhouettes;
- the player must continuously test random decoration for interaction;
- only color distinguishes the categories.

---

## WLD-FR-05 — Resource clusters remain individually legible

**Given:** multiple approved resource nodes within the same local opportunity area.  
**Then:**
- the cluster reads as an opportunity at a glance;
- individual nodes remain parseable on approach;
- decorative overlap does not hide the focus target.

**Fail if:**
- silhouettes fully collapse into one sprite pile;
- interaction outline is the only thing rescuing an otherwise unreadable node.

---

## WLD-FR-06 — Stone / ore / water relationships preserve accepted meaning

**Given:** ordinary rock/decor, Metal Ore, visible water, and a potable interaction target where applicable.  
**Then:**
- Metal Ore remains distinguishable from ordinary stone through approved silhouette/pattern language;
- ordinary visible water does not make every water edge read as an interaction target;
- the potable target is spatially readable where gameplay authorizes it.

No new resource or water behavior is introduced.

---

## WLD-FR-07 — Outward exploration has world-space cues without a navigation mechanic

**Given:** the player has completed a short local orientation/gather loop.  
**When:** they look for somewhere new to explore.  
**Then:** existing world composition presents at least one legible outward opportunity through terrain/environment relationships without arrows, route lines, waypoints, GPS, pathfinding, or compass guidance.

**Fail if:**
- every direction looks compositionally identical;
- the only readable outward cue is a UI navigation element invented outside approved scope.

---

## WLD-FR-08 — Return orientation works in reverse

**Given:** the player moves outward from the local foothold and later turns back.  
**Then:** previously revealed world-space relationships support return orientation toward known local/base-side space.

**Fail if:**
- route readability only works outbound;
- player requires a new breadcrumb/route-line system to reverse the local trip;
- all local landmarks collapse into identical vegetation noise.

---

## WLD-FR-09 — Base growth strengthens the foothold without a beacon

**Given:** approved Phase 1 structures have been added around the landing state.  
**Then:** the combined human-built footprint reads as stronger settlement progress and a clearer return anchor than the initial landing state.

**Fail if:**
- new structures visually dissolve into surrounding natural clutter;
- a new navigation mechanic is required to make the expanded base legible.

---

## WLD-FR-10 — Local-to-expedition transition is readable but not gated

**Given:** the player moves beyond immediate local gathering space.  
**Then:**
- base support becomes less immediate;
- composition communicates increasing separation/commitment;
- reversal remains possible;
- no invisible wall, forced corridor, or new state is introduced.

**Boundary:** ruin/Predator/ruin-arrival behavior is validated under #68, not this scenario.

---

## WLD-FR-11 — World composition supports fog memory without leaking unknown information

**Given:** the player physically reveals new territory under existing fog rules.  
**Then:**
- newly explored terrain contains memorable composition/edges once revealed;
- unknown territory remains unknown;
- environment does not expose hidden resources/ruins through this brief;
- world layout does not visibly mirror the technical fog-storage grid.

---

## WLD-FR-12 — Night / Cold Rain do not erase category readability

**Given:** the local region is viewed under approved night or Cold Rain presentation.  
**Then:** Landing/Base, gatherable opportunities, decorative texture, and critical interaction targets remain distinguishable enough for normal play.

**Fail if:**
- environmental identity treatment reduces contrast until action categories disappear.

Final presentation verdict belongs to A-ART; weather gameplay remains existing design authority.

---

## WLD-FR-13 — No duplication of map/UI semantics

**Given:** #110/#111 proposals are reviewed alongside this artifact.  
**Then:** this artifact can be consumed independently as world-space guidance without requiring a specific map marker, distance model, fog-rendering style, or resource-map policy.

**Fail if:**
- implementing this brief requires choosing one of #110's unresolved gameplay-information proposals;
- this brief prescribes #111's map visual style as world-space law.

---

## WLD-FR-14 — No scope expansion

**Given:** the artifact is reviewed against #114.  
**Then:** it introduces no new biome, resource, gatherable plant/flower, waypoint/GPS/pathfinding/compass system, canon, Phase 2 feature, or spawn/ruin/resource coordinate rule.

---

# 12. IMPLEMENTATION-FACING DEPENDENCY NOTES

This section identifies decision ownership. It does not activate implementation.

| Proposed realization | A-GD-01 gameplay/semantic approval | A-ART-01 visual/readability approval | Company A world/runtime implementation |
|---|---|---|---|
| Landing/Base remains strongest local anchor | Only if gameplay meaning changes | **Required** for final world visual hierarchy | **Required** for any placement/content change |
| Quieter negative space around Landing/Base | Only if it changes gameplay availability/collision | **Required** | **Required** |
| Grass/flora/flower cluster identity | No new semantics if decoration-only | **Required** | **Required** for production placement/world content |
| Decorative vs gatherable separation | Existing semantics already distinct; GD if resource rules change | **Required** | **Required** for any content placement change |
| Resource cluster readability | **Required** if density/spacing affects availability/balance/travel | **Required** for silhouette/overlap | **Required** |
| Outward exploration composition cues | GD only if route/risk/reward meaning changes | **Required** | **Required** |
| Return-route landmark chaining | GD only if it becomes a formal navigation rule | **Required** | **Required** |
| Fog-supportive world composition | No change to fog semantics allowed | **Required** for visual hierarchy | **Required** if world content changes |
| Map player/base/resource markers | #110 / A-GD scope where semantic | #111 / A-ART scope | Not decided here |
| Fog map appearance | No new reveal state allowed | #111 / A-ART scope | Not decided here |
| Resource map visibility | **#110 / A-GD decision required** | #111 if approved | Not decided here |
| Spawn/resource/ruin coordinate tuning | **Out of #114 scope** | N/A | **Not authorized** |
| New biome/resource/gatherable/navigation system | **Prohibited by #114** | N/A | **Not authorized** |

## 12.1 Routing rule

If future review concludes that a readability problem can only be fixed by:

- changing resource density or availability;
- changing local travel-time balance;
- changing actual spawn positions;
- changing world-generation constraints;
- moving the ruin/Predator;
- changing fog reveal;
- adding navigation semantics,

B-WLD-01 records the finding and routes it through PM-B to the correct authority.

B-WLD-01 does not implement it under this lock.

---

# 13. ACCEPTANCE-CRITERIA SELF-CHECK

| #114 criterion | B-WLD-01 self-check |
|---|---|
| Each recommendation traces to Phase 1 scope or PO findings | **PASS** — Sections 2–8 |
| Confirmed constraints separated from PROPOSAL | **PASS** |
| Decorative flora and gatherable resources explicitly separated | **PASS** — Section 5 |
| Orientation improved through world-space readability, not navigation system | **PASS** — Sections 3 and 7 |
| No world/runtime authority overridden | **PASS** |
| Implementation implications routed, not directly executed | **PASS** — Section 12 |
| Concrete QA/integration scenarios included | **PASS** — Section 11 |
| Landing/Base strong anchor | **PASS** |
| Immediate gathering/readability ring | **PASS** |
| Outward exploration cues | **PASS** |
| Transition toward expedition space | **PASS**, bounded to handoff into #68 |
| Grass/flora/flower identity | **PASS**, decoration-only |
| Resource spacing/cluster/silhouette guidance | **PASS**, no tuning values |
| Return-route/landmark readability without GPS/pathfinding | **PASS** |
| Fog/exploration supported without reveal change | **PASS** |
| No new biome | **PASS** |
| No new resource | **PASS** |
| No new gatherable flower/plant | **PASS** |
| No waypoint/GPS/pathfinding/compass | **PASS** |
| No worldgen tuning | **PASS** |
| No spawn/resource/ruin coordinate change | **PASS** |
| No src/** | **PASS** |
| No new canon | **PASS** |
| No Phase 2 work | **PASS** |
| No duplication of #68 | **PASS** |
| No duplication of #110/#111 | **PASS** |

---

# 14. VALIDATION STATUS

## Performed

- Fresh-read #114 and activation comment `5846888757`.
- Verified owner/member/company/PM/lock/output path.
- Verified activation baseline.
- Checked target path absence on live main before authoring.
- Checked no open PR matched P1-WLD-002 / target path before authoring.
- Compared activation baseline to live main; intervening changes did not overlap #114 source/target paths.
- Fresh-read #68 boundaries.
- Fresh-read #110 and #111 boundaries.
- Inspected #110 PR #113 and #111 PR #112 proposal artifacts to avoid duplicating map semantics/visual scope.
- Inspected accepted Phase 1 exploration and Art/WLD source constraints.
- Self-checked every #114 acceptance criterion and strict non-goal.

## Not claimed

- No runtime implementation.
- No browser traversal test.
- No world-generation test.
- No player study.
- No visual final approval.
- No gameplay-semantic approval.
- No acceptance/DONE lifecycle transition.

---

# 15. UNIVERSAL HANDOFF DATA

**TASK / SOURCE_ISSUE:** #114 / P1-WLD-002  
**MEMBER_ID / ROLE_ID / HOME_COMPANY:** B-WLD-01 / WORLD_LEVEL_DESIGNER / COMPANY_B  
**COORDINATING_PM:** B-PM-01 / PM-B  
**LOCK:** PMB-P1-WLD-002-R1  
**STAGE:** IMPLEMENTATION_COMPLETE / REVIEW_PENDING  
**ARTIFACT:** `docs/world-design/phase-1-first-region-spatial-readability.md`

**PLAYER / DELIVERY RESULT:**  
The first-region spatial-readability intent is now specified without adding a navigation system or changing world authority: Landing/Base hierarchy, local gathering readability, grass/flora/flower identity, decorative-vs-gatherable separation, resource cluster readability, outward/return orientation, and fog-supportive world composition all have concrete acceptance scenarios and downstream authority routing.

**REQUIRED EXTERNAL GATES:**

1. PM-B verification.
2. A-GD-01 review only for gameplay/spatial-semantic implications.
3. A-ART-01 visual/readability review.
4. PM-A routes any approved implementation to the correct Company A owner.

**LIMITS:**  
This artifact is world/level design documentation. It is not a built level, worldgen tuning patch, final art treatment, map/UI solution, or runtime validation.

**PROJECT OWNER ACTION:** NONE.
