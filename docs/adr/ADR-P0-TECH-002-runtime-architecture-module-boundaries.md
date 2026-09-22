# ADR-P0-TECH-002 — Runtime Architecture & Module Boundaries

**Task:** P0-TECH-002  
**System:** Phase 0 Runtime Architecture  
**Role:** Technical Lead / Game Architect  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Source Issue:** #4  
**Date:** 2026-09-22  
**Depends on:** ADR-P0-TECH-001

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- Phase 0 uses TypeScript + Vite + PixiJS v8 with WebGL/WebGL2 as the production renderer backend.
- PixiJS/DOM/browser presentation state is non-authoritative.
- Shared simulation must be renderer-independent and runnable without Pixi, DOM, Canvas, or browser input objects.
- ProZ0 requires explicit separation between client presentation, shared simulation, persistence, and content definitions.
- Simulation/world behavior must remain compatible with deterministic execution, fixed simulation steps, chunk streaming, versioned persistence, and future server-authoritative multiplayer.
- Single-player and hosted co-op share the same world rules.
- Future host/server owns world persistence and validates authoritative gameplay state.
- Phase 0 is currently single-player and does not implement the full network protocol.
- Presentation may interpolate/quantize render state but must never write render quantization back into simulation/world state.

## CONSTRAINT

- Architecture must be simple enough for Phase 0 and may not pre-build production backend services.
- Browser-specific APIs must remain outside domain/runtime modules.
- Persistence must be an infrastructure boundary, not gameplay authority.
- Content definitions are data, not mutable runtime authority.
- Public contracts must allow the future server/host to reuse simulation/world logic without importing client presentation code.
- Exact fixed timestep, RNG policy, chunk coordinate/lifecycle model, save schema, and networking protocol belong to later authorized Technical tasks.

## ASSUMPTION

None required to complete this architecture.

## OPEN QUESTION

- Exact collision-footprint dimensions/shape remains a later Technical Design integration detail.
- Detailed frame-time/texture/atlas budgets remain a later profiling/testing detail.

## DECISION NEEDED

None from Project Owner.

---

# ADR

## ADR ID

ADR-P0-TECH-002

## CONTEXT

P0-TECH-001 selected a browser-native TypeScript/Pixi runtime specifically so the game renderer does not become the owner of game state.

P0-TECH-002 now must define module boundaries before implementation begins. The primary architectural risk is accidental coupling:

- browser input objects leaking into simulation;
- Pixi objects becoming entity/game state;
- persistence becoming embedded inside gameplay systems;
- world state depending on presentation lifecycle;
- content definitions becoming mutable runtime state;
- future server authority requiring a rewrite because client code owns the simulation.

The architecture must support a Phase 0 local single-player runtime while preserving a clean migration path to a future hosted authoritative runtime.

## DECISION

Use a **single-repository modular TypeScript architecture** with explicit dependency boundaries.

Phase 0 does **not** create a monorepo/workspace split or a production server package yet.

Top-level runtime modules:

```text
src/
  foundation/
  content/
  world/
  simulation/
  persistence/
  client/
```

Future, not created in Phase 0 until authorized:

```text
src/server/
```

Module roles:

- `foundation` — pure platform-neutral primitives/value types/utilities.
- `content` — read-only validated game/content definitions and registries.
- `world` — authoritative live world state and world query/mutation boundary.
- `simulation` — authoritative gameplay orchestration, player/runtime state, systems, tick execution, and public simulation API.
- `persistence` — save/load infrastructure adapters and migration/serialization boundary; never authoritative while runtime is active.
- `client` — browser composition root, raw input adapter, Pixi presentation, camera/rendering, browser lifecycle.
- future `server` — authoritative host composition root reusing `simulation`, `world`, `content`, and `persistence`, with no `client` dependency.

### Dependency rule

In the graph below, `A -> B` means **A may import B**.

```text
foundation  -> (nothing)

content     -> foundation

world       -> content
world       -> foundation

simulation  -> world
simulation  -> content
simulation  -> foundation

persistence -> simulation public state/export contracts
persistence -> world public state/export contracts
persistence -> content identifiers/version metadata as required
persistence -> foundation

client      -> simulation public API
client      -> persistence public API
client      -> content public API
client      -> world construction/public bootstrap contracts only
client      -> foundation
client/presentation -> PixiJS
```

Forbidden dependencies:

```text
foundation  -X-> any higher module
content     -X-> world / simulation / persistence / client
world       -X-> simulation / persistence / client / Pixi / DOM
simulation  -X-> persistence / client / Pixi / DOM
persistence -X-> client / Pixi / DOM presentation state
client      -X-> private/internal files of world/simulation/content/persistence
```

The browser client may compose the modules, but composition does not grant presentation authority over domain state.

### Local Phase 0 authority model

For single-player Phase 0:

```text
Browser
  |
  v
Client Composition Root
  |
  +--> Input Adapter ----> SimulationRuntime
  |                           |
  |                           +--> World
  |                           +--> Content
  |
  +--> Presentation <---- read-only SimulationSnapshot
  |
  +--> Persistence Adapter <---- explicit save/export operation
```

The authoritative simulation executes **in-process** in the browser for Phase 0.

"Authoritative" here means authoritative within the local session. It does **not** mean that presentation/Pixi is authoritative.

### Future hosted server authority model

Later:

```text
Browser Client                       Host / Server Runtime
--------------                       ---------------------
Input Adapter ---- commands -------> Server Host
Presentation <---- snapshots ------- SimulationRuntime
                                      |
                                      +--> World
                                      +--> Content
                                      +--> Persistence
```

The future migration changes the **composition/transport boundary**, not the gameplay/domain implementation.

## ALTERNATIVES

### Alternative A — Pixi/scene-centric game architecture

Game state would live directly on Pixi scene objects/components.

**Rejected because:**
- renderer state would become gameplay state;
- deterministic/headless testing becomes harder;
- server reuse would require extracting game logic later;
- save/network formats risk depending on presentation identity.

### Alternative B — npm workspaces/monorepo packages immediately

Separate packages such as `packages/client`, `packages/simulation`, `packages/world`, and `packages/server` from Phase 0.

**Advantages:**
- stronger physical dependency boundaries;
- clear independent package surfaces.

**Rejected for Phase 0 because:**
- server runtime is not yet implemented;
- package publishing/build orchestration adds setup cost before it is needed;
- directory/module boundaries plus import rules are sufficient for the Foundation slice.

**Migration path:** if independent build/deploy lifecycles become necessary, the top-level modules can later be extracted into workspace packages without changing authority or API direction.

### Alternative C — one flat `src/` with convention-only boundaries

**Rejected because:**
- ownership becomes ambiguous quickly;
- client-only imports can leak into domain code;
- future persistence/network work would have no enforceable seam.

## TRADE-OFFS

Accepted costs:

- explicit mapping between domain snapshots and Pixi presentation;
- explicit composition/wiring instead of engine-global access;
- explicit public module APIs;
- some duplication between domain state and presentation read models may be preferable to cross-layer leakage.

Benefits:

- headless simulation testing;
- future host/server reuse;
- renderer replacement remains isolated;
- persistence is reconstructive rather than object-graph serialization;
- chunk/world ownership remains independent from Pixi scene lifecycle;
- content remains data-driven and testable;
- module ownership is understandable to separate engineers.

## CONSEQUENCES

1. P0-ENG-001 must create the directory boundaries defined by this ADR.
2. P0-TECH-003 owns the exact deterministic update loop and RNG policy inside `simulation`; Pixi ticker remains presentation-only.
3. P0-TECH-004 owns chunk coordinate and lifecycle details inside `world`.
4. P0-TECH-005 owns persisted state schema/versioning inside `persistence`, while runtime authority remains in `simulation/world`.
5. P0-TECH-006 or later networking design must attach transport outside `simulation` using logical commands/snapshots.
6. QA/CI should later include forbidden-import/boundary checks.
7. Engineers must not bypass public module APIs by importing another module's `internal/` implementation.

---

# TECHNICAL DESIGN SPEC

## SYSTEM

Phase 0 Runtime Architecture & Module Boundaries

## ARCHITECTURE OVERVIEW

ProZ0 uses a layered/ports-and-adapters style without introducing a framework abstraction layer for its own sake.

There are three practical rings:

### Domain/runtime core

- `foundation`
- `content`
- `world`
- `simulation`

These modules must run without DOM, Canvas, WebGL, PixiJS, localStorage, IndexedDB, WebSocket, or browser event objects.

### Infrastructure adapters

- `persistence`
- future network transport adapters

These translate external storage/transport into domain contracts.

### Host/presentation adapters

- `client`
- future `server`

Hosts compose the runtime and own environment-specific lifecycle.

No global singleton service locator is required.

Dependencies are supplied explicitly through constructors/factory/composition functions when implementation begins.

---

## COMPONENTS

### 1. Foundation

Purpose:
- platform-neutral primitive types;
- stable IDs/value objects;
- math primitives needed across domain modules;
- error/result primitives only when demonstrably shared.

Does not own gameplay behavior.

### 2. Content

Purpose:
- immutable/read-only content definitions;
- validation and lookup by stable content ID;
- tuning/config values that are approved as data rather than hard-coded engine constants.

Examples of future content:
- item definitions;
- entity definitions;
- biome definitions;
- profession/machine definitions.

Phase 0 only implements content needed by authorized tasks.

### 3. World

Purpose:
- authoritative in-memory world state;
- world queries used by simulation;
- controlled mutation boundary;
- future chunk activation/generation state;
- future world seed/chunk identity ownership;
- collision/walkability representation needed by simulation.

The exact chunk coordinate/lifecycle model is deferred to P0-TECH-004.

### 4. Simulation

Purpose:
- authoritative gameplay runtime;
- player/runtime state;
- logical input consumption;
- system update orchestration;
- movement/facing/collision behavior using Game Design contracts;
- future deterministic tick ownership;
- generation of read-only snapshots/read models for presentation/network use.

The exact fixed-step model and deterministic equivalence policy are deferred to P0-TECH-003.

### 5. Persistence

Purpose:
- storage adapter boundary;
- encode/decode/version/migration integration;
- load/save/backup adapter implementations when authorized;
- validation before loaded data enters authoritative world/simulation state.

Persistence does not continuously own live gameplay state.

### 6. Client

Purpose:
- browser startup/shutdown;
- dependency composition;
- raw browser input mapping;
- focus handling;
- Pixi initialization;
- presentation mapping;
- camera presentation;
- DPR/internal-raster/output-scale handling;
- browser diagnostics.

`client/presentation` may depend on PixiJS. No other top-level module may.

### 7. Future Server Host

Not implemented in Phase 0.

Purpose when authorized:
- session/network lifecycle;
- player connection identity;
- command validation/dispatch;
- authoritative simulation execution;
- persistence scheduling;
- snapshot/event publication;
- server observability.

It reuses domain modules and does not import `client`.

---

## RESPONSIBILITIES

| Module | Owns | Must not own |
|---|---|---|
| foundation | primitives/value types | gameplay systems, storage, rendering |
| content | immutable definitions/tuning data | live mutable world/player state |
| world | live world state, world queries/mutations | browser rendering, save I/O, raw network transport |
| simulation | gameplay state/orchestration, player runtime state, authoritative update execution | Pixi objects, DOM events, storage backend |
| persistence | durable encoding/I/O/migration adapters | live gameplay authority |
| client/input | browser event capture and logical-input mapping | gameplay resolution |
| client/presentation | Pixi objects, camera/render state, visual interpolation | authoritative movement/world state |
| client host | browser composition/lifecycle | domain rules |
| future server | authoritative hosted composition/network/session lifecycle | client rendering |

---

## DATA MODEL

### Foundation data

Platform-neutral values only:
- entity/player IDs;
- numeric vectors/positions;
- time/tick identifiers after P0-TECH-003 defines them;
- generic result/error identifiers where shared.

### Content data

Read-only validated definitions addressed by stable IDs.

Runtime state stores content references by stable content ID, not renderer/asset object identity.

### World data

Authoritative mutable world-domain state.

Includes only domain values, not Pixi objects or storage handles.

Exact chunk/save schema is intentionally deferred.

### Simulation data

Authoritative runtime/player state and system state.

For movement Phase 0 this includes domain-level:
- continuous world position;
- intended/resolved movement;
- facing;
- locomotion state;
- input state needed by simulation.

### Presentation data

Derived, ephemeral values:
- Pixi Sprite/Container/Texture references;
- presentation interpolation;
- smoothed camera position;
- raster-snapped camera position;
- z/depth presentation order.

Presentation state may be discarded and rebuilt from domain state/content.

### Persistence data

Versioned serializable domain representation defined by P0-TECH-005.

No presentation object or browser runtime handle may appear in persisted data.

---

## DATA OWNERSHIP

| State | Owner | Readers |
|---|---|---|
| raw KeyboardEvent/focus events | client/input | client/input only |
| logical input state/command | simulation public input contract | simulation; future network adapter |
| player gameplay position | simulation | world collision/query as needed; presentation through snapshot |
| player movement/facing state | simulation | presentation/network snapshot |
| world terrain/collision/mutation state | world | simulation; persistence export; snapshot/read model |
| world seed/chunk state | world | simulation/persistence; details later P0-TECH-004 |
| content definitions | content | world/simulation/client presentation |
| save bytes/records | persistence adapter | persistence adapter |
| decoded persisted domain DTO | persistence boundary during load | validation/import path |
| Pixi objects | client/presentation | client/presentation only |
| camera presentation position | client/presentation | renderer/debug |
| authoritative hosted session state | future server host + simulation/world | network publication |

---

## CLIENT RESPONSIBILITY

Phase 0 client:

1. initialize validated content;
2. construct world/runtime dependencies;
3. construct authoritative local `SimulationRuntime`;
4. capture browser input and convert it to logical input;
5. advance simulation using the later approved timing strategy;
6. retrieve read-only presentation snapshots;
7. render with PixiJS;
8. manage browser focus, resize, DPR, canvas lifecycle;
9. invoke persistence through explicit application actions when persistence exists;
10. expose local diagnostics.

Client presentation must never resolve gameplay collisions or write final gameplay positions.

A client-only convenience function may request domain actions, but domain modules decide whether/how state changes.

---

## SERVER RESPONSIBILITY

No server implementation is authorized by P0-TECH-002.

Future server/host responsibility:

- instantiate the same content/world/simulation domain modules;
- own authoritative session lifecycle;
- receive logical player commands, not browser events;
- validate command identity/rate/state before applying;
- advance authoritative simulation;
- own authoritative persistence scheduling;
- publish snapshots/events;
- reject client-provided authoritative world mutation.

The server must not require PixiJS, Canvas, WebGL, or client presentation code.

---

## PERSISTENCE

Architecture rules:

- `simulation` and `world` do not import concrete persistence adapters.
- persistence imports/uses public export/import contracts from domain modules.
- save/load occurs through the host/composition layer.
- loaded data is validated before becoming authoritative live state.
- presentation state is reconstructed after load.
- save failure cannot silently mutate/replace live authoritative state.
- atomic write, backup, schema version, and migration behavior are specified by P0-TECH-005.

Conceptual flow:

```text
save:
Simulation/World -> domain export DTO -> Persistence encoder/store

load:
Persistence store -> decode/validate/migrate -> domain import/constructor -> Simulation/World
```

---

## NETWORKING

Networking is not implemented here.

The architecture reserves two domain-facing contract classes:

### Input/command boundary

Future transport converts network packets into the same logical command/input types accepted by the authoritative simulation.

### Snapshot/event boundary

Future transport serializes domain snapshots/events without Pixi or browser-specific types.

Phase 0 local execution bypasses transport but uses the same logical boundary.

This allows:

```text
Phase 0:
Keyboard -> InputAdapter -> Simulation

Future:
Keyboard -> Client Command Encoder -> Network -> Server Command Decoder -> Simulation
```

without rewriting gameplay systems.

---

## PUBLIC INTERFACES

Signatures below define architecture intent; exact fields may be refined by the authorized downstream Technical Designs without changing ownership.

### simulation public API

```ts
interface SimulationRuntime {
  submitInput(playerId: PlayerId, input: PlayerInput): void;
  step(step: SimulationStep): void;
  getSnapshot(): SimulationSnapshot;
}
```

Rules:
- public inputs are logical/domain types;
- no DOM/Pixi types;
- `SimulationStep` exact timing representation is owned by P0-TECH-003;
- snapshot is read-only domain/presentation-neutral data.

### world public API

```ts
interface WorldQuery {
  // domain queries such as collision/walkability;
  // exact collision/chunk contracts are defined by later Technical tasks.
}

interface WorldMutation {
  // controlled authoritative mutation surface;
  // exact operations are feature/task specific.
}
```

Rules:
- mutation API is not exposed directly to client presentation;
- simulation/authoritative host owns use of mutations.

### content public API

```ts
interface ContentRegistry {
  get<TDefinition>(id: ContentId): TDefinition;
  has(id: ContentId): boolean;
}
```

Registry is read-only after validated startup for Phase 0 unless a later task explicitly designs hot reload/runtime content mutation.

### persistence public boundary

Exact save DTO/schema/method signatures are owned by P0-TECH-005.

Required architectural shape:

```text
PersistenceStore/Repository
  load(...)
  save(...)
  backup/export hooks later as specified
```

It accepts/returns versioned serializable domain data, never live Pixi objects.

### presentation boundary

```ts
interface PresentationAdapter {
  render(snapshot: SimulationSnapshot, alpha: number): void;
}
```

`alpha` is presentation interpolation only; authoritative timing semantics are defined by P0-TECH-003.

### input boundary

```ts
interface InputSource {
  sample(): PlayerInput;
  reset(): void;
}
```

Browser focus loss calls/reset-equivalent behavior so stale key state does not remain active.

---

## FAILURE HANDLING

### Content validation failure

Fail startup before authoritative simulation begins if required content is invalid or missing.

Do not silently substitute gameplay definitions.

### Client renderer failure

Presentation may stop/reinitialize without converting Pixi state into domain recovery state.

Domain state remains conceptually independent.

### Input focus loss

Client input adapter clears/suspends held logical input in accordance with P0-DES-001.

### World query/mutation failure

Domain failures must be explicit and testable; no silent mutation through presentation.

Exact world/chunk failure policy is refined by P0-TECH-004.

### Persistence load failure

Invalid/corrupt save data must not partially mutate the live runtime.

Exact recovery/backup/migration policy is P0-TECH-005.

### Future network failure

Transport disconnect/reconnect must not change module ownership. Session/reconnect behavior is defined later.

---

## PERFORMANCE

Architecture-level constraints:

- render loop and simulation loop remain separable;
- presentation may interpolate without altering authoritative state;
- no full-world Pixi scene graph for a near-infinite world;
- future world/chunk module exposes only active/relevant state to presentation;
- no serialization of the entire world every render frame;
- snapshots/read models should avoid unnecessary full-world deep copies;
- content registry is shared/read-only rather than duplicated per entity;
- persistence work must not become part of render-critical code paths;
- profiling budgets are defined by later P0-TECH-007 once representative runtime exists.

Phase 0 prioritizes correctness and clean boundaries over premature worker/thread distribution.

Web Workers are not introduced by this ADR.

---

## SECURITY / VALIDATION

Phase 0 local execution still preserves future trust boundaries:

- raw browser events are not domain commands;
- client presentation cannot directly mutate world authority;
- loaded persistence data is untrusted until validated;
- content definitions are validated before use;
- future network packets must be decoded/validated before simulation mutation;
- future server does not trust client-supplied positions, damage, inventory changes, building placements, or world mutations.

No authentication/account backend is introduced in Phase 0.

---

## OBSERVABILITY

Module ownership must make the following observable without requiring Pixi state as source of truth:

- simulation tick/update cost;
- render frame cost;
- input sampling/consumption timing;
- world/chunk generation/load metrics when implemented;
- save/load failures;
- content validation failures;
- renderer/context failures;
- future network latency/desync events.

Log/metric implementation is deferred to relevant implementation/testing tasks, but events must originate from the module that owns the state.

---

## TEST STRATEGY

### Boundary tests

CI/test tooling should be able to reject forbidden imports such as:

- `simulation -> client`;
- `simulation -> pixi.js`;
- `world -> client`;
- `content -> simulation`;
- `persistence -> client/presentation`.

P0-TECH-007 chooses the concrete lint/dependency-enforcement tool.

### Headless simulation tests

`foundation`, `content`, `world`, and `simulation` tests run without DOM/WebGL/Pixi.

### Contract tests

Test public APIs independently of concrete adapters.

Examples:
- logical input accepted by simulation;
- world queries return domain data;
- content registry is read-only/validated;
- persistence adapter round-trip later against approved schema.

### Browser integration tests

Client adapter tests verify:
- browser focus handling;
- Pixi startup;
- snapshot-to-presentation mapping;
- camera/pixel rendering requirements.

### Future server tests

When server host exists, the same simulation contract tests must run without client dependencies.

---

## MIGRATION

### Phase 0 -> hosted authoritative runtime

Migration procedure is architectural, not a gameplay rewrite:

1. keep `foundation/content/world/simulation` unchanged in authority direction;
2. add `server` composition root;
3. move authoritative runtime construction from local client host to server host for multiplayer sessions;
4. add transport adapters between client commands and server snapshots;
5. keep client presentation consuming snapshots;
6. keep persistence attached to authoritative host/server.

### Single repository -> workspace packages

If independent build/deploy boundaries later justify it:

- `foundation`, `content`, `world`, `simulation` may be extracted to packages;
- `client` and future `server` become host packages/apps;
- public API direction remains unchanged.

No workspace split is required now.

---

## KNOWN LIMITATIONS

P0-TECH-002 intentionally does not define:

- exact fixed timestep;
- deterministic numeric/RNG policy;
- chunk coordinate size/identity/lifecycle;
- save schema/serialization format;
- backup implementation;
- network message schema;
- prediction/reconciliation;
- concrete collision solver/physics library;
- exact player collision-footprint dimensions;
- production browser support matrix;
- production telemetry backend.

These are not blockers because they are assigned to downstream authorized Technical tasks or later milestones.

---

## FUTURE EXTENSION

This architecture preserves:

- authoritative hosted multiplayer;
- client prediction/reconciliation;
- worker-hosted local simulation if profiling later justifies it;
- workspace/package extraction;
- alternate renderer behind client presentation;
- alternate persistence backends;
- chunk streaming;
- deterministic replay/testing;
- headless simulation tools;
- dedicated server/runtime packaging if product direction later requires it.

---

# FILE / MODULE PLAN

This plan defines the implementation locations P0-ENG-001 should establish after all implementation prerequisites are TECH READY.

No source code is created by P0-TECH-002.

## CREATE

### `src/foundation/index.ts`

**Purpose:** public export surface for platform-neutral primitives.

**Responsibility:** expose only approved primitives/value types needed by multiple domain modules.

**API:** re-export stable public foundation types; no browser or gameplay services.

---

### `src/content/index.ts`

**Purpose:** public content-module entrypoint.

**Responsibility:** expose validated read-only content registry/contracts.

**API:** `ContentRegistry` and approved definition identifiers/types.

---

### `src/content/ContentRegistry.ts`

**Purpose:** validated content lookup.

**Responsibility:** load/hold approved in-memory definitions and provide stable ID lookup.

**API:** read-only lookup/validation surface; exact definition sets added only by authorized feature tasks.

---

### `src/world/index.ts`

**Purpose:** public world-module entrypoint.

**Responsibility:** expose world construction and public query/mutation contracts without leaking internals.

**API:** `WorldQuery`, controlled authoritative mutation/bootstrap types.

---

### `src/world/api/WorldQuery.ts`

**Purpose:** domain world-read boundary.

**Responsibility:** provide simulation-safe world queries.

**API:** exact collision/chunk operations refined by P0-TECH-004 and authorized movement technical design.

---

### `src/world/api/WorldMutation.ts`

**Purpose:** controlled world-write boundary.

**Responsibility:** prevent arbitrary client/presentation writes to authoritative world state.

**API:** feature-specific mutation methods added only as approved systems require them.

---

### `src/world/internal/`

**Purpose:** private world implementation namespace.

**Responsibility:** world state storage, later chunk lifecycle/generation internals.

**API:** none outside `src/world/index.ts`; direct cross-module imports are forbidden.

---

### `src/simulation/index.ts`

**Purpose:** public simulation-module entrypoint.

**Responsibility:** expose simulation construction/runtime/input/snapshot contracts.

**API:** `SimulationRuntime`, `PlayerInput`, `SimulationSnapshot`, timing type placeholder refined by P0-TECH-003.

---

### `src/simulation/api/SimulationRuntime.ts`

**Purpose:** authoritative simulation host contract.

**Responsibility:** logical input submission, simulation advancement, read-only snapshot publication.

**API:** `submitInput(...)`, `step(...)`, `getSnapshot()`; exact types refined by P0-TECH-003.

---

### `src/simulation/api/PlayerInput.ts`

**Purpose:** logical input contract independent of browser events.

**Responsibility:** represent gameplay input state/commands consumed by simulation.

**API:** approved logical movement controls; no `KeyboardEvent` or DOM types.

---

### `src/simulation/api/SimulationSnapshot.ts`

**Purpose:** read-only presentation/network-facing domain state.

**Responsibility:** expose observable domain state without renderer objects or mutable internals.

**API:** exact snapshot fields evolve with authorized systems.

---

### `src/simulation/internal/`

**Purpose:** private authoritative simulation implementation namespace.

**Responsibility:** system orchestration and gameplay logic.

**API:** none outside `src/simulation/index.ts`; direct client imports are forbidden.

---

### `src/persistence/index.ts`

**Purpose:** public persistence-module entrypoint.

**Responsibility:** expose persistence adapter contracts selected by P0-TECH-005.

**API:** exact repository/store and versioned DTO interfaces deferred to P0-TECH-005.

---

### `src/persistence/internal/`

**Purpose:** private persistence implementation namespace.

**Responsibility:** future browser storage/encoding/migration implementation.

**API:** none directly to simulation/world.

---

### `src/client/main.ts`

**Purpose:** browser composition root.

**Responsibility:** construct and wire content, world, simulation, persistence adapter, input, and presentation.

**API:** application entrypoint only.

---

### `src/client/input/KeyboardInputAdapter.ts`

**Purpose:** browser keyboard/focus adapter.

**Responsibility:** map WASD/arrow/focus state to logical `PlayerInput`; clear stale input on focus loss.

**API:** implements client-side `InputSource` behavior.

---

### `src/client/presentation/PixiPresentationAdapter.ts`

**Purpose:** PixiJS presentation boundary.

**Responsibility:** consume `SimulationSnapshot`, own Pixi render objects, apply world-to-render mapping, layers/depth, internal raster, and pixel-stable presentation.

**API:** `render(snapshot, alpha)`; no domain mutation.

---

### `src/client/presentation/CameraPresenter.ts`

**Purpose:** camera presentation implementation.

**Responsibility:** consume resolved player position and approved camera tuning; own smoothing and raster/pixel stabilization only.

**API:** presentation camera update/read methods; no write-back to simulation.

---

### `src/client/presentation/index.ts`

**Purpose:** public client presentation surface for the client composition root.

**Responsibility:** prevent the rest of the client from importing presentation internals/Pixi objects unnecessarily.

**API:** presentation construction and render contract.

---

## DO NOT CREATE YET

### `src/server/`

Reason:
- no server implementation is authorized in Phase 0;
- this ADR defines the extension boundary only.

Creation requires a future Producer-activated implementation task.

---

# IMPORT ENFORCEMENT PLAN

P0-ENG-001/P0-TECH-007 should establish enforceable rules so architecture is not documentation-only.

Minimum intended checks:

- only `src/client/**` may import `pixi.js`;
- `src/simulation/**` may not import from `src/client/**`, `src/persistence/**`, DOM/browser modules, or Pixi;
- `src/world/**` may not import from `src/simulation/**`, `src/persistence/**`, or `src/client/**`;
- `src/content/**` may import only `src/foundation/**`;
- cross-module imports use public `index.ts`/api surfaces rather than another module's `internal/**`;
- `src/persistence/**` may depend on public domain contracts but domain modules never import concrete persistence code.

Concrete lint/dependency tooling is selected under P0-TECH-007.

---

# ACCEPTANCE CRITERIA SELF-CHECK

## AC — Module responsibilities and ownership are unambiguous

**PASS**

Explicit ownership is defined for:
- client/presentation;
- simulation;
- world;
- persistence;
- content;
- foundation;
- future server host.

## AC — Allowed dependency direction is documented

**PASS**

Allowed and forbidden import directions are explicit, including the ADR-P0-TECH-001 rule that shared simulation cannot import Pixi/DOM/browser presentation state.

## AC — Future server-authoritative deployment path is not blocked

**PASS**

The future server host composes the same `content/world/simulation/persistence` modules and replaces only local composition/transport. Domain logic is not owned by the browser renderer.

---

# ROLE DEFINITION OF DONE SELF-CHECK

- Module ownership unambiguous: PASS.
- Data ownership unambiguous: PASS.
- Client/server authority boundary unambiguous at this task's scope: PASS.
- Persistence responsibility clear: PASS.
- Network extension boundary clear: PASS.
- Public module/API direction clear: PASS.
- File/module plan explicit: PASS.
- Failure modes considered: PASS.
- Performance risks considered: PASS.
- Validation/trust boundaries considered: PASS.
- Testing strategy defined: PASS.
- Migration path defined: PASS.
- No gameplay rule invented: PASS.
- No production server/backend over-engineering: PASS.
- Phase 0 implementation remains simple: PASS.
- Long-term server-authoritative roadmap remains open: PASS.

---

# HANDOFF

Return to Producer / Project Manager for:

1. artifact and DoD verification;
2. lifecycle update of P0-TECH-002;
3. dependency-gate evaluation for P0-TECH-003;
4. no implementation activation until the relevant technical prerequisites are complete.

**PROJECT OWNER ACTION: NONE**
