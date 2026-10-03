import { expect, it } from 'vitest';
import { createContentCatalogV1, createPhase1ContentCatalog } from '../../src/content';
import { PHASE1_CONTENT_PACK } from '../../src/content/phase1/Phase1ContentPack';
import { GEAR_ITEMS, GEAR_RECIPES, RARITY_STYLE } from '../../src/content/livingworld/EquipmentContent';
import { Phase1ItemAuthority, Phase1SurvivalAuthority, Phase1CombatAuthority, Phase1EquipmentAuthority } from '../../src/simulation';
import { Phase1SurvivalTestWorld } from '../support/Phase1SurvivalTestWorld';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1BuildingWorld } from '../../src/world/building/Phase1BuildingWorld';
import { createWorldPosition } from '../../src/foundation';
import { ExpeditionAuthority } from '../../src/simulation/expedition/ExpeditionAuthority';
import { emptyExpeditionState } from '../../src/simulation/expedition/ExpeditionState';
import { LivingWorldAuthority } from '../../src/simulation/livingworld/LivingWorldAuthority';

const catalog = createPhase1ContentCatalog();
function fixture(costs: readonly (readonly [string, number])[]) {
  const world = new Phase1SurvivalTestWorld();
  const items = new Phase1ItemAuthority({ catalog, world, initialLedger: { containers: [{ containerId: 'inventory:p', kind: 'player-inventory', ownerPlayerId: 'p', revision: 0, stacks: costs.map(([id,quantity],i) => ({ stackId: 'fixture:' + i, itemDefinitionId: id, quantity, condition: catalog.getAs(id,'item').conditionMax })) }] } });
  return { world, items };
}
it.each(['item:basic-spear', ...GEAR_ITEMS.map(i => i.id)])('%s equips and uses its real damage/stamina/wear, while duplicate hit cannot apply twice', id => {
  const { world, items } = fixture([[id, 1]]), survival = new Phase1SurvivalAuthority({ catalog, items }); survival.registerPlayer('p');
  const equipment = new Phase1EquipmentAuthority(items); equipment.registerPlayer('p');
  expect(equipment.equipWeapon('p','fixture:0').status).toBe('committed');
  expect(equipment.equipThermalWrap('p','fixture:0')).toMatchObject({ status: 'rejected', reason: 'INVALID_EQUIPMENT' });
  expect(equipment.equipWeapon('p','missing')).toMatchObject({ status: 'rejected', reason: 'SOURCE_MISSING' });
  world.addPredator({ entityId: 'predator:p', position: createWorldPosition(.5,0), encounterAnchor: createWorldPosition(.5,0), revision: 0, health: 75, state: 'idle', targetPlayerId: null, stateUntilTick: null, outsideLeashTicks: 0 });
  const combat = new Phase1CombatAuthority(catalog,survival,items,world); combat.setEquippedWeapon('p','fixture:0');
  const command = { attackId: 'hit', playerId: 'p', inventoryContainerId: 'inventory:p', expectedInventoryRevision: 0, facingX: 1, facingY: 0 }, profile = catalog.getAs(id,'item').useProfile!;
  if (profile.type !== 'melee-weapon') throw Error('Invalid test weapon');
  expect(combat.submitAttack(command,'predator:p')).toMatchObject({ status:'hit', damage:profile.damage });
  expect(survival.getPlayerView('p').stamina).toBe(100-profile.staminaCost);
  expect(items.getContainerView('inventory:p').stacks[0]!.condition).toBe(100-profile.conditionCostOnSuccessfulHit);
  const after = items.exportLedgerSnapshot(); expect(combat.submitAttack(command,'predator:p').status).toBe('duplicate'); expect(items.exportLedgerSnapshot()).toEqual(after); expect(world.getPredator('predator:p')!.health).toBe(75-profile.damage);
});

it.each(GEAR_RECIPES)('$name upgrades one prior weapon at the right station, rejects range/missing inputs atomically, and does not duplicate on replay', recipe => {
  const { items } = fixture(recipe.costs); const actor = { x: 20, y: 20, alive: true };
  const expedition = new ExpeditionAuthority(items, new Phase1BuildingWorld(new Phase1BuildingTestSpatial(),undefined,true), () => actor, { ...emptyExpeditionState(), facilities: [{ id:'station', owner:'p', definitionId:recipe.station as 'field-lab', x:0, y:0, orientation:0, canonicalStructureId: recipe.station === 'field-workbench' ? 'fixture:canonical-workbench' : null, water:0, progress:0 }] });
  const living = new LivingWorldAuthority(items, expedition, { seed:'rarity', tick:()=>0, actor:()=>actor, players:()=>[], ground:()=>true, plotGround:()=>null, weather:()=> 'clear', cancelRest:()=>{} });
  const command = () => ({ id:'craft:' + recipe.id, playerId:'p', expectedRevision:living.read().revision, expectedInventoryRevision:items.getContainerView('inventory:p').revision, action:'craft' as const, target:recipe.id });
  const before = items.exportLedgerSnapshot(); expect(living.execute(command())).toMatchObject({ status:'rejected', message:'NEARBY_STATION_REQUIRED' }); expect(items.exportLedgerSnapshot()).toEqual(before);
  actor.x=0; actor.y=0;
  const consumed = recipe.costs.at(-1)!; expect(items.commitColonyExchange({ operationId:'fixture:remove', playerId:'p', expectedInventoryRevision:0, inputs:[{itemDefinitionId:consumed[0],quantity:1}],outputs:[] }).status).toBe('committed');
  const missing = items.exportLedgerSnapshot(); expect(living.execute(command()).status).toBe('rejected'); expect(items.exportLedgerSnapshot()).toEqual(missing);
  items.commitColonyExchange({ operationId:'fixture:restore',playerId:'p',expectedInventoryRevision:items.getContainerView('inventory:p').revision,inputs:[],outputs:[{itemDefinitionId:consumed[0],quantity:1}] });
  const input = command(); expect(living.execute(input).status).toBe('committed');
  const after = items.exportLedgerSnapshot(); expect(living.execute(input).status).toBe('committed'); expect(items.exportLedgerSnapshot()).toEqual(after);
  expect(items.getContainerView('inventory:p').stacks).toMatchObject([{ itemDefinitionId:recipe.output,quantity:1,condition:100 }]);
});

it('rejects invalid rarity metadata and includes supported rarity in canonical identity', () => {
  const pack = (rarity: unknown) => ({ ...PHASE1_CONTENT_PACK, definitions: PHASE1_CONTENT_PACK.definitions.map(d => d.id === 'item:basic-spear' ? {...d,rarity} : d) });
  expect(() => createContentCatalogV1(pack('orange') as typeof PHASE1_CONTENT_PACK)).toThrow();
  const white = createContentCatalogV1(pack('common') as typeof PHASE1_CONTENT_PACK), red = createContentCatalogV1(pack('mythic') as typeof PHASE1_CONTENT_PACK);
  expect(white.compatibility.canonicalFingerprint).not.toBe(red.compatibility.canonicalFingerprint);
  expect(new Set(Object.values(RARITY_STYLE).map(s => s.colour)).size).toBe(6);
});
