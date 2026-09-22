# P0-ART-001 — Prototype Rendering & Pixel Visual Specification

**Task:** P0-ART-001  
**Feature:** Phase 0 Prototype Rendering & Pixel Foundation  
**Role:** Art Director / UI-UX / Technical Art  
**Status:** READY FOR PRODUCER REVIEW  
**Milestone:** Phase 0 — Foundation  
**Source Issue:** #2

## Information classification

### CONFIRMED
- ProZ0 is a 2D pixel-art game with a top-down/3/4 presentation.
- Phase 0 targets desktop browser.
- Visual readability is more important than decorative complexity.
- Phase 0 requires only enough art/rendering definition to validate renderer, camera, scale, depth, and placeholder readability.
- Normal player locomotion is continuous world-space movement and must not be grid-locked.
- The Phase 0 camera follows resolved local-player world position, uses a default centered anchor, requires no gameplay dead-zone, and may use low-latency smoothing within the P0-DES-001 limits.
- Engine/framework/renderer selection belongs to Technical Lead.

### ART DECISIONS CONFIRMED BY THIS SPEC
- Visual reference cell: 32 × 32 internal pixels.
- Reference internal world raster: 640 × 360 internal pixels, 16:9.
- Reference world camera zoom: 1.0 at the authored internal-pixel scale.
- Placeholder player frame: 32 × 48 internal pixels.
- Prototype world sprite sampling: nearest-neighbor / point equivalent.
- Final world raster positions must be pixel-stable; presentation snapping must not change gameplay coordinates.
- Reference display scaling uses integer multiples of the internal raster.

### CONSTRAINTS
- A 32 × 32 visual reference cell is an art/scale reference only; it is not a gameplay tile or movement node.
- Presentation quantization must never create tile stepping, tile-center snapping, delayed movement, or camera detachment.
- Renderer candidates must preserve discrete pixel-art sampling in browser output.
- This task does not select the renderer implementation technique.

### OPEN QUESTIONS
- Exact player collision-footprint dimensions/shape remain a Technical Design integration detail. Art requires a ground/contact anchor but does not define the gameplay collider.
- Production performance budgets, atlas limits, and final multi-resolution strategy are Technical Lead / later production concerns and do not block Phase 0.

### DECISION NEEDED
None blocking P0-ART-001.

---

# VISUAL SPEC

## FEATURE

Phase 0 Prototype Rendering & Pixel Foundation

## PURPOSE

Define the minimum visual and rendering constraints required to:

- let Technical Lead evaluate renderer/framework candidates against a concrete pixel-art target;
- give Gameplay Engineer a stable placeholder scale and rendering target;
- prevent blurry, shimmering, or inconsistently scaled pixel art;
- preserve the approved continuous non-grid movement model;
- validate top-down/3/4 layering and depth;
- keep Phase 0 focused on renderer/readability validation instead of final-art production;
- provide observable acceptance criteria that QA can later convert into tests.

---

## PLAYER INFORMATION TO COMMUNICATE

The Phase 0 prototype scene must make the following information readable without final art:

1. local player location;
2. player movement across continuous world space;
3. walkable ground;
4. visually obvious blocking test obstacle;
5. low object versus tall/depth-sorted object;
6. whether the player is in front of or behind a tall object;
7. character ground/contact position;
8. player facing through either placeholder art or debug representation when required by P0-DES-001;
9. stable camera tracking without visual blur/shimmer;
10. when movement is blocked by a visible obstacle rather than ignored input.

Phase 0 does not need to communicate final biome identity, profession identity, narrative hierarchy, colony tier, final hazards, final UI, or production VFX.

---

## VISUAL DIRECTION

Prototype direction:

- clean pixel-art primitives;
- strong silhouette;
- low decorative density;
- clear value separation;
- consistent authored pixel density;
- top-down/3/4 readable ground contact;
- placeholder shapes optimized for renderer/collision/depth validation.

The prototype should look intentionally simple rather than unfinished final art.

Avoid:

- high-frequency decorative ground noise;
- anti-aliased sprite edges;
- gradients that hide pixel boundaries;
- soft shadows used as the only contact cue;
- detailed placeholder assets that create accidental final-style commitments.

---

## TARGET VISUAL SCALE

Use a **32 × 32 internal-pixel visual reference cell**.

`1 visual reference cell = 32 × 32 internal pixels`

The reference cell exists to standardize:

- terrain placeholder scale;
- prop proportions;
- modular structure dimensions;
- player-to-world scale comparison;
- depth-test setup;
- camera framing evaluation.

It does **not** define gameplay movement increments.

Entities may:

- occupy less than one visual cell;
- span multiple visual cells;
- be positioned at arbitrary continuous world coordinates;
- cross visual-cell boundaries freely.

Normal locomotion must never quantize to the 32 px reference cell.

---

## TARGET / NATIVE RESOLUTION

Reference internal world raster:

**640 × 360 internal pixels**

Aspect ratio:

**16:9**

Reference presentation cases:

- 1280 × 720 → 2× integer upscale;
- 1920 × 1080 → 3× integer upscale;
- 2560 × 1440 → 4× integer upscale.

The renderer may implement this through:

- an actual 640 × 360 render target; or
- another technique that produces visually equivalent stable internal-pixel sampling.

The implementation technique belongs to Technical Lead.

If browser viewport dimensions do not match an exact integer multiple of the reference raster, Phase 0 should prefer:

1. the largest integer scale that fits;
2. centered presentation;
3. letterbox/pillarbox or unused margin as needed;

rather than stretching the pixel-art world by a fractional scale.

Final production responsive-resolution strategy is deferred.

---

## PIXEL SCALE

### Authoring

`1 authored pixel = 1 internal render pixel`

Prototype raster assets are authored directly at internal resolution.

Do not:

- author at 2× or 4× and downsample at runtime;
- use anti-aliased source edges;
- rely on runtime resampling to establish sprite size.

### Display

World presentation uses integer display scale for reference validation.

Allowed reference scales:

- 1×;
- 2×;
- 3×;
- 4×;
- higher integer multiples if required by display setup.

Fractional world-surface display scaling is not part of the approved Phase 0 reference presentation.

### Camera zoom

Reference prototype camera zoom is:

**1.0 world-to-internal-pixel art scale**

At this zoom:

- one 32 px visual reference cell occupies 32 internal raster pixels;
- a 32 × 48 player frame occupies 32 × 48 internal raster pixels before display upscale.

This resolves the P0-DES-001 non-blocking final-camera-zoom integration question for the Phase 0 reference presentation.

Player-controlled zoom, cinematic zoom, and production zoom policy remain deferred.

---

## CHARACTER PROPORTIONS

### Placeholder player frame

Reference frame:

**32 × 48 internal pixels**

Reference proportion:

- frame width = 1 visual reference cell;
- frame height = 1.5 visual reference cells.

Recommended visible silhouette range inside the frame:

- body width: approximately 18–26 px;
- visible body height: approximately 34–44 px.

The remaining area may be transparent to preserve stable frame bounds.

### Ground/depth anchor

Player visual origin for depth is the:

**center of the feet / ground-contact point**

Do not use:

- full sprite center;
- sprite top-left;
- head position;

as the depth anchor.

The visual ground anchor must be documented/available to integration code.

### Collision relationship

Sprite bounds are not the gameplay collider.

P0-DES-001 explicitly defines collision as the character ground-contact footprint, while exact dimensions/shape belong to Technical Design.

Art must therefore:

- preserve a visually legible ground-contact region;
- not require full-sprite collision;
- not infer gameplay collision from transparent frame bounds.

### Readability

At 2× reference presentation, the placeholder player must remain clearly identifiable against both light and dark test terrain.

Recognition must not depend on facial detail.

---

## WORLD / OBJECT PROPORTIONS

### Ground reference

Ground patch / terrain reference:

**32 × 32 px**

Ground art may repeat for prototype validation.

This does not require tile-based gameplay.

### Small prop

Typical visible size:

**8–24 px**

Examples:

- small debris;
- debug pickup marker;
- tiny resource marker.

### Medium object

Reference footprint:

approximately **24–32 px**

Reference visible sprite:

approximately **24–40 px wide**
and **24–40 px high**

Examples:

- crate;
- rock;
- small machine placeholder.

### Tall depth-test object

Reference footprint:

approximately **24–40 px**

Reference visible height:

**48–64 px**

Examples:

- tree placeholder;
- pillar;
- tall wreckage.

At least one tall object must permit meaningful front/behind traversal to validate depth sorting.

### Prototype structure piece

Reference modular dimensions may use 32 px increments:

- 32 × 32;
- 64 × 32;
- 64 × 64.

This is a visual modularity convention only.

It does not define a building gameplay grid.

---

## CAMERA CONSTRAINTS

The visual renderer must preserve the approved P0-DES-001 camera behavior.

### Gameplay camera contract inherited from P0-DES-001

- target: resolved local-player world position;
- orientation: fixed top-down/3/4;
- default viewport anchor: (0.5, 0.5);
- no required gameplay dead-zone;
- no free pan or rotation in Phase 0;
- optional low-latency smoothing:
  - default target `cameraFollow90Time = 80 ms`;
  - allowed Phase 0 range 0–120 ms;
- normal sustained camera lag target: no more than 0.5 player collision-footprint width;
- spawn/reset camera snaps to the player before normal control begins;
- blocked input must not move the camera if resolved player position does not move.

### Art/render integration rule

Camera smoothing may operate in continuous/subpixel world coordinates.

Pixel stabilization happens only at the presentation/raster stage.

The pixel-art renderer must not satisfy pixel snapping by:

- snapping gameplay player position;
- changing resolved movement;
- creating visible grid stepping;
- exceeding the approved camera lag;
- adding a new dead-zone;
- adding a camera start delay.

### Reference framing

At reference camera zoom 1.0:

- viewport = 640 × 360 internal pixels;
- player converges on center anchor during unconstrained normal movement;
- visual reference cell = 32 internal pixels.

---

## PIXEL SNAPPING

### Simulation

No gameplay simulation coordinate is snapped to the 32 px art reference grid.

Player position remains continuous as specified by P0-DES-001.

### Presentation

At final world rasterization:

- sprite sampling must land on a stable internal-pixel grid;
- camera translation must not introduce half-texel blur;
- static sprites must not shimmer during camera movement;
- the rendered position may use a whole-internal-pixel snapped representation of the continuous simulation position.

Presentation snapping:

- must not feed back into simulation;
- must not change collision;
- must not change base movement speed;
- must not introduce 32 px stepping;
- must not violate the ≤50 ms visible movement responsiveness targets from P0-DES-001.

If Technical Lead chooses a renderer technique that supports subpixel transforms while producing visually equivalent stable pixels, that implementation is acceptable.

The acceptance criterion is visual stability, not a mandatory internal algorithm.

---

## FILTERING / SCALING

Required world/sprite texture sampling:

**nearest-neighbor / point sampling or exact visual equivalent**

Disallowed for Phase 0 world sprite presentation:

- bilinear filtering;
- trilinear filtering;
- automatic smoothing;
- runtime downsampling;
- mipmapping that softens prototype sprites;
- fractional CSS/canvas stretching of the reference world surface;
- per-sprite resampling that creates blurred pixel edges.

### Browser/device-pixel-ratio handling

The implementation must handle browser DPR so that:

- authored pixels remain discrete;
- the backing surface is sized intentionally;
- browser compositing does not soften the world layer;
- supported reference scales remain crisp.

Exact browser API implementation belongs to Technical Lead.

### Texture atlas if used

If a texture atlas is selected:

- frames must not sample neighboring sprites;
- sufficient padding/extrusion must exist;
- at least 1 internal-pixel-equivalent gutter/extrusion protection is required unless the renderer proves an equivalent no-bleed method.

An atlas is not required by P0-ART-001.

---

## DEPTH / LAYERING

Minimum conceptual render layers:

1. Ground.
2. Ground decals / debug ground markings.
3. Low props.
4. Dynamic entities.
5. Tall world objects.
6. Optional foreground/overhead test layer.
7. Prototype effects/debug visualization.
8. UI/debug overlay.

### Y-depth rule

For compatible world objects/entities, depth is based on their **ground/contact anchor**.

General ordering:

**larger ground Y renders in front of smaller ground Y**

The system must support at least the following observable case:

- player passes behind a tall object → tall object visually occludes the relevant player area;
- player moves in front of the same object → player renders in front.

Do not sort tall objects purely by:

- sprite top-left;
- full sprite center;
- sprite top edge.

Production roof-cutaway, multi-floor occlusion, and advanced masking are deferred.

---

## READABILITY REQUIREMENTS

### Player readability

Player must be distinguishable at:

- native 1× internal view;
- 2× presentation;
- 3× presentation.

Primary Phase 0 QA/reference check should use 2× presentation.

### Ground readability

Walkable ground must remain lower visual priority than the player.

Avoid dense 1 px noise that competes with the character while moving.

### Obstacle readability

Blocking test obstacle must be visually distinct from passable ground.

A tester should understand that the object is a physical blocker rather than a missing-input state.

### Tall-object readability

Ground-contact/base area must be visually understandable enough to evaluate front/behind ordering.

### Facing readability

If the placeholder player sprite itself does not communicate eight-direction facing, a debug facing marker may be used.

Final directional animation is not required.

### Contrast

The player must remain identifiable on both:

- a lighter test terrain;
- a darker test terrain.

### Color dependency

Critical prototype distinctions may not depend only on small hue differences.

Shape, value, pattern, outline, or other non-hue cues should support the distinction.

### Decorative complexity

Readability wins over decoration.

Placeholder terrain should remain intentionally sparse.

---

## PLACEHOLDER ASSETS REQUIRED

Minimum Phase 0 visual validation set:

### A. Player placeholder

- frame: 32 × 48 px;
- transparent background;
- documented feet/ground anchor;
- strong silhouette;
- optional facing/debug mark.

### B. Ground A

- 32 × 32 px;
- medium-value test ground.

### C. Ground B

- 32 × 32 px;
- materially lighter or darker than Ground A;
- used to verify player contrast.

### D. Blocking low obstacle

- approximate visible footprint: 24–32 px;
- approximate sprite bounds: up to 32 × 32 px;
- clearly distinct from walkable ground.

### E. Medium world object

- approximately 32 × 32 or 32 × 40 px;
- used for object-scale comparison and ordinary depth behavior.

### F. Tall depth-test object

- approximately 32 × 64 or 48 × 64 px;
- explicit ground anchor;
- used for front/behind sorting validation.

### G. Visual reference-grid debug marker

- indicates 32 × 32 px reference cell;
- development/debug only.

### H. Facing/debug marker

Required only if the placeholder player does not itself communicate the logical facing state needed by P0-DES-001.

No final environment pack or character pack is required.

---

## ASSET FORMAT

Prototype raster asset format:

**PNG with alpha**

Requirements:

- authored at internal resolution;
- no anti-aliased sprite edges;
- no pre-scaled 2×/3× duplicates required;
- no export resampling;
- clean transparency;
- standard RGB/RGBA compatible with selected renderer.

Indexed PNG is allowed if the selected toolchain preserves it correctly, but indexed color is not required.

### Naming

Prototype files must use stable descriptive names.

Avoid meaningless names such as:

- `final.png`;
- `new.png`;
- `test2.png`.

Final project-wide naming/export convention is deferred until Technical Lead/asset pipeline decisions require it.

---

## ANIMATION REQUIREMENTS

Final animation production is deferred.

Phase 0 requires only enough animation capability to prove that frame switching does not blur or destabilize pixel art.

Minimum acceptable validation:

- static player sprite is mandatory;
- optional short placeholder walk/test strip may be used to test frame changes.

If a test animation is created:

- all frames use stable bounds;
- ground anchor remains consistent;
- no frame-to-frame canvas drift;
- pixels remain integer-authored;
- animation timing is independent of display scale.

Not defined by P0-ART-001:

- final frame count;
- final animation FPS;
- final direction-set count;
- final locomotion animation style.

---

## RENDERING REQUIREMENTS

A candidate renderer/toolchain must be capable of demonstrating all of the following:

1. stable 640 × 360 internal-pixel reference world or visually equivalent result;
2. crisp 2× presentation at 1280 × 720;
3. crisp 3× presentation at 1920 × 1080;
4. nearest-neighbor / point-equivalent sampling;
5. continuous player world movement independent from 32 px reference cells;
6. presentation pixel stabilization without changing gameplay position;
7. no visible sprite blur during player movement;
8. no visible static-object shimmer during camera movement;
9. correct alpha transparency;
10. correct ground-anchor-based Y depth;
11. front/behind traversal around a tall object;
12. browser DPR handling that does not soften authored pixels;
13. fixed top-down/3/4 orientation;
14. centered player framing compatible with P0-DES-001;
15. camera smoothing compatible with the 0–120 ms gameplay range;
16. pixel stabilization that does not violate P0-DES-001 movement/camera responsiveness;
17. world coordinates and render coordinates that can remain distinct;
18. sprites larger than one visual reference cell;
19. arbitrary entity placement not restricted to visual-cell boundaries.

---

## TECHNICAL CONSTRAINTS

Technical Lead retains authority over:

- renderer/framework/engine selection;
- Canvas/WebGL/WebGPU or other browser rendering API;
- internal render-target implementation;
- transform architecture;
- camera implementation;
- batching;
- atlas layout;
- texture-memory budgets;
- performance budgets;
- fixed timestep and interpolation architecture.

P0-ART-001 requires only the observable rendering result.

### Required separation

The runtime must be able to preserve a conceptual separation between:

`continuous simulation position → presentation transform → pixel-stable raster → integer display presentation`

Art-side presentation constraints must never force gameplay simulation onto a tile grid.

---

## INTEGRATION REQUIREMENTS

Gameplay/render integration must support:

- arbitrary continuous player world coordinates;
- arbitrary continuous object coordinates;
- visual sprite attachment to gameplay entities;
- documented player ground/depth anchor;
- documented object ground/depth anchor where depth sorting applies;
- fixed top-down/3/4 camera orientation;
- P0-DES-001 camera target and smoothing values;
- visual/presentation snapping that does not mutate gameplay state.

Prototype debug support should make it possible to inspect:

- 32 px visual reference grid;
- entity world origin;
- ground/depth anchor;
- camera continuous position;
- camera final raster position.

Debug visualization is developer-facing and not production UI.

---

## PHASE 0 SCOPE

Included:

- reference internal render resolution;
- reference world camera zoom;
- visual reference-cell scale;
- placeholder character proportions;
- placeholder object proportions;
- pixel filtering rules;
- integer display scaling rules;
- presentation snapping expectations;
- browser crispness requirement;
- minimum depth/layering model;
- placeholder asset inventory;
- camera/render integration with P0-DES-001;
- renderer evaluation acceptance criteria.

Phase 0 does not require a complete art pipeline or final Art Bible.

---

## DEFERRED

Deferred to later Art Bible / feature-specific tasks:

- final palette;
- final character design;
- final character anatomy/proportions;
- final directional animation set;
- production animation FPS;
- biome visual identity;
- full terrain transition language;
- complete tilesets;
- final building art;
- final UI;
- profession visual identity;
- final alien visual language;
- final ruin art;
- production shadows;
- dynamic lighting;
- day/night grading;
- weather VFX;
- combat VFX;
- final particle language;
- production texture-atlas policy;
- advanced roof/foreground occlusion;
- accessibility UI;
- final responsive/multi-resolution policy.

---

## NON-GOALS

P0-ART-001 does not produce:

- final character;
- biome packs;
- complete tileset;
- final UI;
- production animation library;
- final lighting system;
- final VFX;
- narrative environment art;
- final colony-building asset set.

P0-ART-001 does not change:

- player movement rules;
- base movement speed;
- acceleration/deceleration;
- collision rules;
- camera follow gameplay behavior;
- camera smoothing range;
- control scheme;
- gameplay interaction ranges.

---

# ACCEPTANCE CRITERIA

## AC-ART-001 — Visual reference scale

A 32 × 32 internal-pixel visual reference cell is documented and usable for prototype proportions.

**PASS:** assets follow a consistent visual scale while gameplay positions remain continuous.

**FAIL:** movement or entity placement is forced to 32 px increments.

## AC-ART-002 — Reference raster

The renderer produces a stable 640 × 360 internal-pixel reference world or visually equivalent output.

**PASS:** authored pixels remain discrete and stable.

## AC-ART-003 — 720p integer presentation

At 1280 × 720 reference presentation, the world is rendered at clean 2× pixel scale.

**FAIL:** visible interpolation/softening occurs.

## AC-ART-004 — 1080p integer presentation

At 1920 × 1080 reference presentation, the world is rendered at clean 3× pixel scale.

## AC-ART-005 — Filtering

Prototype sprite textures use nearest-neighbor / point-equivalent sampling.

**FAIL:** bilinear or similar smoothing softens pixel boundaries.

## AC-ART-006 — Continuous movement independence

The player may occupy and move through arbitrary continuous positions inside the 32 px art reference grid.

**PASS:** art snapping does not produce gameplay grid-lock.

## AC-ART-007 — Movement responsiveness preservation

Pixel stabilization does not introduce intentional visible movement delay beyond the P0-DES-001 responsiveness contract.

**PASS:** presentation remains compatible with ≤50 ms P95 movement start/stop/direction targets in baseline conditions.

## AC-ART-008 — Camera contract preservation

The visual camera supports:

- centered 0.5/0.5 anchor;
- no required gameplay dead-zone;
- resolved-position target;
- 0–120 ms smoothing range;
- target 80 ms smoothing;
- spawn/reset snap;
- no camera drift from blocked input.

## AC-ART-009 — Pixel stability

During camera movement through a static test scene:

**PASS:** static sprites remain crisp and do not shimmer from sampling instability.

## AC-ART-010 — Character scale

Prototype player uses a 32 × 48 px reference frame or a documented visually equivalent frame preserving the same reference proportion.

## AC-ART-011 — Player readability

At 2× presentation, the player is clearly distinguishable on both light and dark test ground.

## AC-ART-012 — Ground anchor

Player and tall depth-test object expose/document a ground/depth anchor.

## AC-ART-013 — Front/behind depth

Player renders behind a tall object when its ground anchor is behind that object and in front when its ground anchor passes in front.

## AC-ART-014 — Alpha quality

Transparent sprite edges render cleanly without interpolation halos.

## AC-ART-015 — Browser scaling

Supported reference integer display scales do not make the world soft or distorted.

## AC-ART-016 — Scope control

No final-art asset pack, final UI, production lighting, or production VFX is required to complete Phase 0.

## AC-ART-017 — Renderer evaluation readiness

Technical Lead can reject a candidate renderer/toolchain if it cannot meet:

- stable internal pixel raster;
- nearest filtering;
- integer reference scaling;
- continuous simulation + pixel-stable presentation separation;
- ground-anchor depth sorting;
- browser crispness;
- P0-DES-001 camera compatibility.

---

# OPEN QUESTIONS

## OQ-ART-001 — Exact collision-footprint dimensions

**Classification:** OPEN QUESTION / NON-BLOCKING

P0-DES-001 defines the footprint behavior but intentionally leaves exact dimensions/shape to Technical/Art integration.

Art requirement is limited to:

- visible feet/ground-contact region;
- ground anchor;
- sprite bounds independent from gameplay collider.

**Required owner for final technical definition:** Technical Lead through Technical Design.

**Blocks P0-ART-001:** NO.

## OQ-ART-002 — Production performance and texture budgets

**Classification:** OPEN QUESTION / NON-BLOCKING

No approved numerical budget currently exists for:

- frame time;
- sprite count;
- batch count;
- atlas maximum size;
- texture memory.

These are not required to define the Phase 0 pixel/render reference.

**Required owner:** Technical Lead.

**Blocks P0-ART-001:** NO.

---

# SELF-CHECK AGAINST SOURCE ISSUE

- Target visual scale defined: PASS.
- Internal/native reference resolution defined: PASS.
- Pixel density/scale defined: PASS.
- World-unit visual reference defined without creating gameplay grid-lock: PASS.
- Character/world proportions defined: PASS.
- Placeholder character dimensions defined: PASS.
- Placeholder terrain/object dimensions defined: PASS.
- Camera visual constraints defined and aligned with P0-DES-001: PASS.
- Pixel snapping expectation defined: PASS.
- Filtering requirement defined: PASS.
- Scaling rules defined: PASS.
- Blur/shimmer prevention requirements defined: PASS.
- Top-down/3/4 depth/layer expectations defined: PASS.
- Readability requirements defined: PASS.
- Placeholder asset list defined: PASS.
- Final-art production avoided: PASS.
- Technical Lead has renderer evaluation criteria: PASS.
- Gameplay Engineer has a prototype visual target: PASS.
- QA can derive visual PASS/FAIL checks: PASS.
- Blocking OPEN QUESTION: NONE.
- DECISION NEEDED: NONE.

**Art Director result: READY FOR PRODUCER DoD VERIFICATION.**
