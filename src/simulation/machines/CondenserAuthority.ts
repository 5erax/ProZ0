import type { PlayerId } from '../../foundation';
import type { Phase1BuildingWorld } from '../../world/building/Phase1BuildingWorld';
import type { CondenserRuntimeState } from '../../world/building/BuildingTypes';
import type { Phase1ItemAuthority } from '../items';

export const CONDENSER_CYCLE_TICKS = 5400;

export type CondenserDerivedState =
  | 'DISABLED'
  | 'UNPOWERED'
  | 'RUNNING'
  | 'OUTPUT_FULL';

export interface CondenserView {
  readonly structureId: string;
  readonly revision: number;
  readonly enabled: boolean;
  readonly productionProgressTicks: number;
  readonly completedCycleOrdinal: number;
  readonly outputContainerId: string;
  readonly outputCount: number;
  readonly derivedState: CondenserDerivedState;
}

export interface SetCondenserEnabledCommand {
  readonly operationId: string;
  readonly actorPlayerId: PlayerId;
  readonly structureId: string;
  readonly expectedRevision: number;
  readonly enabled: boolean;
}

export type SetCondenserEnabledResult =
  | {
      readonly status: 'committed';
      readonly operationId: string;
      readonly revision: number;
      readonly enabled: boolean;
    }
  | {
      readonly status: 'rejected';
      readonly operationId: string;
      readonly reason: 'SOURCE_MISSING' | 'STALE_REVISION' | 'OPERATION_ID_CONFLICT';
    };

interface CachedEnable {
  readonly signature: string;
  readonly result: SetCondenserEnabledResult;
}

export class Phase1CondenserAuthority {
  private readonly enableOperations = new Map<string, CachedEnable>();

  public constructor(
    private readonly items: Phase1ItemAuthority,
    private readonly world: Phase1BuildingWorld,
  ) {}

  public getView(structureId: string): CondenserView {
    const state = this.world.getCondenser(structureId);
    if (state === null) {
      throw new Error(`Unknown condenser: ${structureId}`);
    }
    return this.toView(state);
  }

  public setEnabled(
    command: SetCondenserEnabledCommand,
  ): SetCondenserEnabledResult {
    const signature = JSON.stringify([
      command.operationId,
      command.actorPlayerId,
      command.structureId,
      command.expectedRevision,
      command.enabled,
    ]);
    const cached = this.enableOperations.get(command.operationId);
    if (cached !== undefined) {
      if (cached.signature === signature) return cached.result;
      return Object.freeze({
        status: 'rejected',
        operationId: command.operationId,
        reason: 'OPERATION_ID_CONFLICT',
      });
    }

    const result = this.world.setCondenserEnabled(
      command.structureId,
      command.expectedRevision,
      command.enabled,
    );
    if (result === 'SOURCE_MISSING' || result === 'STALE_REVISION') {
      const rejected: SetCondenserEnabledResult = Object.freeze({
        status: 'rejected',
        operationId: command.operationId,
        reason: result,
      });
      this.enableOperations.set(command.operationId, {
        signature,
        result: rejected,
      });
      return rejected;
    }

    const committed: SetCondenserEnabledResult = Object.freeze({
      status: 'committed',
      operationId: command.operationId,
      revision: result.revision,
      enabled: result.enabled,
    });
    this.enableOperations.set(command.operationId, {
      signature,
      result: committed,
    });
    return committed;
  }

  public tick(structureId: string): CondenserView {
    const state = this.world.getCondenser(structureId);
    if (state === null) {
      throw new Error(`Unknown condenser: ${structureId}`);
    }

    const output = this.items.getContainerView(state.outputContainerId);
    const outputCount = output.stacks.reduce(
      (sum, stack) => sum + stack.quantity,
      0,
    );
    this.world.setCondenserPowerRequest(
      structureId,
      state.enabled && outputCount < 4,
    );

    const refreshed = this.world.getCondenser(structureId);
    if (refreshed === null) {
      throw new Error('Condenser disappeared during authority tick.');
    }
    const derived = this.deriveState(refreshed, outputCount);
    if (derived !== 'RUNNING') {
      return this.toView(refreshed);
    }

    if (refreshed.productionProgressTicks < CONDENSER_CYCLE_TICKS - 1) {
      const advanced = this.world.incrementCondenserProgress(structureId);
      return this.toView(advanced);
    }

    const cycleOperationId =
      `machine-cycle:${structureId}:${refreshed.completedCycleOrdinal}`;
    const itemResult = this.items.commitMachineOutput({
      operationId: cycleOperationId,
      outputContainerId: refreshed.outputContainerId,
      expectedOutputRevision: output.revision,
      itemDefinitionId: 'item:clean-water',
    });

    if (itemResult.status !== 'committed') {
      return this.toView(refreshed);
    }

    const committed = this.world.commitCondenserCycle(
      structureId,
      refreshed.revision,
    );
    if (typeof committed === 'string') {
      throw new Error(
        'Reserved machine cycle finalization unexpectedly failed.',
      );
    }

    const outputAfter = this.items.getContainerView(
      committed.outputContainerId,
    );
    const countAfter = outputAfter.stacks.reduce(
      (sum, stack) => sum + stack.quantity,
      0,
    );
    this.world.setCondenserPowerRequest(
      structureId,
      committed.enabled && countAfter < 4,
    );
    return this.toView(
      this.world.getCondenser(structureId) ?? committed,
    );
  }

  private toView(state: Readonly<CondenserRuntimeState>): CondenserView {
    const output = this.items.getContainerView(state.outputContainerId);
    const outputCount = output.stacks.reduce(
      (sum, stack) => sum + stack.quantity,
      0,
    );
    return Object.freeze({
      structureId: state.structureId,
      revision: state.revision,
      enabled: state.enabled,
      productionProgressTicks: state.productionProgressTicks,
      completedCycleOrdinal: state.completedCycleOrdinal,
      outputContainerId: state.outputContainerId,
      outputCount,
      derivedState: this.deriveState(state, outputCount),
    });
  }

  private deriveState(
    state: Readonly<CondenserRuntimeState>,
    outputCount: number,
  ): CondenserDerivedState {
    if (!state.enabled) return 'DISABLED';
    if (outputCount >= 4) return 'OUTPUT_FULL';
    if (!this.world.isCondenserPowered(state.structureId)) {
      return 'UNPOWERED';
    }
    return 'RUNNING';
  }
}
