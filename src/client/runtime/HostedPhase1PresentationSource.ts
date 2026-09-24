import type {
  Phase1ExplorationFragment,
  Phase1RuinRuntimeState,
} from '../../world/phase1/Phase1WorldTypes';
import type { CommandResultV1 } from '../../protocol';
import {
  HostedClientConnection,
  type HostedClientState,
} from '../network';

function objectState(value: unknown): Readonly<Record<string, unknown>> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Readonly<Record<string, unknown>>;
}

export class HostedPhase1PresentationSource {
  public constructor(
    private readonly connection: HostedClientConnection,
  ) {}

  public getState(): HostedClientState {
    return this.connection.getState();
  }

  public getPlayerMotions() {
    return this.connection.getPlayerMotions();
  }

  public getCommandResult(operationId: string): CommandResultV1 | null {
    return this.connection.getCommandResult(operationId);
  }

  public getExploration(
    regionId: string,
  ): Readonly<Phase1ExplorationFragment> | null {
    const aggregate = this.connection.replication.get(
      'exploration',
      regionId,
    );
    if (aggregate === null || aggregate.tombstone) return null;
    const state = objectState(aggregate.state);
    const words = state?.words;
    if (
      !Array.isArray(words)
      || words.some(
        (value) => !Number.isSafeInteger(value) || (value as number) < 0,
      )
    ) {
      return null;
    }
    return Object.freeze({
      regionId,
      revision: aggregate.revision,
      words: Object.freeze([...words] as number[]),
    });
  }

  public getRuin(
    ruinEntityId: string,
  ): Readonly<Phase1RuinRuntimeState> | null {
    const aggregate = this.connection.replication.get('ruin', ruinEntityId);
    if (aggregate === null || aggregate.tombstone) return null;
    const state = objectState(aggregate.state);
    if (
      state === null
      || !['unknown', 'located', 'investigated'].includes(
        String(state.discoveryState),
      )
      || !['unspawned', 'claimable', 'claimed'].includes(
        String(state.physicalRewardState),
      )
    ) {
      return null;
    }
    return Object.freeze({
      ruinEntityId,
      ruinDefinitionId: 'ruin:previous-civilization-ruin',
      revision: aggregate.revision,
      discoveryState: state.discoveryState as Phase1RuinRuntimeState['discoveryState'],
      physicalRewardState:
        state.physicalRewardState as Phase1RuinRuntimeState['physicalRewardState'],
    });
  }
}
