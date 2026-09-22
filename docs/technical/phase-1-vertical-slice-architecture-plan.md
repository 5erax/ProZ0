# Phase 1 Vertical Slice Systems Architecture and Integration Plan

**Task:** P1-TECH-001 / Issue #31  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DESIGN COMPLETE — READY FOR PRODUCER VERIFICATION  
**Accepted Phase 0 base:** main @ 64df08f1cab7eaa913fb84f68de888d82ad63675  
**Phase 1 source plan:** docs/phase-1-vertical-slice-plan.md  
**Implementation authorization:** NONE — this document defines architecture and integration constraints only.

---

## 1. Purpose

Phase 1 must add enough authoritative gameplay state to support the first 30–60 minute playable ProZ0 vertical slice without destroying the Phase 0 boundaries that made movement, deterministic world identity, persistence, and future server authority separable.

This plan defines:

- how Phase 1 systems fit into the existing `foundation/content/world/simulation/persistence/client` architecture;
- exactly one canonical owner for every new authoritative state category;
- which mutations are coordinated by simulation versus owned by world state;
- deterministic versus environment-dependent execution boundaries;
- transaction, identity, revision, and idempotency rules that specialized ADRs must refine;
- persistence extension seams;
- hosted-co-op authority and transport seams without pre-building production infrastructure;
- command/event/query interaction patterns;
- integration order and dependency graph;
- browser performance and observability risks;
- decisions intentionally deferred to P1-TECH-002 through P1-TECH-009.

This document does **not** invent gameplay values, balance, item lists, recipes, combat rules, profession rules, or visual rules. Those remain owned by the corresponding Game Design and Art/UI specifications.

---

## 2. Source of truth and precedence

This plan is subordinate to approved product/gameplay direction and preserves all accepted Phase 0 architectural decisions unless a later specialized ADR explicitly records a justified migration.

Primary sources:

1. `docs/phase-1-vertical-slice-plan.md`
2. P0-TECH-001 through P0-TECH-008
3. accepted Phase 0 implementation on main
4. approved Phase 0 persistence/world contracts
5. P1-DES-001..006 as they become Producer-approved
6. P1-ART-001..002 as they become Producer-approved
7. specialized P1 technical ADRs listed in this document

Conflict rule:

- gameplay meaning comes from approved Game Design;
- presentation/readability comes from approved Art/UI;
- state ownership, data flow, authority, persistence, determinism, network and performance boundaries come from Technical Design;
- later specialized ADRs may refine this architecture but must explicitly call out any deviation.

---

## 3. Phase 0 invariants that remain binding

Phase 1 MUST preserve these invariants.

### 3.1 Module dependency direction

Existing top-level modules remain:

- `src/foundation/`
- `src/content/`
- `src/world/`
- `src/simulation/`
- `src/persistence/`
- `src/client/`

Allowed dependency direction remains conceptually:

- foundation -> nothing
- content -> foundation
- world -> content, foundation
- simulation -> world, content, foundation
- persistence -> public simulation/world/content/foundation contracts
- client -> public simulation/persistence/content/world/foundation contracts
- client/presentation -> PixiJS

Forbidden:

- foundation depending on higher modules;
- content depending on runtime authority;
- world depending on simulation/persistence/client/Pixi;
- simulation depending on persistence/client/Pixi;
- persistence depending on client/Pixi or private domain internals;
- presentation mutating authoritative domain state;
- cross-module imports into another module's `internal/**`.

### 3.2 Authority invariants

- simulation and world together hold live canonical game state;
- client captures intent and renders read-only results;
- persistence is durable infrastructure, never live gameplay authority;
- presentation/camera/UI are never canonical;
- future host/server authority must be able to run without Pixi, DOM, Canvas, browser input or browser frame timing;
- raw client packets/events never directly become authoritative state.

### 3.3 Timing and determinism invariants

- authoritative simulation remains fixed-step at 60 Hz;
- render cadence is non-authoritative;
- logical input/commands are consumed at an authority boundary;
- authoritative randomness is project-owned/versioned;
- `Math.random()` remains forbidden in simulation/world authority;
- chunk base generation remains seed/version/coordinate derived and request-order independent;
- wall clock is metadata unless a later approved gameplay rule explicitly makes time progression canonical;
- asynchronous I/O completion order cannot become gameplay truth.

### 3.4 Persistence invariants

- durable records are versioned and validated as untrusted data;
- incompatible/corrupt state fails explicitly;
- load reconstructs unpublished authority and only publishes valid state;
- migration is explicit and sequential;
- save/import operations that span records remain atomic where the schema requires atomicity;
- stale writes never silently overwrite newer canonical state;
- dirty canonical world state cannot be silently discarded;
- presentation/transient network state never enters canonical saves.

---

## 4. Architecture decision summary

### P1-ARCH-001 — Preserve the Phase 0 top-level domain split

Phase 1 extends existing modules with bounded subdomains. It does not create a second gameplay implementation or collapse world/simulation/persistence into one service layer.

### P1-ARCH-002 — Simulation remains the authoritative gameplay transaction coordinator

`simulation` coordinates gameplay commands and cross-domain state transitions.

It may:

- validate player/gameplay preconditions;
- mutate simulation-owned aggregates;
- invoke public world query/mutation ports;
- emit authoritative outcome events/snapshots.

It may not:

- call concrete persistence adapters;
- call browser/network transport APIs;
- treat presentation state as input to gameplay rules.

### P1-ARCH-003 — World remains owner of persistent spatial/world aggregates

`world` owns canonical spatial/world state such as generated chunks, mutable world deltas, fog/discovery, spatial world entities, structures, machine placement/state where defined as world entities, and environment state used by the slice.

Simulation asks world to query or mutate through public contracts.

### P1-ARCH-004 — Item/container gameplay state is a simulation-owned ledger

Phase 1 requires atomic inventory/container/crafting/death-drop operations. The canonical logical item/container ledger belongs to simulation, independent of UI and spatial rendering.

World entities may reference item/container identities, but do not duplicate canonical item contents.

Examples:

- player inventory contents -> simulation item/container ledger;
- structure storage container contents -> simulation item/container ledger;
- ground/death-drop world position -> world;
- item identities contained by a ground/death drop -> simulation ledger, referenced by the world drop entity.

P1-TECH-003 must define exact aggregate boundaries and atomic update rules.

### P1-ARCH-005 — Cross-owner gameplay changes are one authority operation

A command that changes both simulation-owned and world-owned state is coordinated by one authoritative operation.

Examples include:

- gather resource -> world resource mutation + item ledger output;
- place building -> item consumption + world structure creation;
- death -> player state transition + inventory detach + world death-drop creation;
- recover drop -> world drop mutation + item/container transfer.

Required rule:

> either the authoritative operation commits the approved state transition consistently, or it fails without exposing a partial successful gameplay outcome.

Exact in-memory transaction technique and revision policy are specialized ADR decisions.

### P1-ARCH-006 — Content definitions stay immutable and separate from runtime instances

Phase 1 content definitions are read-only data keyed by stable content IDs.

Definitions describe approved static data such as:

- item types;
- resources;
- recipes;
- structures;
- machines;
- hazards;
- weather definitions;
- progression/profession prototype definitions;
- ruin/discovery definitions.

Runtime state uses stable IDs referencing those definitions but never mutates the definitions themselves.

P1-TECH-002 owns exact schemas, versioning, reference validation and canonical loading.

### P1-ARCH-007 — Shared authoritative operations are revisioned and idempotent where replay/duplication is possible

Every mutable aggregate that can be concurrently changed or retried through hosted co-op must expose enough identity/revision information to reject stale, duplicate or out-of-order mutations.

At architecture level this requires:

- stable aggregate identity;
- monotonic aggregate revision or equivalent version identity;
- stable operation/command identity where retries can occur;
- explicit preconditions;
- deterministic authoritative result;
- explicit rejection reason;
- no duplicate creation of items, structures or death drops.

Exact ID encoding and revision granularity are deferred to subsystem ADRs.

### P1-ARCH-008 — Hosted co-op is a host adapter around the same domain runtime

Solo and hosted co-op use the same authoritative rules.

Conceptual local path:

`Client input/UI -> Local Authority Host -> Simulation + World -> Snapshot/View -> Presentation`

Conceptual hosted path:

`Client input/UI -> Transport -> Server/Host Adapter -> same Simulation + World -> Replication -> Client View -> Presentation`

Phase 1 may introduce `src/server/` only after P1-TECH-007 is approved and implementation is authorized.

No production matchmaking, dedicated fleet or advanced prediction layer is implied by this architecture plan.

### P1-ARCH-009 — Persistence remains attached to the active authority host

Persistence reads/writes canonical DTOs from public authority/world export seams.

Remote clients never become canonical save owners.

Hosted save coordination belongs to the host/server authority.

### P1-ARCH-010 — External nondeterminism is converted into authoritative commands/events before changing state

Non-authoritative environment inputs include:

- browser key/mouse timing;
- render frames;
- network arrival timing;
- persistence completion timing;
- wall-clock timestamps;
- connection latency.

These may influence scheduling/diagnostics but cannot directly define gameplay results.

If a gameplay system requires a random or scheduled event, the authority must convert it into deterministic/versioned state or a canonical persisted event identity as defined by its specialized ADR.

### P1-ARCH-011 — Read models are not mutation surfaces

UI and transport consume read-only projections/snapshots.

They do not receive live mutable references to:

- inventories;
- containers;
- player survival state;
- world chunks/deltas;
- fog;
- buildings;
- machines;
- death drops;
- progression.

### P1-ARCH-012 — Phase 1 must remain horizontally extensible without pre-building Phase 2

The vertical slice gets only the state/contracts needed for the approved 30–60 minute path.

Do not generalize into:

- universal MMO entity frameworks;
- production ECS replacement;
- generic distributed database infrastructure;
- final automation/logistics graphs;
- full profession/research engines;
- final networking fleet architecture.

---

## 5. Proposed module and API additions

These are architectural placement rules. Exact file names/types are owned by downstream ADRs and implementation tasks.

### 5.1 foundation

Allowed Phase 1 additions:

- stable branded ID primitives if multiple modules require them;
- deterministic hashing/encoding helpers;
- revision/version primitives;
- immutable math/time helpers;
- serialization-safe utility types that are genuinely domain-neutral.

Forbidden:

- item gameplay rules;
- container logic;
- building logic;
- networking transport;
- IndexedDB;
- DOM/Pixi;
- feature-specific mutable stores.

### 5.2 content

Expected Phase 1 subareas:

- `content/definitions/`
- `content/validation/`
- `content/registry/`

Content owns immutable definitions and cross-reference validation.

Representative definition categories:

- ItemDefinition
- ResourceDefinition
- RecipeDefinition
- StructureDefinition
- MachineDefinition
- HazardDefinition
- WeatherDefinition
- Progression/ProfessionPrototypeDefinition
- Ruin/DiscoveryDefinition

Exact fields are not defined here because they require P1-DES-002..006 and P1-TECH-002.

### 5.3 world

Expected Phase 1 subareas may include:

- `world/entities/`
- `world/fog/`
- `world/environment/`
- `world/mutations/`
- existing `world/chunks/`

World public contracts must support:

- deterministic base-content queries;
- mutable delta application;
- spatial entity identity/query;
- fog/discovery query/mutation;
- structure/machine spatial state;
- world-event/environment state used by the slice;
- validated placement/collision queries;
- chunk lifecycle/materialization with persisted deltas.

World must not import simulation transaction implementations.

### 5.4 simulation

Expected Phase 1 subareas may include:

- `simulation/api/commands/`
- `simulation/api/events/`
- `simulation/items/`
- `simulation/survival/`
- `simulation/combat/`
- `simulation/building/` for orchestration only where world mutation is involved
- `simulation/progression/`

Simulation owns command orchestration and player/gameplay aggregates.

The public API evolves from movement-only logical input toward two channels:

1. continuous player intent for movement/held actions where appropriate;
2. discrete validated domain commands for transactions/interactions.

Exact command types remain deferred.

### 5.5 persistence

Expected Phase 1 additions after P1-TECH-008:

- next schema version under `persistence/schema/`;
- migrations from V1;
- DTO mappers for new authoritative state;
- repository operations/record stores only where justified by V2 record boundaries;
- host-side save coordination for new aggregate revisions.

Concrete browser IndexedDB remains an adapter.

Shared domain modules still do not import it.

### 5.6 client

Expected Phase 1 additions:

- interaction input mapping;
- HUD/read models;
- inventory/container/crafting/building panels;
- placement preview;
- fog/environment presentation;
- co-op presence/readability;
- client transport adapter only after P1-TECH-007 if hosted implementation is activated.

Client may cache presentation state but cannot treat it as canonical.

### 5.7 future server/host

After P1-TECH-007 approval, Phase 1 may introduce a bounded server/host composition root.

Responsibilities:

- session lifecycle;
- authenticated/session-bound player identity for the test path;
- receiving logical commands/inputs;
- invoking the same authoritative simulation/world runtime;
- owning persistence coordination;
- publishing snapshots/events/deltas;
- connection/rejoin bookkeeping;
- diagnostics.

It must not duplicate gameplay rules already owned by simulation/world.

---

## 6. Authoritative ownership matrix

The table distinguishes **canonical state owner** from **mutation coordinator**. A coordinator may orchestrate changes across owners but does not duplicate their state.

| State category | Canonical owner | Mutation coordinator | Persisted? | Replicated in co-op? | Notes |
| --- | --- | --- | --- | --- | --- |
| Player movement position/facing | simulation | simulation | yes where required by save | yes | Existing Phase 0 authority retained |
| Player health | simulation | survival/combat simulation | yes | yes | Exact rules from P1-DES-003 |
| Food/water/stamina/temperature | simulation | survival simulation | yes if canonical across save/rejoin | yes | Fixed-step semantics deferred to P1-TECH-005 |
| Player equipment references/condition | simulation item/player state | item transaction/survival coordinator | yes | yes | Item definition remains content-owned |
| Player inventory/container membership | simulation item/container ledger | item transaction system | yes | yes | Never UI-owned |
| World storage container contents | simulation item/container ledger | item transaction system | yes | yes | World structure references ContainerId |
| Item instance/stack identity and condition | simulation item ledger | item transaction system | yes | yes | Creation/destruction authority defined by P1-TECH-003 |
| Resource node spatial presence/state | world | gather command coordinated by simulation | yes as delta when mutated | yes | Generated base vs delta split in P1-TECH-004 |
| Gather result transaction | no standalone owner; result spans owners | simulation | resulting state only | outcome yes | Must be atomic across resource mutation + item output |
| Craft/repair transaction | simulation-owned aggregates | simulation item transaction system | resulting state only | outcome/revisions yes | No client item creation |
| Ground dropped-item spatial entity | world | simulation transaction system | yes if canonical | yes | References simulation-owned item bundle/IDs |
| Death drop spatial entity | world | death transaction coordinator in simulation | yes | yes | Creation must be idempotent |
| Fog/explored/discovered state | world | world exploration mutation invoked by simulation | yes | yes/shared | Exact region/bitset model deferred |
| Ruin/discovery world state | world | world mutation via simulation interaction | yes if mutable/discovered | yes | Content definition separate from runtime state |
| Terrain/resource mutable delta | world | world mutation API | yes | yes | Never silently regenerated over mutation |
| Day/night canonical environment state | world | authority/world environment system | yes only if required for resume semantics | yes | Exact model deferred |
| Weather canonical state/event | world | authority/world environment system | yes when required | yes | Random scheduling must be deterministic/canonical |
| Wildlife/hostile spatial entity state | world | simulation AI/combat orchestration + world mutations | where required | yes | Exact AI model deferred |
| Player damage/death state transition | simulation | combat/death simulation | yes | yes | Client cannot decide result |
| Non-player damage/life state | world entity state | combat simulation | where required | yes | World owns entity lifecycle |
| Structure identity/placement/orientation/connectivity | world | building command coordinated by simulation | yes | yes | Placement validation uses world authority |
| Structure storage ContainerId reference | world | building system | yes | yes | Contents remain simulation ledger-owned |
| Power producer/consumer/world network state | world | building/machine simulation orchestration | yes | yes | Exact graph/state model P1-TECH-006 |
| Machine identity/placement/operational state | world | machine operation coordinator in simulation | yes | yes | Inputs/outputs transact with item ledger |
| XP/level/profession prototype state | simulation player progression | progression simulation | yes | yes to relevant clients | Rules from P1-DES-006 |
| Content definitions | content | startup validation only | source data, not mutable save state | version/hash only as needed | Immutable after validated load |
| Save schema/migration state | persistence metadata | active authority host invokes persistence | yes | host-owned, not normal gameplay replication | Persistence is non-authoritative |
| Client UI panels/selection/camera | client | client | no | no | Never canonical |
| Network transport queues/RTT | host/client transport | transport | no canonical gameplay save | no, diagnostic only | Cannot drive gameplay truth directly |
| Session membership/connection state | server/host adapter | server/host adapter | only if later ADR requires reconnect metadata | yes | Not gameplay ownership transfer |
| Canonical world/player revisions | owning aggregate/domain | authority coordinator | yes where durable | yes where conflict detection requires | Exact granularity specialized ADRs |

Ownership rule:

> A piece of state must never exist as two independently mutable canonical copies. Replicated/client copies are projections of the authority-owned state.

---

## 7. Content definition versus runtime state boundary

### 7.1 Content definition examples

Definitions answer questions like:

- what is this item/resource/recipe/structure/machine/hazard/weather/profession/ruin type?
- which stable IDs reference other definitions?
- what static parameters are approved by Game Design?
- what visual/content identifiers are associated through non-authoritative presentation mapping?

Definitions are:

- immutable after startup validation;
- stable-ID referenced;
- versioned/validated;
- load-order independent where authoritative;
- never used as mutable runtime inventory/world state.

### 7.2 Runtime state examples

Runtime state answers:

- which instance exists now?
- where is it?
- which container currently owns it?
- what is its current condition/revision?
- has this resource been harvested?
- has this fog region been revealed?
- is this structure built?
- what is this machine's current operational state?
- what is the player's current survival/progression state?

Runtime state belongs to simulation/world and is persisted/replicated according to its owner.

### 7.3 Presentation metadata

Renderer/UI-only data must either:

- remain under client/art presentation mapping; or
- be referenced by a non-authoritative visual/content key.

Sprite bounds, panel state, selection glow, camera position and interpolation are not domain authority.

---

## 8. Deterministic and non-deterministic boundaries

### 8.1 Must be deterministic at authority boundary

Given the same:

- validated content versions;
- initial canonical state;
- authoritative seed/RNG versions;
- ordered logical input/command stream;
- fixed tick sequence;

the following authoritative outcomes must be reproducible to the degree defined by specialized ADR tests:

- movement/collision;
- chunk base generation;
- resource/entity generation chosen as deterministic content;
- transaction validation/outcomes;
- crafting/repair result from canonical inputs;
- survival fixed-step transitions;
- authoritative damage/death transitions;
- building placement validation given the same world state;
- power/machine state transitions if tick-driven;
- progression state transitions;
- deterministic weather/environment transitions if the design chooses seeded scheduling.

### 8.2 Environment-dependent but non-authoritative inputs

These are allowed to vary without changing rule ownership:

- render FPS;
- browser event arrival time;
- network packet arrival time;
- persistence I/O latency;
- wall-clock timestamps used for metadata;
- client window size/DPR;
- animation timing;
- diagnostic sampling timing.

Before they can change canonical state they must be converted into authority-consumed logical commands/events.

### 8.3 Randomness policy

All authoritative randomness must use:

- project-owned RNG;
- explicit RNG algorithm version;
- explicit seed-derivation version;
- namespace/domain identifiers;
- order-independent substreams where request order must not affect results.

Any Phase 1 deterministic generator must add golden fixtures before becoming a compatibility dependency.

### 8.4 Scheduled systems

Phase 1 introduces needs, environment, machines and possible AI.

Architectural rule:

- do not use browser timers as gameplay authority;
- schedule authoritative work from simulation tick/world canonical state;
- exact update cadence may be lower than 60 Hz internally if a specialized ADR proves deterministic equivalence and defines sampling/accumulation semantics.

This avoids forcing every Phase 1 system to scan every entity every 60 Hz tick.

---

## 9. Command, event and query contracts

This section defines patterns, not final gameplay command names.

### 9.1 Command contract

A canonical mutation request should conceptually include:

- command/operation identity where retries are possible;
- actor/player identity;
- target aggregate/entity identity;
- expected revision/preconditions where concurrency matters;
- immutable payload containing player intent;
- no client-provided authoritative result.

Examples of intent families:

- transfer/split/merge/pickup/drop item;
- gather resource;
- craft/repair;
- place/remove/use structure;
- operate machine;
- interact with ruin;
- recover death drop.

Client commands must not say:

- “set inventory to X”;
- “set building state to valid”;
- “apply 25 damage” unless damage amount itself is an approved trusted authority-generated event;
- “teleport final position to Y”;
- “mark this chunk discovered” without authority validation.

### 9.2 Internal authority events

Authority systems may emit immutable outcome events for:

- replication;
- UI feedback;
- diagnostics;
- downstream system reactions.

Events record what the authority decided, not what the client requested.

Representative categories:

- transaction committed/rejected;
- world entity changed;
- discovery revealed;
- damage/death/respawn completed;
- structure/machine state changed;
- progression changed.

Exact event storage/replay semantics are deferred. Do not build an event-sourced persistence system unless a later ADR explicitly justifies it.

### 9.3 Query/read model contract

Presentation and remote clients consume read-only views.

Read models may be interest-scoped and need not expose every authoritative field.

Examples:

- player HUD state;
- nearby world entity view;
- inventory/container view;
- placement validation preview result;
- fog/map view;
- building/machine view;
- co-op player presence.

Query objects cannot provide mutation access.

---

## 10. Identity, revision and transaction rules

### 10.1 Stable identities

Phase 1 will require stable identifiers for at least:

- content definitions;
- item instances/stacks where instance identity is required;
- containers;
- world entities;
- drops/death drops;
- structures;
- machines;
- players;
- sessions/connections at transport level;
- chunks/regions;
- progression/profession quest runtime instances where required.

Exact representation is deferred to specialized ADRs.

### 10.2 Revision rule

Any shared mutable aggregate exposed to:

- co-op concurrency;
- async persistence;
- retry;
- stale commands;
- cross-system mutation;

must have an explicit version/revision or equivalent monotonic identity.

Examples likely requiring revision handling:

- container contents;
- player item ledger;
- chunk/world delta;
- fog/discovery region;
- structure/machine aggregate;
- death drop;
- progression player state;
- save commit root.

### 10.3 Idempotency rule

Operations that can be retried or duplicated by transport must not duplicate canonical effects.

Mandatory examples:

- item creation/output;
- item transfer;
- building placement/material consumption;
- machine output;
- death drop creation;
- drop recovery;
- save/import coordination where host retries are possible.

P1-TECH-003, P1-TECH-005, P1-TECH-006 and P1-TECH-007 must each state how duplicate operation IDs are handled.

### 10.4 Cross-owner transaction rule

When one gameplay action touches simulation and world state:

1. validate all required preconditions against one authority snapshot/revision set;
2. compute intended canonical mutations;
3. commit the authoritative transition consistently;
4. publish result/event only after commit;
5. on failure, expose no partially successful gameplay outcome.

Exact rollback/copy-on-write/command-buffer technique is an implementation decision after the ADR defines aggregate boundaries.

---

## 11. Persistence extension seam

P1-TECH-008 owns Save V2 details. This architecture constrains it.

### 11.1 Canonical categories expected to become persistable

Only approved Phase 1 canonical state required by the slice, including:

- player survival state needed across reopen/rejoin;
- inventory/equipment/item condition;
- progression/profession prototype state;
- respawn/death recovery state;
- fog/shared discovery;
- world/resource deltas;
- structures;
- world containers plus references to item/container ledger state;
- machine/power state;
- death drops;
- environment/event state only where required for canonical resume behavior.

### 11.2 Must never be persisted as canonical gameplay state

- Pixi objects;
- sprites/textures;
- camera;
- UI panels;
- hover/selection;
- raw keyboard/mouse input;
- interpolation alpha;
- render frame counters;
- network socket handles;
- transport queues;
- latency measurements;
- client prediction-only state;
- test-only fixture flags.

### 11.3 Reconstruction order

The V2 ADR must define a safe reconstruction sequence.

Architecture requirement:

- validate schema/compatibility/content identity first;
- migrate in memory;
- construct world/simulation state unpublished;
- validate cross-record references;
- publish active authority only after required canonical state is coherent;
- lazily materialized chunk data must preserve Phase 0 failure isolation.

### 11.4 Generated base versus mutable delta

World save data must not serialize generated base content unnecessarily when the same base can be reconstructed from versioned deterministic identity.

Persist:

- mutations;
- removals/depletion;
- placed structures;
- discovery;
- other canonical deltas.

If a corrupted delta cannot be validated, do not silently regenerate and pretend canonical mutation never happened.

### 11.5 Host ownership

Solo local authority may invoke the repository locally.

Hosted co-op:

- active host/server is the canonical persistence coordinator;
- remote clients do not write canonical world saves;
- disconnect/rejoin cannot change ownership of the durable source of truth.

---

## 12. Hosted co-op authority and transport seam

P1-TECH-007 defines the actual protocol.

This architecture requires the following separation.

### 12.1 Client responsibilities

- raw input/UI;
- command creation from player intent;
- rendering;
- local read-model cache;
- connection state UI;
- optional future prediction only if separately approved.

### 12.2 Host/server responsibilities

- session membership;
- mapping connection/session identity to PlayerId;
- command validation/order handling;
- authoritative fixed-step runtime;
- all critical item/world/building/damage/progression mutations;
- persistence coordination;
- snapshot/event publication;
- stale/duplicate/out-of-order rejection;
- disconnect/rejoin canonical-state policy.

### 12.3 Transport responsibilities

Transport moves serialized messages.

It does not:

- decide gameplay validity;
- mutate world state;
- own items;
- own save data;
- decide damage;
- resolve conflicts.

### 12.4 Phase 1 scale target

Operational acceptance target:

- 2–4 players.

Architecture must not contain an assumption that makes future 10-player hosted sessions structurally impossible, but Phase 1 performance/QA does not need 10-player production certification.

### 12.5 Compatibility handshake

Before accepting gameplay commands, hosted sessions must eventually validate the compatibility set defined by P1-TECH-007, expected to include relevant:

- protocol version;
- save/world generation identity where relevant;
- content compatibility identity;
- deterministic algorithm versions.

Exact handshake fields are deferred.

---

## 13. Performance risk areas

P1-TECH-009 will define numbers. This plan identifies where budgets are required.

### 13.1 Simulation tick cost

Risk:

- adding needs, AI, machines, power, inventory and progression as full 60 Hz scans.

Architecture guidance:

- maintain fixed authority tick;
- use bounded active sets, scheduled systems, dirty queues or event-triggered work;
- avoid whole-world scans per tick;
- exact cadence/algorithm must preserve deterministic semantics.

### 13.2 World/chunk materialization

Risk:

- generating content, applying deltas, fog and entity materialization in one blocking browser frame.

Required instrumentation:

- generation duration;
- persisted-delta load duration;
- delta-apply duration;
- entity counts;
- materialization failures;
- active chunk counts.

### 13.3 Fog/discovery

Risk:

- repeatedly rebuilding/revealing large map masks;
- replication of full discovery state after every reveal.

Architecture expectation:

- region/chunk scoped canonical discovery;
- revisioned incremental changes;
- presentation derived from authoritative discovery view.

Exact representation deferred to P1-TECH-004.

### 13.4 Inventory/container transactions

Risk:

- repeated whole-inventory copying/scanning;
- conflict retry bugs;
- duplication during concurrent transfer.

Architecture expectation:

- bounded aggregate operations;
- revisions;
- deterministic transaction validation;
- no UI-owned optimistic canonical copy.

### 13.5 Building/connectivity/power

Risk:

- recomputing all structures/power topology on every placement/tick.

Architecture expectation:

- bounded/incremental recomputation where feasible;
- exact connectivity graph and recomputation rules deferred to P1-TECH-006.

### 13.6 Wildlife/hostile logic

Risk:

- pathfinding/decision logic scaling with all world entities.

Architecture expectation:

- world interest/active-area scoping;
- deterministic authority decisions;
- no renderer proximity as gameplay truth.

### 13.7 Persistence

Risk:

- serialization/IndexedDB stalls;
- large all-world rewrites;
- dirty state lost during asynchronous saves.

Architecture expectation:

- versioned aggregate/chunk records;
- dirty/revision tracking;
- async durable I/O outside authoritative tick execution;
- save completion cannot incorrectly clear newer dirty state.

### 13.8 Hosted replication

Risk:

- sending full world state every tick;
- duplicate/out-of-order commands;
- desync hidden until late QA.

Architecture expectation:

- interest/revision scoped updates;
- explicit command sequencing/idempotency;
- observable state/version mismatches;
- exact model deferred to P1-TECH-007.

### 13.9 Presentation/UI

Risk:

- large UI panels and fog/environment effects regressing Phase 0 responsiveness/crispness.

Presentation remains independently profiled and cannot fix performance by changing canonical simulation outcomes.

---

## 14. Observability requirements

Development observability is mandatory; production analytics infrastructure is not.

### 14.1 Authority/tick diagnostics

Required visibility:

- authoritative tick;
- steps executed per host frame;
- tick duration;
- per-system timing where P1-TECH-009 determines useful;
- backlog/suspension resets;
- active player/entity/chunk counts relevant to cost.

### 14.2 Transaction diagnostics

For rejected/failed authoritative operations record enough development context to identify:

- operation type;
- operation/command ID where used;
- actor identity;
- target aggregate identity;
- expected vs actual revision;
- rejection category;
- authoritative tick.

Do not log large/sensitive payloads unnecessarily.

### 14.3 Chunk/world diagnostics

Required:

- world/chunk coordinates;
- generation/RNG/seed-derivation/content version identity;
- lifecycle transitions;
- materialization/generation/delta-apply duration;
- corruption/migration failure;
- dirty/save revision state.

### 14.4 Persistence diagnostics

Required:

- schema version;
- world/save identity;
- expected/current commit revision;
- migration path/result;
- stale-write failures;
- transaction abort/storage failure;
- corrupt-record category;
- import/export validation result.

### 14.5 Hosted co-op diagnostics

P1-TECH-007/P1-TECH-009 must define:

- session/protocol version;
- connection/player identity;
- command sequence/operation ID;
- RTT/latency metrics;
- stale/duplicate/out-of-order rejection;
- snapshot/update revision;
- disconnect/rejoin transitions;
- desync detection evidence.

### 14.6 Determinism diagnostics

When deterministic mismatch is detected, retained evidence should identify:

- exact commit;
- content version/hash identity;
- tick;
- world seed;
- RNG/seed-derivation/generation versions;
- command/input fixture;
- relevant aggregate revisions;
- expected/actual canonical hash or fixture output.

Exact hash algorithm is deferred to P1-TECH-009.

---

## 15. Specialized ADR dependency plan

The existing Phase 1 backlog is the required technical decomposition. No duplicate ADRs are created by this document.

### P1-TECH-002 / #38 — Data-Driven Content Schema and Registry

Depends on:

- this architecture plan;
- approved P1-DES-002..006.

Must define:

- exact content schemas;
- stable IDs;
- schema/content versioning;
- reference validation;
- canonical ordering/loading;
- compatibility identity.

This is the first specialized Technical ADR and is a dependency for most subsystem ADRs.

### P1-TECH-003 / #39 — Item/Container/Gather/Craft Authority

Depends on:

- this architecture plan;
- P1-DES-002;
- P1-TECH-002.

Must refine:

- item/stack identity;
- container aggregate boundaries;
- revisions;
- atomic transfer/craft/gather/repair;
- cross-owner resource mutation;
- anti-duplication/idempotency;
- replication/persistence seams.

### P1-TECH-004 / #40 — World Content/Fog/Delta

Depends on:

- this architecture plan;
- P1-DES-005;
- P1-TECH-002.

Must refine:

- deterministic world content placement;
- entity identities;
- generated base versus delta;
- fog/discovery region representation/revision;
- environment/ruin state;
- chunk materialization/delta failure behavior.

### P1-TECH-005 / #41 — Survival/Combat/Death Authority

Depends on:

- this architecture plan;
- P1-DES-003;
- P1-TECH-002.

Must refine:

- fixed-step needs;
- authoritative damage;
- player/non-player combat state transitions;
- idempotent death/drop;
- respawn/recovery;
- XP/durability penalties;
- persistence/replication identity.

### P1-TECH-006 / #42 — Building/Power/Machine Authority

Depends on:

- this architecture plan;
- P1-DES-004;
- P1-TECH-002;
- P1-TECH-003.

Must refine:

- world structure identity;
- placement validation;
- item-consumption + placement atomicity;
- connectivity;
- power;
- machine state;
- container/machine transactions;
- concurrent placement/use.

### P1-TECH-007 / #43 — Hosted Co-op Protocol

Depends on:

- this architecture plan;
- P1-DES-001;
- P1-TECH-003..006.

Must refine:

- host/session lifecycle;
- message envelopes;
- player/session identity;
- command sequence/idempotency;
- snapshot/event/update model;
- interest scope;
- disconnect/rejoin;
- compatibility handshake;
- conflict behavior;
- latency/desync diagnostics;
- exact placement of shared protocol DTOs;
- whether/when `src/server/` is introduced.

### P1-TECH-008 / #44 — Save Schema V2

Depends on:

- P1-TECH-002..007;
- accepted P0 persistence foundation.

Must refine:

- record boundaries;
- V1 -> V2 migration;
- new canonical fields;
- cross-reference validation;
- aggregate/world revisions;
- hosted save coordination;
- export/import/backup compatibility.

### P1-TECH-009 / #45 — Performance/Observability/CI

Depends on:

- P1-TECH-002..008.

Must refine:

- numeric tick/frame/materialization/save/network budgets;
- instrumentation APIs;
- retained artifact format;
- multi-client E2E strategy;
- exact-main evidence policy;
- deterministic mismatch diagnostics.

### P1-QA-001 / #46

Consumes all approved Game Design, Art/UI and Technical ADRs.

QA does not define missing rules.

---

## 16. Dependency graph and integration order

### Wave A — current

Parallel:

- #29 P1-DES-001
- #30 P1-ART-001
- #31 P1-TECH-001

No implementation.

### Wave B1 — subsystem gameplay design

After #29:

- #32 inventory/gather/craft/repair
- #33 survival/combat/death
- #35 exploration/fog/weather/ruin

Then:

- #34 habitat/building/power/machine depends on #29 + #32
- #36 progression/profession depends on #29 + #32 + #33 + #35

### Wave B2 — technical ADRs

After this task and required Game Design:

1. #38 content schema
2. after #38, #39 + #40 + #41 may proceed in parallel when their design dependency is approved
3. #42 after #38 + #39 + P1-DES-004
4. #43 after #39..#42 + P1-DES-001
5. #44 after #38..#43
6. #45 after #38..#44

Art production specification #37 proceeds after master Art + approved gameplay subsystem specs.

QA plan #46 waits for all source specs.

### Wave C/D — implementation order

Canonical contracts first:

1. #47 content registry/content pack after #38
2. #48 world/fog/ruin/environment after #40 + #47
3. #49 inventory/container/gather/craft/repair after #39 + #47

Then:

4. #50 survival/combat/death after #41 + #47 + #49
5. #51 building/power/machine after #42 + #47 + #48 + #49
6. #52 progression after #36 + #47..#51

Persistence/network/presentation:

7. #53 save schema extension after #44 and implemented canonical contracts
8. #54 hosted co-op after #43 and canonical subsystems; #53 when required by approved reconnect/save behavior
9. #55 Phase 1 UI/presentation after #37 and stable public subsystem APIs

### Wave E/F

- #56 integrated playable vertical slice
- #57 PO-facing deployment
- #58 architecture conformance
- #59 final QA
- #60 Product Review

No Phase 2 activation before final Product Review acceptance.

---

## 17. Failure handling principles

### Invalid content

Fail validated startup/content-pack activation explicitly. Do not silently substitute authoritative definitions.

### Invalid command

Reject without partial state change. Return a stable reason suitable for UI/diagnostics.

### Stale/duplicate command

Reject or return the already-committed idempotent outcome according to the specialized ADR. Never apply the effect twice.

### Cross-owner transaction failure

Do not expose a half-completed authoritative outcome.

### Chunk/delta corruption

Fail materialization or recovery explicitly. Do not silently erase canonical mutations by regenerating clean base state.

### Save failure

Live authority remains canonical and dirty. Do not treat failed persistence as successful state loss.

### Migration failure

Do not overwrite the source durable record/bundle.

### Network disconnect

Does not transfer gameplay authority to a remote client. Rejoin semantics are defined by P1-TECH-007.

### Presentation failure

Cannot mutate or repair gameplay authority by itself.

---

## 18. Security and trust boundaries

Phase 1 hosted co-op is not a full security product, but trust boundaries are explicit.

Untrusted inputs include:

- client commands;
- client-provided entity/item IDs;
- client revisions;
- imported save files;
- persisted records;
- transport payloads.

Authority must validate:

- player/session identity;
- target identity existence;
- expected revision;
- gameplay preconditions;
- content reference validity;
- numeric finite/range invariants;
- schema/protocol version.

Remote clients cannot authoritatively:

- create items;
- set container contents;
- set damage/death result;
- place structures without validation;
- modify fog/world delta directly;
- choose final machine output;
- write canonical saves.

---

## 19. Testing implications carried into specialized ADRs

Every authoritative Phase 1 subsystem must define tests for:

- deterministic repeatability where applicable;
- golden vectors/fixtures when output becomes compatibility-sensitive;
- invalid/corrupt input;
- duplicate/stale command;
- rollback/no-partial-outcome;
- save/load round trip for canonical state;
- host/server authority versus client intent;
- render cadence independence;
- disconnect/rejoin if replicated;
- multi-client contention for shared aggregates;
- exact module boundary enforcement.

The final #46 QA matrix remains the source-to-acceptance traceability layer.

---

## 20. Explicit deferred decisions

The following are intentionally **not decided** by P1-TECH-001.

### Gameplay-owned / awaiting Game Design

- exact item categories/list;
- weight/volume/stack/condition rules;
- capacity penalties;
- gather yields/tool rules;
- recipes;
- repair economics;
- need rates/thresholds;
- hazard/combat values;
- death penalties beyond already approved direction;
- building costs/placement gameplay rules;
- power values;
- machine function;
- fog reveal radius/rules;
- weather effect values;
- XP curves;
- profession quest rules;
- exact co-op gameplay differences.

### Specialized Technical ADR decisions

- concrete content schema fields -> P1-TECH-002;
- item/stack/container ID encoding and transaction algorithm -> P1-TECH-003;
- fog representation/world delta format -> P1-TECH-004;
- needs update cadence/damage/death transaction details -> P1-TECH-005;
- connectivity/power graph/machine runtime model -> P1-TECH-006;
- transport technology/message schema/session protocol -> P1-TECH-007;
- Save V2 record layout/migration -> P1-TECH-008;
- numeric performance budgets/state-hash/evidence policy -> P1-TECH-009.

### Art/UI-owned

- HUD hierarchy;
- screen/panel layout;
- visual feedback;
- silhouettes/assets;
- fog/weather rendering;
- interaction presentation.

---

## 21. Architecture acceptance self-check

- Every Phase 1 authoritative state category has exactly one owner: **PASS**
- Presentation cannot become canonical authority: **PASS**
- Persistence remains non-authoritative: **PASS**
- Future server-host path remains viable: **PASS**
- Deterministic/non-deterministic boundaries explicit: **PASS**
- Data-driven content contracts identified: **PASS**
- Stable identity/revision/idempotency rules identified at architecture level: **PASS**
- Cross-owner transaction rule explicit: **PASS**
- Persistence-extension seam explicit: **PASS**
- Hosted-co-op seam explicit without production infrastructure: **PASS**
- Command/event/query separation explicit: **PASS**
- Integration order/dependency graph defined: **PASS**
- Browser performance risk areas identified: **PASS**
- Save/desync/chunk/tick/latency observability requirements identified: **PASS**
- Specialized ADRs and dependencies enumerated: **PASS**
- Phase 0 architecture preserved: **PASS**
- Gameplay values/rules not invented: **PASS**
- No implementation authorized by this artifact: **PASS**

---

## 22. Consequences

### Positive

- Phase 1 can add meaningful system depth without turning client/UI code into gameplay authority.
- Inventory, death, building and world mutations have a common transaction/revision direction before implementation.
- Hosted co-op reuses solo rules instead of creating a second gameplay implementation.
- Save V2 can be designed around known owners rather than serializing arbitrary runtime objects.
- subsystem implementations can proceed in parallel after their matching Design + ADR gates.
- Phase 0 deterministic and architectural protections remain useful instead of being replaced.

### Costs

- cross-owner operations require explicit orchestration rather than direct object mutation;
- shared aggregates require revisions/idempotency tests;
- hosted co-op requires clear command/read-model mapping;
- persistence schema evolution must wait until canonical aggregate contracts are stable;
- performance instrumentation must be built alongside systems rather than retrofitted at the end.

These costs are accepted because the alternative is authority drift, duplication/data-loss bugs, or a later multiplayer rewrite.

---

## 23. Implementation authorization

**NOT AUTHORIZED by P1-TECH-001.**

This plan only unblocks downstream Design/ADR dependency evaluation.

Producer should activate specialized ADRs only after their listed Game Design prerequisites are approved.

---

## 24. Handoff

**Task:** P1-TECH-001  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/technical/phase-1-vertical-slice-architecture-plan.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** verify artifact against Issue #31 acceptance criteria; mark P1-TECH-001 TECH READY/DONE if accepted; use this artifact as the architecture source for #38–#45.  
**Project Owner decision required:** NONE.
