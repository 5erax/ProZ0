import { expect, it } from 'vitest';
import { Phase1AuthorityBundle, composePhase1SaveV2 } from '../../src/integration';
import { createPhase1ContentCatalog } from '../../src/content';
import { createRootV1ContentCatalog } from '../../src/content/phase1/Phase1Catalog';
import { createPhase1SaveV2Compatibility, reconstructPhase1ReopenState } from '../../src/persistence';
import { colonyRiverLandmarks, colonyRiverTerrainAt } from '../../src/world/phase2/ColonyHydrology';

const config = { worldId: 'world:fish-save', worldSeed: 'p1-world-golden', playerIds: ['solo'], colonyDepthEnabled: true, singlePlayerExpeditionEnabled: true, worldGenerationVersion: 5, interactionRangeWorldUnits: 4, spawnClearanceRadiusWorldUnits: 0, requiredAccessRadiusWorldUnits: 0 };
const portable = (bundle: Phase1AuthorityBundle) => { const request = composePhase1SaveV2(bundle, { nowUtc: '2026-10-03T00:00:00Z' }); return { ...request, formatId: request.world.formatId, schemaVersion: request.world.schemaVersion, recordKind: 'portable-bundle' }; };
it('fishing active casts keep fish/ordinal/bite through canonical Save V2, pay one real catch, and reject forged player/tool/clock references', async () => {
  const bundle = await Phase1AuthorityBundle.create(config); let reopened: Phase1AuthorityBundle | null = null;
  try {
    const crossing = colonyRiverLandmarks(config.worldSeed).crossings[0]!;
    const center = { x: Math.floor(crossing.x / 2) * 2 + 1, y: Math.floor(crossing.y / 2) * 2 + 1 };
    let water: { x: number; y: number } | undefined;
    search: for (let dy = -12; dy <= 12; dy += 2) for (let dx = -12; dx <= 12; dx += 2) {
      const bank = { x: center.x + dx, y: center.y + dy }; if (colonyRiverTerrainAt(config.worldSeed, bank) !== 'ground') continue;
      bundle.getRuntime('solo').relocatePlayer(bank); await bundle.stepSolo();
      water = [{ x: bank.x - 2, y: bank.y }, { x: bank.x + 2, y: bank.y }, { x: bank.x, y: bank.y - 2 }, { x: bank.x, y: bank.y + 2 }].find(p => bundle.world.isExploredWater(p) && bundle.world.hasClearFishingLine(bank,p));
      if (water) break search;
    }
    expect(water).toBeDefined();
    expect(bundle.items.commitColonyExchange({ operationId: 'fixture:fish-tool', playerId: 'solo', expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:fishing-rod', quantity: 1 }, { itemDefinitionId: 'item:fishing-bait', quantity: 2 }] }).status).toBe('committed');
    const fishing = bundle.livingWorld!.fishing;
    expect(fishing.execute({ id: 'cast:saved', playerId: 'solo', expectedRevision: fishing.revision(), expectedInventoryRevision: bundle.items.getContainerView('inventory:solo').revision, action: 'cast', ...water! }).status).toBe('committed');
    const session = fishing.session('solo')!, before = portable(bundle), policy = createPhase1SaveV2Compatibility(bundle.catalog, [3,4,5]);
    const result = reconstructPhase1ReopenState(before, policy); expect(result.ok, JSON.stringify(result)).toBe(true); if (!result.ok) throw Error(result.message);
    for (const changed of [{ ...before.world.livingWorld!.fishing!, lastTick: before.world.authorityTick + 1 }, { ...before.world.livingWorld!.fishing!, sessions: [{ ...session, playerId: 'missing' }] }, { ...before.world.livingWorld!.fishing!, sessions: [{ ...session, rodStackId: 'missing' }] }]) expect(reconstructPhase1ReopenState({ ...before, world: { ...before.world, livingWorld: { ...before.world.livingWorld!, fishing: changed } } }, policy).ok).toBe(false);
    reopened = await Phase1AuthorityBundle.create({ ...config, reopen: result.value });
    expect(reopened.livingWorld!.fishing.session('solo')).toEqual(session);
    expect(reopened.items.exportLedgerSnapshot()).toEqual(bundle.items.exportLedgerSnapshot());
    while (reopened.authorityTick < session.biteTick) await reopened.stepSolo();
    const reel = { id: 'reel:saved', playerId: 'solo', expectedRevision: reopened.livingWorld!.fishing.revision(), expectedInventoryRevision: reopened.items.getContainerView('inventory:solo').revision, action: 'reel' as const };
    expect(reopened.livingWorld!.fishing.execute(reel).message).toBe('FISHING_CAUGHT:' + session.fishItemId);
    expect(reopened.livingWorld!.fishing.execute(reel).status).toBe('committed');
    expect(reopened.items.getContainerView('inventory:solo').stacks.filter(s => s.itemDefinitionId === session.fishItemId).reduce((sum,s) => sum + s.quantity, 0)).toBe(1);
    const after = portable(reopened); expect(reconstructPhase1ReopenState(after, policy).ok).toBe(true);
    expect(after.world.livingWorld!.fishing!.spots[0]!.stock).toBe(7);
  } finally { await reopened?.destroy(); await bundle.destroy(); }
});

it('exact prior-root catalog saves preserve generation and inventory but cannot claim fishing content under the older fingerprint', async () => {
  const old = await Phase1AuthorityBundle.create({ ...config, catalog: createRootV1ContentCatalog() }); let current: Phase1AuthorityBundle | null = null;
  try {
    await old.stepSolo(); const before = portable(old), policy = createPhase1SaveV2Compatibility(createPhase1ContentCatalog(), [3,4,5]);
    const loaded = reconstructPhase1ReopenState(before, policy); expect(loaded.ok).toBe(true); if (!loaded.ok) throw Error(loaded.message);
    current = await Phase1AuthorityBundle.create({ ...config, reopen: loaded.value });
    expect(current.livingWorld!.read()).toEqual(old.livingWorld!.read()); expect(current.items.exportLedgerSnapshot()).toEqual(old.items.exportLedgerSnapshot());
    expect(current.world.getActiveChunkViews().map(c => c.base)).toEqual(old.world.getActiveChunkViews().map(c => c.base));
    current.items.commitColonyExchange({ operationId: 'fixture:new-rod', playerId: 'solo', expectedInventoryRevision: current.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:fishing-rod', quantity: 1 }] });
    const after = portable(current); expect(reconstructPhase1ReopenState(after, policy).ok).toBe(true);
    expect(reconstructPhase1ReopenState({ ...after, world: { ...after.world, contentCompatibility: before.world.contentCompatibility } }, policy).ok).toBe(false);
  } finally { await current?.destroy(); await old.destroy(); }
});
