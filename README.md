# ProZ0

ProZ0 is a 2D pixel-art, top-down/3/4 survival sandbox about rebuilding human civilization on a newly settled planet. One to ten pioneers can share a persistent, procedurally generated world: explore beyond the fog of war, survive dangerous expeditions, build a modular habitat, specialize without permanent class locks, and uncover evidence that another civilization lived there first.

## The promise

> We are the first people to make this planet ours—and we are not the first civilization to live here.

The game gives players a large direction rather than a fixed route: rebuild humanity and investigate the planet's hidden history. Players decide where to settle, which professions to learn, which risks to take, and when to pursue the mystery.

## Core loop

`Explore → Gather → Prepare → Survive → Return → Craft → Build → Research → Expand`

Short activities take minutes; expeditions take 30–120 minutes; the long-term arc moves from survivor to pioneer, specialist, industrialist, colony builder, and planetary historian.

## Pillars

- **Exploration:** a fully hidden map, shared discoveries, procedural biomes, ruins, wildlife, hazards, and escalating rewards.
- **Balanced survival:** preparation matters. Death returns a player to base, drops their inventory at the death site, and costs a small amount of XP and durability.
- **Creative colony building:** modular habitat rooms connect into storage, laboratories, greenhouses, power rooms, garages, and industry.
- **Emergent history:** mining, noise, pollution, and territorial expansion alter wildlife and alien events instead of triggering a fixed raid timer.

## Product shape

- 2D pixel-art with a top-down/3/4 view.
- Single-player or hosted co-op for 2–10 players.
- One persistent world per server/host; it remains until the host deletes it.
- Near-infinite procedural generation with saved, mutable chunks.
- Fog of war is opened by physical exploration and shared across the team.
- Progression combines character level, personal skills, professions, and colony research.
- Offline time is resolved on world re-open: machines do not produce while offline, but require maintenance and may accumulate dust, wear, and state changes.
- PvE combat is purposeful and moderate: wildlife, alien nests, environmental events, and expedition danger.

## Documentation

The design and implementation scope live in [`docs/`](docs/):

- [Game vision](docs/game-vision.md)
- [Gameplay pillars and loops](docs/gameplay-pillars-and-loops.md)
- [World and procedural generation](docs/world-and-procedural-generation.md)
- [Survival, exploration, and ecology](docs/survival-and-exploration.md)
- [Building, crafting, and automation](docs/building-crafting-and-automation.md)
- [Progression, professions, and research](docs/progression-and-professions.md)
- [Multiplayer and persistence](docs/multiplayer-and-persistence.md)
- [MVP scope](docs/mvp-scope.md)
- [Roadmap and technical requirements](docs/roadmap-and-technical-requirements.md)

## Project status

This repository is the product/design foundation for ProZ0. The MVP target is a 30–60 minute playable loop that proves landing, gathering, preparation, a dangerous expedition, a first habitat, co-op presence, and a discoverable alien ruin. Long-term systems such as NPC colonists, aircraft, advanced robotics, and full civilization simulation are intentionally documented as follow-on scope.

## Working principles

Keep the world readable, the preparation meaningful, the consequences recoverable, and the player's choices visible in the colony. Prefer data-driven systems so new biomes, professions, machines, and events can be added without rewriting the simulation.
