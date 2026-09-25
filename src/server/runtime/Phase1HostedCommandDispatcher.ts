import type { PlayerId } from '../../foundation';
import {
  type AttackCommand,
  type DismantleStructureCommand,
  type ItemCommand,
  type Phase1BuildingAuthority,
  type Phase1CombatAuthority,
  type Phase1CondenserAuthority,
  type Phase1DeathAuthority,
  type Phase1ItemAuthority,
  type PlaceStructureCommand,
} from '../../simulation';
import type {
  GameplayCommandEnvelopeV1,
  JsonValue,
  RevisionRefV1,
  RevisionedAggregateViewV1,
} from '../../protocol';
import type {
  HostedCommandDispatcher,
  HostedDomainCommandContext,
  HostedDomainCommandResult,
} from './ServerAuthorityHost';

export interface Phase1HostedReplicationAdapter {
  afterCommand(
    commandType: string,
    playerId: PlayerId,
  ): readonly RevisionedAggregateViewV1[];
}

export interface Phase1HostedRuinAuthority {
  inspectRuin(request: {
    readonly operationId: string;
    readonly playerId: PlayerId;
    readonly ruinEntityId: string;
    readonly expectedRevision: number;
  }):
    | {
        readonly status: 'committed';
        readonly operationId: string;
        readonly revision: number;
        readonly changed: boolean;
        readonly rewardItemId: string | null;
        readonly rewardQuantity: number;
      }
    | {
        readonly status: 'rejected';
        readonly operationId: string;
        readonly reason: string;
      };
}

export interface Phase1HostedCommandDispatcherOptions {
  readonly items: Phase1ItemAuthority;
  readonly buildings: Phase1BuildingAuthority;
  readonly machines: Phase1CondenserAuthority;
  readonly death: Phase1DeathAuthority;
  readonly combat?: Phase1CombatAuthority;
  readonly ruins?: Phase1HostedRuinAuthority;
  readonly replication?: Phase1HostedReplicationAdapter;
}

type PayloadObject = Readonly<Record<string, JsonValue>>;

function payloadObject(
  command: GameplayCommandEnvelopeV1,
): PayloadObject {
  if (
    command.payload === null
    || Array.isArray(command.payload)
    || typeof command.payload !== 'object'
  ) {
    throw new Error('INVALID_MESSAGE');
  }
  return command.payload as Readonly<Record<string, JsonValue>>;
}

function textField(
  payload: PayloadObject,
  name: string,
): string {
  const value = payload[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('INVALID_MESSAGE');
  }
  return value;
}

function numberField(
  payload: PayloadObject,
  name: string,
): number {
  const value = payload[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('INVALID_MESSAGE');
  }
  return value;
}

function positiveIntegerField(
  payload: PayloadObject,
  name: string,
): number {
  const value = numberField(payload, name);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('INVALID_MESSAGE');
  }
  return value;
}

function booleanField(
  payload: PayloadObject,
  name: string,
): boolean {
  const value = payload[name];
  if (typeof value !== 'boolean') {
    throw new Error('INVALID_MESSAGE');
  }
  return value;
}

function expectedRevision(
  command: GameplayCommandEnvelopeV1,
  aggregateType: string,
  aggregateId: string,
): number {
  const refs = command.expectedRevisions.filter(
    (entry) =>
      entry.aggregateType === aggregateType
      && entry.aggregateId === aggregateId,
  );
  if (refs.length !== 1) {
    throw new Error('INVALID_MESSAGE');
  }
  return refs[0]!.revision;
}

function itemResultRevisions(result: ReturnType<Phase1ItemAuthority['execute']>): readonly RevisionRefV1[] {
  if (result.status !== 'committed') return Object.freeze([]);
  return Object.freeze([
    ...result.resultingRevisions.map((entry) => Object.freeze({
      aggregateType: 'container',
      aggregateId: entry.containerId,
      revision: entry.revision,
    })),
    ...result.resultingWorldRevisions.map((entry) => Object.freeze({
      aggregateType: entry.kind,
      aggregateId: entry.kind === 'resource'
        ? entry.resourceEntityId
        : entry.worldDropId,
      revision: entry.revision,
    })),
  ]);
}

function withReplication(
  options: Phase1HostedCommandDispatcherOptions,
  commandType: string,
  playerId: PlayerId,
  result: Omit<HostedDomainCommandResult, 'aggregateUpdates'>,
): HostedDomainCommandResult {
  const aggregateUpdates = options.replication?.afterCommand(
    commandType,
    playerId,
  ) ?? [];
  return Object.freeze({
    ...result,
    aggregateUpdates: Object.freeze([...aggregateUpdates]),
  });
}

export class Phase1HostedCommandDispatcher
implements HostedCommandDispatcher {
  public constructor(
    private readonly options: Phase1HostedCommandDispatcherOptions,
  ) {}

  public execute(
    context: HostedDomainCommandContext,
  ): HostedDomainCommandResult {
    const command = context.command;
    const payload = payloadObject(command);

    switch (command.commandType) {
      case 'item.transfer':
        return this.executeItem(context.playerId, command, {
          type: 'transfer',
          operationId: command.operationId,
          playerId: context.playerId,
          sourceContainerId: textField(payload, 'sourceContainerId'),
          sourceExpectedRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'sourceContainerId'),
          ),
          targetContainerId: textField(payload, 'targetContainerId'),
          targetExpectedRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'targetContainerId'),
          ),
          sourceStackId: textField(payload, 'sourceStackId'),
          quantity: positiveIntegerField(payload, 'quantity'),
        });

      case 'item.split':
        return this.executeItem(context.playerId, command, {
          type: 'split',
          operationId: command.operationId,
          playerId: context.playerId,
          containerId: textField(payload, 'containerId'),
          expectedRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'containerId'),
          ),
          sourceStackId: textField(payload, 'sourceStackId'),
          quantity: positiveIntegerField(payload, 'quantity'),
        });

      case 'item.merge':
        return this.executeItem(context.playerId, command, {
          type: 'merge',
          operationId: command.operationId,
          playerId: context.playerId,
          containerId: textField(payload, 'containerId'),
          expectedRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'containerId'),
          ),
          sourceStackId: textField(payload, 'sourceStackId'),
          targetStackId: textField(payload, 'targetStackId'),
        });

      case 'item.drop':
        return this.executeItem(context.playerId, command, {
          type: 'drop',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          sourceStackId: textField(payload, 'sourceStackId'),
          quantity: positiveIntegerField(payload, 'quantity'),
        });

      case 'item.pickup':
        return this.executeItem(context.playerId, command, {
          type: 'pickup',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          worldDropId: textField(payload, 'worldDropId'),
          expectedWorldDropRevision: expectedRevision(
            command,
            'world-drop',
            textField(payload, 'worldDropId'),
          ),
          expectedDropContainerRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'dropContainerId'),
          ),
        });

      case 'item.wear':
        return this.executeItem(context.playerId, command, {
          type: 'wear',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          targetStackId: textField(payload, 'targetStackId'),
          conditionLoss: positiveIntegerField(payload, 'conditionLoss'),
        });

      case 'item.consume':
        return this.executeItem(context.playerId, command, {
          type: 'consume',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          sourceStackId: textField(payload, 'sourceStackId'),
        });

      case 'item.craft': {
        const workbenchId = payload.workbenchStructureId;
        const item: ItemCommand = {
          type: 'craft',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          recipeId: textField(payload, 'recipeId'),
          ...(typeof workbenchId === 'string'
            ? {
                workbench: {
                  structureInstanceId: workbenchId,
                  expectedRevision: expectedRevision(
                    command,
                    'structure',
                    workbenchId,
                  ),
                },
              }
            : {}),
        };
        return this.executeItem(context.playerId, command, item);
      }

      case 'item.repair': {
        const workbenchId = textField(payload, 'workbenchStructureId');
        return this.executeItem(context.playerId, command, {
          type: 'repair',
          operationId: command.operationId,
          playerId: context.playerId,
          inventoryContainerId: textField(payload, 'inventoryContainerId'),
          expectedInventoryRevision: expectedRevision(
            command,
            'container',
            textField(payload, 'inventoryContainerId'),
          ),
          targetStackId: textField(payload, 'targetStackId'),
          workbench: {
            structureInstanceId: workbenchId,
            expectedRevision: expectedRevision(
              command,
              'structure',
              workbenchId,
            ),
          },
        });
      }

      case 'building.place':
        return this.placeBuilding(context.playerId, command, payload);

      case 'building.dismantle':
        return this.dismantleBuilding(context.playerId, command, payload);

      case 'machine.set-enabled':
        return this.setMachineEnabled(context.playerId, command, payload);

      case 'death-cache.recover':
        return this.recoverDeathCache(context.playerId, command, payload);

      case 'world.ruin-inspect':
        return this.inspectRuin(context.playerId, command, payload);

      case 'combat.attack':
        return this.attack(context.playerId, command, payload);

      default:
        return Object.freeze({
          status: 'rejected',
          reason: 'INVALID_MESSAGE',
        });
    }
  }

  private executeItem(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    itemCommand: ItemCommand,
  ): HostedDomainCommandResult {
    const result = this.options.items.execute(itemCommand);
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: itemResultRevisions(result),
          }
        : { status: 'rejected', reason: result.reason },
    );
  }

  private placeBuilding(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    const placementValue = payload.placement;
    if (
      placementValue === null
      || Array.isArray(placementValue)
      || typeof placementValue !== 'object'
    ) {
      return Object.freeze({ status: 'rejected', reason: 'INVALID_MESSAGE' });
    }
    const placement = placementValue as PayloadObject;
    const mode = textField(placement, 'mode');
    const inventoryContainerId = textField(payload, 'inventoryContainerId');
    const definitionId = textField(payload, 'structureDefinitionId');

    let placementIntent: PlaceStructureCommand['placement'];
    if (mode === 'free') {
      const x = numberField(placement, 'x');
      const y = numberField(placement, 'y');
      const orientationQuarterTurns = numberField(
        placement,
        'orientationQuarterTurns',
      );
      if (![0, 1, 2, 3].includes(orientationQuarterTurns)) {
        return Object.freeze({ status: 'rejected', reason: 'INVALID_MESSAGE' });
      }
      placementIntent = {
        mode: 'free',
        anchor: { x, y },
        orientationQuarterTurns: orientationQuarterTurns as 0 | 1 | 2 | 3,
      };
    } else if (mode === 'connector') {
      const orientation = numberField(
        placement,
        'requestedOrientationQuarterTurns',
      );
      if (![0, 1, 2, 3].includes(orientation)) {
        return Object.freeze({ status: 'rejected', reason: 'INVALID_MESSAGE' });
      }
      placementIntent = {
        mode: 'connector',
        targetConnectorId: textField(placement, 'targetConnectorId'),
        requestedOrientationQuarterTurns: orientation as 0 | 1 | 2 | 3,
      };
    } else {
      return Object.freeze({ status: 'rejected', reason: 'INVALID_MESSAGE' });
    }

    const command: PlaceStructureCommand = {
      operationId: envelope.operationId,
      actorPlayerId: playerId,
      structureDefinitionId: definitionId as PlaceStructureCommand['structureDefinitionId'],
      sourceKitStackId: textField(payload, 'sourceKitStackId'),
      inventoryContainerId,
      expectedInventoryRevision: expectedRevision(
        envelope,
        'container',
        inventoryContainerId,
      ),
      expectedBuildRevision: expectedRevision(
        envelope,
        'foothold',
        'foothold:landing',
      ),
      placement: placementIntent,
    };
    const result = this.options.buildings.place(command);
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: Object.freeze([
              {
                aggregateType: 'foothold',
                aggregateId: 'foothold:landing',
                revision: result.buildRevision,
              },
              {
                aggregateType: 'structure',
                aggregateId: result.structure.structureId,
                revision: result.structure.revision,
              },
              {
                aggregateType: 'container',
                aggregateId: inventoryContainerId,
                revision: result.inventoryRevision,
              },
            ]),
          }
        : { status: 'rejected', reason: result.reason },
    );
  }

  private dismantleBuilding(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    const structureId = textField(payload, 'structureId');
    const inventoryContainerId = textField(payload, 'inventoryContainerId');
    const command: DismantleStructureCommand = {
      operationId: envelope.operationId,
      actorPlayerId: playerId,
      structureId,
      inventoryContainerId,
      expectedInventoryRevision: expectedRevision(
        envelope,
        'container',
        inventoryContainerId,
      ),
      expectedStructureRevision: expectedRevision(
        envelope,
        'structure',
        structureId,
      ),
      expectedBuildRevision: expectedRevision(
        envelope,
        'foothold',
        'foothold:landing',
      ),
    };
    const result = this.options.buildings.dismantle(command);
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: Object.freeze([
              {
                aggregateType: 'foothold',
                aggregateId: 'foothold:landing',
                revision: result.buildRevision,
              },
              {
                aggregateType: 'container',
                aggregateId: inventoryContainerId,
                revision: result.inventoryRevision,
              },
            ]),
          }
        : { status: 'rejected', reason: result.reason },
    );
  }

  private setMachineEnabled(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    const structureId = textField(payload, 'structureId');
    const result = this.options.machines.setEnabled({
      operationId: envelope.operationId,
      actorPlayerId: playerId,
      structureId,
      expectedRevision: expectedRevision(
        envelope,
        'structure',
        structureId,
      ),
      enabled: booleanField(payload, 'enabled'),
    });
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: Object.freeze([{
              aggregateType: 'structure',
              aggregateId: structureId,
              revision: result.revision,
            }]),
          }
        : { status: 'rejected', reason: result.reason },
    );
  }

  private recoverDeathCache(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    const sourceContainerId = textField(payload, 'sourceContainerId');
    const targetContainerId = textField(payload, 'targetContainerId');
    const result = this.options.death.recoverFromDeathCache({
      type: 'transfer',
      operationId: envelope.operationId,
      playerId,
      sourceContainerId,
      sourceExpectedRevision: expectedRevision(
        envelope,
        'container',
        sourceContainerId,
      ),
      targetContainerId,
      targetExpectedRevision: expectedRevision(
        envelope,
        'container',
        targetContainerId,
      ),
      sourceStackId: textField(payload, 'sourceStackId'),
      quantity: positiveIntegerField(payload, 'quantity'),
    });
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: itemResultRevisions(result),
          }
        : { status: 'rejected', reason: result.reason },
    );
  }

  private inspectRuin(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    if (this.options.ruins === undefined) {
      return Object.freeze({
        status: 'rejected',
        reason: 'INVALID_MESSAGE',
      });
    }
    const ruinEntityId = textField(payload, 'ruinEntityId');
    const result = this.options.ruins.inspectRuin({
      operationId: envelope.operationId,
      playerId,
      ruinEntityId,
      expectedRevision: expectedRevision(
        envelope,
        'ruin',
        ruinEntityId,
      ),
    });
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'committed'
        ? {
            status: 'committed',
            resultingRevisions: Object.freeze([{
              aggregateType: 'ruin',
              aggregateId: ruinEntityId,
              revision: result.revision,
            }]),
          }
        : {
            status: 'rejected',
            reason: result.reason,
          },
    );
  }

  private attack(
    playerId: PlayerId,
    envelope: GameplayCommandEnvelopeV1,
    payload: PayloadObject,
  ): HostedDomainCommandResult {
    if (this.options.combat === undefined) {
      return Object.freeze({ status: 'rejected', reason: 'INVALID_MESSAGE' });
    }
    const inventoryContainerId = textField(payload, 'inventoryContainerId');
    const command: AttackCommand = {
      attackId: envelope.operationId,
      playerId,
      inventoryContainerId,
      expectedInventoryRevision: expectedRevision(
        envelope,
        'container',
        inventoryContainerId,
      ),
      facingX: numberField(payload, 'facingX'),
      facingY: numberField(payload, 'facingY'),
    };
    const result = this.options.combat.submitAttack(
      command,
      textField(payload, 'predatorEntityId'),
    );
    return withReplication(
      this.options,
      envelope.commandType,
      playerId,
      result.status === 'rejected'
        ? { status: 'rejected', reason: result.reason ?? 'REJECTED' }
        : { status: 'committed' },
    );
  }
}
