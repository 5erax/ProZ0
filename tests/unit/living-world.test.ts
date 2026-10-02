import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { createLegacyPhase1ContentCatalog } from '../../src/content/phase1/Phase1Catalog';
import { LIVING_ROOT_ITEMS } from '../../src/content/livingworld/LivingRootContent';
import {
  LIVING_ITEMS,
  SEASON_TICKS,
  seasonAt,
  soilAt,
  SPECIES,
} from '../../src/content/livingworld/LivingWorldContent';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1BuildingWorld } from '../../src/world/building/Phase1BuildingWorld';
import { ExpeditionAuthority } from '../../src/simulation/expedition/ExpeditionAuthority';
import { emptyExpeditionState } from '../../src/simulation/expedition/ExpeditionState';
import {
  LivingWorldAuthority,
  type LivingCommand,
} from '../../src/simulation/livingworld/LivingWorldAuthority';
import {
  emptyLivingWorld,
  validateLivingWorld,
  type LivingWorldState,
  type LivingAnimal,
} from '../../src/simulation/livingworld/LivingWorldState';
import { Phase1ChunkGenerator } from '../../src/world/phase1/Phase1ChunkGenerator';
import { createChunkCoord } from '../../src/world/chunks/ChunkCoord';
function animal(
  id: string,
  species = 'chicken',
  sex: 0 | 1 = 0,
  pen: string | null = null,
): LivingAnimal {
  const d = SPECIES.find((s) => s.id === species)!;
  return {
    id,
    species,
    sex,
    pen,
    owner: pen ? 'solo' : null,
    x: 102,
    y: 100,
    anchorX: 102,
    anchorY: 100,
    age: d.matureSeconds * 60,
    health: d.health,
    energy: 10000,
    thirst: 10000,
    breedTick: 0,
    product: 0,
    productTicks: 0,
    attackTick: 0,
    shearTick: 0,
  };
}
function fixture(saved: Partial<LivingWorldState> = {}, full = false) {
  let tick = saved.lastTick ?? 0,
    wet = false,
    blocked = false,
    weapon = true;
  const actor = { x: 100, y: 100, alive: true },
    items = new Phase1ItemAuthority({
      catalog: createPhase1ContentCatalog(),
      world: new Phase1ItemTestWorld(),
      initialLedger: {
        containers: [
          {
            containerId: 'inventory:solo',
            kind: 'player-inventory',
            ownerPlayerId: 'solo',
            revision: 0,
            stacks: full
              ? [
                  ['item:field-hoe', 1],
                  ['item:timber', 10],
                  ['item:timber', 1],
                  ['item:watering-can', 1],
                ].map(([id, quantity], i) => ({
                  stackId: 'full' + i,
                  itemDefinitionId: id as string,
                  quantity: quantity as number,
                  condition: null,
                }))
              : [
                  'item:field-hoe',
                  'item:watering-can',
                  'item:root-seed',
                  'item:clean-water',
                  'item:animal-feed',
                  'item:compost',
                  'item:timber',
                  'item:edible-plant',
                  'item:grain',
                  'item:plant-fiber',
                ].map((id, i) => ({
                  stackId: 'item' + i,
                  itemDefinitionId: id,
                  quantity: i < 2 ? 1 : 3,
                  condition: null,
                })),
          },
        ],
      },
    });
  const expedition = new ExpeditionAuthority(
    items,
    new Phase1BuildingWorld(new Phase1BuildingTestSpatial(), undefined, true),
    () => actor,
    {
      ...emptyExpeditionState(),
      facilities: [
        'livestock-pen',
        'campfire',
        'irrigation-tank',
        'greenhouse',
        'compost-bin',
      ].map((id) => ({
        id,
        definitionId: id as 'livestock-pen',
        owner: 'solo',
        x: 102,
        y: 100,
        orientation: 0,
        canonicalStructureId: null,
        water: 0,
        progress: 0,
      })),
    },
  );
  const state = { ...emptyLivingWorld(tick), regions: ['6:6'], ...saved };
  const services = {
    seed: 'living-fixture',
    tick: () => tick,
    players: () => [],
    actor: () => actor,
    ground: () => !blocked,
    plotGround: () => (blocked ? 'OBSTRUCTED' : null),
    weather: () => (wet ? 'mist-rain' : 'clear'),
    weapon: () => weapon,
    cancelRest: () => {},
  };
  const authority = new LivingWorldAuthority(
    items,
    expedition,
    services,
    state,
  );
  const command = (
    action: LivingCommand['action'],
    target: string,
    extra: Partial<LivingCommand> = {},
  ) => ({
    id: 'op:' + crypto.randomUUID(),
    playerId: 'solo',
    expectedRevision: authority.read().revision,
    expectedInventoryRevision:
      items.getContainerView('inventory:solo').revision,
    action,
    target,
    ...extra,
  });
  return {
    actor,
    items,
    authority,
    expedition,
    services,
    command,
    advance: (seconds = 1) => {
      for (let i = 0; i < seconds; i++) {
        tick += 60;
        authority.tick();
      }
    },
    wet: (v: boolean) => (wet = v),
    block: () => (blocked = true),
    noWeapon: () => (weapon = false),
  };
}
it('adds living and root items while preserving every V3/V4 generated entity and seed', () => {
  const old = createLegacyPhase1ContentCatalog(),
    active = createPhase1ContentCatalog();
  expect(active.size - old.size).toBe(29 + LIVING_ROOT_ITEMS.length);
  expect(LIVING_ITEMS.every((i) => active.has(i.id))).toBe(true);
  expect(active.compatibility.canonicalFingerprint).not.toBe(
    old.compatibility.canonicalFingerprint,
  );
  for (const version of [3, 4])
    for (const coord of [createChunkCoord(0, 0), createChunkCoord(-4, 9)])
      expect(
        new Phase1ChunkGenerator(active).generate({
          worldSeed: 'p1-world-golden',
          coord,
          generationVersion: version,
        }),
      ).toEqual(
        new Phase1ChunkGenerator(old).generate({
          worldSeed: 'p1-world-golden',
          coord,
          generationVersion: version,
        }),
      );
});
it('seasons cycle on active ticks, spring is +35%, winter is 45% and soils are seeded', () => {
  expect(seasonAt(0).growthMilli).toBe(1350);
  expect(seasonAt(SEASON_TICKS).id).toBe('summer');
  expect(seasonAt(SEASON_TICKS * 2).yieldMilli).toBe(1250);
  expect(seasonAt(SEASON_TICKS * 3).growthMilli).toBe(450);
  expect(seasonAt(SEASON_TICKS * 4).year).toBe(2);
  const soils = new Set(
    Array.from(
      { length: 100 },
      (_, i) => soilAt('living-fixture', { x: i * 4, y: 100 }).id,
    ),
  );
  expect(soils.size).toBe(5);
  expect(soilAt('living-fixture', { x: 101, y: 100 })).toEqual(
    soilAt('living-fixture', { x: 101, y: 100 }),
  );
});
it('remote soil accepts plants and watering, blocked/far/dead placements reject atomically and saved commands replay once', () => {
  const f = fixture();
  expect(
    f.authority.execute(f.command('till', 'ground', { x: 100, y: 102 }))
      .message,
  ).toBe('SOIL_TILLED');
  const id = f.authority.read().plots[0]!.id,
    plant = f.command('plant', id, { crop: 'root' });
  expect(f.authority.execute(plant).message).toBe('PLANTED');
  expect(f.authority.execute(plant).message).toBe('PLANTED');
  expect(f.authority.execute(f.command('water', id)).message).toBe('WATERED');
  const restored = new LivingWorldAuthority(
    f.items,
    f.expedition,
    f.services,
    f.authority.read(),
  );
  expect(restored.execute(plant).message).toBe('PLANTED');
  expect(restored.read()).toEqual(f.authority.read());
  const before = f.authority.read();
  expect(
    f.authority.execute(f.command('till', 'ground', { x: 120, y: 100 }))
      .message,
  ).toBe('OUT_OF_RANGE');
  f.block();
  expect(
    f.authority.execute(f.command('till', 'ground', { x: 100, y: 103 }))
      .message,
  ).toBe('OBSTRUCTED');
  f.actor.alive = false;
  expect(f.authority.execute(f.command('clear', id)).message).toBe(
    'PLAYER_DEAD',
  );
  expect(f.authority.read()).toEqual(before);
});
it('soil and seasonal growth multiply; summer neglect kills crops and rain or irrigation prevents wilt', () => {
  const plot = {
    id: 'plot:test',
    owner: 'solo',
    x: 100,
    y: 103,
    crop: 'root',
    progress: 0,
    moisture: 10000,
    dryTicks: 0,
    dead: false,
    fertility: 0,
  };
  const spring = fixture({ plots: [plot] }),
    winter = fixture({ lastTick: SEASON_TICKS * 3, plots: [plot] });
  spring.advance();
  winter.advance();
  expect(spring.authority.read().plots[0]!.progress).toBeGreaterThan(
    winter.authority.read().plots[0]!.progress,
  );
  const dry = fixture({
    lastTick: SEASON_TICKS,
    plots: [{ ...plot, moisture: 0 }],
  });
  dry.advance(90);
  expect(dry.authority.read().plots[0]!.dead).toBe(true);
  const wet = fixture({
    lastTick: SEASON_TICKS,
    plots: [{ ...plot, moisture: 0 }],
  });
  wet.wet(true);
  wet.advance(90);
  expect(wet.authority.read().plots[0]!.dead).toBe(false);
  const tank = fixture({
    lastTick: SEASON_TICKS,
    plots: [{ ...plot, x: 101, y: 102, moisture: 100 }],
  });
  expect(
    tank.authority.execute(tank.command('fill', 'irrigation-tank')).message,
  ).toBe('TANK_FILLED');
  tank.advance();
  expect(tank.authority.read().stations[0]!.water).toBe(3);
  expect(tank.authority.read().plots[0]!.moisture).toBeGreaterThan(6000);
});
it('harvest gives autumn bonus and seeds; full bags keep crops and corpses intact', () => {
  const plot = {
    id: 'plot:ripe',
    owner: 'solo',
    x: 100,
    y: 103,
    crop: 'root',
    progress: 14400,
    moisture: 8000,
    dryTicks: 0,
    dead: false,
    fertility: 0,
  };
  const f = fixture({ lastTick: SEASON_TICKS * 2, plots: [plot] });
  expect(f.authority.execute(f.command('harvest', plot.id)).message).toBe(
    'HARVESTED',
  );
  expect(
    f.items
      .getContainerView('inventory:solo')
      .stacks.find((s) => s.itemDefinitionId === 'item:root-vegetable')!
      .quantity,
  ).toBe(5);
  const full = fixture(
      { plots: [plot], animals: [{ ...animal('dead'), health: 0 }] },
      true,
    ),
    before = full.authority.read();
  expect(full.authority.execute(full.command('harvest', plot.id)).status).toBe(
    'rejected',
  );
  expect(full.authority.execute(full.command('loot', 'dead')).status).toBe(
    'rejected',
  );
  expect(full.authority.read()).toEqual(before);
});
it('fed mature pairs breed, youth cannot breed, predators eat species prey and domestication protects them', () => {
  const pair = fixture({
    animals: [
      animal('hen', 'chicken', 0, 'livestock-pen'),
      animal('rooster', 'chicken', 1, 'livestock-pen'),
    ],
  });
  pair.advance();
  expect(pair.authority.read().animals).toHaveLength(3);
  expect(pair.authority.read().animals[2]!.age).toBe(0);
  pair.advance();
  expect(pair.authority.read().animals).toHaveLength(3);
  const young = fixture({
    animals: [{ ...animal('young'), age: 0 }, animal('male', 'chicken', 1)],
  });
  young.advance();
  expect(young.authority.read().animals).toHaveLength(2);
  const prey = fixture({
    animals: [
      animal('fox', 'fox'),
      { ...animal('hen'), x: 102, y: 100, energy: 0 },
    ],
  });
  prey.advance(10);
  expect(
    prey.authority.read().animals.find((a) => a.id === 'hen')?.health ?? 0,
  ).toBeLessThan(4);
  const protectedPair = fixture({
    animals: [
      animal('fox', 'fox'),
      animal('hen', 'chicken', 0, 'livestock-pen'),
    ],
  });
  for (let i = 0; i < 60; i++) {
    protectedPair.advance();
    const hen = protectedPair.authority
      .read()
      .animals.find((a) => a.id === 'hen')!;
    expect(hen.health).toBe(4);
    expect(
      Math.hypot(hen.x - hen.anchorX, hen.y - hen.anchorY),
    ).toBeLessThanOrEqual(1.01);
  }
});
it('animals mature and produce eggs; taming, feeding, hunting, loot and fuel perform real item exchanges', () => {
  const f = fixture({ animals: [animal('hen')] });
  expect(f.authority.execute(f.command('tame', 'hen')).message).toBe('TAMED');
  f.advance(120);
  expect(f.authority.read().animals[0]!.product).toBe(1);
  expect(f.authority.execute(f.command('produce', 'hen')).message).toBe(
    'PRODUCE_COLLECTED',
  );
  expect(
    f.items
      .getContainerView('inventory:solo')
      .stacks.some((s) => s.itemDefinitionId === 'item:egg'),
  ).toBe(true);
  expect(f.authority.execute(f.command('feed', 'hen')).message).toBe('FED');
  expect(f.authority.execute(f.command('hunt', 'hen')).message).toBe('HUNTED');
  expect(f.authority.execute(f.command('loot', 'hen')).message).toBe('LOOTED');
  expect(f.authority.read().animals.some((a) => a.id === 'hen')).toBe(false);
  expect(
    f.items
      .getContainerView('inventory:solo')
      .stacks.some((s) => s.itemDefinitionId === 'item:raw-meat'),
  ).toBe(true);
  const cold = fixture({ lastTick: SEASON_TICKS * 3 });
  expect(cold.authority.thermalTarget({ x: 100, y: 100 }, 50, false)).toBe(18);
  expect(cold.authority.execute(cold.command('fuel', 'campfire')).message).toBe(
    'FIRE_LIT',
  );
  expect(cold.authority.thermalTarget({ x: 100, y: 100 }, 50, false)).toBe(48);
  cold.advance(301);
  expect(cold.authority.thermalTarget({ x: 100, y: 100 }, 50, false)).toBe(18);
});
it('station recipes reject missing stations and paid outputs persist; moved pens retain domestic identities', () => {
  const f = fixture({
    animals: [animal('hen', 'chicken', 0, 'livestock-pen')],
  });
  expect(f.authority.execute(f.command('craft', 'compost')).message).toBe(
    'CRAFTED',
  );
  expect(f.authority.execute(f.command('craft', 'brick')).message).toBe(
    'NEARBY_STATION_REQUIRED',
  );
  const facilities = f.expedition.read();
  const exp = new ExpeditionAuthority(
    f.items,
    new Phase1BuildingWorld(new Phase1BuildingTestSpatial(), undefined, true),
    () => f.actor,
    {
      ...facilities,
      facilities: facilities.facilities.map((f) =>
        f.id === 'livestock-pen' ? { ...f, x: 103, y: 101 } : f,
      ),
    },
  );
  const restored = new LivingWorldAuthority(
    f.items,
    exp,
    f.services,
    f.authority.read(),
  );
  f.advance();
  restored.tick();
  const hen = restored.read().animals[0]!;
  expect(hen.id).toBe('hen');
  expect(hen.anchorX).toBe(103);
  expect(hen.anchorY).toBe(101);
});
it('strict living saves reject NaN, unknown species, duplicate IDs and over-cap populations', () => {
  const s = emptyLivingWorld();
  expect(() =>
    validateLivingWorld({
      ...s,
      plots: [
        {
          id: 'plot',
          owner: 'solo',
          x: NaN,
          y: 0,
          crop: null,
          progress: 0,
          moisture: 0,
          dryTicks: 0,
          dead: false,
          fertility: 0,
        },
      ],
    }),
  ).toThrow();
  expect(() =>
    validateLivingWorld({
      ...s,
      animals: [animal('a', 'chicken'), animal('a', 'chicken')],
    }),
  ).toThrow();
  expect(() =>
    validateLivingWorld({
      ...s,
      animals: [{ ...animal('a'), species: 'dragon' }],
    }),
  ).toThrow();
  expect(() =>
    validateLivingWorld({
      ...s,
      animals: Array.from({ length: 97 }, (_, i) => animal('a' + i)),
    }),
  ).toThrow();
});

it('failed unexplored spawn points retry later without duplicating hunted animals, and male chickens do not lay eggs', () => {
  const f = fixture();
  let explored = false,
    tick = 0;
  const services = {
    ...f.services,
    players: () => ['solo'],
    tick: () => tick,
    ground: () => explored,
  };
  const authority = new LivingWorldAuthority(f.items, f.expedition, services);
  tick = 60;
  authority.tick();
  expect(authority.read().animals).toHaveLength(0);
  explored = true;
  tick = 120;
  authority.tick();
  const state = authority.read();
  expect(state.animals).toHaveLength(5);
  expect(state.forage).toHaveLength(7);
  expect(state.spawned).toHaveLength(5);
  tick = 180;
  authority.tick();
  expect(authority.read().animals).toHaveLength(5);
  expect(authority.read().forage).toHaveLength(7);
  const rooster = fixture({
    animals: [animal('rooster', 'chicken', 1, 'livestock-pen')],
  });
  rooster.advance(120);
  expect(rooster.authority.read().animals[0]!.product).toBe(0);
});

it('plant harvest resets growth, roots transplant once, and full bags or blocked ground preserve both sides of the transaction', () => {
  const plant = { id: 'forage:berry', kind: 'berry-bush', x: 100, y: 103, readyTick: 0, cleared: false, growth: { version: 1 as const, progress: 10800, moisture: 8000, dryTicks: 0, cut: false } };
  const f = fixture({ forage: [plant] });
  expect(f.authority.execute(f.command('uproot', plant.id)).message).toBe('HARVEST_MATURE_PLANT_FIRST');
  const harvest = f.command('forage', plant.id);
  expect(f.authority.execute(harvest).status).toBe('committed');
  expect(f.authority.forageStatus(plant.id)?.stage).toBe('early');
  expect(f.authority.execute(f.command('forage', plant.id)).message).toBe('RENEWING');
  const uproot = f.command('uproot', plant.id);
  expect(f.authority.execute(uproot).message).toBe('ROOT_UPROOTED');
  expect(f.authority.execute(uproot).message).toBe('ROOT_UPROOTED');
  expect(f.items.getContainerView('inventory:solo').stacks.find(s => s.itemDefinitionId === 'item:root-berry-bush')?.quantity).toBe(1);
  const place = f.command('replant', 'item:root-berry-bush', { x: 99, y: 102 });
  expect(f.authority.execute(place).message).toBe('ROOT_REPLANTED');
  expect(f.authority.execute(place).message).toBe('ROOT_REPLANTED');
  expect(f.authority.read().forage).toHaveLength(2);
  const replanted = f.authority.read().forage.find(e => e.id !== plant.id)!;
  expect(replanted.growth?.progress).toBe(0);
  expect(replanted.lineage).toBe('item:root-berry-bush');
  const saved = validateLivingWorld(f.authority.read());
  expect(new LivingWorldAuthority(f.items, f.expedition, f.services, saved).read()).toEqual(saved);
  f.wet(true); f.advance(90);
  expect(f.authority.forageStatus(replanted.id)?.fraction).toBeGreaterThan(.5);
  expect(f.authority.forageStatus(replanted.id)?.fraction).toBeLessThan(1);
  const partial = f.command('forage', replanted.id);
  expect(f.authority.execute(partial).status).toBe('committed');
  expect(f.authority.read().forage.find(e => e.id === replanted.id)!.growth?.cut).toBe(false);

  const full = fixture({ forage: [{ ...plant, growth: { ...plant.growth, progress: 0, cut: true } }] }, true);
  expect(full.items.commitColonyExchange({ operationId: 'fixture-fill-last-space', playerId: 'solo', expectedInventoryRevision: full.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:plant-fiber', quantity: 1 }] }).status).toBe('committed');
  const before = full.authority.read(), bag = full.items.exportLedgerSnapshot();
  expect(full.authority.execute(full.command('uproot', plant.id)).status).toBe('rejected');
  expect(full.authority.read()).toEqual(before); expect(full.items.exportLedgerSnapshot()).toEqual(bag);
  const blocked = fixture(); blocked.block();
  expect(blocked.authority.execute(blocked.command('replant', 'item:root-berry-bush', { x: 99, y: 102 })).message).toBe('OBSTRUCTED');
  expect(blocked.items.exportLedgerSnapshot().containers[0]!.revision).toBe(0);
});

it('grass yields fiber, moisture pauses/restarts plant growth, and mineral deposits retain their legacy renewal timer', () => {
  const f = fixture({ forage: [
    { id: 'grass', kind: 'wild-grass', x: 100, y: 103, readyTick: 0, cleared: false, growth: { version: 1, progress: 5400, moisture: 0, dryTicks: 60, cut: false } },
    { id: 'salt', kind: 'salt-stone', x: 99, y: 100, readyTick: 9000, cleared: false },
  ] });
  const fibers = () => f.items.getContainerView('inventory:solo').stacks.find(s => s.itemDefinitionId === 'item:plant-fiber')!.quantity;
  const before = fibers();
  expect(f.authority.execute(f.command('forage', 'grass')).status).toBe('committed');
  expect(fibers()).toBe(before + 3);
  f.advance(10); expect(f.authority.read().forage[0]!.growth?.progress).toBe(0);
  expect(f.authority.forageStatus('grass')?.nextStageSeconds).toBeNull();
  expect(f.authority.execute(f.command('water-forage', 'grass')).message).toBe('WATERED');
  f.advance(10); expect(f.authority.read().forage[0]!.growth?.progress).toBeGreaterThan(0);
  expect(f.authority.execute(f.command('forage', 'salt')).message).toBe('RENEWING');
  expect(f.authority.read().forage[1]!.readyTick).toBe(9000);
  expect(() => validateLivingWorld({ ...f.authority.read(), forage: [{ ...f.authority.read().forage[0], growth: { version: 2 } }] })).toThrow();
});

it('tilling pays biological growth even before the legacy timer, without duplicate payment', () => {
  const f = fixture({ forage: [{ id: 'growing-grass', kind: 'wild-grass', x: 100, y: 103, readyTick: 9000, cleared: false, growth: { version: 1, progress: 3000, moisture: 8000, dryTicks: 0, cut: false } }] });
  const fibers = () => f.items.getContainerView('inventory:solo').stacks.find(s => s.itemDefinitionId === 'item:plant-fiber')!.quantity;
  const before = fibers(), command = f.command('till', 'ground', { x: 100, y: 103 });
  expect(f.authority.execute(command).message).toBe('SOIL_TILLED');
  expect(fibers()).toBe(before + 1);
  expect(f.authority.execute(command).message).toBe('SOIL_TILLED');
  expect(fibers()).toBe(before + 1);
});

it('tilling clears wild plants and pays remaining forage once; a full bag preserves soil and plants across saved commands', () => {
  const forage = {
    id: 'forage:berry',
    kind: 'berry-bush',
    x: 100,
    y: 103,
    readyTick: 0,
    cleared: false,
  };
  const f = fixture({ forage: [forage] });
  const op = f.command('till', 'ground', { x: 100, y: 103 });
  expect(f.authority.execute(op).message).toBe('SOIL_TILLED');
  expect(f.authority.read().plots).toHaveLength(1);
  expect(f.authority.read().forage[0]!.cleared).toBe(true);
  const berries = () =>
    f.items
      .getContainerView('inventory:solo')
      .stacks.find((s) => s.itemDefinitionId === 'item:berries')!.quantity;
  expect(berries()).toBe(2);
  expect(f.authority.execute(op).message).toBe('SOIL_TILLED');
  expect(berries()).toBe(2);
  const restored = new LivingWorldAuthority(
    f.items,
    f.expedition,
    f.services,
    validateLivingWorld(f.authority.read()),
  );
  expect(restored.read().forage[0]!.cleared).toBe(true);
  expect(
    restored.execute({
      ...f.command('forage', forage.id),
      expectedRevision: restored.read().revision,
    }).message,
  ).toBe('FORAGE_MISSING');
  const full = fixture({ forage: [forage] }, true);
  const soilBefore = full.authority.read();
  const itemsBefore = full.items.getContainerView('inventory:solo');
  expect(
    full.authority.execute(full.command('till', 'ground', { x: 100, y: 103 }))
      .status,
  ).toBe('rejected');
  expect(full.authority.read()).toEqual(soilBefore);
  expect(full.items.getContainerView('inventory:solo')).toEqual(itemsBefore);
});
