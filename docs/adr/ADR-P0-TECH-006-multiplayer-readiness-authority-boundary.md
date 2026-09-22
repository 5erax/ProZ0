# ADR-P0-TECH-006 — Multiplayer-Readiness & Authority Boundary

**Task:** P0-TECH-006  
**Source Issue:** #8  
**Role:** Technical Lead / Game Architect  
**Status:** READY FOR PRODUCER VERIFICATION  
**Date:** 2026-09-22

## Information classification

### CONFIRMED
- ProZ0 targets single-player plus hosted co-op for 2–10 players.
- Host/server owns world persistence.
- Future authoritative simulation owns movement validation, inventory transactions, building placement, damage, item drops, machine state, and world mutations.
- Client prediction may be introduced later; Phase 0 does not implement multiplayer.
- Shared simulation must run without Pixi/DOM and presentation is non-authoritative.

### CONSTRAINT
Phase 0 must not create client-authoritative critical state or bake browser/presentation objects into simulation/world/persistence contracts.

### DECISION NEEDED
None.

# ADR

## ADR ID
ADR-P0-TECH-006

## CONTEXT
Phase 0 executes the authoritative runtime locally in the browser, but the same domain runtime must later move behind a host/server boundary without rewriting gameplay ownership.

## DECISION

Adopt an **authority-port architecture**:

- in Phase 0, a local in-process host owns `simulation/world`;
- in hosted multiplayer, a server/host process owns the same authoritative runtime;
- client input becomes commands/intent;
- client presentation consumes authoritative snapshots/events;
- transport is replaceable and is not part of domain authority.

### Critical authority ownership

Future host/server is authoritative for:
- simulation tick progression;
- validated player movement/resolved position;
- collision results relevant to authority;
- inventory/container transactions;
- item creation/drop/pickup outcomes;
- building placement/removal;
- damage/death outcomes;
- machine state and world mutations;
- generated/mutated chunk state;
- shared discovery/research/world state;
- persistence scheduling and durable world state.

Client is authoritative only for:
- local raw input capture;
- local UI state;
- camera/presentation;
- visual interpolation;
- local accessibility/display settings;
- optional future speculative prediction state, which is always reconcilable/discardable.

### Movement boundary
Client sends movement **intent/logical input**, never authoritative final position.

Future host/server:
1. validates session/player identity;
2. applies allowed logical input to authoritative simulation;
3. resolves movement/collision;
4. publishes authoritative state.

Client prediction, if later added, predicts from the same rules but server result wins.

### Inventory/world mutation boundary
Client submits operation intent (for example "move item", "place building"), not a committed state delta.

Authority validates:
- identity/ownership;
- current state/version;
- range/preconditions;
- capacity/cost/rules;
- target world validity.

Only authoritative simulation/world commits the mutation.

### Shared simulation deployment seam
`foundation/content/world/simulation` remain environment-neutral.

```text
Phase 0 local:
ClientHost -> AuthorityRuntime(in-process) -> Snapshot -> Pixi

Future hosted:
Client -> Transport -> ServerHost -> AuthorityRuntime -> Transport -> Client Snapshot -> Pixi
```

The seam is between host/transport and the shared simulation public API.

## ALTERNATIVES

### Client-authoritative browser state
Rejected: incompatible with confirmed server-authoritative direction and unsafe for shared persistent state.

### Duplicate client/server gameplay implementations
Rejected: creates rule drift and doubles validation burden.

### Full networking stack in Phase 0
Rejected: out of scope; architecture seam is sufficient.

## TRADE-OFFS
- Explicit commands/snapshots add mapping code even in local mode.
- Future prediction requires reconciliation complexity.
- Strong authority boundaries reduce convenience of directly mutating client-visible objects, but prevent a later architecture rewrite.

## CONSEQUENCES
- Presentation never exposes a mutation path to world internals.
- Persistence attaches to the active authority host, not to remote clients.
- Domain IDs/state must be serializable and independent of Pixi/browser objects.
- Network protocol may evolve later without changing domain ownership.
- Tests must prove a headless authority runtime can execute without client dependencies.

# TECHNICAL DESIGN SPEC

## SYSTEM
Multiplayer Readiness / Authority Boundary

## ARCHITECTURE OVERVIEW
Ports:
- **Command/Input port** into authority;
- **Snapshot/Event port** out of authority;
- **Persistence port** attached to authority host;
- **Presentation adapter** outside authority.

## COMPONENTS
- `AuthorityRuntime`: composition of simulation + world + content.
- `LocalAuthorityHost`: Phase 0 in-process adapter.
- future `ServerAuthorityHost`: network/session adapter.
- future command transport.
- client presentation/input adapters.

## RESPONSIBILITIES
Authority validates and commits critical state. Client expresses intent and renders resulting state. Transport moves messages only.

## DATA MODEL
Network-ready domain types must use stable IDs, serializable data, explicit version/tick identity where later protocol needs it, and no renderer/runtime handles.

## DATA OWNERSHIP
| State | Authority |
|---|---|
| raw keys/camera/UI | client |
| gameplay input intent | submitted by client, consumed by authority |
| resolved player position | host/server authority |
| inventory/container state | host/server authority |
| world/chunk mutations | host/server authority |
| machine/building/damage outcomes | host/server authority |
| durable world save | host/server authority |
| speculative prediction | client-only, disposable |
| visual interpolation | client-only |

## CLIENT RESPONSIBILITY
Capture input, submit intent, render snapshots, smooth/interpolate presentation, and later predict only when explicitly authorized.

## SERVER RESPONSIBILITY
Own critical simulation/world state, validate commands, advance simulation, publish state, own persistence, and reject client-asserted critical results.

## PERSISTENCE
Only active authority host writes canonical persistent world state. Remote clients never write canonical shared-world saves.

## NETWORKING
Transport/protocol implementation is deferred. Required architectural semantics:
- commands in;
- authoritative snapshots/events out;
- idempotency/sequence/reconciliation details deferred;
- client position/state assertions are not trusted.

## PUBLIC INTERFACES
Conceptual:
```ts
interface AuthorityRuntime {
  submitCommand(command: PlayerCommand): CommandResult;
  step(step: SimulationStep): void;
  getSnapshot(): SimulationSnapshot;
}

interface AuthorityHost {
  start(): void;
  stop(): void;
}
```
Exact network DTOs are later Technical Design scope.

## FAILURE HANDLING
Invalid commands fail without partial mutation. Disconnect/timeout handling must not transfer authority to the client. Persistence failure must not make a client copy canonical.

## PERFORMANCE
Keep command validation/domain execution headless. Snapshot publication must not require serializing the entire near-infinite world; later networking uses interest/chunk scope.

## SECURITY / VALIDATION
Never trust client-provided positions, inventory deltas, damage results, building validity, machine state, RNG state, or world mutations. Validation occurs before authoritative mutation.

## OBSERVABILITY
Future authority host should expose rejected commands, tick cost, connected player/session identifiers, snapshot cadence, persistence failures, latency and desync/reconciliation counters when implemented.

## TEST STRATEGY
- headless authority test without Pixi/DOM;
- client presentation cannot import/mutate world internals;
- command intent resolves through authority;
- invalid operation leaves state unchanged;
- local Phase 0 authority and future server host share the same simulation contract;
- persistence attaches to authority boundary only.

## MIGRATION
Move construction of `AuthorityRuntime` from browser local host to future server host; add transport adapters; keep simulation/world rules and persistence ownership direction unchanged.

## KNOWN LIMITATIONS
No lobby, protocol, sockets, prediction/reconciliation algorithm, snapshot cadence, authentication, or reconnect UX is defined here.

## FUTURE EXTENSION
Hosted co-op, dedicated-host packaging, client prediction/reconciliation, interest management, command sequencing, reconnect, admin tools.

# FILE PLAN

## CREATE
`src/simulation/api/AuthorityRuntime.ts`
- Purpose: environment-neutral authoritative command/step/snapshot port.
- Responsibility: expose authority without client dependencies.
- API: submit logical commands, step, snapshot.

`src/client/runtime/LocalAuthorityHost.ts`
- Purpose: Phase 0 in-process authority adapter.
- Responsibility: compose/use AuthorityRuntime locally without changing ownership.
- API: local host lifecycle.

## DO NOT CREATE YET
`src/server/**`
- Reason: full hosted runtime/network implementation is outside Phase 0 authorization.

## MODIFY
`src/client/main.ts`
- Affected section: composition.
- Required architecture change: depend on LocalAuthorityHost/AuthorityRuntime rather than mutating simulation/world internals from presentation.

# ACCEPTANCE CRITERIA SELF-CHECK
- Critical future authority explicit: PASS.
- Client presentation vs authoritative simulation separated: PASS.
- Phase 0 does not require client-authoritative critical state: PASS.
- Multiplayer implementation not introduced: PASS.

# HANDOFF
Return to Producer for DoD verification.

**PROJECT OWNER ACTION: NONE**
