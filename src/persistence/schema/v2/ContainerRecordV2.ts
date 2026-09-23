import type { ContentId } from '../../../content';
import type { PlayerId } from '../../../foundation';
import type { ContainerId, ItemStackId } from '../../../simulation/items';
import type { StructureId } from '../../../world/building';
import type { SAVE_FORMAT_ID, SAVE_SCHEMA_VERSION_V2 } from '../SaveSchema';

export type ContainerSaveKindV2 =
  | 'player-inventory'
  | 'storage-crate'
  | 'machine-output'
  | 'death-cache'
  | 'ground-drop';

export type ContainerOwnerRefV2 =
  | { readonly type: 'player'; readonly playerId: PlayerId }
  | { readonly type: 'structure'; readonly structureId: StructureId }
  | { readonly type: 'world-entity'; readonly entityId: string };

export interface ItemStackSaveV2 {
  readonly stackId: ItemStackId;
  readonly itemDefinitionId: ContentId;
  readonly quantity: number;
  readonly condition: number | null;
}

export interface ContainerRecordV2 {
  readonly formatId: typeof SAVE_FORMAT_ID;
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION_V2;
  readonly recordKind: 'container';
  readonly worldId: string;
  readonly containerId: ContainerId;
  readonly kind: ContainerSaveKindV2;
  readonly revision: number;
  readonly owner: ContainerOwnerRefV2;
  readonly stacks: readonly ItemStackSaveV2[];
}
