import type { PlayerId, SimulationStep } from '../../foundation';
import {
  restorePlayerPersistenceState,
  saveSuccess,
  type SaveRepository,
  type SaveResult,
} from '../../persistence';
import {
  createSimulationRuntime,
  type AuthorityRuntime,
  type PlayerInput,
  type PlayerPersistenceState,
  type SimulationRuntimeOptions,
  type SimulationSnapshot,
} from '../../simulation';

export interface LocalAuthorityHostLoadOptions {
  readonly repository: SaveRepository;
  readonly worldId: string;
  readonly playerId: PlayerId;
  readonly worldQuery: SimulationRuntimeOptions['worldQuery'];
}

export class LocalAuthorityHost {
  private readonly runtime: AuthorityRuntime;
  private active = false;

  public constructor(options: SimulationRuntimeOptions) {
    this.runtime = createSimulationRuntime(options);
  }

  public static async createFromSave(
    options: LocalAuthorityHostLoadOptions,
  ): Promise<SaveResult<LocalAuthorityHost>> {
    const manifest = await options.repository.loadManifest(options.worldId);
    if (!manifest.ok) {
      return manifest;
    }

    const player = await options.repository.loadPlayer(
      options.worldId,
      options.playerId,
    );
    if (!player.ok) {
      return player;
    }

    const restored = restorePlayerPersistenceState(player.value);

    return saveSuccess(new LocalAuthorityHost({
      worldQuery: options.worldQuery,
      initialPlayerPosition: restored.position,
      initialPlayerFacing: restored.facing,
    }));
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

  public getPlayerPersistenceState(): Readonly<PlayerPersistenceState> | null {
    this.assertActive();
    return this.runtime.getPlayerPersistenceState();
  }

  private assertActive(): void {
    if (!this.active) {
      throw new Error('LocalAuthorityHost is not active.');
    }
  }
}
