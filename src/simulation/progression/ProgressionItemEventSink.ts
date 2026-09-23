import type { ItemAuthorityEvent, ItemAuthorityEventSink } from '../items';
import type { Phase1ProgressionAuthority } from './ProgressionAuthority';

export class ProgressionItemEventSink implements ItemAuthorityEventSink {
  public constructor(
    private readonly progression: Phase1ProgressionAuthority,
  ) {}

  public emit(event: Readonly<ItemAuthorityEvent>): void {
    const eventId = 'item-operation:' + event.operationId;
    const result = event.type === 'gather-completed'
      ? this.progression.applyEvent({
          type: 'gather-completed',
          eventId,
          playerId: event.playerId,
          resourceId: event.resourceDefinitionId,
        })
      : event.type === 'craft-completed'
        ? this.progression.applyEvent({
            type: 'craft-completed',
            eventId,
            playerId: event.playerId,
            recipeId: event.recipeId,
          })
        : this.progression.applyEvent({
            type: 'repair-completed',
            eventId,
            playerId: event.playerId,
            conditionBefore: event.conditionBefore,
            conditionAfter: event.conditionAfter,
          });

    if (result.status === 'rejected') {
      throw new Error(
        'Progression rejected committed item event: ' + result.reason,
      );
    }
  }
}
