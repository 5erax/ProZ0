import type { RngState } from './DeterministicRng';

export interface SeedDerivationInput {
  readonly worldSeed: string;
  readonly namespace: string;
  readonly stableIdentifiers: readonly string[];
}

export interface SeedDerivation {
  derive(input: SeedDerivationInput): RngState;
}
