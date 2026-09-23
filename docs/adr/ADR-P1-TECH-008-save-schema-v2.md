# ADR-P1-TECH-008 — Phase 1 Save Schema V2, Migration, and Recovery

**Task:** P1-TECH-008 / Issue #44  
**Role:** World / Network / Persistence Engineer  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER / TECHNICAL LEAD REVIEW  
**Depends on:** P1-TECH-002..007, accepted P0-TECH-005 / P0-PERSIST-001  
**Implementation authorization:** NONE — this ADR defines persistence contracts only.

---

# INFORMATION CLASSIFICATION

## CONFIRMED

- Persistence remains infrastructure and is never live gameplay authority.
- Hosted canonical saves are written only by ServerAuthorityHost.
- Remote clients never upload replacement canonical world/player state.
- Phase 0 established `SAVE_FORMAT_ID = 'proz0-save'`, schema V1, storage-neutral SaveRepository, transactional writes, reconstructive load, sequential in-memory migration, validated export/import, and corrupt-chunk fail-closed behavior.
- Phase 1 adds canonical item/container, survival/death, progression, fog/discovery, world delta, structure/power/machine, hosted-session durability, and stable content-compatibility state.
- P1-TECH-002 requires save compatibility to identify the exact validated content pack using format/schema/pack identity plus canonical fingerprint.
- Generated base content remains reproducible and is not redundantly persisted; canonical mutations are persisted as revisioned delta state.
- Resource regeneration, environment clock, Cold Rain, respawn, and machine production use authoritative active simulation time, never offline wall-clock progress.
- Shared exploration and ruin discovery are world/team state; personal XP/profession state is player-owned.
- No canonical Phase 1 mutation may be silently discarded, regenerated, repaired, or reset merely because a record is corrupt or a cross-reference is missing.

## CONSTRAINT

- Do not persist Pixi, camera, UI-open state, animation state, preview ghosts, transport queues, WebSocket state, ConnectionId, SessionId, SessionEpoch, transient replication baselines, latency samples, or client prediction state.
- Do not persist derived values that can be deterministically reconstructed from canonical state and exact compatible content/code.
- Do not add Phase 2 systems, research trees, cloud accounts, host migration, offline production, or generalized ecology.
- Schema migration and world-generation/content compatibility remain separate decisions.
- This ADR does not authorize runtime persistence implementation.

## DECISION NEEDED

None.

---

# 1. DECISION SUMMARY

Phase 1 increments the portable save schema:

```ts
export const SAVE_FORMAT_ID = 'proz0-save' as const;
export const SAVE_SCHEMA_VERSION = 2 as const;
```

V2 keeps the Phase 0 storage-neutral repository model and adds explicit durable records for the Phase 1 canonical aggregates:

1. `WorldManifestV2`
2. `PlayerRecordV2`
3. `ContainerRecordV2`
4. `ChunkRecordV2`
5. `FootholdRecordV2`
6. `StructureRecordV2`
7. `PortableSaveBundleV2`

The durable record split follows authoritative ownership rather than UI screens.

A save commit represents one coherent authority snapshot. Durable write succeeds only if all changed records and the new world manifest revision commit atomically.

V2 never persists an independently mutable copy of content definitions. Runtime state stores stable ContentIds and the world manifest stores exact content compatibility identity.

---

# 2. VERSION AND COMPATIBILITY IDENTITIES

Save schema version remains separate from:

- IndexedDB/storage adapter version;
- application build version;
- world generation version;
- RNG algorithm version;
- seed-derivation version;
- content schema version;
- content pack version;
- content canonical fingerprint;
- hosted network protocol version.

V2 world manifest stores all deterministic compatibility identity required to reconstruct the saved world:

```ts
interface SaveContentCompatibilityV2 {
  readonly formatId: 'proz0-content-pack';
  readonly schemaVersion: 1;
  readonly packId: string;
  readonly packVersion: number;
  readonly canonicalFingerprint: string;
}
```

The canonical fingerprint is the P1-TECH-002 `sha256-canonical-json-v1` result.

Save-schema compatibility does not imply generation/content compatibility. A schema-migrated save may still fail compatibility validation explicitly.

---

# 3. COMMON RECORD RULES

Every durable V2 record contains:

```ts
interface VersionedSaveRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind:
    | 'world-manifest'
    | 'player'
    | 'container'
    | 'chunk'
    | 'foothold'
    | 'structure'
    | 'portable-bundle';
}
```

General validation:

- all IDs are non-empty stable strings in the owning subsystem's approved namespace;
- all revisions are non-negative safe integers;
- all simulation ticks are non-negative safe integers;
- all coordinates/numeric gameplay state are finite;
- no NaN/Infinity/undefined/functions/classes/DOM/Pixi values;
- arrays representing sets are canonicalized by stable ID;
- semantically ordered arrays preserve approved order;
- duplicate stable IDs within one world are corruption;
- all cross-record references must resolve to the required record/type before authority publication.

---

# 4. WORLD MANIFEST V2

```ts
interface WorldManifestV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'world-manifest';

  readonly worldId: string;
  readonly worldRevision: number;
  readonly authorityTick: number;

  readonly worldSeed: string;
  readonly generationVersion: number;
  readonly rngAlgorithmVersion: string;
  readonly seedDerivationVersion: string;
  readonly contentCompatibility: SaveContentCompatibilityV2;

  readonly environment: {
    readonly activeTick: number;
    readonly cycleStartLocalMinute: number;
    readonly weatherEvents: readonly WeatherEventSaveV2[];
  };

  readonly createdAtUtc: string;
  readonly lastActiveAtUtc: string;
}
```

`authorityTick` is the coherent canonical simulation tick captured by the save snapshot. It is not wall-clock time.

`createdAtUtc` / `lastActiveAtUtc` remain operational metadata only. They do not advance resources, survival, respawn, weather, or machines while authority is offline.

### WeatherEventSaveV2

```ts
interface WeatherEventSaveV2 {
  readonly weatherEventId: string;
  readonly weatherDefinitionId: ContentId;
  readonly revision: number;
  readonly startTick: number;
  readonly warningStartTick: number;
  readonly endTick: number;
}
```

V2 does not persist duplicate derived fields such as `isNight` or `isColdRainActive`. They are reconstructed from environment tick and weather event schedule.

Cold Rain schedule is never rerolled merely because a world is reopened or a player rejoins.

---

# 5. PLAYER RECORD V2

PlayerId is durable gameplay identity. ConnectionId and session transport identity are not persisted.

```ts
interface PlayerRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'player';

  readonly worldId: string;
  readonly playerId: PlayerId;
  readonly playerRevision: number;

  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly facing: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

  readonly inventoryContainerId: ContainerId;

  readonly equipment: {
    readonly equippedWeaponStackId: ItemStackId | null;
    readonly equippedThermalWrapStackId: ItemStackId | null;
  };

  readonly survival: PlayerSurvivalSaveV2;
  readonly lifeState: PlayerLifeStateSaveV2;
  readonly progression: PlayerProgressionSaveV2;
}
```

The two equipment references are the bounded Phase 1 equipment semantics required by the approved slice. This is not a generic equipment-slot system.

Equipment references must resolve to item stacks currently owned by the player's inventory container and must reference the correct approved item definition:
- weapon -> `item:basic-spear`;
- thermal protection -> `item:thermal-wrap`.

### PlayerSurvivalSaveV2

Exact canonical continuation fields from P1-TECH-005:

```ts
interface PlayerSurvivalSaveV2 {
  readonly revision: number;

  readonly healthMilli: number;
  readonly foodMilli: number;
  readonly waterMilli: number;
  readonly staminaMilli: number;
  readonly temperatureMilli: number;

  readonly waterDrainRemainder: number;
  readonly foodDrainRemainder: number;
  readonly thermalRemainder: number;
  readonly staminaRegenRemainder: number;

  readonly lastStaminaSpendTick: number | null;
  readonly nextCriticalDehydrationDamageTick: number | null;
  readonly nextCriticalStarvationDamageTick: number | null;
  readonly nextTemperatureDamageTick: number | null;
}
```

Derived survival labels are not persisted.

### PlayerLifeStateSaveV2

```ts
type PlayerLifeStateSaveV2 =
  | {
      readonly type: 'alive';
    }
  | {
      readonly type: 'dead-pending-respawn';
      readonly deathId: DeathId;
      readonly respawnAtTick: number;
      readonly deathCause: DeathCause;
      readonly deathCacheEntityId: WorldEntityId | null;
    };
```

`DeathCause` is the stable canonical domain value defined by P1-TECH-005 implementation, not free-form diagnostic text.

DeathId is persisted so reload/rejoin cannot re-run death side effects as a new death.

### PlayerProgressionSaveV2

```ts
interface PlayerProgressionSaveV2 {
  readonly revision: number;
  readonly totalXp: number;
  readonly level: number;

  readonly completedMilestoneRuleIds: readonly string[];
  readonly repeatRuleCounts: readonly {
    readonly ruleId: string;
    readonly count: number;
  }[];

  readonly unlockedSkillIds: readonly ContentId[];

  readonly professionQuests: readonly {
    readonly questDefinitionId: ContentId;
    readonly completedObjectiveOrdinals: readonly number[];
    readonly completed: boolean;
  }[];

  readonly unlockedProfessionIds: readonly ContentId[];
}
```

Rules:

- milestone/repeat rule IDs must exist in the compatible progression content definition;
- quest objective ordinals are valid only under the exact saved content fingerprint;
- `level` must match the threshold implied by `totalXp`;
- skills/professions/quests must reference the approved Phase 1 content kinds;
- first-time milestone flags, repeat counters, completed quest objectives and profession unlocks survive death/rejoin/reopen;
- death XP loss changes XP according to P1-DES-006 but never clears milestone/skill/profession state.

No spendable skill-point currency exists in Phase 1 and therefore none is persisted.

---

# 6. CONTAINER RECORD V2

```ts
interface ContainerRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'container';

  readonly worldId: string;
  readonly containerId: ContainerId;
  readonly kind:
    | 'player-inventory'
    | 'storage-crate'
    | 'machine-output'
    | 'death-cache'
    | 'ground-drop';
  readonly revision: number;

  readonly owner: ContainerOwnerRefV2;
  readonly stacks: readonly ItemStackSaveV2[];
}
```

```ts
type ContainerOwnerRefV2 =
  | { readonly type: 'player'; readonly playerId: PlayerId }
  | { readonly type: 'structure'; readonly structureId: StructureId }
  | { readonly type: 'world-entity'; readonly entityId: WorldEntityId };
```

```ts
interface ItemStackSaveV2 {
  readonly stackId: ItemStackId;
  readonly itemDefinitionId: ContentId;
  readonly quantity: number;
  readonly condition: number | null;
}
```

Canonical stack serialization order is by ItemStackId.

Derived total weight, volume and carry state are recomputed from exact compatible content definitions and are not persisted.

Load validation checks:
- unique StackIds;
- valid item ContentIds;
- maxStack/condition rules;
- condition-bearing stack quantity = 1;
- one canonical owner for each container;
- player inventory ownership is personal;
- referenced structure/world entity exists;
- machine output and Death Cache references agree in both directions.

---

# 7. CHUNK RECORD V2 / PERSISTED WORLD DELTA

V2 extends the Phase 0 chunk envelope into the P1-TECH-004 GeneratedBase + PersistedDelta model.

```ts
interface ChunkRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'chunk';

  readonly worldId: string;
  readonly coord: {
    readonly x: number;
    readonly y: number;
  };

  readonly generationVersion: number;
  readonly baseGenerationFingerprint: string;
  readonly contentCompatibility: SaveContentCompatibilityV2;

  readonly chunkRevision: number;
  readonly generated: true;

  readonly resourceStates: readonly ResourceNodeSaveV2[];
  readonly predatorStates: readonly PredatorSaveV2[];
  readonly landmarkStates: readonly RuinSaveV2[];
  readonly exploration: ExplorationFragmentSaveV2;

  readonly createdEntities: readonly PersistentWorldEntitySaveV2[];
  readonly structureIds: readonly StructureId[];
  readonly removedGeneratedEntityIds: readonly WorldEntityId[];
}
```

`chunkRevision` is the persisted mutable-delta aggregate revision for this chunk and maps to Phase 0 ChunkStore dirty/persisted revision semantics.

### ResourceNodeSaveV2

```ts
interface ResourceNodeSaveV2 {
  readonly resourceEntityId: WorldEntityId;
  readonly revision: number;
  readonly remainingGatherActions: number | null;
  readonly depleted: boolean;
  readonly regenerationReadyTick: number | null;
}
```

Regeneration ticks are active authority ticks only.

### PredatorSaveV2

```ts
interface PredatorSaveV2 {
  readonly entityId: WorldEntityId;
  readonly revision: number;
  readonly health: number;
  readonly state:
    | 'idle'
    | 'patrol'
    | 'alert'
    | 'chase'
    | 'attack-windup'
    | 'recovery'
    | 'return'
    | 'dead';
  readonly targetPlayerId: PlayerId | null;
  readonly stateUntilTick: number | null;
  readonly encounterAnchor: {
    readonly x: number;
    readonly y: number;
  };
}
```

Transient passive-wildlife motion may remain reconstructible/ephemeral as allowed by P1-TECH-004. No ecology simulation state is invented.

### RuinSaveV2

```ts
interface RuinSaveV2 {
  readonly ruinEntityId: WorldEntityId;
  readonly ruinDefinitionId: ContentId;
  readonly revision: number;
  readonly discoveryState: 'unknown' | 'located' | 'investigated';
  readonly physicalRewardState: 'unspawned' | 'claimable' | 'claimed';
}
```

The one-time Ancient Alloy Shard result is linked to stable ruin/event/world entity identity. Load may not spawn another reward merely because the client did not observe the original response.

### ExplorationFragmentSaveV2

```ts
interface ExplorationFragmentSaveV2 {
  readonly regionId: string;
  readonly revision: number;
  readonly encoding: 'bitset-base64-v1';
  readonly exploredCellsBase64: string;
}
```

The exploration raster is world-owned knowledge and is unrelated to movement tiles. Decoded bit count/shape must match the implementation's locked exploration-region resolution for the compatible generation/runtime contract.

Night/rain never erase this state.

### PersistentWorldEntitySaveV2

V2 needs only the runtime-created spatial entities required by the Phase 1 slice:

```ts
type PersistentWorldEntitySaveV2 =
  | GroundDropSaveV2
  | DeathCacheEntitySaveV2;
```

```ts
interface GroundDropSaveV2 {
  readonly type: 'ground-drop';
  readonly entityId: WorldEntityId;
  readonly revision: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly containerId: ContainerId;
}
```

```ts
interface DeathCacheEntitySaveV2 {
  readonly type: 'death-cache';
  readonly entityId: WorldEntityId;
  readonly revision: number;
  readonly deathId: DeathId;
  readonly ownerPlayerId: PlayerId;
  readonly containerId: ContainerId;
  readonly position: { readonly x: number; readonly y: number };
}
```

Structures are persisted as dedicated records because they participate in foothold, connector, power and machine aggregates.

A persisted delta that references a missing generated entity, invalid content definition, duplicate runtime entity, missing container, or incompatible base fingerprint fails materialization. It is never treated as a clean generated chunk.

---

# 8. FOOTHOLD RECORD V2

```ts
interface FootholdRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'foothold';

  readonly worldId: string;
  readonly footholdId: string;
  readonly buildRevision: number;

  readonly structureIds: readonly StructureId[];
  readonly connectionEdges: readonly {
    readonly aConnectorId: string;
    readonly bConnectorId: string;
  }[];

  readonly powerNetwork: {
    readonly revision: number;
    readonly producerStructureId: StructureId | null;
    readonly capacityPu: number;
    readonly grantedConsumerIds: readonly StructureId[];
  };
}
```

Connection edges are canonically sorted by their normalized pair of ConnectorIds.

Power grants are persisted because they are canonical authority state; load still revalidates eligibility under exact compatible structure/content state.

No generic electrical graph is introduced.

---

# 9. STRUCTURE RECORD V2

```ts
interface StructureRecordV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'structure';

  readonly worldId: string;
  readonly footholdId: string;
  readonly structureId: StructureId;
  readonly structureDefinitionId: ContentId;
  readonly revision: number;

  readonly position: { readonly x: number; readonly y: number };
  readonly orientationQuarterTurns: 0 | 1 | 2 | 3;
  readonly placedByPlayerId: PlayerId | null;

  readonly outputContainerId: ContainerId | null;
  readonly machine: CondenserSaveV2 | null;
}
```

Habitat connector/shelter behavior, Power Unit always-on behavior, Storage Crate capacity and Workbench role are reconstructed from compatible definitions + foothold/structure identity.

Do not persist duplicated derived shelter temperature target or Power Unit static capacity when those come from exact compatible content.

### CondenserSaveV2

```ts
interface CondenserSaveV2 {
  readonly enabled: boolean;
  readonly productionProgressTicks: number;
  readonly completedCycleOrdinal: number;
  readonly outputContainerId: ContainerId;
}
```

Current displayed machine state (DISABLED/UNPOWERED/RUNNING/OUTPUT FULL) is derived and is not independently persisted.

No wall-clock offline duration is stored for production.

---

# 10. PORTABLE SAVE BUNDLE V2

```ts
interface PortableSaveBundleV2 {
  readonly formatId: 'proz0-save';
  readonly schemaVersion: 2;
  readonly recordKind: 'portable-bundle';

  readonly world: WorldManifestV2;
  readonly players: readonly PlayerRecordV2[];
  readonly containers: readonly ContainerRecordV2[];
  readonly chunks: readonly ChunkRecordV2[];
  readonly footholds: readonly FootholdRecordV2[];
  readonly structures: readonly StructureRecordV2[];
}
```

Canonical export ordering:

- players by PlayerId;
- containers by ContainerId;
- chunks by (x, y);
- footholds by FootholdId;
- structures by StructureId;
- nested set-like stable-ID arrays by stable ID;
- item stacks by ItemStackId;
- weather events by WeatherEventId;
- progression rule IDs by stable rule ID;
- quest records by quest ContentId.

Export canonicalization improves deterministic debugging and comparison; correctness does not depend on raw object key byte order.

---

# 11. AUTHORITATIVE OWNER / RECONSTRUCTION PURPOSE

| Persisted data | Live authority owner | Reconstruction purpose |
|---|---|---|
| world seed/generation/RNG/seed derivation/content identity | world/host compatibility contract | regenerate exact compatible GeneratedBase |
| worldRevision/authorityTick | host/persistence snapshot boundary | durability checkpoint + stale-write CAS |
| environment activeTick/weather schedule | world | resume exact day/night/weather without offline advancement/reroll |
| player position/facing | simulation | reconstruct authoritative player spatial state |
| survival/life/death/respawn | simulation | resume exact survival/death state without replaying death side effects |
| equipment stack references | simulation/item authority | restore approved equipped Spear/Thermal Wrap semantics |
| XP/skills/professions/quest state | progression authority | prevent replay/grind loss and resume personal progression |
| containers/stacks | simulation item ledger | reconstruct exact quantities/condition/ownership/revisions |
| chunk resource/predator/ruin/fog delta | world | preserve canonical world mutations over GeneratedBase |
| ground drops/Death Caches | world + item ledger references | preserve recoverable spatial item state |
| foothold/structures/power/machine | world/build authority | reconstruct shared base and active-time machine state |

Persistence owns none of these while the runtime is active.

---

# 12. SAVE SNAPSHOT AND ATOMIC COMMIT

A save begins only from committed authority state.

Host captures immutable DTO snapshots for one coherent `authorityTick`.

Conceptual commit:

```ts
interface SaveCommitRequestV2 {
  readonly world: WorldManifestV2;
  readonly players: readonly PlayerRecordV2[];
  readonly containers: readonly ContainerRecordV2[];
  readonly chunks: readonly ChunkRecordV2[];
  readonly footholds: readonly FootholdRecordV2[];
  readonly structures: readonly StructureRecordV2[];

  readonly expectedPreviousWorldRevision: number | null;
}
```

Rules:

1. validate every supplied record and cross-reference before durable publication;
2. read current committed world manifest in the same durable transaction;
3. compare `expectedPreviousWorldRevision`;
4. new `worldRevision` must be 0 for new world or expected + 1;
5. all affected record writes/deletes + new manifest commit in one transaction;
6. any failure aborts the entire transaction;
7. previous committed revision remains canonical;
8. success is reported only after durable commit completes.

A death transaction snapshot may never contain both the pre-death player inventory and post-death Death Cache copy.

A dismantle snapshot may never contain both consumed/restored contradictory kit/structure states.

A machine cycle snapshot may never contain an output item without the corresponding completed-cycle/container revision relationship.

---

# 13. SUBSYSTEM REVISIONS AND STALE SAVE COMPLETION

Live systems retain their approved revisions:

- PlayerRecord playerRevision / survival/progression revisions;
- Container revision;
- Chunk revision;
- Resource/Ruin/Predator revisions;
- Foothold buildRevision;
- Structure revision;
- PowerNetwork revision.

These revisions detect cross-record inconsistency and support replication/conflict diagnostics.

Durable storage CAS uses the root `worldRevision`.

If gameplay continues while an immutable snapshot is being persisted:

- newer live mutations remain newer authority state;
- success for an older saved snapshot advances only its durable worldRevision/checkpoint;
- older save completion must not mark newer chunk/container/structure/player state clean;
- each owning subsystem compares the saved revision with its current live revision before clearing DIRTY state.

No stale save completion may overwrite a newer durable worldRevision.

---

# 14. HOSTED DURABILITY CHECKPOINT

After successful Save V2 commit, ServerAuthorityHost may publish the P1-TECH-007 checkpoint:

```ts
interface DurabilityCheckpointV1 {
  readonly authorityTick: number;
  readonly durableSaveRevision: number;
}
```

Mapping:

- `authorityTick` = committed `WorldManifestV2.authorityTick`;
- `durableSaveRevision` = committed `WorldManifestV2.worldRevision`.

A successful gameplay CommandResult is not itself a durability guarantee.

SessionId, SessionEpoch, ConnectionId, message sequence numbers, replication baselines and transient OperationId result-cache entries are not save records.

Stable subsystem identities such as StructureId, DeathId, WorldEntityId and completed machine-cycle ordinal remain persisted where their owning records require cross-session duplication protection.

---

# 15. RECONSTRUCTIVE LOAD ORDER

Load remains all-or-nothing at authority publication.

Required sequence:

1. read root manifest and inspect save schema;
2. migrate all records in memory sequentially to V2;
3. validate save format/schema;
4. validate generation/RNG/seed-derivation/content compatibility;
5. validate and reconstruct item containers/stack ledger unpublished;
6. validate/reconstruct chunk generated-base compatibility and mutable world deltas unpublished;
7. reconstruct structures/footholds/power/machine state unpublished;
8. validate container/structure/world-entity cross-references;
9. reconstruct player inventory ownership/equipment/survival/life/death state unpublished;
10. reconstruct progression state and validate against exact content rules;
11. reconstruct environment clock/weather state;
12. validate global invariants;
13. only then publish/swap the authority world.

Examples of global invariants:

- no item stack exists in two containers;
- each player's inventoryContainerId resolves to exactly one player-inventory container owned by that PlayerId;
- equipment StackIds resolve inside that player's inventory;
- Death Cache world entity and death-cache container reference each other coherently;
- active dead player DeathId/cache reference is coherent;
- Structure outputContainerId resolves to the right machine-output container;
- Foothold structure IDs all resolve and obey approved caps;
- Chunk structureIds resolve to spatially owned structures;
- ruin reward state cannot imply duplicate Shard creation;
- content IDs match the saved exact content compatibility identity.

No partial authority state is published on failure.

---

# 16. V1 -> V2 MIGRATION

Migration remains explicit, sequential and pure:

```text
V1 -> V2
```

There is no alternate skip migration path.

The source V1 records are not overwritten during migration/load validation.

## 16.1 WorldManifestV1 -> WorldManifestV2

Copy unchanged:

- formatId;
- worldId;
- worldRevision;
- worldSeed;
- generationVersion;
- rngAlgorithmVersion;
- seedDerivationVersion;
- createdAtUtc;
- lastActiveAtUtc.

Set:

- schemaVersion = 2;
- authorityTick = 0 because Phase 0 did not persist canonical environment/simulation clock;
- contentCompatibility = the exact validated Phase 1 content compatibility identity provided by the migrating runtime;
- environment.activeTick = 0;
- environment.cycleStartLocalMinute = 540 (approved new-world 09:00);
- environment.weatherEvents = [].

This does not claim that the V1 world-generation version is compatible with the Phase 1 generator.

After schema migration, normal generation/content compatibility validation still runs. If the recorded generation version is unsupported, load fails explicitly and the original V1 save remains unchanged.

A separate world-generation upgrade is not silently performed by Save V2 migration.

## 16.2 PlayerRecordV1 -> PlayerRecordV2

Copy:

- worldId;
- playerId;
- playerRevision;
- position;
- facing.

Create one deterministic migration-owned empty player inventory ContainerId using the implementation's collision-safe replay-testable migration namespace.

Create empty `ContainerRecordV2(kind='player-inventory')`.

Initialize only state that did not exist in Phase 0:

- Health = 100;
- Water = 80;
- Food = 70;
- Stamina = 100;
- Temperature = 50;
- deterministic rate remainders = 0;
- pending periodic damage ticks = null;
- last stamina spend tick = null;
- lifeState = alive;
- no equipped weapon;
- no equipped Thermal Wrap;
- totalXp = 0;
- level = 1;
- no milestone flags;
- repeat counters = 0/absent;
- no unlocked prototype skills;
- no profession quest progress;
- no unlocked professions.

These are the approved Phase 1 new-session defaults, not invented recovery bonuses.

## 16.3 ChunkRecordV1 -> ChunkRecordV2

V1 had no terrain/resource/fog/building/container mutation payload.

Migration copies:

- worldId;
- coord;
- generationVersion;
- chunkRevision;
- generated marker.

It adds:

- contentCompatibility from the migrating runtime;
- baseGenerationFingerprint only after the recorded generator can reproduce and validate the exact base;
- empty resource/predator/landmark/exploration/runtime-created mutation sets only when the source V1 record has no Phase 1 canonical mutation by construction.

If base generation fingerprint cannot be established under the recorded generation contract, migration/load fails explicitly.

Migration does not reinterpret a V1 chunk as a new clean Phase 1 generated chunk under a different generation version.

## 16.4 New V2-only record arrays

V1 contains no containers, footholds or structures.

Only the deterministic empty player-inventory containers created during player migration are synthesized.

No Storage Crate, machine, structure, Death Cache, drop, progression reward, ruin reward, exploration bit or weather event is invented during migration.

Generated Phase 1 base entities remain the responsibility of a compatible world generator, not the save migrator.

---

# 17. CORRUPTION / INCOMPATIBILITY FAILURE TAXONOMY

Retain Phase 0 failures and add explicit Phase 1 compatibility/cross-reference categories.

At minimum:

- `NOT_FOUND`
- `INVALID_FORMAT`
- `UNSUPPORTED_NEWER_SCHEMA`
- `UNSUPPORTED_GENERATION_VERSION`
- `UNSUPPORTED_RNG_VERSION`
- `UNSUPPORTED_SEED_DERIVATION_VERSION`
- `UNSUPPORTED_CONTENT_SCHEMA`
- `UNSUPPORTED_CONTENT_PACK`
- `CONTENT_FINGERPRINT_MISMATCH`
- `CORRUPT_RECORD`
- `CROSS_REFERENCE_FAILURE`
- `MIGRATION_FAILED`
- `STORAGE_FAILURE`
- `STALE_WRITE`

Examples that fail closed:

- saved ContentId missing from compatible catalog;
- wrong-kind ContentId;
- duplicate StackId/ContainerId/StructureId/WorldEntityId;
- invalid item quantity/condition;
- player equipment references missing/non-owned stack;
- corrupt exploration encoding/shape;
- persisted mutation references missing generated entity;
- chunk base fingerprint mismatch;
- ruin claim state contradictory to persisted reward entity;
- Death Cache entity missing its container;
- structure missing required output container;
- machine output container wrong owner/type;
- foothold contains missing/duplicate structure;
- power grant references invalid/ineligible consumer;
- dead player points to wrong DeathId/cache;
- quest objective ordinal invalid for exact saved content fingerprint.

Failure preserves original persisted data for diagnosis/export when storage permits.

---

# 18. CORRUPT WORLD DELTA RULE

If a persisted chunk/world delta exists, corruption never authorizes:

- deleting it;
- treating the chunk as never persisted;
- regenerating a clean base over the mutation;
- respawning a claimed ruin reward;
- restoring depleted resources as fresh;
- restoring dead predator as alive;
- erasing explored fog;
- deleting drops/Death Caches/structures.

The owning chunk/materialization path enters explicit FAILED state until compatible migration/repair is deliberately provided.

---

# 19. EXPORT / IMPORT / BACKUP

Portable export uses `PortableSaveBundleV2`.

Export:

1. load one coherent committed durable revision;
2. migrate to current schema in memory if needed;
3. validate all records/cross-references;
4. canonicalize ordering;
5. emit UTF-8 JSON-compatible bundle.

Import:

1. parse as untrusted data;
2. inspect/migrate schema in memory;
3. validate compatibility;
4. validate every record and global cross-reference;
5. only then atomically replace the target world durable records;
6. if any step fails, the previous valid durable world remains unchanged.

Import never partially replaces players/chunks/containers/structures.

A portable backup does not include:
- session credentials;
- resume tokens;
- ConnectionIds;
- transport logs;
- renderer assets;
- local UI preferences.

No save/load/import failure implicitly deletes a world.

---

# 20. RECOVERY SEMANTICS

The previous successfully committed durable world revision is the recovery baseline.

If a save transaction fails:

- live authority remains canonical and DIRTY;
- previous durable revision remains intact;
- host reports SAVE_FAILED / STORAGE_FAILURE;
- no subsystem rolls back committed gameplay merely to match disk;
- no chunk/container/structure/player state is marked clean due to an attempted write.

Graceful hosted shutdown follows P1-TECH-007:

OPEN -> DRAINING -> SAVING -> CLOSED/FAILED.

The host must not claim SUCCESS until durable Save V2 commit completes.

Abrupt process failure may lose authority changes newer than the last durability checkpoint; on restart the host reconstructs from the last complete durable revision and starts a new SessionEpoch.

This ADR does not create a write-ahead gameplay journal or host migration mechanism.

---

# 21. STALE WRITE / MULTI-HOST SAFETY

Repository commit validates `expectedPreviousWorldRevision` inside the same durable transaction.

If current durable worldRevision differs:

- reject `STALE_WRITE`;
- write nothing;
- do not merge records opportunistically.

Only the current authority host may save the world.

Remote clients and obsolete host processes cannot overwrite newer durable state by sending replacement records.

Subsystem revisions remain additional validation/diagnostic evidence but do not replace root durable CAS.

---

# 22. OPERATIONID AND SAVE BOUNDARY

P1-TECH-007 retains OperationId -> result cache for the active SessionEpoch.

V2 does not persist an unbounded OperationId log.

Cross-session at-most-once behavior is provided only where canonical persistent identities already exist, including:

- StructureId/placement result;
- DeathId/death transition;
- machine completedCycleOrdinal + output container revision;
- ruin discovery/reward state;
- progression first-time flags/counters.

After a new SessionEpoch, clients baseline-resync and do not blindly replay unconfirmed old operations.

---

# 23. SECURITY / TRUST BOUNDARY

Persisted and imported data is untrusted input.

Validation must prevent save data from:

- impersonating another PlayerId owner;
- creating duplicate items;
- exceeding content max stack/condition;
- bypassing structure caps;
- granting nonexistent content/professions;
- creating multiple one-time ruin rewards;
- advancing offline timers;
- injecting renderer/HTML/executable objects;
- overwriting a newer durable revision.

No executable code is loaded from save records.

---

# 24. OBSERVABILITY

Persistence diagnostics should expose without dumping full sensitive inventories by default:

- worldId;
- attempted/current worldRevision;
- authorityTick;
- schema migration path;
- generation/RNG/seed/content compatibility result;
- failing record kind/stable ID;
- cross-reference failure category;
- corrupt chunk coordinate;
- save begin/commit/failure;
- export/import result;
- resulting DurabilityCheckpoint.

---

# 25. REQUIRED IMPLEMENTATION TESTS

P1 persistence implementation is not accepted without tests covering:

### Schema / validation
1. valid V2 bundle round-trip;
2. newer schema rejected;
3. wrong content fingerprint rejected;
4. invalid ContentId kind/reference rejected;
5. duplicate stable IDs rejected;
6. invalid numeric/revision/tick state rejected.

### V1 -> V2 migration
7. V1 player position/facing preserved;
8. Phase 1 new fields use exact approved defaults;
9. deterministic empty player inventory ID/container produced once;
10. V1 source records remain unchanged on migration failure;
11. generation incompatibility after schema migration fails explicitly rather than regenerating.

### Atomicity
12. multi-record save failure preserves previous complete durable revision;
13. death snapshot cannot publish duplicated inventory/cache state;
14. stale expected worldRevision writes nothing;
15. successful save advances worldRevision exactly once.

### World delta
16. explored fog survives save/reopen;
17. depleted/regenerating resource retains exact revision/ready tick;
18. ruin INVESTIGATED/reward state survives without duplicate Shard;
19. predator dead state survives;
20. corrupt persisted delta fails materialization, not clean regeneration.

### Player
21. survival rate remainders/ticks round-trip;
22. active dead-pending-respawn round-trips by canonical tick, not wall clock;
23. equipment references round-trip and validate ownership;
24. progression first-time flags/repeat counts/quest objectives/professions round-trip;
25. death XP result does not reapply on reopen.

### Building/machine
26. foothold/connectors/structure caps reconstruct;
27. power grants validate/reconstruct;
28. Condenser enabled/progress/cycle ordinal/output container round-trip;
29. offline wall-clock time does not advance Condenser.

### Export/import
30. canonical export ordering;
31. export -> import -> export equivalence;
32. invalid import cannot overwrite valid world.

### Hosted durability
33. checkpoint revision/tick matches committed world manifest;
34. command result before checkpoint is not reported as durable;
35. graceful shutdown SAVE_FAILED never reports successful persistence.

---

# 26. IMPLEMENTATION FILE PLAN

When Producer later authorizes implementation, expected additions/changes are conceptually:

```text
src/persistence/schema/v2/
  WorldManifestV2.ts
  PlayerRecordV2.ts
  ContainerRecordV2.ts
  ChunkRecordV2.ts
  FootholdRecordV2.ts
  StructureRecordV2.ts
  PortableSaveBundleV2.ts

src/persistence/migrations/
  V1ToV2Migration.ts

src/persistence/validation/
  SaveValidatorV2.ts

src/persistence/repository/
  SaveRepository.ts

src/persistence/browser/
  IndexedDbSaveRepository.ts

src/persistence/mappers/
  PlayerPersistenceMapperV2.ts
  ItemLedgerPersistenceMapperV2.ts
  WorldDeltaPersistenceMapperV2.ts
  StructurePersistenceMapperV2.ts
```

Exact implementation task may narrow names, but must preserve the contracts and ownership in this ADR.

---

# 27. DEFERRED / NON-GOALS

Not part of Save V2:

- cloud save accounts;
- server database selection beyond adapter semantics;
- save compression;
- encrypted cloud backup;
- host migration;
- offline progression;
- full research tree;
- ecology simulation;
- arbitrary equipment slot framework;
- generalized electrical networks;
- Phase 2+ content;
- permanent OperationId journal;
- client-authoritative save upload.

---

# 28. ACCEPTANCE CRITERIA SELF-CHECK

- Every new persisted field has authoritative owner/reconstruction purpose: **PASS**
- Inventory/equipment/progression/respawn state explicit: **PASS**
- Fog/shared discovery and world delta explicit: **PASS**
- Structures/containers/machine/power explicit: **PASS**
- Death Cache/drop state explicit: **PASS**
- Canonical environment/weather state explicit: **PASS**
- Save schema V2 and V1->V2 migration explicit: **PASS**
- Migration does not silently perform generation upgrade: **PASS**
- Corruption cannot silently destroy/regenerate canonical Phase 1 mutation: **PASS**
- Export/import validated and atomic: **PASS**
- Hosted persistence ownership/checkpoint coordination explicit: **PASS**
- Stale-write/revision behavior explicit: **PASS**
- Presentation/transient network state excluded: **PASS**
- ADR persisted: **PASS**

---

# 29. CONSEQUENCES

Benefits:

- one coherent save contract for the whole Phase 1 vertical slice;
- deterministic/generated state remains separate from canonical mutations;
- item/death/build/machine cross-owner operations can be durably represented without duplication;
- hosted co-op durability has one root revision/tick checkpoint;
- content drift is detectable;
- migration/recovery remain explicit and fail-closed.

Costs:

- more record kinds and cross-reference validation;
- load is reconstructive and cannot cheaply accept partial/corrupt state;
- save commits require coherent multi-record transaction semantics;
- exact content compatibility becomes a durable dependency;
- migration implementation must distinguish schema conversion from generation upgrade.

These costs are required to prevent silent data loss and authority divergence.

---

# 30. IMPLEMENTATION AUTHORIZATION

**NOT AUTHORIZED by this ADR.**

This task produces the technical contract only.

Any implementation must be activated by Producer under its own Issue/task and must pass Technical Lead review and required QA lifecycle.

---

# 31. HANDOFF

**Artifact:** `docs/adr/ADR-P1-TECH-008-save-schema-v2.md`  
**From:** World / Network / Persistence Engineer  
**To:** Producer / Project Manager  
**Required next review:** Technical Lead / Game Architect  
**Project Owner decision required:** NONE
