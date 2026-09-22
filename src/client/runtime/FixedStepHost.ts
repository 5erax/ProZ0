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

const SUSPENSION_THRESHOLD_MS = 250;

export class FixedStepHost {
  private animationFrameId: number | null = null;
  private lastFrameTimeMs: number | null = null;
  private accumulatorSeconds = 0;
  private tick: SimulationTick = toSimulationTick(0);

  public constructor(private readonly callbacks: FixedStepHostCallbacks) {}

  public start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.resetTiming();
    this.animationFrameId = requestAnimationFrame(this.onAnimationFrame);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.lastFrameTimeMs = null;
    this.accumulatorSeconds = 0;
  }

  public resetTiming(): void {
    this.lastFrameTimeMs = performance.now();
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
      this.animationFrameId = requestAnimationFrame(this.onAnimationFrame);
      return;
    }

    this.accumulatorSeconds += elapsedMs / 1000;

    while (this.accumulatorSeconds >= SIMULATION_STEP_SECONDS) {
      this.tick = toSimulationTick(Number(this.tick) + 1);
      this.callbacks.onStep(createSimulationStep(this.tick));
      this.accumulatorSeconds -= SIMULATION_STEP_SECONDS;
    }

    const alpha = this.accumulatorSeconds / SIMULATION_STEP_SECONDS;
    this.callbacks.onRender(alpha);
    this.animationFrameId = requestAnimationFrame(this.onAnimationFrame);
  };
}
