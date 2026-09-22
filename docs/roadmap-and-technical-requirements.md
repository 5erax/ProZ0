# Roadmap and technical requirements

## Roadmap

### Phase 0 — Foundation
Define the data model, deterministic seed, chunk coordinate system, save format, input, camera, and a single-player movement slice.

### Phase 1 — Vertical slice
Ship the MVP loop: landing, gathering, needs, expedition, death recovery, habitat, one machine, fog of war, one ruin, and small co-op.

### Phase 2 — Colony depth
Add more biomes, weather, ecology pressure, professions, research, renewable resource rules, better containers, and larger co-op tests.

### Phase 3 — Industry
Add conveyors, processing chains, logistics, power networks, greenhouse progression, vehicles, and maintenance events.

### Phase 4 — Civilization
Add NPC survivors, settlement roles, advanced alien research, long-range vehicles, and endgame choices around rebuilding humanity and the planet's mystery.

## Technical requirements

- Web-first 2D renderer with pixel-art camera and deterministic simulation.
- Data-driven content for items, recipes, entities, biomes, professions, machines, weather, and events.
- Chunk streaming and delta persistence for a large mutable world.
- Server-authoritative multiplayer with a small, testable protocol.
- Versioned save migrations and recoverable backups.
- Fixed simulation steps for machines, ecology, combat, and weather; presentation can interpolate.
- Separation between client presentation, shared simulation, persistence, and content definitions.
- Observability for desyncs, save failures, tick cost, chunk generation, and network latency.

## Engine selection criteria

Choose the engine after the vertical-slice constraints are tested. It must support browser deployment, 2D pixel rendering, input and camera control, deterministic/data-driven simulation, multiplayer integration, and efficient chunk streaming. The repository records requirements rather than prematurely locking an engine.
