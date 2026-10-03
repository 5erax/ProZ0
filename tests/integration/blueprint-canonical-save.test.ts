import { expect, it } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState, SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../../src/persistence';
import { expeditionFacility } from '../../src/content/singleplayer/ExpeditionContent';
import type { ExpeditionCommand } from '../../src/simulation/expedition/ExpeditionAuthority';

it.each(['colony-power', 'colony-condenser', 'attached-habitat'])('saves and reopens funded %s through the real building/container contract', async definition => {
  const config = { worldId: 'world:blueprint-' + definition, worldSeed: 'p1-world-golden', playerIds: ['solo'], singlePlayerExpeditionEnabled: true, colonyDepthEnabled: true, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
  const bundle = await Phase1AuthorityBundle.create(config);
  try {
    bundle.getRuntime('solo'); await bundle.stepSolo();
    const authority = bundle.expedition!;
    const execute = (id: string, action: ExpeditionCommand['action'], target: string, extra: Partial<ExpeditionCommand> = {}) => authority.execute({ id, action, target, playerId: 'solo', expectedRevision: authority.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, ...extra });
    let placed = false;
    for (const orientation of [0, 1, 2, 3] as const) {
      for (const [x, y] of [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, -2]] as const) {
        if (execute('plan', 'plan', definition, { x, y, orientation }).status === 'committed') { placed = true; break; }
      }
      if (placed) break;
    }
    expect(placed).toBe(true);
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:materials', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: expeditionFacility(definition)!.costs.map(([itemDefinitionId, quantity]) => ({ itemDefinitionId, quantity })) }).status).toBe('committed');
    expect(execute('deposit', 'deposit', 'plan:plan').status).toBe('committed');
    expect(execute('complete', 'complete', 'plan:plan').message).toBe('FACILITY_COMPLETED');
    const save = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' });
    const result = reconstructPhase1ReopenState({ ...save, formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle' }, createPhase1SaveV2Compatibility(bundle.catalog, [save.world.generationVersion]));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) throw Error(result.message);
    const reopened = await Phase1AuthorityBundle.create({ ...config, reopen: result.value });
    try {
      expect(reopened.expedition!.read()).toEqual(authority.read());
      const restored = reopened.buildings.exportSnapshot().foothold, original = bundle.buildings.exportSnapshot().foothold;
      expect(restored.structures).toEqual(original.structures);
      expect(restored.condensers).toEqual(original.condensers);
      expect(restored.power).toEqual(original.power);
      // Save V2 reconstructs connection IDs from endpoints; endpoints/occupancy are the persistent identity contract.
      expect(restored.connections.map(c => [c.a, c.b])).toEqual(original.connections.map(c => [c.a, c.b]));
      expect(restored.connectors.map(c => [c.connectorId, c.structureId, c.localConnectorKey, c.occupiedByConnectionId !== null])).toEqual(original.connectors.map(c => [c.connectorId, c.structureId, c.localConnectorKey, c.occupiedByConnectionId !== null]));
      expect(reopened.items.exportLedgerSnapshot()).toEqual(bundle.items.exportLedgerSnapshot());
      const facility = reopened.expedition!.read().facilities[0]!;
      const structure = reopened.buildings.getStructure(facility.canonicalStructureId!)!;
      if (definition === 'colony-condenser') expect(reopened.items.getContainerView(structure.containerId!).kind).toBe('machine-output');
    } finally { await reopened.destroy(); }
  } finally { await bundle.destroy(); }
});
