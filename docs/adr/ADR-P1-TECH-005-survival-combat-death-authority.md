# ADR-P1-TECH-005 — Survival, Combat, Death, and Recovery Authority

**Task:** P1-TECH-005 / Issue #41  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-003 / #33, P1-TECH-002 / #38  
**Cross-contracts:** P1-TECH-003 / #39 item transaction authority, P1-TECH-004 / #40 world entity/delta authority  
**Implementation authorization:** NONE — ADR only.

---

## 1. Context

Phase 1 adds authoritative:
- Health;
- Food;
- Water;
- Stamina;
- Temperature;
- condition interactions;
- consumable channels;
- one Territorial Predator encounter;
- player attacks;
- environmental damage;
- death;
- XP/durability penalties;
- Death Cache creation;
- respawn;
- team-assisted recovery.

The technical risk is not individual arithmetic; it is ensuring:
- fixed-step replay;
- damage/death happens once;
- inventory cannot duplicate during death;
- cache recovery cannot double-transfer;
- reconnect/save/reopen preserves canonical failure/recovery state;
- clients cannot claim damage or survival results.

---

## 2. Decision summary

1. **Simulation owns per-player survival state and death/respawn state.**
2. **World owns hostile/death-cache spatial entities and their world revisions.**
3. **Item ledger owns portable item condition/contents.**
4. **All survival progression uses authoritative fixed ticks; wall clock/render FPS/network timing are non-authoritative.**
5. **Damage is applied through typed authority events/transactions, never client-supplied final HP.**
6. **Death is an idempotent cross-owner transaction keyed by stable DeathId.**
7. **Death item move, equipped durability loss, XP loss, cache creation and respawn scheduling expose no partial successful state.**
8. **Death Cache uses world entity + simulation-owned item container.**
9. **Recovery uses P1-TECH-003 container revisions/OperationId.**
10. **Persistence/replication reconstruct exact canonical survival/death/cache state; reconnect never replays death as new.**

---

## 3. Ownership matrix

| State | Canonical owner |
| --- | --- |
| player Health/Food/Water/Stamina/Temperature | simulation |
| alive/dead/respawning state | simulation |
| current consume/attack channel state | simulation |
| player attack cooldown state | simulation |
| condition of portable item | simulation item ledger |
| current XP/progression | simulation progression |
| predator spatial identity/position/alive entity | world |
| predator combat/AI state and current Health | world runtime state coordinated by simulation combat |
| Death Cache spatial entity/marker | world |
| Death Cache item contents | simulation item ledger/container |
| respawn/base anchor spatial reference | world |
| day/night/weather environmental state | world |
| persistence records | persistence only; never live authority |

---

## 4. Fixed-step time model

Authoritative simulation remains 60 Hz.

All gameplay durations are represented in integer tick counts or deterministic fixed-point rate accumulators.

### Exact whole-duration conversions

At 60 Hz:
- 0.4 s ALERT = 24 ticks;
- 0.55 s predator windup = 33 ticks;
- 0.65 s spear cooldown = 39 ticks;
- 0.80 s unarmed cooldown = 48 ticks;
- 1.0 s consume channel = 60 ticks;
- 1.0 s stamina regen delay = 60 ticks;
- 1.20 s predator recovery = 72 ticks;
- 2.0 s leash-outside disengage = 120 ticks;
- 3.0 s critical-cold damage cadence = 180 ticks;
- 5.0 s critical-dehydration damage cadence = 300 ticks;
- 5.0 s respawn delay = 300 ticks;
- 10.0 s severe-temperature/starvation damage cadence = 600 ticks.

No browser timer or animation callback commits gameplay.

---

## 5. Deterministic rate accumulator

Some approved rates are fractional per tick:
- Water 1.0 point/min;
- Food 0.6 point/min;
- thermal movement 6 points/min;
- stamina regeneration modifiers.

Technical decision:
use integer fixed-point state plus remainder accumulation, not wall-clock floating integration.

Conceptual:

```ts
interface DeterministicRateAccumulator {
  readonly valueMilli: number;
  readonly remainder: number;
}
```

For per-minute rates:
- represent stat as thousandths of a point;
- each simulation tick adds/subtracts an integer numerator;
- divide by 3600 ticks/minute;
- carry integer remainder to next tick.

This guarantees:
- same initial state + ticks -> exact same result;
- no frame-rate dependence;
- no accumulated binary-float drift becoming compatibility truth.

Public/player-facing values remain 0–100 semantics.

Exact implementation may use equivalent integer rational arithmetic if golden/replay behavior is identical.

---

## 6. Player survival state

Conceptual:

```ts
interface PlayerSurvivalState {
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

  readonly lastStaminaSpendTick: SimulationTick | null;
  readonly nextCriticalDehydrationDamageTick: SimulationTick | null;
  readonly nextCriticalStarvationDamageTick: SimulationTick | null;
  readonly nextTemperatureDamageTick: SimulationTick | null;
}
```

Derived labels:
- HEALTHY/INJURED/CRITICAL/DEAD;
- HYDRATED/THIRSTY/DEHYDRATED/CRITICAL DEHYDRATION;
- FED/HUNGRY/STARVING/CRITICAL STARVATION;
- COMFORTABLE/COLD/SEVERE/CRITICAL/HOT states.

Labels are derived from canonical numeric state and do not have an independent mutable copy.

---

## 7. Survival update order

Within each authoritative tick use one stable system order.

Recommended Phase 1 order:

1. consume logical input/commands due for tick;
2. complete/cancel channels whose resolution tick is now;
3. update environment-derived target/carry/equipment modifiers;
4. apply Food/Water drains;
5. update Temperature toward target;
6. apply Stamina regeneration when delay permits;
7. resolve due periodic survival-damage events;
8. resolve combat/hostile scheduled actions due this tick;
9. apply accumulated damage in deterministic event order;
10. if Health reaches 0, execute death transition exactly once;
11. update respawn countdown/complete respawn if due;
12. publish authoritative outcome events/snapshot.

An implementation may group systems differently only if it documents an equivalent deterministic order and all edge cases remain source-compatible.

---

## 8. Food/Water authority

Approved starting state:
- Water 80;
- Food 70.

Drain:
- Water 1.0/min active authority time;
- Food 0.6/min active authority time.

Consumption:
- Clean Water +25 Water;
- Edible Plant +20 Food;
- capped at 100.

Threshold effects use post-current-tick canonical state.

No offline Food/Water drain.

---

## 9. Stamina authority

Approved:
- max 100;
- start 100;
- base regen 15/s;
- starts 1 second after last stamina-spending action.

Costs:
- hand gather completion 2;
- tool gather completion 5;
- unarmed strike 10;
- spear attack 15.

Modifiers:
- current Food/Water/Temperature/carry penalties are additive;
- final regen floor 0.

Technical rule:
- calculate all modifier percentages from one canonical tick snapshot;
- sort/apply modifiers by stable category order only for diagnostics; the mathematical additive result must be order independent;
- do not let UI calculate final stamina authority.

If current stamina < action cost at commit:
- action rejects EXHAUSTED;
- no partial stamina spend.

---

## 10. Temperature authority

Canonical temperature range 0–100.

Environment target comes from world:
- clear day 50;
- clear night 35;
- Cold Rain day 30;
- Cold Rain night 20;
- valid Habitat shelter target 50.

Base change:
- 6 points/min toward target.

Thermal Wrap:
- while equipped and condition >0;
- harmful movement away from COMFORTABLE range uses 50% base rate;
- no protection once BROKEN.

Technical rule:
- world supplies one canonical EnvironmentExposureView for player position;
- simulation applies deterministic temperature rate;
- presentation does not choose shelter/weather target.

---

## 11. Periodic survival damage

Damage sources:
- severe/critical temperature;
- critical dehydration;
- critical starvation.

Periodic damage uses scheduled next-damage ticks.

On entering a damaging state:
- establish next damage tick from current authoritative tick + approved cadence.

If state improves before due tick:
- cancel/reset corresponding schedule.

If due and state still qualifies:
- emit typed DamageEvent;
- schedule next tick at exact cadence.

This prevents render-frame accumulation and makes replay exact.

---

## 12. Consumable channel authority

Consumables:
- Clean Water;
- Edible Plant;
- Field Dressing.

Channel:
- 60 ticks.

Start validates:
- alive/action-capable;
- item exists in player inventory;
- meaningful-use rule where applicable;
- OperationId/expected inventory revision.

During channel:
- movement/use-state cancellation or hostile damage cancels according to Design.

Completion:
1. revalidate item/revision/state;
2. apply approved survival effect;
3. consume item through P1-TECH-003 item transaction;
4. increment survival + inventory revisions;
5. emit consume-completed event.

If death occurs before completion:
- no item consumed unless completion committed earlier in tick order.

---

## 13. Combat command authority

Client sends only attack intent.

Authority validates:
- player alive/action-capable;
- cooldown;
- stamina;
- equipped weapon/condition for spear.

On attack commit:
- spend stamina immediately;
- set cooldown;
- create stable AttackId / attack-resolution state.

The client cannot send target damage as canonical result.

---

## 14. Unarmed attack

Approved static content:
- range 0.8 footprints;
- frontal arc 90°;
- stamina 10;
- damage 5;
- cooldown 48 ticks.

At resolution:
- choose nearest valid hostile in arc/range;
- deterministic tie-break by stable WorldEntityId if equal distance within exact numeric equality policy;
- one target maximum.

No target:
- whiff;
- stamina/cooldown remain spent;
- no item condition effect.

---

## 15. Spear attack

Approved:
- Basic Spear equipped;
- condition >0;
- stamina >=15;
- range 1.5 footprints;
- arc 90°;
- damage 25;
- cooldown 39 ticks.

Commit:
- spend stamina + start cooldown.

Resolution:
- choose nearest valid hostile;
- if hit:
  - emit/apply 25 damage;
  - reduce spear condition by 1 through item ledger.
- if miss:
  - no damage;
  - no condition loss.

Hit feedback is emitted only from authoritative resolution.

---

## 16. Damage event contract

Conceptual:

```ts
interface DamageEvent {
  readonly damageId: DamageId;
  readonly sourceType:
    | 'hostile-attack'
    | 'severe-temperature'
    | 'critical-temperature'
    | 'critical-dehydration'
    | 'critical-starvation';
  readonly sourceEntityId: WorldEntityId | null;
  readonly targetPlayerId: PlayerId;
  readonly amount: number;
  readonly tick: SimulationTick;
}
```

DamageId must be stable/idempotent for retry/event replication.

Authority applies each DamageId once.

Multiple same-tick damage events use deterministic order:
1. environmental scheduled events sorted by source type stable enum order;
2. hostile attack events sorted by AttackId/WorldEntityId.

After each or after accumulated batch, death trigger semantics must yield exactly one transition. Implementation must prove equivalent final result and single DeathId.

---

## 17. Territorial Predator runtime state

Static tuning comes from P1-TECH-002.

Conceptual:

```ts
interface PredatorRuntimeState {
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
  readonly stateUntilTick: SimulationTick | null;
  readonly encounterAnchor: WorldPosition;
}
```

World owns entity/spatial record.
Combat system coordinates deterministic transitions.

---

## 18. Predator target choice

Eligible active players within encounter/chase rules.

Gameplay preference:
- nearest valid threatening player.

Deterministic tie-break:
1. shortest squared authoritative distance;
2. stable PlayerId lexical/canonical order.

Do not use:
- client latency;
- render order;
- Map insertion order.

Retarget only at approved transition points:
- after attack/recovery;
- target invalid/dead/disconnected/outside rules.

---

## 19. Predator aggression/chase

Approved:
- aggression radius 5 footprints;
- ALERT 24 ticks;
- leash radius 12 footprints;
- outside leash continuously for 120 ticks -> disengage/RETURN.

Authority tracks leash condition in ticks.

No client decides disengage.

RETURN restores encounter behavior according to approved design; it does not automatically resurrect a DEAD predator.

---

## 20. Predator attack

Approved:
- range 1.1 footprints;
- windup 33 ticks;
- damage 20;
- recovery 72 ticks.

At ATTACK WINDUP start:
- lock AttackId and current target identity.

At resolution tick:
- target must still be valid and in range;
- otherwise miss/no damage.

Successful hit creates one DamageEvent keyed to AttackId.

Duplicate transport/event replay cannot damage target twice.

---

## 21. Player death state machine

Conceptual:

```ts
type PlayerLifeState =
  | { readonly type: 'alive' }
  | {
      readonly type: 'dead-pending-respawn';
      readonly deathId: DeathId;
      readonly respawnAtTick: SimulationTick;
      readonly deathCause: DeathCause;
      readonly deathCacheEntityId: WorldEntityId | null;
    };
```

No downed/incapacitated state in Phase 1.

Health <=0 transitions only from `alive`.

If already dead:
- further damage ignored/rejected for death creation;
- no second DeathId/cache.

---

## 22. Stable DeathId

Death transition receives one authority-generated stable DeathId.

DeathId becomes the idempotency root for:
- durability penalty;
- XP loss;
- Death Cache creation;
- item move;
- marker event;
- respawn scheduling.

A repeated death-processing call with same DeathId returns existing committed result.
A player already dead cannot create a new DeathId until respawned/alive and later dies again.

---

## 23. Death transaction boundary

Death is one cross-owner authority transaction.

Inputs snapshot:
- PlayerId;
- DeathId;
- authoritative death position;
- player survival revision;
- player inventory/equipment container revisions;
- progression revision;
- relevant world chunk/entity revision;
- current base respawn anchor.

Commit logical effects:

1. stop locomotion/action channels;
2. Health = 0;
3. record death cause;
4. apply -10 condition to each equipped condition-bearing item, min 0;
5. calculate/apply XP loss exactly once;
6. move all carried/equipped portable items out of player inventory;
7. if portable contents non-empty:
   - create one Death Cache item container;
   - create one world Death Cache entity near death position;
   - link container;
8. if empty inventory:
   - cache may be omitted;
9. set respawnAtTick = death tick + 300;
10. emit death/recovery marker outcome.

Atomicity requirement:
- no externally observable canonical result may contain both player inventory copy and cache copy;
- no cache may be created without matching moved item state;
- durability/XP penalty cannot apply twice.

Implementation may use in-memory command buffer/copy-on-write transaction rather than database transaction, but final publish is all-or-nothing.

---

## 24. Death Cache placement

Primary requested location = authoritative death position.

World validates placement.

If invalid/unreachable:
- world finds nearest valid reachable position within design search target up to 3 footprint widths where possible.

Search algorithm must be deterministic:
- canonical candidate radii/directions/order;
- stable world collision queries;
- exact same world state -> same result.

If no valid location in preferred radius:
- implementation must use a documented safe fallback anchored to nearest valid reachable world position without deleting items.

Exact search geometry implementation is #50 scope and must be test-locked.

---

## 25. Death Cache world/container model

World:

```ts
interface DeathCacheWorldEntity {
  readonly entityId: WorldEntityId;
  readonly deathId: DeathId;
  readonly ownerPlayerId: PlayerId;
  readonly containerId: ContainerId;
  readonly position: WorldPosition;
  readonly revision: number;
}
```

Item ledger:
- team-accessible Death Cache container;
- revisioned like shared Storage Crate.

No timer expiry.

When last item is removed:
- item container becomes empty;
- world removes cache marker/entity in same authoritative operation or deterministic immediate cleanup;
- world/item revisions update consistently.

---

## 26. Death durability penalty

Applies once per DeathId before items enter cache.

Equipped condition-bearing items:
- condition = max(0, condition - 10).

Non-equipped condition-bearing items:
- unchanged.

Item remains even at 0.

Use P1-TECH-003 item ledger mutation; preserve ItemStackId.

---

## 27. Death XP penalty seam

P1-DES-006 formula:
1. current level floor XP;
2. currentLevelProgress = totalXP - floor;
3. if 0 -> loss 0;
4. otherwise loss = max(1, floor(progress * 0.05));
5. totalXP = max(levelFloor, totalXP - loss).

Technical requirements:
- executed once per DeathId;
- progression revision increments if XP changes;
- level/skill/profession/quest completion never removed;
- event ordering: if XP-awarding event committed earlier in same deterministic tick/order, death formula uses resulting XP.

Progression runtime implementation may live with #52, but #50/death needs an explicit public penalty transaction seam; no duplicate private XP formula.

---

## 28. Respawn transition

At `respawnAtTick`:
validate player still in matching dead state/DeathId.

Restore:
- Health 100;
- Water 50;
- Food 50;
- Stamina 100;
- Temperature 50.

Position:
- current valid Phase 1 base/landing respawn anchor from world authority.

Inventory:
- remains empty except canonical state that legitimately exists outside dropped carried inventory; base storage unchanged.

Transition:
- life state -> alive;
- clear attack/use channels/cooldowns as defined by implementation-safe defaults;
- increment player survival revision;
- emit respawn event.

No magic replacement weapon/tool.

---

## 29. Multiple deaths

Each later death after respawn gets a new DeathId and potentially new cache.

Older non-empty caches remain.

If player recovered some old items and carries them before next death:
- those currently carried items move into new cache;
- unrecovered old-cache contents remain in old cache.

No merging of caches merely because owner matches.

---

## 30. Recovery transaction

Recovery is ordinary P1-TECH-003 transfer/pickup from Death Cache container.

Team access:
- owner or teammate can transfer items.

Concurrency:
- cache container revision + OperationId;
- first valid item removal commits;
- stale second command rejects;
- no duplicate quantity.

When teammate recovers:
- item ownership becomes whichever target container receives it;
- owner receives world/read-model update; no phantom copy.

P1-DES-006 "first own Death Cache recovery" personal XP must only trigger when owner personally removes at least one of their own dropped items according to authoritative transfer event.

---

## 31. Save/reopen contract

P1-TECH-008 must persist enough state to reconstruct:

Per player:
- survival numeric states;
- deterministic rate remainders if needed for exact continuation;
- life state;
- active DeathId/respawn tick semantics or normalized safe resume state explicitly defined by Save V2;
- progression XP penalty result, not a pending duplicate side effect.

World:
- predator canonical alive/dead/runtime state required by slice;
- Death Cache entities;
- linked cache containers;
- environment/weather via #40.

Items:
- exact cache/inventory condition/contents via #39.

Critical rule:
load cannot see "player inventory before death" and "death cache after death" as simultaneously valid due to partial save.

Save V2 transaction coordination owns atomic record grouping.

---

## 32. Reconnect contract

Hosted reconnect:
- host/server canonical state continues;
- reconnecting client receives current player/world/cache state;
- client never replays death because local UI believed it had not received acknowledgment.

If client disconnects during recovery:
- committed authority transfer remains;
- retry with same OperationId is idempotent or reconciliation returns current state.

If client disconnects during dead respawn delay:
- host authority decides whether active simulation time continues for that player/session according to P1-TECH-007;
- reconnect never uses client wall clock to skip canonical respawn/death steps.

---

## 33. Replication seam

Replicate read-only:
- survival values/derived warnings;
- life state;
- relevant cooldown/channel feedback;
- predator state/health where readable;
- authoritative damage events;
- death/respawn event;
- Death Cache IDs/markers/container revisions.

Client cannot submit:
- set Health;
- set alive/dead;
- create cache;
- choose XP loss;
- choose durability loss;
- declare predator killed;
- set temperature.

Client submits commands/intents only.

---

## 34. Deterministic replay requirements

Same:
- initial canonical state;
- content compatibility;
- world/environment tape;
- ordered player commands;
- authoritative ticks;

must produce identical:
- survival milli-values/remainders;
- damage schedule;
- attack IDs/results;
- predator state/target decisions;
- Health/death tick;
- DeathId/cache creation outcome;
- XP/condition mutations;
- respawn tick/state.

Golden/replay fixtures required before Phase 1 acceptance.

---

## 35. Same-tick ordering edge cases

### Consume completes same tick as damage
Use stable system order in Section 7.
If consume commits before damage phase, improved stat/Health is canonical before damage.
If hostile damage earlier source contract must resolve in combat phase, order is documented and replay-locked.

### Multiple lethal sources same tick
One player death transition.
All damage events may be recorded for diagnostics, but one deterministic death cause is selected.

Death cause selection rule:
- choose the first lethal-causing DamageEvent in deterministic damage-application order.

### XP award and death same tick
If the event that grants XP committed before death processing, death penalty sees updated XP.
No arbitrary async ordering.

### Weapon hit kills predator and predator attack resolves same tick
Stable combat ordering required by implementation tests.
Recommended:
- process already-scheduled resolution events by resolution tick then stable AttackId.
This may permit both events if both were already validly committed, unless target invalidation before its resolution makes the later event invalid under design.
Exact fixture must document chosen result; no render order.

---

## 36. Failure semantics

### Invalid/stale attack
Reject/no damage.

### Duplicate DamageId
Apply once.

### Duplicate DeathId processing
Return existing result; no extra cache/penalty.

### Death Cache placement initial point invalid
Deterministic nearest-valid fallback; never delete items.

### Cache recovery stale revision
Reject; refresh.

### Persistence failure
Live state remains canonical/dirty; do not revert death or resurrect lost inventory.

### Corrupt cache/save record
Load/materialization fails explicitly; do not silently delete cache/items.

### Missing content definition
Compatibility/validation failure.

---

## 37. Public API direction

Conceptual:

```ts
interface SurvivalAuthority {
  getPlayerSurvival(playerId: PlayerId): Readonly<PlayerSurvivalView>;
  submitUseCommand(command: UseConsumableCommand): CommandResult;
}

interface CombatAuthority {
  submitAttack(command: AttackCommand): CommandResult;
  applyAuthorityDamage(event: DamageEvent): DamageResult;
}

interface DeathAuthority {
  processDeath(input: DeathTransitionInput): DeathTransitionResult;
  processRespawn(playerId: PlayerId, tick: SimulationTick): RespawnResult;
}
```

These are simulation/public-domain contracts, not transport DTOs.

---

## 38. File/module plan

Recommended implementation #50:

```text
src/simulation/survival/
  PlayerSurvivalState.ts
  SurvivalSystem.ts
  DeterministicRateAccumulator.ts
  ConsumableAuthority.ts

src/simulation/combat/
  CombatAuthority.ts
  AttackState.ts
  DamageEvent.ts
  PredatorCombatSystem.ts

src/simulation/death/
  DeathAuthority.ts
  DeathTransition.ts
  RespawnSystem.ts

src/world/entities/
  DeathCacheWorldEntity.ts
  PredatorWorldState.ts
```

Reuse:
- #39 item/container authority;
- #40 world entity/environment authority.

Do not duplicate item/cache storage in combat module.

---

## 39. Test strategy

Required:

### Survival
- exact Water/Food drain after fixed tick counts;
- render FPS variation -> same states;
- offline wall-clock gap -> no survival progression;
- additive stamina penalties exact;
- regen delay exact;
- Thermal Wrap broken/non-broken rate;
- shelter/weather targets exact.

### Damage/combat
- spear commit spends stamina/cooldown on whiff;
- spear condition only on successful hit;
- nearest target deterministic tie-break;
- predator windup escape prevents damage;
- duplicate AttackId/DamageId no double hit;
- leash/disengage exact ticks.

### Death
- simultaneous lethal sources -> one DeathId;
- death penalty applied once;
- equipped condition -10 once;
- inventory exists either player or cache, never both;
- empty inventory may omit cache;
- invalid death point uses deterministic fallback;
- multiple deaths keep separate caches.

### Recovery/concurrency
- owner + teammate race same quantity -> one success;
- stale revision rejects;
- empty cache removal/marker cleanup consistent.

### Persistence/reconnect
- save/reopen preserves survival/cache/condition/XP result;
- corruption fails explicitly;
- reconnect during dead state cannot recreate cache;
- retry same recovery OperationId does not duplicate.

### Determinism
- same input/environment tape -> exact canonical checkpoint.

---

## 40. Deferred

- progression runtime engine details -> #52 implementation / P1-DES-006 source;
- world environment schedule -> #40 P1-TECH-004;
- item/container primitive -> #39 P1-TECH-003;
- wire protocol/reconnect active-player timing -> #43 P1-TECH-007;
- save record layout -> #44 P1-TECH-008;
- numeric performance gates -> #45 P1-TECH-009.

Not included:
- PvP;
- downed/revive;
- dodge/parry;
- ranged weapons;
- status-effect framework;
- advanced AI;
- illness/radiation/oxygen;
- loot tables.

---

## 41. Acceptance criteria self-check

- Client cannot authoritatively decide damage/death/drop/recovery: **PASS**
- Health/Food/Water/Stamina/Temperature owner explicit: **PASS**
- Fixed-step/rate determinism explicit: **PASS**
- Damage/event contract explicit: **PASS**
- Death transition idempotent: **PASS**
- Death Cache item duplication prevented: **PASS**
- Respawn transition explicit: **PASS**
- XP/durability loss transaction explicit: **PASS**
- Recovery/co-op contention explicit: **PASS**
- Persistence/reconnect seams explicit: **PASS**
- Revision/idempotency identities explicit: **PASS**
- Replay/golden requirements explicit: **PASS**
- Approved gameplay values preserved: **PASS**
- Implementation authorization: **NO**
- Blocking open question: **NONE**

---

## 42. Consequences

Benefits:
- survival/combat results replay independently of render/network timing;
- one death cannot create duplicate caches/items;
- recovery shares the same transaction/concurrency model as inventory;
- persistence/network layers have explicit stable identities.

Costs:
- fixed-point/remainder state must be preserved;
- death is a multi-owner transaction rather than simple HP<=0 callback;
- attack/damage/death events need IDs and deterministic order.

Accepted because recoverable failure and hosted co-op make duplicate/partial death state unacceptable.

---

## 43. Implementation authorization

**NOT AUTHORIZED by P1-TECH-005.**

---

## 44. Handoff

**Task:** P1-TECH-005  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-005-survival-combat-death-authority.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** verify DoD/AC and mark TECH READY if accepted.  
**Project Owner decision required:** NONE.
