import { describe, expect, it } from 'vitest';
import { Phase1AuthorityBundle, Phase1HostedAuthorityComposition, composePhase1SaveV2 } from '../../src/integration';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2, createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';
import { COLONY_RESEARCH } from '../../src/content/phase2/ColonyDepthContent';
import { INDUSTRY_FACILITIES, INDUSTRY_RESEARCH, type IndustryCost, type IndustryFacilityKind } from '../../src/content/phase3/IndustryContent';
import type { IndustryCommand } from '../../src/simulation/industry/IndustryAuthority';
import { HOSTED_PROTOCOL_VERSION, type SessionAcceptedV1 } from '../../src/protocol';

const config = { worldId: 'world:industry-roundtrip', worldSeed: 'p1-world-golden', playerIds: ['solo'],
  singlePlayerExpeditionEnabled: true, colonyDepthEnabled: true, interactionRangeWorldUnits: 4,
  spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
const nowUtc = '2026-10-02T06:00:00.000Z';
function portable(bundle: Phase1AuthorityBundle) {
  const request = composePhase1SaveV2(bundle, { nowUtc });
  return { formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle' as const,
    world: request.world, players: request.players, containers: request.containers, chunks: request.chunks,
    footholds: request.footholds, structures: request.structures };
}
let ordinal = 0;
// Explicit subsystem fixtures grant materials; no human or natural-play evidence is claimed.
function fund(bundle: Phase1AuthorityBundle, playerId: string, outputs: readonly IndustryCost[]) {
  expect(bundle.items.commitColonyExchange({ operationId: 'fixture:materials:' + ++ordinal, playerId,
    expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision, inputs: [], outputs }).status).toBe('committed');
}
function unlockColony(bundle: Phase1AuthorityBundle, playerId: string) {
  for (const targetId of ['field-survey', 'expanded-storage']) {
    fund(bundle, playerId, COLONY_RESEARCH.find(r => r.id === targetId)!.costs);
    expect(bundle.colonyDepth.execute({ operationId: 'fixture:colony:' + ++ordinal, playerId, action: 'research', targetId,
      expectedRevision: bundle.colonyDepth.read().revision, expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision }).status).toBe('committed');
  }
}
function action(bundle: Phase1AuthorityBundle, playerId: string, intent: Omit<IndustryCommand, 'operationId' | 'playerId' | 'expectedRevision' | 'expectedInventoryRevision'>) {
  return { ...intent, operationId: 'industry:test:' + ++ordinal, playerId, expectedRevision: bundle.industry!.read().revision,
    expectedInventoryRevision: bundle.items.getContainerView('inventory:' + playerId).revision };
}
function build(bundle: Phase1AuthorityBundle, kind: IndustryFacilityKind) {
  fund(bundle, 'solo', INDUSTRY_FACILITIES[kind].costs);
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) {
    const command = action(bundle, 'solo', { action: 'build', facilityKind: kind, position: { x, y } });
    const result = bundle.industry!.execute(command);
    if (result.status === 'committed') return bundle.industry!.read().facilities.find(f => f.kind === kind)!;
  }
  throw new Error('No canonical explored build location for ' + kind);
}

describe('Integrated industry save and authority boundaries', () => {
  it('preserves Phase 2 state while upgrading old saves at nonzero authority time', async () => {
    const original = await Phase1AuthorityBundle.create(config);
    try {
      for (let n = 0; n < 9; n++) await original.stepSolo();
      const old = portable(original), { industry: _industry, ...legacyWorld } = old.world;
      void _industry;
      const reopened = reconstructPhase1ReopenState({ ...old, world: legacyWorld }, createPhase1SaveV2Compatibility(original.catalog, [old.world.generationVersion]));
      expect(reopened.ok).toBe(true); if (!reopened.ok) throw Error(reopened.message);
      const restored = await Phase1AuthorityBundle.create({ ...config, reopen: reopened.value });
      try {
        expect(restored.industry!.read()).toMatchObject({ lastTick: 9, facilities: [], researchIds: [] });
        expect(restored.items.exportLedgerSnapshot()).toEqual(original.items.exportLedgerSnapshot());
        expect(restored.colonyDepth.read()).toEqual(original.colonyDepth.read());
        expect(restored.expedition!.read()).toEqual(original.expedition!.read());
        await restored.stepSolo(); expect(restored.industry!.read().lastTick).toBe(10);
        expect(reconstructPhase1ReopenState(portable(restored), createPhase1SaveV2Compatibility(original.catalog, [old.world.generationVersion])).ok).toBe(true);
      } finally { await restored.destroy(); }
    } finally { await original.destroy(); }
  });

  it('round-trips real paid facilities/materials and persisted command receipts; rejects future or foreign-owner state', async () => {
    const original = await Phase1AuthorityBundle.create(config);
    try {
      await original.stepSolo(); unlockColony(original, 'solo');
      fund(original, 'solo', INDUSTRY_RESEARCH.find(r => r.id === 'automation')!.costs);
      expect(original.industry!.execute(action(original, 'solo', { action: 'research', targetId: 'automation' })).status).toBe('committed');
      const depot = build(original, 'depot');
      original.getRuntime('solo').relocatePlayer(depot.position); await original.stepSolo();
      fund(original, 'solo', [{ itemDefinitionId: 'item:plant-fiber', quantity: 5 }]);
      const deposit = action(original, 'solo', { action: 'deposit', targetId: depot.id, itemDefinitionId: 'item:plant-fiber', quantity: 5 });
      expect(original.industry!.execute(deposit).status).toBe('committed');
      const ledger = original.items.exportLedgerSnapshot(), snapshot = original.industry!.read();
      const saved = portable(original), policy = createPhase1SaveV2Compatibility(original.catalog, [saved.world.generationVersion]);
      const reopened = reconstructPhase1ReopenState(saved, policy);
      expect(reopened.ok).toBe(true); if (!reopened.ok) throw Error(reopened.message);
      const restored = await Phase1AuthorityBundle.create({ ...config, reopen: reopened.value });
      try {
        expect(restored.industry!.read()).toEqual(snapshot);
        expect(restored.industry!.execute(deposit).status).toBe('committed');
        expect(restored.industry!.read()).toEqual(snapshot);
        expect(restored.items.exportLedgerSnapshot()).toEqual(ledger);
        expect(restored.industry!.execute({ ...deposit, quantity: 4 })).toMatchObject({ status: 'rejected', reason: 'OPERATION_ID_CONFLICT' });
        await restored.stepSolo(); expect(restored.industry!.read().lastTick).toBe(saved.world.authorityTick + 1);
      } finally { await restored.destroy(); }
      expect(reconstructPhase1ReopenState({ ...saved, world: { ...saved.world, industry: { ...snapshot, contentVersion: 99 } } }, policy).ok).toBe(false);
      expect(reconstructPhase1ReopenState({ ...saved, world: { ...saved.world, industry: { ...snapshot, lastTick: snapshot.lastTick + 1 } } }, policy).ok).toBe(false);
      expect(reconstructPhase1ReopenState({ ...saved, world: { ...saved.world, industry: { ...snapshot, facilities: snapshot.facilities.map(f => ({ ...f, ownerPlayerId: 'absent' })) } } }, policy).ok).toBe(false);
      await expect(Phase1AuthorityBundle.create({ ...config, colonyDepthEnabled: false, reopen: reopened.value })).rejects.toThrow('Industry saves require');
    } finally { await original.destroy(); }
  });

  it('binds hosted industry commands to admitted identity and resolves competing research without duplicate costs', async () => {
    const composition = await Phase1HostedAuthorityComposition.create({ ...config, worldId: 'world:industry-hosted', maxPlayers: 3,
      persistence: { async save(authorityTick) { return { authorityTick, durableSaveRevision: 0 }; } } });
    try {
      const clients = ['a', 'b', 'c'].map(transportId => {
        const outbound = composition.host.receiveText(transportId, JSON.stringify({ protocolVersion: HOSTED_PROTOCOL_VERSION, messageType: 'CLIENT_HELLO', clientMessageSeq: 0,
          payload: { protocolVersion: HOSTED_PROTOCOL_VERSION, contentCompatibility: composition.bundle.getContentCompatibility(), worldCompatibility: composition.bundle.getWorldCompatibility() } }));
        const accepted = outbound.find(m => m.envelope.messageType === 'SESSION_ACCEPTED')!.envelope.payload as unknown as SessionAcceptedV1;
        composition.host.receiveText(transportId, JSON.stringify({ protocolVersion: HOSTED_PROTOCOL_VERSION, messageType: 'BASELINE_APPLIED', clientMessageSeq: 1,
          sessionId: composition.host.getSessionId(), connectionId: accepted.connectionId, payload: { snapshotId: accepted.snapshotId } }));
        return { transportId, ...accepted };
      });
      await composition.step();
      unlockColony(composition.bundle, clients[0]!.playerId);
      for (const client of clients.slice(0, 2)) fund(composition.bundle, client.playerId, INDUSTRY_RESEARCH.find(r => r.id === 'automation')!.costs);
      const competingLedger = composition.bundle.items.getContainerView('inventory:' + clients[1]!.playerId);
      for (const client of clients.slice(0, 2)) composition.host.receiveText(client.transportId, JSON.stringify({ protocolVersion: HOSTED_PROTOCOL_VERSION, messageType: 'GAMEPLAY_COMMAND',
        clientMessageSeq: 2, sessionId: composition.host.getSessionId(), connectionId: client.connectionId, payload: {
          operationId: 'industry:hosted:' + client.transportId, commandType: 'industry.action',
          expectedRevisions: [{ aggregateType: 'industry', aggregateId: 'colony', revision: composition.bundle.industry!.read().revision },
            { aggregateType: 'container', aggregateId: 'inventory:' + client.playerId, revision: composition.bundle.items.getContainerView('inventory:' + client.playerId).revision }],
          payload: { action: 'research', targetId: 'automation' },
        } }));
      const outbound = await composition.step();
      expect(composition.bundle.industry!.read().researchIds).toEqual(['automation']);
      expect(composition.bundle.industry!.read().receipts[0]!.playerId).toBe(clients[0]!.playerId);
      expect(composition.bundle.items.getContainerView('inventory:' + clients[1]!.playerId)).toEqual(competingLedger);
      const states = outbound.filter(m => m.envelope.messageType === 'AGGREGATE_UPDATE' && (m.envelope.payload as { aggregateType?: string }).aggregateType === 'industry');
      expect(new Set(states.map(m => m.transportId))).toEqual(new Set(['a', 'b', 'c']));
    } finally { await composition.destroy(); }
  });
});
