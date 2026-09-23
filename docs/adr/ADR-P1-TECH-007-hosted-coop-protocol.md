# ADR-P1-TECH-007 — Hosted Co-op 2–4 Session, Replication, and Authority Protocol

**Task:** P1-TECH-007 / Issue #43  
**Role:** Technical Lead / Game Architect  
**Milestone:** Phase 1 — Vertical Slice  
**Status:** TECHNICAL DECISION RECORDED — READY FOR PRODUCER VERIFICATION  
**Depends on:** P1-TECH-001 / #31, P1-DES-001 / #29, P1-TECH-003..006 / #39..#42  
**Implementation authorization:** NONE — ADR only.

---

## 1. Context

Phase 1 must support one persistent world in solo and hosted co-op with the same gameplay rules.

Operational Phase 1 target:
- 2–4 players.

Broader product direction:
- hosted co-op up to 10 players.

The protocol must support:
- current-world join;
- disconnect/rejoin;
- player/session identity;
- continuous movement intent;
- discrete item/world/build/combat commands;
- shared discovery;
- replicated personal/shared state;
- stale/duplicate/out-of-order handling;
- contention on shared resources/containers/build positions;
- death/recovery;
- persistence/save coordination;
- explicit connection/save failure feedback.

It must not:
- move gameplay authority to clients;
- duplicate simulation rules in transport code;
- build production matchmaking/fleet orchestration;
- require advanced prediction/reconciliation to pass Phase 1.

---

## 2. Decision summary

1. **Hosted authority runs in a headless ServerAuthorityHost using the same simulation/world/content contracts as solo LocalAuthorityHost.**
2. **Transport is replaceable and non-authoritative.**
3. **Phase 1 network transport profile is reliable ordered WebSocket with UTF-8 JSON protocol V1.**
4. **Wire DTO/schema lives in a shared protocol module; simulation/world do not depend on wire protocol.**
5. **PlayerId is durable gameplay identity; ConnectionId is ephemeral transport identity.**
6. **Opaque server-issued ResumeCredential binds a client to an existing PlayerId without introducing a production account system.**
7. **Every connection has monotonic client/server message sequences; continuous movement has its own monotonic input sequence.**
8. **Retryable discrete gameplay mutations retain stable OperationId semantics from P1-TECH-003.**
9. **Server assigns authoritative ingress order; client timestamps never determine conflict winner.**
10. **Join/rejoin is baseline-snapshot first, then revisioned incremental updates.**
11. **Canonical shared aggregates replicate as full revisioned aggregate views/tombstones, not client-authored patches.**
12. **One-off events are feedback only; canonical snapshots/revisions remain source of truth.**
13. **Disconnect neutralizes movement/input but does not roll back committed gameplay or grant hidden immunity/pause.**
14. **A committed live-authority result is distinct from a durably saved result.**
15. **Session shutdown explicitly drains/commits/saves or reports save failure; abrupt disconnect never pretends success.**
16. **Protocol structures are capacity-configurable and contain no hard-coded 4-player schema, preserving a future 10-player path.**

---

## 3. Architecture

### Solo

```text
Client Input/UI
  -> LocalAuthorityHost
  -> AuthorityRuntime
  -> World / Simulation / Content
  -> Snapshot/View
  -> Client Presentation
```

### Hosted

```text
Client Input/UI
  -> Client Transport Adapter
  -> WebSocket
  -> Server Transport Adapter
  -> ServerAuthorityHost
  -> same AuthorityRuntime
  -> World / Simulation / Content
  -> Persistence
  -> Replication/View Builder
  -> WebSocket
  -> Client Read Models / Presentation
```

Gameplay rules remain in shared authority modules.

Server transport code may:
- validate wire schema;
- bind a connection to PlayerId;
- sequence/enqueue commands;
- serialize read models.

It may not:
- decide crafting output;
- mutate inventory directly;
- validate building geometry itself;
- decide damage/death;
- reveal fog;
- create machine output;
- write alternative world state.

---

## 4. Module placement

P1-TECH-007 explicitly refines the Phase 1 technical layout with two non-domain boundaries:

```text
src/
  protocol/
    v1/
  server/
    session/
    network/
    runtime/
```

### `src/protocol/`

Purpose:
- JSON-compatible message envelopes;
- protocol enums/version constants;
- serialized DTO shapes;
- schema validation helpers if transport-neutral.

Rules:
- contains no gameplay mutation logic;
- no Pixi/DOM/IndexedDB;
- no simulation/world internals;
- domain IDs are serialized as strings/numbers;
- simulation/world/content/persistence do not import protocol.

### `src/server/`

Purpose:
- ServerAuthorityHost composition;
- session lifecycle;
- connection/player binding;
- WebSocket adapter;
- replication orchestration;
- persistence coordination.

Allowed:
- public simulation/world/content/persistence APIs;
- protocol DTOs.

Forbidden:
- Pixi/client UI imports;
- duplicated gameplay implementations;
- direct private-domain mutation.

### Client

`src/client/network/` may import protocol and public read-model types.

Solo remains able to run without `src/server/`.

---

## 5. Protocol version

```ts
export const HOSTED_PROTOCOL_VERSION = 1 as const;
```

Protocol version changes when message meaning/shape becomes incompatible.

Protocol version is separate from:
- content schema/pack version;
- content fingerprint;
- save schema version;
- world generation version;
- RNG algorithm version;
- seed-derivation version.

No implicit feature negotiation in Phase 1.

---

## 6. Transport profile

Phase 1 uses:
- reliable;
- ordered;
- bidirectional WebSocket;
- UTF-8 JSON text messages.

Reason:
- browser support;
- simple debugging/test evidence;
- reliable ordering;
- no need for custom UDP reliability during the vertical slice.

WebSocket library choice is implementation detail.

Protocol/domain contracts must remain replaceable by a future binary/alternate transport.

---

## 7. Common wire envelope

Conceptual client envelope:

```ts
interface ClientEnvelopeV1 {
  readonly protocolVersion: 1;
  readonly messageType: ClientMessageTypeV1;
  readonly clientMessageSeq: number;
  readonly sessionId?: string;
  readonly connectionId?: string;
  readonly payload: JsonValue;
}
```

Server envelope:

```ts
interface ServerEnvelopeV1 {
  readonly protocolVersion: 1;
  readonly messageType: ServerMessageTypeV1;
  readonly serverMessageSeq: number;
  readonly sessionId: string;
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly payload: JsonValue;
}
```

Rules:
- sequences are safe non-negative integers;
- message sequence is monotonic per live connection;
- unknown/invalid fields/types reject before authority enqueue;
- client message sequence is transport ordering only, not gameplay conflict priority across clients;
- server sequence gaps trigger client resync behavior.

---

## 8. Session identity

### SessionId

Ephemeral identity for one hosted session instance.

### SessionEpoch

Changes whenever the authority process/session is rebuilt/restarted for the same persistent world.

Purpose:
- invalidate old delta baselines;
- prevent clients from replaying pending operations blindly across a host restart.

### WorldId

Durable persistent-world identity owned by persistence/world manifest.

SessionId != WorldId.

---

## 9. Player identity

### PlayerId

Durable gameplay identity for one player record in the persistent world.

PlayerId owns:
- personal survival state;
- inventory/equipment;
- XP/progression;
- death/respawn state.

### ConnectionId

Ephemeral identity for one live network connection.

A reconnect receives a new ConnectionId but may reclaim the same PlayerId.

### Actor binding

Server binds ConnectionId -> PlayerId.

Client gameplay messages do not get to impersonate arbitrary actor PlayerIds.

If a wire payload includes actor identity for diagnostics, server ignores/rejects mismatch and uses the bound PlayerId.

---

## 10. Resume credential

Phase 1 has no account/auth platform.

Use an opaque server-issued `ResumeCredential`:
- generated with cryptographically strong nondeterministic randomness outside simulation;
- bound to WorldId + PlayerId;
- never used as gameplay RNG;
- never logged in plaintext;
- accepted only by the authority host.

Purpose:
- same-session reconnect;
- optional saved-world resume across a restarted session if P1-TECH-008 persists the credential binding/metadata.

Exact secure storage/hash format is implementation/save-detail scope.

A bare PlayerId is never sufficient to reclaim a player.

---

## 11. Session capacity

Session config:

```ts
interface HostedSessionConfig {
  readonly maxPlayers: number;
}
```

Phase 1 acceptance config:
- 2–4 active players.

Architecture constraint:
- maxPlayers may be configured up to 10;
- protocol payloads use variable collections keyed by IDs;
- no fixed `player1..player4` fields;
- no four-slot gameplay assumptions.

Performance certification for 10 players is not Phase 1 acceptance scope.

---

## 12. Server session lifecycle

States:

```text
STARTING
-> OPEN
-> DRAINING
-> SAVING
-> CLOSED

or FAILED
```

### STARTING

- load/validate content;
- load/create persistent world;
- reconstruct authority unpublished;
- bind server transport;
- no gameplay join until authority is coherent.

### OPEN

- compatible joins accepted;
- commands/input processed.

### DRAINING

Graceful close:
- reject new joins;
- stop accepting new gameplay operations after cutoff;
- finish current authoritative tick/accepted operations;
- neutralize live movement intent;
- prepare stable save snapshot.

### SAVING

- persist committed authority state;
- do not report successful session save before persistence confirms.

### CLOSED

- broadcast explicit closure result when possible;
- close connections.

### FAILED

- explicit failure state;
- no false save/commit success message.

---

## 13. Host-player versus authority host

A human who started the session is not gameplay authority.

The server/host process remains authority.

If the initiating player's connection drops:
- session authority does not migrate to another client;
- session may continue while server process remains alive;
- no client becomes canonical.

Host migration is a Phase 1 non-goal.

---

## 14. Compatibility handshake

Before PlayerId allocation/resume and before gameplay commands:

Client sends `ClientHelloV1` containing:

- protocolVersion;
- optional client build/commit string for diagnostics;
- ContentCompatibilityIdentity:
  - formatId;
  - schemaVersion;
  - packId;
  - packVersion;
  - canonicalFingerprint;
- world-generation compatibility supported by client:
  - worldGenerationVersion;
  - rngAlgorithmVersion;
  - seedDerivationVersion;
- optional ResumeCredential.

Server validates against current hosted world/runtime.

Phase 1 requires exact compatibility for:
- protocol;
- content identity;
- generation/RNG/seed-derivation identity needed by client world presentation/base reconstruction.

Save schema version is host persistence detail and is not a client compatibility requirement.

---

## 15. Handshake rejection reasons

Stable reasons:

- PROTOCOL_MISMATCH
- CONTENT_MISMATCH
- WORLD_GENERATION_MISMATCH
- SERVER_STARTING
- SESSION_CLOSING
- SESSION_FULL
- INVALID_RESUME_CREDENTIAL
- PLAYER_ALREADY_CONNECTED
- PLAYER_STATE_UNAVAILABLE
- INVALID_HELLO

Rejected client receives no authoritative gameplay state.

---

## 16. New join flow

1. transport connects;
2. client sends ClientHello;
3. compatibility validates;
4. server allocates/binds PlayerId under current world rules;
5. server returns SessionAccepted metadata + ResumeCredential;
6. server starts baseline snapshot transfer;
7. client validates/applies complete baseline;
8. client sends BaselineApplied(snapshotId);
9. server marks connection READY;
10. gameplay input/commands accepted.

Joining player enters the current persistent world state.

No private world reset/copy is created.

---

## 17. Rejoin flow

1. new transport connection;
2. ClientHello with ResumeCredential;
3. host resolves same durable PlayerId;
4. prior ConnectionId is invalidated if stale;
5. server creates new ConnectionId;
6. server sends fresh baseline snapshot from current authority;
7. client discards old delta baseline/pending local canonical assumptions;
8. client confirms baseline;
9. optional OperationStatus queries reconcile operations accepted before disconnect;
10. connection becomes READY.

Client does not replay old commands automatically merely because acknowledgment was lost.

---

## 18. Graceful leave

Client may send LeaveSession.

Server:
- stops accepting new player commands;
- neutralizes held movement/input;
- retains durable player/world state;
- closes connection cleanly.

Leave does not:
- drop inventory;
- respawn;
- heal;
- roll back committed actions;
- transfer authority.

---

## 19. Unexpected disconnect

On transport loss:

1. server marks connection disconnected;
2. latest movement input lease becomes neutral immediately;
3. no new commands accepted for that connection;
4. already committed canonical state remains;
5. already authority-accepted operations may complete according to authoritative queue/tick order;
6. unaccepted client-side intentions are not assumed successful;
7. player gameplay state remains canonical for rejoin;
8. session/shared world continues.

Important:
disconnect does **not** grant a hidden survival/combat pause or invulnerability while the authority session is still running.

With no player input:
- movement is neutral;
- ordinary survival/environment/hostile authority continues under existing gameplay rules.

This preserves P1-DES-001 "same rules" rather than introducing a network-disconnect gameplay exploit.

---

## 20. Continuous movement input

Client sends logical held movement state, not positions.

Conceptual:

```ts
interface MovementInputV1 {
  readonly inputSeq: number;
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}
```

Rules:
- inputSeq monotonic per connection;
- server ignores/rejects inputSeq <= latest accepted;
- authority consumes latest accepted logical movement state on fixed ticks;
- client never sends final world position/velocity;
- focus/visibility loss sends neutral input immediately where possible.

---

## 21. Movement input lease

To prevent stuck movement if a browser stalls while WebSocket remains nominally open:

Client sends movement state:
- immediately when held-state changes;
- plus periodic refresh while READY.

Phase 1 constants:
- refresh at least once every 15 authority-tick equivalents (~250 ms nominal);
- authority movement lease = 60 ticks (1 second).

If no fresh movement snapshot arrives before lease expiry:
- server neutralizes movement intent.

Lease timing uses server authoritative ticks/time, not client timestamp.

P1-TECH-009 may tighten cadence only through explicit performance/latency evidence without changing ownership.

---

## 22. Movement replication

Server sends tick-stamped authoritative motion views:

```ts
interface PlayerMotionViewV1 {
  readonly playerId: string;
  readonly authorityTick: number;
  readonly lastProcessedInputSeq: number;
  readonly position: { readonly x: number; readonly y: number };
  readonly facing: string;
  readonly locomotionState: string;
}
```

Client:
- renders/interpolates authoritative motion;
- may use `lastProcessedInputSeq` for future prediction work.

Phase 1 does not require gameplay-affecting client prediction.

Protocol intentionally preserves a future reconciliation seam without making predicted state canonical.

---

## 23. Discrete gameplay command envelope

Conceptual:

```ts
interface GameplayCommandEnvelopeV1 {
  readonly operationId: string;
  readonly commandType: string;
  readonly expectedRevisions: readonly ExpectedRevisionV1[];
  readonly payload: JsonValue;
}
```

Used for:
- item/container operations;
- gather completion/action commands;
- craft/repair;
- ruin interactions;
- combat attack intent where OperationId is appropriate;
- building;
- machine enable/disable;
- dismantle;
- cache recovery.

Exact domain commands remain owned by subsystem public APIs.

Transport maps wire DTO -> domain command.

---

## 24. Command acceptance and authoritative order

After:
- wire validation;
- connection/player binding;
- session state check;

server assigns one monotonically increasing `authorityIngressOrdinal`.

Accepted commands are queued for authority processing.

Within the same authority tick:
- process by authorityIngressOrdinal.

Cross-client network arrival order may differ in real life.
That is acceptable.

Determinism guarantee is:

> given the same ordered accepted command stream and same initial state, the authoritative result is identical.

For replay/debug, accepted ordinal/tick are observable.

Client timestamp never decides who wins a shared contention.

---

## 25. OperationId lifecycle

P1-TECH-003 semantics remain:

Same OperationId + equivalent command:
- apply at most once;
- return retained prior result/status.

Same OperationId + different payload:
- OPERATION_ID_CONFLICT.

Phase 1 host retains OperationId -> authoritative result for the active SessionEpoch.

On reconnect within same SessionEpoch:
- client may query OperationStatus.

Across a new SessionEpoch after host restart:
- client must baseline-resync;
- client does not automatically resend old unconfirmed commands.

Operations with canonical persistent identity such as:
- placed StructureId;
- DeathId;
- machine-cycle identity;
retain their own subsystem-level duplication protection across persistence.

---

## 26. Transport sequence versus OperationId

These solve different problems.

### clientMessageSeq

- per live connection;
- transport duplicate/order detection;
- resets with new ConnectionId.

### inputSeq

- per live connection;
- latest continuous movement state.

### OperationId

- semantic gameplay mutation identity;
- survives reconnect within active SessionEpoch;
- protects against duplicate effect.

Do not substitute one for another.

---

## 27. Command result

Conceptual:

```ts
interface CommandResultV1 {
  readonly operationId: string;
  readonly status: 'committed' | 'rejected';
  readonly acceptedAuthorityTick: number;
  readonly committedAuthorityTick?: number;
  readonly reason?: string;
  readonly resultingRevisions?: readonly RevisionRefV1[];
}
```

Important:
`committed` means committed to current live authority.

It does **not** mean durably saved to storage.

Durability is reported separately.

---

## 28. Baseline snapshot

Every READY connection begins from a complete authoritative baseline.

Conceptual snapshot header:

```ts
interface BaselineSnapshotHeaderV1 {
  readonly snapshotId: string;
  readonly sessionEpoch: string;
  readonly authorityTick: number;
  readonly worldId: string;
  readonly playerId: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly durableSaveRevision: number | null;
}
```

Baseline contains the authoritative read models needed by that client:
- own player personal state;
- teammate public state;
- shared foothold/building/power/machine state;
- shared fog/discovery state;
- relevant materialized world/chunk entities;
- relevant drops/death caches;
- allowed container views;
- environment/day/weather state.

Large snapshot may be segmented over multiple messages under one snapshotId.

No gameplay commands until BaselineApplied.

---

## 29. Replication classes

Use three distinct output classes.

### A. Motion snapshots

Tick-stamped full motion state.
High-frequency ephemeral view.
Not persistence revision.

### B. Revisioned aggregate state

Canonical shared/personal aggregate views:
- container;
- player survival/progression;
- resource node;
- exploration fragment;
- ruin;
- world entity;
- Death Cache;
- foothold;
- structure;
- power network;
- machine.

Each includes:
- aggregate type;
- stable aggregate ID;
- monotonic revision;
- full client-authorized view.

Updates are **full replacement views for that aggregate revision**, not order-sensitive patches.

### C. Domain events

Feedback:
- item transaction result;
- damage/hit;
- death/respawn;
- discovery notification;
- build result;
- machine production/collection.

Events improve UI/readability but are not canonical source of truth.

If event is missed, later aggregate state still reconstructs correct gameplay state.

---

## 30. Aggregate update contract

Conceptual:

```ts
interface AggregateStateV1 {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
  readonly payload: JsonValue;
}
```

Client behavior:
- revision > local: replace local read model;
- revision == local: duplicate, ignore safely;
- revision < local: stale, ignore;
- unknown dependency/reference or protocol sequence gap: request targeted/full resync.

Client never increments canonical revision itself.

---

## 31. Aggregate removal/tombstone

Conceptual:

```ts
interface AggregateRemovedV1 {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly revision: number;
}
```

Client retains tombstone revision for the current snapshot/session baseline so an older delayed state cannot resurrect a removed:
- drop;
- cache;
- structure;
- world entity.

---

## 32. Server message sequence and resync

Server message sequence is monotonic per connection.

WebSocket should preserve ordering.

If client observes:
- missing sequence;
- malformed dependency;
- impossible aggregate revision relation;
- changed SessionEpoch;

client enters RESYNCING:
- stops sending gameplay commands;
- may send neutral movement;
- requests fresh baseline/targeted resync.

It does not "repair" canonical state locally.

---

## 33. Interest scope

Protocol is interest-scoped so future 10-player sessions are not forced to receive all world data every update.

Always relevant:
- own personal state;
- teammate public presence/motion;
- shared foothold/building/power/machine state needed by HUD;
- global/shared discovery notifications.

Spatially relevant:
- nearby/materialized chunks/entities;
- resources;
- hostile;
- drops/death caches.

Interaction relevant:
- contents of own inventory;
- currently authorized/open shared container;
- Condenser output when in allowed view/use context.

Fog:
- canonical exploration fragments may stream by changed region/chunk revision;
- map UI may request/baseline known explored fragments.

Exact interest radius/cadence is P1-TECH-009/#54 implementation tuning.

Authority world streaming is not derived from client camera.

---

## 34. Shared discovery replication

When world authority commits shared reveal/discovery:
- affected exploration fragment revision changes;
- host publishes revisioned exploration state;
- meaningful landmark discovery emits readable DomainEvent.

Teammate does not need to be physically near discoverer to learn approved shared knowledge.

Client cannot submit:
- mark fog explored;
- mark ruin located/investigated as final result.

Client submits movement/interaction intent only.

---

## 35. Shared container/item contention

Two clients may submit commands against same aggregate.

Resolution:
1. server accepts/enqueues in authoritative ingress order;
2. first command whose expected revisions remain valid may commit;
3. aggregate revisions increment;
4. later stale command rejects STALE_REVISION / domain conflict;
5. no duplicate quantity.

Clients reconcile from:
- CommandResult;
- resulting AggregateState.

No client-side merge of canonical inventories.

---

## 36. Concurrent building contention

P1-TECH-006 applies.

Two overlapping placements:
- authority ingress order establishes evaluation order;
- first valid commit changes Foothold buildRevision/world occupancy;
- later command fails stale/position-taken;
- losing Kit remains.

Same OperationId retry:
- no second structure;
- no second Kit consumption.

---

## 37. Machine contention

Shared Condenser:
- enable/disable commands use structure/machine revision;
- output collection uses container revision;
- cycle output uses stable machine-cycle identity.

Concurrent collection:
- first valid item transfer wins;
- stale loser refreshes.

Client cannot create Clean Water or set machine progress.

---

## 38. Combat/death replication

Host/server owns:
- attack acceptance;
- damage;
- hostile state;
- death;
- DeathId;
- durability/XP penalty;
- Death Cache creation;
- respawn.

Replicate:
- relevant attack/damage feedback;
- player life/survival view revisions;
- hostile aggregate view;
- Death Cache world marker/container revision;
- respawn outcome.

Client death animation is presentation only.

---

## 39. Disconnect during item/build/death operation

Three states matter:

### Not accepted by server

Client cannot assume success.

On reconnect:
- baseline is truth;
- user may issue a new operation if still desired.

### Accepted but not yet committed when connection drops

Operation remains in authority queue and may commit/reject normally.

On reconnect:
- query OperationId/status;
- baseline/revisions remain canonical.

### Already committed but response lost

Rejoin baseline shows committed result.
OperationStatus for same OperationId returns prior result.
Client must not re-create effect locally.

This applies to:
- transfer;
- pickup/drop;
- craft/repair;
- building;
- dismantle;
- ruin inspect;
- machine enable/collect;
- death-cache recovery.

---

## 40. Disconnect during death/respawn

Disconnect does not cancel a committed/ongoing death transition.

If player dies while disconnected:
- DeathId/cache/XP/durability effects remain canonical.

Respawn timing follows authoritative session ticks.

Rejoin receives:
- current life state;
- cache state;
- resulting inventory/progression/survival state.

No death transition replay.

---

## 41. Persistence ownership

Only ServerAuthorityHost writes canonical hosted-world saves.

Remote clients:
- never save authoritative world;
- never upload replacement world state.

Persistence consumes committed authority DTOs.

Network transport never directly writes IndexedDB/save records.

---

## 42. Durability checkpoint

Because live commit != durable save, host exposes:

```ts
interface DurabilityCheckpointV1 {
  readonly authorityTick: number;
  readonly durableSaveRevision: number;
}
```

Meaning:
- all canonical state included in that save revision was durably committed according to P1-TECH-008.

Client may show session-save status from this metadata.

A CommandResult does not imply its exact operation is durable until a later checkpoint that includes it according to save semantics.

P1-TECH-008 defines root save revision/snapshot boundaries.

---

## 43. Graceful session shutdown

Server:

1. transition OPEN -> DRAINING;
2. reject new joins;
3. stop accepting new gameplay commands after announced cutoff;
4. finish currently accepted authoritative tick/operations;
5. neutralize movement;
6. create persistence snapshot;
7. enter SAVING;
8. attempt durable save;
9. on success:
   - broadcast SessionClosing with save status SUCCESS + durable revision;
   - close;
10. on failure:
   - broadcast/save-log SAVE_FAILED where possible;
   - do not claim safe persistence;
   - remain live/retry if operational policy permits, otherwise close FAILED explicitly.

Exact retry policy is P1-TECH-008/#54 operational implementation.

---

## 44. Abrupt server/process failure

Clients observe transport/session failure.

They must not see:
- fabricated save success;
- local world promoted to authority;
- host migration.

On next hosted start:
- authority loads last durable valid save;
- new SessionEpoch;
- clients baseline-resync.

Unconfirmed operations after last durable checkpoint may be absent after process loss; UI/debug information must not misrepresent them as durably preserved.

---

## 45. Rejoin after new SessionEpoch

Old:
- connection sequence;
- snapshot baseline;
- pending local deltas;
- in-memory OperationId cache;

are invalid.

Client:
1. performs compatibility handshake;
2. obtains/reclaims PlayerId through valid resume binding;
3. receives current baseline from durable/current authority;
4. discards old pending canonical assumptions;
5. does not auto-replay old SessionEpoch commands.

Subsystem-persisted identities still prevent duplicate persistent effects where defined.

---

## 46. Ping/latency diagnostics

Application-level Ping/Pong messages provide:
- round-trip estimate;
- connection liveness diagnostics.

RTT:
- is observability only;
- never changes gameplay outcomes;
- never decides contention ordering.

P1-TECH-009 defines cadence/threshold/evidence.

---

## 47. Desync diagnostics

Server periodically may emit an `AuthorityCheckpointV1`:

- authorityTick;
- sessionEpoch;
- selected aggregate revisions;
- optional deterministic state digest defined by P1-TECH-009.

Client reports:
- last applied serverMessageSeq;
- last applied authorityTick;
- selected aggregate revisions/digest.

Mismatch:
- increments diagnostics;
- requests resync;
- never makes client state canonical.

Exact hash algorithm/cadence is P1-TECH-009.

---

## 48. Backpressure / slow client behavior

Authoritative simulation must not stall because one client cannot consume outbound data.

Transport tracks:
- outbound queued bytes/messages;
- snapshot backlog;
- last acknowledged/applied sequence if used.

If client exceeds bounded backpressure policy:
- attempt explicit SLOW_CLIENT / RESYNC_REQUIRED;
- disconnect if necessary.

World authority continues for other clients.

Exact thresholds are P1-TECH-009.

---

## 49. Wire validation and trust boundary

All network payloads are untrusted.

Validate before authority enqueue:
- protocol version;
- message shape/type;
- finite numbers;
- safe integer sequences/revisions;
- string/ID syntax/length bounds;
- payload size;
- connection/session binding;
- referenced content compatibility;
- command-specific public validation.

Never trust client:
- position;
- velocity;
- item count;
- damage amount as final authority;
- death result;
- fog state;
- structure validity;
- machine progress;
- save revision.

---

## 50. Resume-token security scope

ResumeCredential:
- cryptographically random;
- treated as secret;
- transmitted only over deployment transport expected to be TLS/WSS outside local dev;
- raw token not written to ordinary diagnostics;
- server stores binding/hash according to implementation.

This is sufficient for the Phase 1 hosted test path.

Accounts, OAuth, password recovery, anti-cheat, moderation, bans and production authorization are non-goals.

---

## 51. Protocol rejection taxonomy

Transport/session:
- INVALID_MESSAGE
- PROTOCOL_MISMATCH
- NOT_READY
- SESSION_FULL
- SESSION_CLOSING
- INVALID_CONNECTION
- INVALID_RESUME_CREDENTIAL
- PLAYER_ALREADY_CONNECTED
- CLIENT_SEQUENCE_STALE
- INPUT_SEQUENCE_STALE
- RATE_LIMITED
- RESYNC_REQUIRED

Gameplay mapping:
- STALE_REVISION
- OPERATION_ID_CONFLICT
- plus subsystem rejection reasons from #39–#42.

Transport errors do not replace subsystem rejection semantics.

---

## 52. Replication privacy/read-model boundary

A client receives only read models needed by gameplay/UI.

Personal:
- full own personal state.

Teammates:
- public/readable state required by UI/design;
- not arbitrary internal simulation details.

Shared aggregates:
- only authorized shared views.

Protocol never serializes:
- private mutable internal objects;
- server persistence adapters;
- RNG internals;
- Pixi/client objects;
- raw ResumeCredential of another player.

---

## 53. Session/world save interaction

World remains live authority while OPEN.

Autosave cadence is not defined by this ADR.

When persistence runs:
- take a coherent committed snapshot/revision;
- gameplay may continue if P1-TECH-008 supports asynchronous snapshot saving;
- stale save completion cannot overwrite/clear newer dirty state.

Disconnect of one player does not transfer save responsibility.

---

## 54. No host migration

Phase 1 explicitly does not migrate ServerAuthorityHost state to another player/client.

If server authority is gone:
- session ends/fails;
- restart creates new SessionEpoch from durable state.

This avoids accidental peer-authoritative architecture.

---

## 55. No advanced client prediction requirement

Phase 1 acceptance does not require:
- client-authoritative prediction;
- rollback netcode;
- combat rewind;
- server-side lag compensation;
- client reconciliation engine.

Protocol carries:
- inputSeq;
- lastProcessedInputSeq;
- authorityTick;

so future prediction/reconciliation can be added without replacing the authority model.

---

## 56. Replication cadence

Protocol does not hard-code frame/tick cadence into message schema.

Implementation may use:
- movement snapshots at a higher cadence;
- aggregate updates on change/coalesced;
- events immediately after authoritative commit.

P1-TECH-009 defines numeric latency/bandwidth/update-rate acceptance gates.

The server authoritative simulation remains 60 Hz regardless of replication cadence.

---

## 57. Replay/debug ordering

Development logs/evidence for an accepted gameplay command should be able to identify:

- SessionId;
- SessionEpoch;
- ConnectionId;
- PlayerId;
- clientMessageSeq;
- OperationId if present;
- authorityIngressOrdinal;
- accepted authority tick;
- committed/rejected tick;
- expected/actual revisions;
- result reason.

This allows a deterministic command stream to be reproduced without treating network arrival time as domain state.

---

## 58. Architecture for future 10-player sessions

The following prevent a structural 4-player ceiling:

- ID-keyed player maps, not fixed slots;
- configurable maxPlayers;
- per-client interest scope;
- revisioned aggregate replication;
- no broadcast of all container contents by default;
- world/chunk interest independent per player;
- transport connection state separate from PlayerId;
- O(1)/bounded aggregate conflict checks;
- no client-host gameplay ownership.

Phase 1 still only certifies 2–4 operational play.

---

## 59. Implementation file plan

Recommended for #54:

```text
src/protocol/v1/
  ProtocolVersion.ts
  EnvelopeV1.ts
  HandshakeV1.ts
  SessionMessagesV1.ts
  InputMessagesV1.ts
  CommandMessagesV1.ts
  ReplicationMessagesV1.ts
  ProtocolValidationV1.ts

src/server/runtime/
  ServerAuthorityHost.ts

src/server/session/
  HostedSession.ts
  PlayerConnectionBinding.ts
  OperationResultCache.ts
  ReplicationCoordinator.ts

src/server/network/
  WebSocketServerTransport.ts

src/client/network/
  HostedClientConnection.ts
  WebSocketClientTransport.ts
  ClientReplicationStore.ts
```

Lint boundaries must be extended so:
- protocol cannot import client/server/domain internals;
- simulation/world cannot import protocol/server;
- server cannot import client/Pixi;
- client cannot import server.

---

## 60. Required Phase 1 tests

### Handshake/session
1. compatible 2-player join succeeds;
2. 4-player session succeeds;
3. fifth player rejected when maxPlayers=4;
4. protocol mismatch rejects;
5. content fingerprint mismatch rejects;
6. generation/RNG mismatch rejects;
7. resumed connection reclaims same PlayerId;
8. invalid ResumeCredential rejects;
9. no hard-coded four-slot schema; config structurally accepts maxPlayers=10.

### Movement
10. client position payload cannot authoritatively move player;
11. movement inputSeq stale/duplicate ignored;
12. input lease expiry neutralizes movement;
13. disconnect neutralizes movement;
14. same movement input tape yields authority-equivalent movement to solo rules.

### Commands/contention
15. duplicate OperationId applies once;
16. same OperationId/different payload rejects;
17. stale container revision rejects;
18. two clients pick same drop -> one commit;
19. two clients race same container quantity -> one commit;
20. two clients compete for placement -> one commit, loser keeps Kit;
21. concurrent Condenser collection preserves exact item total.

### Shared world/fog
22. one player reveal appears to teammate through shared fog replication;
23. ruin discovery replicated without teammate teleport;
24. resource/world revision survives rejoin baseline;
25. stale aggregate update cannot overwrite newer client read model;
26. tombstone prevents stale removed entity resurrection.

### Disconnect/rejoin
27. disconnect after command accepted/before response -> one final outcome;
28. reconnect does not replay item/build operation;
29. disconnect during death does not duplicate Death Cache;
30. reconnect receives current dead/respawn/cache state;
31. disconnect during recovery does not duplicate transferred item.

### Save/session end
32. CommandResult COMMITTED is distinguishable from durability checkpoint;
33. graceful shutdown reports successful save only after persistence success;
34. save failure produces explicit failure, not success;
35. new SessionEpoch forces baseline resync/no old auto-replay.

### Replication/desync
36. server sequence gap triggers resync;
37. duplicate aggregate revision is harmless;
38. stale aggregate revision ignored;
39. slow-client backpressure does not stall authoritative simulation;
40. RTT/desync diagnostics do not alter gameplay result.

---

## 61. Failure modes considered

### Client sends invalid JSON/schema
Reject before authority.

### Duplicate WebSocket message
Transport sequence handles envelope; OperationId handles semantic mutation.

### Out-of-order/stale client command
Sequence/revision checks reject/ignore as appropriate.

### Response lost
OperationId/status + baseline reconcile.

### Network disconnect mid-transaction
Authority accepted/committed status determines truth.

### Player reconnects twice
Only one READY connection may bind a PlayerId at once.

### Client has old content
Handshake rejects.

### Client has correct packVersion but drifted content
Fingerprint rejects.

### Client misses world updates
Sequence/revision detects; resync.

### Server crashes
No client promotion; restart from last durable save with new SessionEpoch.

### Persistence fails at shutdown
Explicit failure; no fabricated durable success.

### Client stalls while holding movement
Input lease neutralizes.

### Slow client
Disconnect/resync without stopping authority.

---

## 62. Observability requirements

Per session:
- SessionId/Epoch;
- WorldId;
- status;
- connected/ready player count;
- maxPlayers;
- authority tick;
- last durable save revision.

Per connection:
- ConnectionId/PlayerId;
- handshake result;
- RTT;
- last client/server sequence;
- last movement inputSeq;
- input lease expiry count;
- outbound backlog;
- resync count.

Per command:
- OperationId;
- command type;
- ingress ordinal;
- accepted/commit tick;
- stale/duplicate/reject reason;
- resulting revisions;
- latency.

Per replication:
- aggregate updates by kind;
- bytes/messages;
- baseline size/time;
- stale/duplicate update count;
- state-digest mismatch.

Per persistence:
- save start/end;
- revision;
- success/failure;
- duration.

P1-TECH-009 defines retained artifact format and numeric gates.

---

## 63. Non-goals

Not Phase 1:
- matchmaking service;
- server browser;
- NAT traversal/peer hosting;
- host migration;
- production dedicated-server orchestration;
- account platform;
- anti-cheat product;
- moderation;
- voice chat;
- spectator mode;
- PvP;
- advanced prediction/reconciliation;
- lag compensation/rewind;
- binary compression protocol;
- production autoscaling;
- offline client authority.

---

## 64. Acceptance criteria self-check

- Critical game state remains host/server authoritative: **PASS**
- Solo and hosted use same domain runtime/rules: **PASS**
- Host/session lifecycle explicit: **PASS**
- Join/leave/rejoin explicit: **PASS**
- Durable PlayerId vs ephemeral ConnectionId explicit: **PASS**
- Compatibility/version handshake explicit: **PASS**
- Content canonical fingerprint used: **PASS**
- Continuous movement input authority explicit: **PASS**
- Snapshot/event/revision model explicit: **PASS**
- Duplicate/out-of-order/stale behavior explicit: **PASS**
- Item/container/world/fog/building/machine/death revisions consumed: **PASS**
- Shared discovery replication explicit: **PASS**
- Concurrent shared mutation behavior explicit: **PASS**
- Disconnect during item/build/death/save defined: **PASS**
- Live commit vs durable save distinction explicit: **PASS**
- Session-end failure feedback explicit: **PASS**
- Transport separated from authority logic: **PASS**
- 2–4 operational path implementable: **PASS**
- No structural four-player ceiling / future 10 path preserved: **PASS**
- Production matchmaking/fleet/host migration excluded: **PASS**
- Implementation authorization: **NO**
- Blocking open question: **NONE**

---

## 65. Consequences

### Benefits

- one authority protocol covers every Phase 1 shared system;
- duplicate/retry/reconnect cannot silently duplicate canonical effects;
- clients can recover from missed responses using baseline + revisions;
- content drift is caught before joining;
- persistence and live-authority success are not conflated;
- hosted implementation can later add prediction without changing ownership;
- future 10-player sessions do not require a schema rewrite.

### Costs

- every shared command requires sequence/revision/identity discipline;
- join/rejoin requires baseline synchronization;
- server must retain operation results for active SessionEpoch;
- client read model must support resync/tombstones;
- disconnect can leave a character exposed under normal simulation rules.

These costs are accepted because authoritative shared persistence is otherwise unsafe.

---

## 66. Implementation authorization

**NOT AUTHORIZED by P1-TECH-007.**

This ADR is a specification source for:
- P1-TECH-008 / #44 Save Schema V2;
- P1-TECH-009 / #45 performance/observability/CI;
- hosted implementation #54 when Producer dependencies are satisfied.

---

## 67. Handoff

**Task:** P1-TECH-007  
**Role:** Technical Lead / Game Architect  
**Status:** COMPLETE / HANDOFF READY  
**Artifact:** `docs/adr/ADR-P1-TECH-007-hosted-coop-protocol.md`  
**Handoff to:** Producer / Project Manager  
**Recommended next action:** verify DoD/AC, mark TECH READY if accepted, then evaluate #44 Save Schema V2 dependency activation.  
**Project Owner decision required:** NONE.
