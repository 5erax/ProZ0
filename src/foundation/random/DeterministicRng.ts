export const RNG_ALGORITHM_VERSION = 'xoshiro128ss-v1' as const;

export type RngState = readonly [number, number, number, number];

function asUint32(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new RangeError('RNG state values must be uint32 integers.');
  }
  return value >>> 0;
}

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export class DeterministicRng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  public constructor(state: RngState) {
    const s0 = asUint32(state[0]);
    const s1 = asUint32(state[1]);
    const s2 = asUint32(state[2]);
    const s3 = asUint32(state[3]);

    if ((s0 | s1 | s2 | s3) === 0) {
      throw new RangeError('xoshiro128** state cannot be all zero.');
    }

    this.s0 = s0;
    this.s1 = s1;
    this.s2 = s2;
    this.s3 = s3;
  }

  public nextUint32(): number {
    const multiplied = Math.imul(this.s1, 5) >>> 0;
    const result = Math.imul(rotateLeft(multiplied, 7), 9) >>> 0;
    const t = (this.s1 << 9) >>> 0;

    this.s2 = (this.s2 ^ this.s0) >>> 0;
    this.s3 = (this.s3 ^ this.s1) >>> 0;
    this.s1 = (this.s1 ^ this.s2) >>> 0;
    this.s0 = (this.s0 ^ this.s3) >>> 0;
    this.s2 = (this.s2 ^ t) >>> 0;
    this.s3 = rotateLeft(this.s3, 11);

    return result;
  }

  public exportState(): RngState {
    return Object.freeze([this.s0, this.s1, this.s2, this.s3]) as RngState;
  }
}
