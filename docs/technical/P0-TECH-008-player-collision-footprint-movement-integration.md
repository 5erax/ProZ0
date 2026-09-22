# P0-TECH-008 — Player Collision Footprint & Movement Integration Contract

**Task:** P0-TECH-008  
**Source Issue:** #18  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22  
**Depends on:** P0-DES-001, P0-ART-001, ADR-P0-TECH-001/002/003, merged P0-ENG-001

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- Player locomotion is continuous world-space movement and must not grid-lock.
- Collision represents the player's ground-contact footprint, not the full sprite rectangle.
- Exact collision shape/dimensions are intentionally delegated by Design and Art to Technical integration.
- Solid geometry blocks locomotion; decorative visuals are not automatically solid.
- Collision must prevent penetration.
- When only one movement component is blocked, the unblocked tangential component continues.
- Wall-slide remaining movement is not renormalized to full speed.
- Sustained direct-wall/corner contact must not bounce, jitter, teleport, penetrate, or grid-snap.
- A narrow gap is traversable only if the collision footprint fits; the footprint does not shrink dynamically.
- Player visual ground/depth anchor is the center of the feet / ground-contact point.
- Prototype player visual frame is 32 × 48 authored internal pixels.
- ADR-P0-TECH-004 defines 1 WorldUnit = 32 authored internal pixels at reference zoom 1.0.
- Authoritative movement/collision belongs in simulation/world domain, not Pixi/presentation.
- Phase 0 authoritative simulation uses a fixed 60 Hz step.

## CONSTRAINT

- This Technical Design may choose representation and exact dimensions, but may not change the approved collision gameplay behavior.
- Collider dimensions must remain independent of sprite frame bounds.
- Phase 0 does not require a physics engine, dynamic rigid bodies, combat hitboxes/hurtboxes, or production biome collision.
- Collision queries must be deterministic and independent from renderer state/frame rate.

## ASSUMPTION

None required.

## DECISION NEEDED

None from Project Owner.

---

# ADR

## ADR ID

ADR-P0-TECH-008

## CONTEXT

P0-ENG-002 cannot implement movement/collision without an exact player footprint and a deterministic integration boundary between simulation and world collision queries.

The selected solution must satisfy four practical constraints:

1. fit the approved 32 × 48 pixel player presentation without treating the full sprite as solid;
2. preserve center-of-feet/ground-contact anchoring;
3. make wall sliding and narrow-gap behavior unambiguous;
4. remain simple, deterministic, testable, and renderer-independent for Phase 0.

## DECISION

Use an **axis-aligned rectangular ground-contact footprint (AABB)** for the Phase 0 player.

### Exact dimensions

At reference scale:

- **width X:** 20 authored internal pixels;
- **depth Y:** 12 authored internal pixels.

Using ADR-P0-TECH-004 world scale:

- **width:** 20 / 32 = **0.625 WorldUnit**;
- **depth:** 12 / 32 = **0.375 WorldUnit**;
- **half width:** **0.3125 WorldUnit** = 10 px;
- **half depth:** **0.1875 WorldUnit** = 6 px.

Canonical contract:

```ts
const PLAYER_COLLISION_FOOTPRINT = {
  shape: 'aabb',
  width: 0.625,
  depth: 0.375,
  halfWidth: 0.3125,
  halfDepth: 0.1875,
} as const;
```

### Anchor/origin

The authoritative player world position is the **center of the collision footprint**.

That same point is the presentation **ground/depth anchor: center of the feet / ground-contact point**.

Therefore the footprint occupies:

```text
X: player.x - 0.3125  .. player.x + 0.3125 WorldUnit
Y: player.y - 0.1875  .. player.y + 0.1875 WorldUnit
```

The 32 × 48 sprite is attached so its documented feet/ground anchor aligns to this authoritative world position.

Sprite top-left, sprite center, transparent frame bounds, animation frame dimensions, and Pixi object bounds never define gameplay collision.

### Why 20 × 12 px

This is a Technical/Art integration choice, not a new gameplay rule.

It provides:

- a footprint materially smaller than the 32 px sprite width;
- a shallow ground-contact region appropriate to the approved top-down/3/4 presentation;
- symmetric center-of-feet anchoring;
- exact binary WorldUnit fractions (5/8 × 3/8), avoiding unnecessary numeric representation noise;
- enough width to make the Design-defined "4.5 footprint widths/sec" tuning directly measurable.

### Base-speed integration

P0-DES-001 defines the initial Phase 0 target as:

**4.5 player collision-footprint widths per second.**

With the approved 20 px / 0.625 WorldUnit footprint width:

```text
baseMoveSpeed
= 4.5 × 0.625 WorldUnit/s
= 2.8125 WorldUnit/s
= 90 authored internal px/s
```

At the approved 60 Hz simulation step:

```text
cardinal displacement/tick
= 2.8125 / 60
= 0.046875 WorldUnit
= 1.5 authored internal px
```

This value remains **movement tuning data**, not renderer state.

If Game Design later retunes speed, collision dimensions do not automatically change. If collision dimensions later change, Design must decide whether the "4.5 footprint widths/sec" relationship remains the desired tuning rule.

### Diagonal normalization

For two-axis digital input, use the approved normalized direction.

For Phase 0 deterministic implementation, a precomputed constant is acceptable:

```ts
const INV_SQRT_2 = 0.7071067811865476;
```

Thus a diagonal component uses:

```text
baseMoveSpeed × INV_SQRT_2
```

When collision blocks one axis, the remaining component keeps that original component magnitude. It is **not renormalized** to `baseMoveSpeed`.

---

# COLLISION REPRESENTATION

## Player

Player footprint:

- shape: AABB;
- axis-aligned in world space;
- fixed dimensions for Phase 0;
- does not rotate with facing.

## Phase 0 solid geometry

Static blocking test/world geometry is represented as explicit **world-space solid AABBs**.

Conceptual type:

```ts
interface StaticSolidAabb {
  readonly id: string;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
```

Rules:

- bounds use WorldUnits;
- `minX < maxX`, `minY < maxY`;
- solid geometry is explicit gameplay/world data;
- visible sprite dimensions do not imply collision;
- production terrain/biome collision representation is deferred.

## Contact semantics

Two AABBs are penetrating only when their interiors overlap with positive area.

Edge/face touching is valid non-penetrating contact.

Therefore:

- a gap **smaller than 0.625 WorldUnit / 20 px** is not traversable;
- a gap **exactly 0.625 WorldUnit / 20 px** geometrically fits and is traversable when aligned;
- a larger gap is traversable.

Any numerical epsilon used by implementation:

- is comparison/stability-only;
- must not shrink the player footprint;
- must not expand a gap for traversal;
- must be no larger than **1/1024 authored internal pixel** (1 / 32768 WorldUnit) unless a later Technical Design explicitly changes this tolerance.

---

# MOVEMENT / COLLISION RESOLUTION CONTRACT

## Selected Phase 0 solver

Use a deterministic **axis-separated swept AABB clamp**, with fixed axis order:

1. resolve X translation;
2. apply resolved X;
3. resolve Y translation from the updated X position;
4. apply resolved Y.

This is a project-owned static-character collision solver. No physics engine is required.

### Why this solver

It directly satisfies the approved Phase 0 behavior:

- continuous coordinates;
- no tile stepping;
- no penetration;
- no tunneling through static AABBs along the resolved axis;
- natural wall sliding;
- no wall-slide speed boost;
- stable direct-wall contact;
- deterministic/simple tests.

A fixed X-then-Y order is chosen for deterministic Phase 0 behavior. More general continuous collision normals, arbitrary polygons, slopes, or rigid-body response are future scope if later gameplay requires them.

## Authoritative movement step

At each 60 Hz simulation tick:

1. resolve logical digital input:
   - opposing horizontal inputs cancel;
   - opposing vertical inputs cancel;
2. normalize two-axis input;
3. derive intended velocity from `baseMoveSpeed`;
4. compute desired displacement:
   `desiredDelta = intendedVelocity × fixedDt`;
5. request authoritative X sweep/clamp from `WorldQuery`;
6. apply returned X displacement;
7. request authoritative Y sweep/clamp from the updated position;
8. apply returned Y displacement;
9. record:
   - intended direction/facing from input;
   - resolved displacement from collision result;
   - resulting world position.

Collision never changes facing away from intended direction.

## X-axis sweep/clamp

For desired `dx`:

- keep Y fixed;
- consider solids whose Y interval overlaps the player footprint's Y interior;
- sweep the player's leading X face from current to desired X;
- clamp to the nearest blocking solid boundary if crossed;
- if already touching a blocking face and input continues into it, allowed X displacement is zero.

## Y-axis sweep/clamp

After applying resolved X, perform the same operation on Y using the updated X interval.

## Wall sliding

Because axes are resolved independently:

- vertical wall may clamp X while Y continues;
- horizontal wall may clamp Y while X continues;
- the remaining component is the originally normalized component;
- no post-collision renormalization occurs.

## Corner stability

If X and Y are both blocked, both resolved components become zero at the valid boundaries.

Repeated identical input while at the corner must return the same zero/clamped result; no separation impulse, bounce, or alternating snap is added.

## Stable obstacle ordering

Movement result must not depend on iteration order of world solids.

For an axis sweep:

- movement is determined by the nearest blocking boundary;
- if multiple solids define the same limiting boundary, movement result is identical;
- stable solid ID may be used only as a deterministic diagnostic tie-break for which hit is reported.

---

# TECHNICAL DESIGN SPEC

## SYSTEM

Player Collision Footprint & Movement/World Integration

## ARCHITECTURE OVERVIEW

```text
KeyboardInputAdapter
      |
      v
logical PlayerInput
      |
      v
Simulation PlayerMovementSystem
      |
      | desired dx
      v
WorldQuery.sweepPlayerAxis / sweepAabbAxis
      |
      v
allowed dx
      |
      v
Simulation applies X
      |
      | desired dy
      v
WorldQuery.sweepPlayerAxis / sweepAabbAxis
      |
      v
allowed dy
      |
      v
Simulation authoritative player position
      |
      +--> SimulationSnapshot
      |        |
      |        v
      |     Pixi presentation
      |
      +--> Camera target = resolved position
```

World answers collision geometry queries. Simulation owns player movement state and applies the returned allowed translation. Presentation owns neither.

## COMPONENTS

### PlayerCollisionFootprint
Immutable Phase 0 technical configuration: 20 × 12 px / 0.625 × 0.375 WorldUnit AABB.

### PlayerMovementConfig
Holds movement tuning such as initial `baseMoveSpeed = 2.8125 WorldUnit/s` and diagonal normalization constant.

### PlayerMovementSystem
Consumes logical input + fixed simulation step + world collision query. Owns intended velocity, facing updates, and resolved authoritative player position.

### WorldCollisionQuery
World-owned read-only collision query capable of deterministic axis sweep/clamp against explicit solid geometry.

### StaticCollisionGeometry
Phase 0 test/static world AABB data owned by world domain.

## RESPONSIBILITIES

- **simulation:** input resolution, diagonal normalization, facing, desired displacement, X/Y solver orchestration, player authoritative position;
- **world:** solid geometry ownership and sweep/clamp queries;
- **client/input:** raw keyboard to logical input only;
- **client/presentation:** map resolved player world position to sprite; no collision;
- **camera:** follow resolved world position;
- **art/content:** define visual sprite/ground anchor metadata, not collision authority.

## DATA MODEL

Conceptual types:

```ts
interface WorldPosition {
  readonly x: number;
  readonly y: number;
}

interface AabbFootprint {
  readonly halfWidth: number;
  readonly halfDepth: number;
}

type CollisionAxis = 'x' | 'y';

interface AxisSweepRequest {
  readonly center: WorldPosition;
  readonly footprint: AabbFootprint;
  readonly axis: CollisionAxis;
  readonly desiredDelta: number;
}

interface AxisSweepResult {
  readonly allowedDelta: number;
  readonly blocked: boolean;
  readonly hitSolidId?: string;
}
```

Exact optional diagnostic fields may vary, but movement-relevant semantics above must remain.

## DATA OWNERSHIP

| Data | Owner |
|---|---|
| player authoritative world position | simulation |
| player intended direction/facing | simulation |
| player collision footprint dimensions | simulation technical config / approved contract |
| static solid bounds | world |
| collision query result | world query result consumed by simulation |
| sprite frame/bounds | client presentation/art |
| visual ground anchor metadata | presentation/content; aligned to authoritative position |
| camera position | client presentation |
| raw keyboard state | client input |

## CLIENT RESPONSIBILITY

- map W/A/S/D + arrows to logical input;
- clear input on focus loss;
- display authoritative/resolved position;
- align sprite feet/ground anchor to simulation position;
- camera follows resolved position;
- never infer collision from sprite/Pixi bounds.

## SERVER RESPONSIBILITY

Future host/server runs the same simulation movement solver and world collision queries authoritatively.

Remote client position claims are not authoritative.

The footprint dimensions and collision semantics are shared rules and must not be client-only.

## PERSISTENCE

Phase 0 player position persistence is not introduced by this task.

When persistence later stores player position, it stores authoritative world position—not sprite position, camera position, or collision-cache state.

Static/generated world collision data follows the world/persistence architecture defined by later world implementation.

## NETWORKING

No networking implementation here.

Future movement prediction may use the same footprint/solver locally, but authoritative server resolution wins.

Collision footprint dimensions belong to shared technical/game rules and must be version-compatible if future protocol/save compatibility depends on them.

## PUBLIC INTERFACES

Required architecture-level boundary:

```ts
interface WorldCollisionQuery {
  sweepAabbAxis(request: AxisSweepRequest): AxisSweepResult;
}
```

`WorldQuery` may expose/compose this interface.

Simulation must not import world internal collision storage.

Presentation must not call this API to determine gameplay state.

## FAILURE HANDLING

- invalid footprint dimensions (non-finite, <= 0): fail construction/startup;
- non-finite player position/delta: reject/fail in test/debug rather than propagate NaN/Infinity;
- invalid solid AABB: reject world fixture/content;
- collision query must return finite allowed delta with magnitude <= desired movement magnitude;
- if world collision query cannot provide authoritative geometry, simulation must not silently treat unknown space as passable; Phase 0 test world should fail explicitly;
- no collision failure path may mutate sprite position as a substitute for authoritative state.

## PERFORMANCE

Phase 0 collision set is small/test-focused.

Implementation may use a simple solid list initially, but the `WorldCollisionQuery` API must not expose storage representation.

Later world/chunk implementation may replace lookup with chunk/spatial indexing without changing simulation movement contracts.

At 60 Hz, one player performs at most:

- one X-axis query;
- one Y-axis query;

per movement tick.

## SECURITY / VALIDATION

Future clients cannot provide authoritative collision results or final resolved positions.

Server/authority validates movement using authoritative solid geometry and the shared footprint.

## OBSERVABILITY

Developer diagnostics should expose:

- authoritative player anchor/world position;
- footprint AABB;
- intended displacement;
- resolved X/Y displacement;
- blocked X/Y flags;
- hit solid ID when available;
- logical facing;
- optional 32 px visual reference grid.

Debug drawing is presentation-only.

## TEST STRATEGY

P0-ENG-002 must include automated collision tests using exact fixtures below.

### Fixture constants

```text
PLAYER_WIDTH      = 0.625 WU = 20 px
PLAYER_DEPTH      = 0.375 WU = 12 px
HALF_WIDTH        = 0.3125 WU = 10 px
HALF_DEPTH        = 0.1875 WU = 6 px
BASE_SPEED        = 2.8125 WU/s = 90 px/s
CARDINAL_DELTA    = 0.046875 WU/tick = 1.5 px/tick
```

### T1 — Non-grid continuous position

Start player anchor at a deliberately non-cell and sub-internal-pixel position, e.g.:

```text
x = 0.140625 WU = 4.5 px
y = 0.203125 WU = 6.5 px
```

Move right for one tick.

PASS:
- position advances by `0.046875 WU`;
- no rounding to integer WorldUnits, 32 px reference cells, or integer authored pixels occurs in simulation.

### T2 — Direct vertical-wall stop

Static wall:

```text
minX = 2.0
maxX = 2.5
minY = -2.0
maxY = 2.0
```

Move right until contact.

Expected maximum player anchor X:

```text
2.0 - 0.3125 = 1.6875 WU
```

PASS:
- anchor never exceeds 1.6875;
- sustained Right keeps same boundary position;
- no bounce/jitter/penetration.

### T3 — Vertical-wall slide, no speed boost

Place player touching the same wall at:

```text
x = 1.6875
y = 0
```

Hold Up+Right.

PASS:
- X resolved delta = 0;
- Y continues using the original diagonal Y component;
- Y is not renormalized to full cardinal `baseMoveSpeed`;
- logical facing remains NE.

### T4 — Horizontal-wall slide

Equivalent rotated fixture.

PASS:
- blocked Y component = 0;
- X continues at original diagonal component;
- facing preserves intended diagonal direction.

### T5 — Narrow gap smaller than footprint

Build two parallel solids with inner-face separation:

```text
19 px = 0.59375 WU
```

and sufficient length to form a corridor.

PASS:
- player cannot enter/traverse the corridor;
- footprint does not shrink.

### T6 — Exact-fit gap

Inner-face separation:

```text
20 px = 0.625 WU
```

PASS:
- aligned player can traverse while touching boundaries;
- no penetration;
- no artificial shrink/expansion or grid snap.

### T7 — Larger gap

Inner-face separation:

```text
21 px = 0.65625 WU
```

PASS:
- player traverses normally.

### T8 — Corner stability

Use perpendicular static walls forming a closed corner.

Hold diagonal input into the corner for multiple ticks.

PASS:
- player settles at the valid X/Y boundaries;
- repeated ticks do not oscillate, teleport, or penetrate.

### T9 — Solid-order independence

Run the same sweep fixtures with identical solids supplied in different iteration orders.

PASS:
- resolved displacement and final player state are identical.

### T10 — Sprite/collider independence

Render the same authoritative player state with presentation frames of different sprite bounds.

PASS:
- collision result remains identical;
- only presentation changes.

### T11 — Collision/frame-rate independence

Execute the same fixed input tape and fixed simulation tick count while presentation is rendered at different frame cadences.

PASS:
- authoritative final player state is equivalent under P0-TECH-003 rules.

## MIGRATION

This footprint is a shared movement/collision contract.

Changing shape or dimensions after gameplay/world/save/network data begins relying on it requires:

- Technical Design update;
- movement/collision regression testing;
- review of base-speed tuning relationship;
- review of narrow-gap/world-layout compatibility;
- future save/network compatibility review if applicable.

It is not a presentation-only change.

## KNOWN LIMITATIONS

Phase 0 intentionally does not support:

- circles/ellipses/capsules;
- rotated colliders;
- polygon/sloped collision;
- dynamic rigid bodies;
- pushable objects;
- combat hit/hurt boxes;
- continuous multi-normal vector sweep;
- stair/height layers;
- terrain elevation.

The fixed X-then-Y solver can have axis-order bias at pathological exact-corner cases. This is accepted for the Phase 0 static-AABB movement slice because it remains deterministic, stable, and satisfies the approved observable behavior. A later gameplay requirement for richer geometry can replace the solver behind the same world/simulation authority boundary.

## FUTURE EXTENSION

- chunk/spatial-index-backed collision queries;
- additional collision masks/categories;
- server-authoritative movement prediction/reconciliation;
- richer static geometry;
- interaction/proximity shapes independent from locomotion footprint;
- combat hurtboxes/hitboxes as separate systems.

---

# FILE PLAN

No code is created by P0-TECH-008. The following is the implementation plan for P0-ENG-002.

## CREATE

### `src/foundation/spatial/WorldPosition.ts`

**Purpose:**  
Renderer-independent finite continuous world position/value types.

**Responsibility:**  
Represent authoritative world positions/vectors without Pixi/DOM dependency.

**API:**  
`WorldPosition`, optional `WorldVector` helpers.

---

### `src/world/collision/Aabb.ts`

**Purpose:**  
Generic authoritative static collision bounds.

**Responsibility:**  
Define validated world-space AABB/half-extents types used by world query implementation.

**API:**  
`Aabb`, `AabbHalfExtents`, validation/construction helpers.

---

### `src/world/api/WorldCollisionQuery.ts`

**Purpose:**  
Public simulation-to-world collision read boundary.

**Responsibility:**  
Provide deterministic axis sweep/clamp without exposing world collision storage.

**API:**  
`WorldCollisionQuery`, `AxisSweepRequest`, `AxisSweepResult`.

---

### `src/world/internal/StaticCollisionWorld.ts`

**Purpose:**  
Phase 0 static-solid implementation used by movement slice/tests.

**Responsibility:**  
Own explicit solid AABBs and deterministic X/Y sweep/clamp implementation.

**DEPENDENCIES:**  
Foundation spatial types and world collision public types only.

**PUBLIC API:**  
None directly; constructed/exported through world public surface/test factory.

---

### `src/simulation/player/PlayerCollisionFootprint.ts`

**Purpose:**  
Authoritative approved player locomotion footprint configuration.

**Responsibility:**  
Define 0.625 × 0.375 WorldUnit AABB and half extents.

**API:**  
`PLAYER_COLLISION_FOOTPRINT`.

---

### `src/simulation/player/PlayerMovementConfig.ts`

**Purpose:**  
Phase 0 movement tuning/data.

**Responsibility:**  
Expose initial `baseMoveSpeed = 2.8125 WorldUnit/s`, diagonal normalization and approved fixed movement constants without renderer coupling.

**API:**  
Movement config object/types.

---

### `src/simulation/internal/PlayerMovementSystem.ts`

**Purpose:**  
Authoritative movement/collision resolution.

**Responsibility:**  
Resolve logical input, intended velocity/facing, fixed-step displacement, X/Y world collision queries, and final authoritative position.

**DEPENDENCIES:**  
Simulation public/domain types, foundation spatial/time, public world collision query.

**PUBLIC API:**  
Private behind simulation runtime.

---

### `tests/unit/player-collision-footprint.test.ts`

**Purpose:**  
Lock exact footprint dimensions/anchor semantics.

---

### `tests/integration/player-movement-collision.test.ts`

**Purpose:**  
Automate fixtures T1–T11 as applicable to integration scope.

---

## MODIFY

### `src/foundation/index.ts`

**Affected section:** public exports.

**Required architecture change:** expose approved world position/vector types.

---

### `src/world/api/WorldQuery.ts`

**Affected section:** public query contract.

**Required architecture change:** compose/expose `WorldCollisionQuery` without exposing internal solid storage.

---

### `src/world/index.ts`

**Affected section:** public exports / Phase 0 test-world construction.

**Required architecture change:** export collision query contracts and an approved construction seam.

---

### `src/simulation/api/SimulationSnapshot.ts`

**Affected section:** player presentation/read model fields.

**Required architecture change:** add authoritative resolved player position/facing required by movement/camera presentation. Do not add Pixi/host metadata.

---

### `src/simulation/internal/FixedStepRuntime.ts`

**Affected section:** input consumption / step.

**Required architecture change:** own player state and invoke `PlayerMovementSystem` once per fixed tick.

---

### `src/client/input/KeyboardInputAdapter.ts`

**Affected section:** Phase 0 mapper.

**Required architecture change:** map W/A/S/D and arrow keys into approved logical `PlayerInput`, with opposing-axis cancellation and existing focus-loss reset.

---

### `src/client/presentation/PixiPresentationAdapter.ts`

**Affected section:** player render mapping.

**Required architecture change:** render player from resolved snapshot position; sprite ground anchor aligns with authoritative position. No collision logic.

---

### `src/client/presentation/CameraPresenter.ts`

**Affected section:** follow target.

**Required architecture change:** consume resolved player world position; preserve P0-DES-001/P0-ART-001 smoothing and presentation-only pixel stabilization.

---

# ACCEPTANCE CRITERIA SELF-CHECK

- Exact footprint shape/dimensions implementation-ready: **PASS**
- Exact anchor/origin relationship implementation-ready: **PASS**
- Static Phase 0 collision representation defined: **PASS**
- Simulation/world query boundary explicit: **PASS**
- Continuous non-grid movement preserved: **PASS**
- Stop-at-boundary behavior preserved: **PASS**
- Wall sliding/unblocked component preserved: **PASS**
- No wall-slide speed boost preserved: **PASS**
- Gap-fit rule explicit: **PASS**
- Collider independent from sprite/Pixi bounds: **PASS**
- Tests defined for gap-fit, blocked movement, sliding, corner stability, non-grid behavior: **PASS**
- No gameplay rule invented/changed: **PASS**
- No physics-engine over-engineering: **PASS**

# ROLE DEFINITION OF DONE SELF-CHECK

- Ownership unambiguous: **PASS**
- Authority unambiguous: **PASS**
- Persistence impact clear: **PASS**
- Network compatibility clear: **PASS**
- Interfaces implementation-ready: **PASS**
- File/module plan explicit: **PASS**
- Failure modes considered: **PASS**
- Performance considerations proportionate to Phase 0: **PASS**
- Testing strategy explicit: **PASS**
- Engineer can implement without inventing collision values/representation: **PASS**

# HANDOFF

Return to Producer / Project Manager for:

1. artifact and DoD verification;
2. lifecycle update of P0-TECH-008 to TECH READY if accepted;
3. dependency-gate verification for P0-ENG-002;
4. implementation authorization only after Producer updates P0-ENG-002.

No implementation is authorized by this artifact itself.

**PROJECT OWNER ACTION: NONE**
