import { describe, expect, it } from 'vitest';
import { Phase1AuthorityBundle } from '../../src/integration';
import { COLONY_RESEARCH } from '../../src/content/phase2/ColonyDepthContent';
import { INDUSTRY_FACILITIES, INDUSTRY_RESEARCH, type IndustryCost } from '../../src/content/phase3/IndustryContent';
import type { IndustryCommand } from '../../src/simulation/industry/IndustryAuthority';

describe('Industry collision in canonical solo and hosted colony worlds', () => {
  it.each([false, true])('blocks movement and legacy placement, then clears on dismantle (expedition=%s)', async singlePlayerExpeditionEnabled => {
    const playerId = 'builder';
    const bundle = await Phase1AuthorityBundle.create({
      worldId: 'world:industry-collision:' + String(singlePlayerExpeditionEnabled),
      worldSeed: 'p1-world-golden', playerIds: [playerId], colonyDepthEnabled: true,
      singlePlayerExpeditionEnabled, interactionRangeWorldUnits: 1.25,
      spawnClearanceRadiusWorldUnits: 1.25, requiredAccessRadiusWorldUnits: 1.25,
    });
    let ordinal = 0;
    const inventory = () => bundle.items.getContainerView('inventory:' + playerId);
    // Supply/prerequisite setup is explicit; placement and collision use the real world and authorities.
    const fund = (outputs: readonly IndustryCost[]) => expect(bundle.items.commitColonyExchange({
      operationId: 'collision:materials:' + ++ordinal, playerId,
      expectedInventoryRevision: inventory().revision, inputs: [], outputs,
    }).status).toBe('committed');
    const command = (intent: Omit<IndustryCommand, 'operationId' | 'playerId' | 'expectedRevision' | 'expectedInventoryRevision'>): IndustryCommand => ({
      ...intent, operationId: 'collision:industry:' + ++ordinal, playerId,
      expectedRevision: bundle.industry!.read().revision, expectedInventoryRevision: inventory().revision,
    });
    try {
      await bundle.stepSolo();
      for (const targetId of ['field-survey', 'expanded-storage']) {
        fund(COLONY_RESEARCH.find(research => research.id === targetId)!.costs);
        expect(bundle.colonyDepth.execute({ operationId: 'collision:colony:' + ++ordinal,
          playerId, action: 'research', targetId, expectedRevision: bundle.colonyDepth.read().revision,
          expectedInventoryRevision: inventory().revision }).status).toBe('committed');
      }
      fund(INDUSTRY_RESEARCH.find(research => research.id === 'automation')!.costs);
      expect(bundle.industry!.execute(command({ action: 'research', targetId: 'automation' })).status).toBe('committed');
      fund(INDUSTRY_FACILITIES.depot.costs);
      let depot: ReturnType<NonNullable<typeof bundle.industry>['read']>['facilities'][number] | undefined;
      for (let x = -3.5; x <= 3.5 && !depot; x += 0.5) {
        for (let y = -3.5; y <= 3.5 && !depot; y += 0.5) {
          if (Math.hypot(x, y) > 4) continue;
          const position = { x, y };
          const sweep = { center: { x: x - 0.9, y }, footprint: { halfWidth: 0.3, halfDepth: 0.3 }, axis: 'x' as const, desiredDelta: 0.2 };
          if (bundle.world.sweepAabbAxis(sweep).blocked) continue;
          const result = bundle.industry!.execute(command({ action: 'build', facilityKind: 'depot', position }));
          if (result.status === 'committed') depot = bundle.industry!.read().facilities.find(facility => facility.id === result.entityId);
        }
      }
      expect(depot, 'a paid facility on real explored dry ground').toBeDefined();
      if (!depot) throw new Error('No depot build location.');
      const center = { x: depot.position.x - 0.9, y: depot.position.y };
      const sweep = { center, footprint: { halfWidth: 0.3, halfDepth: 0.3 }, axis: 'x' as const, desiredDelta: 0.2 };
      expect(bundle.world.sweepAabbAxis(sweep)).toMatchObject({ blocked: true, allowedDelta: 0 });

      bundle.getRuntime(playerId).relocatePlayer(center);
      fund([{ itemDefinitionId: 'item:storage-crate-kit', quantity: 1 }]);
      const before = bundle.items.exportLedgerSnapshot();
      const kit = inventory().stacks.find(stack => stack.itemDefinitionId === 'item:storage-crate-kit')!;
      expect(bundle.placeStructure({ operationId: 'collision:legacy:' + ++ordinal, actorPlayerId: playerId,
        structureDefinitionId: 'structure:storage-crate', sourceKitStackId: kit.stackId,
        inventoryContainerId: inventory().containerId, expectedInventoryRevision: inventory().revision,
        expectedBuildRevision: bundle.buildings.getBuildRevision(),
        placement: { mode: 'free', anchor: depot.position, orientationQuarterTurns: 0 },
      })).toMatchObject({ status: 'rejected', reason: 'OBSTRUCTED' });
      expect(bundle.items.exportLedgerSnapshot()).toEqual(before);
      expect(bundle.buildings.exportSnapshot().foothold.structures.some(structure => structure.position.x === depot!.position.x && structure.position.y === depot!.position.y)).toBe(false);

      // Building under a player must allow outward motion; authority placement cannot trap its operator.
      expect(bundle.world.sweepAabbAxis({ ...sweep, center: depot.position, desiredDelta: -0.2 })).toMatchObject({ blocked: false, allowedDelta: -0.2 });
      expect(bundle.industry!.execute(command({ action: 'dismantle', targetId: depot.id })).status).toBe('committed');
      expect(bundle.world.sweepAabbAxis(sweep)).toMatchObject({ blocked: false, allowedDelta: 0.2 });
      expect(bundle.buildings.assessPlacement('structure:storage-crate', {
        mode: 'free', anchor: depot.position, orientationQuarterTurns: 0,
      })).toMatchObject({ finalPosition: depot.position });
    } finally { await bundle.destroy(); }
  });
});
