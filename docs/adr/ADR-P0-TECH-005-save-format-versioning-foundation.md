# ADR-P0-TECH-005 — Save Format & Versioning Foundation

**Task:** P0-TECH-005  
**Source Issue:** #7  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22  
**Depends on:** ADR-P0-TECH-002, ADR-P0-TECH-004

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- Persistence is an infrastructure boundary and is not authoritative while the runtime is active.
- Single-player and future hosted co-op share the same world rules.
- The active authority host owns canonical world persistence.
- World generation is deterministic from world seed, generation version, chunk coordinate, and deterministic RNG/version rules.
- The world is practically near-infinite and chunked; chunks are generated/loaded on demand.
- Live world/chunk state is owned by the `world` domain.
- Chunk identity is canonical signed integer `(x, y)`.
- Chunk base generation is reconstructable; player/world mutations are applied over deterministic generated state.
- Dirty chunk state must not be silently discarded.
- Persistence must use versioned saves, atomic writes, migration hooks, and recoverable backup/export behavior.
- A failed save must not corrupt the whole world.
- Shared state and player-owned state are persisted separately.
- Repository product direction identifies world seed, generated chunks, terrain deltas, buildings, containers, machines, research, map discovery, ecological pressure, event history, crops, and last active time as shared persisted categories as those systems are implemented.
- Player inventory, level, skills, professions, equipment, and respawn location are player-owned persisted categories as those systems are implemented.
- Phase 0 currently implements only a subset of those systems; this ADR must not invent persistence payloads for gameplay systems that do not exist yet.

## CONSTRAINT

- Shared simulation/world modules must not import concrete browser storage APIs.
- Pixi/render/camera state is never persisted as canonical game state.
- Save format must be portable across the Phase 0 browser authority host and a future server/host storage adapter.
- Unsupported or corrupt save data must never be partially applied to a live authoritative runtime.
- Storage-engine schema version and game-save schema version are separate concepts.
- No cloud save/account infrastructure is introduced.

## ASSUMPTION

None required.

## DECISION NEEDED

None from Project Owner.

---

# ADR

## ADR ID

ADR-P0-TECH-005

## CONTEXT

Phase 0 must establish persistence before mutable world state expands.

The design has to solve two related but separate problems:

1. **portable game-save compatibility** — what domain data exists in a save and how versions migrate;
2. **durable storage** — how the active host commits those records without partial/corrupt writes.

The save format cannot be coupled to IndexedDB because future hosted authority may use a different durable store. Conversely, Phase 0 browser single-player requires a concrete storage path that can provide transactional atomicity.

## DECISION

Use **versioned JSON-compatible save records** behind a storage-neutral `SaveRepository` contract.

For the Phase 0 browser adapter, use **IndexedDB transactional storage**.

For portable backup/export, use a single UTF-8 JSON bundle containing the same logical records.

### Save identity/version constants

```ts
export const SAVE_FORMAT_ID = 'proz0-save' as const;
export const SAVE_SCHEMA_VERSION = 1 as const;
```

Every persisted domain record includes:

- `formatId: 'proz0-save'`;
- `schemaVersion: 1`;
- an explicit `recordKind`;
- canonical world/player/chunk identity;
- record revision metadata where applicable.

`schemaVersion` is the **game-save compatibility version**.

It is not:

- npm/app version;
- IndexedDB database version;
- world generation version;
- RNG algorithm version.

Those are separate metadata with separate compatibility rules.

---

# PHASE 0 SAVE MODEL

A saved world is logically composed of:

```text
WorldManifestV1
  |
  +-- PlayerRecordV1 [0..N]
  |
  +-- ChunkRecordV1  [0..N, lazy-loaded]
```

World, player, and chunk records are separate so a large world does not require loading or rewriting every chunk when one player or one chunk changes.

## WorldManifestV1

The manifest is the root record for one world.

```ts
interface WorldManifestV1 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 1;
  readonly recordKind: 'world-manifest';

  readonly worldId: string;
  readonly worldRevision: number;

  readonly worldSeed: string;
  readonly generationVersion: number;
  readonly rngAlgorithmVersion: string;

  readonly createdAtUtc: string;
  readonly lastActiveAtUtc: string;
}
```

### Ownership

Owned logically by the authoritative world/host.

### Meaning

- `worldId`: stable save/world identity.
- `worldRevision`: monotonically increasing successful save-commit revision.
- `worldSeed`: deterministic generation seed.
- `generationVersion`: exact world-generation contract required to reconstruct generated base state.
- `rngAlgorithmVersion`: identifies the deterministic RNG contract used by relevant generated/persisted results.
- `createdAtUtc` / `lastActiveAtUtc`: host metadata.

Wall-clock timestamps are **metadata only**.

They must not directly alter deterministic simulation/gameplay unless a later approved gameplay specification explicitly defines offline-time behavior.

## PlayerRecordV1

Phase 0 establishes a separate record per player.

```ts
interface PlayerRecordV1 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 1;
  readonly recordKind: 'player';

  readonly worldId: string;
  readonly playerId: string;
  readonly playerRevision: number;

  readonly position: {
    readonly x: number;
    readonly y: number;
  };

  readonly facing:
    | 'N' | 'NE' | 'E' | 'SE'
    | 'S' | 'SW' | 'W' | 'NW';
}
```

### Phase 0 persisted player state

Persist:

- authoritative player world position;
- logical facing.

Do not persist:

- Pixi sprite position/object identity;
- camera position;
- interpolation alpha;
- raw keyboard state;
- render frame state.

Player systems such as inventory, skills, professions, equipment, and respawn location remain **reserved player-owned categories**. They are added only when their gameplay systems and schemas are approved.

## ChunkRecordV1

Phase 0 defines the chunk persistence envelope even though production mutable chunk payloads are not yet implemented.

```ts
interface ChunkRecordV1 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 1;
  readonly recordKind: 'chunk';

  readonly worldId: string;
  readonly coord: {
    readonly x: number;
    readonly y: number;
  };

  readonly generationVersion: number;
  readonly chunkRevision: number;
  readonly generated: true;
}
```

### Meaning

A V1 chunk record proves that a canonical chunk identity has been generated/materialized under a specific generation version.

Deterministic base terrain/content is reconstructed from:

- world seed;
- canonical chunk coordinate;
- generation version;
- RNG/version rules.

V1 intentionally does **not** invent terrain/building/container/etc. mutation payloads before those systems exist.

When persistent chunk mutation data becomes implementation-ready, the save schema must be extended through an approved compatible schema change/migration rather than inserting undocumented arbitrary payloads into V1.

### Generated chunk behavior

An unrecorded chunk is treated as not-yet-persisted/generated for the saved world.

A recorded V1 chunk may regenerate its deterministic base from the recorded world/generation metadata.

---

# PORTABLE BACKUP / EXPORT FORMAT

Portable export is one UTF-8 JSON document:

```ts
interface PortableSaveBundleV1 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 1;
  readonly recordKind: 'portable-bundle';

  readonly world: WorldManifestV1;
  readonly players: readonly PlayerRecordV1[];
  readonly chunks: readonly ChunkRecordV1[];
}
```

Rules:

- JSON must contain only finite JSON-compatible values;
- no `undefined`, `NaN`, `Infinity`, functions, class instances, DOM/Pixi objects, Maps/Sets, binary browser handles, or cyclic references;
- array ordering in portable export must be canonical:
  - players sorted by `playerId`;
  - chunks sorted lexicographically by numeric `x`, then numeric `y`;
- object property order must not be treated as semantic game state.

The canonical ordering improves reproducible debugging/diffing; save correctness does not depend on raw JSON property byte order.

---

# STORAGE BACKEND DECISION

## Phase 0 browser

Use IndexedDB through a concrete persistence adapter.

Suggested logical stores:

```text
worlds
players
chunks
```

Suggested keys:

```text
worlds:  worldId
players: [worldId, playerId]
chunks:  [worldId, chunkX, chunkY]
```

The IndexedDB database version is storage-adapter migration metadata only and must not replace `SAVE_SCHEMA_VERSION`.

## Future server/host

A future server may use another database/file storage implementation provided it satisfies the same `SaveRepository` semantics:

- validated versioned records;
- atomic commit;
- expected-revision/stale-write protection;
- portable export/import compatibility;
- no partial application to live state.

No server database technology is selected by this ADR.

---

# ATOMIC COMMIT CONTRACT

A save operation is a **transactional commit**.

The authority host first captures immutable persistence DTO snapshots from live domain state.

Then persistence validates and commits all affected records in one storage transaction.

Conceptual request:

```ts
interface SaveCommitRequestV1 {
  readonly world: WorldManifestV1;
  readonly players: readonly PlayerRecordV1[];
  readonly chunks: readonly ChunkRecordV1[];

  readonly expectedPreviousWorldRevision: number | null;
}
```

## Commit rules

1. Caller supplies the expected previously committed `worldRevision`.
2. Persistence validates every record before opening/committing the durable transaction.
3. All records must belong to the same `worldId`.
4. New manifest revision must equal:
   - `0` for a new world; or
   - `expectedPreviousWorldRevision + 1`.
5. The adapter compares the current committed revision with the expected revision.
6. If it differs, fail with `STALE_WRITE`; do not overwrite.
7. The transaction writes changed records + new manifest.
8. Manifest is considered the commit root.
9. If any durable write fails, the transaction aborts.
10. Previous committed state remains intact.

For IndexedDB, the affected object stores must be written through one read-write transaction.

A successful API response may be returned only after the transaction's durable commit completes.

---

# CHUNK REVISION INTEGRATION

P0-TECH-004 defines live chunk `revision` / `persistedRevision` behavior.

When persisting a chunk:

- capture an immutable DTO for a specific `chunkRevision`;
- commit that record;
- notify the world domain only after durable save succeeds;
- if the live chunk revision is still equal to the saved revision, it may transition to CLEAN;
- if the live revision advanced during the write, it remains DIRTY;
- stale completion never marks a newer live revision clean.

A dirty chunk may not complete authoritative eviction until the required revision is durably committed or eviction is cancelled.

---

# LOAD CONTRACT

Loading is reconstructive and all-or-nothing at the authority publication boundary.

## Root load

1. Read `WorldManifest` by `worldId`.
2. If none exists, return `NOT_FOUND`.
3. Verify `formatId`.
4. Inspect `schemaVersion`.
5. If older than current and supported, migrate in memory step-by-step.
6. If newer than current, fail `UNSUPPORTED_NEWER_SCHEMA`.
7. Validate migrated/current manifest.
8. Verify supported `generationVersion` and `rngAlgorithmVersion`.
9. Load/validate required player record(s).
10. Construct a **new unpublished domain state**.
11. Only after required root/player state is valid may the authority host publish/swap to the loaded world.

The load process never mutates an already running live world incrementally.

## Chunk load

Chunks remain lazy-loaded.

For canonical `ChunkCoord`:

1. load optional `ChunkRecord`;
2. validate identity/version/revision;
3. generate deterministic base from manifest world seed + coord + generation version;
4. apply persisted delta/state when later schema versions define one;
5. publish chunk as ACTIVE only when materialization succeeds.

A corrupt chunk record enters the P0-TECH-004 materialization failure path. It is not silently skipped or treated as an empty/passable chunk.

---

# VALIDATION RULES

Before domain import, validate at minimum:

## Common

- exact `formatId`;
- supported integer `schemaVersion`;
- expected `recordKind`;
- non-empty IDs;
- finite numeric values;
- non-negative safe integer revisions.

## World manifest

- `worldRevision` is a non-negative safe integer;
- `worldSeed` non-empty;
- generation/RNG versions recognized;
- timestamps parse as valid ISO-8601 UTC timestamps.

## Player

- `worldId` matches manifest;
- `playerId` non-empty;
- position X/Y finite;
- facing is one of the eight approved values.

## Chunk

- `worldId` matches manifest;
- X/Y are canonical signed int32;
- generation version matches a load-compatible generation contract;
- revision is a non-negative safe integer;
- `generated === true`.

Validation failure must preserve the original persisted bytes/records for diagnosis/export where storage permits.

---

# VERSIONING & MIGRATION

## Version representation

`schemaVersion` is a monotonically increasing positive integer.

Current:

```text
SAVE_SCHEMA_VERSION = 1
```

## Migration rule

Migrations are explicit sequential pure transformations:

```ts
interface SaveMigration<TFrom, TTo> {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(input: TFrom): TTo;
}
```

Required chain:

```text
V1 -> V2 -> V3 ...
```

Do not support arbitrary skip migrations such as V1 -> V4 as a separate canonical path unless required later.

## Migration execution

- migration occurs in memory;
- source records are not overwritten during migration/load validation;
- migrated data must pass current validation before domain import;
- after successful load, an explicit subsequent save may persist current schema;
- failed migration leaves original data unchanged.

## Newer schema

If save schema is newer than the runtime understands:

- fail explicitly;
- do not guess;
- do not downgrade;
- do not partially load.

## Generation/RNG compatibility

Save-schema compatibility and deterministic generation compatibility are separate.

A save may be schema-compatible but fail to load if its recorded:

- `generationVersion`; or
- `rngAlgorithmVersion`

is unsupported.

The runtime must not silently regenerate an old world with the current algorithm.

---

# FAILURE / CORRUPTION / RECOVERY BEHAVIOR

## Save transaction failure

Result:
- transaction aborts;
- prior committed state remains canonical;
- live domain state remains authoritative/dirty;
- no chunk is marked CLEAN solely because an attempted save started.

## Quota/storage unavailable

Fail with explicit storage error.

Do not delete old saves automatically to make room.

## Validation failure on load

Return structured load failure.

Do not partially mutate/publish the world.

## Corrupt chunk

Fail that chunk's materialization and expose the error.

Do not silently regenerate and discard player modifications.

## Unsupported schema/generation version

Fail explicitly with compatibility reason.

## Backup/export

The persistence layer must expose export of a fully validated `PortableSaveBundleV1`.

Import/restore must:

1. parse;
2. migrate if supported;
3. validate the entire bundle;
4. only then commit it transactionally.

An invalid backup never overwrites a valid current world.

## Explicit deletion

Deletion is an explicit host/admin operation.

No save/load failure path may implicitly delete a world.

Exact player-facing deletion confirmation UX is outside Technical scope.

---

# TECHNICAL DESIGN SPEC

## SYSTEM

Save Format & Versioning Foundation

## ARCHITECTURE OVERVIEW

```text
Authoritative simulation/world
       |
       | export immutable DTOs
       v
Persistence facade
       |
       +--> validation
       +--> migration registry
       |
       v
SaveRepository
       |
       +--> Browser: IndexedDB adapter
       |
       +--> Future host/server adapter
```

Load:

```text
SaveRepository
   -> records
   -> schema inspect
   -> migrate
   -> validate
   -> reconstruct unpublished domain state
   -> publish authority state only on success
```

## COMPONENTS

### Save schema V1

Portable JSON-compatible DTO definitions.

### SaveValidator

Structural + semantic validation before domain import/commit.

### SaveMigrationRegistry

Explicit sequential migration lookup/execution.

### SaveRepository

Storage-neutral atomic load/commit/export/import contract.

### IndexedDbSaveRepository

Phase 0 browser implementation using transactions.

### Domain persistence mappers

Convert public world/simulation export state to DTOs and DTOs back into validated construction/import inputs.

They do not give persistence direct access to private domain internals.

## RESPONSIBILITIES

| Component | Responsibility |
|---|---|
| simulation/world | own live authoritative state |
| host | decide when save/load occurs and capture/import domain state |
| persistence schema | define durable DTO shape/version |
| migration | transform old DTO versions |
| validator | reject invalid/incompatible records |
| repository adapter | durable transactional I/O |
| client presentation | none |

## DATA MODEL

Phase 0 durable records:

- `WorldManifestV1`;
- `PlayerRecordV1`;
- `ChunkRecordV1`;
- `PortableSaveBundleV1`.

Future gameplay state receives explicit schema additions only when the owning gameplay/world system is implementation-ready.

## DATA OWNERSHIP

### World-owned persistent categories

Now in V1:
- world identity;
- world seed;
- world/generation/RNG version metadata;
- generated chunk identities/revisions;
- last active metadata.

Future, when implemented:
- terrain deltas;
- buildings;
- containers;
- machines;
- research;
- team map discovery;
- ecological pressure;
- event history;
- crops.

### Player-owned persistent categories

Now in V1:
- player identity;
- authoritative position;
- logical facing.

Future, when implemented:
- inventory;
- level;
- skills;
- professions;
- equipment;
- respawn location.

## CLIENT RESPONSIBILITY

Phase 0 browser host may initiate local save/load and provide the IndexedDB adapter.

Client presentation cannot serialize Pixi/render state into canonical saves.

## SERVER RESPONSIBILITY

Future authoritative host/server owns save scheduling and uses the same schema/repository semantics through a server storage adapter.

Remote clients never write canonical shared-world saves.

## PERSISTENCE

This specification is the persistence contract.

## NETWORKING

No network transport is defined.

Future server authority means canonical persistence stays attached to server/host authority, not remote presentation clients.

## PUBLIC INTERFACES

Conceptual:

```ts
type SaveLoadResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly code:
        | 'NOT_FOUND'
        | 'INVALID_FORMAT'
        | 'UNSUPPORTED_NEWER_SCHEMA'
        | 'UNSUPPORTED_GENERATION_VERSION'
        | 'UNSUPPORTED_RNG_VERSION'
        | 'CORRUPT_RECORD'
        | 'MIGRATION_FAILED'
        | 'STORAGE_FAILURE';
      readonly message: string;
    };

interface SaveRepository {
  loadManifest(worldId: string): Promise<SaveLoadResult<WorldManifestV1>>;
  loadPlayer(worldId: string, playerId: string): Promise<SaveLoadResult<PlayerRecordV1>>;
  loadChunk(worldId: string, coord: ChunkCoord): Promise<SaveLoadResult<ChunkRecordV1 | null>>;

  commit(request: SaveCommitRequestV1): Promise<SaveLoadResult<{ worldRevision: number }>>;

  exportWorld(worldId: string): Promise<SaveLoadResult<PortableSaveBundleV1>>;
  importWorld(bundle: unknown): Promise<SaveLoadResult<{ worldId: string }>>;
}
```

The exact error type names may be implementation-refined, but failure categories/semantics must be preserved.

## FAILURE HANDLING

Defined above; all load/import validation occurs before live publication.

## PERFORMANCE

- do not serialize every chunk on every save;
- commit only changed player/chunk records plus manifest;
- chunks remain lazy-loaded;
- portable export may scan all records for one world because it is an explicit backup operation;
- storage adapter may batch dirty records into one transaction;
- autosave cadence is not defined by this Technical Design because no Product/Game requirement specifies it.

## SECURITY / VALIDATION

Persisted/imported data is untrusted input.

Never trust save records to bypass domain invariants.

Validate:
- identity;
- versions;
- coordinates;
- finite numbers;
- revisions;
- feature-specific DTO invariants before authoritative import.

Future server imports/backups require the same validation.

No executable code is loaded from save data.

## OBSERVABILITY

Record/emit diagnostics for:

- save start/commit/failure;
- worldId/worldRevision;
- number of player/chunk records written;
- transaction duration;
- load failure code;
- migration path/version;
- unsupported generation/RNG version;
- chunk corruption/materialization failure;
- export/import result.

Do not log full sensitive/player inventory payloads by default when those systems later exist.

## TEST STRATEGY

Required tests:

### Schema/validation

1. V1 valid manifest/player/chunk passes.
2. wrong `formatId` fails.
3. unsupported newer schema fails.
4. NaN/Infinity/non-finite position fails.
5. invalid facing fails.
6. non-int32 chunk coordinate fails.
7. mismatched worldId fails.

### Atomicity

8. injected failure during multi-record save leaves previous committed state unchanged.
9. successful transaction advances `worldRevision` exactly once.
10. stale expected revision fails without overwrite.

### Load safety

11. corrupt player/root record never partially publishes a world.
12. corrupt chunk fails materialization rather than silently discarding state.
13. unsupported generation/RNG version fails explicitly.

### Migration

14. V1 -> future test migration executes sequentially and validates output.
15. failed migration preserves original record and does not publish domain state.

### Deterministic reconstruction

16. same manifest seed/version + same chunk coord record reconstructs same deterministic base under P0-TECH-003/004 equivalence rules.

### Export/import

17. export ordering is canonical.
18. export -> import -> export produces equivalent canonical domain save data.
19. invalid import cannot overwrite valid existing world.

## MIGRATION

This ADR creates schema V1 and the migration mechanism.

Any change that modifies persisted meaning or required shape must explicitly decide:

- backward-compatible optional addition under same schema, if truly safe; or
- schema-version increment + migration.

Do not repurpose a field with different semantics under the same version.

## KNOWN LIMITATIONS

Phase 0 does not define:

- autosave frequency;
- cloud synchronization;
- user accounts;
- production server database;
- save compression;
- encryption;
- binary format;
- automatic rolling backup count;
- inventory/building/machine/research/etc. record payloads before those systems exist;
- offline-progression gameplay from `lastActiveAtUtc`.

## FUTURE EXTENSION

- chunk delta payload schemas;
- player inventory/progression records;
- world research/building/machine state;
- backup history/rotation;
- compressed portable exports;
- server database adapter;
- save repair diagnostics;
- cloud/account integration if later Product scope authorizes it.

---

# FILE PLAN

No persistence implementation is created by P0-TECH-005 itself.

## CREATE

### `src/persistence/schema/SaveSchema.ts`

**Purpose:**  
Canonical save format/version constants and common record discriminators.

**Responsibility:**  
Define `SAVE_FORMAT_ID`, `SAVE_SCHEMA_VERSION`, common versioned-record contracts.

**API:**  
Save constants/types.

---

### `src/persistence/schema/v1/WorldManifestV1.ts`

**Purpose:**  
V1 shared-world root manifest schema.

**Responsibility:**  
World identity/revision/seed/generation/RNG/timestamp DTO.

---

### `src/persistence/schema/v1/PlayerRecordV1.ts`

**Purpose:**  
V1 player-owned Phase 0 durable state.

**Responsibility:**  
Player identity, authoritative position, facing.

---

### `src/persistence/schema/v1/ChunkRecordV1.ts`

**Purpose:**  
V1 generated-chunk durable envelope.

**Responsibility:**  
Canonical coord, generation version, chunk revision, generated marker.

---

### `src/persistence/schema/v1/PortableSaveBundleV1.ts`

**Purpose:**  
Portable backup/export/import DTO.

**Responsibility:**  
Aggregate one world manifest + players + chunks with canonical export ordering.

---

### `src/persistence/validation/SaveValidator.ts`

**Purpose:**  
Treat persisted/imported data as untrusted input.

**Responsibility:**  
Validate record kinds, versions, IDs, finite numbers, revisions, coordinates, facing, generation/RNG compatibility.

---

### `src/persistence/migrations/SaveMigrationRegistry.ts`

**Purpose:**  
Sequential save-version migration.

**Responsibility:**  
Resolve/apply explicit Vn -> Vn+1 transformations in memory.

---

### `src/persistence/repository/SaveRepository.ts`

**Purpose:**  
Storage-neutral durable persistence contract.

**Responsibility:**  
Load records, atomic commit, portable export/import.

**API:**  
Repository operations and structured result/error types.

---

### `src/persistence/browser/IndexedDbSaveRepository.ts`

**Purpose:**  
Phase 0 local-browser durable adapter.

**Responsibility:**  
Implement `SaveRepository` with IndexedDB transactions and stale-revision protection.

**AUTHORITY:**  
Durable I/O only; never live gameplay authority.

---

### `tests/unit/save-schema-validation.test.ts`

**Purpose:**  
Schema/validator failure fixtures.

---

### `tests/integration/save-repository-atomicity.test.ts`

**Purpose:**  
Atomic commit, stale-write, rollback and load-safety tests against a test repository/IndexedDB environment.

---

### `tests/integration/save-export-import.test.ts`

**Purpose:**  
Canonical portable bundle round-trip and invalid-import safety.

---

## MODIFY

### `src/persistence/index.ts`

**Affected section:** public persistence API.

**Required architecture change:**  
Replace/extend the current generic bootstrap `PersistenceStore<TRecord>` with explicit approved save schema/repository exports. Do not leak IndexedDB types through the portable public domain contract.

---

### `src/client/runtime/LocalAuthorityHost.ts`

**Affected section:** host composition / future save-load orchestration seam.

**Required architecture change:**  
Accept/invoke a persistence repository through composition when persistence implementation is authorized; do not place storage calls inside simulation.

---

### `src/world/index.ts`

**Affected section:** public persistence export/import contracts when chunk implementation exists.

**Required architecture change:**  
Expose immutable persistence DTO construction/import seams without exposing private mutable world internals.

---

### `src/simulation/index.ts`

**Affected section:** player persistence export/import seam after P0-ENG-002 state exists.

**Required architecture change:**  
Expose authoritative player persistence state through a deliberate public contract, not through Pixi/presentation snapshots.

---

# ACCEPTANCE CRITERIA SELF-CHECK

- Phase 0 persisted state explicit: **PASS**
- World/player ownership explicit: **PASS**
- Save format/schema explicit: **PASS**
- Save version identifiable: **PASS**
- Generation/RNG compatibility metadata explicit: **PASS**
- Load/validation contract explicit: **PASS**
- Migration extension point explicit: **PASS**
- Atomic write requirement explicit: **PASS**
- Failure/corruption behavior explicit and testable: **PASS**
- Backup/export/import recovery contract explicit: **PASS**
- Deterministic chunk reconstruction preserved: **PASS**
- Persistence remains non-authoritative infrastructure: **PASS**
- Future host/server path preserved: **PASS**
- No future gameplay payloads invented: **PASS**

# ROLE DEFINITION OF DONE SELF-CHECK

- Ownership unambiguous: **PASS**
- Authority unambiguous: **PASS**
- Persistence clear: **PASS**
- Network behavior compatibility clear: **PASS**
- Interfaces clear: **PASS**
- File/module plan clear: **PASS**
- Test strategy clear: **PASS**
- Failure/corruption modes considered: **PASS**
- Migration path clear: **PASS**
- No unnecessary cloud/account/backend scope: **PASS**
- Fits Phase 0: **PASS**

# HANDOFF

Return to Producer / Project Manager for:

1. artifact/DoD verification;
2. lifecycle update of P0-TECH-005 to TECH READY if accepted;
3. downstream persistence implementation issue planning/activation when appropriate.

No persistence implementation is authorized by this artifact.

**PROJECT OWNER ACTION: NONE**
