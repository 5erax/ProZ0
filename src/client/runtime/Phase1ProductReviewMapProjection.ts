import type {
  PlayerMotionViewV1,
  PresentationIdentitySlotV1,
} from '../../protocol';
import type {
  Phase1AuthorityBundle,
} from '../../integration/Phase1AuthorityBundle';
import {
  PLAYER_MOVEMENT_CONFIG,
} from '../../simulation';
import {
  createChunkCoord,
  fromWorldPosition,
  toChunkKey,
  type ChunkCoord,
} from '../../world';
import {
  isExplorationCellKnown,
  PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  PHASE1_EXPLORATION_CELLS_PER_AXIS,
} from '../../world/phase1/ExplorationGrid';
import {
  getPhase1WorldLandmarks,
  PHASE1_WORLD_GENERATION_VERSION,
  Phase1ChunkGenerator,
} from '../../world/phase1/Phase1ChunkGenerator';
import {
  type Phase1ExplorationFragment,
  type Phase1RuinRuntimeState,
  type Phase1TerrainGrid,
} from '../../world/phase1/Phase1WorldTypes';
import type {
  Phase1MapDistanceBand,
  Phase1MapExploredCellPresentation,
  Phase1MapFacing,
  Phase1MapMarkerPresentation,
  Phase1MapPanelPresentation,
  Phase1MapUnknownBoundaryCellPresentation,
} from '../presentation/Phase1PresentationModel';

const MAP_VIEW_HALF_WIDTH_CELLS = 40;
const MAP_VIEW_HALF_HEIGHT_CELLS = 20;
const ACTIVE_PLAYER_CHUNK_RADIUS = 1;

interface ChunkKnowledge {
  readonly coord: ChunkCoord;
  readonly exploration: Readonly<Phase1ExplorationFragment>;
  readonly terrain: Readonly<Phase1TerrainGrid>;
}

interface EligibleDetailTarget {
  readonly id: string;
  readonly label: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly markerIndex: number;
  readonly kind: 'base' | 'ruin' | 'death-cache';
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function stableCellHash(x: number, y: number): number {
  let value = Math.imul(x | 0, 0x45d9f3b)
    ^ Math.imul(y | 0, 0x119de1f3);
  value ^= value >>> 16;
  value = Math.imul(value, 0x45d9f3b);
  value ^= value >>> 16;
  return value >>> 0;
}

function mapGroundMotif(
  cellX: number,
  cellY: number,
): 'none' | 'flora' {
  const clusterX = Math.floor(cellX / 5);
  const clusterY = Math.floor(cellY / 5);
  const cluster = stableCellHash(clusterX, clusterY) % 5;
  if (cluster > 1) return 'none';
  return stableCellHash(cellX, cellY) % 4 === 0
    ? 'flora'
    : 'none';
}

function markerCell(value: number): number {
  return Math.floor(
    value / PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
  );
}

function cellKey(cellX: number, cellY: number): string {
  return String(cellX) + ':' + String(cellY);
}

function distanceBand(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Phase1MapDistanceBand {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const seconds =
    Math.sqrt(dx * dx + dy * dy)
    / PLAYER_MOVEMENT_CONFIG.baseMoveSpeed;

  if (seconds <= 25) return 'NEAR';
  if (seconds < 60) return 'MID';
  return 'FAR';
}

function candidateCoords(
  bundle: Phase1AuthorityBundle,
  motions: readonly Readonly<PlayerMotionViewV1>[],
): readonly ChunkCoord[] {
  const coords = new Map<string, ChunkCoord>();

  for (const persisted of bundle.worldPersistence.exportChunks()) {
    const coord = createChunkCoord(
      persisted.coord.x,
      persisted.coord.y,
    );
    coords.set(toChunkKey(coord), coord);
  }

  for (const motion of motions) {
    const center = fromWorldPosition(motion.position);
    for (
      let offsetY = -ACTIVE_PLAYER_CHUNK_RADIUS;
      offsetY <= ACTIVE_PLAYER_CHUNK_RADIUS;
      offsetY += 1
    ) {
      for (
        let offsetX = -ACTIVE_PLAYER_CHUNK_RADIUS;
        offsetX <= ACTIVE_PLAYER_CHUNK_RADIUS;
        offsetX += 1
      ) {
        const coord = createChunkCoord(
          center.x + offsetX,
          center.y + offsetY,
        );
        coords.set(toChunkKey(coord), coord);
      }
    }
  }

  return Object.freeze(
    [...coords.values()].sort(
      (left, right) =>
        left.y - right.y || left.x - right.x,
    ),
  );
}

function fragmentHasKnownCell(
  coord: ChunkCoord,
  fragment: Readonly<Phase1ExplorationFragment>,
): boolean {
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
      if (isExplorationCellKnown(
        coord,
        fragment,
        cellX,
        cellY,
      )) {
        return true;
      }
    }
  }
  return false;
}

function chunkKnowledge(
  bundle: Phase1AuthorityBundle,
  motions: readonly Readonly<PlayerMotionViewV1>[],
): readonly ChunkKnowledge[] {
  const persisted = new Map(
    bundle.worldPersistence.exportChunks()
      .map((entry) => [toChunkKey(entry.coord), entry] as const),
  );
  const generator = new Phase1ChunkGenerator(bundle.catalog);
  const knowledge: ChunkKnowledge[] = [];

  for (const coord of candidateCoords(bundle, motions)) {
    const active = bundle.worldStore.query(coord);
    if (active !== undefined) {
      knowledge.push(Object.freeze({
        coord: active.base.coord,
        exploration: active.delta.exploration,
        terrain: active.base.terrain,
      }));
      continue;
    }

    const stored = persisted.get(toChunkKey(coord));
    if (
      stored === undefined
      || !fragmentHasKnownCell(coord, stored.exploration)
    ) {
      continue;
    }

    const generated = generator.generate({
      worldSeed: bundle.config.worldSeed,
      generationVersion: PHASE1_WORLD_GENERATION_VERSION,
      coord,
    });
    if (
      generated.baseGenerationFingerprint
      !== stored.baseGenerationFingerprint
    ) {
      throw new Error(
        'Persisted explored terrain no longer matches canonical Phase 1 base generation.',
      );
    }

    knowledge.push(Object.freeze({
      coord,
      exploration: stored.exploration,
      terrain: generated.terrain,
    }));
  }

  return Object.freeze(knowledge);
}

function exploredCells(
  knowledge: readonly ChunkKnowledge[],
): readonly Phase1MapExploredCellPresentation[] {
  const cells: Phase1MapExploredCellPresentation[] = [];

  for (const chunk of knowledge) {
    for (
      let localY = 0;
      localY < PHASE1_EXPLORATION_CELLS_PER_AXIS;
      localY += 1
    ) {
      for (
        let localX = 0;
        localX < PHASE1_EXPLORATION_CELLS_PER_AXIS;
        localX += 1
      ) {
        if (!isExplorationCellKnown(
          chunk.coord,
          chunk.exploration,
          localX,
          localY,
        )) {
          continue;
        }

        const cellX =
          chunk.coord.x * PHASE1_EXPLORATION_CELLS_PER_AXIS
          + localX;
        const cellY =
          chunk.coord.y * PHASE1_EXPLORATION_CELLS_PER_AXIS
          + localY;
        const terrain = chunk.terrain.cells[
          localY * chunk.terrain.cellsPerAxis + localX
        ];
        if (terrain === undefined) {
          throw new Error(
            'Known Phase 1 map cell has no canonical terrain cell.',
          );
        }

        cells.push(Object.freeze({
          cellX,
          cellY,
          terrain,
          motif: terrain === 'ground'
            ? mapGroundMotif(cellX, cellY)
            : 'none',
        }));
      }
    }
  }

  return Object.freeze(
    cells.sort(
      (left, right) =>
        left.cellY - right.cellY
        || left.cellX - right.cellX,
    ),
  );
}

function unknownBoundaryCells(
  explored: readonly Phase1MapExploredCellPresentation[],
): readonly Phase1MapUnknownBoundaryCellPresentation[] {
  const known = new Set(
    explored.map((cell) => cellKey(cell.cellX, cell.cellY)),
  );
  const boundary = new Map<
    string,
    Phase1MapUnknownBoundaryCellPresentation
  >();
  const offsets = Object.freeze([
    Object.freeze([0, -1] as const),
    Object.freeze([1, 0] as const),
    Object.freeze([0, 1] as const),
    Object.freeze([-1, 0] as const),
  ]);

  for (const cell of explored) {
    for (const [offsetX, offsetY] of offsets) {
      const cellX = cell.cellX + offsetX;
      const cellY = cell.cellY + offsetY;
      const key = cellKey(cellX, cellY);
      if (known.has(key) || boundary.has(key)) continue;
      boundary.set(key, Object.freeze({ cellX, cellY }));
    }
  }

  return Object.freeze(
    [...boundary.values()].sort(
      (left, right) =>
        left.cellY - right.cellY
        || left.cellX - right.cellX,
    ),
  );
}

function knownRuinState(
  bundle: Phase1AuthorityBundle,
): Readonly<Phase1RuinRuntimeState> | null {
  const activeEntity =
    bundle.world.findGeneratedEntityByDefinition(
      'ruin:previous-civilization-ruin',
    );
  if (activeEntity !== null) {
    const active = bundle.worldStore.getRuinState(
      activeEntity.entityId,
    );
    if (active !== undefined) return active;
  }

  for (const chunk of bundle.worldPersistence.exportChunks()) {
    const state = chunk.ruinStates.find(
      (candidate) =>
        candidate.ruinDefinitionId
        === 'ruin:previous-civilization-ruin',
    );
    if (state !== undefined) return state;
  }
  return null;
}

function mapFacing(
  facing: PlayerMotionViewV1['facing'],
): Phase1MapFacing | null {
  switch (facing) {
    case 'N':
    case 'NE':
    case 'E':
    case 'SE':
    case 'S':
    case 'SW':
    case 'W':
    case 'NW':
      return facing;
    case null:
      return null;
    default:
      return null;
  }
}

function teammateAtlasIndex(
  slot: PresentationIdentitySlotV1,
): number | null {
  switch (slot) {
    case 'TEAM_A': return 1;
    case 'TEAM_B': return 2;
    case 'TEAM_C': return 3;
    case 'LOCAL':
    case 'UNASSIGNED':
      return null;
  }
}

function teammateIdentitySlot(
  slot: PresentationIdentitySlotV1,
): 'TEAM_A' | 'TEAM_B' | 'TEAM_C' | null {
  switch (slot) {
    case 'TEAM_A':
    case 'TEAM_B':
    case 'TEAM_C':
      return slot;
    case 'LOCAL':
    case 'UNASSIGNED':
      return null;
  }
}

function teammateLabel(
  slot: PresentationIdentitySlotV1,
): string | null {
  switch (slot) {
    case 'TEAM_A': return 'TEAM A';
    case 'TEAM_B': return 'TEAM B';
    case 'TEAM_C': return 'TEAM C';
    case 'LOCAL':
    case 'UNASSIGNED':
      return null;
  }
}

function normalizedSelection(
  ordinal: number,
  count: number,
): number {
  return count === 0
    ? 0
    : positiveModulo(ordinal, count);
}

function playerCenteredBounds(
  playerWorldX: number,
  playerWorldY: number,
): {
  readonly minCellX: number;
  readonly maxCellX: number;
  readonly minCellY: number;
  readonly maxCellY: number;
} {
  const playerCellX = markerCell(playerWorldX);
  const playerCellY = markerCell(playerWorldY);
  return Object.freeze({
    minCellX: playerCellX - MAP_VIEW_HALF_WIDTH_CELLS,
    maxCellX: playerCellX + MAP_VIEW_HALF_WIDTH_CELLS,
    minCellY: playerCellY - MAP_VIEW_HALF_HEIGHT_CELLS,
    maxCellY: playerCellY + MAP_VIEW_HALF_HEIGHT_CELLS,
  });
}

export function projectPhase1ProductReviewMapPanel(
  bundle: Phase1AuthorityBundle,
  playerId: string,
  motions: readonly Readonly<PlayerMotionViewV1>[],
  selectionOrdinal: number,
): Readonly<Phase1MapPanelPresentation> {
  const playerPosition = bundle.getPlayerPosition(playerId);
  const localMotion = motions.find(
    (motion) => motion.playerId === playerId,
  );
  const landmarks = getPhase1WorldLandmarks(
    bundle.config.worldSeed,
  );
  const ruinState = knownRuinState(bundle);
  const ruinKnown =
    ruinState !== null
    && ruinState.discoveryState !== 'unknown';
  const activeCaches = bundle.world.exportSnapshot().deathCaches.caches
    .filter((cache) =>
      bundle.items.getContainerView(cache.containerId)
        .stacks.length > 0,
    );

  const detailTargets: EligibleDetailTarget[] = [
    Object.freeze({
      id: 'map:base',
      label: 'LANDING MODULE · BASE',
      worldX: landmarks.landingPosition.x,
      worldY: landmarks.landingPosition.y,
      markerIndex: 4,
      kind: 'base' as const,
    }),
  ];
  if (ruinKnown) {
    detailTargets.push(Object.freeze({
      id: 'map:ruin',
      label: ruinState.discoveryState === 'located'
        ? 'UNINVESTIGATED RUIN'
        : 'INVESTIGATED RUIN',
      worldX: landmarks.ruinPosition.x,
      worldY: landmarks.ruinPosition.y,
      markerIndex:
        ruinState.discoveryState === 'located' ? 5 : 6,
      kind: 'ruin' as const,
    }));
  }
  for (const cache of activeCaches) {
    detailTargets.push(Object.freeze({
      id: 'map:death-cache:' + cache.entityId,
      label: 'DEATH CACHE',
      worldX: cache.position.x,
      worldY: cache.position.y,
      markerIndex: 7,
      kind: 'death-cache' as const,
    }));
  }

  const selectedIndex = normalizedSelection(
    selectionOrdinal,
    detailTargets.length,
  );
  const selected = detailTargets[selectedIndex] ?? null;

  const markers: Phase1MapMarkerPresentation[] = [
    Object.freeze({
      id: 'map:player:' + playerId,
      kind: 'player' as const,
      label: 'YOU',
      atlasIndex: 0,
      worldX: playerPosition.x,
      worldY: playerPosition.y,
      facing: mapFacing(localMotion?.facing ?? null),
      distanceBand: null,
      selected: false,
      identitySlot: 'LOCAL' as const,
    }),
    ...detailTargets.map((target, index) => Object.freeze({
      id: target.id,
      kind: target.kind,
      label: target.kind === 'base'
        ? 'BASE'
        : target.label,
      atlasIndex: target.markerIndex,
      worldX: target.worldX,
      worldY: target.worldY,
      facing: null,
      distanceBand: distanceBand(
        playerPosition.x,
        playerPosition.y,
        target.worldX,
        target.worldY,
      ),
      selected: index === selectedIndex,
      identitySlot: null,
    })),
  ];

  for (const motion of motions) {
    if (motion.playerId === playerId) continue;
    const identitySlot = teammateIdentitySlot(
      motion.presentationIdentitySlot,
    );
    if (identitySlot === null) continue;
    const atlasIndex = teammateAtlasIndex(identitySlot);
    const label = teammateLabel(identitySlot);
    if (atlasIndex === null || label === null) continue;
    markers.push(Object.freeze({
      id: 'map:teammate:' + motion.playerId,
      kind: 'teammate',
      label,
      atlasIndex,
      worldX: motion.position.x,
      worldY: motion.position.y,
      facing: mapFacing(motion.facing),
      distanceBand: null,
      selected: false,
      identitySlot,
    }));
  }

  const explored = exploredCells(
    chunkKnowledge(bundle, motions),
  );
  const boundary = unknownBoundaryCells(explored);
  const mapBounds = playerCenteredBounds(
    playerPosition.x,
    playerPosition.y,
  );

  return Object.freeze({
    kind: 'map',
    title: 'MAP · DISCOVERY',
    fogLabel:
      'EXPLORED · '
      + String(explored.length)
      + ' cells · UNKNOWN remains opaque',
    ruinLabel: ruinState === null
      || ruinState.discoveryState === 'unknown'
      ? 'Ruin · UNKNOWN'
      : ruinState.discoveryState === 'located'
        ? 'Uninvestigated Ruin · LOCATED'
        : 'Investigated Ruin · INVESTIGATED',
    deathCacheLabel: activeCaches.length === 0
      ? null
      : String(activeCaches.length)
        + (activeCaches.length === 1
          ? ' active Death Cache'
          : ' active Death Caches'),
    sharedDiscoveryLabel: motions.some(
      (motion) =>
        motion.playerId !== playerId
        && teammateAtlasIndex(
          motion.presentationIdentitySlot,
        ) !== null,
    )
      ? 'TEAM POSITIONS · authoritative current state'
      : null,
    spatial: Object.freeze({
      cellSizeWorldUnits:
        PHASE1_EXPLORATION_CELL_SIZE_WORLD_UNITS,
      ...mapBounds,
      exploredCells: explored,
      unknownBoundaryCells: boundary,
      markers: Object.freeze(markers),
      selectedDetailLabel: selected?.label ?? null,
      selectedDistanceBand: selected === null
        ? null
        : distanceBand(
            playerPosition.x,
            playerPosition.y,
            selected.worldX,
            selected.worldY,
          ),
      selectableTargetCount: detailTargets.length,
      knowledgePolicy: 'EXPLORED_ONLY' as const,
    }),
  });
}
