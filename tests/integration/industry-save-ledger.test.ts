import { describe, expect, it } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1ContentCatalog } from '../../src/content';
import { COLONY_RESEARCH } from '../../src/content/phase2/ColonyDepthContent';
import { INDUSTRY_FACILITIES, INDUSTRY_RESEARCH, type IndustryCost } from '../../src/content/phase3/IndustryContent';
import {
  INDUSTRY_SAVE_CONTENT_PACK_VERSION,
  SAVE_FORMAT_ID,
  SAVE_SCHEMA_VERSION_V2,
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
  validatePortableSaveBundleV2,
} from '../../src/persistence';
import { Phase1ItemAuthority } from '../../src/simulation';
import { IndustryAuthority } from '../../src/simulation/industry/IndustryAuthority';
import { COLONY_WORLD_GENERATION_VERSION } from '../../src/world/phase1/Phase1ChunkGenerator';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import { industryTestFixture } from '../support/IndustryTestFixture';

const config = { worldId: 'industry-save-integration', worldSeed: 'p1-world-golden', playerIds: ['p1'],
  colonyDepthEnabled: true, worldGenerationVersion: COLONY_WORLD_GENERATION_VERSION,
  interactionRangeWorldUnits: 2.5, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
function portable(bundle: Phase1AuthorityBundle) {
  const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-02T00:00:00.000Z' });
  return { formatId: SAVE_FORMAT_ID, schemaVersion: SAVE_SCHEMA_VERSION_V2, recordKind: 'portable-bundle' as const,
    world: request.world, players: request.players, containers: request.containers,
    chunks: request.chunks, footholds: request.footholds, structures: request.structures };
}

/** Exact compatibility checks performed by the pre-Industry V2 reader at the PR base. */
function preIndustryReaderCompatibility(
  bundle: ReturnType<typeof portable>,
  catalog = createPhase1ContentCatalog(),
): 'ACCEPTED' | 'UNSUPPORTED_CONTENT_SCHEMA' | 'UNSUPPORTED_CONTENT_PACK' | 'CONTENT_FINGERPRINT_MISMATCH' {
  const actual = bundle.world.contentCompatibility;
  const expected = catalog.compatibility;
  if (actual.formatId !== expected.formatId || actual.schemaVersion !== expected.schemaVersion) {
    return 'UNSUPPORTED_CONTENT_SCHEMA';
  }
  if (actual.packId !== expected.packId || actual.packVersion !== expected.packVersion) {
    return 'UNSUPPORTED_CONTENT_PACK';
  }
  if (actual.canonicalFingerprint !== expected.canonicalFingerprint) {
    return 'CONTENT_FINGERPRINT_MISMATCH';
  }
  return 'ACCEPTED';
}
describe('industry ledger and Save V2 integration', () => {
  it('rolls back a dismantle refund when a real ordinary inventory cannot carry it', () => {
    const f = industryTestFixture(); const depot = f.build('depot', { x: 2, y: 0 });
    const items = new Phase1ItemAuthority({ catalog: createPhase1ContentCatalog(), world: new Phase1ItemTestWorld(),
      initialLedger: { containers: [{ containerId: 'inventory:p1', kind: 'player-inventory', ownerPlayerId: 'p1', revision: 0,
        stacks: [{ stackId: 'timber', itemDefinitionId: 'item:timber', quantity: 10, condition: null },
          { stackId: 'stone', itemDefinitionId: 'item:stone', quantity: 4, condition: null }] }] } });
    const industry = new IndustryAuthority(items, () => ({ position: { x: 2, y: 0 }, alive: true }),
      { canPlace: () => true, hasResearch: () => true, movePlayer: () => true }, f.industry.read());
    const beforeIndustry = industry.read(), beforeLedger = items.exportLedgerSnapshot();
    expect(industry.execute({ action: 'dismantle', targetId: depot, operationId: 'full-refund', playerId: 'p1',
      expectedRevision: industry.read().revision, expectedInventoryRevision: 0 })).toMatchObject({ status: 'rejected', reason: 'TARGET_CAPACITY_VOLUME' });
    expect(industry.read()).toEqual(beforeIndustry); expect(items.exportLedgerSnapshot()).toEqual(beforeLedger);
  });
  it('validates a full draft before a maximum-length retry id can spend a repair patch', () => {
    const f = industryTestFixture(); f.build('solar-array', { x: 0, y: 2 });
    const processor = f.build('fiber-processor', { x: 2, y: 0 });
    f.perform({ action: 'deposit', targetId: processor, itemDefinitionId: 'item:plant-fiber', quantity: 3 }); f.step(300);
    f.move({ x: 2, y: 0 });
    const command = { ...f.command({ action: 'repair', targetId: processor }), operationId: 'r'.repeat(256) };
    const result = f.industry.execute(command), after = f.items.exportLedgerSnapshot();
    expect(result.status).toBe('committed'); expect(f.industry.execute(command)).toEqual(result);
    expect(f.items.exportLedgerSnapshot()).toEqual(after);
    expect(f.industry.read().events.at(-1)?.id.length).toBeLessThanOrEqual(256);
  });
  it('saves coherent industry state and admits older saves without advancing offline work', async () => {
    const original = await Phase1AuthorityBundle.create(config);
    let reopened: Phase1AuthorityBundle | undefined;
    try {
      for (let i = 0; i < 70; i++) await original.stepSolo();
      const saved = portable(original), compatibility = createPhase1SaveV2Compatibility(original.catalog, [COLONY_WORLD_GENERATION_VERSION]);
      expect(saved.world.industry?.lastTick).toBe(70);
      expect(reconstructPhase1ReopenState({ ...saved, world: { ...saved.world,
        industry: { ...saved.world.industry!, lastTick: 71 } } }, compatibility)).toMatchObject({ ok: false, code: 'CORRUPT_RECORD' });
      expect(saved.world.contentCompatibility.packVersion).toBe(
        INDUSTRY_SAVE_CONTENT_PACK_VERSION,
      );
      const legacy = {
        ...saved,
        world: {
          ...saved.world,
          contentCompatibility: original.catalog.compatibility,
        },
      };
      delete legacy.world.industry;
      expect(legacy.world.contentCompatibility.packVersion).toBe(
        original.catalog.compatibility.packVersion,
      );
      const decoded = reconstructPhase1ReopenState(legacy, compatibility);
      expect(decoded.ok).toBe(true); if (!decoded.ok) throw new Error(decoded.message);
      reopened = await Phase1AuthorityBundle.create({ ...config, reopen: decoded.value });
      expect(reopened.industry?.read().lastTick).toBe(70);
      await reopened.stepSolo(); expect(reopened.industry?.read().lastTick).toBe(71);
      expect(reopened.industry?.read().facilities).toEqual([]);
    } finally { await reopened?.destroy(); await original.destroy(); }
  });
  it('persists real researched construction, buffer stock and retry receipts across full world reopen', async () => {
    const original = await Phase1AuthorityBundle.create({ ...config, worldId: 'industry-full-roundtrip' });
    let reopened: Phase1AuthorityBundle | undefined, ordinal = 0;
    const grant = (costs: readonly IndustryCost[]) => {
      const result = original.items.commitColonyExchange({ operationId: 'labelled-fixture-supplies:' + String(++ordinal), playerId: 'p1',
        expectedInventoryRevision: original.items.getContainerView('inventory:p1').revision, inputs: [], outputs: costs });
      expect(result.status).toBe('committed');
    };
    try {
      await original.stepSolo();
      for (const id of ['field-survey', 'expanded-storage'] as const) {
        grant(COLONY_RESEARCH.find(r => r.id === id)!.costs);
        expect(original.colonyDepth.execute({ action: 'research', targetId: id, operationId: 'colony-research:' + id, playerId: 'p1',
          expectedRevision: original.colonyDepth.read().revision, expectedInventoryRevision: original.items.getContainerView('inventory:p1').revision }).status).toBe('committed');
      }
      grant(INDUSTRY_RESEARCH.find(r => r.id === 'automation')!.costs);
      expect(original.industry!.execute({ action: 'research', targetId: 'automation', operationId: 'automation', playerId: 'p1',
        expectedRevision: original.industry!.read().revision, expectedInventoryRevision: original.items.getContainerView('inventory:p1').revision }).status).toBe('committed');
      grant(INDUSTRY_FACILITIES.depot.costs);
      let depot: string | undefined;
      for (const position of [{ x: 3, y: 2 }, { x: -3, y: 2 }, { x: 3, y: -2 }, { x: -3, y: -2 }]) {
        original.getRuntime('p1').relocatePlayer(position);
        const result = original.industry!.execute({ action: 'build', facilityKind: 'depot', position, operationId: 'real-depot:' + String(++ordinal), playerId: 'p1',
          expectedRevision: original.industry!.read().revision, expectedInventoryRevision: original.items.getContainerView('inventory:p1').revision });
        if (result.status === 'committed') { depot = result.entityId; break; }
      }
      expect(depot).toBeDefined();
      grant([{ itemDefinitionId: 'item:stone', quantity: 3 }]);
      const command = { action: 'deposit' as const, targetId: depot!, itemDefinitionId: 'item:stone', quantity: 3, operationId: 'real-deposit', playerId: 'p1',
        expectedRevision: original.industry!.read().revision, expectedInventoryRevision: original.items.getContainerView('inventory:p1').revision };
      const result = original.industry!.execute(command); expect(result.status).toBe('committed');
      const saved = portable(original), compatibility = createPhase1SaveV2Compatibility(original.catalog, [COLONY_WORLD_GENERATION_VERSION]);
      expect(saved.world.industry?.researchIds).toContain('automation');
      expect(saved.world.industry?.facilities.some(facility => facility.id === depot)).toBe(true);
      expect(saved.world.industry?.facilities.find(facility => facility.id === depot)?.buffer)
        .toContainEqual({ itemDefinitionId: 'item:stone', quantity: 3 });
      expect(saved.world.contentCompatibility.packVersion).toBe(
        INDUSTRY_SAVE_CONTENT_PACK_VERSION,
      );

      const serializedBeforeOldReader = JSON.stringify(saved);
      expect(preIndustryReaderCompatibility(saved, original.catalog))
        .toBe('UNSUPPORTED_CONTENT_PACK');
      expect(JSON.stringify(saved)).toBe(serializedBeforeOldReader);
      expect(JSON.parse(serializedBeforeOldReader).world.industry)
        .toEqual(saved.world.industry);

      const currentReader = validatePortableSaveBundleV2(saved, compatibility);
      expect(currentReader.ok).toBe(true);
      if (!currentReader.ok) throw new Error(currentReader.message);

      const decoded = reconstructPhase1ReopenState(saved, compatibility); expect(decoded.ok).toBe(true); if (!decoded.ok) throw new Error(decoded.message);
      reopened = await Phase1AuthorityBundle.create({ ...config, worldId: 'industry-full-roundtrip', reopen: decoded.value });
      expect(reopened.industry?.read()).toEqual(original.industry?.read());
      expect(reopened.industry?.execute(command)).toEqual(result);
      expect(reopened.items.exportLedgerSnapshot()).toEqual(original.items.exportLedgerSnapshot());
    } finally { await reopened?.destroy(); await original.destroy(); }
  });
});
