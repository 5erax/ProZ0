import { expect, it } from 'vitest';
import {
  Phase1AuthorityBundle,
  composePhase1SaveV2,
} from '../../src/integration';
import { createPhase1ContentCatalog } from '../../src/content';
import { createLegacyPhase1ContentCatalog, createLivingV1ContentCatalog } from '../../src/content/phase1/Phase1Catalog';
import {
  createPhase1SaveV2Compatibility,
  reconstructPhase1ReopenState,
} from '../../src/persistence';
const config = {
  worldId: 'world:living-save',
  worldSeed: 'p1-world-golden',
  playerIds: ['solo'],
  colonyDepthEnabled: true,
  worldGenerationVersion: 4,
  interactionRangeWorldUnits: 4,
  spawnClearanceRadiusWorldUnits: 0,
  requiredAccessRadiusWorldUnits: 0,
};
const portable = (b: Phase1AuthorityBundle) => {
  const save = composePhase1SaveV2(b, { nowUtc: '2026-10-02T00:00:00Z' });
  return {
    ...save,
    formatId: save.world.formatId,
    schemaVersion: save.world.schemaVersion,
    recordKind: 'portable-bundle',
  };
};
it('saved watered soil reopens at the same world time, drains on active steps and rejects unknown profiles',async()=>{
  const source=await Phase1AuthorityBundle.create({...config,singlePlayerExpeditionEnabled:true});
  let reopened:Phase1AuthorityBundle|null=null;
  try {
    await source.stepSolo();const save=portable(source);
    save.world.livingWorld!.soil={version:1,patches:[{key:'0:0',moisture:10000}]};
    const policy=createPhase1SaveV2Compatibility(source.catalog,[3,4]),restored=reconstructPhase1ReopenState(save,policy);
    expect(restored.ok).toBe(true);if(!restored.ok)throw Error(restored.message);
    reopened=await Phase1AuthorityBundle.create({...config,singlePlayerExpeditionEnabled:true,reopen:restored.value});
    expect(reopened.livingWorld!.read().soil).toEqual(save.world.livingWorld!.soil);
    const ledger=reopened.items.exportLedgerSnapshot();
    for(let i=0;i<60;i++)await reopened.stepSolo();
    expect(reopened.livingWorld!.read().soil!.patches[0]!.moisture).toBeLessThan(10000);
    expect(reopened.items.exportLedgerSnapshot()).toEqual(ledger);
    const next=portable(reopened),again=reconstructPhase1ReopenState(next,policy);
    expect(again.ok).toBe(true);if(again.ok)expect(again.value.bundle.world.livingWorld!.soil).toEqual(next.world.livingWorld!.soil);
    for(const soil of [{version:2,patches:[]},{version:1,patches:[{key:'00:0',moisture:10000}]},{version:1,patches:[{key:'0:0',moisture:10001}]}]){
      const invalid={...next,world:{...next.world,livingWorld:{...next.world.livingWorld!,soil}}};
      expect(reconstructPhase1ReopenState(invalid,policy).ok).toBe(false);
    }
  } finally {await reopened?.destroy();await source.destroy();}
});
it('known additive catalog upgrade preserves old terrain, inventory and clock; unknown fingerprints still reject', async () => {
  const old = await Phase1AuthorityBundle.create({
    ...config,
    catalog: createLegacyPhase1ContentCatalog(),
  });
  let current: Phase1AuthorityBundle | null = null,
    reopened: Phase1AuthorityBundle | null = null;
  try {
    await old.stepSolo();
    const before = portable(old),
      policy = createPhase1SaveV2Compatibility(
        createPhase1ContentCatalog(),
        [3, 4],
      );
    const loaded = reconstructPhase1ReopenState(before, policy);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw Error(loaded.message);
    expect(
      reconstructPhase1ReopenState(
        {
          ...before,
          world: {
            ...before.world,
            contentCompatibility: {
              ...before.world.contentCompatibility,
              canonicalFingerprint: 'unknown-fingerprint',
            },
          },
        },
        policy,
      ).ok,
    ).toBe(false);
    current = await Phase1AuthorityBundle.create({
      ...config,
      singlePlayerExpeditionEnabled: true,
      reopen: loaded.value,
    });
    expect(current.authorityTick).toBe(old.authorityTick);
    expect(current.items.exportLedgerSnapshot()).toEqual(
      old.items.exportLedgerSnapshot(),
    );
    expect(current.world.getActiveChunkViews().map((c) => c.base)).toEqual(
      old.world.getActiveChunkViews().map((c) => c.base),
    );
    expect(
      current.items.commitColonyExchange({
        operationId: 'fixture:root-seed',
        playerId: 'solo',
        expectedInventoryRevision:
          current.items.getContainerView('inventory:solo').revision,
        inputs: [],
        outputs: [
          { itemDefinitionId: 'item:root-seed', quantity: 2 },
          { itemDefinitionId: 'item:warm-cloak', quantity: 1 },
        ],
      }).status,
    ).toBe('committed');
    const cloak = current.items
      .getContainerView('inventory:solo')
      .stacks.find((s) => s.itemDefinitionId === 'item:warm-cloak')!;
    expect(current.equipThermalWrap('solo', cloak.stackId).status).toBe(
      'committed',
    );
    for (let i = 0; i < 60; i++) await current.stepSolo();
    expect(current.livingWorld!.read().regions.length).toBeGreaterThan(0);
    const save = portable(current),
      again = reconstructPhase1ReopenState(save, policy);
    expect(again.ok, JSON.stringify(again)).toBe(true);
    if (!again.ok) throw Error(again.message);
    expect(
      reconstructPhase1ReopenState(
        {
          ...save,
          world: {
            ...save.world,
            contentCompatibility: before.world.contentCompatibility,
          },
        },
        policy,
      ).ok,
    ).toBe(false);
    reopened = await Phase1AuthorityBundle.create({
      ...config,
      singlePlayerExpeditionEnabled: true,
      reopen: again.value,
    });
    expect(reopened.livingWorld!.read()).toEqual(current.livingWorld!.read());
    expect(reopened.items.exportLedgerSnapshot()).toEqual(
      current.items.exportLedgerSnapshot(),
    );
    expect(reopened.equipment.isThermalWrapActive('solo')).toBe(true);
    expect(
      reconstructPhase1ReopenState(
        {
          ...save,
          world: {
            ...save.world,
            livingWorld: {
              ...save.world.livingWorld!,
              lastTick: save.world.authorityTick + 1,
            },
          },
        },
        policy,
      ).ok,
    ).toBe(false);
  } finally {
    await reopened?.destroy();
    await current?.destroy();
    await old.destroy();
  }
});

it('accepts the previously shipped 29-item living catalog, preserves IDs/state, and saves root items only with the new identity', async () => {
  const old = await Phase1AuthorityBundle.create({ ...config, catalog: createLivingV1ContentCatalog(), singlePlayerExpeditionEnabled: true });
  let upgraded: Phase1AuthorityBundle | null = null;
  try {
    for (let i = 0; i < 60; i++) await old.stepSolo();
    const before = portable(old), catalog = createPhase1ContentCatalog(), policy = createPhase1SaveV2Compatibility(catalog, [3, 4]);
    const result = reconstructPhase1ReopenState(before, policy);
    expect(result.ok, JSON.stringify(result)).toBe(true); if (!result.ok) throw Error(result.message);
    upgraded = await Phase1AuthorityBundle.create({ ...config, singlePlayerExpeditionEnabled: true, reopen: result.value });
    expect(upgraded.livingWorld!.read()).toEqual(old.livingWorld!.read());
    expect(upgraded.world.getActiveChunkViews().map(c => c.base)).toEqual(old.world.getActiveChunkViews().map(c => c.base));
    expect(upgraded.items.commitColonyExchange({ operationId: 'fixture:root', playerId: 'solo', expectedInventoryRevision: upgraded.items.getContainerView('inventory:solo').revision, inputs: [], outputs: [{ itemDefinitionId: 'item:root-wild-grass', quantity: 1 }] }).status).toBe('committed');
    const after = portable(upgraded);
    expect(after.world.contentCompatibility).toEqual(catalog.compatibility);
    const restored = reconstructPhase1ReopenState(after, policy);
    expect(restored.ok).toBe(true); if (!restored.ok) throw Error(restored.message);
    expect(restored.value.itemLedger).toEqual(upgraded.items.exportLedgerSnapshot());
    expect(reconstructPhase1ReopenState({ ...after, world: { ...after.world, contentCompatibility: before.world.contentCompatibility } }, policy).ok).toBe(false);
  } finally { await upgraded?.destroy(); await old.destroy(); }
});
