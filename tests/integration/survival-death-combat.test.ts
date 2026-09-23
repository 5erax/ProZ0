import { describe, expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { createWorldPosition } from '../../src/foundation';
import {
  Phase1CombatAuthority,
  Phase1DeathAuthority,
  Phase1ItemAuthority,
  Phase1SurvivalAuthority,
  type ContainerState,
  type DeathXpPenaltyPort,
  type ItemLedgerSnapshot,
} from '../../src/simulation';
import { Phase1SurvivalTestWorld } from '../support/Phase1SurvivalTestWorld';

function ledger(stacks: ContainerState['stacks']): ItemLedgerSnapshot {
  return {
    containers: [{
      containerId: 'inventory:p1',
      kind: 'player-inventory',
      ownerPlayerId: 'p1',
      revision: 0,
      stacks,
    }],
  };
}

function setup(stacks: ContainerState['stacks'] = []) {
  const catalog = createPhase1ContentCatalog();
  const world = new Phase1SurvivalTestWorld();
  const items = new Phase1ItemAuthority({
    catalog,
    world,
    initialLedger: ledger(stacks),
  });
  const survival = new Phase1SurvivalAuthority({ catalog, items });
  survival.registerPlayer('p1');
  return { catalog, world, items, survival };
}

const NORMAL = {
  thermalTarget: 50,
  thermalWrapActive: false,
  carryState: 'NORMAL' as const,
};

describe('Phase 1 survival fixed-step authority', () => {
  it('drains Water/Food exactly by approved per-minute rates independent of render cadence', () => {
    const { survival } = setup();
    for (let tick = 1; tick <= 3600; tick += 1) {
      survival.stepPlayer('p1', tick, NORMAL);
    }
    const view = survival.getPlayerView('p1');
    expect(view.water).toBe(79);
    expect(view.food).toBe(69.4);
    expect(view.stamina).toBe(100);
  });

  it('Thermal Wrap halves harmful movement away from comfortable range', () => {
    const a = setup().survival;
    const b = setup().survival;
    for (let tick = 1; tick <= 3600; tick += 1) {
      a.stepPlayer('p1', tick, {
        thermalTarget: 20,
        thermalWrapActive: false,
        carryState: 'NORMAL',
      });
      b.stepPlayer('p1', tick, {
        thermalTarget: 20,
        thermalWrapActive: true,
        carryState: 'NORMAL',
      });
    }
    expect(a.getPlayerView('p1').temperature).toBe(44);
    expect(b.getPlayerView('p1').temperature).toBe(47);
  });

  it('consumes restorative item only after the exact 60-tick channel', () => {
    const { survival, items } = setup([{
      stackId: 'food-a',
      itemDefinitionId: 'item:edible-plant',
      quantity: 1,
      condition: null,
    }]);

    expect(survival.beginConsume({
      operationId: 'consume:food',
      playerId: 'p1',
      inventoryContainerId: 'inventory:p1',
      expectedInventoryRevision: 0,
      sourceStackId: 'food-a',
    })).toMatchObject({ status:'started', requiredTicks:60 });

    for (let i=0;i<59;i+=1) {
      expect(survival.tickConsume('p1').status).toBe('channeling');
    }
    expect(items.getContainerView('inventory:p1').stacks).toHaveLength(1);
    expect(survival.tickConsume('p1')).toMatchObject({
      status:'resolved', committed:true,
    });
    expect(survival.getPlayerView('p1').food).toBe(90);
    expect(items.getContainerView('inventory:p1').stacks).toHaveLength(0);
  });

  it('duplicate DamageId applies only once', () => {
    const { survival } = setup();
    const event = {
      damageId:'damage:1',
      sourceType:'hostile-attack' as const,
      sourceEntityId:'predator:1',
      targetPlayerId:'p1',
      amount:20,
      tick:0,
    };
    expect(survival.applyAuthorityDamage(event)).toMatchObject({
      status:'applied',healthAfter:80,
    });
    expect(survival.applyAuthorityDamage(event)).toMatchObject({
      status:'duplicate',healthAfter:80,
    });
  });
});

describe('Phase 1 combat authority', () => {
  it('AttackId is idempotent and authoritative hit mutates predator once', () => {
    const { catalog, world, items, survival } = setup();
    world.setPlayerPosition('p1', createWorldPosition(0,0));
    world.addPredator({
      entityId:'predator:1',
      position:createWorldPosition(0.5,0),
      encounterAnchor:createWorldPosition(0.5,0),
      revision:0,health:75,state:'idle',targetPlayerId:null,
      stateUntilTick:null,outsideLeashTicks:0,
    });
    const combat = new Phase1CombatAuthority(catalog,survival,items,world);
    const command = {
      attackId:'attack:1',playerId:'p1',
      inventoryContainerId:'inventory:p1',
      expectedInventoryRevision:0,
      facingX:1,facingY:0,
    };
    expect(combat.submitAttack(command,'predator:1')).toMatchObject({
      status:'hit',damage:5,
    });
    expect(world.getPredator('predator:1')?.health).toBe(70);
    expect(combat.submitAttack(command,'predator:1')).toMatchObject({
      status:'duplicate',
    });
    expect(world.getPredator('predator:1')?.health).toBe(70);
  });

  it('Basic Spear spends 15 stamina and loses condition only on authoritative hit', () => {
    const { catalog, world, items, survival } = setup([{
      stackId:'spear',
      itemDefinitionId:'item:basic-spear',
      quantity:1,
      condition:100,
    }]);
    world.setPlayerPosition('p1', createWorldPosition(0,0));
    world.addPredator({
      entityId:'predator:1',
      position:createWorldPosition(0.5,0),
      encounterAnchor:createWorldPosition(0.5,0),
      revision:0,health:75,state:'idle',targetPlayerId:null,
      stateUntilTick:null,outsideLeashTicks:0,
    });
    const combat = new Phase1CombatAuthority(catalog,survival,items,world);
    combat.setEquippedWeapon('p1','spear');

    expect(combat.submitAttack({
      attackId:'spear-hit',playerId:'p1',
      inventoryContainerId:'inventory:p1',expectedInventoryRevision:0,
      facingX:1,facingY:0,
    },'predator:1')).toMatchObject({status:'hit',damage:25});

    expect(survival.getPlayerView('p1').stamina).toBe(85);
    expect(world.getPredator('predator:1')?.health).toBe(50);
    expect(items.getContainerView('inventory:p1').stacks[0]?.condition).toBe(99);
  });

  it('moving out during the 33-tick predator windup prevents damage', () => {
    const { catalog, world, items, survival } = setup();
    world.setPlayerPosition('p1', createWorldPosition(0,0));
    world.addPredator({
      entityId:'predator:1',
      position:createWorldPosition(0.3,0),
      encounterAnchor:createWorldPosition(0.3,0),
      revision:0,health:75,state:'idle',targetPlayerId:null,
      stateUntilTick:null,outsideLeashTicks:0,
    });
    const combat = new Phase1CombatAuthority(catalog,survival,items,world);
    combat.tickPredator('predator:1',['p1']);
    expect(world.getPredator('predator:1')?.state).toBe('alert');
    for(let tick=1;tick<=24;tick+=1) survival.stepPlayer('p1',tick,NORMAL);
    combat.tickPredator('predator:1',['p1']);
    expect(world.getPredator('predator:1')?.state).toBe('chase');
    combat.tickPredator('predator:1',['p1']);
    expect(world.getPredator('predator:1')?.state).toBe('attack-windup');
    for(let tick=25;tick<=57;tick+=1) survival.stepPlayer('p1',tick,NORMAL);
    world.setPlayerPosition('p1', createWorldPosition(10,0));
    combat.tickPredator('predator:1',['p1']);
    expect(survival.getPlayerView('p1').health).toBe(100);
    expect(world.getPredator('predator:1')?.state).toBe('recovery');
  });
});

describe('Phase 1 death / respawn / recovery', () => {
  it('reconstructs committed DeathId result so reopen retry cannot reapply penalties', () => {
    const catalog = createPhase1ContentCatalog();
    const world = new Phase1SurvivalTestWorld();
    const items = new Phase1ItemAuthority({
      catalog,
      world,
      initialLedger: ledger([{
        stackId:'spear',
        itemDefinitionId:'item:basic-spear',
        quantity:1,
        condition:100,
      }]),
    });
    const survival = new Phase1SurvivalAuthority({ catalog, items });
    survival.registerPlayer('p1');

    let xpCommits=0;
    const xp:DeathXpPenaltyPort = {
      reserveDeathXpPenalty(request) {
        return {
          reservationId:`xp:${request.deathId}`,
          deathId:request.deathId,
          playerId:request.playerId,
          xpLoss:5,
        };
      },
      commitReservedDeathXpPenalty(){xpCommits+=1;},
      releaseDeathXpPenalty(){},
    };
    const death = new Phase1DeathAuthority(survival,items,world,xp);
    survival.applyAuthorityDamage({
      damageId:'lethal:reopen',
      sourceType:'hostile-attack',
      sourceEntityId:'predator:1',
      targetPlayerId:'p1',
      amount:100,
      tick:0,
    });
    const input={
      deathId:'death:p1:reopen',
      playerId:'p1',
      deathCause:'hostile-attack' as const,
      deathPosition:createWorldPosition(1,1),
      deathTick:0,
      inventoryContainerId:'inventory:p1',
      expectedInventoryRevision:0,
      equippedStackIds:['spear'],
    };
    expect(death.processDeath(input)).toMatchObject({status:'committed'});
    expect(xpCommits).toBe(1);

    const itemSnapshot=items.exportLedgerSnapshot();
    const survivalSnapshot=survival.exportSnapshot();
    const deathSnapshot=death.exportSnapshot();

    const restoredItems = new Phase1ItemAuthority({
      catalog,
      world,
      initialLedger:itemSnapshot,
    });
    const restoredSurvival = new Phase1SurvivalAuthority({
      catalog,
      items:restoredItems,
      snapshot:survivalSnapshot,
    });
    const restoredDeath = new Phase1DeathAuthority(
      restoredSurvival,
      restoredItems,
      world,
      xp,
      deathSnapshot,
    );

    expect(restoredDeath.processDeath(input)).toMatchObject({
      status:'duplicate',
      deathId:'death:p1:reopen',
    });
    expect(xpCommits).toBe(1);
    expect(
      restoredItems.getContainerView('death-cache:death:p1:reopen')
        .stacks[0]?.condition,
    ).toBe(90);
  });

  it('commits one DeathId/cache, durability penalty and staged XP exactly once', () => {
    const { world, items, survival } = setup([
      {stackId:'spear',itemDefinitionId:'item:basic-spear',quantity:1,condition:100},
      {stackId:'fiber',itemDefinitionId:'item:plant-fiber',quantity:2,condition:null},
    ]);
    world.setPlayerPosition('p1', createWorldPosition(5,7));

    let xpCommits=0;
    const xp:DeathXpPenaltyPort = {
      reserveDeathXpPenalty(request) {
        return {reservationId:`xp:${request.deathId}`,deathId:request.deathId,playerId:request.playerId,xpLoss:20};
      },
      commitReservedDeathXpPenalty(){xpCommits+=1;},
      releaseDeathXpPenalty(){},
    };
    const death = new Phase1DeathAuthority(survival,items,world,xp);

    survival.applyAuthorityDamage({
      damageId:'lethal',sourceType:'hostile-attack',sourceEntityId:'predator:1',
      targetPlayerId:'p1',amount:100,tick:0,
    });

    const input={
      deathId:'death:p1:1',playerId:'p1',deathCause:'hostile-attack' as const,
      deathPosition:createWorldPosition(5,7),deathTick:0,
      inventoryContainerId:'inventory:p1',expectedInventoryRevision:0,
      equippedStackIds:['spear'],
    };
    const first=death.processDeath(input);
    expect(first).toMatchObject({status:'committed',xpLoss:20});
    expect(xpCommits).toBe(1);
    expect(items.getContainerView('inventory:p1').stacks).toHaveLength(0);
    const cacheId=first.cacheContainerId!;
    const cache=items.getContainerView(cacheId);
    expect(cache.stacks).toHaveLength(2);
    expect(cache.stacks.find(s=>s.stackId==='spear')?.condition).toBe(90);

    expect(death.processDeath(input)).toMatchObject({status:'duplicate'});
    expect(xpCommits).toBe(1);
    expect(items.getContainerView(cacheId).stacks).toHaveLength(2);

    expect(death.processRespawn('p1',299).status).toBe('waiting');
    expect(death.processRespawn('p1',300)).toMatchObject({status:'respawned'});
    expect(survival.getPlayerView('p1')).toMatchObject({
      health:100,water:50,food:50,stamina:100,temperature:50,
    });

    expect(death.recoverFromDeathCache({
      type:'transfer',operationId:'recover:1',playerId:'p1',
      sourceContainerId:cacheId,sourceExpectedRevision:0,
      targetContainerId:'inventory:p1',targetExpectedRevision:1,
      sourceStackId:'fiber',quantity:2,
    })).toMatchObject({status:'committed'});
    expect(death.recoverFromDeathCache({
      type:'transfer',operationId:'recover:2',playerId:'p1',
      sourceContainerId:cacheId,sourceExpectedRevision:1,
      targetContainerId:'inventory:p1',targetExpectedRevision:2,
      sourceStackId:'spear',quantity:1,
    })).toMatchObject({status:'committed'});
    expect(world.getDeathCacheByContainer(cacheId)).toBeNull();
  });
});
