# ADR-P1-TECH-003 — Item, Container, Gathering, Crafting, and Item Transaction Authority

**Task:** P1-TECH-003 / Issue #39  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-002 / #32, P1-TECH-002 / #38  
**Implementation authorization:** NONE — ADR only.

---

## 1. Context

Phase 1 introduces shared inventories, containers, ground drops, gathering, crafting, repair, item condition, construction kits, death drops, persistence, and hosted co-op.

The primary technical risks are:
- client-authoritative item creation;
- duplicate items during retry/concurrency;
- partial transfer/craft/gather outcomes;
- stale UI state overwriting newer authority;
- world/resource mutations committing without matching item output or vice versa;
- save/network adapters becoming gameplay owners.

The approved gameplay contract requires exact, reversible, trustworthy item operations with no silent loss or duplication.

---

## 2. Decision summary

1. **Simulation owns the canonical logical item/container ledger.**
2. **World owns spatial drop/resource entities and references logical item/container identities.**
3. **Every item mutation occurs through one authoritative command transaction.**
4. **Containers and item bundles use stable IDs + monotonic revisions.**
5. **Retryable commands use stable OperationId and idempotent result caching/recognition.**
6. **Cross-owner actions (gather/drop/pickup/death recovery/build later) commit as one authority operation or expose no partial success.**
7. **Persistence exports/imports canonical DTOs but never mutates live ledger directly.**
8. **Clients send intent, expected revisions and target IDs; they never send canonical resulting contents.**

---

## 3. Canonical identities

### 3.1 ItemDefinitionId

Uses P1-TECH-002 stable ContentId such as:
- `item:clean-water`
- `item:basic-spear`

This identifies **type**, not runtime ownership.

### 3.2 ItemStackId

Every canonical stack/runtime item bundle has a stable opaque `ItemStackId`.

Required even for stackable items because:
- stack identity is needed across retry/replication/persistence;
- split/merge must be auditable and deterministic.

### 3.3 Condition-bearing item identity

Condition-bearing items are stack size 1 by design.

Their `ItemStackId` is therefore also their runtime instance identity.

### 3.4 ContainerId

Stable opaque ID for:
- player inventory;
- world Storage Crate;
- machine output surface;
- Death Cache item container;
- ordinary ground-drop bundle where represented as a container-like item bundle.

### 3.5 WorldDropId / ResourceEntityId

World owns stable spatial IDs for:
- ordinary drops;
- resource nodes;
- later Death Cache spatial entities.

They reference item/container IDs rather than embedding an independently mutable copy of item state.

### 3.6 OperationId

Any command that may be retried through transport/UI must carry a stable `OperationId`.

Conceptual:
```ts
type OperationId = string;
```

Exact encoding is implementation scope, but it must be:
- unique within an authority session/world;
- serializable;
- suitable for duplicate recognition;
- not reused for a different semantic command.

---

## 4. Canonical item stack state

Conceptual:

```ts
interface ItemStackState {
  readonly stackId: ItemStackId;
  readonly itemDefinitionId: ContentId;
  readonly quantity: number;
  readonly condition: number | null;
}
```

Rules:
- quantity is positive integer;
- quantity <= definition maxStack;
- condition is null for non-condition items;
- condition-bearing items have quantity = 1;
- condition range is 0..conditionMax;
- BROKEN state is condition = 0; item remains canonical and repairable;
- no renderer/UI fields.

---

## 5. Canonical container state

Conceptual:

```ts
interface ContainerState {
  readonly containerId: ContainerId;
  readonly kind: 'player-inventory' | 'storage-crate' | 'machine-output' | 'death-cache';
  readonly revision: number;
  readonly stacks: readonly ItemStackState[];
}
```

Container order is not gameplay authority unless a later UI feature explicitly introduces ordered slots. Phase 1 has no grid-slot inventory gameplay.

Canonical serialization orders stacks by `ItemStackId`.

Derived values:
- totalWeight;
- totalVolume;
- weightState.

Derived values are recomputed from immutable content definitions + stacks and are not independently mutable canonical fields.

---

## 6. Player inventory capacity authority

P1-DES-002 values remain authoritative content/rules:
- max weight 20 kg;
- max volume 24 u;
- NORMAL 0–80%;
- HEAVY >80–100%;
- OVERLOADED >100–125%;
- normal player-facing operation cannot commit above hard limit >125%.

The transaction system validates capacity **before** mutation.

No operation may:
- consume/move source items first and then discover target cannot accept;
- silently choose a partial amount when full quantity was requested.

---

## 7. Container revision model

Every mutation of a container increments its revision exactly once for the committed transaction.

A command that reads/mutates one or more containers includes expected revisions when stale-state contention matters.

Conceptual:

```ts
interface ExpectedContainerRevision {
  readonly containerId: ContainerId;
  readonly expectedRevision: number;
}
```

If any required revision differs:
- command does not mutate canonical state;
- result is `STALE_REVISION`;
- caller receives/requests refreshed authoritative state.

For multi-container transactions, all expected revisions are checked before commit.

---

## 8. Transaction result contract

Conceptual:

```ts
type ItemTransactionResult =
  | {
      readonly status: 'committed';
      readonly operationId: OperationId;
      readonly resultingRevisions: readonly { containerId: ContainerId; revision: number }[];
      readonly createdStackIds: readonly ItemStackId[];
      readonly removedStackIds: readonly ItemStackId[];
    }
  | {
      readonly status: 'rejected';
      readonly operationId: OperationId;
      readonly reason: TransactionRejectionReason;
    };
```

Representative rejection reasons:
- STALE_REVISION
- SOURCE_MISSING
- QUANTITY_UNAVAILABLE
- TARGET_UNAVAILABLE
- TARGET_CAPACITY_WEIGHT
- TARGET_CAPACITY_VOLUME
- STACK_INCOMPATIBLE
- STACK_LIMIT
- INVALID_WORLD_PLACEMENT
- TARGET_ALREADY_TAKEN
- TOOL_REQUIRED
- TOOL_BROKEN
- INSUFFICIENT_STAMINA
- STATION_REQUIRED
- INVALID_RECIPE
- INVALID_REPAIR_TARGET
- ITEM_FULL_CONDITION
- OPERATION_ID_CONFLICT

Rejection itself is deterministic and has no canonical item side effect.

---

## 9. Idempotency

Authority keeps enough recent/active operation identity state to distinguish duplicate retry from a distinct command.

Rules:

- same `OperationId` + byte/semantic-equivalent command:
  - do not apply twice;
  - return the already committed/rejected authoritative result where available.
- same `OperationId` + different command payload:
  - reject as OPERATION_ID_CONFLICT.
- client reconnect cannot cause previously committed item creation/transfer to replay as new state.

P1-TECH-007 will define retention/rejoin protocol details.

Persistence does not need to retain an unbounded lifetime operation log; exact durable idempotency horizon for save/reconnect is defined with protocol/save ADRs where needed.

---

## 10. Stack creation, split, merge, and destruction invariants

### Creation

Only authoritative systems may create new stacks from approved causes:
- gather output;
- recipe output;
- approved ruin/machine/world reward;
- approved bootstrap/reconstruction.

Client cannot submit arbitrary `CreateItem`.

### Split

Split:
- source quantity > split quantity >= 1;
- creates one new ItemStackId;
- source quantity decreases;
- both results stay within definition maxStack;
- transaction increments source container revision once.

### Merge

Merge:
- same definition;
- both stackable;
- neither condition-bearing;
- target has capacity below maxStack.

Moves only approved requested quantity or explicit merge-all behavior.

If full requested merge cannot satisfy the command semantics, reject or preserve documented remainder behavior; do not silently destroy source.

### Destruction/consumption

Items disappear only from approved committed causes:
- consumable completes;
- crafting input;
- repair patch use;
- building kit use in P1-TECH-006;
- other later approved authority action.

No cleanup system may delete canonical Phase 1 items merely because they are old.

---

## 11. Transfer transaction

Player ↔ Storage Crate transfer is one atomic transaction.

Inputs:
- OperationId;
- source ContainerId + expected revision;
- target ContainerId + expected revision;
- source ItemStackId;
- requested quantity.

Validation:
1. source/target exist and are accessible;
2. source contains quantity;
3. target accepts content;
4. stack compatibility;
5. target volume/weight rules;
6. revisions still match.

Commit:
- decrement/remove source;
- create/merge target stack deterministically;
- increment each mutated container revision exactly once;
- publish outcome.

Failure:
- neither container changes.

Concurrent transfers:
- first authoritative valid command commits;
- later stale command rejects;
- no duplicate item copy exists.

---

## 12. Pickup transaction

World drop is owned spatially by world and references a canonical item bundle/container.

Command:
- player + drop ID + player inventory expected revision + world/drop expected revision.

Validation:
- drop exists and available;
- player within approved interaction range;
- full presented stack/bundle fits;
- revisions valid.

Commit atomically:
1. move exact item state into player inventory;
2. mark/remove world drop canonical availability;
3. update revisions.

The world drop must not be removed first and then fail item insertion.

First successful pickup wins in co-op.

---

## 13. Drop transaction

Command specifies:
- player inventory stack/quantity;
- expected inventory revision;
- logical requested drop action.

Authority/world resolves nearest valid reachable placement according to world placement API.

Validation occurs before item removal.

Commit atomically:
1. allocate stable WorldDropId;
2. create world spatial entity;
3. move selected canonical stack quantity into associated drop bundle/container;
4. update inventory/world revisions.

If no valid nearby placement:
- inventory unchanged;
- no orphan world drop created.

Ordinary drops have no despawn timer in Phase 1.

---

## 14. Gathering authority transaction

Gathering has channel state in simulation, but **completion** is the canonical transaction point.

Start validation:
- player alive/action-capable;
- resource entity exists;
- interaction range valid;
- tool requirement satisfied;
- tool condition > 0 if required;
- stamina sufficient;
- full fixed output fits player inventory.

During channel:
- movement/target validity may cancel;
- no item/resource/tool/stamina mutation is committed before approved completion semantics.

Completion revalidates:
- player/target relation;
- resource revision;
- inventory revision/capacity;
- tool state;
- stamina.

Commit spans simulation + world:
1. spend approved stamina;
2. decrement resource action count / mark depleted as applicable;
3. create exact fixed output stack(s);
4. insert output into player inventory;
5. apply tool condition cost on successful hard-resource gather;
6. increment affected revisions;
7. emit one authoritative gather-completed event for progression.

Canceled/failed gather:
- no output;
- no node decrement;
- no tool condition loss.

Resource runtime depletion/regeneration identity is P1-TECH-004.

---

## 15. Craft transaction

Phase 1 crafting is transaction-immediate after confirmation.

Command:
- actor;
- RecipeId;
- player inventory expected revision;
- optional Workbench StructureId/revision for Tier 1;
- OperationId.

Validation:
- recipe exists;
- station requirement satisfied;
- exact inputs available;
- projected output capacity valid;
- output definition valid.

Commit:
1. consume exact recipe inputs;
2. create output stack(s) with approved initial condition;
3. insert output;
4. increment inventory revision once;
5. emit one craft-completed authoritative event.

No crafting queue and no hidden Workbench ingredient container.

If output cannot fit:
- inputs unchanged.

---

## 16. Repair transaction

Command:
- actor;
- target condition-bearing ItemStackId;
- player inventory revision;
- Workbench identity/revision;
- OperationId.

Validation:
- target exists and repairable;
- condition < max;
- Repair Patch exists;
- functional Workbench accessible.

Commit:
- consume 1 Repair Patch;
- condition += 25, capped at 100;
- preserve target ItemStackId;
- increment player inventory revision once;
- emit one successful condition-increasing repair event.

Failure consumes nothing.

---

## 17. Condition mutation ownership

Item ledger owns current condition.

Approved condition loss sources call explicit authority operations:
- Stone Field Tool: -2 on successful hard gather;
- Basic Spear: -1 on successful hit;
- equipped condition-bearing item: -10 once on death under P1-TECH-005.

Condition change is never a client-side animation value.

If multiple condition changes occur in one authoritative operation, one final canonical condition is committed in deterministic system order.

---

## 18. Machine output container seam

Atmospheric Water Condenser output is exposed as a machine-owned shared output container surface.

Logical item contents remain simulation item-ledger state.
World machine entity references the ContainerId.

P1-TECH-006 owns:
- machine runtime state;
- production timing;
- power;
- when one Clean Water creation operation is authorized.

When production completes:
- simulation authority creates exactly one `item:clean-water` into the output container if capacity allows;
- operation is idempotent for a given machine production-cycle identity;
- output container revision increments.

---

## 19. Death Cache seam

P1-TECH-005 owns death transition and Death Cache world entity creation.

This ADR provides the item move primitive:

`moveAllPortableItems(playerInventory -> deathCacheContainer)`

Requirements:
- exact carried/equipped portable state is moved, not copied;
- equipped references are cleared consistently;
- one cross-owner death operation owns the transaction;
- cache recovery uses normal team-accessible transfer semantics;
- concurrent recovery obeys container revisions.

---

## 20. Persistence seam

Persistence exports item-ledger DTOs through public simulation contracts.

Persist at minimum where used:
- ContainerId;
- container kind/owner reference;
- container revision;
- ItemStackId;
- item ContentId;
- quantity;
- condition;
- relevant world reference links for drop/cache/container structures.

Persistence does not:
- call internal mutate methods;
- invent/recalculate items;
- own live container revisions.

On load:
- validate content IDs against ContentCatalog;
- validate quantities/condition;
- validate unique IDs;
- validate cross-record ownership;
- reconstruct unpublished ledger;
- publish only if coherent.

P1-TECH-008 owns exact Save V2 schema.

---

## 21. Replication seam

Hosted clients receive immutable item/container views containing:
- IDs;
- definition IDs;
- quantity/condition;
- aggregate revision;
- permissions/readability needed by UI.

Clients submit operations against authoritative IDs/revisions.

They never submit:
- full replacement inventory;
- resulting canonical quantities;
- created stack IDs chosen as authority;
- arbitrary item stats.

P1-TECH-007 defines wire schema, sequencing and rejoin snapshot behavior.

---

## 22. Determinism

Required deterministic behavior:
- validation order;
- stack merge target selection;
- newly created stack ordering;
- cross-system commit order;
- rejection outcome for same canonical state/command.

Canonical selection rules:
- prefer explicitly targeted stack when supplied;
- otherwise process candidate stacks by stable ItemStackId order;
- serialize/list stacks by ItemStackId;
- no Map insertion/source-load ordering as gameplay choice.

Item creation IDs must not depend on render FPS or async I/O completion order.

Exact ID generator implementation may use authority-owned monotonic sequence/namespace or deterministic operation-derived IDs, but it must be collision-safe and replay-testable.

---

## 23. Anti-duplication invariants

The implementation and tests must prove:

1. total item quantity across canonical owners changes only by an approved creation/destruction cause;
2. transfer conserves item quantity;
3. split conserves item quantity;
4. merge conserves item quantity;
5. failed transaction conserves exact pre-state;
6. duplicate OperationId cannot apply twice;
7. stale container revision cannot overwrite current contents;
8. pickup removes world availability exactly once;
9. drop never removes inventory without creating corresponding world canonical item state;
10. gather output exists iff resource/tool/stamina transaction commits;
11. craft inputs disappear iff outputs commit;
12. repair patch disappears iff target condition increases;
13. death inventory move cannot copy items into both player and cache.

---

## 24. Failure and conflict behavior

### Stale revision
Reject; no mutation; refresh canonical state.

### Duplicate retry
Return prior result or deterministic duplicate acknowledgement; no second mutation.

### Source vanished
Reject SOURCE_MISSING/TARGET_ALREADY_TAKEN.

### Capacity changed during contention
Revalidation rejects; source remains unchanged.

### World placement invalid
Drop operation fails; inventory remains.

### Persistence failure
Live authoritative item state remains canonical/dirty. No gameplay rollback from storage failure.

### Disconnect mid-command
Only authority commit status matters. On rejoin, client reconciles from authoritative snapshot/result.

---

## 25. Public API direction

Conceptual public simulation surfaces:

```ts
interface ItemTransactionAuthority {
  execute(command: ItemCommand): ItemTransactionResult;
  getContainerView(containerId: ContainerId): Readonly<ContainerView>;
}
```

World supplies public ports needed for:
- resource mutation;
- drop placement/removal;
- structure/station access validation.

Simulation may import world public APIs.
World may not import simulation item internals.

---

## 26. File/module plan

Recommended under implementation #49:

```text
src/simulation/items/
  ItemIds.ts
  ItemLedger.ts
  ContainerState.ts
  ItemTransactionAuthority.ts
  ItemCommands.ts
  ItemTransactionResults.ts
  ItemCapacity.ts

src/simulation/crafting/
  CraftAuthority.ts
  RepairAuthority.ts

src/simulation/gathering/
  GatherAuthority.ts
  GatherChannelState.ts

src/world/api/
  ResourceMutation.ts
  DropMutation.ts
  DropQuery.ts
```

Public exports only through approved simulation/world entrypoints.

---

## 27. Test strategy

Required tests:

### Identity/invariants
- unique stack/container IDs;
- invalid duplicate load fails;
- condition-bearing stack >1 fails.

### Atomicity
- transfer source success/target failure -> no mutation;
- drop placement failure -> inventory unchanged;
- pickup capacity failure -> drop remains;
- craft output overflow -> inputs remain;
- repair invalid/full -> patch remains.

### Concurrency
- two players pick same drop -> one success;
- two players remove same shared-container quantity -> one valid commit;
- stale revision rejects;
- duplicate OperationId does not double-apply.

### Gathering
- cancel channel -> no resource/output/tool loss;
- fixed yield exact;
- capacity precheck exact;
- tool wear only on successful hard gather.

### Determinism
- same initial ledger + ordered commands -> exact same final canonical state;
- canonical stack merge order independent of source insertion order.

### Persistence/network seam
- export/import round-trip;
- invalid content reference fails;
- reconnect retry does not duplicate committed item.

---

## 28. Deferred

Owned by later ADRs:
- Death Cache creation atomicity with death state -> P1-TECH-005;
- building kit consumption + world placement -> P1-TECH-006;
- wire protocol/idempotency retention -> P1-TECH-007;
- Save V2 records -> P1-TECH-008;
- numeric performance gates -> P1-TECH-009.

Not in Phase 1:
- direct player trade;
- nested containers;
- warehouse networks;
- reserved loot;
- item despawn economy;
- crafting queues;
- nearby-storage crafting.

---

## 29. Acceptance criteria self-check

- No client can authoritatively create/duplicate items: **PASS**
- Canonical item/stack/container identity defined: **PASS**
- Atomic pickup/drop/transfer/split/merge defined: **PASS**
- Gather cross-owner transaction defined: **PASS**
- Craft/repair transaction defined: **PASS**
- Condition mutation defined: **PASS**
- Revisions/idempotency/stale conflict behavior explicit: **PASS**
- Persistence seam explicit/non-authoritative: **PASS**
- Replication seam explicit: **PASS**
- Anti-duplication invariants explicit: **PASS**
- Deterministic selection/order explicit: **PASS**
- Gameplay values preserved from approved Design/Content ADR: **PASS**
- Implementation authorization: **NO**
- Blocking open question: **NONE**

---

## 30. Consequences

Benefits:
- one item authority model for solo and hosted co-op;
- retry/contention cannot create duplicate canonical items;
- item persistence/network representations have stable identities/revisions;
- building/death/machine ADRs can reuse the same transaction primitive.

Costs:
- commands need revisions/operation IDs;
- cross-owner actions require explicit transaction orchestration;
- clients must refresh on stale rejection rather than overwrite authority.

These costs are required for trustworthy shared inventory and persistence.

---

## 31. Implementation authorization

**NOT AUTHORIZED by P1-TECH-003.**

This ADR is a downstream specification source.

---

## 32. Handoff

**Task:** P1-TECH-003  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-003-item-container-transaction-authority.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** Producer verifies DoD/AC and marks TECH READY if accepted.  
**Project Owner decision required:** NONE.
