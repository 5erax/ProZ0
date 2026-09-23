import type {
  ContentCatalogV1,
  ContentCompatibilityIdentityV1,
  ContentId,
} from '../../content';
import {
  DeterministicRng,
  RNG_ALGORITHM_VERSION,
  SEED_DERIVATION_VERSION,
  createWorldPosition,
  deriveSeedState,
  type RngState,
  type WorldPosition,
} from '../../foundation';
import {
  CHUNK_SPAN_WORLD_UNITS,
  createChunkCoord,
  encodeChunkCoordForSeed,
  fromWorldPosition,
  sameChunkCoord,
  type ChunkCoord,
} from '../chunks/ChunkCoord';
import type {
  ChunkGenerationRequest,
  ChunkGenerator,
} from '../chunks/ChunkGenerator';
import {
  PHASE1_EXPLORATION_CELLS_PER_AXIS,
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
} from './ExplorationGrid';
import type {
  Phase1GeneratedChunkBase,
  Phase1GeneratedResourceEntity,
  Phase1GeneratedWorldEntity,
  Phase1TerrainCell,
  Phase1WorldLandmarks,
} from './Phase1WorldTypes';

export const PHASE1_WORLD_GENERATION_VERSION = 2 as const;
// The Phase 1 generator-version identity is intentionally the same version.
// Any intentional change to deterministic generated base/entity identity must
// increment PHASE1_WORLD_GENERATION_VERSION.
export const PHASE1_CHUNK_GENERATION_NAMESPACE =
  'phase1-world-chunk-generation' as const;
export const PHASE1_GENERATED_ENTITY_ID_NAMESPACE =
  'phase1-generated-world-entity-id' as const;
export const PHASE1_ROUTE_NAMESPACE =
  'phase1-vertical-slice-route' as const;
export const PHASE1_BASE_FINGERPRINT_ALGORITHM =
  'fnv1a32-phase1-base-v1' as const;

export const PHASE1_LANDING_POSITION = createWorldPosition(0, 0);
export const PHASE1_RUIN_DISTANCE_WORLD_UNITS = 392;
export const PHASE1_PREDATOR_ROUTE_DISTANCE_WORLD_UNITS = 224;
export const PHASE1_PREDATOR_ROUTE_OFFSET_WORLD_UNITS = 24;

const WATER_CENTER = createWorldPosition(34, -18);
const WATER_RADIUS_WORLD_UNITS = 9;

const LOCAL_RESOURCE_ANCHORS = Object.freeze([
  Object.freeze({
    definitionId: 'resource:fiber-plant',
    position: createWorldPosition(18, 10),
  }),
  Object.freeze({
    definitionId: 'resource:food-plant',
    position: createWorldPosition(-18, 14),
  }),
  Object.freeze({
    definitionId: 'resource:potable-water-source',
    position: createWorldPosition(34, -18),
  }),
  Object.freeze({
    definitionId: 'resource:timber-source',
    position: createWorldPosition(-36, -12),
  }),
  Object.freeze({
    definitionId: 'resource:stone-outcrop',
    position: createWorldPosition(48, 24),
  }),
  Object.freeze({
    definitionId: 'resource:metal-ore-node',
    position: createWorldPosition(62, -20),
  }),
] as const);

const EXPEDITION_RESOURCE_IDS = Object.freeze([
  'resource:fiber-plant',
  'resource:food-plant',
  'resource:potable-water-source',
  'resource:timber-source',
  'resource:stone-outcrop',
  'resource:metal-ore-node',
] as const);

const LOCAL_WILDLIFE_POSITION = createWorldPosition(54, 36);

function routeIndex(worldSeed: string): number {
  const rng = new DeterministicRng(deriveSeedState({
    worldSeed,
    namespace: PHASE1_ROUTE_NAMESPACE,
    stableIdentifiers: Object.freeze(['cardinal-v1']),
  }));
  return rng.nextUint32() % 4;
}

function routeVector(index: number): {
  readonly name: Phase1WorldLandmarks['routeCardinal'];
  readonly x: number;
  readonly y: number;
  readonly perpendicularX: number;
  readonly perpendicularY: number;
} {
  switch (index) {
    case 0:
      return Object.freeze({
        name: 'east',
        x: 1,
        y: 0,
        perpendicularX: 0,
        perpendicularY: 1,
      });
    case 1:
      return Object.freeze({
        name: 'south',
        x: 0,
        y: 1,
        perpendicularX: -1,
        perpendicularY: 0,
      });
    case 2:
      return Object.freeze({
        name: 'west',
        x: -1,
        y: 0,
        perpendicularX: 0,
        perpendicularY: -1,
      });
    default:
      return Object.freeze({
        name: 'north',
        x: 0,
        y: -1,
        perpendicularX: 1,
        perpendicularY: 0,
      });
  }
}

export function getPhase1WorldLandmarks(
  worldSeed: string,
): Phase1WorldLandmarks {
  if (worldSeed.length === 0) {
    throw new RangeError('World seed must not be empty.');
  }

  const route = routeVector(routeIndex(worldSeed));

  return Object.freeze({
    landingPosition: PHASE1_LANDING_POSITION,
    ruinPosition: createWorldPosition(
      route.x * PHASE1_RUIN_DISTANCE_WORLD_UNITS,
      route.y * PHASE1_RUIN_DISTANCE_WORLD_UNITS,
    ),
    predatorPosition: createWorldPosition(
      route.x * PHASE1_PREDATOR_ROUTE_DISTANCE_WORLD_UNITS
        + route.perpendicularX * PHASE1_PREDATOR_ROUTE_OFFSET_WORLD_UNITS,
      route.y * PHASE1_PREDATOR_ROUTE_DISTANCE_WORLD_UNITS
        + route.perpendicularY * PHASE1_PREDATOR_ROUTE_OFFSET_WORLD_UNITS,
    ),
    routeCardinal: route.name,
  });
}

function seedForChunk(
  worldSeed: string,
  coord: ChunkCoord,
  content: ContentCompatibilityIdentityV1,
): RngState {
  const canonical = createChunkCoord(coord.x, coord.y);
  const [encodedX, encodedY] = encodeChunkCoordForSeed(canonical);

  return deriveSeedState({
    worldSeed,
    namespace: PHASE1_CHUNK_GENERATION_NAMESPACE,
    stableIdentifiers: Object.freeze([
      RNG_ALGORITHM_VERSION,
      SEED_DERIVATION_VERSION,
      `generation:${PHASE1_WORLD_GENERATION_VERSION}`,
      content.canonicalFingerprint,
      `x:${encodedX}`,
      `y:${encodedY}`,
    ]),
  });
}

export interface Phase1GeneratedEntityIdInput {
  readonly worldSeed: string;
  readonly contentCompatibility: ContentCompatibilityIdentityV1;
  readonly kind: string;
  readonly definitionId: ContentId;
  readonly coord: ChunkCoord;
  readonly ordinal: string;
}

export function derivePhase1GeneratedEntityId(
  input: Phase1GeneratedEntityIdInput,
): string {
  if (input.worldSeed.length === 0) {
    throw new RangeError('World seed must not be empty.');
  }
  if (input.ordinal.length === 0) {
    throw new RangeError('Generated entity ordinal/candidate key must not be empty.');
  }

  const coord = createChunkCoord(input.coord.x, input.coord.y);
  const [encodedX, encodedY] = encodeChunkCoordForSeed(coord);
  const state = deriveSeedState({
    worldSeed: input.worldSeed,
    namespace: PHASE1_GENERATED_ENTITY_ID_NAMESPACE,
    stableIdentifiers: Object.freeze([
      `generation:${PHASE1_WORLD_GENERATION_VERSION}`,
      `rng:${RNG_ALGORITHM_VERSION}`,
      `seed-derivation:${SEED_DERIVATION_VERSION}`,
      `content-fingerprint:${input.contentCompatibility.canonicalFingerprint}`,
      `generator-namespace:${PHASE1_CHUNK_GENERATION_NAMESPACE}`,
      `chunk-x:${encodedX}`,
      `chunk-y:${encodedY}`,
      `kind:${input.kind}`,
      `content-id:${input.definitionId}`,
      `ordinal:${input.ordinal}`,
    ]),
  });

  return `generated:${input.kind}:${state
    .map((value) => value.toString(16).padStart(8, '0'))
    .join('')}`;
}

function belongsToChunk(
  position: WorldPosition,
  coord: ChunkCoord,
): boolean {
  return sameChunkCoord(fromWorldPosition(position), coord);
}

function squaredDistanceFromOrigin(position: WorldPosition): number {
  return position.x * position.x + position.y * position.y;
}

function chunkCenter(coord: ChunkCoord): WorldPosition {
  return createWorldPosition(
    coord.x * CHUNK_SPAN_WORLD_UNITS + CHUNK_SPAN_WORLD_UNITS / 2,
    coord.y * CHUNK_SPAN_WORLD_UNITS + CHUNK_SPAN_WORLD_UNITS / 2,
  );
}

function waterAt(position: WorldPosition): boolean {
  const dx = position.x - WATER_CENTER.x;
  const dy = position.y - WATER_CENTER.y;
  return dx * dx + dy * dy <= WATER_RADIUS_WORLD_UNITS ** 2;
}

function generateTerrain(coord: ChunkCoord) {
  const cells: Phase1TerrainCell[] = [];

  for (
    let cellY = 0;
    cellY < PHASE1_EXPLORATION_CELLS_PER_AXIS;
    cellY += 1
  ) {
    for (
      let cellX = 0;
      cellX < PHASE1_EXPLORATION_CELLS_PER_AXIS;
      cellX += 1
    ) {
      const position = createWorldPosition(
        coord.x * CHUNK_SPAN_WORLD_UNITS
          + (cellX + 0.5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
        coord.y * CHUNK_SPAN_WORLD_UNITS
          + (cellY + 0.5) * PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
      );
      cells.push(waterAt(position) ? 'water' : 'ground');
    }
  }

  return Object.freeze({
    cellsPerAxis: PHASE1_EXPLORATION_CELLS_PER_AXIS,
    cellSizeWorldUnits: PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
    cells: Object.freeze(cells),
  });
}

function expeditionResourceEntities(
  worldSeed: string,
  coord: ChunkCoord,
  catalog: ContentCatalogV1,
): readonly Phase1GeneratedResourceEntity[] {
  const center = chunkCenter(coord);
  const distanceSquared = squaredDistanceFromOrigin(center);
  const minimumDistance = 160;
  const maximumDistance = 430;

  if (
    distanceSquared < minimumDistance ** 2
    || distanceSquared > maximumDistance ** 2
  ) {
    return Object.freeze([]);
  }

  const rng = new DeterministicRng(deriveSeedState({
    worldSeed,
    namespace: 'phase1-expedition-resources',
    stableIdentifiers: Object.freeze([
      catalog.compatibility.canonicalFingerprint,
      `coord:${coord.x}:${coord.y}`,
    ]),
  }));

  if ((rng.nextUint32() % 100) >= 45) {
    return Object.freeze([]);
  }

  const count = 1 + (rng.nextUint32() % 2);
  const entities: Phase1GeneratedResourceEntity[] = [];

  for (let ordinal = 0; ordinal < count; ordinal += 1) {
    const definitionId =
      EXPEDITION_RESOURCE_IDS[
        rng.nextUint32() % EXPEDITION_RESOURCE_IDS.length
      ];
    if (definitionId === undefined) {
      throw new Error('Expedition resource table unexpectedly resolved no definition.');
    }
    catalog.getAs(definitionId, 'resource');

    const localX = 4 + (rng.nextUint32() % 24000) / 1000;
    let localY = 4 + (rng.nextUint32() % 24000) / 1000;
    let position = createWorldPosition(
      coord.x * CHUNK_SPAN_WORLD_UNITS + localX,
      coord.y * CHUNK_SPAN_WORLD_UNITS + localY,
    );

    if (waterAt(position) && definitionId !== 'resource:potable-water-source') {
      localY = (localY + 10) % 24 + 4;
      position = createWorldPosition(
        coord.x * CHUNK_SPAN_WORLD_UNITS + localX,
        coord.y * CHUNK_SPAN_WORLD_UNITS + localY,
      );
    }

    entities.push(Object.freeze({
      type: 'resource',
      entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'resource',
        definitionId: definitionId,
        coord,
        ordinal: `expedition:${ordinal}`,
      }),
      definitionId,
      position,
    }));
  }

  return Object.freeze(entities);
}

function generateEntities(
  worldSeed: string,
  coord: ChunkCoord,
  catalog: ContentCatalogV1,
): readonly Phase1GeneratedWorldEntity[] {
  const entities: Phase1GeneratedWorldEntity[] = [];

  LOCAL_RESOURCE_ANCHORS.forEach((anchor, ordinal) => {
    if (!belongsToChunk(anchor.position, coord)) {
      return;
    }

    catalog.getAs(anchor.definitionId, 'resource');
    entities.push(Object.freeze({
      type: 'resource',
      entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'resource',
        definitionId: anchor.definitionId,
        coord,
        ordinal: `local:${ordinal}`,
      }),
      definitionId: anchor.definitionId,
      position: anchor.position,
    }));
  });

  entities.push(...expeditionResourceEntities(worldSeed, coord, catalog));

  if (belongsToChunk(LOCAL_WILDLIFE_POSITION, coord)) {
    catalog.getAs('entity:passive-wildlife', 'entity');
    entities.push(Object.freeze({
      type: 'passive-wildlife',
      entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'passive-wildlife',
        definitionId: 'entity:passive-wildlife',
        coord,
        ordinal: 'local:0',
      }),
      definitionId: 'entity:passive-wildlife',
      position: LOCAL_WILDLIFE_POSITION,
    }));
  }

  const center = chunkCenter(coord);
  const distanceSquared = squaredDistanceFromOrigin(center);
  if (
    distanceSquared >= 160 ** 2
    && distanceSquared <= 430 ** 2
  ) {
    const wildlifeRng = new DeterministicRng(deriveSeedState({
      worldSeed,
      namespace: 'phase1-expedition-wildlife',
      stableIdentifiers: Object.freeze([
        catalog.compatibility.canonicalFingerprint,
        `coord:${coord.x}:${coord.y}`,
      ]),
    }));

    if ((wildlifeRng.nextUint32() % 100) < 25) {
      const position = createWorldPosition(
        coord.x * CHUNK_SPAN_WORLD_UNITS
          + 5 + (wildlifeRng.nextUint32() % 22000) / 1000,
        coord.y * CHUNK_SPAN_WORLD_UNITS
          + 5 + (wildlifeRng.nextUint32() % 22000) / 1000,
      );
      entities.push(Object.freeze({
        type: 'passive-wildlife',
        entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'passive-wildlife',
        definitionId: 'entity:passive-wildlife',
        coord,
        ordinal: 'expedition:0',
      }),
        definitionId: 'entity:passive-wildlife',
        position,
      }));
    }
  }

  const landmarks = getPhase1WorldLandmarks(worldSeed);

  if (belongsToChunk(landmarks.predatorPosition, coord)) {
    catalog.getAs('hostile:territorial-predator', 'hostile');
    entities.push(Object.freeze({
      type: 'hostile',
      entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'hostile',
        definitionId: 'hostile:territorial-predator',
        coord,
        ordinal: 'phase1:0',
      }),
      definitionId: 'hostile:territorial-predator',
      position: landmarks.predatorPosition,
    }));
  }

  if (belongsToChunk(landmarks.ruinPosition, coord)) {
    catalog.getAs('ruin:previous-civilization-ruin', 'ruin');
    entities.push(Object.freeze({
      type: 'ruin',
      entityId: derivePhase1GeneratedEntityId({
        worldSeed,
        contentCompatibility: catalog.compatibility,
        kind: 'ruin',
        definitionId: 'ruin:previous-civilization-ruin',
        coord,
        ordinal: 'phase1:0',
      }),
      definitionId: 'ruin:previous-civilization-ruin',
      position: landmarks.ruinPosition,
    }));
  }

  entities.sort((left, right) =>
    left.entityId < right.entityId
      ? -1
      : left.entityId > right.entityId
        ? 1
        : 0,
  );

  return Object.freeze(entities);
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function canonicalBaseDescription(
  terrainCells: readonly Phase1TerrainCell[],
  entities: readonly Phase1GeneratedWorldEntity[],
): string {
  const entityText = entities
    .map((entity) =>
      [
        entity.type,
        entity.entityId,
        entity.definitionId,
        entity.position.x,
        entity.position.y,
      ].join('|'),
    )
    .join(';');

  return `${terrainCells.join('')}::${entityText}`;
}

function baseFingerprint(
  content: ContentCompatibilityIdentityV1,
  terrainCells: readonly Phase1TerrainCell[],
  entities: readonly Phase1GeneratedWorldEntity[],
): string {
  const hash = fnv1a32(
    canonicalBaseDescription(terrainCells, entities),
  ).toString(16).padStart(8, '0');

  return [
    'phase1-base-v1',
    PHASE1_BASE_FINGERPRINT_ALGORITHM,
    `generation-${PHASE1_WORLD_GENERATION_VERSION}`,
    content.canonicalFingerprint,
    hash,
  ].join(':');
}

export class Phase1ChunkGenerator implements ChunkGenerator {
  public constructor(
    private readonly catalog: ContentCatalogV1,
  ) {}

  public generate(
    request: ChunkGenerationRequest,
  ): Phase1GeneratedChunkBase {
    if (request.generationVersion !== PHASE1_WORLD_GENERATION_VERSION) {
      throw new RangeError(
        `Unsupported Phase 1 generation version ${request.generationVersion}; expected ${PHASE1_WORLD_GENERATION_VERSION}.`,
      );
    }

    if (request.worldSeed.length === 0) {
      throw new RangeError('World seed must not be empty.');
    }

    const coord = createChunkCoord(
      request.coord.x,
      request.coord.y,
    );
    const generationSeed = seedForChunk(
      request.worldSeed,
      coord,
      this.catalog.compatibility,
    );
    const rng = new DeterministicRng(generationSeed);
    const generationFingerprint = Object.freeze([
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
      rng.nextUint32(),
    ]) as readonly [number, number, number, number];

    const terrain = generateTerrain(coord);
    const entities = generateEntities(
      request.worldSeed,
      coord,
      this.catalog,
    );

    return Object.freeze({
      coord,
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
      rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
      generationSeed,
      generationFingerprint,
      contentCompatibility: this.catalog.compatibility,
      baseGenerationFingerprint: baseFingerprint(
        this.catalog.compatibility,
        terrain.cells,
        entities,
      ),
      terrain,
      entities,
    });
  }
}
