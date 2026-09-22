# ADR-P0-TECH-004 — Chunk Coordinate & Lifecycle Design

**Task:** P0-TECH-004  
**Source Issue:** #6  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22  
**Depends on:** ADR-P0-TECH-002, ADR-P0-TECH-003

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- ProZ0 has a practically near-infinite world generated incrementally around exploration.
- World generation must be deterministic from world seed and spatial identity.
- Player movement remains continuous and is never snapped to chunk/tile boundaries.
- Generated/mutated chunks load on demand and persistent world mutations are stored separately from deterministic base generation.
- Shared simulation/world logic is authoritative; presentation is not.
- Authoritative randomness uses versioned, namespaced deterministic seed derivation.
- Chunk generation order must not change generated results.
- Persistence is an infrastructure adapter; live chunk authority remains in the world domain.

## CONSTRAINT

- Phase 0 defines the chunk foundation, not production biome/resource/ecology generation.
- Chunk identity must be independent from Pixi, render coordinates, load order, and persistence object identity.
- Dirty chunk state must never be silently discarded.
- Exact production streaming radius/cache budget is deferred until representative profiling exists.

## ASSUMPTION

None required.

## DECISION NEEDED

None from Project Owner.

---

# ADR

## ADR ID

ADR-P0-TECH-004

## CONTEXT

The world direction requires deterministic spatial partitioning, reproducible generation, mutation persistence, and bounded active memory.

The key technical risks are:

- negative-coordinate bugs;
- generation output changing because chunks are requested in a different order;
- presentation/camera state deciding authoritative chunk lifetime;
- dirty mutations being dropped during eviction;
- persistence becoming the live owner of chunk state;
- chunk boundaries becoming a gameplay movement grid.

## DECISION

Use a **square, continuous-world chunk partition** with canonical signed integer coordinates.

### Canonical world scale

Define one simulation `WorldUnit` as the continuous spatial unit used by world/simulation coordinates.

For Phase 0 presentation integration:

- **1 WorldUnit corresponds to 32 authored internal pixels at reference zoom 1.0**;
- this is a transform/scale convention, not a movement grid;
- entity positions may use arbitrary fractional WorldUnit values.

This aligns the world scale with the approved 32 × 32 visual reference cell without imposing tile-based locomotion.

### Chunk span

A chunk spans:

- **32 WorldUnits × 32 WorldUnits**;
- equivalently 1024 × 1024 authored internal pixels at reference zoom 1.0.

The chunk span is a technical partition size only.

Gameplay entities can cross chunk boundaries continuously.

### Chunk coordinate

```text
chunkX = floor(worldX / 32)
chunkY = floor(worldY / 32)
```

Coordinates are signed 32-bit integers for Phase 0.

Local position inside a chunk:

```text
localX = worldX - chunkX * 32
localY = worldY - chunkY * 32
```

with:

```text
0 <= localX < 32
0 <= localY < 32
```

Use mathematical floor, **never truncation toward zero**, so negative world coordinates remain canonical.

Examples:

- world X = 0.0 -> chunkX = 0
- world X = 31.999 -> chunkX = 0
- world X = 32.0 -> chunkX = 1
- world X = -0.001 -> chunkX = -1
- world X = -32.0 -> chunkX = -1
- world X = -32.001 -> chunkX = -2

### Chunk identity

Authoritative identity is the coordinate pair:

```ts
interface ChunkCoord {
  readonly x: number; // canonical int32
  readonly y: number; // canonical int32
}
```

A runtime/map key may use canonical text:

`chunk:<x>:<y>`

but the text key is an implementation/storage key, not a separate identity.

For deterministic seed derivation, coordinates are encoded canonically as two signed 32-bit integers in fixed order `x, y`, with the namespace and generation version.

### Generation seed

Chunk generation seed/substream derives from:

```text
worldSeed
+ rngAlgorithmVersion
+ generationVersion
+ namespace "chunk-generation"
+ canonical chunkX
+ canonical chunkY
```

No shared sequential global RNG is consumed to decide chunk contents.

Thus:

`Generate(A), Generate(B)`

must produce the same A and B as:

`Generate(B), Generate(A)`.

### Deterministic generation entrypoint

Conceptual public/internal contract:

```ts
interface ChunkGenerationRequest {
  readonly worldSeed: WorldSeed;
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
}

interface ChunkGenerator {
  generate(request: ChunkGenerationRequest): GeneratedChunkBase;
}
```

The generator:

- is pure with respect to authoritative inputs;
- cannot read wall clock, render state, network arrival order, or Math.random;
- derives its own chunk RNG substream;
- returns deterministic base data only;
- does not apply player/world mutations itself.

Production biome/resource/ecology content is out of scope.

### Materialization order

A chunk becomes authoritative live state through this order:

1. validate canonical `ChunkCoord`;
2. request persisted chunk record/delta, if any;
3. validate/migrate persisted record through persistence boundary when applicable;
4. deterministically generate the base from world seed + coord + generation version;
5. apply validated persisted mutations/discovery state over the generated base;
6. publish the chunk as `ACTIVE`.

A chunk is not visible to authoritative gameplay queries as fully active until this materialization succeeds.

### Lifecycle state model

Primary lifecycle:

```text
UNLOADED
   |
   v
MATERIALIZING
   |
   v
ACTIVE
   |
   v
EVICTING
   |
   v
UNLOADED

MATERIALIZING -> FAILED
EVICTING      -> ACTIVE   (eviction cancelled/save failure/reference acquired)
FAILED        -> MATERIALIZING (explicit retry)
FAILED        -> UNLOADED      (explicit discard of failed transient instance)
```

#### UNLOADED
No live authoritative chunk object is resident.

Persistent record may exist.

#### MATERIALIZING
Persistence record retrieval/validation + deterministic base generation + delta application are in progress.

Gameplay may not mutate a partially materialized chunk.

#### ACTIVE
Chunk is authoritative and available for world queries/mutations.

#### EVICTING
Chunk has been selected for removal from active memory.

New authority references may cancel eviction.

Dirty state must be made durably safe before final unload.

#### FAILED
Materialization failed.

The chunk is not partially authoritative.

Failure reason is observable and retry is explicit.

### Persistence state is orthogonal

Avoid lifecycle state explosion by tracking:

```text
CLEAN
DIRTY
SAVING
```

for active chunk persistence state.

Rules:

- a successful authoritative mutation increments `revision` and marks DIRTY;
- save captures an immutable snapshot for a specific revision;
- mutations may continue while that snapshot is written;
- when save succeeds:
  - if live revision still equals saved revision -> CLEAN;
  - if live revision is newer -> remain DIRTY;
- save failure -> remain DIRTY;
- dirty chunk cannot complete eviction.

### Chunk residency / interest ownership

Presentation/camera does not authoritatively load/unload chunks.

The world/authority host owns residency based on authoritative interest requests.

Phase 0 may use local-player proximity as the first interest source, but the exact radius/prefetch/cache policy is a tuning/performance decision, not part of chunk identity.

Future server may union interest across connected players while preserving the same lifecycle.

### Mutation ownership

Only the `world` domain owns live chunk mutation.

Allowed direction:

```text
Simulation/Authority
   -> WorldMutation API
      -> authoritative chunk state
```

Forbidden:

```text
Client presentation -> direct chunk mutation
Persistence adapter  -> direct live mutation
Pixi object          -> world state
```

All mutations:

- target canonical world/chunk identity;
- validate against active authoritative state;
- change live world state only through the world mutation boundary;
- increment chunk revision when persistent state is affected.

### Persistence integration

Persistence owns durable representation/I/O; world owns live authoritative state.

Save flow:

```text
ACTIVE/DIRTY Chunk
  -> immutable ChunkPersistenceSnapshot(revision)
  -> Persistence Adapter
  -> durable commit
  -> world receives SaveCommitted(coord, revision)
```

Load flow:

```text
Persistence Adapter
  -> validated/migrated PersistedChunkRecord
  -> World materialization
  -> deterministic base generation
  -> apply persisted delta
  -> ACTIVE
```

P0-TECH-005 defines exact save schema/version/atomic-write behavior.

## ALTERNATIVES

### Tile-addressed gameplay chunks
Rejected because the art reference grid must not become a movement grid.

### Truncation-based coordinate conversion
Rejected because negative coordinates become asymmetric/non-canonical.

### One global sequential RNG
Rejected because chunk results become request-order dependent.

### Persistence object as live chunk state
Rejected because storage lifecycle and authoritative runtime lifecycle would become coupled.

### Full world kept resident
Rejected because it conflicts with near-infinite incremental generation.

## TRADE-OFFS

- 32 × 32 WorldUnit chunks create more lifecycle objects than very large chunks, but provide useful locality and bounded regeneration/persistence units.
- Mapping 1 WorldUnit to 32 internal pixels is convenient for Phase 0 scale and content authoring, while continuous fractional positions preserve non-grid movement.
- Orthogonal lifecycle + persistence state adds a small amount of state-machine complexity but avoids unsafe dirty-eviction behavior.
- Delta persistence requires deterministic generation versions to remain identifiable over save lifetime.

## CONSEQUENCES

1. P0-TECH-005 must persist chunk coordinate identity, generation-version compatibility data, and persistent mutation/discovery data required to reconstruct a chunk.
2. P0-WORLD-001 must implement negative-coordinate tests and generation-order invariance tests.
3. Presentation may create/destroy render objects as chunks enter/leave view, but renderer lifetime cannot change authoritative chunk data.
4. Chunk generation APIs live in the world domain and use deterministic seed derivation from P0-TECH-003.
5. Production streaming radius and cache budgets remain profile-driven and may change without changing chunk identity.

---

# TECHNICAL DESIGN SPEC

## SYSTEM

Chunk Coordinate & Lifecycle Foundation

## ARCHITECTURE OVERVIEW

```text
Authority interest
      |
      v
World ChunkStore
      |
      +-- UNLOADED -> MATERIALIZING
      |                    |
      |             load persisted record
      |             generate deterministic base
      |             apply persisted delta
      |                    |
      |                    v
      +----------------> ACTIVE
                           |
                     queries/mutations
                           |
                    dirty revision?
                           |
                           v
                        save port
                           |
                           v
                        EVICTING
                           |
                           v
                        UNLOADED
```

## COMPONENTS

### ChunkCoord
Canonical signed coordinate and world-position conversion.

### ChunkGenerator
Pure deterministic base generator entrypoint.

### ChunkStore
Owns active lifecycle instances and canonical lookup.

### ChunkLifecycle
State transitions and residency guards.

### ChunkMutationBoundary
Authoritative controlled mutation API.

### ChunkPersistencePort
World-facing persistence contract for loading records and committing immutable snapshots.

## RESPONSIBILITIES

- `world` owns chunk state/lifecycle.
- `simulation/authority` decides gameplay requests and authoritative interest.
- `persistence` owns durable bytes/records.
- `client/presentation` owns only render representation.

## DATA MODEL

Conceptual types:

```ts
type ChunkLifecycleState =
  | 'UNLOADED'
  | 'MATERIALIZING'
  | 'ACTIVE'
  | 'EVICTING'
  | 'FAILED';

type ChunkPersistenceState =
  | 'CLEAN'
  | 'DIRTY'
  | 'SAVING';

interface ChunkCoord {
  readonly x: number;
  readonly y: number;
}

interface ChunkRuntimeMeta {
  readonly coord: ChunkCoord;
  readonly lifecycle: ChunkLifecycleState;
  readonly persistence: ChunkPersistenceState;
  readonly revision: number;
  readonly persistedRevision: number;
}
```

Exact terrain/content payloads are downstream implementation/content scope.

## DATA OWNERSHIP

| Data | Owner |
|---|---|
| Chunk coordinate/identity | world/foundation spatial contract |
| World seed | authoritative world |
| Generation version | world/save metadata |
| Generated base | world |
| Live mutation state | world |
| Dirty/revision state | world |
| Durable record/bytes | persistence adapter |
| Render objects for chunk | client/presentation |
| Residency interest | authority/world host |
| Camera visibility | presentation only |

## CLIENT RESPONSIBILITY

- consume active world/simulation snapshot;
- create/cull render representation;
- never load/unload authoritative chunk solely because a sprite leaves camera;
- never commit chunk mutation.

## SERVER RESPONSIBILITY

Future server/host owns authoritative residency and mutation for all players, unions authoritative interests, drives persistence, and uses identical chunk identity/generation rules.

## PERSISTENCE

Persistence receives immutable snapshots/deltas plus coordinate/revision/version metadata.

Dirty chunk is not evicted until the required revision is safely committed or eviction is cancelled.

Exact encoding, atomicity, backup and migration are P0-TECH-005.

## NETWORKING

No network implementation here.

Future replication addresses chunks using canonical `ChunkCoord` and transmits authoritative mutations/state, not Pixi objects or local cache identity.

## PUBLIC INTERFACES

Conceptual:

```ts
interface ChunkSpatialIndex {
  fromWorldPosition(position: WorldPosition): ChunkCoord;
  toKey(coord: ChunkCoord): string;
}

interface ChunkGenerator {
  generate(request: ChunkGenerationRequest): GeneratedChunkBase;
}

interface ChunkStore {
  requestActive(coord: ChunkCoord): Promise<void>;
  releaseInterest(coord: ChunkCoord): void;
  query(coord: ChunkCoord): ReadonlyChunkView | undefined;
}

interface ChunkPersistencePort {
  load(coord: ChunkCoord): Promise<PersistedChunkRecord | null>;
  save(snapshot: ChunkPersistenceSnapshot): Promise<void>;
}
```

Exact DTOs are finalized with P0-TECH-005/P0-WORLD-001.

## FAILURE HANDLING

- invalid/non-int32 chunk coordinate: reject;
- materialization failure: enter FAILED, expose error, no partial ACTIVE state;
- corrupt persisted data: follow P0-TECH-005 recovery policy; never silently discard player mutations;
- generation failure: fail materialization;
- save failure: retain DIRTY state and cancel final eviction;
- interest reacquired during eviction: return to ACTIVE;
- stale save completion: acknowledge its revision but remain DIRTY if newer mutations exist.

## PERFORMANCE

- keep only bounded active/recent chunks;
- O(1)-style lookup by canonical key/map;
- generation independent by chunk enables future worker/off-thread processing;
- avoid global full-world depth/render structures;
- active/prefetch radius is configurable and profile-driven;
- do not serialize/save unchanged chunks on every simulation tick.

## SECURITY / VALIDATION

Future clients cannot choose authoritative generated output, chunk revision, or mutation result.

Validate persisted coordinate/version metadata before applying.

Mutation calls must use authority/domain validation before revision changes.

## OBSERVABILITY

Expose:
- active/materializing/failed chunk counts;
- per-chunk lifecycle state;
- generation duration;
- load/save duration;
- dirty count;
- revision/persisted revision;
- eviction cancellations;
- generation version;
- chunk coordinate near player for debugging.

## TEST STRATEGY

Required tests:

1. coordinate boundary and negative-coordinate table tests;
2. world -> chunk -> local conversion invariant;
3. canonical key round trip;
4. same seed/coord/version -> same generated base;
5. request-order independence A/B vs B/A;
6. mutation increments revision and DIRTY state;
7. stale save completion does not clear newer dirty revision;
8. save failure prevents dirty eviction;
9. materialization failure never exposes partial ACTIVE chunk;
10. render/view culling does not mutate authoritative chunk state.

## MIGRATION

Chunk identity formula and chunk span are world-format relevant.

Changing the 32 WorldUnit chunk span or coordinate convention after persistent worlds exist requires an explicit world-format migration/repartition plan; it is not a tuning-only change.

Generation algorithm changes require `generationVersion` handling.

## KNOWN LIMITATIONS

This task does not define:
- production biome generation;
- terrain/resource schemas;
- exact persistent delta schema;
- streaming radius/cache count;
- worker scheduling;
- network interest protocol;
- final load-screen/UX behavior.

## FUTURE EXTENSION

- server multi-player interest union;
- background generation workers;
- prioritized prefetch;
- LRU cache policy;
- chunk-level replication;
- delta compaction;
- multiple generation versions/migrations;
- region indexing above chunks if scale later requires it.

---

# FILE PLAN

## CREATE

`src/foundation/spatial/WorldPosition.ts`

Purpose: canonical continuous world coordinate type.

Responsibility: represent finite world X/Y without renderer dependency.

API: `WorldPosition`.

---

`src/world/chunks/ChunkCoord.ts`

Purpose: canonical chunk coordinate and conversion.

Responsibility: 32 WorldUnit span, mathematical-floor conversion, negative-coordinate correctness, canonical key/encoding.

API: `ChunkCoord`, `fromWorldPosition`, `toChunkKey`.

---

`src/world/chunks/ChunkLifecycle.ts`

Purpose: lifecycle/persistence state definitions and valid transitions.

Responsibility: guard UNLOADED/MATERIALIZING/ACTIVE/EVICTING/FAILED and CLEAN/DIRTY/SAVING transitions.

API: lifecycle state types/transition helpers inside world public boundary as needed.

---

`src/world/chunks/ChunkGenerator.ts`

Purpose: deterministic chunk-generation port.

Responsibility: generate base from seed + canonical coord + generation version using derived RNG.

API: `ChunkGenerationRequest`, `ChunkGenerator`.

---

`src/world/chunks/ChunkStore.ts`

Purpose: authoritative chunk residency/materialization owner.

Responsibility: coordinate lookup, materialization, interest refs, dirty revisions, eviction guards.

API: accessed through world public facade, not by presentation internals.

---

`src/world/chunks/ChunkPersistencePort.ts`

Purpose: world-facing storage boundary.

Responsibility: load persisted record and save immutable revision snapshot without making persistence authoritative.

API: `load(coord)`, `save(snapshot)`.

---

## MODIFY

`src/world/index.ts`

Affected section: public exports.

Required architecture change: expose only approved chunk/world construction/query contracts, not internal mutable chunk objects.

---

`src/world/api/WorldQuery.ts`

Affected section: spatial queries.

Required architecture change: queries resolve across canonical chunk coordinates while hiding chunk lifecycle internals.

---

`src/world/api/WorldMutation.ts`

Affected section: authoritative world mutations.

Required architecture change: persistent chunk mutations route through world-owned mutation/revision logic.

---

`src/foundation/random/SeedDerivation.ts`

Affected section: canonical deterministic keys.

Required architecture change: support namespaced chunk-generation derivation using generation version + canonical signed X/Y encoding.

---

# ACCEPTANCE CRITERIA SELF-CHECK

- Coordinate convention/identity unambiguous: PASS.
- Negative-coordinate behavior unambiguous: PASS.
- Chunk span/world-scale relationship explicit without gameplay grid-lock: PASS.
- Lifecycle states/transitions explicit: PASS.
- Deterministic generation entrypoint explicit: PASS.
- Request-order-independent seed derivation explicit: PASS.
- Mutation ownership explicit: PASS.
- Persistence integration/revision behavior explicit: PASS.
- Production biome/resource/ecology generation excluded: PASS.

# ROLE DEFINITION OF DONE SELF-CHECK

- Ownership unambiguous: PASS.
- Authority unambiguous: PASS.
- Persistence boundary clear: PASS.
- Network compatibility clear: PASS.
- Public interfaces clear at task scope: PASS.
- File/module plan clear: PASS.
- Failure modes considered: PASS.
- Performance risks considered: PASS.
- Test strategy clear: PASS.
- No unnecessary production system introduced: PASS.
- Phase 0 suitable: PASS.

# HANDOFF

Return to Producer / Project Manager for artifact/DoD verification and dependency-gate evaluation for P0-TECH-005.

No implementation is authorized by this artifact.

**PROJECT OWNER ACTION: NONE**
