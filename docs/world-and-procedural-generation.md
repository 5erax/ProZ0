# World and procedural generation

## World model

One server represents one persistent planet. A world can be played solo or hosted for 2–10 players and remains until the host deletes it. The planet is near-infinite in practical play and generated incrementally around exploration.

## Chunk lifecycle

1. Generate a deterministic chunk from the world seed and coordinates.
2. Generate terrain, climate, resources, flora, fauna, hazards, structures, and points of interest.
3. Apply player modifications and discovered-state data.
4. Save only the generated and modified state; load it on demand.

## Biomes

Biomes affect climate, resources, soil, wildlife, hazards, weather, alien structures, and expedition difficulty. Early examples include temperate, desert, swamp, frozen, volcanic, and alien regions. Equipment is a practical key: a player may enter a frozen region early, but without thermal preparation the risk is high.

## Mutable terrain

Players can mine, dig, clear, build paths, create tunnels, and reshape local terrain. Terrain changes must be deterministic, network-replicable, and persisted as deltas over generated terrain.

## Discovery

The entire map begins under fog of war. Discovery requires physical presence and is shared with the team. The map should distinguish explored, seen, mapped, and fully surveyed states when the UI is mature enough to support them.
