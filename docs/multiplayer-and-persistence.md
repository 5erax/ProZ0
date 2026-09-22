# Multiplayer and persistence

## Session model

Single-player and hosted co-op share the same world rules. A host creates a world and invites 2–10 players. The server/host owns world persistence; players contribute discoveries, construction, research, and logistics.

## Shared state

Persist world seed, generated chunks, terrain deltas, buildings, containers, machines, research, map discovery, ecological pressure, event history, crops, and last active time. Persist player inventory, level, skills, professions, equipment, and respawn location separately.

## Networking priorities

Authoritative simulation should own movement validation, inventory transactions, building placement, damage, item drops, machine state, and world mutations. Client prediction can be introduced for movement and presentation after the core loop is reliable.

## Co-op roles

Players can divide work without hard dependency: an Explorer scouts, a Miner supplies ore, an Engineer maintains power, a Botanist protects food and medicine, and a Builder makes the habitat viable. Every role remains optional and learnable.

## Persistence and safety

Use versioned saves, deterministic world generation, atomic writes, and migration hooks. A failed save must not corrupt the whole world. Admin/host actions should include backup/export and explicit world deletion.
