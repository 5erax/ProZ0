import type { RngState } from './DeterministicRng';

export const SEED_DERIVATION_VERSION = 'fnv1a32-avalanche-v1' as const;

export interface SeedDerivationInput {
  readonly worldSeed: string;
  readonly namespace: string;
  readonly stableIdentifiers: readonly string[];
}

export interface SeedDerivation {
  derive(input: SeedDerivationInput): RngState;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function mixByte(hash: number, byte: number): number {
  return Math.imul((hash ^ byte) >>> 0, FNV_PRIME) >>> 0;
}

function mixUint32(hash: number, value: number): number {
  let next = hash;
  const unsigned = value >>> 0;

  next = mixByte(next, unsigned & 0xff);
  next = mixByte(next, (unsigned >>> 8) & 0xff);
  next = mixByte(next, (unsigned >>> 16) & 0xff);
  next = mixByte(next, (unsigned >>> 24) & 0xff);

  return next;
}

function mixString(hash: number, value: string): number {
  let next = mixUint32(hash, value.length);

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    next = mixByte(next, codeUnit & 0xff);
    next = mixByte(next, codeUnit >>> 8);
  }

  return next;
}

function avalanche(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function requireNonEmpty(value: string, label: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} must not be empty.`);
  }
}

export function deriveSeedState(input: SeedDerivationInput): RngState {
  requireNonEmpty(input.worldSeed, 'worldSeed');
  requireNonEmpty(input.namespace, 'namespace');

  let root = FNV_OFFSET_BASIS;
  root = mixString(root, 'proz0-seed-derivation');
  root = mixString(root, SEED_DERIVATION_VERSION);
  root = mixString(root, input.worldSeed);
  root = mixString(root, input.namespace);
  root = mixUint32(root, input.stableIdentifiers.length);

  for (const identifier of input.stableIdentifiers) {
    root = mixString(root, identifier);
  }

  const state: [number, number, number, number] = [
    avalanche(root ^ 0x9e3779b9),
    avalanche(root ^ 0x243f6a88),
    avalanche(root ^ 0xb7e15162),
    avalanche(root ^ 0xdeadbeef),
  ];

  if ((state[0] | state[1] | state[2] | state[3]) === 0) {
    state[3] = 1;
  }

  return Object.freeze(state) as RngState;
}

export class StableSeedDerivation implements SeedDerivation {
  public derive(input: SeedDerivationInput): RngState {
    return deriveSeedState(input);
  }
}
