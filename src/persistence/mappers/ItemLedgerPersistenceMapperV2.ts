import type { ItemLedgerSnapshot } from '../../simulation/items';
import { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../schema/SaveSchema';
import type {
  ContainerOwnerRefV2,
  ContainerRecordV2,
} from '../schema/v2/ContainerRecordV2';

export interface ContainerOwnerResolverV2 {
  resolveOwner(containerId: string): ContainerOwnerRefV2 | null;
}

export function itemLedgerSnapshotToContainerRecordsV2(
  worldId: string,
  snapshot: ItemLedgerSnapshot,
  owners: ContainerOwnerResolverV2,
): readonly ContainerRecordV2[] {
  const records = snapshot.containers.map((container) => {
    const owner = container.kind === 'player-inventory'
      ? container.ownerPlayerId === null
        ? null
        : { type: 'player' as const, playerId: container.ownerPlayerId }
      : owners.resolveOwner(container.containerId);
    if (owner === null) {
      throw new Error(`Persistence owner is missing for container ${container.containerId}.`);
    }
    return Object.freeze({
      formatId: SAVE_FORMAT_ID,
      schemaVersion: SAVE_SCHEMA_VERSION_V2,
      recordKind: 'container' as const,
      worldId,
      containerId: container.containerId,
      kind: container.kind === 'world-drop' ? 'ground-drop' as const : container.kind,
      revision: container.revision,
      owner: Object.freeze({ ...owner }),
      stacks: Object.freeze(container.stacks.map((stack) => Object.freeze({ ...stack }))),
    });
  });
  return Object.freeze(records);
}

export function containerRecordsV2ToItemLedgerSnapshot(
  records: readonly ContainerRecordV2[],
): ItemLedgerSnapshot {
  return Object.freeze({
    containers: Object.freeze(records.map((record) => Object.freeze({
      containerId: record.containerId,
      kind: record.kind === 'ground-drop' ? 'world-drop' as const : record.kind,
      ownerPlayerId: record.owner.type === 'player' ? record.owner.playerId : null,
      revision: record.revision,
      stacks: Object.freeze(record.stacks.map((stack) => Object.freeze({ ...stack }))),
    }))),
  });
}
