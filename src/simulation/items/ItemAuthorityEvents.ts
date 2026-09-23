import type { PlayerId } from '../../foundation';
import type { ContentId } from '../../content';
import type { ItemStackId, OperationId } from './ItemTypes';
import type { ResourceEntityId } from '../../world';

export type ItemAuthorityEvent =
  | {
      readonly type: 'gather-completed';
      readonly operationId: OperationId;
      readonly playerId: PlayerId;
      readonly resourceEntityId: ResourceEntityId;
      readonly resourceDefinitionId: ContentId;
    }
  | {
      readonly type: 'craft-completed';
      readonly operationId: OperationId;
      readonly playerId: PlayerId;
      readonly recipeId: ContentId;
    }
  | {
      readonly type: 'repair-completed';
      readonly operationId: OperationId;
      readonly playerId: PlayerId;
      readonly targetStackId: ItemStackId;
      readonly conditionBefore: number;
      readonly conditionAfter: number;
    };

export interface ItemAuthorityEventSink {
  emit(event: Readonly<ItemAuthorityEvent>): void;
}

export const NOOP_ITEM_AUTHORITY_EVENT_SINK: ItemAuthorityEventSink =
  Object.freeze({
    emit(): void {
      // Downstream progression/UI/network adapters may subscribe at composition.
    },
  });
