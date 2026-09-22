# ADR-P0-TECH-003 — Determinism & Simulation Strategy

**Task:** P0-TECH-003  
**Source Issue:** #5  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22

## Information classification

### CONFIRMED
- Shared simulation must be deterministic/testable and independent from Pixi/DOM.
- Phase 0 movement is continuous, frame-rate independent, and immediately responsive.
- World generation must be reproducible from world seed and coordinates.
- Presentation may interpolate but cannot become authoritative state.
- Future hosted multiplayer is server-authoritative, not deterministic lockstep between clients.

### CONSTRAINT
- Do not create gameplay behavior not defined by Game Design.
- Do not use render frame time, wall clock, browser event order, or Math.random as authoritative simulation inputs.
- Chunk-generation details remain P0-TECH-004 scope.

### DECISION NEEDED
None.

# ADR

## ADR ID
ADR-P0-TECH-003

## CONTEXT
Phase 0 needs one reproducible update model for movement tests, world-generation foundations, save/load validation, and future hosted authority. Render cadence is variable and cannot define gameplay time.

## DECISION

### Fixed authoritative simulation
Use a **60 Hz fixed simulation step**.

- one authoritative tick = **1/60 second**;
- simulation advances by integer tick count;
- simulation code receives a fixed-step value/tick identity, not arbitrary render-frame delta;
- the host owns the real-time accumulator;
- render frames may execute zero, one, or multiple fixed simulation steps;
- authoritative ticks are never intentionally skipped to "catch up";
- after a long browser suspension, the host must resume through an explicit lifecycle path rather than replaying an unbounded wall-clock backlog.

A 60 Hz step gives Phase 0 enough temporal resolution to satisfy the existing ≤50 ms movement start/stop/direction responsiveness contract while preserving a simple deterministic model.

### Input timing
Raw browser events remain in the client adapter.

For each simulation tick:
1. the client input adapter exposes logical input state;
2. the authoritative runtime consumes the logical state at the tick boundary;
3. the same logical input tape + same initial state + same tick count must reproduce the same authoritative result under the deterministic test environment.

No keyboard repeat timing enters the simulation.

### Authoritative time
Inside `simulation` and deterministic `world` logic:

Forbidden as gameplay truth:
- `Date.now()`;
- `performance.now()`;
- wall-clock time;
- render FPS;
- Pixi ticker delta;
- asynchronous completion order.

Game time derives from tick identity and approved game-state timers.

### RNG ownership
All authoritative randomness must use a **project-owned deterministic RNG service**.

Rules:
- `Math.random()` is forbidden in authoritative `simulation/world` code.
- RNG state belongs to the authoritative runtime/world domain, never presentation.
- The RNG algorithm/version is persisted or otherwise identifiable wherever its results affect persisted world state.
- Phase 0 implementation will use a small integer-state PRNG with stable cross-runtime bit operations; recommended implementation is **xoshiro128**-family with explicit uint32 state.
- Golden-vector tests must lock the exact implementation before procedural output depends on it.

### Seed derivation
Use hierarchical, order-independent derivation.

Conceptual key:

`worldSeed + rngAlgorithmVersion + namespace + stable domain identifiers`

Examples of namespaces:
- `world-generation`
- `chunk-generation`
- later subsystem-specific namespaces

Rules:
- independent deterministic domains receive derived substreams rather than sharing one global sequential RNG;
- chunk generation must derive its RNG from world seed + chunk identity, so generation order does not change chunk content;
- seed derivation uses a stable project-owned/versioned integer hash/derivation function;
- P0-TECH-004 defines the exact canonical chunk-coordinate encoding used in that key.

### Numeric policy
Phase 0 authoritative simulation may use JavaScript finite `number` values for continuous positions/velocities, but deterministic code must:
- keep operation order stable;
- avoid dependence on object/map iteration order unless ordering is explicitly canonicalized;
- avoid transcendental/random platform functions in authoritative paths where integer or precomputed constants suffice;
- reject NaN/Infinity entering authoritative state.

Cross-client lockstep bit identity is **not** required because future multiplayer is server authoritative.

### Deterministic equivalence
For Phase 0 deterministic tests, two runs are equivalent when they use the same:
- simulation/content/schema version;
- initial authoritative state;
- world seed/RNG version;
- ordered logical input tape;
- number of fixed ticks;

and produce:
- identical canonical discrete state (IDs, enums, booleans, integer/tick/RNG state);
- exact repeatability for canonical serialized deterministic state within the pinned CI runtime;
- for explicitly designated continuous numeric assertions, a documented tight tolerance may be used for behavior assertions, but the deterministic replay/hash fixture itself should compare canonical state consistently.

World-generation golden fixtures must be independent of generation request order.

## ALTERNATIVES

### Variable timestep simulation
Rejected: ties gameplay to render/host timing and weakens repeatability.

### Client/server deterministic lockstep
Rejected for Phase 0: unnecessary for the approved server-authoritative multiplayer direction and increases cross-runtime numeric constraints.

### One global sequential RNG
Rejected: results would change when unrelated system execution order changes and would make chunk generation order-sensitive.

## TRADE-OFFS
- Fixed-step accumulator adds host scheduling code.
- 60 Hz costs more updates than a lower-frequency simulation but simplifies responsive movement and avoids interpolation becoming player-control latency.
- Server-authoritative future networking may still require prediction/reconciliation; determinism reduces test/debug risk but does not eliminate networking work.

## CONSEQUENCES
- P0-TECH-004 must use order-independent seed derivation for chunks.
- P0-TECH-005 must preserve world seed and RNG/version data required to reconstruct persisted deterministic state.
- P0-TECH-007 must include deterministic replay/golden tests.
- Pixi ticker is presentation-only.
- Future server host runs the same fixed-step simulation contract.

# TECHNICAL DESIGN SPEC

## SYSTEM
Deterministic Simulation Runtime

## ARCHITECTURE OVERVIEW
```text
wall clock -> host accumulator -> 0..N fixed ticks
browser input -> logical InputState -> fixed tick
fixed tick -> SimulationRuntime -> World
SimulationSnapshot(tick N) + Snapshot(tick N-1) -> presentation interpolation
```

## COMPONENTS
- **SimulationClock contract:** integer tick + fixed 1/60 step.
- **SimulationRuntime:** deterministic ordered system execution.
- **DeterministicRng:** explicit state/version; no ambient randomness.
- **SeedDerivation:** stable namespaced substream derivation.
- **Client accumulator:** environment-specific scheduling outside simulation.
- **Presentation interpolation:** read-only visual interpolation between authoritative snapshots.

## RESPONSIBILITIES
Simulation owns authoritative tick ordering/state. World owns deterministic world state/generation inputs. Client host owns wall-clock accumulation. Presentation owns interpolation only.

## DATA MODEL
Required foundation concepts:
- `SimulationTick` (integer);
- fixed-step constant/config identity;
- serializable RNG state;
- RNG algorithm/version;
- world seed;
- canonical deterministic snapshot/checkpoint representation.

## DATA OWNERSHIP
Simulation owns tick and gameplay runtime state. World owns seed-derived world state. Presentation owns interpolation alpha. Host owns accumulator/wall clock.

## CLIENT RESPONSIBILITY
Capture logical input, drive accumulator, call fixed steps, render snapshots, handle suspension/focus without injecting wall-clock nondeterminism.

## SERVER RESPONSIBILITY
Future server/host uses the same fixed-step contract and authoritative RNG/world rules. It does not trust client wall-clock or position state.

## PERSISTENCE
Persist/identify world seed and deterministic algorithm/schema versions when required by persisted outputs. Do not persist presentation interpolation/accumulator state as gameplay truth.

## NETWORKING
Network protocol is deferred. Future commands are applied by authoritative tick/order policy defined by networking design. Renderer timing never controls server simulation.

## PUBLIC INTERFACES
Conceptual:
```ts
type SimulationTick = number;

interface SimulationStep {
  readonly tick: SimulationTick;
  readonly dtSeconds: number; // always 1/60 in this ADR
}

interface DeterministicRng {
  nextUint32(): number;
  exportState(): readonly number[];
}
```

## FAILURE HANDLING
- detect/reject NaN/Infinity in debug/test authoritative state;
- fail deterministic tests on replay/hash divergence;
- do not silently reseed RNG after load;
- long host suspension must not create unbounded catch-up execution.

## PERFORMANCE
Target fixed-step cost must leave budget for 60 Hz execution on supported desktop browsers. Exact tick-cost budgets are set in P0-TECH-007 after representative implementation exists.

## SECURITY / VALIDATION
Future clients cannot supply authoritative seed/RNG state or wall-clock delta. Server/host owns tick progression and validates commands.

## OBSERVABILITY
Expose tick index, steps executed per host frame, accumulator backlog, simulation step duration, deterministic checkpoint hash, seed/RNG version in debug diagnostics.

## TEST STRATEGY
Required:
- golden RNG vectors;
- same initial state/input tape repeated multiple times -> same checkpoint;
- render FPS variation -> same authoritative result for same fixed ticks;
- chunk generation request-order test once P0-TECH-004 exists;
- presentation interpolation cannot mutate simulation state;
- test that authoritative code paths contain no `Math.random` usage.

## MIGRATION
Any change to RNG/seed derivation that affects persisted/generated results requires an explicit version change and migration/regeneration compatibility decision.

## KNOWN LIMITATIONS
This does not define chunk coordinate encoding, save schema, network prediction/reconciliation, combat simulation, or cross-browser lockstep guarantees.

## FUTURE EXTENSION
Supports server-hosted authority, replay/debug input tapes, deterministic world-generation fixtures, worker-hosted simulation, and desync diagnostics.

# FILE PLAN

## CREATE
`src/foundation/time/SimulationTick.ts`
- Purpose: tick/fixed-step domain primitives.
- API: `SimulationTick`, fixed-step constant/constructor helpers.

`src/foundation/random/DeterministicRng.ts`
- Purpose: versioned deterministic RNG abstraction/implementation.
- API: next uint32/state export/import; no ambient randomness.

`src/foundation/random/SeedDerivation.ts`
- Purpose: namespaced stable seed/substream derivation.
- API: derive from world seed + namespace + stable identifiers.

`src/simulation/internal/FixedStepRuntime.ts`
- Purpose: deterministic ordered tick execution.
- API: private behind simulation public API.

`src/client/runtime/FixedStepHost.ts`
- Purpose: wall-clock accumulator and fixed-step scheduling.
- API: client-host lifecycle only.

## MODIFY
`src/simulation/api/SimulationRuntime.ts`
- Affected section: step contract.
- Required architecture change: accept deterministic fixed-step/tick semantics rather than arbitrary render delta.

`src/client/presentation/PixiPresentationAdapter.ts`
- Affected section: render input.
- Required architecture change: interpolation is presentation-only and cannot mutate authoritative snapshots.

# ACCEPTANCE CRITERIA SELF-CHECK
- Deterministic scope explicit: PASS.
- RNG ownership and seed derivation rules explicit: PASS.
- Repeated-run equivalence rule explicit: PASS.
- Presentation/authoritative-state separation explicit: PASS.
- No gameplay rule invented: PASS.

# HANDOFF
Producer verifies artifact and may then evaluate P0-TECH-004 dependency gate.

**PROJECT OWNER ACTION: NONE**
