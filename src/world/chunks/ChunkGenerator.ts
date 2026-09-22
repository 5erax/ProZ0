import {
  DeterministicRng,
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  deriveSeedState,
  type RngState,
} from '../../foundation';
import {
  createChunkCoord,
  encodeChunkCoordForSeed,
  type ChunkCoord,
} from './ChunkCoord';

export const PHASE0_WORLD_GENERATION_VERSION = 1 as const;
export const CHUNK_GENERATION_NAMESPACE = 'chunk-generation' as const;

export interface ChunkGenerationRequest {
  readonly worldSeed: string;
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
}

export interface GeneratedChunkBase {
  readonly coord: ChunkCoord;
  readonly generationVersion: number;
  readonly rngAlgorithmVersion: typeof RNG_ALGORITHM_VERSION;
  readonly seedDerivationVersion: typeof SEED_DERIVATION_VERSION;
  readonly generationSeed: RngState;
  readonly generationFingerprint: readonly [number, number, number, number];
}

export interface ChunkGenerator {
  generate(request: ChunkGenerationRequest): GeneratedChunkBase;
}

function requireSupportedGenerationVersion(version: number): void {
  if (version !== PHASE0_WORLD_GENERATION_VERSION) {
    throw new RangeError(
      `Unsupported world generation version ${version}; expected ${PHASE0_WORLD_GENERATION_VERSION}.`,
    );
  }
}

function deriveChunkSeed(
  worldSeed: string,
  coord: ChunkCoord,
  generationVersion: number,
): RngState {
  const canonicalCoord = createChunkCoord(coord.x, coord.y);
  const [encodedX, encodedY] = encodeChunkCoordForSeed(canonicalCoord);

  return deriveSeedState({
    worldSeed,
    namespace: CHUNK_GENERATION_NAMESPACE,
    stableIdentifiers: Object.freeze([
      RNG_ALGORITHM_VERSION,
      `generation:${generationVersion}`,
      `x:${encodedX}`,
      `y:${encodedY}`,
    ]),
  });
}

export class Phase0ChunkGenerator implements ChunkGenerator {
  public generate(request: ChunkGenerationRequest): GeneratedChunkBase {
    requireSupportedGenerationVersion(request.generationVersion);

    const coord = createChunkCoord(request.coord.x, request.coord.y);
    const generationSeed = deriveChunkSeed(
      request.worldSeed,
      coord,
      request.generationVersion,
    );
    const rng = new DeterministicRng(generationSeed);
    const generationFingerprint = Object.freeze([
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
    ]) as readonly [number, number, number, number];

    return Object.freeze({
      coord,
      generationVersion: request.generationVersion,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
      generationSeed,
      generationFingerprint,
    });
  }
}

export function createPhase0ChunkGenerator(): ChunkGenerator {
  return new Phase0ChunkGenerator();
}
