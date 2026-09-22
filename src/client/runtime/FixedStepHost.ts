import {
  SIMULATION_STEP_SECONDS,
  createSimulationStep,
  toSimulationTick,
  type SimulationStep,
  type SimulationTick,
} from '../../foundation';

export interface FixedStepHostCallbacks {
  readonly onStep: (step: SimulationStep) => void;
  readonly onRender: (alpha: number) => void;
}

export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (timeMs: number) => void): number;
  cancelFrame(frameId: number): void;
}

const BROWSER_FRAME_SCHEDULER: FrameScheduler = Object.freeze({
  now(): number {
    return performance.now();
  },
  requestFrame(callback: (timeMs: number) => void): number {
    return requestAnimationFrame(callback);
  },
  cancelFrame(frameId: number): void {
    cancelAnimationFrame(frameId);
  },
});

const SUSPENSION_THRESHOLD_MS = 250;
const HOST_ACCUMULATOR_EPSILON_SECONDS = 1e-12;

export class FixedStepHost {
  private animationFrameId: number | null = null;
  private lastFrameTimeMs: number | null = null;
  private accumulatorSeconds = 0;
  private tick: SimulationTick = toSimulationTick(0);

  public constructor(
    private readonly callbacks: FixedStepHostCallbacks,
    private readonly scheduler: FrameScheduler = BROWSER_FRAME_SCHEDULER,
  ) {}

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.resetTiming();
    this.animationFrameId = this.scheduler.requestFrame(this.onAnimationFrame);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      this.scheduler.cancelFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.lastFrameTimeMs = null;
    this.accumulatorSeconds = 0;
  }

  public resetTiming(): void {
    this.lastFrameTimeMs = this.scheduler.now();
    this.accumulatorSeconds = 0;
  }

  private readonly onAnimationFrame = (timeMs: number): void => {
    if (this.animationFrameId === null) {
      return;
    }

    const previousTime = this.lastFrameTimeMs ?? timeMs;
    const elapsedMs = Math.max(0, timeMs - previousTime);
    this.lastFrameTimeMs = timeMs;

    if (elapsedMs >= SUSPENSION_THRESHOLD_MS) {
      this.accumulatorSeconds = 0;
      this.callbacks.onRender(0);
      this.animationFrameId = this.scheduler.requestFrame(this.onAnimationFrame);
      return;
    }

    this.accumulatorSeconds += elapsedMs / 1000;

    while (
      this.accumulatorSeconds + HOST_ACCUMULATOR_EPSILON_SECONDS
      >= SIMULATION_STEP_SECONDS
    ) {
      this.tick = toSimulationTick(Number(this.tick) + 1);
      this.callbacks.onStep(createSimulationStep(this.tick));
      this.accumulatorSeconds = Math.max(
        0,
        this.accumulatorSeconds - SIMULATION_STEP_SECONDS,
      );
    }

    const alpha = this.accumulatorSeconds / SIMULATION_STEP_SECONDS;
    this.callbacks.onRender(alpha);
    this.animationFrameId = this.scheduler.requestFrame(this.onAnimationFrame);
  };
}
