import { expect, it } from 'vitest';
import { createPhase1ContentCatalog } from '../../src/content';
import { Phase1ItemAuthority } from '../../src/simulation/items';
import { Phase1BuildingWorld } from '../../src/world/building/Phase1BuildingWorld';
import { Phase1BuildingTestSpatial } from '../support/Phase1BuildingTestSpatial';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';
import {
  ExpeditionAuthority,
  type ExpeditionCommand,
} from '../../src/simulation/expedition/ExpeditionAuthority';
import { emptyExpeditionState } from '../../src/simulation/expedition/ExpeditionState';
function fixture(custom = false) {
  const spatial = new Phase1BuildingTestSpatial();
  const empty = new Phase1BuildingWorld(
    spatial,
    undefined,
    true,
  ).exportSnapshot();
  const buildings = new Phase1BuildingWorld(
    spatial,
    {
      foothold: {
        ...empty.foothold,
        structures: [
          ...empty.foothold.structures,
          {
            structureId: 'crate',
            definitionId: 'structure:storage-crate',
            revision: 0,
            position: { x: 102, y: 100 },
            orientationQuarterTurns: 0,
            placedByPlayerId: 'solo',
            containerId: 'container:crate',
            placementOperationFingerprint: 'fixture:crate',
          },
        ],
      },
    },
    true,
  );
  const items = new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world: new Phase1ItemTestWorld(),
    initialLedger: {
      containers: [
        {
          containerId: 'inventory:solo',
          kind: 'player-inventory',
          ownerPlayerId: 'solo',
          revision: 0,
          stacks: [],
        },
        {
          containerId: 'container:crate',
          kind: 'storage-crate',
          ownerPlayerId: null,
          revision: 0,
          stacks: [
            {
              stackId: 'wood',
              itemDefinitionId: 'item:timber',
              quantity: 6,
              condition: null,
            },
          ],
        },
      ],
    },
  });
  const actor = { x: 100, y: 100, alive: true };
  const authority = new ExpeditionAuthority(items, buildings, () => actor, {
    ...emptyExpeditionState(),
    facilities: [
      {
        id: 'facility',
        owner: 'solo',
        definitionId: custom ? 'rain-collector' : 'supply-cache',
        canonicalStructureId: custom ? null : 'crate',
        x: 102,
        y: custom ? 102 : 100,
        orientation: 0,
        water: custom ? 3 : 0,
        progress: custom ? 123 : 0,
      },
    ],
  });
  const command = (
    id: string,
    extra: Partial<ExpeditionCommand> = {},
  ): ExpeditionCommand => ({
    id,
    playerId: 'solo',
    action: 'relocate',
    target: 'facility',
    expectedRevision: authority.read().revision,
    expectedInventoryRevision:
      items.getContainerView('inventory:solo').revision,
    expectedBuildRevision: buildings.getBuildRevision(),
    x: 103,
    y: 101,
    orientation: 1,
    ...extra,
  });
  return { spatial, buildings, items, actor, authority, command };
}
it('relocation preserves a loaded crate and its identities, synchronizes facility positions and persists replay', () => {
  const f = fixture();
  const before = f.items.exportLedgerSnapshot();
  const cmd = f.command('move');
  expect(f.authority.execute(cmd)).toEqual({
    status: 'committed',
    message: 'FACILITY_RELOCATED',
  });
  expect(f.buildings.getStructure('crate')).toMatchObject({
    position: { x: 103, y: 101 },
    containerId: 'container:crate',
    revision: 1,
    orientationQuarterTurns: 1,
  });
  expect(f.authority.read().facilities[0]).toMatchObject({
    x: 103,
    y: 101,
    canonicalStructureId: 'crate',
    orientation: 1,
  });
  expect(f.items.exportLedgerSnapshot()).toEqual(before);
  const reopenedBuildings = new Phase1BuildingWorld(
    f.spatial,
    f.buildings.exportSnapshot(),
    true,
  );
  const restored = new ExpeditionAuthority(
    f.items,
    reopenedBuildings,
    () => f.actor,
    f.authority.read(),
  );
  expect(restored.execute(cmd)).toEqual({
    status: 'committed',
    message: 'FACILITY_RELOCATED',
  });
  expect(reopenedBuildings.getBuildRevision()).toBe(1);
  expect(f.items.exportLedgerSnapshot()).toEqual(before);
});
it('relocation rejects stale, foreign, distant, dead and obstructed attempts before mutating anything', () => {
  for (const reason of [
    'stale',
    'foreign',
    'far',
    'dead',
    'blocked',
    'invalid',
    'inside',
  ]) {
    const f = fixture();
    const cmd = f.command(
      reason,
      reason === 'stale'
        ? { expectedBuildRevision: 99 }
        : reason === 'foreign'
          ? { playerId: 'other' }
          : reason === 'far'
            ? { x: 120 }
            : reason === 'invalid'
              ? { x: NaN }
              : {},
    );
    if (reason === 'dead') f.actor.alive = false;
    if (reason === 'blocked') f.spatial.blocking = true;
    if (reason === 'inside') f.spatial.playerInside = true;
    const before = f.buildings.exportSnapshot(),
      state = f.authority.read(),
      ledger = f.items.exportLedgerSnapshot();
    expect(f.authority.execute(cmd).status, reason).toBe('rejected');
    expect(f.buildings.exportSnapshot()).toEqual(before);
    expect(f.authority.read()).toBe(state);
    expect(f.items.exportLedgerSnapshot()).toEqual(ledger);
  }
});
it('moving a custom collector keeps its water and in-progress production and excludes itself from overlap', () => {
  const f = fixture(true),
    before = f.items.exportLedgerSnapshot();
  expect(
    f.authority.execute(f.command('collector', { x: 102, y: 103 })).status,
  ).toBe('committed');
  expect(f.authority.read().facilities[0]).toMatchObject({
    x: 102,
    y: 103,
    water: 3,
    progress: 123,
  });
  expect(f.items.exportLedgerSnapshot()).toEqual(before);
});
it('attached habitat reanchors to a valid connector and reconstructed topology stays valid', () => {
  const spatial = new Phase1BuildingTestSpatial(),
    world = new Phase1BuildingWorld(spatial, undefined, true);
  const reservation = world.reservePlacement({
    operationId: 'habitat',
    commandFingerprint: 'fixture',
    actorPlayerId: 'solo',
    definitionId: 'structure:habitat-room',
    expectedBuildRevision: 0,
    placement: {
      mode: 'connector',
      targetConnectorId: 'connector:landing:east',
      requestedOrientationQuarterTurns: 0,
    },
  });
  if (typeof reservation === 'string') throw Error(reservation);
  world.commitReservedPlacement(reservation);
  const structure = world.getStructure(reservation.structureId)!;
  expect(
    world.relocate({
      structureId: structure.structureId,
      playerId: 'solo',
      expectedBuildRevision: 1,
      expectedStructureRevision: 0,
      placement: {
        mode: 'connector',
        targetConnectorId: 'connector:landing:west',
        requestedOrientationQuarterTurns: 2,
      },
    }),
  ).toBeNull();
  expect(world.getStructure(structure.structureId)).toMatchObject({
    position: { x: -2, y: 0 },
    orientationQuarterTurns: 2,
    revision: 1,
  });
  const restored = new Phase1BuildingWorld(
    spatial,
    world.exportSnapshot(),
    true,
  );
  expect(restored.exportSnapshot()).toEqual(world.exportSnapshot());
  expect(
    world.assessRelocation('structure-instance:landing-module', {
      mode: 'free',
      anchor: { x: 10, y: 10 },
      orientationQuarterTurns: 0,
    }),
  ).toBe('LANDMARK_IMMOVABLE');
});
