import {
  SIMULATION_STEP_SECONDS,
  toSimulationTick,
  type PlayerId,
  type SimulationStep,
  type SimulationTick,
  type WorldPosition,
} from '../../foundation';
import type { WorldCollisionQuery } from '../../world';
import {
  NEUTRAL_PLAYER_INPUT,
  type PlayerInput,
} from '../api/PlayerInput';
import type { AuthorityRuntime } from '../api/AuthorityRuntime';
import type { PlayerPersistenceState } from '../api/PlayerPersistenceState';
import type {
  FacingDirection,
  SimulationSnapshot,
} from '../api/SimulationSnapshot';
import { PlayerMovementSystem } from './PlayerMovementSystem';

function copyInput(input: PlayerInput): PlayerInput {
  return Object.freeze({
    moveUp: input.moveUp,
    moveDown: input.moveDown,
    moveLeft: input.moveLeft,
    moveRight: input.moveRight,
  });
}

export class FixedStepRuntime implements AuthorityRuntime {
  private tick: SimulationTick = toSimulationTick(0);
  private currentInput: PlayerInput = NEUTRAL_PLAYER_INPUT;
  private readonly movement: PlayerMovementSystem;

  public constructor(
    worldQuery: WorldCollisionQuery,
    initialPlayerPosition: WorldPosition,
    initialPlayerFacing: FacingDirection | null = null,
  ) {
    this.movement = new PlayerMovementSystem(
      worldQuery,
      initialPlayerPosition,
      initialPlayerFacing,
    );
  }

  public submitInput(playerId: PlayerId, input: PlayerInput): void {
    void playerId;
    this.currentInput = copyInput(input);
  }

  public step(step: SimulationStep): void {
    const expectedTick = Number(this.tick) + 1;

    if (Number(step.tick) !== expectedTick) {
      throw new Error(`Expected simulation tick ${expectedTick}, received ${Number(step.tick)}.`);
    }

    if (step.dtSeconds !== SIMULATION_STEP_SECONDS) {
      throw new Error('SimulationRuntime only accepts the approved fixed 60 Hz step.');
    }

    this.movement.step(this.currentInput, step.dtSeconds);
    this.tick = step.tick;
  }

  public relocatePlayer(
    position: WorldPosition,
    facing?: FacingDirection | null,
  ): void {
    this.movement.relocate(position, facing);
  }

  public getSnapshot(): Readonly<SimulationSnapshot> {
    return Object.freeze({
      tick: this.tick,
      player: this.movement.getSnapshot(),
    });
  }

  public getPlayerPersistenceState(): Readonly<PlayerPersistenceState> | null {
    const snapshot = this.movement.getSnapshot();

    if (snapshot.facing === null) {
      return null;
    }

    return Object.freeze({
      position: snapshot.position,
      facing: snapshot.facing,
    });
  }
}
