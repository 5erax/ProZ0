import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { resourceSizeAt } from '../../src/content/livingworld/ResourceSizeProfiles';
import { Phase1ItemAuthority } from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';

it('large gather uses authoritative yield/work/wear; full bag and replay do not debit resource or duplicate output', () => {
  const world = new Phase1ItemTestWorld();
  world.addResource({ resourceEntityId: 'rock', resourceDefinitionId: 'resource:stone-outcrop', revision: 0, remainingActions: 4, depleted: false, size: 'large' });
  const catalog = createPhase1ContentCatalog();
  const inventory = (full: boolean) => ({ containerId: 'inventory:p1', kind: 'player-inventory' as const, ownerPlayerId: 'p1', revision: 0, stacks: [{ stackId: 'tool', itemDefinitionId: 'item:stone-field-tool', quantity: 1, condition: 100 }, ...(full ? [{ stackId: 'stones', itemDefinitionId: 'item:stone', quantity: 20, condition: null }, { stackId: 'stones2', itemDefinitionId: 'item:stone', quantity: 4, condition: null }] : [])] });
  const request = { operationId: 'gather:large', playerId: 'p1', inventoryContainerId: 'inventory:p1', expectedInventoryRevision: 0, resourceEntityId: 'rock', expectedResourceRevision: 0, toolStackId: 'tool' };
  const full = new Phase1ItemAuthority({ catalog, world, initialLedger: { containers: [inventory(true)] } });
  expect(full.beginGather(request).status).toBe('rejected');
  expect(world.getResource('rock')).toMatchObject({ revision: 0, remainingActions: 4 });
  expect(full.getContainerView('inventory:p1').stacks.find(s => s.stackId === 'tool')!.condition).toBe(100);
  const items = new Phase1ItemAuthority({ catalog, world, initialLedger: { containers: [inventory(false)] } });
  expect(items.beginGather(request)).toMatchObject({ status: 'started', requiredTicks: 120 });
  for (let i = 0; i < 119; i++) expect(items.tickGather('p1').status).toBe('channeling');
  expect(items.tickGather('p1')).toMatchObject({ status: 'resolved', result: { status: 'committed' } });
  expect(items.getContainerView('inventory:p1').stacks).toEqual(expect.arrayContaining([expect.objectContaining({ itemDefinitionId: 'item:stone', quantity: 6 }), expect.objectContaining({ stackId: 'tool', condition: 94 })]));
  const before = items.exportLedgerSnapshot();
  expect(items.beginGather(request).status).toBe('resolved');
  expect(items.exportLedgerSnapshot()).toEqual(before);
  expect(world.getResource('rock')).toMatchObject({ revision: 1, remainingActions: 3 });
});

it('size identity ignores load order; new save persists v1 and old save never opts in when reopened', async () => {
  const ids = Array.from({ length: 80 }, (_, i) => 'tree:' + i);
  const direct = ids.map(id => resourceSizeAt('seed:a', id, 'resource:timber-source', 1));
  expect([...ids].reverse().map(id => resourceSizeAt('seed:a', id, 'resource:timber-source', 1)).reverse()).toEqual(direct);
  expect(new Set(direct).size).toBe(3);
  expect(ids.map(id => resourceSizeAt('seed:b', id, 'resource:timber-source', 1))).not.toEqual(direct);
  expect(resourceSizeAt('seed:a', ids[0]!, 'resource:timber-source')).toBeUndefined();
  expect(resourceSizeAt('seed:a', ids[0]!, 'resource:potable-water-source', 1)).toBeUndefined();
  const config = { worldId: 'world:sized', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, worldGenerationVersion: 4, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
  const policy = createPhase1SaveV2Compatibility(createPhase1ContentCatalog(), [3, 4]);
  for (const version of [undefined, 1] as const) {
    const original = await Phase1AuthorityBundle.create({ ...config, ...(version ? { resourceProfileVersion: version } : {}) });
    let reopened: Phase1AuthorityBundle | null = null;
    try {
      await original.stepSolo();
      const save = composePhase1SaveV2(original, { nowUtc: '2026-10-03T00:00:00Z' });
      const portable = { ...save, formatId: save.world.formatId, schemaVersion: save.world.schemaVersion, recordKind: 'portable-bundle' };
      const restored = reconstructPhase1ReopenState(portable, policy);
      expect(restored.ok).toBe(true); if (!restored.ok) throw Error(restored.message);
      expect(reconstructPhase1ReopenState({ ...portable, world: { ...save.world, environment: { ...save.world.environment, resourceProfileVersion: 2 } } }, policy).ok).toBe(false);
      reopened = await Phase1AuthorityBundle.create({ ...config, resourceProfileVersion: 1, reopen: restored.value });
      expect(reopened.worldStore.getEnvironmentView().state.resourceProfileVersion).toBe(version);
      const entities = original.world.getActiveGeneratedEntities().filter(e => e.type === 'resource');
      expect(entities.length).toBeGreaterThan(0);
      for (const entity of entities) expect(reopened.world.getResource(entity.entityId)).toEqual(original.world.getResource(entity.entityId));
      expect(reopened.world.getActiveChunkViews().map(c => c.base)).toEqual(original.world.getActiveChunkViews().map(c => c.base));
      expect(reopened.items.exportLedgerSnapshot()).toEqual(original.items.exportLedgerSnapshot());
    } finally { await original.destroy(); await reopened?.destroy(); }
  }
});
