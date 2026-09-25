import type {
  CommandResultV1,
} from '../../protocol';
import type {
  Phase1ExplorationFragment,
  Phase1RuinRuntimeState,
} from '../../world/phase1/Phase1WorldTypes';
import type { Phase1PresentationState } from '../presentation';
import {
  HostedClientConnection,
  type HostedClientState,
} from '../network';
import type {
  Phase1PresentationSource,
} from './Phase1PresentationBinding';

function objectState(value: unknown): Readonly<Record<string, unknown>> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Readonly<Record<string, unknown>>;
}

export interface HostedPhase1PresentationReadModel {
  getState(): HostedClientState;
  getPlayerMotions(): ReturnType<HostedClientConnection['getPlayerMotions']>;
  getCommandResult(operationId: string): CommandResultV1 | null;
  getExploration(
    regionId: string,
  ): Readonly<Phase1ExplorationFragment> | null;
  getRuin(
    ruinEntityId: string,
  ): Readonly<Phase1RuinRuntimeState> | null;
}

export interface HostedPhase1PresentationSourceOptions {
  readonly connection: HostedClientConnection;
  readonly initialState: Readonly<Phase1PresentationState>;
  readonly project: (
    readModel: HostedPhase1PresentationReadModel,
  ) => Readonly<Phase1PresentationState>;
}

export class HostedPhase1PresentationSource
  implements Phase1PresentationSource, HostedPhase1PresentationReadModel {
  private currentState: Readonly<Phase1PresentationState>;
  private readonly listeners =
    new Set<(state: Readonly<Phase1PresentationState>) => void>();
  private readonly unsubscribeConnection: () => void;

  public constructor(
    private readonly options: HostedPhase1PresentationSourceOptions,
  ) {
    this.currentState = options.initialState;
    this.unsubscribeConnection = options.connection.subscribeReadModel(() => {
      this.refresh();
    });
    this.refresh();
  }

  public read(): Readonly<Phase1PresentationState> {
    return this.currentState;
  }

  public subscribe(
    listener: (state: Readonly<Phase1PresentationState>) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy(): void {
    this.unsubscribeConnection();
    this.listeners.clear();
  }

  public getState(): HostedClientState {
    return this.options.connection.getState();
  }

  public getPlayerMotions() {
    return this.options.connection.getPlayerMotions();
  }

  public getCommandResult(operationId: string): CommandResultV1 | null {
    return this.options.connection.getCommandResult(operationId);
  }

  public getExploration(
    regionId: string,
  ): Readonly<Phase1ExplorationFragment> | null {
    const aggregate = this.options.connection.replication.get(
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
    const aggregate = this.options.connection.replication.get(
      'ruin',
      ruinEntityId,
    );
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
    const discoveryState = String(state.discoveryState) as
      'unknown' | 'located' | 'investigated';
    const physicalRewardState = String(state.physicalRewardState) as
      'unspawned' | 'claimable' | 'claimed';
    return Object.freeze({
      ruinEntityId,
      ruinDefinitionId: 'ruin:previous-civilization-ruin',
      revision: aggregate.revision,
      discoveryState,
      physicalRewardState,
    });
  }

  private refresh(): void {
    if (this.options.connection.getState() !== 'READY') {
      return;
    }
    this.currentState = this.options.project(this);
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}
