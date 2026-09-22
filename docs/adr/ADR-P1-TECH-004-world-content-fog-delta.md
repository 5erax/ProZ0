# ADR-P1-TECH-004 — World Content, Fog, Discovery, and Persistent Delta Authority

**Task:** P1-TECH-004 / Issue #40  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-005 / #35, P1-TECH-002 / #38  
**Implementation authorization:** NONE — ADR only.

---

## 1. Context

Phase 0 established deterministic chunk coordinates, order-independent chunk generation, world-owned chunk lifecycle, and non-authoritative persistence.

Phase 1 extends that foundation with:
- readable terrain/water;
- deterministic resource nodes;
- passive wildlife role;
- one Territorial Predator encounter;
- one previous-civilization ruin;
- team-shared fog/exploration/discovery;
- day/night;
- deterministic Cold Rain event;
- mutable resource depletion/regeneration;
- persistent ruin/discovery/reward state;
- ordinary drops/death-cache/world structures from other Phase 1 systems.

The main risk is confusing **generated base content** with **canonical mutable world state**. Re-generating a chunk must never erase harvested resources, exploration, claimed ruin rewards, drops, buildings, or other approved mutations.

---

## 2. Decision summary

1. **World owns all canonical spatial/world aggregates and chunk streaming.**
2. **Each chunk materializes as deterministic GeneratedBase + validated PersistedDelta.**
3. **Generated base is reproducible and is not saved redundantly.**
4. **All gameplay mutations are recorded as explicit revisioned delta state.**
5. **Fog/exploration is shared team/world knowledge, not client camera state.**
6. **Ruin runtime state and one-time reward claim are canonical world delta.**
7. **Resource depletion/regeneration state is canonical world delta.**
8. **Day/night/weather schedule is canonical authority state derived from active simulation time; no offline progress.**
9. **Corrupt/incompatible delta fails materialization; authority does not silently fall back to clean generation.**
10. **Generated placement is order-independent and keyed by stable deterministic identity/content compatibility.**

---

## 3. Chunk authority model

Existing Phase 0 chunk identity remains:

- canonical signed-int32 ChunkCoord;
- 32 × 32 WU chunk partition;
- mathematical-floor coordinate mapping;
- stable chunk key;
- generation identity tied to world seed/version/RNG/seed derivation.

Phase 1 extends materialized chunk state:

```ts
interface Phase1ChunkRuntime {
  readonly coord: ChunkCoord;
  readonly generationIdentity: ChunkGenerationIdentity;
  readonly base: GeneratedChunkBase;
  readonly delta: MutableChunkDelta;
  readonly revision: number;
}
```

`base` is immutable for the lifetime of a compatible world generation/content identity.

`delta` is canonical mutable world state.

`revision` changes when canonical mutable chunk/world state changes.

---

## 4. Generated base versus mutable delta

### Generated base

Derived only from:
- worldSeed;
- worldGenerationVersion;
- RNG algorithm version;
- seed-derivation version;
- ContentCompatibilityIdentity;
- ChunkCoord;
- stable generator namespace/version.

Examples:
- terrain classification needed by the slice;
- water shape;
- generated resource-node spawn identities/anchors;
- passive wildlife spawn archetype slots;
- Territorial Predator encounter anchor/identity;
- ruin anchor/identity;
- other static spatial content approved by P1-TECH-002.

Generated base is not mutable authority.

### Persisted delta

Stores only changes relative to base plus created canonical world entities.

Examples:
- resource node remaining actions/depletion/regeneration state;
- ruin LOCATED/INVESTIGATED;
- Ancient Alloy Shard claim state;
- explored fog cells/regions;
- ordinary ground drops;
- Death Cache entities;
- placed structures/machines;
- other canonical mutations approved downstream.

Never persist renderer state or full generated terrain merely to reconstruct known base content.

---

## 5. Deterministic generation identity

Conceptual:

```ts
interface Phase1WorldGenerationIdentity {
  readonly worldGenerationVersion: number;
  readonly rngAlgorithmVersion: string;
  readonly seedDerivationVersion: string;
  readonly content: ContentCompatibilityIdentityV1;
  readonly phase1GeneratorVersion: number;
}
```

Any intentional change that alters generated base placement/content requires an explicit generation/content compatibility decision and golden fixture update.

Do not change generator output under the same identity.

---

## 6. Generated entity identity

Generated world entities require stable IDs independent of materialization order.

Conceptual generated ID key:

```text
worldSeed
+ generation identity
+ ChunkCoord
+ generator namespace
+ contentId
+ canonical spawn ordinal / deterministic candidate key
```

Examples:
- resource node;
- passive wildlife spawn slot;
- predator encounter anchor/entity;
- ruin.

Rules:
- ID must be identical regardless of chunk request order;
- no global sequential RNG/entity counter for generated identities;
- no renderer object identity;
- no async completion order.

Runtime-created entities (drops, death caches, structures) use authority-created stable IDs defined by their owning ADR but still live in world delta.

---

## 7. Placement determinism

For each chunk generator domain:
- derive an independent RNG substream by namespace;
- enumerate candidates in canonical order;
- use stable content IDs/canonical lists;
- resolve spatial conflicts in deterministic stable order;
- output canonical ID-sorted entity records.

Independent namespaces should separate at minimum:
- terrain;
- water;
- resource placement;
- passive wildlife placement;
- hostile encounter placement;
- ruin placement;
- weather/session scheduling where tied to world seed.

Adding unrelated generator logic must not perturb existing substreams.

---

## 8. Phase 1 bounded world content

This ADR does not define new gameplay content.

It consumes the approved P1-TECH-002 definitions for:
- six resource source types;
- passive wildlife role;
- Territorial Predator;
- Previous-Civilization Ruin;
- Cold Rain;
- Cold Exposure.

The generated region must respect P1-DES-005 content-band constraints:
- local/landing opportunities near base;
- hostile not in initial onboarding safe/local area;
- expedition content farther from landing;
- ruin in the approved ruin band and not directly under hostile Inspect point;
- retreat path must remain viable.

Exact density/coordinates are implementation/content-pack tuning under approved design and must be golden-tested once selected.

---

## 9. Resource node runtime state

Generated definition:
- stable ResourceEntityId;
- Resource ContentId;
- generated position.

Canonical mutable state:

```ts
interface ResourceNodeRuntimeState {
  readonly resourceEntityId: WorldEntityId;
  readonly revision: number;
  readonly remainingGatherActions: number | null;
  readonly depleted: boolean;
  readonly regenerationReadyTick: SimulationTick | null;
}
```

Rules:
- Potable Water Source may use unlimited actions and no depletion timer;
- finite nodes decrement only after successful authoritative gather transaction;
- when remaining actions reach 0, node becomes depleted;
- regeneration is active canonical world/simulation time;
- no offline wall-clock regeneration;
- regeneration completion restores approved action count and increments revision.

P1-TECH-003 coordinates gather item output + this world mutation atomically.

---

## 10. Active-time scheduling

All Phase 1 world timers use authoritative fixed simulation ticks or canonical world-active tick/time derived from them.

No gameplay state uses:
- Date.now;
- performance.now;
- browser background duration;
- persistence completion time.

This applies to:
- resource regeneration;
- day/night;
- Cold Rain schedule/duration;
- ruin/world interaction timers if any later approved.

Authority offline means these systems do not progress.

---

## 11. Day/night canonical model

P1-DES-005 values:
- full day = 48 active simulation minutes;
- new world starts at local-equivalent 09:00;
- daylight = 06:00–20:00;
- night = 20:00–06:00.

Represent canonical environment time as integer active simulation ticks plus an epoch/start offset, not wall-clock.

Conceptual:

```ts
interface EnvironmentClockState {
  readonly activeTick: SimulationTick;
  readonly cycleStartLocalMinute: number; // 09:00 = 540
}
```

Derived local minute:
- pure deterministic function of activeTick and approved 48-minute cycle.

Do not persist duplicated derived day/night booleans if safely reconstructible from canonical clock state.

---

## 12. Cold Rain deterministic schedule

Approved first-session design:
- onset once in active-world minute window 28–38;
- duration 6 active minutes;
- warning 60 seconds;
- shared canonical event for all players.

Technical decision:
- derive the first-session rain onset deterministically from world seed + dedicated `weather:cold-rain:first-session` seed namespace;
- map deterministic result into the inclusive approved 28–38 minute window;
- persist/canonicalize scheduled event identity/onset once world/session schedule is established.

Conceptual:

```ts
interface WeatherEventState {
  readonly weatherEventId: WorldEventId;
  readonly weatherDefinitionId: ContentId;
  readonly revision: number;
  readonly startTick: SimulationTick;
  readonly warningStartTick: SimulationTick;
  readonly endTick: SimulationTick;
}
```

No reroll on reopen/rejoin.
No client-specific weather schedule.
No offline advancement.

Exact random mapping algorithm must be golden-locked by implementation.

---

## 13. Fog/exploration canonical model

Fog knowledge is **shared world/team state**.

Current screen visibility remains presentation-only.

Canonical concept:

```ts
interface ExplorationRegionState {
  readonly regionId: ExplorationRegionId;
  readonly revision: number;
  readonly exploredCells: ReadonlyBitset;
}
```

Technical representation may discretize exploration knowledge even though player movement is continuous.

Requirements:
- reveal follows resolved authoritative player position;
- approved radius = 10 player collision-footprint widths;
- reveal is radial;
- no LOS/occlusion requirement;
- blocked movement does not reveal space not entered;
- respawn reveals only around actual respawn position;
- map knowledge persists;
- night/rain never erase explored state.

### Cell representation

Use a world-owned exploration raster/grid independent from movement/collision grid.

It is **not** a player movement grid.

P1-ENG implementation must select resolution fine enough that a 10-footprint radial reveal appears continuous/readable under Art/UI requirements.

Exact resolution is an implementation/performance parameter to be locked by tests, not gameplay tile movement.

---

## 14. Fog reveal transaction

At each authoritative reveal update:
1. derive reveal region from resolved alive-player world position;
2. calculate newly explored cells;
3. if none new, no revision change;
4. if new cells exist:
   - union into shared team/world explored set;
   - increment affected exploration-region revision;
   - emit exploration-changed event/read model update.

Multiple players revealing same cells:
- set union is idempotent;
- no duplicate world knowledge;
- per-player XP milestones remain separate under progression authority.

Hosted co-op replication may send revisioned exploration deltas rather than full bitset every tick.

---

## 15. Discovery/landmark model

Generic explored territory is separate from meaningful landmark discovery.

Conceptual world landmark state:

```ts
type RuinDiscoveryState = 'unknown' | 'located' | 'investigated';

interface RuinRuntimeState {
  readonly ruinEntityId: WorldEntityId;
  readonly ruinDefinitionId: ContentId;
  readonly revision: number;
  readonly discoveryState: RuinDiscoveryState;
  readonly physicalRewardState: 'unspawned' | 'claimable' | 'claimed';
}
```

Shared world/team discovery state is canonical.

Personal progression acknowledgment/XP is not stored here.

---

## 16. Ruin LOCATED transition

Trigger:
- living player authoritative resolved position enters approved locate radius = 6 footprint widths;
- ruin exists.

Atomic world transition:
- UNKNOWN -> LOCATED;
- create/update shared Uninvestigated Ruin marker/read model;
- increment ruin revision;
- emit one world discovery transition event.

If already LOCATED/INVESTIGATED:
- idempotent no duplicate world transition.

A player's personal "first locate" XP is a separate progression event keyed by that player and authoritative ruin event/interaction.

---

## 17. Ruin INVESTIGATED transition

Authority command:
- actor targets ruin;
- within interaction range;
- Inspect;
- authoritative ruin revision supplied/validated where needed.

If ruin not previously INVESTIGATED:
commit atomically:
1. state -> INVESTIGATED;
2. shared persistent discovery record becomes true;
3. physical reward state -> claimable;
4. ensure exactly one Ancient Alloy Shard world pickup/item authority operation is authorized;
5. increment ruin/world revisions;
6. emit world discovery event.

If another player investigates concurrently:
- first valid transition commits;
- stale/duplicate command receives already-investigated/stale outcome;
- no second Shard.

If a later player physically Inspect(s) an already investigated ruin:
- no new world reward;
- authority may emit personal acknowledgment event for P1-DES-006 progression/quest, without changing shared ruin canonical result.

---

## 18. Ancient Alloy Shard world reward seam

P1-TECH-003 owns logical item creation/transfer.
World owns spatial claimable pickup if it cannot enter investigator inventory or design requires claim interaction.

Invariant:
- one Phase 1 ruin authorizes at most one physical Shard creation.

Canonical claim state must be linked to stable ruin/event identity so retry/reconnect cannot create another Shard.

If inventory full:
- reward remains claimable in world;
- world discovery remains INVESTIGATED;
- no deletion/no duplicate reroll.

---

## 19. Passive wildlife

P1-DES-005 requires passive/neutral wildlife readability but no detailed ecology rule.

Technical boundary:
- generated passive wildlife uses stable content/entity identity and world spatial state;
- implementation may use bounded simple movement/presence behavior;
- no progression drops, ecology simulation, reproduction, persistent species systems, or gameplay damage are implied.

If passive wildlife state is ephemeral/reconstructible, specialized implementation may avoid persisting exact transient motion, provided save/reopen does not violate approved player-facing guarantees.

This must not affect canonical fog/discovery/world mutations.

---

## 20. Territorial Predator world seam

World owns:
- generated predator entity identity;
- position/spatial anchor;
- current alive/dead world entity state;
- world revision/persistence as required.

P1-TECH-005 owns:
- AI/combat state machine;
- current health/target/windup/recovery authoritative logic;
- damage/death resolution.

World generation guarantees the encounter anchor is deterministic/order-independent.
Combat system mutates predator world entity through public authority contract.

Predator death is a canonical mutation and is not silently undone by player death or chunk reload.

---

## 21. Persistent delta structure

Conceptual:

```ts
interface MutableChunkDeltaV1 {
  readonly chunkCoord: ChunkCoord;
  readonly baseGenerationFingerprint: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly revision: number;

  readonly resourceStates: readonly ResourceNodeRuntimeState[];
  readonly landmarkStates: readonly RuinRuntimeState[];
  readonly explorationFragments: readonly ExplorationRegionFragment[];
  readonly createdEntities: readonly PersistedWorldEntityRecord[];
  readonly removedGeneratedEntityIds: readonly WorldEntityId[];
}
```

Exact Save V2 serialization belongs to P1-TECH-008.

Important:
- delta validates against the generation/content identity that produced its base;
- no unknown/missing generated IDs silently ignored if they represent canonical mutations;
- records sorted canonically by stable ID.

---

## 22. Chunk materialization pipeline

Required sequence:

```text
ChunkCoord
  -> derive/validate generation identity
  -> deterministic generate base
  -> load persisted delta
  -> migrate/validate delta
  -> verify base/content compatibility
  -> apply delta in stable deterministic order
  -> validate cross-references/invariants
  -> publish ACTIVE chunk
```

No presentation/world reader sees a partially applied canonical chunk.

If no persisted delta exists:
- generated base may publish normally.

If persisted delta exists and is corrupt/incompatible:
- chunk materialization fails;
- chunk enters FAILED according to Phase 0 lifecycle;
- no clean-base fallback that discards mutation history.

---

## 23. Delta application rules

Application order must be stable.

Recommended canonical order:
1. removals/depletion state for generated entities by stable entity ID;
2. mutable state overlays by stable entity ID;
3. created world entities by stable entity ID;
4. landmark/discovery state;
5. exploration region fragments.

If dependencies require a different exact order, implementation must document and golden-test it.

Never use JSON/source/Map insertion order as gameplay truth.

---

## 24. Delta revision and dirty state

Phase 0 ChunkStore revision/dirty semantics remain.

Any committed canonical chunk/world mutation:
- increments relevant chunk/world aggregate revision;
- marks persistence state DIRTY.

Save captures immutable revision snapshot.

If newer mutation occurs while save is in flight:
- save completion for old revision must not clear newer DIRTY state.

Fog/discovery state that spans chunk/region boundaries must use an explicit owning aggregate and revision, not hidden unrevisioned global mutable data.

---

## 25. Exploration-region ownership

To avoid one giant ever-growing global revision, shared fog is partitioned into deterministic world-owned exploration regions aligned to chunk groups or chunks.

Phase 1 recommended simplest approach:
- one exploration fragment owned per ChunkCoord.

Thus:
- reveal may mutate multiple adjacent chunk exploration fragments;
- each changed fragment increments that chunk/world fog revision;
- replication can interest-scope by chunk.

Exact bitset resolution remains implementation/performance detail.

This does not turn movement into tile/grid movement.

---

## 26. World query and mutation ports

Simulation consumes public world APIs.

Conceptual:

```ts
interface Phase1WorldQuery {
  getResource(id: WorldEntityId): Readonly<ResourceNodeView> | null;
  getRuin(id: WorldEntityId): Readonly<RuinView> | null;
  getEnvironment(): Readonly<EnvironmentView>;
  getExplorationFragment(coord: ChunkCoord): Readonly<ExplorationView>;
}

interface Phase1WorldMutation {
  commitResourceGather(...): WorldMutationResult;
  revealExploration(...): WorldMutationResult;
  locateRuin(...): WorldMutationResult;
  investigateRuin(...): WorldMutationResult;
}
```

Exact methods may be narrower; public contract must not expose arbitrary mutable entity references.

---

## 27. Persistence seam

P1-TECH-008 must persist:
- generated-base compatibility identity;
- chunk/world delta revision;
- resource mutable state;
- exploration/fog state;
- ruin discovery/reward claim state;
- runtime-created persistent entities;
- environment canonical schedule/clock if not safely reconstructible solely from other canonical root state.

Persistence remains I/O only.

World live delta/revision remains authority.

---

## 28. Replication seam

Hosted host/server replicates:
- chunk/entity stable IDs;
- relevant revisions;
- exploration changed fragments;
- ruin/discovery transitions;
- environment clock/weather event identity/state;
- resource node state;
- other world deltas in interest scope.

Remote client cannot send:
- "mark this fog explored";
- "set ruin investigated";
- "set resource remaining actions";
- "spawn ruin reward";
- authoritative day/weather state.

Clients send interaction/input intent only.

P1-TECH-007 owns wire protocol, interest model and rejoin snapshot.

---

## 29. Rejoin behavior

A rejoining client receives current authoritative:
- explored/discovered state;
- relevant chunk/world entity states;
- ruin state;
- current day/weather state;
- resource/world mutations.

It does not locally regenerate authority and overwrite host state.

A newly joining client may generate presentation/base data only under the exact compatible generation/content identity; host revisions/deltas remain canonical.

---

## 30. Failure semantics

### Corrupt persisted delta
Chunk FAILED. No silent base fallback.

### Generation/content mismatch
Explicit incompatibility/migration required.

### Missing generated entity referenced by delta
Validation failure unless an explicit version migration maps it.

### Duplicate created WorldEntityId
Validation/materialization failure.

### Stale world mutation command
Reject with stale revision; no partial mutation.

### Save failure
World remains live/dirty/canonical.

### Client disconnect during discovery
Committed host state remains. Rejoin receives it.

### Weather scheduling mismatch
Determinism/compatibility failure; do not reroll per client.

---

## 31. Determinism/golden tests

Implementation #48 must add exact tests.

Required:

1. same seed/generation/content identity/chunk -> same generated base;
2. A then B chunk generation equals B then A;
3. exact golden chunk fixture includes resource/ruin/hostile placement;
4. source content order does not change generation;
5. generated entity IDs stable;
6. resource mutation + unload/reload preserves delta;
7. corrupt delta fails, not regenerates;
8. fog reveal from same resolved movement tape -> identical explored bitset;
9. overlapping multi-player reveal union idempotent;
10. ruin concurrent Inspect creates one discovery + one Shard authority event;
11. Cold Rain schedule golden fixture stable;
12. reopen does not reroll weather;
13. active-time timers do not progress during offline wall-clock gap;
14. predator dead mutation survives unload/reload where persistence scope requires.

---

## 32. Performance constraints

Architecture rules:
- chunk generation/materialization bounded per chunk;
- no whole-world scan per tick;
- fog reveal checks only affected nearby exploration fragments;
- bitset union/update incremental;
- resource regen uses scheduled/active set rather than scanning every depleted node each 60 Hz tick if implementation can preserve deterministic semantics;
- environment clock is O(1);
- delta application ID-indexed/canonicalized.

P1-TECH-009 owns numeric budgets.

---

## 33. Observability

Expose development diagnostics:
- ChunkCoord;
- generation/content fingerprint;
- generated entity counts by kind;
- generation duration;
- delta load/apply duration;
- chunk revision/dirty state;
- corrupt delta reason;
- exploration cells newly revealed + fragment revisions;
- ruin transition/revision/reward claim;
- environment active tick/local time;
- weather event ID/start/end;
- deterministic generation/golden mismatch context.

No production analytics service required.

---

## 34. File/module plan

Recommended:

```text
src/world/content/
  Phase1ChunkGenerator.ts
  GeneratedWorldEntity.ts

src/world/entities/
  WorldEntityId.ts
  ResourceNodeRuntimeState.ts
  LandmarkRuntimeState.ts

src/world/fog/
  ExplorationRegion.ts
  ExplorationMutation.ts

src/world/environment/
  EnvironmentClock.ts
  WeatherSchedule.ts

src/world/mutations/
  MutableChunkDelta.ts
  ChunkDeltaApplier.ts
```

Existing:
- `src/world/chunks/ChunkStore.ts`
- `ChunkGenerator.ts`
- `ChunkPersistencePort.ts`

must be extended, not bypassed.

---

## 35. Deferred

- exact save-record layout -> #44 P1-TECH-008;
- network wire/interest protocol -> #43 P1-TECH-007;
- combat AI/damage -> #41 P1-TECH-005;
- item/drop transaction internals -> #39 P1-TECH-003;
- building structures/machines -> #42 P1-TECH-006;
- visual fog/weather rendering -> #37/#55;
- numeric performance gates -> #45.

Not included:
- multi-biome production planet;
- advanced ecology;
- tactical LOS fog;
- offline resource/machine production;
- random raid systems.

---

## 36. Acceptance criteria self-check

- Generated base vs mutable delta ownership explicit: **PASS**
- Fog/discovery canonical identity/persistence/replication explicit: **PASS**
- Deterministic/order-independent placement explicit: **PASS**
- Corrupt delta cannot silently regenerate over mutations: **PASS**
- Chunk streaming remains world-owned: **PASS**
- Resource depletion/regeneration authority explicit: **PASS**
- Ruin/one-time reward authority explicit: **PASS**
- Day/night/weather active-time authority explicit: **PASS**
- Revision/dirty/save semantics preserve Phase 0 contract: **PASS**
- Client/presentation cannot mutate canonical world knowledge: **PASS**
- No gameplay values redefined: **PASS**
- Implementation authorized: **NO**
- Blocking open question: **NONE**

---

## 37. Consequences

Benefits:
- deterministic base remains cheap/reconstructible;
- canonical player changes survive chunk lifecycle;
- fog/co-op knowledge has one owner;
- save/network layers have revisioned stable world identities;
- generation can evolve only through explicit compatibility changes.

Costs:
- world mutations require delta/revision bookkeeping;
- materialization must validate before publication;
- corrupt delta blocks chunk rather than hiding data loss.

Accepted because silent regeneration/data loss is worse.

---

## 38. Implementation authorization

**NOT AUTHORIZED by P1-TECH-004.**

---

## 39. Handoff

**Task:** P1-TECH-004  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-004-world-content-fog-delta.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** verify DoD/AC and mark TECH READY if accepted.  
**Project Owner decision required:** NONE.
