import { describe, expect, it } from "vitest";
import { Phase1AuthorityBundle } from "../../src/integration";
import {
  ColonyDepthAuthority,
  validateColonyDepthState,
} from "../../src/simulation/colony/ColonyDepthAuthority";
import { colonySurveySites } from "../../src/world/phase2/ColonyRegions";
import { composePhase1SaveV2 } from "../../src/integration/Phase1SaveV2Composer";
import {
  createPhase1SaveV2Compatibility,
  validatePortableSaveBundleV2,
} from "../../src/persistence/validation/SaveValidatorV2";
import { COLONY_RESEARCH } from "../../src/content/phase2/ColonyDepthContent";
import { createChunkCoord } from "../../src/world";

async function create() {
  return Phase1AuthorityBundle.create({
    worldId: "world:colony-contract",
    worldSeed: "p1-world-golden",
    playerIds: ["colonist"],
    interactionRangeWorldUnits: 1.25,
    spawnClearanceRadiusWorldUnits: 1.25,
    requiredAccessRadiusWorldUnits: 1.25,
    colonyDepthEnabled: true,
  });
}
describe("Colony-depth real authority transactions", () => {
  it('finite resource depletion schedules real biome-specific renewal and preserves ecology pressure',async()=>{
    const bundle=await create();
    try {
      const site=colonySurveySites(bundle.config.worldSeed)[0]!;
      bundle.getRuntime('colonist').relocatePlayer(site.position);await bundle.stepSolo();
      const resource=bundle.world.getActiveGeneratedEntities().find(entity=>entity.type==='resource'&&bundle.catalog.getAs(entity.definitionId,'resource').regenerationActiveSeconds!==null&&Math.hypot(entity.position.x,entity.position.y)>=96);
      expect(resource).toBeDefined();if(resource===undefined)throw Error('Fixture has no finite outer resource');
      const definition=bundle.catalog.getAs(resource.definitionId,'resource');
      while(!bundle.worldStore.getResourceState(resource.entityId)!.depleted){
        const state=bundle.worldStore.getResourceState(resource.entityId)!;
        const multiplier=bundle.colonyDepth.recoveryMultiplier(resource.position,resource.definitionId);
        const result=bundle.worldStore.commitResourceGather(resource.entityId,state.revision,bundle.authorityTick);
        if(result.state.depleted)expect(result.state.regenerationReadyTick).toBe(bundle.authorityTick+Math.ceil(definition.regenerationActiveSeconds!*60*multiplier));
      }
      expect(bundle.colonyDepth.read().pressure.some(entry=>entry.harvests>0)).toBe(true);
      expect(bundle.colonyDepth.recoveryMultiplier(site.position,'resource:fiber-plant')).toBeLessThan(bundle.colonyDepth.recoveryMultiplier(site.position,'resource:metal-ore-node'));
      const badlands=colonySurveySites(bundle.config.worldSeed)[1]!.position;
      expect(bundle.colonyDepth.recoveryMultiplier(badlands,'resource:metal-ore-node')).toBeLessThan(bundle.colonyDepth.recoveryMultiplier(badlands,'resource:fiber-plant'));
    } finally {await bundle.destroy();}
  });
  it("ordinary authority movement crosses off-corridor chunk boundaries and streamed interest remains bounded", async () => {
    const bundle = await create();
    try {
      const pinned = bundle.world.getActiveChunkViews().length;
      bundle.getRuntime("colonist").relocatePlayer({ x: 60, y: 24 });
      bundle.submitInput("colonist", {
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: true,
      });
      for (let n = 0; n < 240; n++) await bundle.stepSolo();
      expect(bundle.getPlayerPosition("colonist").x).toBeGreaterThan(70);
      bundle.submitInput("colonist", {
        moveUp: false,
        moveDown: false,
        moveLeft: false,
        moveRight: false,
      });
      for (let n = 1; n <= 12; n++) {
        bundle.getRuntime("colonist").relocatePlayer({ x: 100 * n, y: 100 });
        await bundle.stepSolo();
        expect(bundle.world.getActiveChunkViews().length).toBeLessThanOrEqual(
          pinned + 9,
        );
      }
      expect(bundle.worldStore.query(createChunkCoord(3, 3))).toBeUndefined();
      const old = bundle.worldPersistence
        .exportChunks()
        .find((entry) => entry.coord.x === 3 && entry.coord.y === 3);
      expect(old).toBeDefined();
      bundle.getRuntime("colonist").relocatePlayer({ x: 100, y: 100 });
      await bundle.stepSolo();
      expect(bundle.worldStore.query(createChunkCoord(3, 3))).toBeDefined();
    } finally {
      await bundle.destroy();
    }
  });
  it("research gates reversible specialization; only the current profession applies and survives save", async () => {
    const bundle = await create();
    try {
      await bundle.stepSolo();
      let ordinal = 0;
      const fund = (
        outputs: readonly { itemDefinitionId: string; quantity: number }[],
      ) => {
        expect(
          bundle.items.commitColonyExchange({
            operationId: "fixture:fund:" + String(++ordinal),
            playerId: "colonist",
            expectedInventoryRevision:
              bundle.items.getContainerView("inventory:colonist").revision,
            inputs: [],
            outputs,
          }).status,
        ).toBe("committed");
      };
      for (const research of COLONY_RESEARCH) {
        fund(research.costs);
        expect(
          bundle.colonyDepth.execute({
            operationId: "research:" + research.id,
            playerId: "colonist",
            expectedRevision: bundle.colonyDepth.read().revision,
            expectedInventoryRevision:
              bundle.items.getContainerView("inventory:colonist").revision,
            action: "research",
            targetId: research.id,
          }).status,
        ).toBe("committed");
      }
      const specialize = (targetId: string) =>
        bundle.colonyDepth.execute({
          operationId: "specialize:" + targetId + ':' + String(++ordinal),
          playerId: "colonist",
          expectedRevision: bundle.colonyDepth.read().revision,
          expectedInventoryRevision:
            bundle.items.getContainerView("inventory:colonist").revision,
          action: "specialize",
          targetId,
        });
      expect(specialize("cultivator").status).toBe("committed");
      expect(specialize("engineer")).toMatchObject({
        status: "committed",
      });
      expect(bundle.colonyDepth.profession('colonist')).toBe('engineer');
      expect(specialize('cultivator').status).toBe('committed');
      expect(bundle.colonyDepth.profession('colonist')).toBe('cultivator');
      bundle.getRuntime("colonist").relocatePlayer({ x: -6, y: 4 });
      await bundle.stepSolo();
      fund([
        { itemDefinitionId: "item:timber", quantity: 3 },
        { itemDefinitionId: "item:cordage", quantity: 1 },
      ]);
      const act = (action: "build-bed" | "plant") =>
        bundle.sustenance.execute({
          operationId: "crop:" + action,
          playerId: "colonist",
          action,
          expectedRevision: bundle.sustenance.read().revision,
          expectedInventoryRevision:
            bundle.items.getContainerView("inventory:colonist").revision,
        });
      expect(act("build-bed").status).toBe("committed");
      fund([
        { itemDefinitionId: "item:edible-plant", quantity: 1 },
        { itemDefinitionId: "item:clean-water", quantity: 1 },
      ]);
      expect(act("plant").status).toBe("committed");
      for (let n = 0; n < 20; n++) await bundle.stepSolo();
      expect(bundle.sustenance.read().cropProgressTicks).toBe(40);
      const request = composePhase1SaveV2(bundle, {
        nowUtc: "2026-09-30T00:00:00.000Z",
      });
      const save = {
        ...request,
        formatId: request.world.formatId,
        schemaVersion: request.world.schemaVersion,
        recordKind: "portable-bundle" as const,
      };
      const policy = createPhase1SaveV2Compatibility(bundle.catalog, [3]);
      expect(validatePortableSaveBundleV2(save, policy).ok).toBe(true);
      expect(
        validatePortableSaveBundleV2(
          {
            ...save,
            world: {
              ...save.world,
              colonyDepth: {
                ...save.world.colonyDepth,
                professions: { ghost: "cultivator" },
              },
            },
          },
          policy,
        ).ok,
      ).toBe(false);
      expect(() =>
        validateColonyDepthState({
          ...bundle.colonyDepth.read(),
          discoveredBiomes: ["toString"],
        }),
      ).toThrow();
    } finally {
      await bundle.destroy();
    }
  });
  it("charges research once, rejects stale/conflicting commands and retains receipts on restore", async () => {
    const bundle = await create();
    try {
      await bundle.stepSolo();
      const funded = bundle.items.commitColonyExchange({
        operationId: "fixture:research-materials",
        playerId: "colonist",
        expectedInventoryRevision:
          bundle.items.getContainerView("inventory:colonist").revision,
        inputs: [],
        outputs: [
          { itemDefinitionId: "item:plant-fiber", quantity: 3 },
          { itemDefinitionId: "item:stone", quantity: 2 },
        ],
      });
      expect(funded.status).toBe("committed");
      const before = bundle.items.getContainerView("inventory:colonist");
      const command = {
        operationId: "research:once",
        playerId: "colonist",
        action: "research" as const,
        targetId: "field-survey",
        expectedRevision: bundle.colonyDepth.read().revision,
        expectedInventoryRevision: before.revision,
      };
      expect(bundle.colonyDepth.execute(command).status).toBe("committed");
      const ledger = bundle.items.exportLedgerSnapshot();
      expect(
        bundle.items
          .getContainerView("inventory:colonist")
          .stacks.some((s) => s.itemDefinitionId === "item:plant-fiber"),
      ).toBe(false);
      expect(bundle.colonyDepth.execute(command).status).toBe("committed");
      expect(bundle.items.exportLedgerSnapshot()).toEqual(ledger);
      expect(
        bundle.colonyDepth.execute({ ...command, targetId: "cultivation" }),
      ).toMatchObject({ status: "rejected", reason: "OPERATION_ID_CONFLICT" });
      expect(
        bundle.colonyDepth.execute({
          ...command,
          operationId: "research:stale",
        }),
      ).toMatchObject({ status: "rejected", reason: "STALE_REVISION" });
      const restore = new ColonyDepthAuthority(
        bundle.config.worldSeed,
        bundle.items,
        () => ({ position: { x: 0, y: 0 }, alive: true }),
        bundle.colonyDepth.read(),
      );
      expect(restore.execute(command).status).toBe("committed");
      expect(bundle.items.exportLedgerSnapshot()).toEqual(ledger);
      expect(
        restore.execute({
          ...command,
          operationId: "research:no-prereq",
          expectedRevision: restore.read().revision,
          targetId: "cultivation",
        }),
      ).toMatchObject({ status: "rejected", reason: "RESEARCH_PREREQUISITE" });
    } finally {
      await bundle.destroy();
    }
  });
  it("requires actual site proximity and preserves new extension through coherent save validation", async () => {
    const bundle = await create();
    try {
      const site = colonySurveySites(bundle.config.worldSeed)[0]!;
      const base = {
        operationId: "inspect:site",
        playerId: "colonist",
        action: "inspect-site" as const,
        targetId: site.id,
        expectedRevision: 0,
        expectedInventoryRevision:
          bundle.items.getContainerView("inventory:colonist").revision,
      };
      expect(bundle.colonyDepth.execute(base)).toMatchObject({
        status: "rejected",
        reason: "OUT_OF_RANGE",
      });
      bundle.getRuntime("colonist").relocatePlayer(site.position);
      await bundle.stepSolo();
      expect(
        bundle.colonyDepth.execute({
          ...base,
          expectedRevision: bundle.colonyDepth.read().revision,
        }).status,
      ).toBe("committed");
      const request = composePhase1SaveV2(bundle, {
        nowUtc: "2026-09-30T12:00:00.000Z",
      });
      const save = {
        ...request,
        formatId: request.world.formatId,
        schemaVersion: request.world.schemaVersion,
        recordKind: "portable-bundle" as const,
      };
      expect(save.world.colonyDepth?.inspectedSites).toEqual([site.id]);
      const policy = createPhase1SaveV2Compatibility(bundle.catalog, [3]);
      expect(validatePortableSaveBundleV2(save, policy)).toMatchObject({
        ok: true,
      });
      const { colonyDepth, industry, ...legacyWorld } = save.world;
      expect(colonyDepth).toBeDefined();
      expect(industry).toBeDefined();
      const legacy = { ...save, world: legacyWorld };
      expect(validatePortableSaveBundleV2(legacy, policy).ok).toBe(true);
      expect(() =>
        validateColonyDepthState({
          ...bundle.colonyDepth.read(),
          contentVersion: 999,
        }),
      ).toThrow();
      expect(
        validatePortableSaveBundleV2(
          {
            ...save,
            world: {
              ...save.world,
              colonyDepth: { ...save.world.colonyDepth, contentVersion: 999 },
            },
          },
          policy,
        ).ok,
      ).toBe(false);
    } finally {
      await bundle.destroy();
    }
  });
  it("overharvest pressure and active-time recovery change renewal cost without offline clocks", async () => {
    const bundle = await create();
    try {
      const position = colonySurveySites(bundle.config.worldSeed)[0]!.position;
      const initial = bundle.colonyDepth.recoveryMultiplier(position);
      for (let n = 0; n < 8; n++)
        bundle.colonyDepth.recordHarvest(position, 100);
      expect(bundle.colonyDepth.recoveryMultiplier(position)).toBe(initial * 2);
      bundle.colonyDepth.recover(99);
      expect(bundle.colonyDepth.recoveryMultiplier(position)).toBe(initial * 2);
      bundle.colonyDepth.recover(100 + 8 * 3600);
      expect(bundle.colonyDepth.recoveryMultiplier(position)).toBe(initial);
    } finally {
      await bundle.destroy();
    }
  });
});
