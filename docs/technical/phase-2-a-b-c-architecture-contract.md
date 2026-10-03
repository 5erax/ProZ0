# Phase 2 — as-built authority, save, network and content

Current solo extension: [2026-10-03 release handoff](../phase2-solo-release-handoff-2026-10-03.vi.md). Fresh solo expedition worlds enable `soloCaves` version 1; legacy saves retain their existing mode. The scoped adapter routes movement/resources/drops/death caches through canonical worldspace authority. Mountain collision, rendering and foundation checks share an elevation query. Resource lifecycle version 2 persists integer growth work, active clock and watering state; version 1 remains readable. No offline growth is added. Locale preference/dictionaries do not alter catalog fingerprints, save IDs or protocol fields. Hosted multiplayer retains its contract; new cave replication is deferred by the Owner.

Direct Owner-authorized reconciliation, 2026-10-01; not an A-TL approval. Base public release is PR #203/main `05491d17a088f0bd74fbb43e7260924b3e92801f`, extended by the linked #204–#206 PR. See [co-op corrections traceability](phase-2-coop-corrections-traceability.md) and [gameplay contract](../design/phase-2-a-b-c-master-gameplay.md). The broader baseline traceability remains PR #207 / #165.

## State ownership and commands

`Phase1AuthorityBundle` composes movement, survival, items, equipment, building/power/condenser, ruin/combat/death, sustenance, colony depth and world/chunk authorities. Presentation consumes views only. `Phase1HostedCommandDispatcher` validates payloads and revision references; domain authorities validate life/range/tools/prerequisites/materials. Operation receipts provide duplicate/stale/conflict handling. Item transfers and progression exchange costs/rewards atomically, and the scene grants no client inventory outcome.

`Phase1HostedAuthorityComposition` projects canonical aggregates. Personal inventory and equipment are filtered by player ID. Shared aggregates include structures, resources, research, sustenance, ruins and accessible world containers. `colony-scene` and `colony-map` are selected for the recipient, and scene/map projection includes only explored cells and nearby visible entities. Map revisions follow exploration changes independently from the 10 Hz scene refresh. The map is bounded to active streamed chunks; it is not a global hidden-world catalogue.

Admission records the aggregate revisions sent in the initial baseline. After the client acknowledges it, newly changed visible aggregates catch up that peer. Publications made while it was syncing cannot leave a research or inventory revision permanently stale. Catch-up uses the same private-state filter and sends no unchanged duplicate views.

## Time, content and saved data

Active time uses 60 Hz fixed steps. Seed/generation/content versions define deterministic terrain, resources, region classification, sites and weather; no client generation supplies canonical state. Accepted generation-v3 saves explicitly acquire generation-v4 ecosystem extensions while retaining legacy fingerprints/deltas. Colony content v1 migrates to v2. Corrupt/future/incompatible data fails validation; generation-v2 migration remains absent.

Save V2 captures authority tick/environment, players, inventory/container receipts, chunks/exploration/resource state, foothold/structures/machines and colony extension coherently. Redis checkpoints also retain character resume bindings, browser/account room bindings, skins and optional display names. Older accounts/rooms default missing names safely. Account profile changes are compare-and-set; a display name does not alter login identity or password credentials. The free production store keeps eight rooms, new 2 MiB checkpoints (legacy 4 MiB), with no automatic world expiry/deletion.

## Gateways and failure handling

Each Vercel gateway holds sockets while a fenced Redis room lease elects one canonical simulation leader. Same-gateway inputs/deliveries avoid Redis loopback; cross-gateway input/outbound queues remain bounded. One lease renewal runs ahead at a time, normally every 500 ms; its confirmed validity is counted conservatively from request start. Stepping stops after half the ten-second lease interval without confirmation, and renewal failure retires the authority. Gateway liveness writes also run ahead. Checkpoints still compare the lease token atomically before durable write. Wall-clock catch-up advances at most twelve fixed ticks per gateway pass; it never pretends an arbitrarily stalled server simulated offline time. Scene refresh is tick-distance based to survive uneven scheduling.

Commands/accepted identities are checkpointed before acknowledgement. Explicit owner save waits for a durable result; automatic checkpoint cadence is about five seconds. Reconnect recovers private colonist identity; uncertain operations are queried, never blindly replayed. A crash may roll back uncheckpointed movement. Queue/storage/checkpoint failure closes affected sockets for safe reconnect. Authority rotates before the function limit, preserving saved bindings. Same-gateway bypass does not weaken checkpoint fencing, admission, input ordering or ownership.

Cross-gateway output has one ordered batch writer per authority, with at most 1 MiB queued plus one bounded batch in flight. Gameplay and social delivery share its ordering; remote output and peer-liveness reads do not block movement ticks. Rotation waits for the writer to finish before closing the previous connections. A failed writer retires its authority; acknowledged gameplay still requires the preceding fenced checkpoint.

## Communication extension

The existing protocol-v1 envelope/sequence remains unchanged. Only accepted sessions that send `{proz0Social:1,type:"subscribe"}` receive the optional ephemeral social channel on the same authenticated socket. Old clients are not sent unknown social envelopes. Frontend intercepts social frames before the gameplay decoder.

Server-derived player identity/name, room membership, bounded message length/history, duplicate-window and rate checks prevent sender spoofing and cross-room delivery. Voice setup is permitted only between two opted-in members. Offers/answers/ICE candidates are bounded and forwarded only to the selected admitted peer. Media uses native peer connections and STUN; there is no TURN guarantee. Disconnect stops client tracks/connections, and presence/history is ephemeral across leader replacement. No chat/audio enters a world checkpoint.

## Required evidence and limits

Keep unit/integration/determinism/browser/E2E, two-gateway real Redis, three-browser Internet/reconnect/save, full-scene idle/moving frame and tick checks distinct. Record machine/viewport/commit/workload, raw timing and failures; do not lower the existing >=50 FPS / P95 <=34 ms gate. Client RTT is sampled from actual protocol ping/pong and exposed for diagnostics, not a simulated latency claim. New co-op UI tests cover real authority transactions with labelled fixture setup.

Public storage/network limits, browser permissions and NAT affect reliability. No high availability, globally zero latency, offline simulation, permanent chat archive, paid relay or eight-player public capacity is promised. Exact release notices pin actual CI/deployment identities. Genuine novice evidence (#199), final Owner acceptance (#187), the profession-choice discrepancy and independent contract review remain explicitly separate decisions.
