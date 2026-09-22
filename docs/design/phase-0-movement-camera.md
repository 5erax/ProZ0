# P0-DES-001 — Phase 0 Movement & Camera Gameplay Specification

**Task:** P0-DES-001  
**System:** Phase 0 Movement & Camera  
**Role:** Game Designer / Systems Designer  
**Status:** READY FOR PRODUCER REVIEW  
**Milestone:** Phase 0 — Foundation  
**Source Issue:** #1

## Information classification

### CONFIRMED
- ProZ0 is a 2D pixel-art game with a top-down/3/4 presentation.
- Target platform for Phase 0 is desktop browser.
- Phase 0 includes input, camera, and a single-player movement slice.
- Movement must be responsive and must not unintentionally grid-lock the player.
- Phase 0 does not include combat movement, vehicles, stamina movement penalties, final animation, or final art.
- Engine, renderer, networking architecture, collision algorithm, and physics implementation are outside Game Design authority.

### CONSTRAINT
- Locomotion must remain compatible with later deterministic/shared simulation and multiplayer work.
- Camera presentation must not make player control feel delayed or detached.
- Tile/chunk representation may exist internally, but normal player locomotion must remain continuous.

### DECISION NEEDED
None blocking this specification.

---

# GAME DESIGN SPEC

## SYSTEM
Phase 0 Movement & Camera

## STATUS
READY

## PRODUCT INTENT
The player must be able to control a Pioneer in 2D world space with immediate, precise, predictable movement. Phase 0 must establish locomotion and camera behavior that can later support exploration, gathering, building, combat, and multiplayer without requiring movement to be redesigned.

The player must not feel input lag, unrequested momentum, diagonal speed advantage, camera chase lag, or snapping to a gameplay grid.

## PLAYER GOAL
The player can:
1. Move deliberately in any of eight logical directions.
2. Stop and reverse direction immediately.
3. Move around solid obstacles predictably.
4. Move diagonally without gaining speed.
5. Understand when an obstacle, rather than missing input, prevents movement.
6. Remain visually tracked by a stable follow camera.

## PLAYER EXPERIENCE
Target feel:

**Immediate → Precise → Predictable → Continuous**

The player should not experience:
- start-up movement delay;
- coasting after release;
- grid/tile stepping;
- tile-center snapping;
- diagonal speed boost;
- turn-lock before changing direction;
- full stop when a valid slide direction exists along an obstacle;
- camera lag that makes the avatar feel detached from input;
- movement speed changing with render frame rate;
- stale movement continuing after browser focus loss.

## PLAYER ACTIONS
Phase 0 locomotion actions:
- Move Up.
- Move Down.
- Move Left.
- Move Right.
- Move diagonally through two-axis input.
- Stop by releasing effective movement input.
- Change direction while moving.

Not included:
- sprint;
- dodge;
- dash;
- jump;
- crouch;
- swimming/climbing;
- vehicles;
- click-to-move;
- player pathfinding.

## CONTROL MODEL
Primary desktop controls:
- W = Up
- S = Down
- A = Left
- D = Right

Equivalent secondary controls:
- Arrow Up
- Arrow Down
- Arrow Left
- Arrow Right

Movement is **held-input locomotion**. Distance is determined by how long logical movement input remains active, not by keyboard repeat events.

Opposing input cancels on the same axis:
- Left + Right → horizontal input = 0
- Up + Down → vertical input = 0

The other axis remains valid. Example: W + A + D resolves to Up.

## MOVEMENT STATES

### IDLE
Condition: effective movement input is zero.

Behavior:
- locomotion velocity is zero;
- no player-locomotion displacement occurs;
- facing preserves the last valid facing direction.

### MOVING
Condition:
- effective movement input is non-zero; and
- intended movement is not fully blocked.

Behavior:
- continuous world-space displacement;
- base movement speed rules apply;
- facing follows intended movement direction.

### COLLISION-CONSTRAINED
Condition:
- movement input is non-zero; and
- collision blocks part or all of intended movement.

Behavior:
- no penetration into solid geometry;
- an unblocked tangential component continues when valid;
- if every intended component is blocked, position remains at the valid collision boundary;
- facing continues to represent player intent.

This is not a stun or disabled-control state.

## MOVEMENT RULES

### Continuous non-grid locomotion
Player position exists in continuous world space.

Normal locomotion must not:
- snap to tile centers;
- require integer tile coordinates;
- move one tile/node at a time;
- require a pathfinding node destination.

World generation, tile maps, or chunks may use grids internally without imposing them on player locomotion.

### Base speed
Phase 0 has one walking-speed gameplay state.

Tuning variable:
- `baseMoveSpeed`

Initial design target:
- **4.5 player collision-footprint widths per second**

This value is data/tuning, not an implementation constant.

### Acceleration
Phase 0 has no intentional gameplay acceleration curve.

When valid movement input begins:
- intended locomotion speed reaches `baseMoveSpeed` immediately.

### Deceleration
Phase 0 has no intentional gameplay deceleration/inertia.

When effective movement input becomes zero:
- intended locomotion velocity becomes zero immediately.

Presentation interpolation must not create meaningful post-release travel.

### Direction changes
Changing movement direction takes effect immediately.

There is:
- no mandatory stop between opposite directions;
- no turn-rate limit;
- no turn-animation lock.

### Diagonal normalization
Two-axis digital input is normalized before applying `baseMoveSpeed`.

Total diagonal travel speed must equal cardinal travel speed.

### Frame-rate independence
Gameplay travel distance is time/simulation based, not render-frame-count based.

Different supported render FPS values must not provide meaningful movement advantage.

### Rapid input
A short tap creates displacement corresponding to the time the movement input was active.

Released input must not execute later as queued locomotion.

## DIRECTION / FACING
Facing is a gameplay state independent of final animation.

Facing uses the last valid non-zero **intended movement direction**.

Logical facing supports:
- N
- NE
- E
- SE
- S
- SW
- W
- NW

When idle:
- retain last valid facing.

When collision alters actual displacement:
- facing remains based on intended movement.

Example:
- player holds Up + Right into a vertical wall;
- resolved movement may be Up only;
- facing remains NE.

Final sprite-direction mapping is deferred to visual/animation work. Movement remains eight-directional even if final animation uses fewer authored direction sets.

## COLLISION RULES

### Solid blocking
World/entity geometry marked solid blocks player locomotion.

### Collision footprint
Collision represents the character's ground-contact footprint, not automatically the full sprite rectangle.

Exact collider shape and implementation belong to Technical Design.

### No penetration
Normal Phase 0 movement cannot pass through solid obstacles.

### Wall sliding
If collision blocks only one component of intended movement, the valid remaining component continues.

Example:
- diagonal input into a vertical wall;
- horizontal movement is blocked;
- vertical component continues.

The remaining component is **not renormalized** to full base speed. Wall sliding must not become a speed boost.

### Direct wall contact
If all intended movement is blocked:
- stop at valid collision boundary;
- do not bounce;
- do not jitter;
- do not teleport;
- do not push backward.

### Corners
Sustained movement into a corner must not:
- oscillate;
- penetrate;
- teleport through;
- snap to a tile/grid.

If a valid tangential path exists, slide is allowed.

### Narrow gaps
The player may pass only if the collision footprint fits.

The collision footprint must not automatically shrink to assist traversal.

### Decorative visuals
A visible sprite/decoration is not automatically solid. Walkability comes from gameplay collision definition, not full sprite bounds.

## CAMERA RULES

### Camera target
The Phase 0 camera follows the local player.

### Orientation
Camera orientation is fixed for top-down/3/4 presentation.

Phase 0 has no:
- camera rotation;
- tactical free camera;
- independent player-controlled pan.

### Anchor
Default player anchor:
- `cameraAnchorX = 0.5`
- `cameraAnchorY = 0.5`

No camera dead-zone is required in Phase 0.

### Follow source
Camera follows **resolved player world position**, not raw movement input.

If input pushes into a wall but the player does not move, the camera must not drift in the blocked direction.

### Smoothing
Low-latency smoothing is permitted only if responsiveness remains intact.

Tuning variable:
- `cameraFollow90Time`

Definition:
- approximate time for camera position to close 90% of a normal small target displacement.

Default design target:
- **80 ms**

Phase 0 tuning range:
- **0–120 ms**

If smoothing produces detached control feel, reduce smoothing.

### Maximum normal lag
During normal constant base-speed movement, sustained camera lag from smoothing should not exceed:
- **0.5 player collision-footprint width**

### Stop behavior
When the player stops, the camera settles promptly and must not continue obvious long drift.

### Spawn/reset
On initial spawn or discontinuous test reset, camera snaps to the player before normal control begins.

No cinematic traversal from old position/world origin is required.

### Gameplay separation
Camera presentation does not alter:
- player movement speed;
- collision;
- authoritative/resolved player world position.

Pixel snapping/render quantization, if used, remains presentation behavior and must not grid-lock gameplay position.

## RESPONSIVENESS REQUIREMENTS
Baseline validation environment:
- desktop browser;
- local Phase 0 single-player;
- focused game tab;
- stable simulation;
- approximately 60 FPS rendering;
- no artificial network latency.

### Movement start
Valid movement input is consumed by the next simulation update and produces visible locomotion at the next rendered opportunity.

QA target:
- **keydown → visible displacement ≤ 50 ms at P95**

No intentional gameplay start delay is allowed.

### Movement stop
Release of the final effective movement input results in zero locomotion at the next simulation update.

QA target:
- **keyup → visible locomotion stop ≤ 50 ms at P95**

No intentional glide/deceleration is allowed.

### Direction change
Input direction changes must visibly change locomotion direction without turn-lock.

QA target:
- **direction input change → visible direction change ≤ 50 ms at P95**

### Camera response
Camera begins reacting as soon as resolved player position changes.

There is no intentional camera start-delay layer.

### No hidden movement buffer
Released movement commands must not remain queued for later execution.

## INPUTS
Movement gameplay receives:
- logical Move Up state;
- logical Move Down state;
- logical Move Left state;
- logical Move Right state;
- gameplay focus/input-enabled state;
- current world position;
- movement tuning data;
- collision/world walkability information;
- simulation time/delta information.

Camera gameplay/presentation contract receives:
- resolved local-player world position;
- follow tuning values;
- viewport information;
- spawn/reset event.

## OUTPUTS
Movement produces:
- effective movement direction;
- intended locomotion velocity;
- resolved locomotion velocity;
- continuous player world position;
- locomotion state;
- facing direction;
- collision-constrained result/contact information as required by Technical Design.

Camera produces:
- follow target;
- camera presentation position;
- stable player framing.

## PLAYER FEEDBACK
Final animation/VFX are not required in Phase 0.

Minimum readability:
- placeholder avatar position clearly changes during movement;
- idle vs moving is readable from motion;
- facing has debug/readable representation if placeholder art does not communicate it;
- solid test obstacles are visually distinguishable from passable ground;
- when blocked, the scene must make it understandable that a solid obstacle is responsible rather than missing input.

No collision sound/VFX is required.

## SYSTEM INTERACTIONS

### World / terrain
Movement consumes walkability/collision definitions.

Game Design defines expected outcome; Technical Design chooses representation/algorithm.

### Chunk/world streaming
Movement must remain continuous across world/chunk organization.

P0-DES-001 does not design chunk streaming.

### Animation
Movement exposes locomotion state, movement direction, and facing for later animation use.

Animation must not own gameplay locomotion timing.

### Interaction
Full interaction is deferred. Facing remains available for future interaction orientation requirements.

### Combat
Combat locomotion is deferred and must not be inferred from this Phase 0 spec.

## MULTIPLAYER CONSIDERATIONS
Networked multiplayer locomotion is not implemented by this task.

Phase 0 should preserve these gameplay invariants for later shared simulation:
- continuous world-space position;
- normalized diagonal input;
- explicit base speed;
- explicit facing state;
- collision rules independent of render FPS;
- camera is local presentation, not gameplay authority.

This design does not decide:
- prediction;
- reconciliation;
- interpolation architecture;
- network tick rate;
- remote-player smoothing;
- player-player collision.

Those belong to later Technical/Game Design tasks as authorized.

## BALANCE / TUNING VARIABLES

Gameplay-owned:
- `baseMoveSpeed` — default target 4.5 footprint widths/sec.
- `cameraFollow90Time` — default 80 ms; Phase 0 range 0–120 ms.
- `cameraAnchorX` — default 0.5.
- `cameraAnchorY` — default 0.5.
- `cameraMaxNormalLag` — target max 0.5 footprint width.
- `cameraZoom` — tuning variable; exact value intentionally not locked by this spec.

Technical, not Game Design tuning:
- fixed timestep;
- collision epsilon;
- solver iteration count;
- numeric precision;
- interpolation implementation.

## EDGE CASES

1. **Left + Right:** horizontal movement = 0.
2. **Up + Down:** vertical movement = 0.
3. **W + A + D:** left/right cancel; result = Up.
4. **All four directions:** effective movement = zero; state IDLE; preserve facing.
5. **Diagonal to cardinal:** releasing one axis changes direction immediately, with no mandatory stop frame.
6. **Direction reversal:** immediate logical reversal; no braking phase.
7. **Browser/tab focus loss:** active locomotion input is cleared/suspended so missed key-up cannot create stuck movement.
8. **Focus regain:** no queued movement accumulated while inactive is replayed.
9. **Diagonal collision:** blocked component stops; valid tangential component continues.
10. **Direct wall input:** remain at valid boundary without jitter/bounce/teleport.
11. **Corner contact:** no penetration, oscillation, teleport, or grid snap.
12. **Different render FPS:** no meaningful change in travel speed.
13. **Spawn/reset:** camera starts at player position.
14. **Unavailable playable area:** player does not enter invalid/unloaded playable space; at minimum movement is blocked at a valid boundary. Streaming solution is Technical Design.
15. **Browser arrow keys:** when gameplay surface owns active input, arrows must control movement rather than unintentionally scroll the page. Event-handling implementation is Engineering.

## PHASE 0 SCOPE
- Keyboard movement.
- WASD.
- Arrow-key equivalents.
- Continuous non-grid position.
- IDLE / MOVING / COLLISION-CONSTRAINED states.
- Immediate movement start/stop/direction change.
- Normalized diagonal movement.
- Eight-direction logical facing.
- Solid collision.
- Wall sliding.
- Corner stability.
- Frame-rate-independent gameplay movement.
- Local-player follow camera.
- Center anchor.
- Low-latency camera smoothing.
- Camera snap on spawn/reset.
- Focus-loss movement safety.
- Placeholder/debug readability sufficient for QA.

## DEFERRED
- Input rebinding.
- Gamepad/analog input.
- Touch controls.
- Sprint.
- Stamina locomotion effects.
- Encumbrance movement effects.
- Terrain movement modifiers.
- Dodge/dash.
- Knockback.
- Jump/crouch.
- Swimming/climbing.
- Vehicles.
- Click-to-move/pathfinding.
- Free-look/pan.
- Camera rotation.
- Combat framing.
- Camera shake.
- Cinematic zoom.
- Player-player collision.
- Multiplayer prediction/reconciliation.
- Final locomotion animation.
- Final footstep audio/VFX.

## NON-GOALS
This spec does not design or select:
- combat;
- stamina;
- vehicles;
- full interaction system;
- gathering/building behavior;
- final animation/art;
- networking architecture;
- engine/renderer;
- collision implementation algorithm;
- physics engine.

## ACCEPTANCE CRITERIA

### AC-MOV-001 — WASD held movement
Holding a WASD direction while gameplay has focus produces continuous movement in the mapped direction.

PASS: continuous held movement.  
FAIL: tile stepping, keyboard-repeat movement, destination/path movement.

### AC-MOV-002 — Arrow-key equivalence
Arrow keys resolve to the same logical directional movement as WASD.

### AC-MOV-003 — Opposing-axis cancellation
Left+Right cancels horizontal movement; Up+Down cancels vertical movement; unaffected axis remains valid.

### AC-MOV-004 — No tile lock
Normal player locomotion is not snapped to tile centers or discrete movement nodes. QA can stop at multiple continuous positions within the same logical grid cell/terrain area when the test world uses a grid.

### AC-MOV-005 — No step movement
Held movement produces continuous displacement rather than discrete tile hops.

### AC-MOV-006 — Cardinal consistency
Equal duration at equal base speed produces equivalent travel distance for Up/Down/Left/Right within test tolerance.

### AC-MOV-007 — Diagonal normalization
Equal-duration diagonal total travel distance equals cardinal travel distance within test tolerance; it must not be approximately 1.414× faster.

### AC-MOV-008 — Frame-rate independence
Across supported test render rates, equal gameplay duration/input produces travel distance difference of **≤ 2%**.

### AC-MOV-009 — Start responsiveness
In baseline conditions, keydown to visible player displacement is **≤ 50 ms P95**, with no intentional start delay.

### AC-MOV-010 — Stop responsiveness
In baseline conditions, final movement-key release to visible locomotion stop is **≤ 50 ms P95**, with no intentional glide.

### AC-MOV-011 — Direction responsiveness
In baseline conditions, movement-direction input change to visible direction change is **≤ 50 ms P95**, with no turn-lock.

### AC-MOV-012 — Rapid tap
Short directional taps create corresponding short displacement without systematic loss and without delayed movement after release.

### AC-COL-001 — Solid blocking
The player cannot locomote through solid obstacles at normal Phase 0 speed.

### AC-COL-002 — No penetration
Resolved player state is not left overlapping invalid solid geometry.

### AC-COL-003 — Wall sliding
Diagonal movement into a surface preserves an unblocked tangential component instead of forcing a full stop.

### AC-COL-004 — No wall-slide boost
The remaining tangential component is not renormalized into a higher-than-intended speed.

### AC-COL-005 — Direct-wall stability
Direct sustained input into a wall stops at the valid boundary without bounce, jitter, teleport, or penetration.

### AC-COL-006 — Narrow-gap rule
The player cannot pass through a gap smaller than the collision footprint.

### AC-COL-007 — Corner stability
Sustained corner contact does not create visible oscillation, repeated snapping, penetration, or teleport.

### AC-FACE-001 — Facing while moving
Non-zero intended movement updates logical facing to the corresponding eight-direction state.

### AC-FACE-002 — Facing while idle
IDLE preserves the last valid facing.

### AC-FACE-003 — Facing under collision
Collision-constrained actual movement does not force facing to abandon intended direction.

### AC-CAM-001 — Follow target
Camera follows resolved local-player position.

### AC-CAM-002 — Center anchor
In normal unconstrained world area, the player converges on the default viewport anchor (0.5, 0.5).

### AC-CAM-003 — No Phase 0 dead-zone
Resolved player movement immediately affects camera follow; no gameplay dead-zone is required.

### AC-CAM-004 — Smoothing limit
`cameraFollow90Time` remains within the approved Phase 0 range of 0–120 ms; default target is 80 ms.

### AC-CAM-005 — Normal camera lag
At normal constant base speed, sustained smoothing lag does not exceed the target 0.5 player-footprint width.

### AC-CAM-006 — Blocked-input camera behavior
Input into a blocking wall does not move the camera in that direction when resolved player position does not change.

### AC-CAM-007 — Spawn framing
Spawn/reset places the camera at the player before normal control begins rather than smoothing from world origin/old location.

### AC-INP-001 — Focus-loss safety
Losing browser/game focus while movement is held does not leave the player moving indefinitely because of a missed key-up.

### AC-INP-002 — Focus-regain safety
Regaining focus does not replay movement input accumulated while inactive.

## OPEN QUESTIONS

### Non-blocking OQ-01 — Final camera zoom
Exact prototype zoom/pixel scale must be coordinated with Art/Technical constraints. This does not alter locomotion gameplay rules and does not block Technical Design.

### Non-blocking OQ-02 — Exact collision-footprint dimensions
Exact dimensions/shape are Technical/Art integration details. Gameplay requirement is fixed: the footprint represents ground contact, must fit a gap to traverse it, and must not default blindly to full sprite bounds.

Neither question forces Gameplay Engineering to invent a gameplay behavior.

## ASSUMPTIONS
No unapproved product assumption is treated as product truth.

The following are **Game Design tuning defaults** authorized within this task and remain adjustable through Phase 0 playtest:
- baseMoveSpeed = 4.5 footprint widths/sec;
- cameraFollow90Time = 80 ms;
- cameraFollow90Time range = 0–120 ms;
- cameraMaxNormalLag = 0.5 footprint width.

---

# Definition of Done self-check

- Control model explicit: PASS
- Movement/non-grid behavior explicit: PASS
- Phase 0 movement states explicit: PASS
- Acceleration/deceleration behavior explicit: PASS
- Diagonal behavior explicit: PASS
- Facing behavior explicit: PASS
- Collision expectations explicit: PASS
- Obstacle/wall/corner behavior explicit: PASS
- Camera follow/smoothing behavior explicit: PASS
- Movement-camera relationship explicit: PASS
- “Responsive” defined in measurable terms: PASS
- Player feedback requirements explicit: PASS
- Tuning variables identified: PASS
- Major edge cases addressed: PASS
- No Engineer-authored gameplay rule required: PASS
- Technical Lead can derive architecture without gameplay invention: PASS
- QA can derive PASS/FAIL tests: PASS
- Blocking OPEN QUESTION: NONE
- DECISION NEEDED: NONE

**Game Designer result: READY FOR PRODUCER DoD VERIFICATION.**
