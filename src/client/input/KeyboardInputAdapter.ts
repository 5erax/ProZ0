import type { PlayerInput } from '../../simulation';

export type KeyboardInputMapper = (pressedCodes: ReadonlySet<string>) => PlayerInput;
export type KeyboardCodeOwnership = (code: string) => boolean;

export class KeyboardInputAdapter {
  private readonly pressedCodes = new Set<string>();
  private target: Window | null = null;

  public constructor(
    private readonly mapper: KeyboardInputMapper,
    private readonly ownsCode: KeyboardCodeOwnership = () => false,
  ) {}

  public start(target: Window = window): void {
    if (this.target !== null) {
      return;
    }

    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  public stop(): void {
    if (this.target === null) {
      return;
    }

    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this.target = null;
    this.reset();
  }

  public sample(): PlayerInput {
    return this.mapper(this.pressedCodes);
  }

  public reset(): void {
    this.pressedCodes.clear();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.ownsCode(event.code)) {
      event.preventDefault();
    }

    this.pressedCodes.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.ownsCode(event.code)) {
      event.preventDefault();
    }

    this.pressedCodes.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.reset();
  };
}
