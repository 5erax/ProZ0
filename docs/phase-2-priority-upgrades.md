# Phase 2 priority upgrades — exploration, visuals and private co-op

Implemented in the current chat under Owner authorization. Scope follows the Owner's revised limit of **2–3 players**, rather than the earlier proposed four/eight-player rollout. This document records implementation and limitations; it is not Owner acceptance or novice playtest evidence.

## Player-facing changes

- Private co-op: host/join from the start screen, invitation sharing in Settings, return to a saved room, reconnect with the same character, and owner-controlled shared save and downloadable backup. Production: https://proz0-colony.vercel.app . GitHub Pages remains a solo entry point and also offers the remote co-op launcher.
- Three additional natural landmark families: windfall grove, clear spring and exposed mineral seam. Their resource pockets offer useful reasons to explore. The Journal shows discovered sites and preserves inspected observations, without revealing undiscovered coordinates or inventing answers about alien history.
- Authored pixel silhouettes for biome trees, plants, rocks, ore, water, landmarks and colony facilities. Common tile dimensions and centered terrain anchors avoid isolated diamonds. Co-op movement is visually interpolated while commands and movement remain authoritative.
- Deterministic shallow wetland channels are traversable at 70% speed. New construction requires dry ground. Existing foundations remain accessible. Harvesting, depletion and renewal use the real resource authorities; decoration does not create free loot.
- Crates display actual capacity pressure in the solo world. Inventory/container lists sort consistently; the stack button combines one compatible pair using quantity, condition, capacity and revision checks. Optional Settings guidance opens the real craft/build/inventory/journal panels.
- Optional ten-minute local session recordings capture position, gathering, bag pressure, facilities, discoveries and tool condition. Export is explicit; recordings do not upload automatically or include room credentials.

Sound, display/fullscreen and Save World stay in Settings. Movement instructions remain in Help rather than permanently occupying the play area.

## Hosting and saved-world compatibility

The new Vercel project is `proz0-colony`, region Singapore, with a free Redis Marketplace store (30 MB, no high availability). Vercel WebSockets are beta; functions have finite lifetimes and connections can reconnect during deployment or rotation. Each gateway communicates through bounded Redis queues; a fenced room lease elects one simulation authority. Durable checkpoints and character resume bindings allow another gateway to take over. Save/export require the separate owner credential; guests cannot save on behalf of the owner. Inventory replication remains scoped to each character.

The pilot limits the store to four rooms and each checkpoint to 4 MB. World records do not expire automatically. Ephemeral transport queues and gateway heartbeats expire. Automatic checkpoints run approximately every five seconds; explicit owner save waits for acknowledgement. A crash may roll back recent movement. An uncertain command is queried after reconnect and is never automatically replayed; players are told to check inventory if its result is unavailable.

Each room has three persistent character seats. Keep the same browser's local data or its issued resume credential to retain that character; the system does not silently reassign a seat to a new visitor. Invitation links contain a private access key in the fragment and should only be shared with friends. Export a backup from Settings before relying on a free, non-HA store for long-term progress.

Colony content moves explicitly from version 1 to 2, retaining progression and inspected sites. The landscape overlay is part of that content version; it does not rewrite generation-v4 terrain or entity identities. Existing world deltas, inventories and structures remain authoritative. Legacy Phase 1 water collision is unchanged. A late-joining survival record now starts at the current authority tick so it can immediately participate in a valid shared save.

## Pilot boundaries

The remote player interface supports movement, gathering, crafting, kit placement, nearby crate transfer, equipment, consumption, research, journal inspection and colony sustenance commands. It is a bounded pilot, not parity with every solo screen: remote professions, connector placement, machine operation, combat/death recovery and every ruin interaction are not claimed complete. No conveyor, vehicles, NPCs, digging, terraforming, deep-water swimming, offline simulation or breeding has been introduced.

## Verification and remaining acceptance

Repository checks cover content migration, physical channel movement/building rules, save coherence, existing natural gathering/base journeys, determinism, scene timing and hosted authority behavior. Separate real Redis checks use two gateways and three clients to exercise admission, private inventories, resume recovery, owner-only save and leader replacement. Live Internet checks use three browser contexts through Host/Join, natural gathering, save/reload, invitation sharing and viewport screenshots. These are automated checks, not three human playtesters.

Issue #199 retains the genuine 3–5 novice balance evidence requirement; #187 retains the Owner decision on the published Phase 2 product. Exact commit, release URLs, test totals and measured results belong in the PR/release handoff after checks finish.

## Recommended next upgrades, in order

1. **Complete the three-person expedition loop.** Add shared map pings and teammate markers, then remote combat/recovery and connector/machine controls. Validate that three players can gather, build and survive for twenty minutes without inventing client-side outcomes. Keep personal inventory private and shared crates authoritative.
2. **Tune travel using real novice sessions.** Recruit 3–5 new players for ten minutes each. Compare recording deltas and observation notes: time walking without a useful encounter, discoveries, gathering, first crate time, full-bag events and tool wear. Treat fewer empty walks and more distinct interactions as goals, then adjust resource pockets/renewal from evidence rather than making loot unlimited.
3. **Expand meaningful regional variation.** Add authored routes and two additional landmark interaction families, with biome-specific silhouettes and useful tradeoffs. Require each trip to reveal a new choice or observation; preserve discovery and migration rules.
4. **Strengthen the diorama art.** Add readable chunk side faces, shoreline transitions, grounded facility shadows and restrained night glows. Compare clear/rain/night at 1×/2×/3× and measure the whole scene before increasing particle density. Avoid drawing opaque overlays over essential interactions.
5. **Improve logistics as bases grow.** Add explicit container selection, split quantities and clear transfer-range indicators, followed by resource reservations for crafting. Test concurrent players moving the same stack; retain server revisions and capacity checks.
6. **Harden hosting after actual usage.** Monitor reconnect rate, checkpoint failures, room/storage pressure and simulation latency. Decide on protected room creation and reliable storage only after demand is known. Any paid plan or service migration requires a concrete cost decision from the Owner.

These proposals do not move later-phase industry into Phase 2 or close the remaining human acceptance gates.
