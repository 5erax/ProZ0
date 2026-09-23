import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { createWorldPosition } from '../../src/foundation';
import {
  Phase1BuildingAuthority,
  Phase1CondenserAuthority,
  Phase1ItemAuthority,
  type ContainerState,
  type ItemLedgerSnapshot,
  type ItemStackState,
} from '../../src/simulation';
import {
  BuildingItemWorldAdapter,
  PHASE1_POWER_CAPACITY_PU,
  PHASE1_POWER_RADIUS_WU,
  Phase1BuildingWorld,
} from '../../src/world';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function stack(
  stackId: string,
  itemDefinitionId: string,
  quantity = 1,
): ItemStackState {
  return Object.freeze({
    stackId,
    itemDefinitionId,
    quantity,
    condition: null,
  });
}

function inventory(
  stacks: readonly ItemStackState[],
  revision = 0,
): ContainerState {
  return Object.freeze({
    containerId: 'inventory:p1',
    kind: 'player-inventory',
    ownerPlayerId: 'p1',
    revision,
    stacks: Object.freeze([...stacks]),
  });
}

function setup(stacks: readonly ItemStackState[]) {
  const catalog = createPhase1ContentCatalog();
  const spatial = new Phase1BuildingTestSpatial();
  const buildings = new Phase1BuildingWorld(spatial);
  const baseWorld = new Phase1ItemTestWorld();
  const itemWorld = new BuildingItemWorldAdapter(baseWorld, buildings);
  const initialLedger: ItemLedgerSnapshot = Object.freeze({
    containers: Object.freeze([inventory(stacks)]),
  });
  const items = new Phase1ItemAuthority({
    catalog,
    world: itemWorld,
    initialLedger,
  });
  const building = new Phase1BuildingAuthority(
    catalog,
    items,
    buildings,
  );
  const machine = new Phase1CondenserAuthority(items, buildings);
  return {
    catalog,
    spatial,
    buildings,
    baseWorld,
    itemWorld,
    items,
    building,
    machine,
  };
}

function placeFree(
  ctx: ReturnType<typeof setup>,
  args: {
    readonly operationId: string;
    readonly definitionId:
      | 'structure:storage-crate'
      | 'structure:workbench'
      | 'structure:compact-power-unit'
      | 'structure:atmospheric-water-condenser';
    readonly kitStackId: string;
    readonly inventoryRevision: number;
    readonly buildRevision: number;
    readonly x: number;
    readonly y: number;
    readonly orientation?: 0 | 1 | 2 | 3;
  },
) {
  return ctx.building.place({
    operationId: args.operationId,
    actorPlayerId: 'p1',
    structureDefinitionId: args.definitionId,
    sourceKitStackId: args.kitStackId,
    inventoryContainerId: 'inventory:p1',
    expectedInventoryRevision: args.inventoryRevision,
    expectedBuildRevision: args.buildRevision,
    placement: {
      mode: 'free',
      anchor: createWorldPosition(args.x, args.y),
      orientationQuarterTurns: args.orientation ?? 0,
    },
  });
}

describe('Phase 1 building placement', () => {
  it('starts with the canonical Landing Module and continuous world-space placement', () => {
    const ctx = setup([
      stack('crate-kit', 'item:storage-crate-kit'),
    ]);

    expect(
      ctx.buildings.getStructure('structure-instance:landing-module'),
    ).toMatchObject({
      definitionId: 'structure:landing-module',
      position: { x: 0, y: 0 },
    });

    const result = placeFree(ctx, {
      operationId: 'place:crate',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.37,
      y: 1.13,
      orientation: 3,
    });

    expect(result).toMatchObject({
      status: 'committed',
      structure: {
        position: { x: 2.37, y: 1.13 },
        orientationQuarterTurns: 3,
      },
    });
    expect(
      ctx.items.getContainerView('inventory:p1').stacks,
    ).toHaveLength(0);
    expect(ctx.buildings.getBuildRevision()).toBe(1);
  });

  it('invalid placement rejects before Kit consumption', () => {
    const ctx = setup([
      stack('crate-kit', 'item:storage-crate-kit'),
    ]);
    ctx.spatial.explored = false;

    const before = ctx.items.exportLedgerSnapshot();
    const result = placeFree(ctx, {
      operationId: 'place:unexplored',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2,
      y: 1,
    });

    expect(result).toMatchObject({
      status: 'rejected',
      reason: 'UNEXPLORED_AREA',
    });
    expect(ctx.items.exportLedgerSnapshot()).toEqual(before);
    expect(ctx.buildings.getBuildRevision()).toBe(0);
  });

  it('same OperationId retries without duplicate structure or Kit consumption', () => {
    const ctx = setup([
      stack('crate-kit', 'item:storage-crate-kit'),
    ]);
    const command = {
      operationId: 'place:idempotent',
      actorPlayerId: 'p1',
      structureDefinitionId: 'structure:storage-crate' as const,
      sourceKitStackId: 'crate-kit',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      expectedBuildRevision: 0,
      placement: {
        mode: 'free' as const,
        anchor: createWorldPosition(2.5, 0),
        orientationQuarterTurns: 0 as const,
      },
    };

    const first = ctx.building.place(command);
    const retry = ctx.building.place(command);

    expect(retry).toEqual(first);
    expect(ctx.buildings.exportSnapshot().foothold.structures).toHaveLength(2);
    expect(ctx.items.getContainerView('inventory:p1').revision).toBe(1);
  });

  it('concurrent stale placement loses without consuming second player state', () => {
    const ctx = setup([
      stack('crate-kit-a', 'item:storage-crate-kit'),
      stack('crate-kit-b', 'item:storage-crate-kit'),
    ]);

    expect(placeFree(ctx, {
      operationId: 'place:first',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit-a',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.5,
      y: 0,
    })).toMatchObject({ status: 'committed' });

    const stale = placeFree(ctx, {
      operationId: 'place:stale',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit-b',
      inventoryRevision: 1,
      buildRevision: 0,
      x: 4,
      y: 0,
    });

    expect(stale).toMatchObject({
      status: 'rejected',
      reason: 'WORLD_STATE_CHANGED',
    });
    expect(
      ctx.items
        .getContainerView('inventory:p1')
        .stacks.some((entry) => entry.stackId === 'crate-kit-b'),
    ).toBe(true);
  });

  it('snaps Habitat to a free Landing connector and exposes shelter target 50', () => {
    const ctx = setup([
      stack('habitat-kit', 'item:habitat-kit'),
    ]);

    const placed = ctx.building.place({
      operationId: 'place:habitat',
      actorPlayerId: 'p1',
      structureDefinitionId: 'structure:habitat-room',
      sourceKitStackId: 'habitat-kit',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      expectedBuildRevision: 0,
      placement: {
        mode: 'connector',
        targetConnectorId: 'connector:landing:east',
        requestedOrientationQuarterTurns: 3,
      },
    });

    expect(placed).toMatchObject({
      status: 'committed',
      structure: {
        position: { x: 2, y: 0 },
        orientationQuarterTurns: 0,
      },
    });
    expect(
      ctx.buildings.getShelterThermalTarget(
        createWorldPosition(2, 0),
      ),
    ).toBe(50);
    expect(
      ctx.buildings.getShelterThermalTarget(
        createWorldPosition(10, 0),
      ),
    ).toBeNull();
  });
});

  it('preserves all four authoritative quarter-turn orientations', () => {
    const ctx = setup([
      stack('crate-0', 'item:storage-crate-kit'),
      stack('crate-1', 'item:storage-crate-kit'),
      stack('crate-2', 'item:storage-crate-kit'),
      stack('crate-3', 'item:storage-crate-kit'),
    ]);
    const placements = [
      { x: 2.5, y: 0, orientation: 0 as const },
      { x: -2.5, y: 0, orientation: 1 as const },
      { x: 0, y: 2.5, orientation: 2 as const },
      { x: 0, y: -2.5, orientation: 3 as const },
    ];

    placements.forEach((placement, index) => {
      const result = placeFree(ctx, {
        operationId: `place:rotation:${index}`,
        definitionId: 'structure:storage-crate',
        kitStackId: `crate-${index}`,
        inventoryRevision: index,
        buildRevision: index,
        x: placement.x,
        y: placement.y,
        orientation: placement.orientation,
      });
      expect(result).toMatchObject({
        status: 'committed',
        structure: {
          orientationQuarterTurns: placement.orientation,
        },
      });
    });
  });

describe('Storage and Workbench integration', () => {
  it('placed Storage Crate becomes the canonical shared item container', () => {
    const ctx = setup([
      stack('crate-kit', 'item:storage-crate-kit'),
      stack('fiber', 'item:plant-fiber', 3),
    ]);
    const placed = placeFree(ctx, {
      operationId: 'place:crate',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.5,
      y: 0,
    });
    if (placed.status !== 'committed') {
      throw new Error('Expected crate placement.');
    }
    const containerId = placed.structure.containerId!;

    expect(ctx.items.execute({
      type: 'transfer',
      operationId: 'transfer:fiber',
      playerId: 'p1',
      sourceContainerId: 'inventory:p1',
      sourceExpectedRevision: 1,
      targetContainerId: containerId,
      targetExpectedRevision: 0,
      sourceStackId: 'fiber',
      quantity: 3,
    })).toMatchObject({ status: 'committed' });

    expect(ctx.items.getContainerView(containerId).stacks).toMatchObject([
      { itemDefinitionId: 'item:plant-fiber', quantity: 3 },
    ]);
  });

  it('placed Workbench satisfies Tier 1 crafting station authority', () => {
    const ctx = setup([
      stack('workbench-kit', 'item:workbench-kit'),
      stack('fiber', 'item:plant-fiber', 2),
      stack('ore', 'item:metal-ore', 1),
    ]);
    const placed = placeFree(ctx, {
      operationId: 'place:workbench',
      definitionId: 'structure:workbench',
      kitStackId: 'workbench-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.5,
      y: 0,
    });
    if (placed.status !== 'committed') {
      throw new Error('Expected Workbench placement.');
    }

    expect(ctx.items.execute({
      type: 'craft',
      operationId: 'craft:patch',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 1,
      recipeId: 'recipe:repair-patch',
      workbench: {
        structureInstanceId: placed.structure.structureId,
        expectedRevision: 0,
      },
    })).toMatchObject({ status: 'committed' });
  });
});

describe('Power and Atmospheric Water Condenser', () => {
  it('uses 10 PU capacity, 5 WU eligibility, and 5 PU Condenser grant', () => {
    const ctx = setup([
      stack('power-kit', 'item:power-unit-kit'),
      stack('machine-kit', 'item:machine-kit'),
    ]);
    expect(PHASE1_POWER_CAPACITY_PU).toBe(10);
    expect(PHASE1_POWER_RADIUS_WU).toBe(5);

    expect(placeFree(ctx, {
      operationId: 'place:power',
      definitionId: 'structure:compact-power-unit',
      kitStackId: 'power-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 3,
      y: 0,
    })).toMatchObject({ status: 'committed' });

    const machine = placeFree(ctx, {
      operationId: 'place:machine',
      definitionId: 'structure:atmospheric-water-condenser',
      kitStackId: 'machine-kit',
      inventoryRevision: 1,
      buildRevision: 1,
      x: 4.5,
      y: 0,
    });
    if (machine.status !== 'committed') {
      throw new Error('Expected Condenser placement.');
    }

    expect(ctx.buildings.getPowerNetwork()).toMatchObject({
      capacityPu: 10,
      producerStructureId: 'structure-instance:place:power',
      grantedConsumerIds: [
        'structure-instance:place:machine',
      ],
    });
    expect(ctx.machine.getView(machine.structure.structureId).derivedState)
      .toBe('RUNNING');
  });

  it('produces exactly one Clean Water on the 5,400th RUNNING tick', () => {
    const ctx = setup([
      stack('power-kit', 'item:power-unit-kit'),
      stack('machine-kit', 'item:machine-kit'),
    ]);
    placeFree(ctx, {
      operationId: 'place:power',
      definitionId: 'structure:compact-power-unit',
      kitStackId: 'power-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 3,
      y: 0,
    });
    const placed = placeFree(ctx, {
      operationId: 'place:machine',
      definitionId: 'structure:atmospheric-water-condenser',
      kitStackId: 'machine-kit',
      inventoryRevision: 1,
      buildRevision: 1,
      x: 4.5,
      y: 0,
    });
    if (placed.status !== 'committed') {
      throw new Error('Expected Condenser placement.');
    }

    for (let tick = 1; tick < 5400; tick += 1) {
      ctx.machine.tick(placed.structure.structureId);
    }
    expect(ctx.machine.getView(placed.structure.structureId)).toMatchObject({
      productionProgressTicks: 5399,
      outputCount: 0,
    });

    expect(ctx.machine.tick(placed.structure.structureId)).toMatchObject({
      productionProgressTicks: 0,
      completedCycleOrdinal: 1,
      outputCount: 1,
      derivedState: 'RUNNING',
    });
  });

  it('OUTPUT FULL requests zero power and collection resumes existing progress', () => {
    const ctx = setup([
      stack('power-kit', 'item:power-unit-kit'),
      stack('machine-kit', 'item:machine-kit'),
    ]);
    placeFree(ctx, {
      operationId: 'place:power',
      definitionId: 'structure:compact-power-unit',
      kitStackId: 'power-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 3,
      y: 0,
    });
    const placed = placeFree(ctx, {
      operationId: 'place:machine',
      definitionId: 'structure:atmospheric-water-condenser',
      kitStackId: 'machine-kit',
      inventoryRevision: 1,
      buildRevision: 1,
      x: 4.5,
      y: 0,
    });
    if (placed.status !== 'committed') {
      throw new Error('Expected Condenser placement.');
    }
    const structureId = placed.structure.structureId;
    const outputId = placed.structure.containerId!;

    for (let i = 0; i < 123; i += 1) {
      ctx.machine.tick(structureId);
    }
    const progress = ctx.machine.getView(structureId).productionProgressTicks;

    for (let ordinal = 0; ordinal < 4; ordinal += 1) {
      const output = ctx.items.getContainerView(outputId);
      expect(ctx.items.commitMachineOutput({
        operationId: `test-fill:${ordinal}`,
        outputContainerId: outputId,
        expectedOutputRevision: output.revision,
        itemDefinitionId: 'item:clean-water',
      })).toMatchObject({ status: 'committed' });
    }

    expect(ctx.machine.tick(structureId)).toMatchObject({
      derivedState: 'OUTPUT_FULL',
      productionProgressTicks: progress,
      outputCount: 4,
    });
    expect(ctx.buildings.getPowerNetwork().grantedConsumerIds).toEqual([]);

    const output = ctx.items.getContainerView(outputId);
    const water = output.stacks[0];
    if (water === undefined) throw new Error('Expected machine water.');
    expect(ctx.items.execute({
      type: 'transfer',
      operationId: 'collect:water',
      playerId: 'p1',
      sourceContainerId: outputId,
      sourceExpectedRevision: output.revision,
      targetContainerId: 'inventory:p1',
      targetExpectedRevision: 2,
      sourceStackId: water.stackId,
      quantity: 1,
    })).toMatchObject({ status: 'committed' });

    const resumed = ctx.machine.tick(structureId);
    expect(resumed.derivedState).toBe('RUNNING');
    expect(resumed.productionProgressTicks).toBe(progress + 1);
  });

  it('Power Unit dismantle makes Condenser UNPOWERED without deleting progress', () => {
    const ctx = setup([
      stack('power-kit', 'item:power-unit-kit'),
      stack('machine-kit', 'item:machine-kit'),
    ]);
    const power = placeFree(ctx, {
      operationId: 'place:power',
      definitionId: 'structure:compact-power-unit',
      kitStackId: 'power-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 3,
      y: 0,
    });
    const machine = placeFree(ctx, {
      operationId: 'place:machine',
      definitionId: 'structure:atmospheric-water-condenser',
      kitStackId: 'machine-kit',
      inventoryRevision: 1,
      buildRevision: 1,
      x: 4.5,
      y: 0,
    });
    if (power.status !== 'committed' || machine.status !== 'committed') {
      throw new Error('Expected power/machine placement.');
    }

    for (let i=0; i<25; i+=1) ctx.machine.tick(machine.structure.structureId);
    const progress = ctx.machine.getView(
      machine.structure.structureId,
    ).productionProgressTicks;

    expect(ctx.building.dismantle({
      operationId: 'dismantle:power',
      actorPlayerId: 'p1',
      structureId: power.structure.structureId,
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 2,
      expectedStructureRevision: 0,
      expectedBuildRevision: 2,
    })).toMatchObject({ status: 'committed' });

    expect(ctx.machine.tick(machine.structure.structureId)).toMatchObject({
      derivedState: 'UNPOWERED',
      productionProgressTicks: progress,
    });
  });
});

describe('Dismantle and reconstruction', () => {
  it('rejects non-empty Storage Crate dismantle without refund/removal', () => {
    const ctx = setup([
      stack('crate-kit', 'item:storage-crate-kit'),
      stack('fiber', 'item:plant-fiber', 1),
    ]);
    const placed = placeFree(ctx, {
      operationId: 'place:crate',
      definitionId: 'structure:storage-crate',
      kitStackId: 'crate-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.5,
      y: 0,
    });
    if (placed.status !== 'committed') throw new Error('Expected crate.');
    const containerId = placed.structure.containerId!;

    ctx.items.execute({
      type:'transfer',operationId:'store:fiber',playerId:'p1',
      sourceContainerId:'inventory:p1',sourceExpectedRevision:1,
      targetContainerId:containerId,targetExpectedRevision:0,
      sourceStackId:'fiber',quantity:1,
    });
    const before = ctx.items.exportLedgerSnapshot();

    expect(ctx.building.dismantle({
      operationId:'dismantle:crate',actorPlayerId:'p1',
      structureId:placed.structure.structureId,
      inventoryContainerId:'inventory:p1',
      expectedInventoryRevision:2,
      expectedStructureRevision:0,
      expectedBuildRevision:1,
    })).toMatchObject({
      status:'rejected',
      reason:'CONTAINER_NOT_EMPTY',
    });
    expect(ctx.items.exportLedgerSnapshot()).toEqual(before);
    expect(ctx.buildings.getStructure(placed.structure.structureId))
      .not.toBeNull();
  });

  it('successful dismantle returns exactly one original Kit', () => {
    const ctx = setup([
      stack('workbench-kit', 'item:workbench-kit'),
    ]);
    const placed = placeFree(ctx, {
      operationId: 'place:workbench-refund',
      definitionId: 'structure:workbench',
      kitStackId: 'workbench-kit',
      inventoryRevision: 0,
      buildRevision: 0,
      x: 2.5,
      y: 0,
    });
    if (placed.status !== 'committed') throw new Error('Expected Workbench.');

    expect(ctx.building.dismantle({
      operationId: 'dismantle:workbench-refund',
      actorPlayerId: 'p1',
      structureId: placed.structure.structureId,
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 1,
      expectedStructureRevision: 0,
      expectedBuildRevision: 1,
    })).toMatchObject({ status: 'committed' });

    const kits = ctx.items
      .getContainerView('inventory:p1')
      .stacks.filter(
        (entry) => entry.itemDefinitionId === 'item:workbench-kit',
      );
    expect(kits).toHaveLength(1);
    expect(kits[0]?.quantity).toBe(1);
    expect(ctx.buildings.getStructure(placed.structure.structureId))
      .toBeNull();
  });

  it('Habitat dismantle rejects while a player is inside', () => {
    const ctx = setup([
      stack('habitat-kit', 'item:habitat-kit'),
    ]);
    const placed = ctx.building.place({
      operationId: 'place:habitat-inside',
      actorPlayerId: 'p1',
      structureDefinitionId: 'structure:habitat-room',
      sourceKitStackId: 'habitat-kit',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      expectedBuildRevision: 0,
      placement: {
        mode: 'connector',
        targetConnectorId: 'connector:landing:east',
        requestedOrientationQuarterTurns: 0,
      },
    });
    if (placed.status !== 'committed') throw new Error('Expected Habitat.');
    ctx.spatial.playerInside = true;

    expect(ctx.building.dismantle({
      operationId: 'dismantle:habitat-inside',
      actorPlayerId: 'p1',
      structureId: placed.structure.structureId,
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 1,
      expectedStructureRevision: 0,
      expectedBuildRevision: 1,
    })).toMatchObject({
      status: 'rejected',
      reason: 'PLAYER_INSIDE',
    });
    expect(ctx.buildings.getStructure(placed.structure.structureId))
      .not.toBeNull();
  });

  it('round-trips foothold + machine progress + item output without offline production', () => {
    const ctx = setup([
      stack('power-kit', 'item:power-unit-kit'),
      stack('machine-kit', 'item:machine-kit'),
    ]);
    placeFree(ctx,{
      operationId:'place:power',definitionId:'structure:compact-power-unit',
      kitStackId:'power-kit',inventoryRevision:0,buildRevision:0,x:3,y:0,
    });
    const placed=placeFree(ctx,{
      operationId:'place:machine',
      definitionId:'structure:atmospheric-water-condenser',
      kitStackId:'machine-kit',inventoryRevision:1,buildRevision:1,x:4.5,y:0,
    });
    if(placed.status!=='committed') throw new Error('Expected machine.');
    for(let i=0;i<777;i+=1) ctx.machine.tick(placed.structure.structureId);

    const worldSnapshot=ctx.buildings.exportSnapshot();
    const itemSnapshot=ctx.items.exportLedgerSnapshot();

    const spatial2=new Phase1BuildingTestSpatial();
    const buildings2=new Phase1BuildingWorld(spatial2,worldSnapshot);
    const base2=new Phase1ItemTestWorld();
    const adapter2=new BuildingItemWorldAdapter(base2,buildings2);
    const items2=new Phase1ItemAuthority({
      catalog:ctx.catalog,world:adapter2,initialLedger:itemSnapshot,
    });
    const machine2=new Phase1CondenserAuthority(items2,buildings2);

    expect(buildings2.exportSnapshot()).toEqual(worldSnapshot);
    expect(items2.exportLedgerSnapshot()).toEqual(itemSnapshot);
    expect(machine2.getView(placed.structure.structureId)).toMatchObject({
      productionProgressTicks:777,
      completedCycleOrdinal:0,
      outputCount:0,
    });
  });
});
