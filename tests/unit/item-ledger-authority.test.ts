import { describe, expect, it } from 'vitest';
import {
  ContentLookupError,
  createPhase1ContentCatalog,
} from '../../src/content';
import {
  Phase1ItemAuthority,
  type ContainerState,
  type ItemLedgerSnapshot,
  type ItemStackState,
} from '../../src/simulation';
import { Phase1ItemTestWorld } from '../support/Phase1ItemTestWorld';

function stack(
  stackId: string,
  itemDefinitionId: string,
  quantity: number,
  condition: number | null = null,
): ItemStackState {
  return {
    stackId,
    itemDefinitionId,
    quantity,
    condition,
  };
}

function inventory(
  id: string,
  playerId: string,
  stacks: readonly ItemStackState[] = [],
): ContainerState {
  return {
    containerId: id,
    kind: 'player-inventory',
    ownerPlayerId: playerId,
    revision: 0,
    stacks,
  };
}

function crate(
  id: string,
  stacks: readonly ItemStackState[] = [],
): ContainerState {
  return {
    containerId: id,
    kind: 'storage-crate',
    ownerPlayerId: null,
    revision: 0,
    stacks,
  };
}

function create(
  containers: readonly ContainerState[],
  world = new Phase1ItemTestWorld(),
): Phase1ItemAuthority {
  const initialLedger: ItemLedgerSnapshot = { containers };

  return new Phase1ItemAuthority({
    catalog: createPhase1ContentCatalog(),
    world,
    initialLedger,
  });
}

describe('Phase1 item ledger validation', () => {
  it('rejects duplicate container and stack identities', () => {
    expect(() => create([
      inventory('inventory:p1', 'p1'),
      inventory('inventory:p1', 'p1'),
    ])).toThrow(/Duplicate or empty ContainerId/);

    expect(() => create([
      inventory(
        'inventory:p1',
        'p1',
        [stack('same-stack', 'item:plant-fiber', 1)],
      ),
      crate(
        'crate:a',
        [stack('same-stack', 'item:plant-fiber', 1)],
      ),
    ])).toThrow(/Duplicate ItemStackId/);
  });

  it('rejects invalid condition-bearing stacks and invalid content references', () => {
    expect(() => create([
      inventory(
        'inventory:p1',
        'p1',
        [stack('tool-a', 'item:stone-field-tool', 2, 100)],
      ),
    ])).toThrow(/exceeds maxStack|Condition-bearing stack/);

    expect(() => create([
      inventory(
        'inventory:p1',
        'p1',
        [stack('unknown', 'item:not-defined', 1)],
      ),
    ])).toThrow(ContentLookupError);
  });

  it('exports a canonical snapshot that reconstructs exactly', () => {
    const world = new Phase1ItemTestWorld();
    const first = create([
      crate(
        'crate:a',
        [
          stack('fiber-b', 'item:plant-fiber', 2),
          stack('fiber-a', 'item:plant-fiber', 1),
        ],
      ),
      inventory(
        'inventory:p1',
        'p1',
        [stack('tool-a', 'item:stone-field-tool', 1, 73)],
      ),
    ], world);

    const exported = first.exportLedgerSnapshot();
    const second = new Phase1ItemAuthority({
      catalog: createPhase1ContentCatalog(),
      world,
      initialLedger: exported,
    });

    expect(second.exportLedgerSnapshot()).toEqual(exported);
    expect(exported.containers.map((entry) => entry.containerId)).toEqual([
      'crate:a',
      'inventory:p1',
    ]);
    expect(exported.containers[0]?.stacks.map((entry) => entry.stackId)).toEqual([
      'fiber-a',
      'fiber-b',
    ]);
  });
});

describe('Phase1 item transaction determinism', () => {
  it('selects merge targets by stable ItemStackId independent of source insertion order', () => {
    const run = (
      crateStacks: readonly ItemStackState[],
    ): ItemLedgerSnapshot => {
      const authority = create([
        inventory(
          'inventory:p1',
          'p1',
          [stack('source', 'item:plant-fiber', 5)],
        ),
        crate('crate:a', crateStacks),
      ]);

      const result = authority.execute({
        type: 'transfer',
        operationId: 'op:deterministic-transfer',
        playerId: 'p1',
        sourceContainerId: 'inventory:p1',
        sourceExpectedRevision: 0,
        targetContainerId: 'crate:a',
        targetExpectedRevision: 0,
        sourceStackId: 'source',
        quantity: 5,
      });

      expect(result).toMatchObject({ status: 'committed' });
      return authority.exportLedgerSnapshot();
    };

    const aFirst = run([
      stack('a-stack', 'item:plant-fiber', 49),
      stack('b-stack', 'item:plant-fiber', 45),
    ]);
    const bFirst = run([
      stack('b-stack', 'item:plant-fiber', 45),
      stack('a-stack', 'item:plant-fiber', 49),
    ]);

    expect(aFirst).toEqual(bFirst);

    const crateView = aFirst.containers.find(
      (entry) => entry.containerId === 'crate:a',
    );
    expect(crateView?.stacks).toEqual([
      stack('a-stack', 'item:plant-fiber', 50),
      stack('b-stack', 'item:plant-fiber', 49),
    ]);
  });

  it('replays the same ordered commands to the exact same canonical state', () => {
    const run = (): ItemLedgerSnapshot => {
      const authority = create([
        inventory(
          'inventory:p1',
          'p1',
          [stack('fiber-a', 'item:plant-fiber', 10)],
        ),
        crate('crate:a'),
      ]);

      authority.execute({
        type: 'split',
        operationId: 'op:split',
        playerId: 'p1',
        containerId: 'inventory:p1',
        expectedRevision: 0,
        sourceStackId: 'fiber-a',
        quantity: 4,
      });
      authority.execute({
        type: 'transfer',
        operationId: 'op:transfer',
        playerId: 'p1',
        sourceContainerId: 'inventory:p1',
        sourceExpectedRevision: 1,
        targetContainerId: 'crate:a',
        targetExpectedRevision: 0,
        sourceStackId: 'generated-stack:op:split:0',
        quantity: 4,
      });

      return authority.exportLedgerSnapshot();
    };

    expect(run()).toEqual(run());
  });
});
