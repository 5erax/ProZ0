# ADR-P0-TECH-001 — Engine / Framework / Renderer

**Task:** P0-TECH-001  
**System:** Phase 0 Runtime Toolchain  
**Role:** Technical Lead / Game Architect  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Source Issue:** #3  
**Date:** 2026-09-22

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- ProZ0 targets desktop browser for Phase 0.
- ProZ0 is a 2D pixel-art, top-down/3/4 game.
- Player/world simulation positions are continuous and must not be grid-locked.
- Rendering must support a stable 640 × 360 internal-pixel reference world or visually equivalent result.
- Reference presentation must support crisp 2× at 1280 × 720 and crisp 3× at 1920 × 1080.
- Pixel textures require nearest-neighbor / point-equivalent filtering.
- Presentation pixel stabilization must not mutate gameplay/simulation state.
- Ground-anchor-based Y depth ordering is required.
- Phase 0 movement/camera responsiveness must remain compatible with ≤50 ms P95 visible movement start/stop/direction targets under baseline conditions.
- Camera smoothing range is 0–120 ms with an 80 ms target and follows resolved player world position.
- Repository technical direction requires deterministic/shared simulation, fixed simulation steps, chunk streaming, server-authoritative multiplayer direction, versioned persistence, and separation between presentation, shared simulation, persistence, and content.
- Hosted co-op target is 2–10 players.
- The repository currently has no official runtime implementation, package manifest, or Vite configuration that constrains this decision.

## CONSTRAINT

- Renderer/framework state must never become authoritative gameplay state.
- Shared simulation must be reusable without a browser renderer so that a later host/server runtime can execute the same world rules.
- Renderer selection must not force gameplay coordinates onto a tile/pixel grid.
- Phase 0 must remain proportionate; do not build a custom graphics engine.
- Full multiplayer, persistence implementation, collision algorithm, exact fixed timestep, and production asset/performance budgets are deferred to their authorized Technical tasks.

## OPEN QUESTION

- Exact player collision-footprint dimensions/shape: non-blocking; deferred to later Technical Design integration.
- Final production frame-time, sprite-count, atlas, and texture-memory budgets: non-blocking; detailed budget deferred to performance/test strategy after representative profiling.

## DECISION NEEDED

None from Project Owner.

---

# ADR

## ADR ID

ADR-P0-TECH-001

## CONTEXT

P0-TECH-001 must select the browser runtime toolchain before runtime/module architecture and implementation can proceed.

The selected stack must satisfy two different needs without coupling them:

1. a browser-first 2D pixel presentation layer with exact control over sampling, raster scale, camera transforms, layering, and DPR behavior; and
2. a deterministic/shared simulation layer that can later execute in both a browser client and a server/host process without importing rendering or DOM state.

The project does not need a 3D engine, editor-driven scene authority, a general physics engine, or a production art pipeline in Phase 0.

## DECISION

Use the following Phase 0 runtime/toolchain direction:

- **Language:** TypeScript.
- **Browser build/dev tool:** Vite.
- **Renderer/framework:** PixiJS v8.
- **Production rendering backend for Phase 0:** WebGL/WebGL2 through PixiJS.
- **WebGPU:** explicitly deferred; may be evaluated later behind the presentation boundary, but is not the Phase 0 default.
- **Simulation:** project-owned, renderer-independent TypeScript modules.
- **Testing compatibility:** Vitest for pure TypeScript/unit/integration tests; real-browser tests may use Vitest Browser Mode with a Playwright provider where renderer/browser behavior must be validated.
- **Package/runtime bootstrap:** Node.js active-LTS line selected and pinned at implementation time; npm lockfile is acceptable as the default bootstrap unless P0-TECH-007 records a different project-wide package-management decision.

This is deliberately a **renderer-centric stack rather than a full game engine**.

PixiJS is allowed to own:

- GPU/canvas presentation;
- scene graph objects used only for presentation;
- textures/assets at the presentation layer;
- render layers/containers;
- render-target composition;
- visual transforms;
- browser renderer integration.

PixiJS must not own authoritative:

- player/world position;
- movement rules;
- collision truth;
- chunk lifecycle truth;
- deterministic RNG;
- world mutations;
- inventory/state transactions;
- persistence schema;
- networking authority.

## ALTERNATIVES

### Alternative A — Phaser 4 + TypeScript

Phaser is a web-first 2D framework with WebGL/Canvas renderers, browser-focused APIs, camera/input/scene systems, and explicit pixel-art configuration.

**Advantages**
- Fast bootstrap for browser game features.
- Built-in input, camera, scene lifecycle, assets, scale manager, and common 2D helpers.
- Pixel-art configuration directly supports nearest-neighbor style rendering.
- Strong browser-first orientation.

**Trade-offs / reason not selected**
- ProZ0 already requires a separately owned deterministic/shared simulation and future server authority.
- Phaser scene/game-object lifecycle would need strict architectural containment to avoid becoming accidental gameplay authority.
- Using Phaser mainly as a presentation shell would leave a substantial portion of its engine lifecycle intentionally bypassed while still increasing framework coupling.
- PixiJS provides the rendering capabilities needed by P0-ART-001 with a smaller authority surface.

### Alternative B — Godot 4 Web export

Godot provides a mature editor, 2D scene system, animation, physics, asset workflows, and browser export through WebAssembly/WebGL2 Compatibility rendering.

**Advantages**
- Strong integrated editor and 2D tooling.
- Mature scene/content workflow.
- Built-in physics and game-engine services.

**Trade-offs / reason not selected**
- Browser-first delivery is an export target rather than the native development/runtime model.
- Shared authoritative simulation reuse between browser and a future lightweight server/host runtime is less direct than pure TypeScript modules.
- Godot web export adds WebAssembly/runtime constraints and currently limits some language/runtime choices on web.
- The integrated engine surface is substantially larger than needed for the Phase 0 movement/rendering slice.
- It creates more migration cost if ProZ0 later needs browser-native networking, debugging, tooling, or shared Node/server packages.

### Alternative C — Raw Canvas/WebGL/WebGPU

**Advantages**
- Maximum renderer control.
- No framework dependency.

**Trade-offs / reason not selected**
- Reimplements texture management, scene organization, batching, render-target plumbing, asset loading, transforms, and other solved problems.
- Adds technical risk without producing gameplay value.
- Violates the Phase 0 principle of avoiding unnecessary infrastructure.

## TRADE-OFFS

The selected PixiJS stack intentionally trades built-in engine systems for architectural control.

Costs we accept:

- camera behavior is project-owned;
- input mapping is project-owned;
- collision is project-owned or separately selected later;
- chunk render lifecycle is project-owned;
- deterministic game loop is project-owned;
- editor-driven scene authoring is not provided by the runtime stack.

Benefits:

- browser-native TypeScript end-to-end;
- presentation can be replaced or upgraded without rewriting simulation rules;
- shared simulation can later execute in Node/server runtime;
- deterministic tests can run without WebGL/DOM;
- pixel-art renderer behavior remains explicit;
- chunk streaming and world persistence do not depend on scene-object identity;
- future server authority does not require running the client renderer/framework.

## CONSEQUENCES

1. P0-TECH-002 must define a hard dependency boundary in which presentation depends on shared simulation contracts, never the reverse.
2. P0-TECH-003 must own fixed-step/determinism/RNG decisions independently from the Pixi ticker.
3. The Pixi application ticker must not be treated as authoritative simulation time.
4. P0-ENG-001 must bootstrap Pixi as a client presentation adapter rather than as the game-state owner.
5. Renderer objects are disposable/reconstructable views of simulation state.
6. Save data must contain domain data only and must never serialize Pixi objects.
7. Future server/host runtime must be able to import shared simulation without importing Pixi, DOM, Canvas, or browser input code.
8. WebGPU remains an optional future renderer backend; switching it on must not affect simulation semantics.
9. Browser support in Phase 0 requires WebGL/WebGL2 capability; no Canvas renderer fallback is required by this ADR.
10. Full production browser-support matrix is deferred to P0-TECH-007.

---

# TECHNICAL DESIGN SPEC

## SYSTEM

Phase 0 Engine / Framework / Renderer Foundation

## ARCHITECTURE OVERVIEW

Conceptual dependency direction:

```text
Browser Input / DOM
        |
        v
Client Input Adapter
        |
        v
Shared Simulation Contracts / State
        |
        +----------------------+
        |                      |
        v                      v
Future Host/Server       Presentation Adapter
(no Pixi/DOM)                  |
                               v
                         PixiJS v8 / WebGL
                               |
                               v
                  640x360 internal raster/presentation
```

Presentation reads authoritative/resolved simulation outputs and never mutates gameplay state through render-space quantization.

Required render pipeline concept:

```text
continuous simulation position
        -> presentation interpolation/transform
        -> pixel-stable internal raster
        -> integer reference display presentation
```

## COMPONENTS

### 1. Shared simulation core

Renderer-independent TypeScript domain logic.

### 2. Client input adapter

Converts browser keyboard/focus state into logical gameplay input commands/state.

### 3. Presentation adapter

Maps simulation snapshots/state to render entities, layers, anchors, and camera targets.

### 4. Pixi renderer

Owns WebGL presentation, textures, scene containers/layers, internal render target, and final display composition.

### 5. Camera presentation component

Consumes resolved simulation position and gameplay-owned follow tuning; produces presentation camera position and pixel-stable raster camera transform.

### 6. Browser host shell

Owns page/canvas attachment, resize/reference-presentation behavior, focus handling, and runtime startup/shutdown.

## RESPONSIBILITIES

- Simulation decides gameplay state and resolved positions.
- Presentation decides only how confirmed state is visualized.
- Browser host owns browser lifecycle and DOM integration.
- Pixi owns render resources only.
- Future persistence/network modules consume domain state/contracts, not Pixi objects.

## DATA MODEL

Toolchain-level domain rule:

- gameplay coordinates: numeric continuous world-space values owned by simulation;
- presentation coordinates: derived values, may be interpolated;
- raster coordinates: derived presentation values, may be quantized/snapped;
- sprite anchor metadata: presentation/content data;
- ground/depth anchor: presentation metadata derived from entity/content definitions;
- renderer handles/Texture/Sprite/Container references: presentation-only ephemeral state.

No Pixi class may appear in shared simulation public data structures.

## DATA OWNERSHIP

| Data | Owner |
|---|---|
| Player/world gameplay position | Shared simulation |
| Intended/resolved velocity | Shared simulation |
| Facing/locomotion state | Shared simulation |
| Collision result | Shared simulation/world domain |
| Camera gameplay target/tuning | Gameplay/shared contract |
| Camera smoothed presentation position | Client presentation |
| Raster-snapped camera position | Client presentation |
| Sprite/texture/container | Pixi presentation |
| Render depth/z-order | Client presentation using ground-anchor data |
| Chunk authoritative state | World/shared domain |
| Chunk render objects | Client presentation |

## CLIENT RESPONSIBILITY

- Capture local browser input.
- Run local Phase 0 simulation as authorized by later Technical Designs.
- Render confirmed/resolved state.
- Apply camera smoothing/pixel stabilization.
- Manage browser canvas, DPR, reference presentation modes, and visual assets.
- Never treat render object coordinates as canonical gameplay state.

## SERVER RESPONSIBILITY

Phase 0 does not implement a network server.

Architecture requirement for future work:

- server/host must be able to execute shared simulation without Pixi;
- future server authority will validate gameplay commands and own critical world state as specified by later networking design;
- renderer selection must impose no server runtime dependency.

## PERSISTENCE

- Renderer state is never persisted.
- Pixi object identity is never part of save identity.
- Persisted state must be domain data and versioned by later P0-TECH-005.
- Presentation state may be reconstructed from domain state + content definitions.

## NETWORKING

Not implemented by this ADR.

Compatibility rules:

- shared simulation state/contracts must be serializable without renderer objects;
- local input must be representable as gameplay commands/state independent of browser KeyboardEvent objects;
- presentation consumes snapshots/resolved state and remains non-authoritative;
- future client prediction/reconciliation must not require changing renderer ownership.

## PUBLIC INTERFACES

Exact interfaces are deferred to P0-TECH-002, but the following boundaries are mandatory:

```ts
// conceptual only; not implementation authorization
interface SimulationSnapshot {
  // pure serializable/domain data only
}

interface InputState {
  // logical gameplay inputs only
}

interface PresentationAdapter {
  render(snapshot: SimulationSnapshot, alpha: number): void;
}
```

No public shared-simulation interface may expose Pixi types.

## FAILURE HANDLING

- Renderer initialization failure: stop startup cleanly and surface a browser/render capability error; do not create partially-authoritative render state.
- WebGL context loss: presentation may pause/rebuild while simulation/domain state remains logically separate; detailed recovery UX belongs to later implementation/test design.
- Asset load failure: presentation reports the missing asset and uses an explicit test/dev failure path; no gameplay rule may depend on silent asset failure.
- Resize/DPR mismatch: must not alter gameplay coordinates or simulation speed.
- Lost browser focus: input adapter must clear/suspend active movement state as required by P0-DES-001.

## PERFORMANCE

Phase 0 baseline target is approximately 60 FPS browser presentation and must preserve P0-DES-001's ≤50 ms P95 visible movement start/stop/direction target under baseline conditions.

Renderer strategy:

- WebGL is the Phase 0 production backend.
- Internal world raster uses the 640 × 360 reference target or an implementation proven visually equivalent.
- Nearest texture sampling is mandatory for prototype raster art.
- Visible/active world rendering should be scoped by chunk/viewport rather than retaining an unbounded near-infinite world scene graph.
- Y-depth sorting should operate only on relevant visible/active objects rather than globally sorting an unbounded world.
- WebGPU optimization is deferred until profiling demonstrates a need and browser behavior is proven stable.
- Detailed frame-time, sprite-count, texture-memory, and atlas budgets are deferred until representative Phase 0 content exists; P0-TECH-007 must define measurable profiling/CI checks where appropriate.

## SECURITY / VALIDATION

- Browser/client presentation is not trusted authority for future multiplayer.
- Renderer-derived state cannot validate inventory, damage, building, chunk mutation, or persistence.
- Future network inputs cross a domain validation boundary before mutating authoritative state.
- Browser events are converted to bounded logical input state; raw DOM event objects do not enter shared simulation state.

## OBSERVABILITY

Phase 0 developer diagnostics should expose enough information to verify the selected stack:

- render FPS/frame time;
- simulation update timing once P0-TECH-003 defines it;
- camera continuous presentation position;
- final raster camera position;
- browser DPR;
- active integer reference scale;
- active/visible chunk count when chunk rendering exists;
- renderer backend;
- WebGL/context failure events;
- asset-load failures.

Art/debug requirements should also expose:

- 32 × 32 visual reference grid;
- entity world origin;
- ground/depth anchor.

## TEST STRATEGY

This ADR requires the stack to support, but does not fully define, the P0-TECH-007 test plan.

Required testability properties:

1. shared simulation unit tests run without Pixi/DOM;
2. deterministic tests can execute the same simulation input repeatedly without renderer timing;
3. browser tests validate canvas startup and renderer initialization;
4. pixel-art browser tests validate nearest sampling/reference scaling;
5. camera/render integration tests validate simulation position remains continuous while raster presentation may snap;
6. browser focus-loss tests validate movement input clearing;
7. visual/manual or image-based checks validate front/behind ground-anchor depth behavior and static-scene pixel stability.

Vitest is compatible with pure TypeScript tests and supports native browser mode; a Playwright provider may be used for headless real-browser validation.

## MIGRATION

- Lock PixiJS to the v8 major line during Phase 0 implementation.
- Minor/patch upgrades require render smoke tests and pixel-art regression checks.
- Do not expose Pixi types across shared-domain boundaries; this is the primary renderer-migration seam.
- A future renderer/backend migration is acceptable only if P0-ART-001 observable behavior and shared-simulation contracts remain unchanged.
- WebGPU adoption, if later approved, occurs behind the presentation adapter.

## KNOWN LIMITATIONS

- No built-in gameplay physics/collision solution is selected here.
- No editor-authored scene workflow is provided by PixiJS.
- No production Canvas fallback is part of the selected PixiJS v8 Phase 0 path.
- No final browser compatibility matrix is defined here.
- No full asset pipeline or atlas policy is defined here.
- No exact fixed simulation timestep is defined here.
- No exact collision-footprint dimensions/shape is defined here.

These are either intentionally project-owned or assigned to later authorized tasks.

## FUTURE EXTENSION

The decision preserves these paths:

- Node-based authoritative host/server using shared TypeScript simulation;
- worker-based simulation if later profiling justifies it;
- WebGPU renderer evaluation behind the presentation boundary;
- chunk-scoped rendering/culling;
- texture atlases and batching policies;
- client prediction/reconciliation;
- headless deterministic simulation tests;
- additional desktop/browser packaging without changing domain ownership.

---

# PIXEL / CAMERA RENDERING CONTRACT

Implementation under this ADR must preserve:

1. simulation positions remain continuous;
2. presentation may interpolate;
3. raster position may be quantized for pixel stability;
4. quantization never writes back into simulation position;
5. prototype textures use nearest sampling;
6. reference internal world raster is 640 × 360 or proven visually equivalent;
7. 1280 × 720 reference output is crisp 2×;
8. 1920 × 1080 reference output is crisp 3×;
9. browser DPR must not soften authored pixels;
10. camera follows resolved position, not raw input;
11. camera smoothing remains within the 0–120 ms gameplay contract;
12. ground-anchor Y value drives front/behind ordering where required;
13. sprites may exceed one 32 × 32 visual reference cell;
14. arbitrary entity placement remains independent from reference-cell boundaries.

---

# FRAMEWORK-SPECIFIC IMPLEMENTATION CONSTRAINTS

## PixiJS

- Prefer WebGL renderer for Phase 0 production.
- Do not make WebGPU the default in Phase 0.
- Texture sources used for pixel art must use nearest scale mode.
- Do not rely on renderer/global position as gameplay state.
- Use scene containers/render layers only as presentation organization.
- Any zIndex/depth sorting must use presentation depth metadata such as ground anchor, not sprite top-left.
- Large-world rendering must activate/cull by project-owned chunk/viewport lifecycle instead of treating the entire procedural world as one permanent scene graph.

## Vite

- Client production output must be a browser-deployable static bundle.
- Exact browser target is defined later by P0-TECH-007; do not silently expand support to legacy browsers without requirement.
- Vite is a build/dev tool, not simulation authority.

## Vitest / browser tests

- Pure simulation tests remain Node-compatible and renderer-free.
- Browser-only rendering assertions execute in a real browser environment when DOM/WebGL behavior matters.

---

# FILE PLAN

## CREATE

`docs/adr/ADR-P0-TECH-001-engine-framework-renderer.md`

**Purpose:**  
Persist the authoritative engine/framework/renderer decision for P0-TECH-001.

**Responsibility:**  
Define Phase 0 toolchain choice, renderer authority boundary, evaluated alternatives, constraints, consequences, and downstream technical requirements.

**API:**  
Documentation artifact; no runtime API.

## FUTURE IMPLEMENTATION FILES

This ADR intentionally does **not** authorize code creation.

Expected bootstrap files such as `package.json`, `tsconfig.json`, `vite.config.ts`, browser entry points, and renderer adapters must be planned under the downstream approved Technical Designs and implemented only when Producer activates P0-ENG-001.

Exact runtime module/file boundaries are owned by P0-TECH-002 and must not be pre-empted here.

---

# EXTERNAL TECHNICAL VERIFICATION

Verified against current official documentation on 2026-09-22:

- PixiJS renderer guidance: https://pixijs.com/8.x/guides/components/renderers
- PixiJS texture model / scale mode: https://pixijs.com/8.x/guides/components/textures
- PixiJS scene graph / culling: https://pixijs.com/8.x/guides/concepts/scene-graph
- PixiJS render layers: https://pixijs.com/8.x/guides/concepts/render-layers
- Phaser framework overview: https://docs.phaser.io/
- Phaser pixel-art configuration: https://docs.phaser.io/api-documentation/class/core-config
- Godot web export constraints: https://docs.godotengine.org/en/4.5/tutorials/export/exporting_for_web.html
- Vite production build: https://vite.dev/guide/build
- Vitest Browser Mode: https://vitest.dev/guide/browser/

External documentation is supporting evidence for tool capability only. ProZ0 gameplay/product requirements remain governed by the repository Source of Truth hierarchy.

---

# ACCEPTANCE CRITERIA SELF-CHECK

## Issue AC — ADR documents options, trade-offs, decision, rejected alternatives, constraints, and consequences

**PASS**

Documented:
- selected toolchain;
- Phaser alternative;
- Godot alternative;
- raw renderer alternative;
- accepted costs;
- rejection reasons;
- constraints;
- downstream consequences.

## Issue AC — Decision satisfies all confirmed Phase 0 product constraints

**PASS**

Compatibility:
- desktop browser: PASS;
- 2D pixel rendering: PASS;
- 640 × 360 reference raster: PASS;
- nearest filtering: PASS;
- integer 2×/3× reference presentation: PASS;
- continuous non-grid simulation: PASS;
- simulation/render separation: PASS;
- camera responsiveness compatibility: PASS;
- ground-anchor Y-depth: PASS;
- deterministic/shared simulation direction: PASS;
- renderer-independent testing: PASS;
- future server-authoritative multiplayer path: PASS;
- chunk-streaming path: PASS;
- no final-art pipeline scope expansion: PASS.

## ROLE DEFINITION OF DONE SELF-CHECK

- Ownership unambiguous: PASS.
- Authority unambiguous: PASS.
- Persistence boundary clear: PASS.
- Networking compatibility clear: PASS.
- Interfaces/boundaries clear at ADR scope: PASS.
- File plan clear for this task: PASS.
- Engineer can identify selected toolchain: PASS.
- Testing strategy compatible/clear at ADR scope: PASS.
- Main failure modes considered: PASS.
- No unnecessary production system implemented: PASS.
- MVP proportionality preserved: PASS.
- Long-term server/multiplayer roadmap not locked to client renderer: PASS.

---

# HANDOFF

Return to Producer / Project Manager for:

1. artifact/DoD verification;
2. lifecycle update of P0-TECH-001;
3. dependency-gate evaluation for P0-TECH-002.

No downstream task is activated by this ADR itself.

**PROJECT OWNER ACTION: NONE**
