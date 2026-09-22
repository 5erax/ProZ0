import {
  SIMULATION_STEP_SECONDS,
  toSimulationTick,
  type PlayerId,
  type SimulationStep,
  type SimulationTick,
} from '../../foundation';
import type { PlayerInput } from '../api/PlayerInput';
import type { SimulationRuntime } from '../api/SimulationRuntime';
import type { SimulationSnapshot } from '../api/SimulationSnapshot';

export class FixedStepRuntime implements SimulationRuntime {
  private tick: SimulationTick = toSimulationTick(0);

  public submitInput(playerId: PlayerId, input: PlayerInput): void {
    void playerId;
    void input;

    // P0-ENG-001 establishes the logical input boundary only.
    // Gameplay consumption belongs to an authorized gameplay task.
  }

  public step(step: SimulationStep): void {
    const expectedTick = Number(this.tick) + 1;

    if (Number(step.tick) !== expectedTick) {
      throw new Error(`Expected simulation tick ${expectedTick}, received ${Number(step.tick)}.`);
    }

    if (step.dtSeconds !== SIMULATION_STEP_SECONDS) {
      throw new Error('SimulationRuntime only accepts the approved fixed 60 Hz step.');
    }

    this.tick = step.tick;
  }

  public getSnapshot(): Readonly<SimulationSnapshot> {
    return Object.freeze({
      tick: this.tick,
      runtimeMode: 'local-authority',
    });
  }
}
