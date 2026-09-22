# ADR-P1-TECH-006 — Building, Power, and First Machine Authority

**Task:** P1-TECH-006 / Issue #42  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-004 / #34, P1-TECH-002 / #38, P1-TECH-003 / #39  
**Cross-contracts:** P1-TECH-004 / #40 world/delta authority where already approved; Phase 0 movement/collision/world boundaries  
**Implementation authorization:** NONE — ADR only.

---

## 1. Context

Phase 1 introduces the first authoritative building loop:

- player carries an approved Construction Kit;
- selects a matching structure;
- previews continuous-world placement;
- confirms against current world state;
- exactly one Kit is consumed iff exactly one structure is created;
- structures become shared persistent world state;
- Habitat proves modular connection + shelter;
- Storage Crate and Workbench expose shared/use interactions;
- Compact Power Unit provides bounded power;
- Atmospheric Water Condenser consumes power and produces Clean Water over active powered authority time;
- structures can be dismantled with exact one-Kit recovery when preconditions pass.

The main technical risks are:

- consuming a Kit before placement validation finishes;
- duplicate structures during retry or co-op race;
- two players placing into the same location;
- deriving gameplay collision/placement from sprite bounds;
- power allocation changing nondeterministically across reconnect/load;
- machine progress advancing from wall clock or while authority is offline;
- duplicate Clean Water creation after retry/save/reload;
- dismantle deleting storage/machine output or creating a Kit without removing the structure.

This ADR defines one bounded authority model for Phase 1 without introducing a general colony automation framework.

---

## 2. Decision summary

1. **World owns canonical structure, connector, placement, foothold, power-network, and machine-spatial state.**
2. **Simulation coordinates player commands and cross-owner transactions.**
3. **P1-TECH-003 item ledger owns Construction Kits and machine-output item contents.**
4. **Placement/dismantle are idempotent atomic authority operations keyed by OperationId.**
5. **One Phase 1 foothold aggregate revision serializes competing build/connectivity/power mutations.**
6. **Each structure has stable StructureId + monotonic revision.**
7. **Placement geometry is technical world geometry keyed by ContentId, never sprite/Pixi bounds.**
8. **Free-standing placement is continuous world-space; only Habitat connector uses connector snapping.**
9. **Compact Power Unit is a bounded 10 PU always-on producer; no fuel/cables.**
10. **Atmospheric Water Condenser is a bounded state machine using active fixed ticks only: 5 PU, 1 Clean Water / 90 powered seconds, buffer 4, no offline production, no hidden wear.**
11. **Machine output creation is idempotent by stable machine-cycle identity.**
12. **Persistence stores canonical structure/machine/power/item-output state, not derived presentation state.**
13. **Hosted clients submit intent; host/server validates and commits authoritative placement/power/machine results.**

---

## 3. Canonical ownership

| State | Canonical owner |
| --- | --- |
| Construction Kit stack/quantity | simulation item ledger |
| player inventory revision | simulation item ledger |
| structure identity/type/position/orientation | world |
| structure collision/placement occupancy | world |
| foothold build cap/count state | world |
| Habitat connector relation | world |
| Habitat shelter spatial state | world |
| Storage Crate contents | simulation item ledger/container |
| Workbench spatial/access state | world |
| Compact Power Unit placement + producer state | world |
| power grants/allocation state | world |
| Condenser enabled/progress/cycle identity | world |
| Condenser output ContainerId | world references simulation item ledger |
| Condenser Clean Water contents | simulation item ledger |
| placement preview/ghost | client presentation only |
| save bytes/IndexedDB records | persistence, never live authority |

No state above may have two independently mutable canonical copies.

---

## 4. Stable identities

### 4.1 StructureId

Every placed structure has a stable opaque `StructureId`.

Required for:
- persistence;
- replication;
- connector relationships;
- power eligibility/grants;
- Workbench/Storage interaction;
- progression milestones;
- dismantle;
- stale revision detection.

The pre-existing Landing Module also has a stable StructureId.

### 4.2 ConnectorId

Connector identity is stable within a structure instance.

Conceptual:

```ts
interface ConnectorId {
  readonly structureId: StructureId;
  readonly localConnectorKey: string;
}
```

Phase 1 requires only:
- Landing Module connector(s);
- one Habitat designated connector.

No full corridor graph framework is required.

### 4.3 FootholdId

Phase 1 uses one canonical foothold/base aggregate.

It has stable `FootholdId` and one monotonic `buildRevision`.

Purpose:
- serialize build caps;
- serialize overlapping/competing placement;
- own connector graph;
- own bounded power allocation;
- support persistence/replication as one small aggregate.

This is not a future universal colony/settlement framework.

### 4.4 OperationId

Placement, dismantle, enable/disable, and other retryable shared mutations use P1-TECH-003 `OperationId` semantics.

Same OperationId + same command:
- cannot apply twice;
- returns prior authoritative result when retained.

Same OperationId + different payload:
- reject OPERATION_ID_CONFLICT.

---

## 5. Structure runtime state

Conceptual:

```ts
interface StructureRuntimeState {
  readonly structureId: StructureId;
  readonly structureDefinitionId: ContentId;
  readonly revision: number;
  readonly position: WorldPosition;
  readonly orientationQuarterTurns: 0 | 1 | 2 | 3;
  readonly placedByPlayerId: PlayerId | null;
  readonly outputContainerId?: ContainerId;
}
```

Additional typed runtime state is held for:
- Habitat connector/shelter;
- Power Unit;
- Condenser.

Do not serialize or expose mutable renderer objects.

---

## 6. Authoritative placement geometry

Structure placement uses a world-owned `StructurePlacementProfile` keyed by structure ContentId.

Conceptual:

```ts
interface StructurePlacementProfile {
  readonly structureDefinitionId: ContentId;
  readonly blockingFootprint: AuthoritativePlacementShape;
  readonly interactionAnchor: WorldOffset;
  readonly doorClearances: readonly AuthoritativePlacementShape[];
  readonly connectorProfiles: readonly ConnectorProfile[];
}
```

Rules:
- profiles are deterministic technical/domain configuration;
- they are independent from Pixi sprite bounds;
- visual sprite may extend beyond or be smaller than gameplay footprint;
- profiles use continuous WU coordinates;
- orientation transforms are exact 0/90/180/270-degree transforms;
- no terrain-tile snapping.

Exact per-structure technical dimensions are implementation-level geometry values and must be committed as tested authoritative constants/configuration before #51 can pass review.

They may not be inferred dynamically from Art assets.

---

## 7. Placement preview versus placement authority

### Client preview

Client may locally render:
- ghost structure;
- approximate current valid/invalid state;
- blocking reason from latest host query;
- connector snap guide.

Preview is advisory.

### Confirm

Only host/local authority commit decides placement.

Client never sends:
- “placement is valid”;
- final collision truth;
- final build count;
- final Kit consumption result.

It sends intent:
- target structure ContentId;
- selected Kit stack identity;
- desired anchor/orientation or connector target;
- expected revisions;
- OperationId.

---

## 8. Placement command

Conceptual:

```ts
interface PlaceStructureCommand {
  readonly operationId: OperationId;
  readonly actorPlayerId: PlayerId;
  readonly structureDefinitionId: ContentId;
  readonly sourceKitStackId: ItemStackId;
  readonly expectedInventoryRevision: number;
  readonly footholdId: FootholdId;
  readonly expectedBuildRevision: number;
  readonly placement:
    | {
        readonly mode: 'free';
        readonly anchor: WorldPosition;
        readonly orientationQuarterTurns: 0 | 1 | 2 | 3;
      }
    | {
        readonly mode: 'connector';
        readonly targetConnectorId: ConnectorId;
        readonly requestedOrientationQuarterTurns: 0 | 1 | 2 | 3;
      };
}
```

The authority computes the final snapped Habitat transform.

Client-provided anchor/orientation is intent, not guaranteed final state.

---

## 9. Deterministic placement validation order

For one command, validate in stable order:

1. actor/session/action permission;
2. structure definition exists and is player-placeable;
3. exact source Kit exists and matches required sourceKitItemId;
4. player inventory revision matches;
5. foothold/build revision matches;
6. Phase 1 structure cap permits placement;
7. placement mode allowed for structure;
8. entire authoritative footprint is in EXPLORED territory;
9. stable/buildable terrain;
10. no water/non-buildable hazard surface;
11. no blocking terrain/prop collision;
12. no existing structure overlap;
13. no protected ruin overlap;
14. no Death Cache obstruction that would make recovery inaccessible;
15. respawn clearance remains valid;
16. required door/connector clearance remains traversable;
17. anchor remains within Phase 1 build zone;
18. connector semantics, if applicable;
19. final cross-owner transaction preconditions still valid.

First failing category yields one deterministic primary rejection reason.

No item/world mutation occurs during validation.

---

## 10. Build-zone geometry

P1-DES-004 defines structure anchor within 12 player collision-footprint widths of:
- Landing Module; or
- connected Habitat Room.

Phase 0 player collision-footprint width is 0.625 WU.

Derived Phase 1 technical radius:
- 12 widths = 7.5 WU.

Use squared Euclidean anchor distance for deterministic comparison.

This is a continuous-world radius, not a grid.

The source Design remains normative if the player-footprint unit changes through an explicit future technical migration.

---

## 11. Power-radius geometry

Condenser power eligibility requires its consumer anchor within 8 player-footprint widths of Compact Power Unit and same foothold.

Derived current radius:
- 8 × 0.625 WU = 5.0 WU.

Use squared Euclidean anchor distance.

No LOS, cable, tile adjacency, or corridor requirement.

---

## 12. Atomic placement transaction

Placement crosses simulation item authority + world authority.

Pre-state:
- source Kit exists;
- inventory revision R_i;
- foothold build revision R_b.

Commit plan:
1. reserve/validate one exact source Kit logically;
2. allocate authority-owned stable StructureId derived from/associated with OperationId;
3. construct complete unpublished structure state;
4. construct any required ContainerId (Storage Crate / Condenser output);
5. construct connector/power participation state;
6. validate final world transform/aggregate again;
7. consume exactly one source Kit through item ledger;
8. publish exactly one world structure;
9. increment inventory revision once;
10. increment foothold build revision once;
11. initialize structure revision;
12. emit structure-placed outcome/progression event.

Atomicity invariant:
- Kit consumption and structure publication are one authoritative logical commit.

Failure:
- no structure;
- no consumed Kit;
- no orphan output container;
- no progression milestone.

---

## 13. Concurrent placement

Two commands may target overlapping/competing positions.

Authority serialization uses:
- Foothold build revision;
- current spatial query.

First valid commit:
- increments build revision.

Second command with stale expected revision:
- rejects WORLD_STATE_CHANGED / STALE_REVISION;
- Kit remains.

Even if expected revision is refreshed, overlap validation may reject POSITION_TAKEN.

No duplicate structure and no double Kit consumption.

---

## 14. Phase 1 structure caps

Static caps come from ContentCatalog:

- Landing Module: 1 pre-existing;
- Habitat Room: 1;
- Workbench: 1;
- Compact Power Unit: 1;
- Atmospheric Water Condenser: 1;
- Storage Crate: 4.

Cap validation occurs before Kit consumption.

Counts are derived from canonical world structure state, not client UI counters.

---

## 15. Landing Module

Pre-existing canonical structure.

Roles:
- initial landmark;
- base anchor;
- respawn anchor;
- Habitat connector source;
- build-zone anchor.

Technical constraints:
- not player-placeable;
- no source Kit;
- not dismantlable;
- stable spawn-clearance profile;
- stable connector profile.

No inventory/storage role is introduced.

---

## 16. Habitat connector model

Phase 1 only needs Landing Module ↔ Habitat Room.

Conceptual:

```ts
interface StructureConnection {
  readonly connectionId: string;
  readonly a: ConnectorId;
  readonly b: ConnectorId;
}
```

Placement:
1. actor selects Habitat Kit;
2. target Landing connector must be free/valid;
3. authority snaps Habitat connector transform to target connector transform;
4. authority tests final footprint + door/approach clearance;
5. commit structure + connection edge atomically.

Only connector placement snaps.

Player movement remains continuous/non-grid.

Connection edge persists.

No branching corridor network/pressure simulation is introduced.

---

## 17. Habitat shelter authority

World exposes a shelter query from authoritative Habitat interior profile.

When a living player resolved position is inside valid Habitat shelter:
- environment target supplied to survival system = 50.

Habitat does not mutate:
- Health;
- Food;
- Water.

It is a thermal-environment source only.

No free healing.

Client visual interior cannot decide shelter truth.

---

## 18. Storage Crate

World owns:
- structure identity/placement/revision;
- reference to shared ContainerId.

Item ledger owns:
- contents;
- container revision/capacity transaction.

Approved capacity:
- 100 kg;
- 120 volume units;
- general Phase 1 portable storage;
- no nested containers.

Use is team-shared.

No structure-specific duplicate item store exists.

---

## 19. Workbench

World owns:
- StructureId;
- position;
- accessibility;
- revision.

Craft/repair authority uses Workbench as a validated station reference.

No internal ingredient inventory.
No queue.

Because Phase 1 craft/repair commits immediately:
- “active transaction” only means a command currently in the authority commit boundary;
- a dismantle racing a craft uses structure/build revision validation so only a coherent result commits.

---

## 20. Power aggregate

Phase 1 power is one bounded foothold subsystem.

Conceptual:

```ts
interface PowerNetworkState {
  readonly revision: number;
  readonly producerStructureId: StructureId | null;
  readonly capacityPu: number;
  readonly grantedConsumerIds: readonly StructureId[];
}
```

Rules:
- Compact Power Unit provides 10 PU;
- always ON while validly placed;
- no fuel;
- no cables;
- only eligible same-foothold consumers within radius can receive grant;
- total grants may not exceed capacity.

The state is deliberately small and not a generic electrical graph.

---

## 21. Power grant policy

Normal Phase 1:
- one Condenser max;
- demand 5 PU;
- capacity 10 PU;
- therefore no ordinary priority conflict.

Still define deterministic behavior for debug/future invalid-content stress:

1. preserve valid existing grants while producer/consumer geometry and enabled/request state remain valid;
2. remove grants that become invalid;
3. evaluate newly eligible ungranted consumers in stable StructureId order;
4. grant only while capacity remains;
5. newly enabled consumer that cannot fit remains UNPOWERED/INSUFFICIENT_POWER;
6. never overdraw;
7. already-running valid consumer is not randomly preempted by a newly enabled one.

Power-network revision increments only when canonical grant membership/producer state changes.

---

## 22. Power state after placement/removal

### Compact Power Unit placed
- producer becomes available;
- recalculate grants deterministically;
- enabled eligible Condenser may transition from UNPOWERED to RUNNING if output not full.

### Compact Power Unit dismantled
- producer removed;
- all grants invalidated;
- enabled Condenser becomes UNPOWERED;
- partial production progress preserved.

### Condenser moves via dismantle/rebuild
Phase 1 has no move-in-place.
Dismantle then place as new structure identity.
Output must be empty before dismantle.

---

## 23. Condenser canonical state

Conceptual:

```ts
interface CondenserRuntimeState {
  readonly structureId: StructureId;
  readonly revision: number;
  readonly enabled: boolean;
  readonly productionProgressTicks: number;
  readonly completedCycleOrdinal: number;
  readonly outputContainerId: ContainerId;
}
```

Canonical persisted fields:
- enabled;
- progress;
- completedCycleOrdinal;
- output-container reference;
- structure placement/revision.

Primary displayed machine state is derived from:
- enabled;
- current power grant;
- output count.

---

## 24. Condenser derived state

### DISABLED
- enabled = false;
- demand 0;
- progress paused.

### UNPOWERED
- enabled = true;
- no valid power grant;
- progress paused.

### RUNNING
- enabled = true;
- valid 5 PU grant;
- output count <4;
- progress advances.

### OUTPUT FULL
- output count =4;
- demand becomes 0;
- progress paused.

If output contains 1–3:
- machine can still be RUNNING.

Thus “READY / PARTIAL OUTPUT” is a player-facing output condition, not a separate mutually exclusive authority state from RUNNING.

This resolves the Design wording without changing its behavior.

---

## 25. Production timing

90 active powered seconds at 60 Hz:

- cycle length = 5,400 authoritative ticks.

Each authoritative tick:
- if derived state RUNNING:
  - productionProgressTicks += 1.
- otherwise:
  - progress unchanged.

When progress reaches 5,400:
1. verify output count <4;
2. authorize exactly one Clean Water creation;
3. idempotency key = machine StructureId + completedCycleOrdinal;
4. insert one `item:clean-water` through P1-TECH-003 machine-output container seam;
5. increment completedCycleOrdinal;
6. subtract/reset one 5,400-tick cycle;
7. increment machine/output revisions as appropriate;
8. if output now 4, derived state becomes OUTPUT FULL.

No wall clock.
No offline catch-up.

---

## 26. Output-container semantics

Condenser output surface is an **output-only shared container**.

Players may:
- inspect;
- remove/collect Clean Water.

Players may not deposit arbitrary items or external Clean Water into the machine-output buffer in Phase 1.

Reason:
- buffer capacity 4 is machine output capacity, not general storage;
- avoids external item deposit changing production-block semantics.

P1-TECH-003 remains owner of item quantities/revisions.

First valid concurrent collection wins by container revision.

---

## 27. Cycle idempotency

Clean Water production must not duplicate after:
- retry;
- save/reopen;
- reconnect;
- host message replay.

Stable cycle identity:

```text
machineStructureId + completedCycleOrdinal
```

Before producing:
- authority verifies this cycle ordinal has not already committed output.

After successful output commit:
- ordinal increments atomically with machine/output revisions.

Persistence must reconstruct ordinal/progress consistently.

---

## 28. Enable/disable command

Any teammate may enable/disable Condenser.

Command includes:
- OperationId;
- actor;
- StructureId;
- expected structure/machine revision;
- desired enabled boolean.

If same state already exists:
- may return idempotent no-op committed result without revision bump.

If state changes:
- update enabled;
- increment revision;
- recalculate power grant/demand;
- preserve progress.

No hidden maintenance/durability state.

---

## 29. Dismantle command

Conceptual:

```ts
interface DismantleStructureCommand {
  readonly operationId: OperationId;
  readonly actorPlayerId: PlayerId;
  readonly structureId: StructureId;
  readonly expectedStructureRevision: number;
  readonly footholdId: FootholdId;
  readonly expectedBuildRevision: number;
  readonly expectedInventoryRevision: number;
}
```

Common validation:
- structure exists;
- player in interaction range;
- structure dismantlable;
- matching returned Construction Kit can fit player inventory;
- revisions match.

Additional:
- Storage Crate empty;
- Condenser output empty;
- Workbench not concurrently committing craft/repair;
- Habitat has no player inside;
- Landing Module never allowed.

---

## 30. Atomic dismantle transaction

Successful dismantle:
1. revalidate all preconditions;
2. determine exact matching original Kit ContentId;
3. allocate authoritative returned Kit ItemStackId tied to OperationId;
4. remove/deactivate structure and dependent world relationship;
5. remove connector edge/power participation;
6. create exactly one Kit into dismantling player's inventory;
7. increment inventory/build revisions;
8. emit dismantled outcome.

Atomicity invariant:
- structure removal and Kit creation commit together.

Failure:
- structure remains;
- no Kit created;
- no output/container content lost.

---

## 31. Power Unit dismantle side effect

Power Unit may be dismantled while Condenser exists.

Atomic world result:
- producer removed;
- power grants removed;
- enabled Condenser becomes derived UNPOWERED;
- Condenser progress preserved;
- output preserved.

No Clean Water creation/loss occurs solely due to power removal.

---

## 32. Habitat dismantle side effect

Habitat dismantle requires no player inside.

Commit:
- structure removed;
- Landing ↔ Habitat connection removed;
- shelter zone removed;
- build-zone anchor contribution from Habitat removed.

Other structures already validly placed do not get silently deleted merely because Habitat was removed.

New placement must validate against current remaining build-zone anchors.

This ADR does not introduce automatic orphan-base cleanup.

---

## 33. Structure/world revisions

Use:
- Foothold buildRevision for aggregate placement/cap/connectivity contention;
- individual Structure revision for structure/machine interaction;
- PowerNetwork revision for grant changes;
- item Container revision for storage/output contents.

One command validates every revision it depends on before commit.

Do not use one giant global world revision for unrelated chunks/systems.

---

## 34. Persistence seam

P1-TECH-008 must persist/reconstruct at minimum:

### Foothold
- FootholdId;
- build revision;
- canonical structure IDs;
- connection edges;
- power-network producer/grants/revision when needed to preserve exact canonical result.

### Structure
- StructureId;
- definition ContentId;
- world position;
- quarter-turn orientation;
- structure revision;
- placement relationships.

### Habitat
- connector relation;
- enough authoritative geometry/profile identity to reconstruct shelter from compatible code/content.

### Storage/Workbench
- container reference where applicable;
- contents remain item-ledger records.

### Power Unit
- placement/revision;
- always-on nature derives from definition.

### Condenser
- enabled;
- progress ticks;
- completed cycle ordinal;
- output ContainerId;
- structure/machine revision;
- output contents via item ledger.

Do not persist:
- preview ghost;
- Pixi state;
- UI open state;
- render animation;
- wall-clock offline duration.

---

## 35. Reconstructive load

Required order:

1. validate save/content compatibility;
2. reconstruct item-ledger containers unpublished;
3. reconstruct world structures unpublished;
4. validate build caps/IDs/geometry/connectors;
5. validate container references;
6. reconstruct power producer/consumer eligibility;
7. restore persisted grants if still valid, then deterministic grant fill;
8. restore Condenser enabled/progress/cycle ordinal/output;
9. derive current machine state;
10. publish authority only if cross-record invariants pass.

No offline production during steps 1–10.

Corrupt/missing required cross-reference:
- explicit load failure;
- no silent Kit refund/delete/machine reset.

---

## 36. Replication seam

Host/server publishes read-only:
- StructureId/type/transform/revision;
- placement/build aggregate revision;
- connector state;
- power availability/grants/derived machine state;
- Condenser enabled/progress/readable output count/revision;
- shared output-container revision.

Remote client submits:
- place intent;
- dismantle intent;
- enable/disable intent;
- item collection commands.

Remote client cannot:
- create structure;
- consume/refund Kit authoritatively;
- set power grant;
- set machine progress;
- create Clean Water;
- set output contents.

---

## 37. Rejoin behavior

Joining/rejoining client receives host canonical state.

Client does not replay previously sent placement/dismantle/enable commands as new operations.

If acknowledgment was lost:
- retry same OperationId returns prior result or current authoritative state;
- duplicate structure/Kit/Water creation is forbidden.

---

## 38. Placement rejection taxonomy

Required stable reasons include:

- UNEXPLORED_AREA
- INVALID_TERRAIN
- NON_BUILDABLE_SURFACE
- OBSTRUCTED
- STRUCTURE_OVERLAP
- BLOCKS_SPAWN
- BLOCKS_REQUIRED_ACCESS
- OUTSIDE_BASE_BUILD_ZONE
- CONNECTOR_REQUIRED
- INVALID_CONNECTOR
- BUILD_LIMIT_REACHED
- KIT_UNAVAILABLE
- INVENTORY_STALE
- WORLD_STATE_CHANGED
- POSITION_TAKEN
- OPERATION_ID_CONFLICT

Power/machine:
- OUT_OF_POWER_RANGE
- INSUFFICIENT_POWER
- MACHINE_DISABLED
- OUTPUT_FULL
- STALE_REVISION

UI maps these to readable copy; authority owns the reason.

---

## 39. Determinism requirements

Same:
- compatible content;
- world state;
- structure geometry profiles;
- ordered commands;
- fixed ticks;

must produce identical:
- placement validation result;
- final snapped Habitat transform;
- StructureIds tied to operation identity;
- build/structure revisions;
- power grants;
- Condenser state/progress/output cycle;
- dismantle result.

Deterministic ordering:
- placement validation categories fixed;
- connector candidates stable by ConnectorId;
- newly eligible power consumers stable by StructureId;
- nearest-valid placement/spatial tests use world deterministic queries;
- no render/Map insertion/async I/O order.

---

## 40. Failure semantics

### Placement fails after stale world change
No Kit consumed.

### Kit disappears after preview
Confirm rejects KIT_UNAVAILABLE.

### Client retries successful placement
Same OperationId does not create another structure or consume another Kit.

### Dismantle target changed/filled
Reject; structure remains; no Kit.

### Save fails
Live world/item state remains canonical/dirty.

### Power disappears mid-cycle
Progress pauses at exact canonical tick.

### Output reaches full
Production pauses; no over-cap item creation.

### Reopen after real-world time
No production added.

### Missing/corrupt output container
Load fails explicitly; do not create fresh empty/full buffer.

---

## 41. Observability

Development diagnostics:
- OperationId;
- actor;
- StructureId/ContentId;
- requested/final transform;
- placement rejection reason;
- expected/actual revisions;
- buildRevision;
- connector IDs;
- power producer/granted consumers/used PU;
- Condenser derived state;
- progress ticks;
- cycle ordinal;
- output count/container revision;
- dismantle precondition failure;
- save/load reconstruction error.

No production analytics service required.

---

## 42. Performance constraints

Phase 1 is bounded:
- <=1 Habitat;
- <=1 Workbench;
- <=1 Power Unit;
- <=1 Condenser;
- <=4 Storage Crates.

Therefore:
- placement may query nearby colliders/structures, not whole world;
- power grant recomputation over foothold structures is bounded;
- Condenser update is O(1);
- no graph solver/cable simulation;
- no per-frame build geometry mutation;
- preview queries may be client-cached, but confirm always authority-validates.

P1-TECH-009 owns numeric budgets.

---

## 43. File/module plan

Recommended implementation #51:

```text
src/world/building/
  StructureId.ts
  StructureRuntimeState.ts
  StructurePlacementProfile.ts
  FootholdBuildState.ts
  ConnectorState.ts
  BuildingWorldQuery.ts
  BuildingWorldMutation.ts

src/simulation/building/
  BuildingAuthority.ts
  PlaceStructureCommand.ts
  DismantleStructureCommand.ts

src/world/power/
  PowerNetworkState.ts
  PowerAuthority.ts

src/world/machines/
  CondenserRuntimeState.ts

src/simulation/machines/
  CondenserAuthority.ts
```

Reuse #39 item/container public API.
Do not import simulation internals into world.

---

## 44. Required implementation tests

### Placement
- valid placement consumes one exact Kit and creates one structure;
- invalid terrain/overlap/fog/build-zone/cap consumes none;
- two competing placements -> one commit, one stale/conflict;
- same OperationId retry -> no duplicate;
- sprite size change cannot change collision footprint;
- continuous free placement not terrain-tile snapped;
- 4 logical rotations deterministic.

### Connector/Habitat
- valid Landing connector snap exact/replayable;
- occupied/invalid connector fails;
- door/access collision fails;
- shelter target query =50;
- no Health/Food/Water mutation from shelter.

### Power
- Power Unit =10 PU;
- radius =8 footprint widths / current 5 WU;
- Condenser =5 PU;
- no overdraw;
- removal -> UNPOWERED + progress preserved;
- existing valid grants retained before new requests.

### Condenser
- 5,399 RUNNING ticks -> no output;
- 5,400th -> exactly one Clean Water;
- duplicate cycle processing -> no duplicate;
- output count 4 pauses;
- collection resumes current partial progress;
- disabled/unpowered/full ticks do not advance;
- offline wall-clock does not advance;
- save/load exact progress/cycle/output.

### Dismantle
- success returns exactly one matching Kit;
- full output/non-empty crate/player in Habitat prevents dismantle;
- failed dismantle returns no Kit;
- concurrent interaction/dismantle coherent;
- Power Unit dismantle pauses machine without deleting state.

### Persistence/rejoin
- exact round-trip;
- corrupt reference fails;
- retry after reconnect idempotent.

---

## 45. Deferred/non-goals

Deferred:
- network wire/protocol -> #43;
- Save V2 layout -> #44;
- performance/CI budgets -> #45;
- UI/build ghost/asset presentation -> #37/#55.

Not Phase 1:
- corridors as placeable structures;
- complex room graph;
- pressure/oxygen simulation;
- cables;
- fuel logistics;
- power priority UI;
- batteries;
- multiple machine categories;
- advanced automation;
- conveyor/logistics networks;
- machine wear;
- offline production;
- construction workers/timers;
- build permissions/ranks.

---

## 46. Acceptance criteria self-check

- Stable structure/machine identities: **PASS**
- Host-authoritative deterministic placement: **PASS**
- World/collision validation explicit: **PASS**
- Kit consumption + placement atomic: **PASS**
- Co-op competing placement behavior explicit: **PASS**
- Habitat connector/connectivity bounded: **PASS**
- Shelter thermal target 50 / no free healing preserved: **PASS**
- 10 PU Power Unit contract preserved: **PASS**
- 5 PU Condenser contract preserved: **PASS**
- 1 Clean Water / 90 active powered seconds preserved: **PASS**
- Buffer 4 / no offline production / no hidden wear preserved: **PASS**
- Machine output item authority uses #39 seam: **PASS**
- Power/machine persistence/rejoin contract explicit: **PASS**
- Dismantle exact one-Kit recovery atomic: **PASS**
- Structure/machine state revisions explicit: **PASS**
- No client-authoritative structure/power/output state: **PASS**
- Phase 1 scope bounded: **PASS**
- Implementation authorization: **NO**
- Blocking open question: **NONE**

---

## 47. Consequences

Benefits:
- building/item/world state cannot diverge on failure;
- retries and co-op races cannot duplicate Kits/structures;
- power behavior survives load deterministically;
- machine production is fixed-tick/idempotent;
- later hosted protocol/save V2 inherit stable IDs/revisions.

Costs:
- placement/dismantle require multi-owner transaction coordination;
- geometry profiles must be explicit tested domain configuration;
- power grants/machine cycle identity must persist.

Accepted because those are the minimum protections needed for shared building + persistence.

---

## 48. Implementation authorization

**NOT AUTHORIZED by P1-TECH-006.**

---

## 49. Handoff

**Task:** P1-TECH-006  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-006-building-power-machine-authority.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** Producer verifies DoD/AC and marks TECH READY if accepted; then dependency graph may evaluate #43 Hosted Co-op ADR.  
**Project Owner decision required:** NONE.
