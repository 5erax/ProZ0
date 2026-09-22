import type { PlayerId, SimulationStep } from '../../foundation';
import {
  createSimulationRuntime,
  type AuthorityRuntime,
  type PlayerInput,
  type SimulationRuntimeOptions,
  type SimulationSnapshot,
} from '../../simulation';

export class LocalAuthorityHost {
  private readonly runtime: AuthorityRuntime;
  private active = false;

  public constructor(options: SimulationRuntimeOptions) {
    this.runtime = createSimulationRuntime(options);
  }

  public start(): void {
    this.active = true;
  }

  public stop(): void {
    this.active = false;
  }

  public submitInput(playerId: PlayerId, input: PlayerInput): void {
    this.assertActive();
    this.runtime.submitInput(playerId, input);
  }

  public step(step: SimulationStep): void {
    this.assertActive();
    this.runtime.step(step);
  }

  public getSnapshot(): Readonly<SimulationSnapshot> {
    this.assertActive();
    return this.runtime.getSnapshot();
  }

  private assertActive(): void {
    if (!this.active) {
      throw new Error('LocalAuthorityHost is not active.');
    }
  }
}
