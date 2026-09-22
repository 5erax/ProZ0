import { describe, expect, it } from 'vitest';
import {
  PHASE1_REQUIRED_CONTENT_IDS,
  createPhase1ContentCatalog,
} from '../../src/content';

describe('Phase 1 vertical-slice content pack', () => {
  const catalog = createPhase1ContentCatalog();

  it('contains exactly the bounded approved definition families', () => {
    expect(catalog.size).toBe(PHASE1_REQUIRED_CONTENT_IDS.length);

    for (const id of PHASE1_REQUIRED_CONTENT_IDS) {
      expect(catalog.has(id), id).toBe(true);
    }

    expect(catalog.list('item')).toHaveLength(18);
    expect(catalog.list('recipe')).toHaveLength(11);
    expect(catalog.list('resource')).toHaveLength(6);
    expect(catalog.list('entity')).toHaveLength(1);
    expect(catalog.list('structure')).toHaveLength(6);
    expect(catalog.list('machine')).toHaveLength(1);
    expect(catalog.list('hazard')).toHaveLength(1);
    expect(catalog.list('weather')).toHaveLength(1);
    expect(catalog.list('hostile')).toHaveLength(1);
    expect(catalog.list('ruin')).toHaveLength(1);
    expect(catalog.list('progression')).toHaveLength(1);
    expect(catalog.list('skill')).toHaveLength(2);
    expect(catalog.list('profession')).toHaveLength(2);
    expect(catalog.list('profession-quest')).toHaveLength(2);
  });

  it('locks the approved 18-item logistics table', () => {
    const actual = catalog.list('item').map((item) => [
      item.id,
      item.category,
      item.unitWeightKg,
      item.unitVolume,
      item.maxStack,
      item.conditionMax,
    ]);

    expect(actual).toEqual([
      ['item:ancient-alloy-shard', 'discovery-item', 2, 2, 1, null],
      ['item:basic-spear', 'weapon', 1.8, 2.5, 1, 100],
      ['item:clean-water', 'water', 0.5, 0.5, 10, null],
      ['item:cordage', 'component', 0.1, 0.2, 20, null],
      ['item:edible-plant', 'food', 0.2, 0.25, 10, null],
      ['item:field-dressing', 'medical', 0.2, 0.2, 10, null],
      ['item:habitat-kit', 'construction-kit', 12, 12, 1, null],
      ['item:machine-kit', 'construction-kit', 10, 10, 1, null],
      ['item:metal-ore', 'raw-resource', 1, 0.75, 20, null],
      ['item:plant-fiber', 'raw-resource', 0.05, 0.1, 50, null],
      ['item:power-unit-kit', 'construction-kit', 10, 8, 1, null],
      ['item:repair-patch', 'component', 0.25, 0.3, 10, null],
      ['item:stone', 'raw-resource', 0.75, 0.75, 20, null],
      ['item:stone-field-tool', 'tool', 1.5, 2, 1, 100],
      ['item:storage-crate-kit', 'construction-kit', 5, 6, 1, null],
      ['item:thermal-wrap', 'equipment', 1, 2, 1, 100],
      ['item:timber', 'raw-resource', 1, 2, 10, null],
      ['item:workbench-kit', 'construction-kit', 8, 8, 1, null],
    ]);
  });

  it('locks consumable, weapon and thermal item effects', () => {
    expect(catalog.getAs('item:clean-water', 'item').useProfile).toEqual({
      type: 'restore-stat',
      stat: 'water',
      amount: 25,
      channelSeconds: 1,
    });
    expect(catalog.getAs('item:edible-plant', 'item').useProfile).toEqual({
      type: 'restore-stat',
      stat: 'food',
      amount: 20,
      channelSeconds: 1,
    });
    expect(catalog.getAs('item:field-dressing', 'item').useProfile).toEqual({
      type: 'restore-stat',
      stat: 'health',
      amount: 30,
      channelSeconds: 1,
    });
    expect(catalog.getAs('item:basic-spear', 'item').useProfile).toEqual({
      type: 'melee-weapon',
      rangeFootprints: 1.5,
      frontalArcDegrees: 90,
      staminaCost: 15,
      damage: 25,
      cooldownSeconds: 0.65,
      conditionCostOnSuccessfulHit: 1,
    });
    expect(catalog.getAs('item:thermal-wrap', 'item').useProfile).toEqual({
      type: 'thermal-protection',
      harmfulThermalRateMultiplier: 0.5,
    });
  });

  it('locks all recipe inputs, outputs, and station tiers', () => {
    const recipes = Object.fromEntries(
      catalog.list('recipe').map((definition) => [
        definition.id,
        {
          tier: definition.tier,
          station: definition.requiredStationStructureId,
          inputs: definition.inputs,
          outputs: definition.outputs,
        },
      ]),
    );

    expect(recipes).toMatchObject({
      'recipe:cordage': {
        tier: 'hand',
        station: null,
        inputs: [{ itemId: 'item:plant-fiber', quantity: 3 }],
        outputs: [{ itemId: 'item:cordage', quantity: 1 }],
      },
      'recipe:stone-field-tool': {
        tier: 'hand',
        station: null,
        inputs: [
          { itemId: 'item:cordage', quantity: 1 },
          { itemId: 'item:stone', quantity: 2 },
          { itemId: 'item:timber', quantity: 1 },
        ],
        outputs: [
          {
            itemId: 'item:stone-field-tool',
            quantity: 1,
            initialCondition: 100,
          },
        ],
      },
      'recipe:basic-spear': {
        tier: 'hand',
        station: null,
        inputs: [
          { itemId: 'item:cordage', quantity: 1 },
          { itemId: 'item:stone', quantity: 1 },
          { itemId: 'item:timber', quantity: 2 },
        ],
        outputs: [
          {
            itemId: 'item:basic-spear',
            quantity: 1,
            initialCondition: 100,
          },
        ],
      },
      'recipe:thermal-wrap': {
        tier: 'hand',
        station: null,
        inputs: [
          { itemId: 'item:cordage', quantity: 2 },
          { itemId: 'item:plant-fiber', quantity: 5 },
        ],
        outputs: [
          {
            itemId: 'item:thermal-wrap',
            quantity: 1,
            initialCondition: 100,
          },
        ],
      },
      'recipe:field-dressing': {
        tier: 'hand',
        station: null,
        inputs: [{ itemId: 'item:plant-fiber', quantity: 4 }],
        outputs: [{ itemId: 'item:field-dressing', quantity: 1 }],
      },
      'recipe:storage-crate-kit': {
        tier: 'hand',
        station: null,
        inputs: [
          { itemId: 'item:cordage', quantity: 2 },
          { itemId: 'item:timber', quantity: 4 },
        ],
        outputs: [{ itemId: 'item:storage-crate-kit', quantity: 1 }],
      },
      'recipe:workbench-kit': {
        tier: 'hand',
        station: null,
        inputs: [
          { itemId: 'item:cordage', quantity: 2 },
          { itemId: 'item:stone', quantity: 4 },
          { itemId: 'item:timber', quantity: 4 },
        ],
        outputs: [{ itemId: 'item:workbench-kit', quantity: 1 }],
      },
      'recipe:repair-patch': {
        tier: 'workbench',
        station: 'structure:workbench',
        inputs: [
          { itemId: 'item:metal-ore', quantity: 1 },
          { itemId: 'item:plant-fiber', quantity: 2 },
        ],
        outputs: [{ itemId: 'item:repair-patch', quantity: 1 }],
      },
      'recipe:habitat-kit': {
        tier: 'workbench',
        station: 'structure:workbench',
        inputs: [
          { itemId: 'item:cordage', quantity: 3 },
          { itemId: 'item:stone', quantity: 6 },
          { itemId: 'item:timber', quantity: 6 },
        ],
        outputs: [{ itemId: 'item:habitat-kit', quantity: 1 }],
      },
      'recipe:power-unit-kit': {
        tier: 'workbench',
        station: 'structure:workbench',
        inputs: [
          { itemId: 'item:cordage', quantity: 2 },
          { itemId: 'item:metal-ore', quantity: 5 },
          { itemId: 'item:timber', quantity: 4 },
        ],
        outputs: [{ itemId: 'item:power-unit-kit', quantity: 1 }],
      },
      'recipe:machine-kit': {
        tier: 'workbench',
        station: 'structure:workbench',
        inputs: [
          { itemId: 'item:cordage', quantity: 3 },
          { itemId: 'item:metal-ore', quantity: 6 },
          { itemId: 'item:timber', quantity: 4 },
        ],
        outputs: [{ itemId: 'item:machine-kit', quantity: 1 }],
      },
    });
  });

  it('locks resource yields, depletion, regeneration and tool wear', () => {
    const resources = catalog.list('resource').map((definition) => ({
      id: definition.id,
      channel: definition.gatherChannelSeconds,
      tool: definition.requiredToolItemId,
      output: definition.output,
      actions: definition.maxGatherActions,
      regen: definition.regenerationActiveSeconds,
      wear: definition.toolConditionCostPerSuccessfulGather,
    }));

    expect(resources).toEqual([
      {
        id: 'resource:fiber-plant',
        channel: 0.6,
        tool: null,
        output: { itemId: 'item:plant-fiber', quantity: 2 },
        actions: 4,
        regen: 600,
        wear: 0,
      },
      {
        id: 'resource:food-plant',
        channel: 0.6,
        tool: null,
        output: { itemId: 'item:edible-plant', quantity: 1 },
        actions: 3,
        regen: 900,
        wear: 0,
      },
      {
        id: 'resource:metal-ore-node',
        channel: 1,
        tool: 'item:stone-field-tool',
        output: { itemId: 'item:metal-ore', quantity: 1 },
        actions: 6,
        regen: 5400,
        wear: 2,
      },
      {
        id: 'resource:potable-water-source',
        channel: 0.6,
        tool: null,
        output: { itemId: 'item:clean-water', quantity: 1 },
        actions: null,
        regen: null,
        wear: 0,
      },
      {
        id: 'resource:stone-outcrop',
        channel: 1,
        tool: 'item:stone-field-tool',
        output: { itemId: 'item:stone', quantity: 2 },
        actions: 4,
        regen: 1800,
        wear: 2,
      },
      {
        id: 'resource:timber-source',
        channel: 1,
        tool: 'item:stone-field-tool',
        output: { itemId: 'item:timber', quantity: 1 },
        actions: 5,
        regen: 1800,
        wear: 2,
      },
    ]);
  });

  it('locks structure, machine, weather, hostile and ruin contracts', () => {
    const storage = catalog.getAs('structure:storage-crate', 'structure');
    expect(storage.phase1WorldCap).toBe(4);
    expect(storage.container).toEqual({
      maxWeightKg: 100,
      maxVolume: 120,
      acceptsAllPhase1PortableCategories: true,
      nestedContainersAllowed: false,
    });

    expect(
      catalog.getAs('structure:habitat-room', 'structure').shelter,
    ).toEqual({ thermalTarget: 50 });

    expect(
      catalog.getAs('structure:compact-power-unit', 'structure').powerSource,
    ).toEqual({
      capacityPu: 10,
      radiusFootprints: 8,
      alwaysOn: true,
      consumesPortableFuel: false,
    });

    expect(
      catalog.getAs(
        'machine:atmospheric-water-condenser',
        'machine',
      ),
    ).toMatchObject({
      powerDemandPu: 5,
      inputItems: [],
      outputItemId: 'item:clean-water',
      outputQuantityPerCycle: 1,
      cycleActivePoweredSeconds: 90,
      outputBufferCapacity: 4,
      supportsManualEnable: true,
      producesWhileAuthorityOffline: false,
      hasPeriodicWear: false,
    });

    expect(catalog.getAs('weather:cold-rain', 'weather')).toMatchObject({
      hazardIds: ['hazard:cold-exposure'],
      firstSessionStartWindowActiveMinutes: [28, 38],
      durationActiveSeconds: 360,
      warningSeconds: 60,
      dayThermalTarget: 30,
      nightThermalTarget: 20,
      changesPersistentFogKnowledge: false,
      directHealthDamage: false,
    });

    expect(
      catalog.getAs('hostile:territorial-predator', 'hostile'),
    ).toMatchObject({
      maxHealth: 75,
      aggressionRadiusFootprints: 5,
      alertSeconds: 0.4,
      leashRadiusFootprints: 12,
      disengageOutsideSeconds: 2,
      attack: {
        rangeFootprints: 1.1,
        windupSeconds: 0.55,
        damage: 20,
        recoverySeconds: 1.2,
      },
      targetPolicy: 'nearest-valid-threatening-player',
      requiredUniqueDropItemId: null,
    });

    expect(
      catalog.getAs('ruin:previous-civilization-ruin', 'ruin'),
    ).toMatchObject({
      locateRadiusFootprints: 6,
      interaction: 'inspect',
      investigationIsImmediate: true,
      discoverySharedWithTeam: true,
      oneTimePhysicalReward: {
        itemId: 'item:ancient-alloy-shard',
        quantity: 1,
      },
      rewardRemainsClaimableIfInventoryFull: true,
    });
  });

  it('locks progression thresholds, bounded repeat rules and death loss', () => {
    const progression = catalog.getAs(
      'progression:phase1-early-progression',
      'progression',
    );

    expect(progression.levelThresholds).toEqual([
      { level: 1, totalXpRequired: 0 },
      { level: 2, totalXpRequired: 100 },
      { level: 3, totalXpRequired: 225 },
      { level: 4, totalXpRequired: 400 },
      { level: 5, totalXpRequired: 650 },
    ]);

    expect(progression.repeatRules).toEqual([
      {
        id: 'repeat:craft',
        triggerType: 'craft',
        xpPerRewardedAction: 2,
        maxRewardedActions: 5,
        lifetimeScope: 'per-player-world',
      },
      {
        id: 'repeat:gather',
        triggerType: 'gather',
        xpPerRewardedAction: 2,
        maxRewardedActions: 20,
        lifetimeScope: 'per-player-world',
      },
      {
        id: 'repeat:repair',
        triggerType: 'repair',
        xpPerRewardedAction: 4,
        maxRewardedActions: 3,
        lifetimeScope: 'per-player-world',
      },
    ]);

    expect(progression.deathXpLoss).toEqual({
      percentCurrentLevelProgress: 5,
      minimumLossWhenProgressPositive: 1,
      mayReduceLevel: false,
    });

    expect(
      progression.milestoneRules.find(
        (rule) => rule.id === 'first-ruin-inspect:previous-civilization-ruin',
      )?.xp,
    ).toBe(100);
    expect(
      progression.milestoneRules.find(
        (rule) => rule.id === 'hostile-resolution:territorial-predator-base',
      )?.xp,
    ).toBe(20);
    expect(
      progression.milestoneRules.find(
        (rule) =>
          rule.id === 'hostile-resolution:territorial-predator-kill-top-up',
      )?.xp,
    ).toBe(10);
  });

  it('locks prototype skill and profession quest contracts without class lock', () => {
    expect(catalog.getAs('skill:fieldcraft-basics', 'skill').requirements)
      .toEqual([
        { type: 'first-expedition-band-entry' },
        { type: 'minimum-level', level: 2 },
      ]);

    expect(catalog.getAs('skill:maintenance-basics', 'skill').requirements)
      .toEqual([
        { type: 'first-workbench-condition-repair' },
        { type: 'minimum-level', level: 2 },
      ]);

    for (const id of [
      'profession:engineer-prototype',
      'profession:explorer-prototype',
    ]) {
      expect(catalog.getAs(id, 'profession')).toMatchObject({
        prototypeOnly: true,
        exclusiveLock: false,
        grantsExclusiveCriticalPathCapability: false,
      });
    }

    const explorer = catalog.getAs(
      'profession-quest:chart-the-unknown',
      'profession-quest',
    );
    expect(explorer.minimumLevel).toBe(3);
    expect(explorer.requiredSkillId).toBe('skill:fieldcraft-basics');
    expect(explorer.rewardProfessionId).toBe('profession:explorer-prototype');
    expect(explorer.rewardXp).toBe(40);
    expect(explorer.objectives.map((objective) => objective.type)).toEqual([
      'locate-ruin',
      'inspect-ruin',
      'return-alive-to-any-structure',
    ]);

    const engineer = catalog.getAs(
      'profession-quest:bring-water-online',
      'profession-quest',
    );
    expect(engineer.minimumLevel).toBe(3);
    expect(engineer.requiredSkillId).toBe('skill:maintenance-basics');
    expect(engineer.rewardProfessionId).toBe('profession:engineer-prototype');
    expect(engineer.rewardXp).toBe(40);
    expect(engineer.objectives.map((objective) => objective.type)).toEqual([
      'structures-present',
      'interact-powered-machine',
      'collect-machine-output',
    ]);
  });
});
