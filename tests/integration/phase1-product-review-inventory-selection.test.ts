import { describe, expect, it } from 'vitest';
import {
  PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
  PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
  Phase1AuthorityBundle,
} from '../../src/integration/Phase1AuthorityBundle';
import {
  Phase1ProductReviewPresentationSource,
} from '../../src/client/runtime/Phase1ProductReviewPresentationSource';

async function createInventorySelectionBundle() {
  const playerId = 'player:selection-guard';
  const bundle = await Phase1AuthorityBundle.create({
    worldId: 'world:p1-polish-005-selection-guard',
    worldSeed: 'p1-world-golden',
    playerIds: [playerId],
    interactionRangeWorldUnits:
      PHASE1_ORDINARY_INTERACTION_RANGE_WORLD_UNITS,
    spawnClearanceRadiusWorldUnits:
      PHASE1_LANDING_SPAWN_CLEARANCE_RADIUS_WORLD_UNITS,
    requiredAccessRadiusWorldUnits:
      PHASE1_LANDING_REQUIRED_ACCESS_RADIUS_WORLD_UNITS,
  });

  let inventory = bundle.items.getContainerView(
    'inventory:' + playerId,
  );
  const kitCommit = bundle.items.commitDismantleItems({
    operationId: 'test:p1-polish-005:return-storage-kit',
    playerId,
    inventoryContainerId: inventory.containerId,
    expectedInventoryRevision: inventory.revision,
    returnedKitItemDefinitionId: 'item:storage-crate-kit',
    removeContainerId: null,
  });
  expect(kitCommit.status).toBe('committed');

  inventory = bundle.items.getContainerView(inventory.containerId);
  const kit = inventory.stacks.find(
    (stack) =>
      stack.itemDefinitionId === 'item:storage-crate-kit',
  );
  if (kit === undefined) {
    throw new Error('Expected canonical Storage Crate Kit test setup.');
  }

  const placed = bundle.placeStructure({
    operationId: 'test:p1-polish-005:place-storage',
    actorPlayerId: playerId,
    structureDefinitionId: 'structure:storage-crate',
    sourceKitStackId: kit.stackId,
    inventoryContainerId: inventory.containerId,
    expectedInventoryRevision: inventory.revision,
    expectedBuildRevision: bundle.buildings.getBuildRevision(),
    placement: {
      mode: 'free',
      anchor: Object.freeze({ x: 8, y: 0 }),
      orientationQuarterTurns: 0,
    },
  });
  expect(placed.status).toBe('committed');

  inventory = bundle.items.getContainerView(inventory.containerId);
  const reward = bundle.items.commitRuinRewardItems({
    operationId: 'test:p1-polish-005:add-replacement-stack',
    playerId,
    inventoryContainerId: inventory.containerId,
    expectedInventoryRevision: inventory.revision,
    rewardSourceId: 'test:p1-polish-005:ruin-reward',
    itemDefinitionId: 'item:ancient-alloy-shard',
    quantity: 1,
  });
  expect(reward.status).toBe('committed');

  return { bundle, playerId } as const;
}

function storageContainerId(bundle: Phase1AuthorityBundle): string {
  const structure = bundle.buildings
    .exportSnapshot()
    .foothold.structures
    .find(
      (candidate) =>
        candidate.definitionId === 'structure:storage-crate',
    );
  if (structure?.containerId === null || structure === undefined) {
    throw new Error('Expected accessible Storage Crate test setup.');
  }
  return structure.containerId;
}

describe('P1-POLISH-005 stale selection guard', () => {
  it('requires a rendered replacement before player or storage actions can retarget', async () => {
    const { bundle, playerId } =
      await createInventorySelectionBundle();

    try {
      const source = new Phase1ProductReviewPresentationSource(
        bundle,
        playerId,
        () => Object.freeze([]),
      );
      source.togglePanel('inventory');

      const initialPlayer = source.getInventoryActionSelection();
      expect(initialPlayer.pane).toBe('player');
      expect(initialPlayer.normalizedDuringLookup).toBe(false);
      expect(initialPlayer.stack?.itemDefinitionId)
        .toBe('item:stone-field-tool');

      const storageId = storageContainerId(bundle);
      const externalPlayerMove = bundle.executeItemCommand({
        type: 'transfer',
        operationId: 'test:p1-polish-005:external-player-removal',
        playerId,
        sourceContainerId: initialPlayer.inventory.containerId,
        sourceExpectedRevision: initialPlayer.inventory.revision,
        targetContainerId: storageId,
        targetExpectedRevision:
          bundle.items.getContainerView(storageId).revision,
        sourceStackId: initialPlayer.stack!.stackId,
        quantity: 1,
      });
      expect(externalPlayerMove.status).toBe('committed');

      // Stack A vanished canonically after it was rendered. The same
      // action-resolution pass must not return normalized Stack B.
      const stalePlayerAction =
        source.getInventoryActionSelection();
      expect(stalePlayerAction.normalizedDuringLookup).toBe(true);
      expect(stalePlayerAction.stack).toBeNull();
      expect(
        bundle.items.getContainerView(
          stalePlayerAction.inventory.containerId,
        ).stacks,
      ).toHaveLength(1);

      source.refresh();
      const renderedPlayerReplacement =
        source.getInventoryActionSelection();
      expect(renderedPlayerReplacement.normalizedDuringLookup)
        .toBe(false);
      expect(renderedPlayerReplacement.stack?.itemDefinitionId)
        .toBe('item:ancient-alloy-shard');

      // A later explicit action may now target the rendered replacement.
      const moveReplacementToStorage = bundle.executeItemCommand({
        type: 'transfer',
        operationId: 'test:p1-polish-005:later-player-action',
        playerId,
        sourceContainerId:
          renderedPlayerReplacement.source.containerId,
        sourceExpectedRevision:
          renderedPlayerReplacement.source.revision,
        targetContainerId:
          renderedPlayerReplacement.target!.containerId,
        targetExpectedRevision:
          renderedPlayerReplacement.target!.revision,
        sourceStackId: renderedPlayerReplacement.stack!.stackId,
        quantity: 1,
      });
      expect(moveReplacementToStorage.status).toBe('committed');

      source.refresh();
      expect(source.cycleInventoryPane()).toBe(true);
      const initialStorage = source.getInventoryActionSelection();
      expect(initialStorage.pane).toBe('storage');
      expect(initialStorage.normalizedDuringLookup).toBe(false);
      expect(initialStorage.stack?.itemDefinitionId)
        .toBe('item:stone-field-tool');

      const externalStorageMove = bundle.executeItemCommand({
        type: 'transfer',
        operationId: 'test:p1-polish-005:external-storage-removal',
        playerId,
        sourceContainerId: initialStorage.source.containerId,
        sourceExpectedRevision: initialStorage.source.revision,
        targetContainerId: initialStorage.target!.containerId,
        targetExpectedRevision: initialStorage.target!.revision,
        sourceStackId: initialStorage.stack!.stackId,
        quantity: 1,
      });
      expect(externalStorageMove.status).toBe('committed');

      // Storage Stack A vanished after render. Same lookup cannot return
      // Storage Stack B for the current Enter action.
      const staleStorageAction =
        source.getInventoryActionSelection();
      expect(staleStorageAction.pane).toBe('storage');
      expect(staleStorageAction.normalizedDuringLookup).toBe(true);
      expect(staleStorageAction.stack).toBeNull();
      expect(
        bundle.items.getContainerView(storageId).stacks,
      ).toHaveLength(1);

      source.refresh();
      const renderedStorageReplacement =
        source.getInventoryActionSelection();
      expect(renderedStorageReplacement.normalizedDuringLookup)
        .toBe(false);
      expect(renderedStorageReplacement.stack?.itemDefinitionId)
        .toBe('item:ancient-alloy-shard');

      const laterStorageAction = bundle.executeItemCommand({
        type: 'transfer',
        operationId: 'test:p1-polish-005:later-storage-action',
        playerId,
        sourceContainerId:
          renderedStorageReplacement.source.containerId,
        sourceExpectedRevision:
          renderedStorageReplacement.source.revision,
        targetContainerId:
          renderedStorageReplacement.target!.containerId,
        targetExpectedRevision:
          renderedStorageReplacement.target!.revision,
        sourceStackId: renderedStorageReplacement.stack!.stackId,
        quantity: 1,
      });
      expect(laterStorageAction.status).toBe('committed');
      expect(bundle.items.getContainerView(storageId).stacks)
        .toHaveLength(0);
    } finally {
      await bundle.destroy();
    }
  });
});
