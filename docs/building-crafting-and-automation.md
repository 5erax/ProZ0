# Building, crafting, and automation

## Modular habitat

The building language is modular and readable:

`Habitat Room → Corridor → Storage Module → Laboratory → Greenhouse → Power Room → Garage → Industrial Module`

Modules can be upgraded and connected. Base layout should communicate progression at a glance.

## Crafting tiers

- **Tier 0:** hand tools, shelter, camp utilities, basic storage.
- **Tier 1:** workbench, primitive machines, generator, repair station.
- **Tier 2:** drills, conveyors, furnaces, processors, better storage.
- **Tier 3:** sorters, assemblers, warehouses, sensors, logistics.
- **Tier 4+:** robotics, autonomous production, advanced power, colony infrastructure.

The MVP stops after the first useful machine and a small connected habitat, while its data model leaves room for later tiers.

## Farming

The long-term chain is soil quality → temperature → water → fertilizer → genetics → greenhouse → automation. The MVP uses a smaller loop but keeps crop data extensible.

## Vehicles

Travel grows from walking to rover, cargo rover, aircraft, and later vehicles. Each step expands the practical exploration and logistics radius.

## Offline maintenance

Machines do not produce while the host is offline. On reopen, elapsed time updates condition, dust, webs, crop state, and environmental state. Maintenance restores operation and makes the colony feel lived in without simulating every offline tick.
